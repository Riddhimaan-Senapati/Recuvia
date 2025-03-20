import { NextRequest, NextResponse } from 'next/server';
import { milvus, COLLECTION_NAME, VECTOR_FIELD_NAME } from '@/app/utils/milvus';
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
      output_fields: [
        'imageId', 
        'url', 
        'aiDescription', 
        'photoDescription', 
        'submitter_email',
        'location',
        'item_type',
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
      type: item.item_type,
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
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
