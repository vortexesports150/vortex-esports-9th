const fs = require('fs');
let content = fs.readFileSync('src/UpazilaLeagueUser.tsx', 'utf8');

const s1_old = `<div className="flex items-center gap-2 flex-1 justify-end max-w-[180px]">
                             <div className="flex flex-col items-end truncate">
                               <span
                                  onClick={() => setRosterModal({ show: true, squad: squad1, title: squad1?.teamName || \`tbd\${tbd1Num}\` })}
                                 className={\`text-xs font-bold truncate cursor-pointer hover:text-purple-400 transition-colors \${squad1 ? 'text-white' : 'text-slate-500'}\`}
                               >
                                 {squad1 ? squad1.teamName : \`tbd\${tbd1Num}\`}
                               </span>
                               <span className="text-[9px] text-slate-400 font-mono truncate text-right">
                                 {formatUpazila(squad1?.upazila || squad1?.subDistrict || squad1?.district || customRes?.squad1Upazila || (squad1 ? 'unassigned' : 'n/a'))}
                               </span>
                             </div>
                             {squad1 ? (
                               <img src={squad1.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200'} className="w-7 h-7 rounded-md object-cover border border-fuchsia-500/30 shrink-0" alt="Team 1" />
                             ) : <div className="w-7 h-7 bg-slate-900 rounded-md border border-dashed border-white/10 shrink-0 flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-slate-700"/></div>}
                           </div>`;
                           
const s2_old = `<div className="flex items-center gap-2 flex-1 justify-start max-w-[180px]">
                             {squad2 ? (
                               <img src={squad2.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200'} className="w-7 h-7 rounded-md object-cover border border-fuchsia-500/30 shrink-0" alt="Team 2" />
                             ) : <div className="w-7 h-7 bg-slate-900 rounded-md border border-dashed border-white/10 shrink-0 flex items-center justify-center"><Shield className="w-3.5 h-3.5 text-slate-700"/></div>}
                             <div className="flex flex-col items-start truncate">
                               <span
                                  onClick={() => setRosterModal({ show: true, squad: squad2, title: squad2?.teamName || \`tbd\${tbd2Num}\` })}
                                 className={\`text-xs font-bold truncate cursor-pointer hover:text-purple-400 transition-colors \${squad2 ? 'text-white' : 'text-slate-500'}\`}
                               >
                                 {squad2 ? squad2.teamName : \`tbd\${tbd2Num}\`}
                               </span>
                               <span className="text-[9px] text-slate-400 font-mono truncate text-left">
                                 {formatUpazila(squad2?.upazila || squad2?.subDistrict || squad2?.district || customRes?.squad2Upazila || (squad2 ? 'unassigned' : 'n/a'))}
                               </span>
                             </div>
                           </div>`;
                           
const s1_new = `<div className="flex flex-col items-center gap-1.5 flex-1 justify-center max-w-[180px]">
                             {squad1 ? (
                               <img src={squad1.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200'} className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover border border-fuchsia-500/30 shrink-0" alt="Team 1" />
                             ) : <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-900 rounded-lg border border-dashed border-white/10 shrink-0 flex items-center justify-center"><Shield className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700"/></div>}
                             <div className="flex flex-col items-center text-center truncate w-full px-1">
                               <span
                                  onClick={() => setRosterModal({ show: true, squad: squad1, title: squad1?.teamName || \`tbd\${tbd1Num}\` })}
                                 className={\`text-xs sm:text-sm font-bold truncate w-full cursor-pointer hover:text-purple-400 transition-colors \${squad1 ? 'text-white' : 'text-slate-500'}\`}
                               >
                                 {squad1 ? squad1.teamName : \`tbd\${tbd1Num}\`}
                               </span>
                               <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate w-full">
                                 {formatUpazila(squad1?.upazila || squad1?.subDistrict || squad1?.district || customRes?.squad1Upazila || (squad1 ? 'unassigned' : 'n/a'))}
                               </span>
                             </div>
                           </div>`;

const s2_new = `<div className="flex flex-col items-center gap-1.5 flex-1 justify-center max-w-[180px]">
                             {squad2 ? (
                               <img src={squad2.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200'} className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg object-cover border border-fuchsia-500/30 shrink-0" alt="Team 2" />
                             ) : <div className="w-12 h-12 sm:w-14 sm:h-14 bg-slate-900 rounded-lg border border-dashed border-white/10 shrink-0 flex items-center justify-center"><Shield className="w-5 h-5 sm:w-6 sm:h-6 text-slate-700"/></div>}
                             <div className="flex flex-col items-center text-center truncate w-full px-1">
                               <span
                                  onClick={() => setRosterModal({ show: true, squad: squad2, title: squad2?.teamName || \`tbd\${tbd2Num}\` })}
                                 className={\`text-xs sm:text-sm font-bold truncate w-full cursor-pointer hover:text-purple-400 transition-colors \${squad2 ? 'text-white' : 'text-slate-500'}\`}
                               >
                                 {squad2 ? squad2.teamName : \`tbd\${tbd2Num}\`}
                               </span>
                               <span className="text-[9px] sm:text-[10px] text-slate-400 font-mono truncate w-full">
                                 {formatUpazila(squad2?.upazila || squad2?.subDistrict || squad2?.district || customRes?.squad2Upazila || (squad2 ? 'unassigned' : 'n/a'))}
                               </span>
                             </div>
                           </div>`;

// Replace using regex or simple replace
let newContent = content;

// Sometimes newlines are \r\n, let's normalize to \n
newContent = newContent.replace(/\r\n/g, '\n');

// Also update the parent div padding
newContent = newContent.replace('justify-between sm:justify-around p-2 sm:p-2.5 bg-slate-900/60 rounded-lg', 'justify-between sm:justify-around p-3 bg-slate-900/60 rounded-lg');

// We need a robust way to replace to avoid whitespace mismatches
function clean(str) {
  return str.replace(/\s+/g, '');
}

// Find the index by stripping whitespace
let strippedContent = clean(newContent);
let s1_clean = clean(s1_old);
let s2_clean = clean(s2_old);

if (strippedContent.includes(s1_clean) && strippedContent.includes(s2_clean)) {
  console.log("Found both parts. Trying manual replace based on character matching.");
  // A regex replacement ignoring whitespace
  const reg1 = new RegExp(s1_old.replace(/\s+/g, '\\s+').replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), 'g');
  newContent = newContent.replace(reg1, () => s1_new);
  
  const reg2 = new RegExp(s2_old.replace(/\s+/g, '\\s+').replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&"), 'g');
  newContent = newContent.replace(reg2, () => s2_new);
  
  fs.writeFileSync('src/UpazilaLeagueUser.tsx', newContent);
  console.log("Successfully replaced!");
} else {
  console.log("Could not find the parts to replace.");
}

