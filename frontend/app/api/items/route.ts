// app/api/items/route.ts
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { processImage, uploadImageToStorage, generateImageEmbedding } from "@/lib/image-processing";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type');
    
    const supabase = createRouteHandlerClient({ cookies });
    
    const { data, error } = await supabase
      .from('items')
      .select('*, item_images(*), profiles:user_id(email)')
      .eq('type', type || 'found')
      .order('created_at', { ascending: false });
    
    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const type = formData.get('type') as string;
    const location = formData.get('location') as string;
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }
    
    const supabase = createRouteHandlerClient({ cookies });
    
    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Create item
    const { data: item, error: itemError } = await supabase
      .from('items')
      .insert({
        user_id: user.id,
        type: type || 'found',
        title,
        description,
        location,
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    
    if (itemError) {
      return NextResponse.json(
        { error: itemError.message },
        { status: 500 }
      );
    }
    
    // Process image
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    
    const processedImage = await processImage(buffer, item.id);
    
    // Upload to storage
    const imageUrl = await uploadImageToStorage(
      processedImage.buffer, 
      processedImage.storagePath
    );
    
    // Generate embedding
    const embedding = await generateImageEmbedding(processedImage.buffer);
    
    // Create image record
    const { data: imageData, error: imageError } = await supabase
      .from('item_images')
      .insert({
        item_id: item.id,
        image_url: imageUrl,
        image_vector: embedding
      })
      .select()
      .single();
    
    if (imageError) {
      return NextResponse.json(
        { error: imageError.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json({ 
      item: {
        ...item,
        item_images: [imageData]
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}

  