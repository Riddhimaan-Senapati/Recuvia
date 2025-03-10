// lib/vector-search.ts
import * as tf from '@tensorflow/tfjs';

export async function generateImageEmbedding(imageBuffer) {
  // Load pre-trained model (e.g., MobileNet)
  const model = await tf.loadGraphModel('/models/mobilenet/model.json');
  
  // Process image and generate embedding
  const tensor = tf.browser.fromPixels(imageBuffer)
    .resizeBilinear([224, 224])
    .expandDims(0)
    .toFloat()
    .div(tf.scalar(255));
  
  const prediction = model.predict(tensor);
  const embedding = await prediction.data();
  
  return Array.from(embedding);
}
