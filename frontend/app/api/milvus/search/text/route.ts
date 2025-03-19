import { NextRequest, NextResponse } from 'next/server';
import { milvus, COLLECTION_NAME, VECTOR_FIELD_NAME } from '@/app/utils/milvus';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// For text embedding generation
import { AutoTokenizer, CLIPTextModelWithProjection } from "@xenova/transformers";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Parse request body
    const { query, filters = {} } = await req.json();
    
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
      output_fields: ['imageId', 'url', 'aiDescription', 'photoDescription', 'blurHash', 'ratio'],
      limit: 20,
    });
    
    if (!searchResult) {
      return NextResponse.json({ items: [] });
    }
    
    // Get the list of item IDs from Milvus results
    const itemIds = searchResult.results.map(item => item.imageId);
    
    // Fetch additional details from Supabase if there are results
    if (itemIds.length > 0) {
      const supabase = createRouteHandlerClient({ cookies });
      const { data: items, error } = await supabase
        .from('items')
        .select(`
          *,
          item_images (*),
          profiles (email)
        `)
        .in('id', itemIds);
      
      if (!error && items && items.length > 0) {
        // Merge Supabase data with Milvus results
        const mergedResults = items.map(item => {
          const milvusItem = searchResult.results.find(r => r.imageId === item.id);
          return {
            ...item,
            score: milvusItem ? milvusItem.score : 0
          };
        }).sort((a, b) => b.score - a.score); // Sort by score (highest first)
        
        return NextResponse.json({ items: mergedResults });
      }
    }
    
    // Fallback to just using Milvus results if Supabase fetch fails or returns no data
    const results = searchResult.results.map(item => ({
      id: item.imageId,
      title: item.aiDescription,
      description: item.photoDescription,
      item_images: [{
        image_url: item.url
      }],
      location: "Unknown", // Default location
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
