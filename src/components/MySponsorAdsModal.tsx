import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, getDocs } from 'firebase/firestore';
import { 
  X, 
  Calendar, 
  Clock, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle2, 
  Megaphone, 
  ExternalLink, 
  Sparkles, 
  Plus, 
  Trophy, 
  Coins, 
  Tag, 
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface MySponsorAdsModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  userProfile: any;
  onOpenTournamentAdSubmit?: (slotIndex: number) => void;
  onOpenLeagueAdSubmit?: () => void;
  initialTab?: 'tournament' | 'league';
}

export function MySponsorAdsModal({
  isOpen,
  onClose,
  user,
  userProfile,
  onOpenTournamentAdSubmit,
  onOpenLeagueAdSubmit,
  initialTab = 'tournament'
}: MySponsorAdsModalProps) {
  const [activeSubTab, setActiveSubTab] = useState<'tournament' | 'league'>(initialTab);
  
  // Tournament Ads state
  const [tournamentAds, setTournamentAds] = useState<any[]>([]);
  const [loadingTournament, setLoadingTournament] = useState(true);
  const [filterTournament, setFilterTournament] = useState<'all' | 'pending' | 'active' | 'ended'>('all');

  // League Ads state
  const [leagueAds, setLeagueAds] = useState<any[]>([]);
  const [loadingLeague, setLoadingLeague] = useState(true);
  const [filterLeague, setFilterLeague] = useState<'all' | 'pending' | 'active' | 'ended'>('all');

  useEffect(() => {
    if (initialTab) {
      setActiveSubTab(initialTab);
    }
  }, [initialTab]);

  // Fetch Tournament Sponsor Ads
  useEffect(() => {
    if (!isOpen || (!user && !userProfile)) return;

    setLoadingTournament(true);
    const userId = user?.uid || user?.userId || user?.id || userProfile?.userId || userProfile?.uid || userProfile?.id || null;
    const userEmail = userProfile?.email || user?.email || null;

    if (!userId && !userEmail) {
      setTournamentAds([]);
      setLoadingTournament(false);
      return;
    }

    const adsRef = collection(db, 'tournament_sponsor_ads');
    let qUser;
    if (userId) {
      qUser = query(adsRef, where('sponsorUid', '==', userId));
    } else {
      qUser = query(adsRef, where('sponsorEmail', '==', userEmail));
    }

    const unsubscribe = onSnapshot(qUser, (snapshot) => {
      let list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // Fallback query if empty & email exists
      if (list.length === 0 && userEmail && userId) {
        getDocs(query(adsRef, where('sponsorEmail', '==', userEmail))).then((emailSnap) => {
          let emailList = emailSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          sortAndSetTournament(emailList);
        }).catch(() => sortAndSetTournament([]));
      } else {
        sortAndSetTournament(list);
      }
      setLoadingTournament(false);
    }, (err) => {
      console.error("Error fetching tournament ads:", err);
      setLoadingTournament(false);
    });

    return () => unsubscribe();
  }, [isOpen, user, userProfile]);

  const sortAndSetTournament = (list: any[]) => {
    list.sort((a, b) => {
      const getMs = (val: any) => {
        if (!val) return 0;
        if (typeof val.toMillis === 'function') return val.toMillis();
        if (val.seconds !== undefined) return val.seconds * 1000;
        return new Date(val).getTime() || 0;
      };
      return getMs(b.createdAt) - getMs(a.createdAt);
    });
    setTournamentAds(list);
  };

  // Fetch League / Upazila Sponsor Ads
  useEffect(() => {
    if (!isOpen || (!user && !userProfile)) return;

    setLoadingLeague(true);
    const userId = user?.uid || user?.userId || user?.id || userProfile?.userId || userProfile?.uid || userProfile?.id || null;
    const userEmail = userProfile?.email || user?.email || null;

    if (!userId && !userEmail) {
      setLeagueAds([]);
      setLoadingLeague(false);
      return;
    }

    const adsRef = collection(db, 'upazila_sponsor_ads');
    let qUser;
    if (userId) {
      qUser = query(adsRef, where('userId', '==', userId));
    } else {
      qUser = query(adsRef, where('userEmail', '==', userEmail));
    }

    const unsubscribe = onSnapshot(qUser, (snapshot) => {
      let list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      if (list.length === 0 && userEmail && userId) {
        getDocs(query(adsRef, where('userEmail', '==', userEmail))).then((emailSnap) => {
          let emailList = emailSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          sortAndSetLeague(emailList);
        }).catch(() => sortAndSetLeague([]));
      } else {
        sortAndSetLeague(list);
      }
      setLoadingLeague(false);
    }, (err) => {
      console.error("Error fetching league ads:", err);
      setLoadingLeague(false);
    });

    return () => unsubscribe();
  }, [isOpen, user, userProfile]);

  const sortAndSetLeague = (list: any[]) => {
    list.sort((a, b) => {
      const getMs = (val: any) => {
        if (!val) return 0;
        if (typeof val.toMillis === 'function') return val.toMillis();
        if (val.seconds !== undefined) return val.seconds * 1000;
        return new Date(val).getTime() || 0;
      };
      return getMs(b.createdAt) - getMs(a.createdAt);
    });
    setLeagueAds(list);
  };

  if (!isOpen) return null;

  const formatDateTime = (val: any) => {
    if (!val) return 'Pending Approval';
    try {
      let d: Date;
      if (typeof val.toMillis === 'function') {
        d = new Date(val.toMillis());
      } else if (val.seconds !== undefined) {
        d = new Date(val.seconds * 1000);
      } else {
        d = new Date(val);
      }
      if (isNaN(d.getTime())) return 'Pending Approval';
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return 'Pending Approval';
    }
  };

  const getTimeRemaining = (ad: any) => {
    const endVal = ad.endDate || ad.expiryAt;
    if (ad.status !== 'active' || !endVal) return null;
    let endMs = 0;
    if (typeof endVal.toMillis === 'function') endMs = endVal.toMillis();
    else if (endVal.seconds !== undefined) endMs = endVal.seconds * 1000;
    else endMs = new Date(endVal).getTime() || 0;

    const diff = endMs - Date.now();
    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const secs = Math.floor((diff % (1000 * 60)) / 1000);
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;

    if (days > 0) return `${days}d ${remHours}h ${mins}m remaining`;
    if (hours > 0) return `${hours}h ${mins}m remaining`;
    return `${mins}m ${secs}s remaining`;
  };

  const isAdExpired = (ad: any) => {
    const endVal = ad.endDate || ad.expiryAt;
    if (!endVal) return false;
    let endMs = 0;
    if (typeof endVal.toMillis === 'function') endMs = endVal.toMillis();
    else if (endVal.seconds !== undefined) endMs = endVal.seconds * 1000;
    else endMs = new Date(endVal).getTime() || 0;
    return endMs > 0 && Date.now() > endMs;
  };

  const filteredTournaments = tournamentAds.filter(ad => {
    const expired = isAdExpired(ad);
    const status = ad.status || 'pending';
    if (filterTournament === 'active') return status === 'active' && !expired;
    if (filterTournament === 'pending') return status === 'pending';
    if (filterTournament === 'ended') return expired || status === 'expired' || status === 'rejected' || status === 'paused';
    return true;
  });

  const filteredLeagues = leagueAds.filter(ad => {
    const expired = isAdExpired(ad);
    const status = ad.status || 'pending';
    if (filterLeague === 'active') return status === 'active' && !expired;
    if (filterLeague === 'pending') return status === 'pending';
    if (filterLeague === 'ended') return expired || status === 'expired' || status === 'rejected' || status === 'paused';
    return true;
  });

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-md">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          className="bg-[#090d22] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-3 sm:p-4.5 shadow-neon-mixed relative overflow-hidden text-left max-h-[90vh] flex flex-col font-sans"
        >
          {/* Top Glow Accent Bar */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-cyan-500 to-cyan-500" />

          {/* Modal Header */}
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-cyan-500/15 border border-cyan-500/30 rounded-xl shadow-inner">
                <Megaphone className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  My Sponsor Ads
                </h3>
                <p className="text-[10px] text-slate-400 font-mono">
                  Track your submitted campaign applications, ad details & approval history
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Main Category Tabs: Tournament Sponsor Ads vs League Sponsor Ads */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-950/80 border border-white/10 rounded-xl mb-2 shrink-0">
            <button
              onClick={() => setActiveSubTab('tournament')}
              className={`py-1.5 px-2.5 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'tournament'
                  ? 'bg-gradient-to-r from-cyan-600 via-fuchsia-500 to-cyan-600 text-white shadow-md shadow-cyan-500/25 border border-cyan-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>Tournament Sponsor Ads</span>
              {tournamentAds.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[8.5px] bg-white/20 text-white rounded-full font-mono">
                  {tournamentAds.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveSubTab('league')}
              className={`py-1.5 px-2.5 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                activeSubTab === 'league'
                  ? 'bg-gradient-to-r from-cyan-600 via-fuchsia-500 to-cyan-600 text-white shadow-md shadow-cyan-500/25 border border-cyan-400/50'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>League Sponsor Ads</span>
              {leagueAds.length > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[8.5px] bg-white/20 text-white rounded-full font-mono">
                  {leagueAds.length}
                </span>
              )}
            </button>
          </div>

          {/* Duration Counting Policy Banner */}
          <div className="bg-cyan-950/40 border border-cyan-500/30 rounded-xl p-1.5 px-2.5 mb-2 text-[10px] font-mono flex items-center gap-2 shrink-0 shadow-inner">
            <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <div className="text-slate-300 leading-tight">
              <strong className="text-cyan-300">Duration Policy:</strong> Ad duration starts counting from approval when live on slot (1 Day = 24 Hours, 2 Days = 48 Hours).
            </div>
          </div>

          {/* SUB-TAB 1: TOURNAMENT SPONSOR ADS */}
          {activeSubTab === 'tournament' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Filter Toolbar */}
              <div className="flex items-center justify-between gap-1.5 mb-2 shrink-0 flex-wrap">
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                  {[
                    { id: 'all', label: 'All', count: tournamentAds.length },
                    { id: 'pending', label: 'Under Review', count: tournamentAds.filter(a => (a.status || 'pending') === 'pending').length },
                    { id: 'active', label: 'Active', count: tournamentAds.filter(a => a.status === 'active' && !isAdExpired(a)).length },
                    { id: 'ended', label: 'Ended / Other', count: tournamentAds.filter(a => isAdExpired(a) || a.status === 'rejected' || a.status === 'expired' || a.status === 'paused').length },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterTournament(tab.id as any)}
                      className={`px-2 py-1 rounded-lg font-mono text-[10px] font-bold transition-all border cursor-pointer flex items-center gap-1 ${
                        filterTournament === tab.id
                          ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50 shadow-sm'
                          : 'bg-slate-950/80 text-slate-400 hover:text-white border-white/10'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="px-1 py-0.1 rounded-full text-[8.5px] bg-white/10 text-slate-300 font-bold">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {onOpenTournamentAdSubmit && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenTournamentAdSubmit(0);
                    }}
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-[9.5px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-md shadow-cyan-500/20"
                  >
                    <Plus className="w-3 h-3" /> Apply New
                  </button>
                )}
              </div>

              {/* Tournament Ads List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {loadingTournament ? (
                  <div className="text-center py-10 text-slate-400 font-mono text-xs animate-pulse flex flex-col items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-400 animate-spin" />
                    <span>Loading tournament sponsor ad history...</span>
                  </div>
                ) : filteredTournaments.length === 0 ? (
                  <div className="py-8 bg-slate-950/60 border border-white/10 rounded-xl text-center space-y-2 p-4">
                    <Trophy className="w-8 h-8 text-slate-600 mx-auto opacity-50" />
                    <h4 className="text-white font-bold text-xs">No Tournament Ads Submitted</h4>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto font-mono leading-relaxed">
                      {filterTournament === 'all'
                        ? "You haven't submitted any tournament sponsor ad applications yet. Select an available slot on the Tournament grid to showcase your brand!"
                        : `No tournament sponsor ads matching the '${filterTournament}' filter.`}
                    </p>
                    {onOpenTournamentAdSubmit && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenTournamentAdSubmit(0);
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 via-fuchsia-500 to-cyan-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20 cursor-pointer inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Sponsor Tournament Slot
                      </button>
                    )}
                  </div>
                ) : (
                  filteredTournaments.map((ad) => {
                    const remaining = getTimeRemaining(ad);
                    const expired = isAdExpired(ad);
                    const status = ad.status || 'pending';

                    return (
                      <div
                        key={ad.id}
                        className="bg-slate-950 border border-cyan-500/20 hover:border-cyan-500/40 p-2.5 rounded-xl space-y-2 transition-all relative overflow-hidden group shadow-md"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            {/* Brand Logo Thumbnail */}
                            <div className="w-10 h-10 bg-slate-900 border border-cyan-500/30 rounded-lg overflow-hidden shrink-0 flex items-center justify-center p-0.5 relative shadow-inner">
                              {ad.logoUrl ? (
                                <img src={ad.logoUrl} alt="Brand Logo" className="w-full h-full object-contain rounded" referrerPolicy="no-referrer" />
                              ) : (
                                <Trophy className="w-4 h-4 text-slate-600" />
                              )}
                            </div>

                            {/* Main Info */}
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-extrabold text-xs text-white font-mono flex items-center gap-1">
                                  <span>{ad.sponsorName || 'Tournament Ad'}</span>
                                </h4>

                                <span className="text-[9px] font-black text-cyan-400 font-mono bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
                                  Slot #{ (ad.slotIndex ?? 0) + 1 }
                                </span>

                                {/* Status Badges */}
                                {status === 'pending' && (
                                  <span className="text-[9px] font-bold font-mono text-amber-300 bg-amber-500/15 px-2 py-0.2 rounded border border-amber-500/30 flex items-center gap-0.5 animate-pulse">
                                    ⏳ Under Review
                                  </span>
                                )}
                                {status === 'active' && !expired && (
                                  <span className="text-[9px] font-bold font-mono text-emerald-400 bg-emerald-500/15 px-2 py-0.2 rounded border border-emerald-500/30 flex items-center gap-0.5">
                                    🔥 Approved & Active
                                  </span>
                                )}
                                {status === 'paused' && (
                                  <span className="text-[9px] font-bold font-mono text-cyan-300 bg-cyan-500/20 px-1.5 py-0.2 rounded border border-cyan-500/30">
                                    ⏸️ Paused
                                  </span>
                                )}
                                {status === 'rejected' && (
                                  <span className="text-[9px] font-bold font-mono text-red-400 bg-red-500/15 px-1.5 py-0.2 rounded border border-red-500/30">
                                    ❌ Rejected (Refunded)
                                  </span>
                                )}
                                {(expired || status === 'expired') && (
                                  <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700">
                                    ⏰ Expired
                                  </span>
                                )}

                                {remaining && remaining !== 'Expired' && (
                                  <span className="text-[9px] font-bold font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/30 flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5 text-cyan-400" />
                                    {remaining}
                                  </span>
                                )}
                              </div>

                              {/* Target URL */}
                              {ad.targetUrl && (
                                <a
                                  href={ad.targetUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 font-mono mt-0.5 transition-colors truncate max-w-xs"
                                >
                                  <ExternalLink className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                                  <span className="truncate">{ad.targetUrl}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Rejection Note if exists */}
                        {status === 'rejected' && (ad.rejectionReason || ad.adminNote) && (
                          <div className="p-2 bg-red-950/40 border border-red-500/30 rounded-lg flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-red-200 font-mono">
                              <strong className="text-red-400">Reason:</strong> {ad.rejectionReason || ad.adminNote}
                            </p>
                          </div>
                        )}

                        {/* Details Grid & Timeline Console */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1.5 border-t border-white/10 text-[10px] font-mono">
                          <div className="bg-slate-900/90 p-1.5 rounded-lg border border-white/5 space-y-0">
                            <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Started At</span>
                            <span className="font-bold text-emerald-400 text-[9.5px] block truncate">
                              {(ad.startDate || ad.approvedAt) ? formatDateTime(ad.startDate || ad.approvedAt) : 'Pending Approval'}
                            </span>
                          </div>

                          <div className="bg-slate-900/90 p-1.5 rounded-lg border border-white/5 space-y-0">
                            <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Ends At</span>
                            <span className="font-bold text-cyan-300 text-[9.5px] block truncate">
                              {(ad.endDate || ad.expiryAt) ? formatDateTime(ad.endDate || ad.expiryAt) : (status === 'pending' ? 'Calculated on Approval' : 'Ended')}
                            </span>
                          </div>

                          <div className="bg-slate-900/90 p-1.5 rounded-lg border border-white/5 space-y-0">
                            <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Remaining Time</span>
                            <span className="font-bold text-cyan-300 text-[9.5px] block truncate">
                              {status === 'active' && remaining ? remaining : status === 'pending' ? 'Pending Approval' : 'Ended'}
                            </span>
                          </div>

                          <div className="bg-slate-900/90 p-1.5 rounded-lg border border-white/5 space-y-0">
                            <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Duration & Cost</span>
                            <span className="font-bold text-amber-400 text-[9.5px] flex items-center gap-0.5 truncate">
                              <Coins className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                              {ad.costTokens || ad.totalTokens || 0} Tokens ({(ad.durationDays || ad.days || 1)}d = {(ad.durationDays || ad.days || 1) * 24}h)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* SUB-TAB 2: LEAGUE SPONSOR ADS */}
          {activeSubTab === 'league' && (
            <div className="flex-1 flex flex-col min-h-0">
              {/* Filter Toolbar */}
              <div className="flex items-center justify-between gap-1.5 mb-2 shrink-0 flex-wrap">
                <div className="flex items-center gap-1 overflow-x-auto pb-0.5 scrollbar-none">
                  {[
                    { id: 'all', label: 'All', count: leagueAds.length },
                    { id: 'pending', label: 'Under Review', count: leagueAds.filter(a => (a.status || 'pending') === 'pending').length },
                    { id: 'active', label: 'Active', count: leagueAds.filter(a => a.status === 'active' && !isAdExpired(a)).length },
                    { id: 'ended', label: 'Ended / Other', count: leagueAds.filter(a => isAdExpired(a) || a.status === 'rejected' || a.status === 'expired' || a.status === 'paused').length },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setFilterLeague(tab.id as any)}
                      className={`px-2 py-1 rounded-lg font-mono text-[10px] font-bold transition-all border cursor-pointer flex items-center gap-1 ${
                        filterLeague === tab.id
                          ? 'bg-cyan-600/30 text-cyan-300 border-cyan-500/50 shadow-sm'
                          : 'bg-slate-950/80 text-slate-400 hover:text-white border-white/10'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className="px-1 py-0.1 rounded-full text-[8.5px] bg-white/10 text-slate-300 font-bold">
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {onOpenLeagueAdSubmit && (
                  <button
                    onClick={() => {
                      onClose();
                      onOpenLeagueAdSubmit();
                    }}
                    className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-lg text-[9.5px] uppercase tracking-wider transition-all flex items-center gap-1 cursor-pointer shadow-md shadow-cyan-500/20"
                  >
                    <Plus className="w-3 h-3" /> Apply New
                  </button>
                )}
              </div>

              {/* League Ads List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                {loadingLeague ? (
                  <div className="text-center py-10 text-slate-400 font-mono text-xs animate-pulse flex flex-col items-center justify-center gap-2">
                    <Sparkles className="w-5 h-5 text-cyan-400 animate-spin" />
                    <span>Loading league sponsor ad history...</span>
                  </div>
                ) : filteredLeagues.length === 0 ? (
                  <div className="py-8 bg-slate-950/60 border border-white/10 rounded-xl text-center space-y-2 p-4">
                    <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto opacity-50" />
                    <h4 className="text-white font-bold text-xs">No League Ads Submitted</h4>
                    <p className="text-[11px] text-slate-400 max-w-sm mx-auto font-mono leading-relaxed">
                      {filterLeague === 'all'
                        ? "You haven't submitted any league sponsor ad applications yet. Select a slot on the Upazila League banner to showcase your brand!"
                        : `No league sponsor ads matching the '${filterLeague}' filter.`}
                    </p>
                    {onOpenLeagueAdSubmit && (
                      <button
                        onClick={() => {
                          onClose();
                          onOpenLeagueAdSubmit();
                        }}
                        className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 via-fuchsia-500 to-cyan-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white font-bold rounded-lg text-[10px] uppercase tracking-wider transition-all shadow-md shadow-cyan-500/20 cursor-pointer inline-flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Sponsor League Slot
                      </button>
                    )}
                  </div>
                ) : (
                  filteredLeagues.map((ad) => {
                    const remaining = getTimeRemaining(ad);
                    const expired = isAdExpired(ad);
                    const status = ad.status || 'pending';

                    return (
                      <div
                        key={ad.id}
                        className="bg-slate-950 border border-cyan-500/20 hover:border-cyan-500/40 p-2.5 rounded-xl space-y-2 transition-all relative overflow-hidden group shadow-md"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            {/* Brand Logo Thumbnail */}
                            <div className="w-10 h-10 bg-slate-900 border border-cyan-500/30 rounded-lg overflow-hidden shrink-0 flex items-center justify-center p-0.5 relative shadow-inner">
                              {ad.logoUrl ? (
                                <img src={ad.logoUrl} alt={ad.brandName} className="w-full h-full object-contain rounded" referrerPolicy="no-referrer" />
                              ) : (
                                <Megaphone className="w-4 h-4 text-slate-600" />
                              )}
                            </div>

                            {/* Main Info */}
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <h4 className="font-extrabold text-xs text-white font-mono">{ad.brandName || 'League Ad'}</h4>

                                <span className="text-[9px] font-black text-cyan-400 font-mono bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/20">
                                  Upazila Slot #{ (ad.slotIndex ?? 0) + 1 }
                                </span>

                                {/* Status Badges */}
                                {status === 'pending' && (
                                  <span className="text-[9px] font-bold font-mono text-amber-300 bg-amber-500/15 px-2 py-0.2 rounded border border-amber-500/30 flex items-center gap-0.5 animate-pulse">
                                    ⏳ Under Review
                                  </span>
                                )}
                                {status === 'active' && !expired && (
                                  <span className="text-[9px] font-bold font-mono text-emerald-400 bg-emerald-500/15 px-2 py-0.2 rounded border border-emerald-500/30 flex items-center gap-0.5">
                                    🔥 Approved & Active
                                  </span>
                                )}
                                {status === 'paused' && (
                                  <span className="text-[9px] font-bold font-mono text-cyan-300 bg-cyan-500/20 px-1.5 py-0.2 rounded border border-cyan-500/30">
                                    ⏸️ Paused
                                  </span>
                                )}
                                {status === 'rejected' && (
                                  <span className="text-[9px] font-bold font-mono text-red-400 bg-red-500/15 px-1.5 py-0.2 rounded border border-red-500/30">
                                    ❌ Rejected (Refunded)
                                  </span>
                                )}
                                {(expired || status === 'expired') && (
                                  <span className="text-[9px] font-bold font-mono text-slate-400 bg-slate-800/80 px-1.5 py-0.2 rounded border border-slate-700">
                                    ⏰ Expired
                                  </span>
                                )}

                                {remaining && remaining !== 'Expired' && (
                                  <span className="text-[9px] font-bold font-mono text-cyan-300 bg-cyan-500/10 px-1.5 py-0.2 rounded border border-cyan-500/30 flex items-center gap-0.5">
                                    <Clock className="w-2.5 h-2.5 text-cyan-400" />
                                    {remaining}
                                  </span>
                                )}
                              </div>

                              {/* Target URL */}
                              {ad.targetUrl && (
                                <a
                                  href={ad.targetUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[10px] text-slate-400 hover:text-cyan-300 flex items-center gap-1 font-mono mt-0.5 transition-colors truncate max-w-xs"
                                >
                                  <ExternalLink className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                                  <span className="truncate">{ad.targetUrl}</span>
                                </a>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Rejection Note if exists */}
                        {status === 'rejected' && (ad.rejectionReason || ad.adminNote) && (
                          <div className="p-2 bg-red-950/40 border border-red-500/30 rounded-lg flex items-start gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                            <p className="text-[10px] text-red-200 font-mono">
                              <strong className="text-red-400">Reason:</strong> {ad.rejectionReason || ad.adminNote}
                            </p>
                          </div>
                        )}

                        {/* Details Grid & Timeline Console */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1.5 border-t border-white/10 text-[10px] font-mono">
                          <div className="bg-slate-900/90 p-1.5 rounded-lg border border-white/5 space-y-0">
                            <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Started At</span>
                            <span className="font-bold text-emerald-400 text-[9.5px] block truncate">
                              {(ad.startDate || ad.approvedAt) ? formatDateTime(ad.startDate || ad.approvedAt) : 'Pending Approval'}
                            </span>
                          </div>

                          <div className="bg-slate-900/90 p-1.5 rounded-lg border border-white/5 space-y-0">
                            <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Ends At</span>
                            <span className="font-bold text-cyan-300 text-[9.5px] block truncate">
                              {(ad.endDate || ad.expiryAt) ? formatDateTime(ad.endDate || ad.expiryAt) : (status === 'pending' ? 'Calculated on Approval' : 'Ended')}
                            </span>
                          </div>

                          <div className="bg-slate-900/90 p-1.5 rounded-lg border border-white/5 space-y-0">
                            <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Remaining Time</span>
                            <span className="font-bold text-cyan-300 text-[9.5px] block truncate">
                              {status === 'active' && remaining ? remaining : status === 'pending' ? 'Pending Approval' : 'Ended'}
                            </span>
                          </div>

                          <div className="bg-slate-900/90 p-1.5 rounded-lg border border-white/5 space-y-0">
                            <span className="text-[8.5px] text-slate-500 uppercase block font-bold">Duration & Cost</span>
                            <span className="font-bold text-amber-400 text-[9.5px] flex items-center gap-0.5 truncate">
                              <Coins className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                              {ad.cost || ad.costTokens || ad.totalTokens || 0} Tokens ({(ad.days || ad.durationDays || 1)}d = {(ad.days || ad.durationDays || 1) * 24}h)
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
