import React, { useState, useEffect, useMemo } from 'react';
import { Trophy, Medal, Star, Shield, Zap, X, Gift, CheckCircle2, Loader2, Sparkles, Flame, Edit3, AlertTriangle, ShieldAlert, Info } from 'lucide-react';
import { doc, getDoc, runTransaction, collection, getDocs, setDoc, query, where, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion } from 'framer-motion';

export default function PrizeDistributionModal({ leagueId, isAdmin, onClose }: { leagueId: string, isAdmin: boolean, onClose: () => void, isOpen?: boolean }) {
  const [league, setLeague] = useState<any>(null);
  const [champion, setChampion] = useState<any>(null);
  const [runnerUp, setRunnerUp] = useState<any>(null);
  const [topPlayers, setTopPlayers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [distributing, setDistributing] = useState(false);
  const [isDistributed, setIsDistributed] = useState(false);
  const [isFinalPlayed, setIsFinalPlayed] = useState(false);
  const [finalMatchObj, setFinalMatchObj] = useState<any>(null);
  const [validationErrorModal, setValidationErrorModal] = useState<string | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedPlayerPhoto, setSelectedPlayerPhoto] = useState<{
    name: string;
    photoUrl: string;
    rank?: string;
    squadName?: string;
    upazila?: string;
    kills?: number;
    damage?: number;
    points?: number;
    matches?: number;
  } | null>(null);
  
  // Prize states that admin can edit
  const [championPrize, setChampionPrize] = useState(0);
  const [runnerUpPrize, setRunnerUpPrize] = useState(0);
  const [top1Prize, setTop1Prize] = useState(0);
  const [top2Prize, setTop2Prize] = useState(0);
  const [top3Prize, setTop3Prize] = useState(0);

  const [editingPrize, setEditingPrize] = useState<{ isOpen: boolean; type: string; title: string; currentValue: number } | null>(null);
  const [tempPrizeValue, setTempPrizeValue] = useState(0);

  const handleEditPrize = (type: string, title: string, value: number) => {
    setTempPrizeValue(value);
    setEditingPrize({ isOpen: true, type, title, currentValue: value });
  };

  const handleSavePrize = () => {
    if (!editingPrize) return;
    switch (editingPrize.type) {
      case 'champion': setChampionPrize(tempPrizeValue); break;
      case 'runnerUp': setRunnerUpPrize(tempPrizeValue); break;
      case 'top1': setTop1Prize(tempPrizeValue); break;
      case 'top2': setTop2Prize(tempPrizeValue); break;
      case 'top3': setTop3Prize(tempPrizeValue); break;
    }
    setEditingPrize(null);
  };

  useEffect(() => {
    fetchData();
  }, [leagueId]);

  const fetchData = async () => {
    try {
      let lgData: any = null;
      const proRef = doc(db, 'pro_hosted_leagues', leagueId);
      const proSnap = await getDoc(proRef);
      if (proSnap.exists()) {
        lgData = { id: proSnap.id, ...proSnap.data() };
      } else {
        const upRef = doc(db, 'upazila_leagues', leagueId);
        const upSnap = await getDoc(upRef);
        if (upSnap.exists()) {
          lgData = { id: upSnap.id, ...upSnap.data() };
        }
      }

      if (!lgData) return;
      setLeague(lgData);
      
      setChampionPrize(lgData.championPrize || 1000);
      setRunnerUpPrize(lgData.runnerUpPrize || 500);
      setTop1Prize(lgData.top1Prize || lgData.topRank1Prize || 300);
      setTop2Prize(lgData.top2Prize || lgData.topRank2Prize || 200);
      setTop3Prize(lgData.top3Prize || lgData.topRank3Prize || 100);
      setIsDistributed(!!lgData.prizeDistributed);

      // Check if champion & runner up exist on league doc directly
      let champSquad = lgData.championSquad || (lgData.champion ? { teamName: lgData.champion, leaderUserId: lgData.championLeaderId || lgData.championUserId || '' } : null);
      let runnerSquad = lgData.runnerUpSquad || (lgData.runnerUp ? { teamName: lgData.runnerUp, leaderUserId: lgData.runnerUpLeaderId || lgData.runnerUpUserId || '' } : null);

      // Find Champion & Runner Up from knockoutData if not present
      const koData = lgData.knockoutData || {};
      let finalMatch = null;
      let highestMatchNum = -1;
      
      for (const key of Object.keys(koData)) {
        const m = koData[key];
        const num = parseInt(key.replace('match_', ''));
        if (num > highestMatchNum) {
          highestMatchNum = num;
          finalMatch = m;
        }
      }
      
      const finalPlayed = !!(
        lgData.isFinalPlayed || 
        lgData.finalMatchApproved || 
        (finalMatch && finalMatch.isPlayed && (finalMatch.customResult?.winnerName || finalMatch.winnerName))
      );
      setIsFinalPlayed(finalPlayed);
      setFinalMatchObj(finalMatch);
      
      if (!champSquad && finalPlayed && finalMatch) {
        if (finalMatch.customResult?.winnerName === finalMatch.squad1Name) {
           champSquad = finalMatch.squad1Obj || { teamName: finalMatch.squad1Name || '[TBD]', coverUrl: '', upazila: 'N/A' };
           runnerSquad = finalMatch.squad2Obj || { teamName: finalMatch.squad2Name || '[TBD]', coverUrl: '', upazila: 'N/A' };
        } else if (finalMatch.customResult?.winnerName === finalMatch.squad2Name) {
           champSquad = finalMatch.squad2Obj || { teamName: finalMatch.squad2Name || '[TBD]', coverUrl: '', upazila: 'N/A' };
           runnerSquad = finalMatch.squad1Obj || { teamName: finalMatch.squad1Name || '[TBD]', coverUrl: '', upazila: 'N/A' };
        } else {
           champSquad = finalMatch.customResult?.winnerName === finalMatch.squad1Obj?.teamName ? finalMatch.squad1Obj : finalMatch.squad2Obj;
           runnerSquad = finalMatch.customResult?.winnerName === finalMatch.squad1Obj?.teamName ? finalMatch.squad2Obj : finalMatch.squad1Obj;
        }
      }
      
      if (!champSquad) champSquad = { teamName: lgData.champion || '[TBD]', coverUrl: '', upazila: 'N/A' };
      if (!runnerSquad) runnerSquad = { teamName: lgData.runnerUp || '[TBD]', coverUrl: '', upazila: 'N/A' };

      setChampion(champSquad);
      setRunnerUp(runnerSquad);

      // Top players check
      if (lgData.topPlayers && lgData.topPlayers.length > 0) {
        setTopPlayers(lgData.topPlayers.map((p: any) => ({
          gameName: p.displayName || p.name || p.gameName || 'Player',
          userId: p.userId || p.id || '',
          squadName: p.squadName || '',
          photoUrl: p.photoURL || p.photoUrl || '',
          totalKills: p.kills || 0,
          totalDamage: p.damage || 0,
          matchesPlayed: p.matchesPlayed || 0
        })));
      } else {
        // Aggregate top players
        const groupsRef = collection(db, `upazila_leagues/${leagueId}/groups`);
        const groupsSnap = await getDocs(groupsRef);
        
        const allResults: any[] = [];
        groupsSnap.docs.forEach(d => {
          const gData = d.data();
          if (gData.matchResults) {
            Object.values(gData.matchResults).forEach((res: any) => {
              if (res.isPlayed && res.customResult?.playerStats) {
                allResults.push(res.customResult.playerStats);
              }
            });
          }
        });
        
        Object.values(koData).forEach((res: any) => {
          if (res.isPlayed && res.customResult?.playerStats) {
             allResults.push(res.customResult.playerStats);
          }
        });
        
        const playerMap: Record<string, any> = {};
        allResults.forEach(statsArr => {
          statsArr.forEach((p: any) => {
            if (!p.gameName) return;
            if (!playerMap[p.gameName]) {
               playerMap[p.gameName] = {
                 userId: p.userId || p.id || p.leaderUserId || null,
                 gameName: p.gameName,
                 squadName: p.squadName,
                 upazila: p.upazila || p.subDistrict || p.district || 'N/A',
                 totalKills: 0,
                 totalDamage: 0,
                 matchesPlayed: 0,
                 points: 0,
                 photoUrl: p.photoUrl || ''
               };
            }
            playerMap[p.gameName].totalKills += (p.kills || 0);
            playerMap[p.gameName].totalDamage += (p.damage || 0);
            playerMap[p.gameName].matchesPlayed += 1;
            playerMap[p.gameName].points += ((p.kills || 0) * 10);
          });
        });
        
        const sortedPlayers = Object.values(playerMap).sort((a: any, b: any) => b.totalKills - a.totalKills || b.totalDamage - a.totalDamage);
        
        if (sortedPlayers.length >= 3) {
          setTopPlayers(sortedPlayers.slice(0, 3));
        } else {
          const mock = [
            { gameName: 'Player 1', squadName: '[TBD]', upazila: 'N/A', totalKills: 0, totalDamage: 0, matchesPlayed: 0, points: 0 },
            { gameName: 'Player 2', squadName: '[TBD]', upazila: 'N/A', totalKills: 0, totalDamage: 0, matchesPlayed: 0, points: 0 },
            { gameName: 'Player 3', squadName: '[TBD]', upazila: 'N/A', totalKills: 0, totalDamage: 0, matchesPlayed: 0, points: 0 }
          ];
          setTopPlayers([...sortedPlayers, ...mock].slice(0, 3));
        }
      }

    } catch (e) {
      console.error("Error in fetchData:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleDistributeClick = () => {
    if (!isAdmin || isDistributed) return;

    // 1. Check if the final match results have been set
    if (!isFinalPlayed || !finalMatchObj || (!finalMatchObj.isPlayed && !finalMatchObj.customResult?.winnerName)) {
      setValidationErrorModal("The final match results have NOT been set yet. Please enter and save the final match result in the bracket before attempting to distribute prizes to wallets.");
      return;
    }

    // 2. Check final match squad name, real squad name, cover photo
    const champName = champion?.teamName || champion?.squadName;
    const runnerName = runnerUp?.teamName || runnerUp?.squadName;

    if (!champName || champName === '[TBD]' || champName.includes('TBD') || !runnerName || runnerName === '[TBD]' || runnerName.includes('TBD')) {
      setValidationErrorModal("Final match squad names are incomplete or still marked as [TBD]. Please verify that both Champion and Runner-Up squads, real squad names, and cover photos are set before distribution.");
      return;
    }

    // Clear validation errors & open confirm modal
    setValidationErrorModal(null);
    setShowConfirmModal(true);
  };

  const executeDistribution = async () => {
    setShowConfirmModal(false);
    setDistributing(true);
    try {
      await runTransaction(db, async (transaction) => {
        // --- 1. PREPARE REFS AND READ ALL DOCS FIRST ---
        const sysWalletRef = doc(db, 'system', 'wallets');
        const sysWalletSnap = await transaction.get(sysWalletRef);

        const champUserId = champion?.leaderUserId || champion?.userId;
        const champWalletRef = champUserId ? doc(db, 'users', champUserId) : null;
        const champWalletSnap = champWalletRef ? await transaction.get(champWalletRef) : null;

        const runnerUserId = runnerUp?.leaderUserId || runnerUp?.userId;
        const runnerWalletRef = runnerUserId ? doc(db, 'users', runnerUserId) : null;
        const runnerWalletSnap = runnerWalletRef ? await transaction.get(runnerWalletRef) : null;

        const topPrizes = [top1Prize, top2Prize, top3Prize];
        const topRankLabels = ['MVP 1st Place', 'Top Player 2nd Place', 'Top Player 3rd Place'];
        const topPlayerReads: { tpUserId: string; prizeAmt: number; rankLabel: string; ref: any; snap: any }[] = [];

        for (let i = 0; i < Math.min(3, topPlayers.length); i++) {
          const tp = topPlayers[i];
          const prizeAmt = topPrizes[i];
          const tpUserId = tp?.userId || tp?.leaderUserId;
          if (tpUserId && prizeAmt > 0) {
            const ref = doc(db, 'users', tpUserId);
            const snap = await transaction.get(ref);
            topPlayerReads.push({ tpUserId, prizeAmt, rankLabel: topRankLabels[i], ref, snap });
          }
        }

        const proLeagueRef = doc(db, 'pro_hosted_leagues', leagueId);
        const proLeagueSnap = await transaction.get(proLeagueRef);

        const upazilaLeagueRef = doc(db, 'upazila_leagues', leagueId);
        const upazilaLeagueSnap = await transaction.get(upazilaLeagueRef);

        // --- 2. PERFORM ALL WRITES AFTER READS ---

        // Deduct from Upazila League Wallet
        if (!sysWalletSnap.exists()) {
          transaction.set(sysWalletRef, { upazilaLeagueWallet: 0, createdAt: new Date().toISOString() });
        }
        
        let sysBal = sysWalletSnap.exists() ? sysWalletSnap.data().upazilaLeagueWallet || 0 : 0;
        const totalPayout = championPrize + runnerUpPrize + top1Prize + top2Prize + top3Prize;
        
        transaction.update(sysWalletRef, { upazilaLeagueWallet: sysBal - totalPayout });
        
        // Add history for System Wallet
        const sysHistoryRef = doc(collection(db, 'system', 'wallets', 'history'));
        transaction.set(sysHistoryRef, {
          walletType: 'upazilaLeagueWallet',
          amountDeducted: totalPayout,
          type: 'deduction',
          reason: `Prize Distribution - ${league?.title || league?.leagueName}`,
          createdAt: serverTimestamp()
        });
        
        // Payout to Champion
        if (champUserId && champWalletRef) {
          const currentBal = champWalletSnap && champWalletSnap.exists() ? champWalletSnap.data().tokens || 0 : 0;
          transaction.set(champWalletRef, { tokens: currentBal + championPrize }, { merge: true });
          
          const historyRef = doc(collection(db, 'users', champUserId, 'tokenTransactions'));
          transaction.set(historyRef, {
            amount: championPrize,
            type: 'addition',
            reason: `Champion Prize - ${league?.title || league?.leagueName}`,
            createdAt: serverTimestamp()
          });
        }
        
        // Payout to Runner Up
        if (runnerUserId && runnerWalletRef) {
          const currentBal = runnerWalletSnap && runnerWalletSnap.exists() ? runnerWalletSnap.data().tokens || 0 : 0;
          transaction.set(runnerWalletRef, { tokens: currentBal + runnerUpPrize }, { merge: true });
          
          const historyRef = doc(collection(db, 'users', runnerUserId, 'tokenTransactions'));
          transaction.set(historyRef, {
            amount: runnerUpPrize,
            type: 'addition',
            reason: `Runner-Up Prize - ${league?.title || league?.leagueName}`,
            createdAt: serverTimestamp()
          });
        }

        // Payout to Top 3 Players
        for (const item of topPlayerReads) {
          if (item.snap && item.snap.exists()) {
            const currentBal = item.snap.data().tokens || 0;
            transaction.update(item.ref, { tokens: currentBal + item.prizeAmt });
            const historyRef = doc(collection(db, 'users', item.tpUserId, 'tokenTransactions'));
            transaction.set(historyRef, {
              amount: item.prizeAmt,
              type: 'addition',
              reason: `${item.rankLabel} Prize - ${league?.title || league?.leagueName}`,
              createdAt: serverTimestamp()
            });
          }
        }
        
        // Update League Docs
        const updatePayload = {
          prizeDistributed: true,
          championPrize,
          runnerUpPrize,
          top1Prize,
          top2Prize,
          top3Prize,
          distributedAt: new Date().toISOString()
        };

        if (proLeagueSnap.exists()) {
          const curBal = proLeagueSnap.data().walletBalance || 0;
          transaction.update(proLeagueRef, {
            ...updatePayload,
            walletBalance: Math.max(0, curBal - totalPayout)
          });
        }

        if (upazilaLeagueSnap.exists()) {
          transaction.update(upazilaLeagueRef, updatePayload);
        }
      });
      
      setIsDistributed(true);
    } catch (e) {
      console.error(e);
      alert('Error distributing prizes.');
    } finally {
      setDistributing(false);
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black z-[200] flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-cyan-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-[200] flex flex-col overflow-y-auto animate-in fade-in zoom-in-95 duration-500">
      <div className="relative min-h-screen py-10 px-4 flex flex-col items-center">
        
        {/* Background Effects: Pure Black + Bangladeshi Jungle Flowers & Fireworks Image + Animated Firework Lighting */}
        <div className="fixed inset-0 pointer-events-none overflow-hidden z-0 bg-black">
          <div 
            className="absolute inset-0 w-full h-full opacity-100"
            style={{
              backgroundImage: "url('/bd_jungle_fireworks.jpg')",
              backgroundSize: "cover",
              backgroundPosition: "center",
              backgroundRepeat: "no-repeat"
            }}
          />

          {/* DYNAMIC FIREWORK LIGHTING & EXPLOSION BURSTS */}
          {/* Firework Burst 1: Gold / Amber Light Explosion (Top-Left) */}
          <div className="absolute top-[12%] left-[18%] w-32 h-32 flex items-center justify-center">
            <div className="absolute w-40 h-40 bg-amber-400/40 rounded-full blur-2xl animate-pulse" />
            <div className="absolute w-28 h-28 border-2 border-amber-300/80 rounded-full animate-ping" style={{ animationDuration: '2s' }} />
            <div className="absolute w-48 h-48 border border-yellow-400/40 rounded-full animate-ping" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />
            <div className="relative text-3xl animate-bounce" style={{ animationDuration: '1.8s' }}>🎆</div>
          </div>

          {/* Firework Burst 2: Fuchsia / Purple Light Explosion (Top-Right) */}
          <div className="absolute top-[20%] right-[22%] w-36 h-36 flex items-center justify-center">
            <div className="absolute w-44 h-44 bg-cyan-500/40 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.8s' }} />
            <div className="absolute w-32 h-32 border-2 border-cyan-400/80 rounded-full animate-ping" style={{ animationDuration: '2.2s', animationDelay: '0.4s' }} />
            <div className="absolute w-52 h-52 border border-cyan-400/40 rounded-full animate-ping" style={{ animationDuration: '3.2s', animationDelay: '1s' }} />
            <div className="relative text-3xl animate-pulse" style={{ animationDuration: '1.5s' }}>💥</div>
          </div>

          {/* Firework Burst 3: Cyan Light Explosion (Center-Left) */}
          <div className="absolute top-[45%] left-[12%] w-28 h-28 flex items-center justify-center">
            <div className="absolute w-36 h-36 bg-cyan-400/35 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '1.2s' }} />
            <div className="absolute w-24 h-24 border-2 border-cyan-300/80 rounded-full animate-ping" style={{ animationDuration: '2.5s', animationDelay: '0.7s' }} />
            <div className="relative text-2xl animate-spin" style={{ animationDuration: '8s' }}>✨</div>
          </div>

          {/* Firework Burst 4: Red / Orange Light Explosion (Center-Right) */}
          <div className="absolute top-[55%] right-[15%] w-32 h-32 flex items-center justify-center">
            <div className="absolute w-40 h-40 bg-red-500/35 rounded-full blur-2xl animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute w-28 h-28 border-2 border-red-400/80 rounded-full animate-ping" style={{ animationDuration: '2.8s', animationDelay: '0.2s' }} />
            <div className="relative text-3xl animate-bounce" style={{ animationDuration: '2s' }}>🌟</div>
          </div>

          {/* Festive Hanging Greeting String Lights / Garlands across the top */}
          <div className="absolute top-0 inset-x-0 h-16 flex justify-around items-start z-10 px-4 pt-1 pointer-events-none opacity-90">
            {[
              { color: 'bg-amber-400 shadow-[0_0_15px_#f59e0b]', delay: '0s' },
              { color: 'bg-cyan-500 shadow-[0_0_15px_#3b82f6]', delay: '0.3s' },
              { color: 'bg-cyan-400 shadow-[0_0_15px_#22d3ee]', delay: '0.6s' },
              { color: 'bg-cyan-500 shadow-[0_0_15px_#06b6d4]', delay: '0.9s' },
              { color: 'bg-yellow-300 shadow-[0_0_15px_#fde047]', delay: '1.2s' },
              { color: 'bg-red-500 shadow-[0_0_15px_#ef4444]', delay: '1.5s' },
              { color: 'bg-emerald-400 shadow-[0_0_15px_#34d399]', delay: '1.8s' },
              { color: 'bg-cyan-400 shadow-[0_0_15px_#e879f9]', delay: '2.1s' },
              { color: 'bg-amber-300 shadow-[0_0_15px_#fcd34d]', delay: '2.4s' },
            ].map((light, idx) => (
              <div key={idx} className="flex flex-col items-center">
                <div className="w-[1px] h-3 bg-white/20" />
                <div 
                  className={`w-3.5 h-3.5 rounded-full ${light.color} animate-pulse`} 
                  style={{ animationDuration: '1.5s', animationDelay: light.delay }}
                />
              </div>
            ))}
          </div>

          {/* Hanging Neon Festive Lanterns on Left and Right */}
          <div className="absolute top-8 left-6 flex flex-col items-center z-10 animate-bounce" style={{ animationDuration: '3s' }}>
            <div className="w-[1px] h-10 bg-amber-400/50" />
            <div className="px-2 py-1 rounded-lg bg-amber-500/20 border border-amber-400/60 backdrop-blur-sm text-amber-300 shadow-[0_0_20px_rgba(245,158,11,0.6)] flex items-center gap-1 text-xs font-bold">
              <span>🏮</span>
              <span className="text-[10px] uppercase font-mono tracking-wider">GREETINGS</span>
            </div>
          </div>

          <div className="absolute top-8 right-6 flex flex-col items-center z-10 animate-bounce" style={{ animationDuration: '3.5s', animationDelay: '0.5s' }}>
            <div className="w-[1px] h-10 bg-cyan-400/50" />
            <div className="px-2 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/60 backdrop-blur-sm text-cyan-300 shadow-[0_0_20px_rgba(6,182,212,0.6)] flex items-center gap-1 text-xs font-bold">
              <span>🏮</span>
              <span className="text-[10px] uppercase font-mono tracking-wider">VICTORY</span>
            </div>
          </div>

          {/* Floating Greeting Flower Accents (Krishnachura 🌺, Kadam 🌼, Shapla 🪷, Palash 🌸) & Sparkle Lights */}
          <div className="absolute top-20 left-10 text-3xl sm:text-4xl animate-bounce opacity-90 filter drop-shadow-[0_0_15px_rgba(239,68,68,0.9)]" style={{ animationDuration: '2.5s' }}>🌺</div>
          <div className="absolute top-36 right-12 text-3xl sm:text-4xl animate-pulse opacity-90 filter drop-shadow-[0_0_15px_rgba(245,158,11,0.9)]" style={{ animationDuration: '2s' }}>🌼</div>
          <div className="absolute bottom-24 left-14 text-3xl sm:text-4xl animate-pulse opacity-90 filter drop-shadow-[0_0_15px_rgba(6,182,212,0.9)]" style={{ animationDuration: '2.8s' }}>🪷</div>
          <div className="absolute bottom-32 right-16 text-3xl sm:text-4xl animate-bounce opacity-90 filter drop-shadow-[0_0_15px_rgba(249,115,22,0.9)]" style={{ animationDuration: '3s' }}>🌸</div>

          {/* Floating Sparkle Lights */}
          <div className="absolute top-28 left-1/3 text-xl text-yellow-300 animate-ping opacity-75" style={{ animationDuration: '2.5s' }}>✨</div>
          <div className="absolute top-44 right-1/3 text-xl text-cyan-300 animate-ping opacity-75" style={{ animationDuration: '3s', animationDelay: '1s' }}>🌟</div>
          <div className="absolute bottom-40 left-1/4 text-xl text-cyan-300 animate-ping opacity-75" style={{ animationDuration: '2.8s', animationDelay: '0.5s' }}>⚡</div>
          <div className="absolute bottom-20 right-1/4 text-xl text-amber-300 animate-ping opacity-75" style={{ animationDuration: '3.2s', animationDelay: '1.2s' }}>💫</div>
        </div>

        {/* Close Button */}
        <button onClick={onClose} className="absolute top-4 right-4 bg-white/5 p-2 rounded-full hover:bg-white/10 transition-colors z-50">
          <X className="w-6 h-6 text-slate-300" />
        </button>

        {/* Header with Greeting Flowers & Festive Lights */}
        <div className="text-center space-y-4 mb-16 relative z-10 flex flex-col items-center">
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="flex items-center gap-2">
            <span className="text-amber-300 text-xs">✨</span>
            <span className="text-cyan-400 font-black font-mono tracking-[0.2em] uppercase text-[9px] border border-cyan-500/30 bg-cyan-500/10 px-3 py-1 rounded-full shadow-[0_0_15px_rgba(6,182,212,0.3)]">
              {league?.title}
            </span>
            <span className="text-amber-300 text-xs">✨</span>
          </motion.div>
          
          <div className="relative inline-block">
            {/* Corner Floral & Lighting Greetings */}
            <span className="absolute -top-4 -left-8 text-2xl animate-spin" style={{ animationDuration: '8s' }}>🌺</span>
            <span className="absolute -top-4 -right-8 text-2xl animate-spin" style={{ animationDuration: '8s' }}>🌸</span>

            <motion.h1 initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.3 }} className="text-4xl md:text-6xl font-black text-white tracking-tight uppercase" style={{ textShadow: '0 0 40px rgba(168, 85, 247, 0.8), 0 0 20px rgba(250, 204, 21, 0.5)' }}>
              Grand Ceremony
            </motion.h1>
          </div>

          <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }} className="flex items-center gap-3">
            <span className="text-xl">🪷</span>
            <p className="text-slate-300 font-mono tracking-widest uppercase text-xs md:text-sm font-bold bg-black/60 px-4 py-1 rounded-full border border-cyan-500/30 shadow-[0_0_12px_rgba(6,182,212,0.3)]">
              Prize Distribution & Final Victory Ceremony
            </p>
            <span className="text-xl">🌼</span>
          </motion.div>
        </div>

                {/* Teams Podium */}
        <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-20 mb-20 relative z-10">
          
          {/* Champion */}
          <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-col items-center group relative">
            <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            {/* Bengali Badge above cover photo */}
            <div className="mb-2.5 z-20 flex items-center justify-center">
              <div className="relative inline-flex items-center gap-1.5 px-4 py-1 bg-slate-950/95 backdrop-blur-md rounded-full border-2 border-yellow-400/80 shadow-[0_0_25px_rgba(250,204,21,0.85)] animate-pulse">
                <span className="text-[5px] animate-spin" style={{ animationDuration: '4s' }}>🌺</span>
                <span className="text-[5px] animate-bounce">🌸</span>
                <span className="text-yellow-300 font-bold text-[12px] leading-none tracking-wide font-['Hind_Siliguri','Noto_Sans_Bengali',sans-serif] drop-shadow-[0_0_8px_rgba(250,204,21,1)]">
                  চ্যাম্পিয়ন
                </span>
                <span className="text-[5px] animate-bounce">🌼</span>
                <span className="text-[5px] animate-spin" style={{ animationDuration: '4s' }}>🪷</span>
              </div>
            </div>

            <div className="relative">
              <div className="w-80 h-32 md:w-[400px] md:h-[150px] rounded-2xl overflow-hidden border-4 border-yellow-400/50 relative shadow-[0_0_50px_rgba(250,204,21,0.2)]">
                <img src={champion?.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600'} alt="Champion" className="w-full h-full object-cover" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/30" />
                
                {/* Price token on top of cover photo */}
                <motion.div 
                  initial={{ y: -5 }}
                  animate={{ y: 5 }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                  className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none"
                >
                  <Trophy className="w-14 h-14 text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)] mb-2" />
                  {isAdmin && !isDistributed ? (
                    <div className="pointer-events-auto flex items-center justify-center gap-2 text-yellow-400 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-yellow-400/50 shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                      <Gift className="w-4 h-4 text-yellow-400" />
                      <span className="font-black text-sm tracking-wider">{championPrize}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider">Tokens</span>
                      <button onClick={() => handleEditPrize('champion', 'Champion Prize', championPrize)} className="ml-1 text-yellow-400 hover:text-yellow-300 transition-colors p-1 bg-yellow-400/10 rounded">
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-yellow-400/50 flex items-center gap-1.5 shadow-[0_0_15px_rgba(250,204,21,0.4)]">
                      <Gift className="w-4 h-4 text-yellow-400" />
                      <span className="font-black text-yellow-400 text-sm tracking-wider">{championPrize} Tokens</span>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
            <div className="text-center mt-4 z-10 flex flex-col items-center gap-1">
              <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">
                Will be generated from final match result
              </span>
              <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-md border border-yellow-500/30 shadow-[0_0_10px_rgba(250,204,21,0.2)]">
                <span className="text-[8px] font-mono text-slate-400 uppercase">Squad Name:</span>
                <h2 className="text-[11px] font-black text-yellow-300 uppercase tracking-wider">
                  {champion?.teamName ? (champion.teamName.includes('TBD') ? '[TBD]' : champion.teamName) : '[TBD]'}
                </h2>
              </div>
              <p className="text-slate-400 font-mono uppercase tracking-widest text-[9px] mt-0.5">{champion?.upazila || 'N/A'}</p>
            </div>
          </motion.div>

          {/* Runner Up */}
          <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.15 }} className="flex flex-col items-center group relative md:mt-0">
            <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full scale-150 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            
            {/* Bengali Badge above cover photo */}
            <div className="mb-2.5 z-20 flex items-center justify-center">
              <div className="relative inline-flex items-center gap-1.5 px-4 py-1 bg-slate-950/95 backdrop-blur-md rounded-full border-2 border-cyan-400/80 shadow-[0_0_25px_rgba(34,211,238,0.85)] animate-pulse">
                <span className="text-[8px] text-cyan-300 animate-ping">✨</span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-pulse"></span>
                <span className="text-cyan-200 font-bold text-[12px] leading-none tracking-wide font-['Hind_Siliguri','Noto_Sans_Bengali',sans-serif] drop-shadow-[0_0_8px_rgba(34,211,238,1)]">
                  রানার-আপ
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shadow-[0_0_10px_#e879f9] animate-pulse"></span>
                <span className="text-[8px] text-yellow-300 animate-ping">✨</span>
              </div>
            </div>

            <div className="relative">
              <div className="w-80 h-32 md:w-[400px] md:h-[150px] rounded-2xl overflow-hidden border-4 border-slate-400/50 relative shadow-[0_0_40px_rgba(203,213,225,0.1)]">
                <img src={runnerUp?.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=600'} alt="Runner Up" className="w-full h-full object-cover grayscale-[30%]" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/30" />
                
                {/* Price token on top of cover photo */}
                <motion.div 
                  initial={{ y: -5 }}
                  animate={{ y: 5 }}
                  transition={{ duration: 1.5, repeat: Infinity, repeatType: "reverse", ease: "easeInOut" }}
                  className="absolute inset-0 flex flex-col items-center justify-center z-20 pointer-events-none"
                >
                  <Medal className="w-12 h-12 text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.8)] mb-2" />
                  {isAdmin && !isDistributed ? (
                    <div className="pointer-events-auto flex items-center justify-center gap-2 text-slate-300 bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-slate-400/50 shadow-[0_0_15px_rgba(203,213,225,0.4)]">
                      <Gift className="w-4 h-4 text-slate-300" />
                      <span className="font-black text-sm tracking-wider">{runnerUpPrize}</span>
                      <span className="font-mono text-[10px] uppercase tracking-wider">Tokens</span>
                      <button onClick={() => handleEditPrize('runnerUp', 'Runner-Up Prize', runnerUpPrize)} className="ml-1 text-slate-300 hover:text-slate-200 transition-colors p-1 bg-slate-300/10 rounded">
                        <Edit3 className="w-3 h-3" />
                      </button>
                    </div>
                  ) : (
                    <div className="bg-black/60 backdrop-blur-sm px-4 py-1.5 rounded-full border border-slate-400/50 flex items-center gap-1.5 shadow-[0_0_15px_rgba(203,213,225,0.4)]">
                      <Gift className="w-4 h-4 text-slate-300" />
                      <span className="font-black text-slate-300 text-sm tracking-wider">{runnerUpPrize} Tokens</span>
                    </div>
                  )}
                </motion.div>
              </div>
            </div>
            <div className="text-center mt-4 z-10 flex flex-col items-center gap-1">
              <span className="text-[8px] font-mono text-slate-400 uppercase tracking-wider">
                Will be generated from final match result
              </span>
              <div className="flex items-center gap-1.5 bg-black/60 px-3 py-1 rounded-md border border-slate-500/30 shadow-[0_0_10px_rgba(203,213,225,0.2)]">
                <span className="text-[8px] font-mono text-slate-400 uppercase">Squad Name:</span>
                <h2 className="text-[11px] font-black text-slate-200 uppercase tracking-wider">
                  {runnerUp?.teamName ? (runnerUp.teamName.includes('TBD') ? '[TBD]' : runnerUp.teamName) : '[TBD]'}
                </h2>
              </div>
              <p className="text-slate-400 font-mono uppercase tracking-widest text-[9px] mt-0.5">{runnerUp?.upazila || 'N/A'}</p>
            </div>
          </motion.div>
        </div>

        {/* Top 3 Players Table */}
        <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 }} className="w-full max-w-5xl z-10">
          <div className="text-center mb-8">
            <h3 className="text-sm font-black text-white uppercase flex items-center justify-center gap-3">
              <Flame className="w-4 h-4 text-orange-500" />
              Tournament MVP Players
              <Flame className="w-4 h-4 text-orange-500" />
            </h3>
            <p className="text-slate-400 font-mono uppercase tracking-widest text-xs mt-2">Most Kills</p>
          </div>

          <div className="bg-slate-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse whitespace-nowrap">
                <thead>
                  <tr className="border-b border-white/10 bg-slate-950/80">
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-12">Rank</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center w-12">Photo</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Game Name</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Squad Name</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest">Upazila</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Matches</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Kills</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Damage</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Points</th>
                    <th className="p-3 text-[9px] font-black text-slate-400 uppercase tracking-widest text-center">Prize</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {topPlayers.map((player, idx) => {
                    const prizes = [top1Prize, top2Prize, top3Prize];
                    const setPrizes = [setTop1Prize, setTop2Prize, setTop3Prize];
                    const ranks = ['MVP', 'Top 2', 'Top 3'];
                    const colors = ['text-yellow-400', 'text-slate-300', 'text-amber-600'];
                    const bgColors = ['bg-yellow-400/10', 'bg-slate-300/10', 'bg-amber-600/10'];
                    const borderColors = ['border-yellow-400/30', 'border-slate-300/30', 'border-amber-600/30'];
                    const avatarUrl = player.photoUrl || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(player.gameName)}`;
                    return (
                      <tr key={idx} className="hover:bg-white/5 transition-colors">
                        <td className="p-3 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded font-black text-[8px] uppercase tracking-widest ${colors[idx]} ${bgColors[idx]} border ${borderColors[idx]}`}>
                            #{idx + 1}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div 
                            onClick={() => setSelectedPlayerPhoto({
                              name: player.gameName,
                              photoUrl: avatarUrl,
                              rank: ranks[idx],
                              squadName: player.squadName,
                              upazila: player.upazila,
                              kills: player.totalKills,
                              damage: player.totalDamage,
                              points: player.points || 0,
                              matches: player.matchesPlayed || 0
                            })}
                            className="relative inline-block cursor-pointer group"
                            title="Click to view full profile photo"
                          >
                            <img 
                              src={avatarUrl} 
                              alt={player.gameName} 
                              className={`w-9 h-9 rounded-lg border-2 ${borderColors[idx]} object-cover bg-slate-800 mx-auto transition-all duration-200 group-hover:scale-110 group-hover:brightness-125 shadow-md`} 
                              loading="lazy" 
                            />
                            {idx === 0 && <Star className="w-3.5 h-3.5 text-yellow-400 absolute -top-1.5 -right-1.5 drop-shadow-lg fill-yellow-400 pointer-events-none" />}
                          </div>
                        </td>
                        <td className="p-3">
                          <div 
                            onClick={() => setSelectedPlayerPhoto({
                              name: player.gameName,
                              photoUrl: avatarUrl,
                              rank: ranks[idx],
                              squadName: player.squadName,
                              upazila: player.upazila,
                              kills: player.totalKills,
                              damage: player.totalDamage,
                              points: player.points || 0,
                              matches: player.matchesPlayed || 0
                            })}
                            className="font-black text-white text-[10px] uppercase tracking-wider cursor-pointer hover:text-cyan-400 transition-colors"
                          >
                            {player.gameName}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-bold text-cyan-400 uppercase">{player.squadName}</span>
                        </td>
                        <td className="p-3">
                          <span className="text-[10px] font-mono text-slate-400 uppercase">{player.upazila}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-[10px] font-bold text-slate-300 font-mono">{player.matchesPlayed || 0}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-[10px] font-black text-white font-mono">{player.totalKills}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-[10px] font-bold text-slate-400 font-mono">{player.totalDamage}</span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="text-[10px] font-black text-cyan-400 font-mono">{player.points || 0}</span>
                        </td>
                        <td className="p-3 text-center">
                          {isAdmin && !isDistributed ? (
                            <div className={`flex items-center justify-center gap-1.5 ${colors[idx]} px-2 py-1 rounded-md border ${borderColors[idx]}`}>
                              <Gift className="w-3 h-3" />
                              <span className="font-black text-[10px]">{prizes[idx]}</span>
                              <span className="font-mono text-[8px] uppercase">Tokens</span>
                              <button onClick={() => handleEditPrize(`top${idx + 1}`, `${ranks[idx]} Prize`, prizes[idx])} className={`ml-1 hover:brightness-125 transition-colors p-0.5 ${bgColors[idx]} rounded`}>
                                <Edit3 className="w-2.5 h-2.5" />
                              </button>
                            </div>
                          ) : (
                            <div className={`inline-flex items-center gap-1 ${colors[idx]}`}>
                              <Gift className="w-3 h-3" />
                              <span className="font-black text-[10px]">{prizes[idx]}</span>
                              <span className="font-mono text-[8px] uppercase ml-0.5">Tokens</span>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>

        {/* Action Button */}
        {isAdmin && !isDistributed && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="mt-12 z-10 flex flex-col items-center">
            <button
              onClick={handleDistributeClick}
              disabled={distributing}
              className="w-full max-w-[220px] py-2.5 px-3 rounded-xl font-black uppercase tracking-wider text-[11px] text-white shadow-[0_0_20px_rgba(6,182,212,0.4)] bg-gradient-to-r from-cyan-600 via-fuchsia-500 to-cyan-600 hover:from-cyan-500 hover:to-fuchsia-500 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {distributing ? (
                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
              ) : (
                <><CheckCircle2 className="w-3.5 h-3.5 shrink-0" /> Distribute Prizes To Wallets</>
              )}
            </button>
            <p className="text-[9px] text-slate-400 font-mono text-center mt-2 uppercase">Tokens will be deducted from Admin Upazila League Wallet</p>
          </motion.div>
        )}

        {isDistributed && (
          <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 }} className="mt-16 z-10 text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-green-500/20 text-green-400 px-6 py-3 rounded-full border border-green-500/30">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-black uppercase tracking-widest">Prizes Successfully Distributed</span>
            </div>
            <p className="text-[10px] text-slate-400 font-mono text-center mt-3 uppercase">Tokens were transferred to squad leaders and players.</p>
          </motion.div>
        )}

        {/* Validation Error Block Modal */}
        {validationErrorModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-red-500/40 rounded-2xl p-6 w-full max-w-md shadow-[0_0_40px_rgba(239,68,68,0.3)] relative text-center">
              <button onClick={() => setValidationErrorModal(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1.5 transition-colors">
                <X className="w-4 h-4" />
              </button>

              <div className="w-12 h-12 rounded-2xl bg-red-500/20 border border-red-500/40 text-red-400 flex items-center justify-center mx-auto mb-4 shadow-[0_0_20px_rgba(239,68,68,0.4)]">
                <AlertTriangle className="w-6 h-6" />
              </div>

              <h3 className="text-base font-black text-white uppercase tracking-wider mb-2">
                Distribution Blocked
              </h3>
              
              <p className="text-xs text-slate-300 font-sans leading-relaxed mb-5 bg-red-950/40 border border-red-500/20 p-3 rounded-xl">
                {validationErrorModal}
              </p>

              <div className="bg-black/50 border border-white/10 rounded-xl p-3 text-left space-y-2 mb-6">
                <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold mb-1">Status Verification Checklist:</div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Final Match Result Set:</span>
                  <span className={isFinalPlayed ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                    {isFinalPlayed ? "✓ Verified" : "✗ Not Set"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Champion Squad Name:</span>
                  <span className={champion?.teamName && !champion.teamName.includes('TBD') ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                    {champion?.teamName && !champion.teamName.includes('TBD') ? champion.teamName : "✗ [TBD]"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs font-mono">
                  <span className="text-slate-300">Runner-Up Squad Name:</span>
                  <span className={runnerUp?.teamName && !runnerUp.teamName.includes('TBD') ? "text-emerald-400 font-bold" : "text-red-400 font-bold"}>
                    {runnerUp?.teamName && !runnerUp.teamName.includes('TBD') ? runnerUp.teamName : "✗ [TBD]"}
                  </span>
                </div>
              </div>

              <button
                onClick={() => setValidationErrorModal(null)}
                className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-colors shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              >
                Close & Check Final Match
              </button>
            </motion.div>
          </div>
        )}

        {/* Confirmation Modal before Prize Distribution */}
        {showConfirmModal && (
          <div className="fixed inset-0 z-[250] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-6 w-full max-w-md shadow-neon-mixed relative">
              <button onClick={() => setShowConfirmModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1.5 transition-colors">
                <X className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-cyan-500/20 border border-cyan-500/40 rounded-xl text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  <Trophy className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Confirm Prize Distribution</h3>
                  <p className="text-[10px] text-cyan-300 font-mono uppercase tracking-widest">Verify squad details & transfer tokens</p>
                </div>
              </div>

              <div className="space-y-2 mb-5 text-xs bg-black/50 border border-white/10 p-3.5 rounded-xl font-mono">
                <div className="flex justify-between items-center pb-2 border-b border-white/10">
                  <span className="text-slate-400 uppercase text-[10px]">Final Match Status:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Result Set
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400 uppercase text-[10px]">🏆 Champion Squad:</span>
                  <span className="text-yellow-300 font-black uppercase text-[11px] truncate max-w-[180px]">
                    {champion?.teamName}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-slate-400 uppercase text-[10px]">🥈 Runner-Up Squad:</span>
                  <span className="text-slate-200 font-black uppercase text-[11px] truncate max-w-[180px]">
                    {runnerUp?.teamName}
                  </span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-white/10 text-cyan-300 font-bold">
                  <span className="uppercase text-[10px]">Total Prize Payout:</span>
                  <span className="text-sm font-black text-cyan-400">
                    {championPrize + runnerUpPrize + top1Prize + top2Prize + top3Prize} Tokens
                  </span>
                </div>
              </div>

              <p className="text-[10px] text-slate-300 font-sans text-center mb-5 leading-relaxed bg-cyan-950/30 border border-cyan-500/20 p-2.5 rounded-lg">
                ⚠️ Tokens will be transferred directly to user wallets and deducted from the Admin Upazila League Wallet. Are you sure you want to proceed?
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs uppercase tracking-wider rounded-xl transition-colors border border-white/10"
                >
                  Cancel
                </button>
                <button
                  onClick={executeDistribution}
                  disabled={distributing}
                  className="flex-1 py-2.5 bg-gradient-to-r from-cyan-600 via-fuchsia-500 to-cyan-600 hover:from-cyan-500 hover:to-fuchsia-500 text-white font-black text-xs uppercase tracking-wider rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-1.5"
                >
                  {distributing ? (
                    <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processing...</>
                  ) : (
                    <><CheckCircle2 className="w-3.5 h-3.5" /> Confirm & Distribute</>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}


        {/* Edit Prize Modal */}
        {editingPrize && editingPrize.isOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 w-full max-w-sm shadow-2xl relative">
              <button onClick={() => setEditingPrize(null)} className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full p-1.5 transition-colors">
                <X className="w-4 h-4" />
              </button>
              
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2.5 bg-cyan-500/20 rounded-xl">
                  <Gift className="w-5 h-5 text-cyan-400" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">Edit Prize</h3>
                  <p className="text-[10px] text-slate-400 font-mono uppercase tracking-widest">{editingPrize.title}</p>
                </div>
              </div>
              
              <div className="mb-6">
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Token Amount</label>
                <div className="relative">
                  <input 
                    type="number" 
                    value={tempPrizeValue} 
                    onChange={e => setTempPrizeValue(Number(e.target.value))}
                    className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-white font-mono text-sm focus:outline-none focus:border-cyan-500/50 transition-colors"
                  />
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-1.5 text-cyan-400 opacity-50">
                    <span className="text-[10px] font-black uppercase tracking-widest">Tokens</span>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={handleSavePrize}
                className="w-full py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs uppercase tracking-widest rounded-xl transition-colors shadow-[0_0_20px_rgba(147,51,234,0.3)]"
              >
                Save Changes
              </button>
            </motion.div>
          </div>
        )}

        {/* Selected Player Photo Lightbox Modal */}
        {selectedPlayerPhoto && (
          <div 
            className="fixed inset-0 z-[300] flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            onClick={() => setSelectedPlayerPhoto(null)}
          >
            <motion.div 
              initial={{ scale: 0.85, opacity: 0 }} 
              animate={{ scale: 1, opacity: 1 }} 
              exit={{ scale: 0.85, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 w-full max-w-sm shadow-neon-mixed relative flex flex-col items-center text-center"
            >
              <button 
                onClick={() => setSelectedPlayerPhoto(null)} 
                className="absolute top-4 right-4 text-slate-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <span className="text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-widest mb-3 bg-cyan-500/10 border border-cyan-500/30 px-3 py-1 rounded-full">
                {selectedPlayerPhoto.rank ? `${selectedPlayerPhoto.rank} Player Profile` : 'Player Profile Photo'}
              </span>

              {/* Large Profile Photo Frame */}
              <div className="relative mb-4 group">
                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-600 via-cyan-600 to-amber-500 rounded-2xl blur-lg opacity-70 group-hover:opacity-100 transition duration-500"></div>
                <img 
                  src={selectedPlayerPhoto.photoUrl} 
                  alt={selectedPlayerPhoto.name} 
                  className="relative w-48 h-48 sm:w-56 sm:h-56 rounded-2xl object-cover border-2 border-white/20 shadow-2xl bg-slate-950" 
                />
              </div>

              <h3 className="text-xl font-black text-white uppercase tracking-wide">
                {selectedPlayerPhoto.name}
              </h3>

              {selectedPlayerPhoto.squadName && (
                <p className="text-xs font-bold text-cyan-400 uppercase mt-1">
                  {selectedPlayerPhoto.squadName} • <span className="text-slate-400 font-mono">{selectedPlayerPhoto.upazila || 'N/A'}</span>
                </p>
              )}

              {/* Player Stats & Points Summary */}
              <div className="grid grid-cols-4 gap-2 w-full mt-4 bg-black/50 border border-white/10 p-3 rounded-xl font-mono text-center">
                <div>
                  <div className="text-[8px] text-slate-400 uppercase">Matches</div>
                  <div className="text-xs font-black text-slate-200">{selectedPlayerPhoto.matches ?? 0}</div>
                </div>
                <div>
                  <div className="text-[8px] text-slate-400 uppercase">Kills</div>
                  <div className="text-xs font-black text-amber-400">{selectedPlayerPhoto.kills ?? 0}</div>
                </div>
                <div>
                  <div className="text-[8px] text-slate-400 uppercase">Damage</div>
                  <div className="text-xs font-black text-slate-300">{selectedPlayerPhoto.damage ?? 0}</div>
                </div>
                <div>
                  <div className="text-[8px] text-slate-400 uppercase">Points</div>
                  <div className="text-xs font-black text-cyan-400">{selectedPlayerPhoto.points ?? 0}</div>
                </div>
              </div>

              <button
                onClick={() => setSelectedPlayerPhoto(null)}
                className="mt-5 w-full py-2.5 bg-gradient-to-r from-cyan-600 via-fuchsia-500 to-cyan-600 text-white font-black text-xs uppercase tracking-wider rounded-xl hover:brightness-110 transition-all shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                Close Preview
              </button>
            </motion.div>
          </div>
        )}
      </div>
    </div>
  );
}
