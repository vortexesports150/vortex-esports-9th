import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { Save, AlertTriangle, PlayCircle, ShieldAlert } from 'lucide-react';

export function YoutubeAdsAdminPanel({ db, user }: { db: any, user: any }) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [config, setConfig] = useState({
    video1Url: '',
    video1Tokens: 1,
    video1Active: true,
    video2Url: '',
    video2Tokens: 1,
    video2Active: true,
    maxDailyViews: 10
  });

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docRef = doc(db, 'system_config', 'youtube_ads');
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          setConfig(prev => ({
            ...prev,
            ...data,
            maxDailyViews: data.maxDailyViews !== undefined ? data.maxDailyViews : 10
          }));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [db]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const docRef = doc(db, 'system_config', 'youtube_ads');
      const docSnap = await getDoc(docRef);
      if (!docSnap.exists()) {
        await setDoc(docRef, config);
      } else {
        await updateDoc(docRef, config);
      }
      alert('YouTube Ads configuration saved successfully!');
    } catch (err) {
      console.error(err);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="text-white text-xs font-mono p-4">Loading config...</div>;

  return (
    <div className="space-y-6">
      {/* Global Limit Configuration */}
      <div className="p-4 bg-cyan-500/10 border-2 border-cyan-500/40 rounded-xl space-y-4 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
        <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2">
          <ShieldAlert className="h-4.5 w-4.5 text-cyan-400" />
          <h5 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Global Ads Security & Limit</h5>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] text-cyan-300 font-bold uppercase tracking-wider mb-1">
              Daily Max Ad Watch Limit (Per Account & Device)
            </label>
            <input 
              type="number" 
              min="1"
              value={config.maxDailyViews || 10}
              onChange={(e) => setConfig({...config, maxDailyViews: Math.max(1, Number(e.target.value))})}
              placeholder="e.g. 10"
              className="w-full bg-[#0a0410] border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
            <p className="text-[10px] text-slate-400 mt-1.5 leading-relaxed">
              This limit restricts both user accounts and physical device IDs. Even if users create multiple accounts, once the device reaches this daily limit, they will be blocked.
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2">
          <PlayCircle className="h-4 w-4 text-cyan-400" />
          <h5 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Video Ad 1</h5>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] text-cyan-300 font-bold uppercase tracking-wider mb-1">YouTube Video ID / URL</label>
            <input 
              type="text" 
              value={config.video1Url}
              onChange={(e) => setConfig({...config, video1Url: e.target.value})}
              placeholder="e.g. dQw4w9WgXcQ"
              className="w-full bg-[#0a0410] border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-cyan-300 font-bold uppercase tracking-wider mb-1">Tokens Reward</label>
              <input 
                type="number" 
                value={config.video1Tokens}
                onChange={(e) => setConfig({...config, video1Tokens: Number(e.target.value)})}
                className="w-full bg-[#0a0410] border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer p-2 bg-[#0a0410] border border-cyan-500/30 rounded-lg h-[38px]">
                <input 
                  type="checkbox" 
                  checked={config.video1Active}
                  onChange={(e) => setConfig({...config, video1Active: e.target.checked})}
                  className="rounded bg-cyan-500/20 border-cyan-500/50 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-xs text-slate-300 font-bold">Active</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl space-y-4">
        <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-2">
          <PlayCircle className="h-4 w-4 text-cyan-400" />
          <h5 className="text-sm font-bold text-white uppercase tracking-widest font-mono">Video Ad 2</h5>
        </div>
        
        <div className="space-y-3">
          <div>
            <label className="block text-[10px] text-cyan-300 font-bold uppercase tracking-wider mb-1">YouTube Video ID / URL</label>
            <input 
              type="text" 
              value={config.video2Url}
              onChange={(e) => setConfig({...config, video2Url: e.target.value})}
              placeholder="e.g. dQw4w9WgXcQ"
              className="w-full bg-[#0a0410] border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] text-cyan-300 font-bold uppercase tracking-wider mb-1">Tokens Reward</label>
              <input 
                type="number" 
                value={config.video2Tokens}
                onChange={(e) => setConfig({...config, video2Tokens: Number(e.target.value)})}
                className="w-full bg-[#0a0410] border border-cyan-500/30 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div className="flex flex-col justify-end">
              <label className="flex items-center gap-2 cursor-pointer p-2 bg-[#0a0410] border border-cyan-500/30 rounded-lg h-[38px]">
                <input 
                  type="checkbox" 
                  checked={config.video2Active}
                  onChange={(e) => setConfig({...config, video2Active: e.target.checked})}
                  className="rounded bg-cyan-500/20 border-cyan-500/50 text-cyan-500 focus:ring-cyan-500"
                />
                <span className="text-xs text-slate-300 font-bold">Active</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full bg-cyan-600 hover:bg-cyan-500 text-white font-black uppercase tracking-widest text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-2"
      >
        <Save className="h-4 w-4" />
        {saving ? 'Saving...' : 'Save Configuration'}
      </button>
    </div>
  );
}
