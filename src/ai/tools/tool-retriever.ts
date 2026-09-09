import * as fs from 'fs';
import * as path from 'path';
import { TOOL_CATALOG, TOOL_CATALOG_MAP, ToolMetadata } from './tool-catalog';
import { ai } from '@/ai/genkit';
import { googleAI } from '@genkit-ai/google-genai';

// In-memory cache for precomputed dense tool embeddings
let denseEmbeddingsCache: Map<string, Float32Array> | null = null;

// BM25 Inverted Index structures
interface BM25Index {
  docLengths: Map<string, number>;
  avgDocLength: number;
  idf: Map<string, number>;
  docTermFreqs: Map<string, Map<string, number>>;
}

let bm25Index: BM25Index | null = null;

/**
 * Tokenizes text into lowercase normalized alphanumeric keywords.
 */
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9_\-\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1);
}

/**
 * Builds an in-memory BM25 index over the 201 tool catalog.
 */
function buildBM25Index(): BM25Index {
  const docLengths = new Map<string, number>();
  const docTermFreqs = new Map<string, Map<string, number>>();
  const docCountByTerm = new Map<string, number>();
  const N = TOOL_CATALOG.length;
  let totalLength = 0;

  for (const tool of TOOL_CATALOG) {
    const tokens = tokenize(tool.searchText);
    docLengths.set(tool.name, tokens.length);
    totalLength += tokens.length;

    const tfMap = new Map<string, number>();
    const seenTerms = new Set<string>();

    for (const t of tokens) {
      tfMap.set(t, (tfMap.get(t) || 0) + 1);
      seenTerms.add(t);
    }
    docTermFreqs.set(tool.name, tfMap);

    for (const term of Array.from(seenTerms)) {
      docCountByTerm.set(term, (docCountByTerm.get(term) || 0) + 1);
    }
  }

  const avgDocLength = totalLength / N;
  const idf = new Map<string, number>();
  for (const [term, docCount] of Array.from(docCountByTerm.entries())) {
    // Standard Lucene/BM25 IDF formula
    const val = Math.log(1 + (N - docCount + 0.5) / (docCount + 0.5));
    idf.set(term, Math.max(0.1, val));
  }

  return { docLengths, avgDocLength, idf, docTermFreqs };
}

/**
 * Computes BM25 score for a query against a specific tool.
 */
function scoreBM25(queryTokens: string[], toolName: string, index: BM25Index): number {
  const k1 = 1.2;
  const b = 0.75;
  const dLen = index.docLengths.get(toolName) || index.avgDocLength;
  const tfMap = index.docTermFreqs.get(toolName);
  if (!tfMap) return 0;

  let score = 0;
  for (const q of queryTokens) {
    const tf = tfMap.get(q) || 0;
    if (tf === 0) continue;
    const termIdf = index.idf.get(q) || 0.1;
    const numerator = tf * (k1 + 1);
    const denominator = tf + k1 * (1 - b + b * (dLen / index.avgDocLength));
    score += termIdf * (numerator / denominator);
  }
  return score;
}

/**
 * Loads precomputed dense embeddings from tools-cache.json or initializes empty.
 */
function loadDenseEmbeddingsCache(): Map<string, Float32Array> {
  if (denseEmbeddingsCache) return denseEmbeddingsCache;

  denseEmbeddingsCache = new Map<string, Float32Array>();
  const cachePath = path.join(process.cwd(), 'src/ai/tools/tools-cache.json');

  if (fs.existsSync(cachePath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
      for (const [name, vec] of Object.entries(raw)) {
        if (Array.isArray(vec)) {
          // Normalize vector to unit length for fast dot-product cosine similarity
          const arr = new Float32Array(vec as number[]);
          let norm = 0;
          for (let i = 0; i < arr.length; i++) norm += arr[i] * arr[i];
          norm = Math.sqrt(norm);
          if (norm > 0) {
            for (let i = 0; i < arr.length; i++) arr[i] /= norm;
          }
          denseEmbeddingsCache.set(name, arr);
        }
      }
    } catch (e) {
      console.warn('Could not read tools-cache.json, will rely on BM25:', e);
    }
  }
  return denseEmbeddingsCache;
}

/**
 * Computes dot product between two normalized Float32Arrays.
 */
function dotProduct(a: Float32Array, b: Float32Array): number {
  const len = Math.min(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i++) {
    sum += a[i] * b[i];
  }
  return sum;
}

/**
 * Embeds a text query using Google AI if available.
 */
async function embedQuery(queryText: string): Promise<Float32Array | null> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await ai.embed({
      embedder: googleAI.embedder('gemini-embedding-001'),
      content: queryText,
    });
    const rawVec = res[0]?.embedding;
    if (rawVec && Array.isArray(rawVec)) {
      const vec = new Float32Array(rawVec);
      let norm = 0;
      for (let i = 0; i < vec.length; i++) norm += vec[i] * vec[i];
      norm = Math.sqrt(norm);
      if (norm > 0) {
        for (let i = 0; i < vec.length; i++) vec[i] /= norm;
      }
      return vec;
    }
  } catch (err: any) {
    // Non-fatal fallback to BM25
  }
  return null;
}

