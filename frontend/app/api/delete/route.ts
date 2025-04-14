// frontend/app/api/delete/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
// Import the utility function that now expects the client
import { deleteItemById } from '@/app/utils/supabase';

export const dynamic = 'force-dynamic'; // Ensures route is dynamic

export async function POST(req: NextRequest) {
  console.log("Delete API route called.");

  // 1. Get authenticated user using request-scoped client
  // Note: Pass the actual cookies function result, not just the imported name
  const supabase = createRouteHandlerClient({ cookies: () => cookies() });
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();

  if (sessionError) {
      console.error("Session retrieval error in delete route:", sessionError.message);
      return NextResponse.json({ error: 'Server error retrieving session' }, { status: 500 });
  }

  if (!session) {
    console.log("Unauthorized delete attempt: No session found.");
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // We have a session, get user details
  const user = session.user;
  console.log(`Delete request initiated by user: ${user.id} (${user.email})`);

  try {
    // 2. Parse the request body to get the item ID and filename
    let itemId: string | undefined;
    let fileName: string | undefined;
    try {
        const body = await req.json();
        itemId = body.itemId;
        fileName = body.fileName; // Keep filename for storage deletion
    } catch (parseError) {
        console.error("Error parsing request body:", parseError);
        return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!itemId || typeof itemId !== 'string') {
      console.log("Bad request: Missing or invalid Item ID.");
      return NextResponse.json({ error: 'Item ID is required' }, { status: 400 });
    }
    console.log(`Attempting to delete item ID: ${itemId}`);
    if (fileName) console.log(`Associated filename for storage deletion: ${fileName}`);

    // 3. Check if the user is authorized to delete this item (Owner or Admin)
    // Fetch the item's submitter_id using the request-scoped client
    console.log("Fetching item owner details...");
    const { data: itemData, error: queryError } = await supabase
      .from('items')
      .select('submitter_id') // **** Fetch the correct ID column ****
      .eq('id', itemId)
      .maybeSingle(); // Use maybeSingle() in case item doesn't exist

    // Handle query errors (e.g., network issues)
    if (queryError) {
        console.error(`Error querying item ${itemId}:`, queryError);
        return NextResponse.json({ error: 'Database query failed: ' + queryError.message }, { status: 500 });
    }

    // Handle item not found
    if (!itemData) {
        console.log(`Item with ID ${itemId} not found.`);
        return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Now perform the authorization check using IDs
    const itemOwnerId = itemData.submitter_id;
    const currentUserId = user.id;
    const currentUserEmail = user.email; // Keep for admin check

    console.log(`Item Owner ID: ${itemOwnerId}, Current User ID: ${currentUserId}`);

    // Explicit Admin check (keep using email for this example)
    const isAdmin = currentUserEmail === 'riddhimaan22@gmail.com';
    // Owner check using UUIDs
    const isOwner = currentUserId === itemOwnerId;

    if (!isAdmin && !isOwner) {
        console.log(`Authorization failed: User ${currentUserId} is not owner (${itemOwnerId}) and not admin.`);
        return NextResponse.json({ error: 'Forbidden: You do not have permission to delete this item' }, { status: 403 });
    }

    console.log(`Authorization successful: User is ${isAdmin ? 'Admin' : isOwner ? 'Owner' : 'Unknown Role (but passed check)'}. Proceeding with delete.`);

    // 4. Delete from Supabase Database using the utility function
    //    **** Pass the request-scoped 'supabase' client ****
    await deleteItemById(itemId, supabase);
    console.log(`Database record for item ${itemId} deleted successfully.`);

    // 5. Delete from Supabase Storage if fileName is provided
    //    Use the request-scoped 'supabase' client for storage operations too
    if (fileName && typeof fileName === 'string' && fileName.trim() !== '') {
      console.log(`Attempting to delete file from storage: ${fileName}`);
      // Ensure removal target is an array
      const { error: storageError } = await supabase.storage
        .from('item-images') // Ensure this matches your bucket name
        .remove([fileName]); // Pass filename in an array

      if (storageError) {
        // Log the error but don't fail the entire request if DB delete succeeded
        console.error(`Storage delete error for file ${fileName}:`, storageError);
        // Optionally return a partial success message or specific error info
      } else {
        console.log(`Storage file ${fileName} deleted successfully.`);
      }
    } else {
        console.log("No valid filename provided, skipping storage deletion.");
    }

    // 6. Return success response
    return NextResponse.json({
      success: true,
      message: 'Item deleted successfully',
    });

  } catch (error) {
    // Catch any unexpected errors during the process
    console.error('Unexpected error in delete route:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    // Check if it's a Supabase error with a code (like RLS error if checks were bypassed somehow)
     if (error && typeof error === 'object' && 'code' in error) {
         console.error(`Supabase error code: ${error.code}`);
     }
    return NextResponse.json(
      { error: 'Server error during deletion: ' + errorMessage },
      { status: 500 }
    );
  }
}

// OPTIONS handler for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*', // Adjust in production
        'Access-Control-Allow-Methods': 'POST, OPTIONS', // Allow POST and OPTIONS
        'Access-Control-Allow-Headers': 'Content-Type, Authorization' // Allow necessary headers
      }
    });
  }