const ts = require('typescript');
const fs = require('fs');
const code = fs.readFileSync('src/components/gantt/GanttChart.tsx', 'utf8');
const sourceFile = ts.createSourceFile('GanttChart.tsx', code, ts.ScriptTarget.Latest, true);

const diag = sourceFile.parseDiagnostics;
if (diag && diag.length > 0) {
    diag.forEach(d => {
        const pos = sourceFile.getLineAndCharacterOfPosition(d.start);
        console.log(`Error at line ${pos.line + 1}: ${d.messageText}`);
        // print the 5 lines around the error
        const lines = code.split('\n');
        for (let i = Math.max(0, pos.line - 2); i <= Math.min(lines.length - 1, pos.line + 2); i++) {
            console.log(`${i === pos.line ? '>' : ' '} ${i + 1}: ${lines[i]}`);
        }
    });
} else {
    console.log('No diagnostics found.');
}
