// frontend/app/api/search/image/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  searchByVector,
  MAX_RESULTS,
  VECTOR_DIMENSION,
  SIMILARITY_THRESHOLD,
} from "@/app/utils/supabase";
import {
  getImageEmbedding,
  formatResults,
  MatchItemsResult,
} from "@/app/utils/embeddings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const image = formData.get("image") as File;

    if (!image) {
      return NextResponse.json({ error: "No image provided" }, { status: 400 });
    }

    const buffer = await image.arrayBuffer();

    let threshold: number = SIMILARITY_THRESHOLD;
    let maxResults: number = MAX_RESULTS;
    const thresholdStr = formData.get("threshold");
    const maxResultsStr = formData.get("maxResults");
    if (thresholdStr && !isNaN(Number(thresholdStr))) {
      threshold = Number(thresholdStr);
    }
    if (
      maxResultsStr &&
      maxResultsStr !== "all" &&
      !isNaN(Number(maxResultsStr))
    ) {
      maxResults = Number(maxResultsStr);
    } else if (maxResultsStr === "all") {
      maxResults = 10000;
    }

    const imageVector = await getImageEmbedding(buffer, image.type);
    if (imageVector.length !== VECTOR_DIMENSION) {
      throw new Error(
        `Generated image embedding has incorrect dimension (${imageVector.length}).`,
      );
    }

    const results: MatchItemsResult[] = await searchByVector(
      imageVector,
      maxResults,
      threshold,
    );

    if (!results || results.length === 0) {
      return NextResponse.json({ items: [] });
    }

    return NextResponse.json({ items: formatResults(results) });
  } catch (error) {
    console.error("Image search API error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Image search failed: " + errorMessage },
      { status: 500 },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  });
}
