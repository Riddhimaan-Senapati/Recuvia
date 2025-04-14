// utils/supabase.ts
import { createClient, SupabaseClient } from '@supabase/supabase-js'; // **** IMPORT SupabaseClient TYPE ****
import { cookies } from 'next/headers'; // Keep for potential server component usage

// Create Supabase client (Singleton for general use, e.g., in utility functions or potentially server components)
// Route Handlers should use createRouteHandlerClient for proper request context.
export const supabase = (() => {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    // Ensure this error is thrown during build or startup if variables are missing
    console.error('CRITICAL: Missing Supabase environment variables');
    throw new Error('Missing Supabase environment variables');
  }

  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        flowType: 'pkce',
        storageKey: 'sb-kryikfrrvypivktkqgya-auth-token' // Default key
      }
    }
  );
})();

// Vector search constants
export const VECTOR_DIMENSION = 512;
export const COLLECTION_NAME = 'items';
export const VECTOR_FIELD_NAME = 'embedding';
export const SIMILARITY_THRESHOLD = 0.7;
export const MAX_RESULTS = 20;

// Processing status in-memory store
export const processingStatus: Record<string, {
  status: 'processing' | 'complete' | 'error',
  message: string,
  timestamp: number
}> = {};

// Vector Search function (uses the global singleton client - OK if RLS allows public select)
export async function searchByVector(embedding: number[], limit: number = MAX_RESULTS) {
  try {
    // Using global client
    const { data, error } = await supabase.rpc('match_items', {
        query_embedding: embedding,
        match_threshold: SIMILARITY_THRESHOLD,
        match_count: limit
    });
    if (error) {
        console.error("Error in RPC match_items:", error);
        throw error;
    }
    return data || [];
  } catch (error) {
    console.error('Error executing vector search:', error);
    throw error;
  }
}

// Insert Item function
export async function insertItemWithEmbedding(
    item: {
        id: string;
        title: string;
        description?: string;
        location: string;
        url: string;
        submitter_id: string; // Make sure this is provided correctly from a validated session
        embedding: number[];
    },
    supabaseClient: SupabaseClient // Accept the specific Supabase client instance
) {
    try {
        // **** Use the PASSED-IN supabaseClient, NOT the global 'supabase' ****
        // This client has the user's auth context from the API route
        const { data, error } = await supabaseClient // Use the passed client here
            .from(COLLECTION_NAME)
            .insert([item])
            .select(); // .select() is optional, confirms insert

        if (error) {
            console.error(`Error inserting item ${item.id} using provided client:`, error);
            // Throw the original Supabase error for more details upstream
            // You might want to wrap it or just throw it directly
            throw new Error(`Database insert error for item ${item.id}: ${error.message}`);
            // Or: throw error;
        }
        console.log(`Successfully inserted item ${item.id} using request-scoped client.`);
        return data; // Return the inserted data (or confirmation)
    } catch (error) {
        // Catch potential network or other errors during the try block
        console.error(`Error during item insertion process for item ${item.id}:`, error);
        // Ensure the error is propagated
        throw error;
    }
}


// Delete Item function (uses the global singleton client)
export async function deleteItemById(
  itemId: string,
  supabaseClient: SupabaseClient // Accept the specific Supabase client instance
  ) {
  try {
      // **** Use the PASSED-IN supabaseClient, NOT the global 'supabase' ****
      // This client has the user's auth context, necessary for RLS check on delete
      const { error } = await supabaseClient // Use the passed client here
          .from(COLLECTION_NAME)
          .delete()
          .eq('id', itemId); // Match the item ID to delete

      if (error) {
          console.error(`Error deleting item ${itemId} using provided client:`, error);
          // Throw the original Supabase error for more details upstream
          // You might want to wrap it or just throw it directly
          throw error; // Throw the Supabase error object itself
      }
      console.log(`Successfully deleted item ${itemId} using request-scoped client.`);
      return true; // Indicate success
  } catch (error) {
      // Catch potential network or other errors during the try block
      console.error(`Error during deletion process for item ${itemId}:`, error);
      // Ensure the error is propagated
      throw error;
  }
}