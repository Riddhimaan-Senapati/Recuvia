// app/api/search/image/route.ts
import { NextResponse } from 'next/server';
import { milvusClient, COLLECTION_NAME, initMilvusCollection } from '@/lib/milvus';
import { generateImageEmbedding } from '@/lib/tensorflow-server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await initMilvusCollection();
    
    // Process uploaded image
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }
    
    // Convert to buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generate vector embedding
    const embedding = await generateImageEmbedding(buffer);
    
    // Search similar items in Milvus
    const searchResults = await milvusClient.search({
      collection_name: COLLECTION_NAME,
      data: [embedding], // Wrap embedding in array
      anns_field: 'image_embedding', // Specify vector field
      limit: 10,
      metric_type: 'COSINE',
      output_fields: ['id', 'title', 'description', /* ... */],
    });
    
    // Format results
    const items = searchResults.results.map(result => ({
      id: result.id,
      title: result.title,
      description: result.description,
      location: result.location,
      profiles: { email: result.submitter_email },
      image_url: result.image_url,
      type: result.item_type,
      created_at: result.created_at,
      similarity: result.score
    }));
    
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error searching by image:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
