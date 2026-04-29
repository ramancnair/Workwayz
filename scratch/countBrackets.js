const fs = require('fs');
const code = fs.readFileSync('src/components/gantt/GanttChart.tsx', 'utf8');

// Strip single line and multi-line comments
let cleanCode = code.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');

// Strip strings
cleanCode = cleanCode.replace(/'(?:[^'\\]|\\.)*'/g, "''").replace(/"(?:[^"\\]|\\.)*"/g, '""').replace(/`(?:[^`\\]|\\.)*`/g, '``');

let parenCount = 0;
let braceCount = 0;
let bracketCount = 0;

const stack = [];

for (let i = 0; i < cleanCode.length; i++) {
    const char = cleanCode[i];
    if (char === '(') stack.push({ char, index: i });
    else if (char === '{') stack.push({ char, index: i });
    else if (char === '[') stack.push({ char, index: i });
    else if (char === ')') {
        if (stack.length && stack[stack.length - 1].char === '(') stack.pop();
        else console.log("Extra ')'");
    }
    else if (char === '}') {
        if (stack.length && stack[stack.length - 1].char === '{') stack.pop();
        else console.log("Extra '}'");
    }
    else if (char === ']') {
        if (stack.length && stack[stack.length - 1].char === '[') stack.pop();
        else console.log("Extra ']'");
    }
}

console.log('Unclosed:');
stack.forEach(item => {
    // find line number
    const substr = cleanCode.substring(0, item.index);
    const line = substr.split('\n').length;
    console.log(`Char ${item.char} at approx line ${line}`);
});
