const fs = require('fs');
let code = fs.readFileSync('src/components/PrizeDistributionModal.tsx', 'utf8');

code = code.replace(
  /const historyRef = doc\(collection\(db, 'wallet_history'\)\);/g,
  "const historyRef = doc(collection(db, 'users', champion.leaderUserId, 'tokenTransactions'));"
);

// I'll do this more carefully:
