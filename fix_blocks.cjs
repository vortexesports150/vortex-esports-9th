const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  "{adminSubTab === 'upcoming_tourneys' &&</span>",
  `{adminSubTab === 'upcoming_tourneys' && (
                          <div className="relative z-10 w-full space-y-4 text-left">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-purple-500/15 pb-3.5 gap-2">
                              <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                  <Clock className="h-4 w-4 text-purple-400" />
                                  <span>Upcoming Match Setup</span>`
);

code = code.replace(
  "{adminSubTab === 'ongoing' &&</span>",
  `{adminSubTab === 'ongoing' && (
                          <div className="relative z-10 w-full space-y-4 text-left">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center border-b border-purple-500/15 pb-3.5 gap-2">
                              <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                  <Trophy className="h-4 w-4 text-purple-400" />
                                  <span>Ongoing Match</span>`
);

code = code.replace(
  "{adminSubTab === 'history' &&</span>",
  `{adminSubTab === 'history' && (
                          <div className="relative z-10 w-full space-y-4 text-left">
                            <div className="flex items-center justify-between border-b border-purple-500/15 pb-3.5 gap-2">
                              <div>
                                <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                                  <History className="h-4 w-4 text-purple-400" />
                                  <span>Match History</span>`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Done");
