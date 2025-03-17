// app/api/items/route.ts
import { NextResponse } from 'next/server';
import { 
  milvusClient, 
  COLLECTION_NAME, 
  initMilvusCollection 
} from '@/lib/milvus'; // Correct named exports


export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    await initMilvusCollection();
    
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'found';
    
    // Query Milvus for items by type
    const expr = `item_type = '${type}'`;
    
    const results = await milvusClient.query({
      collection_name: COLLECTION_NAME,
      expr: expr,
      output_fields: ['id', 'title', 'description', 'location', 'submitter_email', 'image_url', 'item_type', 'created_at'],
    });
    
    // Format results to match your front-end expectations
    const items = results.map(result => ({
      id: result.id,
      title: result.title,
      description: result.description,
      location: result.location,
      profiles: { email: result.submitter_email },
      item_images: [{ image_url: result.image_url }],
      type: result.item_type,
      created_at: result.created_at
    }));
    
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    return NextResponse.json(
      { error: 'Something went wrong', details: error.message },
      { status: 500 }
    );
  }
}
