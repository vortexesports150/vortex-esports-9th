import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Trophy, 
  Shield, 
  ShieldCheck, 
  Calendar, 
  Users, 
  Star, 
  Lock, 
  Unlock,
  ChevronLeft, 
  ChevronRight, 
  Clock, 
  Eye, 
  EyeOff,
  ExternalLink,
  Flame,
  Swords,
  Coins,
  MapPin,
  Sparkles,
  Search,
  Filter,
  X,
  AlertTriangle,
  AlertCircle,
  UserCheck,
  CheckCircle2,
  Award,
  Wallet,
  MoreVertical,
  Key,
  Play,
  CheckSquare,
  Copy,
  Check,
  Edit3,
  Video,
  Globe,
  Mail,
  UserPlus,
  Send,
  Trash2,
  Hash,
  Megaphone,
  MessageSquare,
  Zap,
  BookOpen,
  Youtube,
} from 'lucide-react';
import { db } from '../lib/firebase';
import { checkAdminPermission } from '../lib/superAdminPermissions';
import { HostProfileModal } from './HostProfileModal';
import { HostFollowButton } from './HostFollowButton';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { ConfirmHideModal } from './ConfirmHideModal';
import { 
  collection, 
  onSnapshot, 
  doc, 
  runTransaction, 
  serverTimestamp,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  orderBy,
} from 'firebase/firestore';
import { UserProfile } from '../types';
import { BANGLADESH_DIVISIONS, ALL_BANGLADESH_DISTRICTS } from '../data/bangladeshData';
import { TournamentResultsModal } from './TournamentResultsModal';

interface GlobalTournamentsViewProps {
  userProfile: UserProfile | null;
  tokens: number;
  setTokens: (v: number | ((prev: number) => number)) => void;
  onViewMySquad?: () => void;
  userTeam?: any;
  userTeams?: any[];
  onInitiateSquadJoin?: (tourney: any, squad: any) => void;
  navigationContext?: any;
  onBackToInbox?: () => void;
  onTagTournamentForPulse?: (tournament: any) => void;
}

const ITEMS_PER_PAGE = 8;

interface TournamentChatButtonProps {
  tournament: any;
  userProfile: any;
  onClick: () => void;
  getCanAnnounceTournament: (t: any) => boolean;
  getIsJoinedTournament: (t: any) => boolean;
}

function TournamentChatButton({
  tournament,
  userProfile,
  onClick,
  getCanAnnounceTournament,
  getIsJoinedTournament
}: TournamentChatButtonProps) {
  const [unread, setUnread] = useState(false);

  const uId = userProfile?.userId || (userProfile as any)?.uid || (userProfile as any)?.id || '';
  const email = (userProfile?.email || '').toLowerCase().trim();
  const role = (userProfile?.role || '').toLowerCase().trim();

  const isSystemAdmin = 
    (email && email === 'vortexesports150@gmail.com') || 
    role === 'main_admin' || 
    role === 'admin' || 
    role === 'sub_admin' || 
    role === 'owner_admin';

  const isHost = 
    (tournament?.hostId && uId && tournament.hostId === uId) || 
    (tournament?.createdBy && uId && tournament.createdBy === uId) || 
    (tournament?.hostEmail && email && tournament.hostEmail.toLowerCase().trim() === email) ||
    (tournament?.coHostIds && uId && Array.isArray(tournament.coHostIds) && tournament.coHostIds.includes(uId)) ||
    (tournament?.coHostEmails && email && Array.isArray(tournament.coHostEmails) && tournament.coHostEmails.map((e: string) => e.toLowerCase().trim()).includes(email));

  // Determine if user can see support chat:
  // - System Admin can see
  // - Host/Creator/Co-Host of this specific tournament can see
  // - Solo Match: Only joined players can see (strict ID/email check)
  // - Squad Match: Only the squad captain/leader of a joined squad can see
  let canSeeSupport = false;
  if (userProfile && uId) {
    if (isSystemAdmin || isHost) {
      canSeeSupport = true;
    } else if (tournament?.mode === 'solo') {
      const joinedPlayers = tournament.joinedPlayers || [];
      canSeeSupport = joinedPlayers.some((p: any) => {
        const pId = p.userId || p.uid || '';
        const pEmail = (p.email || '').toLowerCase().trim();
        const matchId = uId && pId && pId === uId;
        const matchEmail = email && pEmail && pEmail === email;
        return matchId || matchEmail;
      });
    } else if (tournament?.mode === 'squad') {
      const joinedSquads = tournament.joinedSquads || [];
      canSeeSupport = joinedSquads.some((sqd: any) => {
        const lId = sqd.leaderId || '';
        const lEmail = (sqd.leaderEmail || '').toLowerCase().trim();
        const matchId = uId && lId && lId === uId;
        const matchEmail = email && lEmail && lEmail === email;
        return matchId || matchEmail;
      });
    }
  }

  useEffect(() => {
    if (!tournament?.id || !uId || !canSeeSupport) return;

    const docId = `tourney_${tournament.id}_${uId}`;
    const docRef = doc(db, 'admin_messages', docId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        // If status is 'replied', it means Admin replied and the user has not read it yet
        setUnread(data.status === 'replied');
      } else {
        setUnread(false);
      }
    }, (error) => {
      console.error("Error monitoring chat button:", error);
    });

    return () => unsubscribe();
  }, [tournament?.id, uId, canSeeSupport]);

  // If not logged-in or not eligible, hide the button completely
  if (!userProfile || !uId || !canSeeSupport) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      className="p-1 px-1.5 rounded-lg bg-[#0c1227] border border-cyan-500/30 hover:border-cyan-400/60 hover:bg-cyan-950/40 text-slate-300 hover:text-cyan-400 transition-all cursor-pointer flex items-center gap-1 text-[9px] font-semibold shrink-0 relative"
      title="Tournament Support Chat"
    >
      <MessageSquare className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
      <span>Support</span>
      {unread && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full animate-ping" />
      )}
      {unread && (
        <span className="absolute -top-1 -right-1 w-2 h-2 bg-rose-500 rounded-full" />
      )}
    </button>
  );
}

