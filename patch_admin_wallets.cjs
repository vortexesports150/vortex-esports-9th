const fs = require('fs');
let content = fs.readFileSync('src/components/ProLeagueAdmin.tsx', 'utf8');

// Change activeTab type
content = content.replace(
  `const [activeTab, setActiveTab] = useState<'leagues' | 'wallets'>('leagues');`,
  `const [activeTab, setActiveTab] = useState<'leagues' | 'wallets' | 'league_wallets'>('leagues');`
);

// We need an unlock function for League Wallets
const newFunc = `
  const handleUnlockLeagueWallet = async (leagueId: string) => {
    if (!window.confirm("Unlock this League Wallet? This allows the host to withdraw funds.")) return;
    setProcessing(leagueId);
    try {
      await updateDoc(doc(db, 'pro_hosted_leagues', leagueId), { walletStatus: 'active' });
      alert("League Wallet unlocked successfully.");
      fetchLeagues();
    } catch (e) {
      console.error(e);
      alert("Failed to unlock");
    } finally {
      setProcessing(null);
    }
  };
`;
content = content.replace(`useEffect(() => {`, newFunc + `\n  useEffect(() => {`);

// Add League Wallets to the Tab Switcher
const tabSwitcherOld = `          <button
            onClick={() => setActiveTab('wallets')}
            className={\`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors \${activeTab === 'wallets' ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'}\`}
          >
            Host Wallets
          </button>`;
const tabSwitcherNew = `          <button
            onClick={() => setActiveTab('wallets')}
            className={\`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors \${activeTab === 'wallets' ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'}\`}
          >
            Host Wallets
          </button>
          <button
            onClick={() => { setActiveTab('league_wallets'); setCurrentPage(1); }}
            className={\`flex-1 py-3 text-sm font-bold uppercase tracking-wider transition-colors \${activeTab === 'league_wallets' ? 'bg-cyan-500/20 text-cyan-400 border-b-2 border-cyan-400' : 'text-slate-400 hover:text-white'}\`}
          >
            League Wallets
          </button>`;
if(content.includes(tabSwitcherOld)) {
  content = content.replace(tabSwitcherOld, tabSwitcherNew);
} else {
  console.log("Failed to find tab switcher");
}

// Add the League Wallets view
const viewMarker = `{activeTab === 'wallets' && (`;
const leagueWalletsView = `      {activeTab === 'league_wallets' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedItems.map((league) => (
              <div key={league.id} className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 relative flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-white text-lg">{league.leagueName}</h3>
                    <p className="text-xs text-slate-400">Host: {league.hostName}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">ID: {league.leagueNumber || league.id}</p>
                  </div>
                  {league.walletStatus === 'locked' && (
                    <div className="p-2 bg-red-500/10 rounded-full" title="Locked">
                      <Lock className="w-5 h-5 text-red-400" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1">
                  <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/50">
                    <div className="text-xs text-slate-400 mb-1 font-bold uppercase tracking-widest">Available Balance</div>
                    <div className="text-3xl font-black text-white font-mono">{league.walletBalance || 0}</div>
                    <div className="text-[10px] text-slate-500 uppercase">Tokens</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700 flex gap-2">
                  <button
                    onClick={() => handleUnlockLeagueWallet(league.id)}
                    disabled={league.walletStatus !== 'locked' || processing === league.id}
                    className={\`flex-1 py-2 rounded-xl text-xs font-bold uppercase flex items-center justify-center gap-2 transition-colors \${league.walletStatus === 'locked' ? 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}\`}
                  >
                    <Unlock className="w-4 h-4" />
                    {processing === league.id ? 'Processing...' : league.walletStatus === 'locked' ? 'Unlock Wallet' : 'Unlocked'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-bold uppercase"
              >
                Previous
              </button>
              <span className="text-slate-400 text-sm font-mono">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg transition-colors text-sm font-bold uppercase"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
      `;

// We also need to fix paginatedItems logic to use leagues when activeTab is league_wallets
const paginatedItemsOld = `  const currentData = activeTab === 'leagues' ? filteredLeagues : hostWallets;
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const paginatedItems = currentData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);`;

const paginatedItemsNew = `  const currentData = activeTab === 'leagues' ? filteredLeagues : (activeTab === 'league_wallets' ? leagues : hostWallets);
  const totalPages = Math.ceil(currentData.length / itemsPerPage);
  const paginatedItems = currentData.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);`;

if(content.includes(paginatedItemsOld)) {
  content = content.replace(paginatedItemsOld, paginatedItemsNew);
} else {
  console.log("Failed to find paginated items");
}

if(content.includes(viewMarker)) {
  content = content.replace(viewMarker, leagueWalletsView + viewMarker);
} else {
  console.log("Failed to find view marker");
}

fs.writeFileSync('src/components/ProLeagueAdmin.tsx', content);
console.log("Admin patch complete");
