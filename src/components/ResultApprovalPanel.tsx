import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Trophy, 
  ExternalLink, 
  Youtube, 
  ChevronDown, 
  ChevronUp,
  AlertCircle,
  Eye,
  Check,
  Image as ImageIcon,
  User,
  Shield,
  Phone,
  MessageSquare,
  Mail,
  Copy,
  ShieldAlert,
  ShieldCheck,
  Loader2,
  Calendar,
  AlertTriangle,
  MoreVertical,
  Lock,
  Unlock,
  Percent,
  Coins,
  DollarSign,
  Wallet,
  Crown
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  setDoc,
  increment,
  getDoc,
  getDocs,
  deleteField,
  addDoc,
  runTransaction,
  serverTimestamp
} from 'firebase/firestore';
import { MatchChatModal } from './MatchChatModal';
import { TournamentResultsModal } from './TournamentResultsModal';

interface ResultApprovalPanelProps {
  userProfile: any;
}

export const ResultApprovalPanel: React.FC<ResultApprovalPanelProps> = ({ userProfile }) => {
  const [pendingMatches, setPendingMatches] = useState<any[]>([]);
  const [approvedMatches, setApprovedMatches] = useState<any[]>([]);
  const [rejectedMatches, setRejectedMatches] = useState<any[]>([]);
  const [pendingTournaments, setPendingTournaments] = useState<any[]>([]);
  const [approvedTournaments, setApprovedTournaments] = useState<any[]>([]);
  const [rejectedTournaments, setRejectedTournaments] = useState<any[]>([]);
  const [pendingLoneWolf, setPendingLoneWolf] = useState<any[]>([]);
  const [approvedLoneWolf, setApprovedLoneWolf] = useState<any[]>([]);
  const [rejectedLoneWolf, setRejectedLoneWolf] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [mainReviewCategory, setMainReviewCategory] = useState<'leagues' | 'tournaments' | 'lonewolf'>('leagues');
  const [activeChatMatch, setActiveChatMatch] = useState<{ match: any; league: any; hostProfile?: any } | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [expandedMatchId, setExpandedMatchId] = useState<string | null>(null);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const [squadsData, setSquadsData] = useState<Record<string, any>>({});
  const [playersProfiles, setPlayersProfiles] = useState<Record<string, any>>({});
  const [leaguesData, setLeaguesData] = useState<Record<string, any>>({});
  const [hostsProfiles, setHostsProfiles] = useState<Record<string, any>>({});
  
  const [currentPagePending, setCurrentPagePending] = useState(1);
  const [currentPageApproved, setCurrentPageApproved] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Refs to track what has been fetched to avoid stale closures in onSnapshot
  const fetchedLeaguesRef = useRef<Set<string>>(new Set());
  const fetchedSquadsRef = useRef<Set<string>>(new Set());
  
  useEffect(() => {
    const q = query(
      collection(db, 'pro_league_schedule_matches'),
      where('reviewStatus', 'in', ['pending', 'approved', 'rejected'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allMatches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setPendingMatches(allMatches.filter(m => m.reviewStatus === 'pending'));
      setApprovedMatches(allMatches.filter(m => m.reviewStatus === 'approved'));
      setRejectedMatches(allMatches.filter(m => m.reviewStatus === 'rejected'));
      
      // Unblock initial screen loading instantly as soon as matches snapshot arrives
      setLoading(false);

      // Asynchronously pre-fetch squads, league info, host profiles, and player profiles in background without blocking UI
      (async () => {
        const leagueIds = [...new Set(allMatches.map(m => m.leagueId))].filter(Boolean);
        
        await Promise.all(leagueIds.map(async (lId) => {
          // Fetch League Info if not fetched yet
          if (!fetchedLeaguesRef.current.has(lId)) {
            fetchedLeaguesRef.current.add(lId);
            try {
              const leagueSnap = await getDoc(doc(db, 'pro_hosted_leagues', lId));
              if (leagueSnap.exists()) {
                const lData: any = { id: leagueSnap.id, ...leagueSnap.data() };
                setLeaguesData(prev => ({ ...prev, [lId]: lData }));

                // Fetch Host User Profile
                const hostId = lData.hostId;
                const hostEmail = lData.hostEmail;

                if (hostId) {
                  const hostSnap = await getDoc(doc(db, 'users', hostId));
                  if (hostSnap.exists()) {
                    setHostsProfiles(prev => ({ ...prev, [lId]: hostSnap.data() }));
                  }
                } else if (hostEmail) {
                  const hostQ = query(collection(db, 'users'), where('email', '==', hostEmail));
                  const hostSnap = await getDocs(hostQ);
                  if (!hostSnap.empty) {
                    setHostsProfiles(prev => ({ ...prev, [lId]: hostSnap.docs[0].data() }));
                  }
                }
              }
            } catch (err) {
              console.error("Error fetching league or host info:", err);
            }
          }

          // Fetch Squads if not fetched yet
          if (!fetchedSquadsRef.current.has(lId)) {
            fetchedSquadsRef.current.add(lId);
            try {
              const sQ = query(collection(db, 'pro_league_squads'), where('leagueId', '==', lId));
              const sSnap = await getDocs(sQ);
              const squads = sSnap.docs.reduce((acc: any, d) => {
                const data = d.data();
                const obj = { id: d.id, ...data };
                if (data.tbdId) acc[data.tbdId] = obj;
                if (data.teamName) acc[data.teamName] = obj;
                acc[d.id] = obj;
                return acc;
              }, {});
                 
              setSquadsData(prev => ({ ...prev, [lId]: squads }));

              // Also fetch player user profiles from squads AND match playerStats
              const allEmails: string[] = [];
              const allUserIds: string[] = [];
              
              sSnap.docs.forEach(d => {
                const players = d.data().players || [];
                players.forEach((p: any) => { 
                  if (p.email && !allEmails.includes(p.email)) allEmails.push(p.email); 
                  if (p.userId && !allUserIds.includes(p.userId)) allUserIds.push(p.userId); 
                });
              });

              allMatches.forEach((m: any) => {
                if (m.playerStats) {
                  Object.keys(m.playerStats).forEach(key => {
                    if (key && key.includes('@') && !allEmails.includes(key)) {
                      allEmails.push(key);
                    } else if (key && !key.includes('@') && !allUserIds.includes(key)) {
                      allUserIds.push(key);
                    }
                  });
                }
              });

              if (allEmails.length > 0) {
                // Firestore 'in' query supports up to 30 items - run chunk requests in parallel
                const chunks = [];
                for (let i = 0; i < allEmails.length; i += 30) {
                  chunks.push(allEmails.slice(i, i + 30));
                }

                await Promise.all(chunks.map(async (chunk) => {
                  try {
                    const uQ = query(collection(db, 'users'), where('email', 'in', chunk));
                    const uSnap = await getDocs(uQ);
                    const profiles = uSnap.docs.reduce((acc: any, d) => {
                      const data = d.data();
                      if (data.email) acc[data.email] = data;
                      if (data.userId) acc[data.userId] = data;
                      acc[d.id] = data;
                      return acc;
                    }, {});
                    setPlayersProfiles(prev => ({ ...prev, ...profiles }));
                  } catch (e) {
                    console.error("Error fetching player profiles by email chunk:", e);
                  }
                }));
              }
              
              if (allUserIds.length > 0) {
                const chunks = [];
                for (let i = 0; i < allUserIds.length; i += 30) {
                  chunks.push(allUserIds.slice(i, i + 30));
                }

                await Promise.all(chunks.map(async (chunk) => {
                  try {
                    const uQ = query(collection(db, 'users'), where('userId', 'in', chunk));
                    const uSnap = await getDocs(uQ);
                    const profiles = uSnap.docs.reduce((acc: any, d) => {
                      const data = d.data();
                      if (data.email) acc[data.email] = data;
                      if (data.userId) acc[data.userId] = data;
                      acc[d.id] = data;
                      return acc;
                    }, {});
                    setPlayersProfiles(prev => ({ ...prev, ...profiles }));
                  } catch (e) {
                    console.error("Error fetching player profiles by userId chunk:", e);
                  }
                }));
              }
            } catch (err) {
              console.error("Error fetching squads or profiles:", err);
            }
          }
        }));
      })();
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pro_league_schedule_matches');
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'tournaments_freefire'),
      where('status', 'in', ['ResultUnderReview', 'Ended', 'Completed', 'ResultRejected'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allTourneys = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setPendingTournaments(allTourneys.filter(t => t.status === 'ResultUnderReview'));
      setApprovedTournaments(allTourneys.filter(t => (t.status === 'Ended' || t.status === 'Completed') && t.resultApprovedAt));
      setRejectedTournaments(allTourneys.filter(t => t.status === 'ResultRejected'));
    }, (error) => {
      console.error("Error fetching tournaments for review:", error);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const q = query(
      collection(db, 'lone_wolf_matches'),
      where('status', 'in', ['ResultUnderReview', 'Completed', 'ResultRejected'])
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allLoneWolf = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as any[];
      setPendingLoneWolf(allLoneWolf.filter(m => m.status === 'ResultUnderReview'));
      setApprovedLoneWolf(allLoneWolf.filter(m => m.status === 'Completed'));
      setRejectedLoneWolf(allLoneWolf.filter(m => m.status === 'ResultRejected'));
    }, (error) => {
      console.error("Error fetching lone wolf matches for review:", error);
    });

    return () => unsubscribe();
  }, []);

  // Tournament Profit Percentage & Wallet Management States
  const [tournamentProfitPercentage, setTournamentProfitPercentage] = useState<number>(10);
  const [profitPercentageModal, setProfitPercentageModal] = useState<boolean>(false);
  const [newProfitPercentageInput, setNewProfitPercentageInput] = useState<number>(10);
  const [unlockTournamentWalletModal, setUnlockTournamentWalletModal] = useState<{
    isOpen: boolean;
    tourney: any | null;
    customPercentage: number;
    isUnlocking: boolean;
  }>({
    isOpen: false,
    tourney: null,
    customPercentage: 10,
    isUnlocking: false
  });
  const [activeDropdownTourneyId, setActiveDropdownTourneyId] = useState<string | null>(null);
  const [viewingResultModalTourney, setViewingResultModalTourney] = useState<any | null>(null);

  // Lone Wolf Profit Percentage & Wallet States
  const [loneWolfProfitPercentage, setLoneWolfProfitPercentage] = useState<number>(10);
  const [loneWolfProfitPercentageModal, setLoneWolfProfitPercentageModal] = useState<boolean>(false);
  const [newLoneWolfProfitPercentageInput, setNewLoneWolfProfitPercentageInput] = useState<number>(10);
  const [unlockLoneWolfWalletModal, setUnlockLoneWolfWalletModal] = useState<{
    isOpen: boolean;
    match: any | null;
    customPercentage: number;
    isUnlocking: boolean;
  }>({
    isOpen: false,
    match: null,
    customPercentage: 10,
    isUnlocking: false
  });

  // Global Admin Settings menu toggle and system wallets local state
  const [isGlobalAdminSettingsOpen, setIsGlobalAdminSettingsOpen] = useState<boolean>(false);
  const [systemWalletsData, setSystemWalletsData] = useState<{
    tournamentProfitWallet: number;
    loneWolfPercentageWallet: number;
  }>({
    tournamentProfitWallet: 0,
    loneWolfPercentageWallet: 0
  });

  // Sync global settings for tournament and lone wolf profit percentages
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'settings'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.tournamentProfitPercentage !== undefined) {
          setTournamentProfitPercentage(Number(data.tournamentProfitPercentage) || 10);
          setNewProfitPercentageInput(Number(data.tournamentProfitPercentage) || 10);
        }
        if (data.loneWolfProfitPercentage !== undefined) {
          setLoneWolfProfitPercentage(Number(data.loneWolfProfitPercentage) || 10);
          setNewLoneWolfProfitPercentageInput(Number(data.loneWolfProfitPercentage) || 10);
        }
      }
    }, (err) => {
      console.error("Error fetching system settings:", err);
    });
    return () => unsub();
  }, []);

  // Sync system wallets for admin display
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'wallets'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSystemWalletsData({
          tournamentProfitWallet: Number(data.tournamentProfitWallet) || 0,
          loneWolfPercentageWallet: Number(data.loneWolfPercentageWallet) || Number(data.loneWolfProfitWallet) || 0
        });
      }
    }, (err) => {
      console.error("Error fetching system wallets:", err);
    });
    return () => unsub();
  }, []);

  const [confirmApproveMatch, setConfirmApproveMatch] = useState<any | null>(null);
  const [rejectMatchModal, setRejectMatchModal] = useState<any | null>(null);
  const [revertMatchModal, setRevertMatchModal] = useState<any | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [selectedHostModal, setSelectedHostModal] = useState<{
    name: string;
    phone: string;
    email: string;
    photo: string;
    leagueName: string;
    matchId?: string;
    hostId?: string;
    rawMatch?: any;
    rawLeague?: any;
    rawHostProfile?: any;
  } | null>(null);

  // Host Suspension States
  const [showSuspendModal, setShowSuspendModal] = useState<boolean>(false);
  const [suspendDuration, setSuspendDuration] = useState<'1_day' | '2_days' | '7_days' | '1_month' | '3_months' | '6_months' | 'lifetime'>('7_days');
  const [suspendReason, setSuspendReason] = useState<string>('');
  const [isSubmittingSuspend, setIsSubmittingSuspend] = useState<boolean>(false);
  const [unsuspendConfirmModal, setUnsuspendConfirmModal] = useState<{hostId: string, hostName: string} | null>(null);
  const [isSubmittingUnsuspend, setIsSubmittingUnsuspend] = useState(false);

  const handleConfirmSuspendHost = async () => {
    if (!selectedHostModal) return;
    const hostId = selectedHostModal.hostId || selectedHostModal.rawHostProfile?.userId || selectedHostModal.rawHostProfile?.uid || selectedHostModal.rawLeague?.hostId;
    if (!hostId) {
      setToastMessage({ type: 'error', text: 'Host User ID not found.' });
      return;
    }
    if (!suspendReason.trim()) {
      setToastMessage({ type: 'error', text: 'Please enter a reason for suspension.' });
      return;
    }

    setIsSubmittingSuspend(true);
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

      const leagueId = selectedHostModal.rawLeague?.id || selectedHostModal.rawMatch?.leagueId || '';
      const leagueName = selectedHostModal.leagueName || 'Pro League';

      // 1. Save suspension record to Firestore
      await addDoc(collection(db, 'host_suspensions'), {
        hostId,
        hostName: selectedHostModal.name,
        hostEmail: selectedHostModal.email || '',
        hostPhone: selectedHostModal.phone || '',
        hostPhoto: selectedHostModal.photo || '',
        leagueId,
        leagueName,
        reason: suspendReason.trim(),
        durationLabel,
        suspendedAt: new Date().toISOString(),
        suspendedUntil: suspendedUntilIso,
        isLifetime: suspendDuration === 'lifetime',
        status: 'active',
        suspendedBy: userProfile?.displayName || userProfile?.email || 'Admin'
      });

      // 2. Update user profile document
      await updateDoc(doc(db, 'users', hostId), {
        isHostSuspended: true,
        hostSuspensionReason: suspendReason.trim(),
        hostSuspensionLeagueId: leagueId,
        hostSuspensionLeagueName: leagueName,
        hostSuspensionDurationLabel: durationLabel,
        hostSuspensionUntil: suspendedUntilIso,
        hostSuspensionIsLifetime: suspendDuration === 'lifetime',
        hostSuspendedAt: new Date().toISOString()
      });

      setToastMessage({ type: 'success', text: `Host ${selectedHostModal.name} suspended (${durationLabel})!` });
      setShowSuspendModal(false);
      setSuspendReason('');
      
      // Update local modal data
      setSelectedHostModal(prev => prev ? {
        ...prev,
        rawHostProfile: {
          ...prev.rawHostProfile,
          isHostSuspended: true,
          hostSuspensionReason: suspendReason.trim(),
          hostSuspensionDurationLabel: durationLabel
        }
      } : null);
    } catch (err: any) {
      console.error("Error suspending host:", err);
      setToastMessage({ type: 'error', text: 'Failed to suspend host: ' + err.message });
    } finally {
      setIsSubmittingSuspend(false);
    }
  };

  const handleUnsuspendHost = async () => {
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

      // 2. Update active suspension docs in host_suspensions
      const q = query(
        collection(db, 'host_suspensions'),
        where('hostId', '==', hostId),
        where('status', '==', 'active')
      );
      const snap = await getDocs(q);
      for (const d of snap.docs) {
        await updateDoc(doc(db, 'host_suspensions', d.id), {
          status: 'unsuspended',
          unsuspendedAt: new Date().toISOString(),
          unsuspendedBy: userProfile?.displayName || userProfile?.email || 'Admin'
        });
      }

      setToastMessage({ type: 'success', text: `Host ${hostName} has been unsuspended!` });
      if (selectedHostModal && selectedHostModal.hostId === hostId) {
        setSelectedHostModal(prev => prev ? {
          ...prev,
          rawHostProfile: {
            ...prev.rawHostProfile,
            isHostSuspended: false
          }
        } : null);
      }
      setUnsuspendConfirmModal(null);
    } catch (err: any) {
      console.error("Error unsuspending host:", err);
      setToastMessage({ type: 'error', text: 'Failed to unsuspend host: ' + err.message });
    } finally {
      setIsSubmittingUnsuspend(false);
    }
  };

  const formatSubmittedDateTime = (isoString?: string) => {
    if (!isoString) return 'Date/Time Not Recorded';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (e) {
      return isoString;
    }
  };

  const handleOpenHostModal = async (match: any, league: any, initialHostProfile: any) => {
    let hostProfile = initialHostProfile;
    const hostId = league?.hostId || hostProfile?.userId || hostProfile?.uid || match?.submittedBy;
    const hostEmail = hostProfile?.email || match?.submittedByEmail || league?.hostEmail;

    let phone = hostProfile?.mobile || 
                hostProfile?.phone || 
                hostProfile?.phoneNumber || 
                hostProfile?.mobileNumber || 
                hostProfile?.contactNumber || 
                hostProfile?.contactPhone || 
                hostProfile?.whatsapp || 
                match?.submittedByPhone || 
                match?.submittedByMobile || 
                league?.hostPhone || 
                league?.hostMobile || 
                league?.contactPhone || 
                league?.mobile || 
                '';

    let name = hostProfile?.displayName || hostProfile?.gameName || match?.submittedByName || league?.hostName || league?.hostEmail || 'League Host';
    let email = hostProfile?.email || match?.submittedByEmail || league?.hostEmail || '';
    let photo = hostProfile?.photoURL || hostProfile?.avatarUrl || hostProfile?.profilePicture || match?.submittedByPhoto || league?.hostPhotoUrl || '';
    const lName = league?.leagueName || league?.brandName || league?.title || 'Pro League';

    setSelectedHostModal({
      name,
      phone,
      email,
      photo,
      leagueName: lName,
      matchId: match?.matchId,
      hostId: hostId || '',
      rawMatch: match,
      rawLeague: league,
      rawHostProfile: hostProfile
    });

    // If phone or hostProfile is incomplete, fetch fresh user doc from Firestore
    if (!phone || !hostProfile) {
      try {
        let freshUserData: any = null;
        if (hostId) {
          const userSnap = await getDoc(doc(db, 'users', hostId));
          if (userSnap.exists()) {
            freshUserData = userSnap.data();
          }
        }
        if (!freshUserData && hostEmail) {
          const hostQ = query(collection(db, 'users'), where('email', '==', hostEmail));
          const hostSnap = await getDocs(hostQ);
          if (!hostSnap.empty) {
            freshUserData = hostSnap.docs[0].data();
          }
        }

        if (freshUserData) {
          const updatedPhone = freshUserData.mobile || 
                               freshUserData.phone || 
                               freshUserData.phoneNumber || 
                               freshUserData.mobileNumber || 
                               freshUserData.contactNumber || 
                               freshUserData.contactPhone || 
                               freshUserData.whatsapp || 
                               phone;
          const updatedName = freshUserData.displayName || freshUserData.gameName || name;
          const updatedEmail = freshUserData.email || email;
          const updatedPhoto = freshUserData.photoURL || freshUserData.avatarUrl || photo;

          setSelectedHostModal({
            name: updatedName,
            phone: updatedPhone,
            email: updatedEmail,
            photo: updatedPhoto,
            leagueName: lName,
            matchId: match?.matchId,
            hostId: hostId || '',
            rawMatch: match,
            rawLeague: league,
            rawHostProfile: freshUserData
          });
        }
      } catch (err) {
        console.error("Error fetching fresh host profile for modal:", err);
      }
    }
  };

  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => setToastMessage(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const executeRejectTournament = async (tourney: any) => {
    if (!tourney || processingId) return;
    if (!rejectionReasonInput.trim()) {
      setToastMessage({ type: 'error', text: 'Please provide a reason for rejection.' });
      return;
    }

    setProcessingId(tourney.id);
    try {
      const tourneyRef = doc(db, 'tournaments_freefire', tourney.id);
      await updateDoc(tourneyRef, {
        status: 'ResultRejected',
        rejectionReason: rejectionReasonInput.trim(),
        rejectedBy: userProfile?.displayName || userProfile?.email || 'Admin',
        rejectedAt: new Date().toISOString()
      });

      setRejectMatchModal(null);
      setRejectionReasonInput('');
      setToastMessage({ type: 'success', text: 'Tournament result rejected successfully.' });
    } catch (err: any) {
      console.error("Error rejecting tournament result:", err);
      setToastMessage({ type: 'error', text: 'Failed to reject result: ' + err.message });
    } finally {
      setProcessingId(null);
    }
  };

  // --- Lone Wolf Execution Handlers ---
  const executeApproveLoneWolf = async (match: any) => {
    if (!match || processingId) return;
    setProcessingId(match.id);
    try {
      const prizeAmount = Number(match.prizePool) || 0;
      const winnerId = match.winnerId;

      if (!winnerId) {
        throw new Error('Winner ID not found for this match.');
      }

      await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, 'lone_wolf_matches', match.id);
        const matchSnap = await transaction.get(matchRef);
        
        if (!matchSnap.exists()) throw new Error('Match not found.');
        const freshMatch = matchSnap.data();

        if (freshMatch.status === 'Completed' || freshMatch.prizeDistributed) {
           throw new Error('Prize has already been distributed.');
        }

        // Credit prize to winner
        const winnerRef = doc(db, 'users', winnerId);
        const winnerSnap = await transaction.get(winnerRef);
        const winnerCurrentTokens = winnerSnap.data()?.tokens || 0;

        transaction.update(winnerRef, {
          tokens: winnerCurrentTokens + prizeAmount,
          updatedAt: new Date().toISOString()
        });

        // Record in wallet_history
        const historyRef = doc(collection(db, 'wallet_history'));
        transaction.set(historyRef, {
          userId: winnerId,
          userName: match.winnerName || 'Winner',
          type: 'credit',
          amount: prizeAmount,
          balanceAfter: winnerCurrentTokens + prizeAmount,
          description: `Lone Wolf #${match.matchNumber || match.id} Champion Prize (${prizeAmount} 🪙)`,
          matchId: match.id,
          createdAt: serverTimestamp()
        });

        // Record in winner tokenTransactions
        const winnerTokenTxRef = doc(collection(db, 'users', winnerId, 'tokenTransactions'));
        transaction.set(winnerTokenTxRef, {
          type: 'prize',
          amount: prizeAmount,
          balanceAfter: winnerCurrentTokens + prizeAmount,
          matchId: match.id,
          matchTitle: match.title,
          description: `1st Place Lone Wolf 1v1 Prize (${match.title})`,
          createdAt: serverTimestamp()
        });

        // Calculate remaining locked wallet balance for host
        const hostDeposit = Number(freshMatch.walletTokens) || Number(freshMatch.prizePool) || 0;
        const p1Fee = freshMatch.player1 ? (Number(freshMatch.entryFee) || 0) : 0;
        const p2Fee = freshMatch.player2 ? (Number(freshMatch.entryFee) || 0) : 0;
        const totalLockedTokens = hostDeposit + p1Fee + p2Fee;
        const remainingTokens = Math.max(0, totalLockedTokens - prizeAmount);

        // Update Match document to Completed
        transaction.update(matchRef, {
          status: 'Completed',
          prizeDistributed: true,
          prizeDistributedAt: new Date().toISOString(),
          resultApprovedAt: new Date().toISOString(),
          resultApprovedBy: userProfile?.displayName || userProfile?.email || 'Admin',
          walletBalance: remainingTokens,
          walletStatus: 'locked',
          updatedAt: serverTimestamp()
        });
      });

      setConfirmApproveMatch(null);
      setToastMessage({ type: 'success', text: `Lone Wolf result approved & prize distributed!` });
    } catch (err: any) {
      console.error("Error approving lone wolf result:", err);
      setToastMessage({ type: 'error', text: 'Failed to approve result: ' + err.message });
    } finally {
      setProcessingId(null);
    }
  };

  const executeRejectLoneWolf = async (match: any) => {
    if (!match || processingId) return;
    setProcessingId(match.id);
    try {
      const matchRef = doc(db, 'lone_wolf_matches', match.id);
      await updateDoc(matchRef, {
        status: 'ResultRejected',
        rejectedReason: rejectionReasonInput.trim(),
        rejectedAt: new Date().toISOString(),
        rejectedBy: userProfile?.displayName || userProfile?.email || 'Admin',
        updatedAt: serverTimestamp()
      });
      setRejectMatchModal(null);
      setRejectionReasonInput('');
      setToastMessage({ type: 'success', text: 'Lone Wolf result rejected successfully.' });
    } catch (err: any) {
      console.error("Error rejecting lone wolf result:", err);
      setToastMessage({ type: 'error', text: 'Failed to reject result: ' + err.message });
    } finally {
      setProcessingId(null);
    }
  };

  const executeRevertLoneWolf = async (match: any) => {
    if (!match || processingId) return;
    setProcessingId(match.id);
    try {
      const isCompleted = match.status === 'Completed' || match.prizeDistributed;
      
      await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, 'lone_wolf_matches', match.id);
        
        if (isCompleted) {
           // Rollback prize
           const prizeAmount = Number(match.prizePool) || 0;
           const winnerId = match.winnerId;
           
           if (winnerId && prizeAmount > 0) {
             const winnerRef = doc(db, 'users', winnerId);
             const winnerSnap = await transaction.get(winnerRef);
             const winnerCurrentTokens = winnerSnap.data()?.tokens || 0;

             transaction.update(winnerRef, {
               tokens: Math.max(0, winnerCurrentTokens - prizeAmount),
               updatedAt: new Date().toISOString()
             });

             // Record in wallet_history
             const historyRef = doc(collection(db, 'wallet_history'));
             transaction.set(historyRef, {
               userId: winnerId,
               userName: match.winnerName || 'Winner',
               type: 'debit',
               amount: prizeAmount,
               balanceAfter: Math.max(0, winnerCurrentTokens - prizeAmount),
               description: `Lone Wolf #${match.matchNumber || match.id} Prize Rollback (Result Reverted)`,
               matchId: match.id,
               createdAt: serverTimestamp()
             });
           }
        }

        // Set status to ResultUnderReview
        transaction.update(matchRef, {
          status: 'ResultUnderReview',
          prizeDistributed: false,
          prizeDistributedAt: null,
          resultApprovedAt: null,
          resultApprovedBy: null,
          rejectedAt: null,
          rejectedBy: null,
          rejectedReason: null,
          updatedAt: serverTimestamp()
        });
      });

      setRevertMatchModal(null);
      setToastMessage({ type: 'success', text: 'Lone Wolf result reverted to pending successfully.' });
    } catch (err: any) {
      console.error("Error reverting lone wolf result:", err);
      setToastMessage({ type: 'error', text: 'Failed to revert result: ' + err.message });
    } finally {
      setProcessingId(null);
    }
  };

  const executeApproveTournament = async (tourney: any) => {
    if (!tourney || processingId) return;
    setProcessingId(tourney.id);

    try {
      const isSolo = tourney.mode === 'solo';
      const results = isSolo ? (tourney.tempResultData || []) : (tourney.tempResultSquads || []);
      
      // Calculate Entry Fees Collected
      const entryFeesCollected = isSolo
        ? ((tourney.joinedPlayers?.length || tourney.joinedCount || 0) * (Number(tourney.entryFee) || 0))
        : ((tourney.joinedSquads?.length || 0) * (Number(tourney.entryFee) || 0));

      const initialWalletBalance = tourney.walletBalance !== undefined
        ? Number(tourney.walletBalance)
        : ((Number(tourney.walletTokens) || 0) + entryFeesCollected);

      let totalPrizesDistributed = 0;
      const distributionLogs: Array<{ recipientName: string; recipientId: string; amount: number; role: string }> = [];

      // 1. Distribute Prize Money and Update Career Statistics for Solo
      if (isSolo) {
        const perKillRate = Number(tourney.perKill) || 0;
        const booyahPrize = Number(tourney.booyahPrize) || 0;
        const runnerUpPrize = Number(tourney.runnerUpPrize) || 0;

        for (const pData of results) {
          const pUid = pData.userId || pData.id;
          if (!pUid) continue;

          const killsInc = Number(pData.kills) || 0;
          const damageInc = Number(pData.damage) || 0;

          const bwStr = tourney.booyahWinner ? String(tourney.booyahWinner).trim().toLowerCase() : '';
          const ruStr = tourney.runnerUp ? String(tourney.runnerUp).trim().toLowerCase() : '';

          const isWin = Boolean(bwStr && (
            bwStr === String(pUid).trim().toLowerCase() ||
            (pData.gameName && bwStr === String(pData.gameName).trim().toLowerCase()) ||
            (pData.displayName && bwStr === String(pData.displayName).trim().toLowerCase()) ||
            (pData.id && bwStr === String(pData.id).trim().toLowerCase())
          ));

          const isRunnerUp = !isWin && Boolean(ruStr && (
            ruStr === String(pUid).trim().toLowerCase() ||
            (pData.gameName && ruStr === String(pData.gameName).trim().toLowerCase()) ||
            (pData.displayName && ruStr === String(pData.displayName).trim().toLowerCase()) ||
            (pData.id && ruStr === String(pData.id).trim().toLowerCase())
          ));

          let prizeWon = killsInc * perKillRate;
          let role = `${killsInc} Kills`;
          if (isWin) {
            prizeWon += booyahPrize;
            role = `Champion (${booyahPrize} Tk) + ${killsInc} Kills (${killsInc * perKillRate} Tk)`;
          } else if (isRunnerUp) {
            prizeWon += runnerUpPrize;
            role = `Runner-Up (${runnerUpPrize} Tk) + ${killsInc} Kills (${killsInc * perKillRate} Tk)`;
          }

          const userRef = doc(db, 'users', pUid);
          try {
            const uSnap = await getDoc(userRef);
            const existingData = uSnap.exists() ? uSnap.data() : {};
            const curTokens = Number(existingData.tokens) || 0;
            const curSolo = existingData.soloStats || {};

            const userUpdatePayload: any = {
              soloStats: {
                matches: (curSolo.matches || 0) + 1,
                kills: (curSolo.kills || 0) + killsInc,
                damage: (curSolo.damage || curSolo.damages || 0) + damageInc,
                damages: (curSolo.damage || curSolo.damages || 0) + damageInc,
                wins: (curSolo.wins || 0) + (isWin ? 1 : 0),
                runnerUps: (curSolo.runnerUps || 0) + (isRunnerUp ? 1 : 0),
                joined: (curSolo.joined || curSolo.matches || 0) + 1
              },
              totalKills: increment(killsInc),
              totalDamage: increment(damageInc),
              matchesPlayed: increment(1),
              updatedAt: new Date().toISOString()
            };

            if (prizeWon > 0) {
              totalPrizesDistributed += prizeWon;
              distributionLogs.push({
                recipientName: pData.displayName || pData.gameName || 'Player',
                recipientId: pUid,
                amount: prizeWon,
                role
              });

              userUpdatePayload.tokens = curTokens + prizeWon;

              // Record transaction in wallet_history
              await setDoc(doc(collection(db, 'wallet_history')), {
                userId: pUid,
                userName: pData.displayName || pData.gameName || 'Player',
                type: 'credit',
                amount: prizeWon,
                balanceAfter: curTokens + prizeWon,
                description: `Prize for Tournament #${tourney.tournamentNumber || tourney.id} (${role})`,
                tournamentId: tourney.id,
                createdAt: serverTimestamp()
              });

              // Record in user personal tokenTransactions
              await setDoc(doc(collection(db, 'users', pUid, 'tokenTransactions')), {
                type: 'prize',
                amount: prizeWon,
                balanceAfter: curTokens + prizeWon,
                tournamentId: tourney.id,
                tournamentNumber: tourney.tournamentNumber || '',
                tournamentTitle: tourney.title || 'Tournament',
                description: `Prize for Tournament #${tourney.tournamentNumber || tourney.id} (${role})`,
                reason: `Prize won for Tournament #${tourney.tournamentNumber || tourney.id} (${role})`,
                createdAt: serverTimestamp()
              });
            }

            await setDoc(userRef, userUpdatePayload, { merge: true });
          } catch (e) {
            console.error(`Error updating solo player prize & stats for ${pUid}:`, e);
          }
        }
      } else {
        // 2. Distribute Prize Money and Update Career Statistics for Squad
        // In squad tournaments:
        // - Prize is NOT divided among players.
        // - ONLY the captain/leader receives it.
        // - Per-kill prize is 0.
        // - Individual kills & damage from breakdown are applied to each member's career stats.
        const booyahPrize = Number(tourney.booyahPrize) || 0;
        const runnerUpPrize = Number(tourney.runnerUpPrize) || 0;

        for (const sqd of results) {
          const bwStr = tourney.booyahWinner ? String(tourney.booyahWinner).trim().toLowerCase() : '';
          const ruStr = tourney.runnerUp ? String(tourney.runnerUp).trim().toLowerCase() : '';

          const isSquadWin = Boolean(bwStr && (
            bwStr === String(sqd.id).trim().toLowerCase() ||
            (sqd.name && bwStr === String(sqd.name).trim().toLowerCase()) ||
            (sqd.squadName && bwStr === String(sqd.squadName).trim().toLowerCase())
          ));

          const isSquadRunnerUp = !isSquadWin && Boolean(ruStr && (
            ruStr === String(sqd.id).trim().toLowerCase() ||
            (sqd.name && ruStr === String(sqd.name).trim().toLowerCase()) ||
            (sqd.squadName && ruStr === String(sqd.squadName).trim().toLowerCase())
          ));

          // Find squad details in joinedSquads
          const joinedSquad = (tourney.joinedSquads || []).find(
            (s: any) => s.id === sqd.id || s.name === sqd.name || (s.squadName && s.squadName === sqd.name)
          );
          const captainId = joinedSquad?.leaderId || sqd.leaderId || sqd.members?.find((m: any) => m.isCaptain)?.userId || sqd.members?.[0]?.userId || sqd.members?.[0]?.uid;
          const captainName = joinedSquad?.leaderName || sqd.leaderName || 'Captain';

          let prizeForCaptain = 0;
          let role = '';
          if (isSquadWin && booyahPrize > 0) {
            prizeForCaptain = booyahPrize;
            role = `Squad Champion (${sqd.name})`;
          } else if (isSquadRunnerUp && runnerUpPrize > 0) {
            prizeForCaptain = runnerUpPrize;
            role = `Squad Runner-Up (${sqd.name})`;
          }

          // Transfer prize to Captain's personal tokens account
          if (prizeForCaptain > 0 && captainId) {
            totalPrizesDistributed += prizeForCaptain;
            distributionLogs.push({
              recipientName: `${captainName} (${sqd.name})`,
              recipientId: captainId,
              amount: prizeForCaptain,
              role
            });

            const capRef = doc(db, 'users', captainId);
            try {
              const capSnap = await getDoc(capRef);
              const existingCapData = capSnap.exists() ? capSnap.data() : {};
              const curTokens = Number(existingCapData.tokens) || 0;

              await updateDoc(capRef, {
                tokens: curTokens + prizeForCaptain,
                updatedAt: new Date().toISOString()
              });

              await setDoc(doc(collection(db, 'wallet_history')), {
                userId: captainId,
                userName: captainName,
                type: 'credit',
                amount: prizeForCaptain,
                balanceAfter: curTokens + prizeForCaptain,
                description: `Tournament Prize: ${role} - #${tourney.tournamentNumber || tourney.id}`,
                tournamentId: tourney.id,
                createdAt: serverTimestamp()
              });

              await setDoc(doc(collection(db, 'users', captainId, 'tokenTransactions')), {
                type: 'prize',
                amount: prizeForCaptain,
                balanceAfter: curTokens + prizeForCaptain,
                tournamentId: tourney.id,
                tournamentNumber: tourney.tournamentNumber || '',
                tournamentTitle: tourney.title || 'Tournament',
                description: `Squad Prize: ${role} - Tournament #${tourney.tournamentNumber || tourney.id}`,
                reason: `Prize won for Tournament #${tourney.tournamentNumber || tourney.id} (${role})`,
                createdAt: serverTimestamp()
              });
            } catch (e) {
              console.error(`Error transferring prize to squad captain ${captainId}:`, e);
            }
          }

          // Update individual career statistics for each squad member
          const rawMembers = sqd.members || [];
          for (const member of rawMembers) {
            const mUid = member.userId || member.uid || member.id;
            if (!mUid) continue;

            const memberKills = Number(member.kills) || 0;
            const memberDamage = Number(member.damage) || 0;

            const memberRef = doc(db, 'users', mUid);
            try {
              const mSnap = await getDoc(memberRef);
              const mData = mSnap.exists() ? mSnap.data() : {};
              const curSquadStats = mData.squadStats || {};

              await setDoc(memberRef, {
                squadStats: {
                  matches: (curSquadStats.matches || 0) + 1,
                  kills: (curSquadStats.kills || 0) + memberKills,
                  damage: (curSquadStats.damage || curSquadStats.damages || 0) + memberDamage,
                  damages: (curSquadStats.damage || curSquadStats.damages || 0) + memberDamage,
                  wins: (curSquadStats.wins || 0) + (isSquadWin ? 1 : 0),
                  runnerUps: (curSquadStats.runnerUps || 0) + (isSquadRunnerUp ? 1 : 0),
                  joined: (curSquadStats.joined || curSquadStats.matches || 0) + 1
                },
                totalKills: increment(memberKills),
                totalDamage: increment(memberDamage),
                matchesPlayed: increment(1),
                updatedAt: new Date().toISOString()
              }, { merge: true });
            } catch (e) {
              console.error(`Error updating squadStats for member ${mUid}:`, e);
            }
          }
        }
      }

      // 3. Debit Tournament Wallet Balance
      const remainingTournamentWallet = Math.max(0, initialWalletBalance - totalPrizesDistributed);

      // 4. Log prize deduction in pro_host_wallet_history
      if (totalPrizesDistributed > 0) {
        await setDoc(doc(collection(db, 'pro_host_wallet_history')), {
          tournamentId: tourney.id,
          tournamentNumber: tourney.tournamentNumber || tourney.id,
          hostId: tourney.hostId,
          type: 'debit',
          amount: totalPrizesDistributed,
          balanceAfter: remainingTournamentWallet,
          description: `Prize Distribution (${distributionLogs.length} recipients)`,
          details: distributionLogs,
          createdAt: serverTimestamp()
        });
      }

      // 5. Update Tournament Document to 'Completed' (and keep wallet locked until Admin unlocks)
      const tourneyRef = doc(db, 'tournaments_freefire', tourney.id);
      await updateDoc(tourneyRef, {
        status: 'Completed',
        walletBalance: remainingTournamentWallet,
        walletStatus: tourney.walletStatus || 'locked',
        prizesDistributed: totalPrizesDistributed,
        distributionLogs: distributionLogs,
        resultApprovedAt: new Date().toISOString(),
        resultApprovedBy: userProfile?.displayName || userProfile?.email || 'Admin',
        finalResultData: tourney.tempResultData || null,
        finalResultSquads: tourney.tempResultSquads || null,
        tempResultData: deleteField(),
        tempResultSquads: deleteField(),
        updatedAt: serverTimestamp()
      });

      setConfirmApproveMatch(null);
      setToastMessage({
        type: 'success',
        text: `Tournament result approved! 🪙 ${totalPrizesDistributed} Tokens prize distributed.`
      });
    } catch (err: any) {
      console.error("Error approving tournament result:", err);
      setToastMessage({ type: 'error', text: 'Failed to approve result: ' + err.message });
    } finally {
      setProcessingId(null);
    }
  };

  // Execute Revert Tournament Result to Pending
  const executeRevertTournament = async (tourney: any) => {
    if (!tourney || processingId) return;
    setProcessingId(tourney.id);

    try {
      const isSolo = tourney.mode === 'solo';
      const results = isSolo 
        ? (tourney.finalResultData || tourney.tempResultData || []) 
        : (tourney.finalResultSquads || tourney.tempResultSquads || []);

      // 1. Rollback Prizes and Stats if the tournament was approved
      if (tourney.resultApprovedAt || tourney.status === 'Completed' || tourney.status === 'Ended') {
        if (isSolo) {
          const perKillRate = Number(tourney.perKill) || 0;
          const booyahPrize = Number(tourney.booyahPrize) || 0;
          const runnerUpPrize = Number(tourney.runnerUpPrize) || 0;

          for (const pData of results) {
            const pUid = pData.userId || pData.id;
            if (!pUid) continue;

            const killsInc = Number(pData.kills) || 0;
            const damageInc = Number(pData.damage) || 0;

            const bwStr = tourney.booyahWinner ? String(tourney.booyahWinner).trim().toLowerCase() : '';
            const ruStr = tourney.runnerUp ? String(tourney.runnerUp).trim().toLowerCase() : '';

            const isWin = Boolean(bwStr && (
              bwStr === String(pUid).trim().toLowerCase() ||
              (pData.gameName && bwStr === String(pData.gameName).trim().toLowerCase()) ||
              (pData.displayName && bwStr === String(pData.displayName).trim().toLowerCase()) ||
              (pData.id && bwStr === String(pData.id).trim().toLowerCase())
            ));

            const isRunnerUp = !isWin && Boolean(ruStr && (
              ruStr === String(pUid).trim().toLowerCase() ||
              (pData.gameName && ruStr === String(pData.gameName).trim().toLowerCase()) ||
              (pData.displayName && ruStr === String(pData.displayName).trim().toLowerCase()) ||
              (pData.id && ruStr === String(pData.id).trim().toLowerCase())
            ));

            let prizeWon = killsInc * perKillRate;
            if (isWin) {
              prizeWon += booyahPrize;
            } else if (isRunnerUp) {
              prizeWon += runnerUpPrize;
            }

            const userRef = doc(db, 'users', pUid);
            try {
              const uSnap = await getDoc(userRef);
              if (uSnap.exists()) {
                const uData = uSnap.data();
                const curTokens = Number(uData.tokens) || 0;
                const curSolo = uData.soloStats || {};

                const userUpdatePayload: any = {
                  soloStats: {
                    matches: Math.max(0, (curSolo.matches || 1) - 1),
                    kills: Math.max(0, (curSolo.kills || killsInc) - killsInc),
                    damage: Math.max(0, (curSolo.damage || curSolo.damages || damageInc) - damageInc),
                    damages: Math.max(0, (curSolo.damage || curSolo.damages || damageInc) - damageInc),
                    wins: Math.max(0, (curSolo.wins || (isWin ? 1 : 0)) - (isWin ? 1 : 0)),
                    runnerUps: Math.max(0, (curSolo.runnerUps || (isRunnerUp ? 1 : 0)) - (isRunnerUp ? 1 : 0)),
                    joined: Math.max(0, (curSolo.joined || curSolo.matches || 1) - 1)
                  },
                  totalKills: increment(-killsInc),
                  totalDamage: increment(-damageInc),
                  matchesPlayed: increment(-1),
                  updatedAt: new Date().toISOString()
                };

                if (prizeWon > 0) {
                  userUpdatePayload.tokens = Math.max(0, curTokens - prizeWon);
                  await setDoc(doc(collection(db, 'wallet_history')), {
                    userId: pUid,
                    userName: pData.displayName || pData.gameName || 'Player',
                    type: 'debit',
                    amount: prizeWon,
                    balanceAfter: Math.max(0, curTokens - prizeWon),
                    description: `Prize Rollback for Tournament #${tourney.tournamentNumber || tourney.id} (Result Reverted to Pending)`,
                    tournamentId: tourney.id,
                    createdAt: serverTimestamp()
                  });

                  await setDoc(doc(collection(db, 'users', pUid, 'tokenTransactions')), {
                    type: 'rollback',
                    amount: prizeWon,
                    balanceAfter: Math.max(0, curTokens - prizeWon),
                    tournamentId: tourney.id,
                    tournamentNumber: tourney.tournamentNumber || '',
                    tournamentTitle: tourney.title || 'Tournament',
                    description: `Prize Rollback for Tournament #${tourney.tournamentNumber || tourney.id}`,
                    reason: `Prize rollback for Tournament #${tourney.tournamentNumber || tourney.id} (Reverted to Pending)`,
                    createdAt: serverTimestamp()
                  });
                }

                await setDoc(userRef, userUpdatePayload, { merge: true });
              }
            } catch (e) {
              console.error(`Error rolling back solo player prize & stats for ${pUid}:`, e);
            }
          }
        } else {
          // Squad Rollback
          const booyahPrize = Number(tourney.booyahPrize) || 0;
          const runnerUpPrize = Number(tourney.runnerUpPrize) || 0;

          for (const sqd of results) {
            const bwStr = tourney.booyahWinner ? String(tourney.booyahWinner).trim().toLowerCase() : '';
            const ruStr = tourney.runnerUp ? String(tourney.runnerUp).trim().toLowerCase() : '';

            const isSquadWin = Boolean(bwStr && (
              bwStr === String(sqd.id).trim().toLowerCase() ||
              (sqd.name && bwStr === String(sqd.name).trim().toLowerCase()) ||
              (sqd.squadName && bwStr === String(sqd.squadName).trim().toLowerCase())
            ));

            const isSquadRunnerUp = !isSquadWin && Boolean(ruStr && (
              ruStr === String(sqd.id).trim().toLowerCase() ||
              (sqd.name && ruStr === String(sqd.name).trim().toLowerCase()) ||
              (sqd.squadName && ruStr === String(sqd.squadName).trim().toLowerCase())
            ));

            const joinedSquad = (tourney.joinedSquads || []).find(
              (s: any) => s.id === sqd.id || s.name === sqd.name || (s.squadName && s.squadName === sqd.name)
            );
            const captainId = joinedSquad?.leaderId || sqd.leaderId || sqd.members?.find((m: any) => m.isCaptain)?.userId || sqd.members?.[0]?.userId || sqd.members?.[0]?.uid;
            const captainName = joinedSquad?.leaderName || sqd.leaderName || 'Captain';

            let prizeForCaptain = 0;
            if (isSquadWin && booyahPrize > 0) prizeForCaptain = booyahPrize;
            else if (isSquadRunnerUp && runnerUpPrize > 0) prizeForCaptain = runnerUpPrize;

            if (prizeForCaptain > 0 && captainId) {
              const capRef = doc(db, 'users', captainId);
              try {
                const capSnap = await getDoc(capRef);
                if (capSnap.exists()) {
                  const existingCapData = capSnap.data();
                  const curTokens = Number(existingCapData.tokens) || 0;

                  await updateDoc(capRef, {
                    tokens: Math.max(0, curTokens - prizeForCaptain),
                    updatedAt: new Date().toISOString()
                  });

                  await setDoc(doc(collection(db, 'wallet_history')), {
                    userId: captainId,
                    userName: captainName,
                    type: 'debit',
                    amount: prizeForCaptain,
                    balanceAfter: Math.max(0, curTokens - prizeForCaptain),
                    description: `Squad Prize Rollback - Tournament #${tourney.tournamentNumber || tourney.id} (Result Reverted)`,
                    tournamentId: tourney.id,
                    createdAt: serverTimestamp()
                  });

                  await setDoc(doc(collection(db, 'users', captainId, 'tokenTransactions')), {
                    type: 'rollback',
                    amount: prizeForCaptain,
                    balanceAfter: Math.max(0, curTokens - prizeForCaptain),
                    tournamentId: tourney.id,
                    tournamentNumber: tourney.tournamentNumber || '',
                    tournamentTitle: tourney.title || 'Tournament',
                    description: `Squad Prize Rollback - Tournament #${tourney.tournamentNumber || tourney.id}`,
                    reason: `Squad prize rollback for Tournament #${tourney.tournamentNumber || tourney.id} (Reverted to Pending)`,
                    createdAt: serverTimestamp()
                  });
                }
              } catch (e) {
                console.error(`Error rolling back captain prize for ${captainId}:`, e);
              }
            }

            // Rollback members stats
            const rawMembers = sqd.members || [];
            for (const member of rawMembers) {
              const mUid = member.userId || member.uid || member.id;
              if (!mUid) continue;

              const memberKills = Number(member.kills) || 0;
              const memberDamage = Number(member.damage) || 0;

              const memberRef = doc(db, 'users', mUid);
              try {
                const mSnap = await getDoc(memberRef);
                if (mSnap.exists()) {
                  const mData = mSnap.data();
                  const curSquadStats = mData.squadStats || {};

                  await setDoc(memberRef, {
                    squadStats: {
                      matches: Math.max(0, (curSquadStats.matches || 1) - 1),
                      kills: Math.max(0, (curSquadStats.kills || memberKills) - memberKills),
                      damage: Math.max(0, (curSquadStats.damage || curSquadStats.damages || memberDamage) - memberDamage),
                      damages: Math.max(0, (curSquadStats.damage || curSquadStats.damages || memberDamage) - memberDamage),
                      wins: Math.max(0, (curSquadStats.wins || (isSquadWin ? 1 : 0)) - (isSquadWin ? 1 : 0)),
                      runnerUps: Math.max(0, (curSquadStats.runnerUps || (isSquadRunnerUp ? 1 : 0)) - (isSquadRunnerUp ? 1 : 0)),
                      joined: Math.max(0, (curSquadStats.joined || curSquadStats.matches || 1) - 1)
                    },
                    totalKills: increment(-memberKills),
                    totalDamage: increment(-memberDamage),
                    matchesPlayed: increment(-1),
                    updatedAt: new Date().toISOString()
                  }, { merge: true });
                }
              } catch (e) {
                console.error(`Error rolling back squadStats for member ${mUid}:`, e);
              }
            }
          }
        }

        // Rollback Profit from system.wallets if it was deducted
        const profitDeducted = Number(tourney.profitDeducted) || 0;
        if (profitDeducted > 0) {
          try {
            const systemWalletsRef = doc(db, 'system', 'wallets');
            const sysSnap = await getDoc(systemWalletsRef);
            if (sysSnap.exists()) {
              const curSys = sysSnap.data();
              const curProfitWallet = Number(curSys.tournamentProfitWallet) || 0;
              const curProfitWalletTotal = Number(curSys.tournamentProfitWalletTotal) || 0;

              await setDoc(systemWalletsRef, {
                tournamentProfitWallet: Math.max(0, curProfitWallet - profitDeducted),
                tournamentProfitWalletTotal: Math.max(0, curProfitWalletTotal - profitDeducted),
                lastUpdated: serverTimestamp()
              }, { merge: true });

              await setDoc(doc(collection(db, 'system', 'wallets', 'history')), {
                walletType: 'tournamentProfitWallet',
                amountAdded: profitDeducted,
                type: 'deduction',
                reason: `Profit Rollback for Tournament #${tourney.tournamentNumber || tourney.id} (Result Reverted)`,
                tournamentId: tourney.id,
                performedBy: userProfile?.displayName || userProfile?.email || 'Admin',
                createdAt: serverTimestamp()
              });
            }
          } catch (e) {
            console.error("Error rolling back tournament profit wallet:", e);
          }
        }
      }

      // Calculate initial entry fees collected and restore original wallet balance
      const entryFeesCollected = isSolo
        ? ((tourney.joinedPlayers?.length || tourney.joinedCount || 0) * (Number(tourney.entryFee) || 0))
        : ((tourney.joinedSquads?.length || 0) * (Number(tourney.entryFee) || 0));

      const originalWalletBalance = (Number(tourney.walletTokens) || 0) + entryFeesCollected;

      // 2. Set tournament document status back to 'ResultUnderReview' (Pending Review)
      const tourneyRef = doc(db, 'tournaments_freefire', tourney.id);
      const updateData: any = {
        status: 'ResultUnderReview',
        walletBalance: originalWalletBalance,
        walletStatus: 'locked',
        profitDeducted: 0,
        prizesDistributed: 0,
        distributionLogs: [],
        resultApprovedAt: null,
        resultApprovedBy: null,
        rejectedAt: null,
        rejectedBy: null,
        rejectionReason: null,
        updatedAt: serverTimestamp()
      };

      // Restore temp results if they were moved to final
      if (tourney.finalResultData) {
        updateData.tempResultData = tourney.finalResultData;
      }
      if (tourney.finalResultSquads) {
        updateData.tempResultSquads = tourney.finalResultSquads;
      }

      await updateDoc(tourneyRef, updateData);

      setRevertMatchModal(null);
      setToastMessage({
        type: 'success',
        text: `Tournament #${tourney.tournamentNumber || tourney.id} result reverted to Pending Review successfully!`
      });
    } catch (err: any) {
      console.error("Error in executeRevertTournament:", err);
      setToastMessage({ type: 'error', text: 'Failed to revert tournament result: ' + err.message });
    } finally {
      setProcessingId(null);
    }
  };

  // Execute Tournament Wallet Unlock with System Profit Deduction
  const executeUnlockTournamentWallet = async (tourney: any, customPercentage: number) => {
    if (!tourney) return;
    setUnlockTournamentWalletModal(prev => ({ ...prev, isUnlocking: true }));

    const isAlreadyDeducted = tourney.profitDeducted !== undefined && tourney.profitDeducted > 0;
    const calculatedEntryFees = tourney.mode === 'squad'
      ? ((tourney.joinedSquads?.length || 0) * (Number(tourney.entryFee) || 0))
      : ((tourney.joinedPlayers?.length || tourney.joinedCount || 0) * (Number(tourney.entryFee) || 0));
    const currentBalance = tourney.walletBalance !== undefined 
      ? Number(tourney.walletBalance) 
      : ((Number(tourney.walletTokens) || 0) + calculatedEntryFees);
    const profitPercentage = customPercentage !== undefined ? customPercentage : tournamentProfitPercentage;
    const profitDeducted = isAlreadyDeducted ? 0 : Math.round((currentBalance * profitPercentage) / 100);
    const hostRemaining = Math.max(0, currentBalance - profitDeducted);

    try {
      await runTransaction(db, async (transaction) => {
        const tourneyRef = doc(db, 'tournaments_freefire', tourney.id);
        const walletsRef = doc(db, 'system', 'wallets');

        const walletsSnap = await transaction.get(walletsRef);
        const tourneySnap = await transaction.get(tourneyRef);

        if (!tourneySnap.exists()) {
          throw new Error('Tournament document not found.');
        }

        if (profitDeducted > 0) {
          if (walletsSnap.exists()) {
            const wData = walletsSnap.data();
            const curTournamentProfit = Number(wData.tournamentProfitWallet) || 0;
            const curTournamentProfitTotal = Number(wData.tournamentProfitWalletTotal) || 0;

            transaction.update(walletsRef, {
              tournamentProfitWallet: curTournamentProfit + profitDeducted,
              tournamentProfitWalletTotal: curTournamentProfitTotal + profitDeducted,
              updatedAt: serverTimestamp()
            });
          } else {
            transaction.set(walletsRef, {
              tournamentProfitWallet: profitDeducted,
              tournamentProfitWalletTotal: profitDeducted,
              updatedAt: serverTimestamp()
            }, { merge: true });
          }

          // Add history record to system wallets history
          const histRef = doc(collection(db, 'system', 'wallets', 'history'));
          transaction.set(histRef, {
            walletType: 'tournamentProfitWallet',
            amountAdded: profitDeducted,
            type: 'addition',
            reason: `Tournament Profit Deduction (${profitPercentage}%) - #${tourney.tournamentNumber || tourney.id} (${tourney.title})`,
            addedBy: userProfile?.displayName || 'Admin',
            addedByEmail: userProfile?.email || 'admin@vortex.com',
            tournamentId: tourney.id,
            createdAt: serverTimestamp()
          });
        }

        // Update tournament wallet status
        const updateData: any = {
          walletStatus: 'unlocked',
          walletBalance: hostRemaining,
          unlockedAt: new Date().toISOString(),
          unlockedBy: userProfile?.displayName || userProfile?.email || 'Admin',
          updatedAt: serverTimestamp()
        };

        if (!isAlreadyDeducted) {
          updateData.profitDeducted = profitDeducted;
          updateData.profitPercentage = profitPercentage;
        }

        transaction.update(tourneyRef, updateData);

        // Log in pro_host_wallet_history
        const hostHistRef = doc(collection(db, 'pro_host_wallet_history'));
        transaction.set(hostHistRef, {
          tournamentId: tourney.id,
          tournamentNumber: tourney.tournamentNumber || tourney.id,
          hostId: tourney.hostId,
          type: 'profit_deduction',
          amount: profitDeducted,
          balanceAfter: hostRemaining,
          description: `System Profit Deduction (${profitPercentage}%) & Wallet Unlocked`,
          createdAt: serverTimestamp()
        });
      });

      setToastMessage({
        type: 'success',
        text: `Successfully unlocked Tournament Wallet! ${isAlreadyDeducted ? 'Wallet activated without repeating deduction.' : `🪙 ${profitDeducted} Tokens deducted (${profitPercentage}%) to Tournament Profit Wallet.`}`
      });
      setUnlockTournamentWalletModal({ isOpen: false, tourney: null, customPercentage: 10, isUnlocking: false });
    } catch (err: any) {
      console.error("Error unlocking tournament wallet:", err);
      setToastMessage({ type: 'error', text: 'Failed to unlock tournament wallet: ' + (err.message || String(err)) });
      setUnlockTournamentWalletModal(prev => ({ ...prev, isUnlocking: false }));
    }
  };

  // Save global profit percentage
  const handleSaveGlobalProfitPercentage = async () => {
    try {
      const settingsRef = doc(db, 'system', 'settings');
      await setDoc(settingsRef, {
        tournamentProfitPercentage: Number(newProfitPercentageInput) || 10,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setTournamentProfitPercentage(Number(newProfitPercentageInput) || 10);
      setToastMessage({ type: 'success', text: `Tournament profit percentage set to ${newProfitPercentageInput}% successfully!` });
      setProfitPercentageModal(false);
    } catch (err: any) {
      console.error("Error saving tournament profit percentage:", err);
      setToastMessage({ type: 'error', text: 'Failed to update profit percentage: ' + err.message });
    }
  };

  // Save global lone wolf profit percentage
  const handleSaveLoneWolfProfitPercentage = async () => {
    try {
      const settingsRef = doc(db, 'system', 'settings');
      await setDoc(settingsRef, {
        loneWolfProfitPercentage: Number(newLoneWolfProfitPercentageInput) || 10,
        updatedAt: serverTimestamp()
      }, { merge: true });
      setLoneWolfProfitPercentage(Number(newLoneWolfProfitPercentageInput) || 10);
      setToastMessage({ type: 'success', text: `Lone Wolf profit percentage set to ${newLoneWolfProfitPercentageInput}% successfully!` });
      setLoneWolfProfitPercentageModal(false);
    } catch (err: any) {
      console.error("Error saving lone wolf profit percentage:", err);
      setToastMessage({ type: 'error', text: 'Failed to update Lone Wolf profit percentage: ' + err.message });
    }
  };

  // Execute Lone Wolf Wallet Unlock
  const executeUnlockLoneWolfWallet = async (match: any, customPercentage: number) => {
    if (!match) return;
    setUnlockLoneWolfWalletModal(prev => ({ ...prev, isUnlocking: true }));

    const isAlreadyDeducted = match.profitDeducted !== undefined && match.profitDeducted > 0;
    
    // Calculate current wallet balance
    const hostDeposit = Number(match.walletTokens) || Number(match.prizePool) || 0;
    const p1Fee = match.player1 ? (Number(match.entryFee) || 0) : 0;
    const p2Fee = match.player2 ? (Number(match.entryFee) || 0) : 0;
    const totalLockedTokens = hostDeposit + p1Fee + p2Fee;
    
    const currentBalance = match.walletBalance !== undefined ? Number(match.walletBalance) : Math.max(0, totalLockedTokens - (Number(match.prizePool) || 0));
    
    const profitPercentage = customPercentage !== undefined ? customPercentage : loneWolfProfitPercentage;
    const profitDeducted = isAlreadyDeducted ? 0 : Math.round((currentBalance * profitPercentage) / 100);
    const hostRemaining = Math.max(0, currentBalance - profitDeducted);

    try {
      await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, 'lone_wolf_matches', match.id);
        const walletsRef = doc(db, 'system', 'wallets');

        const walletsSnap = await transaction.get(walletsRef);
        const matchSnap = await transaction.get(matchRef);

        if (!matchSnap.exists()) {
          throw new Error('Match document not found.');
        }

        if (profitDeducted > 0) {
          if (walletsSnap.exists()) {
            const wData = walletsSnap.data();
            const curProfit = Number(wData.loneWolfPercentageWallet) || Number(wData.loneWolfProfitWallet) || 0;
            const curProfitTotal = Number(wData.loneWolfPercentageWalletTotal) || Number(wData.loneWolfProfitWalletTotal) || 0;

            transaction.update(walletsRef, {
              loneWolfPercentageWallet: curProfit + profitDeducted,
              loneWolfPercentageWalletTotal: curProfitTotal + profitDeducted,
              updatedAt: serverTimestamp()
            });
          } else {
            transaction.set(walletsRef, {
              loneWolfPercentageWallet: profitDeducted,
              loneWolfPercentageWalletTotal: profitDeducted,
              updatedAt: serverTimestamp()
            }, { merge: true });
          }

          // Add history record to system wallets history
          const histRef = doc(collection(db, 'system', 'wallets', 'history'));
          transaction.set(histRef, {
            walletType: 'loneWolfPercentageWallet',
            amountAdded: profitDeducted,
            type: 'addition',
            reason: `Lone Wolf Profit Deduction (${profitPercentage}%) - #${match.matchNumber || match.id} (${match.title || '1v1'})`,
            addedBy: userProfile?.displayName || 'Admin',
            addedByEmail: userProfile?.email || 'admin@vortex.com',
            matchId: match.id,
            matchNumber: match.matchNumber || match.id,
            matchTitle: match.title || 'Lone Wolf 1v1',
            hostId: match.hostId || '',
            hostName: match.hostName || '',
            hostEmail: match.hostEmail || '',
            profitPercentage: profitPercentage,
            gameCategory: match.gameCategory || match.game || 'freefire',
            createdAt: serverTimestamp()
          });
        }

        // Update match wallet status
        const updateData: any = {
          walletStatus: 'unlocked',
          walletBalance: hostRemaining,
          unlockedAt: new Date().toISOString(),
          unlockedBy: userProfile?.displayName || userProfile?.email || 'Admin',
          updatedAt: serverTimestamp()
        };

        if (!isAlreadyDeducted) {
          updateData.profitDeducted = profitDeducted;
          updateData.profitPercentage = profitPercentage;
        }

        transaction.update(matchRef, updateData);

        // Log in pro_host_wallet_history
        const hostHistRef = doc(collection(db, 'pro_host_wallet_history'));
        transaction.set(hostHistRef, {
          matchId: match.id,
          matchNumber: match.matchNumber || match.id,
          hostId: match.hostId,
          type: 'profit_deduction',
          amount: profitDeducted,
          balanceAfter: hostRemaining,
          description: `System Profit Deduction (${profitPercentage}%) & Wallet Unlocked`,
          createdAt: serverTimestamp()
        });
      });

      setToastMessage({
        type: 'success',
        text: `Unlocked Lone Wolf Wallet successfully! ${profitDeducted} 🪙 routed to Lone Wolf Percentage Wallet.`
      });
      setUnlockLoneWolfWalletModal({ isOpen: false, match: null, customPercentage: 10, isUnlocking: false });
    } catch (err: any) {
      console.error("Error unlocking lone wolf wallet:", err);
      setToastMessage({ type: 'error', text: 'Failed to unlock wallet: ' + (err.message || String(err)) });
    } finally {
      setUnlockLoneWolfWalletModal(prev => ({ ...prev, isUnlocking: false }));
    }
  };

  const executeApprove = async (match: any) => {
    if (!match || processingId) return;

    if (match.statsApplied) {
      setToastMessage({ type: 'error', text: 'Statistics for this match have already been applied.' });
      return;
    }

    setProcessingId(match.id);
    try {
      // 1. Fetch the squads to apply stats
      let squads: any[] = [];
      const leagueId = match.leagueId || (match.id ? match.id.split('_')[0] : '');

      if (leagueId) {
        try {
          const squadsQ = query(
            collection(db, 'pro_league_squads'),
            where('leagueId', '==', leagueId)
          );
          const squadsSnap = await getDocs(squadsQ);
          squads = squadsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        } catch (err) {
          console.error("Error fetching squads for stats update:", err);
        }
      }

      const getSquadByTbdId = (tbdId: string) => {
        if (!tbdId) return null;
        const clean = String(tbdId).trim().toLowerCase();
        return squads.find((s: any) => 
          s.tbdId === tbdId || 
          s.teamName === tbdId || 
          s.id === tbdId ||
          (s.teamName && s.teamName.toLowerCase() === clean) ||
          (s.squadName && s.squadName.toLowerCase() === clean)
        );
      };

      // 2. Extract match data
      let t1 = match.t1 || '';
      let t2 = match.t2 || '';
      const playerStats = match.playerStats || {};
      const winner = match.winner;

      // 3. Collect players & update career statistics
      const s1: any = t1 ? getSquadByTbdId(t1) : null;
      const s2: any = t2 ? getSquadByTbdId(t2) : null;

      const playersToUpdate: Array<{
        userId?: string;
        email?: string;
        gameName?: string;
        kills: number;
        damage: number;
        isWin: boolean;
      }> = [];

      const isDummyOrInvalid = (email?: string, userId?: string, gameName?: string) => {
        const emailStr = (email || '').toLowerCase().trim();
        const uidStr = (userId || '').toLowerCase().trim();
        const nameStr = (gameName || '').toLowerCase().trim();
        
        return (
          emailStr.includes('dummy') ||
          emailStr.includes('@vortex.com') ||
          emailStr === 'unknown' ||
          emailStr === '' ||
          uidStr.includes('dummy') ||
          uidStr === 'unknown' ||
          uidStr === '' ||
          nameStr.includes('dummy') ||
          nameStr.includes('squad 1 player') ||
          nameStr.includes('squad 2 player') ||
          nameStr === 'unknown' ||
          nameStr === ''
        );
      };

      const processPlayerList = (players: any[], isSquadWin: boolean) => {
        if (!Array.isArray(players)) return;
        for (const p of players) {
          const pKey = p.email || p.userId || p.gameName || p.inGameName || p.name || 'unknown';
          const pEmail = p.email || p.userId || '';
          const pGameName = p.gameName || p.inGameName || p.displayName || p.name;
          
          if (isDummyOrInvalid(pEmail, p.userId || p.uid, pGameName)) {
            continue;
          }

          const stats = playerStats[pKey] || playerStats[pEmail] || playerStats[p.userId] || playerStats[p.gameName] || playerStats[p.email?.split('@')[0]] || { kills: 0, damage: 0 };
          playersToUpdate.push({
            userId: p.userId || p.uid || undefined,
            email: p.email || undefined,
            gameName: pGameName || undefined,
            kills: Number(stats.kills) || 0,
            damage: Number(stats.damage) || 0,
            isWin: isSquadWin
          });
        }
      };

      if (s1?.players) {
        const isS1Win = winner === t1 || winner === s1.teamName || winner === s1.tbdId || winner === s1.squadName;
        processPlayerList(s1.players, isS1Win);
      }

      if (s2?.players) {
        const isS2Win = winner === t2 || winner === s2.teamName || winner === s2.tbdId || winner === s2.squadName;
        processPlayerList(s2.players, isS2Win);
      }

      // Also check keys directly present in match.playerStats if any player wasn't listed in squad.players
      if (playerStats && typeof playerStats === 'object') {
        for (const [key, val] of Object.entries(playerStats)) {
          const isKeyEmail = key.includes('@');
          const emailVal = isKeyEmail ? key : undefined;
          const uidVal = isKeyEmail ? undefined : key;
          const gameNameVal = isKeyEmail ? undefined : key;

          if (isDummyOrInvalid(emailVal, uidVal, gameNameVal)) {
            continue;
          }

          if (!playersToUpdate.some(item => item.email === key || item.userId === key || item.gameName === key)) {
            playersToUpdate.push({
              userId: uidVal,
              email: emailVal,
              gameName: gameNameVal,
              kills: Number((val as any)?.kills) || 0,
              damage: Number((val as any)?.damage) || 0,
              isWin: winner ? winner.toLowerCase().includes(key.toLowerCase()) : false
            });
          }
        }
      }

      // Apply updates to user documents
      for (const pData of playersToUpdate) {
        if (isDummyOrInvalid(pData.email, pData.userId, pData.gameName)) {
          continue;
        }

        let resolvedUid: string | null = null;
        const initialTarget = pData.userId;

        // 1. Check if direct userId is a valid user doc ID
        if (initialTarget && initialTarget.length >= 8 && !initialTarget.includes('@') && !initialTarget.includes(' ')) {
          try {
            const docSnap = await getDoc(doc(db, 'users', initialTarget));
            if (docSnap.exists()) {
              resolvedUid = initialTarget;
            }
          } catch (e) {
            // Not a direct UID doc
          }
        }

        // 2. Query user by email if not found
        const searchEmail = pData.email || (initialTarget && initialTarget.includes('@') ? initialTarget : undefined);
        if (!resolvedUid && searchEmail && searchEmail.trim().length >= 5 && !isDummyOrInvalid(searchEmail)) {
          try {
            const cleanEmail = searchEmail.trim();
            const lowerEmail = cleanEmail.toLowerCase();

            let uQ = query(collection(db, 'users'), where('email', '==', cleanEmail));
            let uSnap = await getDocs(uQ);

            if (uSnap.empty && lowerEmail !== cleanEmail) {
              uQ = query(collection(db, 'users'), where('email', '==', lowerEmail));
              uSnap = await getDocs(uQ);
            }

            if (!uSnap.empty) {
              resolvedUid = uSnap.docs[0].id;
            }
          } catch (e) {
            console.error("Error finding user by email:", e);
          }
        }

        // 3. Query user by gameName / displayName / inGameName / gamingUid if not found
        const searchName = pData.gameName || (initialTarget && !initialTarget.includes('@') ? initialTarget : undefined);
        if (!resolvedUid && searchName && searchName.trim().length >= 3 && !isDummyOrInvalid(undefined, undefined, searchName)) {
          try {
            const cleanName = searchName.trim();
            for (const field of ['gameName', 'displayName', 'inGameName', 'gamingUid']) {
              const uQ = query(collection(db, 'users'), where(field, '==', cleanName));
              const uSnap = await getDocs(uQ);
              if (!uSnap.empty) {
                resolvedUid = uSnap.docs[0].id;
                break;
              }
            }
          } catch (e) {
            console.error("Error finding user by name/id:", e);
          }
        }

        if (resolvedUid) {
          const userRef = doc(db, 'users', resolvedUid);
          const wasWin = pData.isWin;
          const killsInc = pData.kills;
          const damageInc = pData.damage;

          try {
            const uSnap = await getDoc(userRef);
            const existingData = uSnap.exists() ? uSnap.data() : {};
            
            const leagueObj = leaguesData[leagueId];
            const isClashSquad = leagueObj ? (leagueObj.game === 'Free Fire CS' || (leagueObj.game || '').toLowerCase().includes('cs') || (leagueObj.game || '').toLowerCase().includes('clash')) : true;
            const isSolo = leagueObj ? Number(leagueObj.squadSize) === 1 : false;

            const curCS = existingData.squadCsStats || {};
            const curGen = existingData.stats || {};

            const updatePayload: any = {
              updatedAt: new Date().toISOString()
            };

            // League matches are Squad Clash Squad (CS) only. Update only squadCsStats and never update Solo BR or Squad BR.
            updatePayload.squadCsStats = {
              matches: (curCS.matches || 0) + 1,
              kills: (curCS.kills || 0) + killsInc,
              damages: (curCS.damages || curCS.damage || 0) + damageInc,
              damage: (curCS.damages || curCS.damage || 0) + damageInc,
              wins: (curCS.wins || 0) + (wasWin ? 1 : 0),
              booyahs: (curCS.booyahs || 0) + (wasWin ? 1 : 0),
              booyah: (curCS.booyah || 0) + (wasWin ? 1 : 0),
              joined: Math.max((curCS.joined || 0), (curCS.matches || 0) + 1)
            };

            updatePayload.stats = {
              matches: (curGen.matches || 0) + 1,
              kills: (curGen.kills || 0) + killsInc,
              damages: (curGen.damages || curGen.damage || 0) + damageInc,
              damage: (curGen.damages || curGen.damage || 0) + damageInc,
              wins: (curGen.wins || 0) + (wasWin ? 1 : 0)
            };

            updatePayload.totalKills = increment(killsInc);
            updatePayload.totalDamage = increment(damageInc);
            updatePayload.matchesPlayed = increment(1);

            await setDoc(userRef, updatePayload, { merge: true });
          } catch (e2) {
            console.error("Critical error updating user stats for:", resolvedUid, e2);
          }
        }
      }

            // 5. Update match status to approved
      const approvedByVal = userProfile?.userId || userProfile?.uid || 'admin';
      const matchRef = doc(db, 'pro_league_schedule_matches', match.id);
      await setDoc(matchRef, {
        reviewStatus: 'approved',
        status: 'completed',
        isPlayed: true,
        statsApplied: true,
        approvedBy: approvedByVal,
        approvedAt: new Date().toISOString()
      }, { merge: true });

      // Automatically advance winner in Knockout
      if (match.isKnockout || (match.id && match.id.includes('m-ko-'))) {
        let winnerName = match.winner;
        const scoreA = Number(match.scoreA || 0);
        const scoreB = Number(match.scoreB || 0);

        if (scoreA > scoreB && match.t1) {
          winnerName = match.t1;
        } else if (scoreB > scoreA && match.t2) {
          winnerName = match.t2;
        }

        const matchId = match.id;
        
        let nextMatchId = '';
        let targetField = ''; // 't1' or 't2'

        // Determine next match based on current knockout match ID pattern from LeagueScheduleView
        if (matchId.includes('m-ko-qf1')) { nextMatchId = 'm-ko-sf1'; targetField = 't1'; }
        else if (matchId.includes('m-ko-qf3')) { nextMatchId = 'm-ko-sf1'; targetField = 't2'; }
        else if (matchId.includes('m-ko-qf2')) { nextMatchId = 'm-ko-sf2'; targetField = 't1'; }
        else if (matchId.includes('m-ko-qf4')) { nextMatchId = 'm-ko-sf2'; targetField = 't2'; }
        else if (matchId.includes('m-ko-sf1')) { nextMatchId = 'm-ko-final'; targetField = 't1'; }
        else if (matchId.includes('m-ko-sf2')) { nextMatchId = 'm-ko-final'; targetField = 't2'; }
        // Pre-Quarter Finals to Quarter Finals
        else if (matchId.includes('m-ko-pqf-1')) { nextMatchId = 'm-ko-qf1'; targetField = 't1'; }
        else if (matchId.includes('m-ko-pqf-3')) { nextMatchId = 'm-ko-qf1'; targetField = 't2'; }
        else if (matchId.includes('m-ko-pqf-2')) { nextMatchId = 'm-ko-qf2'; targetField = 't1'; }
        else if (matchId.includes('m-ko-pqf-4')) { nextMatchId = 'm-ko-qf2'; targetField = 't2'; }
        else if (matchId.includes('m-ko-pqf-5')) { nextMatchId = 'm-ko-qf3'; targetField = 't1'; }
        else if (matchId.includes('m-ko-pqf-7')) { nextMatchId = 'm-ko-qf3'; targetField = 't2'; }
        else if (matchId.includes('m-ko-pqf-6')) { nextMatchId = 'm-ko-qf4'; targetField = 't1'; }
        else if (matchId.includes('m-ko-pqf-8')) { nextMatchId = 'm-ko-qf4'; targetField = 't2'; }

        if (nextMatchId && targetField && winnerName) {
          try {
            const leagueId = match.leagueId || (match.id && match.id.includes('_') ? match.id.split('_')[0] : '');
            const targetDocId = leagueId ? `${leagueId}_${nextMatchId}` : nextMatchId;
            
            const nextMatchRef = doc(db, 'pro_league_schedule_matches', targetDocId);
            await setDoc(nextMatchRef, { 
              [targetField]: winnerName,
              leagueId: leagueId,
              matchId: nextMatchId,
              updatedAt: new Date().toISOString()
            }, { merge: true });
            console.log(`Advanced ${winnerName} to ${targetDocId} as ${targetField} (matchId: ${nextMatchId})`);
          } catch (advErr) {
            console.error("Error advancing winner in knockout:", advErr);
          }
        }
      }

      // 6. Update host league champion, runner-up, and top 3 players for Hall of Glory
      if (leagueId) {
        try {
          const allApprovedQ = query(
            collection(db, 'pro_league_schedule_matches'),
            where('leagueId', '==', leagueId)
          );
          const allApprovedSnap = await getDocs(allApprovedQ);
          const allApprovedMatches = allApprovedSnap.docs
            .map(d => ({ id: d.id, ...d.data() }))
            .filter((m: any) => m.reviewStatus === 'approved' || m.id === match.id);

          const isMatchFinal = (m: any) => {
            if (!m) return false;
            const mName = (m.matchName || '').toLowerCase();
            const rName = (m.roundName || '').toLowerCase();
            const mId = (m.matchId || '').toString();
            return (
              mName.includes('final') || 
              rName.includes('final') || 
              m.isFinalMatch || 
              m.isFinal || 
              mId === '7' || mId === '15' || mId === '31' || mId === '63' || mId === '127'
            );
          };

          const finalMatchObj = allApprovedMatches.find(isMatchFinal) || (isMatchFinal(match) ? match : null);

          let champSquad: any = null;
          let runnerSquad: any = null;

          if (finalMatchObj) {
            const fWinner = finalMatchObj.winner || match.winner;
            const fT1 = finalMatchObj.t1 || match.t1;
            const fT2 = finalMatchObj.t2 || match.t2;

            const s1Obj = getSquadByTbdId(fT1);
            const s2Obj = getSquadByTbdId(fT2);

            const isS1Winner = fWinner === fT1 || fWinner === s1Obj?.teamName || fWinner === s1Obj?.tbdId || fWinner === s1Obj?.squadName;
            if (isS1Winner) {
              champSquad = s1Obj || { teamName: fWinner || fT1, coverUrl: '' };
              runnerSquad = s2Obj || { teamName: fT2, coverUrl: '' };
            } else {
              champSquad = s2Obj || { teamName: fWinner || fT2, coverUrl: '' };
              runnerSquad = s1Obj || { teamName: fT1, coverUrl: '' };
            }
          }

          // Aggregate player stats across all approved matches for top 3 players
          const aggregatedPlayerMap: Record<string, {
            userId?: string;
            email?: string;
            displayName: string;
            photoURL: string;
            kills: number;
            damage: number;
            matchesPlayed: number;
          }> = {};

          for (const mDoc of allApprovedMatches) {
            const mStats = (mDoc as any).playerStats || {};
            for (const [pKey, pVal] of Object.entries(mStats)) {
              if (!pKey) continue;
              const kills = Number((pVal as any)?.kills) || 0;
              const damage = Number((pVal as any)?.damage) || 0;

              const prof = playersProfiles[pKey] || {};
              const pEmail = pKey.includes('@') ? pKey : (prof.email || '');
              const pUserId = !pKey.includes('@') ? pKey : (prof.userId || prof.uid || '');

              const displayName = prof.gameName || prof.displayName || (pEmail ? pEmail.split('@')[0] : pKey);
              const photoURL = prof.photoURL || prof.avatarUrl || prof.profilePicture || prof.avatar || prof.photo || '';

              if (!aggregatedPlayerMap[pKey]) {
                aggregatedPlayerMap[pKey] = {
                  userId: pUserId || undefined,
                  email: pEmail || undefined,
                  displayName,
                  photoURL,
                  kills: 0,
                  damage: 0,
                  matchesPlayed: 0
                };
              }

              aggregatedPlayerMap[pKey].kills += kills;
              aggregatedPlayerMap[pKey].damage += damage;
              aggregatedPlayerMap[pKey].matchesPlayed += 1;
              if (photoURL && !aggregatedPlayerMap[pKey].photoURL) {
                aggregatedPlayerMap[pKey].photoURL = photoURL;
              }
            }
          }

          const sortedTopPlayers = Object.values(aggregatedPlayerMap)
            .sort((a, b) => b.kills - a.kills || b.damage - a.damage);

          const topRank1 = sortedTopPlayers[0] ? {
            rank: 1,
            name: sortedTopPlayers[0].displayName,
            displayName: sortedTopPlayers[0].displayName,
            photoURL: sortedTopPlayers[0].photoURL,
            kills: sortedTopPlayers[0].kills,
            damage: sortedTopPlayers[0].damage,
            userId: sortedTopPlayers[0].userId || ''
          } : null;

          const topRank2 = sortedTopPlayers[1] ? {
            rank: 2,
            name: sortedTopPlayers[1].displayName,
            displayName: sortedTopPlayers[1].displayName,
            photoURL: sortedTopPlayers[1].photoURL,
            kills: sortedTopPlayers[1].kills,
            damage: sortedTopPlayers[1].damage,
            userId: sortedTopPlayers[1].userId || ''
          } : null;

          const topRank3 = sortedTopPlayers[2] ? {
            rank: 3,
            name: sortedTopPlayers[2].displayName,
            displayName: sortedTopPlayers[2].displayName,
            photoURL: sortedTopPlayers[2].photoURL,
            kills: sortedTopPlayers[2].kills,
            damage: sortedTopPlayers[2].damage,
            userId: sortedTopPlayers[2].userId || ''
          } : null;

          const top3List = [topRank1, topRank2, topRank3].filter(Boolean);

          const leagueUpdatePayload: any = {
            updatedAt: new Date().toISOString()
          };

          if (champSquad) {
            const cName = champSquad.teamName || champSquad.squadName || 'Champion';
            const cCover = champSquad.coverUrl || champSquad.banner || champSquad.logoUrl || champSquad.logo || champSquad.coverPhoto || '';
            leagueUpdatePayload.champion = cName;
            leagueUpdatePayload.championCover = cCover;
            leagueUpdatePayload.championSquad = {
              id: champSquad.id || champSquad.tbdId || '',
              teamName: cName,
              coverUrl: cCover
            };
          }

          if (runnerSquad) {
            const rName = runnerSquad.teamName || runnerSquad.squadName || 'Runner-Up';
            const rCover = runnerSquad.coverUrl || runnerSquad.banner || runnerSquad.logoUrl || runnerSquad.logo || runnerSquad.coverPhoto || '';
            leagueUpdatePayload.runnerUp = rName;
            leagueUpdatePayload.runnerUpCover = rCover;
            leagueUpdatePayload.runnerUpSquad = {
              id: runnerSquad.id || runnerSquad.tbdId || '',
              teamName: rName,
              coverUrl: rCover
            };
          }

          if (top3List.length > 0) {
            leagueUpdatePayload.topPlayers = top3List;
            leagueUpdatePayload.topRank1Player = topRank1;
            leagueUpdatePayload.topRank2Player = topRank2;
            leagueUpdatePayload.topRank3Player = topRank3;
          }

          if (finalMatchObj) {
            leagueUpdatePayload.isFinalPlayed = true;
            leagueUpdatePayload.finalMatchApproved = true;
          }

          const hostLeagueRef = doc(db, 'pro_hosted_leagues', leagueId);
          await setDoc(hostLeagueRef, leagueUpdatePayload, { merge: true });

          try {
            const upazilaRef = doc(db, 'upazila_leagues', leagueId);
            const uSnap = await getDoc(upazilaRef);
            if (uSnap.exists()) {
              await setDoc(upazilaRef, leagueUpdatePayload, { merge: true });
            }
          } catch (uErr) {
            console.log("Upazila league update skip:", uErr);
          }

        } catch (err) {
          console.error("Error updating league champion, runner up, and top players:", err);
        }
      }

      setConfirmApproveMatch(null);
      setToastMessage({ type: 'success', text: 'Result approved & career statistics updated successfully!' });
    } catch (e: any) {
      console.error("Error in executeApprove:", e);
      setToastMessage({ type: 'error', text: 'Failed to approve result: ' + (e?.message || e) });
    } finally {
      setProcessingId(null);
    }
  };

  const revertKnockoutWinner = async (matchObj: any) => {
    if (!matchObj) return;
    const matchId = matchObj.matchId || matchObj.id || '';
    if (!matchObj.isKnockout && !matchId.includes('m-ko-')) return;

    let nextMatchId = '';
    let targetField = ''; // 't1' or 't2'

    if (matchId.includes('m-ko-qf1')) { nextMatchId = 'm-ko-sf1'; targetField = 't1'; }
    else if (matchId.includes('m-ko-qf3')) { nextMatchId = 'm-ko-sf1'; targetField = 't2'; }
    else if (matchId.includes('m-ko-qf2')) { nextMatchId = 'm-ko-sf2'; targetField = 't1'; }
    else if (matchId.includes('m-ko-qf4')) { nextMatchId = 'm-ko-sf2'; targetField = 't2'; }
    else if (matchId.includes('m-ko-sf1')) { nextMatchId = 'm-ko-final'; targetField = 't1'; }
    else if (matchId.includes('m-ko-sf2')) { nextMatchId = 'm-ko-final'; targetField = 't2'; }
    else if (matchId.includes('m-ko-pqf-1')) { nextMatchId = 'm-ko-qf1'; targetField = 't1'; }
    else if (matchId.includes('m-ko-pqf-3')) { nextMatchId = 'm-ko-qf1'; targetField = 't2'; }
    else if (matchId.includes('m-ko-pqf-2')) { nextMatchId = 'm-ko-qf2'; targetField = 't1'; }
    else if (matchId.includes('m-ko-pqf-4')) { nextMatchId = 'm-ko-qf2'; targetField = 't2'; }
    else if (matchId.includes('m-ko-pqf-5')) { nextMatchId = 'm-ko-qf3'; targetField = 't1'; }
    else if (matchId.includes('m-ko-pqf-7')) { nextMatchId = 'm-ko-qf3'; targetField = 't2'; }
    else if (matchId.includes('m-ko-pqf-6')) { nextMatchId = 'm-ko-qf4'; targetField = 't1'; }
    else if (matchId.includes('m-ko-pqf-8')) { nextMatchId = 'm-ko-qf4'; targetField = 't2'; }

    if (nextMatchId && targetField) {
      try {
        const leagueId = matchObj.leagueId || (matchId.includes('_') ? matchId.split('_')[0] : '');
        const targetDocId = leagueId ? `${leagueId}_${nextMatchId}` : nextMatchId;
        const nextMatchRef = doc(db, 'pro_league_schedule_matches', targetDocId);
        await setDoc(nextMatchRef, { 
          [targetField]: deleteField(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log(`Reverted/cleared knockout slot ${targetField} for ${targetDocId}`);
      } catch (err) {
        console.error("Error reverting winner in knockout:", err);
      }
    }
  };

  const executeReject = async (match: any, reason: string) => {
    if (!match || processingId) return;

    setProcessingId(match.id);
    try {
      const matchRef = doc(db, 'pro_league_schedule_matches', match.id);
      await setDoc(matchRef, {
        reviewStatus: 'rejected',
        status: 'live',
        rejectionReason: reason || '',
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      await revertKnockoutWinner(match);

      setRejectMatchModal(null);
      setRejectionReasonInput('');
      setToastMessage({ type: 'success', text: 'Result rejected and sent back to host.' });
    } catch (e: any) {
      console.error("Error in executeReject:", e);
      setToastMessage({ type: 'error', text: 'Failed to reject result: ' + (e?.message || e) });
    } finally {
      setProcessingId(null);
    }
  };

  const executeRevertToPending = async (match: any) => {
    if (!match || processingId) return;

    setProcessingId(match.id);
    console.log("Reverting match to pending:", match.id);
    try {
      // 1. Rollback stats if they were applied
      if (match.statsApplied) {
        let squads: any[] = [];
        const leagueId = match.leagueId || (match.id && match.id.includes('_') ? match.id.split('_')[0] : '');
        
        console.log("Starting stats rollback for match:", match.id, "League:", leagueId);

        if (leagueId) {
          try {
            const squadsQ = query(
              collection(db, 'pro_league_squads'),
              where('leagueId', '==', leagueId)
            );
            const squadsSnap = await getDocs(squadsQ);
            squads = squadsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
          } catch (err) {
            console.error("Error fetching squads for rollback:", err);
          }
        }

        const getSquadByTbdId = (tbdId: string) => {
          if (!tbdId) return null;
          return squads.find((s: any) => s.tbdId === tbdId || s.teamName === tbdId || s.id === tbdId);
        };

        let t1 = match.t1 || '';
        let t2 = match.t2 || '';
        const playerStats = match.playerStats || {};
        const winner = match.winner;

        const s1: any = t1 ? getSquadByTbdId(t1) : null;
        const s2: any = t2 ? getSquadByTbdId(t2) : null;

        const playersToRollback: Array<{
          userId?: string;
          email?: string;
          gameName?: string;
          kills: number;
          damage: number;
          wasWin: boolean;
        }> = [];

        const isDummyOrInvalid = (email?: string, userId?: string, gameName?: string) => {
          const emailStr = (email || '').toLowerCase().trim();
          const uidStr = (userId || '').toLowerCase().trim();
          const nameStr = (gameName || '').toLowerCase().trim();
          
          return (
            emailStr.includes('dummy') ||
            emailStr.includes('@vortex.com') ||
            emailStr === 'unknown' ||
            emailStr === '' ||
            uidStr.includes('dummy') ||
            uidStr === 'unknown' ||
            uidStr === '' ||
            nameStr.includes('dummy') ||
            nameStr.includes('squad 1 player') ||
            nameStr.includes('squad 2 player') ||
            nameStr === 'unknown' ||
            nameStr === ''
          );
        };

        const processPlayerListRollback = (players: any[], isSquadWin: boolean) => {
          if (!Array.isArray(players)) return;
          for (const p of players) {
            const pKey = p.email || p.userId || p.gameName || p.inGameName || p.name || 'unknown';
            const pEmail = p.email || p.userId || '';
            const pGameName = p.gameName || p.inGameName || p.displayName || p.name;
            
            if (isDummyOrInvalid(pEmail, p.userId || p.uid, pGameName)) {
              continue;
            }

            const stats = playerStats[pKey] || playerStats[pEmail] || playerStats[p.userId] || playerStats[p.gameName] || playerStats[p.email?.split('@')[0]] || { kills: 0, damage: 0 };
            playersToRollback.push({
              userId: p.userId || p.uid || undefined,
              email: p.email || undefined,
              gameName: pGameName || undefined,
              kills: Number(stats.kills) || 0,
              damage: Number(stats.damage) || 0,
              wasWin: isSquadWin
            });
          }
        };

        if (s1?.players) {
          const isS1Win = winner === t1 || winner === s1.teamName || winner === s1.tbdId || winner === s1.squadName;
          processPlayerListRollback(s1.players, isS1Win);
        }

        if (s2?.players) {
          const isS2Win = winner === t2 || winner === s2.teamName || winner === s2.tbdId || winner === s2.squadName;
          processPlayerListRollback(s2.players, isS2Win);
        }

        // Apply rollbacks to users
        for (const pData of playersToRollback) {
          let resolvedUid: string | null = null;
          const initialTarget = pData.userId;

          if (initialTarget && initialTarget.length >= 8 && !initialTarget.includes('@') && !initialTarget.includes(' ')) {
            try {
              const docSnap = await getDoc(doc(db, 'users', initialTarget));
              if (docSnap.exists()) resolvedUid = initialTarget;
            } catch (e) {}
          }

          const searchEmail = pData.email || (initialTarget && initialTarget.includes('@') ? initialTarget : undefined);
          if (!resolvedUid && searchEmail && searchEmail.trim().length >= 5 && !isDummyOrInvalid(searchEmail)) {
            try {
              const uQ = query(collection(db, 'users'), where('email', '==', searchEmail.trim()));
              const uSnap = await getDocs(uQ);
              if (!uSnap.empty) resolvedUid = uSnap.docs[0].id;
            } catch (e) {}
          }

          if (resolvedUid) {
            const userRef = doc(db, 'users', resolvedUid);
            try {
              const uSnap = await getDoc(userRef);
              if (uSnap.exists()) {
                const existingData = uSnap.data() || {};
                const curCS = existingData.squadCsStats || {};
                const curGen = existingData.stats || {};

                const updatePayload: any = {
                  updatedAt: new Date().toISOString()
                };

                updatePayload.squadCsStats = {
                  matches: Math.max(0, (curCS.matches || 0) - 1),
                  kills: Math.max(0, (curCS.kills || 0) - pData.kills),
                  damages: Math.max(0, (curCS.damages || curCS.damage || 0) - pData.damage),
                  damage: Math.max(0, (curCS.damages || curCS.damage || 0) - pData.damage),
                  wins: Math.max(0, (curCS.wins || 0) - (pData.wasWin ? 1 : 0)),
                  booyahs: Math.max(0, (curCS.booyahs || 0) - (pData.wasWin ? 1 : 0)),
                  booyah: Math.max(0, (curCS.booyah || 0) - (pData.wasWin ? 1 : 0)),
                  joined: Math.max(0, (curCS.joined || 0) - 1)
                };

                updatePayload.stats = {
                  matches: Math.max(0, (curGen.matches || 0) - 1),
                  kills: Math.max(0, (curGen.kills || 0) - pData.kills),
                  damages: Math.max(0, (curGen.damages || curGen.damage || 0) - pData.damage),
                  damage: Math.max(0, (curGen.damages || curGen.damage || 0) - pData.damage),
                  wins: Math.max(0, (curGen.wins || 0) - (pData.wasWin ? 1 : 0))
                };

                updatePayload.totalKills = increment(-pData.kills);
                updatePayload.totalDamage = increment(-pData.damage);
                updatePayload.matchesPlayed = increment(-1);

                await setDoc(userRef, updatePayload, { merge: true });
              }
            } catch (e) {}
          }
        }
      }

      // 2. Set reviewStatus to pending
      const matchRef = doc(db, 'pro_league_schedule_matches', match.id);
      await setDoc(matchRef, {
        reviewStatus: 'pending',
        status: 'live',
        isPlayed: false,
        statsApplied: false,
        approvedBy: null,
        approvedAt: null
      }, { merge: true });

      await revertKnockoutWinner(match);

      setRevertMatchModal(null);
      setToastMessage({ type: 'success', text: 'Result reverted to pending review successfully!' });
    } catch (e: any) {
      console.error("Error in executeRevertToPending:", e);
      setToastMessage({ type: 'error', text: 'Failed to revert result: ' + (e?.message || e) });
    } finally {
      setProcessingId(null);
    }
  };

  const getMatchNumberDisplay = (match: any, league?: any) => {
    if (match?.matchNumber && !isNaN(Number(match.matchNumber))) {
      return Number(match.matchNumber);
    }
    if (match?.globalOrder && !isNaN(Number(match.globalOrder))) {
      return Number(match.globalOrder);
    }

    const mId = match?.matchId || match?.id || '';
    const squadSize = league?.squadSize || 8;
    const totalMatchesCount = squadSize <= 4 ? 7 : squadSize <= 8 ? 15 : squadSize <= 16 ? 31 : squadSize <= 32 ? 63 : 127;

    if (mId.includes('m-ko-final')) return totalMatchesCount;
    if (mId.includes('m-ko-sf2')) return totalMatchesCount - 1;
    if (mId.includes('m-ko-sf1')) return totalMatchesCount - 2;
    if (mId.includes('m-ko-qf4')) return totalMatchesCount - 3;
    if (mId.includes('m-ko-qf3')) return totalMatchesCount - 4;
    if (mId.includes('m-ko-qf2')) return totalMatchesCount - 5;
    if (mId.includes('m-ko-qf1')) return totalMatchesCount - 6;
    if (mId.includes('m-ko-pqf-')) {
      const parts = mId.split('m-ko-pqf-');
      const idx = parseInt(parts[1], 10) || 1;
      return totalMatchesCount - 14 + (idx - 1);
    }

    const matches = mId.match(/\d+/g);
    if (matches && matches.length > 0) {
      return parseInt(matches[matches.length - 1], 10);
    }

    return 1;
  };

  const getRoundNumberDisplay = (match: any) => {
    if (match?.roundNumber) return match.roundNumber;
    const mId = match?.matchId || match?.id || '';
    if (mId.includes('m-ko-final')) return 4;
    if (mId.includes('m-ko-sf')) return 3;
    if (mId.includes('m-ko-qf')) return 2;
    if (mId.includes('m-ko-pqf')) return 2;
    return 1;
  };

  const getRoundNameDisplay = (match: any) => {
    if (match?.roundName) return match.roundName;
    const mId = match?.matchId || match?.id || '';
    if (mId.includes('m-ko-final')) return 'Grand Final';
    if (mId.includes('m-ko-sf')) return 'Semi Finals';
    if (mId.includes('m-ko-qf')) return 'Quarter Finals';
    if (mId.includes('m-ko-pqf')) return 'Pre-Quarter Finals';
    return 'Group Stage';
  };

  const sortedPendingMatches = [...pendingMatches].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });

  const sortedApprovedMatches = [...approvedMatches].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });

  const sortedRejectedMatches = [...rejectedMatches].sort((a, b) => {
    const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return bTime - aTime;
  });

  const sortedPendingTournaments = [...pendingTournaments].sort((a, b) => {
    const aTime = new Date(a.resultSubmittedAt || 0).getTime();
    const bTime = new Date(b.resultSubmittedAt || 0).getTime();
    return bTime - aTime;
  });

  const sortedApprovedTournaments = [...approvedTournaments].sort((a, b) => {
    const aTime = new Date(a.resultApprovedAt || 0).getTime();
    const bTime = new Date(b.resultApprovedAt || 0).getTime();
    return bTime - aTime;
  });

  const sortedRejectedTournaments = [...rejectedTournaments].sort((a, b) => {
    const aTime = new Date(a.rejectedAt || 0).getTime();
    const bTime = new Date(b.rejectedAt || 0).getTime();
    return bTime - aTime;
  });

  const sortedPendingLoneWolf = [...pendingLoneWolf].sort((a, b) => {
    const aTime = new Date(a.resultSubmittedAt || 0).getTime();
    const bTime = new Date(b.resultSubmittedAt || 0).getTime();
    return bTime - aTime;
  });

  const sortedApprovedLoneWolf = [...approvedLoneWolf].sort((a, b) => {
    const aTime = new Date(a.prizeDistributedAt || 0).getTime();
    const bTime = new Date(b.prizeDistributedAt || 0).getTime();
    return bTime - aTime;
  });

  const sortedRejectedLoneWolf = [...rejectedLoneWolf].sort((a, b) => {
    const aTime = new Date(a.rejectedAt || 0).getTime();
    const bTime = new Date(b.rejectedAt || 0).getTime();
    return bTime - aTime;
  });

  const activeMatches = mainReviewCategory === 'leagues'
    ? (activeTab === 'pending' ? sortedPendingMatches : activeTab === 'approved' ? sortedApprovedMatches : sortedRejectedMatches)
    : mainReviewCategory === 'tournaments'
    ? (activeTab === 'pending' ? sortedPendingTournaments : activeTab === 'approved' ? sortedApprovedTournaments : sortedRejectedTournaments)
    : (activeTab === 'pending' ? sortedPendingLoneWolf : activeTab === 'approved' ? sortedApprovedLoneWolf : sortedRejectedLoneWolf);

  let currentPage = activeTab === 'pending' ? currentPagePending : currentPageApproved;
  const totalPages = Math.ceil(activeMatches.length / ITEMS_PER_PAGE) || 1;
  if (currentPage > totalPages) {
    currentPage = totalPages;
  }
  const paginatedMatches = activeMatches.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
        <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Loading Results...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Category Toggle & Global Admin Settings 3-Dot Menu */}
      <div className="flex flex-col md:flex-row md:items-center gap-3">
        <div className="flex-1 flex items-center gap-3 bg-slate-900 p-1.5 rounded-2xl border border-white/5 shadow-inner">
          <button
            onClick={() => {
              setMainReviewCategory('leagues');
              setActiveTab('pending');
              setCurrentPagePending(1);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              mainReviewCategory === 'leagues'
                ? 'bg-slate-800 text-cyan-400 border border-cyan-500/30 shadow-lg shadow-cyan-500/5'
                : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800/30'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">League Result Review</span>
            <span className="sm:hidden">Leagues</span>
          </button>
          <button
            onClick={() => {
              setMainReviewCategory('tournaments');
              setActiveTab('pending');
              setCurrentPagePending(1);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              mainReviewCategory === 'tournaments'
                ? 'bg-slate-800 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/5'
                : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800/30'
            }`}
          >
            <Trophy className="w-4 h-4" />
            <span className="hidden sm:inline">Tournament Result Review</span>
            <span className="sm:hidden">Tournaments</span>
          </button>
          <button
            onClick={() => {
              setMainReviewCategory('lonewolf');
              setActiveTab('pending');
              setCurrentPagePending(1);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
              mainReviewCategory === 'lonewolf'
                ? 'bg-slate-800 text-fuchsia-400 border border-fuchsia-500/30 shadow-lg shadow-fuchsia-500/5'
                : 'text-slate-500 hover:text-slate-400 hover:bg-slate-800/30'
            }`}
          >
            <Crown className="w-4 h-4" />
            <span className="hidden sm:inline">Lone Wolf Result Review</span>
            <span className="sm:hidden">Lone Wolf</span>
          </button>
        </div>

        {/* Global Admin 3-Dot Settings Dropdown */}
        <div className="relative self-end md:self-auto z-[150]">
          <button
            type="button"
            onClick={() => setIsGlobalAdminSettingsOpen(!isGlobalAdminSettingsOpen)}
            className="p-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/5 shadow-md flex items-center justify-center transition-all cursor-pointer"
            title="Global Settings & Wallets"
          >
            <MoreVertical className="w-5 h-5 text-fuchsia-400" />
          </button>
          
          <AnimatePresence>
            {isGlobalAdminSettingsOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -5 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -5 }}
                className="absolute right-0 top-full mt-2 w-72 bg-slate-950 border border-fuchsia-500/40 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] p-4 space-y-4 backdrop-blur-xl"
              >
                {/* Header */}
                <div className="border-b border-white/10 pb-2 flex items-center justify-between">
                  <span className="text-xs font-black uppercase tracking-wider text-fuchsia-400 font-mono">Admin Configurations</span>
                  <button onClick={() => setIsGlobalAdminSettingsOpen(false)} className="text-slate-400 hover:text-white text-[10px]">Close</button>
                </div>

                {/* Wallet Section */}
                <div className="space-y-2">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">System Wallets</span>
                  <div className="space-y-2">
                    {/* Existing Tournament Profit Wallet */}
                    <div className="p-2.5 bg-slate-900/95 rounded-xl border border-white/5 font-mono text-[11px] flex justify-between items-center">
                      <span className="text-slate-400 font-bold">Tournament Profit</span>
                      <span className="text-cyan-400 font-black">🪙 {systemWalletsData.tournamentProfitWallet || 0}</span>
                    </div>
                    {/* New Lone Wolf Percentage Wallet */}
                    <div className="p-2.5 bg-slate-900/95 rounded-xl border border-white/5 font-mono text-[11px] flex justify-between items-center">
                      <span className="text-slate-400 font-bold">Lone Wolf Percentage</span>
                      <span className="text-fuchsia-400 font-black">🪙 {systemWalletsData.loneWolfPercentageWallet || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Settings Section */}
                <div className="space-y-2 border-t border-white/10 pt-3">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 font-mono">Profit Percentages</span>
                  <div className="space-y-2">
                    {/* Set Tournament Percentage Button */}
                    <button
                      onClick={() => {
                        setIsGlobalAdminSettingsOpen(false);
                        setNewProfitPercentageInput(tournamentProfitPercentage);
                        setProfitPercentageModal(true);
                      }}
                      className="w-full px-3 py-2.5 text-left text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center justify-between transition-colors cursor-pointer border border-white/5"
                    >
                      <span className="flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-cyan-400" />
                        Tournament Profit %
                      </span>
                      <span className="text-cyan-300">{tournamentProfitPercentage}%</span>
                    </button>
                    
                    {/* Set Lone Wolf Percentage Button */}
                    <button
                      onClick={() => {
                        setIsGlobalAdminSettingsOpen(false);
                        setNewLoneWolfProfitPercentageInput(loneWolfProfitPercentage);
                        setLoneWolfProfitPercentageModal(true);
                      }}
                      className="w-full px-3 py-2.5 text-left text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center justify-between transition-colors cursor-pointer border border-white/5"
                    >
                      <span className="flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5 text-fuchsia-400" />
                        Lone Wolf Profit %
                      </span>
                      <span className="text-fuchsia-300">{loneWolfProfitPercentage}%</span>
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 bg-slate-900/50 p-1 rounded-2xl border border-white/5">
        <button
          onClick={() => setActiveTab('pending')}
          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'pending' 
              ? (mainReviewCategory === 'leagues' ? 'bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' : mainReviewCategory === 'tournaments' ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/20' : 'bg-fuchsia-500 text-white shadow-lg shadow-fuchsia-500/20')
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Pending Review ({mainReviewCategory === 'leagues' ? pendingMatches.length : mainReviewCategory === 'tournaments' ? pendingTournaments.length : pendingLoneWolf.length})
        </button>
        <button
          onClick={() => setActiveTab('approved')}
          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'approved' 
              ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Approved ({mainReviewCategory === 'leagues' ? approvedMatches.length : mainReviewCategory === 'tournaments' ? approvedTournaments.length : approvedLoneWolf.length})
        </button>
        <button
          onClick={() => setActiveTab('rejected')}
          className={`flex-1 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
            activeTab === 'rejected' 
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/20' 
              : 'text-slate-500 hover:text-slate-300'
          }`}
        >
          Rejected ({mainReviewCategory === 'leagues' ? rejectedMatches.length : mainReviewCategory === 'tournaments' ? rejectedTournaments.length : rejectedLoneWolf.length})
        </button>
      </div>

      {/* Global Setting Bar for Tournaments */}
      {mainReviewCategory === 'tournaments' && (
        <div className="bg-slate-900/80 border border-cyan-500/20 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_15px_rgba(6,182,212,0.08)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-wider font-mono">
                Tournament Profit Share: <span className="text-cyan-400">{tournamentProfitPercentage}%</span>
              </p>
              <p className="text-[10px] text-slate-400">
                System percentage automatically deducted upon unlocking tournament wallet
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setNewProfitPercentageInput(tournamentProfitPercentage);
              setProfitPercentageModal(true);
            }}
            className="px-3.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase font-mono tracking-wider bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Set Profit %</span>
          </button>
        </div>
      )}

      {/* Global Setting Bar for Lone Wolf */}
      {mainReviewCategory === 'lonewolf' && (
        <div className="bg-slate-900/80 border border-fuchsia-500/20 rounded-2xl p-3 sm:p-4 flex flex-wrap items-center justify-between gap-3 shadow-[0_0_15px_rgba(217,70,239,0.08)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <p className="text-xs font-black text-white uppercase tracking-wider font-mono">
                Lone Wolf Profit Share: <span className="text-fuchsia-400">{loneWolfProfitPercentage}%</span>
              </p>
              <p className="text-[10px] text-slate-400">
                System percentage automatically deducted upon unlocking Lone Wolf host wallet
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setNewLoneWolfProfitPercentageInput(loneWolfProfitPercentage);
              setLoneWolfProfitPercentageModal(true);
            }}
            className="px-3.5 py-1.5 rounded-xl text-[10px] sm:text-xs font-black uppercase font-mono tracking-wider bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 border border-fuchsia-500/40 cursor-pointer flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Set Profit %</span>
          </button>
        </div>
      )}

      <div className="space-y-4">
        <AnimatePresence mode="wait">
          {activeMatches.length === 0 ? (
            <motion.div 
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="py-20 text-center bg-slate-900/30 border border-white/5 rounded-[2rem] space-y-3"
            >
              <div className="w-16 h-16 mx-auto rounded-3xl bg-slate-800/50 flex items-center justify-center text-slate-600">
                {activeTab === 'pending' ? <Clock className="w-8 h-8" /> : <CheckCircle className="w-8 h-8" />}
              </div>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">No {activeTab} results found</p>
            </motion.div>
          ) : (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-4"
            >
              <div className="grid gap-4">
                {paginatedMatches.map((item) => {
                if (mainReviewCategory === 'tournaments') {
                  const tourney = item;
                  const isUnlocked = tourney.walletStatus === 'unlocked' || tourney.walletStatus === 'active';
                  const calculatedEntryFees = tourney.mode === 'squad'
                    ? ((tourney.joinedSquads?.length || 0) * (Number(tourney.entryFee) || 0))
                    : ((tourney.joinedPlayers?.length || tourney.joinedCount || 0) * (Number(tourney.entryFee) || 0));
                  const walletBalance = tourney.walletBalance !== undefined
                    ? Number(tourney.walletBalance)
                    : ((Number(tourney.walletTokens) || 0) + calculatedEntryFees);
                  const isDropdownOpen = activeDropdownTourneyId === tourney.id;

                  return (
                    <motion.div
                      key={tourney.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-900 border border-white/5 rounded-[2rem] p-5 hover:border-amber-500/30 transition-all overflow-visible relative"
                    >
                      {/* Header with Tournament Info */}
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-amber-500/10 border-2 border-amber-500/30 flex items-center justify-center text-amber-400 shadow-lg shadow-amber-500/10 shrink-0">
                            <Trophy className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-black text-white uppercase tracking-tight">{tourney.title}</h4>
                              <span className="text-[9px] font-mono text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-500/30 font-bold">
                                #{tourney.tournamentNumber || tourney.id}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{tourney.mode}</span>
                              <span className="text-[10px] text-slate-600">•</span>
                              
                              {/* Wallet Status Badge */}
                              <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase tracking-wider border ${
                                isUnlocked
                                  ? 'bg-emerald-950/80 text-emerald-400 border-emerald-500/40'
                                  : 'bg-amber-950/80 text-amber-400 border-amber-500/40'
                              }`}>
                                {isUnlocked ? <Unlock className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                                <span>{isUnlocked ? 'Wallet Unlocked' : 'Wallet Locked'}: 🪙 {walletBalance} Tk</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right: Submitted At + 3-Dot Options Menu */}
                        <div className="flex items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Submitted At</p>
                            <p className="text-[10px] font-bold text-white font-mono">{formatSubmittedDateTime(tourney.resultSubmittedAt)}</p>
                          </div>

                          {/* 3-Dot Dropdown */}
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveDropdownTourneyId(isDropdownOpen ? null : tourney.id)}
                              className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-colors cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>

                            <AnimatePresence>
                              {isDropdownOpen && (
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                  className="absolute right-0 top-full mt-2 w-56 bg-slate-950 border border-cyan-500/40 rounded-2xl shadow-[0_10px_30px_rgba(0,0,0,0.8)] z-30 p-1.5 space-y-1 backdrop-blur-xl"
                                >
                                  {/* Tournament Wallet Info */}
                                  <div className="p-2.5 bg-slate-900/90 rounded-xl border border-white/5 font-mono text-[10px]">
                                    <span className="text-slate-400 block font-bold">Tournament Wallet</span>
                                    <span className="text-amber-400 font-black text-xs flex items-center gap-1 mt-0.5">
                                      <Coins className="w-3.5 h-3.5 text-amber-400" />
                                      🪙 {walletBalance} Tk ({isUnlocked ? 'Unlocked' : 'Locked'})
                                    </span>
                                  </div>

                                  {/* See Results Option */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDropdownTourneyId(null);
                                      setViewingResultModalTourney(tourney);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-bold text-slate-200 hover:text-cyan-300 hover:bg-cyan-500/10 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Trophy className="w-3.5 h-3.5 text-amber-400" />
                                    <span>See Full Results</span>
                                  </button>

                                  {/* Unlock Tournament Wallet Option */}
                                  {!isUnlocked && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownTourneyId(null);
                                        setUnlockTournamentWalletModal({
                                          isOpen: true,
                                          tourney: tourney,
                                          customPercentage: tournamentProfitPercentage,
                                          isUnlocking: false
                                        });
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs font-bold text-emerald-300 hover:bg-emerald-500/10 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <Unlock className="w-3.5 h-3.5 text-emerald-400" />
                                      <span>Unlock Tournament Wallet</span>
                                    </button>
                                  )}

                                  {/* Set Profit % Option */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveDropdownTourneyId(null);
                                      setNewProfitPercentageInput(tournamentProfitPercentage);
                                      setProfitPercentageModal(true);
                                    }}
                                    className="w-full px-3 py-2 text-left text-xs font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-xl flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Percent className="w-3.5 h-3.5 text-cyan-400" />
                                    <span>Set Profit Percentage ({tournamentProfitPercentage}%)</span>
                                  </button>

                                  {/* Revert Result to Pending Option */}
                                  {activeTab !== 'pending' && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setActiveDropdownTourneyId(null);
                                        setRevertMatchModal({ type: 'tournament', data: tourney });
                                      }}
                                      className="w-full px-3 py-2 text-left text-xs font-bold text-amber-300 hover:bg-amber-500/10 rounded-xl flex items-center gap-2 transition-colors cursor-pointer border-t border-white/5 pt-2"
                                    >
                                      <Clock className="w-3.5 h-3.5 text-amber-400" />
                                      <span>Revert to Pending</span>
                                    </button>
                                  )}
                                </motion.div>
                              )}
                            </AnimatePresence>
                          </div>
                        </div>
                      </div>

                      {/* Result Screenshot Section */}
                      {tourney.resultScreenshotUrl && (
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <ImageIcon className="w-3.5 h-3.5" />
                              Match Result Proof
                            </h5>
                            <button 
                              onClick={() => setViewingScreenshot(tourney.resultScreenshotUrl)}
                              className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-widest flex items-center gap-1.5"
                            >
                              <Search className="w-3 h-3" />
                              View Full Size
                            </button>
                          </div>
                          <div 
                            onClick={() => setViewingScreenshot(tourney.resultScreenshotUrl)}
                            className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group cursor-pointer"
                          >
                            <img src={tourney.resultScreenshotUrl} alt="Result Proof" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="w-8 h-8 text-white" />
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Summary Data */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-3 text-center">
                          <p className="text-[9px] font-black text-amber-500 uppercase tracking-widest mb-1">Booyah Winner</p>
                          <p className="text-xs font-bold text-white font-mono truncate">
                            {tourney.mode === 'solo' 
                              ? ((tourney.tempResultData || tourney.finalResultData || []).find((p: any) => p.userId === tourney.booyahWinner)?.gameName || tourney.booyahWinner || 'N/A')
                              : (tourney.booyahWinner || 'N/A')}
                          </p>
                        </div>
                        <div className="bg-slate-950/50 border border-white/5 rounded-2xl p-3 text-center">
                          <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-1">Runner-Up</p>
                          <p className="text-xs font-bold text-white font-mono truncate">
                            {tourney.mode === 'solo' 
                              ? ((tourney.tempResultData || tourney.finalResultData || []).find((p: any) => p.userId === tourney.runnerUp)?.gameName || tourney.runnerUp || 'N/A')
                              : (tourney.runnerUp || 'N/A')}
                          </p>
                        </div>
                      </div>

                      {/* Detailed Player Stats - Collapsible */}
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Participant Performance</h5>
                          <span className="text-[9px] font-bold text-slate-500 font-mono">
                            {tourney.mode === 'solo' ? `${tourney.tempResultData?.length || 0} Players` : `${tourney.tempResultSquads?.length || 0} Squads`}
                          </span>
                        </div>
                        <div className="max-h-[240px] overflow-y-auto pr-1 space-y-2 custom-scrollbar">
                          {tourney.mode === 'solo' ? (
                            (tourney.tempResultData || tourney.finalResultData || []).map((p: any, idx: number) => (
                              <div key={idx} className="bg-slate-950 border border-white/[0.03] p-2.5 rounded-xl flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3 min-w-0">
                                  <img src={p.avatar} alt="" className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0" />
                                  <div className="min-w-0">
                                    <p className="text-xs font-bold text-white truncate">{p.gameName}</p>
                                    <p className="text-[10px] text-slate-500 truncate">{p.displayName}</p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-6 shrink-0 font-mono">
                                  <div className="text-center">
                                    <p className="text-[9px] text-slate-500 uppercase">Kills</p>
                                    <p className="text-sm font-black text-cyan-400">{p.kills}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-[9px] text-slate-500 uppercase">Damage</p>
                                    <p className="text-sm font-black text-emerald-400">{p.damage}</p>
                                  </div>
                                </div>
                              </div>
                            ))
                          ) : (
                            (tourney.tempResultSquads || tourney.finalResultSquads || []).map((sqd: any, idx: number) => (
                              <div key={idx} className="bg-slate-950 border border-white/[0.05] p-3.5 rounded-xl space-y-3">
                                <div className="flex items-center justify-between gap-4">
                                  <div className="flex items-center gap-3 min-w-0">
                                    <img src={sqd.logo} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0" />
                                    <div className="min-w-0">
                                      <p className="text-xs font-bold text-white truncate">{sqd.name}</p>
                                      <p className="text-[10px] text-slate-400 truncate">Leader: {sqd.leaderName}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4 shrink-0 font-mono bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800">
                                    <div className="text-center">
                                      <p className="text-[8px] text-slate-400 uppercase">Total Kills</p>
                                      <p className="text-xs font-black text-cyan-400">{sqd.kills}</p>
                                    </div>
                                    <div className="w-px h-5 bg-slate-800" />
                                    <div className="text-center">
                                      <p className="text-[8px] text-slate-400 uppercase">Total Damage</p>
                                      <p className="text-xs font-black text-emerald-400">{sqd.damage}</p>
                                    </div>
                                  </div>
                                </div>

                                {/* Squad Members List */}
                                {sqd.members && sqd.members.length > 0 && (
                                  <div className="pt-2 border-t border-white/[0.04] space-y-2">
                                    <p className="text-[9px] font-mono text-cyan-400 uppercase font-bold">Squad Members ({sqd.members.length})</p>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                      {sqd.members.map((m: any, mIdx: number) => (
                                        <div key={mIdx} className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                                          <div className="flex items-center gap-2 min-w-0">
                                            <img 
                                              src={m.avatar || m.avatarUrl || m.photoURL || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150'} 
                                              alt="" 
                                              className="w-7 h-7 rounded-full object-cover border border-cyan-500/30 shrink-0"
                                            />
                                            <span className="text-[11px] font-bold text-white truncate">
                                              {m.gameName || m.ingameName || m.name || `Player #${mIdx + 1}`}
                                            </span>
                                          </div>
                                          <div className="flex items-center gap-2 text-[10px] font-mono shrink-0">
                                            <span className="text-cyan-400 font-bold">K: {m.kills || 0}</span>
                                            <span className="text-emerald-400 font-bold">D: {m.damage || 0}</span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      {activeTab === 'pending' && (
                        <div className="flex items-center gap-3 pt-6 mt-6 border-t border-white/5">
                          <button
                            onClick={() => setRejectMatchModal({ type: 'tournament', data: tourney })}
                            className="flex-1 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all border border-red-500/20 flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject Result
                          </button>
                          <button
                            onClick={() => setConfirmApproveMatch({ type: 'tournament', data: tourney })}
                            className="flex-1 py-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all border border-emerald-500/20 flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve Result
                          </button>
                        </div>
                      )}

                      {/* Approval/Rejection Badge for History */}
                      {activeTab !== 'pending' && (
                        <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {activeTab === 'approved' ? (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Approved
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 text-[10px] font-black uppercase tracking-widest">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                Rejected
                              </div>
                            )}
                            <div className="text-left">
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Reviewed By</p>
                              <p className="text-[10px] font-black text-slate-300">{tourney.resultApprovedBy || tourney.rejectedBy || 'Admin'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRevertMatchModal({ type: 'tournament', data: tourney });
                              }}
                              disabled={!!processingId}
                              className="w-full sm:w-auto px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-amber-500/30 cursor-pointer flex items-center gap-2 justify-center shadow-lg shadow-amber-500/10"
                              title="Click to rollback prizes/stats and send back to Pending Review"
                            >
                              {processingId === tourney.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span>Revert to Pending</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                } else if (mainReviewCategory === 'lonewolf') {
                  const match = item;
                  return (
                    <motion.div
                      key={match.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-slate-900 border border-fuchsia-500/10 rounded-[2rem] p-5 hover:border-fuchsia-500/30 transition-all overflow-visible relative"
                    >
                      {/* Header with Lone Wolf Info */}
                      <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-white/5">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-2xl bg-fuchsia-500/10 border-2 border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400 shadow-lg shadow-fuchsia-500/10 shrink-0">
                            <Crown className="w-6 h-6" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-xs font-black text-white uppercase tracking-tight">{match.title || 'Lone Wolf Match'}</h4>
                              <span className="text-[9px] font-mono text-fuchsia-400 bg-fuchsia-950/80 px-2 py-0.5 rounded border border-fuchsia-500/30 font-bold">
                                #{match.matchNumber || match.id}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 mt-1 flex-wrap">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{match.matchFormat || '1v1'}</span>
                              <span className="text-[10px] text-slate-600">•</span>
                              <span className="text-[9px] font-mono text-amber-400 uppercase font-bold">Prize Pool: {match.prizePool} 🪙</span>
                            </div>
                          </div>
                        </div>

                        {/* Right: Submitted At */}
                        <div className="flex items-center gap-3">
                          <div className="text-right hidden sm:block">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-1">Submitted At</p>
                            <p className="text-[10px] font-bold text-white font-mono">{formatSubmittedDateTime(match.resultSubmittedAt || match.prizeDistributedAt || match.rejectedAt)}</p>
                          </div>
                        </div>
                      </div>

                      {/* Screenshot / YouTube Proofs */}
                      {match.resultScreenshotUrl && (
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                              <ImageIcon className="w-3.5 h-3.5 text-cyan-500" />
                              Match Result Proof
                            </h5>
                            <button 
                              onClick={() => setViewingScreenshot(match.resultScreenshotUrl)}
                              className="text-[9px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors uppercase tracking-widest flex items-center gap-1.5"
                            >
                              <Search className="w-3 h-3" />
                              View Full Size
                            </button>
                          </div>
                          <div 
                            onClick={() => setViewingScreenshot(match.resultScreenshotUrl)}
                            className="relative aspect-video rounded-2xl overflow-hidden border border-white/10 group cursor-pointer"
                          >
                            <img src={match.resultScreenshotUrl} alt="Result Proof" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <Eye className="w-8 h-8 text-white" />
                            </div>
                          </div>
                        </div>
                      )}

                      {match.youtubeLink && (
                        <div className="mb-6 flex flex-col gap-2">
                          <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                            <Youtube className="w-3.5 h-3.5 text-red-500" />
                            YouTube Live Stream
                          </h5>
                          <a href={match.youtubeLink} target="_blank" rel="noopener noreferrer" className="text-xs text-cyan-400 font-mono hover:underline break-all">
                            {match.youtubeLink}
                          </a>
                        </div>
                      )}

                      {/* Summary Data */}
                      <div className="grid grid-cols-2 gap-3 mb-6">
                        <div className={`border rounded-2xl p-3 text-center transition-colors ${match.winnerSlot === 1 ? 'bg-cyan-950/50 border-cyan-500/50' : 'bg-slate-950/50 border-white/5'}`}>
                          <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-1">Slot 1 (Alpha)</p>
                          <p className="text-xs font-bold text-white font-mono truncate">
                            {match.player1?.gameName || match.player1?.displayName || 'TBD 1'}
                          </p>
                          <p className="text-lg font-black text-white font-mono mt-1">{match.player1Score || 0}</p>
                          {match.winnerSlot === 1 && <div className="mt-2 text-[9px] font-black text-emerald-400 uppercase">Winner</div>}
                        </div>
                        <div className={`border rounded-2xl p-3 text-center transition-colors ${match.winnerSlot === 2 ? 'bg-fuchsia-950/50 border-fuchsia-500/50' : 'bg-slate-950/50 border-white/5'}`}>
                          <p className="text-[9px] font-black text-fuchsia-400 uppercase tracking-widest mb-1">Slot 2 (Omega)</p>
                          <p className="text-xs font-bold text-white font-mono truncate">
                            {match.player2?.gameName || match.player2?.displayName || 'TBD 2'}
                          </p>
                          <p className="text-lg font-black text-white font-mono mt-1">{match.player2Score || 0}</p>
                          {match.winnerSlot === 2 && <div className="mt-2 text-[9px] font-black text-emerald-400 uppercase">Winner</div>}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      {activeTab === 'pending' && (
                        <div className="flex items-center gap-3 pt-6 mt-6 border-t border-white/5">
                          <button
                            onClick={() => setRejectMatchModal({ type: 'lonewolf', data: match })}
                            className="flex-1 py-3.5 bg-red-500/10 hover:bg-red-500/20 text-red-500 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all border border-red-500/20 flex items-center justify-center gap-2"
                          >
                            <XCircle className="w-4 h-4" />
                            Reject Result
                          </button>
                          <button
                            onClick={() => setConfirmApproveMatch({ type: 'lonewolf', data: match })}
                            className="flex-1 py-3.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-500 font-black rounded-2xl text-[10px] uppercase tracking-widest transition-all border border-emerald-500/20 flex items-center justify-center gap-2"
                          >
                            <CheckCircle className="w-4 h-4" />
                            Approve Result
                          </button>
                        </div>
                      )}

                      {/* Approval/Rejection Badge for History */}
                      {activeTab !== 'pending' && (
                        <div className="mt-6 pt-4 border-t border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            {activeTab === 'approved' ? (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-500 text-[10px] font-black uppercase tracking-widest">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                Approved
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 px-3 py-1.5 bg-red-500/10 border border-red-500/20 rounded-full text-red-500 text-[10px] font-black uppercase tracking-widest">
                                <ShieldAlert className="w-3.5 h-3.5" />
                                Rejected
                              </div>
                            )}
                            <div className="text-left">
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Reviewed By</p>
                              <p className="text-[10px] font-black text-slate-300">{match.resultApprovedBy || match.rejectedBy || 'Admin'}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {activeTab === 'approved' && (
                              match.walletStatus === 'unlocked' ? (
                                <div className="flex items-center gap-1.5 px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-[10px] font-black uppercase tracking-widest font-mono">
                                  <Unlock className="w-3.5 h-3.5" />
                                  <span>Wallet Unlocked</span>
                                </div>
                              ) : match.walletStatus === 'claimed' ? (
                                <div className="flex items-center gap-1.5 px-3 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl text-cyan-400 text-[10px] font-black uppercase tracking-widest font-mono">
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Claimed</span>
                                </div>
                              ) : (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setUnlockLoneWolfWalletModal({
                                      isOpen: true,
                                      match: match,
                                      customPercentage: loneWolfProfitPercentage,
                                      isUnlocking: false
                                    });
                                  }}
                                  className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-emerald-500/30 cursor-pointer flex items-center gap-2 justify-center shadow-lg shadow-emerald-500/10"
                                >
                                  <Unlock className="w-3.5 h-3.5 shrink-0" />
                                  <span>Unlock Wallet</span>
                                </button>
                              )
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRevertMatchModal({ type: 'lonewolf', data: match });
                              }}
                              disabled={!!processingId}
                              className="w-full sm:w-auto px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-amber-500/30 cursor-pointer flex items-center gap-2 justify-center shadow-lg shadow-amber-500/10"
                              title="Click to rollback prizes/stats and send back to Pending Review"
                            >
                              {processingId === match.id ? (
                                <div className="w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 shrink-0" />
                              )}
                              <span>Revert to Pending</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </motion.div>
                  );
                }

                // League Match Card Rendering
                const match = item;
                const league = leaguesData[match.leagueId];
                const hostProfile = hostsProfiles[match.leagueId];

                const leagueName = league?.leagueName || league?.brandName || league?.title || (match.leagueId ? `League #${match.leagueId}` : 'Pro League');
                const hostName = hostProfile?.displayName || hostProfile?.gameName || league?.hostName || league?.hostEmail || 'Unknown Host';
                const hostPhoto = hostProfile?.photoURL || hostProfile?.avatarUrl || hostProfile?.profilePicture || hostProfile?.avatar || hostProfile?.photo || league?.hostPhotoUrl;

                const leagueSquads = squadsData[match.leagueId] || {};
                const squad1 = leagueSquads[match.t1] || Object.values(leagueSquads).find((s: any) => s?.teamName === match.t1 || s?.tbdId === match.t1);
                const squad2 = leagueSquads[match.t2] || Object.values(leagueSquads).find((s: any) => s?.teamName === match.t2 || s?.tbdId === match.t2);

                const squad1Name = squad1?.teamName || match.t1 || 'Team A';
                const squad2Name = squad2?.teamName || match.t2 || 'Team B';

                const squad1Cover = squad1?.coverUrl || squad1?.banner || squad1?.logoUrl || squad1?.logo;
                const squad2Cover = squad2?.coverUrl || squad2?.banner || squad2?.logoUrl || squad2?.logo;

                return (
                  <motion.div
                    key={match.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-slate-900 border border-white/5 rounded-[2rem] p-5 hover:border-cyan-500/30 transition-all overflow-hidden"
                  >
                    {/* Header with Host Info, League Name & Winner */}
                    <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-4 border-b border-white/5">
                      {/* Host Avatar & League Details */}
                      <div className="flex items-center gap-3">
                        <div 
                          onClick={() => handleOpenHostModal(match, league, hostProfile)}
                          title="Click to contact host"
                          className="relative shrink-0 cursor-pointer group"
                        >
                          {hostPhoto ? (
                            <img 
                              src={hostPhoto} 
                              alt={hostName}
                              loading="lazy"
                              decoding="async"
                              className="w-11 h-11 rounded-2xl object-cover border-2 border-cyan-500/30 group-hover:border-cyan-400 group-hover:scale-105 transition-all shadow-lg shadow-cyan-500/10"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const fallback = document.createElement('div');
                                  fallback.className = "w-11 h-11 rounded-2xl bg-slate-800 flex items-center justify-center text-cyan-400 border border-cyan-500/30";
                                  fallback.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
                                  parent.appendChild(fallback);
                                }
                              }}
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-2xl bg-slate-800/80 border-2 border-cyan-500/30 group-hover:border-cyan-400 group-hover:scale-105 transition-all flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-500/10">
                              <User className="w-5 h-5" />
                            </div>
                          )}
                          <div className="absolute -bottom-1 -right-1 px-1 py-0.2 bg-cyan-500 rounded text-[7px] font-black text-black uppercase tracking-tighter">
                            HOST
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-xs font-black text-white uppercase tracking-tight mr-1">
                              {leagueName}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                              Match #{getMatchNumberDisplay(match, league)}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                              Round #{getRoundNumberDisplay(match)}
                            </span>
                            <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                              {getRoundNameDisplay(match)}
                            </span>
                          </div>
                          
                          {/* Clickable Host Name & In-App Chat button */}
                          <div className="mt-1 flex items-center gap-2">
                            <div 
                              onClick={() => handleOpenHostModal(match, league, hostProfile)}
                              className="flex items-center gap-1.5 cursor-pointer group/host"
                              title="Click to view contact details"
                            >
                              <span className="text-[10px] font-bold text-slate-400">Host:</span>
                              <span className="text-xs font-black text-cyan-400 group-hover/host:text-cyan-300 group-hover/host:underline uppercase tracking-tight flex items-center gap-1">
                                {hostName}
                                <Phone className="w-3 h-3 text-cyan-500 opacity-80 group-hover/host:opacity-100" />
                              </span>
                            </div>
                            <button
                              onClick={() => setActiveChatMatch({ match, league, hostProfile })}
                              className="px-2 py-0.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black text-cyan-400 rounded-lg border border-cyan-500/30 text-[9px] font-black uppercase transition-all cursor-pointer flex items-center gap-1 shadow-sm"
                              title="Send direct message to host"
                            >
                              <MessageSquare className="w-3 h-3" />
                              <span>Chat</span>
                            </button>
                          </div>

                          {/* Submission Date & Time Display */}
                          <div className="mt-1.5 flex items-center gap-1.5 text-[9.5px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-lg w-fit">
                            <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
                            <span className="font-bold text-slate-400 uppercase text-[8.5px]">Submitted:</span>
                            <span className="font-mono font-bold text-white">
                              {formatSubmittedDateTime(match.submittedAt || match.updatedAt)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Winner</p>
                        <div className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                          <p className="text-xs font-black text-emerald-400 uppercase">{match.winner || 'TBD'}</p>
                        </div>
                      </div>
                    </div>

                  {/* Two Squads Showcase with Cover Photo & Name */}
                  <div className="bg-black/50 rounded-2xl p-4 border border-white/5 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                      {/* Squad 1 */}
                      <div className={`relative flex items-center gap-3 p-3 rounded-xl border ${match.winner === squad1Name || match.scoreA > match.scoreB ? 'bg-cyan-950/20 border-cyan-500/40' : 'bg-slate-950/70 border-white/5'}`}>
                        <div className="w-16 h-12 rounded-lg overflow-hidden border border-cyan-500/20 shrink-0 bg-slate-900 flex items-center justify-center relative">
                          {squad1Cover ? (
                            <img 
                              src={squad1Cover} 
                              alt={squad1Name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const fallback = document.createElement('div');
                                  fallback.className = "w-full h-full bg-gradient-to-br from-cyan-950 to-slate-900 flex items-center justify-center text-cyan-400 font-black text-xs uppercase";
                                  fallback.innerText = squad1Name.slice(0, 3);
                                  parent.appendChild(fallback);
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-cyan-950 to-slate-900 flex items-center justify-center text-cyan-400 font-black text-xs uppercase">
                              {squad1Name.slice(0, 3)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black text-cyan-500/80 uppercase tracking-widest">Squad 1</p>
                          <h5 className="text-xs sm:text-sm font-black text-white uppercase truncate">{squad1Name}</h5>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-2xl font-black text-cyan-400 font-mono">{match.scoreA ?? 0}</span>
                        </div>
                      </div>

                      {/* Squad 2 */}
                      <div className={`relative flex items-center gap-3 p-3 rounded-xl border ${match.winner === squad2Name || match.scoreB > match.scoreA ? 'bg-cyan-950/20 border-cyan-500/40' : 'bg-slate-950/70 border-white/5'}`}>
                        <div className="w-16 h-12 rounded-lg overflow-hidden border border-cyan-500/20 shrink-0 bg-slate-900 flex items-center justify-center relative">
                          {squad2Cover ? (
                            <img 
                              src={squad2Cover} 
                              alt={squad2Name}
                              loading="lazy"
                              decoding="async"
                              className="w-full h-full object-cover"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.style.display = 'none';
                                const parent = target.parentElement;
                                if (parent) {
                                  const fallback = document.createElement('div');
                                  fallback.className = "w-full h-full bg-gradient-to-br from-blue-950 to-slate-900 flex items-center justify-center text-blue-400 font-black text-xs uppercase";
                                  fallback.innerText = squad2Name.slice(0, 3);
                                  parent.appendChild(fallback);
                                }
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-blue-950 to-slate-900 flex items-center justify-center text-blue-400 font-black text-xs uppercase">
                              {squad2Name.slice(0, 3)}
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] font-black text-cyan-500/80 uppercase tracking-widest">Squad 2</p>
                          <h5 className="text-xs sm:text-sm font-black text-white uppercase truncate">{squad2Name}</h5>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-2xl font-black text-cyan-400 font-mono">{match.scoreB ?? 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/5">
                    <div className="flex flex-wrap items-center gap-2">
                      <button 
                        onClick={() => setExpandedMatchId(expandedMatchId === match.id ? null : match.id)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-xl text-[9px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest border border-white/5 cursor-pointer"
                      >
                        {expandedMatchId === match.id ? <ChevronUp className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                        {expandedMatchId === match.id ? 'Hide Stats' : 'View Stats'}
                      </button>
                      <button
                        onClick={() => setActiveChatMatch({ match, league, hostProfile })}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black text-cyan-400 border border-cyan-500/30 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all cursor-pointer shadow-sm shadow-cyan-500/10"
                        title="Chat with Host about this match result"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>Message Host</span>
                      </button>
                      {match.youtubeLiveLink && (
                        <a 
                          href={match.youtubeLiveLink} 
                          target="_blank" 
                          rel="noreferrer"
                          className="p-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"
                        >
                          <Youtube className="w-3.5 h-3.5" />
                        </a>
                      )}
                      {match.screenshotUrl && (
                        <button
                          onClick={() => setViewingScreenshot(match.screenshotUrl)}
                          className="p-2 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-500 hover:text-white rounded-xl transition-all border border-cyan-500/20"
                          title="View Result Screenshot"
                        >
                          <ImageIcon className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    {activeTab === 'pending' && (
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={() => {
                            setRejectMatchModal(match);
                            setRejectionReasonInput('');
                          }}
                          disabled={!!processingId}
                          className="flex-1 sm:flex-none px-4 py-2 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all border border-red-500/20 cursor-pointer"
                        >
                          Reject
                        </button>
                        <button
                          onClick={() => setConfirmApproveMatch(match)}
                          disabled={!!processingId}
                          className="flex-1 sm:flex-none px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-[9px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20 flex items-center gap-2 cursor-pointer justify-center"
                        >
                          {processingId === match.id ? (
                            <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          ) : (
                            <Check className="w-3 h-3" />
                          )}
                          Approve
                        </button>
                      </div>
                    )}

                    {activeTab === 'approved' && (
                      <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRevertMatchModal(match);
                          }}
                          disabled={!!processingId}
                          className="w-full sm:w-auto px-4 py-2.5 bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 text-[10px] font-black uppercase tracking-wider rounded-xl transition-all border border-amber-500/30 cursor-pointer flex items-center gap-2 justify-center shadow-lg shadow-amber-500/10"
                          title="Click to rollback stats and send back to Pending Review"
                        >
                          {processingId === match.id ? (
                            <div className="w-3.5 h-3.5 border-2 border-amber-400/30 border-t-amber-400 rounded-full animate-spin" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 shrink-0" />
                          )}
                          <span>Revert to Pending</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Expanded Stats */}
                  <AnimatePresence>
                    {expandedMatchId === match.id && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-6 pt-6 border-t border-white/5 space-y-6">
                          <div className="flex items-center justify-between px-1">
                            <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.2em]">Player Statistics</p>
                            <div className="flex gap-4">
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                                <span className="text-[8px] font-black text-slate-600 uppercase">Kills</span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                                <span className="text-[8px] font-black text-slate-600 uppercase">Damage</span>
                              </div>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-4">
                            {[
                              { key: 's1', squad: squad1, name: squad1Name, cover: squad1Cover, label: 'Squad 1', color: 'cyan', tbdId: match.t1 },
                              { key: 's2', squad: squad2, name: squad2Name, cover: squad2Cover, label: 'Squad 2', color: 'blue', tbdId: match.t2 }
                            ].map((sqItem, idx) => {
                              const squadObj = sqItem.squad;
                              const squadPlayers = squadObj?.players && Array.isArray(squadObj.players) && squadObj.players.length > 0 
                                ? squadObj.players 
                                : Object.keys(match.playerStats || {}).map(email => ({ email, gameName: email.split('@')[0] }));

                              return (
                                <div key={sqItem.key} className="space-y-3 bg-slate-950/60 p-4 rounded-2xl border border-white/5">
                                  {/* Squad Header with Cover Photo */}
                                  <div className="flex items-center gap-3 p-2 bg-white/[0.02] rounded-xl border border-white/5">
                                    <div className="w-12 h-10 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-slate-900 flex items-center justify-center relative">
                                      {sqItem.cover ? (
                                        <img 
                                          src={sqItem.cover} 
                                          alt={sqItem.name}
                                          loading="lazy"
                                          decoding="async"
                                          className="w-full h-full object-cover"
                                          referrerPolicy="no-referrer"
                                          onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.onerror = null;
                                            target.style.display = 'none';
                                          }}
                                        />
                                      ) : (
                                        <div className={`w-full h-full bg-gradient-to-br ${idx === 0 ? 'from-cyan-950 to-slate-900 text-cyan-400' : 'from-blue-950 to-slate-900 text-blue-400'} flex items-center justify-center font-black text-xs uppercase`}>
                                          {sqItem.name.slice(0, 3)}
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{sqItem.label}</p>
                                      <h5 className="text-xs font-black text-white uppercase truncate">{sqItem.name}</h5>
                                    </div>
                                    <div className="px-2.5 py-1 bg-white/5 rounded-lg border border-white/5">
                                      <span className="text-xs font-black text-white font-mono">
                                        {idx === 0 ? (match.scoreA ?? 0) : (match.scoreB ?? 0)}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Player List */}
                                  <div className="grid gap-2">
                                    {squadPlayers.length === 0 ? (
                                      <p className="text-center text-[10px] text-slate-500 py-2">No players listed</p>
                                    ) : (
                                      squadPlayers.map((player: any, pIdx: number) => {
                                        const pEmail = player.email || player.userId || `player_${pIdx}`;
                                        const stats = match.playerStats?.[pEmail] || match.playerStats?.[player.userId] || { kills: 0, damage: 0 };
                                        const profile = playersProfiles[pEmail] || playersProfiles[player.userId] || {};
                                        
                                        const profilePic = profile.photoURL || profile.avatarUrl || profile.profilePicture || profile.avatar || profile.photo || player.photoURL || player.avatarUrl;
                                        const displayName = profile.gameName || player.gameName || profile.displayName || player.name || (pEmail.includes('@') ? pEmail.split('@')[0] : pEmail);

                                        return (
                                          <div 
                                            key={pEmail + '_' + pIdx} 
                                            className="flex items-center justify-between p-2.5 bg-slate-900/80 border border-white/5 rounded-xl hover:border-cyan-500/30 transition-all group"
                                          >
                                            <div className="flex items-center gap-3 overflow-hidden">
                                              <div className="relative shrink-0">
                                                {profilePic ? (
                                                  <img 
                                                    src={profilePic} 
                                                    loading="lazy"
                                                    decoding="async"
                                                    className="w-9 h-9 rounded-xl object-cover border border-white/10"
                                                    alt={displayName}
                                                    referrerPolicy="no-referrer"
                                                    onError={(e) => {
                                                      const target = e.target as HTMLImageElement;
                                                      target.onerror = null;
                                                      target.style.display = 'none';
                                                      const parent = target.parentElement;
                                                      if (parent) {
                                                        const fallback = document.createElement('div');
                                                        fallback.className = "w-9 h-9 rounded-xl bg-slate-800 flex items-center justify-center text-slate-400 font-black text-xs border border-white/10";
                                                        fallback.innerText = displayName.charAt(0).toUpperCase();
                                                        parent.appendChild(fallback);
                                                      }
                                                    }}
                                                  />
                                                ) : (
                                                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-800 to-slate-900 flex items-center justify-center text-cyan-400 font-black text-xs border border-white/10">
                                                    {displayName.charAt(0).toUpperCase()}
                                                  </div>
                                                )}
                                                <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-900 ${idx === 0 ? 'bg-cyan-500' : 'bg-blue-500'}`} />
                                              </div>
                                              <div className="overflow-hidden min-w-0">
                                                <button
                                                  onClick={() => {
                                                    const playerPath = `/profile/${profile.userId || player.userId || profile.uid || 'unknown'}`;
                                                    window.location.hash = playerPath;
                                                  }}
                                                  className="text-xs font-bold text-white truncate hover:text-cyan-400 transition-colors block text-left"
                                                >
                                                  {displayName}
                                                </button>
                                                <span className="hidden opacity-0 text-[1px] absolute -z-10 select-none pointer-events-none" data-player-email={pEmail}>{pEmail}</span>
                                              </div>
                                            </div>
                                            
                                            <div className="flex items-center gap-3 text-xs font-black font-mono shrink-0 pl-2">
                                              <div className="text-right bg-white/5 px-2 py-1 rounded-lg border border-white/5">
                                                <span className="text-[8px] font-black text-slate-400 uppercase mr-1">K:</span>
                                                <span className="text-emerald-400">{stats.kills || 0}</span>
                                              </div>
                                              <div className="text-right bg-cyan-500/10 px-2 py-1 rounded-lg border border-cyan-500/20">
                                                <span className="text-[8px] font-black text-cyan-400/80 uppercase mr-1">D:</span>
                                                <span className="text-cyan-300">{stats.damage || 0}</span>
                                              </div>
                                            </div>
                                          </div>
                                        );
                                      })
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
            </div>
            
            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-4 mt-8 bg-slate-900/50 p-3 rounded-2xl border border-white/5">
                <button
                  onClick={() => activeTab === 'pending' ? setCurrentPagePending(Math.max(1, currentPage - 1)) : setCurrentPageApproved(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Previous
                </button>
                <span className="text-[10px] font-black text-white uppercase tracking-widest bg-slate-950 px-4 py-2 rounded-xl border border-white/5">
                  Page <span className="text-cyan-400">{currentPage}</span> of {totalPages}
                </span>
                <button
                  onClick={() => activeTab === 'pending' ? setCurrentPagePending(Math.min(totalPages, currentPage + 1)) : setCurrentPageApproved(Math.min(totalPages, currentPage + 1))}
                  disabled={currentPage === totalPages}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                >
                  Next
                </button>
              </div>
            )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Screenshot Preview Modal */}
      {viewingScreenshot && (
        <div 
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-md cursor-zoom-out"
          onClick={() => setViewingScreenshot(null)}
        >
          <div className="relative max-w-4xl w-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setViewingScreenshot(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors cursor-pointer bg-white/5 hover:bg-white/10 rounded-full"
            >
              <XCircle className="w-6 h-6" />
            </button>
            <img 
              src={viewingScreenshot} 
              referrerPolicy="no-referrer"
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.3)] border border-cyan-500/30" 
              alt="Match Result Screenshot"
            />
            <span className="text-[10px] text-slate-400 font-mono tracking-widest mt-4 uppercase bg-slate-900/80 px-3 py-1 rounded-full border border-white/5">
              Click anywhere to close
            </span>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Approve */}
      {confirmApproveMatch && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400">
                <CheckCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">Approve Result?</h3>
                <p className="text-xs text-slate-400">
                  {confirmApproveMatch.type === 'tournament' 
                    ? 'Confirm tournament results and update participant statistics' 
                    : 'Confirm match scores and update player career stats'}
                </p>
              </div>
            </div>

            <div className="bg-black/50 rounded-xl p-3 border border-white/5 space-y-1.5 text-xs text-slate-300">
              {confirmApproveMatch.type === 'tournament' ? (
                <>
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-400">Tournament:</span>
                    <span className="text-amber-400 font-mono text-sm">{confirmApproveMatch.data.title}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-400">Mode:</span>
                    <span className="text-cyan-400 font-mono text-sm uppercase">{confirmApproveMatch.data.mode}</span>
                  </div>
                  <div className="flex justify-between font-black pt-1 border-t border-white/5 text-emerald-400 uppercase">
                    <span>Booyah Winner:</span>
                    <span>
                      {confirmApproveMatch.data.mode === 'solo' 
                        ? ((confirmApproveMatch.data.tempResultData || confirmApproveMatch.data.finalResultData || []).find((p: any) => p.userId === confirmApproveMatch.data.booyahWinner)?.gameName || confirmApproveMatch.data.booyahWinner || 'N/A')
                        : (confirmApproveMatch.data.booyahWinner || 'N/A')}
                    </span>
                  </div>
                </>
              ) : confirmApproveMatch.type === 'lonewolf' ? (
                <>
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-400">Lone Wolf:</span>
                    <span className="text-fuchsia-400 font-mono text-sm">{confirmApproveMatch.data.title}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-400">Slot 1 ({confirmApproveMatch.data.player1?.gameName || 'TBD'}):</span>
                    <span className="text-cyan-400 font-mono text-sm">{confirmApproveMatch.data.player1Score ?? 0}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-400">Slot 2 ({confirmApproveMatch.data.player2?.gameName || 'TBD'}):</span>
                    <span className="text-cyan-400 font-mono text-sm">{confirmApproveMatch.data.player2Score ?? 0}</span>
                  </div>
                  {confirmApproveMatch.data.winnerName && (
                    <div className="flex justify-between font-black pt-1 border-t border-white/5 text-emerald-400 uppercase">
                      <span>Winner:</span>
                      <span>{confirmApproveMatch.data.winnerName}</span>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-400">Squad 1 ({confirmApproveMatch.t1 || 'Team A'}):</span>
                    <span className="text-cyan-400 font-mono text-sm">{confirmApproveMatch.scoreA ?? 0}</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span className="text-slate-400">Squad 2 ({confirmApproveMatch.t2 || 'Team B'}):</span>
                    <span className="text-cyan-400 font-mono text-sm">{confirmApproveMatch.scoreB ?? 0}</span>
                  </div>
                  {confirmApproveMatch.winner && (
                    <div className="flex justify-between font-black pt-1 border-t border-white/5 text-emerald-400 uppercase">
                      <span>Winner:</span>
                      <span>{confirmApproveMatch.winner}</span>
                    </div>
                  )}
                </>
              )}
            </div>

            <p className="text-[10px] text-amber-400/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
              ⚠️ Approving will apply kills, damage, and win/loss statistics to all player profiles.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setConfirmApproveMatch(null)}
                disabled={!!processingId}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (confirmApproveMatch.type === 'tournament') executeApproveTournament(confirmApproveMatch.data);
                  else if (confirmApproveMatch.type === 'lonewolf') executeApproveLoneWolf(confirmApproveMatch.data);
                  else executeApprove(confirmApproveMatch);
                }}
                disabled={!!processingId}
                className="px-5 py-2 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-emerald-500/30 flex items-center gap-2 cursor-pointer"
              >
                {processingId === (confirmApproveMatch.id || confirmApproveMatch.data?.id) ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4" />
                )}
                Confirm Approve
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectMatchModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-red-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">Reject Result</h3>
                <p className="text-xs text-slate-400">Send match back to host for corrections</p>
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rejection Reason (Optional)</label>
              <textarea
                value={rejectionReasonInput}
                onChange={(e) => setRejectionReasonInput(e.target.value)}
                placeholder="Specify why this result is rejected..."
                className="w-full h-24 bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-red-500 transition-colors resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => {
                  setRejectMatchModal(null);
                  setRejectionReasonInput('');
                }}
                disabled={!!processingId}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (rejectMatchModal.type === 'tournament') executeRejectTournament(rejectMatchModal.data);
                  else if (rejectMatchModal.type === 'lonewolf') executeRejectLoneWolf(rejectMatchModal.data);
                  else executeReject(rejectMatchModal, rejectionReasonInput);
                }}
                disabled={!!processingId}
                className="px-5 py-2 bg-red-500 hover:bg-red-400 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-red-500/30 flex items-center gap-2 cursor-pointer"
              >
                {processingId === (rejectMatchModal.id || rejectMatchModal.data?.id) ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <XCircle className="w-4 h-4" />
                )}
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Revert to Pending Modal */}
      {revertMatchModal && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-900 border border-amber-500/30 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 relative">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400">
                <Clock className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-white uppercase tracking-wider">Revert to Pending?</h3>
                <p className="text-xs text-slate-400">
                  {revertMatchModal.type === 'tournament'
                    ? 'Roll back prizes, player career stats & send result back to Pending Review'
                    : revertMatchModal.type === 'lonewolf'
                    ? 'Roll back winner prize & send result back to Pending Review'
                    : 'Roll back player stats & send result back to Pending Review'}
                </p>
              </div>
            </div>

            {revertMatchModal.type === 'tournament' ? (
              <div className="bg-black/50 rounded-xl p-3 border border-white/5 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-400">Tournament:</span>
                  <span className="text-amber-400 font-mono text-sm">{revertMatchModal.data?.title} (#{revertMatchModal.data?.tournamentNumber || revertMatchModal.data?.id})</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-400">Mode:</span>
                  <span className="text-cyan-400 font-mono text-sm uppercase">{revertMatchModal.data?.mode}</span>
                </div>
                {revertMatchModal.data?.booyahWinner && (
                  <div className="flex justify-between font-black pt-1 border-t border-white/5 text-amber-400 uppercase">
                    <span>Winner:</span>
                    <span>
                      {revertMatchModal.data?.mode === 'solo'
                        ? ((revertMatchModal.data?.tempResultData || revertMatchModal.data?.finalResultData || []).find((p: any) => p.userId === revertMatchModal.data?.booyahWinner)?.gameName || revertMatchModal.data?.booyahWinner)
                        : revertMatchModal.data?.booyahWinner}
                    </span>
                  </div>
                )}
                {revertMatchModal.data?.prizesDistributed > 0 && (
                  <div className="flex justify-between font-bold text-emerald-400">
                    <span>Prize to Rollback:</span>
                    <span>🪙 {revertMatchModal.data?.prizesDistributed} Tk</span>
                  </div>
                )}
              </div>
            ) : revertMatchModal.type === 'lonewolf' ? (
              <div className="bg-black/50 rounded-xl p-3 border border-white/5 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-400">Lone Wolf:</span>
                  <span className="text-fuchsia-400 font-mono text-sm">{revertMatchModal.data?.title}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-400">Slot 1 ({revertMatchModal.data?.player1?.gameName || 'TBD'}):</span>
                  <span className="text-cyan-400 font-mono text-sm">{revertMatchModal.data?.player1Score ?? 0}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-400">Slot 2 ({revertMatchModal.data?.player2?.gameName || 'TBD'}):</span>
                  <span className="text-cyan-400 font-mono text-sm">{revertMatchModal.data?.player2Score ?? 0}</span>
                </div>
                {revertMatchModal.data?.winnerName && (
                  <div className="flex justify-between font-black pt-1 border-t border-white/5 text-emerald-400 uppercase">
                    <span>Winner:</span>
                    <span>{revertMatchModal.data?.winnerName}</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-emerald-400 pt-1 border-t border-white/5">
                  <span>Prize to Rollback:</span>
                  <span>🪙 {revertMatchModal.data?.prizePool} Tk</span>
                </div>
              </div>
            ) : (
              <div className="bg-black/50 rounded-xl p-3 border border-white/5 space-y-1.5 text-xs text-slate-300">
                <div className="flex justify-between font-bold">
                  <span className="text-slate-400">Squad 1 ({revertMatchModal.t1 || 'Team A'}):</span>
                  <span className="text-cyan-400 font-mono text-sm">{revertMatchModal.scoreA ?? 0}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span className="text-slate-400">Squad 2 ({revertMatchModal.t2 || 'Team B'}):</span>
                  <span className="text-cyan-400 font-mono text-sm">{revertMatchModal.scoreB ?? 0}</span>
                </div>
                {revertMatchModal.winner && (
                  <div className="flex justify-between font-black pt-1 border-t border-white/5 text-amber-400 uppercase">
                    <span>Winner:</span>
                    <span>{revertMatchModal.winner}</span>
                  </div>
                )}
              </div>
            )}

            <p className="text-[10px] text-amber-400/90 bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20">
              {revertMatchModal.type === 'tournament'
                ? '⚠️ Reverting will rollback distributed prize tokens, profit wallet deductions, and career stats (kills, damage, wins) and move this tournament back to Pending Review.'
                : revertMatchModal.type === 'lonewolf'
                ? '⚠️ Reverting will rollback the winner\'s prize pool distribution and move this match back to Pending Review.'
                : '⚠️ Reverting will rollback player career stats (kills, damage, wins) and move this match back to Pending Review.'}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRevertMatchModal(null)}
                disabled={!!processingId}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (revertMatchModal.type === 'tournament') executeRevertTournament(revertMatchModal.data);
                  else if (revertMatchModal.type === 'lonewolf') executeRevertLoneWolf(revertMatchModal.data);
                  else executeRevertToPending(revertMatchModal);
                }}
                disabled={!!processingId}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-amber-500/30 flex items-center gap-2 cursor-pointer font-bold"
              >
                {processingId === (revertMatchModal.id || revertMatchModal.data?.id) ? (
                  <div className="w-4 h-4 border-2 border-slate-950/30 border-t-slate-950 rounded-full animate-spin" />
                ) : (
                  <Clock className="w-4 h-4" />
                )}
                Confirm Revert
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Host Contact Modal */}
      {selectedHostModal && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0a0c16] border border-cyan-500/30 rounded-3xl p-6 max-w-sm w-full shadow-2xl relative overflow-hidden space-y-5">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400" />
            
            <button 
              onClick={() => setSelectedHostModal(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-white rounded-full hover:bg-white/5 transition-all cursor-pointer"
            >
              <XCircle className="w-5 h-5 text-slate-400 hover:text-white" />
            </button>

            {/* Host Avatar & Info */}
            <div className="flex flex-col items-center text-center space-y-3 pt-2">
              <div className="relative">
                {selectedHostModal.photo ? (
                  <img 
                    src={selectedHostModal.photo} 
                    alt={selectedHostModal.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-cyan-500 shadow-xl shadow-cyan-500/20"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.onerror = null;
                      target.style.display = 'none';
                    }}
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-cyan-500 flex items-center justify-center text-cyan-400 shadow-xl shadow-cyan-500/20">
                    <User className="w-10 h-10" />
                  </div>
                )}
                <div className="absolute -bottom-1 right-0 px-2 py-0.5 bg-cyan-500 rounded-full text-[8px] font-black text-black uppercase tracking-wider shadow">
                  HOST
                </div>
              </div>

              <div>
                <h3 className="text-base font-black text-white uppercase tracking-tight">
                  {selectedHostModal.name}
                </h3>
                <p className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest mt-0.5">
                  {selectedHostModal.leagueName}
                </p>
              </div>
            </div>

            {/* Details Box */}
            <div className="bg-slate-900/80 border border-white/5 rounded-2xl p-4 space-y-3">
              {/* Phone */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Phone Number</p>
                    <p className="text-xs font-mono font-bold text-white truncate">
                      {selectedHostModal.phone || 'Not provided'}
                    </p>
                  </div>
                </div>
                {selectedHostModal.phone && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedHostModal.phone);
                      setToastMessage({ type: 'success', text: 'Phone number copied to clipboard!' });
                    }}
                    className="p-1.5 bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 rounded-lg transition-all"
                    title="Copy Phone Number"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Email */}
              <div className="flex items-center justify-between gap-2 border-t border-white/5 pt-2.5">
                <div className="flex items-center gap-2 min-w-0">
                  <Mail className="w-4 h-4 text-cyan-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">Email Address</p>
                    <p className="text-xs font-mono font-bold text-slate-300 truncate">
                      {selectedHostModal.email || 'Not provided'}
                    </p>
                  </div>
                </div>
                {selectedHostModal.email && (
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(selectedHostModal.email);
                      setToastMessage({ type: 'success', text: 'Email copied to clipboard!' });
                    }}
                    className="p-1.5 bg-white/5 hover:bg-cyan-500/20 text-slate-400 hover:text-cyan-400 rounded-lg transition-all"
                    title="Copy Email"
                  >
                    <Copy className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Action Buttons: Call & Message */}
            <div className="space-y-2.5 pt-1">
              {selectedHostModal.rawMatch && (
                <button
                  onClick={() => {
                    const target = {
                      match: selectedHostModal.rawMatch,
                      league: selectedHostModal.rawLeague,
                      hostProfile: selectedHostModal.rawHostProfile
                    };
                    setSelectedHostModal(null);
                    setActiveChatMatch(target);
                  }}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-cyan-500/25 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  In-App Chat with Host
                </button>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                {selectedHostModal.phone ? (
                  <>
                    <a
                      href={`tel:${selectedHostModal.phone}`}
                      className="flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-white/10"
                    >
                      <Phone className="w-4 h-4 text-cyan-400" />
                      Call Host
                    </a>
                    <a
                      href={`https://wa.me/${selectedHostModal.phone.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-2 py-3 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20"
                    >
                      <MessageSquare className="w-4 h-4" />
                      WhatsApp
                    </a>
                  </>
                ) : selectedHostModal.email ? (
                  <a
                    href={`mailto:${selectedHostModal.email}`}
                    className="col-span-2 flex items-center justify-center gap-2 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all border border-white/10"
                  >
                    <Mail className="w-4 h-4 text-cyan-400" />
                    Send Email
                  </a>
                ) : null}
              </div>

              {/* Admin Suspend/Unsuspend Host Option */}
              <div className="pt-2.5 border-t border-white/10">
                {selectedHostModal.rawHostProfile?.isHostSuspended ? (
                  <div className="space-y-2">
                    <div className="bg-rose-500/10 border border-rose-500/30 p-2.5 rounded-xl text-center">
                      <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest flex items-center justify-center gap-1 font-mono">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        HOST IS CURRENTLY SUSPENDED
                      </span>
                      {selectedHostModal.rawHostProfile?.hostSuspensionReason && (
                        <p className="text-[9px] text-slate-400 mt-0.5 truncate font-mono">
                          Reason: {selectedHostModal.rawHostProfile.hostSuspensionReason}
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => setUnsuspendConfirmModal({ hostId: selectedHostModal.hostId || selectedHostModal.rawHostProfile?.userId || '', hostName: selectedHostModal.name })}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-emerald-500/20 cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Unsuspend Host
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setShowSuspendModal(true)}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:border-rose-500/50 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer"
                  >
                    <ShieldAlert className="w-4 h-4 text-rose-400" />
                    Suspend Host
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Unsuspend Confirm Modal */}
      {unsuspendConfirmModal && (
        <div className="fixed inset-0 z-[280] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-[#0a0e22] border border-emerald-500/50 rounded-3xl max-w-sm w-full p-6 text-center shadow-2xl relative space-y-4 font-mono">
            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-2">
              <ShieldCheck className="w-8 h-8 text-emerald-400" />
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
                onClick={handleUnsuspendHost}
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
                    <ShieldCheck className="w-4 h-4" />
                    Confirm
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Suspend Host Selection Modal */}
      {showSuspendModal && selectedHostModal && (
        <div className="fixed inset-0 z-[270] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-[#0b0f22] border border-rose-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl relative overflow-hidden space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-rose-400">
                <ShieldAlert className="w-5 h-5 animate-pulse" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                  Suspend Host Account
                </h3>
              </div>
              <button
                onClick={() => setShowSuspendModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-900/80 p-3 rounded-2xl border border-white/5 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-slate-800 border border-rose-500/30 flex items-center justify-center overflow-hidden shrink-0">
                {selectedHostModal.photo ? (
                  <img src={selectedHostModal.photo} alt={selectedHostModal.name} className="w-full h-full object-cover" />
                ) : (
                  <User className="w-5 h-5 text-slate-400" />
                )}
              </div>
              <div className="min-w-0">
                <h4 className="text-xs font-black text-white uppercase truncate">{selectedHostModal.name}</h4>
                <p className="text-[10px] text-slate-400 truncate">League: {selectedHostModal.leagueName}</p>
              </div>
            </div>

            {/* Select Duration */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                Suspension Duration
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: '1_day', label: '1 Day' },
                  { id: '2_days', label: '2 Days' },
                  { id: '7_days', label: '7 Days' },
                  { id: '1_month', label: '1 Month' },
                  { id: '3_months', label: '3 Months' },
                  { id: '6_months', label: '6 Months' },
                  { id: 'lifetime', label: 'Lifetime Suspension', colSpan: true }
                ].map((dur) => (
                  <button
                    key={dur.id}
                    type="button"
                    onClick={() => setSuspendDuration(dur.id as any)}
                    className={`px-3 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all border cursor-pointer ${
                      dur.colSpan ? 'col-span-2' : ''
                    } ${
                      suspendDuration === dur.id
                        ? dur.id === 'lifetime'
                          ? 'bg-rose-600 border-rose-500 text-white shadow-lg shadow-rose-600/30'
                          : 'bg-cyan-600 border-cyan-500 text-white shadow-lg shadow-cyan-600/30'
                        : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {dur.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Reason for Suspension */}
            <div className="space-y-1.5">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                Reason for Suspension
              </label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                placeholder="State reason (e.g. Non-payment of prize pool, match result manipulation, policy violation...)"
                rows={3}
                className="w-full bg-slate-950 border border-white/15 rounded-xl p-3 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>

            {/* Originating League Badge */}
            <div className="text-[10px] text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-white/5 font-mono">
              <span className="font-bold text-slate-300">Originating League: </span>
              <span className="text-cyan-400 font-bold">{selectedHostModal.leagueName}</span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowSuspendModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmSuspendHost}
                disabled={isSubmittingSuspend || !suspendReason.trim()}
                className="flex-1 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-rose-600/30 flex items-center justify-center gap-1.5 cursor-pointer font-mono"
              >
                {isSubmittingSuspend ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ShieldAlert className="w-4 h-4" />
                )}
                Confirm Suspend
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tournament Results Modal */}
      {viewingResultModalTourney && (
        <TournamentResultsModal
          tourney={viewingResultModalTourney}
          onClose={() => setViewingResultModalTourney(null)}
        />
      )}

      {/* Set Tournament Profit Percentage Modal */}
      {profitPercentageModal && (
        <div className="fixed inset-0 z-[280] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-cyan-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-cyan-400">
                <Percent className="w-5 h-5" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                  Set Tournament Profit Percentage
                </h3>
              </div>
              <button
                onClick={() => setProfitPercentageModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              Define the percentage share of tournament profits that will be automatically routed to the <strong className="text-cyan-400">Tournament Profit Percentage Wallet</strong> when an admin unlocks a tournament wallet.
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                System Profit Percentage (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newProfitPercentageInput}
                  onChange={(e) => setNewProfitPercentageInput(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="w-full bg-slate-900 border border-cyan-500/30 rounded-2xl py-3 px-4 text-white font-mono font-bold text-base focus:outline-none focus:border-cyan-400"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-cyan-400 font-bold font-mono">
                  %
                </span>
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-2 pt-1">
              {[5, 10, 15, 20, 25].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setNewProfitPercentageInput(pct)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all border ${
                    newProfitPercentageInput === pct
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400'
                      : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setProfitPercentageModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveGlobalProfitPercentage}
                className="flex-1 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)] cursor-pointer"
              >
                Save Setting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Tournament Wallet Modal */}
      {unlockTournamentWalletModal.isOpen && unlockTournamentWalletModal.tourney && (() => {
        const t = unlockTournamentWalletModal.tourney;
        const calculatedEntryFees = t.mode === 'squad'
          ? ((t.joinedSquads?.length || 0) * (Number(t.entryFee) || 0))
          : ((t.joinedPlayers?.length || t.joinedCount || 0) * (Number(t.entryFee) || 0));
        const curBalance = t.walletBalance !== undefined 
          ? Number(t.walletBalance) 
          : ((Number(t.walletTokens) || 0) + calculatedEntryFees);
        const pct = unlockTournamentWalletModal.customPercentage;
        const isAlreadyDeducted = t.profitDeducted !== undefined && t.profitDeducted > 0;
        const systemCut = isAlreadyDeducted ? 0 : Math.round((curBalance * pct) / 100);
        const hostNet = Math.max(0, curBalance - systemCut);

        return (
          <div className="fixed inset-0 z-[280] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-slate-950 border border-emerald-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <Unlock className="w-5 h-5" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                    Unlock Tournament Wallet
                  </h3>
                </div>
                <button
                  onClick={() => setUnlockTournamentWalletModal({ isOpen: false, tourney: null, customPercentage: 10, isUnlocking: false })}
                  className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Tournament Info */}
              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase">
                  #{t.tournamentNumber || t.id} • {t.mode}
                </span>
                <h4 className="text-sm font-black text-white truncate">{t.title}</h4>
                <p className="text-xs text-slate-400">Host: <strong className="text-slate-200">{t.hostName || 'Host'}</strong></p>
              </div>

              {/* Profit Calculation Breakdown */}
              <div className="bg-slate-900/90 rounded-2xl p-4 border border-white/10 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Available Wallet Balance</span>
                  <span className="text-white font-bold text-sm">🪙 {curBalance} Tk</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400">System Profit Share</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={unlockTournamentWalletModal.customPercentage}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                        setUnlockTournamentWalletModal(prev => ({ ...prev, customPercentage: val }));
                      }}
                      className="w-14 bg-slate-950 border border-white/20 rounded-lg px-2 py-0.5 text-center text-cyan-400 font-bold text-xs"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                  <span className="text-rose-400 font-bold">
                    {isAlreadyDeducted ? '(Already Deducted) 0 Tk' : `- 🪙 ${systemCut} Tk`}
                  </span>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm">
                  <span className="text-emerald-400 font-bold">Host Net Tokens to Unlock</span>
                  <span className="text-emerald-300 font-black text-base">🪙 {hostNet} Tk</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Upon confirming, <strong className="text-rose-400">🪙 {systemCut} Tokens</strong> will be automatically credited to the <strong className="text-cyan-400">Tournament Profit Percentage Wallet</strong>, and the host's wallet will be marked as <strong className="text-emerald-400">UNLOCKED</strong> allowing them to transfer their earnings.
              </p>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setUnlockTournamentWalletModal({ isOpen: false, tourney: null, customPercentage: 10, isUnlocking: false })}
                  disabled={unlockTournamentWalletModal.isUnlocking}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeUnlockTournamentWallet(t, unlockTournamentWalletModal.customPercentage)}
                  disabled={unlockTournamentWalletModal.isUnlocking}
                  className="flex-1 py-2.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2 cursor-pointer font-mono"
                >
                  {unlockTournamentWalletModal.isUnlocking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Unlocking...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      Confirm & Unlock
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Set Lone Wolf Profit Percentage Modal */}
      {loneWolfProfitPercentageModal && (
        <div className="fixed inset-0 z-[280] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
          <div className="bg-slate-950 border border-fuchsia-500/40 rounded-3xl p-6 max-w-md w-full shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2 text-fuchsia-400">
                <Percent className="w-5 h-5" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                  Set Lone Wolf Profit %
                </h3>
              </div>
              <button
                onClick={() => setLoneWolfProfitPercentageModal(false)}
                className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              Define the percentage share of Lone Wolf match profits that will be automatically routed to the <strong className="text-fuchsia-400">Lone Wolf Percentage Wallet</strong> when an admin unlocks a Lone Wolf match wallet.
            </p>

            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 font-mono">
                System Profit Percentage (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={newLoneWolfProfitPercentageInput}
                  onChange={(e) => setNewLoneWolfProfitPercentageInput(Math.max(0, Math.min(100, Number(e.target.value) || 0)))}
                  className="w-full bg-slate-900 border border-fuchsia-500/30 rounded-2xl py-3 px-4 text-white font-mono font-bold text-base focus:outline-none focus:border-fuchsia-400"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-fuchsia-400 font-bold font-mono">
                  %
                </span>
              </div>
            </div>

            {/* Presets */}
            <div className="flex items-center gap-2 pt-1">
              {[5, 10, 15, 20, 25].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => setNewLoneWolfProfitPercentageInput(pct)}
                  className={`flex-1 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all border ${
                    newLoneWolfProfitPercentageInput === pct
                      ? 'bg-fuchsia-500 text-slate-950 border-fuchsia-400'
                      : 'bg-slate-900 text-slate-400 border-white/10 hover:text-white'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setLoneWolfProfitPercentageModal(false)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase transition-all cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveLoneWolfProfitPercentage}
                className="flex-1 py-2.5 bg-fuchsia-500 hover:bg-fuchsia-400 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider tracking-widest transition-all shadow-[0_0_15px_rgba(217,70,239,0.3)] cursor-pointer"
              >
                Save Setting
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Lone Wolf Wallet Modal */}
      {unlockLoneWolfWalletModal.isOpen && unlockLoneWolfWalletModal.match && (() => {
        const m = unlockLoneWolfWalletModal.match;
        
        // Calculate remaining wallet balance before profit deduction
        const hostDeposit = Number(m.walletTokens) || Number(m.prizePool) || 0;
        const p1Fee = m.player1 ? (Number(m.entryFee) || 0) : 0;
        const p2Fee = m.player2 ? (Number(m.entryFee) || 0) : 0;
        const totalLockedTokens = hostDeposit + p1Fee + p2Fee;
        
        const curBalance = m.walletBalance !== undefined 
          ? Number(m.walletBalance) 
          : Math.max(0, totalLockedTokens - (Number(m.prizePool) || 0));

        const pct = unlockLoneWolfWalletModal.customPercentage;
        const isAlreadyDeducted = m.profitDeducted !== undefined && m.profitDeducted > 0;
        const systemCut = isAlreadyDeducted ? 0 : Math.round((curBalance * pct) / 100);
        const hostNet = Math.max(0, curBalance - systemCut);

        return (
          <div className="fixed inset-0 z-[280] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
            <div className="bg-slate-950 border border-fuchsia-500/40 rounded-3xl p-6 max-w-lg w-full shadow-2xl relative space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2 text-fuchsia-400">
                  <Unlock className="w-5 h-5" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                    Unlock Lone Wolf Wallet
                  </h3>
                </div>
                <button
                  onClick={() => setUnlockLoneWolfWalletModal({ isOpen: false, match: null, customPercentage: 10, isUnlocking: false })}
                  className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Match Info */}
              <div className="bg-slate-900/80 p-3.5 rounded-2xl border border-white/5 space-y-1">
                <span className="text-[10px] font-mono text-fuchsia-400 font-bold uppercase">
                  Lone Wolf Match #{m.matchNumber || m.id}
                </span>
                <h4 className="text-sm font-black text-white truncate">{m.title || '1v1 Match'}</h4>
                <p className="text-xs text-slate-400">Host: <strong className="text-slate-200">{m.submittedByName || m.hostEmail || 'Pro Host'}</strong></p>
              </div>

              {/* Profit Calculation Breakdown */}
              <div className="bg-slate-900/90 rounded-2xl p-4 border border-white/10 space-y-3 font-mono text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">Remaining Wallet Balance</span>
                  <span className="text-white font-bold text-sm">🪙 {curBalance} Tokens</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-400 font-bold">System Profit Share</span>
                    <input
                      type="number"
                      min={0}
                      max={100}
                      value={unlockLoneWolfWalletModal.customPercentage}
                      onChange={(e) => {
                        const val = Math.max(0, Math.min(100, Number(e.target.value) || 0));
                        setUnlockLoneWolfWalletModal(prev => ({ ...prev, customPercentage: val }));
                      }}
                      className="w-14 bg-slate-950 border border-white/20 rounded-lg px-2 py-0.5 text-center text-fuchsia-400 font-bold text-xs font-mono focus:outline-none"
                    />
                    <span className="text-slate-400">%</span>
                  </div>
                  <span className="text-rose-400 font-bold">
                    {isAlreadyDeducted ? '(Already Deducted) 0 Tokens' : `- 🪙 ${systemCut} Tokens`}
                  </span>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-sm">
                  <span className="text-fuchsia-400 font-bold">Host Net Tokens to Unlock</span>
                  <span className="text-fuchsia-300 font-black text-base">🪙 {hostNet} Tokens</span>
                </div>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                Upon confirming, <strong className="text-rose-400">🪙 {systemCut} Tokens</strong> will be automatically credited to the <strong className="text-fuchsia-400">Lone Wolf Percentage Wallet</strong>, and the host's wallet will be marked as <strong className="text-emerald-400">UNLOCKED</strong> allowing them to claim their earnings.
              </p>

              {/* Actions */}
              <div className="flex items-center gap-3 pt-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setUnlockLoneWolfWalletModal({ isOpen: false, match: null, customPercentage: 10, isUnlocking: false })}
                  disabled={unlockLoneWolfWalletModal.isUnlocking}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-black uppercase transition-all cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => executeUnlockLoneWolfWallet(m, unlockLoneWolfWalletModal.customPercentage)}
                  disabled={unlockLoneWolfWalletModal.isUnlocking}
                  className="flex-1 py-2.5 bg-fuchsia-500 hover:bg-fuchsia-400 disabled:opacity-50 text-slate-950 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] flex items-center justify-center gap-2 cursor-pointer font-mono"
                >
                  {unlockLoneWolfWalletModal.isUnlocking ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Unlocking...
                    </>
                  ) : (
                    <>
                      <Unlock className="w-4 h-4" />
                      Confirm & Unlock
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Match Chat Modal for Admin-Host Direct Communication */}
      {activeChatMatch && (
        <MatchChatModal
          isOpen={!!activeChatMatch}
          onClose={() => setActiveChatMatch(null)}
          match={activeChatMatch.match}
          leagueId={activeChatMatch.league?.id || activeChatMatch.match?.leagueId || ''}
          userProfile={userProfile}
          canManage={true}
          isSystemAdmin={true}
          isHostOrCoHost={false}
          hostName={activeChatMatch.match?.submittedByName || activeChatMatch.hostProfile?.displayName}
        />
      )}

      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[300] animate-in slide-in-from-bottom-5 duration-300">
          <div className={`flex items-center gap-3 px-4 py-3 rounded-2xl shadow-2xl border ${
            toastMessage.type === 'success' 
              ? 'bg-emerald-950/90 border-emerald-500/50 text-emerald-300' 
              : 'bg-red-950/90 border-red-500/50 text-red-300'
          } backdrop-blur-md`}>
            {toastMessage.type === 'success' ? (
              <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
            )}
            <p className="text-xs font-bold">{toastMessage.text}</p>
          </div>
        </div>
      )}
    </div>
  );
};
