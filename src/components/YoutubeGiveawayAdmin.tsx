import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Youtube, 
  Gift, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  RefreshCw, 
  Users, 
  Sparkles, 
  Coins, 
  Check, 
  X, 
  Megaphone,
  UserCheck,
  UserX,
  Wallet,
  Facebook,
  Music
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, onSnapshot, runTransaction, serverTimestamp, deleteDoc, updateDoc } from 'firebase/firestore';

interface YoutubeGiveawayAdminProps {
  adminName: string;
  adminEmail: string;
  onSuccess?: () => void;
}

interface ResolvedUser {
  playvearId: string;
  found: boolean;
  userId?: string;
  displayName?: string;
  email?: string;
  tokens?: number;
}

export function YoutubeGiveawayAdmin({ adminName, adminEmail, onSuccess }: YoutubeGiveawayAdminProps) {
  const [platform, setPlatform] = useState<'youtube' | 'facebook' | 'tiktok'>('youtube');
  const [rawPlayvearIds, setRawPlayvearIds] = useState('');
  const [tokensPerWinner, setTokensPerWinner] = useState<number>(500);
  const [campaignTitle, setCampaignTitle] = useState('YouTube Official Video #12 Giveaway');
  const [greetMessage, setGreetMessage] = useState('🎉 Congratulations! You are one of the top 10 fastest commenters on our official playVear YouTube video! Claim your reward now!');
  const [publishToPulse, setPublishToPulse] = useState(true);
  const [giveawayWalletBalance, setGiveawayWalletBalance] = useState<number>(0);

  const handlePlatformChange = (newPlatform: 'youtube' | 'facebook' | 'tiktok') => {
    setPlatform(newPlatform);
    if (newPlatform === 'facebook') {
      setCampaignTitle('Facebook Official Post Giveaway');
      setGreetMessage('🎉 Congratulations! You are one of the top fastest commenters on our official playVear Facebook post! Claim your reward now!');
    } else if (newPlatform === 'tiktok') {
      setCampaignTitle('TikTok Official Video Giveaway');
      setGreetMessage('🎉 Congratulations! You are one of the top fastest commenters on our official playVear TikTok video! Claim your reward now!');
    } else {
      setCampaignTitle('YouTube Official Video #12 Giveaway');
      setGreetMessage('🎉 Congratulations! You are one of the top 10 fastest commenters on our official playVear YouTube video! Claim your reward now!');
    }
  };

  const [verifying, setVerifying] = useState(false);
  const [resolvedUsers, setResolvedUsers] = useState<ResolvedUser[]>([]);
  const [verificationDone, setVerificationDone] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sandbox cleanup
  useEffect(() => {
    const cleanup = async () => {
      try {
        await deleteDoc(doc(db, 'users', 'playvear_official_giveaway')).catch(() => {});
        await deleteDoc(doc(db, 'host_brands', 'playvear_official_giveaway')).catch(() => {});
        // Do not delete 20268211706164 from leagues, but delete from users if accidentally created
        await deleteDoc(doc(db, 'users', '20268211706164')).catch(() => {});
        await deleteDoc(doc(db, 'host_brands', '20268211706164')).catch(() => {});
        
        // Find admin uid
        const adminQ = query(collection(db, 'users'), where('email', '==', adminEmail));
        const adminSnap = await getDocs(adminQ);
        if (!adminSnap.empty) {
          const adminUid = adminSnap.docs[0].id;
          
          const migrateCollection = async (collName, idField) => {
            const q1 = query(collection(db, collName), where(idField, '==', '20268211706164'));
            const s1 = await getDocs(q1);
            s1.forEach(d => updateDoc(d.ref, { [idField]: adminUid }));

            const q2 = query(collection(db, collName), where(idField, '==', 'playvear_official_giveaway'));
            const s2 = await getDocs(q2);
            s2.forEach(d => updateDoc(d.ref, { [idField]: adminUid }));
          };

          await migrateCollection('pro_hosted_leagues', 'hostId');
          await migrateCollection('tournaments_freefire', 'hostId');
          await migrateCollection('lone_wolf_matches', 'hostId');
          await migrateCollection('pulse_posts', 'userId');
        }
      } catch (e) {
        console.error("Cleanup error", e);
      }
    };
    cleanup();
  }, [adminEmail]);

  // Subscribe to system Giveaway Wallet balance
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'system', 'wallets'), (docSnap) => {
      if (docSnap.exists()) {
        setGiveawayWalletBalance(docSnap.data().giveawayWallet || 0);
      }
    });
    return () => unsub();
  }, []);

  // Extract array of clean unique PlayVear IDs
  const parseIds = (raw: string): string[] => {
    return Array.from(
      new Set(
        raw
          .split(/[\s,;\n]+/)
          .map(id => id.trim())
          .filter(id => id.length > 0)
      )
    );
  };

  // Verify PlayVear IDs against Firestore
  const handleVerifyIds = async () => {
    const parsedIds = parseIds(rawPlayvearIds);
    if (parsedIds.length === 0) {
      setErrorMsg('Please enter at least one PlayVear ID to verify.');
      return;
    }

    setVerifying(true);
    setErrorMsg('');
    setSuccessMsg('');
    setVerificationDone(false);

    try {
      const results: ResolvedUser[] = [];

      for (const pId of parsedIds) {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('playvearId', '==', pId));
        const querySnap = await getDocs(q);

        if (!querySnap.empty) {
          const userDoc = querySnap.docs[0];
          const uData = userDoc.data();
          results.push({
            playvearId: pId,
            found: true,
            userId: userDoc.id,
            displayName: uData.displayName || 'PlayVear User',
            email: uData.email || '',
            tokens: uData.tokens || 0
          });
        } else {
          results.push({
            playvearId: pId,
            found: false
          });
        }
      }

      setResolvedUsers(results);
      setVerificationDone(true);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to verify PlayVear IDs.');
    } finally {
      setVerifying(false);
    }
  };

  const validWinners = resolvedUsers.filter(u => u.found);
  const totalTokensNeeded = validWinners.length * tokensPerWinner;

  // Dispatch Giveaway Tokens via Firestore Transaction
  const handleDispatchGiveaway = async (e: React.FormEvent) => {
    e.preventDefault();

    if (validWinners.length === 0) {
      setErrorMsg('No valid PlayVear IDs resolved. Please verify valid user IDs first.');
      return;
    }

    if (tokensPerWinner <= 0) {
      setErrorMsg('Please enter a valid positive token amount per winner.');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      // Resolve the main admin's UID to use for the Pulse Post
      let mainAdminId = adminEmail; // Fallback to email if fetch fails, but fetch should succeed
      let mainAdminPhoto = 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';

      try {
        const adminQuery = query(collection(db, 'users'), where('email', '==', adminEmail));
        const adminSnap = await getDocs(adminQuery);
        if (!adminSnap.empty) {
          const adminDoc = adminSnap.docs[0];
          mainAdminId = adminDoc.id; // Use the actual admin's user ID
          if (adminDoc.data().photoURL) {
            mainAdminPhoto = adminDoc.data().photoURL;
          }
        }
      } catch (e) {
        console.error("Error fetching admin profile:", e);
      }

      await runTransaction(db, async (transaction) => {
        // 1. Create giveaway documents for each winner
        for (const winner of validWinners) {
          if (!winner.userId) continue;

          // Giveaway reward document in root 'giveaways' collection
          const giveawayRef = doc(collection(db, 'giveaways'));
          transaction.set(giveawayRef, {
            id: giveawayRef.id,
            userId: winner.userId,
            playvearId: winner.playvearId,
            userDisplayName: winner.displayName,
            userEmail: winner.email,
            campaignTitle: campaignTitle,
            tokens: tokensPerWinner,
            greetMessage: greetMessage,
            status: 'unclaimed',
            platform: platform,
            createdAt: serverTimestamp(),
            createdByAdmin: adminName,
            createdByAdminEmail: adminEmail
          });

          // Also record notification / history entry in user collection
          const userHistoryRef = doc(collection(db, 'users', winner.userId, 'tokenTransactions'));
          const platformName = platform === 'youtube' ? 'YouTube' : platform === 'facebook' ? 'Facebook' : 'TikTok';
          transaction.set(userHistoryRef, {
            amount: tokensPerWinner,
            type: 'giveaway_pending',
            description: `${platformName} Giveaway Pending: ${campaignTitle}`,
            date: new Date().toISOString(),
            createdAt: serverTimestamp()
          });
        }

        // 2. If Pulse Feed option is enabled, post official announcement
        if (publishToPulse) {
          const winnersListText = validWinners
            .map((w, idx) => `${idx + 1}. ${w.displayName} (ID: ${w.playvearId})`)
            .join('\n');

          const platformName = platform === 'youtube' ? 'YouTube' : platform === 'facebook' ? 'Facebook' : 'TikTok';
          const platformTarget = platform === 'facebook' ? 'post' : 'video';
          const pulsePostRef = doc(collection(db, 'pulse_posts'));
          transaction.set(pulsePostRef, {
            id: pulsePostRef.id,
            userId: mainAdminId,
            userName: 'PlayVear Official',
            userPhoto: mainAdminPhoto,
            userRole: 'admin',
            authorIdentity: 'host',
            isHostPost: true,
            text: `🎁 ${platformName.toUpperCase()} GIVEAWAY WINNERS ANNOUNCEMENT!\n\nCongratulations to our top fastest commenters on the official playVear ${platformName} ${platformTarget}! Each winner receives 🪙${tokensPerWinner} Tokens!\n\n🏆 Winners:\n${winnersListText}\n\n${greetMessage}\n\nOpen your app to claim your reward popup! 🎉`,
            category: 'rewards',
            status: 'approved',
            approvedAt: serverTimestamp(),
            likes: [],
            likesCount: 0,
            commentsCount: 0,
            sharesCount: 0,
            views: 0,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            isVerifiedHost: true
          });
        }
      });

      setSuccessMsg(`🎉 Success! Giveaway dispatched to ${validWinners.length} players (${totalTokensNeeded} Tokens total). Unclaimed pop-ups are now active and will deduct from the Giveaway Wallet upon claim!`);
      setRawPlayvearIds('');
      setResolvedUsers([]);
      setVerificationDone(false);

      if (onSuccess) {
        onSuccess();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to dispatch giveaway.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="w-full bg-[#050b18]/90 border border-cyan-500/20 rounded-2xl p-5 sm:p-6 text-left relative overflow-hidden shadow-2xl">
      {/* Background Cyberpunk Ambient Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-cyan-500/10 via-blue-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-cyan-500/20 pb-4 mb-5">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Gift className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <span>Social Media Giveaway Dispatcher</span>
              <span className="px-2 py-0.5 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[9px] font-mono rounded-md font-bold uppercase">
                Direct Dispatch
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Reward top commenters with tokens directly deducted from the Giveaway Wallet upon user claim.
            </p>
          </div>
        </div>

        {/* Giveaway Wallet Mini Card */}
        <div className="bg-gradient-to-r from-red-950/40 to-slate-900/80 border border-red-500/30 rounded-xl p-2.5 px-4 flex items-center gap-3 self-start sm:self-auto">
          <div className="h-8 w-8 rounded-lg bg-red-500/20 flex items-center justify-center text-red-400">
            <Gift className="h-4 w-4" />
          </div>
          <div>
            <div className="text-[9px] text-slate-400 uppercase font-black tracking-wider">Giveaway Wallet Balance</div>
            <div className="text-sm font-black text-white font-mono flex items-center gap-1">
              <span>🪙 {Number(giveawayWalletBalance || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      {errorMsg && (
        <div className="mb-4 p-3.5 bg-red-950/60 border border-red-500/40 rounded-xl flex items-start gap-2.5">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
          <p className="text-xs text-red-200 font-medium">{errorMsg}</p>
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-3.5 bg-emerald-950/60 border border-emerald-500/40 rounded-xl flex items-start gap-2.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 shrink-0" />
          <p className="text-xs text-emerald-200 font-medium">{successMsg}</p>
        </div>
      )}

      <form onSubmit={handleDispatchGiveaway} className="space-y-5">
        
        {/* Platform Selection */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider font-mono">
            Giveaway Platform
          </label>
          <div className="grid grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => handlePlatformChange('facebook')}
              className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border transition-all ${
                platform === 'facebook' 
                  ? 'bg-blue-600/20 border-blue-500 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.3)]' 
                  : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Facebook className="w-5 h-5" />
              <span className="font-bold text-xs">Facebook</span>
              {platform === 'facebook' && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => handlePlatformChange('tiktok')}
              className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border transition-all ${
                platform === 'tiktok' 
                  ? 'bg-cyan-600/20 border-cyan-500 text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]' 
                  : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Music className="w-5 h-5" />
              <span className="font-bold text-xs">TikTok</span>
              {platform === 'tiktok' && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
            <button
              type="button"
              onClick={() => handlePlatformChange('youtube')}
              className={`flex items-center justify-center gap-2 px-3 py-3 rounded-xl border transition-all ${
                platform === 'youtube' 
                  ? 'bg-red-600/20 border-red-500 text-red-400 shadow-[0_0_15px_rgba(239,68,68,0.3)]' 
                  : 'bg-slate-900/80 border-slate-700/80 text-slate-400 hover:bg-slate-800'
              }`}
            >
              <Youtube className="w-5 h-5" />
              <span className="font-bold text-xs">YouTube</span>
              {platform === 'youtube' && <CheckCircle2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Campaign Title & Token Amount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider font-mono">
              Giveaway Campaign Title
            </label>
            <input
              type="text"
              value={campaignTitle}
              onChange={(e) => setCampaignTitle(e.target.value)}
              placeholder={`e.g. ${platform === 'youtube' ? 'YouTube' : platform === 'facebook' ? 'Facebook' : 'TikTok'} Giveaway`}
              required
              disabled={submitting}
              className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 font-sans"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider font-mono flex items-center justify-between">
              <span>Token Reward Per Winner</span>
              <span className="text-cyan-400 font-mono">🪙 {tokensPerWinner} Tokens</span>
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Coins className="h-4 w-4 text-amber-400" />
              </div>
              <input
                type="number"
                value={tokensPerWinner}
                onChange={(e) => setTokensPerWinner(Math.max(1, parseInt(e.target.value) || 0))}
                min="1"
                required
                disabled={submitting}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60"
              />
            </div>
          </div>
        </div>

        {/* Input PlayVear IDs Area */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider font-mono">
              PlayVear IDs (Paste up to 10 IDs)
            </label>
            <span className="text-[10px] text-slate-400">
              Separated by commas, spaces or newlines (e.g. 4001, 4002, 4003)
            </span>
          </div>

          <div className="relative">
            <textarea
              rows={3}
              value={rawPlayvearIds}
              onChange={(e) => {
                setRawPlayvearIds(e.target.value);
                setVerificationDone(false);
              }}
              placeholder="Paste PlayVear IDs here... e.g.: 4001, 4002, 4003, 4004"
              disabled={submitting}
              className="w-full bg-slate-950/90 border border-slate-700/80 rounded-xl p-3 text-xs font-mono text-cyan-300 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 resize-none"
            />
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={handleVerifyIds}
              disabled={verifying || submitting || !rawPlayvearIds.trim()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {verifying ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <Users className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>{verifying ? 'Verifying IDs...' : 'Verify PlayVear IDs'}</span>
            </button>

            {verificationDone && (
              <span className="text-xs font-mono text-slate-300 flex items-center gap-1.5">
                <span className="text-emerald-400 font-bold">{validWinners.length} Verified</span>
                {resolvedUsers.length - validWinners.length > 0 && (
                  <span className="text-rose-400 font-bold">({resolvedUsers.length - validWinners.length} Invalid)</span>
                )}
              </span>
            )}
          </div>
        </div>

        {/* Resolved Users Preview List */}
        {resolvedUsers.length > 0 && (
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-2">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-wider font-mono border-b border-white/5 pb-1.5 flex items-center justify-between">
              <span>Verified Winner List Preview</span>
              <span>Total Tokens: 🪙{totalTokensNeeded}</span>
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto pr-1">
              {resolvedUsers.map((user, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded-lg border text-xs flex items-center justify-between ${
                    user.found
                      ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-100'
                      : 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate">
                    {user.found ? (
                      <UserCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    ) : (
                      <UserX className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    )}
                    <div className="truncate">
                      <div className="font-bold truncate text-white">
                        {user.found ? user.displayName : `ID: ${user.playvearId}`}
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        ID: {user.playvearId} {user.found && `| Bal: 🪙${user.tokens}`}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 font-mono text-[10px] font-bold">
                    {user.found ? (
                      <span className="text-emerald-400">+🪙{tokensPerWinner}</span>
                    ) : (
                      <span className="text-rose-400 uppercase">Not Found</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Congratulatory Greeting Message */}
        <div className="space-y-1.5">
          <label className="text-[10px] font-black text-slate-300 uppercase tracking-wider font-mono">
            Greetings / Winner Popup Message
          </label>
          <textarea
            rows={2}
            value={greetMessage}
            onChange={(e) => setGreetMessage(e.target.value)}
            placeholder="Type congratulations message..."
            required
            disabled={submitting}
            className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/60 resize-none font-sans"
          />
        </div>

        {/* Publish to Pulse Feed Toggle */}
        <div className="flex items-center gap-2.5 p-3 bg-slate-950/60 border border-cyan-500/20 rounded-xl cursor-pointer">
          <input
            type="checkbox"
            id="publishPulse"
            checked={publishToPulse}
            onChange={(e) => setPublishToPulse(e.target.checked)}
            className="w-4 h-4 rounded text-cyan-500 bg-slate-900 border-slate-700 focus:ring-cyan-500"
          />
          <label htmlFor="publishPulse" className="text-xs text-slate-200 font-medium cursor-pointer flex items-center gap-2">
            <Megaphone className="w-3.5 h-3.5 text-cyan-400" />
            <span>Publish Winner Announcement to Pulse Community Feed</span>
          </label>
        </div>

        {/* Action Button */}
        <button
          type="submit"
          disabled={submitting || validWinners.length === 0}
          className="w-full py-3.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] active:scale-[0.99] flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
        >
          {submitting ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Gift className="w-4 h-4 text-cyan-200" />
              <span>Dispatch Giveaway ({validWinners.length} Winners - 🪙{totalTokensNeeded} Total)</span>
            </>
          )}
        </button>

      </form>
    </div>
  );
}
