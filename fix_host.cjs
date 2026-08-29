const fs = require('fs');
let code = fs.readFileSync('src/components/HostProfileModal.tsx', 'utf8');

// Replace the useState and useEffect with a simple constant
const toRemove = `  const [effectiveHostId, setEffectiveHostId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const resolveId = async () => {
      if (effectiveHostId === 'playvear_official_giveaway' || effectiveHostId === '20268211706164') {
        try {
          const q = query(collection(db, 'users'), where('email', '==', 'vortexesports150@gmail.com'));
          const snap = await getDocs(q);
          if (!snap.empty && isMounted) {
            setEffectiveHostId(snap.docs[0].id);
            return;
          }
        } catch (e) {}
      }
      if (isMounted) setEffectiveHostId(hostId);
    };
    resolveId();
    return () => { isMounted = false; };
  }, [hostId]);`;

code = code.replace(toRemove, "  const effectiveHostId = (hostId === 'playvear_official_giveaway') ? '20268211706164' : hostId;");

// We also need to remove `if (!effectiveHostId) return null;` which was added before the final return,
// because we don't need to wait for a state to load anymore. Actually, keeping it is fine since it's just a check.

fs.writeFileSync('src/components/HostProfileModal.tsx', code);
console.log("Fixed HostProfileModal.tsx effectiveHostId resolution.");
