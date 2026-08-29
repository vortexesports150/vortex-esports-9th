const fs = require('fs');

let code = fs.readFileSync('src/UserAdsManager.tsx', 'utf8');

// 1. Add new state variables
code = code.replace(
  "  // Create Campaign State",
  `  const [searchId, setSearchId] = useState('');
  const [customCampaignId, setCustomCampaignId] = useState('');
  
  // Edit Location State
  const [isEditingLoc, setIsEditingLoc] = useState(false);
  const [editTargetAudienceType, setEditTargetAudienceType] = useState<'all' | 'specific'>('all');
  const [editTargetLocations, setEditTargetLocations] = useState<any[]>([]);
  const [editSelectedDiv, setEditSelectedDiv] = useState('');
  const [editSelectedDist, setEditSelectedDist] = useState('');
  const [editSelectedUpa, setEditSelectedUpa] = useState('');
  const [savingLoc, setSavingLoc] = useState(false);
  const editDistrictsData = editSelectedDiv ? Object.keys(BD_GEOGRAPHY[editSelectedDiv] || {}) : [];
  const editUpazilasData = (editSelectedDiv && editSelectedDist) ? (BD_GEOGRAPHY[editSelectedDiv]?.[editSelectedDist] || []) : [];

  // Create Campaign State`
);

// 2. Search Campaign Logic
const searchFunc = `  const handleSearchCampaign = async () => {
    if (!searchId.trim()) return;
    try {
      const docRef = doc(db, 'ad_campaigns', searchId.trim());
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
         viewStats({ id: docSnap.id, ...docSnap.data() });
         setSearchId('');
      } else {
         alert('Campaign not found with this ID');
      }
    } catch(err) {
      console.error(err);
      alert('Error searching campaign');
    }
  };`;

code = code.replace(
  "  const handleCreate = async () => {",
  `${searchFunc}\n\n  const handleCreate = async () => {`
);

// 3. Edit Location Handlers
const editHandlers = `  const handleAddEditLocation = () => {
    if (!editSelectedDiv) return;
    const loc = {
      division: editSelectedDiv,
      district: editSelectedDist || null,
      upazila: editSelectedUpa || null
    };
    const isDup = editTargetLocations.some(l => l.division === loc.division && l.district === loc.district && l.upazila === loc.upazila);
    if (!isDup) {
      setEditTargetLocations([...editTargetLocations, loc]);
    }
    setEditSelectedDiv('');
    setEditSelectedDist('');
    setEditSelectedUpa('');
  };
  
  const removeEditLocation = (idx: number) => {
    setEditTargetLocations(editTargetLocations.filter((_, i) => i !== idx));
  };
  
  const handleSaveLocationEdit = async () => {
    if (!selectedCampaign) return;
    setSavingLoc(true);
    try {
      const updates = {
        targetAudienceType: editTargetAudienceType,
        targetLocations: editTargetAudienceType === 'specific' ? editTargetLocations : []
      };
      await updateDoc(doc(db, 'ad_campaigns', selectedCampaign.id), updates);
      setSelectedCampaign({ ...selectedCampaign, ...updates });
      setIsEditingLoc(false);
      alert('Location targeting updated successfully!');
      fetchData(); // Refresh list silently
    } catch (err) {
      console.error(err);
      alert('Failed to update location');
    } finally {
      setSavingLoc(false);
    }
  };`;

code = code.replace(
  "  const extractVideoId = (url: string) => {",
  `${editHandlers}\n\n  const extractVideoId = (url: string) => {`
);

// 4. Update Creation logic with custom ID
const oldCreate = `      // Create Campaign
      await addDoc(collection(db, 'ad_campaigns'), {
        advertiserId: user.uid,
        advertiserEmail: user.email,
        advertiserName: user.displayName || 'Unknown',
        videoUrl: \`https://www.youtube.com/watch?v=\${vidId}\`,
        title,
        targetViews: viewsNum,
        targetAudienceType,
        targetLocations: targetAudienceType === 'specific' ? targetLocations : [],
        costPerView: pricing.costPerView,
        totalCost,
        status: 'pending',
        viewsCount: 0,
        createdAt: serverTimestamp()
      });`;

const newCreate = `      const campData = {
        advertiserId: user.uid,
        advertiserEmail: user.email,
        advertiserName: user.displayName || 'Unknown',
        videoUrl: \`https://www.youtube.com/watch?v=\${vidId}\`,
        title,
        targetViews: viewsNum,
        targetAudienceType,
        targetLocations: targetAudienceType === 'specific' ? targetLocations : [],
        costPerView: pricing.costPerView,
        totalCost,
        status: 'pending',
        viewsCount: 0,
        createdAt: serverTimestamp()
      };

      if (customCampaignId.trim()) {
        const cid = customCampaignId.trim().replace(/[^a-zA-Z0-9_-]/g, '');
        if (cid) {
          const cRef = doc(db, 'ad_campaigns', cid);
          const cSnap = await getDoc(cRef);
          if (cSnap.exists()) {
             throw new Error('This Custom Campaign ID is already taken. Please choose another or leave it blank.');
          }
          await setDoc(cRef, campData);
        } else {
          await addDoc(collection(db, 'ad_campaigns'), campData);
        }
      } else {
        await addDoc(collection(db, 'ad_campaigns'), campData);
      }`;

code = code.replace(oldCreate, newCreate);

// Reset custom ID
code = code.replace(
  "      setTargetAudienceType('all');",
  "      setTargetAudienceType('all');\n      setCustomCampaignId('');"
);

// 5. Add Custom ID input to Create View
const createInputsRegex = /<input\s+type="text"\s+value=\{title\}[\s\S]*?<\/div>/;
const createInputsReplace = `<input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. My Awesome Video"
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:border-blue-500/50 focus:outline-none transition"
              />
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest pl-1">Custom Campaign ID (Optional)</label>
              <input
                type="text"
                value={customCampaignId}
                onChange={e => setCustomCampaignId(e.target.value)}
                placeholder="e.g. summer-promo-2026"
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:border-blue-500/50 focus:outline-none transition font-mono"
              />
              <p className="text-[9px] text-slate-500 pl-1 font-mono">Use this to easily search and track your campaign later.</p>
            </div>`;

code = code.replace(createInputsRegex, createInputsReplace);

fs.writeFileSync('src/UserAdsManager.tsx', code);
