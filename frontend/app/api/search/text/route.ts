// app/api/search/text/route.ts
import { generateImageEmbedding } from "@/lib/vector-search";
import { supabase } from "@/lib/supabase";

export async function POST(req: Request) {
    const { query, filters } = await req.json();
    
    const { data, error } = await supabase
      .from('items')
      .select('*, item_images(*)')
      .textSearch('title', query, { type: 'websearch' })
      .eq('type', filters.type || 'found');
    
    // Return response
  }
  