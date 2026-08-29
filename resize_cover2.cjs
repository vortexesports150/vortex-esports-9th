const fs = require('fs');
let code = fs.readFileSync('src/UpazilaLeagueUser.tsx', 'utf8');

// Replace "w-24 sm:w-32 aspect-video h-auto" with "w-full h-[45px] sm:h-[55px]"
code = code.replace(/w-24 sm:w-32 aspect-video h-auto/g, 'w-full h-[45px] sm:h-[55px]');

fs.writeFileSync('src/UpazilaLeagueUser.tsx', code);
console.log("Resize 2 done!");
