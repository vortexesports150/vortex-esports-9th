const fs = require('fs');
let code = fs.readFileSync('src/components/ProHostPanel.tsx', 'utf8');

code = code.replace(
  `import { GenerateLeagueView } from './GenerateLeagueView';`,
  `import { GenerateLeagueView } from './GenerateLeagueView';\nimport { ProLeagueDetails } from './ProLeagueDetails';`
);

code = code.replace(
  `export function ProHostPanel({ userProfile, tokens }: ProHostPanelProps) {
  const [view, setView] = useState<'dashboard' | 'generate' | 'subscription'>('dashboard');`,
  `export function ProHostPanel({ userProfile, tokens }: ProHostPanelProps) {
  const [view, setView] = useState<'dashboard' | 'generate' | 'subscription'>('dashboard');
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);`
);

code = code.replace(
  `return (
    <div className="w-full max-w-4xl mx-auto space-y-6">`,
  `if (selectedLeagueId) {
    return <ProLeagueDetails leagueId={selectedLeagueId} userProfile={userProfile} onBack={() => setSelectedLeagueId(null)} />;
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">`
);

code = code.replace(
  `<DashboardView 
          leagues={leagues} 
          loading={loading} 
          onGenerate={() => setView('generate')} 
        />`,
  `<DashboardView 
          leagues={leagues} 
          loading={loading} 
          onGenerate={() => setView('generate')} 
          onSelectLeague={(id: string) => setSelectedLeagueId(id)}
        />`
);

code = code.replace(
  `function DashboardView({ leagues, loading, onGenerate }: any) {`,
  `function DashboardView({ leagues, loading, onGenerate, onSelectLeague }: any) {`
);

code = code.replace(
  `<div className="flex justify-between text-sm">
                <span className="text-slate-400">Squads: <span className="text-white font-medium">{league.squadSize}</span></span>
                <span className="text-slate-400">Prize Pool: <span className="text-violet-400 font-medium">{league.prizePool}</span></span>
              </div>`,
  `<div className="flex justify-between text-sm">
                <span className="text-slate-400">Squads: <span className="text-white font-medium">{league.squadSize}</span></span>
                <span className="text-slate-400">Prize Pool: <span className="text-violet-400 font-medium">{league.prizePool}</span></span>
              </div>
              <button 
                onClick={() => onSelectLeague(league.id)}
                className="mt-2 w-full py-2 bg-slate-700 hover:bg-slate-600 text-white text-xs font-bold rounded-lg transition-colors"
              >
                Manage League
              </button>`
);


fs.writeFileSync('src/components/ProHostPanel.tsx', code);
