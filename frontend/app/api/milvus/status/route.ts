import { NextRequest, NextResponse } from 'next/server';
import { milvus, COLLECTION_NAME } from '@/app/utils/milvus';

export const dynamic = 'force-dynamic';

// This should match the interface in the upload route
interface ProcessingStatus {
  [key: string]: {
    status: 'processing' | 'complete' | 'error';
    message?: string;
    timestamp: number;
  }
}

// Import the processingStatus from the upload route
// In a real production app, this would be stored in a database or Redis
// This is a simplified approach for demonstration purposes
import { processingStatus } from '../upload/route';

export async function GET(req: NextRequest) {
  try {
    // Get the image ID from the query string
    const { searchParams } = new URL(req.url);
    const imageId = searchParams.get('imageId');
    
    if (!imageId) {
      return NextResponse.json({ error: 'Missing imageId parameter' }, { status: 400 });
    }
    
    // First check if the image exists in Milvus
    const queryResult = await milvus.query({
      collection_name: COLLECTION_NAME,
      filter: `imageId == "${imageId}"`,
      output_fields: ['imageId'],
      limit: 1
    });
    
    // Check if the image was found in Milvus
    const existsInMilvus = queryResult && 
                  queryResult.data && 
                  Array.isArray(queryResult.data) && 
                  queryResult.data.length > 0;
    
    // If it exists in Milvus, we're done
    if (existsInMilvus) {
      return NextResponse.json({
        exists: true,
        status: 'indexed',
        message: 'Item is fully indexed and searchable',
        imageId,
        timestamp: new Date().toISOString()
      });
    }
    
    // If not in Milvus, check the processing status
    const itemStatus = processingStatus[imageId];
    
    if (itemStatus) {
      return NextResponse.json({
        exists: false,
        status: itemStatus.status,
        message: itemStatus.message || 'Processing in progress',
        progress: itemStatus.status === 'processing' ? 'in_progress' : 
                 itemStatus.status === 'complete' ? 'pending_indexing' : 'failed',
        imageId,
        timestamp: new Date().toISOString(),
        lastUpdated: new Date(itemStatus.timestamp).toISOString()
      });
    }
    
    // If no status found, it's not being processed
    return NextResponse.json({
      exists: false,
      status: 'unknown',
      message: 'Item not found in database or processing queue',
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
