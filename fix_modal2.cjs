const fs = require('fs');
let lines = fs.readFileSync('src/components/HostProfileModal.tsx', 'utf8').split('\n');

// Find the <motion.div class...
let divIndex = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('className="bg-[#060a17] w-full max-w-4xl mx-auto min-h-screen relative flex flex-col sm:border-x sm:border-cyan-500/20 shadow-2xl pb-12"')) {
    divIndex = i;
    break;
  }
}

if (divIndex !== -1) {
  // If we already inserted {loadingHost ? ... it might be messy.
  // Let's just find the exact boundaries.
  // Find </motion.div>
  let endDivIndex = lines.lastIndexOf('        </motion.div>');
  
  // Reconstruct correctly
}
