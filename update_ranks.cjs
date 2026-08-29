const fs = require('fs');
let content = fs.readFileSync('src/components/LeagueScheduleView.tsx', 'utf8');

const oldRanks = `              <div className="flex flex-row justify-center items-stretch gap-2 max-w-3xl mx-auto w-full">
                {/* Rank 2 */}
                <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-1.5 md:p-2.5 flex flex-col items-center justify-center text-center">
                  <span className="text-sm md:text-base mb-0.5">🥈</span>
                  <span className="text-slate-400 text-[8px] md:text-[10px] font-bold uppercase">Rank 2</span>
                  <span className="text-white font-black text-[9px] md:text-xs truncate w-full">TBD</span>
                  <span className="text-slate-300 font-mono font-bold text-[8px] md:text-[10px] mt-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">
                    🪙 {league.topRank2Prize || 0}
                  </span>
                </div>

                {/* Rank 1 (MVP) */}
                <div className="flex-[1.2] bg-white/10 backdrop-blur-md border border-cyan-500/40 rounded-lg p-1.5 md:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_0_15px_rgba(6,182,212,0.15)] relative">
                  <span className="text-base md:text-lg mb-0.5">👑</span>
                  <span className="text-cyan-400 text-[8px] md:text-[10px] font-bold uppercase">Rank 1 (MVP)</span>
                  <span className="text-white font-black text-[10px] md:text-sm truncate w-full">TBD</span>
                  <span className="text-cyan-300 font-mono font-bold text-[8px] md:text-[10px] mt-1 bg-black/40 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    🪙 {league.topRank1Prize || 0}
                  </span>
                </div>

                {/* Rank 3 */}
                <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-1.5 md:p-2.5 flex flex-col items-center justify-center text-center">
                  <span className="text-sm md:text-base mb-0.5">🥉</span>
                  <span className="text-slate-400 text-[8px] md:text-[10px] font-bold uppercase">Rank 3</span>
                  <span className="text-white font-black text-[9px] md:text-xs truncate w-full">TBD</span>
                  <span className="text-slate-300 font-mono font-bold text-[8px] md:text-[10px] mt-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">
                    🪙 {league.topRank3Prize || 0}
                  </span>
                </div>
              </div>`;

const newRanks = `              <div className="flex flex-row justify-center items-stretch gap-2 max-w-3xl mx-auto w-full">
                {/* Rank 2 */}
                <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-1.5 md:p-2.5 flex flex-col items-center justify-center text-center">
                  <div className="relative mb-1 group">
                    <img src="https://ui-avatars.com/api/?name=TBD&background=475569&color=fff" alt="Rank 2" className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-slate-400/50 shadow-md group-hover:scale-110 transition-transform object-cover bg-slate-800" />
                    <span className="absolute -top-2 -right-2 text-sm md:text-base drop-shadow-md">🥈</span>
                  </div>
                  <span className="text-slate-400 text-[8px] md:text-[10px] font-bold uppercase">Rank 2</span>
                  <span className="text-white font-black text-[9px] md:text-xs truncate w-full">TBD</span>
                  <span className="text-slate-300 font-mono font-bold text-[8px] md:text-[10px] mt-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">
                    🪙 {league.topRank2Prize || 0}
                  </span>
                </div>

                {/* Rank 1 (MVP) */}
                <div className="flex-[1.2] bg-white/10 backdrop-blur-md border border-cyan-500/40 rounded-lg p-1.5 md:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_0_15px_rgba(6,182,212,0.15)] relative">
                  <div className="relative mb-1 group">
                    <img src="https://ui-avatars.com/api/?name=MVP&background=0ea5e9&color=fff" alt="Rank 1" className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:scale-110 transition-transform object-cover bg-slate-800" />
                    <span className="absolute -top-2 -right-2 text-base md:text-lg animate-bounce drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]">👑</span>
                  </div>
                  <span className="text-cyan-400 text-[8px] md:text-[10px] font-bold uppercase">Rank 1 (MVP)</span>
                  <span className="text-white font-black text-[10px] md:text-sm truncate w-full">TBD</span>
                  <span className="text-cyan-300 font-mono font-bold text-[8px] md:text-[10px] mt-1 bg-black/40 px-1.5 py-0.5 rounded border border-cyan-500/30">
                    🪙 {league.topRank1Prize || 0}
                  </span>
                </div>

                {/* Rank 3 */}
                <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-1.5 md:p-2.5 flex flex-col items-center justify-center text-center">
                  <div className="relative mb-1 group">
                    <img src="https://ui-avatars.com/api/?name=TBD&background=475569&color=fff" alt="Rank 3" className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-orange-700/50 shadow-md group-hover:scale-110 transition-transform object-cover bg-slate-800" />
                    <span className="absolute -top-2 -right-2 text-sm md:text-base drop-shadow-md">🥉</span>
                  </div>
                  <span className="text-slate-400 text-[8px] md:text-[10px] font-bold uppercase">Rank 3</span>
                  <span className="text-white font-black text-[9px] md:text-xs truncate w-full">TBD</span>
                  <span className="text-slate-300 font-mono font-bold text-[8px] md:text-[10px] mt-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">
                    🪙 {league.topRank3Prize || 0}
                  </span>
                </div>
              </div>`;

if (content.includes(oldRanks)) {
  content = content.replace(oldRanks, newRanks);
  fs.writeFileSync('src/components/LeagueScheduleView.tsx', content);
  console.log("Success");
} else {
  console.log("Failed to find old code block");
}
