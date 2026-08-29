const fs = require('fs');

let code = fs.readFileSync('src/AdminAdsManager.tsx', 'utf8');

const oldTabsRegex = /<div className="flex items-center gap-2 p-3 overflow-x-auto custom-scrollbar border-b border-white\/5 shrink-0">[\s\S]*?<\/div>/;

const newTabs = `<div className="flex items-center gap-2 p-3 overflow-x-auto custom-scrollbar border-b border-white/5 shrink-0">
        <button
          onClick={() => setActiveTab('pending')}
          className={\`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors \${activeTab === 'pending' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400 hover:bg-white/5'}\`}
        >
          Pending ({pendingList.length})
        </button>
        <button
          onClick={() => setActiveTab('running')}
          className={\`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors \${activeTab === 'running' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:bg-white/5'}\`}
        >
          Running ({runningList.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={\`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors \${activeTab === 'completed' ? 'bg-blue-500/20 text-blue-400' : 'text-slate-400 hover:bg-white/5'}\`}
        >
          Completed ({completedList.length})
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={\`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors \${activeTab === 'rejected' ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:bg-white/5'}\`}
        >
          Rejected ({rejectedList.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={\`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors \${activeTab === 'all' ? 'bg-purple-500/20 text-purple-400' : 'text-slate-400 hover:bg-white/5'}\`}
        >
          All ({allList.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={\`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors \${activeTab === 'settings' ? 'bg-slate-500/20 text-white' : 'text-slate-400 hover:bg-white/5'}\`}
        >
          Settings
        </button>
      </div>`;

code = code.replace(oldTabsRegex, newTabs);

fs.writeFileSync('src/AdminAdsManager.tsx', code);
