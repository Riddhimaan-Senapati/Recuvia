// frontend/app/api/milvus/search/image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { searchByVector, MAX_RESULTS, VECTOR_DIMENSION } from '@/app/utils/supabase'; // Include VECTOR_DIMENSION

// For image embedding generation
import { AutoProcessor, RawImage, CLIPVisionModelWithProjection, env } from "@xenova/transformers";

// Configure cache directory
const tmpDir = os.tmpdir();
const cacheDir = process.env.VERCEL_TMP_DIR || path.join(tmpDir, '.cache', 'transformers');
env.cacheDir = cacheDir;
console.log("Image Search API using cache directory:", env.cacheDir);

// Create cache directory if it doesn't exist
try { if (!fs.existsSync(env.cacheDir)) fs.mkdirSync(env.cacheDir, { recursive: true }); } catch (err) { console.warn("Failed to create image search cache directory:", err); }

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Smaller model with lower memory footprint
const model_id = "Xenova/clip-vit-base-patch32";

// Lazy-loaded processor and model
let processor: any = null;
let vision_model: any = null;

// Set common environment settings for transformers
env.allowRemoteModels = true;
process.env.TRANSFORMERS_OFFLINE = '0'; // Ensure online fetching is allowed

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
    console.log("Image size:", buffer.byteLength, "bytes");

    // Load processor and model if not already loaded
    if (!processor) {
      console.log("Loading processor from:", model_id);
      processor = await AutoProcessor.from_pretrained(model_id, {
        cache_dir: env.cacheDir,
        local_files_only: false,
        // quantized: true // Consider removing if issues arise
      });
      console.log("Processor loaded.");
    }

    if (!vision_model) {
      console.log("Loading vision model from:", model_id);
      vision_model = await CLIPVisionModelWithProjection.from_pretrained(model_id, {
        cache_dir: env.cacheDir,
        local_files_only: false,
        // quantized: true
      });
      console.log("Vision model loaded.");
    }

    // Create a blob from the image buffer
    const blob = new Blob([buffer], { type: image.type || 'image/jpeg' });

    // Process the image directly
    const image_obj = await RawImage.fromBlob(blob);
    console.log("Image object created from blob.");

    // Process the image with the model
    console.log("Processing image with model...");
    const image_inputs = await processor(image_obj);
    const { image_embeds } = await vision_model(image_inputs);
    const imageVector = image_embeds.tolist()[0]; // Correct extraction

    // Add a check for vector dimension consistency
    if (imageVector.length !== VECTOR_DIMENSION) {
         console.error(`Image embedding dimension mismatch: Expected ${VECTOR_DIMENSION}, Got ${imageVector.length}`);
         throw new Error(`Generated image embedding has incorrect dimension (${imageVector.length}).`);
    }
    console.log(`Image embedding generated (dim: ${imageVector.length}), searching in Supabase...`);


    // Search in Supabase using the image vector
    const results = await searchByVector(imageVector, MAX_RESULTS);

    if (!results) {
        console.log("Search function returned null or undefined.");
        return NextResponse.json({ items: [] });
    }

    if (results.length === 0) {
      console.log("No search results found");
      return NextResponse.json({ items: [] });
    }

    console.log(`Found ${results.length} matching items`);

    // Format the results for the frontend
    // **** CORRECTED FORMATTING: Use submitter_id ****
    const formattedResults = results.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      location: item.location || "Unknown",
      created_at: item.created_at,
      // profiles: { // Only have submitter_id from the function
      //   email: item.submitter_id // Pass ID if needed
      // },
      submitter_id: item.submitter_id, // Pass ID directly if needed
      item_images: [{ // Use 'url' field returned by the function
        image_url: item.url
      }],
      score: item.score
    }));

    return NextResponse.json({ items: formattedResults });
  } catch (error) {
    console.error('Image search API error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
     if (errorMessage.includes('dimension') || errorMessage.includes('tensor')) {
        console.error("Potential embedding generation/extraction error:", error);
    }
    return NextResponse.json(
      { error: 'Image search failed: ' + errorMessage },
      { status: 500 }
    );
  }
}

// Add OPTIONS handler to support CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*', // Adjust in production
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}