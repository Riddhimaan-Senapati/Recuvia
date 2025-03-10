// app/api/search/text/route.ts
export async function POST(req: Request) {
    const { query, filters } = await req.json();
    
    const { data, error } = await supabase
      .from('items')
      .select('*, item_images(*)')
      .textSearch('title', query, { type: 'websearch' })
      .eq('type', filters.type || 'found');
    
    // Return response
  }
  
  // app/api/search/image/route.ts
  export async function POST(req: Request) {
    // Process uploaded image
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    
    // Generate vector embedding from image
    const embedding = await generateImageEmbedding(imageFile);
    
    // Search for similar items using vector similarity
    const { data, error } = await supabase.rpc('search_similar_images', {
      query_embedding: embedding,
      similarity_threshold: 0.7,
      max_results: 10
    });
    
    // Return response
  }
  