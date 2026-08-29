const fs = require('fs');

let code = fs.readFileSync('src/AdminAdsManager.tsx', 'utf8');

// 1. Add state variable
code = code.replace(
  "  const [loading, setLoading] = useState(true);",
  "  const [loading, setLoading] = useState(true);\n  const [searchId, setSearchId] = useState('');\n  const [searchResult, setSearchResult] = useState<any>(null);"
);

// 2. Add search handler
const searchLogic = `  const handleSearch = async () => {
    if (!searchId.trim()) {
      setSearchResult(null);
      return;
    }
    setLoading(true);
    try {
      const docRef = doc(db, 'ad_campaigns', searchId.trim());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setSearchResult({ id: docSnap.id, ...docSnap.data() });
      } else {
        alert('Campaign not found!');
        setSearchResult(null);
      }
    } catch(err) {
      console.error(err);
      alert('Error searching');
    } finally {
      setLoading(false);
    }
  };`;

code = code.replace(
  "  const handleSaveSettings = async () => {",
  `${searchLogic}\n\n  const handleSaveSettings = async () => {`
);

// 3. Add to UI
const oldHeader = /<div className="p-4 border-b border-purple-500\/20 bg-slate-900\/50">\s*<h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">\s*<PlayCircle className="h-5 w-5 text-blue-400" \/> Ads Manager\s*<\/h2>\s*<p className="text-\[10px\] text-slate-400 font-mono mt-1">Manage user ad campaigns & pricing<\/p>\s*<\/div>/;

const newHeader = `<div className="p-4 border-b border-purple-500/20 bg-slate-900/50 flex justify-between items-center">
        <div>
          <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-blue-400" /> Ads Manager
          </h2>
          <p className="text-[10px] text-slate-400 font-mono mt-1">Manage user ad campaigns & pricing</p>
        </div>
        <div className="relative">
          <input 
            type="text" 
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            placeholder="Search Campaign ID..."
            className="bg-slate-950 border border-white/10 rounded-lg py-2 pl-3 pr-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 w-48"
          />
          <button 
            onClick={handleSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>`;

code = code.replace(oldHeader, newHeader);

// 4. Update the render list mapping (if searchResult exists, show only searchResult)
const listMapRegex = /const listToRender = activeTab === 'pending' \? pendingList :[\s\S]*?activeTab === 'all'\s*;\s*/;
const listMapReplace = `const listToRender = searchResult ? [searchResult] : (
              activeTab === 'pending' ? pendingList :
              activeTab === 'running' ? runningList :
              activeTab === 'completed' ? completedList :
              activeTab === 'rejected' ? rejectedList :
              allList
            );
            
            if (searchResult) {
              return (
                <div>
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-xs text-emerald-400 font-mono font-bold">Search Result: {searchResult.id}</h3>
                    <button onClick={() => setSearchResult(null)} className="text-[10px] text-slate-400 hover:text-white bg-white/5 px-2 py-1 rounded">Clear Search</button>
                  </div>`;

// Wait, the IIFE structure in AdminAdsManager:
// (() => {
//   const listToRender = ...
//   if (listToRender.length === 0) return ...
//   return listToRender.map(c => ...)
// })()

const targetRender = `            const listToRender = activeTab === 'pending' ? pendingList :
                                 activeTab === 'running' ? runningList :
                                 activeTab === 'completed' ? completedList :
                                 activeTab === 'rejected' ? rejectedList :
                                 allList;`;

const replaceRender = `            const listToRender = searchResult ? [searchResult] : (
                                 activeTab === 'pending' ? pendingList :
                                 activeTab === 'running' ? runningList :
                                 activeTab === 'completed' ? completedList :
                                 activeTab === 'rejected' ? rejectedList :
                                 allList);
                                 
            if (searchResult && listToRender.length > 0) {
              const c = searchResult;
              // Just to add a clear button above the list
            }`;

code = code.replace(targetRender, replaceRender);

const returnMapRegex = /return listToRender\.map\(c => \(/;
const returnMapReplace = `return (
              <>
                {searchResult && (
                  <div className="flex justify-between items-center mb-4 bg-slate-900 border border-emerald-500/30 p-3 rounded-xl">
                    <div className="text-[10px] text-emerald-400 font-mono"><span className="font-bold">Search Result:</span> {searchResult.id}</div>
                    <button onClick={() => { setSearchId(''); setSearchResult(null); }} className="text-[10px] text-slate-400 hover:text-white bg-white/5 px-2 py-1 rounded">Clear</button>
                  </div>
                )}
                {listToRender.map(c => (`

code = code.replace(returnMapRegex, returnMapReplace);

const closingRegex = /\)\);(\s*\}\)\(\)\s*)\}$/;
const closingReplace = `))}\n              </>\n            );\n          })()\n        )}`;

code = code.replace(closingRegex, closingReplace);

fs.writeFileSync('src/AdminAdsManager.tsx', code);
