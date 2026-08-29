const fs = require('fs');
let code = fs.readFileSync('src/components/YoutubeGiveawayAdmin.tsx', 'utf8');

const toReplace = `      // Resolve the main admin's UID to use for the Pulse Post
      let mainAdminId = '20268211706164';`;

const replacement = `      // Resolve the main admin's UID to use for the Pulse Post
      let mainAdminId = adminEmail; // Fallback to email if fetch fails, but fetch should succeed`;

code = code.replace(toReplace, replacement);

fs.writeFileSync('src/components/YoutubeGiveawayAdmin.tsx', code);
console.log("Fixed YoutubeGiveawayAdmin.tsx fallback");
