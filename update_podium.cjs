const fs = require('fs');
let code = fs.readFileSync('src/components/PrizeDistributionModal.tsx', 'utf8');

const newPodium = `        {/* Teams Podium */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 mb-20 relative z-10">
          
          {/* Champion */}
          <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-col items-center group relative">
            <div className="absolute inset-0 bg-fuchsia-500/20 blur-3xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="relative">
              <div className="w-72 h-40 md:w-[340px] md:h-48 rounded-3xl overflow-hidden border-4 border-yellow-400/50 relative shadow-[0_0_50px_rgba(250,204,21,0.2)]">
                <img src={champion?.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600'} alt="Champion" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/30" />
                
                {/* Price token on top of cover photo */}
                <motion.div 
                  initial={{ y: -5 }}
                  animate={{ y: 5 }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                  className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none"
                >
                  <Trophy className="w-14 h-14 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] mb-2" />
                  {isAdmin && !isDistributed ? (
                    <div className="pointer-events-auto flex items-center justify-center gap-2 text-yellow-400 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                      <input type="number" value={championPrize} onChange={e => setChampionPrize(Number(e.target.value))} className="w-16 bg-transparent border-b border-yellow-400/50 text-center font-black focus:outline-none text-sm" />
                      <span className="font-mono text-[10px] uppercase tracking-wider">Tokens</span>
                    </div>
                  ) : (
                    <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-yellow-400/50 flex items-center gap-1.5 shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                      <Gift className="w-4 h-4 text-yellow-400" />
                      <span className="font-black text-yellow-400 text-sm tracking-wider">{championPrize} Tokens</span>
                    </div>
                  )}
                </motion.div>

                <div className="absolute bottom-3 left-0 w-full text-center z-10">
                  <span className="text-yellow-400 font-black uppercase tracking-widest text-[11px] drop-shadow-lg">Champion</span>
                </div>
              </div>
            </div>
            <div className="text-center mt-6 z-10">
              <h2 className="text-3xl font-black text-white uppercase">{champion?.teamName || 'TBD'}</h2>
              <p className="text-slate-400 font-mono uppercase tracking-widest text-xs mt-1">{champion?.upazila || 'N/A'}</p>
            </div>
          </motion.div>

          {/* Runner Up */}
          <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.6 }} className="flex flex-col items-center group relative md:mt-0">
            <div className="absolute inset-0 bg-cyan-500/20 blur-3xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="relative">
              <div className="w-72 h-40 md:w-[340px] md:h-48 rounded-3xl overflow-hidden border-4 border-slate-400/50 relative shadow-[0_0_40px_rgba(203,213,225,0.1)]">
                <img src={runnerUp?.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600'} alt="Runner Up" className="w-full h-full object-cover grayscale-[30%]" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/30" />
                
                {/* Price token on top of cover photo */}
                <motion.div 
                  initial={{ y: -5 }}
                  animate={{ y: 5 }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut", delay: 0.2 }}
                  className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none"
                >
                  <Medal className="w-12 h-12 text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.8)] mb-2" />
                  {isAdmin && !isDistributed ? (
                    <div className="pointer-events-auto flex items-center justify-center gap-2 text-slate-300 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-400/50 shadow-[0_0_15px_rgba(203,213,225,0.4)]">
                      <input type="number" value={runnerUpPrize} onChange={e => setRunnerUpPrize(Number(e.target.value))} className="w-16 bg-transparent border-b border-slate-400/50 text-center font-black focus:outline-none text-sm" />
                      <span className="font-mono text-[10px] uppercase tracking-wider">Tokens</span>
                    </div>
                  ) : (
                    <div className="bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full border border-slate-400/50 flex items-center gap-1.5 shadow-[0_0_15px_rgba(203,213,225,0.4)]">
                      <Gift className="w-4 h-4 text-slate-300" />
                      <span className="font-black text-slate-300 text-sm tracking-wider">{runnerUpPrize} Tokens</span>
                    </div>
                  )}
                </motion.div>

                <div className="absolute bottom-3 left-0 w-full text-center z-10">
                  <span className="text-slate-300 font-black uppercase tracking-widest text-[11px] drop-shadow-lg">Runner-Up</span>
                </div>
              </div>
            </div>
            <div className="text-center mt-6 z-10">
              <h2 className="text-2xl font-black text-white uppercase">{runnerUp?.teamName || 'TBD'}</h2>
              <p className="text-slate-400 font-mono uppercase tracking-widest text-xs mt-1">{runnerUp?.upazila || 'N/A'}</p>
            </div>
          </motion.div>
        </div>`;

code = code.replace(/\{\/\* Teams Podium \*\/\}.*?\{\/\* Top 3 Players Table \*\/\}/s, newPodium + '\n\n        {/* Top 3 Players Table */}');

fs.writeFileSync('src/components/PrizeDistributionModal.tsx', code);
