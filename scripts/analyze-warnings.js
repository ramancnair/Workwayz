const fs = require('fs');
const targetFile = process.argv[2] || 'scratch/eslint-warnings-after.json';
const data = JSON.parse(fs.readFileSync(targetFile, 'utf8'));

const ruleCounts = {};
const fileCounts = {};
const detailsByRule = {};
let totalWarnings = 0;

data.forEach(file => {
  if (file.warningCount > 0) {
    const rel = file.filePath.replace(/^.*Workwayz[\\\/]/, '').replace(/\\/g, '/');
    fileCounts[rel] = file.warningCount;
    file.messages.forEach(m => {
      ruleCounts[m.ruleId] = (ruleCounts[m.ruleId] || 0) + 1;
      totalWarnings++;
      if (!detailsByRule[m.ruleId]) detailsByRule[m.ruleId] = [];
      detailsByRule[m.ruleId].push({
        file: rel,
        line: m.line,
        column: m.column,
        message: m.message.split('\n')[0]
      });
    });
  }
});

console.log('Total warnings:', totalWarnings);
console.log('\n--- BY RULE ---');
Object.entries(ruleCounts).sort((a,b) => b[1] - a[1]).forEach(([r, c]) => console.log(`${r}: ${c}`));

console.log('\n--- BY FILE (' + Object.keys(fileCounts).length + ' files total) ---');
Object.entries(fileCounts).sort((a,b) => b[1] - a[1]).forEach(([f, c]) => console.log(`${f}: ${c}`));

fs.writeFileSync('scratch/eslint-warnings-summary.json', JSON.stringify({
  totalWarnings,
  ruleCounts,
  fileCounts,
  detailsByRule
}, null, 2));
