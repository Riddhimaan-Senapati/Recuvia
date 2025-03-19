import { NextRequest, NextResponse } from 'next/server';
import { milvus, COLLECTION_NAME, VECTOR_FIELD_NAME } from '@/app/utils/milvus';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { promises as fs } from 'fs';
import { join } from 'path';
import os from 'os';
import { v4 as uuidv4 } from 'uuid';

// For image embedding generation
import { AutoProcessor, RawImage, CLIPVisionModelWithProjection } from "@xenova/transformers";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // Parse form data to get the image file uploaded by user
    const formData = await req.formData();
    const image = formData.get('image') as File;
    
    if (!image) {
      return NextResponse.json(
        { error: 'No image provided' },
        { status: 400 }
      );
    }
    
    // Save the uploaded image temporarily to process with transformers
    const imageBuffer = await image.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);
    const tempDir = os.tmpdir();
    const tempFileName = `search-${uuidv4()}-${image.name.replace(/\s/g, '_')}`;
    const tempFilePath = join(tempDir, tempFileName);
    
    await fs.writeFile(tempFilePath, imageBytes);
    
    // Initialize the model and processor
    const model_id = "Xenova/clip-vit-base-patch16";
    const processor = await AutoProcessor.from_pretrained(model_id);
    const vision_model = await CLIPVisionModelWithProjection.from_pretrained(model_id, {
      quantized: false,
    });
    
    // Process the image and generate embedding
    const image_obj = await RawImage.read(tempFilePath);
    const image_inputs = await processor(image_obj);
    const { image_embeds } = await vision_model(image_inputs);
    const imageVector = image_embeds.tolist()[0];
    
    // Clean up temporary file
    await fs.unlink(tempFilePath);
    
    // Search in Milvus using the image vector
    const searchResult = await milvus.search({
      collection_name: COLLECTION_NAME,
      vector: imageVector,
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
    console.error('Image search error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
