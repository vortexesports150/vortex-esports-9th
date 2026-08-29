import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, onSnapshot, doc, updateDoc, deleteDoc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Trophy, CheckCircle2, XCircle, Search, Eye, Filter, Trash2, X, Users, Calendar, MapPin, Award, Coins, Shield, ExternalLink, Flame } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export const ProTournamentsAdmin = ({ onBack }: { onBack?: () => void }) => {
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [search, setSearch] = useState('');
  const [selectedTourney, setSelectedTourney] = useState<any | null>(null);

  useEffect(() => {
    const q = query(collection(db, 'tournaments_freefire'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setTournaments(list);
      setLoading(false);
    }, (err) => {
      console.error("Error fetching admin tournaments", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleApprove = async (tourneyId: string) => {
    try {
      await updateDoc(doc(db, 'tournaments_freefire', tourneyId), {
        status: 'Open',
        updatedAt: serverTimestamp()
      });
      if (selectedTourney?.id === tourneyId) {
        setSelectedTourney(null);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to approve tournament');
    }
  };

  const handleReject = async (tourneyId: string) => {
    const reason = prompt("Enter reason for rejection:");
    if (reason === null) return;
    try {
      const tSnap = await getDoc(doc(db, 'tournaments_freefire', tourneyId));
      if (!tSnap.exists()) return;
      const tData = tSnap.data();
      const hostId = tData.hostId;
      const deposit = tData.walletTokens || 0;

      if (deposit > 0 && hostId) {
        const uSnap = await getDoc(doc(db, 'users', hostId));
        if (uSnap.exists()) {
          const currentTokens = uSnap.data().tokens || 0;
          await updateDoc(doc(db, 'users', hostId), {
            tokens: currentTokens + deposit,
            updatedAt: new Date().toISOString()
          });
          
          await setDoc(doc(collection(db, 'wallet_history')), {
            userId: hostId,
            userName: tData.hostName || 'Host',
            type: 'credit',
            amount: deposit,
            balanceAfter: currentTokens + deposit,
            description: `Refund for Rejected Tournament (${tourneyId})`,
            createdAt: serverTimestamp()
          });

          await setDoc(doc(collection(db, 'users', hostId, 'tokenTransactions')), {
            type: 'refund',
            amount: deposit,
            balanceAfter: currentTokens + deposit,
            tournamentId: tourneyId,
            tournamentNumber: tData.tournamentNumber || '',
            tournamentTitle: tData.title || 'Tournament',
            description: `Refund for Rejected Tournament #${tData.tournamentNumber || tourneyId}`,
            reason: `Refund for Rejected Tournament #${tData.tournamentNumber || tourneyId}`,
            createdAt: serverTimestamp()
          });
        }
      }

      await updateDoc(doc(db, 'tournaments_freefire', tourneyId), {
        status: 'Rejected',
        rejectionReason: reason,
        updatedAt: serverTimestamp()
      });

      if (selectedTourney?.id === tourneyId) {
        setSelectedTourney(null);
      }
    } catch (e) {
      console.error(e);
      alert('Failed to reject tournament');
    }
  };

  const filteredTournaments = tournaments.filter(t => {
    if (activeTab === 'pending' && t.status !== 'Pending') return false;
    if (activeTab === 'approved' && (t.status === 'Pending' || t.status === 'Rejected')) return false;
    if (activeTab === 'rejected' && t.status !== 'Rejected') return false;
    
    if (search && !t.title?.toLowerCase().includes(search.toLowerCase()) && !t.id?.toLowerCase().includes(search.toLowerCase()) && !t.hostName?.toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <h2 className="text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 font-mono">
          <Trophy className="w-5 h-5 text-cyan-400" />
          Tournament Review Console
        </h2>
      </div>

      {/* Tabs */}
      <div className="bg-slate-900/60 p-2 rounded-xl border border-white/10 flex gap-2">
        {(['pending', 'approved', 'rejected'] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-xs font-bold uppercase rounded-lg transition-all ${
              activeTab === tab 
                ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/20' 
                : 'text-slate-400 hover:bg-white/5 hover:text-slate-300'
            }`}
          >
            {tab} ({tournaments.filter(t => {
              if (tab === 'pending') return t.status === 'Pending';
              if (tab === 'approved') return t.status !== 'Pending' && t.status !== 'Rejected';
              return t.status === 'Rejected';
            }).length})
          </button>
        ))}
      </div>

      {/* Search Input */}
      <div className="relative">
        <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search by title, ID, or host name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 bg-slate-900/80 border border-white/10 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
        />
      </div>

      {loading ? (
        <div className="text-center py-10">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      ) : filteredTournaments.length === 0 ? (
        <div className="text-center py-10 bg-slate-900/40 rounded-xl border border-white/5">
          <p className="text-slate-400 text-sm font-bold uppercase">No {activeTab} tournaments found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredTournaments.map(t => (
            <div key={t.id} className="p-4 sm:p-5 bg-slate-900/80 rounded-2xl border border-cyan-500/20 hover:border-cyan-500/40 transition-all space-y-4 shadow-lg">
              {/* Top Row: ID, Status, Actions */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/30 font-bold">
                    #{t.tournamentNumber || '---'} | {t.id}
                  </span>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg border ${
                    t.status === 'Pending' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                    t.status === 'Rejected' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {t.status}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 bg-slate-800/60 px-2 py-0.5 rounded uppercase">
                    {t.mode === 'solo' ? 'Solo' : 'Squad'} Mode
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSelectedTourney(t)}
                    className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-cyan-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    Full Details
                  </button>

                  {activeTab === 'pending' && (
                    <>
                      <button
                        onClick={() => handleApprove(t.id)}
                        className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-500 text-emerald-400 hover:text-white border border-emerald-500/30 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReject(t.id)}
                        className="px-3 py-1.5 bg-rose-600/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer flex items-center gap-1"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        Reject
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Title & Host Information */}
              <div>
                <h3 className="text-base font-black text-white">{t.title}</h3>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
                  <span>Host: <strong className="text-cyan-300">{t.hostName}</strong></span>
                  <span>({t.hostEmail || t.hostId})</span>
                </p>
              </div>

              {/* Quick Summary Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-950/60 p-3 rounded-xl border border-white/5 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Players / Capacity</span>
                  <span className="text-white font-bold flex items-center gap-1 mt-0.5">
                    <Users className="w-3.5 h-3.5 text-cyan-400" />
                    {t.mode === 'squad' 
                      ? `${t.maxPlayers || 32} Players (${t.maxSquads || 8} Squads)`
                      : `${t.maxPlayers || 12} Players (Solo)`
                    }
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Prize Pool</span>
                  <span className="text-amber-400 font-bold flex items-center gap-1 mt-0.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    🪙 {t.prizePool || 0} Tk
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Host Deposit Paid</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1 mt-0.5">
                    <Coins className="w-3.5 h-3.5 text-emerald-400" />
                    🪙 {t.walletTokens || 0} Tk ({t.depositPercentage || 10}%)
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 uppercase block">Schedule Time</span>
                  <span className="text-cyan-300 font-bold flex items-center gap-1 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    {t.matchDate || t.time} {t.matchTime ? `@ ${t.matchTime}` : ''}
                  </span>
                </div>
              </div>

              {/* Sponsor Information Card if available */}
              {t.hasSponsor && (
                <div className="bg-cyan-950/30 border border-cyan-500/30 p-3 rounded-xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {t.sponsorLogoUrl ? (
                      <img 
                        src={t.sponsorLogoUrl} 
                        alt="Sponsor Logo" 
                        className="w-10 h-10 object-contain rounded-lg border border-cyan-500/40 bg-slate-900"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-cyan-900/50 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs">
                        SP
                      </div>
                    )}
                    <div>
                      <span className="text-[10px] text-cyan-400 uppercase font-mono font-bold block">Official Sponsor</span>
                      <p className="text-xs font-bold text-white">
                        {t.sponsorName || (t.sponsorLogoUrl ? 'Logo Sponsor' : 'None')}
                      </p>
                    </div>
                  </div>

                  {t.sponsorLinkUrl && (
                    <a
                      href={t.sponsorLinkUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono"
                    >
                      <span>Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              )}

              {/* Rejection Reason if present */}
              {t.rejectionReason && (
                <div className="bg-rose-950/40 border border-rose-500/30 p-3 rounded-xl text-xs text-rose-300">
                  <span className="font-bold uppercase tracking-wider block text-[10px] text-rose-400">Rejection Reason:</span>
                  <p className="mt-1">{t.rejectionReason}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Full Details Modal */}
      <AnimatePresence>
        {selectedTourney && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-cyan-500/30 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl my-8 max-h-[90vh] overflow-y-auto custom-scrollbar"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-cyan-400" />
                  <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
                    Tournament Full Details
                  </h3>
                </div>
                <button
                  onClick={() => setSelectedTourney(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tournament Identifiers */}
              <div className="bg-slate-950/80 p-4 rounded-xl border border-white/10 space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-lg font-black text-white">{selectedTourney.title}</h2>
                  <span className={`text-xs font-bold uppercase px-3 py-1 rounded-lg border ${
                    selectedTourney.status === 'Pending' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                    selectedTourney.status === 'Rejected' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                    'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  }`}>
                    {selectedTourney.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3 text-xs font-mono text-slate-400">
                  <span>Tournament ID: <strong className="text-cyan-300">{selectedTourney.id}</strong></span>
                  <span>Number: <strong className="text-cyan-300">#{selectedTourney.tournamentNumber || '---'}</strong></span>
                </div>
              </div>

              {/* Host Information */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-2">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Shield className="w-4 h-4" /> Host Profile
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                  <div><span className="text-slate-500">Host Name:</span> <strong className="text-white">{selectedTourney.hostName}</strong></div>
                  <div><span className="text-slate-500">Host ID:</span> <strong className="text-slate-300">{selectedTourney.hostId}</strong></div>
                  <div><span className="text-slate-500">Host Email:</span> <strong className="text-slate-300">{selectedTourney.hostEmail || 'N/A'}</strong></div>
                  <div><span className="text-slate-500">Star Rating:</span> <strong className="text-amber-400">⭐ {selectedTourney.hostStarRating || 5.0}</strong></div>
                </div>
              </div>

              {/* Sponsor Details */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Award className="w-4 h-4" /> Sponsor Information
                </h4>
                {selectedTourney.hasSponsor ? (
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-cyan-950/30 p-3 rounded-xl border border-cyan-500/20">
                    <div className="flex items-center gap-3">
                      {selectedTourney.sponsorLogoUrl ? (
                        <img 
                          src={selectedTourney.sponsorLogoUrl} 
                          alt="Sponsor Logo" 
                          className="w-16 h-16 object-contain rounded-xl border border-cyan-500/40 bg-slate-900"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-xl bg-cyan-900/50 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-sm">
                          SP
                        </div>
                      )}
                      <div>
                        <span className="text-[10px] text-cyan-400 uppercase font-mono font-bold block">Type: {selectedTourney.sponsorType}</span>
                        <p className="text-sm font-bold text-white mt-0.5">
                          {selectedTourney.sponsorName || (selectedTourney.sponsorLogoUrl ? 'Logo Sponsor Provided' : 'Sponsor Active')}
                        </p>
                      </div>
                    </div>

                    {selectedTourney.sponsorLinkUrl && (
                      <a
                        href={selectedTourney.sponsorLinkUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 text-xs font-bold rounded-lg border border-cyan-500/30 flex items-center gap-1.5 font-mono"
                      >
                        <span>Visit Link</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 font-mono">No sponsor configured for this tournament.</p>
                )}
              </div>

              {/* Format & Player Count Specs */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Users className="w-4 h-4" /> Tournament Format & Capacity
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase block">Game Category</span>
                    <span className="text-white font-bold uppercase">{selectedTourney.gameCategory || 'FreeFire'}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase block">Game Mode</span>
                    <span className="text-white font-bold uppercase">{selectedTourney.mode}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase block">Total Players Limit</span>
                    <span className="text-cyan-400 font-bold">{selectedTourney.maxPlayers} Players</span>
                  </div>
                  {selectedTourney.mode === 'squad' && (
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase block">Total Squads Limit</span>
                      <span className="text-cyan-400 font-bold">{selectedTourney.maxSquads} Squads</span>
                    </div>
                  )}
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase block">Map</span>
                    <span className="text-white font-bold">{selectedTourney.map || 'Bermuda'}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase block">Date & Time</span>
                    <span className="text-cyan-300 font-bold">{selectedTourney.matchDate} @ {selectedTourney.matchTime}</span>
                  </div>
                </div>
              </div>

              {/* Financial & Prize Pool Details */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <Coins className="w-4 h-4" /> Financial & Prize Distribution
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs font-mono">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-amber-500/20">
                    <span className="text-[10px] text-slate-500 uppercase block">Total Prize Pool</span>
                    <span className="text-amber-400 font-bold text-sm">🪙 {selectedTourney.prizePool || 0} Tk</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase block">Booyah Winner Prize</span>
                    <span className="text-emerald-400 font-bold">🪙 {selectedTourney.booyahPrize || 0} Tk</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase block">Runner Up Prize</span>
                    <span className="text-slate-200 font-bold">🪙 {selectedTourney.runnerUpPrize || 0} Tk</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase block">Per Kill Reward</span>
                    <span className="text-cyan-400 font-bold">🪙 {selectedTourney.perKill || 0} Tk</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase block">Player Entry Fee</span>
                    <span className="text-white font-bold">🪙 {selectedTourney.entryFee || 0} Tk</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-emerald-500/20">
                    <span className="text-[10px] text-slate-500 uppercase block">Host Deposit Transferred</span>
                    <span className="text-emerald-400 font-bold">🪙 {selectedTourney.walletTokens || 0} Tk ({selectedTourney.depositPercentage || 10}%)</span>
                  </div>
                </div>
              </div>

              {/* Location Restrictions & Rules */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-white/5 space-y-3">
                <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider font-mono flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" /> Location & Representation Rules
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs font-mono">
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase block">Restriction Level</span>
                    <span className="text-white font-bold uppercase">{selectedTourney.locationRestrictionType || 'All Bangladesh'}</span>
                  </div>
                  <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                    <span className="text-[10px] text-slate-500 uppercase block">Representation Rule</span>
                    <span className="text-white font-bold uppercase">{selectedTourney.representationRule || 'Open'}</span>
                  </div>
                  {selectedTourney.allowedDivision && (
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase block">Allowed Division</span>
                      <span className="text-cyan-300 font-bold">{selectedTourney.allowedDivision}</span>
                    </div>
                  )}
                  {selectedTourney.allowedDistrict && (
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase block">Allowed District</span>
                      <span className="text-cyan-300 font-bold">{selectedTourney.allowedDistrict}</span>
                    </div>
                  )}
                  {selectedTourney.allowedUpazila && (
                    <div className="bg-slate-900/80 p-2.5 rounded-lg border border-white/5">
                      <span className="text-[10px] text-slate-500 uppercase block">Allowed Upazila</span>
                      <span className="text-cyan-300 font-bold">{selectedTourney.allowedUpazila}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons in Modal */}
              {selectedTourney.status === 'Pending' && (
                <div className="flex gap-3 pt-3 border-t border-white/10">
                  <button
                    onClick={() => handleReject(selectedTourney.id)}
                    className="flex-1 py-2.5 bg-rose-600/20 hover:bg-rose-500 text-rose-400 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <XCircle className="w-4 h-4" />
                    Reject Tournament
                  </button>
                  <button
                    onClick={() => handleApprove(selectedTourney.id)}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold uppercase transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    Approve Tournament
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

