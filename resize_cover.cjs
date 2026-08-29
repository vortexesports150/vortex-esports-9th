const fs = require('fs');
let code = fs.readFileSync('src/UpazilaLeagueUser.tsx', 'utf8');

// Replace "w-12 h-12 sm:w-14 sm:h-14" with "w-24 sm:w-32 aspect-video h-auto"
code = code.replace(/w-12 h-12 sm:w-14 sm:h-14/g, 'w-24 sm:w-32 aspect-video h-auto');

fs.writeFileSync('src/UpazilaLeagueUser.tsx', code);
console.log("Resize done!");
