import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Gift, Sparkles, Coins, Check, X, Youtube, Trophy, Facebook, Music } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { UserProfile } from '../types';

interface GiveawayClaimModalProps {
  user: any;
  userProfile: UserProfile | null;
  onClaimSuccess?: (amount: number) => void;
}

interface GiveawayItem {
  id: string;
  userId: string;
  playvearId: string;
  campaignTitle: string;
  tokens: number;
  greetMessage: string;
  status: 'unclaimed' | 'claimed';
  platform?: 'youtube' | 'facebook' | 'tiktok';
  createdByAdmin?: string;
}

export function GiveawayClaimModal({ user, userProfile, onClaimSuccess }: GiveawayClaimModalProps) {
  const [activeGiveaway, setActiveGiveaway] = useState<GiveawayItem | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimedSuccess, setClaimedSuccess] = useState(false);

  useEffect(() => {
    if (!user || !user.uid) {
      setActiveGiveaway(null);
      return;
    }

    // Query for unclaimed giveaways targeting current user UID
    const giveawaysRef = collection(db, 'giveaways');
    const q = query(
      giveawaysRef,
      where('userId', '==', user.uid),
      where('status', '==', 'unclaimed')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        setActiveGiveaway({
          id: docSnap.id,
          ...docSnap.data()
        } as GiveawayItem);
      } else {
        setActiveGiveaway(null);
      }
    }, (err) => {
      console.warn('Giveaway listener error:', err);
    });

    return () => unsubscribe();
  }, [user]);

  const handleClaimTokens = async () => {
    if (!activeGiveaway || !user?.uid) return;

    setClaiming(true);
    try {
      const giveawayId = activeGiveaway.id;
      const tokensToAdd = activeGiveaway.tokens || 0;

      await runTransaction(db, async (transaction) => {
        const giveawayRef = doc(db, 'giveaways', giveawayId);
        const userRef = doc(db, 'users', user.uid);
        const systemWalletRef = doc(db, 'system', 'wallets');

        // --- 1. ALL READS FIRST ---
        const giveawaySnap = await transaction.get(giveawayRef);
        const userSnap = await transaction.get(userRef);
        const systemWalletSnap = await transaction.get(systemWalletRef);

        if (!giveawaySnap.exists()) {
          throw new Error('Giveaway record no longer exists.');
        }

        if (giveawaySnap.data().status === 'claimed') {
          throw new Error('This giveaway has already been claimed.');
        }

        const currentTokens = userSnap.exists() ? (userSnap.data().tokens || 0) : (userProfile?.tokens || 0);
        const currentGiveawayWallet = systemWalletSnap.exists() ? (systemWalletSnap.data().giveawayWallet || 0) : 0;

        // --- 2. ALL WRITES AFTER ---
        // 1. Update User Document
        transaction.set(userRef, {
          tokens: currentTokens + tokensToAdd,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // 2. Update Giveaway Document
        transaction.update(giveawayRef, {
          status: 'claimed',
          claimedAt: serverTimestamp()
        });

        // 3. Deduct from System Giveaway Wallet
        transaction.set(systemWalletRef, {
          giveawayWallet: Math.max(0, currentGiveawayWallet - tokensToAdd)
        }, { merge: true });

        // 4. Log Deduction to System Wallet History (Giveaway Wallet)
        const systemHistoryRef = doc(collection(db, 'system', 'wallets', 'history'));
        transaction.set(systemHistoryRef, {
          walletType: 'giveawayWallet',
          amountDeducted: tokensToAdd,
          type: 'deduction',
          reason: `Giveaway Claimed: ${activeGiveaway.campaignTitle}`,
          playerId: user.uid,
          playerName: userProfile?.displayName || (activeGiveaway as any).userDisplayName || 'Winner',
          playerDisplayName: userProfile?.displayName || (activeGiveaway as any).userDisplayName || 'Winner',
          playerEmail: user.email || (activeGiveaway as any).userEmail || '',
          playerPlayvearId: (activeGiveaway as any).playvearId || (userProfile as any)?.playvearId || '',
          playvearId: (activeGiveaway as any).playvearId || (userProfile as any)?.playvearId || '',
          campaignTitle: activeGiveaway.campaignTitle,
          campaignId: activeGiveaway.id,
          createdAt: serverTimestamp(),
          claimedAt: serverTimestamp()
        });

        // 5. Add Token Transaction to User Profile
        const transactionRef = doc(collection(db, 'users', user.uid, 'tokenTransactions'));
        const platformName = activeGiveaway.platform === 'youtube' ? 'YouTube' : activeGiveaway.platform === 'facebook' ? 'Facebook' : activeGiveaway.platform === 'tiktok' ? 'TikTok' : 'Social';
        transaction.set(transactionRef, {
          amount: tokensToAdd,
          type: 'income',
          description: `🎁 Claimed ${platformName} Giveaway: ${activeGiveaway.campaignTitle}`,
          date: new Date().toISOString(),
          createdAt: serverTimestamp()
        });
      });

      setClaimedSuccess(true);
      if (onClaimSuccess) {
        onClaimSuccess(tokensToAdd);
      }

      setTimeout(() => {
        setActiveGiveaway(null);
        setClaimedSuccess(false);
      }, 2500);

    } catch (err: any) {
      console.error('Failed to claim giveaway:', err);
      alert(err.message || 'Failed to claim giveaway reward.');
    } finally {
      setClaiming(false);
    }
  };

  if (!activeGiveaway) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />

        {/* Modal Container */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.8, y: 30 }}
          className="relative w-full max-w-md bg-[#050b18] border-2 border-cyan-400/80 rounded-3xl shadow-[0_0_50px_rgba(6,182,212,0.4)] overflow-hidden flex flex-col items-center p-6 text-center"
        >
          {/* Animated Background Rays */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-500/20 via-blue-600/10 to-transparent pointer-events-none animate-pulse" />

          {/* Floating Confetti Sparkles Decoration */}
          <div className="absolute top-3 left-6 text-cyan-400 animate-bounce">
            <Sparkles className="w-5 h-5" />
          </div>
          <div className="absolute top-4 right-6 text-pink-400 animate-pulse">
            <Trophy className="w-5 h-5" />
          </div>

          {/* Badge Icon */}
          <div className="relative z-10 mt-2 mb-3">
            {activeGiveaway.platform === 'facebook' ? (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-500 p-0.5 shadow-[0_0_25px_rgba(59,130,246,0.5)] flex items-center justify-center">
                <div className="w-full h-full bg-[#070e1e] rounded-[14px] flex items-center justify-center">
                  <Facebook className="w-8 h-8 text-blue-500 animate-pulse" />
                </div>
              </div>
            ) : activeGiveaway.platform === 'tiktok' ? (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-600 via-cyan-500 to-pink-500 p-0.5 shadow-[0_0_25px_rgba(6,182,212,0.5)] flex items-center justify-center">
                <div className="w-full h-full bg-[#070e1e] rounded-[14px] flex items-center justify-center">
                  <Music className="w-8 h-8 text-cyan-400 animate-pulse" />
                </div>
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-red-600 via-pink-600 to-rose-500 p-0.5 shadow-[0_0_25px_rgba(239,68,68,0.5)] flex items-center justify-center">
                <div className="w-full h-full bg-[#070e1e] rounded-[14px] flex items-center justify-center">
                  <Youtube className="w-8 h-8 text-red-500 animate-pulse" />
                </div>
              </div>
            )}
          </div>

          {/* Header Title */}
          <div className="relative z-10 space-y-1">
            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 border rounded-full font-mono ${
              activeGiveaway.platform === 'facebook' ? 'bg-blue-500/20 border-blue-400/50 text-blue-300' :
              activeGiveaway.platform === 'tiktok' ? 'bg-cyan-500/20 border-cyan-400/50 text-cyan-300' :
              'bg-red-500/20 border-red-400/50 text-red-300'
            }`}>
              OFFICIAL {activeGiveaway.platform === 'facebook' ? 'FACEBOOK' : activeGiveaway.platform === 'tiktok' ? 'TIKTOK' : 'YOUTUBE'} REWARD
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white uppercase tracking-wider font-mono mt-2 drop-shadow-md">
              🎁 YOU WON A GIVEAWAY!
            </h2>
            <p className="text-xs text-slate-300 font-sans font-medium px-2">
              {activeGiveaway.campaignTitle || 'Official Commenter Reward'}
            </p>
          </div>

          {/* Glowing Token Box */}
          <div className="relative z-10 my-5 w-full bg-slate-900/90 border border-cyan-500/30 rounded-2xl p-4 shadow-inner flex flex-col items-center">
            <div className="text-[10px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-1">
              REWARD AMOUNT
            </div>
            <div className="text-3xl sm:text-4xl font-black text-amber-300 font-mono tracking-tight flex items-center gap-2 drop-shadow-[0_0_12px_rgba(252,211,77,0.4)]">
              <Coins className="w-8 h-8 text-amber-400" />
              <span>+{activeGiveaway.tokens} TOKENS</span>
            </div>

            {/* Admin Message */}
            <div className="mt-3 p-3 bg-slate-950/80 border border-white/10 rounded-xl text-xs text-slate-200 font-sans italic text-left w-full relative">
              <p className="line-clamp-4">"{activeGiveaway.greetMessage}"</p>
              <div className="text-[9px] font-mono text-cyan-400 font-bold not-italic mt-1 text-right">
                — playVear Official Team
              </div>
            </div>
          </div>

          {/* Claim Action Button */}
          <div className="relative z-10 w-full">
            {claimedSuccess ? (
              <div className="w-full py-3.5 bg-emerald-500 text-slate-950 font-black uppercase tracking-widest text-xs rounded-2xl flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.5)]">
                <Check className="w-5 h-5" />
                <span>TOKENS ADDED TO WALLET!</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleClaimTokens}
                disabled={claiming}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-black uppercase tracking-widest text-xs rounded-2xl transition-all shadow-[0_0_25px_rgba(6,182,212,0.5)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {claiming ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Gift className="w-5 h-5 text-cyan-200" />
                    <span>CLAIM REWARD NOW</span>
                  </>
                )}
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
