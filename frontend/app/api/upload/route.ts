// app/api/upload/route.ts
import { NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { milvusClient, COLLECTION_NAME, initMilvusCollection } from '@/lib/milvus';
//import { generateImageEmbedding } from '@/lib/tensorflow-server';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    await initMilvusCollection();
    
    // Parse form data
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string;
    const location = formData.get('location') as string;
    const type = formData.get('type') as string || 'found';
    const imageFile = formData.get('image') as File;
    
    if (!imageFile) {
      return NextResponse.json(
        { error: 'Image is required' },
        { status: 400 }
      );
    }
    
    // Get current user from Supabase
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    
    if (userError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }
    
    // Upload image to storage (using Supabase)
    const arrayBuffer = await imageFile.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const fileName = `${Date.now()}_${imageFile.name.replace(/\s+/g, '_')}`;
    
    const { data: uploadData, error: uploadError } = await supabase
      .storage
      .from('item-images')
      .upload(fileName, buffer);
    
    if (uploadError) {
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }
    
    // Get public URL
    const { data: { publicUrl } } = supabase
      .storage
      .from('item-images')
      .getPublicUrl(fileName);
    
    // Generate embedding
    const embedding = await generateImageEmbedding(buffer);
    
    // Insert into Milvus
    const milvusData = await milvusClient.insert({
 collection_name: COLLECTION_NAME,
 fields_data: [{
    title,
    description,
    location,
    submitter_email: user.email,
    image_url: publicUrl,
    item_type: type,
    created_at: new Date().toISOString(),
    image_embedding: embedding // Ensure correct field name
  }]
});

    
    return NextResponse.json({
      success: true,
      item: {
        id: milvusData.primary_keys[0],
        title,
        description,
        location,
        submitter_email: user.email,
        image_url: publicUrl,
        item_type: type
      }
    }, { status: 201 });
  } catch (error) {
    console.error('Error uploading item:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
