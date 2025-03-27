import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { milvus, COLLECTION_NAME, VECTOR_FIELD_NAME } from '@/app/utils/milvus';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { after } from 'next/server';

// For embedding generation in server
import { AutoProcessor, RawImage, CLIPVisionModelWithProjection, env } from "@xenova/transformers";

// Configure a writable cache directory in tmp (works in Vercel)
const tmpDir = os.tmpdir();
env.cacheDir = path.join(tmpDir, '.cache', 'transformers');
console.log("Using cache directory:", env.cacheDir);

// Create cache directory if it doesn't exist
try {
  if (!fs.existsSync(env.cacheDir)) {
    fs.mkdirSync(env.cacheDir, { recursive: true });
  }
} catch (err) {
  console.warn("Failed to create cache directory:", err);
}

// IMPORTANT: Use Node.js runtime with Fluid Compute
export const runtime = "nodejs"; 
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Smaller model with lower memory footprint
const model_id = "Xenova/clip-vit-base-patch32";

// Lazy-loaded processor and model
let processor: any = null;
let vision_model: any = null;

// Track processing status
interface ProcessingStatus {
  [key: string]: {
    status: 'processing' | 'complete' | 'error';
    message?: string;
    timestamp: number;
  }
}

// In-memory status tracking (will reset on deployment)
// In production, use a persistent store like Redis or DynamoDB
export const processingStatus: ProcessingStatus = {};