export function GlobalTournamentsView({
  userProfile,
  tokens,
  setTokens,
  onViewMySquad,
  userTeam,
  userTeams,
  onInitiateSquadJoin,
  navigationContext,
  onBackToInbox,
  onTagTournamentForPulse
}: GlobalTournamentsViewProps) {
  const createdSquad = (userTeams || []).find((t: any) => 
    t.leaderId === userProfile?.userId || 
    (userProfile?.email && t.leaderEmail?.toLowerCase() === userProfile.email.toLowerCase())
  );
  const joinedSquad = userTeams && userTeams.length > 0 ? userTeams[0] : null;
  const effectiveSquad = createdSquad || userTeam || joinedSquad || userProfile?.squad;

  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [highlightedTournamentId, setHighlightedTournamentId] = useState<string | null>(null);
  const [tourneyToDelete, setTourneyToDelete] = useState<{ id: string; title: string } | null>(null);
  const [tourneyToHide, setTourneyToHide] = useState<{ id: string; title: string; isHidden: boolean } | null>(null);

  const currentUserEmail = (userProfile?.email || '').toLowerCase().trim();
  const currentUserRole = (userProfile?.role || '').toLowerCase().trim();
  const isOwnerAdmin = currentUserEmail === 'vortexesports150@gmail.com' || 
    currentUserRole === 'owner_admin' || 
    currentUserRole === 'main_admin';

  const isSuperAdmin = currentUserEmail === 'vortexesports150@gmail.com' || 
    currentUserRole === 'main_admin' || 
    currentUserRole === 'admin' || 
    currentUserRole === 'owner_admin' || 
    currentUserRole === 'super_admin' || 
    currentUserRole === 'sub_admin' ||
    (userProfile as any)?.isAdmin === true;

  const hasDeleteHidePermission = checkAdminPermission(
    currentUserEmail, 
    (userProfile as any)?.permissions, 
    'pro_tournaments_admin'
  ) || checkAdminPermission(
    currentUserEmail, 
    (userProfile as any)?.permissions, 
    'delete_hide_tournaments'
  );

  // Only Owner Admin and Super Admin with permission can delete or hide. Host cannot delete or hide!
  const canDeleteOrHide = isOwnerAdmin || (isSuperAdmin && hasDeleteHidePermission);

  // Filters State
  const [searchQuery, setSearchQuery] = useState('');
  const [modeFilter, setModeFilter] = useState<'all' | 'solo' | 'squad'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Open' | 'Ongoing' | 'Ended'>('Open');
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);

  // Host Profile Modal state
  const [selectedHostForModal, setSelectedHostForModal] = useState<{ hostId: string; hostName?: string; hostPhotoUrl?: string } | null>(null);
  
  // Followed Hosts State
  const [followedHostIds, setFollowedHostIds] = useState<Set<string>>(new Set());

  // Listen to followed hosts for current logged in user
  useEffect(() => {
    if (!userProfile?.userId) return;
    const q = query(collection(db, 'user_follows'), where('userId', '==', userProfile.userId));
    const unsub = onSnapshot(q, (snap) => {
      const ids = new Set<string>();
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.hostId) ids.add(data.hostId);
      });
      setFollowedHostIds(ids);
    }, (err) => {
      console.error("Error fetching user follows:", err);
    });
    return () => unsub();
  }, [userProfile?.userId]);

  // Modals
  const [rosterModalTourney, setRosterModalTourney] = useState<any | null>(null);
  const [rosterGameNames, setRosterGameNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!rosterModalTourney) {
      setRosterGameNames({});
      return;
    }
    
    const fetchGameNames = async () => {
      try {
        const uidsToFetch = new Set<string>();
        if (rosterModalTourney.mode === 'squad' && rosterModalTourney.joinedSquads) {
          rosterModalTourney.joinedSquads.forEach((sqd: any) => {
            (sqd.members || []).forEach((m: any) => {
              if ((!m.gameName && !m.ingameName) && (m.userId || m.uid || m.id)) {
                uidsToFetch.add(m.userId || m.uid || m.id);
              }
            });
          });
        } else if (rosterModalTourney.mode === 'solo' && rosterModalTourney.joinedPlayers) {
          rosterModalTourney.joinedPlayers.forEach((p: any) => {
            if ((!p.gameName && !p.ingameName) && (p.userId || p.uid || p.id)) {
              uidsToFetch.add(p.userId || p.uid || p.id);
            }
          });
        }

        const uidArray = Array.from(uidsToFetch);
        if (uidArray.length === 0) return;

        const newNames: Record<string, string> = {};
        await Promise.all(uidArray.map(async (uid) => {
          try {
            const docSnap = await getDoc(doc(db, 'users', uid));
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.gameName) {
                newNames[uid] = data.gameName;
              }
            }
          } catch (e) {
            console.error("Failed to fetch user", uid, e);
          }
        }));

        setRosterGameNames(prev => ({ ...prev, ...newNames }));
      } catch (err) {
        console.error("Error fetching game names:", err);
      }
    };

    fetchGameNames();
  }, [rosterModalTourney]);

  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [squarePreviewImage, setSquarePreviewImage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [joiningTourneyId, setJoiningTourneyId] = useState<string | null>(null);
  const [confirmJoinTourney, setConfirmJoinTourney] = useState<any | null>(null);
  const [alreadyJoinedModalTourney, setAlreadyJoinedModalTourney] = useState<{ tourney: any; squad?: any } | null>(null);
  const [alreadyJoinedGameNames, setAlreadyJoinedGameNames] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!alreadyJoinedModalTourney) {
      setAlreadyJoinedGameNames({});
      return;
    }
    
    const fetchGameNames = async () => {
      try {
        const uidsToFetch = new Set<string>();
        if (alreadyJoinedModalTourney.squad && alreadyJoinedModalTourney.squad.members) {
          alreadyJoinedModalTourney.squad.members.forEach((m: any) => {
            if ((!m.gameName && !m.ingameName) && (m.userId || m.uid || m.id)) {
              uidsToFetch.add(m.userId || m.uid || m.id);
            }
          });
        }

        const uidArray = Array.from(uidsToFetch);
        if (uidArray.length === 0) return;

        const newNames: Record<string, string> = {};
        await Promise.all(uidArray.map(async (uid) => {
          try {
            const docSnap = await getDoc(doc(db, 'users', uid));
            if (docSnap.exists()) {
              const data = docSnap.data();
              if (data.gameName) {
                newNames[uid] = data.gameName;
              }
            }
          } catch (e) {
            console.error("Failed to fetch user", uid, e);
          }
        }));

        setAlreadyJoinedGameNames(prev => ({ ...prev, ...newNames }));
      } catch (err) {
        console.error("Error fetching already joined game names:", err);
      }
    };

    fetchGameNames();
  }, [alreadyJoinedModalTourney]);
  const [squadNoticeModal, setSquadNoticeModal] = useState<{ title: string; message: string; squad?: any } | null>(null);

  // Host Action States
  const [activeMenuTourneyId, setActiveMenuTourneyId] = useState<string | null>(null);
  const [hostRoomModalTourney, setHostRoomModalTourney] = useState<any | null>(null);
  const [confirmOngoingTourney, setConfirmOngoingTourney] = useState<any | null>(null);
  const [isMovingToOngoing, setIsMovingToOngoing] = useState(false);
  const [inputRoomId, setInputRoomId] = useState('');
  const [inputRoomPassword, setInputRoomPassword] = useState('');
  const [inputYoutubeLiveUrl, setInputYoutubeLiveUrl] = useState('');
  const [roomModalError, setRoomModalError] = useState<string | null>(null);

  const [hostResultModalTourney, setHostResultModalTourney] = useState<any | null>(null);
  const [resultWinnerName, setResultWinnerName] = useState('');
  const [resultRunnerUp, setResultRunnerUp] = useState('');
  const [resultTopKills, setResultTopKills] = useState('');
  const [resultNotes, setResultNotes] = useState('');
  const [markEndedOnResult, setMarkEndedOnResult] = useState(true);

  const [hostEditTitleModalTourney, setHostEditTitleModalTourney] = useState<any | null>(null);
  const [inputTournamentTitle, setInputTournamentTitle] = useState('');
  const [titleModalError, setTitleModalError] = useState<string | null>(null);

  const [hostInviteModalTourney, setHostInviteModalTourney] = useState<any | null>(null);
  const [inviteEmailInput, setInviteEmailInput] = useState('');
  const [inviteModalError, setInviteModalError] = useState<string | null>(null);
  const [inviteModalSuccess, setInviteModalSuccess] = useState<string | null>(null);

  const [codeJoinModalTourney, setCodeJoinModalTourney] = useState<any | null>(null);
  const [enteredAccessCode, setEnteredAccessCode] = useState('');
  const [codeModalError, setCodeModalError] = useState<string | null>(null);

  const [hostCodeModalTourney, setHostCodeModalTourney] = useState<any | null>(null);
  const [inputAccessCode, setInputAccessCode] = useState('');
  const [codeUpdateError, setCodeUpdateError] = useState<string | null>(null);
  const [codeUpdateSuccess, setCodeUpdateSuccess] = useState<string | null>(null);

  // Tournament specific Announcement States
  const [selectedAnnouncementTourney, setSelectedAnnouncementTourney] = useState<any | null>(null);
  const [tourneyAnnouncementText, setTourneyAnnouncementText] = useState('');
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [isUpdatingAnnouncement, setIsUpdatingAnnouncement] = useState(false);
  const [announcementError, setAnnouncementError] = useState<string | null>(null);
  const [announcementSuccess, setAnnouncementSuccess] = useState<string | null>(null);

  // Tournament specific Support/Chat States
  const [selectedSupportTourney, setSelectedSupportTourney] = useState<any | null>(null);
  const [showSupportModal, setShowSupportModal] = useState(false);
  const [viewingResultTourney, setViewingResultTourney] = useState<any | null>(null);
  const [showRulesTourney, setShowRulesTourney] = useState<any | null>(null);

  useEffect(() => {
    if (navigationContext?.type === 'tournament_support' && navigationContext.tournamentId && tournaments.length > 0) {
      const targetTourney = tournaments.find(t => t.id === navigationContext.tournamentId);
      if (targetTourney) {
        setSelectedSupportTourney(targetTourney);
        setShowSupportModal(true);
      }
    }

    if (navigationContext?.type === 'pulse_tagged_tournament' && navigationContext.tournamentId && tournaments.length > 0) {
      const targetId = navigationContext.tournamentId;
      setHighlightedTournamentId(targetId);
      setStatusFilter('all');
      setModeFilter('all');
      setSearchQuery('');

      const attemptScroll = () => {
        const el = document.getElementById(`tournament-card-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return true;
        }
        return false;
      };

      const t1 = setTimeout(attemptScroll, 150);
      const t2 = setTimeout(attemptScroll, 450);
      const t3 = setTimeout(attemptScroll, 900);
      const t4 = setTimeout(attemptScroll, 1600);

      const clearTimer = setTimeout(() => {
        setHighlightedTournamentId(null);
      }, 15000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(clearTimer);
      };
    }
  }, [navigationContext, tournaments]);
  const [newSupportMessage, setNewSupportMessage] = useState('');
  const [isSendingSupport, setIsSendingSupport] = useState(false);
  const [supportMessages, setSupportMessages] = useState<any[]>([]);
  const [supportThreadData, setSupportThreadData] = useState<any | null>(null);

  useEffect(() => {
    if (!showSupportModal || !selectedSupportTourney) {
      setSupportMessages([]);
      setSupportThreadData(null);
      return;
    }

    const currentUserId = userProfile?.userId || (userProfile as any)?.uid || (userProfile as any)?.id || 'guest';
    const docId = `tourney_${selectedSupportTourney.id}_${currentUserId}`;
    const docRef = doc(db, 'admin_messages', docId);

    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setSupportThreadData(data);

        // Map main message + replies to a flat messages list
        const msgsList: any[] = [];
        if (data.message || data.text) {
          msgsList.push({
            id: 'initial',
            text: data.message || data.text,
            senderId: data.senderId,
            senderName: data.senderName,
            senderPhoto: data.senderPhoto || '',
            senderRole: data.senderRole || 'player',
            createdAt: data.createdAt,
          });
        }

        if (data.replies && Array.isArray(data.replies)) {
          data.replies.forEach((r: any, idx: number) => {
            msgsList.push({
              id: `reply_${idx}`,
              text: r.text || r.message,
              senderId: r.senderId,
              senderName: r.senderName,
              senderPhoto: r.senderPhoto || '',
              senderRole: r.senderRole || (r.isAdmin ? 'system_admin' : 'player'),
              createdAt: r.createdAt,
            });
          });
        }

        setSupportMessages(msgsList);

        // If the status is 'replied', mark it as 'read' so the unread count/indicators clear!
        if (data.status === 'replied') {
          try {
            await updateDoc(docRef, { status: 'read' });
          } catch (e) {
            console.error("Error updating status to read:", e);
          }
        }
      } else {
        setSupportMessages([]);
        setSupportThreadData(null);
      }
    }, (error) => {
      console.error("Error fetching tournament support thread:", error);
    });

    return () => unsubscribe();
  }, [showSupportModal, selectedSupportTourney, userProfile]);

  const getCanAnnounceTournament = (t: any) => {
    if (!userProfile || !t) return false;
    
    const email = (userProfile.email || '').toLowerCase().trim();
    const uId = userProfile.userId || (userProfile as any).id || (userProfile as any).uid;
    const role = (userProfile.role || '').toLowerCase().trim();
    
    const isSuperAdmin = email === 'vortexesports150@gmail.com' || role === 'main_admin' || role === 'admin';
    const isOwnerAdmin = role === 'owner_admin';
    const isHost = role === 'host' || 
                   role === 'sub_admin' || 
                   (t.hostId && (t.hostId === uId)) || 
                   (t.createdBy && (t.createdBy === uId)) || 
                   (t.hostEmail && t.hostEmail.toLowerCase().trim() === email);
                   
    const isCoHost = role === 'co_host' || 
                     role === 'co-host' || 
                     (userProfile as any).isCoHost === true || 
                     (t.coHostIds && t.coHostIds.includes(uId)) ||
                     (t.coHostEmails && t.coHostEmails.map((e: string) => e.toLowerCase().trim()).includes(email));

    return isSuperAdmin || isOwnerAdmin || isHost || isCoHost;
  };

  const getIsJoinedTournament = (t: any) => {
    if (!userProfile || !t) return false;
    const uId = userProfile.userId || (userProfile as any).id || (userProfile as any).uid || '';
    const uEmail = (userProfile.email || '').toLowerCase().trim();

    if (t.mode === 'solo') {
      const joinedPlayers = t.joinedPlayers || [];
      return joinedPlayers.some((p: any) => 
        (p.userId && p.userId === uId) || 
        (p.uid && p.uid === uId) || 
        (p.email && p.email.toLowerCase().trim() === uEmail)
      );
    }

    if (t.mode === 'squad') {
      const joinedSquads = t.joinedSquads || [];
      return joinedSquads.some((sqd: any) => {
        if (sqd.leaderId === uId || (sqd.leaderEmail && sqd.leaderEmail.toLowerCase().trim() === uEmail)) {
          return true;
        }
        const members = sqd.members || [];
        return members.some((m: any) => 
          (m.userId && m.userId === uId) || 
          (m.email && m.email.toLowerCase().trim() === uEmail)
        );
      });
    }

    return false;
  };

  const handleSaveTournamentAnnouncement = async () => {
    if (!selectedAnnouncementTourney) return;
    setIsUpdatingAnnouncement(true);
    setAnnouncementError(null);
    setAnnouncementSuccess(null);
    try {
      const tourneyRef = doc(db, 'tournaments_freefire', selectedAnnouncementTourney.id);
      await updateDoc(tourneyRef, {
        announcement: tourneyAnnouncementText.trim(),
        announcementUpdatedAt: new Date().toISOString(),
        announcementAuthor: userProfile?.displayName || userProfile?.email || 'Host'
      });
      setAnnouncementSuccess('Announcement updated successfully!');
    } catch (err: any) {
      console.error("Error updating tournament announcement:", err);
      setAnnouncementError("Failed to update announcement: " + err.message);
    } finally {
      setIsUpdatingAnnouncement(false);
    }
  };

  const handleGenerateRandomAccessCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setInputAccessCode(result);
  };

  const handleSaveAccessCode = async () => {
    if (!hostCodeModalTourney) return;
    const cleanCode = inputAccessCode.trim().toUpperCase();
    if (!cleanCode) {
      setCodeUpdateError('Please enter a valid access code.');
      return;
    }

    try {
      setCodeUpdateError(null);
      const tourneyRef = doc(db, 'tournaments_freefire', hostCodeModalTourney.id);
      await updateDoc(tourneyRef, {
        accessCode: cleanCode,
        accessType: 'code',
        updatedAt: serverTimestamp(),
      });
      setHostCodeModalTourney((prev: any) => prev ? { ...prev, accessCode: cleanCode, accessType: 'code' } : null);
      setCodeUpdateSuccess('Access code updated successfully! Existing joined players remain on the list.');
      setTimeout(() => {
        setCodeUpdateSuccess(null);
        setHostCodeModalTourney(null);
      }, 1600);
    } catch (err: any) {
      console.error('Error updating access code:', err);
      setCodeUpdateError('Failed to update access code: ' + (err.message || String(err)));
    }
  };

  const [copiedField, setCopiedField] = useState<string | null>(null);

  const handleSendInviteEmail = async () => {
    if (!hostInviteModalTourney) return;
    const inputTerm = inviteEmailInput.trim();
    if (!inputTerm) {
      setInviteModalError('Please enter a PlayVear ID or Gmail.');
      return;
    }

    let finalEmail = inputTerm.toLowerCase();

    // If input is 4 digits, try to find the user's email first
    if (/^\d{4}$/.test(inputTerm)) {
      try {
        const usersCol = collection(db, 'users');
        const userQ = query(usersCol, where('playvearId', '==', inputTerm));
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty) {
          finalEmail = userSnap.docs[0].data().email.toLowerCase();
        } else {
          setInviteModalError(`No player found with PlayVear ID "${inputTerm}".`);
          return;
        }
      } catch (err) {
        console.error("Error looking up PlayVear ID:", err);
      }
    } else {
      // Basic email check if not a 4-digit ID
      if (!finalEmail.includes('@')) {
        setInviteModalError('Please enter a valid PlayVear ID (4 digits) or Gmail.');
        return;
      }
    }

    const currentInvites: string[] = hostInviteModalTourney.invitedEmails || [];
    if (currentInvites.includes(finalEmail)) {
      setInviteModalError('This player is already in the invitation list.');
      return;
    }

    try {
      setInviteModalError(null);
      const tourneyRef = doc(db, 'tournaments_freefire', hostInviteModalTourney.id);
      const updatedInvites = [...currentInvites, finalEmail];
      await updateDoc(tourneyRef, {
        invitedEmails: updatedInvites,
        updatedAt: serverTimestamp(),
      });

      setHostInviteModalTourney((prev: any) => prev ? { ...prev, invitedEmails: updatedInvites } : null);

      try {
        const userQuery = query(collection(db, 'users'), where('email', '==', finalEmail));
        const userSnap = await getDocs(userQuery);
        if (!userSnap.empty) {
          const recipientId = userSnap.docs[0].id;
          await addDoc(collection(db, 'users', recipientId, 'notifications'), {
            title: 'Tournament Invitation 🏆',
            message: `Host ${userProfile?.displayName || 'Host'} invited you to join tournament "${hostInviteModalTourney.title}".`,
            type: 'tournament_invite',
            tournamentId: hostInviteModalTourney.id,
            tournamentTitle: hostInviteModalTourney.title,
            createdAt: serverTimestamp(),
            read: false,
          });
        }
      } catch (notifErr) {
        console.warn('Could not send notification doc to invited user:', notifErr);
      }

      setInviteModalSuccess(`Successfully invited ${finalEmail}! Notification sent.`);
      setInviteEmailInput('');
      setTimeout(() => setInviteModalSuccess(null), 3500);
    } catch (err: any) {
      console.error('Error adding invite:', err);
      setInviteModalError('Failed to send invitation: ' + (err.message || String(err)));
    }
  };

  const handleRemoveInviteEmail = async (emailToRemove: string) => {
    if (!hostInviteModalTourney) return;
    try {
      const tourneyRef = doc(db, 'tournaments_freefire', hostInviteModalTourney.id);
      const currentInvites: string[] = hostInviteModalTourney.invitedEmails || [];
      const updatedInvites = currentInvites.filter(e => e.toLowerCase() !== emailToRemove.toLowerCase());
      await updateDoc(tourneyRef, {
        invitedEmails: updatedInvites,
        updatedAt: serverTimestamp(),
      });
      setHostInviteModalTourney((prev: any) => prev ? { ...prev, invitedEmails: updatedInvites } : null);
      setInviteModalSuccess(`Removed ${emailToRemove} from invitations.`);
      setTimeout(() => setInviteModalSuccess(null), 2500);
    } catch (err: any) {
      console.error('Error removing invite:', err);
      setInviteModalError('Failed to remove invite: ' + (err.message || String(err)));
    }
  };

  const handleVerifyCodeAndJoin = (tourney: any) => {
    if (!enteredAccessCode.trim()) {
      setCodeModalError('Please enter the access code.');
      return;
    }
    if (enteredAccessCode.trim().toUpperCase() !== (tourney.accessCode || '').toUpperCase()) {
      setCodeModalError('Invalid Access Code! Please check with the host.');
      return;
    }
    setCodeJoinModalTourney(null);
    setEnteredAccessCode('');
    setCodeModalError(null);
    handleJoinTournament(tourney);
  };

  // Host Action Handlers
  const handleMoveToOngoing = async (tourney: any) => {
    if (!tourney?.id) return;
    setIsMovingToOngoing(true);
    try {
      const tourneyRef = doc(db, 'tournaments_freefire', tourney.id);
      try {
        await updateDoc(tourneyRef, {
          status: 'Ongoing',
          updatedAt: serverTimestamp(),
        });
      } catch (docErr) {
        console.warn('updateDoc failed, trying setDoc with merge:', docErr);
        await setDoc(tourneyRef, {
          status: 'Ongoing',
          updatedAt: serverTimestamp(),
        }, { merge: true });
      }

      // Optimistically update local tournaments state
      setTournaments(prev => prev.map(t => 
        (t.id === tourney.id || (tourney.tournamentNumber && t.tournamentNumber === tourney.tournamentNumber))
          ? { ...t, status: 'Ongoing' } 
          : t
      ));
      
      // Automatically navigate host to Ongoing tab on page 1
      setStatusFilter('Ongoing');
      setCurrentPage(1);
      setActiveMenuTourneyId(null);
      setConfirmOngoingTourney(null);

      setActionSuccess(`Match "${tourney.title}" status successfully moved to Ongoing! Switched to Ongoing tab.`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      console.error('Error updating status to Ongoing:', err);
      setActionError('Failed to update match status: ' + (err.message || String(err)));
      setTimeout(() => setActionError(null), 3500);
    } finally {
      setIsMovingToOngoing(false);
    }
  };

  const handleToggleMatchPlayed = async (tourney: any) => {
    try {
      const tourneyRef = doc(db, 'tournaments_freefire', tourney.id);
      const newPlayedState = !(tourney.isMatchPlayed || tourney.matchPlayed);
      await updateDoc(tourneyRef, {
        isMatchPlayed: newPlayedState,
        matchPlayed: newPlayedState,
        updatedAt: serverTimestamp(),
      });
      setActionSuccess(
        newPlayedState
          ? `Match "${tourney.title}" marked as Played!`
          : `Match "${tourney.title}" marked as Not Played.`
      );
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      console.error('Error toggling match played:', err);
      setActionError('Failed to update match played status: ' + (err.message || String(err)));
      setTimeout(() => setActionError(null), 3500);
    }
  };

  const handleSaveRoomDetails = async () => {
    if (!hostRoomModalTourney) return;

    if (!inputYoutubeLiveUrl.trim()) {
      setRoomModalError('YouTube Live Stream Link is mandatory. Room details cannot be saved without it!');
      return;
    }

    if (!inputRoomId.trim() || !inputRoomPassword.trim()) {
      setRoomModalError('Please enter both Room ID and Room Password!');
      return;
    }

    try {
      const tourneyRef = doc(db, 'tournaments_freefire', hostRoomModalTourney.id);
      await updateDoc(tourneyRef, {
        roomId: inputRoomId.trim(),
        roomPassword: inputRoomPassword.trim(),
        roomPass: inputRoomPassword.trim(),
        youtubeLiveUrl: inputYoutubeLiveUrl.trim(),
        youtubeLiveLink: inputYoutubeLiveUrl.trim(),
        youtubeUrl: inputYoutubeLiveUrl.trim(),
        updatedAt: serverTimestamp(),
      });
      setActionSuccess('Room ID, Password & YouTube Live link saved successfully!');
      setTimeout(() => setActionSuccess(null), 3500);
      setHostRoomModalTourney(null);
      setRoomModalError(null);
    } catch (err: any) {
      console.error('Error saving room details:', err);
      setActionError('Failed to set Room ID & Password: ' + (err.message || String(err)));
      setTimeout(() => setActionError(null), 3500);
    }
  };

  const handleSaveResult = async () => {
    if (!hostResultModalTourney) return;
    try {
      const tourneyRef = doc(db, 'tournaments_freefire', hostResultModalTourney.id);
      const resultObj = {
        winnerName: resultWinnerName.trim(),
        runnerUp: resultRunnerUp.trim(),
        topKills: resultTopKills.trim(),
        notes: resultNotes.trim(),
        updatedAt: new Date().toISOString(),
      };
      const updateData: any = {
        result: resultObj,
        winnerName: resultWinnerName.trim(),
        isMatchPlayed: true,
        matchPlayed: true,
        updatedAt: serverTimestamp(),
      };
      if (markEndedOnResult) {
        updateData.status = 'Ended';
      }
      await updateDoc(tourneyRef, updateData);
      setActionSuccess('Match result published successfully!');
      setTimeout(() => setActionSuccess(null), 3500);
      setHostResultModalTourney(null);
    } catch (err: any) {
      console.error('Error saving match result:', err);
      setActionError('Failed to save match result: ' + (err.message || String(err)));
      setTimeout(() => setActionError(null), 3500);
    }
  };

  const handleSaveTournamentTitle = async () => {
    if (!hostEditTitleModalTourney) return;
    if (!inputTournamentTitle.trim()) {
      setTitleModalError('Please enter a tournament name.');
      return;
    }
    if (inputTournamentTitle.trim().length > 30) {
      setTitleModalError('Tournament name cannot exceed 30 characters.');
      return;
    }
    try {
      const tourneyRef = doc(db, 'tournaments_freefire', hostEditTitleModalTourney.id);
      await updateDoc(tourneyRef, {
        title: inputTournamentTitle.trim(),
        updatedAt: serverTimestamp(),
      });
      setActionSuccess('Tournament title updated successfully!');
      setTimeout(() => setActionSuccess(null), 3500);
      setHostEditTitleModalTourney(null);
      setTitleModalError(null);
    } catch (err: any) {
      console.error('Error updating tournament title:', err);
      setActionError('Failed to update tournament title: ' + (err.message || String(err)));
      setTimeout(() => setActionError(null), 3500);
    }
  };

  // Firestore Real-time Listener for tournaments_freefire
  useEffect(() => {
    const colRef = collection(db, 'tournaments_freefire');
    const unsub = onSnapshot(colRef, (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        list.push({ ...data, id: d.id, docId: d.id });
      });

      // Sort by newest created first
      list.sort((a, b) => {
        const timeA = a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.seconds || 0;
        return timeB - timeA;
      });

      setTournaments(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching global tournaments:', err);
      setLoading(false);
    });

    return () => unsub();
  }, []);

  // Filtered Tournaments
  const filteredTournaments = tournaments.filter(t => {
    // Exclude hidden tournaments
    if (t.isHidden === true) {
      return false;
    }

    // Exclude sandbox/demo tournaments (typically have undefined host or specific IDs)
    if (t.id.startsWith('ff_') || t.id.startsWith('1-2026')) {
      return false;
    }

    // Exclude Pending or Rejected tournaments (must be Approved/Open by Admin first before appearing on Global Tournaments)
    const tourneyStatus = (t.status || '').toLowerCase();
    if (tourneyStatus === 'pending' || tourneyStatus === 'rejected' || tourneyStatus === 'draft') {
      return false;
    }

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = (t.title || '').toLowerCase().includes(q);
      const matchHost = (t.hostName || '').toLowerCase().includes(q);
      const matchId = (t.id || '').toLowerCase().includes(q);
      const matchNumber = String(t.tournamentNumber || '').includes(q);
      if (!matchTitle && !matchHost && !matchId && !matchNumber) return false;
    }

    // Mode Filter
    if (modeFilter !== 'all' && t.mode !== modeFilter) return false;

    // Status Filter
    if (statusFilter !== 'all') {
      const filterStatus = statusFilter.toLowerCase();
      if (filterStatus === 'open') {
        if (tourneyStatus !== 'open' && tourneyStatus !== 'approved') return false;
      } else if (filterStatus === 'ongoing') {
        if (tourneyStatus !== 'ongoing' && tourneyStatus !== 'resultunderreview' && tourneyStatus !== 'resultrejected') return false;
      } else if (filterStatus === 'ended') {
        if (tourneyStatus !== 'ended' && tourneyStatus !== 'completed') return false;
      } else if (tourneyStatus !== filterStatus) {
        return false;
      }
    }

    // Division Filter
    if (selectedDivision !== 'all') {
      if (t.locationRestrictionType !== 'all_bangladesh' && t.allowedDivision && t.allowedDivision !== selectedDivision) {
        return false;
      }
    }

    // District Filter
    if (selectedDistrict !== 'all') {
      if ((t.locationRestrictionType === 'specific_district' || t.locationRestrictionType === 'specific_upazila') && t.allowedDistrict && t.allowedDistrict !== selectedDistrict) {
        return false;
      }
    }

    return true;
  });

  // Sort tournaments so followed hosts appear first!
  const sortedFilteredTournaments = [...filteredTournaments].sort((a, b) => {
    const aFollowed = a.hostId && followedHostIds.has(a.hostId) ? 1 : 0;
    const bFollowed = b.hostId && followedHostIds.has(b.hostId) ? 1 : 0;
    if (aFollowed !== bFollowed) {
      return bFollowed - aFollowed; // followed host tournaments first
    }
    return 0;
  });

  // Pagination Logic
  const totalPages = Math.ceil(sortedFilteredTournaments.length / ITEMS_PER_PAGE) || 1;
  const paginatedTournaments = sortedFilteredTournaments.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  // Joining Handler
  const handleJoinTournament = async (tournament: any): Promise<boolean> => {
    setActionError(null);
    setActionSuccess(null);

    if (!userProfile) {
      setActionError('Please log in to join tournaments.');
      return false;
    }

    const entryFee = Number(tournament.entryFee) || 0;

    // Token Balance Check
    if (tokens < entryFee) {
      setActionError(`Insufficient tokens! Joining requires ${entryFee} tokens, but your main wallet balance is ${Number(tokens).toFixed(2)} tokens.`);
      return false;
    }

    const normalizedUserEmail = (userProfile.email || '').toLowerCase();
    const isUserAdminOrHost = normalizedUserEmail === 'vortexesports150@gmail.com' || 
                             userProfile.role === 'admin' || 
                             userProfile.role === 'main_admin' || 
                             userProfile.role === 'sub_admin' || 
                             (userProfile.role as string) === 'owner_admin' ||
                             (userProfile.role as string) === 'host' ||
                             !!(userProfile as any).isHost ||
                             !!(userProfile as any).isHostUser ||
                             tournament.hostId === userProfile.userId ||
                             tournament.hostId === (userProfile as any).id ||
                             ((tournament as any).hostEmail && ((tournament as any).hostEmail || '').toLowerCase() === normalizedUserEmail);

    // Location eligibility check
    if (tournament.locationRestrictionType) {
      if (tournament.locationRestrictionType === 'specific_division') {
        if (!userProfile.division || userProfile.division.trim().toLowerCase() !== (tournament.allowedDivision || '').trim().toLowerCase()) {
          setActionError(`This tournament is restricted to players/squads from ${tournament.allowedDivision} division.`);
          return false;
        }
      } else if (tournament.locationRestrictionType === 'specific_district') {
        if (!userProfile.district || userProfile.district.trim().toLowerCase() !== (tournament.allowedDistrict || '').trim().toLowerCase()) {
          setActionError(`This tournament is restricted to players/squads from ${tournament.allowedDistrict} district.`);
          return false;
        }
      } else if (tournament.locationRestrictionType === 'specific_upazila') {
        if (!userProfile.upazila || userProfile.upazila.trim().toLowerCase() !== (tournament.allowedUpazila || '').trim().toLowerCase()) {
          setActionError(`This tournament is restricted to players/squads from ${tournament.allowedUpazila} upazila.`);
          return false;
        }
      }
    }

    setJoiningTourneyId(tournament.id);

    try {
      if (tournament.mode === 'squad') {
        // Squad Joining Flow
        const userSquad = effectiveSquad;
        if (!userSquad || !userSquad.name) {
          setActionError('You do not have a squad. Please create or join a squad first.');
          if (onViewMySquad) onViewMySquad();
          setJoiningTourneyId(null);
          return false;
        }

        // Check if user is squad captain
        const uEmail = (userProfile?.email || '').trim().toLowerCase();
        const uId = userProfile?.userId || (userProfile as any)?.id;
        const isCaptain = (userSquad.leaderId && (userSquad.leaderId === uId || userSquad.leaderId === userProfile?.userId)) ||
                          (userSquad.leaderEmail && userSquad.leaderEmail.toLowerCase() === uEmail) ||
                          userSquad.members?.some(
                            (m: any) => (m.email?.toLowerCase() === uEmail || m.userId === uId) && (m.isCaptain || m.role === 'leader')
                          );
        if (!isCaptain) {
          setActionError('Only the Squad Captain can register the squad for this tournament.');
          setJoiningTourneyId(null);
          return false;
        }

        // Ensure squad has 4 members
        if (!userSquad.members || userSquad.members.length < 4) {
          setActionError('Your squad must have 4 active members to join a Squad tournament.');
          setJoiningTourneyId(null);
          return false;
        }

        // Run Transaction to register squad with member collision checks
        await runTransaction(db, async (transaction) => {
          const tourneyRef = doc(db, 'tournaments_freefire', tournament.id);
          const tourneySnap = await transaction.get(tourneyRef);

          if (!tourneySnap.exists()) {
            throw new Error('Tournament no longer exists.');
          }

          const currentTourney = tourneySnap.data();
          const joinedSquads = currentTourney.joinedSquads || [];
          const maxSquads = currentTourney.maxSquads || 8;

          if (joinedSquads.length >= maxSquads) {
            throw new Error('Tournament squad slots are full!');
          }

          const isSquadAdminOrHost = isUserAdminOrHost || 
                                    currentTourney.hostId === userProfile.userId || 
                                    currentTourney.hostId === (userProfile as any).id ||
                                    (currentTourney.hostEmail && (currentTourney.hostEmail || '').toLowerCase() === normalizedUserEmail);

          // 1. COLLISION CHECK FIRST: Check if squad or any member in the squad is ALREADY registered for this tournament
          const userEmailNorm = (userProfile.email || '').trim().toLowerCase();
          const userIdNorm = userProfile.userId || (userProfile as any).id;
          const userSquadNameNorm = (userSquad.name || '').trim().toLowerCase();

          for (const existingSquad of joinedSquads) {
            const exNameNorm = (existingSquad.squadName || existingSquad.name || '').trim().toLowerCase();
            const exLeaderId = existingSquad.leaderId;
            const exLeaderEmail = (existingSquad.leaderEmail || '').trim().toLowerCase();

            const isSameSquad = (userSquadNameNorm && exNameNorm === userSquadNameNorm) ||
                                (exLeaderId && (exLeaderId === userIdNorm || exLeaderId === userProfile.userId)) ||
                                (exLeaderEmail && exLeaderEmail === userEmailNorm);

            if (isSameSquad) {
              throw new Error('Your squad is already registered for this tournament!');
            }
          }

          // 2. Specific Location Restriction Check
          if (currentTourney.locationRestrictionType) {
            if (currentTourney.locationRestrictionType === 'specific_division') {
              if (!userProfile.division || userProfile.division.trim().toLowerCase() !== (currentTourney.allowedDivision || '').trim().toLowerCase()) {
                throw new Error(`This tournament is restricted to squads from ${currentTourney.allowedDivision || 'specific'} Division. Your location (${userProfile.division || 'Not set'}) does not match.`);
              }
            } else if (currentTourney.locationRestrictionType === 'specific_district') {
              if (!userProfile.district || userProfile.district.trim().toLowerCase() !== (currentTourney.allowedDistrict || '').trim().toLowerCase()) {
                throw new Error(`This tournament is restricted to squads from ${currentTourney.allowedDistrict || 'specific'} District. Your location (${userProfile.district || 'Not set'}) does not match.`);
              }
            } else if (currentTourney.locationRestrictionType === 'specific_upazila') {
              if (!userProfile.upazila || userProfile.upazila.trim().toLowerCase() !== (currentTourney.allowedUpazila || '').trim().toLowerCase()) {
                throw new Error(`This tournament is restricted to squads from ${currentTourney.allowedUpazila || 'specific'} Upazila. Your location (${userProfile.upazila || 'Not set'}) does not match.`);
              }
            }
          }

          // 3. Regional representation check (excluding own squad)
          const rule = currentTourney.representationRule;

          if (rule && rule !== 'any') {
            if (rule === 'one_squad_per_upazila' || rule === 'one_player_per_upazila') {
              if (!userProfile.upazila || !userProfile.upazila.trim()) {
                throw new Error('Please set your Upazila in your Profile before joining this tournament.');
              }
              const normalizedUpa = userProfile.upazila.trim().toLowerCase();
              const otherSquadsInUpazila = joinedSquads.filter((s: any) => {
                const exNameNorm = (s.squadName || s.name || '').trim().toLowerCase();
                const exLeaderId = s.leaderId;
                const exLeaderEmail = (s.leaderEmail || '').trim().toLowerCase();
                const isSameSquad = (userSquadNameNorm && exNameNorm === userSquadNameNorm) || 
                                    (exLeaderId && (exLeaderId === userIdNorm || exLeaderId === userProfile.userId)) ||
                                    (exLeaderEmail && exLeaderEmail === userEmailNorm);
                return !isSameSquad;
              });

              const upazilaTaken = otherSquadsInUpazila.some((s: any) => s.upazila && s.upazila.trim().toLowerCase() === normalizedUpa) ||
                                   (currentTourney.registeredUpazilas || []).some((u: string) => u.trim().toLowerCase() === normalizedUpa);
              if (upazilaTaken) {
                throw new Error(`Someone has already joined from your Sub-district/Upazila (${userProfile.upazila}), and you cannot join. Only 1 squad per Upazila is allowed.`);
              }
            } else if (rule === 'one_squad_per_district' || rule === 'one_player_per_district') {
              if (!userProfile.district || !userProfile.district.trim()) {
                throw new Error('Please set your District in your Profile before joining this tournament.');
              }
              const normalizedDist = userProfile.district.trim().toLowerCase();
              const otherSquadsInDistrict = joinedSquads.filter((s: any) => {
                const exNameNorm = (s.squadName || s.name || '').trim().toLowerCase();
                const exLeaderId = s.leaderId;
                const exLeaderEmail = (s.leaderEmail || '').trim().toLowerCase();
                const isSameSquad = (userSquadNameNorm && exNameNorm === userSquadNameNorm) || 
                                    (exLeaderId && (exLeaderId === userIdNorm || exLeaderId === userProfile.userId)) ||
                                    (exLeaderEmail && exLeaderEmail === userEmailNorm);
                return !isSameSquad;
              });

              const districtTaken = otherSquadsInDistrict.some((s: any) => s.district && s.district.trim().toLowerCase() === normalizedDist) ||
                                    (currentTourney.registeredDistricts || []).some((d: string) => d.trim().toLowerCase() === normalizedDist);
              if (districtTaken) {
                throw new Error(`Someone has already joined from your District (${userProfile.district}), and you cannot join. Only 1 squad per District is allowed.`);
              }
            } else if (rule === 'one_squad_per_division' || rule === 'one_player_per_division') {
              if (!userProfile.division || !userProfile.division.trim()) {
                throw new Error('Please set your Division in your Profile before joining this tournament.');
              }
              const normalizedDiv = userProfile.division.trim().toLowerCase();
              const otherSquadsInDivision = joinedSquads.filter((s: any) => {
                const exNameNorm = (s.squadName || s.name || '').trim().toLowerCase();
                const exLeaderId = s.leaderId;
                const exLeaderEmail = (s.leaderEmail || '').trim().toLowerCase();
                const isSameSquad = (userSquadNameNorm && exNameNorm === userSquadNameNorm) || 
                                    (exLeaderId && (exLeaderId === userIdNorm || exLeaderId === userProfile.userId)) ||
                                    (exLeaderEmail && exLeaderEmail === userEmailNorm);
                return !isSameSquad;
              });

              const divisionTaken = otherSquadsInDivision.some((s: any) => s.division && s.division.trim().toLowerCase() === normalizedDiv) ||
                                   (currentTourney.registeredDivisions || []).some((v: string) => v.trim().toLowerCase() === normalizedDiv);
              if (divisionTaken) {
                throw new Error(`Someone has already joined from your Division (${userProfile.division}), and you cannot join. Only 1 squad per Division is allowed.`);
              }
            }
          }

          // Deduct Entry Fee from Captain's Wallet
          const userRef = doc(db, 'users', userProfile.userId);
          const userSnap = await transaction.get(userRef);
          if (!userSnap.exists()) throw new Error('User record missing');

          const userTokens = userSnap.data().tokens || 0;
          if (userTokens < entryFee) {
            throw new Error(`Insufficient tokens! Needed: ${entryFee}`);
          }

          if (entryFee > 0) {
            transaction.update(userRef, {
              tokens: userTokens - entryFee,
              updatedAt: new Date().toISOString()
            });

            // Wallet History (System & Global)
            const historyRef = doc(collection(db, 'wallet_history'));
            transaction.set(historyRef, {
              userId: userProfile.userId,
              userName: userProfile.displayName,
              type: 'debit',
              amount: entryFee,
              balanceAfter: userTokens - entryFee,
              description: `Tournament Entry Fee (${tournament.title})`,
              tournamentId: tournament.id,
              tournamentTitle: tournament.title,
              createdAt: serverTimestamp()
            });

            // User Personal Token Transactions (for Token Menu Vault History)
            const userTokenTxRef = doc(collection(db, 'users', userProfile.userId, 'tokenTransactions'));
            transaction.set(userTokenTxRef, {
              type: 'entry_fee',
              amount: entryFee,
              balanceAfter: userTokens - entryFee,
              tournamentId: tournament.id,
              tournamentNumber: tournament.tournamentNumber || '',
              tournamentTitle: tournament.title || 'Tournament',
              matchTitle: tournament.title || 'Tournament',
              description: `Squad Tournament Entry Fee (${tournament.title})`,
              reason: `Entry fee for tournament #${tournament.tournamentNumber || tournament.id} (${tournament.title})`,
              createdAt: serverTimestamp()
            });
          }

          // Register Squad
          const newSquadEntry = {
            id: `SQD-${Date.now()}`,
            name: userSquad.name,
            squadName: userSquad.name,
            leaderId: userProfile.userId,
            leaderName: userProfile.displayName,
            leaderEmail: userProfile.email,
            division: userProfile.division || null,
            district: userProfile.district || null,
            upazila: userProfile.upazila || null,
            members: userSquad.members,
            joinedAt: new Date().toISOString()
          };

          const updatedSquads = [...joinedSquads, newSquadEntry];
          
          // Recompute explicit regional lists from all registered squads
          const finalUpazilas = Array.from(new Set(
            updatedSquads.map((s: any) => s.upazila).filter(Boolean).map((u: string) => u.trim())
          ));
          const finalDistricts = Array.from(new Set(
            updatedSquads.map((s: any) => s.district).filter(Boolean).map((d: string) => d.trim())
          ));
          const finalDivisions = Array.from(new Set(
            updatedSquads.map((s: any) => s.division).filter(Boolean).map((v: string) => v.trim())
          ));

          transaction.update(tourneyRef, {
            joinedSquads: updatedSquads,
            joinedCount: updatedSquads.length * 4,
            registeredUpazilas: finalUpazilas,
            registeredDistricts: finalDistricts,
            registeredDivisions: finalDivisions,
            updatedAt: serverTimestamp()
          });
        });

        if (entryFee > 0) setTokens(prev => prev - entryFee);
        setActionSuccess(`Squad "${userSquad.name}" successfully registered for this tournament!`);
        return true;
      } else {
        // Solo Joining Flow
        await runTransaction(db, async (transaction) => {
          const tourneyRef = doc(db, 'tournaments_freefire', tournament.id);
          const tourneySnap = await transaction.get(tourneyRef);

          if (!tourneySnap.exists()) {
            throw new Error('Tournament no longer exists.');
          }

          const currentTourney = tourneySnap.data();
          const joinedPlayers = currentTourney.joinedPlayers || [];
          const maxPlayers = currentTourney.maxPlayers || 32;

          if (joinedPlayers.length >= maxPlayers) {
            throw new Error('Tournament slots are full!');
          }

          const isSoloAdminOrHost = isUserAdminOrHost || 
                                   currentTourney.hostId === userProfile.userId || 
                                   currentTourney.hostId === (userProfile as any).id ||
                                   (currentTourney.hostEmail && (currentTourney.hostEmail || '').toLowerCase() === normalizedUserEmail);

          // 1. COLLISION CHECK FIRST: Check if user already joined
          const userEmailNorm = (userProfile.email || '').trim().toLowerCase();
          const userIdNorm = userProfile.userId || (userProfile as any).id;
          const alreadyJoined = joinedPlayers.some((p: any) => 
            p.userId === userProfile.userId || 
            p.userId === userIdNorm ||
            p.uid === userProfile.userId ||
            p.uid === userIdNorm ||
            p.leaderId === userProfile.userId ||
            (p.email && p.email.trim().toLowerCase() === userEmailNorm)
          );
          if (alreadyJoined) {
            throw new Error('You have already joined this tournament!');
          }

          // 2. Specific Location Restriction Check
          if (currentTourney.locationRestrictionType) {
            if (currentTourney.locationRestrictionType === 'specific_division') {
              if (!userProfile.division || userProfile.division.trim().toLowerCase() !== (currentTourney.allowedDivision || '').trim().toLowerCase()) {
                throw new Error(`This tournament is restricted to players from ${currentTourney.allowedDivision || 'specific'} Division. Your location (${userProfile.division || 'Not set'}) does not match.`);
              }
            } else if (currentTourney.locationRestrictionType === 'specific_district') {
              if (!userProfile.district || userProfile.district.trim().toLowerCase() !== (currentTourney.allowedDistrict || '').trim().toLowerCase()) {
                throw new Error(`This tournament is restricted to players from ${currentTourney.allowedDistrict || 'specific'} District. Your location (${userProfile.district || 'Not set'}) does not match.`);
              }
            } else if (currentTourney.locationRestrictionType === 'specific_upazila') {
              if (!userProfile.upazila || userProfile.upazila.trim().toLowerCase() !== (currentTourney.allowedUpazila || '').trim().toLowerCase()) {
                throw new Error(`This tournament is restricted to players from ${currentTourney.allowedUpazila || 'specific'} Upazila. Your location (${userProfile.upazila || 'Not set'}) does not match.`);
              }
            }
          }

          // 3. Regional representation check (excluding own player)
          const rule = currentTourney.representationRule;

          if (rule && rule !== 'any') {
            const otherPlayers = joinedPlayers.filter((p: any) => 
              !(p.userId === userProfile.userId || 
                p.userId === userIdNorm ||
                p.uid === userProfile.userId ||
                p.uid === userIdNorm ||
                p.leaderId === userProfile.userId ||
                (p.email && p.email.trim().toLowerCase() === userEmailNorm))
            );

            if (rule === 'one_squad_per_upazila' || rule === 'one_player_per_upazila') {
              if (!userProfile.upazila || !userProfile.upazila.trim()) {
                throw new Error('Please set your Upazila in your Profile before joining this tournament.');
              }
              const normalizedUpa = userProfile.upazila.trim().toLowerCase();
              const upazilaTaken = otherPlayers.some((p: any) => p.upazila && p.upazila.trim().toLowerCase() === normalizedUpa) ||
                                   (currentTourney.registeredUpazilas || []).some((u: string) => u.trim().toLowerCase() === normalizedUpa);
              if (upazilaTaken) {
                throw new Error(`Someone has already joined from your Sub-district/Upazila (${userProfile.upazila}), and you cannot join. Only 1 player per Upazila is allowed.`);
              }
            } else if (rule === 'one_squad_per_district' || rule === 'one_player_per_district') {
              if (!userProfile.district || !userProfile.district.trim()) {
                throw new Error('Please set your District in your Profile before joining this tournament.');
              }
              const normalizedDist = userProfile.district.trim().toLowerCase();
              const districtTaken = otherPlayers.some((p: any) => p.district && p.district.trim().toLowerCase() === normalizedDist) ||
                                    (currentTourney.registeredDistricts || []).some((d: string) => d.trim().toLowerCase() === normalizedDist);
              if (districtTaken) {
                throw new Error(`Someone has already joined from your District (${userProfile.district}), and you cannot join. Only 1 player per District is allowed.`);
              }
            } else if (rule === 'one_squad_per_division' || rule === 'one_player_per_division') {
              if (!userProfile.division || !userProfile.division.trim()) {
                throw new Error('Please set your Division in your Profile before joining this tournament.');
              }
              const normalizedDiv = userProfile.division.trim().toLowerCase();
              const divisionTaken = otherPlayers.some((p: any) => p.division && p.division.trim().toLowerCase() === normalizedDiv) ||
                                   (currentTourney.registeredDivisions || []).some((v: string) => v.trim().toLowerCase() === normalizedDiv);
              if (divisionTaken) {
                throw new Error(`Someone has already joined from your Division (${userProfile.division}), and you cannot join. Only 1 player per Division is allowed.`);
              }
            }
          }

          // Deduct Entry Fee
          const userRef = doc(db, 'users', userProfile.userId);
          const userSnap = await transaction.get(userRef);
          if (!userSnap.exists()) throw new Error('User record missing');

          const userTokens = userSnap.data().tokens || 0;
          if (userTokens < entryFee) {
            throw new Error(`Insufficient tokens! Needed: ${entryFee}`);
          }

          if (entryFee > 0) {
            transaction.update(userRef, {
              tokens: userTokens - entryFee,
              updatedAt: new Date().toISOString()
            });

            // Wallet History (System & Global)
            const historyRef = doc(collection(db, 'wallet_history'));
            transaction.set(historyRef, {
              userId: userProfile.userId,
              userName: userProfile.displayName,
              type: 'debit',
              amount: entryFee,
              balanceAfter: userTokens - entryFee,
              description: `Solo Tournament Entry Fee (${tournament.title})`,
              tournamentId: tournament.id,
              tournamentTitle: tournament.title,
              createdAt: serverTimestamp()
            });

            // User Personal Token Transactions (for Token Menu Vault History)
            const userTokenTxRef = doc(collection(db, 'users', userProfile.userId, 'tokenTransactions'));
            transaction.set(userTokenTxRef, {
              type: 'entry_fee',
              amount: entryFee,
              balanceAfter: userTokens - entryFee,
              tournamentId: tournament.id,
              tournamentNumber: tournament.tournamentNumber || '',
              tournamentTitle: tournament.title || 'Tournament',
              matchTitle: tournament.title || 'Tournament',
              description: `Solo Tournament Entry Fee (${tournament.title})`,
              reason: `Entry fee for tournament #${tournament.tournamentNumber || tournament.id} (${tournament.title})`,
              createdAt: serverTimestamp()
            });
          }

          const newPlayerEntry = {
            userId: userProfile.userId,
            displayName: userProfile.displayName,
            gameName: userProfile.gameName || null,
            email: userProfile.email,
            photoURL: userProfile.photoURL || null,
            division: userProfile.division || null,
            district: userProfile.district || null,
            upazila: userProfile.upazila || null,
            joinedAt: new Date().toISOString()
          };

          const updatedPlayers = [...joinedPlayers, newPlayerEntry];
          
          // Recompute explicit regional lists from all registered players
          const finalUpazilas = Array.from(new Set(
            updatedPlayers.map((p: any) => p.upazila).filter(Boolean).map((u: string) => u.trim())
          ));
          const finalDistricts = Array.from(new Set(
            updatedPlayers.map((p: any) => p.district).filter(Boolean).map((d: string) => d.trim())
          ));
          const finalDivisions = Array.from(new Set(
            updatedPlayers.map((p: any) => p.division).filter(Boolean).map((v: string) => v.trim())
          ));

          transaction.update(tourneyRef, {
            joinedPlayers: updatedPlayers,
            joinedCount: updatedPlayers.length,
            registeredUpazilas: finalUpazilas,
            registeredDistricts: finalDistricts,
            registeredDivisions: finalDivisions,
            updatedAt: serverTimestamp()
          });
        });

        if (entryFee > 0) setTokens(prev => prev - entryFee);
        setActionSuccess(`Successfully joined ${tournament.title}!`);
        return true;
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to join tournament. Please try again.';
      // Log as info/notice for standard validation conditions, console.error only for unexpected issues
      if (
        msg.includes('already') ||
        msg.includes('restricted') ||
        msg.includes('Profile') ||
        msg.includes('registered') ||
        msg.includes('tokens') ||
        msg.includes('full')
      ) {
        console.log('Tournament registration validation notice:', msg);
      } else {
        console.error('Error joining tournament:', err);
      }
      setActionError(msg);
      return false;
    } finally {
      setJoiningTourneyId(null);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 pb-24 text-slate-100">
      {/* Header & Tabs */}
      <div className="flex flex-col items-center justify-center gap-6 px-2 mb-8 mt-4">
        <div className="flex items-center gap-2">
          <Flame className="w-6 h-6 text-cyan-400 animate-pulse" />
          <h1 className="text-xl font-black text-white uppercase tracking-wider font-mono">
            Global Tournaments
          </h1>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-3">
          {(['Open', 'Ongoing', 'Ended'] as const).map(status => (
            <button
              key={status}
              onClick={() => { setStatusFilter(status); setCurrentPage(1); }}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold font-mono uppercase transition-all border ${
                statusFilter === status 
                  ? status === 'Open' 
                    ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.2)]'
                    : status === 'Ongoing'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                    : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.2)]'
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700 hover:bg-slate-800'
              }`}
            >
              {status === 'Open' ? 'Registration' : status === 'Ongoing' ? 'Ongoing' : 'Completed'}
            </button>
          ))}
        </div>
      </div>

      {/* Notifications / Alerts */}
      <AnimatePresence>
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-rose-950/90 border border-rose-500/50 p-4 rounded-2xl flex items-start gap-3 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
          >
            <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-rose-200 leading-relaxed font-sans">
              {actionError}
            </div>
            <button onClick={() => setActionError(null)} className="text-rose-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="bg-emerald-950/90 border border-emerald-500/50 p-4 rounded-2xl flex items-start gap-3 shadow-[0_0_15px_rgba(16,185,129,0.2)]"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="flex-1 text-xs text-emerald-200 leading-relaxed font-sans">
              {actionSuccess}
            </div>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>


      {/* Tournaments Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-8 h-8 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-slate-400 font-mono">Loading global tournaments...</span>
        </div>
      ) : paginatedTournaments.length === 0 ? (
        <div className="bg-slate-900/60 border border-slate-800 p-12 rounded-3xl text-center space-y-3">
          <Swords className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-bold text-slate-300 font-mono uppercase">No Tournaments Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            There are no tournaments matching your active filters. Try clearing your search query or filters.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {paginatedTournaments.map((t) => {
            const isSquad = t.mode === 'squad';
            const maxCap = isSquad ? (t.maxSquads || 8) : (t.maxPlayers || 32);
            const joined = isSquad ? (t.joinedSquads?.length || 0) : (t.joinedPlayers?.length || t.joinedCount || 0);
            const isFull = joined >= maxCap;

            const isHostOrAdmin = Boolean(
              userProfile && (
                (userProfile as any).role === 'admin' ||
                (userProfile as any).role === 'host' ||
                (userProfile as any).role === 'owner_admin' ||
                (userProfile as any).role === 'main_admin' ||
                (userProfile as any).role === 'sub_admin' ||
                (userProfile as any).isAdmin === true ||
                (userProfile as any).isHost === true ||
                (userProfile as any).email === 'vortexesports150@gmail.com' ||
                (t.hostId && (t.hostId === userProfile.userId || t.hostId === (userProfile as any).uid)) ||
                (t.hostEmail && userProfile.email && t.hostEmail.toLowerCase() === userProfile.email.toLowerCase()) ||
                (t.createdBy && (t.createdBy === userProfile.userId || t.createdBy === (userProfile as any).uid)) ||
                (t.userId && (t.userId === userProfile.userId || t.userId === (userProfile as any).uid))
              )
            );

            let userAlreadyJoined = false;
            let userIsCaptainOfJoinedSquad = false;
            if (userProfile) {
              const uEmail = (userProfile.email || '').trim().toLowerCase();
              const uId = userProfile.userId || (userProfile as any).id || (userProfile as any).uid;
              
              const squadNamesToCheck = [
                ...(userTeams || []).map((t: any) => (t.name || t.squadName || '').trim().toLowerCase()),
                (effectiveSquad?.name || effectiveSquad?.squadName || '').trim().toLowerCase(),
                (userProfile.squad?.name || '').trim().toLowerCase(),
              ].filter(Boolean);

              const inJoinedSquads = (t.joinedSquads || []).some((squad: any) => {
                const sName = (squad.squadName || squad.name || '').trim().toLowerCase();
                const isLeader = (squad.leaderId && (squad.leaderId === uId || squad.leaderId === userProfile.userId || squad.leaderId === (userProfile as any).id)) || 
                                 (squad.leaderEmail && squad.leaderEmail.trim().toLowerCase() === uEmail);
                
                let isMember = false;
                if (squad.members && squad.members.some((m: any) => 
                  (m.userId && (m.userId === uId || m.userId === userProfile.userId || m.userId === (userProfile as any).id)) ||
                  (m.uid && (m.uid === uId || m.uid === userProfile.userId || m.uid === (userProfile as any).id)) ||
                  (m.email && m.email.trim().toLowerCase() === uEmail)
                )) {
                  isMember = true;
                }
                
                const isMatchingSquadName = sName && squadNamesToCheck.includes(sName);
                
                if (isLeader || isMember || isMatchingSquadName) {
                  if (isLeader) {
                    userIsCaptainOfJoinedSquad = true;
                  }
                  return true;
                }
                return false;
              });

              const inJoinedPlayers = (t.joinedPlayers || []).some((p: any) => {
                if (p.userId && (p.userId === uId || p.userId === userProfile.userId || p.userId === (userProfile as any).id)) return true;
                if (p.uid && (p.uid === uId || p.uid === userProfile.userId || p.uid === (userProfile as any).id)) return true;
                if (p.leaderId && (p.leaderId === uId || p.leaderId === userProfile.userId || p.leaderId === (userProfile as any).id)) return true;
                if (p.email && p.email.trim().toLowerCase() === uEmail) return true;
                if (p.userEmail && p.userEmail.trim().toLowerCase() === uEmail) return true;
                return false;
              });

              userAlreadyJoined = inJoinedSquads || inJoinedPlayers;
            }

            const isHighlighted = highlightedTournamentId === t.id;

            return (
              <motion.div
                key={t.id}
                id={`tournament-card-${t.id}`}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`backdrop-blur-md rounded-xl p-3 sm:p-3.5 space-y-2.5 relative overflow-visible flex flex-col justify-between mx-[14px] transition-all duration-300 group hover:-translate-y-0.5 ${
                  isHighlighted 
                    ? 'bg-[#0d1636] border-2 border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.55)] ring-4 ring-cyan-500/25 scale-[1.01]' 
                    : 'bg-[#0b1227]/95 border border-cyan-500/20 hover:border-cyan-400/50 shadow-[0_0_12px_rgba(6,182,212,0.04)] hover:shadow-[0_0_20px_rgba(6,182,212,0.15),0_0_12px_rgba(236,72,153,0.08)]'
                }`}
              >
                {/* Highlight Badge */}
                {isHighlighted && (
                  <div className="absolute -top-3 left-4 z-20 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-mono font-black text-[9px] uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.7)] animate-bounce">
                    <span>🎯</span>
                    <span>Tagged Tournament in Post</span>
                  </div>
                )}

                {/* Pulse Tagging Button (Top Right Floating: 80% outside, 20% inside card corner) */}
                {onTagTournamentForPulse && (userAlreadyJoined || isHostOrAdmin || userIsCaptainOfJoinedSquad) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const uProf = userProfile as any;
                      const playerGameName = uProf?.gameName || uProf?.inGameName || uProf?.gamerTag || uProf?.inGameUsername || uProf?.ign || uProf?.displayName || 'Vortex Gamer';
                      const playerSquadName = effectiveSquad?.teamName || effectiveSquad?.squadName || uProf?.squadName || uProf?.teamName || '';
                      onTagTournamentForPulse({
                        ...t,
                        type: 'tournament',
                        playerGameName,
                        playerSquadName
                      });
                    }}
                    className="absolute top-0 right-0 -translate-y-[65%] translate-x-[65%] w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 via-cyan-400 to-blue-500 shadow-[0_0_18px_rgba(6,182,212,0.8)] z-40 hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-cyan-100"
                    title="Tag this tournament in a Pulse post"
                  >
                    <Zap className="w-4 h-4 fill-slate-950 text-slate-950 shrink-0" />
                  </button>
                )}

                {/* Top Accent Bar (80% Neon Cyan, 20% Neon Magenta) */}
                <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-400 via-cyan-400 via-[80%] to-pink-500 rounded-t-xl" />


                {/* Tournament Title, Badges & Three-Dot Menu Header */}
                <div className="flex flex-col gap-2 border-b border-white/[0.06] pb-2">
                  {/* Highlighted Status Badges - Top Priority */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {(t.isMatchPlayed || t.matchPlayed || t.status === 'ResultUnderReview') && (
                      <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-500/15 border border-emerald-500/40 rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.15)] animate-pulse">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="text-[11px] font-black font-mono text-emerald-400 uppercase tracking-tighter">
                          Match Played
                        </span>
                      </div>
                    )}
                    {t.status === 'ResultUnderReview' && (
                      <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-cyan-500/15 border border-cyan-500/40 rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.15)] animate-pulse">
                        <Clock className="w-4 h-4 text-cyan-400" />
                        <span className="text-[11px] font-black font-mono text-cyan-400 uppercase tracking-tighter">
                          Under Review
                        </span>
                      </div>
                    )}
                    {t.status === 'ResultRejected' && (
                      <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-rose-500/15 border border-rose-500/40 rounded-lg shadow-[0_0_15px_rgba(244,63,94,0.15)]">
                        <AlertCircle className="w-4 h-4 text-rose-500" />
                        <span className="text-[11px] font-black font-mono text-rose-500 uppercase tracking-tighter">
                          Result Rejected
                        </span>
                      </div>
                    )}
                    {/* Rejection Reason display if rejected */}
                    {t.status === 'ResultRejected' && t.rejectionReason && (
                      <div className="mt-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg flex items-start gap-2">
                        <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                        <p className="text-[9px] text-rose-200 font-medium leading-relaxed italic">
                          <span className="font-black text-rose-400 uppercase not-italic">Reason: </span>
                          "{t.rejectionReason}"
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Control Bar (Row 1): Mode Badge, Announcement, Support, Host Controls */}
                  <div className="flex items-center justify-between gap-1.5 w-full pt-0.5">
                    {/* Mode Badge */}
                    <div className={`px-2 py-0.5 rounded-full border text-[8.5px] font-black font-mono uppercase shrink-0 ${
                      isSquad ? 'bg-cyan-950/60 text-cyan-300 border-cyan-500/40' : 'bg-pink-950/60 text-pink-300 border-pink-500/40'
                    }`}>
                      {isSquad ? 'Squad BR' : 'Solo BR'}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end pr-2">
                      {/* Announcement Icon Button at top right */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedAnnouncementTourney(t);
                          setTourneyAnnouncementText(t.announcement || '');
                          setAnnouncementError(null);
                          setAnnouncementSuccess(null);
                          setShowAnnouncementModal(true);
                        }}
                        className="p-1 px-1.5 rounded-lg bg-[#0c1227] border border-cyan-500/30 hover:border-cyan-400/60 hover:bg-cyan-950/40 text-slate-300 hover:text-cyan-400 transition-all cursor-pointer flex items-center gap-1 text-[9px] font-semibold shrink-0"
                        title="Tournament Announcements"
                      >
                        <Megaphone className="w-3.5 h-3.5 text-cyan-400 animate-bounce" style={{ animationDuration: '3s' }} />
                        <span>Announce</span>
                        {t.announcement && (
                          <span className="w-1.5 h-1.5 bg-pink-500 rounded-full animate-pulse shrink-0" />
                        )}
                      </button>

                      {/* Support Message/Chat Button at top right */}
                      <TournamentChatButton
                        tournament={t}
                        userProfile={userProfile}
                        getCanAnnounceTournament={getCanAnnounceTournament}
                        getIsJoinedTournament={getIsJoinedTournament}
                        onClick={() => {
                          setSelectedSupportTourney(t);
                          setNewSupportMessage('');
                          setShowSupportModal(true);
                        }}
                      />

                      {/* Host Three-Dot Options Menu */}
                      {isHostOrAdmin && (
                        <div className="relative z-[100]">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveMenuTourneyId(activeMenuTourneyId === t.id ? null : t.id);
                            }}
                            className="p-1.5 rounded-lg bg-slate-800/90 hover:bg-cyan-950 text-slate-300 hover:text-cyan-400 border border-slate-700/80 hover:border-cyan-500/50 transition-all cursor-pointer shadow-sm"
                            title="Host Controls"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {/* Dropdown Menu Popover */}
                          <AnimatePresence>
                            {activeMenuTourneyId === t.id && (
                              <>
                                {/* Backdrop overlay to close menu on outside click without blocking internal clicks */}
                                <div
                                  className="fixed inset-0 z-[9990] bg-black/10"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActiveMenuTourneyId(null);
                                  }}
                                />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                  onClick={(e) => e.stopPropagation()}
                                  className="absolute right-0 top-full mt-1.5 w-56 bg-slate-950 border border-cyan-500/50 rounded-xl shadow-[0_0_25px_rgba(0,0,0,0.9)] z-[9999] p-1.5 space-y-1"
                                >
                                  <div className="px-2 py-1 border-b border-slate-800 text-[9px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center justify-between">
                                    <span>Host Options</span>
                                    <span className="text-slate-500">#{t.id}</span>
                                  </div>

                                  {/* Manage Access Code - Only shown if tournament is Code Protected */}
                                  {(t.accessType === 'code' || t.accessCode) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setActiveMenuTourneyId(null);
                                        setHostCodeModalTourney(t);
                                        setInputAccessCode(t.accessCode || '');
                                        setCodeUpdateError(null);
                                        setCodeUpdateSuccess(null);
                                      }}
                                      onPointerDown={(e) => e.stopPropagation()}
                                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono font-bold text-slate-200 hover:bg-amber-950/80 hover:text-amber-300 flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      <span>Edit Access Code {t.accessCode ? `(${t.accessCode})` : ''}</span>
                                    </button>
                                  )}

                                  {/* Manage Invitations - Only shown if tournament is Invite Only */}
                                  {t.accessType === 'invite' && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setActiveMenuTourneyId(null);
                                        setHostInviteModalTourney(t);
                                        setInviteEmailInput('');
                                        setInviteModalError(null);
                                        setInviteModalSuccess(null);
                                      }}
                                      onPointerDown={(e) => e.stopPropagation()}
                                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono font-bold text-slate-200 hover:bg-purple-950/80 hover:text-purple-300 flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <UserPlus className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                      <span>Invite Players (Gmail)</span>
                                    </button>
                                  )}

                                  {/* Tournament Wallet Balance */}
                                  {(() => {
                                    const isSquad = t.mode === 'squad';
                                    const calculatedEntryFees = isSquad
                                      ? ((t.joinedSquads?.length || 0) * (Number(t.entryFee) || 0))
                                      : ((t.joinedPlayers?.length || t.joinedCount || 0) * (Number(t.entryFee) || 0));
                                    const walletBal = t.walletBalance !== undefined
                                      ? Number(t.walletBalance)
                                      : ((Number(t.walletTokens) || 0) + calculatedEntryFees);
                                    const isUnlocked = t.walletStatus === 'unlocked' || t.walletStatus === 'active';

                                    return (
                                      <div className="px-2.5 py-2 rounded-lg bg-slate-900 border border-white/5 font-mono text-[10px] space-y-0.5">
                                        <span className="text-slate-400 block font-bold">Tournament Wallet</span>
                                        <span className="text-amber-400 font-black text-xs flex items-center gap-1">
                                          <Coins className="w-3.5 h-3.5 text-amber-400" />
                                          🪙 {walletBal} Tk ({isUnlocked ? 'Unlocked' : 'Locked'})
                                        </span>
                                      </div>
                                    );
                                  })()}

                                  {/* See Results Option */}
                                  {(t.status === 'Ended' || t.status === 'Completed' || t.finalResultData || t.tempResultData || t.isMatchPlayed || t.matchPlayed) && (
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        e.preventDefault();
                                        setActiveMenuTourneyId(null);
                                        setViewingResultTourney(t);
                                      }}
                                      onPointerDown={(e) => e.stopPropagation()}
                                      className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono font-bold text-amber-300 hover:bg-amber-950/80 flex items-center gap-2 transition-colors cursor-pointer"
                                    >
                                      <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                      <span>See Full Results</span>
                                    </button>
                                  )}

                                  {/* Hide / Unhide & Delete Tournament (Only Owner Admin & Super Admin with Permission; Host Cannot) */}
                                  {canDeleteOrHide && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setActiveMenuTourneyId(null);
                                          setTourneyToHide({
                                            id: (t as any).docId || t.id,
                                            title: t.title || t.name || 'Tournament',
                                            isHidden: Boolean((t as any).isHidden)
                                          });
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono font-bold text-slate-200 hover:bg-amber-950/80 hover:text-amber-300 flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        {(t as any).isHidden ? <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                        <span>{(t as any).isHidden ? 'Unhide Tournament' : 'Hide Tournament'}</span>
                                      </button>

                                      <button
                                        type="button"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          e.preventDefault();
                                          setActiveMenuTourneyId(null);
                                          setTourneyToDelete({ id: (t as any).docId || t.id, title: t.title || t.name || 'Tournament' });
                                        }}
                                        onPointerDown={(e) => e.stopPropagation()}
                                        className="w-full text-left px-2.5 py-2 rounded-lg text-xs font-mono font-bold text-slate-200 hover:bg-rose-950/80 hover:text-rose-300 flex items-center gap-2 transition-colors cursor-pointer"
                                      >
                                        <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                        <span>Delete Tournament</span>
                                      </button>
                                    </>
                                  )}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Tournament Title & Details Row (Row 2): Positioned directly below the Announcement & Support icons */}
                  <div className="flex flex-col min-w-0 w-full mt-1.5 pt-1.5 border-t border-white/[0.04]">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="text-xs sm:text-sm font-black text-white font-mono leading-tight truncate group-hover:text-cyan-400 transition-colors">
                        {t.title}
                      </h3>
                      {t.status === 'Ongoing' && (
                        <span className="text-[8px] font-bold font-mono text-amber-400 bg-amber-950/80 border border-amber-500/40 px-1.5 py-0.5 rounded flex items-center gap-0.5 shrink-0 animate-pulse">
                          <Play className="w-2 h-2 fill-amber-400" />
                          Ongoing
                        </span>
                      )}
                    </div>

                    {/* Regional / Local Venue Address details - Directly under Tournament Title */}
                    {(t.isLocalVenue || t.localVenueName) && (
                      <div className="mt-1 inline-flex items-center gap-1 p-0.5 px-1.5 bg-cyan-950/60 border border-cyan-500/30 rounded text-[7px] sm:text-[7.5px] font-mono max-w-full overflow-hidden whitespace-nowrap self-start">
                        <div className="flex items-center gap-0.5 min-w-0 truncate text-cyan-300 font-bold">
                          <MapPin className="w-2 h-2 text-cyan-400 shrink-0" />
                          <span className="truncate">{t.localVenueName}</span>
                        </div>
                        {t.localUpazilaDistrict && (
                          <div className="text-slate-200/90 flex items-center gap-1 shrink-0 border-l border-cyan-500/40 pl-1">
                            <span className="text-cyan-400 shrink-0 text-[7px]">📍</span>
                            <span className="truncate font-semibold">{t.localUpazilaDistrict}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Room ID & Password Display Box if set */}
                {t.roomId && (isHostOrAdmin || (!isSquad && userAlreadyJoined) || (isSquad && userIsCaptainOfJoinedSquad)) && (
                  <div className="bg-slate-950/90 border border-cyan-500/40 rounded-lg p-2 space-y-1 font-mono text-[10px] sm:text-xs shadow-inner">
                    <div className="flex items-center justify-between text-[9px] text-cyan-400 font-bold uppercase tracking-wider">
                      <span className="flex items-center gap-1">
                        <Key className="w-2.5 h-2.5 text-cyan-400" />
                        Room Details
                      </span>
                      <span className="text-slate-500 text-[8px]">FF Custom</span>
                    </div>

                    <div className="grid grid-cols-2 gap-1.5 text-slate-200">
                      <div className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400 text-[9px]">ID:</span>
                        <div className="flex items-center gap-1 font-bold text-white">
                          <span>{t.roomId}</span>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigator.clipboard.writeText(t.roomId);
                              setCopiedField(`id-${t.id}`);
                              setTimeout(() => setCopiedField(null), 2000);
                            }}
                            className="text-cyan-400 hover:text-cyan-300 cursor-pointer p-0.5"
                            title="Copy Room ID"
                          >
                            {copiedField === `id-${t.id}` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                          </button>
                        </div>
                      </div>

                      <div className="bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800 flex items-center justify-between">
                        <span className="text-slate-400 text-[9px]">PASS:</span>
                        <div className="flex items-center gap-1 font-bold text-emerald-400">
                          <span>{t.roomPassword || t.roomPass || 'N/A'}</span>
                          {(t.roomPassword || t.roomPass) && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigator.clipboard.writeText(t.roomPassword || t.roomPass);
                                setCopiedField(`pass-${t.id}`);
                                setTimeout(() => setCopiedField(null), 2000);
                              }}
                              className="text-emerald-400 hover:text-emerald-300 cursor-pointer p-0.5"
                              title="Copy Password"
                            >
                              {copiedField === `pass-${t.id}` ? <Check className="w-2.5 h-2.5 text-emerald-400" /> : <Copy className="w-2.5 h-2.5" />}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {(t.youtubeLiveUrl || t.youtubeLiveLink || t.youtubeUrl) && (
                      <a
                        href={t.youtubeLiveUrl || t.youtubeLiveLink || t.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="mt-1 flex items-center justify-center gap-1 w-full py-1 px-2 rounded bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold text-[9.5px] font-mono shadow-[0_0_10px_rgba(239,68,68,0.25)] transition-all cursor-pointer"
                      >
                        <Video className="w-3 h-3 text-white" />
                        <span>Watch Live</span>
                        <ExternalLink className="w-2.5 h-2.5 text-white/80" />
                      </a>
                    )}
                  </div>
                )}

                {/* Match Result Display Box if set */}
                {(t.result || t.winnerName) && (
                  <div className="bg-purple-950/30 border border-purple-500/35 rounded-lg p-2 space-y-0.5 font-mono text-[10px] sm:text-xs">
                    <div className="flex items-center gap-1 text-[9.5px] text-purple-300 font-bold uppercase tracking-wider">
                      <Trophy className="w-3 h-3 text-yellow-400" />
                      <span>Match Result</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 text-slate-200 font-bold text-[10.5px]">
                      {(t.winnerName || t.result?.winnerName) ? (
                        <span className="text-yellow-300">🏆 Winner: {t.winnerName || t.result?.winnerName}</span>
                      ) : null}
                      {t.result?.runnerUp && (
                        <span className="text-slate-300">🥈 Runner-Up: {t.result.runnerUp}</span>
                      )}
                      {t.result?.topKills && (
                        <span className="text-rose-300">🎯 Top Kills: {t.result.topKills}</span>
                      )}
                    </div>
                    {t.result?.notes && (
                      <p className="text-[9.5px] text-slate-400 italic mt-0.5">{t.result.notes}</p>
                    )}
                  </div>
                )}

                {/* Tournament ID, Date & Time, Map */}
                <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-slate-400 font-mono">
                  <span className="flex items-center gap-0.5 text-cyan-300 font-bold">
                    <Hash className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                    <span>ID: #{t.id}</span>
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-0.5">
                    <Calendar className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                    <span>{t.time || `${t.matchDate || ''} ${t.matchTime || ''}`.trim() || 'TBA'}</span>
                  </span>
                  <span>•</span>
                  <span className="text-slate-300 font-bold">{t.map || 'Bermuda'}</span>
                </div>

                {/* Sponsor Banner (if active) - Placed below the date and time layout */}
                {t.hasSponsor && (t.sponsorName || t.sponsorLogoUrl || (t.sponsorType && t.sponsorType !== 'none')) && (() => {
                  const isLogoOnly = t.sponsorType === 'logo' || (!t.sponsorName && !!t.sponsorLogoUrl);

                  return (
                    <div 
                      onClick={(e) => {
                        if (t.sponsorLinkUrl) {
                          e.stopPropagation();
                          let link = t.sponsorLinkUrl.trim();
                          if (!link.startsWith('http://') && !link.startsWith('https://')) {
                            link = 'https://' + link;
                          }
                          window.open(link, '_blank', 'noopener,noreferrer');
                        }
                      }}
                      className={`relative bg-purple-950/40 border border-purple-500/35 p-1 sm:p-1.5 rounded-lg flex items-center justify-between gap-2 min-h-[36px] sm:min-h-[42px] shadow-sm ${
                        t.sponsorLinkUrl ? 'cursor-pointer hover:border-purple-400/60 transition-all' : ''
                      }`}
                    >
                      {isLogoOnly ? (
                        /* Sponsor Logo Only Mode: Logo with "SPONSORED BY" small text on left */
                        <div className="flex-1 flex items-center justify-center gap-2 min-w-0 py-0.5">
                          {t.sponsorLogoUrl ? (
                            <>
                              <div className="flex flex-col text-[7.5px] sm:text-[8.5px] font-mono font-black text-purple-300/90 uppercase tracking-widest leading-tight text-right shrink-0">
                                <span>SPONSORED</span>
                                <span>BY</span>
                              </div>
                              <img 
                                src={t.sponsorLogoUrl} 
                                alt="Sponsor Logo" 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSquarePreviewImage(t.sponsorLogoUrl || null);
                                }}
                                className="max-h-[26px] sm:max-h-[32px] max-w-[140px] sm:max-w-[180px] object-contain drop-shadow-[0_0_12px_rgba(168,85,247,0.5)] cursor-pointer hover:scale-105 transition-transform" 
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            </>
                          ) : (
                            <span className="text-[11px] font-mono font-bold text-purple-300 uppercase tracking-wider">
                              Sponsored Tournament
                            </span>
                          )}
                        </div>
                      ) : (
                        /* Sponsor Name Mode: Floating Photo Button + Name Text */
                        <>
                          {/* Floating Sponsor Photo Button */}
                          {t.sponsorLogoUrl && (
                            <div 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSquarePreviewImage(t.sponsorLogoUrl || null);
                              }}
                              className="relative -ml-2 sm:-ml-2.5 -my-2 sm:-my-2.5 shrink-0 group cursor-pointer z-10"
                              title="Click to view sponsor photo preview"
                            >
                              <img 
                                src={t.sponsorLogoUrl} 
                                alt={t.sponsorName || 'Sponsor Photo'} 
                                className="w-[42px] h-[42px] sm:w-[50px] sm:h-[50px] rounded-full border border-purple-400 bg-slate-900 object-cover shadow-[0_0_15px_rgba(168,85,247,0.7)] ring-1 ring-purple-500/35 group-hover:scale-105 active:scale-95 transition-transform" 
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                              <span className="absolute bottom-0 right-0 bg-purple-600 text-white p-1 rounded-full border border-purple-300 shadow-md">
                                <Sparkles className="w-2.5 h-2.5 text-yellow-300" />
                              </span>
                            </div>
                          )}

                          {/* Sponsor Text Information */}
                          <div className={`flex-1 flex flex-col justify-center min-w-0 ${t.sponsorLogoUrl ? 'pl-2' : ''}`}>
                            <div className="flex items-center gap-1">
                              {!t.sponsorLogoUrl && <Sparkles className="w-2.5 h-2.5 text-purple-400 shrink-0" />}
                              <span className="text-[8px] sm:text-[9px] text-purple-300 uppercase font-mono font-bold tracking-wider leading-none">
                                Sponsored By
                              </span>
                            </div>
                            <span className="text-[11px] sm:text-xs font-black text-white font-sans truncate mt-0.5 drop-shadow-sm">
                              {t.sponsorName || 'Official Partner'}
                            </span>
                          </div>
                        </>
                      )}

                      {/* Right: Visit Link Button */}
                      {t.sponsorLinkUrl ? (
                        <a
                          href={t.sponsorLinkUrl.startsWith('http') ? t.sponsorLinkUrl : `https://${t.sponsorLinkUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="px-2 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-md text-[9px] sm:text-[10px] font-bold flex items-center gap-1 transition-all shrink-0 shadow-[0_0_10px_rgba(168,85,247,0.35)] border border-purple-400/30"
                        >
                          <span>Visit</span>
                          <ExternalLink className="w-2.5 h-2.5 text-purple-200" />
                        </a>
                      ) : (
                        <div className="w-1 shrink-0" />
                      )}
                    </div>
                  );
                })()}


                {/* Prize Breakdown & Deposit Box */}
                <div className="bg-slate-950/60 border border-white/[0.04] rounded-lg p-2 sm:p-2.5 grid grid-cols-3 gap-1.5 text-[10px] font-mono">
                  <div className="bg-slate-900/40 border border-white/[0.02] hover:border-cyan-500/10 p-1.5 rounded-md flex flex-col justify-between transition-colors">
                    <span className="text-[7.5px] text-slate-400 uppercase tracking-wider font-semibold truncate">Prize Pool</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Trophy className="w-3 h-3 text-amber-400 shrink-0" />
                      <span className="text-[10px] font-black text-amber-300 truncate">🪙 {t.prizePool || 0}</span>
                    </div>
                  </div>

                  <div className="booyah-prize-card-badge p-1.5 rounded-md flex flex-col justify-between transition-colors shadow-sm">
                    <div className="flex items-center justify-between gap-0.5">
                      <span className="text-[7.5px] text-cyan-300 uppercase tracking-wider font-extrabold truncate drop-shadow-sm">Booyah (1st)</span>
                      <span className="px-1 py-[0.5px] bg-pink-500/30 border border-pink-400/50 rounded text-[6px] font-mono font-black text-pink-300 shrink-0 tracking-tighter">
                        BOOYAH
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Award className="w-3 h-3 text-cyan-300 booyah-icon-animated shrink-0" />
                      <span className="text-[10.5px] font-black booyah-text-animated truncate">🪙 {t.booyahPrize || 0}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-white/[0.02] hover:border-cyan-500/10 p-1.5 rounded-md flex flex-col justify-between transition-colors">
                    <span className="text-[7.5px] text-slate-400 uppercase tracking-wider font-semibold truncate">Runner-up</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Award className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="text-[10px] font-black text-emerald-300 truncate">🪙 {t.runnerUpPrize || 0}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-white/[0.02] hover:border-cyan-500/10 p-1.5 rounded-md flex flex-col justify-between transition-colors">
                    <span className="text-[7.5px] text-slate-400 uppercase tracking-wider font-semibold truncate">Per Kill</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Flame className="w-3 h-3 text-rose-400 shrink-0" />
                      <span className="text-[10px] font-black text-rose-300 truncate">🪙 {t.perKill || 0}</span>
                    </div>
                  </div>

                  <div className="bg-slate-900/40 border border-white/[0.02] hover:border-cyan-500/10 p-1.5 rounded-md flex flex-col justify-between transition-colors">
                    <span className="text-[7.5px] text-slate-400 uppercase tracking-wider font-semibold truncate">Entry Fee</span>
                    <div className="flex items-center gap-1 mt-0.5">
                      <Wallet className="w-3 h-3 text-slate-300 shrink-0" />
                      <span className="text-[10px] font-black text-slate-100 truncate">
                        {t.entryFee ? `🪙 ${t.entryFee}` : 'FREE'}
                      </span>
                    </div>
                  </div>

                  {(() => {
                    const isSquad = t.mode === 'squad';
                    const calculatedEntryFees = isSquad
                      ? ((t.joinedSquads?.length || 0) * (Number(t.entryFee) || 0))
                      : ((t.joinedPlayers?.length || t.joinedCount || 0) * (Number(t.entryFee) || 0));
                    const cardWalletBal = t.walletBalance !== undefined
                      ? Number(t.walletBalance)
                      : ((Number(t.walletTokens) || 0) + calculatedEntryFees);
                    const isUnlocked = t.walletStatus === 'unlocked' || t.walletStatus === 'active';

                    return (
                      <div className="bg-slate-900/40 border border-white/[0.02] hover:border-cyan-500/10 p-1.5 rounded-md flex flex-col justify-between transition-colors">
                        <span className="text-[7.5px] text-slate-400 uppercase tracking-wider font-semibold truncate">Wallet</span>
                        <div className="flex flex-col gap-0.5 mt-0.5 min-w-0">
                          <div className="flex items-center gap-1">
                            <Coins className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="text-[10px] font-black text-emerald-300 truncate">🪙 {cardWalletBal}</span>
                          </div>
                          <div className={`inline-flex items-center gap-0.5 text-[6.5px] px-0.5 py-0.2 rounded border w-fit shrink-0 ${
                            isUnlocked 
                              ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                              : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                          }`}>
                            {isUnlocked ? <Unlock className="w-1.5 h-1.5 shrink-0" /> : <Lock className="w-1.5 h-1.5 shrink-0" />}
                            <span>{isUnlocked ? 'UNL' : 'LCK'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {/* Joined Capacity & Roster Button with Progress Bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <div className="text-slate-300 font-medium">
                      Joined: <span className="text-cyan-400 font-bold">{joined}</span> / {maxCap} {isSquad ? 'Squads' : 'Players'}
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => setShowRulesTourney(t)}
                        className="text-[10.5px] font-black text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-0.5 cursor-pointer transition-colors"
                      >
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        <span>Rules</span>
                      </button>
                      <span className="text-slate-700">|</span>
                      <button
                        onClick={() => setRosterModalTourney(t)}
                        className="text-[10.5px] font-black text-cyan-400 hover:text-cyan-300 hover:underline flex items-center gap-0.5 cursor-pointer transition-colors"
                      >
                        <Users className="w-3 h-3 shrink-0" />
                        <span>View Roster</span>
                      </button>
                    </div>
                  </div>
                  {/* Progress Bar */}
                  <div className="w-full h-1 bg-slate-950 rounded-full overflow-hidden border border-white/[0.04]">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-500" 
                      style={{ width: `${Math.min(100, (joined / maxCap) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Location Restriction Text */}
                {(() => {
                  const isAllBd = !t.locationRestrictionType || t.locationRestrictionType === 'all_bangladesh';
                  const repRuleText = 
                    t.representationRule === 'one_squad_per_upazila' ? (isSquad ? '1 Squad per Upazila' : '1 Player per Upazila') :
                    t.representationRule === 'one_squad_per_district' ? (isSquad ? '1 Squad per District' : '1 Player per District') :
                    t.representationRule === 'one_squad_per_division' ? (isSquad ? '1 Squad per Division' : '1 Player per Division') : null;

                  let locText = '';
                  if (t.locationRestrictionType === 'specific_division') {
                    locText = `${t.allowedDivision || ''} Division Only`;
                  } else if (t.locationRestrictionType === 'specific_district') {
                    locText = `${t.allowedDistrict || ''} District Only`;
                  } else if (t.locationRestrictionType === 'specific_upazila') {
                    locText = `${t.allowedUpazila || ''} Upazila Only`;
                  } else {
                    locText = 'All Bangladesh';
                  }

                  let ruleText = '';
                  if (repRuleText) {
                    ruleText = repRuleText;
                  } else {
                    ruleText = isSquad ? 'Multi-Squad' : 'Open to All';
                  }

                  const displayStr = `${locText} • ${ruleText}`;
                  return (
                    <div className="flex items-center gap-1 text-[8.5px] font-mono uppercase text-cyan-400 border border-cyan-500/20 bg-cyan-950/20 px-2 py-1 rounded-lg mt-1 mb-0.5 max-w-full overflow-hidden select-none">
                      <Shield className="w-3 h-3 text-cyan-400 shrink-0" />
                      <div className="truncate flex items-center gap-0.5">
                        <span className="font-bold text-cyan-400 shrink-0">Restriction:</span>
                        <span className="text-slate-300 truncate">{displayStr}</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Bottom Row: Join Action Button */}
                <div className="pt-1.5 border-t border-white/[0.06] flex items-center justify-between gap-2.5 w-full">
                  {/* Left side: Quick status indicator */}
                  <div className="flex items-center gap-2 flex-wrap">
                    {t.status === 'Ended' ? (
                      <div className="flex items-center gap-1 text-[9px] font-mono uppercase text-slate-500">
                        <span className="w-1 h-1 rounded-full bg-slate-500" />
                        <span>Ended</span>
                      </div>
                    ) : isFull ? (
                      <div className="flex items-center gap-1 text-[9px] font-mono uppercase text-amber-500">
                        <span className="w-1 h-1 rounded-full bg-amber-500 animate-pulse" />
                        <span>Full</span>
                      </div>
                    ) : statusFilter === 'Open' ? (
                      <div className="flex items-center gap-1 text-[9px] font-mono uppercase text-emerald-400">
                        <span className="w-1 h-1 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Open</span>
                      </div>
                    ) : null}
                  </div>

                  {/* Right side: Join Action Button with Access Control */}
                  {statusFilter === 'Open' && (() => {
                    const currentUserEmail = (userProfile?.email || '').toLowerCase();
                    const squadEmails = (userProfile?.squad?.members || []).map((m: any) => (m.email || '').toLowerCase());
                    const isUserInvited = (t.invitedEmails || []).some((e: string) => {
                      const clean = (e || '').toLowerCase();
                      return clean === currentUserEmail || squadEmails.includes(clean);
                    });
                    const isInviteOnlyMode = t.accessType === 'invite';
                    const isCodeProtected = t.accessType === 'code';

                    if (userAlreadyJoined) {
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            const userSquad = userProfile?.squad;
                            const uSquadName = (userSquad?.name || '').trim().toLowerCase();
                            const uEmail = (userProfile?.email || '').trim().toLowerCase();
                            const uId = userProfile?.userId || (userProfile as any)?.id;
                            
                            const registeredSq = (t.joinedSquads || []).find((sq: any) => {
                              const sName = (sq.squadName || sq.name || '').trim().toLowerCase();
                              if (uSquadName && sName && sName === uSquadName) return true;
                              if (sq.leaderId && (sq.leaderId === uId || sq.leaderId === userProfile?.userId)) return true;
                              if (sq.members && sq.members.some((m: any) => 
                                (m.userId && (m.userId === uId || m.userId === userProfile?.userId)) ||
                                (m.email && m.email.trim().toLowerCase() === uEmail)
                              )) return true;
                              return false;
                            }) || userSquad;

                            setAlreadyJoinedModalTourney({ tourney: t, squad: registeredSq });
                          }}
                          className="w-[40%] px-2.5 py-2 sm:py-2.5 rounded-lg text-[10.5px] sm:text-xs font-bold uppercase tracking-wider bg-emerald-900/40 hover:bg-emerald-800/60 text-emerald-400 border border-emerald-500/40 cursor-pointer flex items-center justify-center gap-1 transition-all"
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                          <span>Joined</span>
                        </button>
                      );
                    }

                    if (isFull) {
                      return (
                        <button
                          disabled
                          className="w-[40%] px-2.5 py-2 sm:py-2.5 rounded-lg text-[10.5px] sm:text-xs font-bold uppercase tracking-wider bg-slate-800 text-slate-500 cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          <span>Full</span>
                        </button>
                      );
                    }

                    if (t.status === 'Ended') {
                      return (
                        <button
                          disabled
                          className="w-[40%] px-2.5 py-2 sm:py-2.5 rounded-lg text-[10.5px] sm:text-xs font-bold uppercase tracking-wider bg-slate-900 text-slate-600 border border-slate-800 cursor-not-allowed flex items-center justify-center gap-1"
                        >
                          <span>Ended</span>
                        </button>
                      );
                    }

                    if (isInviteOnlyMode && !isUserInvited && !isHostOrAdmin) {
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setActionError(`This tournament is Invite Only. Contact host (${t.hostName || 'Host'}) to invite your Gmail (${currentUserEmail || 'your email'})!`);
                          }}
                          className="w-[40%] px-2.5 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-purple-950/60 hover:bg-purple-900/80 text-purple-300 border border-purple-500/50 cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Lock className="w-2.5 h-2.5 text-purple-400 shrink-0" />
                          <span className="truncate">Invite</span>
                        </button>
                      );
                    }

                    if (isCodeProtected) {
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            setCodeJoinModalTourney(t);
                            setEnteredAccessCode('');
                            setCodeModalError(null);
                          }}
                          className="w-[40%] px-2.5 py-2 sm:py-2.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider bg-amber-950/80 hover:bg-amber-900/90 text-amber-300 border border-amber-500/60 cursor-pointer flex items-center justify-center gap-1"
                        >
                          <Key className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                          <span className="truncate">Code</span>
                        </button>
                      );
                    }

                    const handleJoinClick = () => {
                      setActionError(null);
                      setActionSuccess(null);

                      if (t.mode === 'squad') {
                        const userSquad = effectiveSquad;
                        if (!userSquad || !userSquad.name) {
                          setActionError('You do not have a squad. Please create a squad from the Created Squad tab first.');
                          setSquadNoticeModal({
                            title: 'No Squad Found',
                            message: 'You must create or join a squad with 4 active members before registering for squad tournaments.',
                          });
                          if (onViewMySquad) onViewMySquad();
                          return;
                        }

                        const uSquadName = (userSquad.name || userSquad.squadName || '').trim().toLowerCase();
                        const uEmail = (userProfile?.email || '').trim().toLowerCase();
                        const uId = userProfile?.userId || (userProfile as any)?.id;

                        const alreadyInSquads = (t.joinedSquads || []).find((sq: any) => {
                          const sName = (sq.squadName || sq.name || '').trim().toLowerCase();
                          if (uSquadName && sName && sName === uSquadName) return true;
                          if (sq.leaderId && (sq.leaderId === uId || sq.leaderId === userProfile?.userId)) return true;
                          if (sq.members && sq.members.some((m: any) => 
                            (m.userId && (m.userId === uId || m.userId === userProfile?.userId)) ||
                            (m.email && m.email.trim().toLowerCase() === uEmail)
                          )) return true;
                          return false;
                        });

                        if (alreadyInSquads || userAlreadyJoined) {
                          setAlreadyJoinedModalTourney({ tourney: t, squad: alreadyInSquads || userSquad });
                          return;
                        }

                        const isCaptain = (userSquad.leaderId && (userSquad.leaderId === uId || userSquad.leaderId === userProfile?.userId)) ||
                                          (userSquad.leaderEmail && userSquad.leaderEmail.toLowerCase() === uEmail) ||
                                          userSquad.members?.some(
                                            (m: any) => (m.email?.toLowerCase() === uEmail || m.userId === uId) && (m.isCaptain || m.role === 'leader')
                                          );

                        if (!isCaptain) {
                          setSquadNoticeModal({
                            title: 'Captain Registration Required',
                            message: `You are a member of squad "${userSquad.name}". Only your Squad Captain can register the team for squad tournaments.`,
                            squad: userSquad,
                          });
                          return;
                        }

                        if (!userSquad.members || userSquad.members.length < 4) {
                          setSquadNoticeModal({
                            title: '4 Members Required',
                            message: `Your squad "${userSquad.name}" currently has ${userSquad.members?.length || 0} member(s). A squad must have exactly 4 active members to join a squad tournament.`,
                            squad: userSquad,
                          });
                          return;
                        }

                        if (onInitiateSquadJoin) {
                          onInitiateSquadJoin(t, userSquad);
                          return;
                        }
                      }

                      setConfirmJoinTourney(t);
                    };

                    if (isInviteOnlyMode && (isUserInvited || isHostOrAdmin)) {
                      return (
                        <button
                          type="button"
                          onClick={handleJoinClick}
                          className="w-[40%] px-2.5 py-2 sm:py-2.5 rounded-lg text-[10.5px] sm:text-xs font-black uppercase tracking-wider bg-gradient-to-r from-cyan-500 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-slate-950 shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer flex items-center justify-center gap-1 transition-all"
                        >
                          <Sparkles className="w-3 h-3 text-slate-950" />
                          <span>Accept</span>
                        </button>
                      );
                    }

                    return (
                      <button
                        type="button"
                        onClick={handleJoinClick}
                        disabled={joiningTourneyId === t.id}
                        className="w-[40%] px-2.5 py-2 sm:py-2.5 rounded-lg text-[10.5px] sm:text-xs font-black italic uppercase tracking-wider transition-all shadow-md flex items-center justify-center gap-1 bg-slate-900 border border-cyan-500/60 hover:border-pink-500/60 text-cyan-400 hover:text-pink-400 shadow-[0_0_12px_rgba(6,182,212,0.15)] hover:shadow-[0_0_12px_rgba(236,72,153,0.15)] cursor-pointer"
                      >
                        {joiningTourneyId === t.id ? (
                          <>
                            <div className="w-3.5 h-3.5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                            <span className="truncate text-cyan-400">Reg...</span>
                          </>
                        ) : (
                          <>
                            <Flame className="w-3.5 h-3.5 shrink-0 fill-current" />
                            <span className="truncate uppercase font-serif">Join</span>
                          </>
                        )}
                      </button>
                    );
                  })()}

                  {/* Non-Open Tournaments Action (e.g. See Results) */}
                  {statusFilter !== 'Open' && (
                    (t.status === 'Ended' || t.status === 'Completed' || t.finalResultData || t.tempResultData || t.isMatchPlayed || t.matchPlayed) ? (
                      <button
                        type="button"
                        onClick={() => setViewingResultTourney(t)}
                        className="px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/50 cursor-pointer flex items-center justify-center gap-1.5 transition-all shadow-[0_0_12px_rgba(245,158,11,0.2)] font-mono"
                      >
                        <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span>See Results</span>
                      </button>
                    ) : (
                      <div className="text-[9px] font-mono text-slate-400 uppercase px-2 py-1 bg-slate-900/80 rounded border border-white/5 font-bold">
                        {t.status || 'Ongoing'}
                      </div>
                    )
                  )}
                </div>

                {/* Host Details Displayed at the Bottom of the Card */}
                <div className="flex items-center justify-between gap-2 bg-slate-950/60 border border-white/[0.04] px-2.5 py-1.5 rounded-lg shadow-inner mt-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <img
                      src={t.hostPhotoUrl || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80'}
                      alt={t.hostName}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (t.hostId) {
                          setSelectedHostForModal({
                            hostId: t.hostId,
                            hostName: t.hostName || 'Official Host',
                            hostPhotoUrl: t.hostPhotoUrl
                          });
                        }
                      }}
                      className="w-6.5 h-6.5 rounded-full border border-cyan-400/40 object-cover shrink-0 cursor-pointer hover:border-cyan-300 hover:scale-105 transition-all shadow-sm"
                      title="Click to view host profile"
                    />
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span 
                          onClick={(e) => {
                            e.stopPropagation();
                            if (t.hostId) {
                              setSelectedHostForModal({
                                hostId: t.hostId,
                                hostName: t.hostName || 'Official Host',
                                hostPhotoUrl: t.hostPhotoUrl
                              });
                            }
                          }}
                          className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-wider truncate cursor-pointer hover:text-cyan-300 transition-colors underline decoration-cyan-500/20"
                          title="Click to view host profile"
                        >
                          HOST: {t.hostName || 'Official Host'}
                        </span>

                        <HostFollowButton 
                          hostId={t.hostId || (t as any).hostUserId || (t as any).createdBy || 'official_host'} 
                          currentUserId={userProfile?.userId || (userProfile as any)?.uid || (userProfile as any)?.id} 
                          followType="host"
                        />
                      </div>
                      <span className="text-[8px] text-slate-400 font-mono truncate">
                        Host • TRN #{t.tournamentNumber || '101'}
                      </span>
                    </div>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Roster / Joined Roster Modal */}
      {rosterModalTourney && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 w-full max-w-xl max-h-[80vh] overflow-y-auto space-y-4 shadow-2xl relative"
          >
            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-black text-white uppercase font-mono">
                  Registered Roster - {rosterModalTourney.title}
                </h3>
              </div>
              <button
                onClick={() => setRosterModalTourney(null)}
                className="p-1 bg-slate-800 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {rosterModalTourney.mode === 'squad' ? (
              /* Squad Roster Listing */
              <div className="space-y-3">
                {(!rosterModalTourney.joinedSquads || rosterModalTourney.joinedSquads.length === 0) ? (
                  <p className="text-xs text-slate-400 text-center py-6 font-mono">No squads registered yet.</p>
                ) : (
                  rosterModalTourney.joinedSquads.map((sqd: any, idx: number) => (
                    <div key={sqd.id || idx} className="bg-slate-950 border border-slate-800 rounded-xl p-3.5 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <span className="text-xs font-black text-cyan-300 font-mono flex items-center gap-2">
                          {sqd.logoUrl && (
                            <img src={sqd.logoUrl} alt={sqd.name} className="w-5 h-5 rounded object-cover border border-cyan-500/30 shrink-0" />
                          )}
                          {idx + 1}. {sqd.name || sqd.squadName}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Captain: <strong className="text-amber-400">{sqd.leaderName}</strong>
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                        {(sqd.members || []).map((m: any, mIdx: number) => {
                          const profilePic = m.photoURL || m.photoUrl || m.avatarUrl || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80';
                          const mUid = m.userId || m.uid || m.id;
                          const inGameName = m.gameName || m.ingameName || (mUid && rosterGameNames[mUid]) || m.displayName || m.email?.split('@')[0] || `Player ${mIdx + 1}`;

                          return (
                            <div key={mIdx} className="bg-slate-900/80 p-2 rounded-lg border border-slate-800 flex items-center gap-2">
                              <img
                                src={profilePic}
                                alt={inGameName}
                                className="w-8 h-8 rounded-full object-cover border border-cyan-500/40 shrink-0"
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0 flex-1">
                                <span className="text-[11px] font-bold text-slate-200 block truncate" title={inGameName}>
                                  {inGameName}
                                </span>
                                {(m.isCaptain || m.role === 'leader' || (sqd.leaderEmail && m.email?.toLowerCase() === sqd.leaderEmail.toLowerCase())) && (
                                  <span className="text-[8px] text-amber-400 font-bold uppercase block">Captain</span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : (
              /* Solo Player Roster Listing */
              <div className="space-y-2">
                {(!rosterModalTourney.joinedPlayers || rosterModalTourney.joinedPlayers.length === 0) ? (
                  <p className="text-xs text-slate-400 text-center py-6 font-mono">No players registered yet.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {rosterModalTourney.joinedPlayers.map((p: any, idx: number) => {
                      const pUid = p.userId || p.uid || p.id;
                      const inGameName = p.gameName || p.ingameName || (pUid && rosterGameNames[pUid]) || p.displayName || `Player #${idx + 1}`;
                      return (
                      <div key={pUid || idx} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center gap-2.5">
                        <img
                          src={p.photoURL || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80'}
                          alt={inGameName}
                          className="w-8 h-8 rounded-full object-cover border border-slate-700"
                        />
                        <div className="min-w-0 flex-1">
                          <span className="text-xs font-bold text-slate-200 block truncate" title={inGameName}>{inGameName}</span>
                          <span className="text-[9px] text-slate-500 font-mono">Player #{idx + 1}</span>
                        </div>
                      </div>
                    )})}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative bg-slate-900 border border-cyan-500/30 p-2 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.3)] max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="absolute -top-4 -right-4 bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg border border-white/20 transition-colors z-10 cursor-pointer"
              onClick={() => setPreviewImage(null)}
            >
              ✕
            </button>
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-[90vw] max-h-[85vh] rounded-xl object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* Join Confirmation Modal */}
      {confirmJoinTourney && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-4 sm:p-6 w-full max-w-lg space-y-4 shadow-[0_0_50px_rgba(6,182,212,0.25)] relative my-auto"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-500 fill-red-500 shrink-0" />
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono">
                  {confirmJoinTourney.mode === 'squad' ? 'Confirm Squad Join' : 'Confirm Registration'}
                </h3>
              </div>
              <button
                onClick={() => setConfirmJoinTourney(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tournament Details Brief */}
            <div className="bg-slate-950/90 p-3.5 rounded-xl border border-cyan-500/30 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-start gap-2">
                <h4 className="text-sm font-black text-white">{confirmJoinTourney.title}</h4>
                <span className="text-[10px] text-cyan-400 font-bold bg-cyan-950 px-2 py-0.5 rounded border border-cyan-500/30 shrink-0">
                  TRN #{confirmJoinTourney.tournamentNumber || '101'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1.5 border-t border-white/10">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Mode</span>
                  <span className="font-bold text-cyan-300">
                    {confirmJoinTourney.mode === 'squad' ? 'Squad BR' : 'Solo BR'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Entry Fee</span>
                  <span className="font-bold text-amber-400">
                    {confirmJoinTourney.entryFee ? `🪙 ${confirmJoinTourney.entryFee} Tk` : 'FREE Entry'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Prize Pool</span>
                  <span className="font-bold text-emerald-400">
                    🪙 {confirmJoinTourney.prizePool || 0} Tk
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Match Time</span>
                  <span className="font-bold text-slate-200 truncate block">
                    {confirmJoinTourney.time || `${confirmJoinTourney.matchDate || ''} ${confirmJoinTourney.matchTime || ''}`}
                  </span>
                </div>
              </div>
            </div>

            {/* If Squad Tournament: Show Squad Profile Card & 4 Members */}
            {confirmJoinTourney.mode === 'squad' && effectiveSquad && (
              <div className="bg-slate-950/95 rounded-xl border border-cyan-500/40 overflow-hidden space-y-3 p-3">
                <div className="relative h-24 sm:h-28 rounded-lg overflow-hidden border border-white/10">
                  <img
                    src={
                      effectiveSquad.coverUrl ||
                      effectiveSquad.coverPhoto ||
                      effectiveSquad.photoUrl ||
                      'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1000&auto=format&fit=crop&q=80'
                    }
                    alt="Squad Cover"
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent flex items-end p-2.5">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-lg bg-cyan-950 border border-cyan-400/60 p-0.5 shadow-lg overflow-hidden shrink-0">
                        <img
                          src={
                            effectiveSquad.logoUrl ||
                            effectiveSquad.photoUrl ||
                            'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80'
                          }
                          alt="Squad Logo"
                          className="w-full h-full object-cover rounded"
                          referrerPolicy="no-referrer"
                        />
                      </div>
                      <div>
                        <span className="text-xs font-black text-cyan-400 uppercase tracking-wider block font-mono">
                          {effectiveSquad.name}
                        </span>
                        <span className="text-[10px] text-slate-300 font-mono">
                          Squad Leader: <strong className="text-amber-400">{effectiveSquad.leaderName || userProfile?.displayName}</strong>
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 4 Squad Members Display */}
                <div>
                  <span className="text-[11px] font-bold text-slate-400 font-mono uppercase tracking-wider block mb-2">
                    Squad Members Roster (4 Players)
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    {(effectiveSquad.members || []).map((m: any, idx: number) => {
                      const profilePic = m.photoURL || m.photoUrl || m.avatarUrl || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80';
                      const inGameName = m.gameName || m.ingameName || m.displayName || m.email?.split('@')[0] || `Member #${idx + 1}`;
                      return (
                        <div
                          key={m.userId || m.email || idx}
                          className="bg-slate-900 border border-slate-800 p-2 rounded-lg flex items-center gap-2"
                        >
                          <img
                            src={profilePic}
                            alt={inGameName}
                            className="w-7 h-7 rounded-full object-cover border border-cyan-500/30 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0 flex-1">
                            <span className="text-[11px] font-bold text-slate-200 truncate block">
                              {inGameName}
                            </span>
                            <span className="text-[9px] text-amber-400 font-mono font-bold block">
                              {m.isCaptain || m.role === 'leader' ? '👑 Captain' : '🛡️ Member'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {actionError && (
              <div className="bg-rose-950/80 border border-rose-500/80 rounded-xl p-3 text-[11px] text-rose-200 flex items-start gap-2.5 font-mono animate-shake">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <span>{actionError}</span>
              </div>
            )}

            {/* Floating Confirmation Banner */}
            <div className="bg-cyan-950/70 border border-cyan-500/50 p-3 rounded-xl shadow-lg space-y-2 text-center">
              <p className="text-xs text-cyan-200 font-bold font-mono">
                {confirmJoinTourney.mode === 'squad'
                  ? `Are you sure you want to join with squad "${effectiveSquad?.name || 'your squad'}"?`
                  : 'Are you sure you want to register for this tournament?'}
              </p>
              {confirmJoinTourney.entryFee ? (
                <p className="text-[11px] text-amber-300 font-mono">
                  🪙 {confirmJoinTourney.entryFee} Tk will be deducted from your wallet balance.
                </p>
              ) : null}
            </div>

            {/* Floating Action Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmJoinTourney(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={joiningTourneyId === confirmJoinTourney.id}
                onClick={async () => {
                  const tourneyToJoin = confirmJoinTourney;
                  const success = await handleJoinTournament(tourneyToJoin);
                  if (success) setConfirmJoinTourney(null);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-500 hover:from-cyan-400 hover:to-pink-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {joiningTourneyId === confirmJoinTourney.id ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Flame className="w-4 h-4 text-slate-950 fill-slate-950 shrink-0" />
                )}
                <span>
                  {joiningTourneyId === confirmJoinTourney.id
                    ? 'Registering...'
                    : confirmJoinTourney.mode === 'squad'
                    ? `Confirm & Join with ${userProfile?.squad?.name || 'Squad'}`
                    : 'Confirm & Join'}
                </span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Already Joined Warning Modal */}
      {alreadyJoinedModalTourney && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-emerald-500/50 rounded-2xl p-5 w-full max-w-md space-y-4 shadow-[0_0_50px_rgba(16,185,129,0.25)] relative my-auto"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0" />
                <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
                  Already Registered
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAlreadyJoinedModalTourney(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* User Warning Message */}
            <div className="bg-emerald-950/70 border border-emerald-500/50 rounded-xl p-3 text-xs text-emerald-200 font-mono space-y-1">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{alreadyJoinedModalTourney.tourney?.mode === 'squad' ? 'Squad Tournament Active Entry' : 'Tournament Active Entry'}</span>
              </div>
              <p className="leading-relaxed">
                {alreadyJoinedModalTourney.tourney?.mode === 'squad' ? (
                  <>
                    You are already on a team, or in a squad, and you are already joined with squad{' '}
                    <strong className="text-amber-300 uppercase">
                      "{alreadyJoinedModalTourney.squad?.squadName || alreadyJoinedModalTourney.squad?.name || userProfile?.squad?.name || 'your squad'}"
                    </strong>{' '}
                    for tournament <span className="text-cyan-300 font-bold">"{alreadyJoinedModalTourney.tourney?.title}"</span>!
                  </>
                ) : (
                  <>
                    You are already registered for tournament <span className="text-cyan-300 font-bold">"{alreadyJoinedModalTourney.tourney?.title}"</span>!
                  </>
                )}
              </p>
            </div>

            {/* Squad Preview Card */}
            {alreadyJoinedModalTourney.tourney?.mode === 'squad' && (alreadyJoinedModalTourney.squad || userProfile?.squad) && (
              <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 space-y-2.5">
                <div className="flex items-center gap-2.5 border-b border-white/10 pb-2">
                  <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-400/50 overflow-hidden shrink-0">
                    <img
                      src={
                        (alreadyJoinedModalTourney.squad as any)?.logoUrl ||
                        (userProfile?.squad as any)?.logoUrl ||
                        'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80'
                      }
                      alt="Squad Logo"
                      className="w-full h-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-cyan-400 uppercase font-mono">
                      {alreadyJoinedModalTourney.squad?.squadName || alreadyJoinedModalTourney.squad?.name || userProfile?.squad?.name}
                    </h5>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Captain: <span className="text-amber-400 font-bold">{alreadyJoinedModalTourney.squad?.leaderName || userProfile?.displayName}</span>
                    </span>
                  </div>
                </div>

                {/* Squad Members */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  {(alreadyJoinedModalTourney.squad?.members || userProfile?.squad?.members || []).map((m: any, idx: number) => {
                    const profilePic = m.photoURL || m.photoUrl || m.avatarUrl || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=100&auto=format&fit=crop&q=80';
                    const mUid = m.userId || m.uid || m.id;
                    const inGameName = m.gameName || m.ingameName || (mUid && alreadyJoinedGameNames[mUid]) || m.displayName || m.email?.split('@')[0] || `Member #${idx + 1}`;
                    return (
                      <div key={m.userId || idx} className="bg-slate-900 p-1.5 rounded border border-slate-800 flex items-center gap-1.5 text-[10px]">
                        <img
                          src={profilePic}
                          alt={inGameName}
                          className="w-5 h-5 rounded-full object-cover shrink-0 border border-cyan-500/30"
                          referrerPolicy="no-referrer"
                        />
                        <span className="font-bold text-slate-200 truncate">{inGameName}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="button"
              onClick={() => setAlreadyJoinedModalTourney(null)}
              className="w-full py-2.5 bg-emerald-950 hover:bg-emerald-900 border border-emerald-500/50 text-emerald-300 font-bold rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}

      {/* Squad Requirement Notice Modal */}
      {squadNoticeModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-amber-500/50 rounded-2xl p-5 w-full max-w-md space-y-4 shadow-[0_0_50px_rgba(245,158,11,0.25)] relative"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
                  {squadNoticeModal.title}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSquadNoticeModal(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-amber-950/60 border border-amber-500/40 rounded-xl p-3 text-xs text-amber-200 font-mono leading-relaxed">
              {squadNoticeModal.message}
            </div>

            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setSquadNoticeModal(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Close
              </button>
              {onViewMySquad && (
                <button
                  type="button"
                  onClick={() => {
                    setSquadNoticeModal(null);
                    onViewMySquad();
                  }}
                  className="flex-1 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  Manage Squad
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Move to Ongoing Confirmation Modal */}
      {confirmOngoingTourney && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-amber-500/50 rounded-2xl p-4 sm:p-6 w-full max-w-md space-y-4 shadow-[0_0_50px_rgba(245,158,11,0.25)] relative my-auto z-[9999]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-amber-400 fill-amber-400 shrink-0 animate-pulse" />
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono">
                  Confirm Move to Ongoing
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmOngoingTourney(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tournament Details Brief */}
            <div className="bg-slate-950/90 p-3.5 rounded-xl border border-amber-500/30 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-start gap-2">
                <h4 className="text-sm font-black text-white">{confirmOngoingTourney.title}</h4>
                <span className="text-[10px] text-amber-400 font-bold bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
                  TRN #{confirmOngoingTourney.tournamentNumber || '101'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1.5 border-t border-white/10">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Mode</span>
                  <span className="font-bold text-cyan-300">
                    {confirmOngoingTourney.mode === 'squad' ? 'Squad BR' : 'Solo BR'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Current Status</span>
                  <span className="font-bold text-amber-400 uppercase">
                    {confirmOngoingTourney.status || 'Open'}
                  </span>
                </div>
              </div>
            </div>

            {/* Notice Message */}
            <div className="bg-amber-950/60 border border-amber-500/40 p-3 rounded-xl space-y-1 text-center">
              <p className="text-xs text-amber-200 font-bold font-mono">
                Are you sure you want to change this tournament's status to "Ongoing"?
              </p>
              <p className="text-[11px] text-slate-400">
                This match will be moved from Registration to the Ongoing tab immediately for all players and hosts.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmOngoingTourney(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isMovingToOngoing}
                onClick={() => handleMoveToOngoing(confirmOngoingTourney)}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isMovingToOngoing ? (
                  <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Play className="w-4 h-4 text-slate-950 fill-slate-950 shrink-0" />
                )}
                <span>{isMovingToOngoing ? 'Updating...' : 'Confirm & Set Ongoing'}</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}


      {/* Host Edit Tournament Title Modal */}
      {hostEditTitleModalTourney && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-sky-500/40 rounded-2xl p-5 sm:p-6 w-full max-w-md space-y-4 shadow-[0_0_50px_rgba(14,165,233,0.25)] relative z-50"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-sky-400 shrink-0" />
                <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
                  Edit Tournament Title
                </h3>
              </div>
              <button
                onClick={() => setHostEditTitleModalTourney(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-mono">
              Tournament ID: <span className="text-sky-400 font-bold">#{hostEditTitleModalTourney.id}</span>
            </p>

            {titleModalError && (
              <div className="bg-red-950/80 border border-red-500/80 rounded-xl p-2.5 text-xs text-red-200 flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{titleModalError}</span>
              </div>
            )}

            <div className="space-y-3 font-mono text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] text-sky-300 font-bold uppercase">
                    Tournament Name / Title <span className="text-rose-400">*</span>
                  </label>
                  <span className={`text-[10px] font-bold ${30 - inputTournamentTitle.length < 5 ? 'text-amber-400' : 'text-slate-400'}`}>
                    {30 - inputTournamentTitle.length} characters left ({inputTournamentTitle.length}/30)
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={30}
                  value={inputTournamentTitle}
                  onChange={(e) => {
                    setInputTournamentTitle(e.target.value.slice(0, 30));
                    if (titleModalError) setTitleModalError(null);
                  }}
                  placeholder="e.g. Vortex Battle Royale #1"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-sky-400 rounded-xl px-3.5 py-2.5 text-white font-bold outline-none font-sans"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Maximum 30 characters allowed for the tournament name.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setHostEditTitleModalTourney(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTournamentTitle}
                className="flex-1 py-2.5 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(14,165,233,0.4)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Edit3 className="w-4 h-4" />
                <span>Save Title</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Host Set Room ID & Password Modal */}
      {hostRoomModalTourney && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[99999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-cyan-500/40 rounded-2xl p-5 sm:p-6 w-full max-w-md space-y-4 shadow-[0_0_50px_rgba(6,182,212,0.25)] relative z-[99999]"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-400 shrink-0" />
                <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
                  Set Room ID & Password
                </h3>
              </div>
              <button
                onClick={() => setHostRoomModalTourney(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-mono">
              Tournament: <span className="text-cyan-400 font-bold">{hostRoomModalTourney.title}</span> (#{hostRoomModalTourney.id})
            </p>

            {roomModalError && (
              <div className="bg-red-950/80 border border-red-500/80 rounded-xl p-2.5 text-xs text-red-200 flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{roomModalError}</span>
              </div>
            )}

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[11px] text-cyan-300 font-bold uppercase mb-1">Room ID</label>
                <input
                  type="text"
                  value={inputRoomId}
                  onChange={(e) => {
                    setInputRoomId(e.target.value);
                    if (roomModalError) setRoomModalError(null);
                  }}
                  placeholder="e.g. 5839201"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-cyan-300 font-bold uppercase mb-1">Room Password</label>
                <input
                  type="text"
                  value={inputRoomPassword}
                  onChange={(e) => {
                    setInputRoomPassword(e.target.value);
                    if (roomModalError) setRoomModalError(null);
                  }}
                  placeholder="e.g. 1234"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-cyan-300 font-bold uppercase mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-red-400">
                    <Video className="w-3.5 h-3.5 text-red-500" />
                    YouTube Live Link *
                  </span>
                  <span className="text-[10px] text-amber-400 font-normal lowercase">(Mandatory)</span>
                </label>
                <input
                  type="url"
                  value={inputYoutubeLiveUrl}
                  onChange={(e) => {
                    setInputYoutubeLiveUrl(e.target.value);
                    if (roomModalError) setRoomModalError(null);
                  }}
                  placeholder="e.g. https://www.youtube.com/watch?v=..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2 text-white outline-none font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  A YouTube Live Link must be provided to save the Room ID & Password.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setHostRoomModalTourney(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveRoomDetails}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Key className="w-4 h-4" />
                <span>Save Room Info</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Host Set Result Modal */}
      {hostResultModalTourney && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-purple-500/40 rounded-2xl p-5 sm:p-6 w-full max-w-md space-y-4 shadow-[0_0_50px_rgba(168,85,247,0.25)] relative z-50"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Trophy className="w-5 h-5 text-yellow-400 shrink-0" />
                <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
                  Set Tournament Result
                </h3>
              </div>
              <button
                onClick={() => setHostResultModalTourney(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-mono">
              Tournament: <span className="text-purple-300 font-bold">{hostResultModalTourney.title}</span> (#{hostResultModalTourney.id})
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[11px] text-yellow-400 font-bold uppercase mb-1">🏆 Winner (Booyah Team / Player)</label>
                <input
                  type="text"
                  value={resultWinnerName}
                  onChange={(e) => setResultWinnerName(e.target.value)}
                  placeholder="e.g. VORTEX GAMING / PlayerOne"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-purple-400 rounded-xl px-3 py-2 text-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-300 font-bold uppercase mb-1">🥈 Runner-Up Team / Player</label>
                <input
                  type="text"
                  value={resultRunnerUp}
                  onChange={(e) => setResultRunnerUp(e.target.value)}
                  placeholder="e.g. ALPHA SQUAD"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-purple-400 rounded-xl px-3 py-2 text-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-rose-300 font-bold uppercase mb-1">🎯 Top Kills / MVP</label>
                <input
                  type="text"
                  value={resultTopKills}
                  onChange={(e) => setResultTopKills(e.target.value)}
                  placeholder="e.g. PRO_KILLER (14 Kills)"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-purple-400 rounded-xl px-3 py-2 text-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-bold uppercase mb-1">Notes / Summary</label>
                <textarea
                  value={resultNotes}
                  onChange={(e) => setResultNotes(e.target.value)}
                  placeholder="Additional match outcome details..."
                  rows={2}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-purple-400 rounded-xl px-3 py-2 text-white outline-none resize-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={markEndedOnResult}
                  onChange={(e) => setMarkEndedOnResult(e.target.checked)}
                  className="rounded border-slate-700 text-purple-600 focus:ring-purple-500 bg-slate-950"
                />
                <span className="text-[11px] text-slate-300 font-bold">Mark Tournament Status as Completed (Ended)</span>
              </label>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setHostResultModalTourney(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveResult}
                className="flex-1 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(168,85,247,0.4)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-yellow-300" />
                <span>Publish Result</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Square Preview Modal for Sponsor Photo */}
      {squarePreviewImage && (
        <div 
          className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setSquarePreviewImage(null)}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={(e) => e.stopPropagation()}
            className="bg-slate-900 border border-purple-500/50 rounded-2xl p-4 max-w-sm w-full space-y-4 shadow-[0_0_50px_rgba(168,85,247,0.3)] relative"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <span className="text-xs font-mono font-bold text-purple-300 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-purple-400" />
                Sponsor Photo Preview
              </span>
              <button
                onClick={() => setSquarePreviewImage(null)}
                className="p-1 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="aspect-square w-full max-w-[280px] sm:max-w-[320px] mx-auto bg-slate-950 rounded-xl border border-purple-500/30 p-2 flex items-center justify-center overflow-hidden">
              <img
                src={squarePreviewImage}
                alt="Sponsor Square Preview"
                className="w-full h-full object-contain rounded-lg"
              />
            </div>

            <div className="text-center">
              <button
                onClick={() => setSquarePreviewImage(null)}
                className="px-5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Host Invitation Management Modal */}
      {hostInviteModalTourney && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-purple-500/40 rounded-2xl p-5 sm:p-6 w-full max-w-lg space-y-4 shadow-[0_0_50px_rgba(168,85,247,0.25)] relative"
          >
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-purple-400 shrink-0" />
                <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
                  Invite Players (Gmail)
                </h3>
              </div>
              <button
                onClick={() => setHostInviteModalTourney(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-mono">
              Tournament: <span className="text-purple-300 font-bold">{hostInviteModalTourney.title}</span> (#{hostInviteModalTourney.id})
            </p>

            {inviteModalError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{inviteModalError}</span>
              </div>
            )}

            {inviteModalSuccess && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2 font-mono">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{inviteModalSuccess}</span>
              </div>
            )}

            {/* Input to send invite */}
            <div className="space-y-2">
              <label className="block text-[11px] text-purple-300 font-bold uppercase font-mono">
                Add Player PlayVear ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteEmailInput}
                  onChange={(e) => {
                    setInviteEmailInput(e.target.value);
                    if (inviteModalError) setInviteModalError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendInviteEmail();
                  }}
                  placeholder="Enter 4-digit PlayVear ID or Gmail..."
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-purple-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={handleSendInviteEmail}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                  <span>Send Invite</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Invited users receive an in-app notification and can accept & join directly with their squad or solo account.
              </p>
            </div>

            {/* List of currently invited emails */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300 uppercase">
                <span>Invited Players ({hostInviteModalTourney.invitedEmails?.length || 0})</span>
              </div>

              {(!hostInviteModalTourney.invitedEmails || hostInviteModalTourney.invitedEmails.length === 0) ? (
                <div className="p-4 bg-slate-950 rounded-xl text-center text-xs text-slate-500 font-mono">
                  No PlayVear ID invitations sent yet.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {hostInviteModalTourney.invitedEmails.map((email: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono text-slate-200"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">{email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveInviteEmail(email)}
                        className="p-1 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                        title="Remove Invitation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setHostInviteModalTourney(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Host Edit Access Code Modal */}
      {hostCodeModalTourney && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-[0_0_50px_rgba(245,158,11,0.2)] font-mono"
          >
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Manage Access Code
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHostCodeModalTourney(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              Tournament: <span className="text-amber-300 font-bold">{hostCodeModalTourney.title}</span> (#{hostCodeModalTourney.id})
            </p>

            {/* Current Code Box */}
            <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between font-mono">
              <div>
                <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold block">Current Access Code</span>
                <span className="text-amber-200 text-lg font-black tracking-widest">{hostCodeModalTourney.accessCode || 'NONE'}</span>
              </div>
              {hostCodeModalTourney.accessCode && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(hostCodeModalTourney.accessCode);
                    setCopiedField(`modal-accesscode-${hostCodeModalTourney.id}`);
                    setTimeout(() => setCopiedField(null), 2000);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-800/80 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  {copiedField === `modal-accesscode-${hostCodeModalTourney.id}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Input Form */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Set New Access Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputAccessCode}
                    onChange={(e) => setInputAccessCode(e.target.value.toUpperCase())}
                    placeholder="E.g. VIP2026"
                    className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm font-mono text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 uppercase tracking-widest"
                  />
                  <button
                    type="button"
                    onClick={handleGenerateRandomAccessCode}
                    className="px-3 py-2 bg-slate-800 hover:bg-amber-950 hover:text-amber-300 border border-slate-700 hover:border-amber-500/50 rounded-lg text-xs text-slate-300 font-bold transition-colors cursor-pointer shrink-0"
                  >
                    Random
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950/80 border border-cyan-500/20 rounded-xl text-[11px] text-slate-300 space-y-1">
                <span className="text-cyan-400 font-bold block">ℹ️ Important Note:</span>
                <p className="text-slate-400 leading-tight">
                  Changing the access code will only apply to new participants joining. Players who have already joined with the previous code will remain on the list and will not be removed or banned.
                </p>
              </div>

              {codeUpdateError && (
                <p className="text-xs text-rose-400 bg-rose-950/50 border border-rose-500/30 p-2 rounded-lg font-mono">
                  {codeUpdateError}
                </p>
              )}

              {codeUpdateSuccess && (
                <p className="text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 p-2 rounded-lg font-mono">
                  {codeUpdateSuccess}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setHostCodeModalTourney(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAccessCode}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Update Access Code</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Access Code Entry Modal */}
      {codeJoinModalTourney && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 sm:p-6 w-full max-w-md space-y-4 shadow-[0_0_50px_rgba(245,158,11,0.25)] relative"
          >
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
                  Enter Tournament Access Code
                </h3>
              </div>
              <button
                onClick={() => {
                  setCodeJoinModalTourney(null);
                  setEnteredAccessCode('');
                  setCodeModalError(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-mono">
              Tournament: <span className="text-amber-300 font-bold">{codeJoinModalTourney.title}</span> (#{codeJoinModalTourney.id})
            </p>

            {codeModalError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{codeModalError}</span>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-[11px] text-amber-300 font-bold uppercase font-mono">
                Secret Access Code / PIN
              </label>
              <input
                type="text"
                value={enteredAccessCode}
                onChange={(e) => {
                  setEnteredAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
                  if (codeModalError) setCodeModalError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleVerifyCodeAndJoin(codeJoinModalTourney);
                }}
                placeholder="e.g. VX8492"
                maxLength={10}
                className="w-full bg-slate-950 border border-amber-500/50 focus:border-amber-400 rounded-xl px-4 py-3 text-sm font-mono font-black tracking-widest text-amber-300 uppercase outline-none"
                autoFocus
              />
              <p className="text-[10px] text-slate-400 font-mono">
                Enter the access code provided by the tournament host to join this match.
              </p>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => {
                  setCodeJoinModalTourney(null);
                  setEnteredAccessCode('');
                  setCodeModalError(null);
                }}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => handleVerifyCodeAndJoin(codeJoinModalTourney)}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Key className="w-4 h-4 text-slate-950" />
                <span>Verify & Join</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Tournament Announcement Modal */}
      {showAnnouncementModal && selectedAnnouncementTourney && (() => {
        const activeTourney = tournaments.find((t) => t.id === selectedAnnouncementTourney.id) || selectedAnnouncementTourney;
        const canWrite = getCanAnnounceTournament(activeTourney);

        return (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-5 sm:p-6 w-full max-w-lg space-y-4 shadow-[0_0_50px_rgba(6,182,212,0.25)] relative"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-cyan-400 shrink-0" />
                  <div>
                    <h3 className="text-base font-black text-white uppercase tracking-wider font-mono">
                      Tournament Announcement
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Tournament: <span className="text-cyan-400 font-bold">{activeTourney.title}</span> (#{activeTourney.id})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowAnnouncementModal(false);
                    setSelectedAnnouncementTourney(null);
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body: Read-only current announcement */}
              <div className="space-y-2">
                <span className="block text-[11px] text-cyan-400 font-bold uppercase font-mono tracking-wider">
                  📢 Current Update:
                </span>
                {activeTourney.announcement ? (
                  <div className="bg-slate-950 border border-cyan-500/20 rounded-xl p-4 space-y-2.5 font-sans">
                    <p className="text-sm text-slate-100 whitespace-pre-wrap leading-relaxed">
                      {activeTourney.announcement}
                    </p>
                    <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono border-t border-white/5 pt-2">
                      <span>Posted by: <strong className="text-cyan-400">{activeTourney.announcementAuthor || 'Host'}</strong></span>
                      {activeTourney.announcementUpdatedAt && (
                        <span>
                          {new Date(activeTourney.announcementUpdatedAt).toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-950/40 border border-dashed border-white/10 rounded-xl p-8 text-center space-y-2">
                    <Megaphone className="w-8 h-8 text-slate-600 mx-auto opacity-50" />
                    <p className="text-slate-400 text-xs font-medium">No announcements published yet for this tournament.</p>
                  </div>
                )}
              </div>

              {/* Host/Co-host/Admin Write Section */}
              {canWrite ? (
                <div className="border-t border-white/10 pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] text-emerald-400 font-bold uppercase font-mono">
                      ✍️ Publish/Edit Announcement (Authorized Only)
                    </label>
                    <span className="text-[9.5px] text-slate-400 font-mono bg-emerald-950/40 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                      You are Creator/Host/Admin
                    </span>
                  </div>

                  {announcementError && (
                    <div className="p-2.5 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center gap-2 font-mono">
                      <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                      <span>{announcementError}</span>
                    </div>
                  )}

                  {announcementSuccess && (
                    <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2 font-mono">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>{announcementSuccess}</span>
                    </div>
                  )}

                  <textarea
                    value={tourneyAnnouncementText}
                    onChange={(e) => {
                      setTourneyAnnouncementText(e.target.value);
                      if (announcementError) setAnnouncementError(null);
                      if (announcementSuccess) setAnnouncementSuccess(null);
                    }}
                    placeholder="Type tournament updates or room rules here..."
                    className="w-full h-24 bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl p-3 text-xs text-slate-100 outline-none font-sans resize-none"
                  />

                  <div className="flex gap-2 justify-end">
                    {activeTourney.announcement && (
                      <button
                        type="button"
                        disabled={isUpdatingAnnouncement}
                        onClick={async () => {
                          setIsUpdatingAnnouncement(true);
                          setAnnouncementError(null);
                          setAnnouncementSuccess(null);
                          try {
                            const tourneyRef = doc(db, 'tournaments_freefire', activeTourney.id);
                            await updateDoc(tourneyRef, {
                              announcement: '',
                              announcementUpdatedAt: null,
                              announcementAuthor: null
                            });
                            setTourneyAnnouncementText('');
                            setAnnouncementSuccess('Announcement deleted successfully!');
                          } catch (err: any) {
                            setAnnouncementError("Failed to clear announcement: " + err.message);
                          } finally {
                            setIsUpdatingAnnouncement(false);
                          }
                        }}
                        className="px-3.5 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-xl text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer disabled:opacity-50"
                      >
                        Clear Announcement
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={isUpdatingAnnouncement}
                      onClick={handleSaveTournamentAnnouncement}
                      className="px-5 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      {isUpdatingAnnouncement ? 'Publishing...' : 'Publish'}
                    </button>
                  </div>
                </div>
              ) : (
                /* Regular players read-only notification */
                <div className="bg-slate-950/60 border border-white/[0.03] p-3 rounded-xl flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Only Host, Co-hosts, and Administrators can post or modify announcements.</span>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => {
                  setShowAnnouncementModal(false);
                  setSelectedAnnouncementTourney(null);
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer text-center"
              >
                Close
              </button>
            </motion.div>
          </div>
        );
      })()}

      {/* Tournament Support Chat Modal */}
      {showSupportModal && selectedSupportTourney && (() => {
        const activeTourney = tournaments.find((t) => t.id === selectedSupportTourney.id) || selectedSupportTourney;
        const currentUserId = userProfile?.userId || (userProfile as any)?.uid || 'guest';
        const currentUserName = userProfile?.displayName || (userProfile as any)?.gameName || (userProfile as any)?.name || 'Player';
        const currentUserEmail = (userProfile?.email || '').toLowerCase().trim();
        const currentUserRole = (userProfile?.role || '').toLowerCase().trim();

        const isSystemAdmin = currentUserEmail === 'vortexesports150@gmail.com' || currentUserRole === 'main_admin' || currentUserRole === 'admin' || currentUserRole === 'sub_admin' || currentUserRole === 'owner_admin';
        const isHost = getCanAnnounceTournament(activeTourney);

        // Filter messages:
        // - System Admins see ALL messages
        // - Host sees System Admin messages + Host messages
        // - Captain/Player sees System Admin messages + own messages
        // - Host & Captain/Player cannot message each other directly; messaging is strictly with Admin
        const filteredMessages = supportMessages.filter(msg => {
          if (isSystemAdmin) return true;
          if (msg.senderId === currentUserId) return true;
          if (msg.senderRole === 'system_admin' || msg.senderRole === 'admin' || msg.senderRole === 'main_admin' || msg.senderRole === 'owner_admin' || msg.senderRole === 'sub_admin') return true;
          if (isHost && msg.senderRole === 'host') return true;
          if (!isHost && (msg.senderRole === 'captain' || msg.senderRole === 'player')) return true;
          return false;
        });

        const handleSendSupportMessage = async (e: React.FormEvent) => {
          e.preventDefault();
          if (!newSupportMessage.trim() || isSendingSupport) return;

          setIsSendingSupport(true);
          const textMessage = newSupportMessage.trim();
          try {
            const docId = `tourney_${activeTourney.id}_${currentUserId}`;
            const docRef = doc(db, 'admin_messages', docId);

            let roleToSave = 'player';
            if (isSystemAdmin) {
              roleToSave = 'system_admin';
            } else if (isHost) {
              roleToSave = 'host';
            } else if ((userProfile as any)?.isCaptain || (userProfile?.role as string) === 'captain') {
              roleToSave = 'captain';
            }

            if (supportMessages.length === 0) {
              // Create new ticket/message document in admin_messages
              await setDoc(docRef, {
                senderId: currentUserId,
                senderName: currentUserName,
                senderEmail: currentUserEmail,
                senderRole: roleToSave,
                senderPhoto: userProfile?.photoURL || (userProfile as any)?.avatarUrl || '',
                type: 'tournament_support',
                subject: `Tournament Support: ${activeTourney.title}`,
                message: textMessage,
                text: textMessage,
                status: 'unread',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                tournamentId: activeTourney.id,
                tournamentTitle: activeTourney.title,
                sourceContext: {
                  type: 'tournament_support',
                  tournamentId: activeTourney.id,
                  tournamentTitle: activeTourney.title,
                  senderId: currentUserId,
                  senderName: currentUserName,
                  senderRole: roleToSave,
                },
                replies: []
              });
            } else {
              // Append to replies
              const repliesRef = supportThreadData?.replies || [];
              const newReply = {
                senderId: currentUserId,
                senderName: currentUserName,
                senderRole: roleToSave,
                senderPhoto: userProfile?.photoURL || (userProfile as any)?.avatarUrl || '',
                text: textMessage,
                message: textMessage,
                createdAt: new Date().toISOString()
              };
              await updateDoc(docRef, {
                replies: [...repliesRef, newReply],
                status: 'unread', // Reset status to unread so Admin sees it in their inbox!
                updatedAt: serverTimestamp()
              });
            }

            setNewSupportMessage('');
          } catch (err) {
            console.error("Failed to send support message:", err);
          } finally {
            setIsSendingSupport(false);
          }
        };

        return (
          <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-5 sm:p-6 w-full max-w-lg shadow-[0_0_50px_rgba(6,182,212,0.25)] relative flex flex-col max-h-[85vh]"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-cyan-400 shrink-0 animate-pulse" />
                  <div>
                    <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono">
                      Tournament Support Chat
                    </h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      Tournament: <span className="text-cyan-400 font-bold">{activeTourney.title}</span> (#{activeTourney.id})
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowSupportModal(false);
                    setSelectedSupportTourney(null);
                    if (navigationContext && onBackToInbox) {
                      onBackToInbox();
                    }
                  }}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Chat Status Banner */}
              <div className="my-2 bg-[#0c1227] border border-cyan-500/20 p-2 rounded-xl text-[9px] sm:text-[10px] text-slate-300 font-mono flex items-center gap-1.5 shrink-0">
                <Shield className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                {isSystemAdmin ? (
                  <span>You are logged in as <strong className="text-cyan-400">ADMIN</strong>. You see all conversation threads.</span>
                ) : isHost ? (
                  <span>You are logged in as <strong className="text-cyan-400">HOST</strong>. Messaging is strictly with administrators.</span>
                ) : (
                  <span>You are logged in as <strong className="text-cyan-400">PLAYER</strong>. Messaging is strictly with administrators.</span>
                )}
              </div>

              {/* Messages Body */}
              <div className="flex-1 overflow-y-auto space-y-3 my-2 p-2 bg-slate-950/50 border border-white/[0.03] rounded-xl min-h-[250px] max-h-[400px]">
                {filteredMessages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-6 space-y-2">
                    <MessageSquare className="w-8 h-8 text-slate-700 opacity-40 animate-bounce" />
                    <p className="text-xs text-slate-400 font-semibold">No messages yet.</p>
                    <p className="text-[10px] text-slate-500 max-w-[250px]">
                      Ask questions, report issues, or communicate directly with administrators about this tournament.
                    </p>
                  </div>
                ) : (
                  filteredMessages.map((msg, idx) => {
                    const isOwnMessage = msg.senderId === currentUserId;
                    const messageDate = msg.createdAt ? (msg.createdAt.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt)) : new Date();

                    return (
                      <div
                        key={msg.id || idx}
                        className={`flex flex-col ${isOwnMessage ? 'items-end' : 'items-start'} space-y-1`}
                      >
                        {/* Sender Info (Only if not own message) */}
                        {!isOwnMessage && (
                          <span className="text-[9px] text-slate-400 font-bold ml-1.5 font-mono flex items-center gap-1">
                            {msg.senderName}
                            <span className={`text-[7px] px-1.5 py-0.2 rounded font-extrabold uppercase ${
                              msg.senderRole === 'system_admin' || msg.senderRole === 'admin'
                                ? 'bg-rose-950/60 border border-rose-500/30 text-rose-300'
                                : msg.senderRole === 'host'
                                ? 'bg-amber-950/60 border border-amber-500/30 text-amber-300'
                                : 'bg-cyan-950/60 border border-cyan-500/30 text-cyan-300'
                            }`}>
                              {msg.senderRole}
                            </span>
                          </span>
                        )}

                        {/* Message Bubble */}
                        <div className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed whitespace-pre-wrap ${
                          isOwnMessage
                            ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-br-none shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                            : 'bg-slate-800 text-slate-100 rounded-bl-none border border-white/[0.05]'
                        }`}>
                          <p>{msg.text}</p>
                        </div>

                        {/* Timestamp */}
                        <span className="text-[8px] text-slate-500 px-1 font-mono">
                          {messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Input Area */}
              <form onSubmit={handleSendSupportMessage} className="mt-2 flex gap-2 shrink-0">
                <input
                  type="text"
                  value={newSupportMessage}
                  onChange={(e) => setNewSupportMessage(e.target.value)}
                  placeholder="Type a message to administrators..."
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-xl p-3 text-xs text-slate-100 outline-none font-sans"
                  disabled={isSendingSupport}
                />
                <button
                  type="submit"
                  disabled={isSendingSupport || !newSupportMessage.trim()}
                  className="px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl transition-all shadow-[0_0_12px_rgba(6,182,212,0.3)] flex items-center justify-center cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>

              {/* Close Button */}
              <button
                onClick={() => {
                  setShowSupportModal(false);
                  setSelectedSupportTourney(null);
                }}
                className="w-full mt-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer text-center shrink-0"
              >
                Close
              </button>
            </motion.div>
          </div>
        );
      })()}

      {/* Full Results Modal */}
      {viewingResultTourney && (
        <TournamentResultsModal
          tourney={viewingResultTourney}
          onClose={() => setViewingResultTourney(null)}
        />
      )}

      {/* Full Results Modal */}
      {viewingResultTourney && (
        <TournamentResultsModal
          tourney={viewingResultTourney}
          onClose={() => setViewingResultTourney(null)}
        />
      )}

      {/* Rules Modal */}
      <AnimatePresence>
        {showRulesTourney && (
          <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#04060e] border border-cyan-500/30 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-6 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative font-sans"
            >
              {/* Glowing Background Details */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/5 rounded-full blur-2xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-cyan-950 to-blue-950 border border-cyan-500/40 rounded-xl text-cyan-400">
                    <BookOpen className="w-5 h-5 shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Tournament Rules & Regulations</h3>
                    <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest">Free Fire Pro Standards</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRulesTourney(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-white/5 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body Content */}
              <div className="space-y-5">
                {/* 1. Host Operations & YouTube Streaming */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-red-950/25 to-slate-900/50 border border-red-500/20 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <Youtube className="w-4.5 h-4.5 text-red-500" />
                    <span className="text-[11px] font-black text-red-300 uppercase tracking-wider">01. Host Duties & YouTube Streaming</span>
                  </div>
                  <ul className="space-y-2.5 text-[10.5px] font-mono text-slate-300 pl-1.5 list-disc list-inside">
                    <li>
                      <strong className="text-white uppercase">YOUTUBE LIVE STREAM:</strong> Every match in this tournament MUST be live-streamed on YouTube by the Host.
                    </li>
                    <li>
                      <strong className="text-white uppercase">ROOM LOBBY TIMING:</strong> The Host will set and publish the Room ID & Password precisely 15 minutes before the scheduled match time.
                    </li>
                    <li>
                      <strong className="text-white uppercase">LOBBY KICK AUTHORITY:</strong> Only registered players or squads sitting inside their correct assigned slots are allowed. The Host holds absolute authority to kick unauthorized players.
                    </li>
                    <li>
                      <strong className="text-white uppercase">HOST DECISION & PROOF:</strong> The Host processes the final match results and uploads the scoreboard screenshots. Player submissions are NOT required. Host decision is final.
                    </li>
                  </ul>
                </div>

                {/* 2. Player Roster & Punctuality */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/25 to-slate-900/50 border border-cyan-500/20 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4.5 h-4.5 text-cyan-400" />
                    <span className="text-[11px] font-black text-cyan-300 uppercase tracking-wider">02. Player Roster & Attendance</span>
                  </div>
                  <ul className="space-y-2.5 text-[10.5px] font-mono text-slate-300 pl-1.5 list-disc list-inside">
                    <li>
                      <strong className="text-white uppercase">REGISTERED PLAYERS ONLY:</strong> Squads must strictly play with players listed on their team registration form.
                    </li>
                    <li>
                      <strong className="text-white uppercase">STRICT PUNCTUALITY:</strong> All squads must join the custom room at least 5 minutes before match start. Delayed slots will not be held and entry fees are non-refundable.
                    </li>
                    <li>
                      <strong className="text-white uppercase">CANCELLATION REFUND:</strong> If the Host cancels the match for server issues, 100% of entry tokens will be refunded instantly.
                    </li>
                  </ul>
                </div>

                {/* 3. Fair Play & Emulator Bans */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/25 to-slate-900/50 border border-indigo-500/20 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4.5 h-4.5 text-indigo-400" />
                    <span className="text-[11px] font-black text-indigo-300 uppercase tracking-wider">03. Fair Play & Anti-Cheat</span>
                  </div>
                  <ul className="space-y-2.5 text-[10.5px] font-mono text-slate-300 pl-1.5 list-disc list-inside">
                    <li>
                      <strong className="text-white uppercase">HACK & SCRIPTS:</strong> Use of hacks, aimbots, custom config files, wallhacks, or scripts is strictly banned. Violators will face immediate lifetime platform bans.
                    </li>
                    <li>
                      <strong className="text-white uppercase">MOBILE-ONLY (NO EMULATOR):</strong> Players must play exclusively on mobile devices. PC/Emulator users are strictly forbidden.
                    </li>
                    <li>
                      <strong className="text-white uppercase">NO TEAMING UP:</strong> Collaboration with opponent teams inside the match is strictly prohibited and results in immediate disqualification.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Close Action Button */}
              <button
                onClick={() => setShowRulesTourney(null)}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all duration-300 active:scale-[0.98] shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer text-center"
              >
                Accept & Close Rules
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Host Profile Modal */}
      {selectedHostForModal && (
        <HostProfileModal
          hostId={selectedHostForModal.hostId}
          hostName={selectedHostForModal.hostName}
          hostPhotoUrl={selectedHostForModal.hostPhotoUrl}
          currentUserProfile={userProfile}
          onClose={() => setSelectedHostForModal(null)}
        />
      )}

      {/* Confirmation Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!tourneyToDelete}
        title="Delete Tournament Permanently"
        itemName={tourneyToDelete?.title}
        description="Are you sure you want to PERMANENTLY delete this tournament? All registrations, brackets, and slot allocations will be removed."
        confirmText="Yes, Delete Tournament"
        onClose={() => setTourneyToDelete(null)}
        onConfirm={async () => {
          if (tourneyToDelete) {
            const targetId = tourneyToDelete.id;
            // Optimistically remove from state
            setTournaments(prev => prev.filter(t => t.id !== targetId && (t as any).docId !== targetId));

            try {
              await deleteDoc(doc(db, 'tournaments_freefire', targetId));
            } catch (err1) {
              console.warn('Error deleting in tournaments_freefire:', err1);
            }
            try {
              await deleteDoc(doc(db, 'tournaments', targetId));
            } catch (err2) {
              console.warn('Error deleting in tournaments:', err2);
            }
          }
        }}
      />

      {/* Confirmation Hide Modal */}
      <ConfirmHideModal
        isOpen={!!tourneyToHide}
        title={tourneyToHide?.isHidden ? "Unhide Tournament" : "Hide Tournament"}
        itemName={tourneyToHide?.title}
        isHidden={Boolean(tourneyToHide?.isHidden)}
        onClose={() => setTourneyToHide(null)}
        onConfirm={async () => {
          if (tourneyToHide) {
            const targetId = tourneyToHide.id;
            const newHiddenState = !tourneyToHide.isHidden;
            setTournaments(prev => prev.map(item => {
              if (item.id === targetId || (item as any).docId === targetId) {
                return { ...item, isHidden: newHiddenState };
              }
              return item;
            }));

            try {
              await updateDoc(doc(db, 'tournaments_freefire', targetId), { isHidden: newHiddenState, updatedAt: serverTimestamp() });
            } catch (err1) {
              try {
                await updateDoc(doc(db, 'tournaments', targetId), { isHidden: newHiddenState, updatedAt: serverTimestamp() });
              } catch (err2) {
                console.error('Error toggling hide tournament:', err1, err2);
              }
            }
          }
        }}
      />
    </div>
  );
}
