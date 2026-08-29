const fs = require('fs');
let code = fs.readFileSync('src/components/ProLeagueDetails.tsx', 'utf8');

code = code.replace(
  `<button className="whitespace-nowrap px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-sm transition">
                Manage Squads
              </button>`,
  `<button 
                onClick={() => setActiveTab('standings')}
                className="whitespace-nowrap px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg font-bold text-sm transition"
              >
                View Squads
              </button>`
);

fs.writeFileSync('src/components/ProLeagueDetails.tsx', code);
