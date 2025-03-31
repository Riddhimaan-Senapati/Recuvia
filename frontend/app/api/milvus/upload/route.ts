import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { milvus, COLLECTION_NAME, VECTOR_FIELD_NAME } from '@/app/utils/milvus';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { after } from 'next/server';
import { processingStatus } from '@/app/utils/processingStatus';

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
export const maxDuration = 60; // 60 seconds max duration
export const preferredRegion = "auto"; // Optimize for user's region

// Smaller model with lower memory footprint
const model_id = "Xenova/clip-vit-base-patch32";

// Lazy-loaded processor and model (move outside function to maintain between requests)
let _processor: any = null;
let _model: any = null;

// Function to get processor (lazy loading)
async function getProcessor() {
  if (!_processor) {
    console.log("Initializing processor...");
    _processor = await AutoProcessor.from_pretrained(model_id);
  }
  return _processor;
}

// Function to get model (lazy loading)
async function getModel() {
  if (!_model) {
    console.log("Initializing model...");
    _model = await CLIPVisionModelWithProjection.from_pretrained(model_id);
  }
  return _model;
}

// Pre-initialize the models (this will happen once when the function is first deployed)
if (process.env.VERCEL) {
  Promise.all([getProcessor(), getModel()]).catch(console.error);
}

export async function POST(req: NextRequest) {
  console.log("Upload API called");
  let fileName = "";
  let itemId = "";
  let imageUrl = "";
  
  try {
    const startTime = Date.now();
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const location = formData.get('location') as string;
    const image = formData.get('image') as File;
    
    if (!title || !location || !image) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    itemId = uuidv4();
    processingStatus[itemId] = {
      status: 'processing',
      message: 'Starting upload process',
      timestamp: Date.now()
    };

    // 1. Upload image to Supabase Storage
    const imageBuffer = await image.arrayBuffer();
    fileName = `${itemId}-${image.name.replace(/\s/g, '_')}`;
    
    const { error: uploadError } = await supabase.storage
      .from('item-images')
      .upload(fileName, new Uint8Array(imageBuffer));
    
    if (uploadError) {
      throw new Error('Storage upload error: ' + uploadError.message);
    }

    const { data: urlData } = supabase.storage
      .from('item-images')
      .getPublicUrl(fileName);
    
    imageUrl = urlData?.publicUrl || "";

    // 2. Generate embedding with optimized processing
    const processor = await getProcessor();
    const vision_model = await getModel();
    
    const blob = new Blob([imageBuffer], { type: image.type || 'image/jpeg' });
    const image_obj = await RawImage.fromBlob(blob);
    const image_inputs = await processor(image_obj);
    const { image_embeds } = await vision_model(image_inputs);
    const imageVector = image_embeds.tolist()[0];

    // 3. Insert into Milvus with retry logic
    const maxRetries = 3;
    let lastError = null;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await milvus.insert({
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
            ratio: 1.0,
          }],
        });
        
        // If successful, break out of retry loop
        processingStatus[itemId] = {
          status: 'complete',
          message: 'Successfully processed and stored',
          timestamp: Date.now()
        };
        
        return new Response(JSON.stringify({
          success: true,
          itemId,
          imageUrl,
          processingTime: Date.now() - startTime
        }), {
          status: 200,
          headers: { 'Content-Type': 'application/json' }
        });
        
      } catch (error) {
        console.error(`Attempt ${attempt} failed:`, error);
        lastError = error;
        
        if (attempt === maxRetries) {
          if (error instanceof Error) {
            throw new Error(`Failed after ${maxRetries} attempts: ${error.message}`);
          } else {
            throw new Error(`Failed after ${maxRetries} attempts: ${String(error)}`);
          }
        }
        
        // Wait before retrying (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
      }
    }
    
    throw lastError;

  } catch (error) {
    console.error("Upload error:", error);
    
    // Update status
    if (itemId) {
      processingStatus[itemId] = {
        status: 'error',
        message: error instanceof Error ? error.message : String(error) || 'Unknown error occurred',
        timestamp: Date.now()
      };
    }
    
    // Cleanup on error
    if (fileName) {
      try {
        const cookieStore = cookies();
        const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
        await supabase.storage.from('item-images').remove([fileName]);
      } catch (cleanupError) {
        console.error("Failed to clean up file:", cleanupError);
      }
    }
    
    return new Response(JSON.stringify({ 
      error: 'Upload failed: ' + (error instanceof Error ? error.message : String(error)) 
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
