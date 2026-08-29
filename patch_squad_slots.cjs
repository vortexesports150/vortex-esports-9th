const fs = require('fs');
let code = fs.readFileSync('src/UpazilaLeagueUser.tsx', 'utf8');

const oldStr = `              {[0, 1, 2, 3].map(slotIdx => {
                const sq = squadsInGroup[slotIdx];
                const gIndex = groups.findIndex(g => g.id === selectedGroup.id);
                const tbdNum = Math.max(0, gIndex) * 4 + slotIdx + 1;
                return (
                  <div key={slotIdx} className={\`px-2.5 py-1 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 \${sq ? 'bg-fuchsia-950/80 text-fuchsia-300 border border-fuchsia-500/30' : 'bg-slate-950 text-slate-500 border border-white/5'}\`}>
                    <span className="text-[10px] text-slate-400">tbd\${tbdNum}:</span>
                    <span className="truncate max-w-[120px]">{sq ? sq.teamName : \`tbd\${tbdNum}\`}</span>
                  </div>
                );
              })}`;

const newStr = `              {[0, 1, 2, 3].map(slotIdx => {
                const sq = squadsInGroup[slotIdx];
                const gIndex = groups.findIndex(g => g.id === selectedGroup.id);
                const tbdNum = Math.max(0, gIndex) * 4 + slotIdx + 1;
                
                // Color variants for distinct squad slots
                const activeColors = [
                  'bg-blue-950/80 text-blue-300 border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.3)]',
                  'bg-purple-950/80 text-purple-300 border-purple-500/50 shadow-[0_0_8px_rgba(168,85,247,0.3)]',
                  'bg-rose-950/80 text-rose-300 border-rose-500/50 shadow-[0_0_8px_rgba(244,63,94,0.3)]',
                  'bg-amber-950/80 text-amber-300 border-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.3)]'
                ];
                
                return (
                  <div key={slotIdx} className={\`px-3 py-1.5 rounded-lg text-sm font-sans font-bold flex items-center gap-2 transition-all \${sq ? activeColors[slotIdx] + ' border' : 'bg-slate-950 text-slate-500 border border-white/5'}\`}>
                    <span className="text-[10px] opacity-70 font-mono tracking-wider">TBD\${tbdNum}:</span>
                    <span className="truncate max-w-[140px] tracking-wide">{sq ? sq.teamName : \`Slot \${slotIdx + 1}\`}</span>
                  </div>
                );
              })}`;

if (code.includes(oldStr)) {
  code = code.replace(oldStr, newStr);
  fs.writeFileSync('src/UpazilaLeagueUser.tsx', code);
  console.log("Patched squad slots successfully");
} else {
  console.log("Could not find the squad slots block");
}
