(async () => {
  const { pipeline } = await import('@xenova/transformers');

  async function downloadModels() {
    try {
      // Download and cache the model during build
      await pipeline('feature-extraction', 'Xenova/clip-vit-base-patch16');
      console.log('Models downloaded successfully');
    } catch (error) {
      console.error('Error downloading models:', error);
      process.exit(1);
    }
  }

  downloadModels();
})();
