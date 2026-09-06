const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/ai/flows/flowpilot-tools.ts');
const content = fs.readFileSync(filePath, 'utf8');

// Match each `export const <toolName> = ai.defineTool(...)`
// We can split by `export const ` and process each
const chunks = content.split('export const ');
const tools = [];

for (const chunk of chunks) {
  if (!chunk.includes('ai.defineTool(')) continue;

  const varMatch = chunk.match(/^(\w+Tool)\s*=/);
  const nameMatch = chunk.match(/name:\s*['"]([^'"]+)['"]/);
  const descMatch = chunk.match(/description:\s*(?:['"`]([\s\S]*?)['"`]|([^\n,]+))/);
  
  // Extract input schema properties
  const schemaMatch = chunk.match(/inputSchema:\s*z\.object\(\{([\s\S]*?)\}\)/);
  const params = [];
  if (schemaMatch) {
    const propRegex = /(\w+):\s*z\./g;
    let pm;
    while ((pm = propRegex.exec(schemaMatch[1])) !== null) {
      params.push(pm[1]);
    }
  }

  if (varMatch && nameMatch) {
    let desc = '';
    if (descMatch) {
      desc = (descMatch[1] || descMatch[2] || '').trim().replace(/\s+/g, ' ');
    }
    tools.push({
      varName: varMatch[1],
      name: nameMatch[1],
      description: desc,
      params
    });
  }
}

console.log('Total extracted:', tools.length);
console.log('Tools with empty description:', tools.filter(t => !t.description).length);
if (tools.filter(t => !t.description).length > 0) {
  console.log('Empty description tools:', tools.filter(t => !t.description).slice(0, 5));
}
fs.writeFileSync(path.join(__dirname, 'extracted-tools.json'), JSON.stringify(tools, null, 2));
console.log('Saved to scratch/extracted-tools.json');
