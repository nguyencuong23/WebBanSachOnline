const fs = require('fs');
const s = fs.readFileSync('/data/swagger.json', 'utf8');
const lines = s.split('\n');

// Step 1: Remove duplicate nested block
let count = 0, dupStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('/admin/dashboard/stats') >= 0 && lines[i].indexOf('"') >= 0) {
    count++;
    if (count === 2) { dupStart = i; break; }
  }
}

let lastDup = -1;
count = 0;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].indexOf('/admin/borrowing-trends') >= 0 && lines[i].indexOf('"') >= 0) {
    count++;
    if (count === 2) lastDup = i;
  }
}

// Find end of borrowing-trends block
let depth = 0, blockEnd = -1;
for (let i = lastDup; i < lines.length; i++) {
  for (let j = 0; j < lines[i].length; j++) {
    const c = lines[i][j];
    if (c === '{') depth++;
    else if (c === '}') {
      depth--;
      if (depth === 0) { blockEnd = i; break; }
    }
  }
  if (blockEnd >= 0) break;
}

// Check what comes after blockEnd
console.log('blockEnd line', blockEnd + 1, ':', JSON.stringify(lines[blockEnd]));
for (let i = blockEnd + 1; i < Math.min(blockEnd + 8, lines.length); i++) {
  console.log('  +' + (i - blockEnd), JSON.stringify(lines[i]));
}

// The duplicate block is: dupStart to blockEnd (inclusive)
// Do NOT include extra closing braces — they belong to the outer structure
const removeEnd = blockEnd;
console.log('Removing lines', dupStart + 1, 'to', removeEnd + 1);

const newLines = [...lines.slice(0, dupStart), ...lines.slice(removeEnd + 1)];
const fixed = newLines.join('\n').trimEnd() + '\n';

const opens = (fixed.match(/\{/g) || []).length;
const closes = (fixed.match(/\}/g) || []).length;
console.log('Braces: open', opens, 'close', closes, 'diff', opens - closes);

try {
  const o = JSON.parse(fixed);
  const paths = Object.keys(o.paths || {});
  console.log('VALID - paths:', paths.length);
  const dups = paths.filter((p, i) => paths.indexOf(p) !== i);
  console.log(dups.length ? 'DUPLICATES: ' + dups.join(', ') : 'No duplicates.');
  paths.filter(p => p.includes('dashboard') || p.includes('monthly') || p.includes('borrowing')).forEach(p => console.log('  OK:', p));
  fs.writeFileSync('/data/swagger.json', fixed, 'utf8');
  console.log('Saved.');
} catch(e) {
  const m = e.message.match(/position (\d+)/);
  if (m) {
    const p = parseInt(m[1]);
    console.log('Error at line', fixed.slice(0,p).split('\n').length);
    console.log(fixed.slice(Math.max(0,p-150), p+150));
  } else console.log('Error:', e.message);
}
