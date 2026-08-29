const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const oldGrid = `{/* 3D Holographic Grid floor backplate */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(139,92,246,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(139,92,246,0.03)_1px,transparent_1px)] bg-[size:16px_16px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] pointer-events-none" />`;

const newBg = `{/* 3D Holographic Grid floor backplate */}
      {/* Custom Bangladesh Jungle Flowers & Fireworks Background */}
      <div 
        className="absolute inset-0 w-full h-full pointer-events-none opacity-50 mix-blend-screen"
        style={{
          backgroundImage: "url('/jungle_flowers_fireworks_bg_1784837237301.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat"
        }}
      />`;

code = code.replace(oldGrid, newBg);
fs.writeFileSync('src/App.tsx', code);
