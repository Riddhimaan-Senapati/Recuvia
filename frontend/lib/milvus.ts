//lib/milvusClient.ts
import { MilvusClient, DataType } from '@zilliz/milvus2-sdk-node';

// Zilliz Cloud configuration
const MILVUS_URI = process.env.MILVUS_URI || 'YOUR_CLUSTER_ENDPOINT';
const MILVUS_TOKEN = process.env.MILVUS_TOKEN || 'YOUR_API_KEY';

const milvusClient = new MilvusClient({
  uri: MILVUS_URI,
  token: MILVUS_TOKEN
});

const COLLECTION_NAME = 'lost_and_found_items';
const VECTOR_DIMENSION = 1024; // Match your embedding model output

// Updated schema to match API routes
export async function initMilvusCollection() {
  try {
    const hasCollection = await milvusClient.hasCollection({
      collection_name: COLLECTION_NAME,
    });

    if (!hasCollection.value) {
      await milvusClient.createCollection({
        collection_name: COLLECTION_NAME,
        fields: [
          {
            name: 'id',
            data_type: DataType.Int64,
            is_primary_key: true,
            autoID: true,
          },
          {
            name: 'title',
            data_type: DataType.VarChar,
            max_length: 200,
          },
          {
            name: 'description',
            data_type: DataType.VarChar,
            max_length: 1000,
          },
          {
            name: 'image_embedding', // Changed from 'vector'
            data_type: DataType.FloatVector,
            dim: VECTOR_DIMENSION,
          },
          {
            name: 'location',
            data_type: DataType.VarChar,
            max_length: 200,
          },
          {
            name: 'submitter_email',
            data_type: DataType.VarChar,
            max_length: 320,
          },
          {
            name: 'image_url',
            data_type: DataType.VarChar,
            max_length: 2048,
          },
          {
            name: 'item_type',
            data_type: DataType.VarChar,
            max_length: 50,
          },
          {
            name: 'created_at',
            data_type: DataType.VarChar, // Changed to store ISO strings
            max_length: 64,
          }
        ],
      });

      await milvusClient.createIndex({
        collection_name: COLLECTION_NAME,
        field_name: 'image_embedding',
        index_name: 'image_embedding_index',
        index_type: 'IVF_FLAT',
        metric_type: 'COSINE', // Matches search parameter
        params: { nlist: 128 },
      });

      await milvusClient.loadCollectionSync({
        collection_name: COLLECTION_NAME,
      });
    }
  } catch (error) {
    console.error('Milvus initialization failed:', error);
    throw error;
  }
}
