import React, { useState, useEffect } from 'react';
import { CopyButton } from './components/CopyButton';
import { collection, query, getDocs, updateDoc, doc, serverTimestamp, getDoc, setDoc, increment, orderBy, addDoc } from 'firebase/firestore';
import { motion } from 'framer-motion';
import { X, Check, CheckCircle, AlertCircle, RefreshCw, Settings, PlayCircle, Search, MapPin, DollarSign, Coins, BarChart2, ChevronLeft, Pause, Play } from 'lucide-react';

export function AdminAdsManager({ db }: { db: any }) {
  const [activeTab, setActiveTab] = useState<'pending' | 'running' | 'completed' | 'rejected' | 'all' | 'settings'>('pending');
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<any>(null);
  
  // Settings
  const [pricing, setPricing] = useState({ costPerView: 0.1, rewardPerView: 0.05, minTokensForCampaign: 50 });
  const [savingSettings, setSavingSettings] = useState(false);

  // Action State
  const [actionId, setActionId] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // Stats State
  const [selectedCampaign, setSelectedCampaign] = useState<any>(null);
  const [loadingViews, setLoadingViews] = useState(false);
  const [campaignViews, setCampaignViews] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Pricing
      const pSnap = await getDoc(doc(db, 'system_config', 'ads_pricing'));
      if (pSnap.exists()) {
        setPricing(pSnap.data() as any);
      } else {
        await setDoc(doc(db, 'system_config', 'ads_pricing'), pricing);
      }

      // Campaigns
      const cSnap = await getDocs(query(collection(db, 'ad_campaigns'), orderBy('createdAt', 'desc')));
      const list: any[] = [];
      cSnap.forEach(d => list.push({ id: d.id, ...d.data() }));
      setCampaigns(list);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
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
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    try {
      await setDoc(doc(db, 'system_config', 'ads_pricing'), pricing);
      alert('Pricing settings saved!');
    } catch (err) {
      console.error(err);
      alert('Failed to save settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleApprove = async (campaign: any) => {
    setActionId(campaign.id);
    const action = async () => {
      // Update campaign status
      await updateDoc(doc(db, 'ad_campaigns', campaign.id), {
        status: 'active',
        startedAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      // Add to Campaign Wallet
      const walletRef = doc(db, 'system', 'wallets');
      await updateDoc(walletRef, {
        campaignWallet: increment(campaign.totalCost)
      });
      
      // Log wallet transaction
      await addDoc(collection(db, 'system', 'wallets', 'history'), {
        walletType: 'campaignWallet',
        amountAdded: campaign.totalCost,
        advertiserId: campaign.advertiserId,
        advertiserEmail: campaign.advertiserEmail,
        type: 'addition',
        reason: `Ad Campaign Approved: ${campaign.title}`,
        createdAt: serverTimestamp()
      });

      // Notify Advertiser
      await addDoc(collection(db, 'users', campaign.advertiserId, 'notifications'), {
        title: 'Ad Campaign Approved! 🎉',
        message: `Your ad campaign "${campaign.title}" (ID: ${campaign.id}) is now running!`,
        campaignId: campaign.id,
        type: 'ad_approved',
        isRead: false,
        createdAt: serverTimestamp()
      });

      await fetchData();
    };

    try {
      if ((window as any).runWithProgress) {
        await (window as any).runWithProgress('Approving Ad Campaign', action);
      } else {
        await action();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to approve campaign');
    } finally {
      setActionId('');
    }
  };

  const handleReject = async (campaign: any) => {
    if (!rejectReason.trim()) {
      alert('Please provide a reason for rejection.');
      return;
    }
    setActionId(campaign.id);
    const action = async () => {
      // Refund tokens
      const userRef = doc(db, 'users', campaign.advertiserId);
      await updateDoc(userRef, {
        tokens: increment(campaign.totalCost)
      });

      // Deduct from campaignWallet in system/wallets
      const walletRef = doc(db, 'system', 'wallets');
      await updateDoc(walletRef, {
        campaignWallet: increment(-campaign.totalCost)
      });

      // Add to campaignWallet system history log
      await addDoc(collection(db, 'system', 'wallets', 'history'), {
        walletType: 'campaignWallet',
        amountDeducted: campaign.totalCost,
        advertiserId: campaign.advertiserId,
        advertiserEmail: campaign.advertiserEmail,
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        type: 'deduction',
        reason: 'Ad Campaign Rejected (Refunded to Advertiser)',
        createdAt: serverTimestamp()
      });

      // Update campaign
      await updateDoc(doc(db, 'ad_campaigns', campaign.id), {
        status: 'rejected',
        rejectionReason: rejectReason,
        updatedAt: serverTimestamp()
      });

      // Transaction log
      await addDoc(collection(db, 'users', campaign.advertiserId, 'tokenTransactions'), {
        amount: campaign.totalCost,
        type: 'received',
        reason: 'Ad Campaign Rejected (Refund)',
        otherUserEmail: 'System',
        campaignId: campaign.id,
        campaignTitle: campaign.title,
        createdAt: serverTimestamp()
      });

      // Notify Advertiser
      await addDoc(collection(db, 'users', campaign.advertiserId, 'notifications'), {
        title: 'Ad Campaign Rejected ❌',
        message: `Your ad campaign "${campaign.title}" (ID: ${campaign.id}) was rejected. Reason: ${rejectReason}. Your ${campaign.totalCost} tokens have been refunded.`,
        campaignId: campaign.id,
        type: 'ad_rejected',
        isRead: false,
        createdAt: serverTimestamp()
      });

      setRejectReason('');
      await fetchData();
    };

    try {
      if ((window as any).runWithProgress) {
        await (window as any).runWithProgress('Rejecting Ad Campaign', action);
      } else {
        await action();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to reject campaign');
    } finally {
      setActionId('');
    }
  };

  const viewStats = async (campaign: any) => {
    setSelectedCampaign(campaign);
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

  const handlePause = async (campaign: any) => {
    setActionId(campaign.id);
    const action = async () => {
      await updateDoc(doc(db, 'ad_campaigns', campaign.id), {
        status: 'paused',
        updatedAt: serverTimestamp()
      });
      
      // Notify Advertiser
      await addDoc(collection(db, 'users', campaign.advertiserId, 'notifications'), {
        title: 'Ad Campaign Paused ⏸️',
        message: `Your ad campaign "${campaign.title}" (ID: ${campaign.id}) has been paused by an admin. It will not receive views while paused.`,
        campaignId: campaign.id,
        type: 'ad_paused',
        isRead: false,
        createdAt: serverTimestamp()
      });

      await fetchData();
    };

    try {
      if ((window as any).runWithProgress) {
        await (window as any).runWithProgress('Pausing Ad Campaign', action);
      } else {
        await action();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to pause campaign');
    } finally {
      setActionId('');
    }
  };

  const handleResume = async (campaign: any) => {
    setActionId(campaign.id);
    const action = async () => {
      await updateDoc(doc(db, 'ad_campaigns', campaign.id), {
        status: 'active',
        updatedAt: serverTimestamp()
      });
      
      // Notify Advertiser
      await addDoc(collection(db, 'users', campaign.advertiserId, 'notifications'), {
        title: 'Ad Campaign Resumed ▶️',
        message: `Your ad campaign "${campaign.title}" (ID: ${campaign.id}) has been resumed by an admin. It is now active again and receiving views.`,
        campaignId: campaign.id,
        type: 'ad_resumed',
        isRead: false,
        createdAt: serverTimestamp()
      });

      await fetchData();
    };

    try {
      if ((window as any).runWithProgress) {
        await (window as any).runWithProgress('Resuming Ad Campaign', action);
      } else {
        await action();
      }
    } catch (err) {
      console.error(err);
      alert('Failed to resume campaign');
    } finally {
      setActionId('');
    }
  };

  const pendingList = campaigns.filter(c => c.status === 'pending');
  const runningList = campaigns.filter(c => c.status === 'active' || c.status === 'paused');
  const completedList = campaigns.filter(c => c.status === 'completed');
  const rejectedList = campaigns.filter(c => c.status === 'rejected');
  const allList = campaigns;

  return (
    <div className="w-full flex flex-col h-full bg-[#040b16]">
      <div className="p-4 border-b border-cyan-500/20 bg-slate-900/50 flex justify-between items-center">
        <div>
          <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-cyan-400" /> Ads Manager
          </h2>
          <p className="text-[10px] text-slate-400 font-mono mt-1">Manage user ad campaigns & pricing</p>
        </div>
        <div className="relative">
          <input 
            type="text" 
            value={searchId}
            onChange={e => setSearchId(e.target.value)}
            placeholder="Search Campaign ID..."
            className="bg-slate-950 border border-white/10 rounded-lg py-2 pl-3 pr-8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 w-48"
          />
          <button 
            onClick={handleSearch}
            className="absolute right-1 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-white"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 overflow-x-auto custom-scrollbar border-b border-white/5 shrink-0">
        <button
          onClick={() => setActiveTab('pending')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'pending' ? 'bg-orange-500/20 text-orange-400' : 'text-slate-400 hover:bg-white/5'}`}
        >
          Pending ({pendingList.length})
        </button>
        <button
          onClick={() => setActiveTab('running')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'running' ? 'bg-emerald-500/20 text-emerald-400' : 'text-slate-400 hover:bg-white/5'}`}
        >
          Running ({runningList.length})
        </button>
        <button
          onClick={() => setActiveTab('completed')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'completed' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:bg-white/5'}`}
        >
          Completed ({completedList.length})
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'rejected' ? 'bg-red-500/20 text-red-400' : 'text-slate-400 hover:bg-white/5'}`}
        >
          Rejected ({rejectedList.length})
        </button>
        <button
          onClick={() => setActiveTab('all')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'all' ? 'bg-cyan-500/20 text-cyan-400' : 'text-slate-400 hover:bg-white/5'}`}
        >
          All ({allList.length})
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors ${activeTab === 'settings' ? 'bg-slate-500/20 text-white' : 'text-slate-400 hover:bg-white/5'}`}
        >
          Settings
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-10 custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-10"><RefreshCw className="h-6 w-6 text-slate-500 animate-spin" /></div>
        ) : selectedCampaign ? (
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4 max-w-2xl mx-auto">
            <div className="flex items-center gap-3 border-b border-cyan-500/20 pb-3">
              <button 
                onClick={() => setSelectedCampaign(null)}
                className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 text-slate-300 transition cursor-pointer"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <div>
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Campaign Statistics
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">View performance and activity logs</p>
              </div>
            </div>

            <div className="bg-slate-900 border border-white/10 rounded-xl p-4 relative overflow-hidden">
              <div className="flex items-start justify-between mb-2">
                <h4 className="text-sm font-bold text-white max-w-[400px] line-clamp-2">{selectedCampaign.title}</h4>
                <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${
                  selectedCampaign.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 
                  selectedCampaign.status === 'completed' ? 'bg-cyan-500/10 text-cyan-400' :
                  selectedCampaign.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                  'bg-orange-500/10 text-orange-400'
                }`}>
                  {selectedCampaign.status}
                </span>
              </div>
              <div className="text-[10px] text-slate-500 font-mono mb-2 flex items-center gap-1">
                ID: <span className="text-slate-400">{selectedCampaign.id}</span> <CopyButton text={selectedCampaign.id} />
              </div>
              <p className="text-[10px] text-slate-400 mb-2">Advertiser: <span className="text-slate-300 font-bold">{selectedCampaign.advertiserName || 'Unknown'}</span> ({selectedCampaign.advertiserEmail})</p>
              <div className="text-[10px] text-cyan-400 break-all mb-4">
                Video URL: <a href={selectedCampaign.videoUrl} target="_blank" rel="noreferrer" className="hover:underline">{selectedCampaign.videoUrl}</a>
              </div>

              <div className="grid grid-cols-2 gap-2 mb-4">
                <div className="bg-slate-950 p-2 rounded-lg border border-white/5">
                  <div className="text-[9px] text-slate-500 uppercase mb-1">Target Views</div>
                  <div className="text-xs font-mono text-slate-300">{selectedCampaign.targetViews}</div>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-white/5">
                  <div className="text-[9px] text-slate-500 uppercase mb-1">Cost Per View</div>
                  <div className="text-xs font-mono text-slate-300">{selectedCampaign.costPerView || pricing.costPerView} Tokens</div>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-white/5">
                  <div className="text-[9px] text-slate-500 uppercase mb-1">Total Budget Paid</div>
                  <div className="text-xs font-mono text-orange-400">{selectedCampaign.totalCost} 🪙</div>
                </div>
                <div className="bg-slate-950 p-2 rounded-lg border border-white/5">
                  <div className="text-[9px] text-slate-500 uppercase mb-1">Started At</div>
                  <div className="text-xs font-mono text-slate-300">
                    {selectedCampaign.startedAt ? new Date(selectedCampaign.startedAt.seconds * 1000).toLocaleString() : 'Not started yet'}
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 p-3 rounded-lg border border-white/5 mb-4">
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-400">Total Views Delivered</span>
                  <span className="text-white"><span className="text-emerald-400">{selectedCampaign.viewsCount || 0}</span> / {selectedCampaign.targetViews}</span>
                </div>
                <div className="h-2 bg-slate-900 rounded-full mt-3 overflow-hidden">
                  <div 
                    className="h-full bg-cyan-500 transition-all duration-1000" 
                    style={{ width: `${Math.min(((selectedCampaign.viewsCount || 0) / (selectedCampaign.targetViews || 1)) * 100, 100)}%` }}
                  ></div>
                </div>
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
        ) : activeTab === 'settings' ? (
          <div className="space-y-4 max-w-sm mx-auto">
            <div className="bg-slate-900 border border-white/10 p-4 rounded-xl space-y-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider border-b border-white/5 pb-2">Campaign Pricing</h3>
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase font-black">Min Tokens For Campaign</label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                  <input
                    type="number"
                    value={pricing.minTokensForCampaign || 0}
                    onChange={e => setPricing({...pricing, minTokensForCampaign: Number(e.target.value)})}
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-2.5 pl-8 pr-3 text-sm text-white font-mono focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase font-black">Cost Per View (Charged to Advertiser)</label>
                <div className="relative">
                  <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                  <input
                    type="number"
                    value={pricing.costPerView}
                    onChange={e => setPricing({...pricing, costPerView: Number(e.target.value)})}
                    step="0.01"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-2.5 pl-8 pr-3 text-sm text-white font-mono focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[10px] text-slate-400 uppercase font-black">Reward Per View (Paid to Viewer)</label>
                <div className="relative">
                  <Coins className="absolute left-3 top-1/2 -translate-y-1/2 h-3 w-3 text-slate-500" />
                  <input
                    type="number"
                    value={pricing.rewardPerView}
                    onChange={e => setPricing({...pricing, rewardPerView: Number(e.target.value)})}
                    step="0.01"
                    className="w-full bg-slate-950 border border-white/10 rounded-lg py-2.5 pl-8 pr-3 text-sm text-white font-mono focus:border-cyan-500/50 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs uppercase tracking-wider py-3 rounded-xl transition flex items-center justify-center gap-2"
                >
                  {savingSettings ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Settings className="h-4 w-4" />}
                  Save Settings
                </button>
              </div>
            </div>

            <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl">
              <p className="text-[10px] text-cyan-400 leading-relaxed font-mono">
                <strong>Note:</strong> Ensure "Cost Per View" is greater than or equal to "Reward Per View" to maintain a sustainable economy. Profit goes to Campaign Wallet.
              </p>
            </div>
          </div>
        ) : (
          (() => {
            const listToRender = searchResult ? [searchResult] : (
                                 activeTab === 'pending' ? pendingList :
                                 activeTab === 'running' ? runningList :
                                 activeTab === 'completed' ? completedList :
                                 activeTab === 'rejected' ? rejectedList :
                                 allList);
                                 
            if (searchResult && listToRender.length > 0) {
              const c = searchResult;
              // Just to add a clear button above the list
            }
                                 
            if (listToRender.length === 0) {
              return <div className="text-center py-10 text-slate-500 text-xs font-mono">No campaigns found.</div>;
            }
            
            return (
              <>
                {searchResult && (
                  <div className="flex justify-between items-center mb-4 bg-slate-900 border border-emerald-500/30 p-3 rounded-xl">
                    <div className="text-[10px] text-emerald-400 font-mono"><span className="font-bold">Search Result:</span> {searchResult.id}</div>
                    <button onClick={() => { setSearchId(''); setSearchResult(null); }} className="text-[10px] text-slate-400 hover:text-white bg-white/5 px-2 py-1 rounded">Clear</button>
                  </div>
                )}
                {listToRender.map(c => (
              <div key={c.id} className="bg-slate-900 border border-white/10 rounded-xl p-4 shadow-lg mb-3">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="text-sm font-bold text-white mb-1">{c.title}</h4>
                    <div className="text-[10px] text-cyan-300 font-mono mb-1 flex items-center gap-1">ID: {c.id} <CopyButton text={c.id} /></div>
                    <p className="text-[10px] text-slate-400">By: {c.advertiserEmail}</p>
                    {c.startedAt && <p className="text-[10px] text-slate-400 mt-1">Started: {new Date(c.startedAt.seconds * 1000).toLocaleString()}</p>}
                    {c.status === 'pending' && <a href={c.videoUrl} target="_blank" rel="noreferrer" className="text-[10px] text-cyan-400 hover:underline block mt-1 break-all max-w-xs">{c.videoUrl}</a>}
                  </div>
                  <div className="text-right">
                    <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${
                      c.status === 'active' ? 'bg-emerald-500/10 text-emerald-400' : 
                      c.status === 'paused' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20' : 
                      c.status === 'completed' ? 'bg-cyan-500/10 text-cyan-400' :
                      c.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                      'bg-orange-500/10 text-orange-400'
                    }`}>
                      {c.status}
                    </span>
                  </div>
                </div>
                
                <div className="bg-slate-950 p-2 rounded-lg border border-white/5 mt-2 mb-2">
                  <div className="text-[9px] text-slate-500 uppercase mb-1 flex items-center gap-1"><MapPin className="h-3 w-3" /> Audience Location</div>
                  {(!c.targetAudienceType || c.targetAudienceType === 'all') ? (
                    <div className="text-[10px] font-bold text-emerald-400">All Bangladesh (Random)</div>
                  ) : (
                    <div className="text-[10px] text-cyan-300 font-mono">
                      {(c.targetLocations && c.targetLocations.length > 0) ? c.targetLocations.map((l:any) => `${l.division}${l.district ? ' > '+l.district : ''}${l.upazila ? ' > '+l.upazila : ''}`).join(' | ') : 'All Bangladesh'}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="bg-slate-950 p-2 rounded-lg border border-white/5">
                    <div className="text-[9px] text-slate-500 uppercase mb-1">Views</div>
                    <div className="text-xs font-mono"><span className="text-emerald-400 font-bold">{c.viewsCount || 0}</span> <span className="text-slate-400">/ {c.targetViews}</span></div>
                  </div>
                  <div className="bg-slate-950 p-2 rounded-lg border border-white/5">
                    <div className="text-[9px] text-slate-500 uppercase mb-1">Paid (Tokens)</div>
                    <div className="text-xs font-mono text-orange-400">{c.totalCost} 🪙</div>
                  </div>
                </div>

                {c.status === 'rejected' && c.rejectionReason && (
                  <div className="bg-red-500/10 border border-red-500/20 p-2 rounded-lg mb-2 mt-2">
                    <p className="text-[10px] text-red-400"><strong className="text-red-300">Reason:</strong> {c.rejectionReason}</p>
                  </div>
                )}
                
                {(c.status === 'active' || c.status === 'paused' || c.status === 'completed') && (
                  <div className="h-1.5 bg-slate-950 rounded-full mt-3 mb-1 overflow-hidden">
                    <div className="h-full bg-emerald-500" style={{ width: `${Math.min(((c.viewsCount || 0) / (c.targetViews || 1)) * 100, 100)}%` }}></div>
                  </div>
                )}

                {c.status !== 'pending' && (
                  <div className="flex flex-col sm:flex-row gap-2 mt-3 pt-3 border-t border-white/5">
                    <button
                      onClick={() => viewStats(c)}
                      className="flex-1 bg-white/5 hover:bg-white/10 text-slate-300 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <BarChart2 className="h-3.5 w-3.5" /> View Campaign Stats
                    </button>

                    {c.status === 'active' && (
                      <button
                        onClick={() => handlePause(c)}
                        disabled={actionId === c.id}
                        className="flex-1 bg-amber-600/20 hover:bg-amber-600/30 text-amber-400 border border-amber-500/30 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        {actionId === c.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Pause className="h-3.5 w-3.5" />}
                        Pause Campaign
                      </button>
                    )}

                    {c.status === 'paused' && (
                      <button
                        onClick={() => handleResume(c)}
                        disabled={actionId === c.id}
                        className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex items-center justify-center gap-1.5 transition cursor-pointer"
                      >
                        {actionId === c.id ? <RefreshCw className="h-3.5 w-3.5 animate-spin" /> : <Play className="h-3.5 w-3.5" />}
                        Resume Campaign
                      </button>
                    )}
                  </div>
                )}

                {c.status === 'pending' && (
                  <div className="space-y-2 mt-4 pt-4 border-t border-white/5">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => handleApprove(c)}
                        className="flex-1 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex justify-center items-center gap-1 transition"
                      >
                        <Check className="h-3.5 w-3.5" /> Approve & Run
                      </button>
                      {actionId !== c.id && (
                        <button 
                          onClick={() => setActionId(c.id)}
                          className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider flex justify-center items-center gap-1 transition"
                        >
                          <X className="h-3.5 w-3.5" /> Reject
                        </button>
                      )}
                    </div>
                    
                    {actionId === c.id && (
                      <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="pt-2">
                        <input 
                          type="text" 
                          value={rejectReason}
                          onChange={e => setRejectReason(e.target.value)}
                          placeholder="Reason for rejection..."
                          className="w-full bg-slate-950 border border-red-500/30 rounded-lg p-2 text-xs text-white placeholder-slate-600 mb-2 focus:outline-none"
                        />
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleReject(c)}
                            className="bg-red-600 text-white px-3 py-1.5 rounded text-xs font-bold hover:bg-red-500 flex-1"
                          >Confirm Reject</button>
                          <button 
                            onClick={() => { setActionId(''); setRejectReason(''); }}
                            className="bg-slate-800 text-slate-300 px-3 py-1.5 rounded text-xs font-bold hover:bg-slate-700"
                          >Cancel</button>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>
            ))}
              </>
            );
          })()
        )}
      </div>
    </div>
  );
}

