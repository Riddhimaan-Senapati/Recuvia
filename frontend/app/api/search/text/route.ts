// app/api/search/text/route.ts
import { NextResponse } from 'next/server';
import { milvusClient, COLLECTION_NAME, initMilvusCollection } from '@/lib/milvus';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await initMilvusCollection();
    
    const { query, filters } = await req.json();
    
    if (!query) {
      return NextResponse.json(
        { error: 'Search query is required' },
        { status: 400 }
      );
    }
    
    // Build expression for text search
    // Note: Milvus doesn't have full-text search, so we use basic string matching
    // Sanitize user input to prevent injection
    const sanitizedQuery = query.replace(/['"%\\]/g, '');
    const searchExpr = `title like '%${sanitizedQuery}%' or description like '%${sanitizedQuery}%'`;
    const searchExpr = `title like '%${query}%' or description like '%${query}%'`;
    const typeExpr = filters?.type ? `and item_type = '${filters.type}'` : '';
    const expr = `${searchExpr} ${typeExpr}`;

    
    // Search in Milvus
    const searchResults = await milvusClient.query({
      collection_name: COLLECTION_NAME,
      expr: expr,
      output_fields: ['id', 'title', 'description', 'location', 'submitter_email', 'image_url', 'item_type', 'created_at'],
    });
    
    // Format results
    const items = searchResults.map(result => ({
      id: result.id,
      title: result.title,
      description: result.description,
      location: result.location,
      profiles: { email: result.submitter_email },
      item_images: [{ image_url: result.image_url }],
      type: result.item_type,
      created_at: result.created_at
    }));
    
    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error searching by text:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
