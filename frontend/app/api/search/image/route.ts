// app/api/search/image/route.ts
import { generateImageEmbedding } from "@/lib/vector-search";
import { supabase } from "@/lib/supabase";
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
  