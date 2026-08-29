const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /{newTourneyType === 'top_48' \? : \(/g,
  `{newTourneyType === 'top_48' ? null : (`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Done regex 9");
