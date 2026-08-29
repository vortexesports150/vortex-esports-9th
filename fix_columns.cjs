const fs = require('fs');
let code = fs.readFileSync('src/components/PrizeDistributionModal.tsx', 'utf8');

const oldHeader = `<th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Player</th>`;
const newHeader = `<th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-12">Photo</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Game Name</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Squad Name</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Upazila</th>`;
code = code.replace(oldHeader, newHeader);

const oldRow = `<td className="p-3">
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <img src={player.photoUrl || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${player.gameName}\`} alt={player.gameName} className={\`w-8 h-8 rounded-lg border \${borderColors[idx]} object-cover bg-slate-800\`} />
                              {idx === 0 && <Star className="w-3.5 h-3.5 text-yellow-400 absolute -top-1.5 -right-1.5 drop-shadow-lg fill-yellow-400" />}
                            </div>
                            <div>
                              <div className="font-black text-white text-[10px] uppercase tracking-wider">{player.gameName}</div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-[8px] font-bold text-fuchsia-400 uppercase">{player.squadName}</span>
                                <span className="text-[8px] text-slate-500">•</span>
                                <span className="text-[8px] font-mono text-slate-400 uppercase">{player.upazila}</span>
                              </div>
                            </div>
                          </div>
                        </td>`;

const newRow = `<td className="p-3 text-center">
                          <div className="relative inline-block">
                            <img src={player.photoUrl || \`https://api.dicebear.com/7.x/avataaars/svg?seed=\${player.gameName}\`} alt={player.gameName} className={\`w-8 h-8 rounded-lg border \${borderColors[idx]} object-cover bg-slate-800 mx-auto\`} />
                            {idx === 0 && <Star className="w-3.5 h-3.5 text-yellow-400 absolute -top-1.5 -right-1.5 drop-shadow-lg fill-yellow-400" />}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="font-black text-white text-[10px] uppercase tracking-wider">{player.gameName}</div>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold text-fuchsia-400 uppercase">{player.squadName}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-mono text-slate-400 uppercase">{player.upazila}</span>
                        </td>`;

code = code.replace(oldRow, newRow);

fs.writeFileSync('src/components/PrizeDistributionModal.tsx', code);
