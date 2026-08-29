const fs = require('fs');
let code = fs.readFileSync('src/components/HostProfileModal.tsx', 'utf8');

// 1. Add effectiveHostId state
const stateInsertion = `  const currentUserId = currentUserProfile?.userId;

  const [effectiveHostId, setEffectiveHostId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    const resolveId = async () => {
      if (hostId === 'playvear_official_giveaway' || hostId === '20268211706164') {
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
code = code.replace("  const currentUserId = currentUserProfile?.userId;", stateInsertion);

// 2. Replace hostId with effectiveHostId everywhere else
// But don't replace the props destructuring or the useEffect dependency if it's the one we just added.
// We can just use a regex for all usages inside the effects and render.
code = code.replace(/if \(!hostId\) return;/g, 'if (!effectiveHostId) return;');
code = code.replace(/doc\(db, 'users', hostId\)/g, "doc(db, 'users', effectiveHostId)");
code = code.replace(/doc\(db, 'host_brands', hostId\)/g, "doc(db, 'host_brands', effectiveHostId)");
code = code.replace(/hostId === 'playvear_official_giveaway' \|\| hostId === '20268211706164'/g, "effectiveHostId === 'playvear_official_giveaway' || effectiveHostId === '20268211706164'");
code = code.replace(/\[hostId, hostName, hostPhotoUrl\]/g, "[effectiveHostId, hostName, hostPhotoUrl]");
code = code.replace(/where\('hostId', '==', hostId\)/g, "where('hostId', '==', effectiveHostId)");
code = code.replace(/where\('userId', '==', hostId\)/g, "where('userId', '==', effectiveHostId)");
code = code.replace(/\[hostId, currentUserId\]/g, "[effectiveHostId, currentUserId]");
code = code.replace(/\[hostId\]/g, "[effectiveHostId]");
code = code.replace(/currentUserId === hostId/g, "currentUserId === effectiveHostId");
code = code.replace(/currentUserId \!\=\= hostId/g, "currentUserId !== effectiveHostId");
code = code.replace(/\$\{currentUserId\}_\$\{hostId\}/g, "${currentUserId}_${effectiveHostId}");
code = code.replace(/\$\{currentUserId\}_host_\$\{hostId\}/g, "${currentUserId}_host_${effectiveHostId}");
code = code.replace(/hostId: hostId/g, "hostId: effectiveHostId");
code = code.replace(/hostId\.slice\(0, 6\)/g, "effectiveHostId.slice(0, 6)");

// 3. Wrap return in if (!effectiveHostId) return null;
code = code.replace("  return (", "  if (!effectiveHostId) return null;\n\n  return (");

fs.writeFileSync('src/components/HostProfileModal.tsx', code);
console.log("Rewritten HostProfileModal.tsx");
