// frontend/app/api/search/image/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { searchByVector, MAX_RESULTS, VECTOR_DIMENSION, SIMILARITY_THRESHOLD } from '@/app/utils/supabase';

// For image embedding generation
import { AutoProcessor, RawImage, CLIPVisionModelWithProjection, env } from "@xenova/transformers";

// Define the structure of items returned by the match_items function
interface MatchItemsResult {
  id: string;
  title: string;
  description: string | null;
  location: string;
  url: string;
  submitter_id: string;
  created_at: string;
  blur_hash: string | null;
  ratio: number | null;
  score: number;
}

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
    // Parse form data
    const formData = await req.formData();
    const image = formData.get('image') as File;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const buffer = await image.arrayBuffer();
    console.log("Image size:", buffer.byteLength, "bytes");

    // Accept threshold and maxResults from formData
    let threshold: number = SIMILARITY_THRESHOLD;
    let maxResults: number = MAX_RESULTS;
    const thresholdStr = formData.get('threshold');
    const maxResultsStr = formData.get('maxResults');
    if (thresholdStr && !isNaN(Number(thresholdStr))) {
      threshold = Number(thresholdStr);
    }
    if (maxResultsStr && maxResultsStr !== 'all' && !isNaN(Number(maxResultsStr))) {
      maxResults = Number(maxResultsStr);
    } else if (maxResultsStr === 'all') {
      maxResults = 10000; // Arbitrary high value for 'all'
    }

    // Load models if needed (unchanged)
    if (!processor) { /* ... load processor ... */ console.log("Loading processor..."); processor = await AutoProcessor.from_pretrained(model_id, { cache_dir: env.cacheDir, local_files_only: false }); console.log("Processor loaded."); }
    if (!vision_model) { /* ... load vision model ... */ console.log("Loading vision model..."); vision_model = await CLIPVisionModelWithProjection.from_pretrained(model_id, { cache_dir: env.cacheDir, local_files_only: false }); console.log("Vision model loaded."); }

    // Process image (unchanged)
    const blob = new Blob([buffer], { type: image.type || 'image/jpeg' });
    const image_obj = await RawImage.fromBlob(blob);
    console.log("Image object created from blob.");
    const image_inputs = await processor(image_obj);
    const { image_embeds } = await vision_model(image_inputs);
    const imageVector = image_embeds.tolist()[0];

    // Dimension check (unchanged)
    if (imageVector.length !== VECTOR_DIMENSION) {
         console.error(`Image embedding dimension mismatch: Expected ${VECTOR_DIMENSION}, Got ${imageVector.length}`);
         throw new Error(`Generated image embedding has incorrect dimension (${imageVector.length}).`);
    }
    console.log(`Image embedding generated (dim: ${imageVector.length}), searching in Supabase...`);

    // Search in Supabase
    // Explicitly type the expected return of searchByVector for clarity
    const results: MatchItemsResult[] = await searchByVector(imageVector, maxResults, threshold);

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
    // **** Apply the type to 'item' parameter ****
    const formattedResults = results.map((item: MatchItemsResult) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      location: item.location || "Unknown", // Keep null check just in case
      created_at: item.created_at,
      submitter_id: item.submitter_id, // Pass ID directly
      item_images: [{
        image_url: item.url // Use the 'url' field from the result
      }],
      score: item.score
    }));

    return NextResponse.json({ items: formattedResults });
  } catch (error) {
    console.error('Image search API error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Log specific errors (unchanged)
    if (errorMessage.includes('dimension') || errorMessage.includes('tensor')) { console.error("Potential embedding generation/extraction error:", error); }
    return NextResponse.json(
      { error: 'Image search failed: ' + errorMessage },
      { status: 500 }
    );
  }
}

// OPTIONS handler (unchanged)
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