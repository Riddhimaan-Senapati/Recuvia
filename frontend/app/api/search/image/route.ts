// app/api/search/image/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { generateImageEmbedding, searchSimilarImages } from "@/lib/image-processing";

export async function POST(req: Request) {
  try {
    // Process uploaded image
    const formData = await req.formData();
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }
    
    // Convert to buffer
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    // Generate vector embedding from image
    const embedding = await generateImageEmbedding(buffer);
    
    // Search for similar items
    const results = await searchSimilarImages(embedding, 0.7, 10);
    
    return NextResponse.json({ items: results });
  } catch (error) {
    console.error('Error searching by image:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
