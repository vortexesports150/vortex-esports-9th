const fs = require('fs');
let code = fs.readFileSync('src/components/PrizeDistributionModal.tsx', 'utf8');

code = code.replace(
  "        transaction.update(sysWalletRef, { upazilaLeagueWallet: sysBal - totalPayout });",
  `        transaction.update(sysWalletRef, { upazilaLeagueWallet: sysBal - totalPayout });
        
        // Add history for System Wallet
        const sysHistoryRef = doc(collection(db, 'system', 'wallets', 'history'));
        transaction.set(sysHistoryRef, {
          walletType: 'upazilaLeagueWallet',
          amountDeducted: totalPayout,
          type: 'deduction',
          reason: \`Prize Distribution - \${league?.title}\`,
          createdAt: serverTimestamp()
        });`
);

fs.writeFileSync('src/components/PrizeDistributionModal.tsx', code);
