const fs = require('fs');
let code = fs.readFileSync('src/components/HostProfileModal.tsx', 'utf8');

const toReplace = `          if (resolvedData.email === 'vortexesports150@gmail.com' || effectiveHostId === 'playvear_official_giveaway' || effectiveHostId === '20268211706164') {`;

const replacement = `          if (resolvedData.email === 'vortexesports150@gmail.com') {`;

code = code.replace(toReplace, replacement);

fs.writeFileSync('src/components/HostProfileModal.tsx', code);
console.log("Cleaned display name forced rewrite");
