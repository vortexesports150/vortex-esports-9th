const fs = require('fs');
let code = fs.readFileSync('src/components/HostProfileModal.tsx', 'utf8');

const toReplace = `  useEffect(() => {
    let isMounted = true;
    const resolveId = async () => {
      // Direct mapping for dummy giveaways
      if (hostId === 'playvear_official_giveaway') {
        if (isMounted) setEffectiveHostId('20268211706164');
        return;
      }
      
      // If hostId is already the target, just use it
      if (hostId === '20268211706164') {
        if (isMounted) setEffectiveHostId('20268211706164');
        return;
      }

      // Check if this hostId belongs to the main admin, if so, map it to the official events ID
      try {
        const userSnap = await getDoc(doc(db, 'users', hostId));
        if (userSnap.exists() && userSnap.data().email === 'vortexesports150@gmail.com') {
          if (isMounted) setEffectiveHostId('20268211706164');
          return;
        }
      } catch (e) {
        console.error("Error checking host ID:", e);
      }
      
      if (isMounted) setEffectiveHostId(hostId);
    };
    resolveId();
    return () => { isMounted = false; };
  }, [hostId]);`;

const replacement = `  useEffect(() => {
    let isMounted = true;
    if (isMounted) setEffectiveHostId(hostId);
    return () => { isMounted = false; };
  }, [hostId]);`;

code = code.replace(toReplace, replacement);

fs.writeFileSync('src/components/HostProfileModal.tsx', code);
console.log("Fixed HostProfileModal.tsx");
