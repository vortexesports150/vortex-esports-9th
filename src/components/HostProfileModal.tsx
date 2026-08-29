import React, { useEffect, useState } from 'react';
import { 
  X, 
  ArrowLeft,
  UserCheck, 
  UserPlus, 
  Trophy, 
  Gamepad2, 
  Swords, 
  Users, 
  Calendar, 
  CheckCircle2, 
  Sparkles, 
  MapPin, 
  Flame, 
  Loader2,
  Share2,
  Medal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  doc, 
  getDoc, 
  setDoc, 
  deleteDoc, 
  onSnapshot,
  serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';

interface HostProfileModalProps {
  hostId: string;
  hostName?: string;
  hostPhotoUrl?: string;
  currentUserProfile: UserProfile | null;
  onClose: () => void;
  onSelectEvent?: (event: any, type: 'tournament' | 'league' | 'lone_wolf') => void;
}

export const validateSocialMediaLink = (
  platform: 'facebook' | 'youtube' | 'tiktok',
  value: string
): { isValid: boolean; errorMessage?: string } => {
  if (!value || !value.trim()) {
    return { isValid: true };
  }

  const clean = value.trim();

  if (/\s/.test(clean)) {
    return { 
      isValid: false, 
      errorMessage: `Spaces are not allowed in ${platform} link or username.` 
    };
  }

  if (/^(https?:\/\/|www\.)/i.test(clean)) {
    try {
      const urlString = clean.toLowerCase().startsWith('www.') ? `https://${clean}` : clean;
      const parsed = new URL(urlString);
      const hostname = parsed.hostname.toLowerCase();

      if (platform === 'facebook') {
        if (!hostname.includes('facebook.com') && !hostname.includes('fb.com') && !hostname.includes('fb.watch')) {
          return { 
            isValid: false, 
            errorMessage: 'Invalid Facebook link! Must be a valid facebook.com or fb.com link.' 
          };
        }
      } else if (platform === 'youtube') {
        if (!hostname.includes('youtube.com') && !hostname.includes('youtu.be')) {
          return { 
            isValid: false, 
            errorMessage: 'Invalid YouTube link! Must be a valid youtube.com or youtu.be link.' 
          };
        }
      } else if (platform === 'tiktok') {
        if (!hostname.includes('tiktok.com')) {
          return { 
            isValid: false, 
            errorMessage: 'Invalid TikTok link! Must be a valid tiktok.com link.' 
          };
        }
      }

      return { isValid: true };
    } catch {
      return { 
        isValid: false, 
        errorMessage: `Invalid ${platform} URL structure.` 
      };
    }
  }

  if (platform === 'facebook') {
    if (!/^[a-zA-Z0-9._\/-]+$/.test(clean)) {
      return { 
        isValid: false, 
        errorMessage: 'Invalid Facebook username/page format.' 
      };
    }
  } else if (platform === 'youtube') {
    if (!/^@?[a-zA-Z0-9._\/-]+$/.test(clean)) {
      return { 
        isValid: false, 
        errorMessage: 'Invalid YouTube channel handle format.' 
      };
    }
  } else if (platform === 'tiktok') {
    if (!/^@?[a-zA-Z0-9._-]+$/.test(clean)) {
      return { 
        isValid: false, 
        errorMessage: 'Invalid TikTok username format.' 
      };
    }
  }

  return { isValid: true };
};

export const formatSocialUrl = (input: string, platform: 'facebook' | 'youtube' | 'tiktok') => {
  if (!input) return '';
  let clean = input.trim();
  if (clean.startsWith('http://') || clean.startsWith('https://')) {
    return clean;
  }
  clean = clean.replace(/^@/, '');
  if (platform === 'facebook') {
    return `https://facebook.com/${clean}`;
  }
  if (platform === 'youtube') {
    return `https://youtube.com/@${clean}`;
  }
  if (platform === 'tiktok') {
    return `https://tiktok.com/@${clean}`;
  }
  return `https://${clean}`;
};

export function HostProfileModal({
  hostId,
  hostName,
  hostPhotoUrl,
  currentUserProfile,
  onClose,
  onSelectEvent
}: HostProfileModalProps) {
  const currentUserId = currentUserProfile?.userId;

  const [effectiveHostId, setEffectiveHostId] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    if (isMounted) setEffectiveHostId(hostId);
    return () => { isMounted = false; };
  }, [hostId]);

  // Host Data State
  const [hostData, setHostData] = useState<any>(null);
  const [loadingHost, setLoadingHost] = useState(true);

  // Stats State
  const [completedLeaguesCount, setCompletedLeaguesCount] = useState(0);
  const [completedTourneysCount, setCompletedTourneysCount] = useState(0);
  const [completedLoneWolfCount, setCompletedLoneWolfCount] = useState(0);

  // Follow State
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followingLoading, setFollowingLoading] = useState(false);

  // Active / Past Hosted Events
  const [activeTab, setActiveTab] = useState<'events' | 'completed'>('events');
  const [hostedLeagues, setHostedLeagues] = useState<any[]>([]);
  const [hostedTourneys, setHostedTourneys] = useState<any[]>([]);
  const [hostedLoneWolf, setHostedLoneWolf] = useState<any[]>([]);
  const [loadingEvents, setLoadingEvents] = useState(true);

  // Fullscreen Image Preview Modal (Profile picture & Cover photo)
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; title?: string } | null>(null);

  // 1. Fetch Host User / Brand details
  useEffect(() => {
    if (!effectiveHostId) return;

    let isMounted = true;
    setLoadingHost(true);

    const fetchHostDetails = async () => {
      try {
        // Try user doc
        const userRef = doc(db, 'users', effectiveHostId);
        const userSnap = await getDoc(userRef);

        // Try host brand doc
        const brandRef = doc(db, 'host_brands', effectiveHostId);
        const brandSnap = await getDoc(brandRef);

        if (isMounted) {
          let resolvedData: any = {
            displayName: hostName || 'Host Organizer',
            photoURL: hostPhotoUrl || null,
            coverPhotoUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
            brandName: hostName || '',
            bio: 'Official Esports Tournament Host on PlayVear.',
          };

          if (userSnap.exists()) {
            const u = userSnap.data();
            resolvedData = {
              ...resolvedData,
              displayName: u.displayName || u.gameName || resolvedData.displayName,
              photoURL: u.photoURL || resolvedData.photoURL,
              email: u.email,
              gamingUid: u.gamingUid,
              country: u.country || 'Bangladesh',
              facebookUrl: u.facebookUrl || '',
              youtubeUrl: u.youtubeUrl || '',
              tiktokUrl: u.tiktokUrl || '',
              createdAt: u.createdAt,
            };
          }

          if (brandSnap.exists()) {
            const b = brandSnap.data();
            resolvedData = {
              ...resolvedData,
              brandName: b.brandName || resolvedData.brandName,
              displayName: b.brandName || resolvedData.displayName,
              photoURL: b.logoUrl || resolvedData.photoURL,
              coverPhotoUrl: b.brandCoverUrl || b.bannerUrl || b.coverPhotoUrl || resolvedData.coverPhotoUrl,
              facebookUrl: b.facebookUrl || resolvedData.facebookUrl || '',
              youtubeUrl: b.youtubeUrl || resolvedData.youtubeUrl || '',
              tiktokUrl: b.tiktokUrl || resolvedData.tiktokUrl || '',
              bio: b.bio || resolvedData.bio,
            };
          }



          setHostData(resolvedData);
        }
      } catch (err) {
        console.error('Error loading host details:', err);
      } finally {
        if (isMounted) setLoadingHost(false);
      }
    };

    fetchHostDetails();

    return () => { isMounted = false; };
  }, [effectiveHostId, hostName, hostPhotoUrl]);

  // 2. Real-time Followers & Following listener
  useEffect(() => {
    if (!effectiveHostId) return;

    // Follower count for this host
    const followersQ = query(collection(db, 'user_follows'), where('hostId', '==', effectiveHostId));
    const unsubFollowers = onSnapshot(followersQ, (snap) => {
      setFollowersCount(snap.docs.length);
    }, (err) => console.error("Followers snap error:", err));

    // Following count for this host (if this host follows others)
    const followingQ = query(collection(db, 'user_follows'), where('userId', '==', effectiveHostId));
    const unsubFollowing = onSnapshot(followingQ, (snap) => {
      setFollowingCount(snap.docs.length);
    }, (err) => console.error("Following snap error:", err));

    // Check if current user follows this host
    let unsubUserFollow = () => {};
    if (currentUserId) {
      const q = query(
        collection(db, 'user_follows'),
        where('hostId', '==', effectiveHostId)
      );
      unsubUserFollow = onSnapshot(q, (snap) => {
        const followed = snap.docs.some(d => {
          const data = d.data();
          return (data.followerId === currentUserId || data.userId === currentUserId) && (data.targetType === 'host' || data.type === 'host' || !data.targetType);
        });
        setIsFollowing(followed);
      });
    }

    return () => {
      unsubFollowers();
      unsubFollowing();
      unsubUserFollow();
    };
  }, [effectiveHostId, currentUserId]);

  // 3. Fetch Completed Events Stats and Active Hosted Events
  useEffect(() => {
    if (!effectiveHostId) return;

    let isMounted = true;
    setLoadingEvents(true);

    const fetchHostedEvents = async () => {
      try {
        // A. Pro Hosted Leagues
        const leaguesQ = query(collection(db, 'pro_hosted_leagues'), where('hostId', '==', effectiveHostId));
        const leaguesSnap = await getDocs(leaguesQ);
        const leaguesList: any[] = [];
        let completedLeagues = 0;

        leaguesSnap.docs.forEach((d) => {
          const lData = { id: d.id, ...d.data() } as any;
          leaguesList.push(lData);
          if (lData.status === 'completed' || lData.status === 'Completed' || lData.isPrizeDistributed === true) {
            completedLeagues++;
          }
        });

        // B. Free Fire Tournaments
        const tourneysQ = query(collection(db, 'tournaments_freefire'), where('hostId', '==', effectiveHostId));
        const tourneysSnap = await getDocs(tourneysQ);
        const tourneysList: any[] = [];
        let completedTourneys = 0;

        tourneysSnap.docs.forEach((d) => {
          const tData = { id: d.id, ...d.data() } as any;
          tourneysList.push(tData);
          if (tData.status === 'Ended' || tData.status === 'Completed' || tData.status === 'Played') {
            completedTourneys++;
          }
        });

        // C. Lone Wolf Matches
        const loneWolfQ = query(collection(db, 'lone_wolf_matches'), where('hostId', '==', effectiveHostId));
        const loneWolfSnap = await getDocs(loneWolfQ);
        const loneWolfList: any[] = [];
        let completedLW = 0;

        loneWolfSnap.docs.forEach((d) => {
          const lwData = { id: d.id, ...d.data() } as any;
          loneWolfList.push(lwData);
          if (
            lwData.status === 'completed' || 
            lwData.isCompleted === true || 
            lwData.approvalStatus === 'approved'
          ) {
            completedLW++;
          }
        });

        if (isMounted) {
          setHostedLeagues(leaguesList);
          setHostedTourneys(tourneysList);
          setHostedLoneWolf(loneWolfList);

          setCompletedLeaguesCount(completedLeagues);
          setCompletedTourneysCount(completedTourneys);
          setCompletedLoneWolfCount(completedLW);
        }
      } catch (err) {
        console.error('Error fetching host events stats:', err);
      } finally {
        if (isMounted) setLoadingEvents(false);
      }
    };

    fetchHostedEvents();

    return () => { isMounted = false; };
  }, [effectiveHostId]);

  // Handle Follow / Unfollow Toggle
  const handleToggleFollow = async () => {
    if (!currentUserId) {
      alert('Please log in to follow hosts!');
      return;
    }
    if (currentUserId === effectiveHostId) {
      alert('You cannot follow yourself!');
      return;
    }

    setFollowingLoading(true);
    const followDocId = `${currentUserId}_${effectiveHostId}`;
    const followRef = doc(db, 'user_follows', followDocId);

    try {
      if (isFollowing) {
        // Delete the deterministic documents
        await deleteDoc(followRef).catch(() => {});
        const legacyDocKey = `${currentUserId}_host_${effectiveHostId}`;
        await deleteDoc(doc(db, 'user_follows', legacyDocKey)).catch(() => {});

        // Query and delete all other matching records in user_follows (e.g. from cards with random IDs)
        const q = query(
          collection(db, 'user_follows'),
          where('hostId', '==', effectiveHostId)
        );
        const snap = await getDocs(q);
        const matches = snap.docs.filter(d => {
          const data = d.data();
          const matchesUser = data.followerId === currentUserId || data.userId === currentUserId;
          const matchesType = data.targetType === 'host' || data.type === 'host' || !data.targetType;
          return matchesUser && matchesType;
        });

        const deletePromises = matches.map(d => deleteDoc(doc(db, 'user_follows', d.id)).catch(() => {}));
        await Promise.all(deletePromises);
      } else {
        await setDoc(followRef, {
          // Schema A (Pulse Feed & User Profile Modal)
          followerId: currentUserId,
          hostId: effectiveHostId,
          targetType: 'host',
          targetName: hostData?.displayName || hostName || 'Host',
          followerName: currentUserProfile?.gameName || currentUserProfile?.displayName || 'Gamer',
          followerPhoto: currentUserProfile?.photoURL || '',

          // Schema B (Legacy HostFollowButton)
          userId: currentUserId,
          type: 'host',
          hostName: hostData?.displayName || hostName || 'Host',
          hostPhotoUrl: hostData?.photoURL || hostPhotoUrl || null,
          createdAt: serverTimestamp(),
        });
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
      alert('Action failed. Please try again.');
    } finally {
      setFollowingLoading(false);
    }
  };

  const totalCompletedEvents = completedLeaguesCount + completedTourneysCount + completedLoneWolfCount;

  // Filter Active vs Completed events
  const activeLeagues = hostedLeagues.filter(l => l.status !== 'completed' && l.status !== 'Completed');
  const activeTourneys = hostedTourneys.filter(t => t.status !== 'Ended' && t.status !== 'Completed' && t.status !== 'Played');
  const activeLoneWolf = hostedLoneWolf.filter(lw => lw.status !== 'completed' && lw.isCompleted !== true);

  const pastLeagues = hostedLeagues.filter(l => l.status === 'completed' || l.status === 'Completed' || l.isPrizeDistributed === true);
  const pastTourneys = hostedTourneys.filter(t => t.status === 'Ended' || t.status === 'Completed' || t.status === 'Played');
  const pastLoneWolf = hostedLoneWolf.filter(lw => lw.status === 'completed' || lw.isCompleted === true);

  if (!effectiveHostId) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] bg-[#04060e] overflow-y-auto w-full h-full min-h-screen flex flex-col">
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 15 }}
          className="bg-[#060a17] w-full max-w-4xl mx-auto min-h-screen relative flex flex-col sm:border-x sm:border-cyan-500/20 shadow-2xl pb-12"
        >
          {loadingHost ? (
            <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] space-y-4">
              <div className="w-12 h-12 border-4 border-cyan-500/30 border-t-cyan-400 rounded-full animate-spin shadow-[0_0_15px_rgba(6,182,212,0.5)]" />
              <p className="text-cyan-400 font-mono text-sm animate-pulse tracking-widest uppercase font-black">Loading Host Profile...</p>
            </div>
          ) : (
            <>
          {/* Top Bar Navigation for Mobile & Desktop Full Screen */}
          <div className="sticky top-0 z-30 bg-[#060a17]/90 backdrop-blur-md border-b border-cyan-500/20 px-4 py-3 flex items-center justify-between">
            <button
              onClick={onClose}
              className="flex items-center gap-2 text-cyan-400 hover:text-cyan-300 font-bold font-mono text-xs uppercase tracking-wider bg-cyan-950/60 border border-cyan-500/30 px-3 py-1.5 rounded-xl hover:bg-cyan-900/60 transition-all cursor-pointer shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
            <span className="text-xs font-black text-white font-mono uppercase tracking-widest truncate max-w-[200px]">
              {hostData?.displayName || hostName || 'Host Profile'}
            </span>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-900/80 border border-white/20 text-slate-300 hover:text-white flex items-center justify-center hover:bg-slate-800 transition-all cursor-pointer shadow"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Banner / Cover Photo Header */}
          <div 
            onClick={() => {
              const coverUrl = hostData?.coverPhotoUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80';
              setPreviewImageModal({
                url: coverUrl,
                title: `${hostData?.displayName || hostName || 'Host'}'s Cover Photo`
              });
            }}
            className="relative h-44 sm:h-60 w-full bg-slate-950 overflow-hidden shrink-0 cursor-pointer group"
            title="Click to preview cover photo"
          >
            <img
              src={hostData?.coverPhotoUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'}
              alt="Host Cover"
              className="w-full h-full object-cover opacity-80 group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#060a17] via-[#060a17]/40 to-transparent" />
            <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-cyan-400 via-blue-500 to-pink-500" />
            
            {/* Total Verified Host Badge Top Left */}
            <div className="absolute top-3 left-3 bg-slate-950/80 backdrop-blur-md border border-cyan-500/30 px-3 py-1 rounded-full flex items-center gap-1.5 shadow-md">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="text-[10px] font-black uppercase tracking-wider text-cyan-300 font-mono">
                Tournament Organizer
              </span>
            </div>
          </div>

          {/* Profile Header Info Overlay */}
          <div className="px-4 sm:px-6 -mt-14 sm:-mt-16 relative z-10 space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-3 sm:gap-4">
              
              {/* Host Avatar & Name */}
              <div className="flex items-end gap-3 sm:gap-4">
                <div 
                  onClick={(e) => {
                    e.stopPropagation();
                    const avatarUrl = hostData?.photoURL || hostPhotoUrl || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80';
                    setPreviewImageModal({
                      url: avatarUrl,
                      title: `${hostData?.displayName || hostName || 'Host'}'s Profile Picture`
                    });
                  }}
                  className="relative shrink-0 cursor-pointer group"
                  title="Click to preview profile picture"
                >
                  <img
                    src={hostData?.photoURL || hostPhotoUrl || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80'}
                    alt={hostData?.displayName || 'Host'}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 border-cyan-400 object-cover shadow-[0_0_20px_rgba(6,182,212,0.3)] bg-slate-900 group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute -bottom-1 -right-1 bg-cyan-500 text-slate-950 p-1 rounded-lg border border-cyan-300 shadow">
                    <CheckCircle2 className="w-3.5 h-3.5 font-bold" />
                  </div>
                </div>

                <div className="mb-1 space-y-0.5 min-w-0">
                  <h2 className="text-lg sm:text-xl font-black text-white tracking-wide font-mono flex items-center gap-2 truncate">
                    <span>{hostData?.displayName || hostName || 'Host Organizer'}</span>
                  </h2>
                  <p className="text-[11px] text-cyan-400 font-mono font-medium truncate">
                    {hostData?.brandName ? `@${hostData.brandName}` : `@host_${effectiveHostId.slice(0, 6)}`}
                  </p>
                  {hostData?.country && (
                    <p className="text-[10px] text-slate-400 font-sans flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <span>{hostData.country}</span>
                    </p>
                  )}

                  {/* Social Media Links Badges */}
                  {(hostData?.facebookUrl || hostData?.youtubeUrl || hostData?.tiktokUrl) && (
                    <div className="flex items-center gap-2 pt-1 flex-wrap">
                      {hostData?.facebookUrl && (
                        <a
                          href={formatSocialUrl(hostData.facebookUrl, 'facebook')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1877F2]/15 border border-[#1877F2]/40 text-[#1877F2] hover:bg-[#1877F2]/25 hover:border-[#1877F2] text-[11px] font-bold transition-all shadow-[0_0_12px_rgba(24,119,242,0.2)]"
                          title="Open Facebook Profile / Page"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                          </svg>
                          <span>Facebook</span>
                        </a>
                      )}
                      {hostData?.youtubeUrl && (
                        <a
                          href={formatSocialUrl(hostData.youtubeUrl, 'youtube')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#FF0000]/15 border border-[#FF0000]/40 text-[#FF0000] hover:bg-[#FF0000]/25 hover:border-[#FF0000] text-[11px] font-bold transition-all shadow-[0_0_12px_rgba(255,0,0,0.2)]"
                          title="Open YouTube Channel"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                          </svg>
                          <span>YouTube</span>
                        </a>
                      )}
                      {hostData?.tiktokUrl && (
                        <a
                          href={formatSocialUrl(hostData.tiktokUrl, 'tiktok')}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#00f2fe]/15 border border-[#00f2fe]/40 text-[#00f2fe] hover:bg-[#00f2fe]/25 hover:border-[#00f2fe] text-[11px] font-bold transition-all shadow-[0_0_12px_rgba(0,242,254,0.2)]"
                          title="Open TikTok Account"
                        >
                          <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                            <path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.98-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.82.57-1.31 1.54-1.3 2.53 0 .82.38 1.62 1.02 2.13.7.58 1.65.81 2.54.67 1.05-.14 1.99-.86 2.37-1.85.17-.46.23-.96.22-1.46.02-4.29.01-8.58.01-12.87z"/>
                          </svg>
                          <span>TikTok</span>
                        </a>
                      )}
                    </div>
                  )}
                </div>
              </div>


            </div>

            {/* Followers Stats Row */}
            <div className="flex items-center justify-between pt-1 border-b border-white/[0.08] pb-3">
              <div className="flex items-center gap-2">
                {/* Followers component */}
                <div className="flex items-center gap-1 bg-cyan-950/40 border border-cyan-500/20 px-2.5 py-1 rounded-lg shadow-sm">
                  <span className="text-[10px] font-black text-cyan-300 font-mono">{followersCount}</span>
                  <span className="text-[10px] text-slate-300 font-sans font-bold">Followers</span>
                </div>
                {/* Small Follow/Following Button */}
                {currentUserId && currentUserId !== effectiveHostId && (
                  <button
                    onClick={handleToggleFollow}
                    disabled={followingLoading}
                    className={`text-[10px] font-black uppercase tracking-wider px-2.5 py-1 rounded-lg transition-all cursor-pointer flex items-center gap-1 shadow-sm ${
                      isFollowing
                        ? 'bg-red-950/20 border border-red-500/30 text-red-500 hover:bg-red-950/45 hover:border-red-400 hover:text-red-400 shadow-[0_0_8px_rgba(239,68,68,0.15)]'
                        : 'bg-red-950/10 border border-red-500/20 text-red-400 hover:bg-red-950/30 hover:border-red-400 hover:text-red-300 shadow-[0_0_8px_rgba(239,68,68,0.1)]'
                    }`}
                  >
                    {followingLoading ? (
                      <Loader2 className="w-3 h-3 animate-spin text-current" />
                    ) : isFollowing ? (
                      <>
                        <UserCheck className="w-3 h-3 text-red-500" />
                        <span>Following</span>
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3 h-3 text-red-400" />
                        <span>Follow</span>
                      </>
                    )}
                  </button>
                )}
              </div>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-1 rounded-lg flex items-center gap-1 shadow-sm">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>{totalCompletedEvents} Events Completed</span>
                </span>
              </div>
            </div>

            {/* Event Completion Statistics Cards Grid */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3 pt-1">
              {/* Leagues Card */}
              <div className="bg-[#0a0f24] border border-cyan-500/20 p-2.5 sm:p-3 rounded-xl flex flex-col items-center justify-center text-center shadow-inner">
                <div className="w-7 h-7 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 mb-1 border border-cyan-500/20">
                  <Trophy className="w-3.5 h-3.5" />
                </div>
                <span className="text-base sm:text-lg font-black text-white font-mono leading-tight">
                  {completedLeaguesCount}
                </span>
                <span className="text-[9px] text-slate-400 font-sans uppercase font-bold tracking-tight">
                  Leagues Done
                </span>
              </div>

              {/* Tournaments Card */}
              <div className="bg-[#0a0f24] border border-cyan-500/20 p-2.5 sm:p-3 rounded-xl flex flex-col items-center justify-center text-center shadow-inner">
                <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 mb-1 border border-blue-500/20">
                  <Gamepad2 className="w-3.5 h-3.5" />
                </div>
                <span className="text-base sm:text-lg font-black text-white font-mono leading-tight">
                  {completedTourneysCount}
                </span>
                <span className="text-[9px] text-slate-400 font-sans uppercase font-bold tracking-tight">
                  Tourneys Done
                </span>
              </div>

              {/* Lone Wolf Matches Card */}
              <div className="bg-[#0a0f24] border border-cyan-500/20 p-2.5 sm:p-3 rounded-xl flex flex-col items-center justify-center text-center shadow-inner">
                <div className="w-7 h-7 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-400 mb-1 border border-pink-500/20">
                  <Swords className="w-3.5 h-3.5" />
                </div>
                <span className="text-base sm:text-lg font-black text-white font-mono leading-tight">
                  {completedLoneWolfCount}
                </span>
                <span className="text-[9px] text-slate-400 font-sans uppercase font-bold tracking-tight">
                  Lone Wolf Done
                </span>
              </div>
            </div>

            {/* Tabs Selector: Active Events vs Completed Events */}
            <div className="flex items-center gap-2 border-b border-white/10 pt-2 pb-0">
              <button
                onClick={() => setActiveTab('events')}
                className={`pb-2 text-xs font-bold font-mono tracking-wider flex items-center gap-1.5 transition-all border-b-2 cursor-pointer ${
                  activeTab === 'events'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Flame className="w-3.5 h-3.5" />
                <span>Active Events ({activeLeagues.length + activeTourneys.length + activeLoneWolf.length})</span>
              </button>

              <button
                onClick={() => setActiveTab('completed')}
                className={`pb-2 text-xs font-bold font-mono tracking-wider flex items-center gap-1.5 transition-all border-b-2 cursor-pointer ${
                  activeTab === 'completed'
                    ? 'border-cyan-400 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <Medal className="w-3.5 h-3.5 text-emerald-400" />
                <span>Completed ({pastLeagues.length + pastTourneys.length + pastLoneWolf.length})</span>
              </button>
            </div>
          </div>

          {/* Events Content List */}
          <div className="p-4 sm:p-6 overflow-y-auto space-y-3 flex-1 min-h-[220px]">
            {loadingEvents ? (
              <div className="flex flex-col items-center justify-center py-10 text-cyan-400 space-y-2">
                <Loader2 className="w-6 h-6 animate-spin" />
                <span className="text-xs font-mono">Loading host tournaments...</span>
              </div>
            ) : activeTab === 'events' ? (
              /* Active Events List */
              (activeLeagues.length === 0 && activeTourneys.length === 0 && activeLoneWolf.length === 0) ? (
                <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl p-4 bg-slate-950/40">
                  <Calendar className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-sans">This host currently has no upcoming or registration events.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Active Leagues */}
                  {activeLeagues.map((l) => (
                    <div
                      key={l.id}
                      onClick={() => onSelectEvent && onSelectEvent(l, 'league')}
                      className="bg-[#0b1227] hover:bg-[#0e1733] border border-cyan-500/20 hover:border-cyan-400/50 p-3 rounded-xl flex items-center justify-between gap-3 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/25 flex items-center justify-center text-cyan-400 shrink-0">
                          <Trophy className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white group-hover:text-cyan-300 truncate block font-mono">
                            {l.brandName || l.leagueName || 'Pro League'}
                          </span>
                          <span className="text-[9.5px] text-slate-400 block font-sans">
                            Season #{l.seasonNumber || '1'} • Fee: {l.entryFee || 0} Tokens
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2.5 py-1 rounded-full uppercase font-mono shrink-0">
                        {l.status || 'Active'}
                      </span>
                    </div>
                  ))}

                  {/* Active Tournaments */}
                  {activeTourneys.map((t) => (
                    <div
                      key={t.id}
                      onClick={() => onSelectEvent && onSelectEvent(t, 'tournament')}
                      className="bg-[#0b1227] hover:bg-[#0e1733] border border-blue-500/20 hover:border-blue-400/50 p-3 rounded-xl flex items-center justify-between gap-3 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-blue-500/10 border border-blue-500/25 flex items-center justify-center text-blue-400 shrink-0">
                          <Gamepad2 className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white group-hover:text-blue-300 truncate block font-mono">
                            {t.title || 'Free Fire Tournament'}
                          </span>
                          <span className="text-[9.5px] text-slate-400 block font-sans">
                            {t.map || 'Bermuda'} • {t.time || '10:00 PM'} • Fee: {t.entryFee || 0} Tokens
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2.5 py-1 rounded-full uppercase font-mono shrink-0">
                        {t.status || 'Open'}
                      </span>
                    </div>
                  ))}

                  {/* Active Lone Wolf */}
                  {activeLoneWolf.map((lw) => (
                    <div
                      key={lw.id}
                      onClick={() => onSelectEvent && onSelectEvent(lw, 'lone_wolf')}
                      className="bg-[#0b1227] hover:bg-[#0e1733] border border-pink-500/20 hover:border-pink-400/50 p-3 rounded-xl flex items-center justify-between gap-3 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-lg bg-pink-500/10 border border-pink-500/25 flex items-center justify-center text-pink-400 shrink-0">
                          <Swords className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-white group-hover:text-pink-300 truncate block font-mono">
                            {lw.title || 'Lone Wolf 1v1 Match'}
                          </span>
                          <span className="text-[9.5px] text-slate-400 block font-sans">
                            Prize: {lw.prizePool || 0} Tokens • Fee: {lw.entryFee || 0} Tokens
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-pink-400 bg-pink-500/10 border border-pink-500/20 px-2.5 py-1 rounded-full uppercase font-mono shrink-0">
                        {lw.status || 'Registration'}
                      </span>
                    </div>
                  ))}
                </div>
              )
            ) : (
              /* Completed Events List */
              (pastLeagues.length === 0 && pastTourneys.length === 0 && pastLoneWolf.length === 0) ? (
                <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl p-4 bg-slate-950/40">
                  <CheckCircle2 className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-xs text-slate-400 font-sans">No completed tournaments or leagues recorded yet for this host.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {pastLeagues.map((l) => (
                    <div
                      key={l.id}
                      className="bg-[#080d1e] border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <Trophy className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-200 truncate block font-mono">
                            {l.brandName || l.leagueName || 'Pro League'}
                          </span>
                          <span className="text-[9.5px] text-slate-500 block font-sans">
                            League Season Completed & Prizes Distributed
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase font-mono shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Completed</span>
                      </span>
                    </div>
                  ))}

                  {pastTourneys.map((t) => (
                    <div
                      key={t.id}
                      className="bg-[#080d1e] border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <Gamepad2 className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-200 truncate block font-mono">
                            {t.title || 'Free Fire Tournament'}
                          </span>
                          <span className="text-[9.5px] text-slate-500 block font-sans">
                            Tournament Completed & Results Approved
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase font-mono shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Ended</span>
                      </span>
                    </div>
                  ))}

                  {pastLoneWolf.map((lw) => (
                    <div
                      key={lw.id}
                      className="bg-[#080d1e] border border-emerald-500/20 p-3 rounded-xl flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                          <Swords className="w-3.5 h-3.5" />
                        </div>
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-200 truncate block font-mono">
                            {lw.title || 'Lone Wolf 1v1 Match'}
                          </span>
                          <span className="text-[9.5px] text-slate-500 block font-sans">
                            1v1 Match Finalized & Claimed
                          </span>
                        </div>
                      </div>
                      <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 rounded-full uppercase font-mono shrink-0 flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Completed</span>
                      </span>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
                    </>
          )}
        </motion.div>

        {/* FULLSCREEN IMAGE PREVIEW LIGHTBOX */}
        {previewImageModal && (
          <div 
            className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-lg flex items-center justify-center p-4 animate-fadeIn"
            onClick={() => setPreviewImageModal(null)}
          >
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-4xl max-h-[90vh] flex flex-col items-center justify-center"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewImageModal(null)}
                className="absolute -top-12 right-0 bg-slate-900/80 border border-white/20 text-white p-2 rounded-full hover:bg-slate-800 hover:border-cyan-400 transition-colors shadow-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              <img 
                src={previewImageModal.url} 
                alt="Preview" 
                className="max-w-full max-h-[80vh] object-contain rounded-2xl border border-cyan-500/40 shadow-[0_0_50px_rgba(6,182,212,0.35)]" 
              />
              {previewImageModal.title && (
                <p className="mt-3 text-cyan-300 font-mono text-xs font-bold text-center bg-slate-950/90 border border-cyan-500/30 px-4 py-1.5 rounded-full shadow-lg">
                  {previewImageModal.title}
                </p>
              )}
            </motion.div>
          </div>
        )}
      </div>
    </AnimatePresence>
  );
}
