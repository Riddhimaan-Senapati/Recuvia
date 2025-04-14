// frontend/app/api/milvus/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { deleteItemById } from '@/app/utils/supabase';

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
    // First, query Supabase to get the item details
    const { data: itemData, error: queryError } = await supabase
      .from('items')
      .select('submitter_email')
      .eq('id', itemId)
      .single();
    
    if (queryError || !itemData) {
      return NextResponse.json(
        { error: 'Item not found' },
        { status: 404 }
      );
    }
    
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
    
    // 4. Delete from Supabase
    await deleteItemById(itemId);
    
    // 5. Delete from Supabase Storage if fileName is provided
    if (fileName) {
      const { error: storageError } = await supabase.storage
        .from('item-images')
        .remove([fileName]);
      
      if (storageError) {
        console.error('Storage delete error:', storageError);
        // We'll continue even if storage delete fails, as the database delete succeeded
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