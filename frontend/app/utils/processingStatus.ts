// Track processing status
export interface ProcessingStatus {
  [key: string]: {
    status: 'processing' | 'complete' | 'error';
    message?: string;
    timestamp: number;
  }
}

// In-memory status tracking (will reset on deployment)
// In production, use a persistent store like Redis or DynamoDB
export const processingStatus: ProcessingStatus = {};
