const fs = require('fs');

let content = fs.readFileSync('src/components/LeagueScheduleView.tsx', 'utf8');

// 1. Add import confetti from 'canvas-confetti';
if (!content.includes("import confetti from 'canvas-confetti';")) {
  content = content.replace(
    "import React, { useState, useEffect } from 'react';",
    "import React, { useState, useEffect } from 'react';\nimport confetti from 'canvas-confetti';"
  );
}

// 2. Add showHallOfGloryModal state
if (!content.includes("const [showHallOfGloryModal, setShowHallOfGloryModal] = useState(false);")) {
  content = content.replace(
    "const [isSavingMatch, setIsSavingMatch] = useState(false);",
    "const [isSavingMatch, setIsSavingMatch] = useState(false);\n  const [showHallOfGloryModal, setShowHallOfGloryModal] = useState(false);"
  );
}

// 3. Fix the broken block around 1740:
const corruptedBlockRegex = /\{getRoundsList\(\)\.find\(r => r\.id === activeRound\)\?\.isHallOfGlory \? \([\s\S]*?\) : activeRound === 1 \? \(/;

const newHallOfGloryPreview = `{getRoundsList().find(r => r.id === activeRound)?.isHallOfGlory ? (
                <div className="relative w-full overflow-hidden rounded-3xl bg-slate-950 border border-yellow-500/30 p-6 md:p-12 min-h-[400px] flex flex-col items-center justify-center text-center">
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
                  <div className="relative z-10">
                    <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-yellow-200 uppercase tracking-tighter drop-shadow-lg mb-2">
                      Grand Final Results
                    </h2>
                    <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
                      Witness the ultimate champions and top players of the league. Step into the Hall of Glory to celebrate the victory!
                    </p>
                    <button 
                      onClick={() => {
                        setShowHallOfGloryModal(true);
                        // Trigger initial confetti
                        const duration = 3000;
                        const end = Date.now() + duration;
                        (function frame() {
                          confetti({
                            particleCount: 5,
                            angle: 60,
                            spread: 55,
                            origin: { x: 0 },
                            colors: ['#06b6d4', '#3b82f6', '#facc15']
                          });
                          confetti({
                            particleCount: 5,
                            angle: 120,
                            spread: 55,
                            origin: { x: 1 },
                            colors: ['#06b6d4', '#3b82f6', '#facc15']
                          });
                          if (Date.now() < end) {
                            requestAnimationFrame(frame);
                          }
                        }());
                      }}
                      className="px-8 py-4 rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:scale-105"
                    >
                      Enter Hall of Glory
                    </button>
                  </div>
                </div>
              ) : activeRound === 1 ? (`;

content = content.replace(corruptedBlockRegex, newHallOfGloryPreview);

fs.writeFileSync('src/components/LeagueScheduleView.tsx', content);
