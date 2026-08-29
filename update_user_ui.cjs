const fs = require('fs');

let code = fs.readFileSync('src/UserAdsManager.tsx', 'utf8');

const listHeaderRegex = /<h3 className="text-sm font-black text-white uppercase tracking-wider">\s*Ads Manager\s*<\/h3>\s*<p className="text-\[10px\] text-slate-400">Promote your YouTube videos<\/p>\s*<\/div>\s*<\/div>\s*\{view === 'list' && \(\s*<button\s*onClick=\{[^}]+\}\s*className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition"\s*>\s*<Plus className="h-3 w-3" \/> New Ad\s*<\/button>\s*\)\}/;

const listHeaderReplace = `<h3 className="text-sm font-black text-white uppercase tracking-wider">
              Ads Manager
            </h3>
            <p className="text-[10px] text-slate-400">Promote your YouTube videos</p>
          </div>
        </div>
        {view === 'list' && (
          <div className="flex items-center gap-2">
            <div className="relative hidden sm:block">
              <input 
                type="text" 
                value={searchId}
                onChange={e => setSearchId(e.target.value)}
                placeholder="Search Campaign ID..."
                className="bg-slate-900 border border-white/10 rounded-lg py-1.5 pl-3 pr-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-blue-500/50 w-40"
              />
              <button 
                onClick={handleSearchCampaign}
                className="absolute right-1 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                <BarChart2 className="h-3 w-3" />
              </button>
            </div>
            <button
              onClick={() => setView('create')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition"
            >
              <Plus className="h-3 w-3" /> New Ad
            </button>
          </div>
        )}`;

code = code.replace(listHeaderRegex, listHeaderReplace);

// Now Stats view Location logic
// We need to find the stats view header section and add an "Edit Target" button if it's the user's campaign
const statsHeaderRegex = /<h4 className="text-sm font-bold text-white mb-2">\{selectedCampaign\?\.title\}<\/h4>/;

const statsHeaderReplace = `<div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-bold text-white max-w-[200px] line-clamp-2">{selectedCampaign?.title}</h4>
                {selectedCampaign?.advertiserId === user.uid && (selectedCampaign?.status === 'active' || selectedCampaign?.status === 'pending') && (
                  <button 
                    onClick={() => {
                      setIsEditingLoc(!isEditingLoc);
                      if (!isEditingLoc) {
                         setEditTargetAudienceType(selectedCampaign.targetAudienceType || 'all');
                         setEditTargetLocations(selectedCampaign.targetLocations || []);
                      }
                    }}
                    className="text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded border border-white/5 transition flex items-center gap-1"
                  >
                    <MapPin className="h-3 w-3" /> Edit Target
                  </button>
                )}
              </div>
              <div className="text-[10px] text-slate-500 font-mono mb-2">ID: <span className="text-slate-400">{selectedCampaign?.id}</span></div>
              
              {/* EDIT LOCATION UI */}
              {isEditingLoc && (
                <div className="bg-slate-950 p-3 rounded-lg border border-blue-500/30 mb-4 animate-in fade-in slide-in-from-top-2">
                   <h5 className="text-[10px] text-white uppercase font-black mb-2">Edit Audience Location</h5>
                   <div className="flex gap-2 mb-3">
                      <button 
                        onClick={() => setEditTargetAudienceType('all')}
                        className={\`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition \${editTargetAudienceType === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}\`}
                      >
                        All Bangladesh
                      </button>
                      <button 
                        onClick={() => setEditTargetAudienceType('specific')}
                        className={\`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition \${editTargetAudienceType === 'specific' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400'}\`}
                      >
                        Specific Locations
                      </button>
                   </div>
                   
                   {editTargetAudienceType === 'specific' && (
                    <div className="space-y-2 mb-3">
                      {editTargetLocations.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {editTargetLocations.map((loc, idx) => (
                            <div key={idx} className="bg-slate-800 border border-white/10 rounded px-2 py-1 flex items-center gap-1.5">
                              <span className="text-[10px] text-slate-300">
                                {loc.division}{loc.district ? \` > \${loc.district}\` : ''}{loc.upazila ? \` > \${loc.upazila}\` : ''}
                              </span>
                              <button onClick={() => removeEditLocation(idx)} className="text-slate-500 hover:text-red-400">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-3 gap-2">
                        <select
                          value={editSelectedDiv}
                          onChange={e => { setEditSelectedDiv(e.target.value); setEditSelectedDist(''); setEditSelectedUpa(''); }}
                          className="bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white focus:outline-none"
                        >
                          <option value="">Division</option>
                          {divisionsData.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                        
                        {editSelectedDiv && (
                          <select
                            value={editSelectedDist}
                            onChange={e => { setEditSelectedDist(e.target.value); setEditSelectedUpa(''); }}
                            className="bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white focus:outline-none"
                          >
                            <option value="">District (All)</option>
                            {editDistrictsData.map(d => <option key={d} value={d}>{d}</option>)}
                          </select>
                        )}
                        
                        {editSelectedDist && (
                          <select
                            value={editSelectedUpa}
                            onChange={e => setEditSelectedUpa(e.target.value)}
                            className="bg-slate-900 border border-white/10 rounded px-2 py-1.5 text-[10px] text-white focus:outline-none"
                          >
                            <option value="">Upazila (All)</option>
                            {editUpazilasData.map(u => <option key={u} value={u}>{u}</option>)}
                          </select>
                        )}
                      </div>
                      
                      <button 
                        onClick={handleAddEditLocation}
                        disabled={!editSelectedDiv}
                        className={\`w-full py-1.5 rounded text-[10px] font-bold mt-1 \${!editSelectedDiv ? 'bg-slate-800 text-slate-500' : 'bg-slate-700 text-white hover:bg-slate-600'}\`}
                      >
                        Add Area
                      </button>
                    </div>
                   )}
                   
                   <div className="flex gap-2 mt-3 pt-3 border-t border-white/10">
                     <button 
                       onClick={handleSaveLocationEdit}
                       disabled={savingLoc}
                       className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white py-1.5 rounded text-[10px] font-bold uppercase tracking-wider flex justify-center items-center gap-1"
                     >
                       {savingLoc ? <RefreshCw className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />} Save Target
                     </button>
                     <button 
                       onClick={() => setIsEditingLoc(false)}
                       className="px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider"
                     >
                       Cancel
                     </button>
                   </div>
                </div>
              )}`;

code = code.replace(statsHeaderRegex, statsHeaderReplace);

fs.writeFileSync('src/UserAdsManager.tsx', code);
