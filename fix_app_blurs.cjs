const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// The massive backdrop blur on the central card obscures the background
code = code.replace(/backdrop-blur-2xl/g, '');
code = code.replace(/bg-\[#05070f\]\/95/g, 'bg-[#05070f]/80'); // Let a bit more background through if needed

fs.writeFileSync('src/App.tsx', code);
