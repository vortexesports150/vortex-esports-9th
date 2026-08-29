const fs = require('fs');
let code = fs.readFileSync('src/UpazilaLeagueUser.tsx', 'utf8');

// Replace "text-xs sm:text-sm font-bold truncate w-full"
code = code.replace(/text-xs sm:text-sm font-bold truncate w-full/g, 'text-[10px] sm:text-xs font-bold truncate w-full');
code = code.replace(/text-xs sm:text-sm font-bold text-white font-mono truncate w-full/g, 'text-[10px] sm:text-xs font-bold text-white font-mono truncate w-full');

fs.writeFileSync('src/UpazilaLeagueUser.tsx', code);
console.log("Resize text done!");
