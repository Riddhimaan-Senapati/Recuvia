import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { milvus, COLLECTION_NAME } from '@/app/utils/milvus';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    
    // 1. Get authenticated user
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 2. Parse the request body to get the item ID
    const { itemId, fileName } = await req.json();
    
    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      );
    }
    
    // 3. Check if the user is authorized to delete this item
    // First, query Milvus to get the item details
    const queryExpr = `imageId == "${itemId}"`;
    const queryResult = await milvus.query({
      collection_name: COLLECTION_NAME,
      filter: queryExpr,
      output_fields: ['submitter_email'],
    });
    
    if (!queryResult || !queryResult.data || queryResult.data.length === 0) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    
    const itemData = queryResult.data[0];
    const itemOwnerEmail = itemData.submitter_email;
    const userEmail = session.user.email;
    
    // Check if the user is the item owner or the administrator
    const isAdmin = userEmail === 'riddhimaan22@gmail.com';
    const isOwner = userEmail === itemOwnerEmail;
    
    if (!isAdmin && !isOwner) {
      return NextResponse.json(
        { error: 'You do not have permission to delete this item' },
        { status: 403 }
      );
    }
    
    // 4. Delete from Milvus
    const deleteExpr = `imageId == "${itemId}"`;
    const deleteResult = await milvus.deleteEntities({
      collection_name: COLLECTION_NAME,
      filter: deleteExpr,
    });
    
    if (!deleteResult || deleteResult.status?.error_code !== 'Success') {
      return NextResponse.json(
        { error: 'Failed to delete from Milvus' },
        { status: 500 }
      );
    }
    
    // 5. Delete from Supabase Storage if fileName is provided
    if (fileName) {
      const { error: storageError } = await supabase.storage
        .from('item-images')
        .remove([fileName]);
      
      if (storageError) {
        console.error('Storage delete error:', storageError);
        // We'll continue even if storage delete fails, as the Milvus delete succeeded
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully',
    });
  } catch (error) {
    console.error('Delete error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
