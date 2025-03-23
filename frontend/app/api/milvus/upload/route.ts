import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { milvus, COLLECTION_NAME, VECTOR_FIELD_NAME } from '@/app/utils/milvus';
import * as os from 'os';
import * as path from 'path';

// For embedding generation in server
import { AutoProcessor, RawImage, CLIPVisionModelWithProjection, env } from "@xenova/transformers";

// Configure a writable cache directory in tmp (works in Vercel)
const tmpDir = os.tmpdir();
env.cacheDir = path.join(tmpDir, '.cache', 'transformers');
console.log("Using cache directory:", env.cacheDir);

export const dynamic = 'force-dynamic';
export const maxDuration = 60; 

// Remove NextResponse with Headers and use built-in NextResponse.json
export async function POST(req: NextRequest) {
  console.log("Upload API called");
  
  try {
    // Get cookie store
    const cookieStore = cookies();
    
    // 1. Get authenticated user
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      console.log("Unauthorized - no session");
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 2. Parse the form data
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const location = formData.get('location') as string;
    const image = formData.get('image') as File;
    
    if (!title || !location || !image) {
      console.log("Missing required fields");
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }
    
    console.log("Processing upload for user:", session.user.email);
    console.log("Image size:", image.size, "bytes");
    
    // 3. Generate a unique ID for the item
    const itemId = uuidv4();
    
    // 4. Upload image to Supabase Storage
    const imageBuffer = await image.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);
    
    const fileName = `${itemId}-${image.name.replace(/\s/g, '_')}`;
    console.log("Uploading to Supabase Storage:", fileName);
    
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('item-images')
      .upload(fileName, imageBytes);
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image: ' + uploadError.message },
        { status: 500 }
      );
    }
    
    console.log("File uploaded successfully to Supabase");
    
    // 5. Get the public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('item-images')
      .getPublicUrl(fileName);
    
    const imageUrl = urlData?.publicUrl;
    console.log("Image public URL:", imageUrl);
    
    // 6. Generate image embedding without using filesystem
    try {
      console.log("Initializing image processor with cache dir:", env.cacheDir);
      
      // Initialize the model and processor with remote cache options
      const model_id = "Xenova/clip-vit-base-patch16";
      const processor = await AutoProcessor.from_pretrained(model_id, {
        cache_dir: env.cacheDir,
        local_files_only: false,
        progress_callback: undefined
      });
      
      console.log("Processor loaded, initializing vision model");
      
      const vision_model = await CLIPVisionModelWithProjection.from_pretrained(model_id, {
        cache_dir: env.cacheDir,
        local_files_only: false,
        quantized: false,
        progress_callback: undefined
      });
      
      console.log("Vision model loaded, processing image");
      
      let image_obj;
      try {
        // Try to use the buffer directly
        image_obj = await RawImage.fromBlob(new Blob([imageBuffer], { type: image.type || 'image/jpeg' }));
      } catch (e) {
  // Fallback: Convert to base64 and use that
      const base64 = Buffer.from(imageBuffer).toString('base64');
      const dataUrl = `data:${image.type || 'image/jpeg'};base64,${base64}`;
      image_obj = await RawImage.fromBlob(await (await fetch(dataUrl)).blob());
      }

      console.log("Image object created");
      
      const image_inputs = await processor(image_obj);
      console.log("Image processed");
      
      const { image_embeds } = await vision_model(image_inputs);
      console.log("Image embedding generated");
      
      const imageVector = image_embeds.tolist()[0];
      
      // 7. Insert into Milvus using the provided milvus utility
      console.log("Inserting into Milvus");
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
          ratio: 1.0, // Default aspect ratio
        }],
      });
      
      console.log("Milvus insert successful");
      
      // Return success response with all item data
      return NextResponse.json({
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
        }
      });
    } catch (processingError) {
      console.error("Error in image processing or Milvus insertion:", processingError);
      
      // Cleanup the uploaded image if we failed to process it
      try {
        console.log("Cleaning up Supabase Storage file due to error");
        await supabase.storage.from('item-images').remove([fileName]);
      } catch (cleanupError) {
        console.error("Failed to clean up file:", cleanupError);
      }
      
      return NextResponse.json(
        { error: 'Failed to process image or save to database: ' + 
          (processingError instanceof Error ? processingError.message : String(processingError)) },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Upload route error:', error);
    return NextResponse.json(
      { error: 'Something went wrong with the upload: ' + 
        (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler for CORS
export async function OPTIONS() {
  return NextResponse.json({}, { 
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
