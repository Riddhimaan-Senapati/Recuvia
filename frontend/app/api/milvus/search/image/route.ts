import { NextRequest, NextResponse } from 'next/server';
import { milvus, COLLECTION_NAME, VECTOR_FIELD_NAME } from '@/app/utils/milvus';

// For image embedding generation
import { AutoProcessor, RawImage, CLIPVisionModelWithProjection } from "@xenova/transformers";

// Make sure we're explicitly setting the right configs for Vercel
export const config = {
  runtime: 'edge',
  regions: ['iad1'], // Optimizing for a specific region can help
};

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Set the proper content type
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  try {
    // Parse form data to get the image file uploaded by user
    const formData = await req.formData();
    const image = formData.get('image') as File;
    
    if (!image) {
      return new NextResponse(
        JSON.stringify({ error: 'No image provided' }),
        { status: 400, headers }
      );
    }
    
    // Instead of writing to the file system, process directly from buffer
    const imageBuffer = await image.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);
    
    // Initialize the model and processor
    const model_id = "Xenova/clip-vit-base-patch16";
    const processor = await AutoProcessor.from_pretrained(model_id);
    const vision_model = await CLIPVisionModelWithProjection.from_pretrained(model_id, {
      quantized: false,
    });
    
    // Process the image directly from buffer as a blob
    const blob = new Blob([imageBytes], { type: image.type || 'image/jpeg' });
    const image_obj = await RawImage.fromBlob(blob);
    
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
      return new NextResponse(
        JSON.stringify({ items: [] }),
        { status: 200, headers }
      );
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
    
    return new NextResponse(
      JSON.stringify({ items: results }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Image search error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Something went wrong: ' + (error instanceof Error ? error.message : String(error)) }),
      { status: 500, headers }
    );
  }
}
