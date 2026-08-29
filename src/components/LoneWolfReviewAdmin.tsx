import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Swords, 
  Check, 
  X, 
  Clock, 
  CheckCircle2, 
  User, 
  Trophy, 
  Coins, 
  Calendar, 
  MapPin, 
  Sparkles, 
  RefreshCw, 
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  Flame,
  Globe
} from 'lucide-react';
import { db } from '../lib/firebase';
import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  doc, 
  updateDoc, 
  runTransaction, 
  serverTimestamp 
} from 'firebase/firestore';
import { UserProfile } from '../types';

interface LoneWolfReviewAdminProps {
  userProfile: UserProfile | null;
  onBack?: () => void;
}

export function LoneWolfReviewAdmin({ userProfile, onBack }: LoneWolfReviewAdminProps) {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'all'>('pending');
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Fetch all lone_wolf_matches real-time
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'lone_wolf_matches'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      setMatches(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching lone wolf matches for review:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const pendingMatches = matches.filter(m => 
    m.approvalStatus === 'pending' || 
    (m.isApproved === false && m.status !== 'Cancelled' && m.approvalStatus !== 'rejected')
  );

  const approvedMatches = matches.filter(m => 
    m.approvalStatus === 'approved' || 
    m.isApproved === true || 
    (m.approvalStatus === undefined && m.isApproved === undefined)
  );

  const displayedList = activeTab === 'pending' 
    ? pendingMatches 
    : activeTab === 'approved' 
    ? approvedMatches 
    : matches;

  // Handler: Approve Match
  const handleApproveMatch = async (match: any) => {
    setProcessingId(match.id);
    try {
      const matchRef = doc(db, 'lone_wolf_matches', match.id);
      await updateDoc(matchRef, {
        approvalStatus: 'approved',
        isApproved: true,
        approvedAt: serverTimestamp(),
        approvedBy: userProfile?.displayName || userProfile?.email || 'System Admin',
        updatedAt: serverTimestamp()
      });
      alert(`✅ Lone Wolf Match #${match.matchNumber} ("${match.title}") approved! It is now published live on screen.`);
    } catch (err: any) {
      console.error('Error approving Lone Wolf match:', err);
      alert('Failed to approve match: ' + (err?.message || 'Unknown error'));
    } finally {
      setProcessingId(null);
    }
  };

  // Handler: Reject Match & Refund Deposit
  const handleRejectMatch = async (match: any) => {
    const depositAmount = Number(match.walletTokens || match.prizePool || 0);
    if (!confirm(`Are you sure you want to REJECT Match #${match.matchNumber} ("${match.title}")?\n\nThis will refund ${depositAmount} deposit tokens back to Host (${match.hostName}).`)) {
      return;
    }

    setProcessingId(match.id);
    try {
      await runTransaction(db, async (tx) => {
        const matchRef = doc(db, 'lone_wolf_matches', match.id);

        // Update match status to rejected/cancelled
        tx.update(matchRef, {
          approvalStatus: 'rejected',
          isApproved: false,
          status: 'Cancelled',
          rejectedAt: serverTimestamp(),
          rejectedBy: userProfile?.displayName || userProfile?.email || 'System Admin',
          updatedAt: serverTimestamp()
        });

        // Refund deposit to Host if host exists and deposit > 0
        if (depositAmount > 0 && match.hostId) {
          const hostRef = doc(db, 'users', match.hostId);
          const hostSnap = await tx.get(hostRef);
          
          if (hostSnap.exists()) {
            const currentTokens = Number(hostSnap.data().tokens || 0);
            tx.update(hostRef, {
              tokens: currentTokens + depositAmount,
              updatedAt: new Date().toISOString()
            });

            // Log in wallet_history
            const historyRef = doc(collection(db, 'wallet_history'));
            tx.set(historyRef, {
              userId: match.hostId,
              userName: match.hostName,
              type: 'credit',
              amount: depositAmount,
              balanceAfter: currentTokens + depositAmount,
              description: `Lone Wolf Deposit Refund (Admin Rejected #${match.matchNumber})`,
              matchId: match.id,
              matchNumber: match.matchNumber,
              createdAt: serverTimestamp()
            });
          }
        }
      });

      alert(`❌ Match #${match.matchNumber} rejected and ${depositAmount} deposit tokens refunded to Host.`);
    } catch (err: any) {
      console.error('Error rejecting match:', err);
      alert('Failed to reject match: ' + (err?.message || 'Unknown error'));
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="w-full space-y-6 text-slate-100 font-sans">
      {/* Header Banner */}
      <div className="bg-[#050b18]/90 border border-cyan-500/30 p-5 rounded-2xl relative overflow-hidden shadow-[0_0_25px_rgba(6,182,212,0.15)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-xl text-black shadow-[0_0_15px_rgba(6,182,212,0.4)]">
              <Swords className="w-6 h-6 text-slate-950 font-black" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono bg-cyan-950 text-cyan-400 border border-cyan-500/30 uppercase">
                  VORTEX ADMIN
                </span>
                {pendingMatches.length > 0 && (
                  <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono bg-rose-950 text-rose-400 border border-rose-500/40 animate-pulse uppercase">
                    {pendingMatches.length} PENDING
                  </span>
                )}
              </div>
              <h2 className="text-lg font-black text-white uppercase tracking-wider font-mono mt-0.5">
                Lone Wolf Matches Review
              </h2>
              <p className="text-xs text-slate-400">
                Review host-generated 1v1 duels before they appear live on the screen for players
              </p>
            </div>
          </div>

          {onBack && (
            <button
              onClick={onBack}
              className="text-xs font-bold font-mono text-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 px-3.5 py-2 rounded-xl transition cursor-pointer self-start sm:self-auto"
            >
              &larr; Back to Admin Panel
            </button>
          )}
        </div>

        {/* Tab Filters */}
        <div className="flex items-center gap-2 mt-5 border-t border-cyan-500/20 pt-4">
          <button
            onClick={() => setActiveTab('pending')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase font-mono transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'pending'
                ? 'bg-rose-500 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Pending Review ({pendingMatches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('approved')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase font-mono transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'approved'
                ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Approved Matches ({approvedMatches.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-black uppercase font-mono transition flex items-center gap-2 cursor-pointer ${
              activeTab === 'all'
                ? 'bg-cyan-500 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.4)]'
                : 'bg-slate-900/80 text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            <span>All Lone Wolf ({matches.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="py-12 text-center space-y-3 bg-[#050b18]/60 border border-slate-800 rounded-2xl">
          <RefreshCw className="w-8 h-8 text-cyan-400 animate-spin mx-auto" />
          <p className="text-xs font-bold text-slate-400 font-mono">Loading Lone Wolf matches for review...</p>
        </div>
      ) : displayedList.length === 0 ? (
        <div className="py-12 text-center space-y-2 bg-[#050b18]/60 border border-slate-800 rounded-2xl">
          <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto opacity-80" />
          <h3 className="text-sm font-black text-white font-mono uppercase">
            {activeTab === 'pending' ? 'No Pending Lone Wolf Matches' : 'No Matches Found'}
          </h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            {activeTab === 'pending'
              ? 'All host-submitted 1v1 Lone Wolf matches have been reviewed and approved!'
              : 'There are no matches under this filter.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {displayedList.map((match) => {
              const isPending = 
                match.approvalStatus === 'pending' || 
                (match.isApproved === false && match.status !== 'Cancelled' && match.approvalStatus !== 'rejected');

              const isApproved = 
                match.approvalStatus === 'approved' || 
                match.isApproved === true;

              return (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className={`bg-[#080e22] border rounded-2xl p-4 sm:p-5 flex flex-col justify-between space-y-4 relative overflow-hidden transition-all shadow-lg ${
                    isPending 
                      ? 'border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.15)]' 
                      : 'border-cyan-500/30'
                  }`}
                >
                  {/* Status Banner */}
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-500/40 text-cyan-300 rounded-lg text-[10px] font-black font-mono">
                        #{match.matchNumber || '1v1'}
                      </span>
                      <span className="text-[11px] sm:text-xs font-black text-white uppercase font-mono">
                        {match.title}
                      </span>
                    </div>

                    {isPending ? (
                      <span className="px-2.5 py-1 bg-rose-500/20 border border-rose-500/50 text-rose-300 rounded-lg text-[10px] font-black uppercase font-mono animate-pulse flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3 text-rose-400" />
                        Pending Review
                      </span>
                    ) : isApproved ? (
                      <span className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 rounded-lg text-[10px] font-black uppercase font-mono flex items-center gap-1 shrink-0">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" />
                        Approved
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-400 rounded-lg text-[10px] font-black uppercase font-mono shrink-0">
                        {match.status}
                      </span>
                    )}
                  </div>

                  {/* Match & Host Details Grid */}
                  <div className="space-y-3 text-xs">
                    {/* Host Info */}
                    <div className="bg-slate-900/80 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-cyan-950 border border-cyan-500/40 overflow-hidden flex items-center justify-center shrink-0">
                          {match.hostPhotoUrl ? (
                            <img src={match.hostPhotoUrl} alt="Host" className="w-full h-full object-cover" />
                          ) : (
                            <User className="w-4 h-4 text-cyan-400" />
                          )}
                        </div>
                        <div className="overflow-hidden">
                          <div className="text-[10px] text-slate-400 uppercase font-mono font-bold">Host Developer</div>
                          <div className="text-xs font-bold text-white truncate">{match.hostName || 'Vortex Host'}</div>
                          <div className="text-[10px] text-cyan-400/80 truncate">{match.hostEmail || 'N/A'}</div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-slate-400 uppercase font-mono font-bold">100% Security Deposit</div>
                        <div className="text-xs font-black text-amber-400 font-mono">
                          {match.walletTokens || match.prizePool || 0} 🪙 Deposited
                        </div>
                      </div>
                    </div>

                    {/* Game & Map Rules */}
                    <div className="grid grid-cols-2 gap-2 text-[11px] font-mono">
                      <div className="bg-slate-900/50 p-2.5 rounded-xl border border-white/5 space-y-0.5">
                        <span className="text-[9.5px] text-slate-400 uppercase font-bold block">Weapon Rule</span>
                        <span className="font-bold text-cyan-300 block truncate">{match.weaponRule || 'All Weapons'}</span>
                      </div>

                      <div className="bg-slate-900/50 p-2.5 rounded-xl border border-white/5 space-y-0.5">
                        <span className="text-[9.5px] text-slate-400 uppercase font-bold block">Arena Map</span>
                        <span className="font-bold text-cyan-300 block truncate">{match.mapName || 'Iron Cage'}</span>
                      </div>

                      <div className="bg-slate-900/50 p-2.5 rounded-xl border border-white/5 space-y-0.5">
                        <span className="text-[9.5px] text-slate-400 uppercase font-bold block">Format</span>
                        <span className="font-bold text-slate-200 block truncate">{match.roundsFormat || 'Best of 9'}</span>
                      </div>

                      <div className="bg-slate-900/50 p-2.5 rounded-xl border border-white/5 space-y-0.5">
                        <span className="text-[9.5px] text-slate-400 uppercase font-bold block">Date & Time</span>
                        <span className="font-bold text-slate-200 block truncate">{match.time || `${match.matchDate} ${match.matchTime}`}</span>
                      </div>
                    </div>

                    {/* Financial Specs */}
                    <div className="bg-slate-950/70 p-3 rounded-xl border border-amber-500/20 flex items-center justify-between font-mono">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Entry Fee</div>
                        <div className="text-xs font-black text-white">
                          {match.entryFee > 0 ? `${match.entryFee} 🪙` : 'FREE'}
                        </div>
                      </div>

                      <div className="text-right">
                        <div className="text-[10px] text-yellow-400 uppercase font-bold flex items-center justify-end gap-1">
                          <Trophy className="w-3 h-3 text-yellow-400" /> Winner Prize Pool
                        </div>
                        <div className="text-sm font-black text-yellow-400">
                          {match.prizePool} 🪙
                        </div>
                      </div>
                    </div>

                    {/* Local Venue or Sponsor Optional Info */}
                    {match.isLocalVenue && (
                      <div className="bg-emerald-950/30 border border-emerald-500/30 p-2.5 rounded-xl text-[10.5px] font-mono flex items-center gap-2 text-emerald-300">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Local Venue: <strong>{match.localVenueName}</strong> ({match.localUpazilaDistrict})</span>
                      </div>
                    )}

                    {match.hasSponsor && (
                      <div className="bg-purple-950/30 border border-purple-500/30 p-2.5 rounded-xl text-[10.5px] font-mono flex items-center gap-2 text-purple-300">
                        <Sparkles className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">Sponsor: <strong>{match.sponsorName || 'Custom Sponsor'}</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Admin Actions */}
                  <div className="pt-2 border-t border-white/10 flex items-center gap-2">
                    {isPending ? (
                      <>
                        <button
                          disabled={processingId === match.id}
                          onClick={() => handleApproveMatch(match)}
                          className="flex-1 py-2.5 px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs uppercase font-mono rounded-xl transition shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <Check className="w-4 h-4 text-slate-950 stroke-[3]" />
                          <span>Approve & Publish</span>
                        </button>

                        <button
                          disabled={processingId === match.id}
                          onClick={() => handleRejectMatch(match)}
                          className="py-2.5 px-3 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/50 text-rose-300 font-black text-xs uppercase font-mono rounded-xl transition active:scale-95 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                        >
                          <X className="w-4 h-4 text-rose-400 stroke-[3]" />
                          <span>Reject & Refund</span>
                        </button>
                      </>
                    ) : (
                      <div className="w-full flex items-center justify-between text-[11px] font-mono text-slate-400">
                        <span>Reviewed Status: <strong className={isApproved ? "text-emerald-400" : "text-rose-400"}>{match.approvalStatus || (isApproved ? 'Approved' : match.status)}</strong></span>
                        {match.approvedBy && (
                          <span className="text-[10px] text-slate-500">By {match.approvedBy}</span>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
