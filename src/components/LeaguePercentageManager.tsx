import React, { useState, useEffect } from 'react';
import { Percent, Save, Loader2, Info, CheckCircle2 } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

export function LeaguePercentageManager() {
  const [profitPercentage, setProfitPercentage] = useState<number>(10);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);

  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'system_config', 'league_percentage'));
        if (snap.exists() && typeof snap.data()?.profitPercentage === 'number') {
          setProfitPercentage(snap.data().profitPercentage);
        } else {
          setProfitPercentage(10);
        }
      } catch (err) {
        console.error("Error fetching league percentage config:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    if (profitPercentage < 0 || profitPercentage > 100) {
      alert("Percentage must be between 0 and 100");
      return;
    }
    setSaving(true);
    setSavedSuccess(false);
    try {
      await setDoc(doc(db, 'system_config', 'league_percentage'), {
        profitPercentage,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      alert("Failed to save percentage: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#050b18]/80 border border-cyan-500/20 p-5 rounded-2xl relative text-left font-sans">
      <div className="flex items-center justify-between border-b border-cyan-500/15 pb-3 mb-4">
        <div className="flex items-center gap-2">
          <Percent className="h-5 w-5 text-amber-400" />
          <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono">League Profit Percentage Config</h4>
        </div>
      </div>

      <p className="text-xs text-slate-300 leading-relaxed mb-6">
        Set the profit percentage that will be deducted from a host's league wallet when an administrator unlocks the wallet after final prize distribution. The deducted tokens are transferred directly to the <strong className="text-cyan-300 font-mono">League Profit Wallet</strong> in the Owner Admin Panel.
      </p>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 font-mono text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          Loading percentage configuration...
        </div>
      ) : (
        <div className="max-w-lg bg-[#071526] border border-cyan-500/15 p-5 rounded-xl space-y-4 font-mono">
          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wide mb-2">
              Deduction Profit Rate (%)
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                min="0"
                max="100"
                value={profitPercentage}
                onChange={(e) => setProfitPercentage(Number(e.target.value))}
                className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-4 py-2.5 text-white font-black text-lg focus:outline-none focus:border-amber-400 font-mono pr-10"
                placeholder="10"
              />
              <span className="absolute right-4 text-amber-400 font-black text-lg">%</span>
            </div>
          </div>

          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl text-[11px] text-amber-300/90 leading-relaxed flex items-start gap-2 font-sans">
            <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong>Example calculation:</strong> If a league wallet contains <span className="font-mono text-white">1,000 Tokens</span> after prize distribution and the deduction rate is set to <span className="font-mono text-white">{profitPercentage}%</span>, unlocking the wallet will transfer <span className="font-mono text-amber-400">{Math.round((1000 * profitPercentage) / 100)} Tokens</span> to the <span className="text-cyan-300">League Profit Wallet</span> and release <span className="font-mono text-emerald-400">{Math.max(0, 1000 - Math.round((1000 * profitPercentage) / 100))} Tokens</span> to the host.
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>

            {savedSuccess && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 font-sans">
                <CheckCircle2 className="w-4 h-4" /> Config saved!
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
