const fs = require('fs');
const path = require('path');
const { genkit } = require('genkit');
const { googleAI } = require('@genkit-ai/google-genai');
require('dotenv').config({ path: '.env.local' });

const apiKey = process.env.GEMINI_API_KEY;
const cachePath = path.join(__dirname, '../src/ai/tools/tools-cache.json');
const cache = JSON.parse(fs.readFileSync(cachePath, 'utf8'));
const extracted = JSON.parse(fs.readFileSync(path.join(__dirname, 'extracted-tools.json'), 'utf8'));

const missing = extracted.filter((t) => !cache[t.name]);
console.log('Filling missing tools:', missing.map((m) => m.name));

const ai = genkit({ plugins: [googleAI({ apiKey })] });

async function fill() {
  for (const t of missing) {
    const text = `${t.name}: ${t.description}. Params: ${t.params.join(', ')}`;
    try {
      const res = await ai.embed({
        embedder: googleAI.embedder('gemini-embedding-001'),
        content: text,
      });
      const vec = res[0]?.embedding;
      if (vec) {
        cache[t.name] = vec;
        console.log(`Successfully embedded ${t.name}`);
      }
    } catch (e) {
      console.warn(`Error for ${t.name}:`, e.message);
    }
    await new Promise((r) => setTimeout(r, 1000));
  }

  fs.writeFileSync(cachePath, JSON.stringify(cache));
  console.log(`Updated cache: total ${Object.keys(cache).length} tools in ${cachePath}`);
}

fill();
