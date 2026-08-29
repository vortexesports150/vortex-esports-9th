const fs = require('fs');
let content = fs.readFileSync('src/components/LeagueScheduleView.tsx', 'utf8');

// Replace the condition for squad 1
content = content.replace(
  /scoreA === 7 && scoreB === 0 && winner === editingMatch.t1/g,
  "walkoverPreset === 't1'"
);

// Replace the condition for squad 2
content = content.replace(
  /scoreA === 0 && scoreB === 7 && winner === editingMatch.t2/g,
  "walkoverPreset === 't2'"
);

// Replace the condition for both absent
content = content.replace(
  /scoreA === 0 && scoreB === 0 && \(!winner \|\| winner === 'NO_WINNER'\)/g,
  "walkoverPreset === 'both'"
);

// Add setWalkoverPreset inside onClick for each
content = content.replace(
  /setWinner\(editingMatch\.t1\);\n\s*}}/g,
  "setWinner(editingMatch.t1);\n                            setWalkoverPreset('t1');\n                          }}"
);

content = content.replace(
  /setWinner\(editingMatch\.t2\);\n\s*}}/g,
  "setWinner(editingMatch.t2);\n                            setWalkoverPreset('t2');\n                          }}"
);

content = content.replace(
  /setWinner\(''\);\n\s*}}/g,
  "setWinner('NO_WINNER');\n                            setWalkoverPreset('both');\n                          }}"
);

// Hide player list if walkover preset is selected
content = content.replace(
  /{\/\* Player Stats Input \*\/}/,
  "{!walkoverPreset && ( <>{/* Player Stats Input */}"
);

// Assuming the player list goes until just before "Save Changes" button or end of modal
// It's probably easier to just replace a chunk of text or use a flag. Let's see the structure.
fs.writeFileSync('src/components/LeagueScheduleView.tsx', content);
