const fs = require('fs');
let code = fs.readFileSync('src/components/PrizeDistributionModal.tsx', 'utf8');

// 1. Add Edit3 to lucide-react imports
if (!code.includes('Edit3')) {
  code = code.replace(/import {([^}]+)} from 'lucide-react';/, "import {$1, Edit3} from 'lucide-react';");
}

// 2. Add state for editing prize
const stateRegex = /const \[top3Prize, setTop3Prize\] = useState\(0\);/;
const editState = `const [top3Prize, setTop3Prize] = useState(0);

  const [editingPrize, setEditingPrize] = useState<{ isOpen: boolean; type: string; title: string; currentValue: number } | null>(null);
  const [tempPrizeValue, setTempPrizeValue] = useState(0);

  const handleEditPrize = (type: string, title: string, value: number) => {
    setTempPrizeValue(value);
    setEditingPrize({ isOpen: true, type, title, currentValue: value });
  };

  const handleSavePrize = () => {
    if (!editingPrize) return;
    switch (editingPrize.type) {
      case 'champion': setChampionPrize(tempPrizeValue); break;
      case 'runnerUp': setRunnerUpPrize(tempPrizeValue); break;
      case 'top1': setTop1Prize(tempPrizeValue); break;
      case 'top2': setTop2Prize(tempPrizeValue); break;
      case 'top3': setTop3Prize(tempPrizeValue); break;
    }
    setEditingPrize(null);
  };`;
code = code.replace(stateRegex, editState);

// 3. Update Champion Prize input
const championInputOld = `{isAdmin && !isDistributed ? (
                    <div className="pointer-events-auto flex items-center justify-center gap-2 text-yellow-400 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                      <input type="number" value={championPrize} onChange={e => setChampionPrize(Number(e.target.value))} className="w-16 bg-transparent border-b border-yellow-400/50 text-center font-black focus:outline-none text-sm" />
                      <span className="font-mono text-[10px] uppercase tracking-wider">Tokens</span>
                    </div>
                  ) : (`;
const championInputNew = `{isAdmin && !isDistributed ? (
                    <div className="pointer-events-auto flex items-center justify-center gap-2 text-yellow-400 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                      <Gift className="w-4 h-4 text-yellow-400" />
                      <span className="font-black text-sm tracking-wider">{championPrize}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider">Tokens</span>
                      <button onClick={() => handleEditPrize('champion', 'Champion Prize', championPrize)} className="ml-1 text-yellow-400 hover:text-yellow-300 transition-colors p-1 bg-yellow-400/10 rounded">
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (`;
code = code.replace(championInputOld, championInputNew);

// 4. Update Runner-Up Prize input
const runnerUpInputOld = `{isAdmin && !isDistributed ? (
                    <div className="pointer-events-auto flex items-center justify-center gap-2 text-slate-300 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-400/50 shadow-[0_0_15px_rgba(203,213,225,0.4)]">
                      <input type="number" value={runnerUpPrize} onChange={e => setRunnerUpPrize(Number(e.target.value))} className="w-16 bg-transparent border-b border-slate-400/50 text-center font-black focus:outline-none text-sm" />
                      <span className="font-mono text-[10px] uppercase tracking-wider">Tokens</span>
                    </div>
                  ) : (`;
const runnerUpInputNew = `{isAdmin && !isDistributed ? (
                    <div className="pointer-events-auto flex items-center justify-center gap-2 text-slate-300 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-400/50 shadow-[0_0_15px_rgba(203,213,225,0.4)]">
                      <Gift className="w-4 h-4 text-slate-300" />
                      <span className="font-black text-sm tracking-wider">{runnerUpPrize}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider">Tokens</span>
                      <button onClick={() => handleEditPrize('runnerUp', 'Runner-Up Prize', runnerUpPrize)} className="ml-1 text-slate-300 hover:text-slate-200 transition-colors p-1 bg-slate-300/10 rounded">
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (`;
code = code.replace(runnerUpInputOld, runnerUpInputNew);

