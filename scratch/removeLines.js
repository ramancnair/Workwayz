const fs = require('fs');
const lines = fs.readFileSync('src/components/gantt/GanttChart.tsx', 'utf8').split('\n');
const fixedLines = [...lines.slice(0, 370), ...lines.slice(691)];
fs.writeFileSync('src/components/gantt/GanttChart.tsx', fixedLines.join('\n'));
console.log('Lines removed');
