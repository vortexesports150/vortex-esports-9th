import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Loader2, Shield, Check, X, AlertCircle, Wallet, Lock, Unlock, MapPin, FileCheck, ShieldAlert, FileText, Image, Eye, CalendarDays, Calendar, Clock, MoreVertical, Percent } from 'lucide-react';
import { db } from '../lib/firebase';
import { runTransaction, doc, collection, query, where, getDocs, updateDoc, addDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { ProHostedLeague } from '../types';
import PrizeDistributionModal from './PrizeDistributionModal';

interface ProLeagueAdminProps {
  initialTab?: 'leagues' | 'league_wallets' | 'suspended_hosts';
}

export function ProLeagueAdmin({ initialTab = 'leagues' }: ProLeagueAdminProps = {}) {
  const [leagues, setLeagues] = useState<ProHostedLeague[]>([]);
  const [leagueMatches, setLeagueMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  
  // Host Wallets Admin section states
  const [activeTab, setActiveTab] = useState<'leagues' | 'league_wallets' | 'suspended_hosts'>(initialTab);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);
  const [leagueStatusTab, setLeagueStatusTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [hostWallets, setHostWallets] = useState<any[]>([]);
  const [loadingWallets, setLoadingWallets] = useState<boolean>(true);
  
  // Suspended Hosts admin state
  const [suspendedHostsList, setSuspendedHostsList] = useState<any[]>([]);
  const [loadingSuspendedHosts, setLoadingSuspendedHosts] = useState<boolean>(false);
  const [openHostMenuId, setOpenHostMenuId] = useState<string | null>(null);
  const [viewHostDetailsModal, setViewHostDetailsModal] = useState<any | null>(null);

  // Suspend Host from League Modal state
  const [hostToSuspendModal, setHostToSuspendModal] = useState<{
    hostId: string;
    hostName: string;
    hostEmail?: string;
    hostPhone?: string;
    hostPhoto?: string;
    leagueId: string;
    leagueName: string;
  } | null>(null);
  const [suspendDuration, setSuspendDuration] = useState<'1_day' | '2_days' | '7_days' | '1_month' | '3_months' | '6_months' | 'lifetime'>('7_days');
  const [suspendReason, setSuspendReason] = useState<string>('');
  const [isSubmittingAdminSuspend, setIsSubmittingAdminSuspend] = useState<boolean>(false);
  
  const [unsuspendConfirmModal, setUnsuspendConfirmModal] = useState<{hostId: string, hostName: string} | null>(null);
  const [isSubmittingUnsuspend, setIsSubmittingUnsuspend] = useState(false);
  
  // Pagination & Modals state
  const [leagueWalletsPage, setLeagueWalletsPage] = useState(1);
  const [prizeModalLeagueId, setPrizeModalLeagueId] = useState<string | null>(null);
  const [unlockModalLeague, setUnlockModalLeague] = useState<ProHostedLeague | null>(null);
  const [leagueProfitPercentage, setLeagueProfitPercentage] = useState<number>(10);
  const [unlocking, setUnlocking] = useState<boolean>(false);

  const fetchSuspendedHosts = async () => {
    setLoadingSuspendedHosts(true);
    try {
      const q = query(collection(db, 'host_suspensions'));
      const snap = await getDocs(q);
      const list: any[] = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Also check users collection for active host suspensions
      const usersQ = query(collection(db, 'users'), where('isHostSuspended', '==', true));
      const userSnap = await getDocs(usersQ);
      
      userSnap.docs.forEach(uDoc => {
        const uData = uDoc.data();
        const existing = list.find(item => item.hostId === uDoc.id && item.status === 'active');
        if (!existing) {
          list.push({
            id: `usr_${uDoc.id}`,
            hostId: uDoc.id,
            hostName: uData.displayName || uData.gameName || 'Host',
            hostEmail: uData.email || '',
            hostPhone: uData.mobile || uData.phone || uData.phoneNumber || '',
            hostPhoto: uData.photoURL || uData.avatarUrl || '',
            leagueId: uData.hostSuspensionLeagueId || '',
            leagueName: uData.hostSuspensionLeagueName || 'Pro League',
            reason: uData.hostSuspensionReason || 'Account Suspended',
            durationLabel: uData.hostSuspensionDurationLabel || 'Active Suspension',
            suspendedAt: uData.hostSuspendedAt || new Date().toISOString(),
            suspendedUntil: uData.hostSuspensionUntil || null,
            isLifetime: uData.hostSuspensionIsLifetime || false,
            status: 'active'
          });
        }
      });

      list.sort((a, b) => new Date(b.suspendedAt || 0).getTime() - new Date(a.suspendedAt || 0).getTime());
      setSuspendedHostsList(list);
    } catch (err) {
      console.error("Error fetching suspended hosts:", err);
    } finally {
      setLoadingSuspendedHosts(false);
    }
  };

  const handleUnsuspendHostInAdmin = async () => {
    if (!unsuspendConfirmModal) return;
    setIsSubmittingUnsuspend(true);
    try {
      const { hostId, hostName } = unsuspendConfirmModal;
      // 1. Update user document
      await updateDoc(doc(db, 'users', hostId), {
        isHostSuspended: false,
        hostSuspensionUntil: null,
        hostSuspensionReason: null
      });

      // 2. Update host_suspensions collection docs
      const q = query(
        collection(db, 'host_suspensions'),
        where('hostId', '==', hostId),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await updateDoc(doc(db, 'host_suspensions', d.id), {
          status: 'unsuspended',
          unsuspendedAt: new Date().toISOString()
        });
      }

      setOpenHostMenuId(null);
      if (viewHostDetailsModal?.hostId === hostId) {
        setViewHostDetailsModal(null);
      }
      setUnsuspendConfirmModal(null);
      fetchSuspendedHosts();
    } catch (e: any) {
      console.error("Error unsuspending host:", e);
    } finally {
      setIsSubmittingUnsuspend(false);
    }
  };

  const handleAdminSuspendHostSubmit = async () => {
    if (!hostToSuspendModal) return;
    if (!suspendReason.trim()) {
      alert("Please enter a reason for suspending this host.");
      return;
    }

    setIsSubmittingAdminSuspend(true);
    try {
      const durationLabelMap: Record<string, string> = {
        '1_day': '1 Day',
        '2_days': '2 Days',
        '7_days': '7 Days',
        '1_month': '1 Month',
        '3_months': '3 Months',
        '6_months': '6 Months',
        'lifetime': 'Lifetime Suspension'
      };
      const durationLabel = durationLabelMap[suspendDuration] || '7 Days';

      let suspendedUntilIso: string | null = null;
      const now = new Date();
      if (suspendDuration === '1_day') {
        now.setDate(now.getDate() + 1);
        suspendedUntilIso = now.toISOString();
      } else if (suspendDuration === '2_days') {
        now.setDate(now.getDate() + 2);
        suspendedUntilIso = now.toISOString();
      } else if (suspendDuration === '7_days') {
        now.setDate(now.getDate() + 7);
        suspendedUntilIso = now.toISOString();
      } else if (suspendDuration === '1_month') {
        now.setMonth(now.getMonth() + 1);
        suspendedUntilIso = now.toISOString();
      } else if (suspendDuration === '3_months') {
        now.setMonth(now.getMonth() + 3);
        suspendedUntilIso = now.toISOString();
      } else if (suspendDuration === '6_months') {
        now.setMonth(now.getMonth() + 6);
        suspendedUntilIso = now.toISOString();
      } else if (suspendDuration === 'lifetime') {
        suspendedUntilIso = null;
      }

      const { hostId, hostName, hostEmail, hostPhone, hostPhoto, leagueId, leagueName } = hostToSuspendModal;

      // 1. Update user document
      await updateDoc(doc(db, 'users', hostId), {
        isHostSuspended: true,
        hostSuspensionReason: suspendReason.trim(),
        hostSuspensionLeagueId: leagueId || '',
        hostSuspensionLeagueName: leagueName || 'Pro League',
        hostSuspensionDurationLabel: durationLabel,
        hostSuspensionUntil: suspendedUntilIso,
        hostSuspensionIsLifetime: suspendDuration === 'lifetime',
        hostSuspendedAt: new Date().toISOString()
      });

      // 2. Add record to host_suspensions collection
      await addDoc(collection(db, 'host_suspensions'), {
        hostId,
        hostName: hostName || 'Host',
        hostEmail: hostEmail || '',
        hostPhone: hostPhone || '',
        hostPhoto: hostPhoto || '',
        leagueId: leagueId || '',
        leagueName: leagueName || 'Pro League',
        reason: suspendReason.trim(),
        durationLabel,
        suspendedAt: new Date().toISOString(),
        suspendedUntil: suspendedUntilIso,
        isLifetime: suspendDuration === 'lifetime',
        status: 'active',
        suspendedBy: 'admin'
      });

      alert(`Host "${hostName}" has been successfully suspended for ${durationLabel}.`);
      setHostToSuspendModal(null);
      setSuspendReason('');
      setSuspendDuration('7_days');
      setActiveTab('suspended_hosts');
      fetchSuspendedHosts();
    } catch (err: any) {
      console.error("Error suspending host:", err);
      alert("Failed to suspend host: " + err.message);
    } finally {
      setIsSubmittingAdminSuspend(false);
    }
  };

  const openUnlockModal = async (league: ProHostedLeague) => {
    try {
      const configSnap = await getDoc(doc(db, 'system_config', 'league_percentage'));
      if (configSnap.exists() && typeof configSnap.data()?.profitPercentage === 'number') {
        setLeagueProfitPercentage(configSnap.data().profitPercentage);
      } else {
        setLeagueProfitPercentage(10);
      }
    } catch (e) {
      setLeagueProfitPercentage(10);
    }
    setUnlockModalLeague(league);
  };

  const handleLockLeagueWallet = async (league: ProHostedLeague) => {
    if (!confirm(`Are you sure you want to lock the league wallet for "${league.leagueName}"?`)) return;
    setProcessing(league.id);
    try {
      await runTransaction(db, async (transaction) => {
        const proLeagueRef = doc(db, 'pro_hosted_leagues', league.id);
        const upazilaRef = doc(db, 'upazila_leagues', league.id);
        const hostWalletRef = doc(db, 'host_wallets', league.hostId);

        const proSnap = await transaction.get(proLeagueRef);
        const upazilaSnap = await transaction.get(upazilaRef);
        const hostWalletSnap = await transaction.get(hostWalletRef);

        if (proSnap.exists()) {
          transaction.update(proLeagueRef, {
            walletStatus: 'locked',
            lockedAt: new Date().toISOString()
          });
        }

        if (upazilaSnap.exists()) {
          transaction.update(upazilaRef, {
            walletStatus: 'locked'
          });
        }

        if (hostWalletSnap.exists()) {
          transaction.update(hostWalletRef, {
            isLocked: true,
            updatedAt: new Date().toISOString()
          });
        } else {
          transaction.set(hostWalletRef, {
            isLocked: true,
            updatedAt: new Date().toISOString()
          });
        }
      });

      alert(`Successfully locked League Wallet for "${league.leagueName}".`);
      fetchLeagues();
      fetchHostWallets();
    } catch (e: any) {
      console.error(e);
      alert('Failed to lock league wallet: ' + e.message);
    } finally {
      setProcessing(null);
    }
  };

  const executeUnlockLeagueWallet = async () => {
    if (!unlockModalLeague) return;
    setUnlocking(true);
    const league = unlockModalLeague;
    const balance = league.walletBalance || 0;
    const isAlreadyDeducted = typeof league.profitDeducted === 'number' && league.profitDeducted > 0;
    const profitDeducted = isAlreadyDeducted ? 0 : Math.round((balance * leagueProfitPercentage) / 100);
    const hostUnlockedAmount = isAlreadyDeducted ? balance : Math.max(0, balance - profitDeducted);

    try {
      await runTransaction(db, async (transaction) => {
        // 1. System wallet read
        const sysWalletRef = doc(db, 'system', 'wallets');
        const sysSnap = await transaction.get(sysWalletRef);

        const proLeagueRef = doc(db, 'pro_hosted_leagues', league.id);
        const proSnap = await transaction.get(proLeagueRef);

        const upazilaRef = doc(db, 'upazila_leagues', league.id);
        const upazilaSnap = await transaction.get(upazilaRef);

        const hostWalletRef = doc(db, 'host_wallets', league.hostId);
        const hostWalletSnap = await transaction.get(hostWalletRef);

        // 2. Perform writes only if profit was not deducted yet
        if (!isAlreadyDeducted && profitDeducted > 0) {
          if (!sysSnap.exists()) {
            transaction.set(sysWalletRef, {
              leagueProfitWallet: profitDeducted,
              leagueProfitWalletTotal: profitDeducted,
              createdAt: new Date().toISOString()
            }, { merge: true });
          } else {
            const currentProfit = sysSnap.data().leagueProfitWallet || 0;
            const currentProfitTotal = sysSnap.data().leagueProfitWalletTotal || 0;
            transaction.update(sysWalletRef, {
              leagueProfitWallet: currentProfit + profitDeducted,
              leagueProfitWalletTotal: currentProfitTotal + profitDeducted
            });
          }

          // Add history for League Profit Wallet
          const sysHistRef = doc(collection(db, 'system', 'wallets', 'history'));
          transaction.set(sysHistRef, {
            walletType: 'leagueProfitWallet',
            amountAdded: profitDeducted,
            amountDeducted: 0,
            type: 'addition',
            reason: `League Profit Deduction (${leagueProfitPercentage}%) - ${league.leagueName}`,
            createdAt: serverTimestamp()
          });
        }

        // Update pro_hosted_leagues
        if (proSnap.exists()) {
          const updateData: any = {
            walletStatus: 'active',
            walletBalance: hostUnlockedAmount,
            unlockedAt: new Date().toISOString()
          };
          if (!isAlreadyDeducted) {
            updateData.profitDeducted = profitDeducted;
            updateData.profitPercentage = leagueProfitPercentage;
          }
          transaction.update(proLeagueRef, updateData);
        }

        // Update upazila_leagues if present
        if (upazilaSnap.exists()) {
          transaction.update(upazilaRef, {
            walletStatus: 'active',
            walletBalance: hostUnlockedAmount
          });
        }

        // Unlock Host Wallet
        if (hostWalletSnap.exists()) {
          transaction.update(hostWalletRef, {
            isLocked: false,
            updatedAt: new Date().toISOString()
          });
        } else {
          transaction.set(hostWalletRef, {
            isLocked: false,
            updatedAt: new Date().toISOString()
          });
        }
      });

      alert(`Successfully unlocked League Wallet! ${isAlreadyDeducted ? 'Wallet activated without repeating profit deduction.' : `${profitDeducted} Tokens deducted (${leagueProfitPercentage}%) and transferred to League Profit Wallet.`}`);
      setUnlockModalLeague(null);
      fetchLeagues();
      fetchHostWallets();
    } catch (e: any) {
      console.error(e);
      alert('Failed to unlock league wallet: ' + e.message);
    } finally {
      setUnlocking(false);
    }
  };
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  
  // Schedule View Modal state
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [selectedLeagueForSchedule, setSelectedLeagueForSchedule] = useState<ProHostedLeague | null>(null);

  const fetchLeagues = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'pro_hosted_leagues'));
      const snapshot = await getDocs(q);
      const data = await Promise.all(snapshot.docs.map(async (docSnap) => {
        const lData = { id: docSnap.id, ...docSnap.data() } as ProHostedLeague;
        if ((!lData.hostUpazila || !lData.hostDistrict) && lData.hostId) {
          try {
            const userDocRef = doc(db, 'users', lData.hostId);
            const userSnap = await getDoc(userDocRef);
            if (userSnap.exists()) {
              const uData = userSnap.data();
              lData.hostUpazila = uData.upazila || lData.hostUpazila || '';
              lData.hostDistrict = uData.district || lData.hostDistrict || '';
              lData.hostDivision = uData.division || lData.hostDivision || '';
            }
          } catch (e) {
            console.error("Error fetching host user profile:", e);
          }
        }
        return lData;
      }));
      data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setLeagues(data);

      try {
        const matchesSnap = await getDocs(collection(db, 'pro_league_schedule_matches'));
        const matchesList = matchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setLeagueMatches(matchesList);
      } catch (err) {
        console.error("Error fetching pro league schedule matches:", err);
      }
    } catch (err) {
      console.error("Error fetching leagues:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchHostWallets = async () => {
    setLoadingWallets(true);
    try {
      const q = query(collection(db, 'host_wallets'));
      const snap = await getDocs(q);
      const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHostWallets(list);
    } catch (err) {
      console.error("Error fetching host wallets:", err);
    } finally {
      setLoadingWallets(false);
    }
  };

  
  useEffect(() => {
    fetchLeagues();
    fetchHostWallets();
    fetchSuspendedHosts();
  }, []);

  useEffect(() => {
    if (activeTab === 'suspended_hosts') {
      fetchSuspendedHosts();
    }
  }, [activeTab]);

  // Reset pagination when status tab changes
  useEffect(() => {
    setCurrentPage(1);
  }, [leagueStatusTab]);

  const handleStatusChange = async (leagueId: string, newStatus: 'approved' | 'rejected') => {
    if (processing) return;
    setProcessing(leagueId);
    try {
      await runTransaction(db, async (transaction) => {
        const leagueRef = doc(db, 'pro_hosted_leagues', leagueId);
        const leagueDoc = await transaction.get(leagueRef);
        
        if (!leagueDoc.exists()) throw new Error("League doc not found");
        const leagueData = leagueDoc.data() as ProHostedLeague;
        const hostId = leagueData.hostId;
        
        const hostWalletRef = doc(db, 'host_wallets', hostId);
        
        if (newStatus === 'rejected') {
          // Unlock host wallet so host can refund/withdraw
          transaction.set(hostWalletRef, {
            isLocked: false,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        } else if (newStatus === 'approved') {
          // Keep it locked
          transaction.set(hostWalletRef, {
            isLocked: true,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
        
        transaction.update(leagueRef, { 
          status: newStatus, 
          walletStatus: newStatus === 'approved' ? 'locked' : 'active',
          updatedAt: new Date().toISOString() 
        });
      });
      
      setLeagues(leagues.map(l => l.id === leagueId ? { ...l, status: newStatus } : l));
      // Refresh wallets state in admin view
      fetchHostWallets();
    } catch (err: any) {
      console.error(err);
      alert('Error updating league status: ' + err.message);
    } finally {
      setProcessing(null);
    }
  };

  const [antiDopingNotes, setAntiDopingNotes] = useState<{ [key: string]: string }>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const filteredLeagues = leagues.filter(l => l.status === leagueStatusTab);
  const totalPages = Math.ceil(filteredLeagues.length / itemsPerPage);
  const paginatedLeagues = filteredLeagues.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const handleAntiDopingUpdate = async (leagueId: string, status: 'submitted' | 'missing' | 'verified' | 'flagged', note?: string) => {
    try {
      const leagueRef = doc(db, 'pro_hosted_leagues', leagueId);
      const updateData: any = {
        antiDopingStatus: status,
        updatedAt: new Date().toISOString()
      };
      if (typeof note === 'string') {
        updateData.antiDopingNote = note;
      }
      await updateDoc(leagueRef, updateData);
      setLeagues(prev => prev.map(l => l.id === leagueId ? { ...l, antiDopingStatus: status, antiDopingNote: note ?? l.antiDopingNote } : l));
      alert(`Anti-Doping status updated to ${status.toUpperCase()}!`);
    } catch (err: any) {
      console.error(err);
      alert('Failed to update anti-doping status: ' + err.message);
    }
  };

  const handleToggleLock = async (hostId: string, currentLockState: boolean) => {
    try {
      const walletRef = doc(db, 'host_wallets', hostId);
      await runTransaction(db, async (transaction) => {
        transaction.update(walletRef, {
          isLocked: !currentLockState,
          updatedAt: new Date().toISOString()
        });
      });
      setHostWallets(prev => prev.map(w => w.id === hostId ? { ...w, isLocked: !currentLockState } : w));
    } catch (err) {
      console.error(err);
      alert("Failed to toggle host wallet lock.");
    }
  };

  return (
    <div className="bg-[#090d22] border border-cyan-500/20 p-4 sm:p-5 rounded-2xl shadow-2xl mt-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-cyan-950/40 flex items-center justify-center text-cyan-400 shrink-0 border border-cyan-500/20 shadow-[0_0_15px_rgba(6,182,212,0.15)]">
            <Trophy className="h-5 w-5 animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Pro Host Administration</h3>
            <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Approve leagues and manage active wallets</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-slate-950 p-1 rounded-xl border border-white/5 self-start sm:self-auto shrink-0">
          <button
            onClick={() => setActiveTab('leagues')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'leagues'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Leagues Review
          </button>
          <button
            onClick={() => setActiveTab('league_wallets')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
              activeTab === 'league_wallets'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            League Wallets
          </button>
          <button
            onClick={() => setActiveTab('suspended_hosts')}
            className={`px-4 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
              activeTab === 'suspended_hosts'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5" />
            Suspended Hosts ({suspendedHostsList.filter(h => h.status === 'active').length})
          </button>
        </div>
      </div>

      {activeTab === 'leagues' && (
        <div className="space-y-4">
          {/* Status Tab Filter */}
          <div className="flex gap-2 bg-slate-900/50 p-1 rounded-xl border border-white/5 self-start">
            {(['pending', 'approved', 'rejected'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setLeagueStatusTab(status)}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all border ${
                  leagueStatusTab === status
                    ? status === 'approved' ? 'bg-green-600 border-green-500 text-white shadow-lg' :
                      status === 'pending' ? 'bg-yellow-600 border-yellow-500 text-white shadow-lg' :
                      'bg-red-600 border-red-500 text-white shadow-lg'
                    : 'bg-transparent border-transparent text-slate-400 hover:text-white'
                }`}
              >
                {status} ({leagues.filter(l => l.status === status).length})
              </button>
            ))}
          </div>

          {loading ? (
            <div className="text-slate-400 text-sm text-center py-8 font-mono">Loading hosted leagues...</div>
          ) : paginatedLeagues.length === 0 ? (
            <div className="text-slate-400 text-sm text-center py-8 font-mono">No {leagueStatusTab} leagues found.</div>
          ) : (
            <>
              <div className="space-y-4">
                {paginatedLeagues.map(league => (
                  <div key={league.id} className="p-4 sm:p-5 bg-slate-950/70 border border-white/10 rounded-2xl flex flex-col gap-4 transition hover:border-cyan-500/30">
                    {/* Header Row: Host Photo, Host Name, League Number & Status */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={league.hostPhotoUrl || league.logoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                          alt="Host Photo"
                          className="w-12 h-12 rounded-xl object-cover border border-cyan-500/40 shrink-0 shadow-lg"
                        />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono bg-cyan-950 text-cyan-400 border border-cyan-500/30 uppercase">
                              ID: {league.id}
                            </span>
                            <span className={`px-2.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              league.status === 'approved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                              league.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse' :
                              'bg-red-500/10 text-red-400 border border-red-500/20'
                            }`}>
                              {league.status}
                            </span>
                          </div>
                          <h4 className="text-white font-black text-base font-mono uppercase tracking-wider mt-0.5">{league.leagueName}</h4>
                          <p className="text-slate-400 text-xs font-semibold">
                            {league.brandName} • Host: <span className="text-cyan-400 font-bold">{league.hostName}</span> ({league.hostEmail})
                            {(league.hostUpazila || league.hostDistrict) && (
                              <span className="ml-1 text-slate-300">• 📍 Host Location: <strong className="text-emerald-400">{league.hostUpazila || 'N/A'}, {league.hostDistrict || 'N/A'}</strong></span>
                            )}
                          </p>
                        </div>
                      </div>

                      <div className="relative shrink-0 self-end sm:self-center">
                        <button 
                          onClick={() => setOpenMenuId(openMenuId === league.id ? null : league.id)}
                          className="p-2 hover:bg-white/10 rounded-xl transition border border-white/10 text-slate-400 hover:text-white cursor-pointer"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        <AnimatePresence>
                          {openMenuId === league.id && (
                            <>
                              <div 
                                className="fixed inset-0 z-[60]" 
                                onClick={() => setOpenMenuId(null)}
                              />
                              <motion.div
                                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                className="absolute right-0 mt-2 w-52 bg-[#0f172a] border border-white/10 rounded-xl shadow-2xl z-[70] overflow-hidden py-1.5"
                              >
                                <div className="px-4 py-2 border-b border-white/5 bg-cyan-500/5">
                                  <div className="flex items-center gap-2 text-cyan-400">
                                    <Wallet className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">League Wallet</span>
                                  </div>
                                  <div className="text-sm font-bold text-white mt-0.5">{league.walletBalance || 0} Tokens</div>
                                </div>

                                <button
                                  onClick={() => {
                                    setSelectedLeagueForSchedule(league);
                                    setShowFullSchedule(true);
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-white/5 text-slate-300 hover:text-cyan-400 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <CalendarDays className="w-4 h-4" />
                                  Review Schedule
                                </button>

                                {league.walletStatus === 'locked' && (
                                  <button
                                    onClick={() => {
                                      setActiveTab('league_wallets');
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full px-4 py-2 text-left hover:bg-cyan-500/10 text-cyan-400 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Unlock className="w-4 h-4" />
                                    Unlock Wallet
                                  </button>
                                )}

                                {league.status === 'pending' && (
                                  <>
                                    <div className="h-px bg-white/5 my-1" />
                                    <button
                                      onClick={() => {
                                        handleStatusChange(league.id, 'approved');
                                        setOpenMenuId(null);
                                      }}
                                      disabled={!!processing}
                                      className="w-full px-4 py-2 text-left hover:bg-green-500/10 text-green-400 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      <Check className="w-4 h-4" />
                                      Approve League
                                    </button>
                                    <button
                                      onClick={() => {
                                        handleStatusChange(league.id, 'rejected');
                                        setOpenMenuId(null);
                                      }}
                                      disabled={!!processing}
                                      className="w-full px-4 py-2 text-left hover:bg-red-500/10 text-red-400 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-50"
                                    >
                                      <X className="w-4 h-4" />
                                      Reject League
                                    </button>
                                  </>
                                )}

                                <div className="h-px bg-white/5 my-1" />

                                <button
                                  onClick={() => {
                                    setHostToSuspendModal({
                                      hostId: league.hostId,
                                      hostName: league.hostName || 'Host',
                                      hostEmail: league.hostEmail,
                                      hostPhone: (league as any).hostPhone,
                                      hostPhoto: league.hostPhotoUrl,
                                      leagueId: league.id,
                                      leagueName: league.brandName || league.leagueName || 'Pro League'
                                    });
                                    setOpenMenuId(null);
                                  }}
                                  className="w-full px-4 py-2 text-left hover:bg-rose-500/10 text-rose-400 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  <ShieldAlert className="w-4 h-4 text-rose-400" />
                                  Suspend Host
                                </button>
                              </motion.div>
                            </>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Location Restrictions & Prize Distribution Breakdown (Compact Rows) */}
                    <div className="space-y-2 text-xs">
                      {/* Location Restrictions Bar */}
                      <div className="p-2.5 bg-slate-900/60 rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                        <div className="flex items-center gap-1.5 text-slate-300 font-bold shrink-0">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>Region:</span>
                          <span className="text-white font-semibold">
                            {league.locationRestrictionType === 'specific_division' ? `Division: ${league.allowedDivision}` :
                             league.locationRestrictionType === 'specific_district' ? `District: ${league.allowedDistrict} (${league.allowedDivision})` :
                             league.locationRestrictionType === 'specific_upazila' ? `Upazila: ${league.allowedUpazila} (${league.allowedDistrict})` :
                             'Anywhere in Bangladesh'}
                          </span>
                        </div>
                        <div className="text-cyan-300 text-[10px] font-semibold">
                          Rule: {league.representationRule === 'one_squad_per_upazila' ? '1 Squad/Upazila' :
                                 league.representationRule === 'one_squad_per_district' ? '1 Squad/District' :
                                 league.representationRule === 'one_squad_per_division' ? '1 Squad/Division' :
                                 'No Restriction'}
                        </div>
                      </div>

                      {/* Prize Distribution Breakdown Single Row */}
                      <div className="bg-slate-950/70 px-3 py-2 rounded-xl border border-white/5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold shrink-0">
                          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="uppercase tracking-wider">Prizes:</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2.5 text-[10px] text-slate-300">
                          <span className="whitespace-nowrap">
                            🏆 Champ: <strong className="text-amber-400 font-bold">{league.championPrize ?? Math.floor((league.prizePool || 0) * 0.5)} T</strong>
                          </span>
                          <span className="text-slate-600">|</span>
                          <span className="whitespace-nowrap">
                            🥈 Runner-Up: <strong className="text-slate-200 font-bold">{league.runnerUpPrize ?? Math.floor((league.prizePool || 0) * 0.3)} T</strong>
                          </span>
                          <span className="text-slate-600">|</span>
                          <span className="whitespace-nowrap">
                            🏅 Top 3: <strong className="text-cyan-300">#{1}: {league.topRank1Prize ?? league.top3Prizes?.[0] ?? Math.floor((league.prizePool || 0) * 0.1)} T</strong> • <strong className="text-cyan-300">#{2}: {league.topRank2Prize ?? league.top3Prizes?.[1] ?? Math.floor((league.prizePool || 0) * 0.06)} T</strong> • <strong className="text-cyan-300">#{3}: {league.topRank3Prize ?? league.top3Prizes?.[2] ?? Math.floor((league.prizePool || 0) * 0.04)} T</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Footer Stats Row */}
                    <div className="flex flex-wrap gap-4 text-xs font-mono pt-1 border-t border-white/5">
                      <span className="text-slate-400">Squads: <span className="font-bold text-white">{league.squadSize}</span></span>
                      <span className="text-slate-400">Entry Fee: <span className="font-bold text-cyan-400">{league.entryFee} Tokens</span></span>
                      <span className="text-slate-400">Prize Pool: <span className="font-bold text-yellow-400">{league.prizePool} Tokens</span></span>
                      <span className="text-slate-400">Host Wallet Lock 10%: <span className="font-bold text-cyan-400">{league.walletTokens} Tokens</span></span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 border-t border-white/5">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                    Showing Page <span className="text-cyan-400">{currentPage}</span> of <span className="text-cyan-400">{totalPages}</span>
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-[10px] font-black text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 bg-slate-900 border border-white/10 rounded-lg text-[10px] font-black text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed uppercase tracking-wider transition-all cursor-pointer"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      
      {activeTab === 'league_wallets' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {leagues.slice((leagueWalletsPage - 1) * itemsPerPage, leagueWalletsPage * itemsPerPage).map((league) => {
              const finalMatch = leagueMatches.find(m => 
                m.leagueId === league.id && 
                (m.matchName?.toLowerCase().includes('final') || 
                 m.matchName?.toLowerCase().includes('grand final') || 
                 m.matchId?.toString() === '15' || 
                 m.matchId?.toString() === '31' || 
                 m.matchId?.toString() === '63' || 
                 m.matchId?.toString() === '127')
              );

              const isFinalPlayed = finalMatch && (finalMatch.isPlayed || finalMatch.status === 'completed');

              return (
                <div key={league.id} className="bg-slate-900/80 rounded-2xl p-5 border border-white/10 relative flex flex-col hover:border-cyan-500/40 transition-all gap-4">
                  {/* Host Logo & Brand Name Info */}
                  <div className="flex items-center gap-3 border-b border-white/5 pb-3">
                    <img
                      src={league.logoUrl || league.hostPhotoUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                      alt="Host Logo"
                      className="w-12 h-12 rounded-xl object-cover border border-cyan-500/30 shadow-lg shrink-0"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold font-mono bg-slate-950 text-cyan-400 border border-white/5 uppercase">
                          ID: {league.leagueNumber || league.id}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider ${
                          league.status === 'approved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                          league.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20' :
                          'bg-red-500/10 text-red-400 border border-red-500/20'
                        }`}>
                          {league.status}
                        </span>
                      </div>
                      <h3 className="font-bold text-white text-sm line-clamp-1 mt-0.5 uppercase tracking-wide font-mono">{league.leagueName}</h3>
                      <p className="text-[11px] text-slate-400 font-semibold truncate">
                        {league.brandName || 'Unnamed Brand'} • Host: <span className="text-cyan-400 font-bold">{league.hostName}</span>
                      </p>
                    </div>
                  </div>

                  {/* Wallet Balance Widget */}
                  <div className="bg-slate-950/60 rounded-xl p-3 border border-white/5 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2">
                      <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                        <Wallet className="w-4 h-4 text-cyan-400" />
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Wallet Balance</div>
                        <div className="text-xl font-black text-white font-mono">
                          {league.walletBalance || 0} <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">Tokens</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col items-end">
                      <div className="text-[9px] text-slate-500 uppercase tracking-widest font-mono font-bold mb-1">Status</div>
                      {league.walletStatus === 'locked' ? (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase bg-red-500/10 text-red-400 border border-red-500/20 px-2 py-0.5 rounded-full">
                          <Lock className="w-3 h-3" /> Locked
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[9px] font-black uppercase bg-green-500/10 text-green-400 border border-green-500/20 px-2 py-0.5 rounded-full">
                          <Unlock className="w-3 h-3" /> Active
                        </span>
                      )}
                    </div>
                  </div>

                  {/* League Detail Columns / Information Rows */}
                  <div className="space-y-2 text-[11px] font-semibold text-slate-300 bg-slate-950/40 p-3 rounded-xl border border-white/5 font-mono">
                    {/* Match Status */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                      <span className="text-slate-400">Match Status:</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        league.status === 'completed' ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' :
                        league.status === 'ongoing' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse' :
                        league.status === 'approved' ? 'bg-green-500/10 text-green-400 border border-green-500/20' :
                        league.status === 'cancelled' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20'
                      }`}>
                        {league.status === 'approved' ? 'REGISTRATION' : league.status.toUpperCase()}
                      </span>
                    </div>

                    {/* Final Match Date & Time */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                      <span className="text-slate-400">Final Match:</span>
                      <span className="text-cyan-300 text-[10px] font-bold">
                        {league.finalDate ? `${league.finalDate} • ${league.finalTime || 'TBD'}` : 'Not Scheduled'}
                      </span>
                    </div>

                    {/* Final Match Result Submitted */}
                    <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                      <span className="text-slate-400">Result Submitted:</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        isFinalPlayed 
                          ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                          : 'bg-slate-900 text-slate-500 border border-white/5'
                      }`}>
                        {isFinalPlayed ? 'YES' : 'NO'}
                      </span>
                    </div>

                    {/* Admin Approval of Result */}
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Admin Approved:</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-black uppercase ${
                        finalMatch && finalMatch.reviewStatus === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                        finalMatch && finalMatch.reviewStatus === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse' :
                        finalMatch && finalMatch.reviewStatus === 'rejected' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                        'bg-slate-900 text-slate-500 border border-white/5'
                      }`}>
                        {finalMatch ? (
                          finalMatch.reviewStatus === 'approved' ? 'APPROVED' :
                          finalMatch.reviewStatus === 'pending' ? 'PENDING' :
                          finalMatch.reviewStatus === 'rejected' ? 'REJECTED' :
                          'PENDING PLAY'
                        ) : 'NO RESULT'}
                      </span>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-auto pt-2 border-t border-white/5 flex flex-col gap-2">
                    {/* Distribute Final Prize Button */}
                    {finalMatch?.reviewStatus === 'approved' && (
                      league.prizeDistributed ? (
                        <div className="py-2.5 px-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-300 text-[10px] font-black uppercase tracking-wider text-center flex items-center justify-center gap-1.5 font-mono">
                          <Trophy className="w-3.5 h-3.5 text-yellow-400" /> Final Prizes Distributed
                        </div>
                      ) : (
                        <button
                          onClick={() => setPrizeModalLeagueId(league.id)}
                          className="w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 shadow-lg shadow-amber-500/20 cursor-pointer flex items-center justify-center gap-1.5 transition-all active:scale-95 font-mono"
                        >
                          <Trophy className="w-3.5 h-3.5" /> Distribute Final Prize
                        </button>
                      )
                    )}

                    {/* Lock / Unlock League Wallet Button */}
                    {league.walletStatus === 'locked' ? (
                      <button
                        onClick={() => openUnlockModal(league)}
                        disabled={processing === league.id}
                        className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer font-mono bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg hover:shadow-cyan-500/25 border border-cyan-400/50"
                      >
                        {processing === league.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Unlock className="w-3.5 h-3.5" />}
                        Unlock League Wallet
                      </button>
                    ) : (
                      <button
                        onClick={() => handleLockLeagueWallet(league)}
                        disabled={processing === league.id}
                        className="w-full py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer font-mono bg-red-600/80 hover:bg-red-500 text-white shadow-lg hover:shadow-red-500/25 border border-red-400/50"
                      >
                        {processing === league.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Lock className="w-3.5 h-3.5" />}
                        Lock League Wallet
                      </button>
                    )}

                    {league.walletStatus === 'locked' && (!isFinalPlayed || finalMatch?.reviewStatus !== 'approved') && !league.prizeDistributed && (
                      <div className="text-[10px] text-yellow-500 font-bold font-mono text-center mt-1 bg-yellow-500/10 border border-yellow-500/20 py-1.5 px-2 rounded-xl leading-relaxed flex items-center justify-center gap-1">
                        ⚠️ Note: Final match outcome pending. Admins can unlock when ready.
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {Math.ceil(leagues.length / itemsPerPage) > 1 && (
            <div className="flex items-center justify-center gap-4 mt-8 bg-slate-900/50 p-2 rounded-xl border border-white/5 w-fit mx-auto">
              <button
                onClick={() => setLeagueWalletsPage(p => Math.max(1, p - 1))}
                disabled={leagueWalletsPage === 1}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg transition-colors text-xs font-bold uppercase cursor-pointer"
              >
                Previous
              </button>
              <span className="text-slate-400 text-xs font-mono font-bold">
                Page {leagueWalletsPage} of {Math.ceil(leagues.length / itemsPerPage)}
              </span>
              <button
                onClick={() => setLeagueWalletsPage(p => Math.min(Math.ceil(leagues.length / itemsPerPage), p + 1))}
                disabled={leagueWalletsPage === Math.ceil(leagues.length / itemsPerPage)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-white rounded-lg transition-colors text-xs font-bold uppercase cursor-pointer"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* Suspended Hosts Tab View */}
      {activeTab === 'suspended_hosts' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between bg-slate-900/60 p-3 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-rose-400" />
              <h4 className="text-xs font-black text-white uppercase tracking-wider font-mono">
                Suspended Hosts Directory ({suspendedHostsList.length})
              </h4>
            </div>
            <button
              onClick={fetchSuspendedHosts}
              className="px-3 py-1 bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg text-[10px] font-mono font-bold transition-all cursor-pointer flex items-center gap-1"
            >
              <Clock className="w-3 h-3 text-cyan-400" />
              Refresh
            </button>
          </div>

          {loadingSuspendedHosts ? (
            <div className="text-slate-400 text-xs text-center py-12 font-mono flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-rose-400" />
              Loading suspended hosts list...
            </div>
          ) : suspendedHostsList.length === 0 ? (
            <div className="text-slate-400 text-xs text-center py-12 font-mono bg-slate-950/40 rounded-2xl border border-white/5">
              No hosts are currently suspended.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {suspendedHostsList.map((item) => {
                const isCurrentlyActive = item.status === 'active';
                return (
                  <div
                    key={item.id}
                    className="p-4 bg-slate-950/80 border border-rose-500/20 hover:border-rose-500/40 rounded-2xl space-y-3 relative transition-all shadow-lg"
                  >
                    {/* Header: Photo, Name, Status & 3-dot menu */}
                    <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="relative shrink-0">
                          {item.hostPhoto ? (
                            <img
                              src={item.hostPhoto}
                              alt={item.hostName}
                              className="w-11 h-11 rounded-xl object-cover border border-rose-500/40 shadow-md"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-xl bg-slate-800 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold">
                              HOST
                            </div>
                          )}
                          {isCurrentlyActive && (
                            <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-rose-500 rounded-full border-2 border-slate-950 animate-pulse" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <h4 className="text-sm font-black text-white uppercase tracking-wide truncate">
                              {item.hostName}
                            </h4>
                            <span
                              className={`px-2 py-0.5 rounded text-[8px] font-black font-mono uppercase tracking-wider ${
                                isCurrentlyActive
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-slate-800 text-slate-400 border border-white/10'
                              }`}
                            >
                              {isCurrentlyActive ? 'SUSPENDED' : 'UNSUSPENDED'}
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 font-mono truncate mt-0.5">
                            {item.hostEmail || item.hostPhone || item.hostId}
                          </p>
                        </div>
                      </div>

                      {/* Three-dot dropdown menu */}
                      <div className="relative">
                        <button
                          onClick={() => setOpenHostMenuId(openHostMenuId === item.id ? null : item.id)}
                          className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-lg transition-all cursor-pointer"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {openHostMenuId === item.id && (
                          <div className="absolute right-0 top-8 z-30 w-44 bg-[#0c1024] border border-cyan-500/30 rounded-xl shadow-2xl p-1.5 space-y-1 animate-in fade-in duration-150">
                            <button
                              onClick={() => {
                                setViewHostDetailsModal(item);
                                setOpenHostMenuId(null);
                              }}
                              className="w-full text-left px-2.5 py-1.5 text-xs font-mono text-slate-300 hover:text-cyan-400 hover:bg-cyan-500/10 rounded-lg transition-all flex items-center gap-2 cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5 text-cyan-400" />
                              View Details
                            </button>

                            {isCurrentlyActive && (
                              <button
                                onClick={() => {
                                  setUnsuspendConfirmModal({ hostId: item.hostId, hostName: item.hostName });
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-xs font-mono text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all flex items-center gap-2 cursor-pointer"
                              >
                                <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                                Unsuspend Host
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Suspension Reason & Details */}
                    <div className="space-y-2 text-xs font-mono bg-slate-900/60 p-3 rounded-xl border border-white/5">
                      <div>
                        <span className="text-slate-500 font-bold uppercase text-[9px] tracking-wider block">
                          Reason for Suspension
                        </span>
                        <p className="text-rose-300 font-semibold mt-0.5 line-clamp-2">
                          {item.reason}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-1 border-t border-white/5 text-[10px]">
                        <div>
                          <span className="text-slate-500 block">Originating League</span>
                          <span className="text-cyan-400 font-bold truncate block">
                            {item.leagueName || 'Pro League'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 block">Duration</span>
                          <span className="text-amber-400 font-bold block">
                            {item.durationLabel || 'Active'}
                          </span>
                        </div>
                      </div>

                      {item.suspendedUntil && (
                        <div className="text-[9px] text-slate-400 pt-1 border-t border-white/5 flex items-center justify-between">
                          <span>Expiry Time:</span>
                          <span className="text-slate-200 font-bold">
                            {new Date(item.suspendedUntil).toLocaleString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* View Host Details Modal */}
      {viewHostDetailsModal && (
        <div className="fixed inset-0 z-[150] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0a0e22] border border-rose-500/40 rounded-3xl max-w-md w-full p-6 text-left shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                  Host Suspension Details
                </h3>
              </div>
              <button
                onClick={() => setViewHostDetailsModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-white/5">
              <img
                src={viewHostDetailsModal.hostPhoto || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                alt={viewHostDetailsModal.hostName}
                className="w-12 h-12 rounded-xl object-cover border border-rose-500/30"
              />
              <div className="min-w-0">
                <h4 className="text-sm font-black text-white uppercase truncate">{viewHostDetailsModal.hostName}</h4>
                <p className="text-[10px] text-slate-400 font-mono truncate">{viewHostDetailsModal.hostEmail || 'No email'}</p>
                <p className="text-[10px] text-cyan-400 font-mono truncate">{viewHostDetailsModal.hostPhone || 'No phone'}</p>
              </div>
            </div>

            <div className="bg-slate-950/80 p-4 rounded-2xl border border-white/5 space-y-2.5 font-mono text-xs">
              <div>
                <span className="text-slate-500 text-[10px] uppercase tracking-wider font-bold block">Reason for Suspension</span>
                <p className="text-rose-300 font-bold mt-0.5">{viewHostDetailsModal.reason}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                <div>
                  <span className="text-slate-500 text-[10px] block">Originating League</span>
                  <span className="text-cyan-400 font-bold">{viewHostDetailsModal.leagueName || 'Pro League'}</span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] block">Duration</span>
                  <span className="text-amber-400 font-bold">{viewHostDetailsModal.durationLabel}</span>
                </div>
              </div>

              <div className="pt-2 border-t border-white/5 space-y-1 text-[10px] text-slate-400">
                <div>Suspended On: {new Date(viewHostDetailsModal.suspendedAt).toLocaleString()}</div>
                {viewHostDetailsModal.suspendedUntil && (
                  <div>Expires On: {new Date(viewHostDetailsModal.suspendedUntil).toLocaleString()}</div>
                )}
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setViewHostDetailsModal(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase transition-all cursor-pointer"
              >
                Close
              </button>
              {viewHostDetailsModal.status === 'active' && (
                <button
                  onClick={() => setUnsuspendConfirmModal({ hostId: viewHostDetailsModal.hostId, hostName: viewHostDetailsModal.hostName })}
                  className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-emerald-500/20 cursor-pointer"
                >
                  Unsuspend Host
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Unsuspend Confirm Modal */}
      {unsuspendConfirmModal && (
        <div className="fixed inset-0 z-[170] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0a0e22] border border-emerald-500/50 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative space-y-4 font-mono">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <Unlock className="w-8 h-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-black text-white uppercase tracking-wider">Unsuspend Host?</h3>
            <p className="text-sm text-slate-300">
              Are you sure you want to unsuspend <span className="text-emerald-400 font-bold">{unsuspendConfirmModal.hostName}</span>? They will immediately regain access to their hosting features.
            </p>
            <div className="flex gap-2 pt-4">
              <button
                onClick={() => setUnsuspendConfirmModal(null)}
                disabled={isSubmittingUnsuspend}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUnsuspendHostInAdmin}
                disabled={isSubmittingUnsuspend}
                className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-emerald-500/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSubmittingUnsuspend ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Host Modal */}
      {hostToSuspendModal && (
        <div className="fixed inset-0 z-[160] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0a0e22] border border-rose-500/50 rounded-3xl max-w-md w-full p-6 text-left shadow-2xl relative space-y-4 font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Suspend Host Account
                </h3>
              </div>
              <button
                onClick={() => setHostToSuspendModal(null)}
                className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center gap-3 bg-slate-900/80 p-3 rounded-2xl border border-white/5">
              {hostToSuspendModal.hostPhoto ? (
                <img
                  src={hostToSuspendModal.hostPhoto}
                  alt={hostToSuspendModal.hostName}
                  className="w-12 h-12 rounded-xl object-cover border border-rose-500/30"
                />
              ) : (
                <div className="w-12 h-12 rounded-xl bg-slate-800 border border-rose-500/30 flex items-center justify-center text-rose-400 font-bold text-sm">
                  HOST
                </div>
              )}
              <div className="min-w-0">
                <h4 className="text-sm font-black text-white uppercase truncate">{hostToSuspendModal.hostName}</h4>
                <p className="text-[10px] text-slate-400 truncate">{hostToSuspendModal.hostEmail || 'No email'}</p>
                <p className="text-[10px] text-cyan-400 truncate">Originating League: {hostToSuspendModal.leagueName}</p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">
                  Suspension Duration
                </label>
                <select
                  value={suspendDuration}
                  onChange={(e) => setSuspendDuration(e.target.value as any)}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-white text-xs font-bold focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value="1_day">1 Day</option>
                  <option value="2_days">2 Days</option>
                  <option value="7_days">7 Days</option>
                  <option value="1_month">1 Month</option>
                  <option value="3_months">3 Months</option>
                  <option value="6_months">6 Months</option>
                  <option value="lifetime">Lifetime Suspension (Permanent)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block mb-1">
                  Reason for Suspension *
                </label>
                <textarea
                  value={suspendReason}
                  onChange={(e) => setSuspendReason(e.target.value)}
                  placeholder="E.g., Match result tampering, violation of host terms..."
                  rows={3}
                  className="w-full bg-slate-900 border border-white/10 rounded-xl p-3 text-white text-xs focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setHostToSuspendModal(null)}
                disabled={isSubmittingAdminSuspend}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleAdminSuspendHostSubmit}
                disabled={isSubmittingAdminSuspend}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-black uppercase shadow-lg shadow-rose-500/20 cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isSubmittingAdminSuspend ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Suspending...
                  </>
                ) : (
                  <>
                    <ShieldAlert className="w-3.5 h-3.5" />
                    Suspend Host
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Full Screen Schedule Modal */}
      <AnimatePresence>
        {showFullSchedule && selectedLeagueForSchedule && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl p-4 md:p-8 flex flex-col overflow-hidden"
          >
            <div className="max-w-5xl mx-auto w-full flex flex-col h-full">
              <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-500/20 rounded-xl text-cyan-400">
                    <CalendarDays className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter italic">
                      LEAGUE <span className="text-cyan-400">SCHEDULE REVIEW</span>
                    </h2>
                    <p className="text-slate-400 text-xs md:text-sm">
                      Reviewing: <span className="text-white">{selectedLeagueForSchedule.leagueName}</span> • Host: {selectedLeagueForSchedule.hostName}
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => {
                    setShowFullSchedule(false);
                    setSelectedLeagueForSchedule(null);
                  }}
                  className="p-2 hover:bg-white/10 rounded-full transition-colors group cursor-pointer"
                >
                  <X className="w-6 h-6 text-white group-hover:text-red-400 transition-colors" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                {(selectedLeagueForSchedule.scheduleType === 'auto' 
                  ? (selectedLeagueForSchedule.autoGeneratedSchedule || [])
                  : (selectedLeagueForSchedule.manualSchedule || [])
                ).length === 0 ? (
                  <div className="bg-white/5 border border-white/10 rounded-2xl p-12 text-center">
                    <AlertCircle className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                    <p className="text-slate-400 font-mono text-sm uppercase tracking-widest">No schedule data available for this league.</p>
                  </div>
                ) : (
                  (selectedLeagueForSchedule.scheduleType === 'auto' 
                    ? (selectedLeagueForSchedule.autoGeneratedSchedule || [])
                    : (selectedLeagueForSchedule.manualSchedule || [])
                  ).reduce((acc: any[], match: any) => {
                    const date = match.date;
                    const existing = acc.find(g => g.date === date);
                    if (existing) {
                      existing.matches.push(match);
                    } else {
                      acc.push({ date, matches: [match] });
                    }
                    return acc;
                  }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((group, gIdx) => (
                    <div key={gIdx} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                      <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center justify-between">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                          <Calendar className="w-3 h-3" />
                          {new Date(group.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono italic">Matches: {group.matches.length}</span>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5">
                        {group.matches.map((match: any, mIdx: number) => {
                          const name = match.matchName || `Match #${match.matchNumber}`;
                          const isKeyMatch = name.includes('Opening') || name.includes('Semi') || name.includes('Final');
                          return (
                            <div key={mIdx} className={`p-4 flex items-center justify-between bg-[#04060e] hover:bg-white/[0.02] transition-colors ${isKeyMatch ? 'border-l-2 border-cyan-500' : ''}`}>
                              <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-mono text-sm font-bold text-slate-400">
                                  #{match.matchNumber}
                                </div>
                                <div>
                                  <h4 className={`text-sm font-bold uppercase tracking-tight ${isKeyMatch ? 'text-cyan-400' : 'text-white'}`}>
                                    {name}
                                  </h4>
                                  <div className="flex items-center gap-2 mt-1">
                                    <Clock className="w-3 h-3 text-slate-500" />
                                    <span className="text-xs text-slate-400 font-mono tracking-wider">{match.time}</span>
                                  </div>
                                </div>
                              </div>
                              {isKeyMatch && (
                                <div className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded text-[10px] font-black text-cyan-400 uppercase italic">
                                  Prime Slot
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-slate-500">
                <p className="text-xs">Vortex Tournament Administration Engine</p>
                <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-widest">
                  <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Standard Match</span>
                  <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Key Event</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Prize Distribution Modal */}
      {prizeModalLeagueId && (
        <PrizeDistributionModal
          isOpen={!!prizeModalLeagueId}
          onClose={() => {
            setPrizeModalLeagueId(null);
            fetchLeagues();
          }}
          leagueId={prizeModalLeagueId}
          isAdmin={true}
        />
      )}

      {/* Unlock League Wallet Modal */}
      <AnimatePresence>
        {unlockModalLeague && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95, y: 10 }}
              className="bg-[#071224] border border-cyan-500/30 rounded-2xl max-w-md w-full p-6 text-left shadow-2xl relative"
            >
              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-500/10 rounded-xl border border-cyan-500/20 text-cyan-400">
                    <Unlock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wide font-mono">Unlock Host Wallet</h3>
                    <p className="text-[11px] text-slate-400">Deduct profit & release remaining funds to host</p>
                  </div>
                </div>
                <button 
                  onClick={() => setUnlockModalLeague(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3 font-mono text-xs mb-6">
                <div className="bg-slate-950/60 p-3 rounded-xl border border-white/5 space-y-2">
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">League:</span>
                    <span className="font-bold text-white">{unlockModalLeague.leagueName}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Total League Balance:</span>
                    <span className="font-bold text-cyan-300">🪙 {unlockModalLeague.walletBalance || 0}</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span className="text-slate-400">Configured Profit Rate:</span>
                    <span className="font-bold text-yellow-400">{leagueProfitPercentage}%</span>
                  </div>
                </div>

                {(typeof unlockModalLeague.profitDeducted === 'number' && unlockModalLeague.profitDeducted > 0) ? (
                  <div className="bg-purple-950/30 p-3 rounded-xl border border-purple-500/20 space-y-1">
                    <div className="flex justify-between text-purple-200">
                      <span>Previous Profit Deduction:</span>
                      <span className="font-black text-purple-300">🪙 {unlockModalLeague.profitDeducted}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      Profit was already deducted on first unlock. Re-unlocking will activate the wallet without deducting further profit.
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-950/30 p-3 rounded-xl border border-amber-500/20 space-y-1">
                    <div className="flex justify-between text-amber-200">
                      <span>System Profit Deduction:</span>
                      <span className="font-black text-amber-400">
                        + 🪙 {Math.round(((unlockModalLeague.walletBalance || 0) * leagueProfitPercentage) / 100)}
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-tight">
                      (Will be transferred directly to the <strong className="text-cyan-300">League Profit Wallet</strong> in Admin Panel)
                    </p>
                  </div>
                )}

                <div className="bg-emerald-950/30 p-3 rounded-xl border border-emerald-500/20 space-y-1">
                  <div className="flex justify-between text-emerald-200">
                    <span>Unlocked Host Balance:</span>
                    <span className="font-black text-emerald-400">
                      🪙 {(typeof unlockModalLeague.profitDeducted === 'number' && unlockModalLeague.profitDeducted > 0)
                        ? (unlockModalLeague.walletBalance || 0)
                        : Math.max(0, (unlockModalLeague.walletBalance || 0) - Math.round(((unlockModalLeague.walletBalance || 0) * leagueProfitPercentage) / 100))}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    (Host will be able to withdraw / utilize these tokens)
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setUnlockModalLeague(null)}
                  className="flex-1 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-slate-800 hover:bg-slate-700 text-slate-300 border border-white/10 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={executeUnlockLeagueWallet}
                  disabled={unlocking}
                  className="flex-1 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/50 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-50"
                >
                  {unlocking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Unlock className="w-4 h-4" />}
                  {unlocking ? 'Unlocking...' : 'Confirm Unlock'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
