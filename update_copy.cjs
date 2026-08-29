const fs = require('fs');

// UserAdsManager.tsx
let userCode = fs.readFileSync('src/UserAdsManager.tsx', 'utf8');
if (!userCode.includes("import { CopyButton }")) {
  userCode = userCode.replace(
    "import { MultiSelect } from './components/MultiSelect';",
    "import { MultiSelect } from './components/MultiSelect';\nimport { CopyButton } from './components/CopyButton';"
  );
}

userCode = userCode.replace(
  '<div className="text-[10px] text-blue-300 font-mono mb-1">ID: {c.id}</div>',
  '<div className="text-[10px] text-blue-300 font-mono mb-1 flex items-center gap-1">ID: {c.id} <CopyButton text={c.id} /></div>'
);

userCode = userCode.replace(
  '<div className="text-[10px] text-slate-500 font-mono mb-2">ID: <span className="text-slate-400">{selectedCampaign?.id}</span></div>',
  '<div className="text-[10px] text-slate-500 font-mono mb-2 flex items-center gap-1">ID: <span className="text-slate-400">{selectedCampaign?.id}</span> {selectedCampaign?.id && <CopyButton text={selectedCampaign.id} />}</div>'
);

fs.writeFileSync('src/UserAdsManager.tsx', userCode);

// AdminAdsManager.tsx
let adminCode = fs.readFileSync('src/AdminAdsManager.tsx', 'utf8');
if (!adminCode.includes("import { CopyButton }")) {
  adminCode = adminCode.replace(
    "import React, { useState, useEffect } from 'react';",
    "import React, { useState, useEffect } from 'react';\nimport { CopyButton } from './components/CopyButton';"
  );
}

adminCode = adminCode.replace(
  '<p className="text-[10px] text-blue-300 font-mono mb-1">ID: {c.id}</p>',
  '<div className="text-[10px] text-blue-300 font-mono mb-1 flex items-center gap-1">ID: {c.id} <CopyButton text={c.id} /></div>'
);

fs.writeFileSync('src/AdminAdsManager.tsx', adminCode);
