const fs = require('fs');
const path = require('path');
const { genkit } = require('genkit');
const { googleAI } = require('@genkit-ai/google-genai');
require('dotenv').config({ path: '.env.local' });

// Load cache and catalog
const cachePath = path.join(__dirname, '../src/ai/tools/tools-cache.json');
const rawCache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));

// Normalize vectors for fast dot product
const denseMap = new Map();
for (const [name, vec] of Object.entries(rawCache)) {
  const arr = new Float32Array(vec);
  let norm = 0;
  for (let i = 0; i < arr.length; i++) norm += arr[i] * arr[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < arr.length; i++) arr[i] /= norm;
  }
  denseMap.set(name, arr);
}

// Load catalog
const catalogPath = path.join(__dirname, 'extracted-tools.json');
const tools = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

// BM25
function tokenize(text) {
  return text.toLowerCase().replace(/[^a-z0-9_\-\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
}

const docLengths = new Map();
const docTermFreqs = new Map();
const docCountByTerm = new Map();
let totalLength = 0;
const N = tools.length;

for (const t of tools) {
  const searchText = `${t.name} ${t.description} ${t.params.join(' ')}`;
  const tokens = tokenize(searchText);
  docLengths.set(t.name, tokens.length);
  totalLength += tokens.length;

  const tf = new Map();
  const seen = new Set();
  for (const tok of tokens) {
    tf.set(tok, (tf.get(tok) || 0) + 1);
    seen.add(tok);
  }
  docTermFreqs.set(t.name, tf);
  for (const s of seen) {
    docCountByTerm.set(s, (docCountByTerm.get(s) || 0) + 1);
  }
}

const avgdl = totalLength / N;
const idf = new Map();
for (const [term, count] of docCountByTerm.entries()) {
  idf.set(term, Math.max(0.1, Math.log(1 + (N - count + 0.5) / (count + 0.5))));
}

function scoreBM25(queryTokens, toolName) {
  const k1 = 1.2;
  const b = 0.75;
  const dLen = docLengths.get(toolName) || avgdl;
  const tfMap = docTermFreqs.get(toolName);
  if (!tfMap) return 0;
  let score = 0;
  for (const q of queryTokens) {
    const tf = tfMap.get(q) || 0;
    if (tf === 0) continue;
    const termIdf = idf.get(q) || 0.1;
    score += termIdf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (dLen / avgdl))));
  }
  return score;
}

const ai = genkit({ plugins: [googleAI({ apiKey: process.env.GEMINI_API_KEY })] });

async function retrieve(query, maxResults = 14) {
  const t0 = Date.now();
  const res = await ai.embed({
    embedder: googleAI.embedder('gemini-embedding-001'),
    content: query,
  });
  const tEmbed = Date.now() - t0;

  const qVec = new Float32Array(res[0].embedding);
  let norm = 0;
  for (let i = 0; i < qVec.length; i++) norm += qVec[i] * qVec[i];
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < qVec.length; i++) qVec[i] /= norm;
  }

  const qTokens = tokenize(query);
  let maxBm25 = 0;
  const bm25Scores = new Map();
  for (const t of tools) {
    const s = scoreBM25(qTokens, t.name);
    bm25Scores.set(t.name, s);
    if (s > maxBm25) maxBm25 = s;
  }

  const t1 = Date.now();
  const scored = [];
  for (const t of tools) {
    const toolVec = denseMap.get(t.name);
    let cos = 0;
    if (toolVec) {
      for (let i = 0; i < qVec.length; i++) cos += qVec[i] * toolVec[i];
    }
    const normBm25 = maxBm25 > 0 ? (bm25Scores.get(t.name) || 0) / maxBm25 : 0;
    const finalScore = 0.65 * Math.max(0, cos) + 0.35 * normBm25;
    scored.push({ name: t.name, score: finalScore });
  }

  scored.sort((a, b) => b.score - a.score);
  const tRank = Date.now() - t1;

  return {
    candidates: scored.slice(0, maxResults).map(s => s.name),
    topScores: scored.slice(0, 5),
    timing: { embedMs: tEmbed, rankMs: tRank, totalMs: Date.now() - t0 }
  };
}

async function runBenchmark() {
  const testCases = [
    {
      name: 'QA / Test Cases',
      query: 'Generate 5 functional test cases with steps and expected results for user login',
      expected: ['bulkCreateTestCases', 'createTestCase']
    },
    {
      name: 'RAID Governance',
      query: 'Log a critical dependency on the payment gateway team with high risk',
      expected: ['createRaidItem', 'queryProjectDependencies']
    },
    {
      name: 'Agile / Sprints',
      query: 'Create sprint Sprint 3 and assign story ST-2 to it',
      expected: ['createSprint', 'assignStoryToSprint']
    },
    {
      name: 'Financials / Invoicing',
      query: 'Check our fixed billing summary and log an invoice for the latest milestone',
      expected: ['queryFbBillingSummary', 'logFbInvoice']
    },
    {
      name: 'Resource Workload',
      query: 'Who is currently overallocated and who has available capacity on the team?',
      expected: ['queryOverallocatedResources', 'queryAvailableResources']
    },
    {
      name: 'Leave Management',
      query: 'Submit annual vacation leave request for 3 days starting Monday',
      expected: ['applyLeave', 'queryEmployeeLeaveBalance']
    },
    {
      name: 'Settings / Trash',
      query: 'Restore the accidentally deleted user story from the project trash',
      expected: ['restoreProjectTrashItem', 'queryProjectTrashItems']
    }
  ];

  console.log('====================================================');
  console.log('FLOWPILOT TOOL RAG BENCHMARK & RECALL VALIDATION');
  console.log('====================================================\n');

  let passed = 0;
  for (const tc of testCases) {
    const result = await retrieve(tc.query, 14);
    const foundExpected = tc.expected.filter(e => result.candidates.includes(e));
    const isSuccess = foundExpected.length > 0;
    if (isSuccess) passed++;

    console.log(`Test: ${tc.name}`);
    console.log(`Query: "${tc.query}"`);
    console.log(`Timing: Embed: ${result.timing.embedMs}ms | Vector Rank: ${result.timing.rankMs}ms | Total: ${result.timing.totalMs}ms`);
    console.log(`Expected (at least one): ${tc.expected.join(', ')}`);
    console.log(`Matched: ${foundExpected.length > 0 ? '✅ ' + foundExpected.join(', ') : '❌ None'}`);
    console.log(`Top 5 Candidates: ${result.candidates.slice(0, 5).join(', ')}`);
    console.log('----------------------------------------------------');
  }

  console.log(`\nResults: ${passed} / ${testCases.length} Passed (${Math.round((passed / testCases.length) * 100)}%)`);

  // Token savings calculation
  const monolithicPromptTokens = 48500;
  const ragCandidatePromptTokens = Math.round((14 / 201) * monolithicPromptTokens) + 450; // 14 tools + anchor tools
  const tpmReductionPct = Math.round(((monolithicPromptTokens - ragCandidatePromptTokens) / monolithicPromptTokens) * 100);

  console.log('\n====================================================');
  console.log('TOKEN & TPM IMPACT COMPARISON');
  console.log('====================================================');
  console.log(`Monolithic Context (All 201 Tools): ~${monolithicPromptTokens.toLocaleString()} prompt tokens/call`);
  console.log(`Two-Stage RAG Context (Top 14 Tools + Anchors): ~${ragCandidatePromptTokens.toLocaleString()} prompt tokens/call`);
  console.log(`Estimated TPM Reduction: ~${tpmReductionPct}% PER TURN!`);
  console.log('====================================================\n');
}

runBenchmark();
