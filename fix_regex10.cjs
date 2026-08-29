const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /}\)\(\) :<\/span>\s*<\/div>/g,
  `})() : (
                                <div className="space-y-5">
                                  <div className="flex items-center justify-between border-b border-white/5 pb-2">
                                    <h4 className="text-[10px] text-fuchsia-400 font-extrabold uppercase tracking-widest font-mono flex items-center gap-1.5">
                                      <span>⚙️ Selected Match Config</span>
                                    </h4>
                                  </div>`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Done regex 10");
