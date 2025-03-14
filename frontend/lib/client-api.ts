// lib/client-api.ts

/**
 * Client-safe API wrapper for vector search operations
 * Keeps TensorFlow operations server-side only
 */

/**
 * Generate vector embedding for an image via server API
 */
export async function generateImageEmbeddingViaAPI(imageFile: File) {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await fetch('/api/generate-embedding', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to generate embedding');
    }
    
    return response.json();
  }
  
  /**
   * Search for similar images using vector search
   */
  export async function searchSimilarImagesViaAPI(imageFile: File) {
    const formData = new FormData();
    formData.append('image', imageFile);
    
    const response = await fetch('/api/search/image', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to search for similar images');
    }
    
    return response.json();
  }
  
  /**
   * Upload a new item with image
   */
  export async function uploadItemWithImage(
    title: string,
    description: string,
    location: string,
    type: string,
    imageFile: File
  ) {
    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('location', location);
    formData.append('type', type);
    formData.append('image', imageFile);
    
    const response = await fetch('/api/items', {
      method: 'POST',
      body: formData
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Failed to upload item');
    }
    
    return response.json();
  }
  