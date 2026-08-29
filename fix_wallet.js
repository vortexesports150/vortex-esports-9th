const fs = require('fs');
let code = fs.readFileSync('src/components/PrizeDistributionModal.tsx', 'utf8');

code = code.replace(
  /const userWalletRef = doc\(db, 'user_wallets', [^)]+\);/g,
  (match) => match.replace('user_wallets', 'users')
);

code = code.replace(
  /transaction\.set\(userWalletRef, \{ balance: currentBal \+ championPrize, updatedAt: new Date\(\)\.toISOString\(\) \}, \{ merge: true \}\);/g,
  "transaction.update(userWalletRef, { tokens: currentBal + championPrize });"
);

code = code.replace(
  /transaction\.set\(userWalletRef, \{ balance: currentBal \+ runnerUpPrize, updatedAt: new Date\(\)\.toISOString\(\) \}, \{ merge: true \}\);/g,
  "transaction.update(userWalletRef, { tokens: currentBal + runnerUpPrize });"
);

code = code.replace(
  /const currentBal = userWalletSnap.exists\(\) \? userWalletSnap\.data\(\)\.balance \|\| 0 : 0;/g,
  "const currentBal = userWalletSnap.exists() ? userWalletSnap.data().tokens || 0 : 0;"
);

// wallet history uses 'system', 'wallets', 'history' for system, but what about user's wallet history?
// Wait, the user wallet history was:
// const historyRef = doc(collection(db, 'wallet_history'));
// Let me check if App.tsx uses wallet_history
