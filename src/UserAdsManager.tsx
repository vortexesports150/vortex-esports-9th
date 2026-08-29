import BD_GEOGRAPHY from './lib/geography';
import React, { useState, useEffect } from 'react';
import { collection, increment, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, getDoc, orderBy, setDoc, runTransaction } from 'firebase/firestore';
import { motion, AnimatePresence } from 'framer-motion';
import { MultiSelect } from './components/MultiSelect';
import { CopyButton } from './components/CopyButton';
import { ChevronLeft, Plus, BarChart2, AlertCircle, PlayCircle, Clock, MapPin, X, CheckCircle, RefreshCw, Eye, Coins } from 'lucide-react';

export function UserAdsManager({ db, user, onBack }: { db: any, user: any, onBack: () => void }) {
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'list' | 'create' | 'stats'>('list');
  const [pricing, setPricing] = useState<any>({ costPerView: 0.1, rewardPerView: 0.05, minTokensForCampaign: 10 });
  const [userTokens, setUserTokens] = useState(0);

  const [searchId, setSearchId] = useState('');
  
  // Edit Location State
  const [isEditingLoc, setIsEditingLoc] = useState(false);
  const [editTargetAudienceType, setEditTargetAudienceType] = useState<'all' | 'specific'>('all');
  const [editTargetLocations, setEditTargetLocations] = useState<any[]>([]);
  const [editSelectedDivs, setEditSelectedDivs] = useState<string[]>([]);
  const [editSelectedDists, setEditSelectedDists] = useState<string[]>([]);
  const [editSelectedUpas, setEditSelectedUpas] = useState<string[]>([]);
  const [savingLoc, setSavingLoc] = useState(false);
  const editDistrictsData = editSelectedDivs.flatMap(div => Object.keys(BD_GEOGRAPHY[div] || {}));
  const editUpazilasData = editSelectedDivs.flatMap(div => editSelectedDists.flatMap(dist => BD_GEOGRAPHY[div]?.[dist] || []));

  // Create Campaign State
  const [videoUrl, setVideoUrl] = useState('');
  const [title, setTitle] = useState('');
  const [targetTokens, setTargetTokens] = useState<number | ''>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Location Targeting State
  const [targetAudienceType, setTargetAudienceType] = useState<'all' | 'specific'>('all');
  const [targetLocations, setTargetLocations] = useState<any[]>([]);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedDivs, setSelectedDivs] = useState<string[]>([]);
  const [selectedDists, setSelectedDists] = useState<string[]>([]);
  const [selectedUpas, setSelectedUpas] = useState<string[]>([]);
  const [loadingLoc, setLoadingLoc] = useState(false);
  const divisionsData = Object.keys(BD_GEOGRAPHY);
  const districtsData = selectedDivs.flatMap(div => Object.keys(BD_GEOGRAPHY[div] || {}));
  const upazilasData = selectedDivs.flatMap(div => selectedDists.flatMap(dist => BD_GEOGRAPHY[div]?.[dist] || []));

  // Stats State
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [campaignViews, setCampaignViews] = useState<any[]>([]);
  const [loadingViews, setLoadingViews] = useState(false);

  useEffect(() => {
    fetchData();
  }, [user.uid]);

  const fetchData = async () => {
    const uid = user?.uid || user?.userId || user?.id;
    if (!uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      // Get Pricing
      const pricingSnap = await getDoc(doc(db, 'system_config', 'ads_pricing'));
      if (pricingSnap.exists()) {
        setPricing(pricingSnap.data() as any);
      }
      // Get User Tokens
      const userSnap = await getDoc(doc(db, 'users', uid));
      if (userSnap.exists()) {
        setUserTokens(userSnap.data().tokens || 0);
      }
      // Get User Campaigns
      const q = query(collection(db, 'ad_campaigns'), where('advertiserId', '==', uid));
      const snap = await getDocs(q);
      const list: any[] = [];
      snap.forEach(d => list.push({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setCampaigns(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddLocation = () => {
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
  };

  const removeLocation = (idx: number) => {
    setTargetLocations(targetLocations.filter((_, i) => i !== idx));
  };

  const handleAddEditLocation = () => {
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
  };
  
  const removeEditLocation = (idx: number) => {
    setEditTargetLocations(editTargetLocations.filter((_, i) => i !== idx));
  };
  
  const handleSaveLocationEdit = async () => {
    if (!selectedCampaign) return;
    setSavingLoc(true);
    const action = async () => {
      const updates = {
        targetAudienceType: editTargetAudienceType,
        targetLocations: editTargetAudienceType === 'specific' ? editTargetLocations : []
      };
      await updateDoc(doc(db, 'ad_campaigns', selectedCampaign.id), updates);
      setSelectedCampaign({ ...selectedCampaign, ...updates });
      setIsEditingLoc(false);
      alert('Location targeting updated successfully!');
      fetchData(); // Refresh list silently
    };

    try {
      if ((window as any).runWithProgress) {
        await (window as any).runWithProgress('Updating Targeting Locations', action);
      } else {
        await action();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to update location');
    } finally {
      setSavingLoc(false);
    }
  };

  const extractVideoId = (url: string) => {
    const trimmed = url.trim();
    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }
    const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/|live\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = trimmed.match(regExp);
    return match ? match[1] : null;
  };

  const handleSearchCampaign = async () => {
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
  };

  const handleCreate = async () => {
    setError('');
    if (!videoUrl || !title || !targetTokens) {
      setError('Please fill in all fields');
      return;
    }
    
    const tokensNum = Number(targetTokens);
    if (isNaN(tokensNum) || tokensNum < (pricing.minTokensForCampaign || 10)) {
      setError(`Minimum ${pricing.minTokensForCampaign || 10} tokens required`);
      return;
    }
    const vidId = extractVideoId(videoUrl);
    if (!vidId) {
      setError('Invalid YouTube URL');
      return;
    }
    const totalCost = tokensNum;
    const viewsNum = Math.floor(tokensNum / pricing.costPerView);
    if (userTokens < totalCost) {
      setError(`Insufficient tokens. You need ${totalCost} tokens.`);
      return;
    }

    setIsSubmitting(true);
    const action = async () => {
      // Deduct tokens
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        tokens: userTokens - totalCost,
        updatedAt: serverTimestamp()
      });

      let newSerial = 1;
      const counterRef = doc(db, 'system', 'campaign_counter');
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists()) {
          transaction.set(counterRef, { count: 1 });
          newSerial = 1;
        } else {
          newSerial = (counterDoc.data().count || 0) + 1;
          transaction.update(counterRef, { count: newSerial });
        }
      });

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const year = now.getFullYear();
      const month = pad(now.getMonth() + 1);
      const day = pad(now.getDate());
      const hours = pad(now.getHours());
      const mins = pad(now.getMinutes());
      const secs = pad(now.getSeconds());
      const serialStr = pad(newSerial);
      
      const generatedId = `CAMP-${year}${month}${day}-${hours}${mins}${secs}-${serialStr}`;

      // Add transaction history for user
      await addDoc(collection(db, 'users', user.uid, 'tokenTransactions'), {
        amount: totalCost,
        type: 'sent',
        reason: 'Ad Campaign Creation',
        otherUserEmail: 'System (Ads)',
        otherUserName: 'System',
        campaignId: generatedId,
        campaignTitle: title,
        createdAt: serverTimestamp()
      });

      // Add to Campaign Wallet immediately upon creation
      const walletRef = doc(db, 'system', 'wallets');
      await updateDoc(walletRef, {
        campaignWallet: increment(totalCost)
      });
      
      await addDoc(collection(db, 'system', 'wallets', 'history'), {
        walletType: 'campaignWallet',
        amountAdded: totalCost,
        advertiserId: user.uid,
        advertiserEmail: user.email,
        campaignId: generatedId,
        campaignTitle: title,
        type: 'addition',
        reason: 'Ad Campaign Created',
        createdAt: serverTimestamp()
      });

      // Notify Admin
      await addDoc(collection(db, 'admin_notifications'), {
        title: 'New Ad Campaign Request',
        message: `${user.displayName || user.email} submitted a new ad campaign (ID: ${generatedId}) for ${viewsNum} views.`,
        campaignId: generatedId,
        type: 'ad_campaign',
        advertiserId: user.uid,
        isRead: false,
        createdAt: serverTimestamp()
      });


      const campData = {
        advertiserId: user.uid,
        advertiserEmail: user.email,
        advertiserName: user.displayName || 'Unknown',
        videoUrl: `https://www.youtube.com/watch?v=${vidId}`,
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

      await setDoc(doc(db, 'ad_campaigns', generatedId), campData);

      await fetchData();
      setView('list');
      setVideoUrl('');
      setTitle('');
      setTargetTokens('');
      setTargetAudienceType('all');
      setTargetLocations([]);
    };

    try {
      if ((window as any).runWithProgress) {
        await (window as any).runWithProgress('Creating Your Ad Campaign', action);
      } else {
        await action();
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to create campaign: ' + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const viewStats = async (campaign: any) => {
    setSelectedCampaign(campaign);
    setView('stats');
    setLoadingViews(true);
    try {
      const q = query(collection(db, 'ad_campaigns', campaign.id, 'views'), orderBy('timestamp', 'desc'));
      const snap = await getDocs(q);
      const viewsList: any[] = [];
      snap.forEach(d => viewsList.push({ id: d.id, ...d.data() }));
      setCampaignViews(viewsList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingViews(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#04060e] text-white">
      {/* Header */}
      <div className="flex items-center justify-between gap-2 mb-4 px-4 pt-4 shrink-0 border-b border-white/5 pb-4">
        <div className="flex items-center gap-3">
          <button 
            onClick={() => {
              if (view !== 'list') setView('list');
              else onBack();
            }}
            className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-300 transition cursor-pointer"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">
              {view === 'list' ? 'My Ad Campaigns' : view === 'create' ? 'New Campaign' : 'Campaign Stats'}
            </h3>
            <p className="text-[10px] text-slate-400">Promote your YouTube videos</p>
          </div>
        </div>
        {view === 'list' && (
          <button
            onClick={() => setView('create')}
            className="bg-cyan-600 hover:bg-cyan-500 text-white px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-1 transition"
          >
            <Plus className="h-3 w-3" /> New Ad
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-10 space-y-4 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center items-center py-10 text-cyan-400">
            <RefreshCw className="h-6 w-6 animate-spin" />
          </div>
        ) : view === 'list' ? (
          <>
            {campaigns.length === 0 ? (
              <div className="text-center py-12 px-4 bg-slate-900/50 rounded-2xl border border-white/5">
                <PlayCircle className="h-12 w-12 text-cyan-500/30 mx-auto mb-3" />
                <h4 className="text-white font-bold text-sm mb-1">No Campaigns Yet</h4>
                <p className="text-slate-400 text-xs mb-4">Create your first ad campaign to get views on your YouTube videos.</p>
                <button
                  onClick={() => setView('create')}
                  className="bg-cyan-600/20 text-cyan-400 hover:bg-cyan-600/30 border border-cyan-500/30 px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider mx-auto flex items-center gap-2 transition"
                >
                  <Plus className="h-3.5 w-3.5" /> Create Campaign
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {campaigns.map(c => (
                  <div key={c.id} className="bg-slate-900 border border-white/10 rounded-xl p-4 shadow-lg relative overflow-hidden">
                    <div className="flex justify-between items-start mb-3">
                      <div className="pr-16">
                        <h4 className="text-sm font-bold text-white mb-1 line-clamp-1">{c.title}</h4>
                        <div className="text-[10px] text-cyan-300 font-mono mb-1 flex items-center gap-1">ID: {c.id} <CopyButton text={c.id} /></div>
                        <a href={c.videoUrl} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 hover:underline font-mono truncate block max-w-xs">
                          {c.videoUrl}
                        </a>
                        {c.startedAt && <div className="text-[9px] text-slate-400 font-mono mt-1">Started: {new Date(c.startedAt.seconds * 1000).toLocaleString()}</div>}
                      </div>
                      <div className="absolute top-4 right-4">
                        <span className={`text-[9px] font-bold uppercase tracking-widest px-2 py-1 rounded-md border ${
                          c.status === 'pending' ? 'bg-orange-500/10 text-orange-400 border-orange-500/20' :
                          c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                          c.status === 'paused' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                          c.status === 'completed' ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20' :
                          'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {c.status}
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 mb-3">
                      <div className="bg-slate-950/50 p-2 rounded-lg border border-white/5">
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Views</div>
                        <div className="text-xs font-mono text-white"><span className="text-emerald-400">{c.viewsCount}</span> / {c.targetViews}</div>
                      </div>
                      <div className="bg-slate-950/50 p-2 rounded-lg border border-white/5">
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Cost</div>
                        <div className="text-xs font-mono text-orange-400">{c.totalCost} 🪙</div>
                      </div>
                      <div className="bg-slate-950/50 p-2 rounded-lg border border-white/5">
                        <div className="text-[9px] text-slate-500 uppercase font-black tracking-widest mb-0.5">Date</div>
                        <div className="text-xs font-mono text-slate-300">
                          {c.createdAt ? new Date(c.createdAt.seconds * 1000).toLocaleDateString() : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {c.status === 'rejected' && c.rejectionReason && (
                      <div className="mb-3 p-2 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <p className="text-[10px] text-red-400"><span className="font-bold">Reason:</span> {c.rejectionReason}</p>
                        <p className="text-[9px] text-red-300 mt-1 opacity-80">Tokens were refunded to your account.</p>
                      </div>
                    )}

                    <div className="flex gap-2">
                      <button
                        onClick={() => viewStats(c)}
                        className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition"
                      >
                        <BarChart2 className="h-3.5 w-3.5" /> View Stats
                      </button>
                    </div>
                    
                    {/* Progress Bar for Active/Paused/Completed */}
                    {(c.status === 'active' || c.status === 'paused' || c.status === 'completed') && (
                      <div className="absolute bottom-0 left-0 right-0 h-1 bg-slate-800">
                        <div 
                          className="h-full bg-cyan-500 transition-all duration-1000" 
                          style={{ width: `${Math.min((c.viewsCount / c.targetViews) * 100, 100)}%` }}
                        ></div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        ) : view === 'create' ? (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4 max-w-sm mx-auto">
            <div className="bg-cyan-500/10 border border-cyan-500/30 rounded-xl p-4 mb-4">
              <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                <Coins className="h-4 w-4" /> Pricing Info
              </h4>
              <div className="flex justify-between items-center text-sm font-mono border-b border-cyan-500/10 pb-2 mb-2">
                <span className="text-slate-300">Cost per View:</span>
                <span className="text-white">{pricing.costPerView} Tokens</span>
              </div>
              <div className="flex justify-between items-center text-sm font-mono">
                <span className="text-slate-300">Your Balance:</span>
                <span className="text-orange-400 font-bold">{userTokens} Tokens</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
                <span className="text-xs text-red-400 font-bold">{error}</span>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest pl-1">Video Title</label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. My Awesome Video"
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none transition"
              />
            </div>
            
            
            
            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest pl-1">YouTube URL</label>
              <input
                type="text"
                value={videoUrl}
                onChange={e => setVideoUrl(e.target.value)}
                placeholder="https://www.youtube.com/watch?v=..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none transition font-mono"
              />
            </div>

            {/* Location Targeting */}
            <div className="space-y-3 border border-white/5 bg-slate-900/50 p-3 rounded-xl">
              <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest pl-1">Audience Location</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setTargetAudienceType('all')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${targetAudienceType === 'all' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  All Bangladesh
                </button>
                <button
                  onClick={() => setTargetAudienceType('specific')}
                  className={`flex-1 py-2 rounded-lg text-xs font-bold transition ${targetAudienceType === 'specific' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'}`}
                >
                  Specific Areas
                </button>
              </div>
              
              {targetAudienceType === 'specific' && (
                <div className="space-y-2 mt-2">
                  {targetLocations.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {targetLocations.map((loc, idx) => (
                        <div key={idx} className="bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-[10px] py-1 px-2 rounded flex items-center gap-1">
                          <span>
                            {loc.division} 
                            {loc.district && ` > ${loc.district}`} 
                            {loc.upazila && ` > ${loc.upazila}`}
                          </span>
                          <button onClick={() => removeLocation(idx)} className="hover:text-white"><X className="h-3 w-3" /></button>
                        </div>
                      ))}
                    </div>
                  )}

                  {!showLocationPicker ? (
                    <button 
                      onClick={() => setShowLocationPicker(true)}
                      className="w-full py-2 border border-dashed border-slate-600 rounded-lg text-xs text-slate-400 hover:text-white hover:border-slate-400 transition flex justify-center items-center gap-1"
                    >
                      <Plus className="h-3.5 w-3.5" /> Add Location Target
                    </button>
                  ) : (
                    <div className="bg-slate-800 p-3 rounded-lg space-y-2 relative">
                      <button onClick={() => setShowLocationPicker(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white"><X className="h-4 w-4" /></button>
                      <div className="text-[10px] font-bold text-white mb-2 flex justify-between items-center">
                        <span>Select Area</span>
                        {loadingLoc && <RefreshCw className="h-3 w-3 animate-spin text-cyan-400" />}
                      </div>
                      
                      <MultiSelect
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
                          placeholder="Select District(s) (Optional)"
                        />
                      )}
                      {selectedDists.length > 0 && (
                        <MultiSelect
                          options={upazilasData}
                          selected={selectedUpas}
                          onChange={(vals: string[]) => setSelectedUpas(vals)}
                          placeholder="Select Upazila(s) (Optional)"
                        />
                      )}
                      <button 
                        onClick={handleAddLocation}
                        disabled={selectedDivs.length === 0}
                        className={`w-full py-2 rounded text-xs font-bold mt-2 ${selectedDivs.length === 0 ? 'bg-slate-700 text-slate-500' : 'bg-cyan-600 text-white hover:bg-cyan-500'}`}
                      >
                        Add Area
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] text-slate-400 uppercase font-black tracking-widest pl-1">Target Budget (Min: {pricing.minTokensForCampaign || 10} Tokens)</label>
              <input
                type="number"
                value={targetTokens}
                onChange={e => setTargetTokens(e.target.value ? Number(e.target.value) : '')}
                placeholder="e.g. 20"
                min={pricing.minTokensForCampaign || 10}
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:border-cyan-500/50 focus:outline-none transition font-mono"
              />
            </div>
            {targetTokens && typeof targetTokens === 'number' && targetTokens >= (pricing.minTokensForCampaign || 10) && (
              <div className="bg-slate-900 border border-emerald-500/30 rounded-xl p-4 text-center mt-2">
                <span className="text-xs text-slate-400 uppercase tracking-wider block mb-1">Estimated Views Target</span>
                <span className="text-2xl font-black font-mono text-emerald-400 block">{Math.floor(targetTokens / pricing.costPerView)} <span className="text-sm font-sans text-slate-500">Views</span></span>
              </div>
            )}

            <button
              onClick={handleCreate}
              disabled={isSubmitting}
              className={`w-full py-3.5 rounded-xl text-sm font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition shadow-lg mt-6
                ${isSubmitting ? 'bg-slate-800 text-slate-500 cursor-not-allowed' : 'bg-cyan-600 text-white hover:bg-cyan-500 shadow-cyan-500/20'}`}
            >
              {isSubmitting ? <RefreshCw className="h-4 w-4 animate-spin" /> : <PlayCircle className="h-4 w-4" />}
              Submit Campaign
            </button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="bg-slate-900 border border-white/10 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-bold text-white max-w-[200px] line-clamp-2">{selectedCampaign?.title}</h4>
                {selectedCampaign?.advertiserId === user.uid && (selectedCampaign?.status === 'active' || selectedCampaign?.status === 'pending' || selectedCampaign?.status === 'paused') && (
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
              <div className="text-[10px] text-slate-500 font-mono mb-2 flex items-center gap-1">ID: <span className="text-slate-400">{selectedCampaign?.id}</span> {selectedCampaign?.id && <CopyButton text={selectedCampaign.id} />}</div>
              
              {/* EDIT LOCATION UI */}
              {isEditingLoc && (
                <div className="bg-slate-950 p-3 rounded-lg border border-cyan-500/30 mb-4 animate-in fade-in slide-in-from-top-2">
                   <h5 className="text-[10px] text-white uppercase font-black mb-2">Edit Audience Location</h5>
                   <div className="flex gap-2 mb-3">
                      <button 
                        onClick={() => setEditTargetAudienceType('all')}
                        className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition ${editTargetAudienceType === 'all' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}
                      >
                        All Bangladesh
                      </button>
                      <button 
                        onClick={() => setEditTargetAudienceType('specific')}
                        className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase transition ${editTargetAudienceType === 'specific' ? 'bg-cyan-600 text-white' : 'bg-slate-800 text-slate-400'}`}
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
                                {loc.division}{loc.district ? ` > ${loc.district}` : ''}{loc.upazila ? ` > ${loc.upazila}` : ''}
                              </span>
                              <button onClick={() => removeEditLocation(idx)} className="text-slate-500 hover:text-red-400">
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      <div className="grid grid-cols-3 gap-2">
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
                      </div>
                      
                      <button 
                        onClick={handleAddEditLocation}
                        disabled={editSelectedDivs.length === 0}
                        className={`w-full py-1.5 rounded text-[10px] font-bold mt-1 ${editSelectedDivs.length === 0 ? 'bg-slate-800 text-slate-500' : 'bg-slate-700 text-white hover:bg-slate-600'}`}
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
              )}
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400">Total Views</span>
                <span className="text-white"><span className="text-emerald-400">{selectedCampaign?.viewsCount}</span> / {selectedCampaign?.targetViews}</span>
              </div>
              <div className="h-2 bg-slate-950 rounded-full mt-3 overflow-hidden">
                <div 
                  className="h-full bg-cyan-500 transition-all duration-1000" 
                  style={{ width: `${Math.min(((selectedCampaign?.viewsCount || 0) / (selectedCampaign?.targetViews || 1)) * 100, 100)}%` }}
                ></div>
              </div>
            </div>

            <h5 className="text-[10px] text-slate-500 uppercase font-black tracking-widest pl-1 mt-6 border-b border-white/5 pb-2">View Log</h5>
            
            {loadingViews ? (
              <div className="flex justify-center py-6">
                <RefreshCw className="h-5 w-5 text-slate-500 animate-spin" />
              </div>
            ) : campaignViews.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-xs font-mono">No views recorded yet.</div>
            ) : (
              <div className="space-y-2">
                {campaignViews.map(v => (
                  <div key={v.id} className="bg-slate-900 border border-white/5 rounded-xl p-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="text-xs font-bold text-slate-300">{v.viewerName || v.viewerEmail || 'Anonymous Viewer'}</div>
                      <div className="text-[9px] text-slate-500 font-mono">
                        {v.timestamp ? new Date(v.timestamp.seconds * 1000).toLocaleString() : 'Just now'}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                      <MapPin className="h-3 w-3 text-emerald-400/70" />
                      {v.location || 'Unknown Location'}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
