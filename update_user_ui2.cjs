const fs = require('fs');

let code = fs.readFileSync('src/UserAdsManager.tsx', 'utf8');

// Replace create mode selects
const createSelectsRegex = /<select\s*value=\{selectedDiv\}[\s\S]*?<\/select>\s*\}\s*<\/div>/;
const createSelectsReplace = `<MultiSelect
                          options={divisionsData}
                          selected={selectedDivs}
                          onChange={(vals: string[]) => { setSelectedDivs(vals); setSelectedDists([]); setSelectedUpas([]); }}
                          placeholder="Select Division(s)"
                        />
                        {selectedDivs.length > 0 && (
                          <MultiSelect
                            options={districtsData}
                            selected={selectedDists}
                            onChange={(vals: string[]) => { setSelectedDists(vals); setSelectedUpas([]); }}
                            placeholder="Select District(s)"
                          />
                        )}
                        {selectedDists.length > 0 && (
                          <MultiSelect
                            options={upazilasData}
                            selected={selectedUpas}
                            onChange={(vals: string[]) => setSelectedUpas(vals)}
                            placeholder="Select Upazila(s)"
                          />
                        )}
                      </div>`;

code = code.replace(createSelectsRegex, createSelectsReplace);

// Update Add Area button disabled state
code = code.replace(
  /disabled=\{!selectedDiv\}/,
  "disabled={selectedDivs.length === 0}"
);
code = code.replace(
  /className=\{`w-full py-2 rounded text-xs font-bold mt-2 \$\{!selectedDiv \? 'bg-slate-700 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500'\}`\}/,
  "className={`w-full py-2 rounded text-xs font-bold mt-2 ${selectedDivs.length === 0 ? 'bg-slate-700 text-slate-500' : 'bg-blue-600 text-white hover:bg-blue-500'}`}"
);

// Replace edit mode selects
const editSelectsRegex = /<div className="grid grid-cols-3 gap-2">\s*<select[\s\S]*?<\/select>\s*\)\}\s*<\/div>/;
const editSelectsReplace = `<div className="grid grid-cols-3 gap-2">
                        <MultiSelect
                          options={divisionsData}
                          selected={editSelectedDivs}
                          onChange={(vals: string[]) => { setEditSelectedDivs(vals); setEditSelectedDists([]); setEditSelectedUpas([]); }}
                          placeholder="Division(s)"
                        />
                        {editSelectedDivs.length > 0 && (
                          <MultiSelect
                            options={editDistrictsData}
                            selected={editSelectedDists}
                            onChange={(vals: string[]) => { setEditSelectedDists(vals); setEditSelectedUpas([]); }}
                            placeholder="District(s)"
                          />
                        )}
                        {editSelectedDists.length > 0 && (
                          <MultiSelect
                            options={editUpazilasData}
                            selected={editSelectedUpas}
                            onChange={(vals: string[]) => setEditSelectedUpas(vals)}
                            placeholder="Upazila(s)"
                          />
                        )}
                      </div>`;

code = code.replace(editSelectsRegex, editSelectsReplace);

// Update Edit Add Area button disabled state
code = code.replace(
  /disabled=\{!editSelectedDiv\}/,
  "disabled={editSelectedDivs.length === 0}"
);
code = code.replace(
  /className=\{`w-full py-1\.5 rounded text-\[10px\] font-bold mt-1 \$\{!editSelectedDiv \? 'bg-slate-800 text-slate-500' : 'bg-slate-700 text-white hover:bg-slate-600'\}`\}/,
  "className={`w-full py-1.5 rounded text-[10px] font-bold mt-1 ${editSelectedDivs.length === 0 ? 'bg-slate-800 text-slate-500' : 'bg-slate-700 text-white hover:bg-slate-600'}`}"
);

fs.writeFileSync('src/UserAdsManager.tsx', code);
