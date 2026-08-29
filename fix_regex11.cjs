const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');

code = code.replace(
  /}\)\(\) : \(\s*<div className="space-y-5">\s*<div className="flex items-center justify-between border-b/g,
  `})() : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5 w-full">
                                <div className="md:col-span-1 space-y-5 bg-[#0b0518]/70 border border-purple-500/15 p-4 rounded-xl relative overflow-hidden">
                                  <div className="flex items-center justify-between border-b`
);

fs.writeFileSync('src/App.tsx', code);
console.log("Done regex 11");
