const fs = require('fs');
let code = fs.readFileSync('src/components/PrizeDistributionModal.tsx', 'utf8');

// Replace the modal overlay background classes to remove blur
code = code.replace(/bg-black\/40 backdrop-blur-md/g, 'bg-black/60');
code = code.replace(/bg-slate-950\/95 backdrop-blur-sm/g, 'bg-black/60');
code = code.replace(/bg-slate-950 z-\[200\]/g, 'bg-black/60 z-[200]');

// Also let's make sure the background image opacity in App is 100
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(/opacity-80/, 'opacity-100');
fs.writeFileSync('src/App.tsx', appCode);

fs.writeFileSync('src/components/PrizeDistributionModal.tsx', code);
