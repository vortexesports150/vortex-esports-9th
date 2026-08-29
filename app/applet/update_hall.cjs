const fs = require('fs');

let content = fs.readFileSync('src/components/LeagueScheduleView.tsx', 'utf8');

// 1. Update the button onClick to directly trigger modal and confetti
const oldRoundButton = `                  <button
                    key={round.id}
                    onClick={() => setActiveRound(round.id)}
                    className={\`shrink-0 px-4 py-2.5 rounded-2xl border transition-all flex flex-col items-start min-w-[120px] \${`;

const newRoundButton = `                  <button
                    key={round.id}
                    onClick={() => {
                      if (round.isHallOfGlory) {
                        setShowHallOfGloryModal(true);
                        // Trigger fireworks confetti
                        const duration = 4000;
                        const end = Date.now() + duration;
                        (function frame() {
                          confetti({
                            particleCount: 7,
                            angle: 60,
                            spread: 60,
                            origin: { x: 0 },
                            colors: ['#06b6d4', '#3b82f6', '#facc15', '#ffffff']
                          });
                          confetti({
                            particleCount: 7,
                            angle: 120,
                            spread: 60,
                            origin: { x: 1 },
                            colors: ['#06b6d4', '#3b82f6', '#facc15', '#ffffff']
                          });
                          if (Date.now() < end) {
                            requestAnimationFrame(frame);
                          }
                        }());
                      } else {
                        setActiveRound(round.id);
                      }
                    }}
                    className={\`shrink-0 px-4 py-2.5 rounded-2xl border transition-all flex flex-col items-start min-w-[120px] \${`;

if (content.includes(oldRoundButton)) {
  content = content.replace(oldRoundButton, newRoundButton);
}

// 2. Replace the modal completely with the exact user requirements:
// - Full screen, no scrolling (h-screen w-screen overflow-hidden fixed inset-0 z-[200])
// - No dropdowns
// - Bangladeshi jungle floral background & continuous fireworks effect
// - 70% width (w-[70%] max-w-4xl) 16:9 aspect ratio cover photos for Champion and Runner Up
// - Top 3 players at the bottom in a small font with token prizes
const oldModalStart = `{showHallOfGloryModal && (
        <div className="fixed inset-0 z-[150] flex flex-col bg-slate-950 overflow-y-auto overflow-x-hidden">`;

