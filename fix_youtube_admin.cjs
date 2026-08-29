const fs = require('fs');
let code = fs.readFileSync('src/components/YoutubeGiveawayAdmin.tsx', 'utf8');

const toReplace = `        if (!adminSnap.empty) {
          const adminDoc = adminSnap.docs[0];
          // We keep 20268211706164 as the explicit ID per user request, but grab the photo if available
          if (adminDoc.data().photoURL) {
            mainAdminPhoto = adminDoc.data().photoURL;
          }
        }`;

const replacement = `        if (!adminSnap.empty) {
          const adminDoc = adminSnap.docs[0];
          mainAdminId = adminDoc.id; // Use the actual admin's user ID
          if (adminDoc.data().photoURL) {
            mainAdminPhoto = adminDoc.data().photoURL;
          }
        }`;

code = code.replace(toReplace, replacement);

fs.writeFileSync('src/components/YoutubeGiveawayAdmin.tsx', code);
console.log("Fixed YoutubeGiveawayAdmin.tsx");
