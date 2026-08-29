const fs = require('fs');
let code = fs.readFileSync('src/UserAdsManager.tsx', 'utf8');
code = code.replace(
  "      await setDoc(doc(db, 'ad_campaigns', generatedId), campData);\n      } else {\n        await addDoc(collection(db, 'ad_campaigns'), campData);\n      }",
  "      await setDoc(doc(db, 'ad_campaigns', generatedId), campData);"
);
fs.writeFileSync('src/UserAdsManager.tsx', code);
