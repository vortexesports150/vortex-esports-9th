const fs = require('fs');
let code = fs.readFileSync('src/components/PrizeDistributionModal.tsx', 'utf8');

// Remove Heavy Blurs
code = code.replace(/bg-slate-950\/95 backdrop-blur-xl/g, 'bg-slate-950/98 backdrop-blur-sm');

// Remove massive background circles that cause rendering issues during animations
code = code.replace(/<div className="absolute top-0 left-1\/4 w-96 h-96 bg-fuchsia-600\/20 rounded-full blur-\[120px\] mix-blend-screen" \/>/g, '');
code = code.replace(/<div className="absolute bottom-0 right-1\/4 w-96 h-96 bg-cyan-600\/20 rounded-full blur-\[120px\] mix-blend-screen" \/>/g, '');

// Reduce individual card background blurs
code = code.replace(/blur-3xl/g, 'blur-xl');
code = code.replace(/backdrop-blur-md/g, 'backdrop-blur-sm');

fs.writeFileSync('src/components/PrizeDistributionModal.tsx', code);
