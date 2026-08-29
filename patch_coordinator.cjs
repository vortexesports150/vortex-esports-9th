const fs = require('fs');
let code = fs.readFileSync('src/components/ProLeagueDetails.tsx', 'utf8');

code = code.replace(
  `// States for setting results`,
  `// States for coordinator
  const [showCoordinatorModal, setShowCoordinatorModal] = useState(false);
  const [coordinatorSearchId, setCoordinatorSearchId] = useState('');
  const [foundCoordinator, setFoundCoordinator] = useState<any>(null);

  // States for setting results`
);

code = code.replace(
  `<button className="whitespace-nowrap px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-sm transition">
                Add Coordinator
              </button>`,
  `<button 
                onClick={() => setShowCoordinatorModal(true)}
                className="whitespace-nowrap px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg font-bold text-sm transition"
              >
                Add Coordinator
              </button>`
);

code = code.replace(
  `const handleSetResult = async () => {`,
  `const searchCoordinator = async () => {
    if (!coordinatorSearchId) return;
    try {
      const q = query(collection(db, 'users'), where('userId', '==', coordinatorSearchId));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("User not found with this ID.");
        setFoundCoordinator(null);
      } else {
        setFoundCoordinator({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    } catch (e) {
      alert("Error searching user.");
    }
  };

  const addCoordinator = async () => {
    if (!foundCoordinator) return;
    if (league?.coordinators?.includes(foundCoordinator.userId)) {
      alert("Already a coordinator.");
      return;
    }
    
    const updatedCoordinators = [...(league?.coordinators || []), foundCoordinator.userId];
    try {
      await updateDoc(doc(db, 'pro_hosted_leagues', leagueId), {
        coordinators: updatedCoordinators
      });
      alert("Coordinator added!");
      setShowCoordinatorModal(false);
      setFoundCoordinator(null);
      fetchData();
    } catch (e) {
      alert("Error adding coordinator.");
    }
  };

  const handleSetResult = async () => {`
);

code = code.replace(
  `const isCoordinator = false; // TODO: Check if user is added as a coordinator by the host`,
  `const isCoordinator = league?.coordinators?.includes(userProfile?.userId || '');`
);

code = code.replace(
  `{showRegisterModal && (`,
  `{showCoordinatorModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
             <h3 className="text-lg font-bold text-white mb-4">Add Coordinator</h3>
             <div className="mb-4">
               <label className="text-xs text-slate-400 mb-1 block">User ID</label>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={coordinatorSearchId}
                   onChange={e => setCoordinatorSearchId(e.target.value)}
                   className="flex-1 bg-slate-800 text-white rounded-lg p-2 text-sm border border-slate-700 outline-none"
                   placeholder="Enter User ID"
                 />
                 <button onClick={searchCoordinator} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-bold">Search</button>
               </div>
             </div>
             
             {foundCoordinator && (
               <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 mb-6">
                 <div className="font-bold text-white">{foundCoordinator.name || foundCoordinator.username}</div>
                 <div className="text-xs text-slate-400">{foundCoordinator.email}</div>
                 <div className="text-xs text-fuchsia-400 font-mono mt-1">{foundCoordinator.userId}</div>
               </div>
             )}
             
             <div className="flex gap-2">
               <button onClick={() => { setShowCoordinatorModal(false); setFoundCoordinator(null); }} className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold">Cancel</button>
               <button onClick={addCoordinator} disabled={!foundCoordinator} className="flex-1 py-2 bg-violet-600 text-white rounded-lg text-sm font-bold disabled:opacity-50">Add</button>
             </div>
           </div>
        </div>
      )}

      {showRegisterModal && (`
);

fs.writeFileSync('src/components/ProLeagueDetails.tsx', code);
