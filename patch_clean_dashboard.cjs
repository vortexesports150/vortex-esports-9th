const fs = require('fs');
let code = fs.readFileSync('src/components/ProHostPanel.tsx', 'utf8');

const newDashboardView = `function DashboardView({ leagues, loading, onGenerate, onSelectLeague }: any) {
  const totalLeagues = leagues.length;
  const approvedLeagues = leagues.filter((l: any) => l.status === 'approved' || l.status === 'ongoing' || l.status === 'completed').length;

  return (
    <div className="p-4 sm:p-6 bg-slate-900/50 rounded-2xl border border-white/5 space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-violet-400" />
          Pro Host Panel
        </h2>
        <div className="flex gap-2">
          <a href="https://fb.com/vortexesports150" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-medium transition-colors">
            Support
          </a>
          <button
            onClick={onGenerate}
            className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Generate
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-800/80 border border-white/5 rounded-xl p-4">
           <div className="text-xs text-slate-400 uppercase font-bold mb-1">Total Leagues</div>
           <div className="text-2xl font-black text-white">{totalLeagues}</div>
        </div>
        <div className="bg-slate-800/80 border border-white/5 rounded-xl p-4">
           <div className="text-xs text-slate-400 uppercase font-bold mb-1">Approved</div>
           <div className="text-2xl font-black text-green-400">{approvedLeagues}</div>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-400">Loading your leagues...</div>
      ) : leagues.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-white/5">
          <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Leagues Generated</h3>
          <p className="text-slate-400 max-w-md mx-auto">
            You haven't hosted any leagues yet. Generate your first league to start your journey as a Pro Host!
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {leagues.map((league: any) => (
            <div key={league.id} className="p-4 rounded-xl border border-white/10 bg-slate-800/50 flex flex-col gap-3">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-bold text-white text-lg">{league.leagueName}</h4>
                  <p className="text-xs text-slate-400">{league.brandName} - Season {league.seasonNumber}</p>
                </div>
                <span className={\`px-2 py-1 rounded text-xs font-bold uppercase \${
                  league.status === 'approved' ? 'bg-green-500/20 text-green-400' :
                  league.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                  league.status === 'rejected' ? 'bg-red-500/20 text-red-400' :
                  'bg-slate-500/20 text-slate-400'
                }\`}>
                  {league.status}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">Squads: <span className="text-white font-medium">{league.squadSize}</span></span>
                <span className="text-slate-400">Prize Pool: <span className="text-violet-400 font-medium">{league.prizePool}</span></span>
              </div>
              <button 
                onClick={() => onSelectLeague(league.id)}
                className="mt-2 w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Manage League
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}`;

code = code.replace(/function DashboardView\(\{ leagues, loading, onGenerate, onSelectLeague \}: any\) \{[\s\S]*\}\);[\n\r]*\}/, newDashboardView);

fs.writeFileSync('src/components/ProHostPanel.tsx', code);
