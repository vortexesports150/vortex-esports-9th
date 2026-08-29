const fs = require('fs');
let content = fs.readFileSync('src/components/LeagueScheduleView.tsx', 'utf8');

const oldUpdate = `          // Add to host league wallet
          transaction.update(leagueRef, { walletTokens: currentWalletTokens + league.entryFee });`;

const newUpdate = `          // Add to host league wallet
          const currentBal = leagueDoc.data()?.walletBalance || currentWalletTokens;
          transaction.update(leagueRef, { 
            walletTokens: currentWalletTokens + league.entryFee,
            walletBalance: currentBal + league.entryFee
          });`;

if (content.includes(oldUpdate)) {
  content = content.replace(oldUpdate, newUpdate);
  fs.writeFileSync('src/components/LeagueScheduleView.tsx', content);
  console.log("Updated LeagueScheduleView.tsx");
} else {
  console.log("Could not find old update block");
}
