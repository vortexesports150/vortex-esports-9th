import fs from 'fs';
let content = fs.readFileSync('src/components/LeagueScheduleView.tsx', 'utf8');

content = content.replace(/\{s1Players\.map\(\(p, idx\) => \(/, '{s1Players.map((p, idx) => {\n                          const pKey = getPKey(p);\n                          return (');
content = content.replace(/\{s2Players\.map\(\(p, idx\) => \(/, '{s2Players.map((p, idx) => {\n                          const pKey = getPKey(p);\n                          return (');

// In both loops, replace key={p.email} with key={pKey}
content = content.replace(/<div key=\{p\.email\}/g, '<div key={pKey}');

// Replace other p.email references inside the loops
content = content.replace(/data-player-email=\{p\.email\}>\{p\.email\}<\/span>/g, 'data-player-email={pKey}>{pKey}</span>');
content = content.replace(/handleDecrementKills\(p\.email\)/g, 'handleDecrementKills(pKey)');
content = content.replace(/handleIncrementKills\(p\.email\)/g, 'handleIncrementKills(pKey)');
content = content.replace(/playerStats\[p\.email\]/g, 'playerStats[pKey]');
content = content.replace(/handleDamageChange\(p\.email/g, 'handleDamageChange(pKey');

// Close the return for map
content = content.replace(/className=\{`w-16 bg-black\/40 border border-white\/5 rounded-lg px-2 py-1 text-white text-center font-mono text-\[10\.5px\] focus:border-cyan-500\/50 outline-none \$\{isResultLockedForUser \? 'opacity-60 cursor-not-allowed' : ''\}`\}\s*\/>\s*<\/div>\s*\)\)/g, 
  "className={`w-16 bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-white text-center font-mono text-[10.5px] focus:border-cyan-500/50 outline-none ${isResultLockedForUser ? 'opacity-60 cursor-not-allowed' : ''}`}\n                            />\n                          </div>\n                        )})}");

fs.writeFileSync('src/components/LeagueScheduleView.tsx', content);
