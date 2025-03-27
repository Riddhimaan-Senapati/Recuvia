import {
    InsertReq,
    MilvusClient,
    QueryReq,
    SearchSimpleReq,
    DeleteReq,
  } from "@zilliz/milvus2-sdk-node";
  
  // Define constants for the Milvus client
  const DIM = 512; // model Xenova/clip-vit-base-patch16 embedding dimension
  export const COLLECTION_NAME = "semantic_image_search"; // example collection name
  export const VECTOR_FIELD_NAME = "vector"; // verctor field name
  export const METRIC_TYPE = "COSINE";
  export const INDEX_TYPE = "AUTOINDEX";
  
  // Retry configuration
  const MAX_RETRIES = 3;
  const RETRY_DELAY_MS = 1000;
  
  class Milvus {
    private _client: MilvusClient | undefined;
    private _lastConnectionTime: number = 0;
    private _connectionValid: boolean = false;
    private _connectionTimeout: number = 10000; // 10 seconds
  
    constructor() {
      if (!this._client) {
        this.init(); // Initialize the Milvus client
      }
    }
  
    // Get the Milvus client with health check
    public async getClient() {
      // Check if connection is stale (older than 30 seconds)
      const now = Date.now();
      if (!this._connectionValid || (now - this._lastConnectionTime > 30000)) {
        console.log("Connection may be stale, reinitializing...");
        await this.init();
      }
      return this._client;
    }
  
    // Check if a collection exists with retry
    public async hasCollection() {
      return await this.withRetry(async () => {
        const client = await this.getClient();
        return await client?.hasCollection({
          collection_name: COLLECTION_NAME,
        });
      });
    }
  
    // Initialize the Milvus client
    public async init() {
      // URI is required to connect to Milvus, TOKEN is optional
      if (!process.env.URI) {
        throw new Error("URI is required, please check your .env file.");
      }
  
      try {
        // Create a new Milvus client with optimized settings for serverless
        this._client = new MilvusClient({
          address: process.env.URI || "",
          token: process.env.TOKEN,
          ssl: process.env.NODE_ENV === 'production', // Use SSL in production
          timeout: this._connectionTimeout, // Overall timeout
          channelOptions: {
            "grpc.keepalive_time_ms": 40000, // Reduce from 40000
            "grpc.keepalive_timeout_ms": 5000, // Reduce from 5000
            "grpc.max_reconnect_backoff_ms": 5000, // Add reconnection backoff
            "grpc.min_reconnect_backoff_ms": 1000, // Add minimum reconnection backoff
            "grpc.max_send_message_length": 4 * 1024 * 1024, // Limit message size
            "grpc.max_receive_message_length": 4 * 1024 * 1024, // Limit message size
            "grpc.service_config": JSON.stringify({
              "methodConfig": [{
                "name": [{ "service": "milvus.proto.milvus.MilvusService" }],
                "retryPolicy": {
                  "maxAttempts": 3,
                  "initialBackoff": "0.1s",
                  "maxBackoff": "1s",
                  "backoffMultiplier": 1.5,
                  "retryableStatusCodes": ["UNAVAILABLE", "DEADLINE_EXCEEDED"]
                }
              }]
            })
          },
        });
        
        // Validate connection with a simple ping
        await this.pingServer();
        
        // Create a new collection if needed
        await this.createCollection();
        
        // Mark connection as valid and update timestamp
        this._connectionValid = true;
        this._lastConnectionTime = Date.now();
        
        console.log("Milvus client initialized successfully");
        return true;
      } catch (error) {
        console.error("Failed to initialize Milvus client:", error);
        this._connectionValid = false;
        throw error;
      }
    }
    
    // Ping server to check connection
    private async pingServer() {
      try {
        const res = await this._client?.listCollections();
        return !!res;
      } catch (error) {
        console.error("Ping server failed:", error);
        this._connectionValid = false;
        throw error;
      }
    }
    
    // Helper method to implement retry logic
    private async withRetry<T>(fn: () => Promise<T>, retries = MAX_RETRIES): Promise<T> {
      let lastError: any;
      
      for (let attempt = 0; attempt < retries; attempt++) {
        try {
          return await fn();
        } catch (error) {
          console.warn(`Attempt ${attempt + 1}/${retries} failed:`, error);
          lastError = error;
          
          // Wait before retrying (with exponential backoff)
          if (attempt < retries - 1) {
            const delay = RETRY_DELAY_MS * Math.pow(2, attempt);
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Reinitialize client if needed
            if (!this._connectionValid) {
              await this.init();
            }
          }
        }
      }
      
      throw lastError;
    }
  
    // Create a new collection
    public async createCollection() {
      return await this.withRetry(async () => {
        try {
          // Check if the collection exists
          const res = await this._client?.hasCollection({
            collection_name: COLLECTION_NAME,
          });
          
          if (res?.value) {
            return res;
          }
          
          // Create a new collection
          const collectionRes = await this._client?.createCollection({
            collection_name: COLLECTION_NAME,
            dimension: DIM,
            metric_type: METRIC_TYPE,
            auto_id: true,
          });
    
          return collectionRes;
        } catch (error) {
          throw error;
        }
      });
    }
  
    // List all collections
    public async listCollections() {
      return await this.withRetry(async () => {
        const client = await this.getClient();
        return await client?.listCollections();
      });
    }
  
    // Query data from a collection
    public async query(data: QueryReq) {
      return await this.withRetry(async () => {
        const client = await this.getClient();
        return await client?.query(data);
      });
    }
  
    // Search for data in a collection
    public async search(data: SearchSimpleReq) {
      return await this.withRetry(async () => {
        const client = await this.getClient();
        return await client?.search(data);
      });
    }
  
    // Insert data into a collection
    public async insert(data: InsertReq) {
      return await this.withRetry(async () => {
        const client = await this.getClient();
        return await client?.insert(data);
      });
    }
  
    // Delete entities from a collection
    public async deleteEntities(data: DeleteReq) {
      return await this.withRetry(async () => {
        const client = await this.getClient();
        return await client?.deleteEntities(data);
      });
    }
  }
  
  // Create a singleton instance of the Milvus class
  const milvus = new Milvus();
  
  export { milvus };