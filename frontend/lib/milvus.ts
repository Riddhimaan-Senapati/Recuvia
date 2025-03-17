// lib/milvus.ts
import { MilvusClient, DataType } from '@zilliz/milvus2-sdk-node';

// Environment variables
export const MILVUS_ADDRESS = process.env.MILVUS_ADDRESS || 'localhost:19530';
export const MILVUS_TOKEN = process.env.MILVUS_TOKEN || '';
export const COLLECTION_NAME = 'lost_found_items';
export const MILVUS_USERNAME = process.env.MILVUS_USERNAME;
export const MILVUS_PASSWORD = process.env.MILVUS_PASSWORD;

// Initialize Milvus client using the REST API client
export const milvusClient = new MilvusClient({
  address: MILVUS_ADDRESS,
  token: MILVUS_TOKEN,
  /*ssl: true,
  username: MILVUS_USERNAME,
  password: MILVUS_PASSWORD,
  */
});

// Schema definition
const COLLECTION_FIELDS = [
  {
    name: 'id',
    description: 'ID of the item',
    data_type: DataType.VarChar,
    is_primary_key: true,
    max_length: 36
  },
  {
    name: 'title',
    description: 'Title of the item',
    data_type: DataType.VarChar,
    max_length: 100
  },
  {
    name: 'description',
    description: 'Description of the item',
    data_type: DataType.VarChar,
    max_length: 1000
  },
  {
    name: 'location',
    description: 'Location where the item was found/lost',
    data_type: DataType.VarChar,
    max_length: 100
  },
  {
    name: 'submitter_email',
    description: 'Email of the person who submitted the item',
    data_type: DataType.VarChar,
    max_length: 100
  },
  {
    name: 'image_url',
    description: 'URL of the item image',
    data_type: DataType.VarChar,
    max_length: 500
  },
  {
    name: 'item_type',
    description: 'Type of the item (found/lost)',
    data_type: DataType.VarChar,
    max_length: 10
  },
  {
    name: 'created_at',
    description: 'Timestamp when the item was created',
    data_type: DataType.VarChar,
    max_length: 30
  },
  {
    name: 'image_embedding',
    description: 'Vector embedding of the item image',
    data_type: DataType.FloatVector,
    dim: 512 // Adjust based on your embedding model
  }
];

// Function to initialize Milvus collection
export async function initMilvusCollection() {
  try {
    // Check if collection exists
    const hasCollection = await milvusClient.hasCollection({
      collection_name: COLLECTION_NAME
    });

    if (!hasCollection) {
      console.log(`Creating collection ${COLLECTION_NAME}...`);
      
      // Create collection
      await milvusClient.createCollection({
        collection_name: COLLECTION_NAME,
        fields: COLLECTION_FIELDS
      });
      
      // Create index on the vector field
      await milvusClient.createIndex({
        collection_name: COLLECTION_NAME,
        field_name: 'image_embedding',
        index_type: 'HNSW',
        metric_type: 'COSINE',
        params: { M: 8, efConstruction: 200 }
      });
      
      console.log(`Collection ${COLLECTION_NAME} created successfully`);
    } else {
      console.log(`Collection ${COLLECTION_NAME} already exists`);
    }
    
    // Load collection to memory
    await milvusClient.loadCollection({
      collection_name: COLLECTION_NAME
    });
    
    return true;
  } catch (error) {
    console.error(`Error initializing Milvus collection: ${error}`);
    throw error;
  }
}