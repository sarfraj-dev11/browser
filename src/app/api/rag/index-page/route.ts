import { NextResponse } from "next/server";
import { QdrantClient } from "@qdrant/js-client-rest";
import crypto from "crypto";
import { upsertPageChunks } from "@/app/utils/vectorStore";

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

// Helper to chunk text
function chunkText(text: string, size: number = 300, overlap: number = 50): string[] {
  const words = text.split(/\s+/).filter(w => w.trim().length > 0);
  const chunks: string[] = [];
  let i = 0;
  
  while (i < words.length) {
    const chunkWords = words.slice(i, i + size);
    if (chunkWords.length > 0) {
      chunks.push(chunkWords.join(" "));
    }
    i += (size - overlap);
    if (i >= words.length || chunkWords.length < size) {
      break;
    }
  }
  return chunks;
}

// Helper to generate embedding vector
async function generateEmbedding(text: string): Promise<number[]> {
  const extractor = await getPipeline();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data);
}

// Ensure Qdrant collection exists
async function ensureCollection() {
  const client = getQdrantClient();
  try {
    const response = await client.getCollections();
    const exists = response.collections.some(c => c.name === COLLECTION_NAME);
    
    if (!exists) {
      await client.createCollection(COLLECTION_NAME, {
        vectors: {
          size: 384, // all-MiniLM-L6-v2 dimension
          distance: "Cosine",
        }
      });
      console.log(`Collection "${COLLECTION_NAME}" successfully created in Qdrant.`);
    }
  } catch (err) {
    console.error("Failed to check/create collection in Qdrant:", err);
    throw err;
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, title, text } = body;

    if (!url || !text) {
      return NextResponse.json({ error: "Missing url or text fields." }, { status: 400 });
    }

    // Clean and split text into chunks
    const cleanedText = text.trim();
    const chunks = chunkText(cleanedText, 300, 50);

    if (chunks.length === 0) {
      return NextResponse.json({ message: "No text content found to index." });
    }

    const timestamp = new Date().toISOString();
    const chunkItems: { text: string; vector: number[]; chunkIndex: number; totalChunks: number; timestamp: string }[] = [];

    for (let idx = 0; idx < chunks.length; idx++) {
      const chunk = chunks[idx];
      const embedding = await generateEmbedding(chunk);
      chunkItems.push({
        text: chunk,
        vector: embedding,
        chunkIndex: idx,
        totalChunks: chunks.length,
        timestamp,
      });
    }

    // Always update local persistent vector store
    await upsertPageChunks(url, title || "Untitled Page", chunkItems);

    // Try updating Qdrant server if available
    let qdrantSuccess = false;
    try {
      const client = getQdrantClient();
      await ensureCollection();

      try {
        await client.delete(COLLECTION_NAME, {
          filter: {
            must: [{ key: "url", match: { value: url } }]
          }
        });
      } catch (delErr) {
        console.warn("Could not delete existing points in Qdrant, proceeding:", delErr);
      }

      const points = chunkItems.map((item) => ({
        id: crypto.randomUUID(),
        vector: item.vector,
        payload: {
          url,
          title: title || "Untitled Page",
          text: item.text,
          chunkIndex: item.chunkIndex,
          totalChunks: item.totalChunks,
          timestamp,
        }
      }));

      await client.upsert(COLLECTION_NAME, { wait: true, points });
      qdrantSuccess = true;
    } catch (qErr) {
      console.warn("Qdrant server not available, relying on local vector store fallback:", qErr);
    }

    return NextResponse.json({
      success: true,
      chunksIndexed: chunks.length,
      storage: qdrantSuccess ? "qdrant+local" : "local",
      message: `Successfully indexed ${chunks.length} chunks from "${title || url}"${qdrantSuccess ? " in Qdrant & local store" : " in local vector store"}.`,
    });
  } catch (err: any) {
    console.error("Failed to index page content in RAG:", err);
    return NextResponse.json({ error: err.message || "Indexing failed" }, { status: 500 });
  }
}
