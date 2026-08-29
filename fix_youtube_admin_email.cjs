const fs = require('fs');
let code = fs.readFileSync('src/components/YoutubeGiveawayAdmin.tsx', 'utf8');

const toReplace = `const adminQuery = query(collection(db, 'users'), where('email', '==', 'vortexesports150@gmail.com'));`;
const replacement = `const adminQuery = query(collection(db, 'users'), where('email', '==', adminEmail));`;

code = code.replace(toReplace, replacement);

fs.writeFileSync('src/components/YoutubeGiveawayAdmin.tsx', code);
console.log("Fixed YoutubeGiveawayAdmin.tsx email");
