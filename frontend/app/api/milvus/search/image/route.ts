import { NextRequest, NextResponse } from 'next/server';
import { milvus, COLLECTION_NAME } from '@/app/utils/milvus';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import sharp from 'sharp';

// For image embedding generation
import { AutoProcessor, RawImage, CLIPVisionModelWithProjection, env } from "@xenova/transformers";

// Configure cache directory
const tmpDir = os.tmpdir();
env.cacheDir = path.join(tmpDir, '.cache', 'transformers');
console.log("Search API using cache directory:", env.cacheDir);

// Create cache directory if it doesn't exist
try {
  if (!fs.existsSync(env.cacheDir)) {
    fs.mkdirSync(env.cacheDir, { recursive: true });
  }
} catch (err) {
  console.warn("Failed to create cache directory:", err);
}

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Define maximum image dimensions to reduce memory usage
const MAX_IMAGE_SIZE = 512; // pixels

// Pre-load model and processor (will be cached)
let processor: any = null;
let vision_model: any = null;

// Smaller model with lower memory footprint
const model_id = "Xenova/clip-vit-base-patch32";

// Function to resize image buffer to reduce memory usage
async function resizeImageBuffer(buffer: ArrayBuffer, mimeType: string): Promise<Buffer> {
  try {
    // Convert ArrayBuffer to Buffer
    const inputBuffer = Buffer.from(buffer);
    
    // Use sharp to resize the image while maintaining aspect ratio
    const resizedBuffer = await sharp(inputBuffer)
      .resize({
        width: MAX_IMAGE_SIZE,
        height: MAX_IMAGE_SIZE,
        fit: 'inside',
        withoutEnlargement: true
      })
      .toBuffer();
    
    return resizedBuffer;
  } catch (error) {
    console.error("Error resizing image:", error);
    // Return original buffer if resize fails
    return Buffer.from(buffer);
  }
}

export async function POST(req: NextRequest) {
  console.log("Image search API called");
  
  try {
    // Parse form data to get the image file uploaded by user
    const formData = await req.formData();
    const image = formData.get('image') as File;
    
    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    // Convert the image file to a buffer
    const buffer = await image.arrayBuffer();
    console.log("Original image size:", buffer.byteLength, "bytes");
    
    // Resize the image to reduce memory usage
    const resizedBuffer = await resizeImageBuffer(buffer, image.type);
    console.log(`Image resized from ${buffer.byteLength} to ${resizedBuffer.length} bytes`);
    
    // Use a more flexible cache strategy
    env.cacheDir = process.env.VERCEL_TMP_DIR || path.join(os.tmpdir(), '.cache', 'transformers');
    env.allowRemoteModels = true;
    process.env.TRANSFORMERS_OFFLINE = '0';
    
    // Load processor and model if not already loaded
    if (!processor) {
      console.log("Loading processor from:", model_id);
      processor = await AutoProcessor.from_pretrained(model_id, {
        cache_dir: env.cacheDir,
        local_files_only: false,
      });
    }
    
    if (!vision_model) {
      console.log("Loading vision model from:", model_id);
      vision_model = await CLIPVisionModelWithProjection.from_pretrained(model_id, {
        cache_dir: env.cacheDir,
        local_files_only: false,
        quantized: true, // Use quantized model to reduce memory usage
      });
    }
    
    let image_obj;
    try {
      // Try to use the resized buffer directly
      image_obj = await RawImage.fromBlob(new Blob([resizedBuffer], { type: image.type || 'image/jpeg' }));
    } catch (e) {
      console.log("Falling back to base64 method for image loading");
      // Fallback: Convert to base64 and use that
      const base64 = Buffer.from(resizedBuffer).toString('base64');
      const dataUrl = `data:${image.type || 'image/jpeg'};base64,${base64}`;
      image_obj = await RawImage.fromBlob(await (await fetch(dataUrl)).blob());
    }
    
    console.log("Processing image with model");
    const image_inputs = await processor(image_obj);
    const { image_embeds } = await vision_model(image_inputs);
    const imageVector = image_embeds.tolist()[0];
    console.log("Image embedding generated successfully");
    
    // Search in Milvus using the image vector
    console.log("Searching in Milvus collection:", COLLECTION_NAME);
    const searchResult = await milvus.search({
      collection_name: COLLECTION_NAME,
      vector: imageVector,
      output_fields: [
        'imageId', 
        'url', 
        'aiDescription', 
        'photoDescription', 
        'submitter_email',
        'location',
        'created_at',
        'blurHash', 
        'ratio'
      ],
      limit: 20,
    });
    
    if (!searchResult || !searchResult.results || searchResult.results.length === 0) {
      console.log("No search results found");
      return NextResponse.json({ items: [] });
    }
    
    console.log(`Found ${searchResult.results.length} matching items`);
    
    // Format the results for the frontend
    const results = searchResult.results.map(item => ({
      id: item.imageId,
      title: item.aiDescription,
      description: item.photoDescription,
      location: item.location || "Unknown",
      created_at: item.created_at,
      profiles: {
        email: item.submitter_email
      },
      item_images: [{
        image_url: item.url
      }],
      score: item.score
    }));
    
    return NextResponse.json({ items: results });
  } catch (error) {
    console.error('Image search error:', error);
    return NextResponse.json(
      { error: 'Something went wrong: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  } finally {
    // Force garbage collection to free up memory
    if (global.gc) {
      try {
        global.gc();
        console.log("Forced garbage collection to free memory");
      } catch (e) {
        console.log("Failed to force garbage collection:", e);
      }
    }
  }
}

// Add OPTIONS handler to support CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