export interface RetrievalContext {
  lastUserMessage: string;
  recentMessages?: Array<{ role: string; content: string }>;
  currentProjectName?: string;
  currentProjectId?: string;
  maxResults?: number;
}

export interface ToolRetrievalResult {
  candidateToolNames: string[];
  retrievalMode: 'hybrid' | 'bm25-local';
  scores: Record<string, number>;
  contextQuery: string;
}

/**
 * Builds an enriched contextual query from user prompt + conversation turn history
 * to resolve co-references like "Move it to Done" or "Assign them to Sprint 2".
 */
export function buildContextualRetrievalQuery(ctx: RetrievalContext): string {
  const parts: string[] = [ctx.lastUserMessage];

  // If there are recent messages, inspect the last assistant or user message for context
  if (ctx.recentMessages && ctx.recentMessages.length > 0) {
    const lastAssistant = ctx.recentMessages
      .filter((m) => m.role === 'model')
      .slice(-1)[0]?.content;
    if (lastAssistant) {
      // Extract key domain nouns from last assistant message
      const matches = lastAssistant.match(
        /(ST-\d+|BUG-\d+|TASK-\d+|TC-\d+|RSK-\d+|sprint|defect|test case|work item|milestone|risk|dependency)/gi
      );
      if (matches) {
        parts.push(matches.slice(0, 5).join(' '));
      }
    }
  }

  if (ctx.currentProjectName) {
    parts.push(ctx.currentProjectName);
  }

  return parts.join(' ').trim();
}

/**
 * Two-stage hybrid tool retriever:
 * Narrow down 201 tools to top 12-15 candidate tools based on query semantics + BM25 keywords.
 */
export async function retrieveCandidateTools(ctx: RetrievalContext): Promise<ToolRetrievalResult> {
  const maxResults = ctx.maxResults || 14;
  const contextQuery = buildContextualRetrievalQuery(ctx);
  const queryTokens = tokenize(contextQuery);

  if (!bm25Index) {
    bm25Index = buildBM25Index();
  }

  const denseCache = loadDenseEmbeddingsCache();
  const queryVec = denseCache.size > 0 ? await embedQuery(contextQuery) : null;
  const isHybrid = queryVec !== null;

  // Calculate raw BM25 scores
  const bm25Scores = new Map<string, number>();
  let maxBm25 = 0;
  for (const tool of TOOL_CATALOG) {
    const score = scoreBM25(queryTokens, tool.name, bm25Index);
    bm25Scores.set(tool.name, score);
    if (score > maxBm25) maxBm25 = score;
  }

  // Combine dense similarity + normalized BM25
  const combinedScores: Array<{ name: string; score: number; category: string }> = [];

  for (const tool of TOOL_CATALOG) {
    let finalScore = 0;

    // Normalized BM25 score (0 to 1)
    const normBm25 = maxBm25 > 0 ? (bm25Scores.get(tool.name) || 0) / maxBm25 : 0;

    if (queryVec && denseCache.has(tool.name)) {
      const toolVec = denseCache.get(tool.name)!;
      const cosineSim = Math.max(0, dotProduct(queryVec, toolVec));
      // Hybrid formula: 65% dense vector semantics + 35% exact keyword BM25
      finalScore = 0.65 * cosineSim + 0.35 * normBm25;
    } else {
      finalScore = normBm25;
    }

    // Small boost if the tool name directly appears in user query
    if (ctx.lastUserMessage.toLowerCase().includes(tool.name.toLowerCase())) {
      finalScore += 0.5;
    }

    combinedScores.push({
      name: tool.name,
      score: finalScore,
      category: tool.category,
    });
  }

  combinedScores.sort((a, b) => b.score - a.score);

  // Diverse top-K selection: ensure multi-intent queries don't starve secondary categories
  const selected: string[] = [];
  const categoryCounts = new Map<string, number>();
  const scoreMap: Record<string, number> = {};

  // First pass: add highest scoring candidates with category diversity cap (max 5 per category)
  for (const item of combinedScores) {
    if (selected.length >= maxResults) break;
    const count = categoryCounts.get(item.category) || 0;
    if (count < 5 || item.score > 0.8) {
      selected.push(item.name);
      scoreMap[item.name] = Math.round(item.score * 1000) / 1000;
      categoryCounts.set(item.category, count + 1);
    }
  }

  // Fallback if diversity cap left slots empty
  for (const item of combinedScores) {
    if (selected.length >= maxResults) break;
    if (!selected.includes(item.name)) {
      selected.push(item.name);
      scoreMap[item.name] = Math.round(item.score * 1000) / 1000;
    }
  }

  return {
    candidateToolNames: selected,
    retrievalMode: isHybrid ? 'hybrid' : 'bm25-local',
    scores: scoreMap,
    contextQuery,
  };
}
