const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /<\/span>\s*<\/span>\s*<button/g,
  `</span>
                                  <button`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Done regex 4");
