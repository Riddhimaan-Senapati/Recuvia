// frontend/app/api/search/text/route.ts
import { NextRequest, NextResponse } from 'next/server';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
// Import Supabase functions and constants
import { searchByVector, MAX_RESULTS, VECTOR_DIMENSION, SIMILARITY_THRESHOLD } from '@/app/utils/supabase';

// For text embedding generation
import { AutoTokenizer, CLIPTextModelWithProjection, env } from "@xenova/transformers";

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
console.log("Text search API using cache directory:", env.cacheDir);

// Create cache directory if it doesn't exist
try { if (!fs.existsSync(env.cacheDir)) fs.mkdirSync(env.cacheDir, { recursive: true }); } catch (err) { console.warn("Failed to create text search cache directory:", err); }

export const runtime = "nodejs";
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

let tokenizer: any = null;
let text_model: any = null;
const model_id = "Xenova/clip-vit-base-patch32";

env.allowRemoteModels = true;
process.env.TRANSFORMERS_OFFLINE = '0';

export async function POST(req: NextRequest) {
  console.log("Text search API called");

  try {
    const { query, threshold, maxResults } = await req.json();
    if (!query || typeof query !== 'string' || query.trim() === '') {
        return NextResponse.json({ error: 'Valid query string is required' }, { status: 400 });
    }
    console.log(`Processing text search query: "${query}"`);

    // Initialize models (unchanged)
    if (!tokenizer) { /* ... load tokenizer ... */ console.log("Loading tokenizer..."); tokenizer = await AutoTokenizer.from_pretrained(model_id, { cache_dir: env.cacheDir, local_files_only: false }); console.log("Tokenizer loaded."); }
    if (!text_model) { /* ... load text model ... */ console.log("Loading text model..."); text_model = await CLIPTextModelWithProjection.from_pretrained(model_id, { cache_dir: env.cacheDir, local_files_only: false }); console.log("Text model loaded."); }

    // Generate embedding (using corrected extraction)
    console.log("Generating text embedding...");
    const text_inputs = tokenizer(query, { padding: true, truncation: true });
    const { text_embeds } = await text_model(text_inputs);
    const textVector: number[] = text_embeds.tolist()[0];

    // Log and check vector (unchanged)
    console.log(`Generated textVector dimension: ${textVector.length}`);
    if (textVector && textVector.length > 0) { /* ... logging first 5 values ... */ } else { /* ... error handling ... */ throw new Error("Failed to generate a valid text embedding."); }
    if (textVector.length !== VECTOR_DIMENSION) { /* ... dimension error handling ... */ throw new Error(`Generated text embedding has incorrect dimension (${textVector.length}).`); }

    console.log(`Text embedding generated, searching in Supabase...`);

    // Search in Supabase
    // Explicitly type the expected return of searchByVector for clarity
    const results: MatchItemsResult[] = await searchByVector(textVector, typeof maxResults === 'number' ? maxResults : MAX_RESULTS, typeof threshold === 'number' ? threshold : SIMILARITY_THRESHOLD);

    if (!results) { /* ... null check ... */ return NextResponse.json({ items: [] }); }
    if (results.length === 0) {
      console.log("No matching items found in Supabase for the query.");
      return NextResponse.json({ items: [] });
    }

    console.log(`Found ${results.length} matching items.`);
    if (results.length > 0) console.log(`Top result score: ${results[0]?.score}`);

    // Format the results for the frontend
    // **** Apply the type to 'item' parameter ****
    const formattedResults = results.map((item: MatchItemsResult) => ({
      id: item.id,
      title: item.title,
      description: item.description,
      location: item.location || "Unknown",
      created_at: item.created_at,
      submitter_id: item.submitter_id, // Pass ID directly
      item_images: [{
        image_url: item.url // Use the 'url' field from the result
      }],
      score: item.score
    }));

    return NextResponse.json({ items: formattedResults });
  } catch (error) {
    console.error('Text search API error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Log specific errors (unchanged)
    if (errorMessage.includes('dimension') || errorMessage.includes('tensor')) { console.error("Potential embedding generation/extraction error:", error); }
    return NextResponse.json({ error: 'Text search failed: ' + errorMessage }, { status: 500 });
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