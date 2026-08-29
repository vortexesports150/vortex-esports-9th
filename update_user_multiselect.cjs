const fs = require('fs');

let code = fs.readFileSync('src/UserAdsManager.tsx', 'utf8');

// Add import
code = code.replace(
  "import { ChevronLeft",
  "import { MultiSelect } from './components/MultiSelect';\nimport { ChevronLeft"
);

// State variables update
const stateRegex = /const \[selectedDiv, setSelectedDiv\] = useState\(''\);\s*const \[selectedDist, setSelectedDist\] = useState\(''\);\s*const \[selectedUpa, setSelectedUpa\] = useState\(''\);/;
const stateReplace = `const [selectedDivs, setSelectedDivs] = useState<string[]>([]);
  const [selectedDists, setSelectedDists] = useState<string[]>([]);
  const [selectedUpas, setSelectedUpas] = useState<string[]>([]);`;

code = code.replace(stateRegex, stateReplace);

const editStateRegex = /const \[editSelectedDiv, setEditSelectedDiv\] = useState\(''\);\s*const \[editSelectedDist, setEditSelectedDist\] = useState\(''\);\s*const \[editSelectedUpa, setEditSelectedUpa\] = useState\(''\);/;
const editStateReplace = `const [editSelectedDivs, setEditSelectedDivs] = useState<string[]>([]);
  const [editSelectedDists, setEditSelectedDists] = useState<string[]>([]);
  const [editSelectedUpas, setEditSelectedUpas] = useState<string[]>([]);`;

code = code.replace(editStateRegex, editStateReplace);

// Data arrays update
const dataRegex = /const divisionsData = Object\.keys\(BD_GEOGRAPHY\);\s*const districtsData = selectedDiv \? Object\.keys\(BD_GEOGRAPHY\[selectedDiv\] \|\| \{\}\) : \[\];\s*const upazilasData = \(selectedDiv && selectedDist\) \? \(BD_GEOGRAPHY\[selectedDiv\]\?\.\[selectedDist\] \|\| \[\]\) : \[\];/;
const dataReplace = `const divisionsData = Object.keys(BD_GEOGRAPHY);
  const districtsData = selectedDivs.flatMap(div => Object.keys(BD_GEOGRAPHY[div] || {}));
  const upazilasData = selectedDivs.flatMap(div => selectedDists.flatMap(dist => BD_GEOGRAPHY[div]?.[dist] || []));`;

code = code.replace(dataRegex, dataReplace);

const editDataRegex = /const editDistrictsData = editSelectedDiv \? Object\.keys\(BD_GEOGRAPHY\[editSelectedDiv\] \|\| \{\}\) : \[\];\s*const editUpazilasData = \(editSelectedDiv && editSelectedDist\) \? \(BD_GEOGRAPHY\[editSelectedDiv\]\?\.\[editSelectedDist\] \|\| \[\]\) : \[\];/;
const editDataReplace = `const editDistrictsData = editSelectedDivs.flatMap(div => Object.keys(BD_GEOGRAPHY[div] || {}));
  const editUpazilasData = editSelectedDivs.flatMap(div => editSelectedDists.flatMap(dist => BD_GEOGRAPHY[div]?.[dist] || []));`;

code = code.replace(editDataRegex, editDataReplace);

// handleAddLocation update
const addLocRegex = /const handleAddLocation = \(\) => \{[\s\S]*?setShowLocationPicker\(false\);\s*\};/;
const addLocReplace = `const handleAddLocation = () => {
    if (selectedDivs.length === 0) return;
    
    const newLocs: any[] = [];
    selectedDivs.forEach(div => {
      const distsInDiv = selectedDists.filter(d => BD_GEOGRAPHY[div]?.[d]);
      if (distsInDiv.length === 0) {
        newLocs.push({ division: div, district: null, upazila: null });
      } else {
        distsInDiv.forEach(dist => {
          const upasInDist = selectedUpas.filter(u => BD_GEOGRAPHY[div]?.[dist]?.includes(u));
          if (upasInDist.length === 0) {
            newLocs.push({ division: div, district: dist, upazila: null });
          } else {
            upasInDist.forEach(upa => {
              newLocs.push({ division: div, district: dist, upazila: upa });
            });
          }
        });
      }
    });

    const merged = [...targetLocations];
    newLocs.forEach(loc => {
      const isDup = merged.some(l => l.division === loc.division && l.district === loc.district && l.upazila === loc.upazila);
      if (!isDup) merged.push(loc);
    });
    
    setTargetLocations(merged);
    setSelectedDivs([]);
    setSelectedDists([]);
    setSelectedUpas([]);
    setShowLocationPicker(false);
  };`;

code = code.replace(addLocRegex, addLocReplace);

// handleAddEditLocation update
const addEditLocRegex = /const handleAddEditLocation = \(\) => \{[\s\S]*?setEditSelectedUpa\(''\);\s*\};/;
const addEditLocReplace = `const handleAddEditLocation = () => {
    if (editSelectedDivs.length === 0) return;
    
    const newLocs: any[] = [];
    editSelectedDivs.forEach(div => {
      const distsInDiv = editSelectedDists.filter(d => BD_GEOGRAPHY[div]?.[d]);
      if (distsInDiv.length === 0) {
        newLocs.push({ division: div, district: null, upazila: null });
      } else {
        distsInDiv.forEach(dist => {
          const upasInDist = editSelectedUpas.filter(u => BD_GEOGRAPHY[div]?.[dist]?.includes(u));
          if (upasInDist.length === 0) {
            newLocs.push({ division: div, district: dist, upazila: null });
          } else {
            upasInDist.forEach(upa => {
              newLocs.push({ division: div, district: dist, upazila: upa });
            });
          }
        });
      }
    });

    const merged = [...editTargetLocations];
    newLocs.forEach(loc => {
      const isDup = merged.some(l => l.division === loc.division && l.district === loc.district && l.upazila === loc.upazila);
      if (!isDup) merged.push(loc);
    });
    
    setEditTargetLocations(merged);
    setEditSelectedDivs([]);
    setEditSelectedDists([]);
    setEditSelectedUpas([]);
  };`;

code = code.replace(addEditLocRegex, addEditLocReplace);

fs.writeFileSync('src/UserAdsManager.tsx', code);