// 5. Update Table Prize input
const tablePrizeOld = `{isAdmin && !isDistributed ? (
                            <div className={\`flex items-center justify-center gap-1 \${colors[idx]} px-2 py-1 rounded-md border \${borderColors[idx]}\`}>
                              <input type="number" value={prizes[idx]} onChange={e => setPrizes[idx](Number(e.target.value))} className={\`w-12 bg-transparent text-center font-black focus:outline-none text-[9px] \${colors[idx]}\`} />
                              <span className="font-mono text-[8px] uppercase">TK</span>
                            </div>
                          ) : (
                            <div className={\`inline-flex items-center gap-1 \${colors[idx]}\`}>
                              <Gift className="w-3 h-3" />
                              <span className="font-black text-[10px]">{prizes[idx]}</span>
                            </div>
                          )}`;
const tablePrizeNew = `{isAdmin && !isDistributed ? (
                            <div className={\`flex items-center justify-center gap-1.5 \${colors[idx]} px-2 py-1 rounded-md border \${borderColors[idx]}\`}>
                              <Gift className="w-3 h-3" />
                              <span className="font-black text-[10px]">{prizes[idx]}</span>
                              <span className="font-mono text-[8px] uppercase">Tokens</span>
                              <button onClick={() => handleEditPrize(\`top\${idx + 1}\`, \`\${ranks[idx]} Prize\`, prizes[idx])} className={\`ml-1 hover:brightness-125 transition-colors p-0.5 \${bgColors[idx]} rounded\`}>
                                <Edit3 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <div className={\`inline-flex items-center gap-1 \${colors[idx]}\`}>
                              <Gift className="w-3 h-3" />
                              <span className="font-black text-[10px]">{prizes[idx]}</span>
                              <span className="font-mono text-[8px] uppercase ml-0.5">Tokens</span>
                            </div>
                          )}`;
code = code.replace(tablePrizeOld, tablePrizeNew);

// Fix glitching images (lazy load, and maybe reduce delays)
code = code.replace(/<img src={champion\?.coverUrl[^>]+>/, (match) => match.replace('>', ' loading="lazy" />'));
code = code.replace(/<img src={runnerUp\?.coverUrl[^>]+>/, (match) => match.replace('>', ' loading="lazy" />'));
code = code.replace(/<img src={player\.photoUrl[^>]+>/, (match) => match.replace('>', ' loading="lazy" />'));

// Reduce transition delays
code = code.replace(/transition=\{\{ delay: 0\.5 \}\}/g, 'transition={{ delay: 0.1 }}');
code = code.replace(/transition=\{\{ delay: 0\.6 \}\}/g, 'transition={{ delay: 0.15 }}');
code = code.replace(/transition=\{\{ delay: 0\.7 \}\}/g, 'transition={{ delay: 0.2 }}');
code = code.replace(/transition=\{\{ delay: 0\.8 \}\}/g, 'transition={{ delay: 0.25 }}');
code = code.replace(/transition=\{\{ duration: 1\.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0\.2 \}\}/g, 'transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}');

// 6. Add Edit Prize Modal at the end
const endDivRegex = /(      <\/div>\n    <\/div>\n  \);\n\})/;
const editModal = `
        {/* Edit Prize Modal */}
        {editingPrize && editingPrize.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-purple-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
              <button onClick={() => setEditingPrize(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1.5 transition-colors">
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-purple-500/20 rounded-xl">
                  <Gift className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Edit Prize</h3>
                  <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">{editingPrize.title}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Token Amount</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={tempPrizeValue} 
                    onChange={e => setTempPrizeValue(Number(e.target.value))}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-purple-500/50 transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-purple-400 opacity-50">
                    <span className="text-[10px] font-black uppercase tracking-widest">Tokens</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleSavePrize}
                className="w-full py-3 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors shadow-[0_0_20px_rgba(147,51,234,0.3)]"
              >
                Save Changes
              </button>
            </motion.div>
          </div>
        )}
$1`;
code = code.replace(endDivRegex, editModal);

fs.writeFileSync('src/components/PrizeDistributionModal.tsx', code);
