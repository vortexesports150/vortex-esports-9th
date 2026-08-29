import React, { useState, useEffect } from 'react';
import { 
  X, 
  Users, 
  CheckCircle2, 
  UserPlus, 
  UserCheck, 
  Sparkles, 
  Calendar, 
  Trophy, 
  Activity, 
  MessageSquare, 
  Heart, 
  Share2, 
  ShieldCheck, 
  Gamepad2,
  ExternalLink,
  Flame,
  Bookmark,
  MoreVertical,
  ThumbsUp,
  Flag,
  Trash2,
  Zap,
  Swords,
  RefreshCw,
  Mail,
  Copy,
  Check,
  ArrowLeftRight,
  Camera,
  Loader2
} from 'lucide-react';
import { 
  collection, 
  query, 
  where, 
  onSnapshot, 
  addDoc, 
  deleteDoc, 
  doc, 
  getDocs, 
  serverTimestamp,
  updateDoc,
  getDoc,
  setDoc
} from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { IMGBB_API_KEY } from '../lib/imgbb';
import { isValidNumericPlayvearId, ensureSingleUserPlayvearId } from '../lib/playvearIdSync';
import { getPostDateObject, formatRelativeTime, resolveAuthorName, resolveAuthorPhoto } from './PulseFeedView';

interface PulseUserProfileModalProps {
  userId: string;
  currentUserId: string;
  currentUserProfile: any;
  allUsersMap?: Record<string, any>;
  initialProfileView?: 'host' | 'player';
  onClose: () => void;
  onSelectTournament?: (tournamentId: string) => void;
  onSelectLeagueMatch?: (leagueId: string, matchId?: string, rawMatchObj?: any) => void;
  onSelectLoneWolfMatch?: (matchId: string) => void;
  onOpenComments?: (postId: string) => void;
}

