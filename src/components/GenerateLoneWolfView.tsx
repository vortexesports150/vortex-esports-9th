import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Swords, 
  Coins, 
  Shield, 
  AlertTriangle, 
  Calendar, 
  Clock, 
  Zap, 
  MapPin, 
  X, 
  Check, 
  Upload, 
  Globe, 
  Key, 
  Flame, 
  Sparkles,
  Award,
  Crown,
  Target,
  Image as ImageIcon
} from 'lucide-react';
import { db } from '../lib/firebase';
import { compressLogoToMax20Kb, compressAndUploadLogoToFirebase } from '../lib/imgbb';
import { 
  runTransaction, 
  doc, 
  collection, 
  serverTimestamp, 
  getDocs, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { UserProfile } from '../types';

interface GenerateLoneWolfViewProps {
  userProfile: UserProfile | null;
  tokens: number;
  setTokens: (v: number | ((prev: number) => number)) => void;
  onBack: () => void;
  onLoneWolfGenerated: () => void;
  onOpenSubscriptionModal?: () => void;
}

const WEAPON_RULES = [
  { id: 'all_weapons', label: 'All Weapons Allowed', icon: '⚔️', desc: 'Any weapon can be selected during rounds' },
  { id: 'sniper_only', label: 'Sniper Only', icon: '🎯', desc: 'AWM, M82B, Kar98k precision duels' },
  { id: 'deagle_only', label: 'Desert Eagle / Pistol Only', icon: '🔫', desc: 'High-skill one-tap pistol combat' },
  { id: 'shotgun_only', label: 'Shotgun Showdown', icon: '💥', desc: 'M1887, M1014 close range battles' },
  { id: 'no_gloo', label: 'No Gloo Wall Duel', icon: '🛡️', desc: 'Pure aim and raw movement without shields' },
];

const MAP_OPTIONS = [
  { id: 'Iron Cage', label: 'Iron Cage Arena', badge: 'Classic 1v1' },
  { id: 'Ice Ground', label: 'Ice Ground', badge: 'Winter Clash' },
  { id: 'Colosseum', label: 'Colosseum Arena', badge: 'Gladiator' },
  { id: 'Bermuda Cage', label: 'Bermuda Cage', badge: 'Tactical' },
];

const ROUNDS_FORMATS = [
  { id: 'Best of 9 (First to 5)', label: 'Best of 9 Rounds', sub: 'First to 5 Wins (Standard FF)' },
  { id: 'Best of 7 (First to 4)', label: 'Best of 7 Rounds', sub: 'Fast 1v1 Quick Duel' },
  { id: 'Best of 13 (First to 7)', label: 'Best of 13 Rounds', sub: 'Marathon Championship' },
];

export function GenerateLoneWolfView({
  userProfile,
  tokens,
  setTokens,
  onBack,
  onLoneWolfGenerated,
  onOpenSubscriptionModal
}: GenerateLoneWolfViewProps) {
  // Local subscription override after immediate in-app purchase
  const [subOverrideType, setSubOverrideType] = useState<'monthly' | 'yearly' | 'apex' | null>(null);

  // Determine subscription max prize pool limit
  const activeSubTier = subOverrideType || userProfile?.proHostSubscription?.type || 'none';
  const getMaxPrizePool = (): number => {
    switch (activeSubTier) {
      case 'apex':
        return 5000;
      case 'yearly':
        return 2000;
      case 'monthly':
        return 1000;
      default:
        return 500;
    }
  };
  const maxPrizeLimit = getMaxPrizePool();

  // Subscription Configuration & In-App Purchase Modal State
  const [subscriptionConfig] = useState<{ monthlyFee: number; yearlyFee: number; apexFee: number }>({
    monthlyFee: 300,
    yearlyFee: 1500,
    apexFee: 10000
  });
  const [showSubModal, setShowSubModal] = useState<boolean>(false);
  const [pendingSubPlan, setPendingSubPlan] = useState<'monthly' | 'yearly' | 'apex' | null>(null);
  const [subError, setSubError] = useState<string>('');
  const [isSubscribing, setIsSubscribing] = useState<boolean>(false);
  const [showSubSuccessModal, setShowSubSuccessModal] = useState<boolean>(false);

  // Match Details
  const [title, setTitle] = useState('');
  const [matchDate, setMatchDate] = useState('');
  const [matchTime, setMatchTime] = useState('');
  const [weaponRule, setWeaponRule] = useState(WEAPON_RULES[0].label);
  const [mapName, setMapName] = useState(MAP_OPTIONS[0].id);
  const [roundsFormat, setRoundsFormat] = useState(ROUNDS_FORMATS[0].id);

  // Economic Fields
  const [entryFee, setEntryFee] = useState<number | ''>(20);
  const [prizePool, setPrizePool] = useState<number | ''>(200);

  // Access & Privacy
  const [accessType, setAccessType] = useState<'public' | 'code'>('public');
  const [accessCode, setAccessCode] = useState<string>('');

  // Local / Regional Venue
  const [isLocalVenue, setIsLocalVenue] = useState<boolean>(false);
  const [localVenueName, setLocalVenueName] = useState<string>('');
  const [localUpazilaDistrict, setLocalUpazilaDistrict] = useState<string>('');

  // Sponsor
  const [sponsorType, setSponsorType] = useState<'none' | 'name' | 'logo'>('none');
  const [sponsorName, setSponsorName] = useState<string>('');
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState<string>('');
  const [sponsorLinkUrl, setSponsorLinkUrl] = useState<string>('');
  const [sponsorLogoFile, setSponsorLogoFile] = useState<File | null>(null);
  const [sponsorLogoPreview, setSponsorLogoPreview] = useState<string>('');
  const [sponsorLogoSizeKb, setSponsorLogoSizeKb] = useState<number | null>(null);
  const [isCompressingLogo, setIsCompressingLogo] = useState<boolean>(false);

  // Modal & Generation State
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Set default date/time on mount
  useEffect(() => {
    const today = new Date();
    const formattedDate = today.toISOString().split('T')[0];
    setMatchDate(formattedDate);
    
    // Default time 1 hour ahead
    const later = new Date(today.getTime() + 60 * 60 * 1000);
    const hours = String(later.getHours()).padStart(2, '0');
    const minutes = String(later.getMinutes()).padStart(2, '0');
    setMatchTime(`${hours}:${minutes}`);

    // Auto title placeholder
    setTitle('Lone Wolf 1v1 Clash');
  }, []);

  const generateRandomAccessCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAccessCode(code);
  };

  const handleTokenInputChange = (val: string, setter: (v: number | '') => void) => {
    if (!val || val.trim() === '') {
      setter('');
      return;
    }
    const cleanStr = val.replace(/\D/g, '');
    if (!cleanStr) {
      setter('');
      return;
    }
    const stripped = cleanStr.replace(/^0+(?=\d)/, '');
    if (!stripped) {
      setter(0);
      return;
    }
    const num = parseInt(stripped, 10);
    setter(isNaN(num) ? '' : num);
  };

  const handleSponsorLogoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsCompressingLogo(true);
      const { dataUrl, sizeKb, compressedFile } = await compressLogoToMax20Kb(file);
      setSponsorLogoFile(compressedFile);
      setSponsorLogoPreview(dataUrl);
      setSponsorLogoSizeKb(sizeKb);
      setSponsorLogoUrl(dataUrl);
    } catch (err: any) {
      console.error('Error compressing sponsor logo:', err);
      alert('Could not compress logo. Please choose a smaller image.');
    } finally {
      setIsCompressingLogo(false);
    }
  };

  const parsedPrizePool = Number(prizePool) || 0;
  const depositTokensRequired = parsedPrizePool; // 100% of Prize Pool

  // Handle in-app subscription purchase
  const handleSubscribe = async (planType: 'monthly' | 'yearly' | 'apex') => {
    if (!userProfile?.userId) {
      setSubError('User profile not found. Please log in.');
      return;
    }
    const cost = planType === 'apex' 
      ? subscriptionConfig.apexFee 
      : planType === 'monthly' 
        ? subscriptionConfig.monthlyFee 
        : subscriptionConfig.yearlyFee;

    if (tokens < cost) {
      setSubError(`Insufficient tokens! You need ${cost} tokens, but currently have ${(Number(tokens) || 0).toFixed(2)} tokens.`);
      return;
    }

    setIsSubscribing(true);
    setSubError('');

    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userProfile.userId);
        const userSnap = await transaction.get(userRef);
        if (!userSnap.exists()) {
          throw new Error('User record not found.');
        }
        const currentTokens = userSnap.data().tokens || 0;
        if (currentTokens < cost) {
          throw new Error(`Insufficient tokens! Needed: ${cost}, Available: ${currentTokens}`);
        }

        const days = planType === 'monthly' ? 30 : 365;
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);

        transaction.update(userRef, {
          tokens: currentTokens - cost,
          proHostSubscription: {
            type: planType,
            expiresAt: expiresAt.toISOString()
          },
          updatedAt: new Date().toISOString()
        });

        const subRef = doc(collection(db, 'pro_host_subscriptions'));
        transaction.set(subRef, {
          userId: userProfile.userId,
          username: userProfile.displayName || '',
          email: userProfile.email || '',
          type: planType,
          expiresAt: expiresAt.toISOString(),
          subscribedAt: new Date().toISOString(),
          tokensPaid: cost
        });

        const historyRef = doc(collection(db, 'wallet_history'));
        transaction.set(historyRef, {
          userId: userProfile.userId,
          userName: userProfile.displayName || '',
          type: 'debit',
          amount: cost,
          balanceAfter: currentTokens - cost,
          description: `Pro Host Subscription (${planType.toUpperCase()}) - Upgraded Lone Wolf Limit to ${planType === 'apex' ? '5,000' : planType === 'yearly' ? '2,000' : '1,000'} 🪙`,
          createdAt: new Date().toISOString()
        });
      });

      setTokens(prev => prev - cost);
      setSubOverrideType(planType);
      setPendingSubPlan(null);
      setShowSubModal(false);
      setShowSubSuccessModal(true);
    } catch (err: any) {
      console.error('Subscription error:', err);
      setSubError(err?.message || 'Failed to activate subscription. Please try again.');
    } finally {
      setIsSubscribing(false);
    }
  };

  const validateAndOpenModal = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!title.trim()) {
      setErrorMsg('Please enter a Match Title for this Lone Wolf duel.');
      return;
    }

    if (!matchDate || !matchTime) {
      setErrorMsg('Please specify match date and scheduled time.');
      return;
    }

    if (parsedPrizePool <= 0) {
      setErrorMsg('Prize Pool must be at least 10 Tokens.');
      return;
    }

    if (parsedPrizePool > maxPrizeLimit) {
      setErrorMsg(`Your subscription allows a maximum prize pool of ${maxPrizeLimit} Tokens. Upgrade tier to host larger prize pools!`);
      return;
    }

    if (tokens < depositTokensRequired) {
      setErrorMsg(`Insufficient Token Wallet Balance! You need ${depositTokensRequired} tokens (100% of Prize Pool) to generate this Lone Wolf match.`);
      return;
    }

    if (accessType === 'code' && !accessCode.trim()) {
      setErrorMsg('Please generate or provide a 6-character Access Code for Private Access.');
      return;
    }

    setShowConfirmModal(true);
  };

  const handleConfirmGenerate = async () => {
    if (!userProfile?.userId) {
      setErrorMsg('User not authenticated.');
      return;
    }

    setIsGenerating(true);
    setErrorMsg('');

    try {
      // 0. Primary Upload: Upload sponsor logo to ImgBB (with Firebase Storage backup)
      let finalSponsorLogoUrl = sponsorType === 'logo' ? sponsorLogoUrl : null;
      if (sponsorType === 'logo' && sponsorLogoFile) {
        try {
          const uploadRes = await compressAndUploadLogoToFirebase(sponsorLogoFile, 'lone_wolf_sponsor');
          if (uploadRes && uploadRes.url) {
            finalSponsorLogoUrl = uploadRes.url;
          }
        } catch (logoErr) {
          console.warn("Sponsor logo upload failed, using fallback preview", logoErr);
          if (sponsorLogoPreview) {
            finalSponsorLogoUrl = sponsorLogoPreview;
          }
        }
      }

      // Find latest Lone Wolf match number
      let nextNumber = 101;
      try {
        const q = query(collection(db, 'lone_wolf_matches'), orderBy('matchNumber', 'desc'), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const highest = snap.docs[0].data().matchNumber;
          if (typeof highest === 'number') {
            nextNumber = highest + 1;
          }
        }
      } catch {
        nextNumber = Math.floor(100 + Math.random() * 900);
      }

      const matchId = `LONE-${Math.floor(100000 + Math.random() * 900000)}`;

      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userProfile.userId);
        const userSnap = await transaction.get(userRef);

        if (!userSnap.exists()) {
          throw new Error('User document does not exist.');
        }

        const currentTokens = userSnap.data().tokens || 0;
        if (currentTokens < depositTokensRequired) {
          throw new Error(`Insufficient tokens! Needed: ${depositTokensRequired}, Available: ${currentTokens}`);
        }

        // Deduct 100% deposit tokens from host's main Token Wallet
        transaction.update(userRef, {
          tokens: currentTokens - depositTokensRequired,
          updatedAt: new Date().toISOString()
        });

        // Record in wallet_history
        const historyRef = doc(collection(db, 'wallet_history'));
        transaction.set(historyRef, {
          userId: userProfile.userId,
          userName: userProfile.displayName,
          type: 'debit',
          amount: depositTokensRequired,
          balanceAfter: currentTokens - depositTokensRequired,
          description: `Lone Wolf Deposit (100% Prize Pool for #${nextNumber} - ${title.trim()})`,
          matchId: matchId,
          matchNumber: nextNumber,
          createdAt: serverTimestamp()
        });

        // Record in host tokenTransactions
        const userTokenTxRef = doc(collection(db, 'users', userProfile.userId, 'tokenTransactions'));
        transaction.set(userTokenTxRef, {
          type: 'deposit',
          amount: depositTokensRequired,
          balanceAfter: currentTokens - depositTokensRequired,
          matchId: matchId,
          matchNumber: nextNumber,
          matchTitle: title.trim(),
          description: `Lone Wolf 100% Prize Deposit for Match #${nextNumber}`,
          reason: `100% Security Deposit for hosting Lone Wolf #${nextNumber}`,
          createdAt: serverTimestamp()
        });

        // Create Lone Wolf match doc
        const matchRef = doc(db, 'lone_wolf_matches', matchId);
        const matchPayload = {
          id: matchId,
          matchNumber: nextNumber,
          title: title.trim(),
          hostId: userProfile.userId,
          hostName: userProfile.displayName || 'Vortex Host',
          hostEmail: userProfile.email,
          hostPhotoUrl: userProfile.photoURL || null,
          
          gameCategory: 'freefire',
          mode: '1v1',
          weaponRule: weaponRule,
          mapName: mapName,
          roundsFormat: roundsFormat,
          
          entryFee: Number(entryFee) || 0,
          prizePool: parsedPrizePool,
          depositPercentage: 100,
          walletTokens: depositTokensRequired,
          
          player1: null,
          player2: null,
          joinedCount: 0,
          
          matchDate: matchDate,
          matchTime: matchTime,
          time: `${matchDate} at ${matchTime}`,
          
          accessType: accessType,
          accessCode: accessType === 'code' ? accessCode.trim().toUpperCase() : null,
          
          isLocalVenue: isLocalVenue,
          localVenueName: isLocalVenue ? localVenueName.trim() : null,
          localUpazilaDistrict: isLocalVenue ? localUpazilaDistrict.trim() : null,
          
          hasSponsor: sponsorType !== 'none',
          sponsorType: sponsorType,
          sponsorName: sponsorType === 'name' ? sponsorName.trim() : null,
          sponsorLogoUrl: finalSponsorLogoUrl,
          sponsorLinkUrl: sponsorType !== 'none' && sponsorLinkUrl.trim() ? sponsorLinkUrl.trim() : null,
          
          status: 'Registration', // 'Registration' | 'Ongoing' | 'Completed' | 'Cancelled'
          approvalStatus: 'pending',
          isApproved: false,
          
          roomId: null,
          roomPassword: null,
          roomProvidedAt: null,
          
          winnerSlot: null,
          winnerId: null,
          winnerName: null,
          player1Score: 0,
          player2Score: 0,
          resultScreenshotUrl: null,
          prizeDistributed: false,
          
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        transaction.set(matchRef, matchPayload);
      });

      // Update client token state
      setTokens(prev => prev - depositTokensRequired);
      setShowConfirmModal(false);
      onLoneWolfGenerated();
    } catch (err: any) {
      console.error('Error creating lone wolf match:', err);
      setErrorMsg(err?.message || 'Failed to generate Lone Wolf match. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-24 text-slate-100 animate-in fade-in duration-300">
      {/* Top Navigation Header */}
      <div className="flex items-center justify-between border-b border-cyan-500/20 pb-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 bg-slate-900 hover:bg-slate-800 border border-white/10 rounded-xl text-slate-300 hover:text-white transition"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-gradient-to-br from-cyan-500 to-indigo-600 rounded-lg text-black shadow-[0_0_12px_rgba(6,182,212,0.5)]">
                <Swords className="w-4 h-4 text-slate-950 font-black" />
              </span>
              <h2 className="text-lg font-black text-white uppercase tracking-wider font-mono">
                Generate Lone Wolf 1v1
              </h2>
            </div>
            <p className="text-xs text-cyan-300/80 font-mono mt-0.5">
              Free Fire 1vs1 Duel Arena • Free Hosting with 100% Prize Security
            </p>
          </div>
        </div>

        {/* Current User Host Tier Badge */}
        <div className="text-right hidden sm:block font-mono">
          <div className="text-[10px] text-slate-400 uppercase">Host Tier Limit</div>
          <div className="text-xs font-black text-cyan-400 flex items-center justify-end gap-1">
            <Crown className="w-3.5 h-3.5 text-amber-400" />
            <span>Max {maxPrizeLimit} 🪙</span>
          </div>
        </div>
      </div>

      {/* Security Deposit Banner info & Tier Breakdown */}
      <div className="bg-gradient-to-r from-cyan-950/70 via-slate-900 to-indigo-950/70 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-cyan-500/20 rounded-xl border border-cyan-500/40 text-cyan-400 shrink-0">
              <Shield className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-black text-cyan-300 uppercase tracking-wide font-mono">
                Zero Subscription Fee Hosting
              </h4>
              <p className="text-[11.5px] text-slate-300 leading-relaxed">
                Anyone can host a Lone Wolf match! To guarantee fair play and 100% prize safety, the full prize pool (<span className="text-cyan-400 font-bold">100% Deposit</span>) is securely locked from your token wallet upon generation.
              </p>
            </div>
          </div>

          <div className="bg-slate-950/90 border border-cyan-500/30 px-3 py-2 rounded-xl text-right shrink-0">
            <div className="text-[9.5px] text-slate-400 uppercase font-mono">Your Balance</div>
            <div className="text-sm font-black text-yellow-400 font-mono flex items-center justify-end gap-1">
              <Coins className="w-3.5 h-3.5 text-yellow-400" />
              <span>{(Number(tokens) || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Subscription Plans & Maximum Prize Pool Limitations Matrix */}
        <div className="border-t border-white/10 pt-3.5 space-y-2.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Crown className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-white uppercase tracking-wider font-mono">
                Hosting Tiers & Maximum Prize Pool Limits
              </span>
            </div>
            {activeSubTier !== 'apex' && (
              <button
                type="button"
                onClick={() => {
                  setShowSubModal(true);
                  onOpenSubscriptionModal?.();
                }}
                className="self-start sm:self-auto px-3 py-1.5 bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-black text-[11px] uppercase tracking-wider font-mono rounded-xl shadow-[0_0_12px_rgba(245,158,11,0.4)] transition flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5 fill-black text-black" />
                <span>Upgrade Limit to 5,000 🪙</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono">
            {/* Free Tier */}
            <div className={`p-2.5 rounded-xl border transition ${
              activeSubTier === 'none'
                ? 'bg-cyan-500/15 border-cyan-400/60 ring-1 ring-cyan-400/40'
                : 'bg-slate-950/60 border-white/5 opacity-80'
            }`}>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-slate-400 font-bold uppercase">Free Tier</span>
                {activeSubTier === 'none' && (
                  <span className="px-1.5 py-0.2 bg-cyan-500/30 text-cyan-300 text-[8.5px] rounded font-black">CURRENT</span>
                )}
              </div>
              <div className="text-xs font-black text-white">Max 500 🪙</div>
              <div className="text-[9px] text-slate-400 mt-0.5">Free 1v1 Hosting</div>
            </div>

            {/* Monthly Pro */}
            <div 
              onClick={() => {
                setPendingSubPlan('monthly');
                setShowSubModal(true);
              }}
              className={`p-2.5 rounded-xl border transition cursor-pointer hover:border-cyan-400/40 ${
                activeSubTier === 'monthly'
                  ? 'bg-cyan-500/15 border-cyan-400/60 ring-1 ring-cyan-400/40'
                  : 'bg-slate-950/60 border-white/5'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-cyan-400 font-bold uppercase">Monthly Pro</span>
                {activeSubTier === 'monthly' && (
                  <span className="px-1.5 py-0.2 bg-cyan-500/30 text-cyan-300 text-[8.5px] rounded font-black">CURRENT</span>
                )}
              </div>
              <div className="text-xs font-black text-cyan-300">Max 1,000 🪙</div>
              <div className="text-[9px] text-slate-400 mt-0.5">{subscriptionConfig.monthlyFee} Tokens / mo</div>
            </div>

            {/* Yearly Pro */}
            <div 
              onClick={() => {
                setPendingSubPlan('yearly');
                setShowSubModal(true);
              }}
              className={`p-2.5 rounded-xl border transition cursor-pointer hover:border-cyan-400/40 ${
                activeSubTier === 'yearly'
                  ? 'bg-cyan-500/15 border-cyan-400/60 ring-1 ring-cyan-400/40'
                  : 'bg-slate-950/60 border-white/5'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-indigo-400 font-bold uppercase">Yearly Pro</span>
                {activeSubTier === 'yearly' && (
                  <span className="px-1.5 py-0.2 bg-indigo-500/30 text-indigo-300 text-[8.5px] rounded font-black">CURRENT</span>
                )}
              </div>
              <div className="text-xs font-black text-indigo-300">Max 2,000 🪙</div>
              <div className="text-[9px] text-slate-400 mt-0.5">{subscriptionConfig.yearlyFee} Tokens / yr</div>
            </div>

            {/* Apex Pro (Ultimate) */}
            <div 
              onClick={() => {
                setPendingSubPlan('apex');
                setShowSubModal(true);
              }}
              className={`p-2.5 rounded-xl border transition cursor-pointer hover:border-amber-400/60 relative overflow-hidden ${
                activeSubTier === 'apex'
                  ? 'bg-amber-500/20 border-amber-400/80 ring-1 ring-amber-400/50'
                  : 'bg-slate-950/60 border-amber-500/20'
              }`}
            >
              <div className="absolute top-0 right-0 bg-gradient-to-l from-amber-500 to-amber-600 text-black font-black text-[7.5px] px-1.5 py-0.5 rounded-bl">
                ULTIMATE
              </div>
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span className="text-amber-400 font-bold uppercase">Apex Pro</span>
                {activeSubTier === 'apex' && (
                  <span className="px-1.5 py-0.2 bg-amber-500/30 text-amber-300 text-[8.5px] rounded font-black">CURRENT</span>
                )}
              </div>
              <div className="text-xs font-black text-amber-300">Max 5,000 🪙</div>
              <div className="text-[9px] text-amber-400/80 mt-0.5">{subscriptionConfig.apexFee} Tokens / yr</div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Generation Form */}
      <form onSubmit={validateAndOpenModal} className="space-y-6">
        {errorMsg && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Section 1: Match Identity */}
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
          <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest font-mono flex items-center gap-2">
            <Flame className="w-4 h-4 text-cyan-400" />
            <span>1. Match Identity & Settings</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Match Title */}
            <div className="sm:col-span-2 space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300 uppercase font-mono">
                Match Title / Custom Name
              </label>
              <input
                type="text"
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="e.g. Lone Wolf Clash #101 / Sniper Duel"
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 transition"
              />
              <div className="flex flex-wrap gap-1.5 pt-1">
                {['1v1 Sniper King', 'Desert Eagle Showdown', 'Shotgun Master 1v1', 'No Gloo Wall Clash'].map(preset => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setTitle(preset)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/20 transition"
                  >
                    + {preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Match Date */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300 uppercase font-mono flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-cyan-400" /> Match Date
              </label>
              <input
                type="date"
                value={matchDate}
                onChange={e => setMatchDate(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium outline-none focus:border-cyan-500"
              />
            </div>

            {/* Match Time */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300 uppercase font-mono flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-cyan-400" /> Match Time
              </label>
              <input
                type="time"
                value={matchTime}
                onChange={e => setMatchTime(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white font-medium outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Combat Rules & Arena */}
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
          <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest font-mono flex items-center gap-2">
            <Target className="w-4 h-4 text-cyan-400" />
            <span>2. Combat Rules & Map Arena</span>
          </h3>

          {/* Weapon Rule Selector */}
          <div className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-300 uppercase font-mono">
              Weapon Rule Mode
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {WEAPON_RULES.map(rule => (
                <button
                  key={rule.id}
                  type="button"
                  onClick={() => setWeaponRule(rule.label)}
                  className={`p-3 rounded-xl border text-left transition flex items-center gap-3 ${
                    weaponRule === rule.label
                      ? 'bg-cyan-950/80 border-cyan-400 text-white shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                      : 'bg-slate-950/60 border-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <span className="text-lg">{rule.icon}</span>
                  <div>
                    <div className="text-xs font-bold text-slate-200">{rule.label}</div>
                    <div className="text-[10px] text-slate-400 leading-tight">{rule.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            {/* Map Selection */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300 uppercase font-mono">
                Map Arena
              </label>
              <select
                value={mapName}
                onChange={e => setMapName(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none focus:border-cyan-500"
              >
                {MAP_OPTIONS.map(m => (
                  <option key={m.id} value={m.id}>
                    {m.label} ({m.badge})
                  </option>
                ))}
              </select>
            </div>

            {/* Rounds Format */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-bold text-slate-300 uppercase font-mono">
                Match Rounds Format
              </label>
              <select
                value={roundsFormat}
                onChange={e => setRoundsFormat(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none focus:border-cyan-500"
              >
                {ROUNDS_FORMATS.map(rf => (
                  <option key={rf.id} value={rf.id}>
                    {rf.label} - {rf.sub}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Economy & Prize Pool */}
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest font-mono flex items-center gap-2">
              <Coins className="w-4 h-4 text-cyan-400" />
              <span>3. Financial & Prize Structure</span>
            </h3>
            <span className="text-[10px] font-mono font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
              100% Deposit Required
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Prize Pool */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-yellow-400 uppercase font-mono">
                  Prize Pool (Tokens)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">
                  Max: {maxPrizeLimit} 🪙
                </span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={prizePool}
                onChange={e => handleTokenInputChange(e.target.value, setPrizePool)}
                onFocus={e => e.target.select()}
                className="w-full bg-slate-950 border border-yellow-500/30 focus:border-yellow-400 rounded-xl px-3.5 py-2.5 text-sm text-yellow-400 font-bold font-mono outline-none transition"
              />
              <p className="text-[10px] text-slate-400">
                100% of this amount ({parsedPrizePool} 🪙) will be locked as the Winner's Prize.
              </p>
            </div>

            {/* Entry Fee */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="block text-[11px] font-bold text-slate-300 uppercase font-mono">
                  Entry Fee per Player (Tokens)
                </label>
                <span className="text-[10px] text-slate-400 font-mono">0 for Free Entry</span>
              </div>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={entryFee}
                onChange={e => handleTokenInputChange(e.target.value, setEntryFee)}
                onFocus={e => e.target.select()}
                className="w-full bg-slate-950 border border-white/10 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-sm text-white font-bold font-mono outline-none transition"
              />
              <p className="text-[10px] text-slate-400">
                Players pay this fee when joining either TBD 1 or TBD 2.
              </p>
            </div>
          </div>

          {/* Quick preset tokens buttons */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-white/5">
            <span className="text-[10px] text-slate-400 font-mono mr-1">Quick Prize:</span>
            {[50, 100, 200, 300, 500, 1000, 2000, 5000].filter(val => val <= maxPrizeLimit).map(amt => (
              <button
                key={amt}
                type="button"
                onClick={() => setPrizePool(amt)}
                className={`text-[10.5px] font-mono font-bold px-2.5 py-1 rounded-lg border transition ${
                  parsedPrizePool === amt
                    ? 'bg-yellow-500 text-black border-yellow-400 font-black'
                    : 'bg-slate-950 hover:bg-slate-800 text-yellow-400/80 border-white/5'
                }`}
              >
                {amt} 🪙
              </button>
            ))}
          </div>
        </div>

        {/* Section 4: Privacy & Venue Options */}
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
          <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest font-mono flex items-center gap-2">
            <Globe className="w-4 h-4 text-cyan-400" />
            <span>4. Privacy & Access Settings</span>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Access Mode */}
            <div className="space-y-2">
              <label className="block text-[11px] font-bold text-slate-300 uppercase font-mono">
                Match Access
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setAccessType('public')}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 ${
                    accessType === 'public'
                      ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                      : 'bg-slate-950 border-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" /> Public Open
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setAccessType('code');
                    if (!accessCode) generateRandomAccessCode();
                  }}
                  className={`flex-1 py-2.5 rounded-xl border text-xs font-bold font-mono transition flex items-center justify-center gap-1.5 ${
                    accessType === 'code'
                      ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300'
                      : 'bg-slate-950 border-white/5 text-slate-400 hover:border-white/20'
                  }`}
                >
                  <Key className="w-3.5 h-3.5" /> Access Code
                </button>
              </div>
            </div>

            {/* Access Code Input if code selected */}
            {accessType === 'code' && (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-indigo-400 uppercase font-mono">
                    Match Access Code
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomAccessCode}
                    className="text-[10px] text-cyan-400 hover:underline font-mono"
                  >
                    Generate Random
                  </button>
                </div>
                <input
                  type="text"
                  value={accessCode}
                  onChange={e => setAccessCode(e.target.value.toUpperCase())}
                  placeholder="e.g. WOLF99"
                  maxLength={10}
                  className="w-full bg-slate-950 border border-indigo-500/40 rounded-xl px-3.5 py-2.5 text-xs text-indigo-300 font-bold font-mono uppercase tracking-widest outline-none focus:border-indigo-400"
                />
              </div>
            )}
          </div>

          {/* Local Venue Switch */}
          <div className="pt-2 border-t border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Physical / Local Arena Venue (Optional)</span>
                </div>
                <div className="text-[10.5px] text-slate-400">
                  Enable if this 1v1 is hosted at a gaming cafe, club, or local venue.
                </div>
              </div>
              <input
                type="checkbox"
                checked={isLocalVenue}
                onChange={e => setIsLocalVenue(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 rounded cursor-pointer"
              />
            </div>

            {isLocalVenue && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <input
                  type="text"
                  placeholder="Venue Name (e.g. Vortex Gaming Lounge)"
                  value={localVenueName}
                  onChange={e => setLocalVenueName(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
                <input
                  type="text"
                  placeholder="District / Upazila (e.g. Dhanmondi, Dhaka)"
                  value={localUpazilaDistrict}
                  onChange={e => setLocalUpazilaDistrict(e.target.value)}
                  className="bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>
            )}
          </div>
        </div>

        {/* Section 5: Sponsor Banner (Optional) */}
        <div className="bg-slate-900/80 border border-white/10 rounded-2xl p-4 sm:p-5 space-y-4">
          <h3 className="text-xs font-black text-cyan-400 uppercase tracking-widest font-mono flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>5. Sponsored By (Optional)</span>
          </h3>

          <div className="flex gap-2">
            {[
              { id: 'none', label: 'No Sponsor' },
              { id: 'name', label: 'Brand Name' },
              { id: 'logo', label: 'Brand Logo & Link' },
            ].map(st => (
              <button
                key={st.id}
                type="button"
                onClick={() => setSponsorType(st.id as any)}
                className={`flex-1 py-2 rounded-xl border text-xs font-bold font-mono transition ${
                  sponsorType === st.id
                    ? 'bg-cyan-500/20 border-cyan-400 text-cyan-300'
                    : 'bg-slate-950 border-white/5 text-slate-400 hover:border-white/20'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>

          {sponsorType === 'name' && (
            <input
              type="text"
              placeholder="Sponsor Brand Name (e.g. RedBull Esports / Apex Gaming)"
              value={sponsorName}
              onChange={e => setSponsorName(e.target.value)}
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-500"
            />
          )}

          {sponsorType === 'logo' && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {sponsorLogoPreview ? (
                  <div className="flex items-center gap-3 w-full bg-slate-950/80 p-2.5 rounded-2xl border border-cyan-500/40">
                    <div className="relative w-14 h-14 rounded-xl border border-cyan-500/50 overflow-hidden bg-slate-900 shrink-0">
                      <img src={sponsorLogoPreview} alt="Sponsor Logo" className="w-full h-full object-contain p-1" />
                    </div>
                    <div className="flex-1 min-w-0 font-mono">
                      <div className="flex items-center gap-1.5 text-xs text-white font-bold truncate">
                        <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                        <span>Logo Ready</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-2">
                        <span className="text-cyan-300 font-bold">
                          {sponsorLogoSizeKb ? `${sponsorLogoSizeKb} KB` : '≤ 20 KB'}
                        </span>
                        <span className="text-slate-500">•</span>
                        <span className="text-emerald-400">ImgBB + Firebase Backup</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSponsorLogoPreview('');
                        setSponsorLogoUrl('');
                        setSponsorLogoSizeKb(null);
                        setSponsorLogoFile(null);
                      }}
                      className="p-1.5 bg-red-600/20 hover:bg-red-600/40 border border-red-500/40 text-red-400 rounded-xl transition"
                      title="Remove Logo"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <label className="flex-1 border border-dashed border-cyan-500/40 hover:border-cyan-400 bg-slate-950/60 rounded-xl p-3.5 flex flex-col items-center justify-center gap-1.5 cursor-pointer transition text-xs text-cyan-300">
                    <div className="flex items-center gap-2 font-bold font-mono">
                      <Upload className="w-4 h-4 text-cyan-400" />
                      <span>{isCompressingLogo ? 'Compressing to 20 KB...' : 'Select Logo from Device'}</span>
                    </div>
                    <span className="text-[10px] text-slate-400">
                      Auto-compressed to ≤ 20 KB • Uploaded to ImgBB with Firebase Storage backup
                    </span>
                    <input type="file" accept="image/*" onChange={handleSponsorLogoFileChange} className="hidden" />
                  </label>
                )}
              </div>

              <input
                type="url"
                placeholder="Sponsor Target URL (e.g. https://sponsorwebsite.com)"
                value={sponsorLinkUrl}
                onChange={e => setSponsorLinkUrl(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-500 font-mono"
              />
            </div>
          )}
        </div>

        {/* Submit Generate Button */}
        <div className="pt-2">
          <button
            type="submit"
            className="w-full py-3.5 bg-gradient-to-r from-cyan-500 via-sky-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black uppercase tracking-wider font-mono rounded-2xl transition shadow-[0_0_25px_rgba(6,182,212,0.4)] flex items-center justify-center gap-2 text-sm"
          >
            <Swords className="w-5 h-5 text-slate-950" />
            <span>Generate Lone Wolf (Deposit {depositTokensRequired} 🪙)</span>
          </button>
        </div>
      </form>

      {/* Confirmation & Security Deposit Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#070b1a] border border-cyan-500/40 rounded-3xl p-6 max-w-md w-full relative shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-500/20 rounded-xl text-cyan-400">
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                    Confirm Lone Wolf 1v1
                  </h3>
                  <p className="text-[10px] text-cyan-300/80 font-mono">100% Prize Security Deposit</p>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              You are about to generate <span className="font-bold text-white">"{title.trim()}"</span>. To ensure fair and guaranteed payout to the winner, <span className="text-cyan-400 font-bold font-mono">{depositTokensRequired} Tokens</span> (100% of Prize Pool) will be deducted from your Token Wallet and locked into the match vault.
            </p>

            {/* Summary Box */}
            <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-3.5 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Match Mode:</span>
                <span className="text-white font-bold">1v1 Solo Duel</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Weapon Rule:</span>
                <span className="text-cyan-300 font-bold">{weaponRule}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Arena / Rounds:</span>
                <span className="text-slate-200">{mapName} ({roundsFormat.split('(')[0]})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Entry Fee:</span>
                <span className="text-white font-bold">{entryFee || 0} Tokens</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-2">
                <span className="text-yellow-400 font-bold">100% Prize Deposit:</span>
                <span className="text-yellow-400 font-black">{depositTokensRequired} Tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Remaining Balance:</span>
                <span className="text-cyan-400 font-bold">{((Number(tokens) || 0) - depositTokensRequired).toFixed(2)} Tokens</span>
              </div>
            </div>

            <div className="p-2.5 bg-cyan-950/40 border border-cyan-500/20 rounded-xl text-[10.5px] text-cyan-300 leading-tight">
              ⚡ Note: When the match is completed and approved, the full {depositTokensRequired} tokens will be transferred directly to the winner's wallet.
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                disabled={isGenerating}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold font-mono transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmGenerate}
                disabled={isGenerating}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider font-mono rounded-xl transition shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isGenerating ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                    <span>Generating...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-black font-black" />
                    <span>Confirm & Lock 🪙</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Pro Host Subscription Selection Modal */}
      {showSubModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-start justify-center pt-8 sm:pt-14 pb-12 px-4 overflow-y-auto">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-[#090d22] border border-cyan-500/30 rounded-3xl p-6 max-w-lg w-full relative max-h-[85vh] overflow-y-auto shadow-2xl space-y-5"
          >
            <button 
              onClick={() => setShowSubModal(false)} 
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1 pt-1">
              <div className="inline-flex p-2 bg-amber-500/20 border border-amber-500/30 rounded-2xl text-amber-400 mb-1">
                <Crown className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-white uppercase tracking-wider font-mono">
                Upgrade Pro Host Subscription
              </h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto">
                Unlock higher 1v1 Lone Wolf prize pools up to <span className="text-amber-400 font-bold">5,000 Tokens</span> & squad league hosting privileges.
              </p>
            </div>

            {/* Current Balance Indicator */}
            <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-3 flex items-center justify-between font-mono text-xs">
              <span className="text-slate-400">Your Current Balance:</span>
              <span className="text-yellow-400 font-bold flex items-center gap-1">
                <Coins className="w-3.5 h-3.5 text-yellow-400" />
                <span>{(Number(tokens) || 0).toFixed(2)} Tokens</span>
              </span>
            </div>

            {/* Subscription Plans List */}
            <div className="space-y-3">
              {/* Monthly Plan */}
              <div 
                className={`p-4 border rounded-2xl transition cursor-pointer relative ${
                  activeSubTier === 'monthly'
                    ? 'border-cyan-400 bg-cyan-500/15'
                    : 'border-cyan-500/30 bg-cyan-500/5 hover:bg-cyan-500/10'
                }`}
                onClick={() => {
                  setPendingSubPlan('monthly');
                  setSubError('');
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-white font-black text-base font-mono">Monthly Pro</h4>
                    <p className="text-cyan-400 font-black text-xl font-mono mt-0.5">
                      {subscriptionConfig.monthlyFee} <span className="text-xs font-normal text-slate-400">Tokens / mo</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-cyan-500/20 border border-cyan-400/40 text-cyan-300 text-[11px] font-black rounded-lg font-mono">
                      Max 1,000 🪙 1v1 Prize
                    </span>
                  </div>
                </div>
                <ul className="text-xs text-slate-300 space-y-1 pt-1 border-t border-white/5">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Lone Wolf 1v1 Prize Pool Limit: <strong>1,000 Tokens</strong></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>Generate up to 16 Squad Leagues</span>
                  </li>
                </ul>
              </div>

              {/* Yearly Plan */}
              <div 
                className={`p-4 border rounded-2xl transition cursor-pointer relative overflow-hidden ${
                  activeSubTier === 'yearly'
                    ? 'border-indigo-400 bg-indigo-500/15'
                    : 'border-indigo-500/30 bg-indigo-500/5 hover:bg-indigo-500/10'
                }`}
                onClick={() => {
                  setPendingSubPlan('yearly');
                  setSubError('');
                }}
              >
                <div className="absolute top-0 right-0 bg-indigo-600 text-white text-[9px] font-black font-mono px-2 py-0.5 rounded-bl-lg tracking-wider">
                  POPULAR
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-white font-black text-base font-mono">Yearly Pro</h4>
                    <p className="text-indigo-400 font-black text-xl font-mono mt-0.5">
                      {subscriptionConfig.yearlyFee} <span className="text-xs font-normal text-slate-400">Tokens / yr</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-indigo-500/20 border border-indigo-400/40 text-indigo-300 text-[11px] font-black rounded-lg font-mono">
                      Max 2,000 🪙 1v1 Prize
                    </span>
                  </div>
                </div>
                <ul className="text-xs text-slate-300 space-y-1 pt-1 border-t border-white/5">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Lone Wolf 1v1 Prize Pool Limit: <strong>2,000 Tokens</strong></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    <span>Generate up to 32 Squad Leagues + Priority Support</span>
                  </li>
                </ul>
              </div>

              {/* Apex Plan (Ultimate) */}
              <div 
                className={`p-4 border rounded-2xl transition cursor-pointer relative overflow-hidden ${
                  activeSubTier === 'apex'
                    ? 'border-amber-400 bg-amber-500/20 ring-1 ring-amber-400/40'
                    : 'border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/15'
                }`}
                onClick={() => {
                  setPendingSubPlan('apex');
                  setSubError('');
                }}
              >
                <div className="absolute top-0 right-0 bg-gradient-to-r from-amber-500 to-amber-600 text-black text-[9px] font-black font-mono px-2 py-0.5 rounded-bl-lg tracking-wider">
                  MAX LIMIT (5000 🪙)
                </div>
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h4 className="text-white font-black text-base font-mono flex items-center gap-1.5">
                      <span>Apex Pro</span>
                      <Crown className="w-4 h-4 text-amber-400" />
                    </h4>
                    <p className="text-amber-400 font-black text-xl font-mono mt-0.5">
                      {subscriptionConfig.apexFee} <span className="text-xs font-normal text-slate-400">Tokens / yr</span>
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 bg-amber-500/30 border border-amber-400 text-amber-300 text-[11px] font-black rounded-lg font-mono shadow-[0_0_10px_rgba(245,158,11,0.3)]">
                      Max 5,000 🪙 1v1 Prize
                    </span>
                  </div>
                </div>
                <ul className="text-xs text-slate-300 space-y-1 pt-1 border-t border-white/5">
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Maximum Lone Wolf 1v1 Prize Pool Limit: <strong>5,000 Tokens</strong></span>
                  </li>
                  <li className="flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>Generate up to 64 Squad Mega Leagues + Apex Perks</span>
                  </li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Subscription Confirmation Modal */}
      {pendingSubPlan && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-[#090d22] border border-cyan-500/30 rounded-3xl p-6 max-w-sm w-full relative shadow-2xl space-y-4 font-mono"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-black text-white uppercase tracking-wider">
                  Confirm Subscription
                </h3>
              </div>
              <button 
                onClick={() => setPendingSubPlan(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs bg-slate-950/80 p-3.5 rounded-2xl border border-white/5">
              <div className="flex justify-between">
                <span className="text-slate-400">Selected Plan:</span>
                <span className="text-white font-bold uppercase">{pendingSubPlan} Pro</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">New Lone Wolf Limit:</span>
                <span className="text-amber-400 font-bold">
                  Max {pendingSubPlan === 'apex' ? '5,000' : pendingSubPlan === 'yearly' ? '2,000' : '1,000'} Tokens
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Balance:</span>
                <span className="text-yellow-400 font-bold">{(Number(tokens) || 0).toFixed(2)} Tokens</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-2">
                <span className="text-cyan-400 font-bold">Subscription Cost:</span>
                <span className="text-cyan-300 font-black text-sm">
                  {pendingSubPlan === 'apex' ? subscriptionConfig.apexFee : pendingSubPlan === 'yearly' ? subscriptionConfig.yearlyFee : subscriptionConfig.monthlyFee} Tokens
                </span>
              </div>
            </div>

            {tokens < (pendingSubPlan === 'apex' ? subscriptionConfig.apexFee : pendingSubPlan === 'yearly' ? subscriptionConfig.yearlyFee : subscriptionConfig.monthlyFee) && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] rounded-xl font-sans flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>Insufficient token wallet balance. Please add more tokens first.</span>
              </div>
            )}

            {subError && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 text-[11px] rounded-xl font-sans flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{subError}</span>
              </div>
            )}

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => setPendingSubPlan(null)}
                disabled={isSubscribing}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSubscribe(pendingSubPlan)}
                disabled={
                  isSubscribing || 
                  tokens < (pendingSubPlan === 'apex' ? subscriptionConfig.apexFee : pendingSubPlan === 'yearly' ? subscriptionConfig.yearlyFee : subscriptionConfig.monthlyFee)
                }
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-cyan-500 hover:from-amber-400 hover:to-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-[0_0_12px_rgba(245,158,11,0.4)] disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isSubscribing ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                    <span>Processing...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-black font-black" />
                    <span>Confirm</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Subscription Success Modal */}
      {showSubSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div 
            initial={{ scale: 0.95, opacity: 0 }} 
            animate={{ scale: 1, opacity: 1 }} 
            className="bg-[#090d22] border border-green-500/40 rounded-3xl p-6 max-w-sm w-full relative shadow-2xl text-center space-y-4 font-mono"
          >
            <div className="w-12 h-12 rounded-full bg-green-500/20 border border-green-500/40 flex items-center justify-center mx-auto text-green-400 text-2xl font-bold">
              ✓
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-black text-white uppercase tracking-wider">
                Subscription Activated!
              </h3>
              <p className="text-slate-300 text-xs font-sans leading-relaxed">
                Your Pro Host plan has been activated successfully. Your Lone Wolf 1v1 prize pool limit is now <span className="text-amber-400 font-bold">{maxPrizeLimit} Tokens</span>!
              </p>
            </div>
            <button
              onClick={() => setShowSubSuccessModal(false)}
              className="w-full py-2.5 bg-gradient-to-r from-green-500 to-emerald-600 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-[0_0_12px_rgba(34,197,94,0.4)]"
            >
              Continue Hosting
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
}
