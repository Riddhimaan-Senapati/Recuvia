import { NextRequest, NextResponse } from 'next/server';
import { milvus, COLLECTION_NAME, VECTOR_FIELD_NAME } from '@/app/utils/milvus';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';

// For text embedding generation
import { AutoTokenizer, CLIPTextModelWithProjection, env } from "@xenova/transformers";

// Configure cache directory
const tmpDir = os.tmpdir();
env.cacheDir = path.join(tmpDir, '.cache', 'transformers');
console.log("Text search API using cache directory:", env.cacheDir);

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

// Lazy-loaded models
let tokenizer: any = null;
let text_model: any = null;

// Smaller model with lower memory footprint
const model_id = "Xenova/clip-vit-base-patch32";

export async function POST(req: NextRequest) {
  console.log("Text search API called");
  
  try {
    // Parse request body
    const { query } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    console.log(`Processing text search query: "${query}"`);
    
    // Use a more flexible cache strategy
    env.cacheDir = process.env.VERCEL_TMP_DIR || path.join(os.tmpdir(), '.cache', 'transformers');
    env.allowRemoteModels = true;
    process.env.TRANSFORMERS_OFFLINE = '0';
    
    // Initialize the tokenizer and text model if not already loaded
    if (!tokenizer) {
      console.log("Loading tokenizer from:", model_id);
      tokenizer = await AutoTokenizer.from_pretrained(model_id, {
        cache_dir: env.cacheDir,
        local_files_only: false,
        quantized: true
      });
    }
    
    if (!text_model) {
      console.log("Loading text model from:", model_id);
      text_model = await CLIPTextModelWithProjection.from_pretrained(model_id, {
        cache_dir: env.cacheDir,
        local_files_only: false,
        quantized: true
      });
    }
    
    console.log("Models loaded, generating text embedding");
    
    // Tokenize and generate text embedding
    const text_inputs = tokenizer(query, {
      padding: true,
      truncation: true,
    });
    
    const { text_embeds } = await text_model(text_inputs);
    // Fix: Explicitly cast the array to number[] type
    const textVector: number[] = Array.from(text_embeds.data) as number[];
    
    console.log("Text embedding generated, searching in Milvus");
    
    // Search in Milvus using the text vector
    const searchResult = await milvus.search({
      collection_name: COLLECTION_NAME,
      vector: textVector,
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
        email: item.submitter_email || "Unknown user"
      },
      item_images: [{
        image_url: item.url
      }],
      score: item.score
    }));
    
    return NextResponse.json({ items: results });
  } catch (error) {
    console.error('Text search error:', error);
    return NextResponse.json(
      { error: 'Something went wrong: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
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