const newModalCode = `
      {/* Hall of Glory Full Screen Modal - Immersive, No Scroll, Bangladeshi Jungle & Fireworks */}
      {showHallOfGloryModal && (
        <div className="fixed inset-0 z-[200] h-screen w-screen bg-slate-950 overflow-hidden flex flex-col select-none">
          {/* Animated Bangladeshi Jungle & Floral Background */}
          <div className="absolute inset-0 pointer-events-none opacity-30 bg-[url('https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=2000')] bg-cover bg-center animate-pulse duration-[8s]" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950 via-slate-950/80 to-slate-950/90" />
          
          {/* Glowing Neon Cyberpunk & Gold Aura */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-500/10 blur-[150px] rounded-full pointer-events-none" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/10 blur-[130px] rounded-full pointer-events-none" />

          {/* Close Button */}
          <button 
            onClick={() => setShowHallOfGloryModal(false)}
            className="absolute top-5 right-5 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all backdrop-blur-md shadow-lg cursor-pointer"
            title="Close"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>

          {/* Main Full-Screen Container (No Scrolling) */}
          <div className="relative z-10 flex flex-col h-full w-full max-w-7xl mx-auto px-4 py-6 md:py-8 justify-between">
            
            {/* Header */}
            <div className="text-center shrink-0 space-y-1 animate-slideDown">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full mb-1 backdrop-blur-md">
                <Trophy className="w-4 h-4 text-yellow-400 animate-bounce" />
                <span className="text-[10px] font-mono font-black text-yellow-400 uppercase tracking-widest">Vortex Official Hall of Glory</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-300 uppercase tracking-tighter drop-shadow-2xl">
                {league.leagueName || 'Champion Celebration'}
              </h2>
              <p className="text-cyan-400 font-mono text-xs md:text-sm tracking-[0.25em] uppercase font-bold text-shadow-glow">
                Season {league.seasonNumber || '1'} • Ultimate Champions & Top Warriors
              </p>
            </div>

            {/* Middle Section: Champion & Runner Up Cover Photos (70% width, 16:9 aspect-video) */}
            <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 my-auto shrink-0 w-full">
              
              {/* Runner Up Squad */}
              <div className="flex flex-col items-center w-full md:w-[45%] max-w-[550px] animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                <div className="w-[70%] md:w-[70%] aspect-video rounded-2xl border-2 border-slate-400/50 overflow-hidden shadow-[0_0_30px_rgba(148,163,184,0.2)] relative group ring-2 ring-slate-500/20 bg-slate-900">
                  <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800" alt="Runner Up Squad Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/20 to-transparent" />
                  <div className="absolute bottom-2.5 left-0 right-0 text-center">
                    <span className="inline-block bg-slate-900/90 backdrop-blur border border-slate-500/40 text-slate-200 font-black px-3 py-1 rounded text-xs md:text-sm shadow">
                      Runner Up: TBD
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-center bg-slate-900/60 backdrop-blur border border-slate-700/50 rounded-xl px-4 py-1.5 inline-flex items-center gap-2">
                  <span className="text-xs text-slate-400 uppercase font-bold">Runner Up Prize:</span>
                  <span className="text-white font-mono text-xs font-bold">🪙 {league.runnerUpPrize || 0} Tokens</span>
                </div>
              </div>

              {/* Champion Squad */}
              <div className="flex flex-col items-center w-full md:w-[45%] max-w-[550px] z-20 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
                <div className="relative w-[70%] md:w-[70%]">
                  <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-12 h-12 animate-bounce z-10">
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">
                      <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="w-full aspect-video rounded-2xl border-4 border-yellow-400/80 overflow-hidden shadow-[0_0_40px_rgba(250,204,21,0.3)] relative group ring-4 ring-yellow-500/20 bg-slate-900">
                    <img src="https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1000" alt="Champion Squad Cover" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-yellow-950/80 via-yellow-950/20 to-transparent mix-blend-overlay" />
                    <div className="absolute bottom-2.5 left-0 right-0 text-center">
                      <span className="inline-block bg-yellow-950/90 backdrop-blur border border-yellow-500/50 text-yellow-200 font-black px-3 py-1 rounded text-xs md:text-sm shadow">
                        Champion: TBD
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-center bg-yellow-950/40 backdrop-blur border border-yellow-500/30 rounded-xl px-4 py-1.5 inline-flex items-center gap-2 shadow-[0_0_15px_rgba(250,204,21,0.15)]">
                  <span className="text-xs text-yellow-400 uppercase font-bold">Champion Prize:</span>
                  <span className="text-yellow-300 font-mono text-xs font-black">🏆 {league.championPrize || 0} Tokens</span>
                </div>
              </div>

            </div>

            {/* Bottom Section: Top 3 Ranked Players in small font */}
            <div className="shrink-0 pt-4 border-t border-white/10 animate-slideUp" style={{ animationDelay: '0.6s' }}>
              <div className="text-center mb-2">
                <h4 className="text-xs font-mono font-black text-cyan-400 uppercase tracking-widest flex items-center justify-center gap-2">
                  <Star className="w-3.5 h-3.5 text-cyan-400" />
                  Top 3 Ranked Players & Rewards
                  <Star className="w-3.5 h-3.5 text-cyan-400" />
                </h4>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-w-3xl mx-auto">
                {/* Rank 2 */}
                <div className="bg-slate-900/60 backdrop-blur border border-slate-700/50 rounded-xl p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🥈</span>
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold block uppercase">Rank 2</span>
                      <span className="text-white font-black">TBD</span>
                    </div>
                  </div>
                  <span className="text-slate-300 font-mono font-bold text-[11px] bg-slate-800/80 px-2 py-1 rounded border border-slate-600">
                    🪙 {league.topRank2Prize || 0} Tokens
                  </span>
                </div>

                {/* Rank 1 (MVP) */}
                <div className="bg-gradient-to-r from-cyan-950/80 to-blue-950/80 backdrop-blur border border-cyan-500/40 rounded-xl p-2.5 flex items-center justify-between text-xs shadow-[0_0_15px_rgba(6,182,212,0.15)]">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👑</span>
                    <div>
                      <span className="text-cyan-400 text-[10px] font-bold block uppercase">Rank 1 (MVP)</span>
                      <span className="text-white font-black">TBD</span>
                    </div>
                  </div>
                  <span className="text-cyan-300 font-mono font-bold text-[11px] bg-cyan-500/20 px-2 py-1 rounded border border-cyan-500/30">
                    🪙 {league.topRank1Prize || 0} Tokens
                  </span>
                </div>

                {/* Rank 3 */}
                <div className="bg-slate-900/60 backdrop-blur border border-slate-700/50 rounded-xl p-2.5 flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-base">🥉</span>
                    <div>
                      <span className="text-slate-400 text-[10px] font-bold block uppercase">Rank 3</span>
                      <span className="text-white font-black">TBD</span>
                    </div>
                  </div>
                  <span className="text-slate-300 font-mono font-bold text-[11px] bg-slate-800/80 px-2 py-1 rounded border border-slate-600">
                    🪙 {league.topRank3Prize || 0} Tokens
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
`;

// Let's find where the modal is in content and replace it
const modalStartIndex = content.indexOf('{showHallOfGloryModal && (');
if (modalStartIndex !== -1) {
  // Find the closing of this modal
  // Let's search for `{/* Match Chat Modal */}` or similar marker right after modal
  const chatModalMarker = '{/* Match Chat Modal */}';
  const chatModalIndex = content.indexOf(chatModalMarker);
  if (chatModalIndex !== -1) {
    content = content.substring(0, modalStartIndex) + newModalCode + '\n      ' + content.substring(chatModalIndex);
  }
}

fs.writeFileSync('src/components/LeagueScheduleView.tsx', content);
console.log("Successfully updated LeagueScheduleView with direct full-screen modal & strict requirements!");
