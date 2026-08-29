const fs = require('fs');
let content = fs.readFileSync('src/components/ProLeagueAdmin.tsx', 'utf8');

// 1. Change activeTab type
content = content.replace(
  `const [activeTab, setActiveTab] = useState<'leagues' | 'wallets'>('leagues');`,
  `const [activeTab, setActiveTab] = useState<'leagues' | 'wallets' | 'league_wallets'>('leagues');`
);

// 2. Add League Wallets pagination states
const statesBlock = `  const [leagueWalletsPage, setLeagueWalletsPage] = useState(1);
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
  };`;

if(!content.includes('leagueWalletsPage')) {
  content = content.replace(`const [currentPage, setCurrentPage] = useState(1);`, statesBlock + `\n  const [currentPage, setCurrentPage] = useState(1);`);
}

// 3. Tab Switcher
const tabSwitcherOld = `          <button
            onClick={() => setActiveTab('wallets')}
            className={\`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all \${
              activeTab === 'wallets'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }\`}
          >
            Host Wallets
          </button>`;

const tabSwitcherNew = `          <button
            onClick={() => setActiveTab('wallets')}
            className={\`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all \${
              activeTab === 'wallets'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }\`}
          >
            Host Wallets
          </button>
          <button
            onClick={() => setActiveTab('league_wallets')}
            className={\`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all \${
              activeTab === 'league_wallets'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }\`}
          >
            League Wallets
          </button>`;

if (content.includes(tabSwitcherOld)) {
  content = content.replace(tabSwitcherOld, tabSwitcherNew);
} else {
  console.log("Failed to patch tab switcher");
}

// 4. Content Block
const viewMarker = `{/* Full Screen Schedule Modal */}`;
const leagueWalletsView = `
      {activeTab === 'league_wallets' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leagues.slice((leagueWalletsPage - 1) * itemsPerPage, leagueWalletsPage * itemsPerPage).map((league) => (
              <div key={league.id} className="bg-slate-800/50 rounded-2xl p-6 border border-slate-700 relative flex flex-col hover:border-cyan-500/30 transition-all">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="font-bold text-white text-lg line-clamp-1">{league.leagueName}</h3>
                    <p className="text-xs text-slate-400 mt-1 flex items-center gap-1"><Shield className="w-3 h-3"/> {league.hostName}</p>
                    <p className="text-[10px] text-slate-500 font-mono mt-1">ID: {league.leagueNumber || league.id}</p>
                  </div>
                  {league.walletStatus === 'locked' && (
                    <div className="p-2 bg-red-500/10 rounded-full shrink-0 border border-red-500/20" title="Locked">
                      <Lock className="w-5 h-5 text-red-400" />
                    </div>
                  )}
                  {league.walletStatus !== 'locked' && (
                    <div className="p-2 bg-green-500/10 rounded-full shrink-0 border border-green-500/20" title="Unlocked">
                      <Unlock className="w-5 h-5 text-green-400" />
                    </div>
                  )}
                </div>
                
                <div className="flex-1 my-2">
                  <div className="bg-slate-900/80 rounded-xl p-4 border border-slate-700/50 flex flex-col items-center justify-center text-center">
                    <div className="text-[10px] text-slate-400 mb-1 font-bold uppercase tracking-widest flex items-center gap-1"><Wallet className="w-3 h-3"/> Wallet Balance</div>
                    <div className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-mono drop-shadow-md">
                      {league.walletBalance || 0}
                    </div>
                    <div className="text-[9px] text-slate-500 uppercase tracking-widest mt-1">Tokens</div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-slate-700/50 flex gap-2">
                  <button
                    onClick={() => handleUnlockLeagueWallet(league.id)}
                    disabled={league.walletStatus !== 'locked' || processing === league.id}
                    className={\`flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer \${league.walletStatus === 'locked' ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg hover:shadow-cyan-500/25 border border-cyan-400/50' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}\`}
                  >
                    {processing === league.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Unlock className="w-4 h-4" />}
                    {processing === league.id ? 'Processing...' : league.walletStatus === 'locked' ? 'Unlock Wallet' : 'Unlocked'}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {Math.ceil(leagues.length / itemsPerPage) > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8 bg-slate-900/50 p-2 rounded-xl border border-white/5 w-fit mx-auto">
              <button
                onClick={() => setLeagueWalletsPage(p => Math.max(1, p - 1))}
                disabled={leagueWalletsPage === 1}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg transition-colors text-xs font-bold uppercase cursor-pointer"
              >
                Previous
              </button>
              <span className="text-slate-400 text-xs font-mono font-bold">
                Page {leagueWalletsPage} of {Math.ceil(leagues.length / itemsPerPage)}
              </span>
              <button
                onClick={() => setLeagueWalletsPage(p => Math.min(Math.ceil(leagues.length / itemsPerPage), p + 1))}
                disabled={leagueWalletsPage === Math.ceil(leagues.length / itemsPerPage)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg transition-colors text-xs font-bold uppercase cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}`;

if (content.includes(viewMarker)) {
  content = content.replace(viewMarker, leagueWalletsView + '\n\n      ' + viewMarker);
} else {
  console.log("Failed to patch content block");
}

fs.writeFileSync('src/components/ProLeagueAdmin.tsx', content);
console.log("Admin League Wallets successfully patched");
