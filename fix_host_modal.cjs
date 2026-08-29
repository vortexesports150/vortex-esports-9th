const fs = require('fs');
let code = fs.readFileSync('src/components/HostProfileModal.tsx', 'utf8');

// Revert the incorrect replacement
code = code.replace("    if (!effectiveHostId) return null;\n\n  return ()", "    return ()");

// Insert it at the correct place (before the final return JSX)
code = code.replace(/  return \(\n    <AnimatePresence>/g, "  if (!effectiveHostId) return null;\n\n  return (\n    <AnimatePresence>");

fs.writeFileSync('src/components/HostProfileModal.tsx', code);
console.log("Fixed HostProfileModal.tsx");
