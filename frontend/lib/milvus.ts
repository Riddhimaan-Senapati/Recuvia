// lib/milvus.ts
import { MilvusClient } from '@zilliz/milvus2-sdk-node';
import * as tf from '@tensorflow/tfjs-node';

// Initialize Milvus client
const milvusClient = new MilvusClient(process.env.MILVUS_ADDRESS || 'localhost:19530');

// Collection configuration
const COLLECTION_NAME = 'lost_and_found_items';
const VECTOR_DIMENSION = 1024; // Must match your embedding model's output dimension

// Initialize the collection
export async function initMilvusCollection() {
  try {
    const hasCollection = await milvusClient.hasCollection({
      collection_name: COLLECTION_NAME,
    });

    if (!hasCollection) {
      // Create collection for lost and found items
      await milvusClient.createCollection({
        collection_name: COLLECTION_NAME,
        fields: [
          {
            name: 'id',
            description: 'ID field',
            data_type: 5, // DataType.Int64
            is_primary_key: true,
            autoID: true,
          },
          {
            name: 'image_embedding',
            description: 'Image embedding vector',
            data_type: 101, // DataType.FloatVector
            dim: VECTOR_DIMENSION,
          },
          {
            name: 'title',
            description: 'Item title',
            data_type: 21, // DataType.VarChar
            max_length: 255,
          },
          {
            name: 'description',
            description: 'Item description',
            data_type: 21, // DataType.VarChar
            max_length: 1000,
          },
          {
            name: 'location',
            description: 'Item location',
            data_type: 21, // DataType.VarChar
            max_length: 255,
          },
          {
            name: 'submitter_email',
            description: 'Email of the person who submitted the item',
            data_type: 21, // DataType.VarChar
            max_length: 255,
          },
          {
            name: 'image_url',
            description: 'URL to the stored image',
            data_type: 21, // DataType.VarChar
            max_length: 1000,
          },
          {
            name: 'item_type',
            description: 'Type of item (lost or found)',
            data_type: 21, // DataType.VarChar
            max_length: 10,
          },
          {
            name: 'created_at',
            description: 'Timestamp when the item was created',
            data_type: 21, // DataType.VarChar
            max_length: 30,
          }
        ],
      });

      // Create index for vector search
      await milvusClient.createIndex({
        collection_name: COLLECTION_NAME,
        field_name: 'image_embedding',
        index_type: 'IVF_FLAT',
        metric_type: 'COSINE',
        params: { nlist: 1024 },
      });
    }

    // Load collection into memory for searching
    await milvusClient.loadCollection({
      collection_name: COLLECTION_NAME,
    });

    return true;
  } catch (error) {
    console.error('Failed to initialize Milvus collection:', error);
    throw error;
  }
}

// Generate embedding from image
export async function generateImageEmbedding(imageBuffer: Buffer): Promise<number[]> {
  // Load MobileNet for feature extraction
  const model = await tf.loadGraphModel(
    'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1',
    { fromTFHub: true }
  );
  
  // Process image to tensor
  const image = tf.node.decodeImage(imageBuffer, 3);
  const resized = tf.image.resizeBilinear(image, [224, 224]);
  const normalized = tf.div(tf.cast(resized, 'float32'), 255.0);
  const batched = tf.expandDims(normalized, 0);
  
  // Generate embedding
  const embedding = model.predict(batched) as tf.Tensor;
  const values = await embedding.data();
  
  // Clean up tensors
  image.dispose();
  resized.dispose();
  normalized.dispose();
  batched.dispose();
  embedding.dispose();
  
  return Array.from(values);
}

export { milvusClient, COLLECTION_NAME };
