const fs = require('fs');
let content = fs.readFileSync('src/UpazilaLeagueUser.tsx', 'utf8');

const s1_old = `<div className="flex items-center gap-2 flex-1 justify-end max-w-[170px]">
                              <div className="flex flex-col items-end truncate">
                                <span className="text-[8px] font-bold text-white font-mono truncate text-right">
                                  {m.squad1Name}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono truncate text-right">
                                  {formatUpazila(m.squad1Obj?.upazila || m.squad1Obj?.subDistrict || m.squad1Obj?.district || knockoutRes?.squad1Upazila || (m.squad1Name?.includes('') ? 'n/a' : 'unassigned'))}
                                </span>
                              </div>
                              <div className="w-6 h-6 bg-slate-800 rounded-md border border-fuchsia-500/30 shrink-0 flex items-center justify-center">
                                <Shield className="w-3 h-3 text-fuchsia-400" />
                              </div>
                            </div>`;

const s2_old = `<div className="flex items-center gap-2 flex-1 justify-start max-w-[170px]">
                              <div className="w-6 h-6 bg-slate-800 rounded-md border border-fuchsia-500/30 shrink-0 flex items-center justify-center">
                                <Shield className="w-3 h-3 text-fuchsia-400" />
                              </div>
                              <div className="flex flex-col items-start truncate">
                                <span className="text-[8px] font-bold text-white font-mono truncate text-left">
                                  {m.squad2Name}
                                </span>
                                <span className="text-[9px] text-slate-400 font-mono truncate text-left">
                                  {formatUpazila(m.squad2Obj?.upazila || m.squad2Obj?.subDistrict || m.squad2Obj?.district || knockoutRes?.squad2Upazila || (m.squad2Name?.includes('') ? 'n/a' : 'unassigned'))}
                                </span>
                              </div>
                            </div>`;

const s1_new = `<div className="flex flex-col items-center gap-1.5 flex-1 justify-center max-w-[170px]">
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
                            </div>`;

const s2_new = `<div className="flex flex-col items-center gap-1.5 flex-1 justify-center max-w-[170px]">
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

let newContent = content;
newContent = newContent.replace(/\r\n/g, '\n');

function clean(str) {
  return str.replace(/\s+/g, '');
}

let strippedContent = clean(newContent);
let s1_clean = clean(s1_old);
let s2_clean = clean(s2_old);

if (strippedContent.includes(s1_clean) && strippedContent.includes(s2_clean)) {
  console.log("Found both parts. Trying manual replace based on character matching.");
  const reg1 = new RegExp(s1_old.replace(/\s+/g, '\\s+').replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), 'g');
  newContent = newContent.replace(reg1, () => s1_new);
  
  const reg2 = new RegExp(s2_old.replace(/\s+/g, '\\s+').replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), 'g');
  newContent = newContent.replace(reg2, () => s2_new);
  
  fs.writeFileSync('src/UpazilaLeagueUser.tsx', newContent);
  console.log("Successfully replaced!");
} else {
  console.log("Could not find the parts to replace.");
}
