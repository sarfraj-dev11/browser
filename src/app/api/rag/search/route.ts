import { NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import { searchPageChunks } from "@/app/utils/vectorStore";

const COLLECTION_NAME = "webpages";
const QDRANT_URL = "http://127.0.0.1:6333";

let qdrantClient: QdrantClient | null = null;
let pipelineInstance: any = null;

// Initialize Qdrant client
function getQdrantClient() {
  if (!qdrantClient) {
    qdrantClient = new QdrantClient({ url: QDRANT_URL });
  }
  return qdrantClient;
}

// Lazy-load Transformers pipeline
async function getPipeline() {
  if (!pipelineInstance) {
    // Dynamically import @xenova/transformers to prevent Next.js bundling issues
    const { pipeline } = await import("@xenova/transformers");
    pipelineInstance = await pipeline("feature-extraction", "Xenova/all-MiniLM-L6-v2");
  }
  return pipelineInstance;
}

// Helper to generate embedding vector
async function generateEmbedding(text: string): Promise<number[]> {
  const extractor = await getPipeline();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const limitStr = searchParams.get("limit");
    const limit = limitStr ? parseInt(limitStr, 10) : 3;

    if (!query) {
      return NextResponse.json({ error: "Missing query parameter 'q'." }, { status: 400 });
    }

    // Generate query vector
    const queryVector = await generateEmbedding(query);

    // 1. Try searching Qdrant if available
    try {
      const client = getQdrantClient();
      const response = await client.getCollections();
      const exists = response.collections.some(c => c.name === COLLECTION_NAME);

      if (exists) {
        const searchResults = await client.search(COLLECTION_NAME, {
          vector: queryVector,
          limit: limit,
          with_payload: true,
        });

        if (searchResults && searchResults.length > 0) {
          const results = searchResults.map(match => ({
            id: match.id,
            score: match.score,
            text: match.payload?.text || "",
            url: match.payload?.url || "",
            title: match.payload?.title || "",
            timestamp: match.payload?.timestamp || "",
            chunkIndex: match.payload?.chunkIndex,
            totalChunks: match.payload?.totalChunks,
          }));

          return NextResponse.json({ results, source: "qdrant" });
        }
      }
    } catch (err) {
      console.warn("Qdrant not available, falling back to local vector store:", err);
    }

    // 2. Fallback: Search local vector store
    const localResults = await searchPageChunks(queryVector, limit);
    return NextResponse.json({ results: localResults, source: "local" });
  } catch (err: any) {
    console.error("RAG search error:", err);
    return NextResponse.json({ error: err.message || "Search failed" }, { status: 500 });
  }
}
