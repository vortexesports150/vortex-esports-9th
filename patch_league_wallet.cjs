const fs = require('fs');
let content = fs.readFileSync('src/components/ProHostPanel.tsx', 'utf8');

// The ending
const modalStr = `      {showWalletModalLeague && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-[#04060e]/90 backdrop-blur-sm" onClick={() => setShowWalletModalLeague(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-slate-900 border border-slate-700 w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(6,182,212,0.15)]"
          >
            <div className="flex justify-between items-center p-4 border-b border-white/5 bg-slate-800/50">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-cyan-400" />
                  LEAGUE WALLET
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-1">ID: {showWalletModalLeague.leagueNumber || showWalletModalLeague.id}</p>
              </div>
              <button onClick={() => setShowWalletModalLeague(null)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700 rounded-2xl p-6 text-center shadow-lg relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 p-4">
                  <div className={\`px-2 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 \${showWalletModalLeague.walletStatus === 'locked' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}\`}>
                    {showWalletModalLeague.walletStatus === 'locked' ? <AlertCircle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    {showWalletModalLeague.walletStatus === 'locked' ? 'LOCKED' : 'UNLOCKED'}
                  </div>
                </div>
                
                <h4 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Available Balance</h4>
                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 font-mono drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  {showWalletModalLeague.walletBalance || 0}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-widest">Vortex Tokens</div>

                <div className="mt-6">
                  <button
                    onClick={() => {
                      handleTransferFromLeagueWallet(showWalletModalLeague);
                    }}
                    disabled={!!transferring || showWalletModalLeague.walletStatus === 'locked' || (showWalletModalLeague.walletBalance || 0) <= 0}
                    className={\`px-6 py-3 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 mx-auto \${showWalletModalLeague.walletStatus === 'locked' ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:scale-105 cursor-pointer'}\`}
                  >
                    {transferring === showWalletModalLeague.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {transferring === showWalletModalLeague.id ? 'Transferring...' : 'Transfer to Main Wallet'}
                  </button>
                  {showWalletModalLeague.walletStatus === 'locked' && (
                    <p className="text-xs text-red-400/80 mt-3 font-medium">This wallet is locked by Admin. Wait for unlock.</p>
                  )}
                </div>
              </div>

              <div className="bg-[#090d22] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 bg-slate-800/30">
                  <h4 className="font-bold text-white text-sm">Transaction History</h4>
                </div>
                <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
                  {isLoadingWallet ? (
                    <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin mb-2" />
                      Loading history...
                    </div>
                  ) : walletHistory.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      No transactions found for this league wallet.
                    </div>
                  ) : (
                    walletHistory.map(tx => (
                      <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={\`w-10 h-10 rounded-xl flex items-center justify-center \${tx.type === 'income' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}\`}>
                            {tx.type === 'income' ? <Plus className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{tx.description}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{tx.userName || tx.userEmail || 'System'}</span>
                              <span className="w-1 h-1 bg-slate-600 rounded-full" />
                              <span>{tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString() : 'Just now'}</span>
                            </div>
                          </div>
                        </div>
                        <div className={\`text-right font-mono font-black \${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}\`}>
                          {tx.type === 'income' ? '+' : '-'}{tx.amount}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}`;

const ending = `    </div>
  );
};`;

if (!content.includes('LEAGUE WALLET')) {
  const matchIdx = content.lastIndexOf(ending);
  if (matchIdx !== -1) {
    content = content.substring(0, matchIdx) + modalStr + '\n' + ending;
  }
}

// And replace the menu button with regex
content = content.replace(/\{league\.walletBalance > 0 && \([\s\S]*?Transfer to Main'\}\n\s*<\/button>\n\s*\)\}/g, 
`                              <button
                                onClick={() => {
                                  setShowWalletModalLeague(league);
                                  setOpenLeagueMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-white/5 text-slate-300 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                                View League Wallet
                              </button>`);

fs.writeFileSync('src/components/ProHostPanel.tsx', content);
console.log("Success");
