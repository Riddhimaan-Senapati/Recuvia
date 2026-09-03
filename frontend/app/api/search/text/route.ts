// frontend/app/api/search/text/route.ts
import { NextRequest, NextResponse } from "next/server";
import {
  searchByVector,
  MAX_RESULTS,
  VECTOR_DIMENSION,
  SIMILARITY_THRESHOLD,
} from "@/app/utils/supabase";
import {
  getTextEmbedding,
  formatResults,
  MatchItemsResult,
} from "@/app/utils/embeddings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const { query, threshold, maxResults } = await req.json();
    if (!query || typeof query !== "string" || query.trim() === "") {
      return NextResponse.json(
        { error: "Valid query string is required" },
        { status: 400 },
      );
    }

    const textVector = await getTextEmbedding(query);
    if (textVector.length !== VECTOR_DIMENSION) {
      throw new Error(
        `Generated text embedding has incorrect dimension (${textVector.length}).`,
      );
    }

    const results: MatchItemsResult[] = await searchByVector(
      textVector,
      typeof maxResults === "number" ? maxResults : MAX_RESULTS,
      typeof threshold === "number" ? threshold : SIMILARITY_THRESHOLD,
    );

    if (!results || results.length === 0) {
      return NextResponse.json({ items: [] });
    }

    return NextResponse.json({ items: formatResults(results) });
  } catch (error) {
    console.error("Text search API error:", error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "Text search failed: " + errorMessage },
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
