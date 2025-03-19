import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { milvus, COLLECTION_NAME, VECTOR_FIELD_NAME } from '@/app/utils/milvus';
import { promises as fs } from 'fs';
import { join } from 'path';
import os from 'os';

// For embedding generation in server
import { AutoProcessor, RawImage, CLIPVisionModelWithProjection } from "@xenova/transformers";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // FIX: Properly await cookies before creating the Supabase client
    const cookieStore = await cookies();
    
    // 1. Get authenticated user
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    // 2. Parse the form data
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const location = formData.get('location') as string;
    const type = formData.get('type') as string;
    const image = formData.get('image') as File;
    
    if (!title || !location || !image || !type) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    // 3. Generate a unique ID for the item
    const itemId = uuidv4();
    
    // 4. Upload image to Supabase Storage
    const imageBuffer = await image.arrayBuffer();
    const imageBytes = new Uint8Array(imageBuffer);
    
    const fileName = `${itemId}-${image.name.replace(/\s/g, '_')}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('item-images')
      .upload(fileName, imageBytes);
    
    if (uploadError) {
      console.error('Storage upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload image' },
        { status: 500 }
      );
    }
    
    // 5. Get the public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('item-images')
      .getPublicUrl(fileName);
    
    const imageUrl = urlData?.publicUrl;
    
    // 6. Save the uploaded image temporarily to process with transformers
    const tempDir = os.tmpdir();
    const tempFilePath = join(tempDir, fileName);
    await fs.writeFile(tempFilePath, imageBytes);
    
    // 7. Generate image embedding
    // Initialize the model and processor
    const model_id = "Xenova/clip-vit-base-patch16";
    const processor = await AutoProcessor.from_pretrained(model_id);
    const vision_model = await CLIPVisionModelWithProjection.from_pretrained(model_id, {
      quantized: false,
    });
    
    // Process the image and generate embedding
    const image_obj = await RawImage.read(tempFilePath);
    const image_inputs = await processor(image_obj);
    const { image_embeds } = await vision_model(image_inputs);
    const imageVector = image_embeds.tolist()[0];
    
    // Clean up temporary file
    await fs.unlink(tempFilePath);
    
    // 8. Save item data to Supabase
    const { data: itemData, error: itemError } = await supabase
      .from('items')
      .insert({
        id: itemId,
        title,
        description,
        location,
        type,
        user_id: session.user.id,
      })
      .select()
      .single();
    
    if (itemError) {
      console.error('Database error:', itemError);
      return NextResponse.json(
        { error: 'Failed to save item data' },
        { status: 500 }
      );
    }
    
    // 9. Save image metadata to Supabase
    const { error: imageDbError } = await supabase
      .from('item_images')
      .insert({
        item_id: itemId,
        image_url: imageUrl,
        storage_path: fileName,
      });
    
    if (imageDbError) {
      console.error('Image metadata error:', imageDbError);
      return NextResponse.json(
        { error: 'Failed to save image metadata' },
        { status: 500 }
      );
    }
    
    // 10. Insert into Milvus using the provided milvus utility
    await milvus.insert({
      collection_name: COLLECTION_NAME,
      fields_data: [{
        [VECTOR_FIELD_NAME]: imageVector,
        imageId: itemId,
        url: imageUrl,
        aiDescription: title,
        photoDescription: description || "",
        blurHash: "",
        ratio: 1.0, // Default aspect ratio
      }],
    });
    
    return NextResponse.json({
      success: true,
      item: {
        ...itemData,
        image_url: imageUrl
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    );
  }
}
