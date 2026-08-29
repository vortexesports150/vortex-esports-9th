const fs = require('fs');

let code = fs.readFileSync('src/App.tsx', 'utf8');

if (!code.includes("import { CopyButton }")) {
  code = code.replace(
    "import React, { useState, useEffect, useRef } from 'react';",
    "import React, { useState, useEffect, useRef } from 'react';\nimport { CopyButton } from './components/CopyButton';"
  );
}

const findText = '<p className="text-[10px] text-slate-300 leading-tight">{notif.message}</p>';
const replaceText = `<p className="text-[10px] text-slate-300 leading-tight">{notif.message}</p>
                                  {notif.campaignId && (
                                    <div className="text-[9px] text-blue-300 font-mono flex items-center gap-1 mt-1">
                                      ID: {notif.campaignId} <CopyButton text={notif.campaignId} />
                                    </div>
                                  )}`;

code = code.split(findText).join(replaceText);

fs.writeFileSync('src/App.tsx', code);
