const fs = require('fs');
let content = fs.readFileSync('src/components/LeagueScheduleView.tsx', 'utf8');

const modalStart = '{showHallOfGloryModal && (';
const modalEnd = '      {/* Match Chat Modal */}';

const startIndex = content.lastIndexOf(modalStart);
const endIndex = content.lastIndexOf(modalEnd);

if (startIndex !== -1 && endIndex !== -1) {
  const newModal = `      {showHallOfGloryModal && (
        <div className="fixed inset-0 z-[200] h-screen w-screen bg-black overflow-hidden flex flex-col select-none">
          {/* Dark Background */}
          <div className="absolute inset-0 bg-black" />
          
          {/* Animated Bangladeshi Jungle & Floral Background + Fireworks */}
          <div className="absolute inset-0 pointer-events-none opacity-40 bg-[url('https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=2000')] bg-cover bg-center animate-pulse duration-[8s]" />
          <div className="absolute inset-0 pointer-events-none opacity-40 bg-[url('https://i.gifer.com/4xP.gif')] bg-cover bg-center mix-blend-screen" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black via-black/70 to-black/90" />
          
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

          {/* Main Full-Screen Container */}
          <div className="relative z-10 flex flex-col h-full w-full max-w-7xl mx-auto px-2 py-4 md:px-4 md:py-8 justify-between">
            
            {/* Header */}
            <div className="text-center shrink-0 space-y-1 animate-slideDown">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full mb-1 backdrop-blur-md">
                <Trophy className="w-4 h-4 text-yellow-400 animate-bounce" />
                <span className="text-[10px] font-mono font-black text-yellow-400 uppercase tracking-widest">Vortex Official Hall of Glory</span>
              </div>
              <h2 className="text-2xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-300 uppercase tracking-tighter drop-shadow-2xl">
                {league.leagueName || 'Champion Celebration'}
              </h2>
              
              {/* Sponsor Information - Bigger as requested */}
              {(league.sponsorName || league.sponsorLogoUrl) && (
                <div className="mt-3 inline-flex flex-col items-center justify-center p-3 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
                  <span className="text-[10px] text-slate-400 uppercase tracking-widest font-black mb-1">Sponsored By</span>
                  <div className="flex items-center gap-3">
                    {league.sponsorLogoUrl && (
                      <img src={league.sponsorLogoUrl} alt="Sponsor" className="h-10 w-auto object-contain rounded drop-shadow-md" />
                    )}
                    {league.sponsorName && (
                      <span className="text-lg md:text-xl font-black text-white uppercase tracking-wider">{league.sponsorName}</span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Middle Section: Champion & Runner Up Cover Photos (Glassmorphism, 70% width) */}
            <div className="flex flex-row items-center justify-center gap-4 md:gap-10 my-auto shrink-0 w-full">
              
              {/* Runner Up Squad */}
              <div className="flex flex-col items-center w-1/2 max-w-[400px] animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                <div className="w-[70%] aspect-video rounded-xl md:rounded-2xl border border-white/20 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.3)] relative group bg-white/10 backdrop-blur-xl">
                  <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800" alt="Runner Up Squad Cover" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700 mix-blend-luminosity group-hover:mix-blend-normal" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute bottom-2 left-0 right-0 text-center">
                    <span className="inline-block bg-black/60 backdrop-blur-md border border-white/10 text-slate-200 font-black px-2 py-0.5 rounded text-[10px] md:text-xs shadow">
                      Runner Up: TBD
                    </span>
                  </div>
                </div>
                <div className="mt-2 text-center bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg px-2 py-1 md:px-4 md:py-1.5 inline-flex flex-col md:flex-row items-center gap-1 md:gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
                  <span className="text-[9px] md:text-xs text-slate-300 uppercase font-bold">Prize:</span>
                  <span className="text-white font-mono text-[10px] md:text-xs font-bold">🪙 {league.runnerUpPrize || 0}</span>
                </div>
              </div>

              {/* Champion Squad */}
              <div className="flex flex-col items-center w-1/2 max-w-[400px] z-20 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
                <div className="relative w-[70%]">
                  <div className="absolute -top-5 left-1/2 -translate-x-1/2 w-8 h-8 md:w-12 md:h-12 animate-bounce z-10">
                    <svg viewBox="0 0 24 24" fill="none" className="w-full h-full text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]">
                      <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="currentColor"/>
                    </svg>
                  </div>
                  <div className="w-full aspect-video rounded-xl md:rounded-2xl border border-yellow-400/50 overflow-hidden shadow-[0_8px_32px_rgba(250,204,21,0.2)] relative group bg-white/10 backdrop-blur-xl">
                    <img src="https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1000" alt="Champion Squad Cover" className="w-full h-full object-cover opacity-90 group-hover:opacity-100 group-hover:scale-105 transition-all duration-700" />
                    <div className="absolute inset-0 bg-gradient-to-t from-yellow-900/80 via-transparent to-transparent mix-blend-overlay" />
                    <div className="absolute bottom-2 left-0 right-0 text-center">
                      <span className="inline-block bg-black/60 backdrop-blur-md border border-yellow-500/30 text-yellow-300 font-black px-2 py-0.5 rounded text-[10px] md:text-xs shadow">
                        Champion: TBD
                      </span>
                    </div>
                  </div>
                </div>
                <div className="mt-2 text-center bg-white/10 backdrop-blur-xl border border-yellow-500/30 rounded-lg px-2 py-1 md:px-4 md:py-1.5 inline-flex flex-col md:flex-row items-center gap-1 md:gap-2 shadow-[0_4px_20px_rgba(250,204,21,0.15)]">
                  <span className="text-[9px] md:text-xs text-yellow-400 uppercase font-bold">Prize:</span>
                  <span className="text-yellow-300 font-mono text-[10px] md:text-xs font-black">🏆 {league.championPrize || 0}</span>
                </div>
              </div>

            </div>

            {/* Bottom Section: Top 3 Ranked Players horizontally (flex-row to fit all 3 always) */}
            <div className="shrink-0 pt-3 border-t border-white/10 animate-slideUp" style={{ animationDelay: '0.6s' }}>
              <div className="text-center mb-2">
                <h4 className="text-[9px] md:text-xs font-mono font-black text-cyan-400 uppercase tracking-widest flex items-center justify-center gap-1 md:gap-2">
                  <Star className="w-3 h-3 text-cyan-400" />
                  Top 3 Ranked Players
                  <Star className="w-3 h-3 text-cyan-400" />
                </h4>
              </div>

              <div className="flex flex-row justify-center items-stretch gap-2 max-w-3xl mx-auto w-full">
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
              </div>
            </div>

          </div>
        </div>
      )}
`;

  // Remove any duplicate modals and insert only one
  let prefix = content.substring(0, startIndex);
  
  // Find the exact line of Match Chat Modal
  const matchChatIndex = content.indexOf(modalEnd, startIndex);
  if (matchChatIndex !== -1) {
    const newContent = prefix + newModal + '\n' + content.substring(matchChatIndex);
    fs.writeFileSync('src/components/LeagueScheduleView.tsx', newContent);
    console.log("Modal updated successfully!");
  } else {
    console.log("Could not find match chat modal marker");
  }
} else {
  console.log("Could not find start or end index", startIndex, endIndex);
}
