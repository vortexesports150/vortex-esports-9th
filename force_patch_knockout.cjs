const fs = require('fs');
let code = fs.readFileSync('src/UpazilaLeagueUser.tsx', 'utf8');

const repl2 = `                            <div className="flex flex-col items-center gap-1.5 flex-1 justify-center max-w-[170px]">
                              {m.squad1Obj?.coverUrl ? (
                                <img src={m.squad1Obj.coverUrl} className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover border border-fuchsia-500/30 shrink-0" alt="Team 1" />
                              ) : (
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-800 rounded-lg border border-dashed border-fuchsia-500/30 shrink-0 flex items-center justify-center">
                                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-fuchsia-400" />
                                </div>
                              )}
                              <div className="flex flex-col items-center text-center truncate w-full px-1">
                                <span className="text-xs sm:text-sm font-bold text-white font-mono truncate w-full">
                                  {m.squad1Name}
                                </span>
                                <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate w-full">
                                  {formatUpazila(m.squad1Obj?.upazila || m.squad1Obj?.subDistrict || m.squad1Obj?.district || knockoutRes?.squad1Upazila || (m.squad1Name?.includes('') ? 'n/a' : 'unassigned'))}
                                </span>
                              </div>
                            </div>
                            <span className="text-fuchsia-500 text-[10px] font-black uppercase font-mono px-3 py-1 bg-fuchsia-950 rounded-md border border-fuchsia-500/30 shrink-0 mx-2">
                              VS
                            </span>
                            <div className="flex flex-col items-center gap-1.5 flex-1 justify-center max-w-[170px]">
                              {m.squad2Obj?.coverUrl ? (
                                <img src={m.squad2Obj.coverUrl} className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover border border-fuchsia-500/30 shrink-0" alt="Team 2" />
                              ) : (
                                <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-800 rounded-lg border border-dashed border-fuchsia-500/30 shrink-0 flex items-center justify-center">
                                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-fuchsia-400" />
                                </div>
                              )}
                              <div className="flex flex-col items-center text-center truncate w-full px-1">
                                <span className="text-xs sm:text-sm font-bold text-white font-mono truncate w-full">
                                  {m.squad2Name}
                                </span>
                                <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate w-full">
                                  {formatUpazila(m.squad2Obj?.upazila || m.squad2Obj?.subDistrict || m.squad2Obj?.district || knockoutRes?.squad2Upazila || (m.squad2Name?.includes('') ? 'n/a' : 'unassigned'))}
                                </span>
                              </div>
                            </div>`;

let lines = code.split('\n');
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('                            <div className="flex items-center gap-2 flex-1 justify-end max-w-[170px]">')) {
    // Found the start of squad1 in knockout row
    console.log("Replacing knockout at line", i);
    // Erase the old block - how many lines is it? Let's say 24 lines.
    lines.splice(i, 24, repl2);
    break;
  }
}

fs.writeFileSync('src/UpazilaLeagueUser.tsx', lines.join('\n'));
console.log("Done knockout force replace");
