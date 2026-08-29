const fs = require('fs');
let code = fs.readFileSync('src/components/ProLeagueDetails.tsx', 'utf8');

code = code.replace(
  `import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';`,
  `import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';\nimport { Team } from '../types';`
);

code = code.replace(
  `// States for setting results`,
  `const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [registering, setRegistering] = useState(false);
  // States for setting results`
);

code = code.replace(
  `setMatches(m);
    
    setLoading(false);`,
  `setMatches(m);

    if (userProfile?.userId) {
      const teamsSnap = await getDocs(query(collection(db, 'teams'), where('leaderId', '==', userProfile.userId)));
      setMyTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
    }
    
    setLoading(false);`
);

code = code.replace(
  `const isSuperAdmin = userProfile?.role === 'main_admin' || userProfile?.role === 'admin';`,
  `const isSuperAdmin = userProfile?.role === 'main_admin' || userProfile?.role === 'admin';
  const hasRegistered = squads.some(s => s.leaderId === userProfile?.userId);

  const handleRegister = async () => {
    if (!selectedTeam) return alert('Select a team');
    const team = myTeams.find(t => t.id === selectedTeam);
    if (!team) return;
    
    setRegistering(true);
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
    }
  };`
);

code = code.replace(
  `100% Prize Pool Guaranteed & Locked
            </p>
          </div>`,
  `100% Prize Pool Guaranteed & Locked
            </p>
          </div>
          
          {!isHost && !isSuperAdmin && league.status === 'approved' && !hasRegistered && (
            <button 
              onClick={() => setShowRegisterModal(true)}
              className="w-full py-3 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-xl mb-6 shadow-lg shadow-fuchsia-500/30"
            >
              Register Squad Now
            </button>
          )}
          {!isHost && !isSuperAdmin && hasRegistered && (
            <div className="w-full py-3 bg-green-500/20 text-green-400 border border-green-500/30 text-center font-bold rounded-xl mb-6">
              Your Squad is Registered
            </div>
          )}`
);

code = code.replace(
  `{showMatchModal && (`,
  `{showRegisterModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
             <h3 className="text-lg font-bold text-white mb-4">Register Your Squad</h3>
             {myTeams.length === 0 ? (
               <p className="text-slate-400 text-sm mb-4">You don't have any teams. Create a team first in My Team section.</p>
             ) : (
               <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="w-full bg-slate-800 text-white rounded-lg p-3 text-sm border border-slate-700 mb-6">
                 <option value="">Select your team</option>
                 {myTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
             )}
             <div className="flex gap-2">
               <button onClick={() => setShowRegisterModal(false)} className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold">Cancel</button>
               {myTeams.length > 0 && (
                 <button onClick={handleRegister} disabled={registering} className="flex-1 py-2 bg-fuchsia-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">
                   {registering ? 'Registering...' : 'Register'}
                 </button>
               )}
             </div>
           </div>
        </div>
      )}

      {showMatchModal && (`
);


fs.writeFileSync('src/components/ProLeagueDetails.tsx', code);