export async function POST(req: NextRequest) {
  console.log("Upload API called - Method:", req.method);
  let fileName = "";
  let itemId = "";
  let imageUrl = "";
  let imageVector: number[] = [];
  
  try {
    // Track start time for performance monitoring
    const startTime = Date.now();
    
    // Get cookie store
    const cookieStore = cookies();
    
    // 1. Get authenticated user
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log("Unauthorized - no session");
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    // 2. Parse the form data
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const location = formData.get('location') as string;
    const image = formData.get('image') as File;
    
    if (!title || !location || !image) {
      console.log("Missing required fields");
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log("Processing upload for user:", session.user.email);
    console.log("Image size:", image.size, "bytes");
    console.log("Image type:", image.type);
    
    // 3. Generate a unique ID for the item
    itemId = uuidv4();
    
    // Set initial processing status
    processingStatus[itemId] = {
      status: 'processing',
      message: 'Starting upload process',
      timestamp: Date.now()
    };
    
    // 4. Upload image to Supabase Storage
    const imageBuffer = await image.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);
    
    fileName = `${itemId}-${image.name.replace(/\s/g, '_')}`;
    console.log("Uploading to Supabase Storage:", fileName);
    
    // Upload to Supabase
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('item-images')
      .upload(fileName, imageBytes);
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      processingStatus[itemId] = {
        status: 'error',
        message: 'Failed to upload image to storage',
        timestamp: Date.now()
      };
      return new Response(JSON.stringify({ error: 'Failed to upload image: ' + uploadError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    
    console.log("File uploaded successfully to Supabase");
    console.log(`Time elapsed: ${(Date.now() - startTime) / 1000}s`);
    
    // Update status
    processingStatus[itemId] = {
      status: 'processing',
      message: 'Image uploaded, generating embedding',
      timestamp: Date.now()
    };
    
    // 5. Get the public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('item-images')
      .getPublicUrl(fileName);
    
    imageUrl = urlData?.publicUrl || "";
    console.log("Image public URL:", imageUrl);
    
    // 6. Generate image embedding
    try {
      console.log("Initializing image processor with cache dir:", env.cacheDir);
      
      // Use a more flexible cache strategy
      env.cacheDir = process.env.VERCEL_TMP_DIR || path.join(os.tmpdir(), '.cache', 'transformers');
      env.allowRemoteModels = true;
      process.env.TRANSFORMERS_OFFLINE = '0';
      
      // Load processor and model if not already loaded
      if (!processor) {
        processor = await AutoProcessor.from_pretrained(model_id, {
          cache_dir: env.cacheDir,
          local_files_only: false,
          quantized: true
        });
      }
      console.log("Processor loaded, initializing vision model");
      console.log(`Time elapsed: ${(Date.now() - startTime) / 1000}s`);
      
      if (!vision_model) {
        vision_model = await CLIPVisionModelWithProjection.from_pretrained(model_id, {
          cache_dir: env.cacheDir,
          local_files_only: false,
          quantized: true
        });
      }
      
      console.log("Vision model loaded, processing image");
      console.log(`Time elapsed: ${(Date.now() - startTime) / 1000}s`);

      // Create a blob from the image buffer
      const blob = new Blob([imageBuffer], { type: image.type || 'image/jpeg' });
      
      // Process the image directly without resizing
      const image_obj = await RawImage.fromBlob(blob);
      console.log("Image obj created");
      console.log(`Time elapsed: ${(Date.now() - startTime) / 1000}s`);
         
      // Process the image with the model
      const image_inputs = await processor(image_obj);
      console.log("Image processed");
      
      // Generate the embedding
      const { image_embeds } = await vision_model(image_inputs);
      console.log("Image embedding generated");
      console.log(`Time elapsed: ${(Date.now() - startTime) / 1000}s`);
      
      imageVector = image_embeds.tolist()[0];
      
      // Update status before background processing
      processingStatus[itemId] = {
        status: 'processing',
        message: 'Embedding generated, inserting into database',
        timestamp: Date.now()
      };
      
      // Use the after function for background processing
      after(async () => {
        try {
          console.log("Background processing started for item:", itemId);
          
          // Update status
          processingStatus[itemId] = {
            status: 'processing',
            message: 'Inserting into vector database',
            timestamp: Date.now()
          };
          
          // Insert into Milvus
          console.log("Inserting into Milvus...");
          const insertResult = await milvus.insert({
            collection_name: COLLECTION_NAME,
            fields_data: [{
              [VECTOR_FIELD_NAME]: imageVector,
              imageId: itemId,
              url: imageUrl,
              aiDescription: title,
              photoDescription: description || "",
              location: location,
              submitter_email: session.user.email,
              created_at: new Date().toISOString(),
              blurHash: "",
              ratio: 1.0, // Default aspect ratio
            }],
          });
          
          console.log("Milvus insert result:", insertResult);
          
          // Update status to complete
          processingStatus[itemId] = {
            status: 'complete',
            message: 'Successfully inserted into Milvus',
            timestamp: Date.now()
          };
          
          // Clean up status after some time (e.g., 1 hour)
          setTimeout(() => {
            if (processingStatus[itemId]) {
              console.log("Cleaning up status for:", itemId);
              delete processingStatus[itemId];
            }
          }, 60 * 60 * 1000); // 1 hour
          
        } catch (error) {
          console.error("Background processing error:", error);
          
          // Update status to error
          processingStatus[itemId] = {
            status: 'error',
            message: error instanceof Error ? error.message : String(error),
            timestamp: Date.now()
          };
        }
      });
      
      console.log(`Returning response while Milvus insertion continues in background`);
      console.log(`Total time before response: ${(Date.now() - startTime) / 1000}s`);
      
      // Return success response without waiting for Milvus insertion
      return new Response(JSON.stringify({
        success: true,
        item: {
          id: itemId,
          title,
          description,
          location,
          submitter_email: session.user.email,
          created_at: new Date().toISOString(),
          item_images: [{
            image_url: imageUrl
          }],
          profiles: {
            email: session.user.email
          }
        },
        processingStatus: 'started'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (processingError) {
      console.error("Error in image processing:", processingError);
      
      // Update status on error
      processingStatus[itemId] = {
        status: 'error',
        message: `Image processing failed: ${processingError instanceof Error ? processingError.message : String(processingError)}`,
        timestamp: Date.now()
      };
      
      // Cleanup
      try {
        console.log("Cleaning up Supabase Storage file due to error");
        await supabase.storage.from('item-images').remove([fileName]);
      } catch (cleanupError) {
        console.error("Failed to clean up file:", cleanupError);
      }
      
      return new Response(JSON.stringify({ 
        error: 'Failed to process image: ' + 
          (processingError instanceof Error ? processingError.message : String(processingError)) 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    console.error("Unhandled error in upload API:", error);
    
    // Cleanup if filename was set
    if (fileName) {
      try {
        const supabase = createRouteHandlerClient({ cookies });
        await supabase.storage.from('item-images').remove([fileName]);
      } catch (cleanupError) {
        console.error("Failed to clean up file:", cleanupError);
      }
    }
    
    return new Response(JSON.stringify({ 
      error: 'Server error: ' + (error instanceof Error ? error.message : String(error)) 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
