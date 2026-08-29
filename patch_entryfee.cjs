const fs = require('fs');
let code = fs.readFileSync('src/components/ProLeagueDetails.tsx', 'utf8');

code = code.replace(
  `setRegistering(true);
    try {
      await addDoc(collection(db, 'pro_league_squads'), {
        leagueId,
        teamId: team.id,
        teamName: team.name,
        leaderId: userProfile?.userId,
        players: team.members,
        points: 0,
        createdAt: serverTimestamp()
      });
      setShowRegisterModal(false);
      fetchData();
    } catch (e) {
      alert('Error registering');
    } finally {
      setRegistering(false);
    }`,
  `if (league?.entryFee && league.entryFee > 0) {
      if (!confirm(\`This will deduct \${league.entryFee} tokens from your account. Proceed?\`)) return;
    }

    setRegistering(true);
    try {
      await runTransaction(db, async (transaction) => {
        if (league?.entryFee && league.entryFee > 0) {
          const userRef = doc(db, 'users', userProfile!.userId);
          const userDoc = await transaction.get(userRef);
          const currentTokens = userDoc.data()?.tokens || 0;
          if (currentTokens < league.entryFee) {
            throw new Error('Insufficient tokens');
          }
          transaction.update(userRef, { tokens: currentTokens - league.entryFee });
        }
        
        const newSquadRef = doc(collection(db, 'pro_league_squads'));
        transaction.set(newSquadRef, {
          leagueId,
          teamId: team.id,
          teamName: team.name,
          leaderId: userProfile?.userId,
          players: team.members,
          points: 0,
          createdAt: serverTimestamp()
        });
      });

      setShowRegisterModal(false);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Error registering');
    } finally {
      setRegistering(false);
    }`
);

fs.writeFileSync('src/components/ProLeagueDetails.tsx', code);
