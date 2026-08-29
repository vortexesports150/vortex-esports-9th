const fs = require('fs');
let code = fs.readFileSync('src/UpazilaLeagueUser.tsx', 'utf8');

const targetSquad1 = `<div className="flex items-center gap-2 flex-1 justify-end max-w-[180px]">
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

const replSquad1 = `<div className="flex flex-col items-center gap-1.5 flex-1 justify-center max-w-[180px]">
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


const targetSquad2 = `<div className="flex items-center gap-2 flex-1 justify-start max-w-[180px]">
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

const replSquad2 = `<div className="flex flex-col items-center gap-1.5 flex-1 justify-center max-w-[180px]">
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
                           
code = code.replace(targetSquad1, replSquad1);
code = code.replace(targetSquad2, replSquad2);
fs.writeFileSync('src/UpazilaLeagueUser.tsx', code);
console.log("Replaced!");
