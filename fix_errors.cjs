const fs = require('fs');

// Fix App.tsx import
let appCode = fs.readFileSync('src/App.tsx', 'utf8');
if (!appCode.includes("import { CopyButton }")) {
  appCode = appCode.replace(
    "import React,",
    "import { CopyButton } from './components/CopyButton';\nimport React,"
  );
  fs.writeFileSync('src/App.tsx', appCode);
}

// Fix UserAdsManager.tsx
let userCode = fs.readFileSync('src/UserAdsManager.tsx', 'utf8');
const adminNotifRegex = /      \/\/ Notify Admin\n      await addDoc\(collection\(db, 'admin_notifications'\), \{\n        title: 'New Ad Campaign Request',\n        message: `\$\{user\.displayName \|\| user\.email\} submitted a new ad campaign \(ID: \$\{generatedId\}\) for \$\{viewsNum\} views\.`,\n        campaignId: generatedId,\n        type: 'ad_campaign',\n        advertiserId: user\.uid,\n        isRead: false,\n        createdAt: serverTimestamp\(\)\n      \}\);\n/;

const generatedIdRegex = /      let newSerial = 1;[\s\S]*?const generatedId = `CAMP-\$\{year\}\$\{month\}\$\{day\}-\$\{hours\}\$\{mins\}\$\{secs\}-\$\{serialStr\}`;/

const generatedIdMatch = userCode.match(generatedIdRegex);
const adminNotifMatch = userCode.match(adminNotifRegex);

if (generatedIdMatch && adminNotifMatch) {
  // Remove admin notif from current place
  userCode = userCode.replace(adminNotifRegex, "");
  
  // Put it right after generatedId
  userCode = userCode.replace(
    generatedIdMatch[0],
    generatedIdMatch[0] + "\n\n" + adminNotifMatch[0]
  );
  fs.writeFileSync('src/UserAdsManager.tsx', userCode);
}

