import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'motion/react';
import imageCompression from 'browser-image-compression';
import { 
  ChevronLeft, 
  Calendar, 
  Users, 
  Trophy, 
  CheckCircle2, 
  Clock, 
  Info,
  ChevronRight,
  Medal,
  Swords,
  Plus,
  Shield,
  Star,
  User,
  ArrowRight,
  MoreVertical,
  MessageSquare,
  Lock,
  Unlock,
  Youtube,
  ExternalLink,
  AlertTriangle,
  Award,
  UserX,
  Zap,
  Copy,
  Check,
  AlertCircle,
  CheckCircle,
  ArrowUpRight,
  ChevronDown,
  Image as ImageIcon,
  Flame,
  Crown,
  Target,
  Key,
  Mail,
  MapPin,
  Megaphone,
  Trash2,
  Edit2,
  X,
  Loader2,
  Send
} from 'lucide-react';
import { MatchChatModal } from './MatchChatModal';
import { ProHostedLeague, UserProfile, Team } from '../types';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { uploadScreenshotToImgBB, compressImageToDataUrl } from '../lib/imgbb';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc,
  getDocs, 
  runTransaction, 
  serverTimestamp,
  setDoc,
  updateDoc,
  increment,
  limit,
  addDoc,
  orderBy,
  deleteField
} from 'firebase/firestore';


function MatchChatButton({ match, leagueId, userProfile, onClick, isActive, isSystemAdmin }: { match: any, leagueId: string, userProfile: any, onClick: () => void, isActive: boolean, isSystemAdmin: boolean }) {
  const [hasNew, setHasNew] = useState(false);

  useEffect(() => {
    if (!userProfile) return;
    const chatRef = collection(db, 'league_match_chats', `${leagueId}_${match.id}`, 'messages');
    const q = query(chatRef, orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const lastViewed = parseInt(localStorage.getItem(`chat_viewed_${leagueId}_${match.id}_${userProfile.userId}`) || '0');
        
        let foundNew = false;
        for (const doc of snap.docs) {
          const msg = doc.data({ serverTimestamps: 'estimate' });
          const msgTime = msg.createdAt?.toMillis() || Date.now();
          
          if (msgTime <= lastViewed) break;
          if (msg.senderId === userProfile.userId) continue;
          
          let isVisible = false;
          if (isSystemAdmin) isVisible = true;
          else if (msg.senderRole === 'system_admin') isVisible = true;
          
          if (isVisible) {
            foundNew = true;
            break;
          }
        }
        setHasNew(foundNew);
      }
    });
    return () => unsub();
  }, [leagueId, match.id, userProfile, isActive, isSystemAdmin]);

  useEffect(() => {
    if (isActive) {
      localStorage.setItem(`chat_viewed_${leagueId}_${match.id}_${userProfile.userId}`, Date.now().toString());
      setHasNew(false);
    }
  }, [isActive, leagueId, match.id, userProfile]);

  return (
    <button
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      className="p-1.5 text-slate-400 hover:text-cyan-400 hover:bg-white/5 rounded-lg transition-all cursor-pointer relative group/chat"
      title="Match Chat"
    >
      <MessageSquare className="w-4 h-4" />
      {hasNew && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full border border-[#090d22]"></span>
      )}
    </button>
  );
}

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="p-1 hover:bg-white/10 rounded-md transition-all text-slate-400 hover:text-cyan-400 active:scale-95 inline-flex items-center justify-center shrink-0"
      title="Copy to clipboard"
    >
      {copied ? (
        <Check className="w-3 h-3 text-emerald-400" />
      ) : (
        <Copy className="w-3 h-3" />
      )}
    </button>
  );
};

interface LeagueScheduleViewProps {
  league: ProHostedLeague;
  userProfile: UserProfile | null;
  tokens: number;
  setTokens?: (tokens: number) => void;
  onViewMySquad?: () => void;
  onBack: () => void;
  navigationContext?: any;
  onTagMatchForPulse?: (match: any) => void;
}

type TabType = 'schedule' | 'brackets' | 'standings' | 'top_players';

