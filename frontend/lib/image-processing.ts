// lib/image-processing.ts

import sharp from 'sharp';
import * as tf from '@tensorflow/tfjs';
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Model cache to avoid reloading the model for each request
let modelCache: tf.GraphModel | null = null;

/**
 * Processes an uploaded image file for storage and optimization
 * @param file The image file to process
 * @param itemId The ID of the associated item
 * @returns Object containing processed image data and storage path
 */
export async function processImage(file: File | Buffer, itemId: string): Promise<{
  buffer: Buffer;
  width: number;
  height: number;
  format: string;
  storagePath: string;
}> {
  // Convert File to Buffer if needed
  const buffer = file instanceof File
    ? Buffer.from(await file.arrayBuffer())
    : file;

  // Process image with Sharp
  const image = sharp(buffer);
  const metadata = await image.metadata();
  
  // Resize if dimensions are too large (preserving aspect ratio)
  const MAX_DIMENSION = 1200;
  let resizedImage = image;
  
  if ((metadata.width && metadata.width > MAX_DIMENSION) || 
      (metadata.height && metadata.height > MAX_DIMENSION)) {
    resizedImage = image.resize({
      width: metadata.width && metadata.width > MAX_DIMENSION ? MAX_DIMENSION : undefined,
      height: metadata.height && metadata.height > MAX_DIMENSION ? MAX_DIMENSION : undefined,
      fit: 'inside',
      withoutEnlargement: true
    });
  }
  
  // Convert to optimized format (WebP)
  const processedImageBuffer = await resizedImage.webp({ quality: 80 }).toBuffer();
  
  // Generate a unique filename
  const timestamp = Date.now();
  const storagePath = `items/${itemId}/${timestamp}.webp`;
  
  return {
    buffer: processedImageBuffer,
    width: metadata.width || 0,
    height: metadata.height || 0,
    format: 'webp',
    storagePath
  };
}

/**
 * Uploads an image to Supabase storage
 * @param buffer The image buffer to upload
 * @param path The storage path
 * @returns The public URL of the uploaded image
 */
export async function uploadImageToStorage(buffer: Buffer, path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from('item-images')
    .upload(path, buffer, {
      contentType: 'image/webp',
      upsert: true
    });
  
  if (error) {
    throw new Error(`Error uploading image: ${error.message}`);
  }
  
  // Get public URL
  const { data: { publicUrl } } = supabase.storage
    .from('item-images')
    .getPublicUrl(path);
  
  return publicUrl;
}

/**
 * Loads the image feature extraction model
 * @returns The loaded TensorFlow model
 */
async function loadModel(): Promise<tf.GraphModel> {
  if (modelCache) {
    return modelCache;
  }
  
  // Use MobileNet for feature extraction
  // Can be replaced with more specialized models as needed
  const model = await tf.loadGraphModel(
    'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1',
    { fromTFHub: true }
  );
  
  modelCache = model;
  return model;
}

/**
 * Generates a vector embedding from an image
 * @param imageBuffer The image buffer to process
 * @returns A vector embedding as a Float32Array
 */
export async function generateImageEmbedding(imageBuffer: Buffer): Promise<number[]> {
  try {
    // Preprocess image to match model requirements
    const image = await sharp(imageBuffer)
      .resize(224, 224, { fit: 'cover' })
      .removeAlpha()
      .toBuffer();
    
    // Load the model
    const model = await loadModel();
    
    // Convert image to tensor
    const tensor = tf.node.decodeImage(image, 3);
    const normalized = tf.div(tf.cast(tensor, 'float32'), 255.0);
    const batched = tf.expandDims(normalized, 0);
    const resized = tf.image.resizeBilinear(batched, [224, 224]);
    
    // Generate embedding
    const embedding = model.predict(resized) as tf.Tensor;
    const values = await embedding.data();
    
    // Cleanup tensors to prevent memory leaks
    tensor.dispose();
    normalized.dispose();
    batched.dispose();
    resized.dispose();
    embedding.dispose();
    
    // Convert to regular array (Supabase vector columns expect number[])
    return Array.from(values);
  } catch (error) {
    console.error('Error generating image embedding:', error);
    throw new Error('Failed to generate image embedding');
  }
}

/**
 * Performs image similarity search in the database
 * @param embedding Vector embedding to search with
 * @param threshold Similarity threshold (0-1)
 * @param limit Maximum number of results
 * @returns Array of matching items with similarity scores
 */
export async function searchSimilarImages(
  embedding: number[],
  threshold = 0.7,
  limit = 10
): Promise<any[]> {
  try {
    const { data, error } = await supabase.rpc('search_similar_images', {
      query_embedding: embedding,
      similarity_threshold: threshold,
      max_results: limit
    });
    
    if (error) {
      throw error;
    }
    
    // Fetch full item details for the matched IDs
    if (data && data.length > 0) {
      const itemIds = data.map(item => item.id);
      
      const { data: items, error: itemsError } = await supabase
        .from('items')
        .select('*, item_images(*), profiles:user_id(email)')
        .in('id', itemIds)
        .order('created_at', { ascending: false });
      
      if (itemsError) {
        throw itemsError;
      }
      
      // Add similarity scores to the items
      return items.map(item => {
        const matchData = data.find(d => d.id === item.id);
        return {
          ...item,
          similarity: matchData ? matchData.similarity : 0
        };
      });
    }
    
    return [];
  } catch (error) {
    console.error('Error searching similar images:', error);
    throw new Error('Failed to search for similar images');
  }
}
