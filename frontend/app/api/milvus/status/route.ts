import { NextRequest, NextResponse } from 'next/server';
import { milvus, COLLECTION_NAME } from '@/app/utils/milvus';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Get the image ID from the query string
    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get('imageId');
    
    if (!imageId) {
      return NextResponse.json({ error: 'Missing imageId parameter' }, { status: 400 });
    }
    
    // Query Milvus to check if the image exists
    const queryResult = await milvus.query({
      collection_name: COLLECTION_NAME,
      filter: `imageId == "${imageId}"`,
      output_fields: ['imageId'],
      limit: 1
    });
    
    // Check if the image was found
    const exists = queryResult && 
                  queryResult.data && 
                  Array.isArray(queryResult.data) && 
                  queryResult.data.length > 0;
    
    return NextResponse.json({
      exists,
      imageId,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Status check error:', error);
    return NextResponse.json(
      { error: 'Failed to check image status: ' + (error instanceof Error ? error.message : String(error)) },
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
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    }
  });
}
