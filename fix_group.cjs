const fs = require('fs');
let code = fs.readFileSync('src/UpazilaLeagueUser.tsx', 'utf8');
let lines = code.split('\n');

for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('                             </div>') && lines[i+1].includes('                           </div>') && lines[i+2].includes('                               </span>')) {
     lines.splice(i+2, 3); // removing the trailing leftover span and divs.
     break;
  }
}
fs.writeFileSync('src/UpazilaLeagueUser.tsx', lines.join('\n'));
console.log("Fixed group dup");
