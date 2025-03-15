// lib/tensorflow-server.ts
// This file will only be imported in server components
import * as tf from '@tensorflow/tfjs-node';

export async function generateImageEmbedding(imageBuffer: Buffer): Promise<number[]> {
  // Load MobileNet for feature extraction
  const model = await tf.loadGraphModel(
    'https://tfhub.dev/google/tfjs-model/imagenet/mobilenet_v3_small_100_224/feature_vector/5/default/1',
    { fromTFHub: true }
  );
  
  // Process image to tensor
  const image = tf.node.decodeImage(imageBuffer, 3);
  const resized = tf.image.resizeBilinear(image, [224, 224]);
  const normalized = tf.div(tf.cast(resized, 'float32'), 255.0);
  const batched = tf.expandDims(normalized, 0);
  
  // Generate embedding
  const embedding = model.predict(batched) as tf.Tensor;
  const values = await embedding.data();
  
  // Clean up tensors
  image.dispose();
  resized.dispose();
  normalized.dispose();
  batched.dispose();
  embedding.dispose();
  
  return Array.from(values);
}
