async function testSearchTools() {
  console.log('Testing searchTools meta-tool directly...');
  const { searchToolsTool } = require('../src/ai/tools/tool-search.ts');
  
  // Test 1: BCP disaster recovery
  const res1 = await searchToolsTool.run({ query: 'BCP disaster recovery' });
  console.log('Query: "BCP disaster recovery" -> Matches:', res1.matches.map(m => m.name));

  // Test 2: Purge trash
  const res2 = await searchToolsTool.run({ query: 'permanently delete trash item' });
  console.log('Query: "permanently delete trash item" -> Matches:', res2.matches.map(m => m.name));

  // Test 3: Burndown velocity
  const res3 = await searchToolsTool.run({ query: 'burndown velocity agile metrics' });
  console.log('Query: "burndown velocity agile metrics" -> Matches:', res3.matches.map(m => m.name));
}

testSearchTools().catch(console.error);
