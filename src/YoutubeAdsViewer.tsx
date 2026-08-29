import React, { useState, useEffect, useRef } from 'react';
import { doc, getDoc, updateDoc, increment, setDoc, addDoc, collection, serverTimestamp, query, where, getDocs, limit } from 'firebase/firestore';
import { Coins, PlayCircle, CheckCircle, AlertCircle, RefreshCw, MapPin } from 'lucide-react';

function extractYoutubeVideoId(url: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }
  const regExp = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=|shorts\/|live\/)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regExp);
  return match ? match[1] : '';
}

interface CustomYoutubePlayerProps {
  videoId: string;
  onProgress: (playedSeconds: number) => void;
  playerRef?: React.MutableRefObject<any>;
}

function CustomYoutubePlayer({ videoId, onProgress, playerRef }: CustomYoutubePlayerProps) {
  const containerId = useRef(`yt-player-${Math.random().toString(36).substring(2, 11)}`);
  const playerInstanceRef = useRef<any>(null);
  const progressIntervalRef = useRef<any>(null);

  useEffect(() => {
    // 1. Load YouTube IFrame API script if not present
    if (!(window as any).YT) {
      const tag = document.createElement('script');
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    let checkInterval: any;
    let isDestroyed = false;

    const initPlayer = () => {
      if (isDestroyed) return;
      const YT = (window as any).YT;
      if (!YT || !YT.Player) return;

      try {
        playerInstanceRef.current = new YT.Player(containerId.current, {
          height: '100%',
          width: '100%',
          videoId: videoId,
          playerVars: {
            autoplay: 0,
            controls: 1,
            rel: 0,
            modestbranding: 1,
            origin: window.location.origin,
            enablejsapi: 1,
          },
          events: {
            onStateChange: (event: any) => {
              // event.data matches:
              // 1 = PLAYING, 2 = PAUSED, 0 = ENDED
              if (event.data === 1) {
                if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
                progressIntervalRef.current = setInterval(() => {
                  if (playerInstanceRef.current && typeof playerInstanceRef.current.getCurrentTime === 'function') {
                    onProgress(playerInstanceRef.current.getCurrentTime());
                  }
                }, 500);
              } else {
                if (progressIntervalRef.current) {
                  clearInterval(progressIntervalRef.current);
                  progressIntervalRef.current = null;
                }
              }
            }
          }
        });

        if (playerRef) {
          playerRef.current = playerInstanceRef.current;
        }
      } catch (err) {
        console.error("Error initializing YT Player instance:", err);
      }
    };

    if ((window as any).YT && (window as any).YT.Player) {
      initPlayer();
    } else {
      const previousCallback = (window as any).onYouTubeIframeAPIReady;
      (window as any).onYouTubeIframeAPIReady = () => {
        if (previousCallback) previousCallback();
        initPlayer();
      };

      checkInterval = setInterval(() => {
        if ((window as any).YT && (window as any).YT.Player) {
          clearInterval(checkInterval);
          initPlayer();
        }
      }, 300);
    }

    return () => {
      isDestroyed = true;
      if (checkInterval) clearInterval(checkInterval);
      if (progressIntervalRef.current) clearInterval(progressIntervalRef.current);
      if (playerInstanceRef.current && typeof playerInstanceRef.current.destroy === 'function') {
        try {
          playerInstanceRef.current.destroy();
        } catch (e) {
          // ignore
        }
      }
    };
  }, [videoId]);

  return (
    <div className="w-full h-full bg-black">
      <div id={containerId.current} className="w-full h-full"></div>
    </div>
  );
}

export function YoutubeAdsViewer({ db, user, userProfile, onBack, onNavigateToMyAds }: { db: any, user: any, userProfile?: any, onBack?: () => void, onNavigateToMyAds?: () => void }) {
  const [loading, setLoading] = useState(true);
  const [claiming, setClaiming] = useState(false);
  const [activeCampaign, setActiveCampaign] = useState<any>(null);
  const [pricing, setPricing] = useState({ rewardPerView: 0.05 });
  const [todayWatched, setTodayWatched] = useState(0);
  const [deviceWatched, setDeviceWatched] = useState(0);
  const [maxDailyViews, setMaxDailyViews] = useState(10);
  
  const [playedSeconds, setPlayedSeconds] = useState(0);
  const [canClaim, setCanClaim] = useState(false);
  const lastPlayedSecondsRef = useRef<number>(0);
  const actualWatchTimeRef = useRef<number>(0);
  const playerRef = useRef<any>(null);

  // Get or Create Device ID
  const getOrCreateDeviceId = () => {
    let id = localStorage.getItem('vortex_esports_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
      localStorage.setItem('vortex_esports_device_id', id);
    }
    return id;
  };

  const deviceId = getOrCreateDeviceId();

  useEffect(() => {
    fetchData();
  }, [user.uid]);

  useEffect(() => {
    setPlayedSeconds(0);
    setCanClaim(false);
    lastPlayedSecondsRef.current = 0;
    actualWatchTimeRef.current = 0;
  }, [activeCampaign?.id]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Get YouTube Config (to check dynamic maxDailyViews limit)
      let currentMaxDailyViews = 10;
      const sysAdsSnap = await getDoc(doc(db, 'system_config', 'youtube_ads'));
      if (sysAdsSnap.exists()) {
        const sysData = sysAdsSnap.data();
        if (sysData.maxDailyViews !== undefined) {
          currentMaxDailyViews = Number(sysData.maxDailyViews);
        }
      }
      setMaxDailyViews(currentMaxDailyViews);

      // 2. Get Pricing
      const pSnap = await getDoc(doc(db, 'system_config', 'ads_pricing'));
      if (pSnap.exists()) {
        setPricing(pSnap.data() as any);
      }

      // Get user's daily stats
      const today = new Date().toISOString().split('T')[0];
      const statsRef = doc(db, 'users', user.uid, 'daily_stats', 'campaign_ads');
      const statsSnap = await getDoc(statsRef);
      
      let watchedIds: string[] = [];
      let watchedCount = 0;

      if (statsSnap.exists()) {
        const data = statsSnap.data();
        if (data.date === today) {
          watchedIds = data.watchedIds || [];
          watchedCount = data.count || 0;
        } else {
          await setDoc(statsRef, { date: today, watchedIds: [], count: 0 });
        }
      } else {
        await setDoc(statsRef, { date: today, watchedIds: [], count: 0 });
      }

      setTodayWatched(watchedCount);

      // 3. Get device's daily stats
      const devStatsRef = doc(db, 'device_stats', deviceId, 'daily_stats', 'campaign_ads');
      const devStatsSnap = await getDoc(devStatsRef);
      let devWatchedCount = 0;
      let devWatchedIds: string[] = [];

      if (devStatsSnap.exists()) {
        const devData = devStatsSnap.data();
        if (devData.date === today) {
          devWatchedCount = devData.count || 0;
          devWatchedIds = devData.watchedIds || [];
        } else {
          await setDoc(devStatsRef, { date: today, watchedIds: [], count: 0 });
        }
      } else {
        await setDoc(devStatsRef, { date: today, watchedIds: [], count: 0 });
      }

      setDeviceWatched(devWatchedCount);

      // Combine both watched campaign IDs to avoid displaying campaigns watched by other accounts on the same device!
      const allWatchedIds = Array.from(new Set([...watchedIds, ...devWatchedIds]));

      if (watchedCount >= currentMaxDailyViews || devWatchedCount >= currentMaxDailyViews) {
        setActiveCampaign(null);
        setLoading(false);
        return;
      }

      // Fetch active campaigns
      const q = query(collection(db, 'ad_campaigns'), where('status', '==', 'active'));
      const snap = await getDocs(q);
      let activeCamps: any[] = [];
      snap.forEach(d => {
        if (!allWatchedIds.includes(d.id)) {
          activeCamps.push({ id: d.id, ...d.data() });
        }
      });

      // Filter by location
      activeCamps = activeCamps.filter(camp => {
        if (!camp.targetAudienceType || camp.targetAudienceType === 'all') return true;
        if (!userProfile) return false; // If target is specific but user has no profile, maybe deny? Or let pass? Let's deny to be strict.
        
        const userDiv = userProfile.division;
        const userDist = userProfile.district;
        const userUpa = userProfile.upazila;
        
        if (!userDiv) return false;

        const targets = camp.targetLocations || [];
        if (targets.length === 0) return true;

        // Check if user matches any of the target locations
        return targets.some((loc: any) => {
          // If division doesn't match, false
          if (loc.division !== userDiv) return false;
          
          // Division matches. If target has district, it must match
          if (loc.district && loc.district !== userDist) return false;
          
          // District matches (or wasn't targeted). If target has upazila, it must match
          if (loc.upazila && loc.upazila !== userUpa) return false;
          
          return true; // Match!
        });
      });

      if (activeCamps.length > 0) {
        // Randomly pick one
        const randomIdx = Math.floor(Math.random() * activeCamps.length);
        setActiveCampaign(activeCamps[randomIdx]);
      } else {
        // Fallback to system default ads
        try {
          const sysAdsSnap = await getDoc(doc(db, 'system_config', 'youtube_ads'));
          if (sysAdsSnap.exists()) {
            const sysConfig = sysAdsSnap.data();
            const fallbackAds = [];
            
            if (sysConfig.video1Active && sysConfig.video1Url && !allWatchedIds.includes('sys_video1')) {
              fallbackAds.push({
                id: 'sys_video1',
                videoUrl: sysConfig.video1Url,
                title: 'Sponsored Content',
                rewardPerView: sysConfig.video1Tokens || 1,
                isSystemAd: true
              });
            }
            if (sysConfig.video2Active && sysConfig.video2Url && !allWatchedIds.includes('sys_video2')) {
              fallbackAds.push({
                id: 'sys_video2',
                videoUrl: sysConfig.video2Url,
                title: 'Sponsored Content',
                rewardPerView: sysConfig.video2Tokens || 1,
                isSystemAd: true
              });
            }
            
            if (fallbackAds.length > 0) {
              const randomIdx = Math.floor(Math.random() * fallbackAds.length);
              setActiveCampaign(fallbackAds[randomIdx]);
            } else {
              setActiveCampaign(null);
            }
          } else {
            setActiveCampaign(null);
          }
        } catch (err) {
          console.error("Error fetching fallback ads:", err);
          setActiveCampaign(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleClaim = async () => {
    if (!activeCampaign || !canClaim || claiming) return;
    
    setClaiming(true);
    const reward = activeCampaign.isSystemAd ? (activeCampaign.rewardPerView || 1) : (pricing.rewardPerView || 0.05);
    
    const action = async () => {
      const location = userProfile ? `${userProfile.division || ''} ${userProfile.district ? '> '+userProfile.district : ''} ${userProfile.upazila ? '> '+userProfile.upazila : ''}`.trim() : 'Unknown Location';

      if (!activeCampaign.isSystemAd) {
        // 1. Update Campaign View Count & add View Log
        const campRef = doc(db, 'ad_campaigns', activeCampaign.id);
        const newViewsCount = (activeCampaign.viewsCount || 0) + 1;
        const updates: any = { viewsCount: increment(1), updatedAt: serverTimestamp() };
        
        if (newViewsCount >= activeCampaign.targetViews) {
          updates.status = 'completed';
        }
        await updateDoc(campRef, updates);

        await addDoc(collection(db, 'ad_campaigns', activeCampaign.id, 'views'), {
          viewerId: user.uid,
          viewerEmail: user.email,
          viewerName: user.displayName || 'Unknown',
          location: location,
          timestamp: serverTimestamp()
        });
      }

      // 2. Update user daily stats
      const today = new Date().toISOString().split('T')[0];
      const statsRef = doc(db, 'users', user.uid, 'daily_stats', 'campaign_ads');
      const statsSnap = await getDoc(statsRef);
      let newWatchedIds = [activeCampaign.id];
      let newCount = 1;
      
      if (statsSnap.exists() && statsSnap.data().date === today) {
        const data = statsSnap.data();
        newWatchedIds = [...(data.watchedIds || []), activeCampaign.id];
        newCount = (data.count || 0) + 1;
      }
      await setDoc(statsRef, { date: today, watchedIds: newWatchedIds, count: newCount });

      // 2b. Update device daily stats
      const devStatsRef = doc(db, 'device_stats', deviceId, 'daily_stats', 'campaign_ads');
      const devStatsSnap = await getDoc(devStatsRef);
      let newDevWatchedIds = [activeCampaign.id];
      let newDevCount = 1;

      if (devStatsSnap.exists() && devStatsSnap.data().date === today) {
        const devData = devStatsSnap.data();
        newDevWatchedIds = [...(devData.watchedIds || []), activeCampaign.id];
        newDevCount = (devData.count || 0) + 1;
      }
      await setDoc(devStatsRef, { date: today, watchedIds: newDevWatchedIds, count: newDevCount });

      // 3. Add tokens to user
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        tokens: increment(reward)
      });

      // 3b. Deduct from appropriate Admin Wallet
      const isSystem = !!activeCampaign.isSystemAd;
      const targetWallet = isSystem ? 'adsWallet' : 'campaignWallet';
      const walletRef = doc(db, 'system', 'wallets');
      await updateDoc(walletRef, {
        [targetWallet]: increment(-reward)
      });

      // 3c. Log Admin Wallet Transaction History
      await addDoc(collection(db, 'system', 'wallets', 'history'), {
        walletType: targetWallet,
        amountDeducted: reward,
        type: 'deduction',
        reason: isSystem ? 'Fallback System Ad Reward Claimed' : 'Campaign Ad Reward Claimed',
        playerId: user.uid,
        playerEmail: user.email,
        playerName: user.displayName || 'Unknown',
        campaignId: activeCampaign.id,
        campaignTitle: activeCampaign.title || '',
        createdAt: serverTimestamp()
      });

      // 4. Add to token history
      await addDoc(collection(db, 'users', user.uid, 'tokenTransactions'), {
        amount: reward,
        type: 'received',
        otherUserEmail: `Ad: ${activeCampaign.title.substring(0, 15)}...`,
        otherUserName: 'System (Ads)',
        createdAt: serverTimestamp()
      });

      // Reset state and fetch next video
      setCanClaim(false);
      setPlayedSeconds(0);
      fetchData();
    };

    try {
      if ((window as any).runWithProgress) {
        await (window as any).runWithProgress('Claiming Your Reward Tokens', action);
      } else {
        await action();
      }
    } catch (err: any) {
      console.error(err);
      alert('Failed to claim reward: ' + err.message);
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-cyan-400 font-mono text-xs animate-pulse">Loading Video Ads...</div>;
  }

  const userLimitReached = todayWatched >= maxDailyViews;
  const deviceLimitReached = deviceWatched >= maxDailyViews;
  const limitReached = userLimitReached || deviceLimitReached;

  let activeUrl = activeCampaign?.videoUrl;

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24">
      {limitReached ? (
        <div className="bg-cyan-950/20 border-2 border-cyan-500/40 rounded-2xl p-6 text-center space-y-4 shadow-[0_0_20px_rgba(6,182,212,0.15)] animate-fade-in">
          <div className="bg-cyan-500/20 h-12 w-12 rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6 text-cyan-400" />
          </div>
          <div className="space-y-1">
            <p className="text-cyan-400 font-black text-xs uppercase tracking-wider">
              {deviceLimitReached ? "Device Daily Limit Expired!" : "Daily Limit Reached!"}
            </p>
            <p className="text-slate-100 font-medium text-[11px] leading-relaxed">
              {deviceLimitReached 
                ? `This device has watched the maximum limit of ${maxDailyViews} ads today.` 
                : `Your account has watched the maximum limit of ${maxDailyViews} ads today.`}
            </p>
          </div>
          <div className="p-3 bg-[#0a0410] border border-cyan-500/20 rounded-xl space-y-1 text-left text-[9px] font-mono text-slate-400 leading-normal">
            <p className="text-cyan-300 font-bold text-center border-b border-cyan-500/10 pb-1 mb-1 font-mono">DAILY PROGRESS STATUS</p>
            <p><span className="text-slate-500">Account Watch Count:</span> {todayWatched} / {maxDailyViews}</p>
            <p className="mt-1.5 text-center text-cyan-400 border-t border-cyan-500/10 pt-1">Multi-Account cheating is strictly prohibited on this device.</p>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">Come back tomorrow for more rewards.</p>
        </div>
      ) : !activeCampaign ? (
        <div className="bg-[#050b18] border border-cyan-500/20 rounded-2xl p-6 text-center space-y-3">
          <div className="bg-cyan-500/10 h-12 w-12 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="h-6 w-6 text-cyan-400" />
          </div>
          <p className="text-cyan-400 font-bold text-sm">
            No more ads available right now!
          </p>
          <p className="text-[10px] text-slate-400 font-mono">Come back later for more rewards.</p>
        </div>
      ) : (
        <div className="bg-[#050b18] border border-cyan-500/20 rounded-2xl overflow-hidden shadow-xl">
          {/* Player Container - 9:16 aspect ratio with stable layout */}
          <div className="w-full max-w-[280px] sm:max-w-[300px] mx-auto relative mt-3 mb-3"> 
             <div 
               className="aspect-[9/16] bg-black rounded-2xl overflow-hidden border-2 border-cyan-500/40 shadow-[0_0_20px_rgba(6,182,212,0.3)] relative"
             >
                {activeUrl && extractYoutubeVideoId(activeUrl) ? (
                  <div className="w-full h-full">
                     <CustomYoutubePlayer 
                      playerRef={playerRef}
                      videoId={extractYoutubeVideoId(activeUrl)}
                      onProgress={(ct: number) => {
                        const diff = ct - lastPlayedSecondsRef.current;
                        if (diff > 0 && diff < 2) {
                          // User is watching normally, accumulate time
                          actualWatchTimeRef.current += diff;
                          const accumulated = Math.min(30, actualWatchTimeRef.current);
                          setPlayedSeconds(accumulated);
                          if (accumulated >= 30 && !canClaim) {
                            setCanClaim(true);
                            try {
                              playerRef.current?.pauseVideo();
                            } catch (e) {
                              console.error("Failed to pause video programmatically:", e);
                            }
                          }
                        }
                        lastPlayedSecondsRef.current = ct;
                      }}
                    />
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono text-xs">Invalid Video</div>
                )}
             </div>
          </div>
          
          <div className="p-2 bg-gradient-to-t from-[#150a2b] to-transparent space-y-2">
            <div className="flex justify-between items-center gap-2">
              <div className="flex-1">
                <h3 className="text-[9px] font-bold text-white line-clamp-1">{activeCampaign.title}</h3>
                <p className="text-[7px] text-slate-400 mt-0.5">Sponsor: {activeCampaign.advertiserName || 'System'}</p>
              </div>
              {onNavigateToMyAds && (
                <button 
                  onClick={onNavigateToMyAds}
                  className="flex-shrink-0 px-2 py-1 bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 rounded text-white font-bold uppercase tracking-wider text-[7px] transition cursor-pointer shadow-sm"
                >
                  Ads here
                </button>
              )}
            </div>

            <div className="flex justify-between items-center text-[8px] font-mono font-bold">
              <span className="text-slate-400">Watch Time:</span>
              <span className={playedSeconds >= 30 ? "text-emerald-400" : "text-cyan-400"}>
                00:{Math.min(Math.floor(playedSeconds), 30).toString().padStart(2, '0')} / 00:30
              </span>
            </div>

            {/* Progress Bar */}
            <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-300 ${playedSeconds >= 30 ? 'bg-emerald-500' : 'bg-cyan-500'}`}
                style={{ width: `${Math.min((playedSeconds / 30) * 100, 100)}%` }}
              />
            </div>

            <button
              onClick={handleClaim}
              disabled={!canClaim || claiming}
              className={`w-full py-2 rounded font-bold uppercase tracking-wider text-[9px] flex items-center justify-center gap-1 transition-all shadow-sm ${
                canClaim 
                  ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-emerald-500/25 hover:from-emerald-400 hover:to-emerald-500 active:scale-95' 
                  : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
              }`}
            >
              {claiming ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Coins className="h-4 w-4" />
              )}
              {canClaim ? `Claim ${Number(activeCampaign?.isSystemAd ? activeCampaign.rewardPerView : (pricing.rewardPerView || 0.05)).toFixed(2)} Tokens` : 'Watch 30s to Claim'}
            </button>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="bg-[#050b18]/50 border border-white/5 rounded p-2 flex flex-row justify-between items-center text-[8px] sm:text-[9px] font-mono mt-1.5">
        <div className="flex items-center gap-1">
          <span className="text-slate-400">Today's Progress:</span>
          <span className="text-cyan-400 font-bold">
            {todayWatched}/{maxDailyViews}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-slate-500">Reward:</span>
          <span className="text-orange-400 font-bold">{Number(activeCampaign?.isSystemAd ? activeCampaign.rewardPerView : (pricing.rewardPerView || 0.05)).toFixed(2)} 🪙</span>
        </div>
      </div>
      

      {onBack && (
        <div className="mt-2.5 flex justify-center">
          <button 
            onClick={onBack} 
            className="w-full flex items-center justify-center gap-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-white/5 rounded text-slate-300 font-bold uppercase tracking-wider text-[9px] transition cursor-pointer"
          >
            &larr; Back to Wallet
          </button>
        </div>
      )}
    </div>
  );
}
