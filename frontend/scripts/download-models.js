const fs = require('fs');
const path = require('path');

async function downloadModels() {
  try {
    // Dynamically import transformers
    const { pipeline } = await import('@xenova/transformers');

    const modelPath = path.join(process.cwd(), '.cache', 'transformers', 'Xenova/clip-vit-base-patch16');
    
    // Check if models are already downloaded
    if (fs.existsSync(modelPath)) {
      console.log('Models already downloaded');
      return;
    }

    // Ensure cache directory exists
    fs.mkdirSync(modelPath, { recursive: true });

    // Download models
    await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch16', {
      cache_dir: modelPath
    });
    
    console.log('Models downloaded successfully');
  } catch (error) {
    console.error('Error downloading models:', error);
    // Don't exit process to prevent build failure
  }
}

// Wrap in an async IIFE to use await
(async () => {
  await downloadModels();
})();