const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const lines = code.split('\n');

for (let i = 5842; i <= 5848; i++) {
  if (lines[i] && lines[i].includes('<div className="w-full space-y-3 mt-1">')) {
    lines.splice(i, 1);
    break;
  }
}

fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log("Done regex 7");
