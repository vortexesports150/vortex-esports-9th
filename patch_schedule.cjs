const fs = require('fs');
let code = fs.readFileSync('src/components/ProLeagueDetails.tsx', 'utf8');

code = code.replace(
  `<button className="whitespace-nowrap px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-sm transition">
                Generate Schedule
              </button>`,
  `<button 
                onClick={handleAutoGenerateSchedule}
                className="whitespace-nowrap px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-sm transition"
              >
                Generate Schedule
              </button>`
);

code = code.replace(
  `const handleGenerateMatch = async () => {`,
  `const handleAutoGenerateSchedule = async () => {
    if (squads.length < 2) return alert("Not enough squads to generate a schedule.");
    if (!confirm("This will randomly pair up all currently registered squads. Proceed?")) return;
    
    setLoading(true);
    try {
      // Shuffle squads
      const shuffled = [...squads].sort(() => 0.5 - Math.random());
      
      const batch: any[] = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          const s1 = shuffled[i];
          const s2 = shuffled[i + 1];
          batch.push(
            addDoc(collection(db, 'pro_league_matches'), {
              leagueId,
              squadAId: s1.id,
              squadAName: s1.teamName,
              squadAPlayers: s1.players || [],
              squadBId: s2.id,
              squadBName: s2.teamName,
              squadBPlayers: s2.players || [],
              status: 'upcoming',
              createdAt: serverTimestamp()
            })
          );
        }
      }
      
      await Promise.all(batch);
      
      // Update league status to ongoing if it was approved
      if (league?.status === 'approved') {
         await updateDoc(doc(db, 'pro_hosted_leagues', leagueId), { status: 'ongoing' });
      }
      
      alert("Schedule generated successfully!");
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Failed to generate schedule.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMatch = async () => {`
);

fs.writeFileSync('src/components/ProLeagueDetails.tsx', code);
