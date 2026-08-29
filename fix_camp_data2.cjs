const fs = require('fs');
let code = fs.readFileSync('src/UserAdsManager.tsx', 'utf8');

const regex = /status: 'pending',\s*await setDoc\(doc\(db, 'ad_campaigns', generatedId\), campData\);/g;
code = code.replace(regex, "status: 'pending',\n        viewsCount: 0,\n        createdAt: serverTimestamp()\n      };\n\n      await setDoc(doc(db, 'ad_campaigns', generatedId), campData);");

fs.writeFileSync('src/UserAdsManager.tsx', code);
