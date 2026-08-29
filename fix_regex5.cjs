const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /(\s*<\/div>\s*)({\/\* Minimal Horizontal Level & EXP Status Panel \*\/})/g,
  `$1);$2`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Done regex 5");
