const fs = require('fs');

let adminCode = fs.readFileSync('src/AdminAdsManager.tsx', 'utf8');

adminCode = adminCode.replace(
  "message: \`Your ad campaign \"\${campaign.title}\" is now running!\`,",
  "message: \`Your ad campaign \"\${campaign.title}\" (ID: \${campaign.id}) is now running!\`,\n        campaignId: campaign.id,"
);

adminCode = adminCode.replace(
  "message: \`Your ad campaign \"\${campaign.title}\" was rejected. Reason: \${rejectReason}. Your \${campaign.totalCost} tokens have been refunded.\`,",
  "message: \`Your ad campaign \"\${campaign.title}\" (ID: \${campaign.id}) was rejected. Reason: \${rejectReason}. Your \${campaign.totalCost} tokens have been refunded.\`,\n        campaignId: campaign.id,"
);

fs.writeFileSync('src/AdminAdsManager.tsx', adminCode);

let userCode = fs.readFileSync('src/UserAdsManager.tsx', 'utf8');

userCode = userCode.replace(
  "message: \`\${user.displayName || user.email} submitted a new ad campaign for \${viewsNum} views.\`,",
  "message: \`\${user.displayName || user.email} submitted a new ad campaign (ID: \${generatedId}) for \${viewsNum} views.\`,\n        campaignId: generatedId,"
);

fs.writeFileSync('src/UserAdsManager.tsx', userCode);
