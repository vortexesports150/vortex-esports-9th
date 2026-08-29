const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Replace gradient with black background
code = code.replace(
  /<div className="absolute inset-0 w-full h-full bg-gradient-to-b from-\[#090514\] via-\[#05040d\] to-\[#020104\] overflow-hidden flex flex-col justify-between p-2 sm:p-4 font-sans select-none pointer-events-auto">/,
  '<div className="absolute inset-0 w-full h-full bg-black overflow-hidden flex flex-col justify-between p-2 sm:p-4 font-sans select-none pointer-events-auto">'
);

// We need to add the background image inside the container
const bgImgElement = `
      {/* Custom Bangladesh Jungle Flowers & Fireworks Background */}
      <div 
        className="absolute inset-0 w-full h-full pointer-events-none opacity-40 mix-blend-screen"
        style={{
          backgroundImage: "url('/src/assets/images/jungle_flowers_fireworks_bg_1784837237301.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      />
`;

// Insert it right after the 3D Holographic Grid floor backplate, or replace it.
// Let's replace the Holographic Grid to reduce glitching and keep it clean.
code = code.replace(
  /{ \/\* 3D Holographic Grid floor backplate \*\/ }\s*<div className="absolute inset-0 bg-\[linear-gradient[^\n]+ pointer-events-none" \/>/,
  bgImgElement
);

fs.writeFileSync('src/App.tsx', code);
