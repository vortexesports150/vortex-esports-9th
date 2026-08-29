import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Check, 
  AlertTriangle, 
  Shield, 
  Coins, 
  Users, 
  Plus, 
  Upload, 
  Calendar, 
  Clock, 
  Zap, 
  MapPin, 
  X, 
  Crown,
  Sparkles,
  Link as LinkIcon,
  Globe,
  Award,
  Trophy,
  Flame,
  Swords,
  Percent,
  CheckCircle,
  Key,
  Mail,
  Image as ImageIcon
} from 'lucide-react';
import { db } from '../lib/firebase';
import { compressAndUploadLogoToFirebase, compressLogoToMax20Kb } from '../lib/imgbb';
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
import { BANGLADESH_DIVISIONS, ALL_BANGLADESH_DISTRICTS, BANGLADESH_UPAZILAS_BY_DISTRICT } from '../data/bangladeshData';

interface GenerateTournamentViewProps {
  userProfile: UserProfile | null;
  tokens: number;
  setTokens: (v: number | ((prev: number) => number)) => void;
  onBack: () => void;
  onTournamentGenerated: () => void;
  onOpenSubscriptionModal: () => void;
}

export function GenerateTournamentView({
  userProfile,
  tokens,
  setTokens,
  onBack,
  onTournamentGenerated,
  onOpenSubscriptionModal
}: GenerateTournamentViewProps) {
  // Form State
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'solo' | 'squad'>('solo');
  const [mapName, setMapName] = useState('Bermuda');

  // Privacy & Access Type
  const [accessType, setAccessType] = useState<'public' | 'code' | 'invite'>('public');
  const [accessCode, setAccessCode] = useState<string>('');

  // Local / Regional Venue Fields
  const [isLocalVenue, setIsLocalVenue] = useState<boolean>(false);
  const [localVenueName, setLocalVenueName] = useState<string>('');
  const [localUpazilaDistrict, setLocalUpazilaDistrict] = useState<string>('');

  const generateRandomAccessCode = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setAccessCode(code);
  };
  
  // Capacity: Solo players or Squad count
  const [maxPlayers, setMaxPlayers] = useState<number>(32);
  const [maxSquads, setMaxSquads] = useState<number>(8);

  // Economic Fields
  const [entryFee, setEntryFee] = useState<number | ''>(50);
  const [booyahPrize, setBooyahPrize] = useState<number | ''>(1000);
  const [runnerUpPrize, setRunnerUpPrize] = useState<number | ''>(500);
  const [perKill, setPerKill] = useState<number | ''>(10);

  // Sanitizer helper for token inputs to prevent "012" leading zero issues and allow empty state when cleared
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

  const handleTokenInputFocus = (val: number | '', setter: (v: number | '') => void) => {
    if (val === 0) {
      setter('');
    }
  };

  const handleTokenInputBlur = (val: number | '', setter: (v: number | '') => void) => {
    if (val === '' || val === undefined || val === null || isNaN(Number(val))) {
      setter(0);
    }
  };
  
  // Derived total players and total prize pool
  const totalPlayersCount = mode === 'solo' ? (Number(maxPlayers) || 0) : (Number(maxSquads) || 0) * 4;
  const perKillPrizeFund = mode === 'solo' ? (Number(perKill) || 0) * totalPlayersCount : 0;
  const fixedPrizes = (Number(booyahPrize) || 0) + (Number(runnerUpPrize) || 0);
  const prizePool = perKillPrizeFund + fixedPrizes;
  
  // Deposit Percentage (10% min, incrementable by 10% steps up to 100%)
  const [depositPercentage, setDepositPercentage] = useState<number>(10);

  // Sponsor Fields
  const [sponsorType, setSponsorType] = useState<'none' | 'name' | 'logo'>('none');
  const [sponsorName, setSponsorName] = useState<string>('');
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState<string>('');
  const [sponsorLinkUrl, setSponsorLinkUrl] = useState<string>('');
  const [includeSponsorPhoto, setIncludeSponsorPhoto] = useState<boolean>(false);

  // File Upload State for Sponsor Logo
  const [sponsorLogoFile, setSponsorLogoFile] = useState<File | null>(null);
  const [sponsorLogoPreview, setSponsorLogoPreview] = useState<string>('');
  const [sponsorLogoSizeKb, setSponsorLogoSizeKb] = useState<number | null>(null);
  const [isCompressingLogo, setIsCompressingLogo] = useState<boolean>(false);
  const [showDepositConfirmModal, setShowDepositConfirmModal] = useState(false);

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
    } catch (err) {
      console.error("Logo compression failed", err);
    } finally {
      setIsCompressingLogo(false);
    }
  };

  const handleClearSponsorLogo = () => {
    setSponsorLogoFile(null);
    setSponsorLogoPreview('');
    setSponsorLogoSizeKb(null);
    setSponsorLogoUrl('');
  };

  // Geographical Restrictions & Representation Rules
  const [locationType, setLocationType] = useState<'all_bangladesh' | 'specific_division' | 'specific_district' | 'specific_upazila'>('all_bangladesh');
  const [selectedDivision, setSelectedDivision] = useState<string>('');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('');
  const [selectedUpazila, setSelectedUpazila] = useState<string>('');
  
  const [representationRule, setRepresentationRule] = useState<'any' | 'one_squad_per_upazila' | 'one_squad_per_district' | 'one_squad_per_division'>('any');

  // Date & Time
  const todayStr = new Date().toISOString().split('T')[0];
  const [matchDate, setMatchDate] = useState<string>(todayStr);
  const [matchTime, setMatchTime] = useState<string>('20:00');

  // UI / Action State
  const [isGenerating, setIsGenerating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const errorRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (errorMsg) {
      // Small timeout ensures the element has fully rendered in the DOM before scrolling
      const timer = setTimeout(() => {
        errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 50);
      return () => clearTimeout(timer);
    }
  }, [errorMsg]);

  // Subscription Status Helper
  const sub = userProfile?.proHostSubscription;
  const isSubActive = sub && sub.type !== 'none' && sub.expiresAt && new Date(sub.expiresAt) > new Date();
  const subType = isSubActive ? sub.type : 'none';
  const isApexSub = subType === 'apex';

  // Calculated Deposit required
  const depositTokensRequired = Math.ceil((perKillPrizeFund * depositPercentage) / 100) + fixedPrizes;

  // Handle Deposit Increment (+10%)
  const handleIncreaseDeposit = () => {
    setDepositPercentage(prev => Math.min(100, prev + 10));
  };

  const handleDecreaseDeposit = () => {
    setDepositPercentage(prev => Math.max(10, prev - 10));
  };

  // Submit Handler
  const handleGenerateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!userProfile) {
      setErrorMsg('User profile not loaded. Please try again.');
      return;
    }

    // 1. Subscription check
    const isFree4Squad = mode === 'squad' && maxSquads === 4;
    if (!isFree4Squad && !isSubActive) {
      setErrorMsg('A Pro Host subscription is required to generate tournaments.');
      onOpenSubscriptionModal();
      return;
    }

    // Capacity requirement vs Subscription Level check
    const reqCapacity = mode === 'solo' ? maxPlayers : maxSquads * 4;
    if (!isFree4Squad && reqCapacity > 32 && !isApexSub) {
      setErrorMsg('Generating a 48-Player / 12-Squad tournament requires an Ultimate (Apex) subscription. Your active subscription permits up to 32 players (8 squads). Please upgrade your subscription or choose 32 players.');
      return;
    }

    // 2. Title check
    if (!title.trim()) {
      setErrorMsg('Please enter a tournament title.');
      return;
    }

    // 2a. Local Venue validation check
    if (isLocalVenue) {
      if (!localVenueName.trim()) {
        setErrorMsg('Please enter the school, bazar, village, or area name for this local tournament.');
        return;
      }
      if (!localUpazilaDistrict.trim()) {
        setErrorMsg('Please enter the Upazila & District name for this local tournament.');
        return;
      }
    }

    // 2b. Access Code check
    if (accessType === 'code' && !accessCode.trim()) {
      setErrorMsg('Please enter or generate an access code for code-restricted tournaments.');
      return;
    }

    // 3. Deposit & Tokens check
    if (tokens < depositTokensRequired) {
      setErrorMsg(`Insufficient token balance in main account. You need at least ${depositTokensRequired} tokens for a ${depositPercentage}% deposit on a ${prizePool} token prize pool.`);
      return;
    }

    setShowDepositConfirmModal(true);
  };

  const confirmGeneration = async () => {
    setShowDepositConfirmModal(false);
    setIsGenerating(true);
    try {
      // 0. Upload sponsor logo if present (either sponsorType === 'logo' or sponsorType === 'name' with includeSponsorPhoto)
      let finalSponsorLogoUrl = (sponsorType === 'logo' || (sponsorType === 'name' && includeSponsorPhoto)) ? sponsorLogoUrl.trim() : null;
      if ((sponsorType === 'logo' || (sponsorType === 'name' && includeSponsorPhoto)) && sponsorLogoFile) {
        try {
          const uploadRes = await compressAndUploadLogoToFirebase(sponsorLogoFile, 'sponsor_logo');
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

      // Determine Tournament Serial Number by getting count of existing tournaments
      const colRef = collection(db, 'tournaments_freefire');
      const q = query(colRef, orderBy('createdAt', 'desc'), limit(1));
      const snap = await getDocs(q);
      
      let nextNumber = 101;
      if (!snap.empty) {
        const lastData = snap.docs[0].data();
        if (lastData.tournamentNumber && typeof lastData.tournamentNumber === 'number') {
          nextNumber = lastData.tournamentNumber + 1;
        } else {
          nextNumber = snap.size + 101;
        }
      }

      const tourneyId = `TRN-${Math.floor(100000 + Math.random() * 900000)}`;

      // Execute Firestore Transaction to deduct deposit tokens and create tournament doc
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

        // Deduct tokens from main wallet
        transaction.update(userRef, {
          tokens: currentTokens - depositTokensRequired,
          updatedAt: new Date().toISOString()
        });

        // Add to global wallet history
        const historyRef = doc(collection(db, 'wallet_history'));
        transaction.set(historyRef, {
          userId: userProfile.userId,
          userName: userProfile.displayName,
          type: 'debit',
          amount: depositTokensRequired,
          balanceAfter: currentTokens - depositTokensRequired,
          description: `Tournament Deposit (${depositPercentage}% for TRN #${nextNumber})`,
          tournamentId: tourneyId,
          tournamentNumber: nextNumber,
          createdAt: serverTimestamp()
        });

        // Add to host personal tokenTransactions
        const userTokenTxRef = doc(collection(db, 'users', userProfile.userId, 'tokenTransactions'));
        transaction.set(userTokenTxRef, {
          type: 'deposit',
          amount: depositTokensRequired,
          balanceAfter: currentTokens - depositTokensRequired,
          tournamentId: tourneyId,
          tournamentNumber: nextNumber,
          tournamentTitle: title.trim(),
          description: `Tournament Creation Deposit (${depositPercentage}% for TRN #${nextNumber})`,
          reason: `Deposit for creating tournament #${nextNumber} (${title.trim()})`,
          createdAt: serverTimestamp()
        });

        // Create Tournament document
        const tourneyRef = doc(db, 'tournaments_freefire', tourneyId);
        const tourneyPayload: any = {
          id: tourneyId,
          tournamentNumber: nextNumber,
          title: title.trim(),
          hostId: userProfile.userId,
          hostName: userProfile.displayName,
          hostEmail: userProfile.email,
          hostPhotoUrl: userProfile.photoURL || null,
          hostStarRating: 5.0,
          gameCategory: 'freefire',
          mode: mode, // 'solo' or 'squad'
          maxPlayers: mode === 'solo' ? (Number(maxPlayers) || 12) : ((Number(maxSquads) || 8) * 4),
          maxSquads: mode === 'squad' ? (Number(maxSquads) || 8) : null,
          entryFee: Number(entryFee) || 0,
          prizePool: Number(prizePool) || 0,
          booyahPrize: Number(booyahPrize) || 0,
          runnerUpPrize: Number(runnerUpPrize) || 0,
          perKill: mode === 'solo' ? (Number(perKill) || 0) : 0,
          depositPercentage: Number(depositPercentage),
          walletTokens: depositTokensRequired,
          
          // Sponsor info
          hasSponsor: sponsorType !== 'none',
          sponsorType: sponsorType,
          sponsorName: sponsorType === 'name' ? sponsorName.trim() : null,
          sponsorLogoUrl: finalSponsorLogoUrl || null,
          sponsorLinkUrl: sponsorType !== 'none' && sponsorLinkUrl.trim() ? sponsorLinkUrl.trim() : null,

          // Location Restrictions
          locationRestrictionType: locationType,
          allowedDivision: locationType !== 'all_bangladesh' ? selectedDivision : null,
          allowedDistrict: (locationType === 'specific_district' || locationType === 'specific_upazila') ? selectedDistrict : null,
          allowedUpazila: locationType === 'specific_upazila' ? selectedUpazila : null,
          representationRule: representationRule,

          // Time & Details
          matchDate: matchDate,
          matchTime: matchTime,
          time: `${matchDate} at ${matchTime}`,
          map: mapName,

          // Access Type & Privacy
          accessType: accessType,
          accessCode: accessType === 'code' ? accessCode.trim().toUpperCase() : null,
          invitedEmails: [],

          // Local / Regional Venue
          isLocalVenue: isLocalVenue,
          localVenueName: isLocalVenue ? localVenueName.trim() : null,
          localUpazilaDistrict: isLocalVenue ? localUpazilaDistrict.trim() : null,

          status: 'Pending',
          joinedCount: 0,
          joinedPlayers: [],
          joinedSquads: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        transaction.set(tourneyRef, tourneyPayload);
      });

      // Update local token state
      setTokens(prev => prev - depositTokensRequired);

      onTournamentGenerated();
    } catch (err: any) {
      console.error('Error generating tournament:', err);
      setErrorMsg(err?.message || 'Failed to generate tournament. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-24 text-slate-100">
      {showDepositConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80">
          <div className="bg-slate-900 border border-cyan-500/30 rounded-2xl p-6 max-w-sm w-full space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-400" />
              Confirm Tournament Deposit
            </h3>
            <p className="text-xs text-slate-300">
              A deposit of <span className="font-bold text-amber-400">🪙 {depositTokensRequired}</span> {mode === 'solo' ? `(100% of Fixed Prizes + ${depositPercentage}% of Per-Kill Fund)` : '(100% of Winner and Runner-up Prizes)'} will be transferred from your main wallet to the tournament wallet.
            </p>
            <p className="text-xs text-slate-400">
              After confirmation, the tournament will be generated and sent for admin review.
            </p>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDepositConfirmModal(false)}
                className="flex-1 px-4 py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-xl hover:bg-slate-700 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmGeneration}
                className="flex-1 px-4 py-2 bg-cyan-600 text-white font-bold text-xs rounded-xl hover:bg-cyan-500 transition-colors"
              >
                Confirm & Generate
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Top Navigation Bar */}
      <div className="flex items-center justify-between bg-slate-900/80 border border-cyan-500/30 p-4 rounded-2xl backdrop-blur-md shadow-[0_0_20px_rgba(6,182,212,0.1)]">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4 text-cyan-400" />
          Back to Dashboard
        </button>

        <div className="flex items-center gap-2">
          <Flame className="w-5 h-5 text-cyan-400 animate-pulse" />
          <h2 className="text-base font-black text-white uppercase tracking-wider font-mono">
            Generate Global Tournament
          </h2>
        </div>

        <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-cyan-500/30">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="text-xs font-black font-mono text-amber-300">
            🪙 {typeof tokens === 'number' ? tokens.toFixed(2) : Number(tokens || 0).toFixed(2)}
          </span>
        </div>
      </div>

      {/* Error Alert if any */}
      {errorMsg && (
        <motion.div 
          ref={errorRef}
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-rose-950/80 border border-rose-500/50 p-4 rounded-2xl flex items-start gap-3 shadow-[0_0_15px_rgba(244,63,94,0.2)]"
        >
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wider font-mono">Attention Required</h4>
            <p className="text-xs text-rose-200 mt-1 leading-relaxed">{errorMsg}</p>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-white p-1">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Main Generation Form */}
      <form onSubmit={handleGenerateSubmit} className="space-y-6">
        {/* Section 1: Basic Information */}
        <div className="bg-slate-900/80 border border-cyan-500/20 p-5 rounded-2xl space-y-4 shadow-lg">
          <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-3">
            <Swords className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-black text-cyan-300 uppercase tracking-wider font-mono">
              1. Basic Tournament Details
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block font-mono">
                  Tournament Name / Title <span className="text-rose-400">*</span>
                </label>
                <span className={`text-[10px] font-mono font-bold ${30 - title.length < 5 ? 'text-amber-400' : 'text-slate-400'}`}>
                  {30 - title.length} characters left ({title.length}/30)
                </span>
              </div>
              <input
                type="text"
                maxLength={30}
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, 30))}
                placeholder="e.g. Vortex Battle Royale #1"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all font-sans"
                required
              />
            </div>

            {/* Map Selection */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1 font-mono">
                Map Name
              </label>
              <select
                value={mapName}
                onChange={(e) => setMapName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all font-sans"
              >
                <option value="Bermuda">Bermuda</option>
                <option value="Purgatory">Purgatory</option>
                <option value="Kalahari">Kalahari</option>
                <option value="Alpine">Alpine</option>
                <option value="Nexterra">Nexterra</option>
                <option value="All Maps">All Maps (Random)</option>
              </select>
            </div>
          </div>

          {/* Local / Regional Venue Checkmark Option */}
          <div className="pt-3 border-t border-slate-800/80">
            <label
              onClick={() => setIsLocalVenue(!isLocalVenue)}
              className={`p-3 rounded-xl border flex items-center gap-3 cursor-pointer transition-all ${
                isLocalVenue
                  ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className={`w-5 h-5 rounded border flex items-center justify-center shrink-0 transition-colors ${
                isLocalVenue ? 'bg-cyan-500 border-cyan-400 text-slate-950 font-black' : 'border-slate-700 bg-slate-900'
              }`}>
                {isLocalVenue && <Check className="w-3.5 h-3.5 stroke-[3]" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300 uppercase">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>Is this for a specific School / Village / Bazar / Town / Area?</span>
                </div>
                <p className="text-[10px] text-slate-400 font-sans leading-tight mt-0.5">
                  Enable this to display the venue name and upazila/district address below the tournament title.
                </p>
              </div>
            </label>

            {isLocalVenue && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3 p-3.5 bg-cyan-950/30 border border-cyan-500/40 rounded-xl space-y-3"
              >
                <div>
                  <label className="text-[11px] font-mono font-bold text-cyan-300 uppercase block mb-1">
                    1. School / College / Bazar / Village / Area Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={localVenueName}
                    onChange={(e) => setLocalVenueName(e.target.value)}
                    placeholder="e.g. Dhaka College / Mirpur 10 Bazar / Sonapur Village"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-sans"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-mono font-bold text-cyan-300 uppercase block mb-1">
                    2. Upazila & District Name <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={localUpazilaDistrict}
                    onChange={(e) => setLocalUpazilaDistrict(e.target.value)}
                    placeholder="e.g. Sadar, Feni or Mirpur, Dhaka"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-sans"
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span>These address details will be displayed under the tournament title on tournament cards.</span>
                </p>
              </motion.div>
            )}
          </div>

          {/* Tournament Privacy / Access Type */}
          <div className="pt-2 border-t border-slate-800/80">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2 font-mono flex items-center justify-between">
              <span>Tournament Access Type / Privacy</span>
              <span className="text-[10px] text-cyan-400 font-normal lowercase">
                (controls how players join this tournament)
              </span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mb-3">
              {/* Public */}
              <button
                type="button"
                onClick={() => setAccessType('public')}
                className={`p-3 rounded-xl border flex flex-col gap-1 transition-all text-left cursor-pointer ${
                  accessType === 'public'
                    ? 'bg-cyan-950/60 border-cyan-500 text-white shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-mono font-bold text-xs uppercase text-cyan-400">
                  <Globe className="w-3.5 h-3.5 shrink-0" />
                  <span>Public</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Open to all eligible players & squads to join directly.
                </p>
              </button>

              {/* Access Code */}
              <button
                type="button"
                onClick={() => {
                  setAccessType('code');
                  if (!accessCode) generateRandomAccessCode();
                }}
                className={`p-3 rounded-xl border flex flex-col gap-1 transition-all text-left cursor-pointer ${
                  accessType === 'code'
                    ? 'bg-amber-950/50 border-amber-500 text-white shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-mono font-bold text-xs uppercase text-amber-400">
                  <Key className="w-3.5 h-3.5 shrink-0" />
                  <span>Access Code</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Protected by a secret access code / PIN entered at join time.
                </p>
              </button>

              {/* Invite Only */}
              <button
                type="button"
                onClick={() => setAccessType('invite')}
                className={`p-3 rounded-xl border flex flex-col gap-1 transition-all text-left cursor-pointer ${
                  accessType === 'invite'
                    ? 'bg-purple-950/50 border-purple-500 text-white shadow-[0_0_12px_rgba(168,85,247,0.25)]'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 font-mono font-bold text-xs uppercase text-purple-400">
                  <Mail className="w-3.5 h-3.5 shrink-0" />
                  <span>Invite Only</span>
                </div>
                <p className="text-[10px] text-slate-400 leading-tight">
                  Host invites specific PlayVear IDs from tournament menu.
                </p>
              </button>
            </div>

            {/* Access Code Input if accessType === 'code' */}
            {accessType === 'code' && (
              <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[10.5px] font-mono font-bold text-amber-300 uppercase block">
                    Set Tournament Access Code / PIN
                  </label>
                  <button
                    type="button"
                    onClick={generateRandomAccessCode}
                    className="text-[10px] font-mono font-bold text-amber-400 hover:text-amber-200 underline cursor-pointer"
                  >
                    Auto-Generate Random Code
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={accessCode}
                    onChange={(e) => setAccessCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                    placeholder="e.g. VX8492"
                    maxLength={10}
                    className="flex-1 bg-slate-950 border border-amber-500/50 focus:border-amber-400 rounded-lg px-3 py-2 text-xs font-mono font-black tracking-widest text-amber-300 uppercase focus:outline-none"
                    required
                  />
                </div>
                <p className="text-[10px] text-slate-400 font-mono">
                  Players or Squad Captains will need to enter this code when joining the tournament.
                </p>
              </div>
            )}

            {accessType === 'invite' && (
              <div className="bg-purple-950/20 border border-purple-500/30 rounded-xl p-2.5 text-[11px] font-mono text-purple-200 flex items-center gap-2">
                <Mail className="w-4 h-4 text-purple-400 shrink-0" />
                <span>
                  After generating, click the 3-dot menu on the tournament card to add invited PlayVear IDs.
                </span>
              </div>
            )}
          </div>

          {/* Mode & Capacity Selection */}
          <div className="pt-2">
            <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2 font-mono">
              Battle Royale Match Mode & Custom Lobby Capacity
            </label>

            <div className="grid grid-cols-2 gap-3 mb-4">
              <button
                type="button"
                onClick={() => setMode('solo')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  mode === 'solo' 
                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)] font-bold' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Users className="w-4 h-4 text-cyan-400" />
                <span className="text-xs uppercase font-mono">Solo Match</span>
              </button>

              <button
                type="button"
                onClick={() => setMode('squad')}
                className={`p-3 rounded-xl border flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  mode === 'squad' 
                    ? 'bg-cyan-950/60 border-cyan-500 text-cyan-300 shadow-[0_0_12px_rgba(6,182,212,0.25)] font-bold' 
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Shield className="w-4 h-4 text-cyan-400" />
                <span className="text-xs uppercase font-mono">Squad Match (4 Players/Team)</span>
              </button>
            </div>

            {/* Capacity Dropdown or Radio Pills */}
            {mode === 'solo' ? (
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1.5">
                  Select Custom Lobby Player Capacity (Solo):
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                  {[12, 20, 24, 30, 32, 48].map((count) => {
                    const isApexOnly = count > 32;
                    return (
                      <button
                        type="button"
                        key={count}
                        onClick={() => setMaxPlayers(count)}
                        className={`p-2.5 rounded-xl border text-xs font-bold font-mono transition-all relative cursor-pointer ${
                          maxPlayers === count
                            ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                            : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        {count} Players
                        {isApexOnly && (
                          <span className="block text-[8px] text-amber-400 uppercase tracking-tighter">
                            Ultimate Only
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <label className="text-[10px] text-slate-400 font-mono uppercase block mb-1.5">
                  Select Squad Count (Custom Lobby Capacity):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { squads: 4, players: 16, label: '4 Squads (16 Players)', apexOnly: false, subFree: true },
                    { squads: 8, players: 32, label: '8 Squads (32 Players)', apexOnly: false },
                    { squads: 12, players: 48, label: '12 Squads (48 Players)', apexOnly: true }
                  ].map((opt) => (
                    <button
                      type="button"
                      key={opt.squads}
                      onClick={() => setMaxSquads(opt.squads)}
                      className={`p-3 rounded-xl border text-xs font-bold font-mono transition-all text-left relative cursor-pointer ${
                        maxSquads === opt.squads
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-black shadow-[0_0_10px_rgba(6,182,212,0.4)]'
                          : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                      }`}
                    >
                      <div>{opt.label}</div>
                      {opt.subFree && (
                        <div className="text-[9px] text-cyan-400 font-bold uppercase mt-0.5">
                          No Subscription Needed
                        </div>
                      )}
                      {opt.apexOnly && (
                        <div className="text-[9px] text-amber-400 font-bold uppercase mt-0.5">
                          Requires Ultimate Subscription
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Section 2: Economics, Prizes & Deposit */}
        <div className="bg-slate-900/80 border border-cyan-500/20 p-5 rounded-2xl space-y-4 shadow-lg">
          <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-3">
            <Coins className="w-5 h-5 text-amber-400" />
            <h3 className="text-sm font-black text-amber-300 uppercase tracking-wider font-mono">
              2. Token Economics & Prize Pool
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {/* Entry Fee */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1 font-mono">
                Entry Fee (Tokens)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={entryFee}
                onChange={(e) => handleTokenInputChange(e.target.value, setEntryFee)}
                onFocus={(e) => {
                  e.target.select();
                  handleTokenInputFocus(entryFee, setEntryFee);
                }}
                onBlur={() => handleTokenInputBlur(entryFee, setEntryFee)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all font-mono"
                required
              />
            </div>

            {/* Total Prize Pool */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block font-mono">
                  Total Prize Pool (Tokens)
                </label>
                <span className="text-[9px] bg-amber-500/10 text-amber-400 font-mono px-1.5 py-0.5 rounded border border-amber-500/20 font-bold">
                  Auto Calculated
                </span>
              </div>
              <input
                type="number"
                value={prizePool}
                readOnly
                className="w-full bg-slate-950/80 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-xs text-amber-300 font-bold focus:outline-none font-mono cursor-not-allowed select-none"
              />
              <p className="text-[10px] text-slate-400 mt-1 font-mono">
                {mode === 'solo' ? (
                  <>({perKill || 0} per kill × {totalPlayersCount} players) + {booyahPrize || 0} + {runnerUpPrize || 0}</>
                ) : (
                  <>{booyahPrize || 0} + {runnerUpPrize || 0}</>
                )}
              </p>
            </div>

            {/* Booyah Prize */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1 font-mono">
                Booyah Prize (1st Place)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={booyahPrize}
                onChange={(e) => handleTokenInputChange(e.target.value, setBooyahPrize)}
                onFocus={(e) => {
                  e.target.select();
                  handleTokenInputFocus(booyahPrize, setBooyahPrize);
                }}
                onBlur={() => handleTokenInputBlur(booyahPrize, setBooyahPrize)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all font-mono"
                required
              />
            </div>

            {/* Runner-Up Prize */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1 font-mono">
                Runner-Up Prize (2nd Place)
              </label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={runnerUpPrize}
                onChange={(e) => handleTokenInputChange(e.target.value, setRunnerUpPrize)}
                onFocus={(e) => {
                  e.target.select();
                  handleTokenInputFocus(runnerUpPrize, setRunnerUpPrize);
                }}
                onBlur={() => handleTokenInputBlur(runnerUpPrize, setRunnerUpPrize)}
                placeholder="0"
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all font-mono"
              />
            </div>

            {/* Per Kill / Parcel Reward - Only for Solo Mode */}
            {mode === 'solo' && (
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1 font-mono">
                  Per Kill / Parcel Reward (Tokens)
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={perKill}
                  onChange={(e) => handleTokenInputChange(e.target.value, setPerKill)}
                  onFocus={(e) => {
                    e.target.select();
                    handleTokenInputFocus(perKill, setPerKill);
                  }}
                  onBlur={() => handleTokenInputBlur(perKill, setPerKill)}
                  placeholder="0"
                  className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all font-mono"
                />
              </div>
            )}
          </div>

          {/* Deposit Tokens Adjustment Card */}
          <div className="bg-gradient-to-r from-amber-950/30 via-slate-950 to-amber-950/30 border border-amber-500/30 p-4 rounded-xl mt-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-amber-400" />
                  <h4 className="text-xs font-bold text-amber-300 uppercase font-mono">
                    Host Initial Prize Deposit Percentage
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Minimum deposit is <span className="text-amber-400 font-bold">10%</span>. Click <span className="text-amber-400 font-bold">+</span> to increase by 10% up to 100%.
                </p>
              </div>

              {/* Incremental Control Buttons */}
              <div className="flex items-center gap-2 bg-slate-900 border border-amber-500/40 p-1.5 rounded-xl">
                <button
                  type="button"
                  onClick={handleDecreaseDeposit}
                  disabled={depositPercentage <= 10}
                  className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  -10%
                </button>

                <span className="px-3 text-xs font-black font-mono text-amber-300">
                  {depositPercentage}%
                </span>

                <button
                  type="button"
                  onClick={handleIncreaseDeposit}
                  disabled={depositPercentage >= 100}
                  className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  +10%
                </button>
              </div>
            </div>

            {/* Calculated Required Tokens Box */}
            <div className="border-t border-amber-500/20 pt-3 space-y-2 text-xs font-mono">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 font-bold">Required Token Deposit from Main Account:</span>
                <span className="text-sm font-black text-amber-300">
                  🪙 {depositTokensRequired} Tokens
                </span>
              </div>
              <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 text-[10.5px] text-slate-400 space-y-1">
                <div className="flex justify-between">
                  <span>🏆 Booyah Prize (100%):</span>
                  <span className="text-slate-300">🪙 {Number(booyahPrize) || 0} Tokens</span>
                </div>
                <div className="flex justify-between">
                  <span>🥈 Runner-up Prize (100%):</span>
                  <span className="text-slate-300">🪙 {Number(runnerUpPrize) || 0} Tokens</span>
                </div>
                {mode === 'solo' && (
                  <div className="flex justify-between">
                    <span>⚔️ Per Kill Prize Fund ({depositPercentage}% of 🪙 {perKillPrizeFund}):</span>
                    <span className="text-slate-300">🪙 {Math.ceil((perKillPrizeFund * depositPercentage) / 100)} Tokens</span>
                  </div>
                )}
                <div className="border-t border-slate-800/60 pt-1 mt-1 flex justify-between font-bold text-amber-400/90 text-[11px]">
                  <span>Total Mandatory Deposit:</span>
                  <span>🪙 {depositTokensRequired} Tokens</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Sponsor Details (Optional) */}
        <div className="bg-slate-900/80 border border-cyan-500/20 p-5 rounded-2xl space-y-4 shadow-lg">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-cyan-500/20 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-400" />
              <h3 className="text-sm font-black text-purple-300 uppercase tracking-wider font-mono">
                3. Sponsor Details (Optional)
              </h3>
            </div>
            
            <div className="text-xs text-purple-300/80 font-mono font-medium">
              Add Sponsor to Tournament
            </div>
          </div>

          {/* Items arranged in a single row as tabs */}
          <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setSponsorType('none');
                setSponsorName('');
                setSponsorLogoUrl('');
                setSponsorLinkUrl('');
                handleClearSponsorLogo();
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all text-center ${
                sponsorType === 'none'
                  ? 'bg-slate-800 text-slate-200 border border-slate-700 shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              No Sponsor
            </button>
            <button
              type="button"
              onClick={() => {
                setSponsorType('name');
                setSponsorLogoUrl('');
                handleClearSponsorLogo();
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all text-center ${
                sponsorType === 'name'
                  ? 'bg-purple-600 text-white border border-purple-500 shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sponsor Name
            </button>
            <button
              type="button"
              onClick={() => {
                setSponsorType('logo');
                setSponsorName('');
              }}
              className={`py-2 px-3 rounded-lg text-xs font-bold font-mono transition-all text-center ${
                sponsorType === 'logo'
                  ? 'bg-purple-600 text-white border border-purple-500 shadow-md shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Sponsor Logo
            </button>
          </div>

          {sponsorType === 'name' && (
            <motion.div 
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-1"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1 font-mono">
                    Sponsor Name
                  </label>
                  <input
                    type="text"
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    placeholder="e.g. শহীদ কাতার প্রবাসী / রনি ফ্যাশন"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all font-sans"
                    required
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1 font-mono">
                    Sponsor Website Link URL
                  </label>
                  <input
                    type="url"
                    value={sponsorLinkUrl}
                    onChange={(e) => setSponsorLinkUrl(e.target.value)}
                    placeholder="e.g. https://... (ফেসবুক প্রোফাইল, পেজ, টিকটক, ইউটিউব, ওয়েবসাইট লিংক)"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all font-mono"
                  />
                </div>
              </div>

              {/* Optional Sponsor Photo Checkbox */}
              <div className="pt-1">
                <label className="inline-flex items-center gap-2 cursor-pointer select-none font-mono text-xs text-purple-300 bg-purple-950/30 border border-purple-500/30 px-3 py-2 rounded-xl hover:border-purple-500/50 transition-all">
                  <input
                    type="checkbox"
                    checked={includeSponsorPhoto}
                    onChange={(e) => {
                      setIncludeSponsorPhoto(e.target.checked);
                      if (!e.target.checked) {
                        handleClearSponsorLogo();
                      }
                    }}
                    className="w-4 h-4 rounded border-slate-700 bg-slate-950 text-purple-600 focus:ring-purple-500/50 cursor-pointer accent-purple-600"
                  />
                  <span className="font-bold">Include Sponsor Photo (Optional)</span>
                </label>
              </div>

              {includeSponsorPhoto && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="space-y-3 bg-purple-950/20 border border-purple-500/30 p-3.5 rounded-xl"
                >
                  <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block font-mono">
                    Upload Sponsor Photo (From Device)
                  </label>
                  <div className="relative border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 bg-slate-950/60 rounded-xl p-3 transition-all text-center cursor-pointer">
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleSponsorLogoFileChange}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                    />
                    <div className="flex items-center justify-center gap-2">
                      <Upload className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="text-xs font-bold text-slate-200">
                        {isCompressingLogo ? 'Compressing (Max 20 KB)...' : 'Choose Photo File from Device'}
                      </span>
                    </div>
                  </div>

                  {/* Compressed Image Preview */}
                  {(sponsorLogoPreview || sponsorLogoUrl) && (
                    <div className="flex items-center justify-between gap-3 bg-purple-950/40 border border-purple-500/30 p-2.5 rounded-xl">
                      <div className="flex items-center gap-3">
                        <img 
                          src={sponsorLogoPreview || sponsorLogoUrl} 
                          alt="Sponsor Photo Preview" 
                          className="w-10 h-10 object-cover rounded-full border-2 border-purple-400/60 bg-slate-950 p-0.5 shadow-md" 
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                        <div>
                          <div className="flex items-center gap-1 text-xs font-bold text-purple-300">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            Sponsor Photo Selected
                          </div>
                          {sponsorLogoSizeKb !== null && (
                            <div className="text-[10px] text-slate-400 font-mono">
                              Size: <span className="text-emerald-400 font-bold">{sponsorLogoSizeKb} KB</span> (Max limit: 20 KB)
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={handleClearSponsorLogo}
                        className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-900 rounded-lg border border-slate-800 transition-all shrink-0 cursor-pointer"
                        title="Remove Photo"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </motion.div>
              )}
            </motion.div>
          )}

          {sponsorType === 'logo' && (
            <motion.div 
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4 pt-1"
            >
              {/* File Upload Option */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block font-mono">
                  Upload Sponsor Logo (From Device)
                </label>
                <div className="relative border-2 border-dashed border-purple-500/30 hover:border-purple-500/60 bg-slate-950/60 rounded-xl p-3.5 transition-all text-center cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSponsorLogoFileChange}
                    className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                  />
                  <div className="flex items-center justify-center gap-2">
                    <Upload className="w-4 h-4 text-purple-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-200">
                      {isCompressingLogo ? 'Compressing (Max 20 KB)...' : 'Choose Logo File from Device'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Compressed Image Preview */}
              {(sponsorLogoPreview || sponsorLogoUrl) && (
                <div className="flex items-center justify-between gap-3 bg-purple-950/30 border border-purple-500/30 p-2.5 rounded-xl">
                  <div className="flex items-center gap-3">
                    <img 
                      src={sponsorLogoPreview || sponsorLogoUrl} 
                      alt="Sponsor Logo Preview" 
                      className="h-9 max-w-[120px] object-contain rounded bg-slate-950/80 p-1 border border-purple-500/20" 
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div>
                      <div className="flex items-center gap-1 text-xs font-bold text-purple-300">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                        Sponsor Logo Selected
                      </div>
                      {sponsorLogoSizeKb !== null && (
                        <div className="text-[10px] text-slate-400 font-mono">
                          Size: <span className="text-emerald-400 font-bold">{sponsorLogoSizeKb} KB</span> (Max limit: 20 KB)
                        </div>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleClearSponsorLogo}
                    className="p-1.5 text-slate-400 hover:text-red-400 bg-slate-900 rounded-lg border border-slate-800 transition-all shrink-0"
                    title="Remove Logo"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}

              {/* Sponsor Website Link */}
              <div>
                <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1 font-mono">
                  Sponsor Website Link URL
                </label>
                <input
                  type="url"
                  value={sponsorLinkUrl}
                  onChange={(e) => setSponsorLinkUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-slate-950 border border-slate-800 focus:border-purple-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all font-mono"
                />
              </div>
            </motion.div>
          )}
        </div>

        {/* Section 4: Geographical Restrictions & Representation Rules */}
        <div className="bg-slate-900/80 border border-cyan-500/20 p-5 rounded-2xl space-y-4 shadow-lg">
          <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-3">
            <MapPin className="w-5 h-5 text-emerald-400" />
            <h3 className="text-sm font-black text-emerald-300 uppercase tracking-wider font-mono">
              4. Geographical Restrictions & Regional Limits
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Location Restriction Type */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1 font-mono">
                Geographical Scope
              </label>
              <select
                value={locationType}
                onChange={(e) => setLocationType(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all font-sans"
              >
                <option value="all_bangladesh">All Bangladesh (Open to All)</option>
                <option value="specific_division">Specific Division Only</option>
                <option value="specific_district">Specific District Only</option>
                <option value="specific_upazila">Specific Upazila Only</option>
              </select>
            </div>

            {/* Representation / Entry Limits */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1 font-mono">
                Representation / Regional Limit Rule
              </label>
              <select
                value={representationRule}
                onChange={(e) => setRepresentationRule(e.target.value as any)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-emerald-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all font-sans"
              >
                <option value="any">Any eligible player / squad can join</option>
                <option value="one_squad_per_upazila">Only 1 Player / Squad allowed per Upazila</option>
                <option value="one_squad_per_district">Only 1 Player / Squad allowed per District</option>
                <option value="one_squad_per_division">Only 1 Player / Squad allowed per Division</option>
              </select>
            </div>
          </div>

          {/* Conditional Dropdowns based on Location Type */}
          {locationType !== 'all_bangladesh' && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
              {/* Division */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">
                  Select Division
                </label>
                <select
                  value={selectedDivision}
                  onChange={(e) => {
                    setSelectedDivision(e.target.value);
                    setSelectedDistrict('');
                    setSelectedUpazila('');
                  }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                  required
                >
                  <option value="">Select Division</option>
                  {BANGLADESH_DIVISIONS.map((div) => (
                    <option key={div.name} value={div.name}>{div.name}</option>
                  ))}
                </select>
              </div>

              {/* District */}
              {(locationType === 'specific_district' || locationType === 'specific_upazila') && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">
                    Select District
                  </label>
                  <select
                    value={selectedDistrict}
                    onChange={(e) => {
                      setSelectedDistrict(e.target.value);
                      setSelectedUpazila('');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  >
                    <option value="">Select District</option>
                    {(selectedDivision ? (BANGLADESH_DIVISIONS.find(d => d.name === selectedDivision)?.districts || ALL_BANGLADESH_DISTRICTS) : ALL_BANGLADESH_DISTRICTS).map(dist => (
                      <option key={dist} value={dist}>{dist}</option>
                    ))}
                  </select>
                </div>
              )}

              {/* Upazila */}
              {locationType === 'specific_upazila' && (
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1 font-mono">
                    Select Upazila
                  </label>
                  <select
                    value={selectedUpazila}
                    onChange={(e) => setSelectedUpazila(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white"
                    required
                  >
                    <option value="">Select Upazila</option>
                    {(selectedDistrict && BANGLADESH_UPAZILAS_BY_DISTRICT[selectedDistrict] || []).map(upa => (
                      <option key={upa} value={upa}>{upa}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Section 5: Date & Time */}
        <div className="bg-slate-900/80 border border-cyan-500/20 p-5 rounded-2xl space-y-4 shadow-lg">
          <div className="flex items-center gap-2 border-b border-cyan-500/20 pb-3">
            <Calendar className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-black text-cyan-300 uppercase tracking-wider font-mono">
              5. Match Schedule
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1 font-mono">
                Match Date
              </label>
              <input
                type="date"
                value={matchDate}
                onChange={(e) => setMatchDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all font-mono"
                required
              />
            </div>

            <div>
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-1 font-mono">
                Match Time
              </label>
              <input
                type="time"
                value={matchTime}
                onChange={(e) => setMatchTime(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/60 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none transition-all font-mono"
                required
              />
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="pt-2">
          <button
            type="submit"
            disabled={isGenerating}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-500 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-sm uppercase tracking-widest rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.4)] transition-all transform active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
          >
            {isGenerating ? (
              <>
                <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                Generating Tournament...
              </>
            ) : (
              <>
                <Flame className="w-5 h-5 fill-slate-950" />
                Generate Tournament (Deposit {depositTokensRequired} 🪙)
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
