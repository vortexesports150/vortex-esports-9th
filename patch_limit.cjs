const fs = require('fs');
let code = fs.readFileSync('src/components/ProLeagueDetails.tsx', 'utf8');

code = code.replace(
  `!isHost && !isSuperAdmin && league.status === 'approved' && !hasRegistered`,
  `!isHost && !isSuperAdmin && league.status === 'approved' && !hasRegistered && squads.length < league.squadSize`
);

fs.writeFileSync('src/components/ProLeagueDetails.tsx', code);
