const fs = require('fs');
let code = fs.readFileSync('src/components/HostProfileModal.tsx', 'utf8');

code = code.replace("  }, [effectiveHostId]);\n\n  // Host Data State", "  }, [hostId]);\n\n  // Host Data State");

fs.writeFileSync('src/components/HostProfileModal.tsx', code);
console.log("Fixed dependencies in HostProfileModal.tsx");
