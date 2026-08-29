const fs = require('fs');
let code = fs.readFileSync('src/components/HostProfileModal.tsx', 'utf8');

// Remove the hardcoded override
code = code.replace(`          if (resolvedData.email === 'vortexesports150@gmail.com') {
            resolvedData.displayName = 'PlayVear Official';
            resolvedData.brandName = 'PlayVear Official';
            if (!brandSnap.exists() || !resolvedData.bio || resolvedData.bio === 'Official Esports Tournament Host on PlayVear.') {
              resolvedData.bio = 'Official PlayVear System Host.';
            }
          }`, '');

// Wait, I also need to show a Skeleton while loading.
const renderStart = `  if (!effectiveHostId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-[#04060e] overflow-y-auto w-full h-full min-h-screen flex flex-col">
        <motion.div`;

const renderWithSkeleton = `  if (!effectiveHostId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-[#04060e] overflow-y-auto w-full h-full min-h-screen flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          className="bg-[#060a17] w-full max-w-4xl mx-auto min-h-screen relative flex flex-col sm:border-x sm:border-cyan-500/20 shadow-2xl pb-12"
        >
          {loadingHost ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
              <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
              <p className="text-cyan-400 font-mono text-sm animate-pulse tracking-widest uppercase font-black">Loading Host Profile...</p>
            </div>
          ) : (
            <>
`;

code = code.replace(renderStart, renderWithSkeleton);

// Then close the fragment at the end.
const renderEnd = `        </motion.div>
      </div>
    </AnimatePresence>
  );
}`;

const renderEndFix = `            </>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}`;

code = code.replace(renderEnd, renderEndFix);

fs.writeFileSync('src/components/HostProfileModal.tsx', code);
console.log("Fixed HostProfileModal.tsx");
