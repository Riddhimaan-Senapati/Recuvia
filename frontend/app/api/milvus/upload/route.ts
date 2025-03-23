import { NextRequest, NextResponse } from 'next/server';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { v4 as uuidv4 } from 'uuid';
import { milvus, COLLECTION_NAME, VECTOR_FIELD_NAME } from '@/app/utils/milvus';

// For embedding generation in server
import { AutoProcessor, RawImage, CLIPVisionModelWithProjection } from "@xenova/transformers";

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Set the proper content type
  const headers = new Headers();
  headers.set('Content-Type', 'application/json');

  try {
    // Get cookie store
    const cookieStore = cookies();
    
    // 1. Get authenticated user
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return new NextResponse(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers }
      );
    }
    
    // 2. Parse the form data
    const formData = await req.formData();
    const title = formData.get('title') as string;
    const description = formData.get('description') as string || '';
    const location = formData.get('location') as string;
    const image = formData.get('image') as File;
    
    if (!title || !location || !image) {
      return new NextResponse(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers }
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
      return new NextResponse(
        JSON.stringify({ error: 'Failed to upload image: ' + uploadError.message }),
        { status: 500, headers }
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
    
    // Process the image directly from array buffer as a blob
    const blob = new Blob([imageBytes], { type: image.type || 'image/jpeg' });
    const image_obj = await RawImage.fromBlob(blob);
    
    const image_inputs = await processor(image_obj);
    const { image_embeds } = await vision_model(image_inputs);
    const imageVector = image_embeds.tolist()[0];
      
    // 7. Insert into Milvus using the provided milvus utility
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
    return new NextResponse(
      JSON.stringify({
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
      }),
      { status: 200, headers }
    );
  } catch (error) {
    console.error('Upload error:', error);
    return new NextResponse(
      JSON.stringify({ error: 'Something went wrong: ' + (error instanceof Error ? error.message : String(error)) }),
      { status: 500, headers }
    );
  }
}
