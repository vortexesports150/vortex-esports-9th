const fs = require('fs');
let code = fs.readFileSync('src/components/GlobalLeagues.tsx', 'utf8');

code = code.replace(
  "export function GlobalLeagues() {",
  `import { ProLeagueDetails } from './ProLeagueDetails';
import { UserProfile } from '../types';

interface GlobalLeaguesProps {
  userProfile: UserProfile | null;
}

export function GlobalLeagues({ userProfile }: GlobalLeaguesProps) {
  const [selectedLeagueId, setSelectedLeagueId] = useState<string | null>(null);
`
);

code = code.replace(
  `<button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors border border-white/10">`,
  `<button onClick={() => setSelectedLeagueId(league.id)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition-colors border border-white/10">`
);

code = code.replace(
  `return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">`,
  `if (selectedLeagueId) {
    return <ProLeagueDetails leagueId={selectedLeagueId} userProfile={userProfile} onBack={() => setSelectedLeagueId(null)} />;
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">`
);

fs.writeFileSync('src/components/GlobalLeagues.tsx', code);
