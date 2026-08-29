const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /(\s*};\s*return)(\s*<\/span>\s*<button)/g,
  `$1 (
                          <div className="grid grid-cols-2 gap-2 mt-3 w-full">
                            <div className={\`border p-2 rounded-lg flex flex-col items-center transition-all \${hd.card}\`}>
                              <span className="text-[6px] text-slate-500 font-mono uppercase tracking-widest flex items-center justify-between w-full">
                                <span className="flex items-center gap-1">
                                  <Heart className="h-1.8 w-1.8 text-rose-500" />
                                  HEALTH
                                </span>$2`
);

code = code.replace(
  /(\s*const TrendIcon = isNeg \? TrendingDown : TrendingUp;\s*return)(\s*<\/span>)/g,
  `$1 (
                                    <div className="flex items-center gap-1.5">
                                      <div className={\`p-1.5 rounded-lg \${bgClass}\`}>
                                        <TrendIcon className={\`h-2.5 w-2.5 \${colorClass}\`} />
                                      </div>
                                      <div className="text-right">
                                        <span className="text-[6px] text-slate-500 font-mono uppercase tracking-widest block">
                                          Eco Score
                                        </span>$2`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Done regex");
