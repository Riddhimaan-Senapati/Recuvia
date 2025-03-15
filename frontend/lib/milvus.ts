// lib/milvus.ts
import { MilvusClient } from '@zilliz/milvus2-sdk-node';

// Initialize Milvus client
const milvusClient = new MilvusClient(process.env.MILVUS_ADDRESS || 'localhost:19530');

// Collection configuration
const COLLECTION_NAME = 'lost_and_found_items';
const VECTOR_DIMENSION = 1024;

// Initialize the collection
export async function initMilvusCollection() {
  try {
    // Collection initialization code...
  } catch (error) {
    console.error('Failed to initialize Milvus collection:', error);
    throw error;
  }
}

export { milvusClient, COLLECTION_NAME };
