const fs = require('fs');
let code = fs.readFileSync('src/UpazilaLeagueUser.tsx', 'utf8');
let lines = code.split('\n');

// Find the line where the duplicate starts (around 3224)
// `                                  {m.squad2Name}` followed by `                                </span>`

for(let i=0; i<lines.length; i++) {
  if (lines[i].includes('                                  {m.squad2Name}') && lines[i+1].includes('                                </span>') && lines[i+2].includes('                                <span className="text-[9px] text-slate-400 font-mono truncate text-left">')) {
     lines.splice(i, 7); // removing the trailing leftover div tags.
     break;
  }
}
fs.writeFileSync('src/UpazilaLeagueUser.tsx', lines.join('\n'));
console.log("Fixed knockout dup");
