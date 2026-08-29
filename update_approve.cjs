const fs = require('fs');
let code = fs.readFileSync('src/AdminAdsManager.tsx', 'utf8');

code = code.replace(
  "status: 'active',\n        updatedAt: serverTimestamp()",
  "status: 'active',\n        startedAt: serverTimestamp(),\n        updatedAt: serverTimestamp()"
);

// add start time display
code = code.replace(
  '<p className="text-[10px] text-slate-400">By: {c.advertiserEmail}</p>',
  '<p className="text-[10px] text-slate-400">By: {c.advertiserEmail}</p>\n                    {c.startedAt && <p className="text-[10px] text-slate-400 mt-1">Started: {new Date(c.startedAt.seconds * 1000).toLocaleString()}</p>}'
);

fs.writeFileSync('src/AdminAdsManager.tsx', code);

// Same for UserAdsManager
let userCode = fs.readFileSync('src/UserAdsManager.tsx', 'utf8');
userCode = userCode.replace(
  '<a href={c.videoUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline font-mono truncate block max-w-xs">\n                          {c.videoUrl}\n                        </a>',
  '<a href={c.videoUrl} target="_blank" rel="noreferrer" className="text-[10px] text-blue-400 hover:underline font-mono truncate block max-w-xs">\n                          {c.videoUrl}\n                        </a>\n                        {c.startedAt && <div className="text-[9px] text-slate-400 font-mono mt-1">Started: {new Date(c.startedAt.seconds * 1000).toLocaleString()}</div>}'
);
fs.writeFileSync('src/UserAdsManager.tsx', userCode);
