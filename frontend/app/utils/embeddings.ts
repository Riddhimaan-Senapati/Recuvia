import * as os from "os";
import * as path from "path";
import * as fs from "fs";
import {
  AutoProcessor,
  AutoTokenizer,
  RawImage,
  CLIPVisionModelWithProjection,
  CLIPTextModelWithProjection,
  env,
} from "@xenova/transformers";

export const MODEL_ID = "Xenova/clip-vit-base-patch32";

export interface MatchItemsResult {
  id: string;
  title: string;
  description: string | null;
  location: string;
  url: string;
  submitter_id: string;
  created_at: string;
  score: number;
}

const tmpDir = os.tmpdir();
const cacheDir =
  process.env.VERCEL_TMP_DIR || path.join(tmpDir, ".cache", "transformers");
env.cacheDir = cacheDir;
env.allowRemoteModels = true;
process.env.TRANSFORMERS_OFFLINE = "0";

try {
  if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
} catch (err) {
  console.warn("Failed to create transformers cache directory:", err);
}

let processor: any = null;
let visionModel: any = null;
let tokenizer: any = null;
let textModel: any = null;

async function getProcessor() {
  if (!processor) {
    processor = await AutoProcessor.from_pretrained(MODEL_ID, {
      cache_dir: cacheDir,
      local_files_only: false,
    });
  }
  return processor;
}

async function getVisionModel() {
  if (!visionModel) {
    visionModel = await CLIPVisionModelWithProjection.from_pretrained(
      MODEL_ID,
      {
        cache_dir: cacheDir,
        local_files_only: false,
      },
    );
  }
  return visionModel;
}

async function getTokenizer() {
  if (!tokenizer) {
    tokenizer = await AutoTokenizer.from_pretrained(MODEL_ID, {
      cache_dir: cacheDir,
      local_files_only: false,
    });
  }
  return tokenizer;
}

async function getTextModel() {
  if (!textModel) {
    textModel = await CLIPTextModelWithProjection.from_pretrained(MODEL_ID, {
      cache_dir: cacheDir,
      local_files_only: false,
    });
  }
  return textModel;
}

export async function getImageEmbedding(
  buffer: ArrayBuffer,
  mimeType: string,
): Promise<number[]> {
  const blob = new Blob([buffer], { type: mimeType || "image/jpeg" });
  const image = await RawImage.fromBlob(blob);
  const inputs = await (await getProcessor())(image);
  const { image_embeds } = await (await getVisionModel())(inputs);
  return image_embeds.tolist()[0];
}

export async function getTextEmbedding(query: string): Promise<number[]> {
  const inputs = (await getTokenizer())(query, {
    padding: true,
    truncation: true,
  });
  const { text_embeds } = await (await getTextModel())(inputs);
  return text_embeds.tolist()[0];
}

export function formatResults(items: any[]) {
  return items.map((item) => ({
    id: item.id,
    title: item.title,
    description: item.description,
    location: item.location || "Unknown",
    created_at: item.created_at,
    submitter_id: item.submitter_id,
    profiles: { email: item.submitter_email },
    item_images: [{ image_url: item.url }],
    score: item.score,
  }));
}
