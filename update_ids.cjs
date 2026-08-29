const fs = require('fs');

// AdminAdsManager.tsx
let adminCode = fs.readFileSync('src/AdminAdsManager.tsx', 'utf8');
adminCode = adminCode.replace(
  '<h4 className="text-sm font-bold text-white mb-1">{c.title}</h4>',
  '<h4 className="text-sm font-bold text-white mb-1">{c.title}</h4>\n                    <p className="text-[10px] text-blue-300 font-mono mb-1">ID: {c.id}</p>'
);
fs.writeFileSync('src/AdminAdsManager.tsx', adminCode);

// UserAdsManager.tsx
let userCode = fs.readFileSync('src/UserAdsManager.tsx', 'utf8');
userCode = userCode.replace(
  '<h4 className="text-sm font-bold text-white mb-1 line-clamp-1">{c.title}</h4>',
  '<h4 className="text-sm font-bold text-white mb-1 line-clamp-1">{c.title}</h4>\n                        <div className="text-[10px] text-blue-300 font-mono mb-1">ID: {c.id}</div>'
);
fs.writeFileSync('src/UserAdsManager.tsx', userCode);
