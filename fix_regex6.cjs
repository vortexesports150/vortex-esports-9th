const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /return \(\s*<div className="grid grid-cols-2/g,
  `return (
                          <div className="w-full space-y-3 mt-1">
                            <div className="grid grid-cols-2`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Done regex 6.1");
