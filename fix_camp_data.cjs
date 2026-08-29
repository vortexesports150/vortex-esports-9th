const fs = require('fs');
let code = fs.readFileSync('src/UserAdsManager.tsx', 'utf8');

code = code.replace(
  "        totalCost,\n        status: 'pending',\n      await setDoc(doc(db, 'ad_campaigns', generatedId), campData);",
  "        totalCost,\n        status: 'pending',\n        viewsCount: 0,\n        createdAt: serverTimestamp()\n      };\n\n      await setDoc(doc(db, 'ad_campaigns', generatedId), campData);"
);

fs.writeFileSync('src/UserAdsManager.tsx', code);
