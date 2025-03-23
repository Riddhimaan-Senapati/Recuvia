import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { milvus, COLLECTION_NAME, VECTOR_FIELD_NAME } from '@/app/utils/milvus';

// For embedding generation in server
import { AutoProcessor, RawImage, CLIPVisionModelWithProjection } from "@xenova/transformers";

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Extend the function timeout for Vercel

export async function POST(req: NextRequest) {
  try {
    // Get cookie store
    const cookieStore = cookies();
    
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
    const image = formData.get('image') as File;
    
    if (!title || !location || !image) {
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
        { error: 'Failed to upload image: ' + uploadError.message },
        { status: 500 }
      );
    }
    
    // 5. Get the public URL for the uploaded image
    const { data: urlData } = supabase.storage
      .from('item-images')
      .getPublicUrl(fileName);
    
    const imageUrl = urlData?.publicUrl;
    
    // 6. Generate image embedding without using filesystem
    // Initialize the model and processor
    const model_id = "Xenova/clip-vit-base-patch16";
    const processor = await AutoProcessor.from_pretrained(model_id);
    const vision_model = await CLIPVisionModelWithProjection.from_pretrained(model_id, {
      quantized: false,
    });
    
    // Process the image directly from array buffer
    let image_obj;
    try {
      // Try to use the buffer directly
      image_obj = await RawImage.fromBlob(new Blob([imageBytes], { type: image.type || 'image/jpeg' }));
    } catch (e) {
      // Fallback: Convert to base64 and use that
      const base64 = Buffer.from(imageBytes).toString('base64');
      const dataUrl = `data:${image.type || 'image/jpeg'};base64,${base64}`;
      image_obj = await RawImage.fromBlob(await (await fetch(dataUrl)).blob());
    }
    
    const image_inputs = await processor(image_obj);
    const { image_embeds } = await vision_model(image_inputs);
    const imageVector = image_embeds.tolist()[0];
      
    // 7. Insert into Milvus using the provided milvus utility
    // Make sure all necessary fields are included
    await milvus.insert({
      collection_name: COLLECTION_NAME,
      fields_data: [{
        [VECTOR_FIELD_NAME]: imageVector,
        imageId: itemId,
        url: imageUrl,
        aiDescription: title,
        photoDescription: description || "",
        location: location,
        submitter_email: session.user.email,
        created_at: new Date().toISOString(),
        blurHash: "",
        ratio: 1.0, // Default aspect ratio
      }],
    });
    
    // Return success response with all item data
    return NextResponse.json({
      success: true,
      item: {
        id: itemId,
        title,
        description,
        location,
        submitter_email: session.user.email,
        created_at: new Date().toISOString(),
        item_images: [{
          image_url: imageUrl
        }],
        profiles: {
          email: session.user.email
        }
      }
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Something went wrong: ' + (error instanceof Error ? error.message : String(error)) },
      { status: 500 }
    );
  }
}
