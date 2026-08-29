import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Virtuoso } from 'react-virtuoso';
import { 
  Activity, 
  Search, 
  Bell, 
  Camera, 
  Trophy, 
  Gamepad2, 
  Users, 
  Gift, 
  CheckCircle2, 
  MoreVertical, 
  ThumbsUp, 
  Heart, 
  MessageSquare, 
  Share2, 
  Bookmark, 
  ShieldCheck, 
  UserPlus, 
  Sparkles,
  Flame,
  Flag,
  Trash2,
  X,
  ExternalLink,
  Plus,
  Zap,
  RotateCcw
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  query, 
  orderBy, 
  doc, 
  updateDoc, 
  arrayUnion, 
  arrayRemove, 
  deleteDoc, 
  addDoc, 
  setDoc,
  where,
  serverTimestamp, 
  increment,
  getDocs,
  limit
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { requestPushPermission } from '../lib/pushNotifications';
import { PulseCommentsModal } from './PulseCommentsModal';
import { PulseCreatePostModal } from './PulseCreatePostModal';
import { PulseUserProfileModal } from './PulseUserProfileModal';
import { HostProfileModal } from './HostProfileModal';
import { 
  calculateFacebookAlgorithmScore, 
  applyFacebookFeedDiversity, 
  calculatePulsePostTrendingScore 
} from '../utils/pulseScore';

export interface PulsePost {
  id: string;
  userId: string;
  userName: string;
  userPhoto: string;
  userRole?: string;
  authorIdentity?: 'host' | 'player';
  isHostPost?: boolean;
  text: string;
  category?: string;
  imageUrl?: string;
  videoInfo?: {
    videoUrl: string;
    thumbnailUrl?: string;
    duration?: number;
    width?: number;
    height?: number;
    aspectRatio?: string;
    views?: number;
    source?: string;
    publicId?: string;
  };
  views?: number;
  trendingScore?: number;
  mediaLink?: any;
  linkedTournament?: {
    id?: string;
    title: string;
    entryFee: number;
    prizePool: number;
    slotsTaken: number;
    totalSlots: number;
    bannerUrl?: string;
    matchDate?: string;
  };
  linkedLeagueMatch?: {
    id?: string;
    leagueId: string;
    leagueName: string;
    t1: string;
    t2: string;
    time: string;
    date: string;
    matchId: string;
    playerSquadName?: string;
    playerSquadCover?: string;
    playerTbdSlot?: string;
    playerName?: string;
    opposingSquadName?: string;
    opposingSquadCover?: string;
    opposingTbdSlot?: string;
    opposingPlayers?: string[];
  };
  linkedLoneWolfMatch?: {
    id?: string;
    title: string;
    matchNumber: number;
    time: string;
    entryFee: number;
    prizePool: number;
    player1: string;
    player2: string;
  };
  likes: string[];
  reactions?: { [userId: string]: 'like' | 'love' | 'haha' | 'sad' | 'munajat' };
  likeCount: number;
  commentCount: number;
  shareCount: number;
  createdAt: any;
  approvedAt?: any;
  isVerified?: boolean;
  status?: 'pending' | 'approved' | 'rejected';
}

interface PulseFeedViewProps {
  currentUserId: string;
  currentUserProfile: any;
  onOpenNotifications?: () => void;
  onSelectTournament?: (tournamentId: string) => void;
  onSelectLeagueMatch?: (leagueId: string, matchId?: string, matchData?: any) => void;
  onSelectLoneWolfMatch?: (matchId: string) => void;
  preSelectedMatch?: any;
  onClearPreSelectedMatch?: () => void;
}

export const getPostDateObject = (createdAt: any): Date | null => {
  if (!createdAt) return null;
  if (typeof createdAt.toDate === 'function') {
    return createdAt.toDate();
  }
  if (createdAt instanceof Date) {
    return createdAt;
  }
  if (typeof createdAt === 'object' && 'seconds' in createdAt) {
    return new Date(createdAt.seconds * 1000);
  }
  if (typeof createdAt === 'string' || typeof createdAt === 'number') {
    const d = new Date(createdAt);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
};

export const formatRelativeTime = (createdAt: any): string => {
  const date = getPostDateObject(createdAt);
  if (!date) return 'Just now';

  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  
  if (diffMs < 0) {
    return 'Just now';
  }

  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) {
    return 'Just now';
  } else if (diffMins < 60) {
    return `${diffMins}m ago`;
  } else if (diffHours < 24) {
    return `${diffHours}h ago`;
  } else if (diffDays < 7) {
    return `${diffDays}d ago`;
  } else {
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  }
};

export const resolveAuthorName = (post: any, usersMap: Record<string, any> = {}): string => {
  const userDoc = post?.userId ? usersMap[post.userId] : null;
  const isHost = Boolean(post?.authorIdentity === 'host' || post?.isHostPost);

  if (isHost) {
    const hostBrandName = (
      userDoc?.brandName || 
      userDoc?.hostName || 
      userDoc?.proHostName || 
      userDoc?.hostTitle || 
      userDoc?.hostOrganization || 
      userDoc?.organizationName || 
      ''
    ).trim();

    if (post?.userName && String(post.userName).trim() && !String(post.userName).includes('@')) {
      return String(post.userName).trim();
    }
    if (hostBrandName && !hostBrandName.includes('@')) {
      return hostBrandName;
    }
    return 'Official Host';
  }

  // Player personal mode
  const playerPersonalName = (
    userDoc?.fullName || 
    userDoc?.displayName || 
    userDoc?.name ||
    userDoc?.gameName || 
    userDoc?.inGameName || 
    userDoc?.gamerTag || 
    userDoc?.inGameUsername || 
    userDoc?.ign || 
    userDoc?.gamingUid || 
    ''
  ).trim();

  if (post?.userName && String(post.userName).trim() && !String(post.userName).includes('@')) {
    return String(post.userName).trim();
  }
  if (playerPersonalName && !playerPersonalName.includes('@')) {
    return playerPersonalName;
  }

  return 'Player';
};

export const resolveAuthorPhoto = (post: any, usersMap: Record<string, any> = {}): string => {
  const userDoc = post?.userId ? usersMap[post.userId] : null;
  const isHost = Boolean(post?.authorIdentity === 'host' || post?.isHostPost);

  if (isHost) {
    const hostPhoto = (
      userDoc?.brandLogoUrl || 
      userDoc?.logoUrl || 
      userDoc?.hostLogoUrl || 
      userDoc?.hostPhotoUrl || 
      userDoc?.hostPhoto || 
      userDoc?.photoURL ||
      post?.userPhoto
    );
    if (hostPhoto && String(hostPhoto).trim()) return hostPhoto;
    return 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=150&auto=format&fit=crop';
  }

  // Player personal mode - prioritize real-time updated photoURL over static cached post.userPhoto
  const playerPhoto = (
    userDoc?.photoURL || 
    userDoc?.photoUrl || 
    userDoc?.avatar || 
    userDoc?.avatarUrl || 
    userDoc?.profilePic || 
    userDoc?.profilePictureUrl ||
    post?.userPhoto
  );
  if (playerPhoto && String(playerPhoto).trim()) return playerPhoto;
  return 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=150&auto=format&fit=crop';
};

export const PulseFeedView: React.FC<PulseFeedViewProps> = ({
  currentUserId,
  currentUserProfile,
  onOpenNotifications,
  onSelectTournament,
  onSelectLeagueMatch,
  onSelectLoneWolfMatch,
  preSelectedMatch,
  onClearPreSelectedMatch
}) => {
  const [posts, setPosts] = useState<PulsePost[]>([]);
  const [activeCategory, setActiveCategory] = useState<'all' | 'tournaments' | 'league' | 'lone_wolf' | 'gaming' | 'squad' | 'announcements' | 'rewards' | 'pending_approval'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(null);
  const [followingHosts, setFollowingHosts] = useState<string[]>([]);
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [postToDelete, setPostToDelete] = useState<PulsePost | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState<boolean>(false);
  const [postToReport, setPostToReport] = useState<PulsePost | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [feedSortMode, setFeedSortMode] = useState<'trending' | 'latest' | 'matches'>('trending');
  const [postLimit, setPostLimit] = useState<number>(35);
  const [selectedUserProfileId, setSelectedUserProfileId] = useState<string | null>(null);
  const [selectedUserProfileView, setSelectedUserProfileView] = useState<'host' | 'player'>('player');
  const [hasMore, setHasMore] = useState<boolean>(true);
  const [scrollParent, setScrollParent] = useState<HTMLElement | undefined>(undefined);
  const [reactionPanelPostId, setReactionPanelPostId] = useState<string | null>(null);
  const [pressTimer, setPressTimer] = useState<any>(null);
  const [isLongPressActive, setIsLongPressActive] = useState<boolean>(false);
  const [showReactionsBreakdownPost, setShowReactionsBreakdownPost] = useState<PulsePost | null>(null);
  const [allLeagueSquads, setAllLeagueSquads] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [allLoneWolfMatches, setAllLoneWolfMatches] = useState<any[]>([]);
  const [allUsersMap, setAllUsersMap] = useState<Record<string, any>>({});
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotificationsModal, setShowNotificationsModal] = useState<boolean>(false);
  const [approvingPostId, setApprovingPostId] = useState<string | null>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Deep Link Highlighting & Auto Scroll
  const [highlightedPostId, setHighlightedPostId] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('post');
    } catch (e) {
      return null;
    }
  });
  const [hasScrolledToPost, setHasScrolledToPost] = useState<boolean>(false);

  // Register real-time video view without spamming
  const handleRegisterVideoView = useCallback(async (postId: string) => {
    if (!postId) return;
    const cacheKey = `pulse_view_${postId}`;
    if (sessionStorage.getItem(cacheKey)) return;
    sessionStorage.setItem(cacheKey, '1');

    try {
      const postRef = doc(db, 'pulse_posts', postId);
      await updateDoc(postRef, {
        views: increment(1),
        'videoInfo.views': increment(1)
      });
      // Local optimistic update
      setPosts(prev => prev.map(p => {
        if (p.id === postId) {
          const newViews = (p.views || 0) + 1;
          return {
            ...p,
            views: newViews,
            videoInfo: p.videoInfo ? { ...p.videoInfo, views: (p.videoInfo.views || 0) + 1 } : undefined
          };
        }
        return p;
      }));
    } catch (err) {
      console.warn('[Pulse] Error registering video view:', err);
    }
  }, []);

  // Close notifications dropdown when clicking outside anywhere on screen
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent | TouchEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setShowNotificationsModal(false);
      }
    };

    if (showNotificationsModal) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [showNotificationsModal]);

  // Real-time Firestore notification listener for active user
  useEffect(() => {
    if (!currentUserId) return;
    const notifQuery = query(
      collection(db, 'users', currentUserId, 'notifications'),
      orderBy('createdAt', 'desc'),
      limit(25)
    );
    const unsubNotifs = onSnapshot(notifQuery, (snap) => {
      const list = snap.docs.map(d => ({
        id: d.id,
        ...d.data()
      }));
      setNotifications(list);
    }, (err) => {
      console.warn('[Pulse] Error loading notifications:', err);
    });
    return () => unsubNotifs();
  }, [currentUserId]);

  const unreadNotifCount = notifications.filter(n => !n.isRead && !n.read).length;

  const markNotificationsAsRead = async () => {
    if (!currentUserId) return;
    const unread = notifications.filter(n => !n.isRead && !n.read);
    for (const notif of unread) {
      try {
        await updateDoc(doc(db, 'users', currentUserId, 'notifications', notif.id), {
          isRead: true,
          read: true
        });
      } catch (e) {
        // ignore
      }
    }
  };

  const handleOpenNotificationsModal = () => {
    setShowNotificationsModal(prev => {
      const nextState = !prev;
      if (nextState) {
        markNotificationsAsRead();
      }
      return nextState;
    });
    if (onOpenNotifications) {
      onOpenNotifications();
    }
  };

  const handleDeleteNotification = async (notifId: string) => {
    if (!currentUserId || !notifId) return;
    try {
      await deleteDoc(doc(db, 'users', currentUserId, 'notifications', notifId));
    } catch (err) {
      console.error('Error deleting notification:', err);
    }
  };

  const handleClearAllNotifications = async () => {
    if (!currentUserId || notifications.length === 0) return;
    try {
      for (const n of notifications) {
        await deleteDoc(doc(db, 'users', currentUserId, 'notifications', n.id));
      }
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  // Load league squads, teams, lone wolf matches, and user profiles for real-time match card resolution
  useEffect(() => {
    const unsubSquads = onSnapshot(collection(db, 'pro_league_squads'), (snap) => {
      setAllLeagueSquads(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubTeams = onSnapshot(collection(db, 'teams'), (snap) => {
      setAllTeams(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubLoneWolf = onSnapshot(collection(db, 'lone_wolf_matches'), (snap) => {
      setAllLoneWolfMatches(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubUsers = onSnapshot(collection(db, 'users'), (snap) => {
      const uMap: Record<string, any> = {};
      snap.docs.forEach(d => {
        uMap[d.id] = { id: d.id, ...d.data() };
      });
      setAllUsersMap(uMap);
    });

    return () => {
      unsubSquads();
      unsubTeams();
      unsubLoneWolf();
      unsubUsers();
    };
  }, []);

  const resolveLoneWolfPlayerGameName = (pVal: any, matchId?: string, slotNumber: 1 | 2 = 1) => {
    const liveMatch = matchId ? allLoneWolfMatches.find(m => m.id === matchId) : null;
    const playerObj = (slotNumber === 1 ? liveMatch?.player1 : liveMatch?.player2) || pVal;

    if (!playerObj) return slotNumber === 1 ? 'Player 1' : 'Player 2';

    if (typeof playerObj === 'object') {
      const userId = playerObj.userId || playerObj.id;
      const userDoc = userId ? allUsersMap[userId] : null;

      const gameName = playerObj.gameName || 
                       playerObj.inGameName || 
                       playerObj.gamerTag || 
                       playerObj.inGameUsername || 
                       playerObj.ign || 
                       playerObj.gamingUid || 
                       userDoc?.gameName || 
                       userDoc?.inGameName || 
                       userDoc?.gamerTag || 
                       userDoc?.inGameUsername || 
                       userDoc?.ign || 
                       playerObj.displayName || 
                       userDoc?.displayName;

      if (gameName && String(gameName).trim()) return String(gameName).trim();
    } else if (typeof playerObj === 'string' && playerObj.trim()) {
      const strVal = playerObj.trim();
      const userDoc = allUsersMap[strVal] || Object.values(allUsersMap).find(u => u.displayName === strVal || u.gameName === strVal || u.email === strVal);
      if (userDoc) {
        const gName = userDoc.gameName || userDoc.inGameName || userDoc.gamerTag || userDoc.inGameUsername || userDoc.ign || userDoc.displayName;
        if (gName && String(gName).trim()) return String(gName).trim();
      }
      return strVal;
    }

    return slotNumber === 1 ? 'Player 1' : 'Player 2';
  };

  const resolveSquadName = (rawName?: string, defaultFallback: string = 'TBD') => {
    if (!rawName) return defaultFallback;
    const clean = String(rawName).trim();
    const cleanLower = clean.toLowerCase();

    // Check if it's already a real custom squad name (not starting with TBD-)
    if (!cleanLower.startsWith('tbd-') && cleanLower !== 'tbd' && clean.length > 0) {
      return clean;
    }

    // Lookup in pro_league_squads
    const foundSquad = allLeagueSquads.find(s => {
      if (!s) return false;
      if (s.tbdId && String(s.tbdId).trim().toLowerCase() === cleanLower) return true;
      if (s.id && String(s.id).trim().toLowerCase() === cleanLower) return true;
      if (s.teamId && String(s.teamId).trim().toLowerCase() === cleanLower) return true;
      return false;
    });
    if (foundSquad) {
      return foundSquad.teamName || foundSquad.squadName || clean;
    }

    // Lookup in teams
    const foundTeam = allTeams.find(t => {
      if (!t) return false;
      if (t.id && String(t.id).trim().toLowerCase() === cleanLower) return true;
      return false;
    });
    if (foundTeam) {
      return foundTeam.name || foundTeam.teamName || clean;
    }

    return clean;
  };

  const resolveSquadCover = (rawCover?: string, rawName?: string) => {
    if (rawCover && rawCover.trim() && !rawCover.includes('undefined') && !rawCover.includes('null')) {
      return rawCover;
    }
    if (!rawName) return '';
    const clean = String(rawName).trim();
    const cleanLower = clean.toLowerCase();

    const foundSquad = allLeagueSquads.find(s => {
      if (!s) return false;
      if (s.tbdId && String(s.tbdId).trim().toLowerCase() === cleanLower) return true;
      if (s.id && String(s.id).trim().toLowerCase() === cleanLower) return true;
      if (s.teamId && String(s.teamId).trim().toLowerCase() === cleanLower) return true;
      if (s.teamName && String(s.teamName).trim().toLowerCase() === cleanLower) return true;
      if (s.squadName && String(s.squadName).trim().toLowerCase() === cleanLower) return true;
      return false;
    });
    if (foundSquad) {
      const cov = foundSquad.coverPhoto || foundSquad.coverUrl || foundSquad.logoUrl || foundSquad.logo || foundSquad.photoURL || foundSquad.banner || foundSquad.bannerUrl;
      if (cov) return cov;
    }

    const teamId = foundSquad?.teamId || clean;
    const foundTeam = allTeams.find(t => {
      if (!t) return false;
      if (t.id && String(t.id).trim().toLowerCase() === String(teamId).trim().toLowerCase()) return true;
      if (t.name && String(t.name).trim().toLowerCase() === cleanLower) return true;
      if (t.teamName && String(t.teamName).trim().toLowerCase() === cleanLower) return true;
      return false;
    });
    if (foundTeam) {
      const cov = foundTeam.coverPhoto || foundTeam.coverUrl || foundTeam.logoUrl || foundTeam.logo || foundTeam.photoURL || foundTeam.banner || foundTeam.bannerUrl;
      if (cov) return cov;
    }

    return '';
  };

  useEffect(() => {
    if (preSelectedMatch) {
      setShowCreateModal(true);
    }
  }, [preSelectedMatch]);

  const isUserAdminOrSuperAdmin = () => {
    const role = (currentUserProfile?.role || '').toLowerCase().trim();
    const email = (currentUserProfile?.email || '').toLowerCase().trim();
    return (
      email === 'vortexesports150@gmail.com' ||
      role === 'admin' ||
      role === 'main_admin' ||
      role === 'super_admin' ||
      role === 'sub_admin' ||
      role === 'pro_host' ||
      Boolean(currentUserProfile?.isAdmin) ||
      Boolean(currentUserProfile?.isMainAdmin) ||
      Boolean(currentUserProfile?.isSuperAdmin)
    );
  };

  // Toast auto-dismiss
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  // Global click & pointer listener to close context menu & reaction panel when clicking outside
  useEffect(() => {
    const handleGlobalClickOutside = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement;
      if (activeMenuPostId && !target.closest('.pulse-menu-container')) {
        setActiveMenuPostId(null);
      }
      if (reactionPanelPostId && !target.closest('.pulse-reaction-container')) {
        setReactionPanelPostId(null);
      }
    };

    if (activeMenuPostId || reactionPanelPostId) {
      window.addEventListener('pointerdown', handleGlobalClickOutside);
      window.addEventListener('click', handleGlobalClickOutside);
    }
    return () => {
      window.removeEventListener('pointerdown', handleGlobalClickOutside);
      window.removeEventListener('click', handleGlobalClickOutside);
    };
  }, [activeMenuPostId, reactionPanelPostId]);

  useEffect(() => {
    // Find the nearest scrollable ancestor dynamically
    const parent = document.getElementById('main-scroll-container') || document.querySelector('.overflow-y-auto');
    if (parent) setScrollParent(parent as HTMLElement);
  }, []);

  // Real-time listener for Pulse Posts
  useEffect(() => {
    const postsRef = collection(db, 'pulse_posts');
    const q = query(postsRef, orderBy('createdAt', 'desc'), limit(postLimit));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.docs.length < postLimit) {
        setHasMore(false);
      } else {
        setHasMore(true);
      }

      const list: PulsePost[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          userId: d.userId || '',
          userName: d.userName || 'Titan E-sports',
          userPhoto: d.userPhoto || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=200&auto=format&fit=crop',
          userRole: d.userRole || 'player',
          authorIdentity: d.authorIdentity || (d.isHostPost || d.isVerifiedHost || (d.userName && d.userName.toLowerCase() === 'playvear official') ? 'host' : 'player'),
          isHostPost: Boolean(d.isHostPost || d.authorIdentity === 'host' || d.isVerifiedHost || (d.userName && d.userName.toLowerCase() === 'playvear official')),
          isVerified: d.isVerified ?? (d.userRole === 'pro_host' || d.userRole === 'main_admin' || d.userRole === 'admin' || d.isVerifiedHost),
          text: d.text || '',
          category: d.category || 'all',
          imageUrl: d.imageUrl || '',
          videoInfo: d.videoInfo || undefined,
          views: d.views || (d.videoInfo?.views) || 0,
          trendingScore: typeof d.trendingScore === 'number' ? d.trendingScore : 0,
          mediaLink: d.mediaLink || null,
          linkedTournament: d.linkedTournament || null,
          linkedLeagueMatch: d.linkedLeagueMatch || null,
          linkedLoneWolfMatch: d.linkedLoneWolfMatch || null,
          likes: d.likes || [],
          reactions: d.reactions || {},
          likeCount: typeof d.likeCount === 'number' ? d.likeCount : (d.likes ? d.likes.length : 0),
          commentCount: d.commentCount || 0,
          shareCount: d.shareCount || 0,
          createdAt: d.createdAt,
          approvedAt: d.approvedAt || null,
          status: d.status || 'approved', // Default old posts to approved
        };
      });
      
      const isAdminUser = 
        (currentUserProfile?.email || '').toLowerCase().trim() === 'vortexesports150@gmail.com' ||
        ['admin', 'main_admin', 'super_admin', 'sub_admin', 'pro_host'].includes((currentUserProfile?.role || '').toLowerCase().trim()) ||
        Boolean(currentUserProfile?.isAdmin) ||
        Boolean(currentUserProfile?.isMainAdmin) ||
        Boolean(currentUserProfile?.isSuperAdmin);

      const filteredList = list.filter(post => 
        post.status === 'approved' || 
        post.userId === currentUserId ||
        isAdminUser
      );
      
      setPosts(filteredList);
    }, (err) => {
      console.error("Error listening to pulse posts:", err);
    });

    return () => unsubscribe();
  }, [postLimit, currentUserId, currentUserProfile?.role]);

  // Deep Link: Automatically scroll smoothly to the target post on initial load while preserving full feed scrollability
  useEffect(() => {
    if (!highlightedPostId || hasScrolledToPost || posts.length === 0) return;
    const targetPost = posts.find(p => p.id === highlightedPostId);
    if (targetPost) {
      setHasScrolledToPost(true);
      const timer = setTimeout(() => {
        const el = document.getElementById(`pulse-post-${highlightedPostId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 500);

      // Keep highlight glowing for 6 seconds, then fade smoothly to normal
      const fadeTimer = setTimeout(() => {
        setHighlightedPostId(null);
      }, 6000);

      return () => {
        clearTimeout(timer);
        clearTimeout(fadeTimer);
      };
    }
  }, [highlightedPostId, posts, hasScrolledToPost]);

  // Proactive Asset & Media Preloader (Facebook-style zero-delay feed caching)
  useEffect(() => {
    if (!posts || posts.length === 0) return;

    posts.forEach((post) => {
      // 1. Author Photo Preload
      const authorPhoto = resolveAuthorPhoto(post, allUsersMap);
      if (authorPhoto) {
        const img = new Image();
        img.src = authorPhoto;
      }
      // 2. Post Image Attachment Preload
      if (post.imageUrl) {
        const img = new Image();
        img.src = post.imageUrl;
      }
      // 3. Video Thumbnail / Poster Preload
      if (post.mediaLink?.thumbnailUrl) {
        const img = new Image();
        img.src = post.mediaLink.thumbnailUrl;
      }
      if (post.videoInfo?.thumbnailUrl) {
        const img = new Image();
        img.src = post.videoInfo.thumbnailUrl;
      }
    });
  }, [posts, allUsersMap]);

  // Gradual Smooth Scroll Controller (Slows down scroll speed & introduces gradual ease)
  useEffect(() => {
    if (!scrollParent) return;

    let targetScroll = scrollParent.scrollTop;
    let isAnimating = false;
    let animationFrameId: number | null = null;

    const smoothScrollStep = () => {
      if (!scrollParent) return;
      const current = scrollParent.scrollTop;
      const diff = targetScroll - current;

      if (Math.abs(diff) < 0.6) {
        scrollParent.scrollTop = targetScroll;
        isAnimating = false;
        return;
      }

      // Gentle gradual damping factor (0.12 = smooth and gradual deceleration)
      scrollParent.scrollTop = current + diff * 0.12;
      animationFrameId = requestAnimationFrame(smoothScrollStep);
    };

    const handleWheel = (e: WheelEvent) => {
      // Allow pinch-zoom or horizontal gestures
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY)) return;

      // Intercept raw wheel jump and smoothly interpolate with reduced speed
      e.preventDefault();

      // Slow down scroll speed by ~35% for a gradual, luxurious scrolling feel
      const speedMultiplier = 0.65;
      const maxScroll = Math.max(0, scrollParent.scrollHeight - scrollParent.clientHeight);
      targetScroll = Math.max(0, Math.min(maxScroll, targetScroll + e.deltaY * speedMultiplier));

      if (!isAnimating) {
        isAnimating = true;
        animationFrameId = requestAnimationFrame(smoothScrollStep);
      }
    };

    const parentEl = scrollParent;
    parentEl.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      parentEl.removeEventListener('wheel', handleWheel);
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
    };
  }, [scrollParent]);

  // Listen to user follows
  useEffect(() => {
    if (!currentUserId) return;
    const followsRef = collection(db, 'user_follows');
    const q = query(followsRef, orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const followed = snap.docs
        .filter(d => {
          const data = d.data();
          return data.followerId === currentUserId || data.userId === currentUserId;
        })
        .map(d => d.data().hostId);
      setFollowingHosts(followed);
    });
    return () => unsub();
  }, [currentUserId]);

  // Toggle or Set Specific Reaction on Post
  const handleToggleReaction = async (post: PulsePost, reactionType: 'like' | 'love' | 'haha' | 'sad' | 'munajat') => {
    if (!currentUserId) {
      alert("Please log in to react to posts!");
      return;
    }
    if (post.status && post.status !== 'approved') {
      alert("This post has not been approved by an administrator yet and cannot be reacted to.");
      return;
    }
    try {
      const postRef = doc(db, 'pulse_posts', post.id);
      const currentReactions = post.reactions || {};
      const previousReaction = currentReactions[currentUserId];

      const updatedReactions = { ...currentReactions };
      let updatedLikes = Array.from(new Set(post.likes || []));

      if (previousReaction === reactionType) {
        // Remove reaction (toggle off)
        delete updatedReactions[currentUserId];
        updatedLikes = updatedLikes.filter(uid => uid !== currentUserId);
      } else {
        // Add or change reaction
        updatedReactions[currentUserId] = reactionType;
        if (!updatedLikes.includes(currentUserId)) {
          updatedLikes.push(currentUserId);
        }
      }

      await updateDoc(postRef, {
        reactions: updatedReactions,
        likes: updatedLikes,
        likeCount: updatedLikes.length,
      });

      // Send in-app notification to the post creator (poster) if it's someone else
      if (previousReaction !== reactionType && post.userId && post.userId !== currentUserId) {
        try {
          const notifRef = doc(collection(db, 'users', post.userId, 'notifications'));
          const truncatedTitle = (post.text || '').trim().length > 30 
            ? `${(post.text || '').trim().substring(0, 30)}...` 
            : (post.text || '').trim();
          
          let reactionWord = 'reacted with like to';
          if (reactionType === 'love') reactionWord = 'reacted with love to';
          if (reactionType === 'haha') reactionWord = 'reacted with haha to';
          if (reactionType === 'sad') reactionWord = 'reacted with sad to';
          if (reactionType === 'munajat') reactionWord = 'reacted with munajat (prayer) to';

          await setDoc(notifRef, {
            title: 'New Reaction',
            message: `${currentUserProfile?.displayName || 'PlayVear Gamer'} ${reactionWord} your post: "${truncatedTitle}"`,
            type: 'post_reaction',
            postId: post.id,
            read: false,
            isRead: false,
            createdAt: serverTimestamp()
          });
        } catch (notifErr) {
          console.warn('Could not send reaction notification:', notifErr);
        }
      }
    } catch (err) {
      console.error("Error toggling reaction:", err);
    }
  };

  // Toggle Like on Post
  const handleToggleLike = async (post: PulsePost) => {
    if (!currentUserId) {
      alert("Please log in to like posts!");
      return;
    }
    const currentReactions = post.reactions || {};
    const previousReaction = currentReactions[currentUserId];
    if (previousReaction) {
      await handleToggleReaction(post, previousReaction);
    } else {
      await handleToggleReaction(post, 'like');
    }
  };

  // Long press event helpers
  const handlePressStart = (post: PulsePost) => {
    if (post.status && post.status !== 'approved') {
      alert("This post has not been approved by an administrator yet.");
      return;
    }
    setIsLongPressActive(false);
    const timer = setTimeout(() => {
      setReactionPanelPostId(post.id);
      setIsLongPressActive(true);
    }, 500); // 500ms
    setPressTimer(timer);
  };

  const handlePressEnd = (post: PulsePost) => {
    if (post.status && post.status !== 'approved') {
      return;
    }
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
    if (!isLongPressActive) {
      handleToggleLike(post);
    }
  };

  const cancelPress = () => {
    if (pressTimer) {
      clearTimeout(pressTimer);
      setPressTimer(null);
    }
  };

  // Toggle Follow Host
  const handleToggleFollow = async (hostId: string) => {
    if (!currentUserId) return;
    try {
      const isFollowing = followingHosts.includes(hostId);
      const followDocId = `${currentUserId}_${hostId}`;
      const followRef = doc(db, 'user_follows', followDocId);

      if (isFollowing) {
        // Delete deterministic doc
        await deleteDoc(followRef).catch(() => {});
        // Find and delete any random-id or legacy-id duplicates in the collection
        const q = query(
          collection(db, 'user_follows'),
          where('hostId', '==', hostId)
        );
        const snap = await getDocs(q);
        const matches = snap.docs.filter(d => {
          const data = d.data();
          return data.followerId === currentUserId || data.userId === currentUserId;
        });
        for (const d of matches) {
          await deleteDoc(doc(db, 'user_follows', d.id)).catch(() => {});
        }
      } else {
        // Write both schemas so all components are perfectly synced!
        await setDoc(followRef, {
          // Schema A (Pulse Feed & User Profile Modal)
          followerId: currentUserId,
          hostId: hostId,
          targetType: 'host',
          targetName: 'Titan esports', // Fallback name
          
          // Schema B (Legacy HostFollowButton)
          userId: currentUserId,
          type: 'host',
          hostName: 'Titan esports', // Fallback name

          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error("Error toggling follow:", err);
    }
  };

  // Share post link
  const handleSharePost = async (post: PulsePost) => {
    try {
      let baseUrl = window.location.origin + window.location.pathname;
      if (baseUrl.includes('ais-dev-')) {
        baseUrl = baseUrl.replace('ais-dev-', 'ais-pre-');
      }
      const shareUrl = `${baseUrl}?tab=pulse&post=${post.id}`;

      const shareText = post.text 
        ? `${post.text}\n\n🎮 Shared via PlayVear Pulse`
        : `Check out this pulse post by ${post.userName} on PlayVear!`;

      const shareData: any = {
        title: `PlayVear Pulse - ${post.userName}`,
        text: shareText,
        url: shareUrl,
      };

      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setToastMessage("Post link copied to clipboard!");
      }

      // Increment share count in firestore
      const postRef = doc(db, 'pulse_posts', post.id);
      await updateDoc(postRef, {
        sharesCount: increment(1),
        shareCount: increment(1),
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        // User canceled the share prompt, do nothing
        return;
      }
      console.error("Error sharing post:", err);
    }
  };

  // Save / Bookmark Post locally
  const handleToggleSavePost = (postId: string) => {
    if (savedPosts.includes(postId)) {
      setSavedPosts(savedPosts.filter(id => id !== postId));
      setToastMessage("Post removed from bookmarks.");
    } else {
      setSavedPosts([...savedPosts, postId]);
      setToastMessage("Post saved to bookmarks!");
    }
    setActiveMenuPostId(null);
  };

  // Admin Approve Post execution
  const handleApprovePost = async (postId: string) => {
    if (!postId) return;
    setApprovingPostId(postId);
    try {
      const postRef = doc(db, 'pulse_posts', postId);
      await updateDoc(postRef, {
        status: 'approved',
        approvedAt: serverTimestamp(),
        approvedBy: currentUserId || 'admin',
      });
      // Optimistic update in state
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'approved' } : p));
      setToastMessage("Post approved successfully! Now live for everyone.");
    } catch (err: any) {
      console.error("Error approving post:", err);
      alert(`Failed to approve post: ${err.message || 'Permission denied'}`);
    } finally {
      setApprovingPostId(null);
    }
  };

  // Delete Post confirmation execution
  const handleConfirmDeletePost = async () => {
    if (!postToDelete) return;
    const targetPost = postToDelete;
    setIsDeletingPost(true);
    try {
      // Optimistic deletion for instant UI response
      setPosts(prev => prev.filter(p => p.id !== targetPost.id));
      await deleteDoc(doc(db, 'pulse_posts', targetPost.id));
      setToastMessage("Post deleted successfully.");
      setPostToDelete(null);
    } catch (err: any) {
      console.error("Error deleting post:", err);
      alert(`Failed to delete post: ${err.message || 'Permission denied or network issue'}`);
    } finally {
      setIsDeletingPost(false);
    }
  };

  // Report Post confirmation execution
  const handleConfirmReportPost = async () => {
    if (!postToReport) return;
    const targetPost = postToReport;
    setIsSubmittingReport(true);
    try {
      await addDoc(collection(db, 'pulse_reports'), {
        type: 'post',
        postId: targetPost.id,
        reportedText: targetPost.text || '',
        reportedUser: targetPost.userName || '',
        reportedUserId: targetPost.userId || '',
        reporterUserId: currentUserId || '',
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      setToastMessage("Report submitted to moderation.");
      setPostToReport(null);
    } catch (err: any) {
      console.error("Error reporting post:", err);
      alert("Failed to submit report. Please try again.");
    } finally {
      setIsSubmittingReport(false);
    }
  };

  // Filter posts by active category & search query
  const pendingPostsCount = posts.filter(p => p.status === 'pending').length;

  const rawFilteredPosts = posts.filter((post) => {
    if (activeCategory === 'pending_approval') {
      return post.status === 'pending';
    } else {
      // Standard category views hide pending posts of other users
      if (post.status === 'pending' && post.userId !== currentUserId) {
        return false;
      }
      if (activeCategory !== 'all' && post.category !== activeCategory) {
        return false;
      }
    }

    // Feed Sort Mode specific filtering
    if (feedSortMode === 'matches') {
      const hasMatch = Boolean(post.linkedTournament || post.linkedLeagueMatch || post.linkedLoneWolfMatch);
      if (!hasMatch) return false;
    }

    if (searchQuery.trim()) {
      const queryLower = searchQuery.toLowerCase();
      const authorName = resolveAuthorName(post, allUsersMap);
      return (
        post.text.toLowerCase().includes(queryLower) ||
        authorName.toLowerCase().includes(queryLower)
      );
    }
    return true;
  });

  // Facebook Feed Ranking Context
  const fbContext = {
    currentUserId,
    followingHosts,
    savedPosts,
    allUsersMap,
    currentUserProfile,
  };

  const filteredPosts = feedSortMode === 'latest'
    ? [...rawFilteredPosts].sort((a, b) => {
        const dateA = getPostDateObject(a.createdAt)?.getTime() || 0;
        const dateB = getPostDateObject(b.createdAt)?.getTime() || 0;
        return dateB - dateA;
      })
    : applyFacebookFeedDiversity(rawFilteredPosts, fbContext);

  return (
    <div 
      className="w-full min-h-screen bg-[#04060e] text-white flex flex-col pb-28 sm:pb-24 font-sans select-text relative overflow-x-hidden"
    >
      {/* 1. MOBILE-OPTIMIZED PULSE TOP HEADER */}
      <div className="sticky top-0 z-30 bg-[#04060e]/95 backdrop-blur-xl border-b border-cyan-500/20 px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between shadow-[0_4px_25px_rgba(6,182,212,0.15)]">
        {/* Left App Logo / Title */}
        <div className="flex items-center gap-2">
          <div className="flex flex-col">
            <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 font-mono leading-none">
              PlayVear
            </span>
            <span className="text-xs font-black text-slate-300 font-mono leading-tight tracking-wider">
              COMMUNITY
            </span>
          </div>
        </div>

        {/* Center Pulse Title with EKG Wave */}
        <div className="flex items-center gap-1.5 sm:gap-2 bg-gradient-to-r from-cyan-500/10 via-pink-500/10 to-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.2)]">
          <span className="text-sm sm:text-base font-black tracking-widest bg-gradient-to-r from-cyan-400 via-white to-pink-400 bg-clip-text text-transparent font-mono uppercase">
            পালস
          </span>
          <Activity className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 animate-pulse stroke-[2.5]" />
        </div>

        {/* Right Search, Notification & Avatar */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          <button
            onClick={() => setShowSearchInput(!showSearchInput)}
            className="p-2 rounded-xl bg-slate-900/80 border border-white/10 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 transition-all cursor-pointer active:scale-95 touch-manipulation"
            aria-label="Search"
          >
            <Search className="w-4 h-4" />
          </button>

          {/* Notification Button & Interactive Dropdown */}
          <div ref={notificationsRef} className="relative">
            <button
              onClick={handleOpenNotificationsModal}
              className="p-2 rounded-xl bg-slate-900/80 border border-white/10 hover:border-pink-500 text-slate-300 hover:text-pink-400 transition-all cursor-pointer relative z-50 active:scale-95 touch-manipulation"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className={`w-4 h-4 ${unreadNotifCount > 0 ? 'text-pink-400 animate-bounce' : ''}`} />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-1 -right-1 min-w-[18px] h-4.5 px-1 bg-gradient-to-r from-pink-500 to-rose-600 rounded-full text-[9.5px] font-black flex items-center justify-center text-white border border-slate-950 shadow-[0_0_8px_rgba(244,63,94,0.8)] animate-pulse">
                  {unreadNotifCount > 99 ? '99+' : unreadNotifCount}
                </span>
              )}
            </button>

            {/* Notifications Dropdown Modal */}
            {showNotificationsModal && (
              <>
                {/* Fullscreen Backdrop Overlay */}
                <div 
                  className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" 
                  onClick={() => setShowNotificationsModal(false)} 
                />

                <div className="fixed sm:absolute right-2 sm:right-0 top-14 sm:top-auto sm:mt-2 w-[calc(100vw-16px)] sm:w-88 max-w-sm bg-slate-950/98 backdrop-blur-2xl border border-cyan-500/30 rounded-2xl shadow-[0_0_40px_rgba(6,182,212,0.3)] p-3.5 sm:p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200 font-sans text-left">
                <div className="flex items-center justify-between pb-2.5 mb-3 border-b border-cyan-500/20">
                  <div className="flex items-center gap-2">
                    <Bell className="w-4 h-4 text-cyan-400 animate-bounce" />
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">
                      Notifications
                    </h4>
                    {unreadNotifCount > 0 && (
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 text-[10px] font-bold border border-cyan-500/30">
                        {unreadNotifCount} new
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {notifications.length > 0 && (
                      <button
                        onClick={handleClearAllNotifications}
                        className="text-[10px] text-slate-400 hover:text-rose-400 transition-colors font-medium underline cursor-pointer"
                      >
                        Clear All
                      </button>
                    )}
                    <button
                      onClick={() => setShowNotificationsModal(false)}
                      className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Device Push Notification Activate Banner */}
                <div className="mb-3 p-2.5 bg-gradient-to-r from-cyan-950/50 to-pink-950/30 rounded-xl border border-cyan-500/30 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-[10.5px] font-bold text-white flex items-center gap-1">
                      <span>📲 Push Notifications</span>
                    </p>
                    <p className="text-[9px] text-slate-300 leading-tight">
                      Receive live alerts for matches, comments & tags
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      const granted = await requestPushPermission(currentUserId);
                      if (granted) {
                        setToastMessage('Push notifications activated on this device!');
                        setTimeout(() => setToastMessage(null), 3000);
                      }
                    }}
                    className="px-2.5 py-1 bg-gradient-to-r from-cyan-500 to-pink-500 text-white font-black text-[9.5px] rounded-lg shadow-md hover:opacity-90 transition-opacity whitespace-nowrap cursor-pointer shrink-0"
                  >
                    Enable
                  </button>
                </div>

                {/* Notification Items List */}
                <div className="max-h-72 sm:max-h-80 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {notifications.length === 0 ? (
                    <div className="py-8 text-center flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Bell className="w-8 h-8 text-slate-600 stroke-[1.5]" />
                      <p className="text-xs font-medium text-slate-400">No new notifications</p>
                    </div>
                  ) : (
                    notifications.map((notif: any) => (
                      <div
                        key={notif.id}
                        className={`p-2.5 rounded-xl border transition-all flex items-start gap-2.5 relative group ${
                          !notif.isRead && !notif.read
                            ? 'bg-cyan-500/10 border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                            : 'bg-slate-900/60 border-white/5 hover:border-white/15'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0 mt-0.5">
                          <Bell className="w-3.5 h-3.5 text-cyan-400" />
                        </div>
                        <div className="flex-1 min-w-0 pr-5">
                          <p className="text-xs font-bold text-white leading-snug">
                            {notif.title || notif.senderName || 'Notification'}
                          </p>
                          <p className="text-[11px] text-slate-300 leading-normal mt-0.5 break-words">
                            {notif.message || notif.body || notif.content || 'New update received'}
                          </p>
                          <span className="text-[9px] text-slate-400 mt-1 block font-mono">
                            {formatRelativeTime(notif.createdAt)}
                          </span>
                        </div>
                        <button
                          onClick={() => handleDeleteNotification(notif.id)}
                          className="absolute top-2 right-2 p-1 text-slate-500 hover:text-rose-400 opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                          title="Delete notification"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}
        </div>

          {/* Profile Avatar Button */}
          <button
            onClick={() => setSelectedUserProfileId(currentUserId)}
            className="cursor-pointer group shrink-0 focus:outline-none active:scale-95 touch-manipulation"
            title="View My Profile & Posts"
          >
            <img loading="lazy" 
              src={currentUserProfile?.photoURL || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=150&auto=format&fit=crop'} 
              alt="Profile" 
              className="w-8 h-8 rounded-full object-cover border-2 border-cyan-500/60 shadow-[0_0_10px_rgba(6,182,212,0.4)] group-hover:scale-105 group-hover:border-cyan-400 transition-all" 
            />
          </button>
        </div>
      </div>

      {/* Expandable Search Input Bar */}
      {showSearchInput && (
        <div className="px-3 sm:px-4 py-2 bg-slate-950 border-b border-cyan-500/20 animate-fadeIn flex items-center gap-2">
          <Search className="w-4 h-4 text-cyan-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search pulse posts, hosts or gaming updates..."
            className="w-full bg-slate-900/80 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400 font-sans"
            autoFocus
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-xs text-slate-400 hover:text-white p-1">
              ✕
            </button>
          )}
        </div>
      )}

      {/* CENTERED MOBILE APP FEED CONTAINER */}
      <div className="max-w-xl mx-auto w-full px-2.5 sm:px-4 pt-2.5 space-y-3 sm:space-y-4">

        {/* 2. MOBILE CREATE POST BAR */}
        <div className="bg-[#080d1e]/90 border border-cyan-500/30 rounded-2xl p-2.5 sm:p-3 shadow-[0_0_20px_rgba(6,182,212,0.15)] backdrop-blur-md flex items-center gap-2.5 sm:gap-3">
          <img loading="lazy" 
            src={currentUserProfile?.photoURL || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=150&auto=format&fit=crop'} 
            alt="" 
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-cyan-500/50 shrink-0 shadow-[0_0_12px_rgba(6,182,212,0.3)]" 
          />

          <button
            onClick={() => setShowCreateModal(true)}
            className="flex-1 bg-slate-900/80 hover:bg-slate-900 border border-cyan-500/20 hover:border-cyan-400/60 rounded-xl px-3.5 py-2 sm:py-2.5 text-left text-[11px] sm:text-xs text-slate-400 hover:text-slate-200 transition-all font-sans cursor-pointer truncate shadow-inner active:scale-[0.99] touch-manipulation"
          >
            Share a gaming update...
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-r from-pink-500 to-rose-600 hover:from-pink-400 hover:to-rose-500 text-white flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.4)] transition-all cursor-pointer active:scale-95 touch-manipulation"
            title="Create Post"
          >
            <Camera className="w-4 h-4 sm:w-5 sm:h-5" />
          </button>
        </div>

        {/* 3. CATEGORY PILLS / TOUCH SCROLLER FILTER BAR */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 no-scrollbar pt-0.5 touch-pan-x snap-x">
          {[
            { id: 'all', label: 'All', icon: Activity },
            { id: 'tournaments', label: 'Tournament', icon: Trophy },
            { id: 'league', label: 'League', icon: Trophy },
            { id: 'lone_wolf', label: 'Lone Wolf', icon: Zap },
            { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
            { id: 'squad', label: 'Squad', icon: Users },
            { id: 'announcements', label: 'Notice', icon: Bell },
            { id: 'rewards', label: 'Rewards', icon: Gift },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSel = activeCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id as any)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all cursor-pointer shrink-0 ${
                  isSel 
                    ? 'bg-gradient-to-r from-cyan-500/30 to-blue-600/30 border border-cyan-400 text-cyan-300 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                    : 'bg-slate-900/80 border border-white/5 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isSel ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        {/* 4. FEED POSTS LIST */}
        <div className="space-y-4">
          {filteredPosts.length === 0 ? (
            <div className="bg-[#080d1e]/60 border border-cyan-500/20 rounded-2xl p-8 text-center space-y-3">
              <Sparkles className="w-10 h-10 text-cyan-400/40 mx-auto animate-pulse" />
              <p className="text-xs font-bold font-mono text-slate-300 uppercase tracking-wider">No Posts Found</p>
              <p className="text-[11px] text-slate-500 max-w-xs mx-auto">Be the first player or host to create a pulse update for the esports community!</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl shadow-lg cursor-pointer"
              >
                + Create Post
              </button>
            </div>
          ) : scrollParent ? (
            <Virtuoso
              customScrollParent={scrollParent}
              data={filteredPosts}
              overscan={{ main: 3200, reverse: 1600 }}
              increaseViewportBy={{ top: 1200, bottom: 3000 }}
              endReached={() => {
                if (hasMore) {
                  setPostLimit(prev => prev + 25);
                }
              }}
              itemContent={(index, post) => {
                const isLiked = post.likes.includes(currentUserId);
                const isFollowing = followingHosts.includes(post.userId);
                const isOwner = post.userId === currentUserId;
                const userReaction = post.reactions ? post.reactions[currentUserId] : (post.likes.includes(currentUserId) ? 'like' : null);

                const reactionCounts = {
                  like: 0,
                  love: 0,
                  haha: 0,
                  sad: 0,
                  munajat: 0
                };
                if (post.reactions) {
                  Object.entries(post.reactions).forEach(([_, type]) => {
                    const reactionKey = String(type) as keyof typeof reactionCounts;
                    if (reactionKey in reactionCounts) {
                      reactionCounts[reactionKey]++;
                    }
                  });
                } else if (post.likes && post.likes.length > 0) {
                  reactionCounts.like = post.likes.length;
                }

                const isHighlighted = highlightedPostId === post.id;

                return (
                  <div className="pb-3.5 sm:pb-4">
                    <div 
                      id={`pulse-post-${post.id}`}
                      className={`bg-[#080d1e]/90 border rounded-2xl p-3 sm:p-4 backdrop-blur-md space-y-2.5 sm:space-y-3 relative transition-all duration-500 ${
                        isHighlighted
                          ? 'border-cyan-400 ring-2 ring-cyan-400/80 shadow-[0_0_35px_rgba(6,182,212,0.45)] scale-[1.01]'
                          : 'border-cyan-500/30 shadow-[0_0_25px_rgba(6,182,212,0.12)] hover:border-cyan-500/50'
                      }`}
                    >
                  {/* Post Header */}
                  <div className="flex items-center justify-between gap-2">
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedUserProfileId(post.userId);
                        setSelectedUserProfileView((post.authorIdentity === 'host' || post.isHostPost) ? 'host' : 'player');
                      }}
                      className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group min-w-0 flex-1"
                      title={`View ${resolveAuthorName(post, allUsersMap)}'s Profile`}
                    >
                      <img loading="lazy" 
                        src={resolveAuthorPhoto(post, allUsersMap)} 
                        alt="" 
                        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full object-cover border-2 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)] shrink-0 group-hover:scale-105 group-hover:border-cyan-400 transition-all" 
                      />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs sm:text-sm font-black text-white font-sans tracking-wide group-hover:text-cyan-300 transition-colors truncate">
                            {resolveAuthorName(post, allUsersMap)}
                          </span>
                          {post.isVerified && (
                            <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 fill-cyan-500/20 shrink-0" />
                          )}
                          {post.status && post.status !== 'approved' && (
                            <span className="px-1.5 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/35 text-rose-400 font-mono text-[8px] font-black uppercase tracking-widest animate-pulse shrink-0">
                              Pending Approval
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5">
                          {(() => {
                            const timeToUse = (post.status === 'approved' && post.approvedAt) ? post.approvedAt : post.createdAt;
                            const dateObj = getPostDateObject(timeToUse);
                            const relativeStr = formatRelativeTime(timeToUse);
                            const labelPrefix = (post.status === 'approved' && post.approvedAt) ? 'Approved' : 'Posted';
                            const tooltipStr = dateObj 
                              ? `${labelPrefix} (GMT): ${dateObj.toUTCString()}\nLocal Time: ${dateObj.toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })}`
                              : 'Just now';
                            return (
                              <span title={tooltipStr} className="cursor-help hover:text-cyan-400 transition-colors">
                                {relativeStr}
                              </span>
                            );
                          })()}
                          <span>•</span>
                          <span>🌐</span>
                        </p>
                      </div>
                    </div>

                    {/* Right Follow/Subscribe Button & Menu */}
                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                      {/* Admin Instant Approve Button for Pending Posts */}
                      {post.status && post.status !== 'approved' && isUserAdminOrSuperAdmin() && (
                        <button
                          type="button"
                          disabled={approvingPostId === post.id}
                          onClick={() => handleApprovePost(post.id)}
                          className="px-2 sm:px-2.5 py-1 rounded-xl bg-emerald-500/20 border border-emerald-400 text-emerald-300 hover:bg-emerald-500 hover:text-slate-950 text-[9.5px] sm:text-[10px] font-black uppercase font-mono tracking-wider transition-all flex items-center gap-1 shadow-[0_0_12px_rgba(16,185,129,0.3)] cursor-pointer disabled:opacity-50 shrink-0"
                          title="Approve post and publish to community feed"
                        >
                          <CheckCircle2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                          <span>{approvingPostId === post.id ? 'Approving...' : 'Approve'}</span>
                        </button>
                      )}

                      {!isOwner && (
                        <button
                          onClick={() => !isFollowing && handleToggleFollow(post.userId)}
                          className={`px-2.5 sm:px-3 py-1 rounded-xl text-[9.5px] sm:text-[10px] font-extrabold uppercase font-mono tracking-wider transition-all border touch-manipulation ${
                            isFollowing 
                              ? 'bg-slate-800 border-white/20 text-slate-400 cursor-default select-none' 
                              : 'bg-cyan-500/10 border-cyan-400 text-cyan-300 hover:bg-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.3)] cursor-pointer active:scale-95'
                          }`}
                        >
                          {isFollowing ? 'Following' : 'Follow'}
                        </button>
                      )}

                      <div className="relative pulse-menu-container">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id);
                          }}
                          className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800/60 transition-colors cursor-pointer touch-manipulation"
                          title="Options"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>

                        {/* Three-Dot Context Menu */}
                        {activeMenuPostId === post.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-20 cursor-default"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveMenuPostId(null);
                              }}
                            />
                            <div 
                              onClick={(e) => e.stopPropagation()}
                              className="absolute right-0 top-8 w-36 bg-[#060a18]/95 border border-cyan-500/40 rounded-xl p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.9)] z-30 space-y-1 animate-fadeIn backdrop-blur-xl"
                            >
                              {post.status && post.status !== 'approved' && isUserAdminOrSuperAdmin() && (
                                <button
                                  type="button"
                                  disabled={approvingPostId === post.id}
                                  onClick={() => {
                                    setActiveMenuPostId(null);
                                    handleApprovePost(post.id);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 text-xs text-emerald-300 hover:bg-emerald-500/15 rounded-lg flex items-center gap-2 font-sans font-bold cursor-pointer transition-colors border-b border-white/5 mb-1 pb-1.5"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                  <span>Approve Post</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => handleToggleSavePost(post.id)}
                                className="w-full text-left px-2.5 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-900 rounded-lg flex items-center gap-2 font-sans cursor-pointer transition-colors"
                              >
                                <Bookmark className="w-3.5 h-3.5 text-cyan-400" />
                                <span>{savedPosts.includes(post.id) ? 'Unsave' : 'Save Post'}</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuPostId(null);
                                  setPostToReport(post);
                                }}
                                className="w-full text-left px-2.5 py-1.5 text-xs text-amber-300 hover:bg-slate-900 rounded-lg flex items-center gap-2 font-sans cursor-pointer transition-colors"
                              >
                                <Flag className="w-3.5 h-3.5 text-amber-400" />
                                <span>Report Post</span>
                              </button>

                              {(isOwner || isUserAdminOrSuperAdmin()) && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveMenuPostId(null);
                                    setPostToDelete(post);
                                  }}
                                  className="w-full text-left px-2.5 py-1.5 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg flex items-center gap-2 font-sans font-bold cursor-pointer transition-colors border-t border-white/5 mt-1 pt-1.5"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Delete Post</span>
                                </button>
                              )}
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Post Text Content */}
                  {post.text && (
                    <p className="text-[12.5px] sm:text-xs text-slate-200 font-sans leading-relaxed whitespace-pre-wrap pt-0.5 select-text cursor-text">
                      {post.text}
                    </p>
                  )}

                  {/* Linked Tournament Cyberpunk Card */}
                  {post.linkedTournament && (
                    <div 
                      onClick={() => onSelectTournament && post.linkedTournament?.id && onSelectTournament(post.linkedTournament.id)}
                      className="rounded-2xl bg-[#060b1e] border border-cyan-500/40 overflow-hidden relative p-4 shadow-[0_0_30px_rgba(6,182,212,0.25)] group cursor-pointer"
                    >
                      {/* Background Cyberpunk Grid Lines */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.05)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />

                      <div className="relative z-10 space-y-3">
                        <div className="text-center border-b border-cyan-500/20 pb-2">
                          <h4 className="text-sm font-black text-white font-mono uppercase tracking-widest bg-gradient-to-r from-cyan-400 via-white to-pink-400 bg-clip-text text-transparent">
                            {post.linkedTournament.title}
                          </h4>
                          <span className="text-[10px] text-cyan-400 font-mono uppercase font-bold tracking-wider">
                            Free Fire Tournament
                          </span>
                        </div>

                        {/* Tournament Stats Cards Row */}
                        <div className="grid grid-cols-3 gap-2 text-center">
                          <div className="bg-slate-900/80 border border-pink-500/30 p-2 rounded-xl">
                            <span className="text-[9px] font-bold uppercase text-slate-400 block font-mono">ENTRY FEE</span>
                            <span className="text-xs font-black text-pink-400 font-mono">৳ {post.linkedTournament.entryFee}</span>
                          </div>

                          <div className="bg-slate-900/80 border border-cyan-500/40 p-2 rounded-xl">
                            <span className="text-[9px] font-bold uppercase text-slate-400 block font-mono">PRIZE POOL</span>
                            <span className="text-sm font-black text-cyan-300 font-mono">৳ {post.linkedTournament.prizePool.toLocaleString()}</span>
                          </div>

                          <div className="bg-slate-900/80 border border-indigo-500/30 p-2 rounded-xl">
                            <span className="text-[9px] font-bold uppercase text-slate-400 block font-mono">SQUAD</span>
                            <span className="text-xs font-black text-indigo-300 font-mono">{post.linkedTournament.slotsTaken}/{post.linkedTournament.totalSlots}</span>
                          </div>
                        </div>

                        {/* Match Date Badge */}
                        <div className="flex justify-center pt-1">
                          <span className="px-3 py-1 bg-cyan-500/10 border border-cyan-400/40 text-cyan-300 font-mono text-[10px] font-bold rounded-full uppercase tracking-wider flex items-center gap-1.5">
                            <span>MATCH DATE: {post.linkedTournament.matchDate || '25 MAY 2026'}</span>
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Linked League Match Cyberpunk Card */}
                  {post.linkedLeagueMatch && (() => {
                    // 1. Resolve Player's Squad (Left Card)
                    const rawPlayerName = post.linkedLeagueMatch.playerSquadName || post.linkedLeagueMatch.t1;
                    const resolvedPlayerSquad = resolveSquadName(
                      rawPlayerName, 
                      post.linkedLeagueMatch.playerTbdSlot || post.linkedLeagueMatch.t1 || 'Squad 1'
                    );
                    const resolvedPlayerCover = resolveSquadCover(
                      post.linkedLeagueMatch.playerSquadCover, 
                      resolvedPlayerSquad || rawPlayerName
                    );

                    // 2. Resolve Opponent's Squad (Right Card)
                    let rawOpponentName = post.linkedLeagueMatch.opposingSquadName;
                    
                    // If opponent name was saved identical to player name in earlier posts, fallback to slot/t2
                    if (rawOpponentName && resolvedPlayerSquad && rawOpponentName.trim().toLowerCase() === resolvedPlayerSquad.trim().toLowerCase()) {
                      rawOpponentName = post.linkedLeagueMatch.opposingTbdSlot || (post.linkedLeagueMatch.t2 !== post.linkedLeagueMatch.t1 ? post.linkedLeagueMatch.t2 : '') || '';
                    }

                    let resolvedOpposingSquad = resolveSquadName(
                      rawOpponentName, 
                      post.linkedLeagueMatch.opposingTbdSlot || (post.linkedLeagueMatch.t2 !== post.linkedLeagueMatch.t1 ? post.linkedLeagueMatch.t2 : '') || 'Opponent Squad'
                    );

                    // Extra guarantee: If after resolution it still matches the player's squad name
                    if (!resolvedOpposingSquad || resolvedOpposingSquad.trim().toLowerCase() === resolvedPlayerSquad.trim().toLowerCase()) {
                      const fallbackSlot = post.linkedLeagueMatch.opposingTbdSlot || (post.linkedLeagueMatch.t2 !== post.linkedLeagueMatch.t1 ? post.linkedLeagueMatch.t2 : '');
                      if (fallbackSlot && fallbackSlot.trim().toLowerCase() !== resolvedPlayerSquad.trim().toLowerCase()) {
                        resolvedOpposingSquad = fallbackSlot;
                      } else {
                        resolvedOpposingSquad = 'TBD Opponent';
                      }
                    }

                    // Opponent roster list - filter out current user/player
                    const playerLineupName = (post.linkedLeagueMatch.playerName || post.userName || '').trim().toLowerCase();
                    const filteredOpponentPlayers = (post.linkedLeagueMatch.opposingPlayers || []).filter((p: string) => {
                      if (!p) return false;
                      const pLow = p.trim().toLowerCase();
                      return pLow !== playerLineupName;
                    });

                    const isHostOrAdminPost = post.userRole === 'pro_host' || post.userRole === 'main_admin' || post.userRole === 'super_admin' || post.userRole === 'admin';

                    return (
                      <div 
                        onClick={() => {
                          if (onSelectLeagueMatch && post.linkedLeagueMatch?.leagueId) {
                            onSelectLeagueMatch(
                              post.linkedLeagueMatch.leagueId, 
                              post.linkedLeagueMatch.id || post.linkedLeagueMatch.matchId,
                              post.linkedLeagueMatch
                            );
                          }
                        }}
                        className="rounded-2xl bg-[#04060e] border border-cyan-500/30 overflow-hidden relative p-4 shadow-[0_0_25px_rgba(6,182,212,0.15)] cursor-pointer group hover:border-cyan-400 hover:shadow-[0_0_35px_rgba(6,182,212,0.25)] transition-all duration-300"
                      >
                        {/* Grid lines background */}
                        <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.02)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
                        
                        <div className="relative z-10 space-y-3.5">
                          {/* Title bar */}
                          <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                            <span className="text-[10px] font-black text-cyan-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
                              🛡️ {isHostOrAdminPost ? '📢 HOST PROMOTED MATCH' : '🛡️ TAGGED LEAGUE MATCH'}
                            </span>
                            <span className="text-[9px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-white/5 font-mono">
                              {post.linkedLeagueMatch.leagueName || 'PlayVear Pro League'}
                            </span>
                          </div>

                          {/* Vs details split container (Single row with two cards and vs in the middle) */}
                          <div className="flex flex-row items-center gap-2 sm:gap-4 w-full">
                            
                            {/* Player's Squad Card (Left Card) */}
                            <div className="flex-1 bg-cyan-950/10 border border-cyan-500/20 rounded-xl overflow-hidden flex flex-col h-44 group-hover:bg-cyan-500/10 transition-colors">
                              {/* Team Name on TOP of the card */}
                              <div className="bg-cyan-500/10 py-1.5 px-2.5 border-b border-cyan-500/20 text-center font-black font-mono tracking-wider text-[10px] text-cyan-300 truncate shrink-0">
                                {resolvedPlayerSquad}
                              </div>
                              
                              {/* Card Body */}
                              <div className="p-2 flex-1 flex flex-col justify-between gap-1.5 min-h-0">
                                {resolvedPlayerCover ? (
                                  <div className="w-full h-20 rounded-lg overflow-hidden border border-cyan-500/20 relative shrink-0">
                                    <img 
                                      src={resolvedPlayerCover} 
                                      alt="My Squad Cover" 
                                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
                                      referrerPolicy="no-referrer"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-full h-20 bg-slate-950 border border-cyan-500/20 rounded-lg flex flex-col items-center justify-center text-cyan-400/80 p-1 gap-0.5 shrink-0">
                                    <Users className="w-4 h-4 text-cyan-400 animate-pulse" />
                                    <span className="text-[7px] font-mono font-bold tracking-widest uppercase">My Team Cover</span>
                                  </div>
                                )}

                                <div className="min-w-0">
                                  <span className="text-[8px] font-bold text-slate-400 font-mono block">Player in Lineup:</span>
                                  <span className="text-[10px] font-bold text-white font-sans truncate block">
                                    {post.linkedLeagueMatch.playerName || post.userName}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* VS badge spacer (Middle) */}
                            <div className="flex flex-col items-center justify-center shrink-0">
                              <div className="w-8 h-8 rounded-full bg-[#050814] border border-cyan-500/30 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                                <span className="text-[9px] font-black text-cyan-400 font-mono tracking-widest animate-pulse">VS</span>
                              </div>
                            </div>

                            {/* Opponent's Squad Card (Right Card) */}
                            <div className="flex-1 bg-slate-950/40 border border-white/5 rounded-xl overflow-hidden flex flex-col h-44 hover:bg-slate-950/60 transition-colors">
                              {/* Team Name on TOP of the card */}
                              <div className="bg-slate-950 py-1.5 px-2.5 border-b border-white/5 text-center font-black font-mono tracking-wider text-[10px] text-slate-300 truncate shrink-0">
                                {resolvedOpposingSquad}
                              </div>
                              
                              {/* Card Body */}
                              <div className="p-2 flex-1 flex flex-col justify-between gap-1.5 min-h-0">
                                {/* Opposing squad - strictly NO cover photo to honor privacy */}
                                <div className="w-full h-20 bg-[#03050a] border border-white/5 rounded-lg flex flex-col items-center justify-center text-slate-500/80 p-1 gap-0.5 relative overflow-hidden shrink-0">
                                  <div className="absolute top-0.5 right-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[5.5px] font-mono uppercase px-1 rounded">
                                    Protected
                                  </div>
                                  <span className="text-xs">🔒</span>
                                  <span className="text-[7px] font-mono font-bold text-slate-500 uppercase tracking-wider text-center">
                                    Privacy Protected
                                  </span>
                                  <span className="text-[6.5px] font-mono text-slate-600">
                                    Opponent cover hidden
                                  </span>
                                </div>

                                <div className="min-w-0">
                                  <span className="text-[8px] text-slate-500 font-mono font-bold uppercase block">Opponent Lineup:</span>
                                  <div className="flex flex-wrap gap-0.5 max-h-[22px] overflow-y-auto pr-0.5">
                                    {filteredOpponentPlayers && filteredOpponentPlayers.length > 0 ? (
                                      filteredOpponentPlayers.slice(0, 3).map((player: string, index: number) => (
                                        <span 
                                          key={index}
                                          className="text-[7px] font-mono font-bold bg-slate-900 border border-white/5 text-slate-400 px-1 py-0.2 rounded whitespace-nowrap"
                                        >
                                          {player}
                                        </span>
                                      ))
                                    ) : (
                                      <span className="text-[7px] font-mono font-bold text-slate-600 italic">No roster submitted</span>
                                    )}
                                    {filteredOpponentPlayers && filteredOpponentPlayers.length > 3 && (
                                      <span className="text-[6.5px] font-mono font-bold text-cyan-400 px-1 py-0.2">
                                        +{filteredOpponentPlayers.length - 3}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                          </div>

                          {/* Match details / Schedule time footer */}
                          <div className="flex items-center justify-between pt-1 border-t border-cyan-500/10 text-[9px]">
                            <span className="text-slate-400 font-mono font-bold">
                              📅 {post.linkedLeagueMatch.date || 'TBD'} @ {post.linkedLeagueMatch.time || 'TBD'}
                            </span>
                            <span className="text-cyan-400 font-mono font-black animate-pulse">
                              CLICK TO VIEW MATCH CARD ➔
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Linked Lone Wolf Match Cyberpunk Card */}
                  {post.linkedLoneWolfMatch && (
                    <div 
                      onClick={() => onSelectLoneWolfMatch && onSelectLoneWolfMatch(post.linkedLoneWolfMatch!.id || '')}
                      className="rounded-2xl bg-[#060a1c] border border-pink-500/35 overflow-hidden relative p-4 shadow-[0_0_30px_rgba(244,63,94,0.2)] cursor-pointer group hover:border-pink-400 transition-all"
                    >
                      {/* Grid lines background */}
                      <div className="absolute inset-0 bg-[linear-gradient(rgba(244,63,94,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(244,63,94,0.03)_1px,transparent_1px)] bg-[size:16px_16px] pointer-events-none" />
                      <div className="relative z-10 space-y-3">
                        <div className="text-center border-b border-pink-500/20 pb-2">
                          <h4 className="text-sm font-black text-white font-mono uppercase tracking-widest bg-gradient-to-r from-pink-400 to-amber-400 bg-clip-text text-transparent">
                            {post.linkedLoneWolfMatch.title || `Lone Wolf #${post.linkedLoneWolfMatch.matchNumber}`}
                          </h4>
                          <span className="text-[10px] text-pink-400 font-mono uppercase font-bold tracking-wider">
                            🐺 TAGGED LONE WOLF MATCH
                          </span>
                        </div>

                        {/* Vs Layout */}
                        <div className="flex items-center justify-around py-1.5">
                          <div className="text-center flex-1 max-w-[40%]">
                            <span className="text-xs font-black text-white block truncate font-mono">
                              {resolveLoneWolfPlayerGameName(post.linkedLoneWolfMatch.player1, post.linkedLoneWolfMatch.id, 1)}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono uppercase">Player 1</span>
                          </div>
                          <div className="px-3 py-1 bg-pink-500/10 border border-pink-500/30 rounded-full text-[10px] font-black text-pink-400 font-mono shrink-0">
                            VS
                          </div>
                          <div className="text-center flex-1 max-w-[40%]">
                            <span className="text-xs font-black text-white block truncate font-mono">
                              {resolveLoneWolfPlayerGameName(post.linkedLoneWolfMatch.player2, post.linkedLoneWolfMatch.id, 2)}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono uppercase">Player 2</span>
                          </div>
                        </div>

                        {/* Stats and Time */}
                        <div className="grid grid-cols-2 gap-2 text-center text-xs">
                          <div className="bg-slate-900/80 border border-pink-500/20 p-2 rounded-xl">
                            <span className="text-[8px] font-bold uppercase text-slate-400 block font-mono">ENTRY FEE</span>
                            <span className="text-xs font-black text-pink-400 font-mono">৳ {post.linkedLoneWolfMatch.entryFee || 0}</span>
                          </div>
                          <div className="bg-slate-900/80 border border-cyan-500/20 p-2 rounded-xl">
                            <span className="text-[8px] font-bold uppercase text-slate-400 block font-mono">PRIZE POOL</span>
                            <span className="text-xs font-black text-cyan-400 font-mono">৳ {post.linkedLoneWolfMatch.prizePool || 0}</span>
                          </div>
                        </div>

                        <div className="flex justify-center pt-1">
                          <span className="px-3 py-1 bg-pink-500/15 border border-pink-400/40 text-pink-300 font-mono text-[9px] font-black rounded-full uppercase tracking-wider">
                            🕒 MATCH TIME: {post.linkedLoneWolfMatch.time || 'TBD'}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Regular Post Image Banner */}
                  {post.imageUrl && (
                    <div 
                      onClick={() => setImagePreviewUrl(post.imageUrl!)}
                      className="rounded-2xl overflow-hidden border border-cyan-500/30 max-h-[350px] cursor-pointer group relative shadow-[0_0_20px_rgba(6,182,212,0.2)]"
                    >
                      <img loading="lazy" 
                        src={post.imageUrl} 
                        alt="Post media" 
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                      />
                    </div>
                  )}
                      {/* Engagement Counts Row */}
                  <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5 font-sans">
                    <div 
                      onClick={() => setShowReactionsBreakdownPost(post)}
                      className="flex items-center gap-1.5 cursor-pointer hover:text-cyan-400 transition-colors group"
                      title="View all reaction counts"
                    >
                      <div className="flex items-center -space-x-1">
                        {post.reactions && Object.values(post.reactions).includes('like') && (
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-600 flex items-center justify-center text-white border border-slate-950 text-[8.5px] sm:text-[10px]" title="Like">
                            <span>👍</span>
                          </div>
                        )}
                        {post.reactions && Object.values(post.reactions).includes('love') && (
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-pink-600 flex items-center justify-center text-white border border-slate-950 text-[8.5px] sm:text-[10px]" title="Love">
                            <span>❤️</span>
                          </div>
                        )}
                        {post.reactions && Object.values(post.reactions).includes('haha') && (
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-amber-500 flex items-center justify-center text-white border border-slate-950 text-[8.5px] sm:text-[10px]" title="Haha">
                            <span>😆</span>
                          </div>
                        )}
                        {post.reactions && Object.values(post.reactions).includes('sad') && (
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-yellow-600 flex items-center justify-center text-white border border-slate-950 text-[8.5px] sm:text-[10px]" title="Sad">
                            <span>😢</span>
                          </div>
                        )}
                        {post.reactions && Object.values(post.reactions).includes('munajat') && (
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-cyan-600 flex items-center justify-center text-white border border-slate-950 text-[8.5px] sm:text-[10px]" title="Munajat">
                            <span>🤲</span>
                          </div>
                        )}
                        {(!post.reactions || Object.keys(post.reactions).length === 0) && post.likes.length > 0 && (
                          <div className="w-4 h-4 sm:w-5 sm:h-5 rounded-full bg-blue-600 flex items-center justify-center text-white border border-slate-950 text-[8.5px] sm:text-[10px]">
                            <ThumbsUp className="w-2 h-2 sm:w-2.5 sm:h-2.5 fill-current" />
                          </div>
                        )}
                      </div>
                      <span className="font-bold text-slate-300 group-hover:text-cyan-400 font-mono transition-colors text-[11px] sm:text-xs">{post.likeCount}</span>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-[10.5px] sm:text-[11px] font-bold text-slate-400">
                      <button 
                        onClick={() => setActiveCommentPostId(post.id)}
                        className="hover:text-cyan-400 transition-colors cursor-pointer"
                      >
                        {post.commentCount} Comments
                      </button>
                      <span>•</span>
                      <span>{post.shareCount} Shares</span>
                    </div>
                  </div>

                  {/* Post Action Buttons Row (Like, Comment, Share) */}
                  <div className="grid grid-cols-3 gap-1 pt-2 border-t border-white/5 text-xs font-bold font-mono">
                    {/* Like Button with Reactions */}
                    <div className="relative pulse-reaction-container">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!isLongPressActive) {
                            handleToggleLike(post);
                          }
                        }}
                        onMouseDown={() => handlePressStart(post)}
                        onMouseUp={() => handlePressEnd(post)}
                        onMouseLeave={cancelPress}
                        onTouchStart={() => handlePressStart(post)}
                        onTouchEnd={() => handlePressEnd(post)}
                        className={`w-full py-2 flex items-center justify-center gap-1.5 transition-all select-none bg-transparent border-none outline-none shadow-none ${
                          post.status && post.status !== 'approved'
                            ? 'opacity-40 cursor-not-allowed text-slate-500'
                            : userReaction
                              ? 'text-cyan-400 cursor-pointer'
                              : 'text-slate-400 hover:text-white cursor-pointer'
                        }`}
                      >
                        {userReaction === 'love' && <span className="text-sm sm:text-base animate-pulse">❤️</span>}
                        {userReaction === 'haha' && <span className="text-sm sm:text-base animate-pulse">😆</span>}
                        {userReaction === 'sad' && <span className="text-sm sm:text-base animate-pulse">😢</span>}
                        {userReaction === 'munajat' && <span className="text-sm sm:text-base animate-pulse">🤲</span>}
                        {userReaction === 'like' && <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-blue-500 text-blue-400" />}
                        {!userReaction && <ThumbsUp className="w-3.5 h-3.5 sm:w-4 sm:h-4" />}
                      </button>

                       {/* Reaction Panel Popover (Icons Only) - Fully responsive with left-0 anchor for mobile */}
                       {reactionPanelPostId === post.id && (
                        <div className="absolute bottom-11 sm:bottom-12 left-0 sm:left-1/2 sm:-translate-x-1/2 bg-[#060a18]/98 border border-cyan-500/50 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full flex items-center gap-1.5 sm:gap-2.5 shadow-[0_0_25px_rgba(6,182,212,0.45)] backdrop-blur-xl z-30 animate-in fade-in slide-in-from-bottom-2 duration-150 whitespace-nowrap">
                          {[
                            { type: 'like', emoji: '👍' },
                            { type: 'love', emoji: '❤️' },
                            { type: 'haha', emoji: '😆' },
                            { type: 'sad', emoji: '😢' },
                            { type: 'munajat', emoji: '🤲' },
                          ].map((react) => (
                            <button
                              key={react.type}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleReaction(post, react.type as any);
                                setReactionPanelPostId(null);
                              }}
                              className="text-lg sm:text-xl transform hover:scale-125 active:scale-110 transition-transform duration-150 p-1 sm:p-1.5 cursor-pointer select-none rounded-full hover:bg-white/10"
                            >
                              <span>{react.emoji}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Comment Button */}
                    <button
                      onClick={() => setActiveCommentPostId(post.id)}
                      className="py-2 text-slate-400 hover:text-cyan-400 hover:bg-slate-900/80 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span>Comment</span>
                    </button>

                    {/* Share Button */}
                    <button
                      onClick={() => handleSharePost(post)}
                      className="py-2 text-slate-400 hover:text-blue-400 hover:bg-slate-900/80 rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Share</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          }}
        />
      ) : null}
    </div>
  </div>

      {/* CREATE POST MODAL */}
      {showCreateModal && (
        <PulseCreatePostModal
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          onClose={() => {
            setShowCreateModal(false);
            if (onClearPreSelectedMatch) onClearPreSelectedMatch();
          }}
          preSelectedLeagueMatch={preSelectedMatch}
        />
      )}

      {/* COMMENTS MODAL */}
      {activeCommentPostId && (
        <PulseCommentsModal
          postId={activeCommentPostId}
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          allUsersMap={allUsersMap}
          onClose={() => setActiveCommentPostId(null)}
        />
      )}

      {/* FACEBOOK-STYLE REACTION BREAKDOWN MODAL */}
      {showReactionsBreakdownPost && (() => {
        const breakdownCounts = {
          like: 0,
          love: 0,
          haha: 0,
          sad: 0,
          munajat: 0
        };
        if (showReactionsBreakdownPost.reactions) {
          Object.values(showReactionsBreakdownPost.reactions).forEach((type) => {
            if (type in breakdownCounts) {
              breakdownCounts[type as keyof typeof breakdownCounts]++;
            }
          });
        } else if (showReactionsBreakdownPost.likes && showReactionsBreakdownPost.likes.length > 0) {
          breakdownCounts.like = showReactionsBreakdownPost.likes.length;
        }

        const totalReactions = breakdownCounts.like + breakdownCounts.love + breakdownCounts.haha + breakdownCounts.sad + breakdownCounts.munajat;

        return (
          <div className="fixed inset-0 z-[130] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#080d1e]/95 border border-cyan-500/40 rounded-2xl max-w-sm w-full shadow-[0_0_50px_rgba(6,182,212,0.3)] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-white/5 bg-[#0a1126]">
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                  <span>Reactions</span>
                  <span className="text-xs bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 px-2 py-0.5 rounded-full">
                    {totalReactions}
                  </span>
                </h3>
                <button
                  onClick={() => setShowReactionsBreakdownPost(null)}
                  className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content / List of each reaction with counter inside a single row */}
              <div className="p-4 font-mono">
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { type: 'like', emoji: '👍', count: breakdownCounts.like, bg: 'bg-blue-600/10 border-blue-500/20 text-blue-400' },
                    { type: 'love', emoji: '❤️', count: breakdownCounts.love, bg: 'bg-pink-600/10 border-pink-500/20 text-pink-400' },
                    { type: 'haha', emoji: '😆', count: breakdownCounts.haha, bg: 'bg-amber-500/10 border-amber-500/20 text-amber-400' },
                    { type: 'sad', emoji: '😢', count: breakdownCounts.sad, bg: 'bg-yellow-600/10 border-yellow-500/20 text-yellow-400' },
                    { type: 'munajat', emoji: '🤲', count: breakdownCounts.munajat, bg: 'bg-cyan-600/10 border-cyan-500/20 text-cyan-400' },
                  ].map((row) => (
                    <div 
                      key={row.type}
                      className={`flex flex-col items-center justify-center p-1.5 rounded-lg border ${row.bg} transition-all duration-200 hover:scale-[1.05] gap-0.5`}
                    >
                      <span className="text-lg select-none animate-pulse">{row.emoji}</span>
                      <span className="text-[10px] font-bold tracking-wider">{row.count}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="px-5 py-3.5 border-t border-white/5 bg-[#0a1126] text-center">
                <button
                  onClick={() => setShowReactionsBreakdownPost(null)}
                  className="w-full py-2 bg-slate-900 hover:bg-slate-800 border border-white/10 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* LIGHTBOX IMAGE PREVIEW MODAL */}
      {imagePreviewUrl && (
        <div 
          className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-lg flex items-center justify-center p-4"
          onClick={() => setImagePreviewUrl(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <button
              onClick={() => setImagePreviewUrl(null)}
              className="absolute -top-12 right-0 bg-slate-900 border border-white/20 text-white p-2 rounded-full hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
            <img loading="lazy" 
              src={imagePreviewUrl} 
              alt="Preview" 
              className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.35)]" 
            />
          </div>
        </div>
      )}

      {/* CUSTOM POST DELETE CONFIRMATION MODAL */}
      {postToDelete && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#080d1e] border border-rose-500/50 rounded-2xl max-w-sm w-full p-5 shadow-[0_0_50px_rgba(244,63,94,0.3)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 shrink-0">
                <Trash2 className="w-6 h-6 text-rose-400 animate-pulse" />
              </div>
              <div>
                <h3 className="text-sm font-black font-mono tracking-wide text-white uppercase">
                  Delete Pulse Post?
                </h3>
                <p className="text-[11px] text-slate-400">
                  This post will be permanently removed.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/90 border border-white/5 rounded-xl p-3 text-xs text-slate-300 line-clamp-3 italic">
              "{postToDelete.text || 'Tagged Match / Image Post'}"
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isDeletingPost}
                onClick={() => setPostToDelete(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingPost}
                onClick={handleConfirmDeletePost}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-xs font-black font-mono tracking-wider text-white shadow-[0_0_20px_rgba(244,63,94,0.4)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isDeletingPost ? (
                  <span>Deleting...</span>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM POST REPORT CONFIRMATION MODAL */}
      {postToReport && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-[#080d1e] border border-amber-500/50 rounded-2xl max-w-sm w-full p-5 shadow-[0_0_50px_rgba(245,158,11,0.25)] space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 shrink-0">
                <Flag className="w-6 h-6 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-black font-mono tracking-wide text-white uppercase">
                  Report This Post?
                </h3>
                <p className="text-[11px] text-slate-400">
                  Our admin moderation team will review it.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/90 border border-white/5 rounded-xl p-3 text-xs text-slate-300 line-clamp-3 italic">
              "{postToReport.text || 'Post from ' + postToReport.userName}"
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isSubmittingReport}
                onClick={() => setPostToReport(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSubmittingReport}
                onClick={handleConfirmReportPost}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-xs font-black font-mono tracking-wider text-black shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              >
                {isSubmittingReport ? (
                  <span>Submitting...</span>
                ) : (
                  <>
                    <Flag className="w-3.5 h-3.5" />
                    <span>Submit Report</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FLOATING ACTION TOAST BANNER */}
      {toastMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-[150] bg-[#060a18]/95 border border-cyan-500/60 text-cyan-300 px-4 py-2.5 rounded-full shadow-[0_0_30px_rgba(6,182,212,0.4)] backdrop-blur-xl font-mono text-xs font-bold flex items-center gap-2 animate-bounce">
          <Sparkles className="w-4 h-4 text-cyan-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* USER / HOST PROFILE MODAL */}
      {selectedUserProfileId && selectedUserProfileView === 'host' ? (
        <HostProfileModal
          hostId={selectedUserProfileId}
          currentUserProfile={currentUserProfile}
          onClose={() => setSelectedUserProfileId(null)}
          onSelectEvent={(event, type) => {
            if (type === 'tournament' && onSelectTournament) onSelectTournament(event.id);
            if (type === 'league' && onSelectLeagueMatch) onSelectLeagueMatch(event.id);
            if (type === 'lone_wolf' && onSelectLoneWolfMatch) onSelectLoneWolfMatch(event.id);
          }}
        />
      ) : selectedUserProfileId ? (
        <PulseUserProfileModal
          userId={selectedUserProfileId}
          currentUserId={currentUserId}
          currentUserProfile={currentUserProfile}
          allUsersMap={allUsersMap}
          initialProfileView={selectedUserProfileView}
          onClose={() => setSelectedUserProfileId(null)}
          onSelectTournament={onSelectTournament}
          onSelectLeagueMatch={onSelectLeagueMatch}
          onSelectLoneWolfMatch={onSelectLoneWolfMatch}
          onOpenComments={(postId) => setActiveCommentPostId(postId)}
        />
      ) : null}

    </div>
  );
};
