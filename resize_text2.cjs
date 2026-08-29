const fs = require('fs');
let code = fs.readFileSync('src/UpazilaLeagueUser.tsx', 'utf8');

code = code.replace(/text-\[9px\] sm:text-\[10px\] text-slate-400 font-mono truncate w-full/g, 'text-[8px] sm:text-[9px] text-slate-400 font-mono truncate w-full');

fs.writeFileSync('src/UpazilaLeagueUser.tsx', code);
console.log("Resize text 2 done!");
