const fs = require('fs');

let content = fs.readFileSync('src/components/LeagueScheduleView.tsx', 'utf8');

const modalCode = `
      {/* Hall of Glory Full Screen Modal */}
      {showHallOfGloryModal && (
        <div className="fixed inset-0 z-[150] flex flex-col bg-slate-950 overflow-y-auto overflow-x-hidden">
          {/* Animated Background */}
          <div className="fixed inset-0 pointer-events-none opacity-20 bg-[url('https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=2000')] bg-cover bg-center animate-pulse duration-[10s]" />
          <div className="fixed inset-0 pointer-events-none bg-gradient-to-b from-slate-950 via-slate-950/80 to-slate-950" />
          
          {/* Glowing core */}
          <div className="fixed top-1/4 left-1/2 -translate-x-1/2 w-[800px] h-[800px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none" />

          {/* Close Button */}
          <button 
            onClick={() => setShowHallOfGloryModal(false)}
            className="fixed top-6 right-6 z-50 p-3 rounded-full bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:scale-110 transition-all backdrop-blur-md"
          >
            <ChevronRight className="w-6 h-6 rotate-180" />
          </button>

          <div className="relative z-10 flex flex-col min-h-screen py-12 px-4 md:px-8 max-w-6xl mx-auto w-full">
            {/* Header */}
            <div className="text-center mb-16 animate-slideDown">
              <div className="inline-flex items-center justify-center p-3 bg-yellow-500/10 rounded-2xl border border-yellow-500/20 mb-6 backdrop-blur-md">
                <Trophy className="w-10 h-10 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
              </div>
              <h2 className="text-5xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-300 uppercase tracking-tighter drop-shadow-2xl">
                Hall of Glory
              </h2>
              <p className="text-cyan-400 font-mono text-lg tracking-[0.3em] mt-4 uppercase font-bold text-shadow-glow">
                The Ultimate Champions
              </p>
            </div>

            {/* Top Teams Section */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-12 md:gap-20 mb-20">
              
              {/* Runner Up */}
              <div className="flex flex-col items-center order-2 md:order-1 transform md:translate-y-16 w-full md:w-[40%] max-w-[400px] animate-fadeIn" style={{ animationDelay: '0.3s' }}>
                <div className="w-full aspect-video rounded-2xl border-4 border-slate-400/50 overflow-hidden shadow-[0_0_40px_rgba(148,163,184,0.2)] relative group ring-4 ring-slate-500/10">
                  <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800" alt="Runner Up Squad Cover" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />
                  <div className="absolute bottom-4 left-0 right-0 text-center">
                    <span className="inline-block bg-slate-800/80 backdrop-blur border border-slate-500/30 text-white font-black px-4 py-1.5 rounded-lg text-lg shadow-lg">
                      TBD
                    </span>
                  </div>
                </div>
                <div className="mt-6 text-center bg-slate-900/50 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-4 w-full">
                  <span className="text-slate-400 font-black uppercase tracking-widest text-sm block mb-1">Runner Up</span>
                  <div className="inline-flex items-center gap-2 bg-slate-800/80 border border-slate-600/50 px-4 py-2 rounded-xl mt-2">
                    <span className="text-xl">🪙</span>
                    <span className="text-white font-mono text-xl font-bold">{league.runnerUpPrize || 0} Tokens</span>
                  </div>
                </div>
              </div>

              {/* Champion */}
              <div className="flex flex-col items-center order-1 md:order-2 z-20 w-full md:w-[50%] max-w-[500px] animate-fadeIn" style={{ animationDelay: '0.6s' }}>
                <div className="relative w-full">
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-24 h-24 animate-bounce z-10">
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-yellow-400 drop-shadow-[0_0_25px_rgba(250,204,21,0.8)]">
                      <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="w-full aspect-video rounded-3xl border-[6px] border-yellow-400/80 overflow-hidden shadow-[0_0_60px_rgba(250,204,21,0.3)] relative group ring-8 ring-yellow-500/20">
                    <img src="https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1000" alt="Champion Squad Cover" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-yellow-900/60 via-yellow-900/10 to-transparent mix-blend-overlay" />
                    <div className="absolute bottom-5 left-0 right-0 text-center">
                      <span className="inline-block bg-yellow-950/80 backdrop-blur border border-yellow-500/50 text-white font-black px-6 py-2 rounded-xl text-2xl shadow-xl">
                        TBD
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-8 text-center bg-yellow-950/30 backdrop-blur-md border border-yellow-500/20 rounded-3xl p-6 w-full transform hover:scale-105 transition-transform">
                  <span className="text-yellow-400 font-black uppercase tracking-widest text-xl block mb-2 drop-shadow-md">Champion Squad</span>
                  <div className="inline-flex items-center gap-3 bg-yellow-500/10 border border-yellow-500/40 px-6 py-3 rounded-2xl mt-2 shadow-[0_0_20px_rgba(250,204,21,0.2)]">
                    <span className="text-3xl">🏆</span>
                    <span className="text-yellow-400 font-mono text-3xl font-black">{league.championPrize || 0} Tokens</span>
                  </div>
                </div>
              </div>

            </div>

            {/* Top 3 Players Section */}
            <div className="mt-auto pt-16 border-t border-white/5 animate-slideUp" style={{ animationDelay: '0.9s' }}>
              <div className="text-center mb-10">
                <h3 className="text-2xl font-black text-white uppercase tracking-wider flex items-center justify-center gap-3">
                  <Star className="w-6 h-6 text-cyan-400" />
                  Top Ranked Players
                  <Star className="w-6 h-6 text-cyan-400" />
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
                {/* Rank 2 */}
                <div className="bg-slate-900/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6 flex flex-col items-center text-center transform md:translate-y-6 hover:-translate-y-2 transition-all">
                  <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-slate-400 flex items-center justify-center mb-4 shadow-lg text-2xl">
                    🥈
                  </div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1">Rank 2</span>
                  <span className="text-white font-black text-lg mb-3">TBD</span>
                  <div className="mt-auto bg-slate-800/80 rounded-lg px-3 py-1.5 border border-slate-600/50 w-full">
                    <span className="text-slate-300 font-mono font-bold text-sm">🪙 {league.topRank2Prize || 0} Tokens</span>
                  </div>
                </div>

                {/* Rank 1 (MVP) */}
                <div className="bg-gradient-to-b from-cyan-950/80 to-blue-950/80 backdrop-blur border border-cyan-500/30 rounded-2xl p-8 flex flex-col items-center text-center shadow-[0_0_30px_rgba(6,182,212,0.15)] transform hover:-translate-y-2 transition-all relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">
                    MVP
                  </div>
                  <div className="w-20 h-20 rounded-full bg-yellow-900/50 border-2 border-yellow-400 flex items-center justify-center mb-4 shadow-[0_0_20px_rgba(250,204,21,0.3)] text-4xl">
                    👑
                  </div>
                  <span className="text-cyan-400 font-bold uppercase tracking-wider text-sm mb-1">Rank 1</span>
                  <span className="text-white font-black text-xl mb-4">TBD</span>
                  <div className="mt-auto bg-cyan-500/10 rounded-xl px-4 py-2 border border-cyan-500/30 w-full">
                    <span className="text-cyan-400 font-mono font-black text-lg">🪙 {league.topRank1Prize || 0} Tokens</span>
                  </div>
                </div>

                {/* Rank 3 */}
                <div className="bg-slate-900/60 backdrop-blur border border-slate-700/50 rounded-2xl p-6 flex flex-col items-center text-center transform md:translate-y-6 hover:-translate-y-2 transition-all">
                  <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-orange-700/50 flex items-center justify-center mb-4 shadow-lg text-2xl">
                    🥉
                  </div>
                  <span className="text-slate-400 font-bold uppercase tracking-wider text-xs mb-1">Rank 3</span>
                  <span className="text-white font-black text-lg mb-3">TBD</span>
                  <div className="mt-auto bg-slate-800/80 rounded-lg px-3 py-1.5 border border-slate-600/50 w-full">
                    <span className="text-slate-300 font-mono font-bold text-sm">🪙 {league.topRank3Prize || 0} Tokens</span>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
`;

content = content.replace('{/* Match Chat Modal */}', modalCode + '\n      {/* Match Chat Modal */}');

fs.writeFileSync('src/components/LeagueScheduleView.tsx', content);
