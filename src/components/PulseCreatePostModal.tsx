import React, { useState, useEffect } from 'react';
import { 
  X, Image as ImageIcon, Send, Sparkles, Trophy, Gamepad2, Users, Bell, Gift, 
  CheckCircle2, AlertCircle, Loader2, Calendar, Zap, Link2, ExternalLink 
} from 'lucide-react';
import { collection, addDoc, serverTimestamp, getDocs, query, limit, orderBy, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { uploadScreenshotToImgBB, compressImageToDataUrl } from '../lib/imgbb';


interface PulseCreatePostModalProps {
  currentUserId: string;
  currentUserProfile: any;
  onClose: () => void;
  onPostCreated?: () => void;
  preSelectedLeagueMatch?: any;
  preSelectedTournament?: any;
  preSelectedLoneWolfMatch?: any;
}

export const PulseCreatePostModal: React.FC<PulseCreatePostModalProps> = ({
  currentUserId,
  currentUserProfile,
  onClose,
  onPostCreated,
  preSelectedLeagueMatch,
  preSelectedTournament,
  preSelectedLoneWolfMatch,
}) => {
  // Determine initial pre-selected item type
  const isExplicitTournament = preSelectedTournament || (preSelectedLeagueMatch && preSelectedLeagueMatch.type === 'tournament');
  const isExplicitLoneWolf = preSelectedLoneWolfMatch || (preSelectedLeagueMatch && preSelectedLeagueMatch.type === 'lone_wolf');
  const isExplicitLeague = preSelectedLeagueMatch && preSelectedLeagueMatch.type === 'league';

  let initialTournament = null;
  let initialLoneWolf = null;
  let initialLeague = null;

  if (isExplicitTournament) {
    initialTournament = preSelectedTournament || preSelectedLeagueMatch;
  } else if (isExplicitLoneWolf) {
    initialLoneWolf = preSelectedLoneWolfMatch || preSelectedLeagueMatch;
  } else if (isExplicitLeague) {
    initialLeague = preSelectedLeagueMatch;
  } else if (preSelectedLeagueMatch) {
    // Heuristic fallback if no explicit type is provided
    const hasTournamentFields = 
      preSelectedLeagueMatch.joinedSquads !== undefined || 
      preSelectedLeagueMatch.joinedPlayers !== undefined || 
      preSelectedLeagueMatch.maxSquads !== undefined ||
      (preSelectedLeagueMatch.slotsTaken !== undefined && !preSelectedLeagueMatch.t1);
      
    const hasLoneWolfFields = 
      (preSelectedLeagueMatch.player1 !== undefined && !preSelectedLeagueMatch.t1) ||
      (preSelectedLeagueMatch.matchNumber !== undefined && preSelectedLeagueMatch.player1 !== undefined);

    if (hasTournamentFields) {
      initialTournament = preSelectedLeagueMatch;
    } else if (hasLoneWolfFields) {
      initialLoneWolf = preSelectedLeagueMatch;
    } else {
      initialLeague = preSelectedLeagueMatch;
    }
  } else if (preSelectedTournament) {
    initialTournament = preSelectedTournament;
  } else if (preSelectedLoneWolfMatch) {
    initialLoneWolf = preSelectedLoneWolfMatch;
  }

  const initialCategory = initialTournament ? 'tournaments' : (initialLoneWolf ? 'lone_wolf' : (initialLeague ? 'league' : 'gaming'));

  const [postText, setPostText] = useState('');
  const [category, setCategory] = useState<'all' | 'tournaments' | 'league' | 'lone_wolf' | 'gaming' | 'squad' | 'announcements' | 'rewards'>(initialCategory);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadStatusText, setUploadStatusText] = useState<string>('');
  
  // Tagging State
  const [selectedTournament, setSelectedTournament] = useState<any | null>(initialTournament);
  const [selectedLeagueMatch, setSelectedLeagueMatch] = useState<any | null>(initialLeague);
  const [selectedLoneWolfMatch, setSelectedLoneWolfMatch] = useState<any | null>(initialLoneWolf);

  // Available lists
  const [availableTournaments, setAvailableTournaments] = useState<any[]>([]);
  const [availableLeagueMatches, setAvailableLeagueMatches] = useState<any[]>([]);
  const [availableLoneWolfMatches, setAvailableLoneWolfMatches] = useState<any[]>([]);
  const [allLeagueSquads, setAllLeagueSquads] = useState<any[]>([]);
  const [allTeams, setAllTeams] = useState<any[]>([]);
  const [leaguesMap, setLeaguesMap] = useState<Record<string, string>>({});

  const [isCompressing, setIsCompressing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isFetchingMediaInfo, setIsFetchingMediaInfo] = useState(false);
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [tagPickerTab, setTagPickerTab] = useState<'tournament' | 'league' | 'lonewolf'>('tournament');
  const [showMyMatchesOnly, setShowMyMatchesOnly] = useState(true);

  // Auto Split State

  const [fetchedBrandData, setFetchedBrandData] = useState<{
    brandName: string;
    brandLogoUrl: string;
  } | null>(null);

  useEffect(() => {
    if (!currentUserId) return;
    const loadBrandDetails = async () => {
      try {
        const b1 = await getDoc(doc(db, 'host_brands', currentUserId));
        if (b1.exists()) {
          const data = b1.data();
          if (data?.brandName) {
            setFetchedBrandData({
              brandName: String(data.brandName).trim(),
              brandLogoUrl: data.brandLogoUrl || data.logoUrl || ''
            });
            return;
          }
        }
        const b2 = await getDoc(doc(db, 'pro_host_brands', currentUserId));
        if (b2.exists()) {
          const data = b2.data();
          if (data?.brandName) {
            setFetchedBrandData({
              brandName: String(data.brandName).trim(),
              brandLogoUrl: data.brandLogoUrl || data.logoUrl || ''
            });
            return;
          }
        }
        const u = await getDoc(doc(db, 'users', currentUserId));
        if (u.exists()) {
          const ud = u.data();
          const bName = ud?.brandName || ud?.hostName || ud?.proHostName || ud?.hostTitle || ud?.hostOrganization || ud?.organizationName;
          if (bName) {
            setFetchedBrandData({
              brandName: String(bName).trim(),
              brandLogoUrl: ud.brandLogoUrl || ud.hostPhotoUrl || ud.hostPhoto || ''
            });
          }
        }
      } catch (err) {
        console.warn("Error fetching host brand details:", err);
      }
    };
    loadBrandDetails();
  }, [currentUserId]);

  const hostName = (
    fetchedBrandData?.brandName ||
    currentUserProfile?.brandName ||
    currentUserProfile?.hostName ||
    currentUserProfile?.proHostName ||
    currentUserProfile?.hostTitle ||
    currentUserProfile?.hostOrganization ||
    currentUserProfile?.organizationName ||
    ''
  ).trim();

  const hostPhoto = (
    fetchedBrandData?.brandLogoUrl ||
    currentUserProfile?.brandLogoUrl ||
    currentUserProfile?.logoUrl ||
    currentUserProfile?.hostLogoUrl ||
    currentUserProfile?.hostPhotoUrl ||
    currentUserProfile?.hostPhoto ||
    currentUserProfile?.photoURL ||
    currentUserProfile?.photoUrl ||
    'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=150&auto=format&fit=crop'
  );

  const gameName = (
    currentUserProfile?.fullName ||
    currentUserProfile?.displayName ||
    currentUserProfile?.name ||
    currentUserProfile?.gameName || 
    currentUserProfile?.inGameName || 
    currentUserProfile?.gamerTag || 
    currentUserProfile?.inGameUsername || 
    currentUserProfile?.ign || 
    currentUserProfile?.gamingUid ||
    'Player'
  ).trim();

  const playerPhoto = (
    currentUserProfile?.photoURL || 
    currentUserProfile?.photoUrl || 
    currentUserProfile?.avatar || 
    currentUserProfile?.avatarUrl || 
    currentUserProfile?.profilePic || 
    currentUserProfile?.profilePictureUrl || 
    'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=150&auto=format&fit=crop'
  );

  const hasHostProfile = Boolean(hostName && hostName.toLowerCase() !== gameName.toLowerCase());

  // Identity selection: 'host' (Page style) or 'player' (Personal Profile style)
  const [selectedIdentity, setSelectedIdentity] = useState<'host' | 'player'>('player');

  useEffect(() => {
    if (hasHostProfile) {
      setSelectedIdentity('host');
    } else {
      setSelectedIdentity('player');
    }
  }, [hasHostProfile]);

  const activeAuthorName = selectedIdentity === 'host' && hasHostProfile ? hostName : gameName;
  const activeAuthorPhoto = selectedIdentity === 'host' && hasHostProfile ? (hostPhoto || playerPhoto) : playerPhoto;
  const activeAuthorRole = selectedIdentity === 'host' && hasHostProfile ? (currentUserProfile?.role || 'pro_host') : 'player';

  const normalizeStr = (str: string) => (str || '').toString().replace(/\s+/g, ' ').trim().toLowerCase();
  const userSquadName = normalizeStr(currentUserProfile?.squad?.name || currentUserProfile?.squadName || currentUserProfile?.teamName || '');
  const userDisplayName = normalizeStr(currentUserProfile?.displayName || '');
  const isHost = ['pro_host', 'admin', 'main_admin'].includes(currentUserProfile?.role || '');

  const filteredTournaments = availableTournaments.filter(t => {
    if (!showMyMatchesOnly) return true;
    if (t.hostId === currentUserId) return true;
    const titleLower = normalizeStr(t.title);
    if (userSquadName && (titleLower.includes(userSquadName) || userSquadName.includes(titleLower))) return true;
    return false;
  });

  const filteredLeagueMatches = availableLeagueMatches
    .filter(m => {
      // Direct squad name matching (supports Bengali & other languages via normalization)
      const t1 = normalizeStr(m.t1);
      const t2 = normalizeStr(m.t2);
      const s = userSquadName;
      
      // Broad matching for language safety
      const matchesUserSquad = s && (t1 === s || t2 === s || t1.includes(s) || t2.includes(s) || s.includes(t1) || s.includes(t2));

      if (!isHost) {
        return matchesUserSquad;
      } else {
        if (showMyMatchesOnly) {
          return m.hostId === currentUserId || matchesUserSquad;
        }
        return true;
      }
    })
    .sort((a, b) => {
      const now = new Date();
      const dateA = new Date(a.customDate || a.date || '2000-01-01');
      const dateB = new Date(b.customDate || b.date || '2000-01-01');
      
      const isCompletedA = a.status === 'completed' || a.isPlayed || (a.scoreA !== undefined && a.scoreA > 0) || (a.scoreB !== undefined && a.scoreB > 0);
      const isCompletedB = b.status === 'completed' || b.isPlayed || (b.scoreA !== undefined && b.scoreA > 0) || (b.scoreB !== undefined && b.scoreB > 0);

      // Prioritize upcoming/ongoing over completed
      if (isCompletedA !== isCompletedB) {
        return isCompletedA ? 1 : -1;
      }

      // Within same category, sort by time
      return dateA.getTime() - dateB.getTime();
    });

  const filteredLoneWolfMatches = availableLoneWolfMatches.filter(m => {
    if (!showMyMatchesOnly) return true;
    if (isHost || m.hostId === currentUserId) return true;
    const p1Lower = String(m.player1 || '').toLowerCase();
    const p2Lower = String(m.player2 || '').toLowerCase();
    if (userDisplayName && (p1Lower.includes(userDisplayName) || p2Lower.includes(userDisplayName))) return true;
    return false;
  });

  // Fetch taggable tournaments, league matches, lone wolf matches on mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch Tournaments (all latest 20)
        const tourneySnap = await getDocs(query(collection(db, 'tournaments_freefire'), limit(20)));
        const tList = tourneySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAvailableTournaments(tList);

        // Fetch Leagues to build leagueId -> leagueName map
        const leaguesSnap = await getDocs(collection(db, 'pro_hosted_leagues'));
        const lMap: Record<string, string> = {};
        leaguesSnap.docs.forEach(doc => {
          const d = doc.data();
          lMap[doc.id] = d.title || d.name || 'Vortex Pro League';
        });
        setLeaguesMap(lMap);

        // Fetch all registered league squads to get cover photos and members
        const squadsSnap = await getDocs(collection(db, 'pro_league_squads'));
        const sList = squadsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllLeagueSquads(sList);

        // Fetch all teams to get cover photos and team details
        const teamsSnap = await getDocs(collection(db, 'teams'));
        const teamsList = teamsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAllTeams(teamsList);

        // Fetch League Schedule Matches (latest 100)
        const leagueMatchesSnap = await getDocs(query(collection(db, 'pro_league_schedule_matches'), limit(100)));
        const mList = leagueMatchesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAvailableLeagueMatches(mList);

        // Fetch Lone Wolf matches (latest 20)
        const loneWolfSnap = await getDocs(query(collection(db, 'lone_wolf_matches'), limit(20)));
        const lwList = loneWolfSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setAvailableLoneWolfMatches(lwList);
      } catch (err) {
        console.error("Error fetching taggable items:", err);
      }
    };
    fetchData();
  }, []);

  // Client-side image compression
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert("Please select a valid image file!");
      return;
    }

    setIsCompressing(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        const maxDimension = 1080;

        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        const compressedBase64 = canvas.toDataURL('image/jpeg', 0.75);
        setSelectedImage(compressedBase64);
        setIsCompressing(false);
      };
    };
    reader.readAsDataURL(file);
  };


  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setPostText(e.target.value);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!postText.trim() && !selectedImage && !selectedTournament && !selectedLeagueMatch && !selectedLoneWolfMatch) {
      alert("Please write something or attach a photo/match!");
      return;
    }

    setIsSubmitting(true);
    setUploadStatusText('Preparing post...');
    try {
      let imageUrl = '';
      if (selectedImage) {
        setUploadStatusText('Uploading post picture...');
        imageUrl = await uploadScreenshotToImgBB(selectedImage, 'pulse_post_picture');
      }

      setUploadStatusText('Publishing post to feed...');
      
      const isHostPosting = selectedIdentity === 'host' && hasHostProfile;
      const finalAuthorName = isHostPosting ? hostName : gameName;
      const finalAuthorPhoto = isHostPosting ? (hostPhoto || playerPhoto) : playerPhoto;
      const finalAuthorRole = isHostPosting ? (currentUserProfile?.role || 'pro_host') : (currentUserProfile?.role || 'player');

      const isUserAdmin = 
        (currentUserProfile?.email || '').toLowerCase().trim() === 'vortexesports150@gmail.com' ||
        ['admin', 'main_admin', 'super_admin', 'sub_admin'].includes((currentUserProfile?.role || '').toLowerCase().trim()) ||
        Boolean(currentUserProfile?.isAdmin) ||
        Boolean(currentUserProfile?.isMainAdmin) ||
        Boolean(currentUserProfile?.isSuperAdmin);

      const postStatus = isUserAdmin ? 'approved' : 'pending';

      const newPost: any = {
        userId: currentUserId,
        userName: finalAuthorName || 'Anonymous Player',
        userPhoto: finalAuthorPhoto,
        userRole: finalAuthorRole,
        authorIdentity: isHostPosting ? 'host' : 'player',
        isHostPost: isHostPosting,
        text: postText.trim(),
        likes: [],
        commentsCount: 0,
        sharesCount: 0,
        views: 0,
        createdAt: serverTimestamp(),
        status: postStatus,
        ...(isUserAdmin ? { approvedAt: serverTimestamp(), approvedBy: currentUserId } : {})
      };

      if (category !== 'all') {
        newPost.category = category;
      }
      
      if (imageUrl) {
        newPost.imageUrl = imageUrl;
      }

      // Tagged Match Data
      if (selectedTournament) {
        newPost.taggedMatch = {
          type: 'tournament',
          id: selectedTournament.id,
          title: selectedTournament.title,
          prize: selectedTournament.prizePool,
          banner: selectedTournament.bannerUrl || null
        };
      } else if (selectedLeagueMatch) {
        newPost.taggedMatch = {
          type: 'league',
          id: selectedLeagueMatch.id,
          title: selectedLeagueMatch.matchTitle || 'League Match',
          player1: selectedLeagueMatch.player1?.gameName || selectedLeagueMatch.player1 || 'TBA',
          player2: selectedLeagueMatch.player2?.gameName || selectedLeagueMatch.player2 || 'TBA'
        };
      } else if (selectedLoneWolfMatch) {
        newPost.taggedMatch = {
          type: 'lone_wolf',
          id: selectedLoneWolfMatch.id,
          title: selectedLoneWolfMatch.title || `Lone Wolf #${selectedLoneWolfMatch.matchNumber}`,
          prize: selectedLoneWolfMatch.prizePool || 0,
          player1: selectedLoneWolfMatch.player1?.gameName || selectedLoneWolfMatch.player1 || 'TBA',
          player2: selectedLoneWolfMatch.player2?.gameName || selectedLoneWolfMatch.player2 || 'TBA'
        };
      }

      await addDoc(collection(db, 'pulse_posts'), newPost);
      
      if (onPostCreated) {
        onPostCreated();
      }
      
      setPostText('');
      setSelectedImage(null);
      setCategory('all');
      setSelectedTournament(null);
      setSelectedLeagueMatch(null);
      setSelectedLoneWolfMatch(null);
      onClose();
    } catch (err: any) {
      console.error('Error creating post:', err);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
      setUploadStatusText('');
    }
  };

  return (
    <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 animate-fadeIn">
      <div 
        className="w-full max-w-lg max-h-[92vh] sm:max-h-[88vh] overflow-y-auto bg-[#050814] border-t sm:border border-cyan-500/30 rounded-t-3xl sm:rounded-3xl p-4 sm:p-5 shadow-[0_0_50px_rgba(6,182,212,0.25)] flex flex-col gap-3.5 sm:gap-4 relative"
        onClick={(e) => e.stopPropagation()}
      >
{/* Mobile drag handle */}
        <div className="w-12 h-1 bg-white/20 rounded-full mx-auto sm:hidden -mt-1 mb-1" />

{/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Sparkles className="w-4 h-4 animate-pulse" />
            </div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
              Create Pulse Post
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full bg-slate-900 border border-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

{/* User Profile Header / Facebook Page vs Personal Profile Switcher */}
        <div className="bg-[#0a0f24] p-3.5 rounded-2xl border border-cyan-500/30 space-y-3 shadow-lg">
{/* Active Posting Identity Display */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={activeAuthorPhoto} 
                alt="" 
                referrerPolicy="no-referrer"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = selectedIdentity === 'host'
                    ? 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=150&auto=format&fit=crop'
                    : 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=150&auto=format&fit=crop';
                }}
                className={`w-11 h-11 rounded-2xl object-cover border-2 shadow-lg transition-all ${
                  selectedIdentity === 'host' 
                    ? 'border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.4)]' 
                    : 'border-white/30 shadow-[0_0_10px_rgba(255,255,255,0.1)]'
                }`} 
              />
              <span className={`absolute -bottom-1 -right-1 p-0.5 rounded-md text-[10px] ${
                selectedIdentity === 'host' ? 'bg-cyan-500 text-slate-950 font-bold' : 'bg-slate-800 text-white border border-white/20'
              }`}>
                {selectedIdentity === 'host' ? '🏆' : '🎮'}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-black text-white truncate font-sans tracking-wide">
                  {activeAuthorName}
                </span>
                {selectedIdentity === 'host' && (
                  <span className="px-2 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-400/40 text-[10px] font-black text-cyan-300 uppercase font-mono tracking-wider">
                    Official Host
                  </span>
                )}
              </div>
              <span className="text-[10px] text-cyan-400/80 font-mono font-bold uppercase block mt-0.5">
                Posting to Community Feed
              </span>
            </div>
          </div>

          {hasHostProfile && (
            <div className="pt-2.5 border-t border-white/10 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-wider">
                  Post as Profile:
                </span>
                <span className="text-[10px] font-mono text-cyan-400 font-bold">
                  {selectedIdentity === 'host' ? 'Host Profile (Page Active)' : 'Personal Profile Active'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {/* Host Profile (Page) Button */}
                <button
                  type="button"
                  onClick={() => setSelectedIdentity('host')}
                  className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-left cursor-pointer ${
                    selectedIdentity === 'host'
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400'
                      : 'bg-slate-950/80 border-white/10 text-slate-400 hover:border-cyan-500/40 hover:text-slate-200'
                  }`}
                >
                  <img 
                    src={hostPhoto} 
                    alt="" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=150&auto=format&fit=crop';
                    }}
                    className="w-7 h-7 rounded-lg object-cover border border-cyan-400/50 shrink-0" 
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black truncate text-cyan-300">
                      {hostName}
                    </div>
                    <div className="text-[9px] uppercase font-mono font-bold text-slate-400">
                      Host Profile
                    </div>
                  </div>
                </button>

                {/* Player Profile (Personal) Button */}
                <button
                  type="button"
                  onClick={() => setSelectedIdentity('player')}
                  className={`p-2 rounded-xl border transition-all flex items-center gap-2 text-left cursor-pointer ${
                    selectedIdentity === 'player'
                      ? 'bg-cyan-500/20 border-cyan-400 text-white shadow-[0_0_15px_rgba(6,182,212,0.25)] ring-1 ring-cyan-400'
                      : 'bg-slate-950/80 border-white/10 text-slate-400 hover:border-cyan-500/40 hover:text-slate-200'
                  }`}
                >
                  <img 
                    src={playerPhoto} 
                    alt="" 
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).src = 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?q=80&w=150&auto=format&fit=crop';
                    }}
                    className="w-7 h-7 rounded-lg object-cover border border-white/20 shrink-0" 
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-black truncate text-white">
                      {gameName}
                    </div>
                    <div className="text-[9px] uppercase font-mono font-bold text-slate-400">
                      🎮 Game Profile
                    </div>
                  </div>
                </button>
              </div>
            </div>
          )}
        </div>

{/* Category Selector Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar">
          {[
            { id: 'gaming', label: 'Gaming', icon: Gamepad2 },
            { id: 'tournaments', label: 'Tournament', icon: Trophy },
            { id: 'league', label: 'League', icon: Trophy },
            { id: 'lone_wolf', label: 'Lone Wolf', icon: Zap },
            { id: 'squad', label: 'Squad', icon: Users },
            { id: 'announcements', label: 'Notice', icon: Bell },
            { id: 'rewards', label: 'Rewards', icon: Gift },
          ].map((cat) => {
            const Icon = cat.icon;
            const isSel = category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id as any)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all shrink-0 ${
                  isSel 
                    ? 'bg-cyan-500/20 border border-cyan-400 text-cyan-300 shadow-[0_0_10px_rgba(6,182,212,0.3)]' 
                    : 'bg-slate-900/60 border border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

{/* Text Area Input */}
        <textarea
          value={postText}
          onChange={handleTextChange}
          placeholder="What's on your mind? Share an update or gaming moment..."
          className="w-full bg-slate-900/80 border border-white/10 rounded-2xl p-3.5 text-xs text-white placeholder:text-slate-500 outline-none focus:border-cyan-400 min-h-[100px] resize-none font-sans leading-relaxed"
          maxLength={1000}
        />


        {/* Selected Image Preview (Max 1 Photo rule) */}
        {selectedImage &&  (
          <div className="relative rounded-2xl overflow-hidden border border-cyan-500/40 max-h-[160px] group">
            <img src={selectedImage} alt="Preview" className="w-full h-full object-cover" />
            <button
              onClick={() => setSelectedImage(null)}
              className="absolute top-2 right-2 p-1.5 bg-black/80 rounded-full text-white border border-rose-500/50 hover:bg-rose-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

{/* Attached Tournament Card Preview */}
        {selectedTournament && (
          <div className="p-3 bg-gradient-to-r from-slate-900 to-[#0c152e] border border-cyan-500/40 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-white font-mono truncate">{selectedTournament.title}</p>
                <p className="text-[10px] text-cyan-300">Prize: ৳ {selectedTournament.prizePool || 0} • Free Fire Tournament</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedTournament(null)}
              className="text-slate-400 hover:text-rose-400 text-xs p-1 shrink-0 ml-2"
            >
              Remove
            </button>
          </div>
        )}

{/* Attached League Match Preview */}
        {selectedLeagueMatch && (
          <div className="p-3 bg-gradient-to-r from-slate-900 to-[#050918] border border-cyan-500/45 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <Gamepad2 className="w-4 h-4 text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-white font-mono truncate">
                  {leaguesMap[selectedLeagueMatch.leagueId] || 'Vortex Pro League'}: Match #{selectedLeagueMatch.matchId || ''}
                </p>
                <p className="text-[10px] text-slate-300 truncate">
                  {(selectedLeagueMatch.squad1Name || selectedLeagueMatch.t1 || 'TBD')} vs {(selectedLeagueMatch.squad2Name || selectedLeagueMatch.t2 || 'TBD')}
                </p>
                <p className="text-[9px] text-cyan-300">
                  Time: {selectedLeagueMatch.customDate || ''} at {selectedLeagueMatch.customTime || selectedLeagueMatch.time || 'TBD'}
                </p>
              </div>
            </div>
            <button
              onClick={() => setSelectedLeagueMatch(null)}
              className="text-slate-400 hover:text-rose-400 text-xs p-1 shrink-0 ml-2"
            >
              Remove
            </button>
          </div>
        )}

{/* Attached Lone Wolf Match Preview */}
        {selectedLoneWolfMatch && (
          <div className="p-3 bg-gradient-to-r from-slate-900 to-[#060a1c] border border-pink-500/40 rounded-xl flex items-center justify-between text-xs animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <Users className="w-4 h-4 text-pink-400 shrink-0" />
              <div className="min-w-0">
                <p className="font-bold text-white font-mono truncate">
                  {selectedLoneWolfMatch.title || `Lone Wolf Match #${selectedLoneWolfMatch.matchNumber}`}
                </p>
                <p className="text-[10px] text-pink-300">
                  {(typeof selectedLoneWolfMatch.player1 === 'object' ? (selectedLoneWolfMatch.player1?.gameName || selectedLoneWolfMatch.player1?.inGameName || selectedLoneWolfMatch.player1?.gamerTag || selectedLoneWolfMatch.player1?.displayName || 'Player 1') : (selectedLoneWolfMatch.player1 || 'Player 1'))} vs {(typeof selectedLoneWolfMatch.player2 === 'object' ? (selectedLoneWolfMatch.player2?.gameName || selectedLoneWolfMatch.player2?.inGameName || selectedLoneWolfMatch.player2?.gamerTag || selectedLoneWolfMatch.player2?.displayName || 'Player 2') : (selectedLoneWolfMatch.player2 || 'Player 2'))} • Prize: ৳ {selectedLoneWolfMatch.prizePool || 0}
                </p>
                <p className="text-[9px] text-slate-300">{selectedLoneWolfMatch.time || 'TBD'}</p>
              </div>
            </div>
            <button
              onClick={() => setSelectedLoneWolfMatch(null)}
              className="text-slate-400 hover:text-rose-400 text-xs p-1 shrink-0 ml-2"
            >
              Remove
            </button>
          </div>
        )}

        {/* Actions Bar (Upload Image) */}
        <div className="flex flex-col gap-3 pt-2 border-t border-white/10">
          
          {/* Upload Progress Bar (Visible during submission) */}
          {isSubmitting && 0 > 0 && (
            <div className="w-full space-y-1">
              <div className="flex items-center justify-between text-[10px] font-mono text-cyan-300">
                <span className="animate-pulse">{uploadStatusText}</span>
                <span>{Math.round(0)}%</span>
              </div>
              <div className="w-full h-1.5 bg-slate-900 rounded-full overflow-hidden border border-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-400 to-pink-500 shadow-[0_0_10px_rgba(6,182,212,0.8)] transition-all duration-300 ease-out"
                  style={{ width: `${0}%` }}
                />
              </div>
            </div>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              
{/* Image Picker */}
              <label className="p-2.5 rounded-xl bg-slate-900 border border-white/10 hover:border-pink-500 text-pink-400 hover:bg-pink-500/10 cursor-pointer transition-all flex items-center gap-1.5 text-[11px] font-bold font-mono">
                <ImageIcon className="w-3.5 h-3.5" />
                <span>{selectedImage ? 'Change Photo' : 'Add Photo'}</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleImageSelect} 
                  className="hidden"
                  disabled={isSubmitting} 
                />
              </label>


            </div>

{/* Submit Post Button */}
            <button
              onClick={handleSubmit}
              disabled={isSubmitting || (!postText.trim() && !selectedImage && !selectedTournament && !selectedLeagueMatch && !selectedLoneWolfMatch)}
              className="px-5 py-2.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-40 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{ 'Posting...'}</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Post Now</span>
                </>
              )}
            </button>
          </div>
        </div>

{/* Tabbed Interactive Match/Tournament Picker popup */}
        {showTagPicker && (
          <div className="absolute inset-x-3 bottom-16 bg-[#04060e] border border-cyan-500/40 rounded-2xl p-4 shadow-[0_0_40px_rgba(6,182,212,0.35)] z-50 space-y-3 animate-slideUp">
            {/* Tab Selector Buttons */}
            <div className="flex border-b border-white/10 pb-2 gap-2">
              <button
                type="button"
                onClick={() => setTagPickerTab('tournament')}
                className={`flex-1 py-1.5 text-[9px] font-black uppercase font-mono tracking-wider rounded-lg border transition-all ${
                  tagPickerTab === 'tournament'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400 shadow-[0_0_10px_rgba(245,158,11,0.2)]'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Tournaments
              </button>
              <button
                type="button"
                onClick={() => setTagPickerTab('league')}
                className={`flex-1 py-1.5 text-[9px] font-black uppercase font-mono tracking-wider rounded-lg border transition-all ${
                  tagPickerTab === 'league'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                League Matches
              </button>
              <button
                type="button"
                onClick={() => setTagPickerTab('lonewolf')}
                className={`flex-1 py-1.5 text-[9px] font-black uppercase font-mono tracking-wider rounded-lg border transition-all ${
                  tagPickerTab === 'lonewolf'
                    ? 'bg-pink-500/20 border-pink-500 text-pink-400 shadow-[0_0_10px_rgba(236,72,153,0.2)]'
                    : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                }`}
              >
                Lone Wolf
              </button>
            </div>
            {/* Smart cyber filter toggle bar */}
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-slate-950 rounded-xl border border-white/5 text-[10px]">
              <span className="text-slate-400 font-mono font-bold truncate pr-2 max-w-[65%]">
                {tagPickerTab === 'tournament' 
                  ? (userSquadName ? `🎯 Squad: "${userSquadName}"` : `🎯 Host: ${isHost ? 'You' : 'General'}`)
                  : tagPickerTab === 'league'
                  ? (userSquadName ? `🛡️ Squad Match: "${userSquadName}"` : `🛡️ League Matches`)
                  : (userDisplayName ? `🐺 Player: "${userDisplayName}"` : `🐺 1v1 Matches`)}
              </span>
              {isHost ? (
                <button
                  type="button"
                  onClick={() => setShowMyMatchesOnly(!showMyMatchesOnly)}
                  className={`px-2 py-0.5 rounded font-mono uppercase font-black text-[8.5px] tracking-wider transition-all whitespace-nowrap shrink-0 ${
                    showMyMatchesOnly 
                      ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 shadow-[0_0_8px_rgba(6,182,212,0.2)]' 
                      : 'bg-slate-900 text-slate-500 border border-white/5'
                  }`}
                >
                  {showMyMatchesOnly ? 'My matches only' : 'Showing all'}
                </button>
              ) : (
                <span className="px-2 py-0.5 rounded font-mono uppercase font-black text-[8px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 shrink-0">
                  My Match Required
                </span>
              )}
            </div>

            {/* List View with customized layouts */}
            <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 custom-scrollbar">
              {tagPickerTab === 'tournament' && (
                filteredTournaments.length === 0 ? (
                  <div className="text-center py-5 space-y-1">
                    <p className="text-[10px] text-slate-500 font-mono">No tournaments found for your team.</p>
                    {isHost && (
                      <button 
                        type="button"
                        onClick={() => setShowMyMatchesOnly(false)}
                        className="text-[9px] text-cyan-400 font-mono underline uppercase font-bold"
                      >
                        Show All Tournaments
                      </button>
                    )}
                  </div>
                ) : (
                  filteredTournaments.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setSelectedTournament(t);
                        setSelectedLeagueMatch(null);
                        setSelectedLoneWolfMatch(null);
                        setShowTagPicker(false);
                      }}
                      className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-900 border border-white/5 hover:border-amber-500/30 rounded-xl text-xs text-white flex items-center justify-between transition-all"
                    >
                      <div className="min-w-0">
                        <span className="font-mono truncate font-bold text-slate-200 block">{t.title || 'Free Fire Tournament'}</span>
                        <span className="text-[9px] text-slate-400 font-mono font-bold">Date: {t.matchDate || t.time || 'TBD'}</span>
                      </div>
                      <span className="text-[10px] text-amber-400 font-bold ml-2 shrink-0 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">৳ {t.prizePool || 0}</span>
                    </button>
                  ))
                )
              )}

              {tagPickerTab === 'league' && (
                filteredLeagueMatches.length === 0 ? (
                  <div className="text-center py-5 space-y-1.5 px-2">
                    <p className="text-[10px] text-red-400 font-mono font-bold">You must have an upcoming scheduled match in the league to tag it.</p>
                    <p className="text-[8px] text-slate-500 font-mono">Verify if your squad "{userSquadName || 'No Squad'}" is registered and has active matchups scheduled.</p>
                    {isHost && (
                      <button 
                        type="button"
                        onClick={() => setShowMyMatchesOnly(false)}
                        className="text-[9px] text-cyan-400 font-mono underline uppercase font-bold"
                      >
                        Show All League Matches
                      </button>
                    )}
                  </div>
                ) : (
                  filteredLeagueMatches.map((m) => {
                    const lName = leaguesMap[m.leagueId] || 'Pro League';
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => {
                          setSelectedLeagueMatch(m);
                          setSelectedTournament(null);
                          setSelectedLoneWolfMatch(null);
                          setShowTagPicker(false);
                        }}
                        className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-900 border border-white/5 hover:border-cyan-500/30 rounded-xl text-xs text-white flex flex-col gap-1 transition-all"
                      >
                        <div className="flex justify-between items-center w-full">
                          <span className="font-mono text-[9px] text-cyan-400 font-black uppercase tracking-wider truncate">{lName}</span>
                          <span className="text-[8px] text-slate-400 font-mono">ID: #{m.matchId || m.id}</span>
                        </div>
                        <div className="flex items-center justify-between text-xs text-white font-sans">
                          <span className="font-bold truncate">{m.t1 || 'TBD'} vs {m.t2 || 'TBD'}</span>
                          <span className="text-[9px] text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded ml-2 shrink-0 font-mono">
                            {m.customTime || m.time || 'TBD'}
                          </span>
                        </div>
                      </button>
                    );
                  })
                )
              )}

              {tagPickerTab === 'lonewolf' && (
                filteredLoneWolfMatches.length === 0 ? (
                  <div className="text-center py-5 space-y-1">
                    <p className="text-[10px] text-slate-500 font-mono">No Lone Wolf matches for "{userDisplayName}".</p>
                    <button 
                      type="button"
                      onClick={() => setShowMyMatchesOnly(false)}
                      className="text-[9px] text-cyan-400 font-mono underline uppercase font-bold"
                    >
                      Show All 1v1 Matches
                    </button>
                  </div>
                ) : (
                  filteredLoneWolfMatches.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedLoneWolfMatch(m);
                        setSelectedTournament(null);
                        setSelectedLeagueMatch(null);
                        setShowTagPicker(false);
                      }}
                      className="w-full text-left p-2.5 bg-slate-950 hover:bg-slate-900 border border-white/5 hover:border-pink-500/30 rounded-xl text-xs text-white flex flex-col gap-1 transition-all"
                    >
                      <div className="flex justify-between items-center w-full">
                        <span className="font-mono text-[10px] text-pink-400 font-bold uppercase tracking-wider truncate">
                          {m.title || `Lone Wolf #${m.matchNumber}`}
                        </span>
                        <span className="text-[9px] text-amber-400 font-mono font-black shrink-0">Prize: ৳{m.prizePool || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-300 font-sans">
                        <span className="truncate">
                          {(typeof m.player1 === 'object' ? (m.player1?.gameName || m.player1?.inGameName || m.player1?.gamerTag || m.player1?.displayName || 'Player 1') : (m.player1 || 'Player 1'))} vs {(typeof m.player2 === 'object' ? (m.player2?.gameName || m.player2?.inGameName || m.player2?.gamerTag || m.player2?.displayName || 'Player 2') : (m.player2 || 'Player 2'))}
                        </span>
                        <span className="text-[9px] text-slate-400 ml-2 shrink-0 font-mono">{m.time || 'TBD'}</span>
                      </div>
                    </button>
                  ))
                )
              )}
            </div>
            
