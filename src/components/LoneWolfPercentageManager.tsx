import React, { useState, useEffect } from 'react';
import { Percent, Save, Loader2, Info, CheckCircle2, Swords, Wallet, History, ArrowLeft, Copy, Check } from 'lucide-react';
import { db } from '../lib/firebase';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp, collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';

interface LoneWolfPercentageManagerProps {
  onBack?: () => void;
  onOpenWallets?: () => void;
}

export function LoneWolfPercentageManager({ onBack, onOpenWallets }: LoneWolfPercentageManagerProps) {
  const [profitPercentage, setProfitPercentage] = useState<number>(10);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [walletTotal, setWalletTotal] = useState<number>(0);
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);
  const [savedSuccess, setSavedSuccess] = useState<boolean>(false);
  const [recentDeductions, setRecentDeductions] = useState<any[]>([]);
  const [loadingDeductions, setLoadingDeductions] = useState<boolean>(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopyId = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  useEffect(() => {
    // Fetch Lone Wolf profit percentage from system/settings (and fallback to system_config/lone_wolf_percentage)
    const fetchConfig = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'system', 'settings'));
        if (snap.exists() && typeof snap.data()?.loneWolfProfitPercentage === 'number') {
          setProfitPercentage(snap.data().loneWolfProfitPercentage);
        } else {
          const configSnap = await getDoc(doc(db, 'system_config', 'lone_wolf_percentage'));
          if (configSnap.exists() && typeof configSnap.data()?.profitPercentage === 'number') {
            setProfitPercentage(configSnap.data().profitPercentage);
          } else {
            setProfitPercentage(10);
          }
        }
      } catch (err) {
        console.error("Error fetching Lone Wolf percentage config:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();

    // Listen to real-time Lone Wolf percentage wallet
    const unsub = onSnapshot(doc(db, 'system', 'wallets'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setWalletBalance(Number(data.loneWolfPercentageWallet) || Number(data.loneWolfProfitWallet) || 0);
        setWalletTotal(Number(data.loneWolfPercentageWalletTotal) || Number(data.loneWolfProfitWalletTotal) || 0);
      }
    });

    // Fetch recent deduction history
    const fetchHistory = async () => {
      setLoadingDeductions(true);
      try {
        const q = query(
          collection(db, 'system', 'wallets', 'history'),
          where('walletType', 'in', ['loneWolfPercentageWallet', 'loneWolfProfitWallet']),
          orderBy('createdAt', 'desc'),
          limit(10)
        );
        const histSnap = await getDocs(q);
        const list: any[] = [];
        histSnap.forEach((d) => list.push({ id: d.id, ...d.data() }));
        setRecentDeductions(list);
      } catch (e) {
        console.warn("Could not fetch lone wolf wallet history:", e);
      } finally {
        setLoadingDeductions(false);
      }
    };

    fetchHistory();

    return () => unsub();
  }, []);

  const handleSave = async () => {
    if (profitPercentage < 0 || profitPercentage > 100) {
      alert("Percentage must be between 0 and 100");
      return;
    }
    setSaving(true);
    setSavedSuccess(false);
    try {
      // Save in system/settings for ResultApprovalPanel compatibility
      await setDoc(doc(db, 'system', 'settings'), {
        loneWolfProfitPercentage: Number(profitPercentage),
        updatedAt: serverTimestamp()
      }, { merge: true });

      // Also save in system_config for global persistence
      await setDoc(doc(db, 'system_config', 'lone_wolf_percentage'), {
        profitPercentage: Number(profitPercentage),
        updatedAt: serverTimestamp()
      }, { merge: true });

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err: any) {
      console.error("Failed to save lone wolf percentage:", err);
      alert("Failed to save percentage: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-[#050b18]/90 border border-fuchsia-500/20 p-5 rounded-2xl relative text-left font-sans shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-fuchsia-500/15 pb-3 mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
            <Swords className="h-4.5 w-4.5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-white uppercase tracking-wider font-mono">Lone Wolf Profit Percentage Config</h4>
            <p className="text-[10px] text-slate-400 font-sans">Automated fee & deduction setup for Lone Wolf 1v1 / 2v2 host contests</p>
          </div>
        </div>
        {onBack && (
          <button
            onClick={onBack}
            className="text-[10px] text-fuchsia-400 bg-fuchsia-500/10 hover:bg-fuchsia-500/20 px-2.5 py-1.5 rounded-lg font-bold uppercase transition-all cursor-pointer font-mono flex items-center gap-1 border border-fuchsia-500/20"
          >
            <ArrowLeft className="w-3 h-3" /> Back
          </button>
        )}
      </div>

      <p className="text-xs text-slate-300 leading-relaxed mb-6">
        Configure the profit percentage automatically deducted when an administrator reviews and unlocks the host's wallet for a completed Lone Wolf contest. The deducted tokens are credited directly to the <strong className="text-fuchsia-300 font-mono">Lone Wolf Percentage Wallet</strong> in the System Wallets console.
      </p>

      {/* Top Grid: Balance and Config */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Wallet Balance Card */}
        <div className="bg-[#071224] border border-fuchsia-500/25 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-fuchsia-400 font-mono flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5" /> Lone Wolf Percentage Wallet
            </span>
            {onOpenWallets && (
              <button
                onClick={onOpenWallets}
                className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 uppercase font-mono tracking-wider transition-colors"
              >
                All Wallets &rarr;
              </button>
            )}
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-white font-mono tracking-tight flex items-baseline gap-2">
              <span className="text-fuchsia-400">🪙</span>
              <span>{Number(walletBalance).toFixed(2)}</span>
              <span className="text-xs font-semibold text-slate-400 font-sans">tokens reserved</span>
            </div>
            {walletTotal > 0 && (
              <p className="text-[10px] text-slate-400 font-mono mt-1">
                Lifetime Transferred: 🪙 {Number(walletTotal).toFixed(2)} tokens
              </p>
            )}
          </div>
        </div>

        {/* Current Active Rate Card */}
        <div className="bg-[#071224] border border-cyan-500/25 p-4 rounded-xl flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 font-mono flex items-center gap-1.5">
              <Percent className="w-3.5 h-3.5" /> Active Platform Profit Rate
            </span>
            <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 font-mono font-bold border border-cyan-500/20">
              Live Rate
            </span>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-cyan-300 font-mono tracking-tight">
              {profitPercentage}%
            </div>
            <p className="text-[10px] text-slate-400 font-sans mt-1">
              Applied automatically upon approving and unlocking match wallets
            </p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12 text-slate-400 font-mono text-xs gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-fuchsia-400" />
          Loading Lone Wolf percentage configuration...
        </div>
      ) : (
        <div className="max-w-xl bg-[#071526] border border-fuchsia-500/20 p-5 rounded-xl space-y-4 font-mono">
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
                className="w-full bg-slate-950 border border-fuchsia-500/30 rounded-xl px-4 py-2.5 text-white font-black text-lg focus:outline-none focus:border-fuchsia-400 font-mono pr-10"
                placeholder="10"
              />
              <span className="absolute right-4 text-fuchsia-400 font-black text-lg">%</span>
            </div>
          </div>

          <div className="p-3.5 bg-fuchsia-500/10 border border-fuchsia-500/20 rounded-xl text-[11px] text-fuchsia-300/90 leading-relaxed flex items-start gap-2 font-sans">
            <Info className="w-4 h-4 text-fuchsia-400 shrink-0 mt-0.5" />
            <div>
              <strong>Example calculation:</strong> If a Lone Wolf host wallet balance is <span className="font-mono text-white">500 Tokens</span> and the deduction rate is set to <span className="font-mono text-white">{profitPercentage}%</span>, unlocking the wallet will transfer <span className="font-mono text-fuchsia-400">{Math.round((500 * profitPercentage) / 100)} Tokens</span> to the <span className="text-white font-bold">Lone Wolf Percentage Wallet</span> and release <span className="font-mono text-emerald-400">{Math.max(0, 500 - Math.round((500 * profitPercentage) / 100))} Tokens</span> to the host.
            </div>
          </div>

          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-5 py-2.5 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-fuchsia-500/20 flex items-center gap-2 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>

            {savedSuccess && (
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-1 font-sans">
                <CheckCircle2 className="w-4 h-4" /> Configuration saved successfully!
              </span>
            )}
          </div>
        </div>
      )}

      {/* Recent Deductions Preview */}
      {recentDeductions.length > 0 && (
        <div className="mt-6 pt-5 border-t border-fuchsia-500/15">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono flex items-center gap-1.5">
              <History className="w-3.5 h-3.5 text-fuchsia-400" /> Recent Lone Wolf Profit Deductions
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Last {recentDeductions.length} matches
            </span>
          </div>

          <div className="space-y-2.5">
            {recentDeductions.map((item) => {
              const matchNum = item.matchNumber || (item.reason && item.reason.match(/#(\w+)/)?.[1]) || item.matchId?.substring(0, 8);
              return (
                <div
                  key={item.id}
                  className="bg-[#071224] border border-fuchsia-500/20 hover:border-fuchsia-500/40 transition-all p-3.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {matchNum && (
                        <span className="px-2 py-0.5 rounded-md bg-fuchsia-500/15 border border-fuchsia-500/30 text-fuchsia-300 font-mono font-black text-[10px]">
                          Match #{matchNum}
                        </span>
                      )}
                      <p className="font-bold text-white text-xs">
                        {item.matchTitle || item.reason || 'Lone Wolf Match Profit'}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-slate-400 font-mono">
                      {item.matchId && (
                        <span className="flex items-center gap-1">
                          ID: <strong className="text-cyan-400 font-bold">{item.matchId}</strong>
                          <button
                            onClick={(e) => handleCopyId(item.matchId, e)}
                            className="text-slate-400 hover:text-white transition-colors"
                            title="Copy Match ID"
                          >
                            {copiedId === item.matchId ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                          </button>
                        </span>
                      )}
                      {(item.hostName || item.hostEmail) && (
                        <span>Host: <strong className="text-slate-200">{item.hostName || item.hostEmail}</strong></span>
                      )}
                      {item.profitPercentage && (
                        <span>Rate: <strong className="text-amber-400 font-bold">{item.profitPercentage}%</strong></span>
                      )}
                      <span>By: <strong className="text-slate-300">{item.addedBy || item.addedByEmail || 'Admin'}</strong></span>
                    </div>

                    {item.createdAt && (
                      <p className="text-[9px] text-slate-500 font-mono">
                        {item.createdAt.toDate ? item.createdAt.toDate().toLocaleString() : item.createdAt.seconds ? new Date(item.createdAt.seconds * 1000).toLocaleString() : typeof item.createdAt === 'string' ? item.createdAt : ''}
                      </p>
                    )}
                  </div>

                  <div className="text-left sm:text-right shrink-0">
                    <span className="font-black text-fuchsia-400 font-mono text-sm block">
                      +🪙 {Number(item.amountAdded || 0).toFixed(2)}
                    </span>
                    <span className="text-[9px] text-slate-400 uppercase font-mono">Profit Added</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