export const PulseUserProfileModal: React.FC<PulseUserProfileModalProps> = ({
  userId,
  currentUserId,
  currentUserProfile,
  allUsersMap = {},
  initialProfileView,
  onClose,
  onSelectTournament,
  onSelectLeagueMatch,
  onSelectLoneWolfMatch,
  onOpenComments
}) => {
  const [profileData, setProfileData] = useState<any>(allUsersMap[userId] || null);
  const [hostBrandData, setHostBrandData] = useState<{
    brandName: string;
    brandLogoUrl: string;
    brandCoverUrl: string;
    logoUrl?: string;
    coverUrl?: string;
  } | null>(null);

  const [userPosts, setUserPosts] = useState<any[]>([]);
  
  // Separate Followers State for Host (Page) vs Game (Player)
  const [hostFollowersCount, setHostFollowersCount] = useState<number>(0);
  const [playerFollowersCount, setPlayerFollowersCount] = useState<number>(0);
  const [isFollowingHost, setIsFollowingHost] = useState<boolean>(false);
  const [isFollowingPlayer, setIsFollowingPlayer] = useState<boolean>(false);
  const [followHostDocId, setFollowHostDocId] = useState<string | null>(null);
  const [followPlayerDocId, setFollowPlayerDocId] = useState<string | null>(null);

  const [isFollowLoading, setIsFollowLoading] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'posts' | 'about'>('posts');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [copiedPlayvearId, setCopiedPlayvearId] = useState(false);
  
  // Active Profile View: 'host' (Facebook Page) or 'player' (Personal Profile)
  const [activeProfileView, setActiveProfileView] = useState<'host' | 'player'>(initialProfileView || 'player');

  // Interactive post modals inside profile view
  const [activeMenuPostId, setActiveMenuPostId] = useState<string | null>(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [savedPosts, setSavedPosts] = useState<string[]>([]);
  const [postToDelete, setPostToDelete] = useState<any | null>(null);
  const [isDeletingPost, setIsDeletingPost] = useState<boolean>(false);
  const [postToReport, setPostToReport] = useState<any | null>(null);
  const [isSubmittingReport, setIsSubmittingReport] = useState<boolean>(false);

  // Completed events count state for hosts
  const [completedLeaguesCount, setCompletedLeaguesCount] = useState<number>(0);
  const [completedTournamentsCount, setCompletedTournamentsCount] = useState<number>(0);
  const [completedLoneWolfCount, setCompletedLoneWolfCount] = useState<number>(0);

  // Cover image upload states & helpers
  const [isUploadingCover, setIsUploadingCover] = useState<boolean>(false);

  const compressAndUploadPlayerCover = async (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = () => reject(new Error("Failed to read cover image"));
      reader.onload = (e) => {
        const rawResult = (e.target?.result as string) || '';
        const img = new Image();
        img.onerror = () => reject(new Error("Failed to load image"));
        img.onload = async () => {
          try {
            // Standard 16:4 aspect ratio for sleek cover layout
            const TARGET_WIDTH = 1024;
            const TARGET_HEIGHT = 256;
            const TARGET_RATIO = 16 / 4;

            let cropX = 0;
            let cropY = 0;
            let cropWidth = img.width;
            let cropHeight = img.height;

            const currentRatio = img.width / img.height;
            if (currentRatio > TARGET_RATIO) {
              cropWidth = Math.round(img.height * TARGET_RATIO);
              cropX = Math.round((img.width - cropWidth) / 2);
            } else if (currentRatio < TARGET_RATIO) {
              cropHeight = Math.round(img.width / TARGET_RATIO);
              cropY = Math.round((img.height - cropHeight) / 2);
            }

            const canvas = document.createElement("canvas");
            canvas.width = TARGET_WIDTH;
            canvas.height = TARGET_HEIGHT;
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Canvas context unavailable");

            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = "high";
            ctx.drawImage(img, cropX, cropY, cropWidth, cropHeight, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

            // Compress strictly to ~60 KB (60 * 1024 bytes)
            const TARGET_MAX_BYTES = 60 * 1024;
            let quality = 0.85;
            let dataUrl = canvas.toDataURL("image/jpeg", quality);
            let sizeInBytes = Math.round((dataUrl.length * 3) / 4) - 200;

            while (sizeInBytes > TARGET_MAX_BYTES && quality > 0.1) {
              quality -= 0.05;
              dataUrl = canvas.toDataURL("image/jpeg", quality);
              sizeInBytes = Math.round((dataUrl.length * 3) / 4) - 200;
            }

            if (sizeInBytes > TARGET_MAX_BYTES) {
              let scale = 0.85;
              while (sizeInBytes > TARGET_MAX_BYTES && scale >= 0.3) {
                const smCanvas = document.createElement("canvas");
                smCanvas.width = Math.max(16, Math.round(canvas.width * scale));
                smCanvas.height = Math.max(16, Math.round(canvas.height * scale));
                const smCtx = smCanvas.getContext("2d");
                if (smCtx) {
                  smCtx.imageSmoothingEnabled = true;
                  smCtx.imageSmoothingQuality = "high";
                  smCtx.drawImage(canvas, 0, 0, smCanvas.width, smCanvas.height);
                  dataUrl = smCanvas.toDataURL("image/jpeg", 0.75);
                  sizeInBytes = Math.round((dataUrl.length * 3) / 4) - 200;
                }
                scale -= 0.1;
              }
            }

            const apiKey = (IMGBB_API_KEY || (import.meta as any).env?.VITE_IMGBB_API_KEY || '').trim();
            const base64Data = dataUrl.split(',')[1];

            // 1. Primary: Upload to ImgBB
            if (apiKey !== '') {
              try {
                const formData = new FormData();
                formData.append('key', apiKey);
                formData.append('image', base64Data);
                formData.append('name', `player_cover_${userId}_${Date.now()}`);

                const response = await fetch('https://api.imgbb.com/1/upload', {
                  method: 'POST',
                  body: formData,
                });
                const json = await response.json();
                if (json.success && json.data && json.data.url) {
                  const uploadedUrl = json.data.url;
                  console.log("Uploaded successfully to ImgBB:", uploadedUrl);
                  resolve(uploadedUrl);
                  return; // EXIT EARLY - DO NOT UPLOAD TO FIREBASE
                } else {
                  console.warn("ImgBB upload responded with non-success:", json);
                }
              } catch (err) {
                console.warn("ImgBB upload failed, falling back to Firebase Storage:", err);
              }
            } else {
              console.warn("No ImgBB API key found, falling back to Firebase Storage.");
            }

            // 2. Secondary/Fallback: ONLY when ImgBB is down, server is down, or not working
            console.log("ImgBB is down or key missing. Uploading to Firebase Cloud Storage fallback...");
            try {
              const fileName = `player_covers/cover_${userId}_${Date.now()}.jpg`;
              const storageRef = ref(storage, fileName);
              await uploadString(storageRef, dataUrl, 'data_url');
              const fbUrl = await getDownloadURL(storageRef);
              resolve(fbUrl);
              return;
            } catch (fbErr) {
              console.error("Firebase Cloud Storage fallback also failed:", fbErr);
            }

            // 3. Ultimate Fallback: return data url
            resolve(dataUrl);
          } catch (err) {
            reject(err);
          }
        };
        img.src = rawResult;
      };
      reader.readAsDataURL(file);
    });
  };

  const handlePlayerCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingCover(true);
    setToastMessage('OPTIMIZING & UPLOADING COVER...');
    try {
      const uploadedUrl = await compressAndUploadPlayerCover(file);

      // Save to Firestore users collection
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        coverPhoto: uploadedUrl
      });

      setToastMessage('Cover photo updated successfully!');
    } catch (err) {
      console.error('Failed to update cover photo:', err);
      setToastMessage('Failed to update cover photo');
    } finally {
      setIsUploadingCover(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Resolution maps
  const [allLeagueSquads, setAllLeagueSquads] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [allLoneWolfMatches, setAllLoneWolfMatches] = useState<any[]>([]);

  const isOwnProfile = userId === currentUserId;

  // Load squads, teams, lone wolf for resolution
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
    return () => {
      unsubSquads();
      unsubTeams();
      unsubLoneWolf();
    };
  }, []);

  // Fetch host completed events (leagues, tournaments, lone wolf matches)
  useEffect(() => {
    if (!userId) return;

    // 1. Completed leagues matches
    const qLeagues = query(
      collection(db, 'pro_league_schedule_matches'),
      where('hostId', '==', userId),
      where('status', '==', 'Completed')
    );
    const unsubLeagues = onSnapshot(qLeagues, (snap) => {
      setCompletedLeaguesCount(snap.size);
    }, (err) => {
      console.warn("Error fetching completed leagues matches count:", err);
    });

    // 2. Completed tournaments
    const qTournaments = query(
      collection(db, 'tournaments_freefire'),
      where('hostId', '==', userId),
      where('status', 'in', ['Completed', 'Ended', 'completed'])
    );
    const unsubTournaments = onSnapshot(qTournaments, (snap) => {
      setCompletedTournamentsCount(snap.size);
    }, (err) => {
      console.warn("Error fetching completed tournaments count:", err);
    });

    // 3. Completed lone wolf matches
    const qLoneWolf = query(
      collection(db, 'lone_wolf_matches'),
      where('hostId', '==', userId),
      where('status', '==', 'Completed')
    );
    const unsubLoneWolf = onSnapshot(qLoneWolf, (snap) => {
      setCompletedLoneWolfCount(snap.size);
    }, (err) => {
      console.warn("Error fetching completed lone wolf matches count:", err);
    });

    return () => {
      unsubLeagues();
      unsubTournaments();
      unsubLoneWolf();
    };
  }, [userId]);

  // 1. Fetch live user profile doc & Host Brand doc
  useEffect(() => {
    if (!userId) return;
    
    if (userId === currentUserId && currentUserProfile) {
      setProfileData(currentUserProfile);
    } else if (allUsersMap[userId]) {
      setProfileData(allUsersMap[userId]);
    }

    const unsubUser = onSnapshot(doc(db, 'users', userId), (snap) => {
      if (snap.exists()) {
        const uData: any = { id: snap.id, ...snap.data() };
        if (!isValidNumericPlayvearId(uData.playvearId) && userId === currentUserId) {
          ensureSingleUserPlayvearId(userId, uData.playvearId).then((newSeqId) => {
            setProfileData((prev: any) => prev ? { ...prev, playvearId: newSeqId } : prev);
          }).catch(e => console.warn(e));
        }
        setProfileData(uData);
      }
    }, (err) => {
      console.warn('Error fetching user profile doc:', err);
    });

    const loadBrandInfo = async () => {
      try {
        const b1 = await getDoc(doc(db, 'host_brands', userId));
        if (b1.exists()) {
          const d = b1.data();
          if (d?.brandName) {
            setHostBrandData({
              brandName: String(d.brandName).trim(),
              brandLogoUrl: d.brandLogoUrl || d.logoUrl || '',
              brandCoverUrl: d.brandCoverUrl || d.coverUrl || d.bannerUrl || ''
            });
            return;
          }
        }
        const b2 = await getDoc(doc(db, 'pro_host_brands', userId));
        if (b2.exists()) {
          const d = b2.data();
          if (d?.brandName) {
            setHostBrandData({
              brandName: String(d.brandName).trim(),
              brandLogoUrl: d.brandLogoUrl || d.logoUrl || '',
              brandCoverUrl: d.brandCoverUrl || d.coverUrl || d.bannerUrl || ''
            });
            return;
          }
        }
      } catch (e) {
        console.warn('Error fetching host brand info for profile:', e);
      }
    };
    loadBrandInfo();

    return () => unsubUser();
  }, [userId, currentUserId, currentUserProfile, allUsersMap]);

  // Derived Host & Player identity values
  const hostBrandName = (
    hostBrandData?.brandName || 
    profileData?.brandName || 
    profileData?.hostName || 
    profileData?.proHostName || 
    profileData?.hostTitle || 
    profileData?.hostOrganization || 
    profileData?.organizationName || 
    ''
  ).trim();

  const hostBrandPhoto = (
    hostBrandData?.brandLogoUrl || 
    hostBrandData?.logoUrl || 
    profileData?.brandLogoUrl || 
    profileData?.logoUrl || 
    profileData?.hostLogoUrl || 
    profileData?.hostPhotoUrl || 
    profileData?.hostPhoto || 
    profileData?.photoURL || 
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=150&auto=format&fit=crop'
  );

  const hostBrandCover = (
    hostBrandData?.brandCoverUrl || 
    hostBrandData?.coverUrl || 
    profileData?.brandCoverUrl || 
    profileData?.coverUrl || 
    profileData?.hostCoverUrl || 
    profileData?.coverPhoto || 
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000&auto=format&fit=crop'
  );

  const playerGameName = (
    profileData?.fullName ||
    profileData?.displayName ||
    profileData?.name ||
    profileData?.gameName || 
    profileData?.inGameName || 
    profileData?.gamerTag || 
    profileData?.inGameUsername || 
    profileData?.ign || 
    profileData?.gamingUid || 
    'Player'
  ).trim();

  const playerPhoto = (
    profileData?.photoURL || 
    profileData?.photoUrl || 
    profileData?.avatar || 
    profileData?.avatarUrl || 
    profileData?.profilePic || 
    profileData?.profilePictureUrl || 
    'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=150&auto=format&fit=crop'
  );

  const playerCover = (
    profileData?.coverPhoto || 
    profileData?.teamCover || 
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=1000&auto=format&fit=crop'
  );

  const hasHostProfile = Boolean(hostBrandName && hostBrandName.toLowerCase() !== playerGameName.toLowerCase());

  // Auto initialize active profile view
  useEffect(() => {
    if (initialProfileView) {
      setActiveProfileView(initialProfileView);
      return;
    }
    if (hasHostProfile) {
      if (profileData?.role === 'pro_host' || profileData?.role === 'main_admin' || profileData?.role === 'admin') {
        setActiveProfileView('host');
      }
    } else {
      setActiveProfileView('player');
    }
  }, [hasHostProfile, profileData?.role, initialProfileView]);

  // 2. Separate Followers & Following listeners
  useEffect(() => {
    if (!userId) return;

    const followersQuery = query(
      collection(db, 'user_follows'),
      where('hostId', '==', userId)
    );
    const unsubFollowers = onSnapshot(followersQuery, (snap) => {
      const allFollowDocs = snap.docs.map(d => ({ id: d.id, ...d.data() } as any));
      
      // Separate Host Followers vs Player Followers
      const hostDocs = allFollowDocs.filter(d => d.targetType === 'host' || d.type === 'host' || (!d.targetType && !d.type && (profileData?.role === 'pro_host' || hasHostProfile)));
      const playerDocs = allFollowDocs.filter(d => d.targetType === 'player' || d.type === 'player' || (!d.targetType && !d.type && profileData?.role !== 'pro_host' && !hasHostProfile));

      setHostFollowersCount(hostDocs.length);
      setPlayerFollowersCount(playerDocs.length);

      const myHostFollow = hostDocs.find(d => d.followerId === currentUserId || d.userId === currentUserId);
      if (myHostFollow) {
        setIsFollowingHost(true);
        setFollowHostDocId(myHostFollow.id);
      } else {
        setIsFollowingHost(false);
        setFollowHostDocId(null);
      }

      const myPlayerFollow = playerDocs.find(d => d.followerId === currentUserId || d.userId === currentUserId);
      if (myPlayerFollow) {
        setIsFollowingPlayer(true);
        setFollowPlayerDocId(myPlayerFollow.id);
      } else {
        setIsFollowingPlayer(false);
        setFollowPlayerDocId(null);
      }
    });

    return () => {
      unsubFollowers();
    };
  }, [userId, currentUserId, profileData?.role, hasHostProfile]);

  // 3. User's pulse posts listener
  useEffect(() => {
    if (!userId) return;

    const postsQuery = query(
      collection(db, 'pulse_posts'),
      where('userId', '==', userId)
    );

    const unsubPosts = onSnapshot(postsQuery, (snap) => {
      const list = snap.docs.map(docSnap => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          userId: d.userId || '',
          userName: d.userName || profileData?.displayName || 'PlayVear Gamer',
          userPhoto: d.userPhoto || profileData?.photoURL || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=150&auto=format&fit=crop',
          userRole: d.userRole || profileData?.role || 'player',
          isHostPost: !!d.isHostPost,
          isVerified: d.isVerified ?? (d.userRole === 'pro_host' || d.userRole === 'main_admin'),
          text: d.text || '',
          category: d.category || 'all',
          imageUrl: d.imageUrl || '',
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
          status: d.status || 'approved',
        };
      });

      const filtered = list.filter(post => 
        post.status === 'approved' || 
        post.userId === currentUserId ||
        ['admin', 'sub_admin', 'main_admin'].includes(currentUserProfile?.role)
      );

      filtered.sort((a, b) => {
        const dA = getPostDateObject(a.createdAt)?.getTime() || 0;
        const dB = getPostDateObject(b.createdAt)?.getTime() || 0;
        return dB - dA;
      });

      setUserPosts(filtered);
    });

    return () => unsubPosts();
  }, [userId, currentUserId, currentUserProfile, profileData]);

  // Squad resolution helpers
  const resolveSquadName = (rawName?: string, fallbackSlot?: string) => {
    if (!rawName && !fallbackSlot) return 'Squad';
    const clean = String(rawName || fallbackSlot).trim();
    const cleanLower = clean.toLowerCase();

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

  // Follow Toggle (Differentiates between Host Page and Game Profile)
  const handleToggleFollow = async () => {
    if (!currentUserId || isOwnProfile || isFollowLoading) return;
    setIsFollowLoading(true);

    const isHostActive = activeProfileView === 'host' && hasHostProfile;
    const isCurrentlyFollowing = isHostActive ? isFollowingHost : isFollowingPlayer;
    const currentDocId = isHostActive ? followHostDocId : followPlayerDocId;
    const targetName = isHostActive ? hostBrandName : playerGameName;

    // Use deterministic ID for host follows to match other places exactly!
    const followDocId = isHostActive ? `${currentUserId}_${userId}` : (currentDocId || `${currentUserId}_player_${userId}`);
    const followRef = doc(db, 'user_follows', followDocId);

    try {
      if (isCurrentlyFollowing) {
        // Delete deterministic doc
        await deleteDoc(followRef).catch(() => {});
        // If we have a cached alternative ID, delete that too
        if (currentDocId && currentDocId !== followDocId) {
          await deleteDoc(doc(db, 'user_follows', currentDocId)).catch(() => {});
        }
        
        // Find and delete any other duplicate documents in the collection
        const q = query(
          collection(db, 'user_follows'),
          where('hostId', '==', userId)
        );
        const snap = await getDocs(q);
        const matches = snap.docs.filter(d => {
          const data = d.data();
          return data.followerId === currentUserId || data.userId === currentUserId;
        });
        for (const d of matches) {
          await deleteDoc(doc(db, 'user_follows', d.id)).catch(() => {});
        }

        if (isHostActive) {
          setIsFollowingHost(false);
          setFollowHostDocId(null);
        } else {
          setIsFollowingPlayer(false);
          setFollowPlayerDocId(null);
        }
        setToastMessage(`Unfollowed ${targetName}`);
      } else {
        // Write both schemas so all components are perfectly synced!
        await setDoc(followRef, {
          // Schema A (Pulse Feed & User Profile Modal)
          followerId: currentUserId,
          hostId: userId,
          targetType: isHostActive ? 'host' : 'player',
          targetName: targetName,
          followerName: currentUserProfile?.gameName || currentUserProfile?.displayName || 'Gamer',
          followerPhoto: currentUserProfile?.photoURL || '',

          // Schema B (Legacy HostFollowButton)
          userId: currentUserId,
          type: isHostActive ? 'host' : 'player',
          hostName: targetName,

          createdAt: serverTimestamp()
        });

        if (isHostActive) {
          setIsFollowingHost(true);
          setFollowHostDocId(followDocId);
        } else {
          setIsFollowingPlayer(true);
          setFollowPlayerDocId(followDocId);
        }
        setToastMessage(`Now following ${targetName}`);
      }
    } catch (err) {
      console.error('Error toggling follow:', err);
    } finally {
      setIsFollowLoading(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Toggle Reaction on Post
  const handleToggleReaction = async (post: any, reactionType: 'like' | 'love' | 'haha' | 'sad' | 'munajat') => {
    if (!currentUserId) return;
    try {
      const postRef = doc(db, 'pulse_posts', post.id);
      const currentReactions = post.reactions || {};
      const previousReaction = currentReactions[currentUserId];

      const updatedReactions = { ...currentReactions };
      let updatedLikes = Array.from(new Set<string>(post.likes || []));

      if (previousReaction === reactionType) {
        delete updatedReactions[currentUserId];
        updatedLikes = updatedLikes.filter(uid => uid !== currentUserId);
      } else {
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
    } catch (err) {
      console.error("Error toggling reaction:", err);
    }
  };

  // Share Post
  const handleSharePost = async (post: any) => {
    try {
      let baseUrl = window.location.origin + window.location.pathname;
      if (baseUrl.includes('ais-dev-')) {
        baseUrl = baseUrl.replace('ais-dev-', 'ais-pre-');
      }
      const shareUrl = `${baseUrl}?tab=pulse&post=${post.id}`;

      const shareText = post.text 
        ? `${post.text}\n\n🎮 Shared via PlayVear Pulse`
        : `Check out this pulse post by ${post.userName} on PlayVear!`;

      if (navigator.share) {
        await navigator.share({
          title: `PlayVear Pulse - ${post.userName}`,
          text: shareText,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(`${shareText}\n${shareUrl}`);
        setToastMessage('Post link copied to clipboard!');
        setTimeout(() => setToastMessage(null), 3000);
      }

      const postRef = doc(db, 'pulse_posts', post.id);
      await updateDoc(postRef, {
        sharesCount: (post.sharesCount || post.shareCount || 0) + 1,
        shareCount: (post.shareCount || 0) + 1
      });
    } catch (err) {
      console.warn('Share cancelled/failed:', err);
    }
  };

  // Save/Unsave Post
  const handleToggleSavePost = (postId: string) => {
    if (savedPosts.includes(postId)) {
      setSavedPosts(prev => prev.filter(id => id !== postId));
      setToastMessage('Post unsaved');
    } else {
      setSavedPosts(prev => [...prev, postId]);
      setToastMessage('Post saved to bookmarks');
    }
    setActiveMenuPostId(null);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Confirm Delete Post
  const handleConfirmDeletePost = async () => {
    if (!postToDelete) return;
    setIsDeletingPost(true);
    try {
      await deleteDoc(doc(db, 'pulse_posts', postToDelete.id));
      setToastMessage('Post deleted successfully');
      setPostToDelete(null);
    } catch (err) {
      console.error('Error deleting post:', err);
    } finally {
      setIsDeletingPost(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  // Confirm Report Post
  const handleConfirmReportPost = async () => {
    if (!postToReport || !currentUserId) return;
    setIsSubmittingReport(true);
    try {
      await addDoc(collection(db, 'post_reports'), {
        postId: postToReport.id,
        postAuthorId: postToReport.userId,
        postAuthorName: postToReport.userName,
        postText: postToReport.text || '',
        reportedByUserId: currentUserId,
        reportedByUserName: currentUserProfile?.displayName || 'Anonymous User',
        createdAt: serverTimestamp(),
        status: 'pending'
      });
      setToastMessage('Report submitted to admins. Thank you!');
      setPostToReport(null);
    } catch (err) {
      console.error('Error reporting post:', err);
    } finally {
      setIsSubmittingReport(false);
      setTimeout(() => setToastMessage(null), 3000);
    }
  };

  const isUserAdminOrSuperAdmin = () => {
    return ['admin', 'sub_admin', 'main_admin', 'super_admin'].includes((currentUserProfile?.role || '').toLowerCase());
  };

  const isHostViewActive = activeProfileView === 'host' && hasHostProfile;
  const currentDisplayName = isHostViewActive ? hostBrandName : playerGameName;
  const currentPhotoURL = isHostViewActive ? hostBrandPhoto : playerPhoto;
  const currentCoverPhoto = isHostViewActive ? hostBrandCover : playerCover;
  const currentFollowersCount = isHostViewActive ? hostFollowersCount : playerFollowersCount;
  const currentIsFollowing = isHostViewActive ? isFollowingHost : isFollowingPlayer;
  const currentRoleLabel = isHostViewActive 
    ? 'Official Host' 
    : (profileData?.role === 'main_admin' || profileData?.role === 'admin' ? 'Admin' : 'Esports Player');
  const isVerifiedBadge = isHostViewActive || ['pro_host', 'main_admin', 'admin', 'sub_admin'].includes((profileData?.role || '').toLowerCase());
  const squadName = profileData?.squad?.name || profileData?.squadName || profileData?.teamName || '';

  // Filter posts based on active view
  const hostPosts = userPosts.filter(p => p.isHostPost || p.authorIdentity === 'host' || p.userName === hostBrandName);
  const playerPosts = userPosts.filter(p => (!p.isHostPost && p.authorIdentity !== 'host') || p.userName !== hostBrandName);
  const displayedPosts = isHostViewActive ? (hostPosts.length > 0 ? hostPosts : userPosts) : (playerPosts.length > 0 ? playerPosts : userPosts);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[200] px-4 py-2 bg-gradient-to-r from-cyan-500 to-pink-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-full shadow-2xl animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Main Profile Card Container with outer wrapper */}
      <div className="relative w-full max-w-2xl flex flex-col pt-12 sm:pt-14 px-2 sm:px-0">
        
        {/* Close Button placed outside, at the top-right corner of the card container */}
        <button
          onClick={onClose}
          className="absolute top-0 right-2 sm:right-0 z-50 p-1.5 rounded-full bg-slate-950/90 border border-cyan-500/40 text-cyan-400 hover:text-cyan-300 hover:border-cyan-300 transition-all cursor-pointer shadow-[0_0_10px_rgba(6,182,212,0.3)]"
          title="Close Profile"
        >
          <X className="w-3 h-3" />
        </button>

        {/* Main Content Card */}
        <div className="w-full max-h-[80vh] sm:max-h-[85vh] bg-[#070b19] border border-cyan-500/30 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col overflow-hidden font-sans text-left">

          {/* Scrollable Content Area */}
          <div className="overflow-y-auto custom-scrollbar flex-1">
          
          {/* Cover Photo / Banner */}
          <div className="relative h-36 sm:h-48 w-full bg-slate-900 overflow-hidden group">
            <img 
              src={currentCoverPhoto} 
              alt="Cover Banner" 
              className="w-full h-full object-cover opacity-80 transition-all duration-500"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#070b19] via-[#070b19]/30 to-transparent" />
            
            {/* Update Cover Button for Player Profile Owner */}
            {userId === currentUserId && !isHostViewActive && (
              <label 
                className="absolute top-3 right-3 z-20 flex items-center justify-center w-8 h-8 rounded-full bg-slate-950/80 hover:bg-slate-900 border border-cyan-500/30 hover:border-cyan-400 text-cyan-400 hover:text-cyan-300 cursor-pointer shadow-lg transition-all"
                title="Update Cover Photo"
              >
                {isUploadingCover ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Camera className="w-4 h-4" />
                )}
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handlePlayerCoverChange}
                  disabled={isUploadingCover}
                />
              </label>
            )}
          </div>

          {/* Profile Details Header Section */}
          <div className="px-4 sm:px-6 -mt-12 sm:-mt-16 pb-4 relative z-10">
            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
              
              {/* Avatar + Basic Details */}
              <div className="flex items-end gap-3.5 sm:gap-4">
                <div className="relative">
                  <img 
                    src={currentPhotoURL} 
                    alt={currentDisplayName} 
                    className="w-20 h-20 sm:w-28 sm:h-28 rounded-2xl object-cover border-4 border-[#070b19] shadow-[0_0_20px_rgba(6,182,212,0.4)] bg-slate-900 transition-all duration-300" 
                  />
                  {isVerifiedBadge && (
                    <div className="absolute -bottom-1 -right-1 bg-cyan-500 text-slate-950 p-1 rounded-full shadow-lg border-2 border-[#070b19]">
                      <CheckCircle2 className="w-4 h-4 fill-cyan-400 text-slate-950 stroke-[2.5]" />
                    </div>
                  )}
                </div>

                <div className="pb-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-lg sm:text-2xl font-black text-white tracking-wide truncate">
                      {currentDisplayName}
                    </h2>
                    <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-[9px] font-mono font-black uppercase tracking-wider">
                      {currentRoleLabel}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                    <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                      <Mail className="w-2.5 h-2.5 text-cyan-500/70" />
                      <span className="text-cyan-100/80">{profileData?.email || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-1 text-[9px] text-slate-400 font-mono">
                      <Calendar className="w-2.5 h-2.5 text-cyan-500/70" />
                      <span>Joined:</span>
                      <span className="text-fuchsia-300">
                        {profileData?.createdAt ? new Date(profileData.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: '2-digit' }) : 'June 2026'}
                      </span>
                    </div>
                  </div>

                  <div 
                    className="mt-2 flex items-center gap-2 bg-[#090e24] border border-cyan-500/50 hover:border-cyan-400 px-3 py-1 rounded-xl cursor-pointer hover:bg-cyan-950/50 transition-all group w-fit active:scale-95 shadow-[0_0_12px_rgba(6,182,212,0.2)]"
                    onClick={() => {
                      const pid = profileData?.playvearId ? String(profileData.playvearId).trim() : '';
                      if (pid && pid !== 'N/A' && pid !== '----') {
                        navigator.clipboard.writeText(pid);
                        setCopiedPlayvearId(true);
                        setTimeout(() => setCopiedPlayvearId(false), 2000);
                      }
                    }}
                    title="Click to copy PlayVear ID"
                  >
                    <span className="text-[8.5px] font-black uppercase text-cyan-400 tracking-wider font-mono">PlayVear ID:</span>
                    <span className="text-[11px] font-mono font-black text-white tracking-wider px-1.5 py-0.5 rounded bg-cyan-500/20 border border-cyan-500/30 drop-shadow-[0_0_6px_rgba(6,182,212,0.8)]">
                      {profileData?.playvearId ? String(profileData.playvearId).trim() : '----'}
                    </span>
                    <div className="pl-1.5 border-l border-cyan-500/30">
                      {copiedPlayvearId ? (
                        <span className="inline-flex items-center gap-1 text-[8px] font-black text-emerald-400 font-mono">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </span>
                      ) : (
                        <Copy className="w-3 h-3 text-cyan-400 group-hover:scale-110 group-hover:text-cyan-200 transition-all" />
                      )}
                    </div>
                  </div>

                  {!isHostViewActive && squadName && (
                    <p className="text-xs font-bold text-cyan-400 flex items-center gap-1 mt-1">
                      <Gamepad2 className="w-3.5 h-3.5 text-pink-400" />
                      {squadName}
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons (Follow / Share / Switch Profile) */}
              <div className="flex items-center gap-2 pt-2 sm:pt-0 flex-wrap">
                {!isOwnProfile ? (
                  <button
                    onClick={handleToggleFollow}
                    disabled={isFollowLoading}
                    className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-lg cursor-pointer ${
                      currentIsFollowing 
                        ? 'bg-slate-800 text-cyan-400 border border-slate-700 hover:bg-slate-700 hover:text-cyan-300' 
                        : 'bg-gradient-to-r from-cyan-500 via-blue-600 to-pink-500 text-slate-950 hover:opacity-90 shadow-[0_0_15px_rgba(6,182,212,0.4)]'
                    }`}
                  >
                    {currentIsFollowing ? (
                      <>
                        <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
                        Following {isHostViewActive ? 'Page' : 'Player'}
                      </>
                    ) : (
                      <>
                        <UserPlus className="w-3.5 h-3.5" />
                        Follow {isHostViewActive ? 'Page' : 'Player'}
                      </>
                    )}
                  </button>
                ) : (
                  <div className="px-2.5 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                    {isHostViewActive ? 'Your Official Page' : 'Your Personal Profile'}
                  </div>
                )}

                <button
                  onClick={() => {
                    if (navigator.share) {
                      navigator.share({
                        title: `${currentDisplayName}'s Pulse Profile`,
                        text: `Check out ${currentDisplayName} on PlayVear Pulse!`,
                        url: window.location.href,
                      }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(window.location.href);
                      setToastMessage('Profile link copied to clipboard!');
                      setTimeout(() => setToastMessage(null), 3000);
                    }
                  }}
                  className="p-1.5 rounded-xl bg-slate-900 border border-white/10 text-slate-300 hover:text-white hover:border-cyan-400 transition-all cursor-pointer"
                  title="Share Profile"
                >
                  <Share2 className="w-3.5 h-3.5" />
                </button>

                {/* Profile Switcher Button in the same row */}
                {hasHostProfile && (
                  <button
                    type="button"
                    onClick={() => {
                      const nextMode = isHostViewActive ? 'player' : 'host';
                      setActiveProfileView(nextMode);
                      setToastMessage(`Switched to ${nextMode === 'host' ? hostBrandName : playerGameName}`);
                      setTimeout(() => setToastMessage(null), 2500);
                    }}
                    className="group px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-cyan-500/40 hover:border-cyan-400 text-white flex items-center gap-1.5 transition-all cursor-pointer shadow-lg hover:scale-105 active:scale-95"
                    title={`Switch to ${isHostViewActive ? playerGameName : hostBrandName}`}
                  >
                    <div className="relative shrink-0">
                      <img 
                        src={isHostViewActive ? playerPhoto : hostBrandPhoto} 
                        alt="" 
                        className="w-3.5 h-3.5 rounded-full object-cover border border-cyan-400/60 bg-slate-800" 
                      />
                      <div className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-cyan-500 border border-slate-950 flex items-center justify-center">
                        <RefreshCw className="w-1 h-1 text-slate-950 stroke-[3]" />
                      </div>
                    </div>
                    <span className="text-[9px] font-black text-cyan-300 tracking-wider uppercase flex items-center gap-1">
                      <span>Switch</span>
                      <ArrowLeftRight className="w-3 h-3 text-cyan-400 group-hover:rotate-180 transition-transform duration-300 shrink-0" />
                    </span>
                  </button>
                )}
              </div>
            </div>

            {/* Followers / Posts Stats Bar */}
            <div className="grid grid-cols-2 gap-2 mt-5 p-3 rounded-2xl bg-slate-900/80 border border-white/10 text-center">
              <div className="border-r border-white/10">
                <span className="block text-base sm:text-xl font-black text-white font-mono">
                  {currentFollowersCount}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isHostViewActive ? 'Host Page Followers' : 'Player Followers'}
                </span>
              </div>
              <div>
                <span className="block text-base sm:text-xl font-black text-cyan-400 font-mono">
                  {displayedPosts.length}
                </span>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  {isHostViewActive ? 'Host Posts' : 'Player Posts'}
                </span>
              </div>
            </div>

            {/* Host Completed Events Matrix */}
            {isHostViewActive && (
              <div className="grid grid-cols-3 gap-1 mt-2 p-1.5 rounded-xl bg-slate-950/60 border border-cyan-500/10 text-center">
                <div className="flex flex-col items-center justify-center py-0.5 border-r border-white/5">
                  <span className="block text-xs font-black text-cyan-400 font-mono leading-none">
                    {completedLeaguesCount}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-1">
                    Leagues Completed
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center py-0.5 border-r border-white/5">
                  <span className="block text-xs font-black text-cyan-400 font-mono leading-none">
                    {completedTournamentsCount}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-1">
                    Tournaments Completed
                  </span>
                </div>
                <div className="flex flex-col items-center justify-center py-0.5">
                  <span className="block text-xs font-black text-cyan-400 font-mono leading-none">
                    {completedLoneWolfCount}
                  </span>
                  <span className="text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none mt-1">
                    Lone Wolf Matches
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Navigation Tabs (Posts / Bio) */}
          <div className="px-4 sm:px-6 border-b border-cyan-500/20 flex items-center gap-4">
            <button
              onClick={() => setActiveTab('posts')}
              className={`py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'posts' 
                  ? 'border-cyan-400 text-cyan-300' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="w-4 h-4" />
              Pulse Feed ({displayedPosts.length})
            </button>
            <button
              onClick={() => setActiveTab('about')}
              className={`py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                activeTab === 'about' 
                  ? 'border-cyan-400 text-cyan-300' 
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="w-4 h-4" />
              About & Badges
            </button>
          </div>

          {/* Tab Content Body */}
          <div className="p-4 sm:p-6">
            {activeTab === 'posts' ? (
              <div className="space-y-4">
                {displayedPosts.length === 0 ? (
                  <div className="py-12 text-center flex flex-col items-center justify-center gap-3 text-slate-500">
                    <Activity className="w-10 h-10 text-slate-600 animate-pulse" />
                    <p className="text-sm font-bold text-slate-400">No Pulse Posts Yet</p>
                    <p className="text-xs text-slate-500 max-w-xs">
                      {isHostViewActive ? 'This host has not published any official posts yet.' : 'This player has not posted any updates yet.'}
                    </p>
                  </div>
                ) : (
                  displayedPosts.map((post) => {
                    const isOwner = post.userId === currentUserId;
                    const userReaction = post.reactions ? post.reactions[currentUserId] : (post.likes?.includes(currentUserId) ? 'like' : null);
                    
                    const reactionCounts = {
                      like: 0,
                      love: 0,
                      haha: 0,
                      sad: 0,
                      munajat: 0
                    };
                    if (post.reactions) {
                      Object.values(post.reactions).forEach((rType: any) => {
                        if (rType === 'like') reactionCounts.like++;
                        else if (rType === 'love') reactionCounts.love++;
                        else if (rType === 'haha') reactionCounts.haha++;
                        else if (rType === 'sad') reactionCounts.sad++;
                        else if (rType === 'munajat') reactionCounts.munajat++;
                      });
                    } else if (post.likes && post.likes.length > 0) {
                      reactionCounts.like = post.likes.length;
                    }

                    return (
                      <div 
                        key={post.id}
                        className="bg-[#080d1e]/90 border border-cyan-500/30 rounded-2xl p-4 shadow-[0_0_25px_rgba(6,182,212,0.12)] backdrop-blur-md space-y-3 relative transition-all hover:border-cyan-500/50 text-left"
                      >
                        {/* Post Header */}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <img 
                              src={resolveAuthorPhoto(post, allUsersMap)} 
                              alt="" 
                              className="w-10 h-10 rounded-full object-cover border-2 border-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.3)] shrink-0" 
                            />
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-xs font-black text-white font-sans tracking-wide">
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
                                {formatRelativeTime(post.createdAt)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-[9px] font-mono font-bold text-cyan-300 uppercase tracking-wider">
                              {post.category || 'Pulse'}
                            </span>

                            {/* Three Dots Menu Button */}
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => setActiveMenuPostId(activeMenuPostId === post.id ? null : post.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>

                              {activeMenuPostId === post.id && (
                                <div className="absolute right-0 top-8 w-36 bg-[#060a18]/95 border border-cyan-500/40 rounded-xl p-1.5 shadow-[0_10px_35px_rgba(0,0,0,0.9)] z-30 space-y-1 animate-fadeIn backdrop-blur-xl">
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
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Post Text */}
                        {post.text && (
                          <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-sans select-text whitespace-pre-wrap">
                            {post.text}
                          </p>
                        )}

                        {/* Post Image */}
                        {post.imageUrl && (
                          <div 
                            onClick={() => setImagePreviewUrl(post.imageUrl)}
                            className="rounded-xl overflow-hidden border border-white/10 max-h-80 bg-slate-950 cursor-pointer group relative"
                          >
                            <img 
                              src={post.imageUrl} 
                              alt="Pulse Post" 
                              className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300" 
                            />
                            <div className="absolute inset-0 bg-slate-950/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                              <span className="px-3 py-1.5 rounded-full bg-slate-950/80 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/40">
                                Click to View Image
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Tagged Tournament Card */}
                        {post.linkedTournament && (
                          <div 
                            onClick={() => onSelectTournament?.(post.linkedTournament.id)}
                            className="p-3.5 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-slate-900 to-slate-950 border border-cyan-500/40 hover:border-cyan-400 transition-all cursor-pointer flex flex-col gap-2.5 shadow-md"
                          >
                            <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2">
                              <span className="text-[10px] font-black text-cyan-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
                                🏆 TAGGED TOURNAMENT
                              </span>
                              <span className="text-[9px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-white/5 font-mono">
                                {post.linkedTournament.gameName || 'Free Fire'}
                              </span>
                            </div>

                            <div className="flex items-center justify-between gap-2">
                              <div className="min-w-0">
                                <h4 className="text-xs sm:text-sm font-black text-white truncate">{post.linkedTournament.title || 'Official Tournament'}</h4>
                                <p className="text-[10px] text-slate-400 font-mono">Entry Fee: ৳ {post.linkedTournament.entryFee || 0}</p>
                              </div>
                              <div className="bg-slate-900/80 border border-cyan-500/40 px-2.5 py-1 rounded-xl text-right shrink-0">
                                <span className="text-[8px] font-bold uppercase text-slate-400 block font-mono">PRIZE POOL</span>
                                <span className="text-xs font-black text-cyan-300 font-mono">৳ {(post.linkedTournament.prizePool || 0).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Tagged League Match Card */}
                        {post.linkedLeagueMatch && (() => {
                          const rawPlayerName = post.linkedLeagueMatch.playerSquadName || post.linkedLeagueMatch.t1;
                          const resolvedPlayerSquad = resolveSquadName(rawPlayerName, post.linkedLeagueMatch.playerTbdSlot || 'Squad 1');
                          const resolvedPlayerCover = resolveSquadCover(post.linkedLeagueMatch.playerSquadCover, resolvedPlayerSquad);

                          let rawOpponentName = post.linkedLeagueMatch.opposingSquadName;
                          if (rawOpponentName && resolvedPlayerSquad && rawOpponentName.trim().toLowerCase() === resolvedPlayerSquad.trim().toLowerCase()) {
                            rawOpponentName = post.linkedLeagueMatch.opposingTbdSlot || 'Opponent Squad';
                          }
                          const resolvedOpposingSquad = resolveSquadName(rawOpponentName, post.linkedLeagueMatch.opposingTbdSlot || 'Opponent Squad');
                          const resolvedOpposingCover = resolveSquadCover(post.linkedLeagueMatch.opposingSquadCover, resolvedOpposingSquad);

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
                              className="rounded-2xl bg-[#04060e] border border-cyan-500/30 overflow-hidden relative p-3.5 shadow-md cursor-pointer group hover:border-cyan-400 transition-all"
                            >
                              <div className="flex items-center justify-between border-b border-cyan-500/20 pb-2 mb-2">
                                <span className="text-[10px] font-black text-cyan-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
                                  🛡️ TAGGED LEAGUE MATCH
                                </span>
                                <span className="text-[9px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-white/5 font-mono">
                                  {post.linkedLeagueMatch.leagueName || 'PlayVear Pro League'}
                                </span>
                              </div>

                              <div className="flex flex-row items-center justify-between gap-2 text-center">
                                <div className="flex-1 p-2 bg-cyan-950/20 border border-cyan-500/30 rounded-xl">
                                  <p className="text-xs font-black text-cyan-300 truncate">{resolvedPlayerSquad}</p>
                                </div>
                                <span className="text-xs font-black text-pink-400 font-mono px-2">VS</span>
                                <div className="flex-1 p-2 bg-pink-950/20 border border-pink-500/30 rounded-xl">
                                  <p className="text-xs font-black text-pink-300 truncate">{resolvedOpposingSquad}</p>
                                </div>
                              </div>
                            </div>
                          );
                        })()}

                        {/* Tagged Lone Wolf Match Card */}
                        {post.linkedLoneWolfMatch && (
                          <div 
                            onClick={() => onSelectLoneWolfMatch?.(post.linkedLoneWolfMatch.id || post.linkedLoneWolfMatch.matchId)}
                            className="p-3.5 rounded-2xl bg-[#050918] border border-pink-500/30 hover:border-pink-400 transition-all cursor-pointer space-y-2 shadow-md"
                          >
                            <div className="flex items-center justify-between border-b border-pink-500/20 pb-1.5">
                              <span className="text-[10px] font-black text-pink-400 font-mono uppercase tracking-widest flex items-center gap-1.5">
                                ⚔️ TAGGED LONE WOLF (1V1)
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono">Prize: ৳ {post.linkedLoneWolfMatch.prizePool || 0}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-xs font-bold text-white truncate">{post.linkedLoneWolfMatch.title || 'Lone Wolf Duel'}</p>
                              <ExternalLink className="w-3.5 h-3.5 text-pink-400 shrink-0" />
                            </div>
                          </div>
                        )}

                        {/* Reactions & Engagement Footer */}
                        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-white/10 text-xs">
                          {/* Reactions Picker */}
                          <div className="flex items-center gap-0.5 sm:gap-1 bg-slate-950/80 p-0.5 sm:p-1 rounded-xl border border-white/10 overflow-x-auto max-w-full">
                            <button
                              onClick={() => handleToggleReaction(post, 'like')}
                              className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                                userReaction === 'like' ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'
                              }`}
                              title="Like"
                            >
                              <ThumbsUp className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                              <span>{reactionCounts.like || 0}</span>
                            </button>

                            <button
                              onClick={() => handleToggleReaction(post, 'love')}
                              className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                                userReaction === 'love' ? 'bg-pink-500/20 text-pink-300 border border-pink-500/40' : 'text-slate-400 hover:text-white'
                              }`}
                              title="Love"
                            >
                              <Heart className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-pink-500/20" />
                              <span>{reactionCounts.love || 0}</span>
                            </button>

                            <button
                              onClick={() => handleToggleReaction(post, 'haha')}
                              className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                                userReaction === 'haha' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'text-slate-400 hover:text-white'
                              }`}
                              title="Haha"
                            >
                              <span className="text-xs">😆</span>
                              <span>{reactionCounts.haha || 0}</span>
                            </button>

                            <button
                              onClick={() => handleToggleReaction(post, 'sad')}
                              className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                                userReaction === 'sad' ? 'bg-yellow-500/20 text-yellow-300 border border-yellow-500/40' : 'text-slate-400 hover:text-white'
                              }`}
                              title="Sad"
                            >
                              <span className="text-xs">😢</span>
                              <span>{reactionCounts.sad || 0}</span>
                            </button>

                            <button
                              onClick={() => handleToggleReaction(post, 'munajat')}
                              className={`px-1.5 py-0.5 sm:px-2 sm:py-1 rounded-lg text-[10px] sm:text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                                userReaction === 'munajat' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' : 'text-slate-400 hover:text-white'
                              }`}
                              title="Prayers / Munajat"
                            >
                              <span className="text-xs">🤲</span>
                              <span>{reactionCounts.munajat || 0}</span>
                            </button>
                          </div>

                          {/* Comment & Share Action Buttons */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => onOpenComments?.(post.id)}
                              className="px-3 py-1.5 rounded-xl bg-slate-900 border border-white/10 hover:border-cyan-400 text-slate-300 hover:text-cyan-300 transition-all font-bold flex items-center gap-1.5 cursor-pointer text-xs"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                              <span>{post.commentCount || 0} Comments</span>
                            </button>

                            <button
                              onClick={() => handleSharePost(post)}
                              className="p-1.5 rounded-xl bg-slate-900 border border-white/10 hover:border-pink-400 text-slate-300 hover:text-pink-300 transition-all cursor-pointer"
                              title="Share Post"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                      </div>
                    );
                  })
                )}
              </div>
            ) : (
              /* About Tab */
              <div className="space-y-4 text-left">
                <div className="p-4 rounded-2xl bg-slate-900/80 border border-white/10 space-y-3">
                  <h4 className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4" />
                    Player Bio & Details
                  </h4>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {profileData?.bio || `${currentDisplayName} is an active competitor and member of the PlayVear Gaming Community.`}
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center gap-3">
                    <Trophy className="w-5 h-5 text-yellow-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Primary Squad</p>
                      <p className="text-xs font-black text-white">{squadName || 'Solo Competitor'}</p>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-center gap-3">
                    <Gamepad2 className="w-5 h-5 text-cyan-400" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">In-Game Name</p>
                      <p className="text-xs font-black text-white">{profileData?.gameName || profileData?.inGameName || playerGameName}</p>
                    </div>
                  </div>
                </div>

                {/* Performance Stats Matrix */}
                <div className="p-4 rounded-2xl bg-slate-900/40 border border-cyan-500/10 space-y-4">
                  <h4 className="text-[10px] font-black text-cyan-400 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Activity className="w-3.5 h-3.5" />
                    Career Performance Standings
                  </h4>
                  
                  <div className="grid grid-cols-3 gap-2">
                    <div className="bg-black/40 border border-white/5 p-2.5 rounded-xl text-center">
                      <span className="block text-xs font-black text-white font-mono">
                        {profileData?.matchesPlayed || 0}
                      </span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Matches</span>
                    </div>
                    <div className="bg-black/40 border border-white/5 p-2.5 rounded-xl text-center">
                      <span className="block text-xs font-black text-cyan-400 font-mono">
                        {profileData?.totalKills || 0}
                      </span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Total Kills</span>
                    </div>
                    <div className="bg-black/40 border border-white/5 p-2.5 rounded-xl text-center">
                      <span className="block text-xs font-black text-white font-mono">
                        {profileData?.wins || 0}
                      </span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Match Wins</span>
                    </div>
                    <div className="bg-black/40 border border-white/5 p-2.5 rounded-xl text-center">
                      <span className="block text-xs font-black text-magenta-500 font-mono">
                        {profileData?.booyahs || 0}
                      </span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Booyahs</span>
                    </div>
                    <div className="bg-black/40 border border-white/5 p-2.5 rounded-xl text-center col-span-2">
                      <span className="block text-xs font-black text-slate-300 font-mono">
                        {(profileData?.totalDamage || 0).toLocaleString()}
                      </span>
                      <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">Lifetime Damage Dealt</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>

      {/* FULL IMAGE LIGHTBOX MODAL */}
      {imagePreviewUrl && (
        <div 
          onClick={() => setImagePreviewUrl(null)}
          className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4 cursor-zoom-out animate-fadeIn"
        >
          <button
            onClick={() => setImagePreviewUrl(null)}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 text-white hover:text-cyan-400 border border-white/20 transition-all cursor-pointer"
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={imagePreviewUrl} 
            alt="Preview" 
            className="max-w-full max-h-[85vh] object-contain rounded-2xl border border-cyan-500/30 shadow-2xl" 
          />
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {postToDelete && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#070b19] border border-rose-500/40 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-left">
            <div className="flex items-center gap-2 text-rose-400">
              <Trash2 className="w-5 h-5" />
              <h3 className="text-sm font-black uppercase">Delete Post</h3>
            </div>
            <p className="text-xs text-slate-300">
              Are you sure you want to delete this pulse post? This action cannot be undone.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setPostToDelete(null)}
                className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isDeletingPost}
                onClick={handleConfirmDeletePost}
                className="flex-1 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-black text-white transition-colors disabled:opacity-50"
              >
                {isDeletingPost ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT CONFIRMATION MODAL */}
      {postToReport && (
        <div className="fixed inset-0 z-[120] bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-[#070b19] border border-amber-500/40 rounded-2xl p-5 max-w-sm w-full space-y-4 shadow-2xl text-left">
            <div className="flex items-center gap-2 text-amber-400">
              <Flag className="w-5 h-5" />
              <h3 className="text-sm font-black uppercase">Report Post</h3>
            </div>
            <p className="text-xs text-slate-300">
              Report this post to PlayVear administrators for review.
            </p>
            <div className="flex items-center gap-2 pt-2">
              <button
                onClick={() => setPostToReport(null)}
                className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-300 hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                disabled={isSubmittingReport}
                onClick={handleConfirmReportPost}
                className="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-xs font-black text-white transition-colors disabled:opacity-50"
              >
                {isSubmittingReport ? 'Submitting...' : 'Report'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
