import fs from "fs";
import path from "path";
import crypto from "crypto";

export interface VectorChunk {
  id: string;
  url: string;
  title: string;
  text: string;
  vector: number[];
  chunkIndex: number;
  totalChunks: number;
  timestamp: string;
}

const DATA_DIR = process.env.BROWSER_DATA_DIR || path.join(process.cwd(), "data");
const STORE_PATH = path.join(DATA_DIR, "rag_store.json");
const BACKUP_PATH = path.join(DATA_DIR, "rag_store.backup.json");
const VAULT_PATH = path.join(DATA_DIR, "rag_store.vault.json");
const ARCHIVE_PATH = path.join(DATA_DIR, "rag_store.deleted_archive.json");

function ensureDataDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function parseStoreFile(filePath: string): VectorChunk[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const raw = fs.readFileSync(filePath, "utf-8").trim();
    if (!raw) return [];

    if (raw.startsWith("[")) {
      return JSON.parse(raw);
    }
    
    return raw
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => JSON.parse(line));
  } catch (err) {
    console.error(`Failed to parse vector store file at ${filePath}:`, err);
    return [];
  }
}

function loadStore(): VectorChunk[] {
  ensureDataDir();

  const primaryChunks = parseStoreFile(STORE_PATH);
  const backupChunks = parseStoreFile(BACKUP_PATH);
  const vaultChunks = parseStoreFile(VAULT_PATH);

  // Find the candidate store with maximum vector chunks to prevent any data loss or accidental deletion
  let bestChunks = primaryChunks;

  if (backupChunks.length > bestChunks.length) {
    console.warn(`[DATA SAFETY] Primary store count (${primaryChunks.length}) is less than backup (${backupChunks.length}). Auto-recovering from backup...`);
    bestChunks = backupChunks;
  }
  if (vaultChunks.length > bestChunks.length) {
    console.warn(`[DATA SAFETY] Current store count (${bestChunks.length}) is less than vault (${vaultChunks.length}). Auto-recovering from vault...`);
    bestChunks = vaultChunks;
  }

  // If primary store was smaller or missing, sync bestChunks back to primary and backups automatically
  if (bestChunks.length > primaryChunks.length) {
    saveStore(bestChunks, true);
  }

  return bestChunks;
}

function saveStore(chunks: VectorChunk[], forceOverride = false): void {
  try {
    ensureDataDir();

    // Check existing store size to enforce Anti-Data-Loss safety lock
    const existingCount = Math.max(
      parseStoreFile(STORE_PATH).length,
      parseStoreFile(BACKUP_PATH).length,
      parseStoreFile(VAULT_PATH).length
    );

    if (existingCount > 0 && chunks.length < existingCount && !forceOverride) {
      console.error(
        `[DATA LOSS SAFETY LOCK REJECTED] Attempted to overwrite store with ${chunks.length} chunks, but existing vault holds ${existingCount} chunks! Save aborted to prevent data loss.`
      );
      return;
    }

    // Format output (NDJSON or pretty JSON array if preferred)
    const content = JSON.stringify(chunks, null, 2);

    // Save to Primary Store
    fs.writeFileSync(STORE_PATH, content, "utf-8");

    // Dual Backup Vaulting for 100% Redundancy
    fs.writeFileSync(BACKUP_PATH, content, "utf-8");
    fs.writeFileSync(VAULT_PATH, content, "utf-8");

    console.log(`[DATA VAULT] Successfully saved and double-vaulted ${chunks.length} vector chunks to rag_store.json, backup, and vault.`);
  } catch (err) {
    console.error("Failed to save local vector store:", err);
  }
}

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function addChunks(newChunks: VectorChunk[]): void {
  const existing = loadStore();
  
  // Prevent duplication: Filter out any existing chunks for the URLs we are updating
  const newUrls = new Set(newChunks.map((c) => c.url));
  const filteredExisting = existing.filter((c) => !newUrls.has(c.url));
  
  const combined = [...filteredExisting, ...newChunks];
  // NO SLICING OR TRUNCATION: Support unlimited vector chunks across all trained sites
  saveStore(combined);
}

export function upsertPageChunks(
  urlOrChunks: string | VectorChunk[],
  title?: string,
  items?: Array<{ text: string; vector: number[]; chunkIndex: number; totalChunks: number; timestamp: string }>
): void {
  if (Array.isArray(urlOrChunks)) {
    addChunks(urlOrChunks);
  } else if (typeof urlOrChunks === "string" && items) {
    const formatted: VectorChunk[] = items.map((it) => ({
      id: crypto.randomUUID(),
      url: urlOrChunks,
      title: title || "Untitled Page",
      text: it.text,
      vector: it.vector,
      chunkIndex: it.chunkIndex,
      totalChunks: it.totalChunks,
      timestamp: it.timestamp || new Date().toISOString()
    }));
    addChunks(formatted);
  }
}

export function searchSimilarChunks(queryVector: number[], topK = 5): VectorChunk[] {
  const store = loadStore();
  if (!store.length) return [];

  const scored = store.map((chunk) => ({
    chunk,
    score: cosineSimilarity(queryVector, chunk.vector)
  }));

  // Filter by a minimum relevance score of 0.25 to catch relevant matches
  const relevant = scored.filter((s) => s.score >= 0.25);

  relevant.sort((a, b) => b.score - a.score);
  return relevant.slice(0, topK).map((s) => s.chunk);
}

export function searchPageChunks(queryVector: number[], topK = 5): VectorChunk[] {
  return searchSimilarChunks(queryVector, topK);
}

export function clearVectorStore(): void {
  const existing = loadStore();
  if (existing.length > 0) {
    // Preserve existing data in deleted_archive file before clearing
    fs.writeFileSync(ARCHIVE_PATH, JSON.stringify(existing, null, 2), "utf-8");
    console.log(`[DATA VAULT] Archived ${existing.length} chunks to rag_store.deleted_archive.json before clearing.`);
  }
  saveStore([], true);
}
