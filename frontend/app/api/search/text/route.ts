// frontend/app/api/milvus/search/text/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { searchByVector, MAX_RESULTS, VECTOR_DIMENSION } from '@/app/utils/supabase';

// For text embedding generation
import { AutoTokenizer, CLIPTextModelWithProjection, env } from "@xenova/transformers";

// Configure cache directory
const tmpDir = os.tmpdir();
// Use a consistent cache directory naming convention
const cacheDir = process.env.VERCEL_TMP_DIR || path.join(tmpDir, '.cache', 'transformers');
env.cacheDir = cacheDir;
console.log("Text search API using cache directory:", env.cacheDir);

// Create cache directory if it doesn't exist
try {
  if (!fs.existsSync(env.cacheDir)) {
    fs.mkdirSync(env.cacheDir, { recursive: true });
  }
} catch (err) {
  console.warn("Failed to create text search cache directory:", err);
}

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Lazy-loaded models
let tokenizer: any = null;
let text_model: any = null;

// Smaller model with lower memory footprint (ensure this matches upload/image search)
const model_id = "Xenova/clip-vit-base-patch32";

// Set common environment settings for transformers
env.allowRemoteModels = true;
process.env.TRANSFORMERS_OFFLINE = '0'; // Ensure online fetching is allowed

export async function POST(req: NextRequest) {
  console.log("Text search API called");

  try {
    // Parse request body
    const { query } = await req.json();

    if (!query || typeof query !== 'string' || query.trim() === '') {
      return NextResponse.json(
        { error: 'Valid query string is required' },
        { status: 400 }
      );
    }

    console.log(`Processing text search query: "${query}"`);

    // Initialize the tokenizer and text model if not already loaded
    if (!tokenizer) {
      console.log("Loading tokenizer from:", model_id);
      tokenizer = await AutoTokenizer.from_pretrained(model_id, {
        cache_dir: env.cacheDir,
        local_files_only: false, // Allow download if not cached
        // Consider removing quantization if causing issues, although usually fine
        // quantized: true
      });
      console.log("Tokenizer loaded.");
    }

    if (!text_model) {
      console.log("Loading text model from:", model_id);
      text_model = await CLIPTextModelWithProjection.from_pretrained(model_id, {
        cache_dir: env.cacheDir,
        local_files_only: false, // Allow download
        // quantized: true
      });
      console.log("Text model loaded.");
    }

    console.log("Generating text embedding...");

    // Tokenize and generate text embedding
    const text_inputs = tokenizer(query, {
      padding: true, // Pad to max length or model's default
      truncation: true, // Truncate long queries
      // Consider specifying max_length if needed: max_length: text_model.config.max_position_embeddings
    });

    const { text_embeds } = await text_model(text_inputs);

    // **** CORRECTED EMBEDDING EXTRACTION ****
    // Use the same method as the image route
    const textVector: number[] = text_embeds.tolist()[0];

    // Add a check for vector dimension consistency
    if (textVector.length !== VECTOR_DIMENSION) {
         console.error(`Text embedding dimension mismatch: Expected ${VECTOR_DIMENSION}, Got ${textVector.length}`);
         throw new Error(`Generated text embedding has incorrect dimension (${textVector.length}).`);
    }

    console.log(`Text embedding generated (dim: ${textVector.length}), searching in Supabase...`);

    // Search in Supabase using the text vector
    // Make sure searchByVector uses the correct SIMILARITY_THRESHOLD defined in supabase.ts
    const results = await searchByVector(textVector, MAX_RESULTS);

    if (!results) {
        // searchByVector should ideally not return null, but empty array if no results. Handle null defensively.
        console.log("Search function returned null or undefined.");
        return NextResponse.json({ items: [] });
    }

    if (results.length === 0) {
      console.log("No matching items found in Supabase for the query.");
      return NextResponse.json({ items: [] });
    }

    console.log(`Found ${results.length} matching items`);

    // Format the results for the frontend
    // **** CORRECTED FORMATTING: Use submitter_id ****
    // Note: We don't have the email directly from match_items function,
    // only the submitter_id. We'd need a join or separate query to get email.
    // For now, we'll just pass the ID or omit the profiles field if email isn't needed immediately.
    const formattedResults = results.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      location: item.location || "Unknown", // location is returned by match_items
      created_at: item.created_at, // created_at is returned
      // profiles: { // We only have submitter_id, not the profile info directly
      //   email: item.submitter_id // Pass ID if needed, or fetch profile later
      // },
      submitter_id: item.submitter_id, // Pass the ID directly if needed by frontend logic (like delete button)
      item_images: [{ // item_images is not directly returned, use 'url'
        image_url: item.url // url is returned by match_items
      }],
      score: item.score // score is returned
    }));

    return NextResponse.json({ items: formattedResults });
  } catch (error) {
    console.error('Text search API error:', error);
    // Log the specific error details
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Check for specific embedding generation errors
    if (errorMessage.includes('dimension') || errorMessage.includes('tensor')) {
        console.error("Potential embedding generation/extraction error:", error);
    }
    return NextResponse.json(
      { error: 'Text search failed: ' + errorMessage },
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