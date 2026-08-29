const fs = require('fs');

// 1. Update Modal Background
let modalCode = fs.readFileSync('src/components/PrizeDistributionModal.tsx', 'utf8');
modalCode = modalCode.replace(/bg-black\/40 backdrop-blur-md/g, 'bg-black/60');
fs.writeFileSync('src/components/PrizeDistributionModal.tsx', modalCode);

// 2. Update App.tsx Background
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
appCode = appCode.replace(
  /className="absolute inset-0 w-full h-full pointer-events-none opacity-50 mix-blend-screen"/,
  'className="absolute inset-0 w-full h-full pointer-events-none opacity-80"'
);
fs.writeFileSync('src/App.tsx', appCode);