export const LeagueScheduleView: React.FC<LeagueScheduleViewProps> = ({ 
  league, 
  userProfile, 
  tokens: initialTokens, 
  setTokens, 
  onViewMySquad, 
  onBack, 
  navigationContext,
  onTagMatchForPulse 
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('schedule');
  const [activeGroup, setActiveGroup] = useState<string>('A');
  const [highlightedMatchId, setHighlightedMatchId] = useState<string | null>(null);
  const [activeRound, setActiveRound] = useState<number>(1);
  const [registeredSquads, setRegisteredSquads] = useState<any[]>([]);
  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [selectedSquadDetails, setSelectedSquadDetails] = useState<any>(null);
  const [joiningTbdId, setJoiningTbdId] = useState<string | null>(null);
  const [accessCodeInput, setAccessCodeInput] = useState<string>('');
  const [accessCodeError, setAccessCodeError] = useState<string | null>(null);
  const [viewingResult, setViewingResult] = useState<any | null>(null);
  const [viewingScreenshot, setViewingScreenshot] = useState<string | null>(null);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [currentTokens, setCurrentTokens] = useState(initialTokens);
  const [regError, setRegError] = useState<string | null>(null);
  const [showConfirmStep, setShowConfirmStep] = useState<{tbdId: string, teamId: string} | null>(null);
  const [alreadyJoinedModalOpen, setAlreadyJoinedModalOpen] = useState(false);
  const [squadFullModalOpen, setSquadFullModalOpen] = useState(false);
  const [noSquadModalOpen, setNoSquadModalOpen] = useState(false);

  const [matchOverrides, setMatchOverrides] = useState<Record<string, any>>({});
  const [editingMatch, setEditingMatch] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [roomId, setRoomId] = useState('');
  const [roomPassword, setRoomPassword] = useState('');
  const [youtubeLiveLink, setYoutubeLiveLink] = useState('');
  const [matchStatus, setMatchStatus] = useState<'scheduled' | 'live' | 'completed'>('scheduled');
  const [scoreA, setScoreA] = useState<number>(0);
  const [scoreB, setScoreB] = useState<number>(0);
  const [winner, setWinner] = useState('');
  const [isRescheduled, setIsRescheduled] = useState(false);
  const [isSavingMatch, setIsSavingMatch] = useState(false);
  const [showHallOfGloryModal, setShowHallOfGloryModal] = useState(false);
  const [hallOfGloryPreviewImage, setHallOfGloryPreviewImage] = useState<{ url: string; name: string; rank: string } | null>(null);
  const [playerStats, setPlayerStats] = useState<Record<string, { kills: number; damage: number }>>({});
  const [showRoomDetailsForUser, setShowRoomDetailsForUser] = useState<any | null>(null);
  const [showLiveRoomModal, setShowLiveRoomModal] = useState(false);
  const [modalRoomId, setModalRoomId] = useState('');
  const [modalRoomPassword, setModalRoomPassword] = useState('');
  const [modalYoutubeLink, setModalYoutubeLink] = useState('');
  const [modalRoomError, setModalRoomError] = useState<string | null>(null);
  const [activeChatMatch, setActiveChatMatch] = useState<any | null>(null);
  const [activeAnnouncementMatch, setActiveAnnouncementMatch] = useState<any | null>(null);
  const [announcementText, setAnnouncementText] = useState<string>('');
  const [isSavingAnnouncement, setIsSavingAnnouncement] = useState(false);
  const [editingAnnouncementId, setEditingAnnouncementId] = useState<string | null>(null);
  const [walkoverPreset, setWalkoverPreset] = useState<string | null>(null);
  const [matchEditError, setMatchEditError] = useState<string | null>(null);
  
  // Admin message / appeal from match card
  const [appealMatch, setAppealMatch] = useState<any | null>(null);
  const [appealMessage, setAppealMessage] = useState('');
  const [isSendingAppeal, setIsSendingAppeal] = useState(false);
  const [playersProfiles, setPlayersProfiles] = useState<Record<string, any>>({});
  const [teamsMap, setTeamsMap] = useState<Record<string, any>>({});
  const [isGroupLoading, setIsGroupLoading] = useState<boolean>(true);
  const [loadProgress, setLoadProgress] = useState<number>(15);

  // Preload squad cover photos & match details whenever group or tab changes
  useEffect(() => {
    setIsGroupLoading(true);
    setLoadProgress(20);

    const urls: string[] = [];
    if (league?.sponsorLogoUrl) urls.push(league.sponsorLogoUrl);

    // Collect cover photos from registered squads
    registeredSquads.forEach((sq: any) => {
      const url = sq.coverPhoto || sq.coverUrl || sq.banner || sq.logoUrl;
      if (url && typeof url === 'string' && url.startsWith('http') && !urls.includes(url)) {
        urls.push(url);
      }
    });

    if (urls.length === 0) {
      const t1 = setTimeout(() => setLoadProgress(70), 80);
      const t2 = setTimeout(() => {
        setLoadProgress(100);
        setTimeout(() => setIsGroupLoading(false), 250);
      }, 200);
      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
      };
    }

    let loadedCount = 0;
    let isCancelled = false;

    const updateProgress = () => {
      if (isCancelled) return;
      loadedCount++;
      const pct = Math.min(98, Math.round(20 + (loadedCount / urls.length) * 80));
      setLoadProgress(pct);

      if (loadedCount >= urls.length) {
        setLoadProgress(100);
        setTimeout(() => {
          if (!isCancelled) setIsGroupLoading(false);
        }, 300);
      }
    };

    urls.forEach(url => {
      const img = new Image();
      img.onload = updateProgress;
      img.onerror = updateProgress;
      img.src = url;
    });

    const fallbackTimer = setTimeout(() => {
      if (!isCancelled) {
        setLoadProgress(100);
        setTimeout(() => setIsGroupLoading(false), 200);
      }
    }, 1500);

    return () => {
      isCancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, [activeGroup, activeRound, activeTab, registeredSquads, league?.sponsorLogoUrl]);

  useEffect(() => {
    const fetchTeamsMap = async () => {
      try {
        const snap = await getDocs(collection(db, 'teams'));
        const map: Record<string, any> = {};
        snap.docs.forEach(d => {
          map[d.id] = { id: d.id, ...d.data() };
        });
        setTeamsMap(map);
      } catch (err) {
        console.error("Error fetching teams map:", err);
      }
    };
    fetchTeamsMap();
  }, []);

  useEffect(() => {
    const emailsToFetch: string[] = [];
    const idsToFetch: string[] = [];
    if (viewingResult?.playerStats) {
      Object.keys(viewingResult.playerStats).forEach(key => {
        if (key && key.includes('@') && !emailsToFetch.includes(key)) {
          emailsToFetch.push(key);
        } else if (key && !key.includes('@') && !idsToFetch.includes(key)) {
          idsToFetch.push(key);
        }
      });
    }

    Object.values(matchOverrides).forEach((m: any) => {
      if (m.playerStats) {
        Object.keys(m.playerStats).forEach(key => {
          if (key && key.includes('@') && !emailsToFetch.includes(key)) {
            emailsToFetch.push(key);
          } else if (key && !key.includes('@') && !idsToFetch.includes(key)) {
            idsToFetch.push(key);
          }
        });
      }
    });

    registeredSquads.forEach((sq: any) => {
      (sq.players || []).forEach((p: any) => {
        if (p.email && !emailsToFetch.includes(p.email)) emailsToFetch.push(p.email);
        if (p.userId && !idsToFetch.includes(p.userId)) idsToFetch.push(p.userId);
      });
    });

    if (emailsToFetch.length > 0 || idsToFetch.length > 0) {
      const fetchProfiles = async () => {
        try {
          let allProfiles: Record<string, any> = {};

          if (emailsToFetch.length > 0) {
            const chunks = [];
            for (let i = 0; i < emailsToFetch.length; i += 30) {
              chunks.push(emailsToFetch.slice(i, i + 30));
            }
            for (const chunk of chunks) {
              const uQ = query(collection(db, 'users'), where('email', 'in', chunk));
              const uSnap = await getDocs(uQ);
              const profiles = uSnap.docs.reduce((acc: any, d) => {
                const data = d.data();
                if (data.email) acc[data.email] = data;
                if (data.userId) acc[data.userId] = data;
                acc[d.id] = data;
                return acc;
              }, {});
              allProfiles = { ...allProfiles, ...profiles };
            }
          }

          if (idsToFetch.length > 0) {
            const chunks = [];
            for (let i = 0; i < idsToFetch.length; i += 30) {
              chunks.push(idsToFetch.slice(i, i + 30));
            }
            for (const chunk of chunks) {
              const uQ = query(collection(db, 'users'), where('userId', 'in', chunk));
              const uSnap = await getDocs(uQ);
              const profiles = uSnap.docs.reduce((acc: any, d) => {
                const data = d.data();
                if (data.email) acc[data.email] = data;
                if (data.userId) acc[data.userId] = data;
                acc[d.id] = data;
                return acc;
              }, {});
              allProfiles = { ...allProfiles, ...profiles };
            }
          }

          setPlayersProfiles(prev => ({ ...prev, ...allProfiles }));
        } catch (err) {
          console.error("Error fetching user profiles in LeagueScheduleView:", err);
        }
      };
      fetchProfiles();
    }
  }, [viewingResult, registeredSquads, matchOverrides]);

  const getQualifiedSquadForRank = (rankIdx: number, groupLetter: string) => {
    const groupMatches = getGroupMatches(groupLetter);
    const regularMatches = groupMatches.filter((m: any) => !m.isDoOrDie);

    // Rule 1: All group matches must be completed, and their results approved by the admin.
    if (regularMatches.length === 0) return null;
    const allRegularCompleted = regularMatches.every((m: any) => {
      const override = matchOverrides[m.id] || matchOverrides[`${league.id}_${m.id}`];
      return override?.isPlayed || override?.status === 'completed' || override?.reviewStatus === 'approved';
    });

    if (!allRegularCompleted) {
      // Group matches are not all completed & approved -> do NOT transfer
      return null;
    }

    const standings = getStandings(groupLetter);
    if (!standings || !standings[rankIdx]) return null;

    const dodMatch = groupMatches.find((m: any) => m.isDoOrDie);
    if (dodMatch) {
      const dodOverride = matchOverrides[dodMatch.id] || matchOverrides[`${league.id}_${dodMatch.id}`];
      const isDodCompleted = dodOverride?.isPlayed || dodOverride?.status === 'completed' || dodOverride?.reviewStatus === 'approved';

      if (!isDodCompleted) {
        // Do or die match is required but NOT yet completed/approved.
        // Check if the squad at rankIdx is involved in the Do or Die match or tied.
        const tiedTbdIds = [dodMatch.t1, dodMatch.t2];
        const squadObj = standings[rankIdx];

        if (tiedTbdIds.includes(squadObj.tbdId) || tiedTbdIds.includes(squadObj.name)) {
          // Squad has a "do or die" match -> HOLD until the "do or die" match is over
          return null;
        }

        // Only the squad that has qualified for the next round and does NOT have a "do or die" match will advance!
        return squadObj;
      }
    }

    // When Do or Die match is finished & approved, or if no Do or Die match exists and all matches are finished:
    return standings[rankIdx];
  };

  const getSquadByTbdId = (tbdId: string) => {
    if (!tbdId) return null;
    const cleanId = String(tbdId).trim();

    // Handle "Rank X Group Y" pattern dynamically for Knockout progression
    const rankGroupMatch = cleanId.match(/^Rank\s*(\d+)\s*Group\s*([A-Z])$/i);
    if (rankGroupMatch) {
      const rankIdx = parseInt(rankGroupMatch[1], 10) - 1;
      const groupLetter = rankGroupMatch[2].toUpperCase();
      const squadObj = getQualifiedSquadForRank(rankIdx, groupLetter);
      if (squadObj) {
        const regSquad = registeredSquads.find(s => 
          s.tbdId === squadObj.tbdId || 
          s.teamId === squadObj.tbdId ||
          s.id === squadObj.tbdId ||
          (s.teamName && s.teamName.toLowerCase() === squadObj.name.toLowerCase()) ||
          (s.squadName && s.squadName.toLowerCase() === squadObj.name.toLowerCase())
        );
        const teamId = regSquad?.teamId || squadObj.tbdId;
        const teamDoc = teamsMap[teamId] || myTeams.find(t => t.id === teamId || (t.name && t.name.toLowerCase() === squadObj.name.toLowerCase()));
        const coverUrl = regSquad?.coverUrl || regSquad?.coverPhoto || regSquad?.logoUrl || regSquad?.logo || regSquad?.photoURL || regSquad?.banner || regSquad?.bannerUrl ||
                         teamDoc?.coverUrl || teamDoc?.coverPhoto || teamDoc?.logoUrl || teamDoc?.logo || teamDoc?.banner || '';
        if (regSquad || teamDoc) {
          return {
            ...(teamDoc || {}),
            ...(regSquad || {}),
            squadName: regSquad?.squadName || regSquad?.teamName || teamDoc?.name || squadObj.name,
            teamName: regSquad?.teamName || regSquad?.squadName || teamDoc?.name || squadObj.name,
            coverPhoto: coverUrl,
            coverUrl: coverUrl,
            logoUrl: coverUrl,
            logo: coverUrl,
            banner: coverUrl,
            players: regSquad?.players || teamDoc?.members || teamDoc?.players || [],
            isPlaceholder: false
          };
        }
        return {
          id: squadObj.tbdId,
          tbdId: squadObj.tbdId,
          teamName: squadObj.name,
          squadName: squadObj.name,
          coverPhoto: coverUrl,
          coverUrl: coverUrl,
          logoUrl: coverUrl,
          logo: coverUrl,
          banner: coverUrl,
          players: [],
          isPlaceholder: squadObj.name.startsWith('TBD-')
        };
      } else {
        // Return placeholder object so card click works cleanly and shows placeholder info
        return {
          id: cleanId,
          tbdId: cleanId,
          teamName: cleanId,
          squadName: cleanId,
          coverPhoto: '',
          coverUrl: '',
          logoUrl: '',
          banner: '',
          players: [],
          isPlaceholder: true
        };
      }
    }

    // 1. Search registeredSquads
    const regSquad = registeredSquads.find(s => 
      s.tbdId === cleanId || 
      s.teamId === cleanId || 
      s.id === cleanId ||
      (s.teamName && s.teamName.toLowerCase() === cleanId.toLowerCase()) ||
      (s.squadName && s.squadName.toLowerCase() === cleanId.toLowerCase())
    );

    // 2. Lookup team document from teamsMap or myTeams if available
    const teamId = regSquad?.teamId || cleanId;
    const teamDoc = teamsMap[teamId] || myTeams.find(t => t.id === teamId || (t.name && t.name.toLowerCase() === cleanId.toLowerCase()));

    const coverUrl = regSquad?.coverUrl || regSquad?.coverPhoto || regSquad?.logoUrl || regSquad?.logo || regSquad?.photoURL || regSquad?.banner || regSquad?.bannerUrl ||
                     teamDoc?.coverUrl || teamDoc?.coverPhoto || teamDoc?.logoUrl || teamDoc?.logo || teamDoc?.banner || '';

    if (!regSquad && !teamDoc) {
      return {
        id: cleanId,
        tbdId: cleanId,
        teamName: cleanId,
        squadName: cleanId,
        coverPhoto: coverUrl,
        coverUrl: coverUrl,
        logoUrl: coverUrl,
        logo: coverUrl,
        banner: coverUrl,
        players: [],
        isPlaceholder: true
      };
    }

    return {
      ...(teamDoc || {}),
      ...(regSquad || {}),
      squadName: regSquad?.squadName || regSquad?.teamName || teamDoc?.name || cleanId,
      teamName: regSquad?.teamName || regSquad?.squadName || teamDoc?.name || cleanId,
      coverPhoto: coverUrl,
      coverUrl: coverUrl,
      logoUrl: coverUrl,
      logo: coverUrl,
      banner: coverUrl,
      players: regSquad?.players || teamDoc?.members || teamDoc?.players || [],
      isPlaceholder: false
    };
  };

  const getGroupSlotStatus = (groupLetter: string) => {
    const totalSlots = 4;
    let filledCount = 0;
    for (let i = 1; i <= totalSlots; i++) {
      const tbdId = `TBD-${groupLetter}${i}`;
      const sq = getSquadByTbdId(tbdId);
      if (sq && !sq.isPlaceholder) {
        filledCount++;
      }
    }
    const isFull = filledCount >= totalSlots;
    const availableSlots = Math.max(0, totalSlots - filledCount);
    return {
      totalSlots,
      filledCount,
      availableSlots,
      isFull
    };
  };

  const applyMatchStatsToPlayers = async (matchData: any) => {
    if (!matchData || !matchData.playerStats || matchData.statsApplied) return;

    try {
      const t1 = matchData.t1 || '';
      const t2 = matchData.t2 || '';
      const winner = matchData.winner || '';
      const playerStats = matchData.playerStats || {};

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
            
            const isClashSquad = league ? (league.game === 'Free Fire CS' || (league.game || '').toLowerCase().includes('cs') || (league.game || '').toLowerCase().includes('clash')) : true;
            const isSolo = league ? Number(league.squadSize) === 1 : false;

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
            console.error("Critical error updating user stats:", resolvedUid, e2);
          }
        }
      }
    } catch (err) {
      console.error("Error applying match stats:", err);
    }
  };

  const rollbackMatchStatsFromPlayers = async (matchData: any) => {
    if (!matchData || !matchData.playerStats || !matchData.statsApplied) return;

    try {
      const t1 = matchData.t1 || '';
      const t2 = matchData.t2 || '';
      const winner = matchData.winner || '';
      const playerStats = matchData.playerStats || {};

      const s1: any = t1 ? getSquadByTbdId(t1) : null;
      const s2: any = t2 ? getSquadByTbdId(t2) : null;

      const playersToRollback: Array<{
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
          playersToRollback.push({
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

      if (playerStats && typeof playerStats === 'object') {
        for (const [key, val] of Object.entries(playerStats)) {
          const isKeyEmail = key.includes('@');
          const emailVal = isKeyEmail ? key : undefined;
          const uidVal = isKeyEmail ? undefined : key;
          const gameNameVal = isKeyEmail ? undefined : key;

          if (isDummyOrInvalid(emailVal, uidVal, gameNameVal)) {
            continue;
          }

          if (!playersToRollback.some(item => item.email === key || item.userId === key || item.gameName === key)) {
            playersToRollback.push({
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

      for (const pData of playersToRollback) {
        if (isDummyOrInvalid(pData.email, pData.userId, pData.gameName)) {
          continue;
        }

        let resolvedUid: string | null = null;
        const initialTarget = pData.userId;

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
            if (uSnap.exists()) {
              const existingData = uSnap.data();
              const curCS = existingData.squadCsStats || {};
              const curGen = existingData.stats || {};

              const updatePayload: any = {
                updatedAt: new Date().toISOString()
              };

              updatePayload.squadCsStats = {
                matches: Math.max(0, (curCS.matches || 0) - 1),
                kills: Math.max(0, (curCS.kills || 0) - killsInc),
                damages: Math.max(0, (curCS.damages || curCS.damage || 0) - damageInc),
                damage: Math.max(0, (curCS.damages || curCS.damage || 0) - damageInc),
                wins: Math.max(0, (curCS.wins || 0) - (wasWin ? 1 : 0)),
                joined: Math.max(0, (curCS.joined || 0) - 1)
              };

              updatePayload.stats = {
                matches: Math.max(0, (curGen.matches || 0) - 1),
                kills: Math.max(0, (curGen.kills || 0) - killsInc),
                damages: Math.max(0, (curGen.damages || curGen.damage || 0) - damageInc),
                damage: Math.max(0, (curGen.damages || curGen.damage || 0) - damageInc),
                wins: Math.max(0, (curGen.wins || 0) - (wasWin ? 1 : 0))
              };

              updatePayload.totalKills = increment(-killsInc);
              updatePayload.totalDamage = increment(-damageInc);
              updatePayload.matchesPlayed = increment(-1);

              await setDoc(userRef, updatePayload, { merge: true });
            }
          } catch (e2) {
            console.error("Critical error rolling back user stats:", resolvedUid, e2);
          }
        }
      }
    } catch (err) {
      console.error("Error rolling back match stats:", err);
    }
  };

  const getTopPlayers = () => {
    const playerStatsMap: Record<string, {
      key: string;
      displayName: string;
      photoURL?: string;
      squadName: string;
      squadLogo?: string;
      kills: number;
      damage: number;
      matchesPlayed: number;
    }> = {};

    Object.values(matchOverrides).forEach((match: any) => {
      if (!match.playerStats || typeof match.playerStats !== 'object') return;
      const isCompleted = match.status === 'completed' || match.isPlayed || match.reviewStatus === 'approved';
      if (!isCompleted) return;

      const t1Id = match.t1;
      const t2Id = match.t2;
      const sq1 = getSquadByTbdId(t1Id);
      const sq2 = getSquadByTbdId(t2Id);

      const s1Name = sq1?.squadName || sq1?.teamName || t1Id || 'Squad 1';
      const s2Name = sq2?.squadName || sq2?.teamName || t2Id || 'Squad 2';

      const s1Logo = sq1?.coverPhoto || sq1?.coverUrl || sq1?.logoUrl || sq1?.logo || sq1?.banner || '';
      const s2Logo = sq2?.coverPhoto || sq2?.coverUrl || sq2?.logoUrl || sq2?.logo || sq2?.banner || '';

      Object.entries(match.playerStats).forEach(([pKey, pStat]: [string, any]) => {
        if (!pKey) return;
        const kills = Number(pStat?.kills) || 0;
        const damage = Number(pStat?.damage) || 0;

        const prof = playersProfiles[pKey] || {};
        
        let squadName = prof.squadName || prof.teamName || '';
        let squadLogo = prof.squadLogo || prof.teamLogo || prof.coverUrl || '';

        let playerInSquad = sq1?.players?.find((p: any) => p.email === pKey || p.userId === pKey || p.gameName === pKey) || 
                            sq2?.players?.find((p: any) => p.email === pKey || p.userId === pKey || p.gameName === pKey);

        if (!squadName) {
          if (playerInSquad && sq1?.players?.includes(playerInSquad)) {
            squadName = s1Name;
            squadLogo = s1Logo;
          } else if (playerInSquad && sq2?.players?.includes(playerInSquad)) {
            squadName = s2Name;
            squadLogo = s2Logo;
          } else {
            squadName = s1Name || s2Name || 'Esports Squad';
            squadLogo = s1Logo || s2Logo || '';
          }
        }

        const displayName = prof.gameName || playerInSquad?.gameName || prof.displayName || playerInSquad?.name || (pKey.includes('@') ? pKey.split('@')[0] : pKey);
        const photoURL = prof.photoURL || prof.avatarUrl || prof.profilePicture || prof.avatar || playerInSquad?.photoURL || playerInSquad?.avatarUrl || '';

        if (!playerStatsMap[pKey]) {
          playerStatsMap[pKey] = {
            key: pKey,
            displayName,
            photoURL,
            squadName,
            squadLogo,
            kills: 0,
            damage: 0,
            matchesPlayed: 0
          };
        }

        playerStatsMap[pKey].kills += kills;
        playerStatsMap[pKey].damage += damage;
        playerStatsMap[pKey].matchesPlayed += 1;
        if (photoURL && !playerStatsMap[pKey].photoURL) playerStatsMap[pKey].photoURL = photoURL;
        if (squadName && (!playerStatsMap[pKey].squadName || playerStatsMap[pKey].squadName === 'Esports Squad')) {
          playerStatsMap[pKey].squadName = squadName;
          playerStatsMap[pKey].squadLogo = squadLogo;
        }
      });
    });

    return Object.values(playerStatsMap).map(p => {
      // Calculate a derived economy/performance score from the available metrics
      const economyScore = (p.kills * 10) + Math.floor(p.damage / 100) + (p.matchesPlayed * 2);
      return { ...p, economyScore };
    }).sort((a, b) => {
      if (b.kills !== a.kills) return b.kills - a.kills;
      if (b.economyScore !== a.economyScore) return b.economyScore - a.economyScore;
      return b.damage - a.damage;
    });
  };

  useEffect(() => {
    const q = query(
      collection(db, 'pro_league_schedule_matches'),
      where('leagueId', '==', league.id)
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const overrides: Record<string, any> = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        if (data.matchId) {
          overrides[data.matchId] = { id: doc.id, ...data };
        }
        overrides[doc.id] = { id: doc.id, ...data };
        if (doc.id.includes('_')) {
          const rawId = doc.id.split('_').slice(1).join('_');
          if (rawId) {
            overrides[rawId] = { id: doc.id, ...data };
          }
        }
      });
      setMatchOverrides(overrides);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pro_league_schedule_matches');
    });
    return () => unsub();
  }, [league.id]);

  const openEditMatchModal = (match: any) => {
    const override = matchOverrides[match.id] || {};
    setEditingMatch(match);
    setMatchEditError(null);
    
    let defaultDate = '';
    let defaultTime = '';
    if (override.customDate) {
      defaultDate = override.customDate;
    } else if (league.openingMatchDate) {
      defaultDate = league.openingMatchDate;
    }
    
    if (override.customTime) {
      defaultTime = override.customTime;
    } else {
      const parts = match.time.split(' | ');
      if (parts.length > 1 && parts[1] !== 'TBD') {
        defaultTime = parts[1];
      } else {
        defaultTime = '18:00';
      }
    }

    setRescheduleDate(defaultDate);
    setRescheduleTime(defaultTime);
    setRoomId(override.roomId || '');
    setRoomPassword(override.roomPassword || '');
    setYoutubeLiveLink(override.youtubeLiveLink || '');
    if (override.reviewStatus === 'rejected' || override.status === 'completed' || override.isPlayed) {
      setMatchStatus('completed');
    } else {
      setMatchStatus(override.status || 'scheduled');
    }
    setScoreA(override.scoreA || 0);
    setScoreB(override.scoreB || 0);
    setWinner(override.winner || '');
    setIsRescheduled(override.isRescheduled || false);

    let defaultWalkover = null;
    if (override.status === 'completed' || override.isPlayed || override.reviewStatus === 'rejected') {
      if (override.scoreA === 7 && override.scoreB === 0 && override.winner === match.t1) defaultWalkover = 't1';
      else if (override.scoreA === 0 && override.scoreB === 7 && override.winner === match.t2) defaultWalkover = 't2';
      else if (override.scoreA === 0 && override.scoreB === 0 && (override.winner === 'NO_WINNER' || !override.winner)) defaultWalkover = 'both';
    }
    setWalkoverPreset(defaultWalkover);

    // Load or initialize player stats for both squads
    const squad1 = getSquadByTbdId(match.t1);
    const squad2 = getSquadByTbdId(match.t2);
    const initialPlayerStats: Record<string, { kills: number; damage: number }> = {};
    const savedStats = override.playerStats || {};

    const getPKey = (p: any) => p.email || p.userId || p.gameName || p.inGameName || p.name || 'unknown';

    const s1Players = squad1?.players || [];
    s1Players.forEach((p: any) => {
      const pKey = getPKey(p);
      initialPlayerStats[pKey] = {
        kills: savedStats[pKey]?.kills || 0,
        damage: savedStats[pKey]?.damage || 0
      };
    });

    const s2Players = squad2?.players || [];
    s2Players.forEach((p: any) => {
      const pKey = getPKey(p);
      initialPlayerStats[pKey] = {
        kills: savedStats[pKey]?.kills || 0,
        damage: savedStats[pKey]?.damage || 0
      };
    });

    setPlayerStats(initialPlayerStats);
  };

  const handleSaveAnnouncement = async () => {
    if (!activeAnnouncementMatch) return;
    setIsSavingAnnouncement(true);
    try {
      const docId = activeAnnouncementMatch.id;
      let actualDocId = docId;
      const existingOverride = matchOverrides[docId];
      if (existingOverride && existingOverride.id) {
        actualDocId = existingOverride.id;
      }

      const matchRef = doc(db, 'pro_league_schedule_matches', actualDocId);
      
      const currentAnnouncements = existingOverride?.announcements || [];
      let updatedAnnouncements = [...currentAnnouncements];

      if (editingAnnouncementId) {
        updatedAnnouncements = updatedAnnouncements.map((a: any) => 
          a.id === editingAnnouncementId 
            ? { ...a, text: announcementText.trim(), updatedAt: new Date().toISOString() }
            : a
        );
      } else {
        updatedAnnouncements.push({
          id: Date.now().toString(),
          text: announcementText.trim(),
          createdAt: new Date().toISOString(),
          createdBy: userProfile?.userId,
          createdByName: userProfile?.displayName || 'Admin'
        });
      }
      
      const updateData = {
        announcements: updatedAnnouncements,
        leagueId: league.id,
        matchId: docId,
        updatedAt: new Date().toISOString()
      };

      await setDoc(matchRef, updateData, { merge: true });
      
      setAnnouncementText('');
      setEditingAnnouncementId(null);
    } catch (e) {
      console.error("Failed to save announcement:", e);
      alert('Failed to save announcement.');
    } finally {
      setIsSavingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (announcementId: string) => {
    if (!activeAnnouncementMatch) return;
    if (!confirm("Are you sure you want to delete this announcement?")) return;
    try {
      const docId = activeAnnouncementMatch.id;
      let actualDocId = docId;
      const existingOverride = matchOverrides[docId];
      if (existingOverride && existingOverride.id) {
        actualDocId = existingOverride.id;
      }
      const matchRef = doc(db, 'pro_league_schedule_matches', actualDocId);
      const currentAnnouncements = existingOverride?.announcements || [];
      const updatedAnnouncements = currentAnnouncements.filter((a: any) => a.id !== announcementId);
      await setDoc(matchRef, { announcements: updatedAnnouncements, updatedAt: new Date().toISOString() }, { merge: true });
    } catch (e) {
      console.error("Failed to delete announcement:", e);
      alert("Failed to delete announcement.");
    }
  };

  const handleEditAnnouncementTrigger = (announcement: any) => {
    setEditingAnnouncementId(announcement.id);
    setAnnouncementText(announcement.text);
  };

  const hasUnreadAnnouncements = (matchId: string) => {
    const override = matchOverrides[matchId];
    if (!override || !override.announcements || override.announcements.length === 0) return false;
    
    const lastViewed = parseInt(localStorage.getItem(`announcements_viewed_${matchId}_${userProfile?.userId}`) || '0');
    const latestAnnouncementTime = new Date(override.announcements[override.announcements.length - 1].createdAt).getTime();
    
    return latestAnnouncementTime > lastViewed;
  };

  const openAnnouncementModal = (match: any) => {
    setActiveAnnouncementMatch(match);
    if (userProfile) {
      localStorage.setItem(`announcements_viewed_${match.id}_${userProfile.userId}`, Date.now().toString());
    }
  };

  const advanceKnockoutWinner = async (matchObj: any) => {
    if (!matchObj) return;
    const matchId = matchObj.matchId || matchObj.id || '';
    if (!matchObj.isKnockout && !matchId.includes('m-ko-')) return;

    let winnerName = matchObj.winner;
    const scoreA = Number(matchObj.scoreA || 0);
    const scoreB = Number(matchObj.scoreB || 0);

    if (scoreA > scoreB && matchObj.t1) {
      winnerName = matchObj.t1;
    } else if (scoreB > scoreA && matchObj.t2) {
      winnerName = matchObj.t2;
    }

    if (!winnerName) return;

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

    if (nextMatchId && targetField && winnerName) {
      try {
        const lId = league.id;
        const targetDocId = `${lId}_${nextMatchId}`;
        const nextMatchRef = doc(db, 'pro_league_schedule_matches', targetDocId);
        await setDoc(nextMatchRef, { 
          [targetField]: winnerName,
          leagueId: lId,
          matchId: nextMatchId,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log(`[LeagueScheduleView] Advanced ${winnerName} to ${targetDocId} as ${targetField}`);
      } catch (err) {
        console.error("Error advancing winner in knockout:", err);
      }
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
        const lId = league.id;
        const targetDocId = `${lId}_${nextMatchId}`;
        const nextMatchRef = doc(db, 'pro_league_schedule_matches', targetDocId);
        await setDoc(nextMatchRef, { 
          [targetField]: deleteField(),
          updatedAt: new Date().toISOString()
        }, { merge: true });
        console.log(`[LeagueScheduleView] Reverted/cleared knockout slot ${targetField} for ${targetDocId}`);
      } catch (err) {
        console.error("Error reverting winner in knockout:", err);
      }
    }
  };

  const handleSaveMatchOverrides = async () => {
    if (!editingMatch) return;
    setMatchEditError(null);

    const override = matchOverrides[editingMatch.id] || {};

    if (override.reviewStatus === 'approved' && !isSystemAdmin) {
      setMatchEditError("This match result has already been approved by Admin and is locked from further editing.");
      return;
    }

    const hasRoomDetails = roomId.trim() !== '' || roomPassword.trim() !== '';
    const hasYoutubeLink = youtubeLiveLink.trim() !== '';

    if (hasRoomDetails && !hasYoutubeLink) {
      setMatchEditError("YouTube Live Stream Link is required when setting Room ID or Password!");
      return;
    }

    if (hasYoutubeLink) {
      const ytPattern = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+$/i;
      if (!ytPattern.test(youtubeLiveLink.trim())) {
        setMatchEditError("Please enter a valid YouTube Live Stream URL (e.g. youtube.com/watch?v=... or youtu.be/...)");
        return;
      }
    }

    setIsSavingMatch(true);
    const docId = `${league.id}_${editingMatch.id}`;

    // Auto-detect completion if scores are set (non-zero or specifically entered) or screenshot is provided
    let finalStatus = matchStatus;
    const hasScores = Number(scoreA) > 0 || Number(scoreB) > 0;
    if ((screenshotFile || hasScores) && finalStatus !== 'completed') {
      finalStatus = 'completed';
    }

    try {
      let finalScreenshotUrl = override.screenshotUrl || '';
      
      if (screenshotFile) {
        setIsUploading(true);
        const uploadedUrl = await uploadToImgBB(screenshotFile);
        if (uploadedUrl) {
          finalScreenshotUrl = uploadedUrl;
        } else {
          alert("Failed to upload screenshot. Please try again.");
          setIsUploading(false);
          setIsSavingMatch(false);
          return;
        }
        setIsUploading(false);
      }

      const matchRef = doc(db, 'pro_league_schedule_matches', docId);
      
      const s1Resolved = getSquadByNameOrTbd(editingMatch.t1);
      const s2Resolved = getSquadByNameOrTbd(editingMatch.t2);

      const s1Name = s1Resolved?.teamName || s1Resolved?.squadName || editingMatch.t1;
      const s2Name = s2Resolved?.teamName || s2Resolved?.squadName || editingMatch.t2;

      const computedWinner = Number(scoreA) > Number(scoreB) 
        ? s1Name 
        : Number(scoreB) > Number(scoreA) 
          ? s2Name 
          : (winner || s1Name);

      let matchNum = editingMatch.matchNumber;
      if (!matchNum || isNaN(Number(matchNum))) {
        if (editingMatch.globalOrder && !isNaN(Number(editingMatch.globalOrder))) {
          matchNum = Number(editingMatch.globalOrder);
        } else {
          const mId = editingMatch.id || editingMatch.matchId || '';
          const squadSize = league?.squadSize || 8;
          const totalMatchesCount = squadSize <= 4 ? 7 : squadSize <= 8 ? 15 : squadSize <= 16 ? 31 : squadSize <= 32 ? 63 : 127;
          if (mId.includes('m-ko-final')) matchNum = totalMatchesCount;
          else if (mId.includes('m-ko-sf2')) matchNum = totalMatchesCount - 1;
          else if (mId.includes('m-ko-sf1')) matchNum = totalMatchesCount - 2;
          else if (mId.includes('m-ko-qf4')) matchNum = totalMatchesCount - 3;
          else if (mId.includes('m-ko-qf3')) matchNum = totalMatchesCount - 4;
          else if (mId.includes('m-ko-qf2')) matchNum = totalMatchesCount - 5;
          else if (mId.includes('m-ko-qf1')) matchNum = totalMatchesCount - 6;
          else if (mId.includes('m-ko-pqf-')) {
            const parts = mId.split('m-ko-pqf-');
            const idx = parseInt(parts[1], 10) || 1;
            matchNum = totalMatchesCount - 14 + (idx - 1);
          } else {
            matchNum = 1;
          }
        }
      }
      const rNum = editingMatch.roundNumber || 1;
      let rName = editingMatch.roundName || editingMatch.phase || '';
      if (!rName) {
        const roundsList = getRoundsList();
        const foundRound = roundsList.find(r => r.id === rNum);
        rName = foundRound ? foundRound.name : `Round ${rNum}`;
      }

      const payload: any = {
        leagueId: league.id,
        matchId: editingMatch.id,
        matchNumber: matchNum,
        roundNumber: rNum,
        roundName: rName,
        customDate: rescheduleDate,
        customTime: rescheduleTime,
        roomId: roomId.trim(),
        roomPassword: roomPassword.trim(),
        youtubeLiveLink: youtubeLiveLink.trim(),
        screenshotUrl: finalScreenshotUrl,
        status: finalStatus,
        scoreA: Number(scoreA),
        scoreB: Number(scoreB),
        winner: computedWinner,
        t1: s1Name,
        t2: s2Name,
        isPlayed: finalStatus === 'completed',
        isRescheduled: isRescheduled,
        updatedAt: new Date().toISOString()
      };

      // 1. New workflow: If status is 'completed', set reviewStatus to 'pending'
      // and do NOT apply stats immediately.
      if (finalStatus === 'completed') {
        payload.playerStats = playerStats;
        const uProfAny = userProfile as any;
        payload.submittedBy = uProfAny?.userId || uProfAny?.uid || '';
        payload.submittedByName = uProfAny?.displayName || uProfAny?.gameName || uProfAny?.name || 'Host';
        payload.submittedByEmail = uProfAny?.email || '';
        payload.submittedByPhone = uProfAny?.mobile || uProfAny?.phone || uProfAny?.phoneNumber || uProfAny?.mobileNumber || '';
        payload.submittedByPhoto = uProfAny?.photoURL || uProfAny?.avatarUrl || '';
        payload.submittedAt = new Date().toISOString();
        
        if (override.reviewStatus === 'approved' && !isSystemAdmin) {
          payload.reviewStatus = 'approved';
          if (!override.statsApplied) {
            payload.statsApplied = true;
            await applyMatchStatsToPlayers(payload);
          }
        } else {
          // If stats were previously applied (e.g., approved previously), rollback first before resetting
          if (override.statsApplied) {
            await rollbackMatchStatsFromPlayers(override);
          }
          payload.reviewStatus = 'pending';
          payload.statsApplied = false;
          payload.rejectionReason = null;
        }
      } else {
        // If stats were previously applied but match is moved away from completed status, rollback
        if (override.statsApplied) {
          await rollbackMatchStatsFromPlayers(override);
        }
        payload.reviewStatus = null;
        payload.statsApplied = false;
      }
      
      await setDoc(matchRef, payload);

      if (payload.reviewStatus === 'approved' || (isSystemAdmin && finalStatus === 'completed')) {
        await advanceKnockoutWinner({ ...editingMatch, ...payload });
      } else {
        await revertKnockoutWinner({ ...editingMatch, ...payload });
      }

      setEditingMatch(null);
      setScreenshotFile(null);
      if (finalStatus === 'completed' && payload.reviewStatus === 'pending') {
        if (override.reviewStatus === 'rejected') {
          alert('Match result re-submitted for review! It will be finalized after admin approval.');
        } else {
          alert('Match result submitted for review. It will be finalized after admin approval.');
        }
      } else {
        alert('Match details updated successfully!');
      }
    } catch (e) {
      console.error(e);
      alert('Failed to update match details.');
      handleFirestoreError(e, OperationType.WRITE, `pro_league_schedule_matches/${docId}`);
    } finally {
      setIsSavingMatch(false);
      setIsUploading(false);
    }
  };

  const isSystemAdmin = userProfile && (userProfile.role === "admin" || userProfile.role === "main_admin");
  const isHostOrCoHost = userProfile && (userProfile.userId === league.hostId || (league.coordinators || []).includes(userProfile.userId));
  const canManage = userProfile && (
    userProfile.userId === league.hostId || 
    (league.coordinators || []).includes(userProfile.userId) || 
    userProfile.role === 'admin' || 
    userProfile.role === 'main_admin'
  );

  useEffect(() => {
    // Sync tokens from database
    if (userProfile?.userId) {
      const userRef = doc(db, 'users', userProfile.userId);
      const unsub = onSnapshot(userRef, (snapshot) => {
        if (snapshot.exists()) {
          setCurrentTokens(snapshot.data().tokens || 0);
        }
      }, (error) => {
        handleFirestoreError(error, OperationType.GET, `users/${userProfile.userId}`);
      });
      return () => unsub();
    }
  }, [userProfile?.userId]);

  useEffect(() => {
    // Fetch registered squads for this league
    const q = query(
      collection(db, 'pro_league_squads'),
      where('leagueId', '==', league.id)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setRegisteredSquads(data);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'pro_league_squads');
    });

    // Fetch user's teams
    if (userProfile?.userId) {
      const teamsQ = query(
        collection(db, 'teams'),
        where('leaderId', '==', userProfile.userId)
      );
      getDocs(teamsQ).then(snap => {
        setMyTeams(snap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
      }).catch(err => {
        handleFirestoreError(err, OperationType.LIST, 'teams');
      });
    }

    return () => unsubscribe();
  }, [league.id, userProfile?.userId]);

  const uploadToImgBB = async (file: File) => {
    try {
      // Use centralized utility with the requested category prefix
      return await uploadScreenshotToImgBB(file, 'match_result_screenshots');
    } catch (error) {
      console.error("Error uploading to ImgBB:", error);
      return null;
    }
  };

  const getSquadByNameOrTbd = (idOrName: string) => {
    return getSquadByTbdId(idOrName);
  };

  const isUserAlreadyJoinedInLeague = () => {
    if (!userProfile) return false;
    const uEmail = (userProfile.email || '').trim().toLowerCase();
    const uUserId = userProfile.userId || (userProfile as any).id || (userProfile as any).uid;
    const uGamingUid = (userProfile.gamingUid || (userProfile as any).gameUid || (userProfile as any).inGameUid || (userProfile as any).uidInGame || '').toString().trim();
    const uGameName = (userProfile.gameName || userProfile.displayName || '').trim().toLowerCase();

    return registeredSquads.some(squad => {
      // 1. Leader ID / Email / Captain ID check
      if (squad.leaderId && (squad.leaderId === uUserId || squad.leaderId === userProfile.userId)) return true;
      if (squad.leaderEmail && uEmail && squad.leaderEmail.trim().toLowerCase() === uEmail) return true;
      if (squad.captainId && (squad.captainId === uUserId || squad.captainId === userProfile.userId)) return true;

      // 2. User's owned squads check
      if (myTeams.some(t => t.id === squad.teamId || t.id === squad.id)) return true;

      // 3. Check players and members in registered squad
      const squadPlayers = squad.players || squad.members || squad.playerList || squad.roster || [];
      if (Array.isArray(squadPlayers)) {
        const isPlayerMatch = squadPlayers.some((m: any) => {
          if (!m) return false;
          const mUserId = m.userId || m.uid || m.id;
          if (mUserId && uUserId && (mUserId === uUserId || mUserId === userProfile.userId)) return true;

          const mEmail = (m.email || '').trim().toLowerCase();
          if (mEmail && uEmail && mEmail === uEmail) return true;

          const mGamingUid = (m.gamingUid || m.uid || m.gameUid || m.inGameUid || '').toString().trim();
          if (mGamingUid && uGamingUid && mGamingUid === uGamingUid) return true;

          const mInGameName = (m.inGameName || m.gameName || m.name || m.playerName || m.displayName || '').trim().toLowerCase();
          if (uGameName && mInGameName && mInGameName === uGameName && mInGameName.length > 2) return true;

          return false;
        });
        if (isPlayerMatch) return true;
      }

      return false;
    });
  };

  const handleRequestJoin = (tbdId: string) => {
    // 1. First, check if the user has a squad created on their profile
    if (myTeams.length === 0) {
      setNoSquadModalOpen(true);
      return;
    }

    // 2. Next, check if the user is already joined with any squad in this league
    if (isUserAlreadyJoinedInLeague()) {
      setAlreadyJoinedModalOpen(true);
      return;
    }

    // 3. Check if the squad slot is available or full
    const existingSquad = getSquadByTbdId(tbdId);
    if (existingSquad && !existingSquad.isPlaceholder) {
      setSquadFullModalOpen(true);
      return;
    }

    // 4. Check Invite-Only access
    if (league.accessType === 'invite') {
      const userEmail = (userProfile?.email || '').trim().toLowerCase();
      const isInvited = (league.invitedEmails || []).some(
        e => e.trim().toLowerCase() === userEmail
      );
      const isHost = league.hostId === userProfile?.userId || userProfile?.role === 'admin' || userProfile?.role === 'main_admin';
      
      if (!isInvited && !isHost) {
        setRegError('This league is Invite Only. Only squads invited by the Host via Gmail can join.');
        setJoiningTbdId(tbdId);
        return;
      }
    }

    setJoiningTbdId(tbdId);
    setAccessCodeInput('');
    setAccessCodeError(null);
  };

  const handleJoinLeague = async (tbdId: string, teamId: string, confirmed = false) => {
    if (!userProfile) return;

    // 1. Check if the user has a squad
    if (myTeams.length === 0) {
      setJoiningTbdId(null);
      setShowConfirmStep(null);
      setNoSquadModalOpen(true);
      return;
    }

    // 2. Check if user has already joined with any squad in this league
    if (isUserAlreadyJoinedInLeague()) {
      setJoiningTbdId(null);
      setShowConfirmStep(null);
      setAlreadyJoinedModalOpen(true);
      return;
    }

    // 3. Check if slot is available or full
    const existingSquad = getSquadByTbdId(tbdId);
    if (existingSquad && !existingSquad.isPlaceholder) {
      setJoiningTbdId(null);
      setShowConfirmStep(null);
      setSquadFullModalOpen(true);
      return;
    }

    const team = myTeams.find(t => t.id === teamId);
    if (!team) return;

    // 4. Check if any member of this team is already in another registered squad in this league
    const teamMembers = team.members || [];
    const conflictingMember = teamMembers.find((m: any) => {
      if (!m) return false;
      const mUid = m.userId || m.uid || m.id;
      const mEmail = (m.email || '').trim().toLowerCase();
      const mGamingUid = (m.gamingUid || m.uid || m.gameUid || m.inGameUid || '').toString().trim();

      return registeredSquads.some((sq: any) => {
        if (sq.leaderId && mUid && sq.leaderId === mUid) return true;
        if (sq.leaderEmail && mEmail && sq.leaderEmail.trim().toLowerCase() === mEmail) return true;

        const regPlayers = sq.players || sq.members || sq.playerList || sq.roster || [];
        return Array.isArray(regPlayers) && regPlayers.some((sp: any) => {
          if (!sp) return false;
          const spUid = sp.userId || sp.uid || sp.id;
          if (spUid && mUid && spUid === mUid) return true;
          const spEmail = (sp.email || '').trim().toLowerCase();
          if (spEmail && mEmail && spEmail === mEmail) return true;
          const spGamingUid = (sp.gamingUid || sp.uid || sp.gameUid || sp.inGameUid || '').toString().trim();
          if (spGamingUid && mGamingUid && spGamingUid === mGamingUid) return true;
          return false;
        });
      });
    });

    if (conflictingMember) {
      setRegError(`Member "${(conflictingMember as any).gameName || (conflictingMember as any).displayName || (conflictingMember as any).inGameName || conflictingMember.email || 'A player'}" is already registered with another Squad in this league!`);
      return;
    }

    setRegError(null);
    setAccessCodeError(null);

    // 4. Access Code Verification
    if ((league.accessType === 'code' || league.accessCode) && league.accessCode) {
      const userIsHost = league.hostId === userProfile.userId || userProfile.role === 'admin' || userProfile.role === 'main_admin';
      if (!userIsHost) {
        if (!accessCodeInput.trim()) {
          setAccessCodeError('Please enter the secret League Access Code.');
          return;
        }
        if (accessCodeInput.trim().toUpperCase() !== league.accessCode.trim().toUpperCase()) {
          setAccessCodeError('Invalid Access Code. Please check and try again.');
          return;
        }
      }
    }

    // 5. Invite Only Verification
    if (league.accessType === 'invite') {
      const userEmail = (userProfile.email || '').trim().toLowerCase();
      const isInvited = (league.invitedEmails || []).some(
        e => e.trim().toLowerCase() === userEmail
      );
      const isHost = league.hostId === userProfile.userId || userProfile.role === 'admin' || userProfile.role === 'main_admin';
      
      if (!isInvited && !isHost) {
        setRegError('This league is Invite Only. Only squads invited by the Host via Gmail can join.');
        return;
      }
    }

    // Location restrictions
    const uDiv = userProfile.division || '';
    const uDist = userProfile.district || '';
    const uUpa = userProfile.upazila || '';

    if (league.locationRestrictionType === 'specific_division' && uDiv !== league.allowedDivision) {
      setRegError(`This league is restricted to squads from ${league.allowedDivision} division only.`);
      return;
    }
    if (league.locationRestrictionType === 'specific_district' && uDist !== league.allowedDistrict) {
      setRegError(`This league is restricted to squads from ${league.allowedDistrict} district only.`);
      return;
    }
    if (league.locationRestrictionType === 'specific_upazila' && uUpa !== league.allowedUpazila) {
      setRegError(`This league is restricted to squads from ${league.allowedUpazila} upazila only.`);
      return;
    }

    const isOwnSquad = (s: any) => 
      (s.leaderId && (s.leaderId === userProfile.userId || s.leaderId === (userProfile as any).id || s.leaderId === (userProfile as any).uid)) ||
      (s.leaderEmail && s.leaderEmail.trim().toLowerCase() === (userProfile.email || '').trim().toLowerCase()) ||
      myTeams.some(t => t.id === s.teamId);

    // Representation rules
    if (league.representationRule && league.representationRule !== 'any') {
      if (league.representationRule === 'one_squad_per_division') {
         if (!uDiv) {
           setRegError("Your profile must have a division set to join this league.");
           return;
         }
         if (registeredSquads.some(s => s.division && s.division.trim().toLowerCase() === uDiv.trim().toLowerCase())) {
           setRegError(`Someone from your Division (${uDiv}) has already joined this league! Only 1 squad per Division is allowed.`);
           return;
         }
      }
      if (league.representationRule === 'one_squad_per_district') {
         if (!uDist) {
           setRegError("Your profile must have a district set to join this league.");
           return;
         }
         if (registeredSquads.some(s => s.district && s.district.trim().toLowerCase() === uDist.trim().toLowerCase())) {
           setRegError(`Someone from your District (${uDist}) has already joined this league! Only 1 squad per District is allowed.`);
           return;
         }
      }
      if (league.representationRule === 'one_squad_per_upazila') {
         if (!uUpa) {
           setRegError("Your profile must have an upazila set to join this league.");
           return;
         }
         if (registeredSquads.some(s => s.upazila && s.upazila.trim().toLowerCase() === uUpa.trim().toLowerCase())) {
           setRegError(`Someone from your Upazila (${uUpa}) has already joined this league! Only 1 squad per Upazila is allowed.`);
           return;
         }
      }
    }

    if (league.entryFee > 0) {
      if (currentTokens < league.entryFee) {
        setRegError("Insufficient tokens! Please top up your wallet.");
        return;
      }
      if (!confirmed) {
        setShowConfirmStep({ tbdId, teamId });
        return;
      }
    }

    setRegistering(true);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userProfile.userId);
        const leagueRef = doc(db, 'pro_hosted_leagues', league.id);
        
        // READS FIRST
        const [userDoc, leagueDoc] = await Promise.all([
          transaction.get(userRef),
          transaction.get(leagueRef)
        ]);

        if (!leagueDoc.exists()) throw new Error('League not found');

        const leagueData = leagueDoc.data();
        const normalizedUserEmail = (userProfile.email || '').toLowerCase();
        const isUserAdminOrHost = normalizedUserEmail === 'vortexesports150@gmail.com' || 
                                 userProfile.role === 'admin' || 
                                 userProfile.role === 'main_admin' || 
                                 userProfile.role === 'sub_admin' || 
                                 leagueData?.hostId === userProfile.userId;

        const dbTokens = userDoc.data()?.tokens || 0;
        const currentWalletTokens = leagueData.walletTokens || 0;

        // Regional representation checks (Atomic)
        if (!isUserAdminOrHost && leagueData.representationRule && leagueData.representationRule !== 'any') {
          if (leagueData.representationRule === 'one_squad_per_division') {
            if (!uDiv) throw new Error("Your profile must have a division set to join this league.");
            const existing = registeredSquads.find(s => s.division && s.division.trim().toLowerCase() === uDiv.trim().toLowerCase());
            if (existing) {
              throw new Error(`Someone from your Division (${uDiv}) has already joined this league! Only 1 squad per Division is allowed.`);
            }
          } else if (leagueData.representationRule === 'one_squad_per_district') {
            if (!uDist) throw new Error("Your profile must have a district set to join this league.");
            const existing = registeredSquads.find(s => s.district && s.district.trim().toLowerCase() === uDist.trim().toLowerCase());
            if (existing) {
              throw new Error(`Someone from your District (${uDist}) has already joined this league! Only 1 squad per District is allowed.`);
            }
          } else if (leagueData.representationRule === 'one_squad_per_upazila') {
            if (!uUpa) throw new Error("Your profile must have an upazila set to join this league.");
            const existing = registeredSquads.find(s => s.upazila && s.upazila.trim().toLowerCase() === uUpa.trim().toLowerCase());
            if (existing) {
              throw new Error(`Someone from your Upazila (${uUpa}) has already joined this league! Only 1 squad per Upazila is allowed.`);
            }
          }
        }
        
        if (league.entryFee > 0) {
          if (dbTokens < league.entryFee) throw new Error('Insufficient tokens');
          
          const nextTokens = dbTokens - league.entryFee;
          // Deduct from user
          transaction.update(userRef, { tokens: nextTokens });
          
          // Add to host league wallet
          const currentBal = leagueDoc.data()?.walletBalance || currentWalletTokens;
          transaction.update(leagueRef, { 
            walletTokens: currentWalletTokens + league.entryFee,
            walletBalance: currentBal + league.entryFee
          });
          
          // User Wallet History
          const userHistoryRef = doc(collection(db, 'wallet_history'));
          transaction.set(userHistoryRef, {
            userId: userProfile.userId,
            userName: userProfile.displayName,
            type: 'debit',
            amount: league.entryFee,
            balanceAfter: nextTokens,
            description: `Joined League: ${league.leagueName}`,
            leagueId: league.id,
            leagueName: league.leagueName,
            createdAt: serverTimestamp()
          });

          // User Personal Token Transactions
          const userTokenTxRef = doc(collection(db, 'users', userProfile.userId, 'tokenTransactions'));
          transaction.set(userTokenTxRef, {
            type: 'entry_fee',
            amount: league.entryFee,
            balanceAfter: nextTokens,
            description: `Joined League: ${league.leagueName}`,
            reason: `Joined League: ${league.leagueName}`,
            leagueId: league.id,
            leagueName: league.leagueName,
            createdAt: serverTimestamp()
          });

          // Host Wallet History
          const hostHistoryRef = doc(collection(db, 'pro_host_wallet_history'));
          transaction.set(hostHistoryRef, {
            leagueId: league.id,
            hostId: league.hostId,
            type: 'income',
            amount: league.entryFee,
            balanceAfter: currentWalletTokens + league.entryFee,
            description: `Registration fee from ${userProfile.displayName}`,
            userEmail: userProfile.email,
            userName: userProfile.displayName,
            createdAt: serverTimestamp()
          });
        }

        const newSquadRef = doc(collection(db, 'pro_league_squads'));
        transaction.set(newSquadRef, {
          leagueId: league.id,
          tbdId,
          teamId: team.id,
          teamName: team.name,
          leaderId: userProfile.userId,
          division: uDiv,
          district: uDist,
          upazila: uUpa,
          players: team.members,
          coverUrl: team.coverUrl || '',
          points: 0,
          createdAt: serverTimestamp()
        });

        // Update explicit regional lists in league doc
        const allSquadsList = [...registeredSquads, { division: uDiv, district: uDist, upazila: uUpa }];
        const finalUpazilas = Array.from(new Set(
          allSquadsList.map((s: any) => s.upazila).filter(Boolean).map((u: string) => u.trim())
        ));
        const finalDistricts = Array.from(new Set(
          allSquadsList.map((s: any) => s.district).filter(Boolean).map((d: string) => d.trim())
        ));
        const finalDivisions = Array.from(new Set(
          allSquadsList.map((s: any) => s.division).filter(Boolean).map((v: string) => v.trim())
        ));

        transaction.update(leagueRef, {
          registeredUpazilas: finalUpazilas,
          registeredDistricts: finalDistricts,
          registeredDivisions: finalDivisions
        });
      });

      if (league.entryFee > 0) {
        const nextTokens = currentTokens - league.entryFee;
        setCurrentTokens(nextTokens);
        if (setTokens) {
          setTokens(nextTokens);
        }
      }

      setJoiningTbdId(null);
      setShowConfirmStep(null);
      // alert("Successfully joined the league!");
    } catch (e: any) {
      const msg = e.message || "Failed to join league.";
      if (
        msg.includes('already') ||
        msg.includes('restricted') ||
        msg.includes('must have') ||
        msg.includes('registered') ||
        msg.includes('tokens')
      ) {
        console.log('League registration notice:', msg);
      } else {
        console.error('Error joining league:', e);
      }
      setRegError(msg);
    } finally {
      setRegistering(false);
    }
  };

  const getSquadColor = (name: string) => {
    const cleanName = name.trim().toUpperCase();
    
    // Extract trailing numbers to ensure distinct shifts for TBD-A1, TBD-A2, etc.
    const match = cleanName.match(/(\d+)$/);
    const suffixNum = match ? parseInt(match[1]) : 0;
    
    let hash = 0;
    for (let i = 0; i < cleanName.length; i++) {
      hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    // Base hue from string hash
    let h = (Math.abs(hash) % 360);
    
    // If it has a number at the end, shift the hue drastically by a large prime (137 degrees)
    // This ensures TBD-A1 and TBD-A2 are on opposite sides of the color wheel
    if (suffixNum > 0) {
      h = (h + (suffixNum * 137)) % 360;
    } else {
      // For names without numbers, use a different multiplier
      h = (Math.abs(hash) * 97) % 360;
    }
    
    // Return high-vibrancy HSL for neon effect
    return `hsl(${h}, 95%, 65%)`;
  };

  const getDynamicFontSize = (name: string, baseSize: number = 10) => {
    if (name.length > 15) return `${baseSize - 3}px`;
    if (name.length > 12) return `${baseSize - 2}px`;
    if (name.length > 8) return `${baseSize - 1}px`;
    return `${baseSize}px`;
  };

  const getNeonStyle = (name: string, baseSize: number = 10) => {
    const color = getSquadColor(name);
    return {
      color,
      textShadow: `0 0 8px ${color}aa, 0 0 15px ${color}55`,
      fontSize: getDynamicFontSize(name, baseSize),
      whiteSpace: 'nowrap' as const,
      overflow: 'hidden' as const,
      textOverflow: 'ellipsis' as const,
    };
  };

  const getNeonBoxStyle = (name: string) => {
    const color = getSquadColor(name);
    return {
      backgroundColor: `${color}15`,
      border: `1px solid ${color}60`,
      color,
      boxShadow: `0 0 12px ${color}30, inset 0 0 8px ${color}20`,
      textShadow: `0 0 5px ${color}aa`,
    };
  };

  // Mock Groups for UI
  const numGroups = Math.max(1, Math.floor(league.squadSize / 4));
  const groups = Array.from({ length: numGroups }, (_, i) => String.fromCharCode(65 + i));
  
  const handleSendMatchAppeal = async () => {
    if (!appealMessage.trim() || !userProfile || !appealMatch) return;
    setIsSendingAppeal(true);
    try {
      await addDoc(collection(db, 'admin_messages'), {
        senderId: userProfile.userId,
        senderName: userProfile.displayName || 'User',
        senderEmail: userProfile.email || '',
        senderPhoto: userProfile.photoURL || null,
        type: 'match_issue',
        message: appealMessage.trim(),
        status: 'unread',
        replies: [],
        sourceContext: {
          type: 'match_card',
          leagueId: league.id,
          matchId: appealMatch.id
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setAppealMessage('');
      setAppealMatch(null);
      alert("Your message has been sent to the admin team.");
    } catch (err: any) {
      console.error("Error sending appeal:", err);
      alert(err.message || "Failed to send message. Please try again.");
    } finally {
      setIsSendingAppeal(false);
    }
  };

  const getRoundsList = () => {
    const list: { id: number; name: string; label: string; isHallOfGlory?: boolean }[] = [{ id: 1, name: 'Group Stage', label: 'Round One' }];
    const numGroups = Math.max(1, Math.floor(league.squadSize / 4));
    
    if (numGroups === 1) {
      list.push({ id: 2, name: 'Grand Final', label: 'Round Two' });
    } else if (numGroups === 2) {
      list.push({ id: 2, name: 'Semi Finals', label: 'Round Two' });
      list.push({ id: 3, name: 'Grand Final', label: 'Round Three' });
    } else if (numGroups === 4) {
      list.push({ id: 2, name: 'Quarter Finals', label: 'Round Two' });
      list.push({ id: 3, name: 'Semi Finals', label: 'Round Three' });
      list.push({ id: 4, name: 'Grand Final', label: 'Round Four' });
    } else if (numGroups === 8) {
      list.push({ id: 2, name: 'Pre-Quarter Finals (Round of 16)', label: 'Round Two' });
      list.push({ id: 3, name: 'Quarter Finals', label: 'Round Three' });
      list.push({ id: 4, name: 'Semi Finals', label: 'Round Four' });
      list.push({ id: 5, name: 'Grand Final', label: 'Round Five' });
    } else {
      let roundId = 2;
      const advancedCount = numGroups * 2;
      if (advancedCount > 8) {
        list.push({ id: roundId++, name: 'Pre-Quarter Finals (Round of 16)', label: 'Round Two' });
      }
      if (advancedCount > 4) {
        list.push({ id: roundId++, name: 'Quarter Finals', label: `Round ${roundId - 1}` });
      }
      list.push({ id: roundId++, name: 'Semi Finals', label: `Round ${roundId - 1}` });
      list.push({ id: roundId++, name: 'Grand Final', label: `Round ${roundId - 1}` });
    }
    
    const nextId = list[list.length - 1].id + 1;
    list.push({ id: nextId, name: 'Hall of Glory', label: 'Prize Distribution', isHallOfGlory: true });
    const roundLabels = ['Round One', 'Round Two', 'Round Three', 'Round Four', 'Round Five', 'Round Six'];
    return list.map((r, idx) => ({
      ...r,
      label: r.isHallOfGlory ? r.label : (roundLabels[idx] || `Round ${idx + 1}`)
    }));
  };

  const getKnockoutMatches = (roundId: number) => {
    const roundsList = getRoundsList();
    const activeRoundInfo = roundsList.find(r => r.id === roundId);
    if (!activeRoundInfo) return [];

    const numGroups = Math.max(1, Math.floor(league.squadSize / 4));
    const matches: any[] = [];
    
    const openingDate = league.openingMatchDate || new Date().toISOString();
    const formatDateShort = (dateStr: string) => {
      if (!dateStr) return "";
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch (e) {
        return dateStr;
      }
    };

    const groupMatchesCount = numGroups * 6;
    const slotsPerDay = league.slotsPerDay || 4;
    const groupStageDays = Math.ceil(groupMatchesCount / slotsPerDay) || 3;
    
    const getKnockoutDate = (matchIndex: number, roundOffset: number) => {
      const baseDate = new Date(openingDate);
      const totalDaysOffset = groupStageDays + roundOffset + Math.floor(matchIndex / 2);
      baseDate.setDate(baseDate.getDate() + totalDaysOffset);
      return formatDateShort(baseDate.toISOString());
    };

    const roundName = activeRoundInfo.name;
    const roundOffsetDays = (roundId - 2) * 2 + 1;

    const squadSize = league.squadSize || 8;
    const totalMatchesCount = squadSize <= 4 ? 7 : squadSize <= 8 ? 15 : squadSize <= 16 ? 31 : squadSize <= 32 ? 63 : 127;

    if (roundName.includes('Grand Final')) {
      matches.push({
        id: `m-ko-final`,
        matchNumber: totalMatchesCount,
        roundNumber: roundId,
        roundName: roundName,
        title: 'Grand Finals - Championship Match',
        t1: numGroups === 1 ? 'Rank 1 Group A' : 'Winner Semi Final #1',
        t2: numGroups === 1 ? 'Rank 2 Group A' : 'Winner Semi Final #2',
        time: `${getKnockoutDate(0, roundOffsetDays)} | 20:00`,
        status: 'scheduled',
        map: 'Purgatory / Bermuda',
        isKnockout: true,
        phase: 'Final'
      });
    } else if (roundName.includes('Semi Finals')) {
      let team1Text = 'Winner Quarter Final #1';
      let team2Text = 'Winner Quarter Final #3';
      let team1Text2 = 'Winner Quarter Final #2';
      let team2Text2 = 'Winner Quarter Final #4';
      
      if (numGroups === 2) {
        team1Text = 'Rank 1 Group A';
        team2Text = 'Rank 2 Group B';
        team1Text2 = 'Rank 1 Group B';
        team2Text2 = 'Rank 2 Group A';
      }

      matches.push({
        id: `m-ko-sf1`,
        matchNumber: totalMatchesCount - 2,
        roundNumber: roundId,
        roundName: roundName,
        title: 'Semi Final #1',
        t1: team1Text,
        t2: team2Text,
        time: `${getKnockoutDate(0, roundOffsetDays)} | 18:00`,
        status: 'scheduled',
        map: 'Bermuda',
        isKnockout: true,
        phase: 'Semi Finals'
      });
      matches.push({
        id: `m-ko-sf2`,
        matchNumber: totalMatchesCount - 1,
        roundNumber: roundId,
        roundName: roundName,
        title: 'Semi Final #2',
        t1: team1Text2,
        t2: team2Text2,
        time: `${getKnockoutDate(1, roundOffsetDays)} | 19:30`,
        status: 'scheduled',
        map: 'Kalahari',
        isKnockout: true,
        phase: 'Semi Finals'
      });
    } else if (roundName.includes('Quarter Finals')) {
      let t1_1 = 'Rank 1 Group A';
      let t2_1 = 'Rank 2 Group B';
      let t1_2 = 'Rank 1 Group B';
      let t2_2 = 'Rank 2 Group A';
      let t1_3 = 'Rank 1 Group C';
      let t2_3 = 'Rank 2 Group D';
      let t1_4 = 'Rank 1 Group D';
      let t2_4 = 'Rank 2 Group C';

      if (numGroups === 8) {
        t1_1 = 'Winner Pre-QF #1';
        t2_1 = 'Winner Pre-QF #3';
        t1_2 = 'Winner Pre-QF #2';
        t2_2 = 'Winner Pre-QF #4';
        t1_3 = 'Winner Pre-QF #5';
        t2_3 = 'Winner Pre-QF #7';
        t1_4 = 'Winner Pre-QF #6';
        t2_4 = 'Winner Pre-QF #8';
      }

      matches.push({
        id: `m-ko-qf1`,
        matchNumber: totalMatchesCount - 6,
        roundNumber: roundId,
        roundName: roundName,
        title: 'Quarter Final #1',
        t1: t1_1,
        t2: t2_1,
        time: `${getKnockoutDate(0, roundOffsetDays)} | 18:00`,
        status: 'scheduled',
        map: 'Bermuda',
        isKnockout: true,
        phase: 'Quarter Finals'
      });
      matches.push({
        id: `m-ko-qf2`,
        matchNumber: totalMatchesCount - 5,
        roundNumber: roundId,
        roundName: roundName,
        title: 'Quarter Final #2',
        t1: t1_2,
        t2: t2_2,
        time: `${getKnockoutDate(1, roundOffsetDays)} | 19:15`,
        status: 'scheduled',
        map: 'Purgatory',
        isKnockout: true,
        phase: 'Quarter Finals'
      });
      matches.push({
        id: `m-ko-qf3`,
        matchNumber: totalMatchesCount - 4,
        roundNumber: roundId,
        roundName: roundName,
        title: 'Quarter Final #3',
        t1: t1_3,
        t2: t2_3,
        time: `${getKnockoutDate(2, roundOffsetDays)} | 20:30`,
        status: 'scheduled',
        map: 'Kalahari',
        isKnockout: true,
        phase: 'Quarter Finals'
      });
      matches.push({
        id: `m-ko-qf4`,
        matchNumber: totalMatchesCount - 3,
        roundNumber: roundId,
        roundName: roundName,
        title: 'Quarter Final #4',
        t1: t1_4,
        t2: t2_4,
        time: `${getKnockoutDate(3, roundOffsetDays)} | 21:45`,
        status: 'scheduled',
        map: 'Alpine',
        isKnockout: true,
        phase: 'Quarter Finals'
      });
    } else if (roundName.includes('Pre-Quarter Finals') || roundName.includes('Round of 16')) {
      const groupsList = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
      for (let i = 0; i < 8; i += 2) {
        const g1 = groupsList[i] || String.fromCharCode(65 + i);
        const g2 = groupsList[i + 1] || String.fromCharCode(65 + i + 1);
        
        matches.push({
          id: `m-ko-pqf-${i+1}`,
          matchNumber: totalMatchesCount - 14 + i,
          roundNumber: roundId,
          roundName: roundName,
          title: `Pre-Quarter Final #${i+1}`,
          t1: `Rank 1 Group ${g1}`,
          t2: `Rank 2 Group ${g2}`,
          time: `${getKnockoutDate(i, roundOffsetDays)} | ${18 + Math.floor(i/2)}:00`,
          status: 'scheduled',
          map: 'Bermuda',
          isKnockout: true,
          phase: 'Pre-Quarter Finals'
        });
        
        matches.push({
          id: `m-ko-pqf-${i+2}`,
          matchNumber: totalMatchesCount - 14 + i + 1,
          roundNumber: roundId,
          roundName: roundName,
          title: `Pre-Quarter Final #${i+2}`,
          t1: `Rank 1 Group ${g2}`,
          t2: `Rank 2 Group ${g1}`,
          time: `${getKnockoutDate(i+1, roundOffsetDays)} | ${18 + Math.floor((i+1)/2)}:45`,
          status: 'scheduled',
          map: 'Kalahari',
          isKnockout: true,
          phase: 'Pre-Quarter Finals'
        });
      }
    } else {
      matches.push({
        id: `m-ko-fallback`,
        matchNumber: totalMatchesCount,
        roundNumber: roundId,
        roundName: roundName,
        title: `${roundName} - Match 1`,
        t1: 'Rank 1 Team',
        t2: 'Rank 2 Team',
        time: `${getKnockoutDate(0, roundOffsetDays)} | 18:00`,
        status: 'scheduled',
        map: 'Bermuda',
        isKnockout: true,
        phase: roundName
      });
    }

    return matches.map(m => {
      const override = matchOverrides[m.id] || matchOverrides[`${league.id}_${m.id}`];
      if (override) {
        let timeDisplay = m.time;
        if (override.customDate && override.customTime) {
          timeDisplay = `${formatDateShort(override.customDate)} | ${override.customTime}`;
        }
        return {
          ...m,
          t1: override.t1 || m.t1,
          t2: override.t2 || m.t2,
          time: timeDisplay,
          status: override.status || m.status,
          roomId: override.roomId || '',
          roomPassword: override.roomPassword || '',
          youtubeLiveLink: override.youtubeLiveLink || '',
          winner: override.winner || '',
          scoreA: override.scoreA ?? null,
          scoreB: override.scoreB ?? null,
          isPlayed: override.isPlayed || false,
          isRescheduled: override.isRescheduled || false,
          reviewStatus: override.reviewStatus,
          roundNumber: override.roundNumber || m.roundNumber || roundId,
          roundName: override.roundName || m.roundName || roundName,
          matchNumber: override.matchNumber || m.matchNumber
        };
      }
      return m;
    }).sort((a, b) => a.matchNumber - b.matchNumber);
  };

  // Helper to match squad identifiers loosely
  const isSquadMatch = (squadTbdId: string, squadReg: any, targetVal: any) => {
    if (!targetVal) return false;
    const target = String(targetVal).trim().toLowerCase();
    if (!target) return false;

    const tbdClean = String(squadTbdId || '').trim().toLowerCase();
    if (tbdClean && target === tbdClean) return true;

    if (squadReg) {
      if (squadReg.tbdId && String(squadReg.tbdId).trim().toLowerCase() === target) return true;
      if (squadReg.teamName && String(squadReg.teamName).trim().toLowerCase() === target) return true;
      if (squadReg.squadName && String(squadReg.squadName).trim().toLowerCase() === target) return true;
      if (squadReg.id && String(squadReg.id).trim().toLowerCase() === target) return true;
      if (squadReg.teamId && String(squadReg.teamId).trim().toLowerCase() === target) return true;
    }

    return false;
  };

  // Standings calculation with points logic and Do or Die tiebreaker handling
  const getStandings = (groupName: string) => {
    // Generates standings data with Clash Squad specific stats
    const baseSquads = [1, 2, 3, 4].map(num => {
      const tbdId = `TBD-${groupName}${num}`;
      const registered = getSquadByTbdId(tbdId);
      const name = registered ? (registered.teamName || registered.squadName) : tbdId;
      
      let p = 0;
      let w = 0;
      let l = 0;
      let rw = 0;
      let rl = 0;
      let pts = 0;
      let doOrDieBonus = 0;
      let wonDoOrDie = false;
      let playedDoOrDie = false;

      // Calculate from overrides
      Object.values(matchOverrides).forEach((override: any) => {
        // Count completed or approved matches
        const isMatchPlayed = override.isPlayed || override.status === 'completed' || override.reviewStatus === 'approved';
        if (!isMatchPlayed) return;

        // Clean match ID
        const rawMatchId = String(override.matchId || override.id || '');
        const cleanMatchId = rawMatchId.replace(`${league.id}_`, '');

        // Check if this match belongs to groupName
        const isGroupMatch = cleanMatchId.startsWith(`m-${groupName}-`) || cleanMatchId.endsWith(`-${groupName}-dod`) || cleanMatchId.includes(`-${groupName}-`);
        if (!isGroupMatch) return;

        // Check if this is a Do or Die match for this group
        const isDod = cleanMatchId === `m-${groupName}-dod` || cleanMatchId.endsWith(`-${groupName}-dod`) || cleanMatchId === `dod-${groupName}`;

        if (isDod) {
          const isT1 = isSquadMatch(tbdId, registered, override.t1);
          const isT2 = isSquadMatch(tbdId, registered, override.t2);

          if (isT1 || isT2) {
            playedDoOrDie = true;
            p++; // Count Do or Die match as a played match

            const s1Score = Number(override.scoreA || 0);
            const s2Score = Number(override.scoreB || 0);

            if (isT1) {
              rw += s1Score;
              rl += s2Score;
            } else {
              rw += s2Score;
              rl += s1Score;
            }

            // Check if this squad WON the Do or Die match
            const winnerStr = String(override.winner || '').trim();
            const wonByWinnerField = winnerStr && isSquadMatch(tbdId, registered, winnerStr);
            const wonByScore = (isT1 && s1Score > s2Score) || (isT2 && s2Score > s1Score);

            if (wonByWinnerField || wonByScore) {
              doOrDieBonus = 0.5;
              wonDoOrDie = true;
              w++;
            } else {
              l++;
            }
          }
          return;
        }

        // Regular group match (e.g. m-A-0 to m-A-5)
        const matchIdxStr = cleanMatchId.split('-').pop() || '0';
        const matchIdx = parseInt(matchIdxStr, 10);
        const pairings = [
          [1, 2], [3, 4],
          [1, 3], [2, 4],
          [1, 4], [2, 3]
        ];
        const pair = pairings[matchIdx];
        
        let matchT1 = pair ? `TBD-${groupName}${pair[0]}` : override.t1;
        let matchT2 = pair ? `TBD-${groupName}${pair[1]}` : override.t2;

        const isT1 = isSquadMatch(tbdId, registered, override.t1 || matchT1);
        const isT2 = isSquadMatch(tbdId, registered, override.t2 || matchT2);

        if (isT1) {
          p++;
          const s1Score = Number(override.scoreA || 0);
          const s2Score = Number(override.scoreB || 0);
          rw += s1Score;
          rl += s2Score;

          const wonByWinner = isSquadMatch(tbdId, registered, override.winner);
          const wonByScore = s1Score > s2Score;

          if (wonByWinner || wonByScore) {
            w++;
            pts += 3;
          } else if (s2Score > s1Score) {
            l++;
          }
        } else if (isT2) {
          p++;
          const s1Score = Number(override.scoreA || 0);
          const s2Score = Number(override.scoreB || 0);
          rw += s2Score;
          rl += s1Score;

          const wonByWinner = isSquadMatch(tbdId, registered, override.winner);
          const wonByScore = s2Score > s1Score;

          if (wonByWinner || wonByScore) {
            w++;
            pts += 3;
          } else if (s1Score > s2Score) {
            l++;
          }
        }
      });
      
      const rd = rw - rl;
      // Formula: Score = PTS + RW - P
      const score = pts + rw - p;
      const effectivePts = pts + doOrDieBonus;
      
      return {
        id: num,
        tbdId,
        name,
        p,
        w,
        l,
        rw,
        rl,
        rd,
        score,
        pts,
        effectivePts,
        wonDoOrDie,
        playedDoOrDie,
        joinOrder: num
      };
    });

    // Sorting Rules:
    // 1. Effective PTS (pts + doOrDieBonus) (highest first)
    // 2. Score (highest first)
    // 3. RD (Round Difference, highest first)
    // 4. P (fewest first)
    // 5. Default to Join Order
    return baseSquads.sort((a, b) => {
      if (b.effectivePts !== a.effectivePts) return b.effectivePts - a.effectivePts;
      if (b.score !== a.score) return b.score - a.score;
      if (b.rd !== a.rd) return b.rd - a.rd;
      if (a.p !== b.p) return a.p - b.p;
      return a.joinOrder - b.joinOrder;
    });
  };

  // Logic: Sequential looping A -> B -> C -> A
  const getGroupMatches = (groupName: string) => {
    const groupIndex = groups.indexOf(groupName);
    const matches: any[] = [];
    
    // In a group of 4 squads, there are 6 matches: (1v2, 3v4), (1v3, 2v4), (1v4, 2v3)
    const pairings = [
      [1, 2], [3, 4],
      [1, 3], [2, 4],
      [1, 4], [2, 3]
    ];

    const formatDateShort = (dateStr: string) => {
      if (!dateStr) return "";
      try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      } catch (e) {
        return dateStr;
      }
    };

    let allRegularPlayed = true;

    pairings.forEach((pair, pIdx) => {
      const globalMatchOrder = pIdx * groups.length + groupIndex + 1;
      const matchId = `m-${groupName}-${pIdx}`;
      const override = matchOverrides[matchId] || matchOverrides[`${league.id}_${matchId}`];
      
      const isPlayed = override?.isPlayed || override?.status === 'completed' || override?.reviewStatus === 'approved';
      if (!isPlayed) {
        allRegularPlayed = false;
      }

      const scheduleEntry = [...(league.autoGeneratedSchedule || []), ...(league.manualSchedule || [])]
        .find(s => s.matchNumber === globalMatchOrder);

      let timeDisplay = "";
      
      if (override?.customDate && override?.customTime) {
        timeDisplay = `${formatDateShort(override.customDate)} | ${override.customTime}`;
      } else if (scheduleEntry) {
        timeDisplay = `${formatDateShort(scheduleEntry.date)} | ${scheduleEntry.time}`;
      } else {
        const slotsPerDay = league.slotsPerDay || 4;
        const dayOffset = Math.floor((globalMatchOrder - 1) / slotsPerDay);
        
        const baseDate = new Date(league.openingMatchDate || new Date().toISOString());
        baseDate.setDate(baseDate.getDate() + dayOffset);
        
        const datePart = formatDateShort(baseDate.toISOString());
        
        if (globalMatchOrder === 1) {
          timeDisplay = `${league.openingMatchDate ? formatDateShort(league.openingMatchDate) : 'Sept 1'} | ${league.openingMatchTime || '18:00'}`;
        } else {
          timeDisplay = `${datePart} | TBD`;
        }
      }

      matches.push({
        id: matchId,
        globalOrder: globalMatchOrder,
        matchNumber: override?.matchNumber || globalMatchOrder,
        roundNumber: override?.roundNumber || 1,
        roundName: override?.roundName || `Group Stage (Group ${groupName})`,
        t1: `TBD-${groupName}${pair[0]}`,
        t2: `TBD-${groupName}${pair[1]}`,
        time: timeDisplay,
        status: override?.status || 'scheduled',
        reviewStatus: override?.reviewStatus,
        roomId: override?.roomId || '',
        roomPassword: override?.roomPassword || '',
        youtubeLiveLink: override?.youtubeLiveLink || '',
        winner: override?.winner || '',
        scoreA: override?.scoreA ?? null,
        scoreB: override?.scoreB ?? null,
        isPlayed: isPlayed,
        isRescheduled: override?.isRescheduled || false,
        isDoOrDie: false
      });
    });

    // AUTO GENERATE OR DISPLAY DO OR DIE MATCH IF TIE DETECTED OR IF DOD OVERRIDE EXISTS
    const dodMatchId = `m-${groupName}-dod`;
    const dodOverride = matchOverrides[dodMatchId] || matchOverrides[`${league.id}_${dodMatchId}`];

    if (allRegularPlayed || dodOverride) {
      const standingsList = getStandings(groupName);
      let tiedSquads: any[] = [];

      if (dodOverride) {
        // If DOD match exists in overrides, resolve t1 and t2
        const sq1 = standingsList.find(s => isSquadMatch(s.tbdId, getSquadByTbdId(s.tbdId), dodOverride.t1)) || standingsList[0];
        const sq2 = standingsList.find(s => isSquadMatch(s.tbdId, getSquadByTbdId(s.tbdId), dodOverride.t2)) || standingsList[1];
        if (sq1 && sq2) {
          tiedSquads = [sq1, sq2];
        }
      } else {
        // Check if any two squads in standings are tied with same base PTS and Score
        for (let i = 0; i < standingsList.length - 1; i++) {
          const s1 = standingsList[i];
          const s2 = standingsList[i + 1];
          if (s1.p > 0 && s2.p > 0 && s1.pts === s2.pts && s1.score === s2.score) {
            tiedSquads = [s1, s2];
            break;
          }
        }
      }

      if (tiedSquads.length === 2 || dodOverride) {
        let dodTimeDisplay = "";
        if (dodOverride?.customDate && dodOverride?.customTime) {
          dodTimeDisplay = `${formatDateShort(dodOverride.customDate)} | ${dodOverride.customTime}`;
        } else {
          dodTimeDisplay = `${formatDateShort(new Date().toISOString())} | 21:00`;
        }

        const t1Id = dodOverride?.t1 || (tiedSquads[0] ? tiedSquads[0].tbdId : `TBD-${groupName}1`);
        const t2Id = dodOverride?.t2 || (tiedSquads[1] ? tiedSquads[1].tbdId : `TBD-${groupName}2`);

        matches.push({
          id: dodMatchId,
          globalOrder: `Match #${groupIndex * 6 + 7} (Tiebreaker)`,
          matchNumber: dodOverride?.matchNumber || (groupIndex * 6 + 7),
          roundNumber: dodOverride?.roundNumber || 1,
          roundName: dodOverride?.roundName || `Group Stage - Tiebreaker (Group ${groupName})`,
          t1: t1Id,
          t2: t2Id,
          time: dodTimeDisplay,
          status: dodOverride?.status || 'scheduled',
          reviewStatus: dodOverride?.reviewStatus,
          roomId: dodOverride?.roomId || '',
          roomPassword: dodOverride?.roomPassword || '',
          youtubeLiveLink: dodOverride?.youtubeLiveLink || '',
          winner: dodOverride?.winner || '',
          scoreA: dodOverride?.scoreA ?? null,
          scoreB: dodOverride?.scoreB ?? null,
          isPlayed: dodOverride?.isPlayed || dodOverride?.status === 'completed' || dodOverride?.reviewStatus === 'approved',
          isRescheduled: dodOverride?.isRescheduled || false,
          isDoOrDie: true,
          title: "⚡ DO OR DIE TIEBREAKER MATCH"
        });
      }
    }

    return matches;
  };

  // Auto navigate to tagged match, activate right group/round, highlight and scroll into view
  useEffect(() => {
    if ((navigationContext?.type === 'match_card' || navigationContext?.type === 'pulse_tagged_match') && (navigationContext.matchId || navigationContext.matchData)) {
      const rawTargetId = String(navigationContext.matchId || navigationContext.matchData?.id || navigationContext.matchData?.matchId || '');
      const normalizedTargetId = rawTargetId.replace(`${league.id}_`, '');
      
      setHighlightedMatchId(rawTargetId);
      setActiveTab('schedule');

      // 1. Detect target group / round
      let matchedGroup: string | null = null;
      let matchedRound: number | null = null;

      // If navigationContext explicitly provided group or round
      if (navigationContext.matchData?.groupId && groups.includes(navigationContext.matchData.groupId)) {
        matchedGroup = navigationContext.matchData.groupId;
      }
      if (navigationContext.matchData?.roundNumber || navigationContext.matchData?.round) {
        matchedRound = Number(navigationContext.matchData.roundNumber || navigationContext.matchData.round);
      }

      // Check if match ID contains group letter like "m-B-1" or "m-C-2"
      const groupMatchRegex = /m-([A-Z])-\d+/i;
      const groupMatch = rawTargetId.match(groupMatchRegex);
      if (groupMatch && groupMatch[1] && groups.includes(groupMatch[1].toUpperCase())) {
        matchedGroup = groupMatch[1].toUpperCase();
        matchedRound = 1;
      }

      // Search all groups to locate the exact match by ID or teams
      if (!matchedGroup) {
        for (const g of groups) {
          const gMatches = getGroupMatches(g);
          const found = gMatches.some((m: any) => 
            m.id === rawTargetId || 
            m.id === normalizedTargetId || 
            `${league.id}_${m.id}` === rawTargetId ||
            (m.matchId && (m.matchId === rawTargetId || m.matchId === normalizedTargetId)) ||
            (navigationContext.matchData?.t1 && navigationContext.matchData?.t2 && 
             ((m.t1 === navigationContext.matchData.t1 && m.t2 === navigationContext.matchData.t2) ||
              (m.t1 === navigationContext.matchData.t2 && m.t2 === navigationContext.matchData.t1)))
          );
          if (found) {
            matchedGroup = g;
            matchedRound = 1;
            break;
          }
        }
      }

      // Search knockout rounds if not located in group stage
      if (!matchedGroup) {
        const roundsList = getRoundsList();
        for (const r of roundsList) {
          if (r.id > 1 && !r.isHallOfGlory) {
            const koMatches = getKnockoutMatches(r.id);
            const found = koMatches.some((m: any) => 
              m.id === rawTargetId || 
              m.id === normalizedTargetId || 
              `${league.id}_${m.id}` === rawTargetId ||
              (m.matchId && (m.matchId === rawTargetId || m.matchId === normalizedTargetId))
            );
            if (found) {
              matchedRound = r.id;
              break;
            }
          }
        }
      }

      if (matchedGroup) {
        setActiveGroup(matchedGroup);
      }
      if (matchedRound) {
        setActiveRound(matchedRound);
      }

      // 2. Smoothly scroll to the target match card with progressive retries
      const attemptScroll = () => {
        const candidateIds = [
          `match-card-${rawTargetId}`,
          `match-card-${normalizedTargetId}`,
          `match-card-${league.id}_${rawTargetId}`,
          `match-card-${league.id}_${normalizedTargetId}`
        ];
        for (const cid of candidateIds) {
          const el = document.getElementById(cid);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            return true;
          }
        }
        return false;
      };

      const t1 = setTimeout(attemptScroll, 120);
      const t2 = setTimeout(attemptScroll, 400);
      const t3 = setTimeout(attemptScroll, 800);
      const t4 = setTimeout(attemptScroll, 1500);

      // Keep target match highlighted for 15 seconds
      const clearTimer = setTimeout(() => {
        setHighlightedMatchId(null);
      }, 15000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(clearTimer);
      };
    }
  }, [navigationContext, league.id, groups]);

  return (
    <div className="min-h-screen bg-[#04060e] text-slate-200 font-sans pb-20">
      {/* Header */}
      <div className="sticky top-0 z-50 bg-[#04060e]/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 flex items-center justify-between">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-white/5 rounded-full transition-colors text-cyan-400"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <div className="flex flex-col items-center text-center py-1">
          <h2 className="text-white font-black tracking-tighter text-[19px] sm:text-[22px] uppercase">
            {league.leagueName}
          </h2>
          
          {/* Regional / Local Venue Address under League Title */}
          {(league.isLocalVenue || league.localVenueName) && (
            <div className="mt-1 inline-flex items-center justify-center gap-1.5 px-3 py-1 bg-cyan-950/80 border border-cyan-500/40 rounded-full text-[10px] sm:text-xs font-mono shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <div className="flex items-center gap-1 text-cyan-300 font-bold">
                <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>{league.localVenueName}</span>
              </div>
              {league.localUpazilaDistrict && (
                <div className="text-slate-200 flex items-center gap-1 shrink-0 border-l border-cyan-500/40 pl-2">
                  <span className="text-cyan-400 shrink-0 text-[10px]">📍</span>
                  <span className="font-semibold">{league.localUpazilaDistrict}</span>
                </div>
              )}
            </div>
          )}

          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-mono text-cyan-400 font-bold uppercase tracking-widest">
              League ID: {league.id}
            </span>

            {/* Privacy Badges */}
            {(league.accessType === 'code' || league.accessCode) && (
              <span className="text-amber-300 font-bold px-2 py-0.5 rounded-full bg-amber-950/80 border border-amber-500/40 text-[9px] flex items-center gap-1 font-mono">
                <Key className="w-2.5 h-2.5 text-amber-400" />
                ACCESS CODE PROTECTED
              </span>
            )}

            {league.accessType === 'invite' && (
              <span className="text-purple-300 font-bold px-2 py-0.5 rounded-full bg-purple-950/80 border border-purple-500/40 text-[9px] flex items-center gap-1 font-mono">
                <Mail className="w-2.5 h-2.5 text-purple-400" />
                INVITE ONLY
              </span>
            )}
          </div>

          {/* Full Width Sponsor Banner / Sponsored By (Same Row + Original Aspect Ratio) */}
          {(league.sponsorName || league.sponsorLogoUrl) && (
            <div 
              onClick={(e) => {
                e.stopPropagation();
                if (league.sponsorLinkUrl) {
                  let target = league.sponsorLinkUrl.trim();
                  if (!target.startsWith('http://') && !target.startsWith('https://')) {
                    target = 'https://' + target;
                  }
                  window.open(target, '_blank', 'noopener,noreferrer');
                }
              }}
              title={league.sponsorLinkUrl ? `Sponsored by ${league.sponsorName || 'Sponsor'} (Click to visit)` : `Sponsored by ${league.sponsorName || 'Sponsor'}`}
              className={`mt-3 w-auto mx-auto flex flex-row items-center justify-center gap-3 sm:gap-4 px-2 py-1 bg-transparent border-none shadow-none ${league.sponsorLinkUrl ? 'hover:opacity-80 transition-opacity cursor-pointer' : 'cursor-default'}`}
            >
              <span className="text-[8px] font-black uppercase text-amber-400 tracking-wider flex items-center gap-1.5 whitespace-nowrap shrink-0">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                SPONSORED BY:
              </span>
              {league.sponsorLogoUrl && (
                <img 
                  src={league.sponsorLogoUrl} 
                  alt="Sponsor Logo" 
                  className="h-14 sm:h-18 w-auto max-w-[280px] object-contain drop-shadow-md" 
                />
              )}
              {league.sponsorName && (
                <span className="text-sm sm:text-lg font-black text-amber-200 uppercase tracking-wide truncate">{league.sponsorName}</span>
              )}
            </div>
          )}
        </div>
        <div className="w-10" /> {/* Spacer */}
      </div>

      <div className="max-w-4xl mx-auto px-4 mt-6">
        {/* Prize Pool & Individual Prizes Breakdown Banner */}
        {(() => {
          const prizePool = league.prizePool || 2000;
          const championPrize = league.championPrize ?? Math.floor(prizePool * 0.5);
          const runnerUpPrize = league.runnerUpPrize ?? Math.floor(prizePool * 0.3);
          const top1Prize = league.topRank1Prize ?? league.top3Prizes?.[0] ?? Math.floor(prizePool * 0.1);
          const top2Prize = league.topRank2Prize ?? league.top3Prizes?.[1] ?? Math.floor(prizePool * 0.06);
          const top3Prize = league.topRank3Prize ?? league.top3Prizes?.[2] ?? Math.floor(prizePool * 0.04);

          return (
            <div className="bg-gradient-to-r from-amber-500/10 via-cyan-500/10 to-blue-500/10 border border-amber-500/30 rounded-xl p-2 sm:p-2.5 mb-4 shadow-sm relative overflow-hidden">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2">
                {/* Total Prize Pool */}
                <div className="bg-slate-950/80 border border-amber-500/40 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="text-[8.5px] font-black uppercase tracking-wider text-amber-400">Total Pool</span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-black font-mono text-amber-300">{prizePool} Tokens</span>
                </div>

                {/* Champion */}
                <div className="bg-slate-950/80 border border-amber-500/40 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">🏆</span>
                    <span className="text-[8.5px] font-black uppercase text-amber-400 tracking-wider">Champion</span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-black font-mono text-amber-300">{championPrize} Tokens</span>
                </div>

                {/* Runner-Up */}
                <div className="bg-slate-950/80 border border-slate-400/30 rounded-lg px-2.5 py-1.5 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs">🥈</span>
                    <span className="text-[8.5px] font-black uppercase text-slate-200 tracking-wider">Runner-Up</span>
                  </div>
                  <span className="text-[10px] sm:text-xs font-black font-mono text-slate-200">{runnerUpPrize} Tokens</span>
                </div>

                {/* Top 3 Players */}
                <div className="bg-slate-950/80 border border-cyan-500/30 rounded-lg px-2.5 py-1.5 flex items-center justify-between col-span-2 sm:col-span-1">
                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-xs">🥉</span>
                    <span className="text-[8.5px] font-black uppercase text-cyan-400 tracking-wider">Top 3 Players</span>
                  </div>
                  <div className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-[9px] font-mono font-bold text-slate-300">
                    <span>1st:<strong className="text-cyan-300">{top1Prize} Tokens</strong></span>
                    <span>2nd:<strong className="text-cyan-300">{top2Prize} Tokens</strong></span>
                    <span>3rd:<strong className="text-cyan-300">{top3Prize} Tokens</strong></span>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}
        {/* Cyberpunk Loading Progress Bar */}
        <AnimatePresence>
          {isGroupLoading && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginBottom: 0 }}
              animate={{ opacity: 1, height: 'auto', marginBottom: 16 }}
              exit={{ opacity: 0, height: 0, marginBottom: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden"
            >
              <div className="bg-slate-950/90 border border-cyan-500/40 rounded-2xl p-3 shadow-[0_0_25px_rgba(6,182,212,0.2)] flex flex-col gap-2 relative">
                <div className="flex items-center justify-between text-[10px] sm:text-xs font-black uppercase tracking-wider">
                  <div className="flex items-center gap-2 text-cyan-400">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping shrink-0" />
                    <span>Loading Group {activeGroup} • Squad Names & Cover Photos...</span>
                  </div>
                  <span className="font-mono text-cyan-300 font-bold">{loadProgress}%</span>
                </div>
                
                {/* Progress Bar Track */}
                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-cyan-500/30 p-0.5 relative">
                  <motion.div 
                    className="h-full bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-300 rounded-full shadow-[0_0_14px_rgba(6,182,212,0.9)]"
                    style={{ width: `${loadProgress}%` }}
                    transition={{ ease: 'easeOut', duration: 0.2 }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Tabs */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-xl border border-white/5 mb-8 overflow-x-auto scrollbar-hide">
          {(['schedule', 'brackets', 'standings', 'top_players'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 min-w-[90px] py-2.5 px-2 rounded-lg text-[11px] sm:text-xs font-black uppercase tracking-wider transition-all whitespace-nowrap ${
                activeTab === tab 
                  ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]' 
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'schedule' ? '🗓️ Schedule' : tab === 'brackets' ? '🏆 Brackets' : tab === 'standings' ? '📊 Standings' : '🔥 Top 3 Players'}
            </button>
          ))}
        </div>

        {/* Content Area */}
        <AnimatePresence mode="wait">
          {activeTab === 'schedule' && (
            <motion.div
              key="schedule"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Round Selector */}
              <div className="flex overflow-x-auto pb-2 gap-2 scrollbar-hide">
                {getRoundsList().map((round) => (
                  <button
                    key={round.id}
                    onClick={() => {
                      if (round.isHallOfGlory) {
                        setShowHallOfGloryModal(true);
                        // Trigger fireworks confetti
                        const duration = 4000;
                        const end = Date.now() + duration;
                        (function frame() {
                          confetti({
                            particleCount: 7,
                            angle: 60,
                            spread: 60,
                            origin: { x: 0 },
                            colors: ['#06b6d4', '#3b82f6', '#facc15', '#ffffff']
                          });
                          confetti({
                            particleCount: 7,
                            angle: 120,
                            spread: 60,
                            origin: { x: 1 },
                            colors: ['#06b6d4', '#3b82f6', '#facc15', '#ffffff']
                          });
                          if (Date.now() < end) {
                            requestAnimationFrame(frame);
                          }
                        }());
                      } else {
                        setActiveRound(round.id);
                      }
                    }}
                    className={`shrink-0 px-4 py-2.5 rounded-2xl border transition-all flex flex-col items-start min-w-[120px] ${
                      activeRound === round.id
                        ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                        : 'border-white/5 bg-white/[0.02] text-slate-500 hover:border-white/20'
                    }`}
                  >
                    <span className={`text-[8px] font-mono font-black uppercase tracking-widest block mb-0.5 ${
                      activeRound === round.id ? 'text-cyan-400/70' : 'text-slate-600'
                    }`}>
                      {round.label}
                    </span>
                    <span className={`text-[10px] font-black uppercase tracking-tight text-left ${
                      activeRound === round.id ? 'text-white' : 'text-slate-400 group-hover:text-slate-300'
                    }`}>
                      {round.name}
                    </span>
                  </button>
                ))}
              </div>

              {getRoundsList().find(r => r.id === activeRound)?.isHallOfGlory ? (
                <div className="relative w-full overflow-hidden rounded-3xl bg-slate-950 border border-yellow-500/30 p-6 md:p-12 min-h-[400px] flex flex-col items-center justify-center text-center">
                  <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-slate-950 via-slate-950/80 to-transparent" />
                  <div className="relative z-10">
                    <Trophy className="w-16 h-16 text-yellow-400 mx-auto mb-4 animate-bounce drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" />
                    <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-yellow-200 uppercase tracking-tighter drop-shadow-lg mb-2">
                      Grand Final Results
                    </h2>
                    <p className="text-slate-400 text-sm mb-8 max-w-md mx-auto">
                      Witness the ultimate champions and top players of the league. Step into the Hall of Glory to celebrate the victory!
                    </p>
                    <button 
                      onClick={() => {
                        setShowHallOfGloryModal(true);
                        // Trigger initial confetti
                        const duration = 3000;
                        const end = Date.now() + duration;
                        (function frame() {
                          confetti({
                            particleCount: 5,
                            angle: 60,
                            spread: 55,
                            origin: { x: 0 },
                            colors: ['#06b6d4', '#3b82f6', '#facc15']
                          });
                          confetti({
                            particleCount: 5,
                            angle: 120,
                            spread: 55,
                            origin: { x: 1 },
                            colors: ['#06b6d4', '#3b82f6', '#facc15']
                          });
                          if (Date.now() < end) {
                            requestAnimationFrame(frame);
                          }
                        }());
                      }}
                      className="px-8 py-4 rounded-xl bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(250,204,21,0.4)] hover:scale-105"
                    >
                      Enter Hall of Glory
                    </button>
                  </div>
                </div>
              ) : activeRound === 1 ? (
                <>
                  {/* Group Selector */}
                  <div className="flex gap-2">
                    {groups.map((g) => {
                      const slotStatus = getGroupSlotStatus(g);
                      return (
                        <button
                          key={g}
                          onClick={() => setActiveGroup(g)}
                          className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                            activeGroup === g
                              ? 'bg-white/10 text-white border border-white/20 shadow-[0_0_12px_rgba(255,255,255,0.08)]'
                              : 'text-slate-400 hover:bg-white/5 border border-transparent'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full ${
                              slotStatus.isFull 
                                ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]' 
                                : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse'
                            }`} />
                            <span>Group {g}</span>
                          </div>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-tight ${
                            slotStatus.isFull
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                              : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          }`}>
                            {slotStatus.filledCount}/{slotStatus.totalSlots}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Matches List */}
                  <div className="grid gap-3">
                    {(() => {
                      const seenTbds = new Set<string>();
                      return getGroupMatches(activeGroup).map((match) => {
                        const squad1 = getSquadByTbdId(match.t1);
                        const squad2 = getSquadByTbdId(match.t2);
                        
                        const showJoin1 = (!squad1 || squad1.isPlaceholder) && !seenTbds.has(match.t1);
                        const showJoin2 = (!squad2 || squad2.isPlaceholder) && !seenTbds.has(match.t2);
                        
                        seenTbds.add(match.t1);
                        seenTbds.add(match.t2);

                        const isCaptain1 = Boolean(userProfile?.userId && (squad1?.leaderId === userProfile.userId || (squad1 as any)?.captainId === userProfile.userId || myTeams.some((t: any) => t.id === squad1?.teamId)));
                        const isCaptain2 = Boolean(userProfile?.userId && (squad2?.leaderId === userProfile.userId || (squad2 as any)?.captainId === userProfile.userId || myTeams.some((t: any) => t.id === squad2?.teamId)));
                        const isHostUser = isHostOrCoHost || userProfile?.userId === league.hostId;
                        const canSeeMessageIcon = isHostUser || isCaptain1 || isCaptain2;

                        const isHighlighted = Boolean(
                          highlightedMatchId && (
                            match.id === highlightedMatchId ||
                            match.id === highlightedMatchId.replace(`${league.id}_`, '') ||
                            `${league.id}_${match.id}` === highlightedMatchId ||
                            (match.matchId && (match.matchId === highlightedMatchId || match.matchId === highlightedMatchId.replace(`${league.id}_`, ''))) ||
                            (navigationContext?.matchId && (match.id === navigationContext.matchId || match.id === navigationContext.matchId.replace(`${league.id}_`, '')))
                          )
                        );

                        return (
                          <div 
                            key={match.id}
                            id={`match-card-${match.id}`}
                            className={`rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 transition-all relative ${
                              isHighlighted 
                                ? 'bg-gradient-to-r from-cyan-950/70 via-slate-900/90 to-cyan-950/70 border-2 border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.55)] ring-4 ring-cyan-500/25 scale-[1.01]' 
                                : 'bg-white/5 border border-white/5 group hover:border-cyan-500/30'
                            }`}
                          >
                            {/* Highlight Banner when arrived from Pulse Tag */}
                            {isHighlighted && (
                              <div className="absolute -top-3 left-4 z-20 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-mono font-black text-[9px] uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.7)] animate-bounce">
                                <span>🎯</span>
                                <span>Tagged Match in Post</span>
                              </div>
                            )}

                            {/* Pulse Tagging Button (Floating) */}
                            {onTagMatchForPulse && (isCaptain1 || isCaptain2) && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onTagMatchForPulse({
                                    ...match,
                                    type: 'league',
                                    leagueId: league.id,
                                    leagueName: (league as any)?.title || (league as any)?.name || (league as any)?.leagueName || 'Vortex Pro League',
                                    squad1,
                                    squad2,
                                    isCaptain1,
                                    isCaptain2,
                                    userIsInSquad: isCaptain2 ? 2 : (isCaptain1 ? 1 : 0),
                                    t1: squad1 && !squad1.isPlaceholder ? (squad1.teamName || squad1.squadName) : match.t1,
                                    t2: squad2 && !squad2.isPlaceholder ? (squad2.teamName || squad2.squadName) : match.t2,
                                    t1Original: match.t1,
                                    t2Original: match.t2,
                                    squad1Name: squad1 && !squad1.isPlaceholder ? (squad1.teamName || squad1.squadName) : match.t1,
                                    squad2Name: squad2 && !squad2.isPlaceholder ? (squad2.teamName || squad2.squadName) : match.t2,
                                    squad1Cover: squad1?.coverPhoto || squad1?.coverUrl || squad1?.logoUrl || squad1?.photoURL || squad1?.banner || '',
                                    squad2Cover: squad2?.coverPhoto || squad2?.coverUrl || squad2?.logoUrl || squad2?.photoURL || squad2?.banner || '',
                                    squad1Players: squad1?.players || [],
                                    squad2Players: squad2?.players || []
                                  });
                                }}
                                className="absolute top-0 right-0 -translate-y-[65%] translate-x-[65%] w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 via-cyan-400 to-blue-500 shadow-[0_0_18px_rgba(6,182,212,0.8)] z-40 hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-cyan-100"
                                title="Tag this match in a Pulse post"
                              >
                                <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950 shrink-0" />
                              </button>
                            )}

                            {/* Action Buttons (Pulse Tag, Chat & Admin Menu) */}
                            <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openAnnouncementModal(match);
                                }}
                                className={`p-1 rounded transition-all cursor-pointer relative ${matchOverrides[match.id]?.announcements?.length > 0 ? 'text-cyan-400 hover:bg-cyan-500/10' : 'text-slate-500 hover:text-cyan-400 hover:bg-white/5'}`}
                                title="Announcements"
                              >
                                <Megaphone className="w-4 h-4" />
                                {hasUnreadAnnouncements(match.id) && (
                                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-[#0a0c16] animate-pulse"></span>
                                )}
                              </button>
                              
                              {canSeeMessageIcon && (
                                <MatchChatButton
                                  match={match}
                                  leagueId={league.id}
                                  userProfile={userProfile}
                                  isActive={activeChatMatch?.id === match.id}
                                  isSystemAdmin={isSystemAdmin}
                                  onClick={() => setActiveChatMatch(match)}
                                />
                              )}
                              
                              {canManage && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditMatchModal(match);
                                  }}
                                  className="p-1 text-slate-500 hover:text-cyan-400 hover:bg-white/5 rounded transition-all cursor-pointer"
                                  title="Manage Match"
                                >
                                  <MoreVertical className="w-4 h-4" />
                                </button>
                              )}
                            </div>

                            <div className="flex flex-col gap-1.5 w-full sm:w-auto shrink-0">
                              <div className="flex items-center flex-wrap gap-2">
                                <span className={`text-[10px] font-mono font-black px-2 py-0.5 rounded uppercase tracking-tighter flex items-center gap-1 ${
                                  match.isDoOrDie 
                                    ? 'text-rose-400 bg-rose-500/15 border border-rose-500/30 animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.3)]' 
                                    : 'text-cyan-400 bg-cyan-500/10 border border-cyan-500/20'
                                }`}>
                                  {match.isDoOrDie && <Zap className="w-3 h-3 text-rose-400 fill-rose-400/20 shrink-0" />}
                                  {match.isDoOrDie ? '⚡ DO OR DIE MATCH' : `Match #${match.globalOrder}`}
                                </span>
                                <span className="text-[10px] font-black text-white">
                                  {match.time.split(' | ')[0]}
                                </span>
                                <div className="flex items-center gap-1 text-[9px] font-bold text-cyan-400/90 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                                  <Clock className="w-3 h-3 text-cyan-500 shrink-0" />
                                  <span>{match.time.split(' | ')[1]}</span>
                                </div>
                              </div>
                              
                              {/* Live, Played, Room details and YouTube link badges */}
                              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                                {matchOverrides[match.id]?.reviewStatus === 'pending' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse">
                                    <AlertCircle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                    UNDER REVIEW
                                  </span>
                                )}
                                {matchOverrides[match.id]?.reviewStatus === 'approved' && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setViewingResult({ ...match, ...matchOverrides[match.id] });
                                    }}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                  >
                                    <CheckCircle className="w-2.5 h-2.5 shrink-0" />
                                    SEE RESULT
                                  </button>
                                )}
                                {matchOverrides[match.id]?.reviewStatus === 'rejected' && (
                                  <span 
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                                    title={matchOverrides[match.id]?.rejectionReason ? `Rejected: ${matchOverrides[match.id]?.rejectionReason}` : 'Result Rejected'}
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5 text-red-400 shrink-0" />
                                    RESULT REJECTED
                                  </span>
                                )}
                                {match.status === 'live' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-red-500 text-white animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                    <span className="w-1 h-1 rounded-full bg-white block"></span>
                                    LIVE
                                  </span>
                                )}
                                {(match.isPlayed || match.status === 'completed') && matchOverrides[match.id]?.reviewStatus !== 'pending' && matchOverrides[match.id]?.reviewStatus !== 'rejected' && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                    <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                    MATCH PLAYED
                                  </span>
                                )}
                                {match.isRescheduled && (
                                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                                    <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                    RESCHEDULED
                                  </span>
                                )}
                                {match.roomId && (canManage || isSystemAdmin || isCaptain1 || isCaptain2) && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setShowRoomDetailsForUser(match);
                                    }}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 shadow-sm cursor-pointer"
                                  >
                                    <Lock className="w-2 h-2" />
                                    Room ID
                                  </button>
                                )}
                                {match.youtubeLiveLink && (
                                  <a
                                    href={match.youtubeLiveLink.startsWith('http') ? match.youtubeLiveLink : `https://${match.youtubeLiveLink}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 shadow-sm cursor-pointer"
                                  >
                                    <Youtube className="w-2 h-2 text-red-500 shrink-0" />
                                     Watch
                                  </a>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex flex-col flex-1 items-center justify-center w-full">
                              <div className="flex items-center gap-4 w-full justify-center">
                                <div className="flex flex-col items-center gap-1.5 min-w-[120px] flex-1">
                                  <div 
                                    className="w-[132px] sm:w-[160px] aspect-[16/9] rounded-xl flex items-center justify-center text-[10px] font-black transition-transform group-hover:scale-105 cursor-pointer overflow-hidden border shadow-sm"
                                    style={getNeonBoxStyle(squad1?.teamName || match.t1)}
                                    onClick={() => squad1 && setSelectedSquadDetails(squad1)}
                                  >
                                    {(squad1?.coverPhoto || squad1?.coverUrl || squad1?.banner || squad1?.logoUrl) ? (
                                      <img src={squad1.coverPhoto || squad1.coverUrl || squad1.banner || squad1.logoUrl} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-[9px] font-black text-slate-400">
                                        {squad1?.teamName ? squad1.teamName.slice(0, 3).toUpperCase() : match.t1}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span 
                                      className="text-[10px] font-black uppercase tracking-wider cursor-pointer hover:underline text-center"
                                      style={getNeonStyle(squad1?.teamName || match.t1)}
                                      onClick={() => squad1 && setSelectedSquadDetails(squad1)}
                                    >
                                      {squad1?.teamName || match.t1}
                                    </span>
                                    {showJoin1 && (
                                      <button 
                                        onClick={() => handleRequestJoin(match.t1)}
                                        className="mt-1 px-2 py-0.5 bg-cyan-500 hover:bg-cyan-400 text-[8px] font-black uppercase text-white rounded ring-1 ring-white/20 transition-all active:scale-95 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                                      >
                                        Join
                                      </button>
                                    )}
                                  </div>
                                </div>
                                
                                {match.isPlayed ? (
                                  <div className="flex flex-col items-center gap-0.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl min-w-[60px]">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-sm font-black font-mono ${match.winner === match.t1 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'text-slate-400'}`}>
                                        {match.scoreA ?? 0}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-bold">-</span>
                                      <span className={`text-sm font-black font-mono ${match.winner === match.t2 ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'text-slate-400'}`}>
                                        {match.scoreB ?? 0}
                                      </span>
                                    </div>
                                    <span className="text-[7px] font-black uppercase text-emerald-400/90 tracking-wider">
                                      {match.scoreA === 7 && match.scoreB === 0 ? '7-0 Walkover' : match.scoreA === 0 && match.scoreB === 7 ? '0-7 Walkover' : (match.scoreA === 0 && match.scoreB === 0 && !match.winner) ? '0-0 (Both Absent)' : 'Match Played'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-cyan-500 font-black italic text-sm drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]">VS</div>
                                )}
                                
                                <div className="flex flex-col items-center gap-1.5 min-w-[120px] flex-1">
                                  <div 
                                    className="w-[132px] sm:w-[160px] aspect-[16/9] rounded-xl flex items-center justify-center text-[10px] font-black transition-transform group-hover:scale-105 cursor-pointer overflow-hidden border shadow-sm"
                                    style={getNeonBoxStyle(squad2?.teamName || match.t2)}
                                    onClick={() => squad2 && setSelectedSquadDetails(squad2)}
                                  >
                                    {(squad2?.coverPhoto || squad2?.coverUrl || squad2?.banner || squad2?.logoUrl) ? (
                                      <img src={squad2.coverPhoto || squad2.coverUrl || squad2.banner || squad2.logoUrl} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                    ) : (
                                      <span className="text-[9px] font-black text-slate-400">
                                        {squad2?.teamName ? squad2.teamName.slice(0, 3).toUpperCase() : match.t2}
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex flex-col items-center">
                                    <span 
                                      className="text-[10px] font-black uppercase tracking-wider cursor-pointer hover:underline text-center"
                                      style={getNeonStyle(squad2?.teamName || match.t2)}
                                      onClick={() => squad2 && setSelectedSquadDetails(squad2)}
                                    >
                                      {squad2?.teamName || match.t2}
                                    </span>
                                    {showJoin2 && (
                                      <button 
                                        onClick={() => handleRequestJoin(match.t2)}
                                        className="mt-1 px-2 py-0.5 bg-cyan-500 hover:bg-cyan-400 text-[8px] font-black uppercase text-white rounded ring-1 ring-white/20 transition-all active:scale-95 shadow-[0_0_10px_rgba(6,182,212,0.4)]"
                                      >
                                        Join
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Live Room & stream details section */}
                              {(match.roomId || match.youtubeLiveLink) && !match.isPlayed && (
                                <div className="w-full mt-3 pt-2.5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] text-slate-400">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    {match.roomId && (
                                      (() => {
                                        const isAuth = canManage || isSystemAdmin || isCaptain1 || isCaptain2;
                                        if (!isAuth) {
                                          return (
                                            <div className="flex items-center gap-1 text-slate-500 font-bold bg-white/[0.02] border border-white/5 px-2 py-1 rounded-lg">
                                              <Lock className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                                              <span>Room Credentials Protected</span>
                                            </div>
                                          );
                                        }
                                        return (
                                          <div className="flex flex-wrap items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-xl">
                                            <span className="text-cyan-400 font-bold uppercase tracking-wider">Room:</span>
                                            <span className="text-slate-300 font-mono font-bold flex items-center gap-1">
                                              ID: <span className="text-white bg-black/40 px-1.5 py-0.5 rounded border border-white/5 select-all">{match.roomId}</span>
                                              <CopyButton text={match.roomId} />
                                            </span>
                                            {match.roomPassword && (
                                              <span className="text-slate-300 font-mono font-bold flex items-center gap-1">
                                                PW: <span className="text-white bg-black/40 px-1.5 py-0.5 rounded border border-white/5 select-all">{match.roomPassword}</span>
                                                <CopyButton text={match.roomPassword} />
                                              </span>
                                            )}
                                          </div>
                                        );
                                      })()
                                    )}
                                  </div>
                                  
                                  {match.youtubeLiveLink && (
                                    <a
                                      href={match.youtubeLiveLink.startsWith('http') ? match.youtubeLiveLink : `https://${match.youtubeLiveLink}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      onClick={(e) => e.stopPropagation()}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                                    >
                                      <Youtube className="w-3 h-3 text-red-500 shrink-0 animate-pulse" />
                                      Watch Live
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Match Played Result Marker Bar */}
                              {match.isPlayed && (
                                <div className="w-full mt-3 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-1 text-[9px] text-slate-400">
                                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                    <span className="uppercase tracking-wider">Match Played</span>
                                  </div>
                                  <div className="font-mono text-[9px]">
                                    {match.scoreA === 7 && match.scoreB === 0 ? (
                                      <span className="text-cyan-400 font-black">🏆 Walkover Win: {squad1?.teamName || match.t1} (7-0, +3 PTS)</span>
                                    ) : match.scoreA === 0 && match.scoreB === 7 ? (
                                      <span className="text-cyan-400 font-black">🏆 Walkover Win: {squad2?.teamName || match.t2} (0-7, +3 PTS)</span>
                                    ) : match.scoreA === 0 && match.scoreB === 0 && (!match.winner || match.winner === 'NO_WINNER') ? (
                                      <span className="text-amber-400 font-black">🚫 Both Squads Absent (0-0, 0 PTS)</span>
                                    ) : (
                                      <span className="text-slate-300">Winner: <strong className="text-cyan-400 font-black">{match.winner === match.t1 ? (squad1?.teamName || match.t1) : match.winner === match.t2 ? (squad2?.teamName || match.t2) : match.winner}</strong> (+3 PTS)</span>
                                    )}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-2">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-cyan-400" />
                      <h4 className="text-sm font-black uppercase tracking-wider text-white">
                        {getRoundsList().find(r => r.id === activeRound)?.label}: {getRoundsList().find(r => r.id === activeRound)?.name}
                      </h4>
                    </div>
                    <span className="text-[9px] font-mono text-cyan-500/80 font-black uppercase tracking-widest bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                      Knockout Stage
                    </span>
                  </div>

                  <div className="grid gap-3">
                    {getKnockoutMatches(activeRound).map((match: any) => {
                      const squad1 = getSquadByNameOrTbd(match.t1);
                      const squad2 = getSquadByNameOrTbd(match.t2);
                      const isCaptain1 = Boolean(userProfile?.userId && (squad1?.leaderId === userProfile.userId || (squad1 as any)?.captainId === userProfile.userId || myTeams.some((t: any) => t.id === squad1?.teamId)));
                      const isCaptain2 = Boolean(userProfile?.userId && (squad2?.leaderId === userProfile.userId || (squad2 as any)?.captainId === userProfile.userId || myTeams.some((t: any) => t.id === squad2?.teamId)));
                      const isHostUser = isHostOrCoHost || userProfile?.userId === league.hostId;
                      const canSeeMessageIcon = isHostUser || isCaptain1 || isCaptain2;

                      const isHighlighted = Boolean(
                        highlightedMatchId && (
                          match.id === highlightedMatchId ||
                          match.id === highlightedMatchId.replace(`${league.id}_`, '') ||
                          `${league.id}_${match.id}` === highlightedMatchId ||
                          (match.matchId && (match.matchId === highlightedMatchId || match.matchId === highlightedMatchId.replace(`${league.id}_`, ''))) ||
                          (navigationContext?.matchId && (match.id === navigationContext.matchId || match.id === navigationContext.matchId.replace(`${league.id}_`, '')))
                        )
                      );

                      return (
                        <div 
                          key={match.id}
                          id={`match-card-${match.id}`}
                          className={`rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-4 transition-all relative ${
                            isHighlighted 
                              ? 'bg-gradient-to-r from-cyan-950/70 via-slate-900/90 to-cyan-950/70 border-2 border-cyan-400 shadow-[0_0_35px_rgba(6,182,212,0.55)] ring-4 ring-cyan-500/25 scale-[1.01]' 
                              : 'bg-white/5 border border-white/5 group hover:border-cyan-500/30'
                          }`}
                        >
                          {/* Highlight Banner when arrived from Pulse Tag */}
                          {isHighlighted && (
                            <div className="absolute -top-3 left-4 z-20 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-cyan-500 to-blue-500 text-black font-mono font-black text-[9px] uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.7)] animate-bounce">
                              <span>🎯</span>
                              <span>Tagged Match in Post</span>
                            </div>
                          )}

                          {/* Pulse Tagging Button (Floating) */}
                          {onTagMatchForPulse && (isCaptain1 || isCaptain2) && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onTagMatchForPulse({
                                  ...match,
                                  type: 'league',
                                  leagueId: league.id,
                                  leagueName: (league as any)?.title || (league as any)?.name || (league as any)?.leagueName || 'Vortex Pro League',
                                  squad1,
                                  squad2,
                                  isCaptain1,
                                  isCaptain2,
                                  userIsInSquad: isCaptain2 ? 2 : (isCaptain1 ? 1 : 0),
                                  t1: squad1 && !squad1.isPlaceholder ? (squad1.teamName || squad1.squadName) : match.t1,
                                  t2: squad2 && !squad2.isPlaceholder ? (squad2.teamName || squad2.squadName) : match.t2,
                                  t1Original: match.t1,
                                  t2Original: match.t2,
                                  squad1Name: squad1 && !squad1.isPlaceholder ? (squad1.teamName || squad1.squadName) : match.t1,
                                  squad2Name: squad2 && !squad2.isPlaceholder ? (squad2.teamName || squad2.squadName) : match.t2,
                                  squad1Cover: squad1?.coverPhoto || squad1?.coverUrl || squad1?.logoUrl || squad1?.photoURL || squad1?.banner || '',
                                  squad2Cover: squad2?.coverPhoto || squad2?.coverUrl || squad2?.logoUrl || squad2?.photoURL || squad2?.banner || '',
                                  squad1Players: squad1?.players || [],
                                  squad2Players: squad2?.players || []
                                });
                              }}
                              className="absolute top-0 right-0 -translate-y-[65%] translate-x-[65%] w-8 h-8 flex items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 via-cyan-400 to-blue-500 shadow-[0_0_18px_rgba(6,182,212,0.8)] z-40 hover:scale-110 active:scale-95 transition-all cursor-pointer border-2 border-cyan-100"
                              title="Tag this match in a Pulse post"
                            >
                              <Zap className="w-3.5 h-3.5 fill-slate-950 text-slate-950 shrink-0" />
                            </button>
                          )}
                          <div className="absolute top-0 left-0 bottom-0 w-1 bg-gradient-to-b from-cyan-500 to-blue-500 opacity-40" />
                          
                          {/* Action Buttons (Pulse Tag, Chat & Admin Menu) */}
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-20">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                openAnnouncementModal(match);
                              }}
                              className={`p-1 rounded transition-all cursor-pointer relative ${matchOverrides[match.id]?.announcements?.length > 0 ? 'text-cyan-400 hover:bg-cyan-500/10' : 'text-slate-500 hover:text-cyan-400 hover:bg-white/5'}`}
                              title="Announcements"
                            >
                              <Megaphone className="w-4 h-4" />
                              {hasUnreadAnnouncements(match.id) && (
                                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full border border-[#0a0c16] animate-pulse"></span>
                              )}
                            </button>
                            
                            {canSeeMessageIcon && (
                              <MatchChatButton
                                match={match}
                                leagueId={league.id}
                                userProfile={userProfile}
                                isActive={activeChatMatch?.id === match.id}
                                isSystemAdmin={isSystemAdmin}
                                onClick={() => setActiveChatMatch(match)}
                              />
                            )}
                            
                            {canManage && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  openEditMatchModal(match);
                                }}
                                className="p-1 text-slate-500 hover:text-cyan-400 hover:bg-white/5 rounded transition-all cursor-pointer"
                                title="Manage Match"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            )}
                          </div>

                          <div className="flex flex-col gap-1.5 w-full md:w-auto shrink-0 border-b md:border-b-0 md:border-r border-white/5 pb-3 md:pb-0 md:pr-4">
                            <div className="flex items-center flex-wrap gap-2">
                              <span className="text-[8px] font-mono text-cyan-400 font-black uppercase tracking-widest bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/10">
                                Match #{match.matchNumber}
                              </span>
                              <span className="text-[10px] font-black text-white">
                                {match.time.split(' | ')[0]}
                              </span>
                              <div className="flex items-center gap-1 text-[9px] font-bold text-cyan-400/90 font-mono bg-white/5 px-1.5 py-0.5 rounded border border-white/10">
                                <Clock className="w-3 h-3 text-cyan-500 shrink-0" />
                                <span>{match.time.split(' | ')[1]}</span>
                              </div>
                            </div>
                            {match.title && (
                              <h5 className="text-[10px] font-black text-slate-300 uppercase tracking-tight">{match.title}</h5>
                            )}
                            
                            {/* Live, Played, Room details and YouTube link badges */}
                            <div className="flex flex-wrap items-center gap-1.5 mt-1">
                              {matchOverrides[match.id]?.reviewStatus === 'pending' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.3)] animate-pulse">
                                  <AlertCircle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                  UNDER REVIEW
                                </span>
                              )}
                              {matchOverrides[match.id]?.reviewStatus === 'approved' && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingResult({ ...match, ...matchOverrides[match.id] });
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500 hover:text-white transition-all cursor-pointer shadow-[0_0_10px_rgba(16,185,129,0.3)]"
                                >
                                  <CheckCircle className="w-2.5 h-2.5 shrink-0" />
                                  SEE RESULT
                                </button>
                              )}
                              {matchOverrides[match.id]?.reviewStatus === 'rejected' && (
                                <span 
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-red-500/20 text-red-300 border border-red-500/30 shadow-[0_0_10px_rgba(239,68,68,0.3)]"
                                  title={matchOverrides[match.id]?.rejectionReason ? `Rejected: ${matchOverrides[match.id]?.rejectionReason}` : 'Result Rejected'}
                                >
                                  <AlertTriangle className="w-2.5 h-2.5 text-red-400 shrink-0" />
                                  RESULT REJECTED
                                </span>
                              )}
                              {match.status === 'live' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-red-500 text-white animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                                  <span className="w-1 h-1 rounded-full bg-white block"></span>
                                  LIVE
                                </span>
                              )}
                              {(match.isPlayed || match.status === 'completed') && matchOverrides[match.id]?.reviewStatus !== 'pending' && matchOverrides[match.id]?.reviewStatus !== 'rejected' && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-[0_0_10px_rgba(16,185,129,0.3)]">
                                  <CheckCircle2 className="w-2.5 h-2.5 text-emerald-400 shrink-0" />
                                  MATCH PLAYED
                                </span>
                              )}
                              {match.isRescheduled && (
                                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-400 shrink-0" />
                                  RESCHEDULED
                                </span>
                              )}
                              {match.roomId && (canManage || isSystemAdmin || isCaptain1 || isCaptain2) && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowRoomDetailsForUser(match);
                                  }}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 shadow-sm cursor-pointer"
                                >
                                  <Lock className="w-2 h-2" />
                                  Room ID
                                </button>
                              )}
                              {match.youtubeLiveLink && (
                                <a
                                  href={match.youtubeLiveLink.startsWith('http') ? match.youtubeLiveLink : `https://${match.youtubeLiveLink}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[7px] font-black uppercase tracking-wider bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 shadow-sm cursor-pointer"
                                >
                                  <Youtube className="w-2 h-2 text-red-500 shrink-0" />
                                  Watch
                                </a>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col flex-1 items-center justify-center w-full">
                            <div className="flex items-center gap-4 w-full justify-center">
                              <div className="flex flex-col items-center gap-1.5 min-w-[120px] flex-1 text-center">
                                <div 
                                  className="w-[132px] sm:w-[164px] aspect-[16/9] rounded-xl flex items-center justify-center text-[10px] font-black overflow-hidden border shadow-sm cursor-pointer"
                                  style={getNeonBoxStyle(squad1?.teamName || match.t1)}
                                  onClick={() => squad1 && setSelectedSquadDetails(squad1)}
                                >
                                  {(squad1?.coverPhoto || squad1?.coverUrl || squad1?.banner || squad1?.logoUrl) ? (
                                    <img 
                                      src={squad1.coverPhoto || squad1.coverUrl || squad1.banner || squad1.logoUrl} 
                                      loading="lazy" 
                                      decoding="async" 
                                      className="w-full h-full object-cover" 
                                      alt={squad1?.teamName || match.t1} 
                                    />
                                  ) : (
                                    <span className="text-[8px] sm:text-[9px] font-black text-center px-1 leading-tight select-none">
                                      {(squad1?.teamName || match.t1).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <span 
                                  className="text-[10px] font-black uppercase tracking-wider text-center cursor-pointer hover:underline"
                                  style={getNeonStyle(squad1?.teamName || match.t1, 10)}
                                  onClick={() => squad1 && setSelectedSquadDetails(squad1)}
                                >
                                  {squad1?.teamName || match.t1}
                                </span>
                              </div>
                              
                              <div className="flex flex-col items-center gap-1 shrink-0">
                                {match.isPlayed ? (
                                  <div className="flex flex-col items-center gap-0.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-xl min-w-[60px]">
                                    <div className="flex items-center gap-2">
                                      <span className={`text-sm font-black font-mono ${match.winner === match.t1 || match.winner === squad1?.teamName ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'text-slate-400'}`}>
                                        {match.scoreA ?? 0}
                                      </span>
                                      <span className="text-[10px] text-slate-500 font-bold">-</span>
                                      <span className={`text-sm font-black font-mono ${match.winner === match.t2 || match.winner === squad2?.teamName ? 'text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.4)]' : 'text-slate-400'}`}>
                                        {match.scoreB ?? 0}
                                      </span>
                                    </div>
                                    <span className="text-[7px] font-black uppercase text-emerald-400/90 tracking-wider">
                                      {match.scoreA === 7 && match.scoreB === 0 ? '7-0 Walkover' : match.scoreA === 0 && match.scoreB === 7 ? '0-7 Walkover' : (match.scoreA === 0 && match.scoreB === 0 && !match.winner) ? '0-0 (Both Absent)' : 'Match Played'}
                                    </span>
                                  </div>
                                ) : (
                                  <div className="text-cyan-500 font-black italic text-xs drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]">VS</div>
                                )}
                              </div>
                              
                              <div className="flex flex-col items-center gap-1.5 min-w-[120px] flex-1 text-center">
                                <div 
                                  className="w-[132px] sm:w-[164px] aspect-[16/9] rounded-xl flex items-center justify-center text-[10px] font-black overflow-hidden border shadow-sm cursor-pointer"
                                  style={getNeonBoxStyle(squad2?.teamName || match.t2)}
                                  onClick={() => squad2 && setSelectedSquadDetails(squad2)}
                                >
                                  {(squad2?.coverPhoto || squad2?.coverUrl || squad2?.banner || squad2?.logoUrl) ? (
                                    <img 
                                      src={squad2.coverPhoto || squad2.coverUrl || squad2.banner || squad2.logoUrl} 
                                      loading="lazy" 
                                      decoding="async" 
                                      className="w-full h-full object-cover" 
                                      alt={squad2?.teamName || match.t2} 
                                    />
                                  ) : (
                                    <span className="text-[8px] sm:text-[9px] font-black text-center px-1 leading-tight select-none">
                                      {(squad2?.teamName || match.t2).toUpperCase()}
                                    </span>
                                  )}
                                </div>
                                <span 
                                  className="text-[10px] font-black uppercase tracking-wider text-center cursor-pointer hover:underline"
                                  style={getNeonStyle(squad2?.teamName || match.t2, 10)}
                                  onClick={() => squad2 && setSelectedSquadDetails(squad2)}
                                >
                                  {squad2?.teamName || match.t2}
                                </span>
                              </div>
                            </div>

                            {/* Live Room & stream details section */}
                            {(match.roomId || match.youtubeLiveLink) && !match.isPlayed && (
                              <div className="w-full mt-3 pt-2.5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-2 text-[9px] text-slate-400">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {match.roomId && (
                                    (() => {
                                      const isAuth = canManage || isSystemAdmin || isCaptain1 || isCaptain2;
                                      if (!isAuth) {
                                        return (
                                          <div className="flex items-center gap-1 text-slate-500 font-bold bg-white/[0.02] border border-white/5 px-2 py-1 rounded-lg">
                                            <Lock className="w-2.5 h-2.5 text-slate-500 shrink-0" />
                                            <span>Room Credentials Protected</span>
                                          </div>
                                        );
                                      }
                                      return (
                                        <div className="flex flex-wrap items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-xl">
                                          <span className="text-cyan-400 font-bold uppercase tracking-wider">Room:</span>
                                          <span className="text-slate-300 font-mono font-bold flex items-center gap-1">
                                            ID: <span className="text-white bg-black/40 px-1.5 py-0.5 rounded border border-white/5 select-all">{match.roomId}</span>
                                            <CopyButton text={match.roomId} />
                                          </span>
                                          {match.roomPassword && (
                                            <span className="text-slate-300 font-mono font-bold flex items-center gap-1">
                                              PW: <span className="text-white bg-black/40 px-1.5 py-0.5 rounded border border-white/5 select-all">{match.roomPassword}</span>
                                              <CopyButton text={match.roomPassword} />
                                            </span>
                                          )}
                                        </div>
                                      );
                                    })()
                                  )}
                                </div>
                                
                                {match.youtubeLiveLink && (
                                  <a
                                    href={match.youtubeLiveLink.startsWith('http') ? match.youtubeLiveLink : `https://${match.youtubeLiveLink}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-xl font-bold uppercase tracking-wider shadow-sm transition-all cursor-pointer"
                                  >
                                    <Youtube className="w-3 h-3 text-red-500 shrink-0 animate-pulse" />
                                    Watch Live
                                  </a>
                                )}
                              </div>
                            )}

                            {/* Match Played Result Marker Bar */}
                            {match.isPlayed && (
                              <div className="w-full mt-3 pt-2 border-t border-white/5 flex flex-wrap items-center justify-between gap-1 text-[9px] text-slate-400">
                                <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                                  <span className="uppercase tracking-wider">Match Played</span>
                                </div>
                                <div className="font-mono text-[9px]">
                                  {match.scoreA === 7 && match.scoreB === 0 ? (
                                    <span className="text-cyan-400 font-black">🏆 Walkover Win: {match.t1} (7-0)</span>
                                  ) : match.scoreA === 0 && match.scoreB === 7 ? (
                                    <span className="text-cyan-400 font-black">🏆 Walkover Win: {match.t2} (0-7)</span>
                                  ) : match.scoreA === 0 && match.scoreB === 0 && (!match.winner || match.winner === 'NO_WINNER') ? (
                                    <span className="text-amber-400 font-black">🚫 Both Squads Absent (0-0)</span>
                                  ) : (
                                    <span className="text-slate-300">Winner: <strong className="text-cyan-400 font-black">{match.winner}</strong></span>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {activeTab === 'standings' && (
            <motion.div
              key="standings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {/* Group Selector */}
              <div className="flex gap-2">
                {groups.map((g) => {
                  const slotStatus = getGroupSlotStatus(g);
                  return (
                    <button
                      key={g}
                      onClick={() => setActiveGroup(g)}
                      className={`flex-1 py-2 px-2 rounded-xl text-xs font-black transition-all flex flex-col sm:flex-row items-center justify-center gap-1.5 ${
                        activeGroup === g
                          ? 'bg-[#06b6d4]/10 text-[#06b6d4] border border-[#06b6d4]/40 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                          : 'text-slate-400 hover:bg-white/5 border border-transparent'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full ${
                          slotStatus.isFull 
                            ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)]' 
                            : 'bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)] animate-pulse'
                        }`} />
                        <span>Group {g}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border tracking-tight ${
                        slotStatus.isFull
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                      }`}>
                        {slotStatus.filledCount}/{slotStatus.totalSlots}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Table wrapper with visual horizontal sliding / scroll assistance */}
              <div className="relative bg-[#04060e] border border-cyan-500/10 rounded-xl overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.03)]">
                {/* Scroll Indicator for mobile */}
                <div className="flex items-center justify-between px-3 py-1.5 bg-gradient-to-r from-cyan-950/30 to-blue-950/30 border-b border-cyan-500/10 md:hidden">
                  <span className="text-[8px] font-black uppercase tracking-wider text-cyan-400 flex items-center gap-1 animate-pulse">
                    Swipe Right to View More ➔
                  </span>
                  <span className="text-[7.5px] font-bold text-slate-500 uppercase tracking-widest">
                    Scrollable Table
                  </span>
                </div>

                <div className="overflow-x-auto scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-slate-900/40">
                  <table className="w-full text-left text-[9px] min-w-[650px]">
                    <thead>
                      <tr className="bg-slate-900/40 text-[8px] font-black uppercase text-slate-400 tracking-wider border-b border-cyan-500/10">
                        <th className="px-2.5 py-1.5 whitespace-nowrap">Rank</th>
                        <th className="px-2.5 py-1.5 whitespace-nowrap">Squad</th>
                        <th className="px-2.5 py-1.5 text-center whitespace-nowrap">P</th>
                        <th className="px-2.5 py-1.5 text-center whitespace-nowrap">W</th>
                        <th className="px-2.5 py-1.5 text-center whitespace-nowrap">L</th>
                        <th className="px-2.5 py-1.5 text-center text-cyan-400 whitespace-nowrap">PTS</th>
                        <th className="px-2.5 py-1.5 text-center whitespace-nowrap">Score</th>
                        <th className="px-2.5 py-1.5 text-center whitespace-nowrap text-cyan-400">RW (Won)</th>
                        <th className="px-2.5 py-1.5 text-center whitespace-nowrap text-red-400">RL (Lost)</th>
                        <th className="px-2.5 py-1.5 text-center whitespace-nowrap text-amber-400">RD (Diff)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {(() => {
                        const standingsList = getStandings(activeGroup);
                        return standingsList.map((squad, rank) => {
                          // Check if there are other squads in this group with the EXACT same pts and score to trigger "Do or Die" match!
                          const tiedForDoOrDie = squad.p > 0 && standingsList.some(
                            other => other.id !== squad.id && other.pts === squad.pts && other.score === squad.score
                          );

                          return (
                            <tr key={squad.id} className="hover:bg-cyan-500/[0.01] transition-colors group/row">
                              <td className="px-2.5 py-1.5 font-black">
                                <div className="flex items-center gap-1.5">
                                  {rank < 2 ? (
                                    <div className="flex items-center gap-0.5 text-emerald-400 text-[9px]">
                                      <CheckCircle2 className="w-2.5 h-2.5" />
                                      <span>#{rank + 1}</span>
                                    </div>
                                  ) : (
                                    <span className="text-slate-500 font-mono text-[9px]">
                                      #{rank + 1}
                                    </span>
                                  )}
                                </div>
                              </td>
                              <td className="px-2.5 py-1.5">
                                <div className="flex items-center gap-2">
                                  <div 
                                    className="w-5.5 h-5.5 rounded flex items-center justify-center text-[7.5px] font-black shrink-0 shadow-[0_0_6px_rgba(6,182,212,0.05)] border border-cyan-500/10"
                                    style={getNeonBoxStyle(squad.name)}
                                  >
                                    {squad.name.substring(0, 2).toUpperCase()}
                                  </div>
                                  <div className="flex flex-col">
                                    <span 
                                      className="font-black uppercase tracking-tight text-white group-hover/row:text-cyan-300 transition-colors"
                                      style={getNeonStyle(squad.name, 9.5)}
                                    >
                                      {squad.name}
                                    </span>
                                    {squad.wonDoOrDie ? (
                                      <span className="inline-flex items-center gap-0.5 mt-0.5 text-[6px] font-black uppercase tracking-widest bg-emerald-500/10 text-emerald-400 px-1 py-0.5 rounded border border-emerald-500/20 shadow-[0_0_6px_rgba(16,185,129,0.15)] w-fit">
                                        ⚡ Do or Die Winner (+0.5 Bonus)
                                      </span>
                                    ) : tiedForDoOrDie && !squad.playedDoOrDie ? (
                                      <span className="inline-flex items-center gap-0.5 mt-0.5 text-[6px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-400 px-1 py-0.5 rounded border border-rose-500/20 animate-pulse w-fit">
                                        ⚡ Do or Die Match Required
                                      </span>
                                    ) : null}
                                  </div>
                                </div>
                              </td>
                              <td className="px-2.5 py-1.5 text-center font-mono text-slate-400 font-bold">{squad.p}</td>
                              <td className="px-2.5 py-1.5 text-center font-mono text-emerald-400/90 font-bold">{squad.w}</td>
                              <td className="px-2.5 py-1.5 text-center font-mono text-rose-400/90 font-bold">{squad.l}</td>
                              <td className={`px-2.5 py-1.5 text-center font-black text-[10px] ${rank < 2 ? 'text-[#06b6d4] drop-shadow-[0_0_4px_rgba(6,182,212,0.4)]' : 'text-slate-400'}`}>
                                {squad.effectivePts !== undefined && squad.effectivePts !== squad.pts ? (
                                  <span className="text-amber-300 font-extrabold" title={`${squad.pts} Base PTS + 0.5 Do or Die Bonus`}>
                                    {squad.effectivePts}
                                  </span>
                                ) : (
                                  squad.pts
                                )}
                              </td>
                              <td className="px-2.5 py-1.5 text-center font-mono text-amber-400 font-black bg-amber-500/[0.02]">{squad.score}</td>
                              <td className="px-2.5 py-1.5 text-center font-mono text-cyan-300/90 font-bold bg-cyan-500/[0.02]">{squad.rw}</td>
                              <td className="px-2.5 py-1.5 text-center font-mono text-rose-300/90 font-bold bg-rose-500/[0.02]">{squad.rl}</td>
                              <td className={`px-2.5 py-1.5 text-center font-mono font-bold ${squad.rd >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90'}`}>
                                {squad.rd > 0 ? `+${squad.rd}` : squad.rd}
                              </td>
                            </tr>
                          );
                        });
                      })()}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex flex-col gap-3 bg-gradient-to-r from-cyan-950/10 via-[#0a0c16] to-blue-950/10 border border-cyan-500/10 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div className="space-y-2">
                    <p className="text-[10px] text-cyan-300 font-black uppercase tracking-widest">Standing Rules & Formula:</p>
                    <ul className="text-[9.5px] text-slate-400 space-y-1.5 font-bold leading-relaxed">
                      <li>• <span className="text-white">PTS (Points):</span> 3 Points for a Win, 0 for a Loss.</li>
                      <li>• <span className="text-cyan-400">RW / RL / RD:</span> Rounds Won, Rounds Lost, and Round Difference for Free Clash Squad matches.</li>
                      <li>• <span className="text-amber-400 font-black">Score Formula:</span> Computed arithmetic logic: <code className="bg-slate-900 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/20 font-mono text-[9px]">Score = PTS + RW - P</code></li>
                      <li>• <span className="text-white">Tie-breaker Sequence:</span> Top Rank depends on highest <span className="text-cyan-400">PTS</span>. If points are equal, squad with the higher custom <span className="text-amber-400">Score</span> takes the lead.</li>
                      <li>• <span className="text-rose-400">Do or Die Match:</span> If two or more squads are tied with identical <span className="text-cyan-400">PTS</span> and <span className="text-amber-400">Score</span>, they must play a single-elimination <span className="text-rose-400">"Do or Die"</span> match to resolve the tie.</li>
                      <li>• Top 2 squads with green checkmarks qualify to advance into the Knockout stage.</li>
                    </ul>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === 'top_players' && (
            <motion.div
              key="top_players"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6"
            >
              {(() => {
                const topPlayers = getTopPlayers();

                if (topPlayers.length === 0) {
                  return (
                    <div className="bg-[#04060e] border border-cyan-500/10 rounded-2xl p-8 text-center space-y-3 shadow-xl">
                      <Flame className="w-10 h-10 text-slate-600 mx-auto" />
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Match Statistics Available Yet</p>
                      <p className="text-[10px] text-slate-500 font-medium">As soon as match results are submitted and approved, player kills & damage will appear here.</p>
                    </div>
                  );
                }

                return (
                  <div className="bg-[#04060e] border border-cyan-500/10 rounded-2xl overflow-hidden shadow-xl space-y-3 p-4">
                    <div className="flex items-center justify-between border-b border-white/5 pb-3">
                      <div className="flex items-center gap-2">
                        <Trophy className="w-4 h-4 text-cyan-400" />
                        <h3 className="text-xs font-black uppercase text-white tracking-wider">FULL PLAYER RANKING LEADERBOARD</h3>
                      </div>
                      <span className="text-[9px] font-mono font-bold text-slate-500 uppercase">{topPlayers.length} Ranked Players</span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-[9.5px]">
                        <thead>
                          <tr className="bg-slate-900/60 text-[8px] font-black uppercase text-slate-400 tracking-wider border-b border-cyan-500/10">
                            <th className="px-3 py-2">Rank</th>
                            <th className="px-3 py-2">Player</th>
                            <th className="px-3 py-2">Squad</th>
                            <th className="px-3 py-2 text-center">Matches</th>
                            <th className="px-3 py-2 text-center text-amber-400">Total Kills</th>
                            <th className="px-3 py-2 text-center text-cyan-400">Total Damage (HP)</th>
                            <th className="px-3 py-2 text-center text-slate-300">Avg Kills/Match</th>
                            <th className="px-3 py-2 text-center text-fuchsia-400">Economy</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {topPlayers.map((p, idx) => {
                            const rank = idx + 1;
                            const avgKills = p.matchesPlayed > 0 ? (p.kills / p.matchesPlayed).toFixed(1) : '0';

                            return (
                              <tr key={p.key || idx} className={`hover:bg-cyan-500/[0.03] transition-colors ${rank === 1 ? 'bg-amber-500/[0.04]' : rank === 2 ? 'bg-slate-400/[0.02]' : rank === 3 ? 'bg-amber-700/[0.02]' : ''}`}>
                                <td className="px-3 py-2 font-mono font-black">
                                  {rank === 1 ? (
                                    <span className="inline-flex items-center gap-1 bg-amber-500 text-slate-950 text-[8.5px] px-1.5 py-0.5 rounded-full font-black">🥇 #1</span>
                                  ) : rank === 2 ? (
                                    <span className="inline-flex items-center gap-1 bg-slate-300 text-slate-950 text-[8.5px] px-1.5 py-0.5 rounded-full font-black">🥈 #2</span>
                                  ) : rank === 3 ? (
                                    <span className="inline-flex items-center gap-1 bg-amber-700 text-white text-[8.5px] px-1.5 py-0.5 rounded-full font-black">🥉 #3</span>
                                  ) : (
                                    <span className="text-slate-500">#{rank}</span>
                                  )}
                                </td>
                                <td className="px-3 py-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-lg bg-slate-900 border border-white/10 overflow-hidden shrink-0 flex items-center justify-center">
                                      {p.photoURL ? (
                                        <img src={p.photoURL} alt={p.displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <div className="w-full h-full bg-cyan-950/40 flex items-center justify-center text-cyan-500 font-black text-[9px] uppercase">
                                          {p.displayName.substring(0, 2)}
                                        </div>
                                      )}
                                    </div>
                                    <span className={`font-black uppercase ${rank === 1 ? 'text-amber-300' : 'text-white'}`}>{p.displayName}</span>
                                  </div>
                                </td>
                                <td className="px-3 py-2 text-slate-400 font-bold uppercase text-[9px]">{p.squadName}</td>
                                <td className="px-3 py-2 text-center font-mono font-bold text-slate-300">{p.matchesPlayed}</td>
                                <td className="px-3 py-2 text-center font-mono font-black text-amber-400">{p.kills}</td>
                                <td className="px-3 py-2 text-center font-mono font-black text-cyan-400">{p.damage} <span className="text-[8px] text-slate-500">HP</span></td>
                                <td className="px-3 py-2 text-center font-mono font-bold text-slate-400">{avgKills}</td>
                                <td className="px-3 py-2 text-center font-mono font-black text-fuchsia-400">{p.economyScore || 0}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })()}
            </motion.div>
          )}

          {activeTab === 'brackets' && (
            <motion.div
              key="brackets"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 overflow-hidden"
            >
              {/* Bracket Header with rules */}
              <div className="bg-gradient-to-r from-cyan-950/20 via-[#0a0c16] to-blue-950/20 border border-cyan-500/10 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-black uppercase tracking-wider text-white">Knockout Stage Brackets</span>
                  </div>
                  <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                    Visual map of the tournament progression. The top 2 squads of each group advance to Round Two under a cross-system format (Group A #1 vs Group B #2, and vice versa).
                  </p>
                </div>
                <div className="shrink-0 flex items-center gap-2 bg-cyan-500/10 border border-cyan-500/20 rounded-xl px-3 py-2 text-cyan-300">
                  <span className="text-[9px] font-black uppercase tracking-wider">Tournament Size:</span>
                  <span className="text-xs font-black font-mono bg-cyan-500 text-slate-950 px-1.5 py-0.5 rounded">{league.squadSize} Squads</span>
                </div>
              </div>

              {/* Tournament Tree Wrapper */}
              <div className="overflow-x-auto pb-6 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent">
                <div className="flex items-start gap-8 min-w-[700px] py-4 px-2">
                  {getRoundsList().map((round, colIdx) => {
                    const isGroupStage = round.id === 1;
                    const matches = isGroupStage ? [] : getKnockoutMatches(round.id);
                    
                    if (isGroupStage) {
                      return (
                        <div key={round.id} className="flex-1 min-w-[200px] max-w-[240px] space-y-4 shrink-0">
                          <div className="text-center border-b border-white/5 pb-2">
                            <span className="text-[8px] font-mono font-black text-cyan-500 uppercase tracking-widest">{round.label}</span>
                            <h4 className="text-xs font-black text-white uppercase mt-0.5">{round.name}</h4>
                          </div>
                          
                          <div className="space-y-3">
                            {groups.map((g) => (
                              <div key={g} className="bg-slate-950/40 border border-white/5 rounded-xl p-3 space-y-2">
                                <div className="flex items-center justify-between border-b border-white/5 pb-1">
                                  <span className="text-[9px] font-black text-cyan-400 uppercase">Group {g}</span>
                                  <span className="text-[7.5px] font-black text-slate-500 uppercase">Top 2 Qualify</span>
                                </div>
                                <div className="space-y-1 text-[8.5px] font-bold text-slate-400 uppercase">
                                  <div className="flex items-center justify-between bg-white/5 p-1 rounded">
                                    <span>🥇 1st Place</span>
                                    <span className="text-cyan-300 text-[8px] font-mono font-black">TBD-{g}1</span>
                                  </div>
                                  <div className="flex items-center justify-between bg-white/5 p-1 rounded">
                                    <span>🥈 2nd Place</span>
                                    <span className="text-cyan-300 text-[8px] font-mono font-black">TBD-{g}2</span>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    }

                    return (
                      <div key={round.id} className="flex-1 min-w-[200px] max-w-[240px] space-y-4 shrink-0">
                        <div className="text-center border-b border-white/5 pb-2">
                          <span className="text-[8px] font-mono font-black text-cyan-500 uppercase tracking-widest">{round.label}</span>
                          <h4 className="text-xs font-black text-white uppercase mt-0.5">{round.name}</h4>
                        </div>
                        
                        <div className="space-y-4 flex flex-col justify-around h-full min-h-[300px]">
                          {matches.map((match: any) => {
                            const squad1 = getSquadByNameOrTbd(match.t1);
                            const squad2 = getSquadByNameOrTbd(match.t2);
                            const isCaptain1 = Boolean(userProfile?.userId && (squad1?.leaderId === userProfile.userId || (squad1 as any)?.captainId === userProfile.userId || myTeams.some((t: any) => t.id === squad1?.teamId)));
                            const isCaptain2 = Boolean(userProfile?.userId && (squad2?.leaderId === userProfile.userId || (squad2 as any)?.captainId === userProfile.userId || myTeams.some((t: any) => t.id === squad2?.teamId)));
                            const isHostUser = isHostOrCoHost || userProfile?.userId === league.hostId;
                            const canSeeMessageIcon = isHostUser || isCaptain1 || isCaptain2;

                            return (
                              <div 
                                key={match.id} 
                                id={`match-card-${match.id}`}
                                className="relative bg-slate-950/60 border border-white/5 hover:border-cyan-500/20 rounded-xl p-3 space-y-2.5 transition-all shadow-md group/match overflow-hidden"
                              >
                                <div className="absolute top-0 left-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 to-blue-500 opacity-50" />
                                
                                {canSeeMessageIcon && (
                                  <div className="absolute top-2 left-2 z-10">
                                    <MatchChatButton
                                      match={match}
                                      leagueId={league.id}
                                      userProfile={userProfile}
                                      isActive={activeChatMatch?.id === match.id}
                                      isSystemAdmin={isSystemAdmin}
                                      onClick={() => setActiveChatMatch(match)}
                                    />
                                  </div>
                                )}
                              {matchOverrides[match.id]?.reviewStatus === 'pending' && (
                                <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-amber-500/10 border border-amber-500/20 rounded text-[6px] font-black text-amber-500 uppercase tracking-widest animate-pulse">
                                  <AlertCircle className="w-1.5 h-1.5" /> Result Under Review
                                </div>
                              )}
                              {matchOverrides[match.id]?.reviewStatus === 'approved' && (
                                <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-emerald-500/10 border border-emerald-500/20 rounded text-[6px] font-black text-emerald-500 uppercase tracking-widest">
                                  <CheckCircle className="w-1.5 h-1.5" /> Result Approved
                                </div>
                              )}
                              {matchOverrides[match.id]?.reviewStatus === 'rejected' && (
                                <div className="absolute top-2 right-2 flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[6px] font-black text-red-400 uppercase tracking-widest">
                                  <AlertTriangle className="w-1.5 h-1.5 text-red-400" /> Result Rejected
                                </div>
                              )}

                              <div className="flex items-center justify-between text-[8px] font-mono font-bold text-slate-500 uppercase border-b border-white/5 pb-1">
                                <span>M #{match.matchNumber}</span>
                                <span className="text-cyan-400 font-black">{match.map}</span>
                              </div>
                              
                              {(() => {
                                const squad1 = getSquadByNameOrTbd(match.t1);
                                const squad2 = getSquadByNameOrTbd(match.t2);
                                const squad1Name = squad1?.teamName || squad1?.squadName || match.t1;
                                const squad2Name = squad2?.teamName || squad2?.squadName || match.t2;
                                const sq1Cover = squad1?.coverUrl || squad1?.coverPhoto || squad1?.logoUrl || squad1?.logo || squad1?.photoURL || '';
                                const sq2Cover = squad2?.coverUrl || squad2?.coverPhoto || squad2?.logoUrl || squad2?.logo || squad2?.photoURL || '';

                                return (
                                  <div className="space-y-1.5">
                                    <div 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (squad1 && !squad1.isPlaceholder) {
                                          setSelectedSquadDetails(squad1);
                                        }
                                      }}
                                      className={`flex items-center justify-between rounded bg-white/[0.02] hover:bg-white/10 p-1.5 transition-colors border border-transparent hover:border-cyan-500/30 ${squad1 && !squad1.isPlaceholder ? 'cursor-pointer' : ''}`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        {sq1Cover ? (
                                          <img src={sq1Cover} alt="" className="w-5 h-5 rounded object-cover border border-white/10 shrink-0" />
                                        ) : (
                                          <div className="w-5 h-5 rounded bg-slate-800 border border-white/10 flex items-center justify-center text-[8px] font-black text-cyan-400 shrink-0">
                                            {(squad1Name || '?')[0]}
                                          </div>
                                        )}
                                        <span className="text-[9px] font-black uppercase text-slate-300 truncate" style={getNeonStyle(squad1Name, 9)}>
                                          {squad1Name}
                                        </span>
                                      </div>
                                      <span className="text-[7.5px] font-mono font-bold text-slate-500 uppercase tracking-tighter shrink-0 bg-white/5 px-1 rounded ml-1">#1</span>
                                    </div>
                                    
                                    <div 
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        if (squad2 && !squad2.isPlaceholder) {
                                          setSelectedSquadDetails(squad2);
                                        }
                                      }}
                                      className={`flex items-center justify-between rounded bg-white/[0.02] hover:bg-white/10 p-1.5 transition-colors border border-transparent hover:border-cyan-500/30 ${squad2 && !squad2.isPlaceholder ? 'cursor-pointer' : ''}`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        {sq2Cover ? (
                                          <img src={sq2Cover} alt="" className="w-5 h-5 rounded object-cover border border-white/10 shrink-0" />
                                        ) : (
                                          <div className="w-5 h-5 rounded bg-slate-800 border border-white/10 flex items-center justify-center text-[8px] font-black text-cyan-400 shrink-0">
                                            {(squad2Name || '?')[0]}
                                          </div>
                                        )}
                                        <span className="text-[9px] font-black uppercase text-slate-300 truncate" style={getNeonStyle(squad2Name, 9)}>
                                          {squad2Name}
                                        </span>
                                      </div>
                                      <span className="text-[7.5px] font-mono font-bold text-slate-500 uppercase tracking-tighter shrink-0 bg-white/5 px-1 rounded ml-1">#2</span>
                                    </div>
                                  </div>
                                );
                              })()}
                              
                              <div className="text-center text-[7.5px] font-mono font-bold text-slate-500 bg-white/5 py-0.5 rounded uppercase">
                                {match.time.split(' | ')[0]} • {match.time.split(' | ')[1]}
                              </div>

                              {matchOverrides[match.id]?.reviewStatus === 'approved' && (
                                <button 
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewingResult(matchOverrides[match.id]);
                                  }}
                                  className="w-full mt-1.5 py-1.5 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/30 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all"
                                >
                                  See Result
                                </button>
                              )}
                            </div>
                          );
                        })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Result View Modal */}
      {viewingResult && (() => {
        const t1Id = viewingResult.t1 || viewingResult.matchId?.split('_')[0];
        const t2Id = viewingResult.t2 || viewingResult.matchId?.split('_')[1];

        const squad1 = getSquadByTbdId(t1Id);
        const squad2 = getSquadByTbdId(t2Id);

        const squad1Name = squad1?.squadName || squad1?.teamName || t1Id || 'Squad 1';
        const squad2Name = squad2?.squadName || squad2?.teamName || t2Id || 'Squad 2';

        const squad1Cover = squad1?.coverPhoto || squad1?.coverUrl || squad1?.logoUrl || squad1?.logo || squad1?.photoURL || squad1?.banner || squad1?.bannerUrl || squad1?.teamLogo || squad1?.image || '';
        const squad2Cover = squad2?.coverPhoto || squad2?.coverUrl || squad2?.logoUrl || squad2?.logo || squad2?.photoURL || squad2?.banner || squad2?.bannerUrl || squad2?.teamLogo || squad2?.image || '';

        const scoreAVal = viewingResult.scoreA ?? 0;
        const scoreBVal = viewingResult.scoreB ?? 0;
        const totalRounds = scoreAVal + scoreBVal;

        const isS1Winner = viewingResult.winner === t1Id || viewingResult.winner === squad1Name || scoreAVal > scoreBVal;
        const isS2Winner = viewingResult.winner === t2Id || viewingResult.winner === squad2Name || scoreBVal > scoreAVal;

        const s1Players = squad1?.players && Array.isArray(squad1.players) && squad1.players.length > 0
          ? squad1.players
          : Object.keys(viewingResult.playerStats || {}).slice(0, Math.ceil(Object.keys(viewingResult.playerStats || {}).length / 2)).map(e => ({ email: e, gameName: e.split('@')[0] }));

        const s2Players = squad2?.players && Array.isArray(squad2.players) && squad2.players.length > 0
          ? squad2.players
          : Object.keys(viewingResult.playerStats || {}).slice(Math.ceil(Object.keys(viewingResult.playerStats || {}).length / 2)).map(e => ({ email: e, gameName: e.split('@')[0] }));

        return (
          <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#05070a] border border-cyan-500/30 rounded-[2.5rem] p-6 w-full max-w-2xl relative my-8 overflow-hidden shadow-[0_0_50px_rgba(6,182,212,0.15)] max-h-[90vh] flex flex-col"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 to-blue-600" />
              
              <button 
                onClick={() => setViewingResult(null)}
                className="absolute top-5 right-5 p-2 bg-white/5 hover:bg-white/10 rounded-full text-slate-400 hover:text-white transition-all cursor-pointer border border-white/5 z-10"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>

              <div className="text-center mb-6">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded-full text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-2">
                  <Trophy className="w-3 h-3" /> Match Result Finalized
                </div>
                <h3 className="text-2xl font-black text-white uppercase tracking-tight">Match Statistics</h3>
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mt-0.5">
                  Approved by Admin • {viewingResult.approvedAt ? new Date(viewingResult.approvedAt).toLocaleDateString() : 'Recent'}
                </p>
              </div>

              {/* Squad Header & Scores */}
              <div className="grid grid-cols-3 items-center gap-4 mb-6 bg-slate-950/80 p-4 rounded-3xl border border-white/5">
                {/* Squad 1 */}
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center relative group">
                    {squad1Cover && (
                      <img 
                        src={squad1Cover} 
                        alt={squad1Name} 
                        className="w-full h-full object-cover relative z-10"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-950 to-slate-900 text-cyan-400 flex items-center justify-center font-black text-sm uppercase">
                      {squad1Name.slice(0, 3)}
                    </div>
                    {isS1Winner && (
                      <div className="absolute top-1 right-1 z-20 bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">
                        WIN
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-black text-white uppercase truncate px-1">{squad1Name}</p>
                  <p className="text-[9px] font-bold text-slate-400">{scoreAVal} Rounds Won</p>
                </div>
                
                {/* Score & Total Rounds */}
                <div className="text-center">
                  <div className="text-3xl sm:text-4xl font-black text-white font-mono flex items-center justify-center gap-2">
                    <span className={scoreAVal > scoreBVal ? 'text-cyan-400' : 'text-slate-400'}>{scoreAVal}</span>
                    <span className="text-slate-600">:</span>
                    <span className={scoreBVal > scoreAVal ? 'text-cyan-400' : 'text-slate-400'}>{scoreBVal}</span>
                  </div>
                  <div className="mt-1 inline-block px-2.5 py-0.5 bg-white/5 border border-white/10 rounded-full">
                    <p className="text-[9px] font-black text-cyan-400 uppercase tracking-wider">{totalRounds} Rounds Played</p>
                  </div>
                </div>

                {/* Squad 2 */}
                <div className="text-center space-y-2">
                  <div className="w-16 h-16 mx-auto rounded-2xl bg-slate-900 border border-white/10 overflow-hidden flex items-center justify-center relative group">
                    {squad2Cover && (
                      <img 
                        src={squad2Cover} 
                        alt={squad2Name} 
                        className="w-full h-full object-cover relative z-10"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.onerror = null;
                          target.style.display = 'none';
                        }}
                      />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-br from-blue-950 to-slate-900 text-blue-400 flex items-center justify-center font-black text-sm uppercase">
                      {squad2Name.slice(0, 3)}
                    </div>
                    {isS2Winner && (
                      <div className="absolute top-1 right-1 z-20 bg-amber-500 text-black text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase">
                        WIN
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-black text-white uppercase truncate px-1">{squad2Name}</p>
                  <p className="text-[9px] font-bold text-slate-400">{scoreBVal} Rounds Won</p>
                </div>
              </div>

              {/* Detailed Player Stats According to Squad */}
              <div className="flex-1 overflow-y-auto custom-scrollbar pr-1 space-y-4">
                <div className="flex items-center justify-between border-b border-white/10 pb-2">
                  <span className="text-[11px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5" /> Player Performances
                  </span>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  {[
                    { key: 'sq1', players: s1Players, name: squad1Name, cover: squad1Cover, label: 'Squad 1', color: 'cyan' },
                    { key: 'sq2', players: s2Players, name: squad2Name, cover: squad2Cover, label: 'Squad 2', color: 'blue' }
                  ].map((sqItem) => (
                    <div key={sqItem.key} className="space-y-2.5 bg-slate-950/60 p-3.5 rounded-2xl border border-white/5">
                      {/* Squad Sub-Header */}
                      <div className="flex items-center gap-2.5 p-2 bg-white/[0.03] rounded-xl border border-white/5">
                        <div className="w-9 h-8 rounded-lg overflow-hidden border border-white/10 shrink-0 bg-slate-900 flex items-center justify-center relative">
                          {sqItem.cover && (
                            <img 
                              src={sqItem.cover} 
                              alt={sqItem.name} 
                              className="w-full h-full object-cover relative z-10" 
                              referrerPolicy="no-referrer" 
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.onerror = null;
                                target.style.display = 'none';
                              }}
                            />
                          )}
                          <span className="absolute inset-0 flex items-center justify-center text-[10px] font-black text-cyan-400 uppercase bg-slate-900">
                            {sqItem.name.slice(0, 2)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest">{sqItem.label}</p>
                          <h5 className="text-xs font-black text-white uppercase truncate">{sqItem.name}</h5>
                        </div>
                      </div>

                      {/* Players */}
                      <div className="space-y-1.5">
                        {sqItem.players.map((player: any, pIdx: number) => {
                          const pEmail = player.email || player.userId || `p_${pIdx}`;
                          const stats = viewingResult.playerStats?.[pEmail] || viewingResult.playerStats?.[player.userId] || { kills: 0, damage: 0 };
                          const profile = playersProfiles[pEmail] || playersProfiles[player.userId] || {};

                          const profilePic = profile.photoURL || profile.avatarUrl || profile.profilePicture || profile.avatar || profile.photo || player.photoURL || player.avatarUrl;
                          const displayName = profile.gameName || player.gameName || profile.displayName || player.name || (pEmail.includes('@') ? pEmail.split('@')[0] : pEmail);

                          return (
                            <div key={pEmail + '_' + pIdx} className="flex items-center justify-between p-2.5 bg-slate-900/90 border border-white/5 rounded-xl hover:border-cyan-500/30 transition-all">
                              <div className="flex items-center gap-2.5 overflow-hidden">
                                <div className="w-8 h-8 rounded-lg overflow-hidden shrink-0 bg-slate-800 border border-white/10 flex items-center justify-center">
                                  {profilePic ? (
                                    <img src={profilePic} alt={displayName} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                  ) : (
                                    <span className="text-xs font-black text-cyan-400">{displayName.charAt(0).toUpperCase()}</span>
                                  )}
                                </div>
                                <div className="truncate min-w-0">
                                  <p className="text-xs font-bold text-white truncate">{displayName}</p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2 text-xs font-black font-mono shrink-0">
                                <div className="bg-white/5 px-2 py-0.5 rounded-md border border-white/5">
                                  <span className="text-[8px] text-slate-400 mr-1 uppercase">K:</span>
                                  <span className="text-emerald-400">{stats.kills || 0}</span>
                                </div>
                                <div className="bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                                  <span className="text-[8px] text-cyan-400/80 mr-1 uppercase">D:</span>
                                  <span className="text-cyan-300">{stats.damage || 0}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer Controls */}
              <div className="mt-6 pt-4 border-t border-white/5 flex gap-3">
                {viewingResult.screenshotUrl && (
                  <button 
                    onClick={() => setViewingScreenshot(viewingResult.screenshotUrl)}
                    className="flex-1 py-3 bg-cyan-500/10 hover:bg-cyan-500 text-cyan-400 hover:text-white border border-cyan-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                  >
                    <ImageIcon className="w-4 h-4" /> See Screenshot
                  </button>
                )}
                {viewingResult.youtubeLiveLink && (
                  <a 
                    href={viewingResult.youtubeLiveLink} 
                    target="_blank" 
                    rel="noreferrer"
                    className="flex-1 py-3 bg-red-600 hover:bg-red-500 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <Youtube className="w-4 h-4" /> Watch VOD
                  </a>
                )}
                <button 
                  onClick={() => {
                    const targetMatch = viewingResult;
                    setViewingResult(null);
                    setActiveChatMatch(targetMatch);
                  }}
                  className="flex-1 py-3 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black text-cyan-400 border border-cyan-500/30 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4 text-cyan-400" /> Match Chat
                </button>
                <button 
                  onClick={() => setViewingResult(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-2xl transition-all border border-white/5"
                >
                  Close View
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* Screenshot Preview Modal */}
      {viewingScreenshot && (
        <div 
          className="fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-black/95 p-4 backdrop-blur-md cursor-zoom-out"
          onClick={() => setViewingScreenshot(null)}
        >
          <div className="relative max-w-4xl w-full flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button 
              onClick={() => setViewingScreenshot(null)}
              className="absolute -top-12 right-0 p-2 text-white/70 hover:text-white transition-colors cursor-pointer"
            >
              <Plus className="w-6 h-6 rotate-45" />
            </button>
            <img 
              src={viewingScreenshot} 
              referrerPolicy="no-referrer"
              className="w-full h-auto max-h-[80vh] object-contain rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.3)] border border-cyan-500/30" 
              alt="Match Screenshot"
            />
            <span className="text-[10px] text-slate-400 font-mono tracking-widest mt-4 uppercase bg-slate-900/80 px-3 py-1 rounded-full border border-white/5">
              Click anywhere to close
            </span>
          </div>
        </div>
      )}
      {joiningTbdId && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0a0c16] border border-cyan-500/30 rounded-3xl p-6 w-full max-w-sm relative overflow-hidden"
          >
            {/* Background Glow */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 to-blue-600" />
            
            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
              <Plus className="w-6 h-6 text-cyan-400" />
              Join {joiningTbdId}
            </h3>

            {myTeams.length === 0 ? (
              <div className="space-y-4">
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl text-center space-y-2">
                  <Shield className="w-10 h-10 text-slate-600 mx-auto opacity-50" />
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">You don't have a squad yet</p>
                </div>
                <button 
                  onClick={() => onViewMySquad ? onViewMySquad() : onBack()}
                  className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)]"
                >
                  Create Squad Now
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black text-cyan-400/70 uppercase tracking-widest">Entry Fee</p>
                    <p className="text-lg font-black text-white font-mono">{Number(league.entryFee).toFixed(2)} TKN</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Your Balance</p>
                    <p className={`text-lg font-black font-mono ${currentTokens >= league.entryFee ? 'text-emerald-400' : 'text-red-500'}`}>
                      {Number(currentTokens).toFixed(2)} TKN
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  {/* Access Code Input if required */}
                  {(league.accessType === 'code' || league.accessCode) && (
                    <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl space-y-2">
                      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-mono font-bold uppercase">
                        <Key className="w-3.5 h-3.5 shrink-0" />
                        <span>Enter League Access Code / PIN</span>
                      </div>
                      <input
                        type="text"
                        value={accessCodeInput}
                        onChange={(e) => {
                          setAccessCodeInput(e.target.value.toUpperCase());
                          if (accessCodeError) setAccessCodeError(null);
                        }}
                        placeholder="e.g. LX8492"
                        maxLength={10}
                        className="w-full bg-slate-950 border border-amber-500/50 focus:border-amber-400 rounded-lg px-3 py-2 text-xs font-mono font-black tracking-widest text-amber-300 uppercase outline-none"
                      />
                      {accessCodeError && (
                        <p className="text-[10px] text-rose-400 font-mono font-bold">{accessCodeError}</p>
                      )}
                    </div>
                  )}

                  {/* Invite Only Info */}
                  {league.accessType === 'invite' && (
                    <div className="p-2.5 bg-purple-950/40 border border-purple-500/40 rounded-xl flex items-center gap-2 text-[10.5px] font-mono text-purple-300">
                      <Mail className="w-4 h-4 text-purple-400 shrink-0" />
                      <span>Invite-Only League: Ensure your registered Gmail was invited by the Host.</span>
                    </div>
                  )}

                  <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest px-1">Select Your Squad</p>
                  
                  {regError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl mb-3">
                      <p className="text-[10px] font-bold text-red-400 uppercase leading-tight">{regError}</p>
                    </div>
                  )}

                  {showConfirmStep ? (
                    <div className="p-4 bg-cyan-500/10 border border-cyan-500/20 rounded-2xl space-y-4">
                      <div className="text-center space-y-1">
                        <p className="text-[10px] font-black text-cyan-400 uppercase tracking-widest">Confirm Registration</p>
                        <p className="text-xs font-bold text-slate-300">
                          Are you sure you want to join with <span className="text-white">{(myTeams.find(t => t.id === showConfirmStep.teamId))?.name}</span>?
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowConfirmStep(null)}
                          className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleJoinLeague(showConfirmStep.tbdId, showConfirmStep.teamId, true)}
                          disabled={registering}
                          className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2"
                        >
                          {registering ? (
                            <>
                              <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                              Processing
                            </>
                          ) : 'Confirm Join'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      {myTeams.map(team => (
                        <button
                          key={team.id}
                          onClick={() => handleJoinLeague(joiningTbdId!, team.id)}
                          disabled={registering || currentTokens < league.entryFee}
                          className="group flex items-center justify-between p-3 bg-white/5 border border-white/5 hover:border-cyan-500/50 rounded-xl transition-all text-left disabled:opacity-50 disabled:hover:border-white/5"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center overflow-hidden border border-white/10">
                              {team.coverUrl ? <img src={team.coverUrl} className="w-full h-full object-cover" /> : <Users className="w-4 h-4 text-slate-600" />}
                            </div>
                            <div>
                              <p className="text-xs font-black text-white uppercase group-hover:text-cyan-400 transition-colors">{team.name}</p>
                              <p className="text-[9px] font-bold text-slate-500 uppercase tracking-tighter">{team.members.length} Members</p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-cyan-500 transition-colors" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <button 
                  onClick={() => {
                    setJoiningTbdId(null);
                    setRegError(null);
                    setShowConfirmStep(null);
                  }}
                  className="w-full py-3 text-slate-500 hover:text-slate-300 text-[10px] font-black uppercase tracking-widest transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Squad Details Modal */}
      {selectedSquadDetails && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-xl p-4">
          <motion.div 
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="bg-[#04060e] border border-white/10 rounded-[2rem] w-full max-w-sm overflow-hidden shadow-2xl relative"
          >
            {/* Header / Cover - YouTube Banner Aspect Ratio (16:9) */}
            <div className="w-full aspect-[16/9] bg-slate-900 relative overflow-hidden">
              {selectedSquadDetails.coverUrl ? (
                <img src={selectedSquadDetails.coverUrl} className="w-full h-full object-cover opacity-80" />
              ) : (
                <div className="w-full h-full bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 flex items-center justify-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">No Squad Banner</p>
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-[#04060e] via-[#04060e]/30 to-transparent" />
              <button 
                onClick={() => setSelectedSquadDetails(null)}
                className="absolute top-3 right-3 p-2 bg-black/60 hover:bg-black/80 rounded-full text-white backdrop-blur-md transition-colors border border-white/10"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>
            </div>

            {/* Squad Identity */}
            <div className="px-6 pb-6 -mt-10 relative">
              <div className="flex flex-col items-center">
                <div 
                  className="w-20 h-20 rounded-2xl flex items-center justify-center text-2xl font-black shadow-2xl border-2 border-white/10 overflow-hidden mb-3"
                  style={getNeonBoxStyle(selectedSquadDetails.teamName)}
                >
                  {selectedSquadDetails.coverUrl ? <img src={selectedSquadDetails.coverUrl} className="w-full h-full object-cover" /> : selectedSquadDetails.teamName[0]}
                </div>
                <h3 className="text-xl font-black text-white uppercase tracking-tight" style={getNeonStyle(selectedSquadDetails.teamName, 20)}>
                  {selectedSquadDetails.teamName}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded text-[9px] font-black text-cyan-400 uppercase tracking-widest">
                    <Trophy className="w-2.5 h-2.5" /> Rank #{registeredSquads.findIndex(s => s.id === selectedSquadDetails.id) + 1}
                  </div>
                  <div className="flex items-center gap-1 px-2 py-0.5 bg-white/5 border border-white/10 rounded text-[9px] font-black text-slate-400 uppercase tracking-widest">
                    <Star className="w-2.5 h-2.5" /> {selectedSquadDetails.points || 0} PTS
                  </div>
                </div>
              </div>

              {/* Members List */}
              <div className="mt-8 space-y-3">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest border-b border-white/5 pb-2 mb-4">Squad Members</p>
                <div className="grid grid-cols-2 gap-3">
                  {(selectedSquadDetails.players || []).map((player: any) => (
                    <div key={player.uid || player.email} className="bg-white/5 border border-white/5 rounded-xl p-3 flex flex-col items-center text-center gap-2">
                      <div className="relative">
                        <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden">
                          {player.photoURL ? <img src={player.photoURL} className="w-full h-full object-cover" /> : <User className="w-5 h-5 text-slate-600" />}
                        </div>
                        {(player.role === 'leader' || player.isCaptain) && (
                          <div className="absolute -top-1 -right-1 p-0.5 bg-yellow-500 rounded-full border border-black shadow-lg">
                            <Star className="w-2.5 h-2.5 text-black" />
                          </div>
                        )}
                      </div>
                      <div className="space-y-0.5 truncate w-full">
                        <p className="text-[10px] font-black text-white truncate uppercase">{player.gameName || player.displayName}</p>
                        <p className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">
                          {(player.role === 'leader' || player.isCaptain) ? 'Captain' : 'Member'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Host / Co-Host Match Management Modal */}
      {editingMatch && (() => {
        const currentMatchOverride = matchOverrides[editingMatch.id] || {};
        const isApprovedResult = currentMatchOverride.reviewStatus === 'approved';
        const isRejectedResult = currentMatchOverride.reviewStatus === 'rejected';
        const isPendingResult = currentMatchOverride.reviewStatus === 'pending';
        const isResultLockedForUser = isApprovedResult && !isSystemAdmin;
        const override = currentMatchOverride;

        return (
          <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4 overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-[#0a0c16] border border-cyan-500/30 rounded-3xl p-6 w-full max-w-md relative my-8"
            >
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 to-blue-600" />
              
              <button 
                onClick={() => setEditingMatch(null)}
                className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-white rounded-full hover:bg-white/5 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4 rotate-45" />
              </button>

              <h3 className="text-lg font-black text-white uppercase tracking-tight mb-2 flex items-center gap-2">
                <Swords className="w-5 h-5 text-cyan-400" />
                Manage Match #{editingMatch.matchNumber || editingMatch.globalOrder}
              </h3>

              {/* Match, Round Number & Round Name Badges */}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                <span className="text-[9px] font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/20">
                  Match #{editingMatch.matchNumber || editingMatch.globalOrder || 1}
                </span>
                <span className="text-[9px] font-mono font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">
                  Round #{editingMatch.roundNumber || 1}
                </span>
                <span className="text-[9px] font-mono font-bold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-lg border border-purple-500/20">
                  {editingMatch.roundName || `Round ${editingMatch.roundNumber || 1}`}
                </span>
              </div>

              <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider mb-6 pb-2 border-b border-white/5">
                {editingMatch.t1} <span className="text-cyan-500 italic font-mono font-black text-xs px-1">VS</span> {editingMatch.t2}
              </p>

              <div className="space-y-4 text-xs">
                  {/* Status Banner */}
                  {isApprovedResult && (
                    <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-emerald-300">
                      <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-wider">Result Approved by Admin</p>
                        <p className="text-[8.5px] font-bold text-emerald-400/80 leading-snug">
                          {isSystemAdmin 
                            ? "This result has been approved. As System Admin, you may still edit it if necessary."
                            : "Match result is finalized and approved by Admin. You can view all set scores and stats below, but they are locked from further changes."}
                        </p>
                      </div>
                    </div>
                  )}

                  {isRejectedResult && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-2xl flex flex-col gap-1 text-red-300">
                      <div className="flex items-center gap-2 text-red-400">
                        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                        <span className="text-[10px] font-black uppercase tracking-wider">Result Rejected by Admin</span>
                      </div>
                      {currentMatchOverride.rejectionReason && (
                        <p className="text-[9.5px] font-bold text-slate-200 bg-black/40 p-2 rounded-xl border border-red-500/20">
                          <span className="text-red-400">Reason:</span> {currentMatchOverride.rejectionReason}
                        </p>
                      )}
                      <p className="text-[8.5px] font-medium text-red-300/80 leading-tight">
                        Please correct the scores, player kills/damage, or screenshot below and click "Re-submit Result for Review".
                      </p>
                    </div>
                  )}

                  {isPendingResult && (
                    <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-2.5 text-amber-300">
                      <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 animate-pulse" />
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black uppercase tracking-wider">Result Under Review</p>
                        <p className="text-[8.5px] font-bold text-amber-300/80 leading-snug">
                          Submitted match result is currently awaiting admin review and approval.
                        </p>
                        {currentMatchOverride.submittedAt && (
                          <p className="text-[8.5px] font-mono font-bold text-amber-400 mt-1 flex items-center gap-1">
                            <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                            Submitted: {new Date(currentMatchOverride.submittedAt).toLocaleString('en-US', {
                              month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true
                            })}
                          </p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Message Admin Button for Host */}
                  <button
                    type="button"
                    onClick={() => {
                      setActiveChatMatch({ ...editingMatch, ...currentMatchOverride });
                    }}
                    className="w-full py-2.5 px-4 bg-cyan-500/10 hover:bg-cyan-500 hover:text-black text-cyan-400 border border-cyan-500/30 rounded-2xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm shadow-cyan-500/10"
                  >
                    <MessageSquare className="w-4 h-4 text-cyan-400" />
                    <span>In-App Chat with Admin</span>
                  </button>

                  {/* Match Status Selector Tabs */}
                  <div>
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">Match Status</label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['scheduled', 'live', 'completed'] as const).map((statusVal) => (
                        <button
                          key={statusVal}
                          type="button"
                          disabled={isResultLockedForUser}
                          onClick={() => {
                            if (isResultLockedForUser) return;
                            setMatchStatus(statusVal);
                            if (statusVal === 'completed' && !winner) {
                              const autoWinner = Number(scoreA) > Number(scoreB) 
                                ? editingMatch.t1 
                                : Number(scoreB) > Number(scoreA) 
                                  ? editingMatch.t2 
                                  : '';
                              setWinner(autoWinner);
                            }
                          }}
                          className={`py-2 rounded-lg font-black text-[9px] uppercase tracking-wider border transition-all ${
                            isResultLockedForUser ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                          } ${
                            matchStatus === statusVal
                              ? 'border-cyan-500 bg-cyan-500/10 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.15)]'
                              : 'border-white/5 bg-white/[0.02] text-slate-500 hover:border-white/15'
                          }`}
                        >
                          {statusVal}
                        </button>
                      ))}
                    </div>
                  </div>

              {/* 1. SCHEDULED TAB - Reschedule Match Date & Time Only */}
              {matchStatus === 'scheduled' && (
                <div className="space-y-3 bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                  <span className="block text-[8.5px] font-black text-cyan-400 uppercase tracking-wider mb-1">Reschedule Options</span>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Match Date</label>
                      <input 
                        type="date"
                        value={rescheduleDate}
                        onChange={(e) => setRescheduleDate(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-cyan-500/50 outline-none transition-all"
                      />
                    </div>
                    <div>
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Match Time</label>
                      <input 
                        type="time"
                        value={rescheduleTime}
                        onChange={(e) => setRescheduleTime(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-xl px-3 py-2 text-white font-mono focus:border-cyan-500/50 outline-none transition-all"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isRescheduled"
                      checked={isRescheduled}
                      onChange={(e) => setIsRescheduled(e.target.checked)}
                      className="w-4 h-4 rounded border-white/10 bg-black/40 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-0"
                    />
                    <label htmlFor="isRescheduled" className="text-[10px] font-black text-slate-300 uppercase tracking-widest cursor-pointer select-none">
                      Mark as Rescheduled
                    </label>
                  </div>
                </div>
              )}

              {/* 2. LIVE TAB - Room ID, Password & YouTube Link Only */}
              {matchStatus === 'live' && (
                <div className="space-y-3 bg-white/[0.02] border border-white/5 p-3 rounded-2xl">
                  <span className="block text-[8.5px] font-black text-cyan-400 uppercase tracking-wider mb-1">Live Room Settings</span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      setModalRoomId(roomId);
                      setModalRoomPassword(roomPassword);
                      setModalYoutubeLink(youtubeLiveLink);
                      setModalRoomError(null);
                      setShowLiveRoomModal(true);
                    }}
                    className="w-full py-2.5 bg-cyan-950/40 border border-cyan-500/30 hover:bg-cyan-900/60 text-cyan-300 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all flex items-center justify-center gap-2"
                  >
                    <Key className="w-3.5 h-3.5" />
                    Set Room ID and Password
                  </button>
                  
                  {/* Display current values if they exist */}
                  {(roomId || youtubeLiveLink) && (
                    <div className="mt-3 p-2 bg-black/40 border border-white/5 rounded-lg space-y-1.5">
                      {roomId && (
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Room ID:</span>
                          <span className="text-[10px] text-white font-mono font-black">{roomId}</span>
                        </div>
                      )}
                      {youtubeLiveLink && (
                        <div className="flex justify-between items-center">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">Live Link:</span>
                          <span className="text-[9px] text-cyan-400 font-mono truncate max-w-[120px]">{youtubeLiveLink}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* 3. COMPLETED TAB - Scores & Player Statistics Entry */}
              {matchStatus === 'completed' && (() => {
                const squad1 = getSquadByTbdId(editingMatch.t1);
                const squad2 = getSquadByTbdId(editingMatch.t2);
                const override = matchOverrides[editingMatch.id] || {};
                
                // Pad up to 4 players for UI consistency
                const s1Players = [...(squad1?.players || [])];
                while (s1Players.length < 4) {
                  s1Players.push({
                    email: `dummy_s1_${s1Players.length}@vortex.com`,
                    displayName: `Squad 1 Player ${s1Players.length + 1}`,
                    role: 'member'
                  } as any);
                }

                const s2Players = [...(squad2?.players || [])];
                while (s2Players.length < 4) {
                  s2Players.push({
                    email: `dummy_s2_${s2Players.length}@vortex.com`,
                    displayName: `Squad 2 Player ${s2Players.length + 1}`,
                    role: 'member'
                  } as any);
                }

                const getPKey = (p: any) => p.email || p.userId || p.gameName || p.inGameName || p.name || 'unknown';

                const handleIncrementKills = (pKey: string) => {
                  const current = playerStats[pKey] || { kills: 0, damage: 0 };
                  setPlayerStats(prev => ({
                    ...prev,
                    [pKey]: { ...current, kills: current.kills + 1 }
                  }));
                };

                const handleDecrementKills = (pKey: string) => {
                  const current = playerStats[pKey] || { kills: 0, damage: 0 };
                  setPlayerStats(prev => ({
                    ...prev,
                    [pKey]: { ...current, kills: Math.max(0, current.kills - 1) }
                  }));
                };

                const handleDamageChange = (pKey: string, value: string) => {
                  const current = playerStats[pKey] || { kills: 0, damage: 0 };
                  setPlayerStats(prev => ({
                    ...prev,
                    [pKey]: { ...current, damage: Number(value) || 0 }
                  }));
                };

                const calculatedWinner = Number(scoreA) > Number(scoreB) 
                  ? (squad1?.teamName || editingMatch.t1)
                  : Number(scoreB) > Number(scoreA) 
                    ? (squad2?.teamName || editingMatch.t2)
                    : 'TBD (Equal)';

                return (
                  <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                    {/* Walkover & Absence Presets Section */}
                    <div className="space-y-2 bg-white/[0.02] border border-cyan-500/20 p-3 rounded-2xl">
                      <div className="flex items-center justify-between">
                        <span className="block text-[8.5px] font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1">
                          <Zap className="w-3.5 h-3.5 text-cyan-400" />
                          Walkover & Absence Presets (অনুপস্থিতি / ওয়াকওভার)
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                        {/* Squad 1 Walkover Win 7-0 */}
                        <button
                          type="button"
                          disabled={isResultLockedForUser}
                          onClick={() => {
                            if (isResultLockedForUser) return;
                            setScoreA(7);
                            setScoreB(0);
                            setWinner(editingMatch.t1);
                            setWalkoverPreset('t1');
                          }}
                          className={`p-2 rounded-xl border text-left transition-all ${
                            isResultLockedForUser ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                          } ${
                            walkoverPreset === 't1'
                              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                              : 'border-white/10 bg-black/30 text-slate-300 hover:border-cyan-500/40 hover:bg-white/5'
                          }`}
                        >
                          <div className="text-[9.5px] font-black uppercase text-emerald-400 flex items-center gap-1 truncate">
                            <Trophy className="w-3 h-3 shrink-0" />
                            {squad1?.teamName || editingMatch.t1} (7-0)
                          </div>
                          <p className="text-[8px] text-slate-400 mt-0.5 leading-tight">
                            Team 1 present, Team 2 absent. Award 7-0 win & 3 PTS.
                          </p>
                        </button>

                        {/* Squad 2 Walkover Win 0-7 */}
                        <button
                          type="button"
                          disabled={isResultLockedForUser}
                          onClick={() => {
                            if (isResultLockedForUser) return;
                            setScoreA(0);
                            setScoreB(7);
                            setWinner(editingMatch.t2);
                            setWalkoverPreset('t2');
                          }}
                          className={`p-2 rounded-xl border text-left transition-all ${
                            isResultLockedForUser ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                          } ${
                            walkoverPreset === 't2'
                              ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                              : 'border-white/10 bg-black/30 text-slate-300 hover:border-cyan-500/40 hover:bg-white/5'
                          }`}
                        >
                          <div className="text-[9.5px] font-black uppercase text-emerald-400 flex items-center gap-1 truncate">
                            <Trophy className="w-3 h-3 shrink-0" />
                            {squad2?.teamName || editingMatch.t2} (0-7)
                          </div>
                          <p className="text-[8px] text-slate-400 mt-0.5 leading-tight">
                            Team 2 present, Team 1 absent. Award 0-7 win & 3 PTS.
                          </p>
                        </button>

                        {/* Both Squads Absent 0-0 */}
                        <button
                          type="button"
                          disabled={isResultLockedForUser}
                          onClick={() => {
                            if (isResultLockedForUser) return;
                            setScoreA(0);
                            setScoreB(0);
                            setWinner('NO_WINNER');
                            setWalkoverPreset('both');
                          }}
                          className={`p-2 rounded-xl border text-left transition-all ${
                            isResultLockedForUser ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                          } ${
                            walkoverPreset === 'both'
                              ? 'border-amber-500 bg-amber-500/15 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                              : 'border-white/10 bg-black/30 text-slate-300 hover:border-amber-500/40 hover:bg-white/5'
                          }`}
                        >
                          <div className="text-[9.5px] font-black uppercase text-amber-400 flex items-center gap-1 truncate">
                            <UserX className="w-3 h-3 shrink-0 text-amber-400" />
                            Both Absent (0-0)
                          </div>
                          <p className="text-[8px] text-slate-400 mt-0.5 leading-tight">
                            Neither team present. 0-0 rounds. 0 PTS awarded.
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Score inputs & Autodetected Winner */}
                    <div className="space-y-3 bg-emerald-500/[0.02] border border-emerald-500/10 p-3 rounded-2xl">
                      <span className="block text-[8.5px] font-black text-emerald-400 uppercase tracking-widest">Set Round Results</span>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase truncate mb-1">{squad1?.teamName || editingMatch.t1} Rounds</label>
                          <div className="flex items-center gap-1.5 bg-black/40 px-1.5 py-1 rounded-xl border border-white/5">
                            <button
                              type="button"
                              disabled={isResultLockedForUser}
                              onClick={() => {
                                if (isResultLockedForUser) return;
                                const val = Math.max(0, scoreA - 1);
                                setScoreA(val);
                                if (val > scoreB) setWinner(editingMatch.t1);
                                else if (scoreB > val) setWinner(editingMatch.t2);
                                else setWinner('');
                                setWalkoverPreset(null);
                              }}
                              className={`w-7 h-7 flex items-center justify-center bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold rounded-lg ${isResultLockedForUser ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-95'} transition-all text-xs`}
                            >
                              -
                            </button>
                            <input 
                              type="number"
                              readOnly
                              value={scoreA}
                              className="w-full bg-transparent border-none text-white text-center font-mono outline-none text-xs select-none cursor-default"
                            />
                            <button
                              type="button"
                              disabled={isResultLockedForUser}
                              onClick={() => {
                                if (isResultLockedForUser) return;
                                const val = scoreA + 1;
                                setScoreA(val);
                                if (val > scoreB) setWinner(editingMatch.t1);
                                else if (scoreB > val) setWinner(editingMatch.t2);
                                else setWinner('');
                                setWalkoverPreset(null);
                              }}
                              className={`w-7 h-7 flex items-center justify-center bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold rounded-lg ${isResultLockedForUser ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-95'} transition-all text-xs`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                        <div>
                          <label className="block text-[8px] font-bold text-slate-400 uppercase truncate mb-1">{squad2?.teamName || editingMatch.t2} Rounds</label>
                          <div className="flex items-center gap-1.5 bg-black/40 px-1.5 py-1 rounded-xl border border-white/5">
                            <button
                              type="button"
                              disabled={isResultLockedForUser}
                              onClick={() => {
                                if (isResultLockedForUser) return;
                                const val = Math.max(0, scoreB - 1);
                                setScoreB(val);
                                if (scoreA > val) setWinner(editingMatch.t1);
                                else if (val > scoreA) setWinner(editingMatch.t2);
                                else setWinner('');
                                setWalkoverPreset(null);
                              }}
                              className={`w-7 h-7 flex items-center justify-center bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold rounded-lg ${isResultLockedForUser ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-95'} transition-all text-xs`}
                            >
                              -
                            </button>
                            <input 
                              type="number"
                              readOnly
                              value={scoreB}
                              className="w-full bg-transparent border-none text-white text-center font-mono outline-none text-xs select-none cursor-default"
                            />
                            <button
                              type="button"
                              disabled={isResultLockedForUser}
                              onClick={() => {
                                if (isResultLockedForUser) return;
                                const val = scoreB + 1;
                                setScoreB(val);
                                if (scoreA > val) setWinner(editingMatch.t1);
                                else if (val > scoreA) setWinner(editingMatch.t2);
                                else setWinner('');
                                setWalkoverPreset(null);
                              }}
                              className={`w-7 h-7 flex items-center justify-center bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold rounded-lg ${isResultLockedForUser ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-95'} transition-all text-xs`}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Display Autodetected Winner */}
                      <div className="pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px]">
                        <span className="text-slate-400 uppercase font-bold">Winner (Detected):</span>
                        <span className="text-emerald-400 font-black uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/15">
                          {calculatedWinner}
                        </span>
                      </div>
                    </div>

                    {!walkoverPreset && (
                      <>
                      {/* Squad 1 Player Statistics Panel */}
                    <div className="space-y-2 bg-[#0d111d] border border-cyan-500/10 p-3 rounded-2xl">
                      <span className="block text-[8.5px] font-black text-cyan-400 uppercase tracking-widest mb-1.5">
                        👥 {squad1?.teamName || editingMatch.t1} PLAYER STATS
                      </span>
                      <div className="space-y-1.5">
                        {s1Players.map((p, idx) => {
                          const pKey = getPKey(p);
                          return (
                          <div key={pKey} className="flex items-center justify-between gap-1.5 bg-black/30 p-2 rounded-xl border border-white/5">
                            <div className="flex-1 min-w-0">
                              <span className="text-[9.5px] text-white font-bold block truncate leading-tight">
                                {p.gameName || p.displayName}
                              </span>
                              <span className="hidden opacity-0 text-[1px] absolute -z-10 select-none pointer-events-none" data-player-email={pKey}>{pKey}</span>
                              <span className="text-[7.5px] text-slate-500 block truncate">
                                {p.userId ? 'Registered' : 'Dummy'}
                              </span>
                            </div>
                            
                            {/* Kills +- Incrementer */}
                            <div className="flex items-center gap-1.5 bg-black/40 px-1.5 py-1 rounded-lg border border-white/5">
                              <button
                                type="button"
                                disabled={isResultLockedForUser}
                                onClick={() => !isResultLockedForUser && handleDecrementKills(pKey)}
                                className={`w-5 h-5 flex items-center justify-center bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold rounded ${isResultLockedForUser ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-95'} transition-all text-xs`}
                              >
                                -
                              </button>
                              <span className="w-5 text-center font-mono text-[10.5px] font-black text-cyan-400">
                                {playerStats[pKey]?.kills || 0}
                              </span>
                              <button
                                type="button"
                                disabled={isResultLockedForUser}
                                onClick={() => !isResultLockedForUser && handleIncrementKills(pKey)}
                                className={`w-5 h-5 flex items-center justify-center bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold rounded ${isResultLockedForUser ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-95'} transition-all text-xs`}
                              >
                                +
                              </button>
                            </div>

                            {/* Damage Manual Input */}
                            <input
                              type="number"
                              min="0"
                              readOnly={isResultLockedForUser}
                              placeholder="Damage"
                              value={playerStats[pKey]?.damage || ''}
                              onChange={(e) => !isResultLockedForUser && handleDamageChange(pKey, e.target.value)}
                              className={`w-16 bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-white text-center font-mono text-[10.5px] focus:border-cyan-500/50 outline-none ${isResultLockedForUser ? 'opacity-60 cursor-not-allowed' : ''}`}
                            />
                          </div>
                        )})}
                      </div>
                    </div>

                    {/* Squad 2 Player Statistics Panel */}
                    <div className="space-y-2 bg-[#0d111d] border border-cyan-500/10 p-3 rounded-2xl">
                      <span className="block text-[8.5px] font-black text-cyan-400 uppercase tracking-widest mb-1.5">
                        👥 {squad2?.teamName || editingMatch.t2} PLAYER STATS
                      </span>
                      <div className="space-y-1.5">
                        {s2Players.map((p, idx) => {
                          const pKey = getPKey(p);
                          return (
                          <div key={pKey} className="flex items-center justify-between gap-1.5 bg-black/30 p-2 rounded-xl border border-white/5">
                            <div className="flex-1 min-w-0">
                              <span className="text-[9.5px] text-white font-bold block truncate leading-tight">
                                {p.gameName || p.displayName}
                              </span>
                              <span className="hidden opacity-0 text-[1px] absolute -z-10 select-none pointer-events-none" data-player-email={pKey}>{pKey}</span>
                              <span className="text-[7.5px] text-slate-500 block truncate">
                                {p.userId ? 'Registered' : 'Dummy'}
                              </span>
                            </div>
                            
                            {/* Kills +- Incrementer */}
                            <div className="flex items-center gap-1.5 bg-black/40 px-1.5 py-1 rounded-lg border border-white/5">
                              <button
                                type="button"
                                disabled={isResultLockedForUser}
                                onClick={() => !isResultLockedForUser && handleDecrementKills(pKey)}
                                className={`w-5 h-5 flex items-center justify-center bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold rounded ${isResultLockedForUser ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-95'} transition-all text-xs`}
                              >
                                -
                              </button>
                              <span className="w-5 text-center font-mono text-[10.5px] font-black text-cyan-400">
                                {playerStats[pKey]?.kills || 0}
                              </span>
                              <button
                                type="button"
                                disabled={isResultLockedForUser}
                                onClick={() => !isResultLockedForUser && handleIncrementKills(pKey)}
                                className={`w-5 h-5 flex items-center justify-center bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 font-bold rounded ${isResultLockedForUser ? 'cursor-not-allowed opacity-50' : 'cursor-pointer active:scale-95'} transition-all text-xs`}
                              >
                                +
                              </button>
                            </div>

                            {/* Damage Manual Input */}
                            <input
                              type="number"
                              min="0"
                              readOnly={isResultLockedForUser}
                              placeholder="Damage"
                              value={playerStats[pKey]?.damage || ''}
                              onChange={(e) => !isResultLockedForUser && handleDamageChange(pKey, e.target.value)}
                              className={`w-16 bg-black/40 border border-white/5 rounded-lg px-2 py-1 text-white text-center font-mono text-[10.5px] focus:border-cyan-500/50 outline-none ${isResultLockedForUser ? 'opacity-60 cursor-not-allowed' : ''}`}
                            />
                          </div>
                        )})}
                      </div>
                    </div>
                      </>
                    )}
                    {/* Screenshot Upload */}
                    <div className="space-y-2 bg-white/[0.02] border border-white/5 p-3 rounded-2xl mt-4">
                      <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-2">
                        <ImageIcon className="w-3.5 h-3.5 text-cyan-500" />
                        Match Result Screenshot (Max 150KB)
                      </label>
                      <div className="flex flex-col gap-3">
                        <input 
                          type="file"
                          accept="image/*"
                          disabled={isResultLockedForUser}
                          onChange={async (e) => {
                            if (isResultLockedForUser) return;
                            const file = e.target.files?.[0] || null;
                            if (file) {
                              // Trigger circular progress bar immediately
                              window.dispatchEvent(new CustomEvent('vortex-img-process', { 
                                detail: { processing: true, message: "COMPRESSING SCREENSHOT" } 
                              }));
                              try {
                                const { dataUrl } = await compressImageToDataUrl(file, 1280, 0.75, 115);
                                if (dataUrl) {
                                  const blob = await (await fetch(dataUrl)).blob();
                                  const compressedFile = new File([blob], file.name, { type: "image/jpeg" });
                                  setScreenshotFile(compressedFile);
                                } else {
                                  setScreenshotFile(file);
                                }
                              } catch (err) {
                                console.error("Error compressing on select:", err);
                                setScreenshotFile(file);
                              } finally {
                                window.dispatchEvent(new CustomEvent('vortex-img-process', { 
                                  detail: { processing: false } 
                                }));
                              }

                              // If a file is selected, automatically switch status to 'completed' if not already
                              if (matchStatus !== 'completed') {
                                setMatchStatus('completed');
                                // Also trigger auto-winner calculation if scores exist
                                const autoWinner = Number(scoreA) > Number(scoreB) 
                                  ? editingMatch.t1 
                                  : Number(scoreB) > Number(scoreA) 
                                    ? editingMatch.t2 
                                    : winner;
                                setWinner(autoWinner);
                              }
                            } else {
                              setScreenshotFile(null);
                            }
                          }}
                          className="hidden"
                          id="match-screenshot-upload"
                        />
                        <label 
                          htmlFor={isResultLockedForUser ? undefined : "match-screenshot-upload"}
                          className={`w-full py-4 border-2 border-dashed border-white/10 rounded-2xl flex flex-col items-center justify-center gap-2 transition-all bg-black/20 group ${isResultLockedForUser ? 'cursor-not-allowed opacity-60' : 'hover:border-cyan-500/30 cursor-pointer'}`}
                        >
                          {screenshotFile ? (
                            <div className="flex flex-col items-center gap-1">
                              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                              <p className="text-[10px] font-black text-white uppercase">{screenshotFile.name}</p>
                              <p className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">
                                COMPRESSED TO {(screenshotFile.size / 1024).toFixed(1)} KB • CLICK TO CHANGE
                              </p>
                            </div>
                          ) : (
                            <>
                              <ImageIcon className="w-6 h-6 text-slate-600 group-hover:text-cyan-500 transition-colors" />
                              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest group-hover:text-slate-300 transition-colors">
                                {isResultLockedForUser ? 'Screenshot Upload Locked' : 'Select Screenshot'}
                              </p>
                            </>
                          )}
                        </label>
                        {override.screenshotUrl && !screenshotFile && (
                          <div className="flex items-center justify-between px-3 py-2 bg-emerald-500/5 border border-emerald-500/10 rounded-xl">
                            <span className="text-[9px] font-black text-emerald-400 uppercase">Existing Screenshot Loaded</span>
                            <button 
                              type="button"
                              onClick={() => setViewingScreenshot(override.screenshotUrl)}
                              className="text-[8px] font-black text-cyan-400 hover:text-cyan-300 uppercase underline"
                            >
                              View Current
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {matchEditError && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-[10px] text-red-400 font-bold leading-relaxed uppercase">
                  <AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <span>{matchEditError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-4">
                <button
                  type="button"
                  onClick={() => setEditingMatch(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all cursor-pointer text-center"
                >
                  Close
                </button>
                {isResultLockedForUser ? (
                  <div className="flex-1 py-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-xl text-center opacity-80 flex items-center justify-center gap-1.5 select-none">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" /> Result Approved (Locked)
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSaveMatchOverrides}
                    disabled={isSavingMatch || isUploading}
                    className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer flex items-center justify-center gap-2"
                  >
                    {isSavingMatch || isUploading ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        {isUploading ? 'Uploading...' : 'Saving'}
                      </>
                    ) : isRejectedResult ? (
                      'Re-submit Result for Review'
                    ) : matchStatus === 'completed' ? (
                      'Submit Result for Review'
                    ) : (
                      'Save Changes'
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      );
    })()}

      {/* User Room Details Viewer Modal */}
      {showRoomDetailsForUser && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0a0c16] border border-cyan-500/30 rounded-3xl p-6 w-full max-w-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 to-blue-600" />
            
            <button 
              onClick={() => setShowRoomDetailsForUser(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-500 hover:text-white rounded-full hover:bg-white/5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4 rotate-45" />
            </button>

            <h3 className="text-base font-black text-white uppercase tracking-tight mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-cyan-400 animate-pulse" />
              Custom Room Credentials
            </h3>

            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter mb-4 pb-2 border-b border-white/5">
              Match: {showRoomDetailsForUser.t1} vs {showRoomDetailsForUser.t2}
            </p>

            <div className="space-y-4">
              <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl space-y-3 font-mono">
                <div>
                  <span className="block text-[8px] font-black uppercase text-slate-500 tracking-wider mb-1">ROOM ID</span>
                  <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-xl border border-white/5 select-all">
                    <span className="text-white text-xs font-bold font-mono">{showRoomDetailsForUser.roomId}</span>
                    <span className="text-[7px] font-black text-cyan-500 uppercase cursor-pointer hover:underline" onClick={() => {
                      navigator.clipboard.writeText(showRoomDetailsForUser.roomId);
                      alert('Room ID copied!');
                    }}>Copy</span>
                  </div>
                </div>

                <div>
                  <span className="block text-[8px] font-black uppercase text-slate-500 tracking-wider mb-1">PASSWORD</span>
                  <div className="flex items-center justify-between bg-black/40 px-3 py-2 rounded-xl border border-white/5 select-all">
                    <span className="text-white text-xs font-bold font-mono">{showRoomDetailsForUser.roomPassword}</span>
                    <span className="text-[7px] font-black text-cyan-500 uppercase cursor-pointer hover:underline" onClick={() => {
                      navigator.clipboard.writeText(showRoomDetailsForUser.roomPassword);
                      alert('Password copied!');
                    }}>Copy</span>
                  </div>
                </div>
              </div>

              <div className="p-3 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl flex items-start gap-2 text-[9px] text-cyan-400 font-bold leading-relaxed uppercase">
                <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <span>Please do not share these room credentials with players outside your squad. Unregistered players will be kicked immediately!</span>
              </div>

              <button
                type="button"
                onClick={() => setShowRoomDetailsForUser(null)}
                className="w-full py-3 bg-cyan-500 hover:bg-cyan-400 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer text-center"
              >
                Close details
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Live Room Settings Modal (For Admins Editing Live Matches) */}
      {showLiveRoomModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0a0c16] border border-cyan-500/30 rounded-3xl p-6 w-full max-w-sm relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 to-blue-600" />
            
            <button 
              onClick={() => setShowLiveRoomModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-5 mt-2 text-left">
              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase text-white font-mono tracking-tight flex items-center gap-2">
                  <Key className="w-5 h-5 text-cyan-400" />
                  Live Room
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Set room ID, password and live stream link.</p>
              </div>

              {modalRoomError && (
                <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs font-bold leading-relaxed">
                  {modalRoomError}
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-wider mb-1.5">Room ID</label>
                  <input 
                    type="text"
                    value={modalRoomId}
                    onChange={(e) => {
                      setModalRoomId(e.target.value);
                      if (modalRoomError) setModalRoomError(null);
                    }}
                    placeholder="Enter Room ID"
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:border-cyan-500/50 outline-none transition-all text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-cyan-400 uppercase tracking-wider mb-1.5">Password</label>
                  <input 
                    type="text"
                    value={modalRoomPassword}
                    onChange={(e) => {
                      setModalRoomPassword(e.target.value);
                      if (modalRoomError) setModalRoomError(null);
                    }}
                    placeholder="Password"
                    className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-white font-mono focus:border-cyan-500/50 outline-none transition-all text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1.5">YouTube Live Stream Link <span className="text-red-400">*</span></label>
                  <div className="relative">
                    <Youtube className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input 
                      type="text"
                      value={modalYoutubeLink}
                      onChange={(e) => {
                        setModalYoutubeLink(e.target.value);
                        if (modalRoomError) setModalRoomError(null);
                      }}
                      placeholder="e.g. youtube.com/watch?v=..."
                      className="w-full bg-black/60 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-slate-600 focus:border-cyan-500/50 outline-none transition-all font-mono text-xs"
                    />
                  </div>
                  <p className="text-[9px] text-slate-500 font-bold uppercase mt-2">
                    A YouTube Live Link MUST be provided to save Room credentials.
                  </p>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowLiveRoomModal(false)}
                  className="flex-1 py-3 bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-300 font-black uppercase text-[10px] tracking-wider rounded-xl transition-all cursor-pointer text-center"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const hasRoomDetails = modalRoomId.trim() !== '' || modalRoomPassword.trim() !== '';
                    const hasYoutubeLink = modalYoutubeLink.trim() !== '';

                    if (hasRoomDetails && !hasYoutubeLink) {
                      setModalRoomError("YouTube Live Stream Link is required when setting Room ID or Password!");
                      return;
                    }

                    if (hasYoutubeLink) {
                      const ytPattern = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+$/i;
                      if (!ytPattern.test(modalYoutubeLink.trim())) {
                        setModalRoomError("Please enter a valid YouTube URL (e.g. youtube.com/watch?v=...)");
                        return;
                      }
                    }

                    // Save back to form state
                    setRoomId(modalRoomId.trim());
                    setRoomPassword(modalRoomPassword.trim());
                    setYoutubeLiveLink(modalYoutubeLink.trim());
                    setShowLiveRoomModal(false);
                  }}
                  className="flex-1 py-3 bg-cyan-500 hover:bg-cyan-400 text-white font-black uppercase text-[10px] tracking-wider rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all cursor-pointer text-center"
                >
                  Confirm & Save
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Already Joined Warning Pop-Up Modal */}
      {alreadyJoinedModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#090d22] border-2 border-amber-500/60 rounded-3xl p-6 w-full max-w-sm text-center relative overflow-hidden shadow-[0_0_40px_rgba(245,158,11,0.3)]"
          >
            {/* Top Glowing Bar */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />

            {/* Glowing Warning Icon */}
            <div className="w-16 h-16 rounded-full bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.35)] animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
              Already Joined in this League
            </h3>

            <p className="text-xs text-slate-300 font-medium leading-relaxed mb-6 bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              You or a member of your squad are already registered with a Squad in this league. A player or account cannot join with another Squad in the same league.
            </p>

            <button
              onClick={() => setAlreadyJoinedModalOpen(false)}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer active:scale-95"
            >
              Understood
            </button>
          </motion.div>
        </div>
      )}

      {/* Squad Full / Slot Unavailable Modal */}
      {squadFullModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#090d22] border-2 border-cyan-500/60 rounded-3xl p-6 w-full max-w-sm text-center relative overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.3)]"
          >
            {/* Top Glowing Bar */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-500" />

            {/* Glowing Icon */}
            <div className="w-16 h-16 rounded-full bg-cyan-500/15 border-2 border-cyan-500/40 flex items-center justify-center mx-auto mb-4 text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.35)]">
              <Shield className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
              Squad Slot Unavailable
            </h3>

            <p className="text-xs text-slate-300 font-medium leading-relaxed mb-6 bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              This squad slot is already occupied by another team. Please select an available open slot.
            </p>

            <button
              onClick={() => setSquadFullModalOpen(false)}
              className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer active:scale-95"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}

      {/* No Squad Warning Pop-Up Modal */}
      {noSquadModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[#090d22] border-2 border-cyan-500/60 rounded-3xl p-6 w-full max-w-sm text-center relative overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.3)]"
          >
            {/* Top Glowing Bar */}
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 via-sky-400 to-blue-500" />

            {/* Glowing Icon */}
            <div className="w-16 h-16 rounded-full bg-cyan-500/15 border-2 border-cyan-500/40 flex items-center justify-center mx-auto mb-4 text-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.35)] animate-pulse">
              <Users className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
              No Squad Found
            </h3>

            <p className="text-xs text-slate-300 font-medium leading-relaxed mb-6 bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              You do not have an Esports Squad created on your profile yet. Please create a squad first to join this league.
            </p>

            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setNoSquadModalOpen(false);
                  if (onViewMySquad) {
                    onViewMySquad();
                  }
                }}
                className="w-full py-3.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] cursor-pointer active:scale-95 flex items-center justify-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Create Squad
              </button>

              <button
                onClick={() => setNoSquadModalOpen(false)}
                className="w-full py-2.5 bg-white/5 hover:bg-white/10 text-slate-400 font-bold text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}

      
      {/* Hall of Glory Full Screen Modal */}
      
      {/* Hall of Glory Full Screen Modal - Immersive, No Scroll, Bangladeshi Jungle & Fireworks */}
      
      {/* Hall of Glory Full Screen Modal - Immersive, No Scroll, Bangladeshi Jungle & Fireworks */}
      
      {/* Hall of Glory Full Screen Modal - Immersive, No Scroll, Bangladeshi Jungle & Fireworks */}
            {showHallOfGloryModal && (
        <div className="fixed inset-0 z-[200] h-screen w-screen bg-black overflow-y-auto flex flex-col select-none">
          {/* Dark Background */}
          <div className="absolute inset-0 bg-black fixed" />
          
          {/* Animated Bangladeshi Jungle & Floral Background + Fireworks */}
          <div className="absolute inset-0 pointer-events-none opacity-40 bg-[url('https://images.unsplash.com/photo-1518531933037-91b2f5f229cc?q=80&w=2000')] bg-cover bg-center animate-slowZoom fixed" />
          <div className="absolute inset-0 pointer-events-none opacity-40 bg-[url('https://media.giphy.com/media/peAFQfg7Ol6IE/giphy.gif')] bg-cover bg-center mix-blend-screen fixed" />
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-black via-black/70 to-black/90 fixed" />
          
          {/* Glowing Neon Cyberpunk & Gold Aura */}
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-500/10 blur-[150px] rounded-full pointer-events-none fixed" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-yellow-500/10 blur-[130px] rounded-full pointer-events-none fixed" />

          {/* Close Button */}
          <button 
            onClick={() => setShowHallOfGloryModal(false)}
            className="fixed top-5 right-5 z-50 p-2.5 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-white transition-all backdrop-blur-md shadow-lg cursor-pointer"
            title="Close"
          >
            <ChevronRight className="w-5 h-5 rotate-180" />
          </button>

          {/* Main Full-Screen Container */}
          <div className="relative z-10 flex flex-col min-h-full w-full max-w-7xl mx-auto px-3 py-6 md:px-6 md:py-8 justify-between gap-6">
            
            {/* Header */}
            <div className="text-center shrink-0 space-y-1 animate-slideDown">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-yellow-500/10 border border-yellow-500/30 rounded-full mb-1 backdrop-blur-md">
                <Trophy className="w-4 h-4 text-yellow-400 animate-bounce" />
                <span className="text-[10px] font-mono font-black text-yellow-400 uppercase tracking-widest">Vortex Official Hall of Glory</span>
              </div>
              <h2 className="text-2xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white via-cyan-100 to-cyan-300 uppercase tracking-tighter drop-shadow-2xl">
                {league.leagueName || 'Champion Celebration'}
              </h2>
              
              {/* Sponsor Information (Same Row + Original Aspect Ratio) */}
              {(league.sponsorName || league.sponsorLogoUrl) && (
                <div className="mt-3 w-auto mx-auto flex flex-row items-center justify-center gap-3 sm:gap-4 px-2 py-1 bg-transparent border-none shadow-none">
                  <span className="text-[8px] text-amber-400 uppercase tracking-wider font-black flex items-center gap-1.5 whitespace-nowrap shrink-0">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                    SPONSORED BY:
                  </span>
                  {league.sponsorLogoUrl && (
                    <img 
                      src={league.sponsorLogoUrl} 
                      alt="Sponsor Logo" 
                      className="h-14 sm:h-18 w-auto max-w-[280px] object-contain drop-shadow-md" 
                    />
                  )}
                  {league.sponsorName && (
                    <span className="text-sm sm:text-lg font-black text-white uppercase tracking-wider truncate">{league.sponsorName}</span>
                  )}
                </div>
              )}
            </div>

            {/* Middle Section & Top 3 Section (Dynamic Hall of Glory) */}
            {(() => {
              const topPlayersCalculated = getTopPlayers();
              
              const top1Player = league.topRank1Player || league.topPlayers?.[0] || (topPlayersCalculated[0] ? {
                name: topPlayersCalculated[0].displayName,
                photoURL: topPlayersCalculated[0].photoURL,
                kills: topPlayersCalculated[0].kills,
                damage: topPlayersCalculated[0].damage
              } : null);

              const top2Player = league.topRank2Player || league.topPlayers?.[1] || (topPlayersCalculated[1] ? {
                name: topPlayersCalculated[1].displayName,
                photoURL: topPlayersCalculated[1].photoURL,
                kills: topPlayersCalculated[1].kills,
                damage: topPlayersCalculated[1].damage
              } : null);

              const top3Player = league.topRank3Player || league.topPlayers?.[2] || (topPlayersCalculated[2] ? {
                name: topPlayersCalculated[2].displayName,
                photoURL: topPlayersCalculated[2].photoURL,
                kills: topPlayersCalculated[2].kills,
                damage: topPlayersCalculated[2].damage
              } : null);

              const finalMatchOverride = Object.values(matchOverrides).find((m: any) => {
                const mName = (m.matchName || '').toLowerCase();
                const mId = (m.matchId || '').toString();
                return (
                  mName.includes('final') || 
                  m.isFinalMatch || 
                  m.isFinal || 
                  mId === '7' || mId === '15' || mId === '31' || mId === '63' || mId === '127'
                ) && (m.isPlayed || m.status === 'completed' || m.reviewStatus === 'approved');
              });

              let dynamicChampName = '';
              let dynamicChampCover = '';
              let dynamicRunnerName = '';
              let dynamicRunnerCover = '';

              if (finalMatchOverride) {
                const fWinner = finalMatchOverride.winner;
                const s1 = getSquadByTbdId(finalMatchOverride.t1);
                const s2 = getSquadByTbdId(finalMatchOverride.t2);

                const isS1Winner = fWinner === finalMatchOverride.t1 || fWinner === s1?.teamName || fWinner === s1?.tbdId || fWinner === s1?.squadName;
                if (isS1Winner) {
                  dynamicChampName = s1?.teamName || s1?.squadName || fWinner || '';
                  dynamicChampCover = s1?.coverUrl || s1?.banner || s1?.logoUrl || s1?.logo || '';
                  dynamicRunnerName = s2?.teamName || s2?.squadName || '';
                  dynamicRunnerCover = s2?.coverUrl || s2?.banner || s2?.logoUrl || s2?.logo || '';
                } else if (fWinner) {
                  dynamicChampName = s2?.teamName || s2?.squadName || fWinner || '';
                  dynamicChampCover = s2?.coverUrl || s2?.banner || s2?.logoUrl || s2?.logo || '';
                  dynamicRunnerName = s1?.teamName || s1?.squadName || '';
                  dynamicRunnerCover = s1?.coverUrl || s1?.banner || s1?.logoUrl || s1?.logo || '';
                }
              }

              const championName = league.champion || league.championTeam || league.championSquad?.teamName || dynamicChampName || 'TBD';
              const championCover = league.championCover || league.championSquad?.coverUrl || dynamicChampCover || "https://images.unsplash.com/photo-1511512578047-dfb367046420?q=80&w=1000";

              const runnerUpName = league.runnerUp || league.runnerUpTeam || league.runnerUpSquad?.teamName || dynamicRunnerName || 'TBD';
              const runnerUpCover = league.runnerUpCover || league.runnerUpSquad?.coverUrl || dynamicRunnerCover || "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=800";

              return (
                <>
                  {/* Middle Section: Champion & Runner Up Cover Photos (1.5x Bigger, No floating items on cover) */}
                  <div className="flex flex-col md:flex-row items-center justify-center gap-6 md:gap-10 my-auto shrink-0 w-full max-w-5xl mx-auto">
                    
                    {/* Runner Up Squad */}
                    <div className="flex flex-col items-center w-full md:w-1/2 max-w-[480px] animate-fadeIn" style={{ animationDelay: '0.2s' }}>
                      {/* Top Header Badge (Outside cover) */}
                      <div className="mb-2.5 inline-flex items-center gap-1.5 px-3 py-1 bg-slate-800/80 border border-slate-400/40 rounded-full shadow-md backdrop-blur-md">
                        <span className="text-sm">🥈</span>
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-slate-200">Runner-Up Squad</span>
                      </div>

                      {/* 1.5x Bigger Cover Photo (Clean, No Floating Elements Inside) */}
                      <div className="w-full aspect-video rounded-2xl border-2 border-slate-400/40 overflow-hidden shadow-[0_8px_32px_rgba(255,255,255,0.15)] bg-slate-950/80 backdrop-blur-xl group">
                        <img 
                          src={runnerUpCover} 
                          alt="Runner Up Squad Cover" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" 
                        />
                      </div>

                      {/* Bottom Info Section (Outside cover) */}
                      <div className="mt-3 flex flex-col items-center gap-1.5 w-full">
                        <div className="bg-slate-900/90 border border-white/15 rounded-xl px-4 py-1.5 shadow-lg backdrop-blur-md max-w-full text-center">
                          <span className="text-xs md:text-sm font-black text-white uppercase tracking-wide truncate max-w-[320px] block">
                            {runnerUpName}
                          </span>
                        </div>
                        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-lg px-3 py-1 inline-flex items-center gap-2 shadow-[0_4px_16px_rgba(0,0,0,0.2)]">
                          <span className="text-[10px] md:text-xs text-slate-300 uppercase font-bold">Prize:</span>
                          <span className="text-white font-mono text-xs md:text-sm font-bold">🪙 {league.runnerUpPrize || 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Champion Squad */}
                    <div className="flex flex-col items-center w-full md:w-1/2 max-w-[520px] z-20 animate-fadeIn" style={{ animationDelay: '0.4s' }}>
                      {/* Top Header Badge with Crown (Outside cover) */}
                      <div className="mb-2.5 inline-flex items-center gap-2 px-4 py-1 bg-yellow-500/20 border border-yellow-400/60 rounded-full shadow-[0_0_15px_rgba(250,204,21,0.3)] backdrop-blur-md">
                        <Crown className="w-4 h-4 text-yellow-400 animate-bounce" />
                        <span className="text-[10px] md:text-xs font-black uppercase tracking-wider text-yellow-300">Champion Squad</span>
                      </div>

                      {/* 1.5x Bigger Cover Photo (Clean, No Floating Elements Inside) */}
                      <div className="w-full aspect-video rounded-2xl border-2 border-yellow-400/80 overflow-hidden shadow-[0_0_35px_rgba(250,204,21,0.35)] bg-slate-950/80 backdrop-blur-xl group">
                        <img 
                          src={championCover} 
                          alt="Champion Squad Cover" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-all duration-700" 
                        />
                      </div>

                      {/* Bottom Info Section (Outside cover) */}
                      <div className="mt-3 flex flex-col items-center gap-1.5 w-full">
                        <div className="bg-yellow-500/20 border border-yellow-400/50 rounded-xl px-4 py-1.5 shadow-[0_0_15px_rgba(250,204,21,0.2)] backdrop-blur-md max-w-full text-center">
                          <span className="text-xs md:text-sm font-black text-yellow-300 uppercase tracking-wide truncate max-w-[340px] block">
                            {championName}
                          </span>
                        </div>
                        <div className="bg-white/10 backdrop-blur-xl border border-yellow-500/40 rounded-lg px-3.5 py-1 inline-flex items-center gap-2 shadow-[0_4px_20px_rgba(250,204,21,0.2)]">
                          <span className="text-[10px] md:text-xs text-yellow-400 uppercase font-bold">Prize:</span>
                          <span className="text-yellow-300 font-mono text-xs md:text-sm font-black">🏆 {league.championPrize || 0}</span>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* Bottom Section: Top 3 Ranked Players horizontally */}
                  <div className="shrink-0 pt-3 border-t border-white/10 animate-slideUp" style={{ animationDelay: '0.6s' }}>
                    <div className="text-center mb-2">
                      <h4 className="text-[9px] md:text-xs font-mono font-black text-cyan-400 uppercase tracking-widest flex items-center justify-center gap-1 md:gap-2">
                        <Star className="w-3 h-3 text-cyan-400" />
                        Top 3 Ranked Players
                        <Star className="w-3 h-3 text-cyan-400" />
                      </h4>
                    </div>

                    <div className="flex flex-row justify-center items-stretch gap-2 max-w-3xl mx-auto w-full">
                      {/* Rank 2 */}
                      {(() => {
                        const r2Img = top2Player?.photoURL || top2Player?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(top2Player?.name || 'TBD')}&background=475569&color=fff`;
                        const r2Name = top2Player?.name || top2Player?.displayName || 'TBD';
                        return (
                          <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-1.5 md:p-2.5 flex flex-col items-center justify-center text-center">
                            <div 
                              onClick={() => setHallOfGloryPreviewImage({ url: r2Img, name: r2Name, rank: 'Rank 2' })}
                              className="relative mb-1 group cursor-pointer"
                              title="Click to preview avatar"
                            >
                              <img 
                                src={r2Img} 
                                alt="Rank 2" 
                                className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-slate-400/50 shadow-md group-hover:scale-110 group-hover:border-slate-200 transition-all object-cover bg-slate-800" 
                              />
                              <span className="absolute -top-2 -right-2 text-sm md:text-base drop-shadow-md pointer-events-none">🥈</span>
                            </div>
                            <span className="text-slate-400 text-[8px] md:text-[10px] font-bold uppercase">Rank 2</span>
                            <span className="text-white font-black text-[9px] md:text-xs truncate w-full">{r2Name}</span>
                            {top2Player?.kills !== undefined && (
                              <span className="text-slate-300 text-[8px] md:text-[9px] font-mono mt-0.5">⚔️ {top2Player.kills} Kills</span>
                            )}
                            <span className="text-slate-300 font-mono font-bold text-[8px] md:text-[10px] mt-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">
                              🪙 {league.topRank2Prize || 0}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Rank 1 (MVP) */}
                      {(() => {
                        const r1Img = top1Player?.photoURL || top1Player?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(top1Player?.name || 'MVP')}&background=0ea5e9&color=fff`;
                        const r1Name = top1Player?.name || top1Player?.displayName || 'TBD';
                        return (
                          <div className="flex-[1.2] bg-white/10 backdrop-blur-md border border-cyan-500/40 rounded-lg p-1.5 md:p-2.5 flex flex-col items-center justify-center text-center shadow-[0_0_15px_rgba(6,182,212,0.15)] relative">
                            <div 
                              onClick={() => setHallOfGloryPreviewImage({ url: r1Img, name: r1Name, rank: 'Rank 1 (MVP)' })}
                              className="relative mb-1 group cursor-pointer"
                              title="Click to preview avatar"
                            >
                              <img 
                                src={r1Img} 
                                alt="Rank 1" 
                                className="w-10 h-10 md:w-12 md:h-12 rounded-full border-2 border-cyan-400/80 shadow-[0_0_15px_rgba(6,182,212,0.4)] group-hover:scale-110 group-hover:border-cyan-300 transition-all object-cover bg-slate-800" 
                              />
                              <span className="absolute -top-2 -right-2 text-base md:text-lg animate-bounce drop-shadow-[0_0_10px_rgba(250,204,21,0.8)] pointer-events-none">👑</span>
                            </div>
                            <span className="text-cyan-400 text-[8px] md:text-[10px] font-bold uppercase">Rank 1 (MVP)</span>
                            <span className="text-white font-black text-[10px] md:text-sm truncate w-full">{r1Name}</span>
                            {top1Player?.kills !== undefined && (
                              <span className="text-cyan-300 text-[8px] md:text-[9px] font-mono mt-0.5">⚔️ {top1Player.kills} Kills</span>
                            )}
                            <span className="text-cyan-300 font-mono font-bold text-[8px] md:text-[10px] mt-1 bg-black/40 px-1.5 py-0.5 rounded border border-cyan-500/30">
                              🪙 {league.topRank1Prize || 0}
                            </span>
                          </div>
                        );
                      })()}

                      {/* Rank 3 */}
                      {(() => {
                        const r3Img = top3Player?.photoURL || top3Player?.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(top3Player?.name || 'TBD')}&background=475569&color=fff`;
                        const r3Name = top3Player?.name || top3Player?.displayName || 'TBD';
                        return (
                          <div className="flex-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-lg p-1.5 md:p-2.5 flex flex-col items-center justify-center text-center">
                            <div 
                              onClick={() => setHallOfGloryPreviewImage({ url: r3Img, name: r3Name, rank: 'Rank 3' })}
                              className="relative mb-1 group cursor-pointer"
                              title="Click to preview avatar"
                            >
                              <img 
                                src={r3Img} 
                                alt="Rank 3" 
                                className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-orange-700/50 shadow-md group-hover:scale-110 group-hover:border-orange-400 transition-all object-cover bg-slate-800" 
                              />
                              <span className="absolute -top-2 -right-2 text-sm md:text-base drop-shadow-md pointer-events-none">🥉</span>
                            </div>
                            <span className="text-slate-400 text-[8px] md:text-[10px] font-bold uppercase">Rank 3</span>
                            <span className="text-white font-black text-[9px] md:text-xs truncate w-full">{r3Name}</span>
                            {top3Player?.kills !== undefined && (
                              <span className="text-slate-300 text-[8px] md:text-[9px] font-mono mt-0.5">⚔️ {top3Player.kills} Kills</span>
                            )}
                            <span className="text-slate-300 font-mono font-bold text-[8px] md:text-[10px] mt-1 bg-black/40 px-1.5 py-0.5 rounded border border-white/10">
                              🪙 {league.topRank3Prize || 0}
                            </span>
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                </>
              );
            })()}

          </div>

          {/* Player Profile Picture Preview Modal */}
          {hallOfGloryPreviewImage && (
            <div 
              onClick={() => setHallOfGloryPreviewImage(null)}
              className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-fadeIn"
            >
              <div 
                onClick={e => e.stopPropagation()} 
                className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-5 md:p-6 max-w-sm w-full flex flex-col items-center text-center shadow-[0_0_40px_rgba(6,182,212,0.3)] relative animate-scaleUp"
              >
                {/* Close Button */}
                <button
                  type="button"
                  onClick={() => setHallOfGloryPreviewImage(null)}
                  className="absolute top-3.5 right-3.5 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>

                {/* Rank Badge */}
                <span className="px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 mb-3">
                  {hallOfGloryPreviewImage.rank}
                </span>

                {/* Profile Picture Large Preview */}
                <div className="w-48 h-48 sm:w-56 sm:h-56 rounded-2xl overflow-hidden border-2 border-cyan-400/60 shadow-[0_0_25px_rgba(6,182,212,0.4)] bg-slate-950 mb-3.5 relative">
                  <img
                    src={hallOfGloryPreviewImage.url}
                    alt={hallOfGloryPreviewImage.name}
                    className="w-full h-full object-cover"
                  />
                </div>

                {/* Player Name */}
                <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wide truncate max-w-full">
                  {hallOfGloryPreviewImage.name}
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">Player Profile Picture</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active Announcement Modal */}
      {activeAnnouncementMatch && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#0a0c16] border border-cyan-500/30 rounded-3xl p-6 w-full max-w-md relative overflow-hidden max-h-[80vh] flex flex-col"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-blue-600" />
            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2 mb-4 shrink-0">
              <Megaphone className="w-5 h-5 text-cyan-400" /> Match Announcements
            </h3>
            
            <div className="flex-1 overflow-y-auto pr-2 space-y-3 mb-4 min-h-[150px]">
              {matchOverrides[activeAnnouncementMatch.id]?.announcements?.length > 0 ? (
                matchOverrides[activeAnnouncementMatch.id].announcements.map((announcement: any) => (
                  <div key={announcement.id} className="bg-slate-950/80 border border-white/5 rounded-xl p-3 relative group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[9px] font-bold text-cyan-400">{announcement.createdByName}</span>
                      <span className="text-[8px] text-slate-500 font-mono">
                        {new Date(announcement.createdAt).toLocaleString(undefined, {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
                        {announcement.updatedAt && ' (edited)'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                      {announcement.text}
                    </p>
                    
                    {/* Actions */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(isSystemAdmin || announcement.createdBy === userProfile?.userId) && (
                        <button
                          onClick={() => handleEditAnnouncementTrigger(announcement)}
                          className="p-1 text-slate-400 hover:text-cyan-400 bg-black/40 rounded"
                          title="Edit"
                        >
                          <Edit2 className="w-3 h-3" />
                        </button>
                      )}
                      {isSystemAdmin && (
                        <button
                          onClick={() => handleDeleteAnnouncement(announcement.id)}
                          className="p-1 text-slate-400 hover:text-red-400 bg-black/40 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-500 text-xs font-medium">
                  No announcements have been posted yet.
                </div>
              )}
            </div>

            {canManage && (
              <div className="shrink-0 space-y-3 border-t border-white/10 pt-4 mt-auto">
                <textarea
                  value={announcementText}
                  onChange={(e) => setAnnouncementText(e.target.value)}
                  placeholder={editingAnnouncementId ? "Edit announcement..." : "Write a new announcement..."}
                  className="w-full h-24 bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500/50 resize-none placeholder:text-slate-600"
                />
                <div className="flex justify-end gap-2">
                  {editingAnnouncementId && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingAnnouncementId(null);
                        setAnnouncementText('');
                      }}
                      className="px-4 py-2 bg-white/5 hover:bg-white/10 text-white text-[9px] font-black uppercase tracking-widest rounded-lg transition-all"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={handleSaveAnnouncement}
                    disabled={isSavingAnnouncement || !announcementText.trim()}
                    className="px-4 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/50 text-cyan-400 hover:text-cyan-300 text-[9px] font-black uppercase tracking-widest rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSavingAnnouncement ? 'Saving...' : (editingAnnouncementId ? 'Update' : 'Post')}
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setActiveAnnouncementMatch(null);
                setAnnouncementText('');
                setEditingAnnouncementId(null);
              }}
              className="mt-4 w-full py-3 bg-white/5 hover:bg-white/10 text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shrink-0"
            >
              Close
            </button>
          </motion.div>
        </div>
      )}

      {/* Match Chat Modal */}
      {activeChatMatch && (
        <MatchChatModal
          isOpen={!!activeChatMatch}
          onClose={() => setActiveChatMatch(null)}
          match={activeChatMatch}
          leagueId={league.id}
          userProfile={userProfile}
          canManage={canManage}
          isSystemAdmin={isSystemAdmin}
          isHostOrCoHost={isHostOrCoHost}
        />
      )}
      {/* Appeal/Report Issue Modal */}
      {appealMatch && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700/50 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-white/5 flex items-center justify-between bg-slate-800/50">
              <div className="flex items-center gap-2 text-white">
                <MessageSquare className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold">Report Issue</h3>
              </div>
              <button 
                onClick={() => setAppealMatch(null)}
                className="p-1 hover:bg-white/10 rounded-lg transition-colors text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="text-xs text-slate-400">
                {(() => {
                  const s1 = getSquadByTbdId(appealMatch.t1);
                  const s2 = getSquadByTbdId(appealMatch.t2);
                  const name1 = s1?.teamName || s1?.squadName || appealMatch.t1;
                  const name2 = s2?.teamName || s2?.squadName || appealMatch.t2;
                  return (
                    <>
                      You are reporting an issue or sending a message regarding <span className="text-cyan-400 font-bold">{name1} vs {name2}</span>.
                    </>
                  );
                })()}
              </div>
              <textarea
                value={appealMessage}
                onChange={(e) => setAppealMessage(e.target.value)}
                placeholder="Describe the issue with this match..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 min-h-[100px] resize-none"
              />
              <button
                onClick={handleSendMatchAppeal}
                disabled={!appealMessage.trim() || isSendingAppeal}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isSendingAppeal ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                Send to Admin
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
