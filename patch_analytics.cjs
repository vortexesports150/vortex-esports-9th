const fs = require('fs');
let code = fs.readFileSync('src/components/ProHostPanel.tsx', 'utf8');

code = code.replace(
  `function DashboardView({ leagues, loading, onGenerate, onSelectLeague }: any) {
  return (
    <div className="p-4 sm:p-6 bg-slate-900/50 rounded-2xl border border-white/5 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Shield className="w-6 h-6 text-violet-400" />
          Pro Host Panel
        </h2>`,
  `function DashboardView({ leagues, loading, onGenerate, onSelectLeague }: any) {
  const totalLeagues = leagues.length;
  // This is a naive count. True squad count would require fetching from pro_league_squads for each league. 
  // We'll show an estimated or simplified count for now, or fetch it.
  
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
           <div className="text-2xl font-black text-green-400">{leagues.filter((l: any) => l.status === 'approved' || l.status === 'ongoing' || l.status === 'completed').length}</div>
        </div>
      </div>`
);

fs.writeFileSync('src/components/ProHostPanel.tsx', code);