{/* Close actions */}
            <div className="flex justify-end pt-1">
              <button
                type="button"
                onClick={() => setShowTagPicker(false)}
                className="px-3 py-1 bg-slate-900 border border-white/5 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg text-[10px] font-bold font-mono uppercase"
              >
                Close Picker
              </button>
            </div>
          </div>
        )}
      </div>
      
{/* FULL SCREEN SCREEN-BLOCKING PROGRESS NOTIFIER OVERLAY */}
      {isSubmitting && (
        <div 
          className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none pointer-events-auto cursor-wait animate-fadeIn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <div className="max-w-md w-full bg-[#040714] border-2 border-cyan-500/60 rounded-3xl p-6 sm:p-8 shadow-[0_0_90px_rgba(6,182,212,0.5)] flex flex-col items-center gap-5 relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-500/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
            
            <div className="relative flex items-center justify-center my-2">
              <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 border-r-pink-500 animate-spin shadow-[0_0_30px_rgba(6,182,212,0.6)]" />
              <div className="absolute w-14 h-14 rounded-full border-2 border-pink-500/30 border-b-cyan-300 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              <Sparkles className="absolute w-7 h-7 text-pink-400 animate-pulse" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-black text-white font-mono uppercase tracking-wider flex items-center justify-center gap-2">
                <span>Publishing Pulse Post...</span>
              </h3>
              <p className="text-xs text-cyan-300 font-mono font-bold">
                Publishing to Pulse Feed...
              </p>
            </div>

            <div className="px-4 py-2.5 bg-slate-950/90 border border-cyan-500/40 rounded-xl text-xs font-mono text-cyan-200 w-full flex items-center justify-center gap-2 shadow-inner">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
              <span className="truncate font-bold">{uploadStatusText || 'Processing upload...'}</span>
            </div>

            <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl flex items-start gap-2 text-[11px] text-rose-200 text-left w-full shadow-lg">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-snug">
                🛑 <b>Please wait:</b> Do not navigate away or refresh until upload is complete.
              </span>
            </div>
          </div>
        </div>
      )}
       
    </div>
  );
};
