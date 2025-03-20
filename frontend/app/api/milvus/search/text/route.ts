import { NextRequest, NextResponse } from 'next/server';
import { milvus, COLLECTION_NAME, VECTOR_FIELD_NAME } from '@/app/utils/milvus';

// For text embedding generation
import { AutoTokenizer, CLIPTextModelWithProjection } from "@xenova/transformers";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { query } = await req.json();
    
    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }
    
    // Initialize the tokenizer and text model
    const model_id = "Xenova/clip-vit-base-patch16";
    const tokenizer = await AutoTokenizer.from_pretrained(model_id);
    const text_model = await CLIPTextModelWithProjection.from_pretrained(model_id);
    
    // Tokenize and generate text embedding
    const text_inputs = tokenizer(query, {
      padding: true,
      truncation: true,
    });
    
    const { text_embeds } = await text_model(text_inputs);
    const textVector = Array.from(text_embeds.data);
    
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
      return NextResponse.json({ items: [] });
    }
    
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
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
