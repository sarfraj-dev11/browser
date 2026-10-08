import { upsertPageChunks } from "./vectorStore";

export interface PageDocument {
  url: string;
  title: string;
  text: string;
}

/**
 * Bulk RAG Indexer Engine:
 * Indexes multiple page documents into the local vector store or Qdrant DB.
 */
export async function bulkIndexDocuments(
  documents: PageDocument[],
  onProgress?: (indexedCount: number, total: number, currentTitle: string) => void
): Promise<{ success: boolean; totalIndexed: number; totalChunks: number }> {
  let totalChunks = 0;
  let indexedCount = 0;

  for (let i = 0; i < documents.length; i++) {
    const doc = documents[i];
    if (!doc.url || !doc.text) continue;

    try {
      if (onProgress) {
        onProgress(i + 1, documents.length, doc.title || doc.url);
      }

      const res = await fetch("http://localhost:3000/api/rag/index-page", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: doc.url,
          title: doc.title || "Indexed Document",
          text: doc.text
        })
      });

      if (res.ok) {
        const data = await res.json();
        totalChunks += data.chunksIndexed || 1;
        indexedCount++;
      }
    } catch (err) {
      console.error(`Failed to index RAG document ${doc.url}:`, err);
    }
  }

  return {
    success: true,
    totalIndexed: indexedCount,
    totalChunks
  };
}
