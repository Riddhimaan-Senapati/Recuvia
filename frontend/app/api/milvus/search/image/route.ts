import { NextRequest, NextResponse } from 'next/server';
import { milvus, COLLECTION_NAME, VECTOR_FIELD_NAME } from '@/app/utils/milvus';
import { v4 as uuidv4 } from 'uuid';

// For image embedding generation
import { AutoProcessor, RawImage, CLIPVisionModelWithProjection } from "@xenova/transformers";

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Extend the function timeout for Vercel

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
    
    // Instead of writing to the file system, process directly from buffer
    const imageBuffer = await image.arrayBuffer();
    const imageUint8Array = new Uint8Array(imageBuffer);
    
    // Initialize the model and processor
    const model_id = "Xenova/clip-vit-base-patch16";
    const processor = await AutoProcessor.from_pretrained(model_id);
    const vision_model = await CLIPVisionModelWithProjection.from_pretrained(model_id, {
      quantized: false,
    });
    
    // Process the image directly from array buffer
    let image_obj;
    try {

       // Try to use the buffer directly
       image_obj = await RawImage.fromBlob(new Blob([imageUint8Array], { type: image.type || 'image/jpeg' }));
    } catch (e) {
      // Fallback: Convert to base64 and use that
      const base64 = Buffer.from(imageUint8Array).toString('base64');
      const dataUrl = `data:${image.type || 'image/jpeg'};base64,${base64}`;
      image_obj = await RawImage.fromBlob(await (await fetch(dataUrl)).blob());
    }
    
    const image_inputs = await processor(image_obj);
    const { image_embeds } = await vision_model(image_inputs);
    const imageVector = image_embeds.tolist()[0];
    
    // Search in Milvus using the image vector
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
  }
}
