import React, { useState, useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, getDocs, doc, setDoc, getDoc, orderBy, updateDoc } from 'firebase/firestore';
import { Settings, Shield, Clock, Calendar, Check, AlertTriangle, Users, ChevronLeft, ChevronRight, Ban } from 'lucide-react';

interface SubscriptionConfig {
  monthlyFee: number;
  yearlyFee: number;
  apexFee: number;
}

interface Subscriber {
  id: string;
  userId: string;
  username: string;
  email: string;
  type: 'monthly' | 'yearly' | 'apex';
  expiresAt: string;
  subscribedAt: string;
  tokensPaid: number;
  upazila?: string;
  district?: string;
  status?: string;
  isSuspended?: boolean;
}

interface ProHostSubscriptionAdminProps {
  onBack?: () => void;
}

export function ProHostSubscriptionAdmin({ onBack }: ProHostSubscriptionAdminProps = {}) {
  const [viewMode, setViewMode] = useState<'main' | 'expired'>('main');
  const [activeTab, setActiveTab] = useState<'monthly' | 'yearly' | 'apex' | 'settings'>('monthly');
  const [expiredSubTab, setExpiredSubTab] = useState<'monthly' | 'yearly' | 'apex'>('monthly');
  const [config, setConfig] = useState<SubscriptionConfig>({ monthlyFee: 300, yearlyFee: 1500, apexFee: 10000 });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchConfig();
    fetchSubscribers();
  }, []);

  const fetchConfig = async () => {
    try {
      const docRef = doc(db, 'settings', 'proHostSubscriptions');
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        setConfig(snap.data() as SubscriptionConfig);
      }
    } catch (err) {
      console.error('Error fetching config:', err);
    }
  };

  const fetchSubscribers = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'pro_host_subscriptions'), orderBy('subscribedAt', 'desc'));
      const snap = await getDocs(q);
      const subs: Subscriber[] = await Promise.all(snap.docs.map(async (docSnap) => {
        const data = { id: docSnap.id, ...docSnap.data() } as Subscriber;
        if ((!data.upazila || !data.district) && data.userId) {
          try {
            const userSnap = await getDoc(doc(db, 'users', data.userId));
            if (userSnap.exists()) {
              const uData = userSnap.data();
              data.upazila = uData.upazila || '';
              data.district = uData.district || '';
            }
          } catch (e) {
            console.error('Error fetching subscriber user details:', e);
          }
        }
        return data;
      }));
      setSubscribers(subs);
    } catch (err) {
      console.error('Error fetching subscribers:', err);
    }
    setLoading(false);
  };

  const handleToggleStatus = async (sub: Subscriber) => {
    const isCurrentlySuspended = sub.status === 'suspended' || sub.isSuspended === true;
    const newStatus = isCurrentlySuspended ? 'active' : 'suspended';
    const isSuspended = !isCurrentlySuspended;
    setActionLoadingId(sub.id);

    try {
      // Update pro_host_subscriptions
      await updateDoc(doc(db, 'pro_host_subscriptions', sub.id), {
        status: newStatus,
        isSuspended: isSuspended,
      });

      // Update user doc if exists
      if (sub.userId) {
        try {
          const userRef = doc(db, 'users', sub.userId);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            const uData = userSnap.data();
            if (uData.proHostSubscription) {
              await updateDoc(userRef, {
                'proHostSubscription.status': newStatus,
                'proHostSubscription.isSuspended': isSuspended,
              });
            }
          }
        } catch (e) {
          console.error('Error updating user document subscription status:', e);
        }
      }

      setSubscribers(prev => prev.map(s => s.id === sub.id ? { ...s, status: newStatus, isSuspended } : s));
    } catch (err) {
      console.error('Error toggling subscription status:', err);
      alert('Failed to change subscription status.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      await setDoc(doc(db, 'settings', 'proHostSubscriptions'), config);
      setMessage('Settings saved successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (err: any) {
      setMessage('Error: ' + err.message);
    }
    setIsSaving(false);
  };

  const expiredSubscribers = subscribers.filter(s => new Date(s.expiresAt) <= new Date());
  const expiredCount = expiredSubscribers.length;

  let filteredSubs: Subscriber[] = [];
  if (viewMode === 'expired') {
    filteredSubs = expiredSubscribers.filter(s => s.type === expiredSubTab);
  } else {
    filteredSubs = subscribers.filter(s => s.type === activeTab);
  }

  const totalPages = Math.ceil(filteredSubs.length / itemsPerPage);
  const currentSubs = filteredSubs.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  if (viewMode === 'expired') {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3 mb-1">
          <button 
            onClick={() => { setViewMode('main'); setCurrentPage(1); }}
            className="text-[11px] text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-3.5 py-2 rounded-lg font-bold uppercase transition-all cursor-pointer flex items-center gap-1.5 border border-cyan-500/30"
          >
            &larr; Back to Subscription Admin
          </button>

          <div className="flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 px-3 py-1.5 rounded-lg text-rose-400 text-xs font-bold">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Expired History ({expiredCount})</span>
          </div>
        </div>

        <div className="bg-gradient-to-r from-rose-950/40 via-slate-900 to-slate-900 border border-rose-500/30 rounded-2xl p-5 shadow-xl">
          <h2 className="text-[13px] font-bold text-white flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>Expired Subscriptions History & Management</span>
          </h2>
          <p className="text-[8px] text-slate-400 mt-1">
            Browse and manage all host subscriptions that have passed their expiration date.
          </p>
        </div>

        {/* Expired Plan Filter Tabs - Strictly Monthly, Yearly, Apex Host (NO ALL TAB) */}
        <div className="flex flex-wrap items-center gap-2 bg-slate-900/60 p-1.5 rounded-xl border border-white/5">
          <button
            onClick={() => { setExpiredSubTab('monthly'); setCurrentPage(1); }}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              expiredSubTab === 'monthly' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>Monthly Expired</span>
            <span className="bg-black/30 px-2 py-0.5 rounded text-[10px] font-mono">
              ({expiredSubscribers.filter(s => s.type === 'monthly').length})
            </span>
          </button>

          <button
            onClick={() => { setExpiredSubTab('yearly'); setCurrentPage(1); }}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              expiredSubTab === 'yearly' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>Yearly Expired</span>
            <span className="bg-black/30 px-2 py-0.5 rounded text-[10px] font-mono">
              ({expiredSubscribers.filter(s => s.type === 'yearly').length})
            </span>
          </button>

          <button
            onClick={() => { setExpiredSubTab('apex'); setCurrentPage(1); }}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              expiredSubTab === 'apex' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <span>Apex Expired</span>
            <span className="bg-black/30 px-2 py-0.5 rounded text-[10px] font-mono">
              ({expiredSubscribers.filter(s => s.type === 'apex').length})
            </span>
          </button>
        </div>

        <div className="bg-[#0b0f19] border border-rose-500/20 rounded-2xl shadow-lg overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-900/40">
            <h3 className="font-bold text-rose-400 uppercase tracking-wider text-xs flex items-center gap-2">
              <Clock className="w-4 h-4 text-rose-400" />
              Expired {expiredSubTab} Subscribers List
            </h3>
            <span className="bg-rose-950/80 text-rose-300 px-2.5 py-0.5 rounded text-xs font-bold border border-rose-500/30">
              Total Expired: {filteredSubs.length}
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading expired subscribers...</div>
            ) : currentSubs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm italic">
                No expired {expiredSubTab} subscriptions found.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/70 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    <th className="p-3 border-b border-white/5">Subscriber / Host</th>
                    <th className="p-3 border-b border-white/5">Location</th>
                    <th className="p-3 border-b border-white/5">Plan Type</th>
                    <th className="p-3 border-b border-white/5">Tokens Paid</th>
                    <th className="p-3 border-b border-white/5">Subscribed At</th>
                    <th className="p-3 border-b border-white/5">Expired At</th>
                    <th className="p-3 border-b border-white/5">Status</th>
                    <th className="p-3 border-b border-white/5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {currentSubs.map((sub, i) => {
                    const isSuspended = sub.status === 'suspended' || sub.isSuspended === true;
                    return (
                      <tr key={sub.id || i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-white">{sub.username}</div>
                          <div className="text-[10px] text-slate-400">{sub.email}</div>
                          <div className="text-[9px] text-slate-500 font-mono">ID: {sub.userId}</div>
                        </td>
                        <td className="p-3 text-slate-300">
                          {sub.upazila || sub.district ? (
                            <div>
                              <div className="font-semibold text-cyan-400">{sub.upazila || 'N/A'}</div>
                              <div className="text-[10px] text-slate-400">{sub.district || 'N/A'}</div>
                            </div>
                          ) : (
                            <span className="text-slate-500 italic">Not set</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="uppercase font-bold text-[10px] text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded border border-rose-500/20">
                            {sub.type}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-white">{sub.tokensPaid} Tokens</td>
                        <td className="p-3 text-slate-400">
                          {sub.subscribedAt ? new Date(sub.subscribedAt).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="p-3 text-slate-400">
                          <div className="text-rose-400 font-bold">
                            {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : 'N/A'}
                          </div>
                          {sub.expiresAt && (
                            <div className="text-[9px] text-slate-500 font-mono">
                              {new Date(sub.expiresAt).toLocaleTimeString()}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          {isSuspended ? (
                            <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-md text-[10px] font-bold border border-red-500/30 flex items-center gap-1 w-max">
                              <Ban className="w-3 h-3 text-red-400" /> Suspended
                            </span>
                          ) : (
                            <span className="bg-slate-500/20 text-slate-400 px-2 py-1 rounded-md text-[10px] font-bold border border-slate-500/30 flex items-center gap-1 w-max">
                              <AlertTriangle className="w-3 h-3 text-rose-400" /> Expired
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleToggleStatus(sub)}
                            disabled={actionLoadingId === sub.id}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                              isSuspended
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
                            }`}
                          >
                            {actionLoadingId === sub.id ? 'Updating...' : isSuspended ? 'Activate' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="p-3 border-t border-white/5 flex items-center justify-between bg-slate-900/30 text-xs">
              <span className="text-slate-400">Page {currentPage} of {totalPages}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 mb-1">
        <div>
          {onBack && (
            <button 
              onClick={onBack}
              className="text-[11px] text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 px-3 py-1.5 rounded-lg font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
            >
              &larr; Back to Admin Dashboard
            </button>
          )}
        </div>

        <button
          onClick={() => { setViewMode('expired'); setExpiredSubTab('monthly'); setCurrentPage(1); }}
          className="py-1.5 px-3.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer bg-rose-500/10 text-rose-400 border-rose-500/30 hover:bg-rose-500/20"
          title="View Expired Subscriptions History Screen"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-rose-400" />
          <span>Expired</span>
          <span className="bg-rose-950/90 text-rose-300 text-[10px] font-extrabold px-1.5 py-0.2 rounded-full border border-rose-500/40">
            {expiredCount}
          </span>
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-6 bg-slate-900/50 p-1.5 rounded-xl border border-white/5">
        <button
          onClick={() => { setActiveTab('monthly'); setCurrentPage(1); }}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'monthly' ? 'bg-cyan-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Monthly
        </button>
        <button
          onClick={() => { setActiveTab('yearly'); setCurrentPage(1); }}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'yearly' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Yearly
        </button>
        <button
          onClick={() => { setActiveTab('apex'); setCurrentPage(1); }}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'apex' ? 'bg-red-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Apex Host
        </button>
        
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'settings' ? 'bg-slate-700 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
        >
          Settings
        </button>
      </div>

      {activeTab === 'settings' ? (
        <div className="bg-[#0b0f19] border border-white/10 rounded-2xl p-6 shadow-lg">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" />
            Subscription Pricing
          </h3>
          
          {message && (
            <div className={`p-3 rounded-xl mb-6 text-xs font-bold ${message.includes('Error') ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
              {message}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Monthly Fee (Tokens)</label>
              <input 
                type="number"
                value={config.monthlyFee}
                onChange={e => setConfig({ ...config, monthlyFee: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-cyan-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Yearly Fee (Tokens)</label>
              <input 
                type="number"
                value={config.yearlyFee}
                onChange={e => setConfig({ ...config, yearlyFee: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-amber-500 outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Apex Host Fee (Tokens)</label>
              <input 
                type="number"
                value={config.apexFee}
                onChange={e => setConfig({ ...config, apexFee: Number(e.target.value) })}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl px-4 py-2.5 text-white text-sm focus:border-red-500 outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleSaveConfig}
            disabled={isSaving}
            className="mt-6 w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-sm transition-all disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      ) : (
        <div className="bg-[#0b0f19] border border-white/10 rounded-2xl shadow-lg overflow-hidden flex flex-col min-h-[400px]">
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h3 className="font-bold text-white uppercase tracking-wider text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-cyan-400" />
              <span className="capitalize">{activeTab} Subscribers Details</span>
            </h3>
            <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded text-xs font-bold border border-slate-700">
              Total: {filteredSubs.length}
            </span>
          </div>

          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="p-8 text-center text-slate-400 text-sm">Loading subscribers...</div>
            ) : currentSubs.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm italic">No {activeTab} subscribers found.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-900/50 text-[10px] uppercase tracking-wider text-slate-400 font-bold">
                    <th className="p-3 border-b border-white/5">Subscriber / Host</th>
                    <th className="p-3 border-b border-white/5">Location</th>
                    <th className="p-3 border-b border-white/5">Plan Type</th>
                    <th className="p-3 border-b border-white/5">Tokens Paid</th>
                    <th className="p-3 border-b border-white/5">Subscribed At</th>
                    <th className="p-3 border-b border-white/5">Expires At</th>
                    <th className="p-3 border-b border-white/5">Status</th>
                    <th className="p-3 border-b border-white/5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="text-xs">
                  {currentSubs.map((sub, i) => {
                    const isSuspended = sub.status === 'suspended' || sub.isSuspended === true;
                    const isActive = !isSuspended && new Date(sub.expiresAt) > new Date();
                    return (
                      <tr key={sub.id || i} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                        <td className="p-3">
                          <div className="font-bold text-white">{sub.username}</div>
                          <div className="text-[10px] text-slate-400">{sub.email}</div>
                          <div className="text-[9px] text-slate-500 font-mono mt-0.5">UID: {sub.userId}</div>
                        </td>
                        <td className="p-3 text-slate-300 text-[11px]">
                          {sub.upazila || sub.district ? (
                            <span className="text-emerald-400 font-medium">📍 {sub.upazila || 'N/A'}, {sub.district || 'N/A'}</span>
                          ) : (
                            <span className="text-slate-500 italic">Not set</span>
                          )}
                        </td>
                        <td className="p-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            sub.type === 'apex' ? 'bg-red-500/20 text-red-400 border border-red-500/30' :
                            sub.type === 'yearly' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                            'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                          }`}>
                            {sub.type}
                          </span>
                        </td>
                        <td className="p-3 font-mono font-bold text-cyan-400">{sub.tokensPaid} T</td>
                        <td className="p-3 text-slate-300">
                          {new Date(sub.subscribedAt).toLocaleDateString()}
                          <div className="text-[9px] text-slate-500">{new Date(sub.subscribedAt).toLocaleTimeString()}</div>
                        </td>
                        <td className="p-3 text-slate-300">
                          {new Date(sub.expiresAt).toLocaleDateString()}
                          <div className="text-[9px] text-slate-500">{new Date(sub.expiresAt).toLocaleTimeString()}</div>
                        </td>
                        <td className="p-3">
                          {isSuspended ? (
                            <span className="bg-red-500/20 text-red-400 px-2 py-1 rounded-md text-[10px] font-bold border border-red-500/30 flex items-center gap-1 w-max">
                              <Ban className="w-3 h-3 text-red-400" /> Suspended
                            </span>
                          ) : isActive ? (
                            <span className="bg-green-500/20 text-green-400 px-2 py-1 rounded-md text-[10px] font-bold border border-green-500/30 flex items-center gap-1 w-max">
                              <Check className="w-3 h-3" /> Active
                            </span>
                          ) : (
                            <span className="bg-slate-500/20 text-slate-400 px-2 py-1 rounded-md text-[10px] font-bold border border-slate-500/30 flex items-center gap-1 w-max">
                              <AlertTriangle className="w-3 h-3 text-amber-400" /> Expired
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => handleToggleStatus(sub)}
                            disabled={actionLoadingId === sub.id}
                            className={`px-2.5 py-1 rounded text-[10px] font-bold border transition-all cursor-pointer ${
                              isSuspended
                                ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/30'
                                : 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30'
                            }`}
                          >
                            {actionLoadingId === sub.id ? 'Updating...' : isSuspended ? 'Activate' : 'Suspend'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>

          {totalPages > 1 && (
            <div className="p-3 bg-slate-900 border-t border-white/5 flex items-center justify-between">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 bg-slate-800 text-white rounded-lg disabled:opacity-50 hover:bg-slate-700 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <div className="text-xs font-bold text-slate-400">
                Page {currentPage} of {totalPages}
              </div>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 bg-slate-800 text-white rounded-lg disabled:opacity-50 hover:bg-slate-700 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
