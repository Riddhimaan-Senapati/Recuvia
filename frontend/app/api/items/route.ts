// app/api/items/route.ts
export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    
    const { data, error } = await supabase
      .from('items')
      .select('*, item_images(*)')
      .eq('type', type || 'found')
      .order('created_at', { ascending: false });
    
    // Return response
  }
  
  export async function POST(req: Request) {
    const { title, description, type, location, images } = await req.json();
    const { data: { user } } = await supabase.auth.getUser();
    
    // Create item and process images
    // Return response
  }
  