// lib/milvus.ts
import { MilvusClient, DataType } from '@zilliz/milvus2-sdk-node';

// Configuration
export const MILVUS_ADDRESS = process.env.MILVUS_ADDRESS || 'your-zilliz-endpoint';
export const MILVUS_TOKEN = process.env.MILVUS_TOKEN || 'your-api-key';
export const COLLECTION_NAME = 'lost_and_found_items';

// Initialize client with proper credentials
export const milvusClient = new MilvusClient({
  address: MILVUS_ADDRESS,
  token: MILVUS_TOKEN
});

export async function initMilvusCollection() {
  try {
    const exists = await milvusClient.hasCollection({
      collection_name: COLLECTION_NAME
    });

    if (!exists.value) {
      await milvusClient.createCollection({
        collection_name: COLLECTION_NAME,
        fields: [
          { name: 'id', data_type: DataType.Int64, is_primary_key: true, autoID: true },
          { name: 'title', data_type: DataType.VarChar, max_length: 200 },
          { name: 'description', data_type: DataType.VarChar, max_length: 1000 },
          { name: 'image_embedding', data_type: DataType.FloatVector, dim: 1024 },
          { name: 'location', data_type: DataType.VarChar, max_length: 200 },
          { name: 'submitter_email', data_type: DataType.VarChar, max_length: 320 },
          { name: 'image_url', data_type: DataType.VarChar, max_length: 2048 },
          { name: 'item_type', data_type: DataType.VarChar, max_length: 50 },
          { name: 'created_at', data_type: DataType.VarChar, max_length: 64 }
        ]
      });

      await milvusClient.createIndex({
        collection_name: COLLECTION_NAME,
        field_name: 'image_embedding',
        index_type: 'IVF_FLAT',
        metric_type: 'COSINE'
      });

      await milvusClient.loadCollectionSync({
        collection_name: COLLECTION_NAME
      });
    }
  } catch (error) {
    console.error('Milvus initialization error:', error);
    throw error;
  }
}
