const fs = require('fs');
let code = fs.readFileSync('src/components/PrizeDistributionModal.tsx', 'utf8');

code = code.replace(
  /className="w-72 h-40 md:w-\[340px\] md:h-48 rounded-3xl overflow-hidden border-4/g,
  'className="w-80 h-32 md:w-[400px] md:h-[150px] rounded-2xl overflow-hidden border-4'
);

fs.writeFileSync('src/components/PrizeDistributionModal.tsx', code);
