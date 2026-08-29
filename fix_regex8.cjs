const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

const lines = code.split('\n');

for (let i = 16590; i <= 16610; i++) {
  if (lines[i] && lines[i].includes('<div className="w-full space-y-3 mt-1">')) {
    lines.splice(i, 1);
    break;
  }
}

fs.writeFileSync('src/App.tsx', lines.join('\n'));
console.log("Done regex 8");
