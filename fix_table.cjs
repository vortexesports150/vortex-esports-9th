const fs = require('fs');
let code = fs.readFileSync('src/components/PrizeDistributionModal.tsx', 'utf8');

const tableRegex = /<table className="w-full text-left border-collapse">.*?<\/table>/s;

const newTable = `<table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-950/80">
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-12">Rank</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Player</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Matches</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Kills</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Damage</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Points</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Prize</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {topPlayers.map((player, idx) => {
                    const prizes = [top1Prize, top2Prize, top3Prize];
                    const setPrizes = [setTop1Prize, setTop2Prize, setTop3Prize];
                    const ranks = ['MVP', 'Top 2', 'Top 3'];
                    const colors = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];
                    const bgColors = ['bg-yellow-400/10', 'bg-slate-300/10', 'bg-amber-600/10'];
                    const borderColors = ['border-yellow-400/30', 'border-slate-300/30', 'border-amber-600/30'];
                    return (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-center">
                          <span className={\`inline-block px-2 py-0.5 rounded font-black text-[8px] uppercase tracking-widest \${colors[idx]} \${bgColors[idx]} border \${borderColors[idx]}\`}>
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="p-3">
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
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-[10px] font-bold text-slate-300 font-mono">{player.matchesPlayed || 0}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-[10px] font-black text-white font-mono">{player.totalKills}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-[10px] font-bold text-slate-400 font-mono">{player.totalDamage}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-[10px] font-black text-cyan-400 font-mono">{player.points || 0}</span>
                        </td>
                        <td className="p-3 text-center">
                          {isAdmin && !isDistributed ? (
                            <div className={\`flex items-center justify-center gap-1 \${colors[idx]} px-2 py-1 rounded-md border \${borderColors[idx]}\`}>
                              <input type="number" value={prizes[idx]} onChange={e => setPrizes[idx](Number(e.target.value))} className={\`w-12 bg-transparent text-center font-black focus:outline-none text-[9px] \${colors[idx]}\`} />
                              <span className="font-mono text-[8px] uppercase">TK</span>
                            </div>
                          ) : (
                            <div className={\`inline-flex items-center gap-1 \${colors[idx]}\`}>
                              <Gift className="w-3 h-3" />
                              <span className="font-black text-[10px]">{prizes[idx]}</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>`;

code = code.replace(tableRegex, newTable);
fs.writeFileSync('src/components/PrizeDistributionModal.tsx', code);
