const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /{\s*match\.runnerUp &&\s*<\/span>/,
  `{match.runnerUp && (
                                          <div className="flex items-center justify-between">
                                            <span className="font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                                              🥈 Runner Up
                                            </span>`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Done regex 3");
