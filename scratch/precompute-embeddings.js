const fs = require('fs');
const path = require('path');
const { genkit } = require('genkit');
const { googleAI } = require('@genkit-ai/google-genai');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error('No GEMINI_API_KEY found');
  process.exit(1);
}

const catalogPath = path.join(__dirname, '../src/ai/tools/tool-catalog.ts');
// Read extracted tools from scratch/extracted-tools.json
const extracted = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted-tools.json'), 'utf8'));

const ai = genkit({ plugins: [googleAI({ apiKey })] });

async function precompute() {
  console.log(`Precomputing embeddings for ${extracted.length} tools...`);
  const cache = {};
  const batchSize = 10;

  for (let i = 0; i < extracted.length; i += batchSize) {
    const batch = extracted.slice(i, i + batchSize);
    console.log(`Processing tools ${i + 1} to ${Math.min(i + batchSize, extracted.length)}...`);

    await Promise.all(
      batch.map(async (t) => {
        const text = `${t.name}: ${t.description}. Params: ${t.params.join(', ')}`;
        try {
          const res = await ai.embed({
            embedder: googleAI.embedder('gemini-embedding-001'),
            content: text,
          });
          const vec = res[0]?.embedding;
          if (vec) {
            cache[t.name] = vec;
          }
        } catch (e) {
          console.warn(`Failed to embed ${t.name}:`, e.message);
        }
      })
    );

    // Short pause to avoid rate limit
    await new Promise((r) => setTimeout(r, 400));
  }

  const outPath = path.join(__dirname, '../src/ai/tools/tools-cache.json');
  fs.writeFileSync(outPath, JSON.stringify(cache));
  console.log(`Saved ${Object.keys(cache).length} embeddings to ${outPath}`);
}

precompute();
