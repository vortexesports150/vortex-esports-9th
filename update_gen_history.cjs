const fs = require('fs');
let content = fs.readFileSync('src/components/GenerateLeagueView.tsx', 'utf8');

const oldBlock = `        // 4. Create pending league document
        const leagueData: Omit<ProHostedLeague, 'id'> = {`;

const newBlock = `        // Add initial 10% to league wallet history
        const historyRef = doc(collection(db, 'pro_host_wallet_history'));
        transaction.set(historyRef, {
          leagueId: customLeagueId,
          hostId: userProfile.userId,
          type: 'income',
          amount: requiredTokens,
          balanceAfter: requiredTokens,
          description: 'League generation security deposit (10% of prize pool)',
          userName: 'System',
          createdAt: serverTimestamp()
        });

        // 4. Create pending league document
        const leagueData: Omit<ProHostedLeague, 'id'> = {`;

if (content.includes(oldBlock)) {
  content = content.replace(oldBlock, newBlock);
  fs.writeFileSync('src/components/GenerateLeagueView.tsx', content);
  console.log("Updated GenerateLeagueView.tsx with history.");
} else {
  console.log("Could not find block in GenerateLeagueView.tsx");
}
