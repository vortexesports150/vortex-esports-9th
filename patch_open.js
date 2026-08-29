const fs = require('fs');
let content = fs.readFileSync('src/components/LeagueScheduleView.tsx', 'utf8');

const replacement = `    setIsRescheduled(override.isRescheduled || false);

    let defaultWalkover = null;
    if (override.status === 'completed' || override.isPlayed) {
      if (override.scoreA === 7 && override.scoreB === 0 && override.winner === match.t1) defaultWalkover = 't1';
      else if (override.scoreA === 0 && override.scoreB === 7 && override.winner === match.t2) defaultWalkover = 't2';
      else if (override.scoreA === 0 && override.scoreB === 0 && (override.winner === 'NO_WINNER' || !override.winner)) defaultWalkover = 'both';
    }
    setWalkoverPreset(defaultWalkover);`;

content = content.replace('    setIsRescheduled(override.isRescheduled || false);', replacement);
fs.writeFileSync('src/components/LeagueScheduleView.tsx', content);
