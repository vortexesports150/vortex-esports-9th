import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, Check, AlertTriangle, Shield, Coins, Users, Plus, Minus, Upload, Edit, Image as ImageIcon, Calendar, Clock, Zap, ListFilter, CalendarDays, Layers, MapPin, FileCheck, ShieldAlert, FileText, X, CalendarX2, Globe, Key, Mail } from 'lucide-react';
import { db } from '../lib/firebase';
import { runTransaction, doc, collection, serverTimestamp, updateDoc, getDoc, query, where, getDocs, setDoc } from 'firebase/firestore';
import { UserProfile, ProHostedLeague } from '../types';
import { compressAndUploadLogoToFirebase } from '../lib/imgbb';
import { BRAND_THEMES, getHostThemeIndex } from './ProHostPanel';
import { BANGLADESH_DIVISIONS, ALL_BANGLADESH_DISTRICTS, BANGLADESH_UPAZILAS_BY_DISTRICT } from '../data/bangladeshData';

const groupLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P'];

const getStageNameHelper = (idx: number, totalMatches: number) => {
  const numGroups = totalMatches === 7 ? 1 : totalMatches === 15 ? 2 : totalMatches === 31 ? 4 : totalMatches === 63 ? 8 : totalMatches === 127 ? 16 : 1;
  const numGroupMatches = numGroups * 6; // 6 matches per group (4 squads each)

  if (idx <= numGroupMatches) {
    const groupIdx = (idx - 1) % numGroups;
    const groupName = groupLetters[groupIdx] || 'A';
    const isOpening = idx === 1 ? ' (Opening)' : '';
    return `Group ${groupName} - Match ${idx}${isOpening}`;
  }

  if (totalMatches === 7) {
    if (idx === 7) return `Grand Final - Match 7 (Knockout)`;
  } else if (totalMatches === 15) {
    if (idx === 13) return `Semi-Final 1 - Match 13 (Knockout)`;
    if (idx === 14) return `Semi-Final 2 - Match 14 (Knockout)`;
    if (idx === 15) return `Grand Final - Match 15 (Knockout)`;
  } else if (totalMatches === 31) {
    if (idx <= 28) return `Quarter-Final ${idx - 24} - Match ${idx} (Knockout)`;
    if (idx === 29) return `Semi-Final 1 - Match 29 (Knockout)`;
    if (idx === 30) return `Semi-Final 2 - Match 30 (Knockout)`;
    if (idx === 31) return `Grand Final - Match 31 (Knockout)`;
  } else if (totalMatches === 63) {
    if (idx <= 56) return `Round of 16 - Match ${idx} (Knockout)`;
    if (idx <= 60) return `Quarter-Final ${idx - 56} - Match ${idx} (Knockout)`;
    if (idx === 61) return `Semi-Final 1 - Match 61 (Knockout)`;
    if (idx === 62) return `Semi-Final 2 - Match 62 (Knockout)`;
    if (idx === 63) return `Grand Final - Match 63 (Knockout)`;
  } else if (totalMatches === 127) {
    if (idx <= 112) return `Round of 32 - Match ${idx} (Knockout)`;
    if (idx <= 120) return `Round of 16 - Match ${idx} (Knockout)`;
    if (idx <= 124) return `Quarter-Final ${idx - 120} - Match ${idx} (Knockout)`;
    if (idx === 125) return `Semi-Final 1 - Match 125 (Knockout)`;
    if (idx === 126) return `Semi-Final 2 - Match 126 (Knockout)`;
    if (idx === 127) return `Grand Final - Match 127 (Knockout)`;
  }

  return `Match ${idx}`;
};

const generateMatchListForSquads = (
  squadSize: number,
  existingMatches: Array<{ matchNumber: number; matchName: string; date: string; time: string }> = []
) => {
  let count = 15;
  if (squadSize <= 4) count = 7;
  else if (squadSize <= 8) count = 15;
  else if (squadSize <= 16) count = 31;
  else if (squadSize <= 32) count = 63;
  else if (squadSize <= 64) count = 127;
  else count = Math.max(1, squadSize - 1);

  const matches = [];
  for (let i = 1; i <= count; i++) {
    const existing = existingMatches.find(m => m.matchNumber === i);
    matches.push({
      matchNumber: i,
      matchName: getStageNameHelper(i, count),
      date: existing?.date || '',
      time: existing?.time || '19:00'
    });
  }
  return matches;
};

const calculateDaysBetween = (d1: string, d2: string) => {
  if (!d1 || !d2) return 0;
  const date1 = new Date(d1);
  const date2 = new Date(d2);
  const diffTime = date2.getTime() - date1.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays >= 0 ? diffDays : 0;
};

const generateAutoScheduledMatches = (
  squadSize: number,
  openingDate: string,
  openingTime: string,
  semiFinal1Date: string,
  semiFinal1Time: string,
  semiFinal2Date: string,
  semiFinal2Time: string,
  finalDate: string,
  finalTime: string,
  slotsPerDay: number,
  slot1Time: string,
  slot2Time: string,
  slot3Time: string,
  slot4Time: string,
  breakDays: string[] = []
) => {
  const totalMatches = squadSize <= 4 ? 7 : squadSize <= 8 ? 15 : squadSize <= 16 ? 31 : squadSize <= 32 ? 63 : 127;
  const slotTimes = [slot1Time, slot2Time, slot3Time, slot4Time].slice(0, Math.max(1, slotsPerDay));

  const matches = [];
  const baseDateStr = openingDate || new Date().toISOString().split('T')[0];

  const sf1Idx = totalMatches === 15 ? 13 : totalMatches === 31 ? 29 : totalMatches === 63 ? 61 : totalMatches === 127 ? 125 : -1;
  const sf2Idx = totalMatches === 15 ? 14 : totalMatches === 31 ? 30 : totalMatches === 63 ? 62 : totalMatches === 127 ? 126 : -1;

  // Track the current working date for intermediate matches, skipping break days and the opening day
  let intermediateCounter = 0;
  const openingDateStr = openingDate || baseDateStr;

  for (let i = 1; i <= totalMatches; i++) {
    let mDate = baseDateStr;
    let mTime = '18:00';
    let slotName = 'Slot 1';

    if (i === 1) {
      mDate = openingDateStr;
      mTime = openingTime || slotTimes[0] || '18:00';
      slotName = 'Opening Slot';
    } else if (i === sf1Idx && sf1Idx > 0) {
      mDate = semiFinal1Date || mDate;
      mTime = semiFinal1Time || '19:30';
      slotName = 'Semi-Final 1';
    } else if (i === sf2Idx && sf2Idx > 0) {
      mDate = semiFinal2Date || mDate;
      mTime = semiFinal2Time || '21:00';
      slotName = 'Semi-Final 2';
    } else if (i === totalMatches) {
      mDate = finalDate || mDate;
      mTime = finalTime || '20:00';
      slotName = 'Final Slot';
    } else {
      const dayOffset = Math.floor(intermediateCounter / slotTimes.length);
      const slotIdx = intermediateCounter % slotTimes.length;

      let calcD = new Date(baseDateStr);
      // Ensure regular matches start from at least day 1 relative to baseDateStr
      calcD.setDate(calcD.getDate() + dayOffset + 1);
      
      // Skip break days and also ensure we don't land on the opening day
      let dateToCheck = calcD.toISOString().split('T')[0];
      while (breakDays.includes(dateToCheck) || dateToCheck === openingDateStr) {
        calcD.setDate(calcD.getDate() + 1);
        dateToCheck = calcD.toISOString().split('T')[0];
      }

      mDate = dateToCheck;
      mTime = slotTimes[slotIdx] || '18:00';
      slotName = `Daily Slot ${slotIdx + 1}`;
      
      intermediateCounter++;
    }

    matches.push({
      matchNumber: i,
      matchName: getStageNameHelper(i, totalMatches),
      date: mDate,
      time: mTime,
      slotName,
      slotIndex: i === 1 ? 1 : i === totalMatches ? 1 : ((i - 2) % slotTimes.length) + 1
    });
  }

  return matches;
};

export function GenerateLeagueView({ userProfile, tokens, onBack, onLeagueGenerated }: any) {
  const hostId = userProfile?.userId || 'guest_host';
  const [themeIndex, setThemeIndex] = useState<number>(0);
  const [brandName, setBrandName] = useState<string>(userProfile?.brandName || userProfile?.displayName || '');
  const [brandLogoUrl, setBrandLogoUrl] = useState<string>(userProfile?.brandLogoUrl || '');
  const [brandNameInput, setBrandNameInput] = useState<string>(userProfile?.brandName || userProfile?.displayName || '');
  
  const [isEditingBrandName, setIsEditingBrandName] = useState<boolean>(!userProfile?.brandName);
  const [isSavingBrandName, setIsSavingBrandName] = useState<boolean>(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState<boolean>(false);
  const [isUploadingSponsorLogo, setIsUploadingSponsorLogo] = useState<boolean>(false);
  const [logoSizeKb, setLogoSizeKb] = useState<number | null>(null);

  const [sponsorType, setSponsorType] = useState<'none' | 'name' | 'logo'>('none');

  const [scheduleMode, setScheduleMode] = useState<'auto' | 'manual'>('auto');

  // Load Host Brand, Theme & Season Number from Firestore
  useEffect(() => {
    const fetchHostBrandAndSeason = async () => {
      try {
        let lastSeason = 0;
        const brandRef = doc(db, 'host_brands', hostId);
        const snap = await getDoc(brandRef);

        if (snap.exists()) {
          const data = snap.data();
          if (data.brandName) {
            setBrandName(data.brandName);
            setBrandNameInput(data.brandName);
            setFormData(prev => ({ ...prev, brandName: data.brandName }));
          } else if (userProfile?.displayName) {
            setBrandName(userProfile.displayName);
            setBrandNameInput(userProfile.displayName);
            setFormData(prev => ({ ...prev, brandName: userProfile.displayName }));
          }

          if (data.brandLogoUrl) setBrandLogoUrl(data.brandLogoUrl);

          if (typeof data.themeIndex === 'number') {
            setThemeIndex(data.themeIndex % BRAND_THEMES.length);
          } else {
            setThemeIndex(getHostThemeIndex(hostId));
          }

          if (data.lastSeasonNumber) {
            lastSeason = Number(data.lastSeasonNumber) || 0;
          }
        } else {
          setThemeIndex(getHostThemeIndex(hostId));
          if (userProfile?.displayName) {
            setBrandName(userProfile.displayName);
            setBrandNameInput(userProfile.displayName);
            setFormData(prev => ({ ...prev, brandName: userProfile.displayName }));
          }
        }

        // Fallback: Check user profile for lastSeasonNumber
        if (lastSeason === 0 && userProfile?.userId) {
          const userSnap = await getDoc(doc(db, 'users', userProfile.userId));
          if (userSnap.exists() && userSnap.data()?.lastSeasonNumber) {
            lastSeason = Number(userSnap.data().lastSeasonNumber) || 0;
          }
        }

        // Additional Fallback: Query existing leagues count if lastSeason is still 0
        if (lastSeason === 0 && hostId) {
          try {
            const q = query(collection(db, 'pro_hosted_leagues'), where('hostId', '==', hostId));
            const leaguesSnap = await getDocs(q);
            if (!leaguesSnap.empty) {
              let maxSeason = 0;
              leaguesSnap.forEach(d => {
                const sNum = parseInt(d.data().seasonNumber, 10);
                if (!isNaN(sNum) && sNum > maxSeason) maxSeason = sNum;
              });
              lastSeason = maxSeason > 0 ? maxSeason : leaguesSnap.size;
            }
          } catch (e) {
            console.warn('Could not query existing leagues for season number fallback:', e);
          }
        }

        const nextSeason = lastSeason + 1;
        setFormData(prev => ({ ...prev, seasonNumber: String(nextSeason) }));
      } catch (err) {
        console.error('Error fetching host details in GenerateLeagueView:', err);
      }
    };

    fetchHostBrandAndSeason();
  }, [hostId, userProfile?.displayName]);

  const currentTheme = BRAND_THEMES[themeIndex % BRAND_THEMES.length];

  const [formData, setFormData] = useState({
    brandName: userProfile?.brandName || userProfile?.displayName || '',
    leagueName: '',
    seasonNumber: '1',
    squadSize: 16,
    prizePool: 2000,
    entryFee: 150,
    championPrize: 1000,
    runnerUpPrize: 600,
    topRank1Prize: 200,
    topRank2Prize: 120,
    topRank3Prize: 80,
    openingMatchDate: '',
    openingMatchTime: '18:00',
    semiFinal1Date: '',
    semiFinal1Time: '19:30',
    semiFinal2Date: '',
    semiFinal2Time: '21:00',
    semiFinalDate: '',
    semiFinalTime: '19:30',
    finalDate: '',
    finalTime: '20:00',
    preferredMatchTimeRange: '8 PM - 10 PM',
    slotsPerDay: 3,
    slot1Time: '18:00',
    slot2Time: '19:30',
    slot3Time: '21:00',
    slot4Time: '22:30',
    matchGapMinutes: 90,
    locationRestrictionType: 'all_bangladesh' as 'all_bangladesh' | 'specific_division' | 'specific_district' | 'specific_upazila',
    allowedDivision: '',
    allowedDistrict: '',
    allowedUpazila: '',
    representationRule: 'any' as 'any' | 'one_squad_per_upazila' | 'one_squad_per_district' | 'one_squad_per_division',
    breakDays: [] as string[],
    sponsorName: '',
    sponsorLogoUrl: '',
    sponsorLinkUrl: ''
  });

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

  const [manualMatches, setManualMatches] = useState<Array<{ matchNumber: number; matchName: string; date: string; time: string }>>(() =>
    generateMatchListForSquads(16)
  );

  const sanitizeTokenInput = (val: string): number => {
    if (!val || val.trim() === '') return 0;
    const cleanStr = val.replace(/\D/g, '');
    if (!cleanStr) return 0;
    const stripped = cleanStr.replace(/^0+(?=\d)/, '');
    return parseInt(stripped, 10) || 0;
  };

  const handlePrizePoolChange = (rawVal: string) => {
    const pool = sanitizeTokenInput(rawVal);
    setFormData(prev => ({
      ...prev,
      prizePool: pool,
      championPrize: Math.floor(pool * 0.50),
      runnerUpPrize: Math.floor(pool * 0.30),
      topRank1Prize: Math.floor(pool * 0.10),
      topRank2Prize: Math.floor(pool * 0.06),
      topRank3Prize: Math.floor(pool * 0.04)
    }));
  };

  const updateIndividualPrize = (field: 'championPrize' | 'runnerUpPrize' | 'topRank1Prize' | 'topRank2Prize' | 'topRank3Prize', rawVal: string) => {
    const val = sanitizeTokenInput(rawVal);
    setFormData(prev => {
      const updated = { ...prev, [field]: val };
      const totalSum = updated.championPrize + updated.runnerUpPrize + updated.topRank1Prize + updated.topRank2Prize + updated.topRank3Prize;
      return {
        ...updated,
        prizePool: totalSum
      };
    });
  };
  
  const [showSubModal, setShowSubModal] = useState(false);
  const [showFullSchedule, setShowFullSchedule] = useState(false);
  const [error, setError] = useState('');
  const topRef = React.useRef<HTMLDivElement>(null);

  const setErrorAndScroll = (msg: string) => {
    setError(msg);
    if (msg) {
      setTimeout(() => {
        if (topRef.current) {
          topRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
        window.scrollTo({ top: 0, behavior: 'smooth' });
        const parent = topRef.current?.closest('.overflow-y-auto') || topRef.current?.closest('main');
        if (parent && 'scrollTo' in parent) {
          (parent as HTMLElement).scrollTo({ top: 0, behavior: 'smooth' });
        }
      }, 50);
    }
  };
  const [isGenerating, setIsGenerating] = useState(false);
  const [subscriptionConfig, setSubscriptionConfig] = useState<any>({ monthlyFee: 300, yearlyFee: 1500, apexFee: 10000 });

  // Subscription Confirmation and Transfer states
  const [pendingSubPlan, setPendingSubPlan] = useState<'monthly' | 'yearly' | 'apex' | null>(null);
  const [subError, setSubError] = useState<string>('');
  const [showSubSuccessModal, setShowSubSuccessModal] = useState<boolean>(false);
  const [showTransferModal, setShowTransferModal] = useState<boolean>(false);
  const [depositPercentage, setDepositPercentage] = useState<number>(10);
  const [transferError, setTransferError] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState<boolean>(false);
  const [subOverrideType, setSubOverrideType] = useState<'monthly' | 'yearly' | 'apex' | null>(null);
  const [antiDopingCertUrl, setAntiDopingCertUrl] = useState<string>('');
  const [uploadingAntiDoping, setUploadingAntiDoping] = useState<boolean>(false);

  const confirmModalRef = React.useRef<HTMLDivElement>(null);
  const transferModalRef = React.useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (showTransferModal) {
      setTimeout(() => {
        if (transferModalRef.current) {
          transferModalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [showTransferModal]);

  useEffect(() => {
    if (pendingSubPlan) {
      setTimeout(() => {
        if (confirmModalRef.current) {
          confirmModalRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
        window.scrollTo({ top: 100, behavior: 'smooth' });
        const parent = confirmModalRef.current?.closest('.overflow-y-auto') || confirmModalRef.current?.closest('main');
        if (parent && 'scrollTo' in parent) {
          const rect = confirmModalRef.current.getBoundingClientRect();
          const parentScrollTop = (parent as HTMLElement).scrollTop;
          (parent as HTMLElement).scrollTo({
            top: parentScrollTop + rect.top - 100,
            behavior: 'smooth'
          });
        }
      }, 100);
    }
  }, [pendingSubPlan]);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const snap = await getDoc(doc(db, 'settings', 'proHostSubscriptions'));
        if (snap.exists()) {
          setSubscriptionConfig(snap.data());
        }
      } catch(err) {}
    };
    fetchConfig();
  }, []);


  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingLogo(true);
    setError('');
    try {
      const { url, sizeKb } = await compressAndUploadLogoToFirebase(file, 'host_logo');
      setBrandLogoUrl(url);
      setLogoSizeKb(sizeKb);

      // Save brand logo in database under host's user record
      if (userProfile?.userId) {
        await updateDoc(doc(db, 'users', userProfile.userId), {
          brandLogoUrl: url,
          updatedAt: serverTimestamp()
        });
        if (userProfile) userProfile.brandLogoUrl = url;
      }
    } catch (err: any) {
      console.error(err);
      setError('Failed to upload logo: ' + (err.message || 'Error processing image'));
    } finally {
      setIsUploadingLogo(false);
    }
  };

  const handleSponsorLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingSponsorLogo(true);
    setError('');
    try {
      const { url } = await compressAndUploadLogoToFirebase(file, 'tournament_sponsor_logo');
      setFormData(prev => ({ ...prev, sponsorLogoUrl: url }));
    } catch (err: any) {
      console.error(err);
      setError('Failed to upload sponsor logo: ' + (err.message || 'Error processing image'));
    } finally {
      setIsUploadingSponsorLogo(false);
    }
  };

  const handleSaveBrandName = async () => {
    const sanitized = brandNameInput.replace(/[^a-zA-Z0-9 ]/g, '').slice(0, 30).trim();
    if (!sanitized) {
      setError('Please enter a valid Host Name (letters & numbers only)');
      return;
    }

    setIsSavingBrandName(true);
    setError('');
    try {
      const newName = sanitized;
      setBrandName(newName);
      setBrandNameInput(newName);
      setFormData(prev => ({ ...prev, brandName: newName }));

      // Save brand name in database under host's user record
      if (userProfile?.userId) {
        await updateDoc(doc(db, 'users', userProfile.userId), {
          brandName: newName,
          updatedAt: serverTimestamp()
        });
        if (userProfile) userProfile.brandName = newName;
      }
      setIsEditingBrandName(false);
    } catch (err: any) {
      console.error(err);
      setError('Failed to save host name: ' + err.message);
    } finally {
      setIsSavingBrandName(false);
    }
  };

  const calculatePrizes = () => {
    const champion = Math.floor(formData.prizePool * 0.5);
    const runnerUp = Math.floor(formData.prizePool * 0.3);
    const third = Math.floor(formData.prizePool * 0.1);
    const fourth = Math.floor(formData.prizePool * 0.1);
    return { champion, runnerUp, third, fourth };
  };

  const handleGenerate = async () => {
    setErrorAndScroll('');

    const activeBrandName = brandName || formData.brandName;
    if (!activeBrandName) {
      setErrorAndScroll('Please add a Brand Name before generating the league.');
      return;
    }

    if (!formData.leagueName.trim()) {
      setErrorAndScroll('Please enter a League Name.');
      return;
    }
    
    // Check subscription
    const isFreeLeague = formData.squadSize <= 4;
    if (!isFreeLeague) {
      const sub = userProfile?.proHostSubscription;
      const activeSubTier = subOverrideType || sub?.type || 'none';
      const isSubActive = subOverrideType !== null || (sub && sub.type !== 'none' && sub.expiresAt && new Date(sub.expiresAt) > new Date());
      
      if (!isSubActive) {
        setShowSubModal(true);
        setErrorAndScroll('Please subscribe to a Pro Host plan before generating an 8+ squad league.');
        return;
      }
      
      if (formData.squadSize > 32 && activeSubTier !== 'apex') {
        setErrorAndScroll('64-squad leagues require the Apex Subscription tier.');
        return;
      }
      
      if (formData.squadSize > 16 && formData.squadSize <= 32 && activeSubTier === 'monthly') {
        setErrorAndScroll('Monthly subscription only supports up to 16 squads. Please upgrade your subscription to create 32 or 64 squad leagues.');
        return;
      }
    }

    // Schedule Validation
    if (scheduleMode === 'auto') {
      const openingDate = formData.openingMatchDate;
      const finalDate = formData.finalDate;
      const isFourSquad = formData.squadSize <= 4;

      if (isFourSquad) {
        if (!openingDate || !finalDate) {
          setErrorAndScroll('Please set both Opening Match and Final Match dates.');
          return;
        }
      } else {
        const semi1Date = formData.semiFinal1Date;
        const semi2Date = formData.semiFinal2Date;
        if (!openingDate || !semi1Date || !semi2Date || !finalDate) {
          setErrorAndScroll('Please set all key match dates (Opening, Semi-Finals, and Final).');
          return;
        }
      }

      const dOpening = new Date(openingDate);
      const dFinal = new Date(finalDate);

      // Calculate estimated last regular match date to ensure finals / semi-finals don't overlap
      const totalMatches = formData.squadSize <= 4 ? 7 : formData.squadSize <= 8 ? 15 : formData.squadSize <= 16 ? 31 : formData.squadSize <= 32 ? 63 : 127;
      const sf1Idx = totalMatches === 15 ? 13 : totalMatches === 31 ? 29 : totalMatches === 63 ? 61 : totalMatches === 127 ? 125 : -1;
      const slotsPerDay = formData.slotsPerDay || 1;
      
      // Check if all required slots are filled
      const requiredSlots = [formData.slot1Time, formData.slot2Time, formData.slot3Time, formData.slot4Time].slice(0, slotsPerDay);
      if (requiredSlots.some(s => !s)) {
        setErrorAndScroll(`Please fill in all ${slotsPerDay} time slots for auto-scheduling.`);
        return;
      }

      // Last regular match date calculation considering break days
      let dLastRegular = new Date(dOpening);
      const intermediateMatchesCount = isFourSquad ? (totalMatches - 2) : (sf1Idx - 2); // Matches before Final or Semi-Finals (excluding Opening)
      let matchesScheduled = 0;
      let dayOffset = 0;

      while (matchesScheduled < intermediateMatchesCount) {
        let checkDate = new Date(dOpening);
        checkDate.setDate(checkDate.getDate() + dayOffset);
        const dateStr = checkDate.toISOString().split('T')[0];
        
        if (!formData.breakDays.includes(dateStr)) {
          matchesScheduled += slotsPerDay;
        }
        if (matchesScheduled < intermediateMatchesCount) {
          dayOffset++;
        }
      }
      
      dLastRegular = new Date(dOpening);
      dLastRegular.setDate(dLastRegular.getDate() + dayOffset);

      // Check slot time gaps (User Requirement: 40-minute gap between slots)
      const slots = [formData.slot1Time, formData.slot2Time, formData.slot3Time, formData.slot4Time].slice(0, formData.slotsPerDay);
      
      const timeToMinutes = (t: string) => {
        const [h, m] = (t || '00:00').split(':').map(Number);
        return (h || 0) * 60 + (m || 0);
      };

      const sortedSlots = slots.map(t => ({ time: t, minutes: timeToMinutes(t) })).sort((a, b) => a.minutes - b.minutes);

      for (let i = 0; i < sortedSlots.length; i++) {
        for (let j = i + 1; j < sortedSlots.length; j++) {
          const diff = Math.abs(sortedSlots[i].minutes - sortedSlots[j].minutes);
          if (diff < 40) {
            setErrorAndScroll(`Invalid Schedule: Slots must have at least a 40-minute gap. "${sortedSlots[i].time}" and "${sortedSlots[j].time}" are too close.`);
            return;
          }
        }
      }

      if (isFourSquad) {
        // User Requirement: Final match cannot be on the same day as Regular matches or Opening match
        if (dFinal <= dLastRegular || dFinal <= dOpening) {
          setErrorAndScroll(`Invalid Schedule: Regular matches end on ${dLastRegular.toISOString().split('T')[0]}. The Final Match must be scheduled on a later date.`);
          return;
        }

        // Check for conflicts with break days
        const keyMatchDates = [openingDate, finalDate];
        const conflictDate = keyMatchDates.find(date => formData.breakDays.includes(date));
        if (conflictDate) {
          setErrorAndScroll(`Invalid Schedule: A match is scheduled on ${conflictDate}, which is marked as a Break Day. Please remove the break or change the match date.`);
          return;
        }
      } else {
        const semi1Date = formData.semiFinal1Date;
        const semi2Date = formData.semiFinal2Date;
        const dSemi1 = new Date(semi1Date);
        const dSemi2 = new Date(semi2Date);

        // User Requirement: Semi-Finals cannot be on the same day as Regular matches
        if (dSemi1 <= dLastRegular || dSemi2 <= dLastRegular) {
          setErrorAndScroll(`Invalid Schedule: Regular matches end on ${dLastRegular.toISOString().split('T')[0]}. Semi-Finals must be scheduled on a later date.`);
          return;
        }

        // User Requirement: Final match cannot be on the same day as Semi-Finals or Regular matches
        if (dFinal <= dSemi1 || dFinal <= dSemi2 || dFinal <= dLastRegular) {
          setErrorAndScroll('Invalid Schedule: The Final Match must be on a specific day later than both Semi-Finals and Regular matches.');
          return;
        }

        // Semi-finals can be on same day, but must be after opening
        if (openingDate === semi1Date || openingDate === semi2Date) {
          setErrorAndScroll('Invalid Schedule: Semi-Final matches must be scheduled on a date later than the Opening Match.');
          return;
        }

        // Check for conflicts with break days
        const keyMatchDates = [openingDate, semi1Date, semi2Date, finalDate];
        const conflictDate = keyMatchDates.find(date => formData.breakDays.includes(date));
        if (conflictDate) {
          setErrorAndScroll(`Invalid Schedule: A match is scheduled on ${conflictDate}, which is marked as a Break Day. Please remove the break or change the match date.`);
          return;
        }

        // If Semi-Finals are on the same day, check their time gap
        if (semi1Date === semi2Date) {
          const diff = Math.abs(timeToMinutes(formData.semiFinal1Time) - timeToMinutes(formData.semiFinal2Time));
          if (diff < 40) {
            setErrorAndScroll('Invalid Schedule: The two Semi-Final matches on the same day must have at least a 40-minute gap.');
            return;
          }
        }
      }
    }

    if (isLocalVenue) {
      if (!localVenueName.trim()) {
        setErrorAndScroll('Please enter the School / Village / Bazar / Town / Area Name.');
        return;
      }
      if (!localUpazilaDistrict.trim()) {
        setErrorAndScroll('Please enter the Upazila & District Name.');
        return;
      }
    }

    if (accessType === 'code' && !accessCode.trim()) {
      setErrorAndScroll('Please specify a secret Access Code / PIN for this league, or click Auto-Generate.');
      return;
    }

    // Check tokens (Need deposit percentage of prize pool, min 10%)
    const minTokens = Math.floor(formData.prizePool * 0.10);
    if (tokens < minTokens) {
      setErrorAndScroll(`You need at least ${minTokens} tokens (10% of Prize Pool) to transfer to your Host Wallet and generate this league.`);
      return;
    }

    // Open the Token Transfer Confirmation modal with default 10%
    setDepositPercentage(10);
    setTransferError('');
    setShowTransferModal(true);
  };

  const handleConfirmTransferAndGenerate = async () => {
    const requiredTokens = Math.floor(formData.prizePool * (depositPercentage / 100));
    if (tokens < requiredTokens) {
      setTransferError(`Not enough tokens in your Token Wallet. You need ${requiredTokens} tokens (${depositPercentage}% of Prize Pool).`);
      return;
    }

    setIsTransferring(true);
    setTransferError('');

    try {
      const colors = ['#8b5cf6', '#3b82f6', '#f59e0b', '#10b981', '#3b82f6', '#ef4444'];
      const randomColor = colors[Math.floor(Math.random() * colors.length)];
      
      let newLeague: any = null;

      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userProfile.userId);
        const hostBrandRef = doc(db, 'host_brands', hostId);
        const hostWalletRef = doc(db, 'host_wallets', hostId);
        
        // Get total number of leagues for the ID generation
        const leaguesQuery = query(collection(db, 'pro_hosted_leagues'));
        const leaguesSnap = await getDocs(leaguesQuery);
        const totalLeagues = leaguesSnap.size;
        
        // Generate custom ID based on: YYYY(year)M(month)D(date)HHMMSS(time) + totalCount
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        const date = now.getDate();
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const customLeagueId = `${year}${month}${date}${hours}${minutes}${seconds}${totalLeagues + 1}`;
        const leagueRef = doc(db, 'pro_hosted_leagues', customLeagueId);

        const currentSeasonInt = Number(formData.seasonNumber) || 1;

        // Fetch current user and host wallet states to guarantee consistency
        const userSnap = await transaction.get(userRef);
        const hostWalletSnap = await transaction.get(hostWalletRef);

        if (userSnap.exists()) {
          const userData = userSnap.data();
          if (userData.isHostSuspended) {
            const isLifetime = userData.hostSuspensionIsLifetime;
            const until = userData.hostSuspensionUntil;
            if (isLifetime || !until || new Date(until).getTime() > Date.now()) {
              throw new Error(`Your host account is currently suspended (${userData.hostSuspensionReason || 'Account suspended'}). You cannot generate new leagues.`);
            }
          }
        }

        const currentTokens = userSnap.exists() ? (Number(userSnap.data().tokens) || 0) : tokens;
        const currentWalletBal = hostWalletSnap.exists() ? (Number(hostWalletSnap.data().balance) || 0) : 0;

        if (currentTokens < requiredTokens) {
          throw new Error("Insufficient tokens in your Token Wallet.");
        }

        // 1. Deduct 10% from main Token Wallet
        transaction.update(userRef, {
          tokens: currentTokens - requiredTokens,
          lastSeasonNumber: currentSeasonInt
        });

        // 2. Add to Host Wallet and Lock it
        transaction.set(hostWalletRef, {
          hostId,
          balance: currentWalletBal + requiredTokens,
          isLocked: true,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        // 3. Update last season in host brand
        transaction.set(hostBrandRef, {
          hostId,
          lastSeasonNumber: currentSeasonInt,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // Add initial deposit to league wallet history
        const historyRef = doc(collection(db, 'pro_host_wallet_history'));
        transaction.set(historyRef, {
          leagueId: customLeagueId,
          hostId: userProfile.userId,
          type: 'income',
          amount: requiredTokens,
          balanceAfter: requiredTokens,
          description: `League generation security deposit (${depositPercentage}% of prize pool)`,
          userName: 'System',
          createdAt: serverTimestamp()
        });

        // 4. Create pending league document
        const leagueData: Omit<ProHostedLeague, 'id'> = {
          leagueNumber: customLeagueId,
          hostId: userProfile.userId,
          hostName: userProfile.displayName || '',
          hostEmail: userProfile.email || '',
          hostPhotoUrl: brandLogoUrl || userProfile.photoURL || '',
          hostUpazila: userProfile.upazila || '',
          hostDistrict: userProfile.district || '',
          hostDivision: userProfile.division || '',
          brandName: brandName || formData.brandName,
          logoUrl: brandLogoUrl,
          antiDopingCertificateUrl: antiDopingCertUrl || '',
          antiDopingStatus: antiDopingCertUrl ? 'submitted' : 'missing',
          antiDopingNote: antiDopingCertUrl ? '' : 'Anti-doping certificate missing',
          leagueName: formData.leagueName,
          seasonNumber: formData.seasonNumber,
          cardColor: randomColor,
          game: 'Free Fire CS',
          squadSize: formData.squadSize,
          entryFee: formData.entryFee,
          prizePool: formData.prizePool,
          championPrize: formData.championPrize,
          runnerUpPrize: formData.runnerUpPrize,
          top3Prizes: [formData.topRank1Prize, formData.topRank2Prize, formData.topRank3Prize],
          topRank1Prize: formData.topRank1Prize,
          topRank2Prize: formData.topRank2Prize,
          topRank3Prize: formData.topRank3Prize,
          status: 'pending',
          walletTokens: requiredTokens,
          walletBalance: requiredTokens,
          walletStatus: 'locked',
          sponsorAdPricePerDay: 50,
          
          // Sponsor Details (Sponsored By)
          sponsorName: sponsorType === 'name' && formData.sponsorName ? formData.sponsorName.trim() : '',
          sponsorLogoUrl: sponsorType === 'logo' && formData.sponsorLogoUrl ? formData.sponsorLogoUrl.trim() : '',
          sponsorLinkUrl: sponsorType !== 'none' && formData.sponsorLinkUrl ? formData.sponsorLinkUrl.trim() : '',

          autoGenerateSchedule: scheduleMode === 'auto',
          scheduleType: scheduleMode,
          openingMatchDate: scheduleMode === 'auto' ? formData.openingMatchDate : (manualMatches[0]?.date || ''),
          openingMatchTime: scheduleMode === 'auto' ? formData.openingMatchTime : (manualMatches[0]?.time || '18:00'),
          semiFinalDate: scheduleMode === 'auto' ? (formData.semiFinal1Date || formData.semiFinal2Date || formData.semiFinalDate || '') : (manualMatches.find(m => m.matchName?.includes('Semi'))?.date || ''),
          semiFinalTime: scheduleMode === 'auto' ? (formData.semiFinal1Time || formData.semiFinalTime || '19:30') : (manualMatches.find(m => m.matchName?.includes('Semi'))?.time || '19:30'),
          semiFinal1Date: formData.semiFinal1Date,
          semiFinal1Time: formData.semiFinal1Time,
          semiFinal2Date: formData.semiFinal2Date,
          semiFinal2Time: formData.semiFinal2Time,
          finalDate: scheduleMode === 'auto' ? formData.finalDate : (manualMatches[manualMatches.length - 1]?.date || ''),
          finalTime: scheduleMode === 'auto' ? formData.finalTime : (manualMatches[manualMatches.length - 1]?.time || '20:00'),
          preferredMatchTimeRange: '18:00-23:00',
          breakDays: formData.breakDays,
          autoGeneratedSchedule: scheduleMode === 'auto' ? generateAutoScheduledMatches(
            formData.squadSize,
            formData.openingMatchDate,
            formData.openingMatchTime,
            formData.semiFinal1Date,
            formData.semiFinal1Time,
            formData.semiFinal2Date,
            formData.semiFinal2Time,
            formData.finalDate,
            formData.finalTime,
            formData.slotsPerDay,
            formData.slot1Time,
            formData.slot2Time,
            formData.slot3Time,
            formData.slot4Time,
            formData.breakDays
          ) : [],
          manualSchedule: scheduleMode === 'manual' ? manualMatches : [],
          locationRestrictionType: formData.locationRestrictionType,
          allowedDivision: formData.allowedDivision,
          allowedDistrict: formData.allowedDistrict,
          allowedUpazila: formData.allowedUpazila,
          representationRule: formData.representationRule,

          // Access Type & Privacy
          accessType: accessType,
          accessCode: accessType === 'code' ? accessCode.trim().toUpperCase() : null,
          invitedEmails: [],

          // Local / Regional Venue
          isLocalVenue: isLocalVenue,
          localVenueName: isLocalVenue ? localVenueName.trim() : null,
          localUpazilaDistrict: isLocalVenue ? localUpazilaDistrict.trim() : null,

          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };

        transaction.set(leagueRef, leagueData);
        newLeague = { id: leagueRef.id, ...leagueData };
      });

      setShowTransferModal(false);
      onLeagueGenerated(newLeague);
    } catch (err: any) {
      console.error(err);
      setTransferError(err.message || "Failed to transfer tokens and generate league.");
    } finally {
      setIsTransferring(false);
    }
  };

  const handleSubscribe = async (type: 'monthly' | 'yearly' | 'apex') => {
    if (!userProfile?.userId) {
      setError("User profile not found. Please log in.");
      throw new Error("User profile not found. Please log in.");
    }
    const cost = type === 'apex' ? subscriptionConfig.apexFee : type === 'monthly' ? subscriptionConfig.monthlyFee : subscriptionConfig.yearlyFee;
    if (tokens < cost) {
      setError(`Not enough tokens in your Token Wallet. You need ${cost} tokens.`);
      throw new Error(`Not enough tokens in your Token Wallet. You need ${cost} tokens.`);
    }
    
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userProfile.userId);
        const days = type === 'monthly' ? 30 : 365; // Apex is also yearly
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + days);
        
        transaction.update(userRef, {
          tokens: tokens - cost,
          proHostSubscription: {
            type,
            expiresAt: expiresAt.toISOString()
          }
        });
        
        const subRef = doc(collection(db, 'pro_host_subscriptions'));
        transaction.set(subRef, {
          userId: userProfile.userId,
          username: userProfile.displayName || '',
          email: userProfile.email || '',
          type,
          expiresAt: expiresAt.toISOString(),
          subscribedAt: new Date().toISOString(),
          tokensPaid: cost
        });
      });
      setShowSubModal(false);
      setSubOverrideType(type);
      setError('Subscription activated! You can now generate the league.');
    } catch (err: any) {
      setError(err.message);
      throw err;
    }
  };

  return (
    <div className={`p-4 sm:p-6 ${currentTheme.bg} rounded-2xl border ${currentTheme.border} ${currentTheme.shadow} space-y-6 transition-all duration-300 backdrop-blur-sm`}>
      <div ref={topRef} />
      {/* Header showing Host Name and Host Photo if set */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-400 hover:text-white cursor-pointer">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Generate League</span>
              {brandName && (
                <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${currentTheme.badge}`}>
                  {brandName}
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">Configure your brand & tournament parameters</p>
          </div>
        </div>

        {/* Display Host Header Badge if set */}
        {brandName ? (
          <div className={`flex items-center gap-3 bg-slate-800/80 border ${currentTheme.border} px-3.5 py-2 rounded-xl shadow-md`}>
            <img src={userProfile?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'} alt={brandName} className="w-9 h-9 rounded-lg object-cover border border-white/20 shrink-0" />
            <div>
              <div className="text-xs font-bold text-white leading-tight">{brandName}</div>
              <div className={`text-[10px] ${currentTheme.text} font-medium`}>Official Host Profile</div>
            </div>
          </div>
        ) : null}
      </div>
      
      {error && (
        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}



      <div className="space-y-4">
        {/* League Name - Full Width Row */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="block text-xs font-medium text-slate-400">League Name</label>
            <span className="text-[10px] text-slate-400">{formData.leagueName.length}/30</span>
          </div>
          <input 
            type="text" 
            maxLength={30}
            value={formData.leagueName}
            onChange={e => {
              const sanitized = e.target.value.replace(/[^\p{L}\p{M}\p{N} ]/gu, '').slice(0, 30);
              setFormData({...formData, leagueName: sanitized});
            }}
            className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
            placeholder='e.g. "Rural Warriors League" or "চান্দিনা উপজেলা লিগ"'
          />
          <p className="text-[10px] text-slate-400 mt-1">* Max 30 characters. English & Bangla supported.</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-medium text-slate-400">League Number</label>
              <span className="text-[10px] text-cyan-400 font-mono font-semibold">Auto League #{formData.seasonNumber}</span>
            </div>
            <input 
              type="text" 
              value={`League #${formData.seasonNumber}`}
              disabled
              readOnly
              className="w-full bg-slate-800/50 border border-white/5 rounded-lg px-3 py-2 text-slate-400 font-bold text-sm cursor-not-allowed outline-none select-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">* League number auto-generates sequentially.</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Squads</label>
            <select 
              value={formData.squadSize}
              onChange={e => {
                const newSize = Number(e.target.value);
                setFormData(prev => ({ ...prev, squadSize: newSize }));
                setManualMatches(prev => generateMatchListForSquads(newSize, prev));
              }}
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-sm outline-none focus:border-white/30"
            >
              <option value={4}>4 Squads (7 Matches - 1 Group x 6 Matches + Final - Free for Anyone)</option>
              <option value={8}>8 Squads (15 Matches - 2 Groups x 6 Matches + Knockout)</option>
              <option value={16}>16 Squads (31 Matches - 4 Groups x 6 Matches + Knockout)</option>
              <option value={32}>32 Squads (63 Matches - 8 Groups x 6 Matches + Knockout - Yearly Sub required)</option>
              <option value={64}>64 Squads (127 Matches - 16 Groups x 6 Matches + Knockout - Apex Subscription Only)</option>
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1">Game</label>
          <input 
            type="text" 
            value="Free Fire CS"
            disabled
            className="w-full bg-slate-800/50 border border-white/5 rounded-lg px-3 py-2 text-slate-500 text-sm cursor-not-allowed"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Prize Pool (Tokens)</label>
            <input 
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.prizePool}
              onChange={e => handlePrizePoolChange(e.target.value)}
              onFocus={e => e.target.select()}
              onClick={e => (e.target as HTMLInputElement).select()}
              className={`w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 ${currentTheme.text} font-bold text-sm outline-none focus:border-white/30`}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Entry Fee (Tokens)</label>
            <input 
              type="text" 
              inputMode="numeric"
              pattern="[0-9]*"
              value={formData.entryFee}
              onChange={e => setFormData({...formData, entryFee: sanitizeTokenInput(e.target.value)})}
              onFocus={e => e.target.select()}
              onClick={e => (e.target as HTMLInputElement).select()}
              className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white font-medium text-sm outline-none focus:border-white/30"
            />
          </div>
        </div>

        {/* Prize Breakdown (Tokens) */}
        <div className={`p-4 bg-slate-900/80 border ${currentTheme.border} rounded-xl space-y-3 mx-auto`}>
          <div className="flex items-center justify-between">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${currentTheme.text} flex items-center gap-1.5`}>
              <Coins className="w-4 h-4 text-amber-400" />
              <span>Prize Distribution (Tokens)</span>
            </h3>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-0.5 rounded font-mono border border-white/5">
              Allocated: {formData.championPrize + formData.runnerUpPrize + formData.topRank1Prize + formData.topRank2Prize + formData.topRank3Prize} / {formData.prizePool}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                🏆 Champion Tokens
              </label>
              <input 
                type="text" 
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.championPrize}
                onChange={e => updateIndividualPrize('championPrize', e.target.value)}
                onFocus={e => e.target.select()}
                onClick={e => (e.target as HTMLInputElement).select()}
                className="w-full bg-slate-800 border border-yellow-500/30 rounded-lg px-3 py-2 text-yellow-400 font-bold text-sm outline-none focus:border-yellow-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                🥈 Runner-Up Tokens
              </label>
              <input 
                type="text" 
                inputMode="numeric"
                pattern="[0-9]*"
                value={formData.runnerUpPrize}
                onChange={e => updateIndividualPrize('runnerUpPrize', e.target.value)}
                onFocus={e => e.target.select()}
                onClick={e => (e.target as HTMLInputElement).select()}
                className="w-full bg-slate-800 border border-slate-400/30 rounded-lg px-3 py-2 text-slate-200 font-bold text-sm outline-none focus:border-slate-300"
              />
            </div>
          </div>

          <div className="pt-2 border-t border-white/5">
            <p className="text-[11px] font-semibold text-slate-400 mb-2">Top Rank Player Prizes (Tokens)</p>
            <div className="grid grid-cols-3 gap-2">
              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">Top Rank 1 Player</label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.topRank1Prize}
                  onChange={e => updateIndividualPrize('topRank1Prize', e.target.value)}
                  onFocus={e => e.target.select()}
                  onClick={e => (e.target as HTMLInputElement).select()}
                  className="w-full bg-slate-800 border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-cyan-400 font-bold text-xs outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">Top Rank 2 Player</label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.topRank2Prize}
                  onChange={e => updateIndividualPrize('topRank2Prize', e.target.value)}
                  onFocus={e => e.target.select()}
                  onClick={e => (e.target as HTMLInputElement).select()}
                  className="w-full bg-slate-800 border border-cyan-500/30 rounded-lg px-2.5 py-1.5 text-cyan-400 font-bold text-xs outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-medium text-slate-400 mb-1">Top Rank 3 Player</label>
                <input 
                  type="text" 
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={formData.topRank3Prize}
                  onChange={e => updateIndividualPrize('topRank3Prize', e.target.value)}
                  onFocus={e => e.target.select()}
                  onClick={e => (e.target as HTMLInputElement).select()}
                  className="w-full bg-slate-800 border border-amber-500/30 rounded-lg px-2.5 py-1.5 text-amber-400 font-bold text-xs outline-none focus:border-amber-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* League Sponsor Details (Optional) */}
        <div className={`p-4 bg-slate-900/80 border ${currentTheme.border} rounded-xl space-y-3 mx-auto`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${currentTheme.text} flex items-center gap-1.5`}>
              <Zap className="w-4 h-4 text-amber-400" />
              <span>Sponsor / Sponsored By (Optional)</span>
            </h3>
            <span className="text-[10px] font-mono text-amber-400/80 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              Optional
            </span>
          </div>
          <p className="text-[11px] text-slate-400">
            Select an option below if this league is sponsored by an individual or company. You can choose to display either a <strong>Brand Name</strong> or a <strong>Brand Logo</strong>. Clicking the sponsor on the card will open their website or Facebook page.
          </p>

          {/* Option Selector: No Sponsor vs Brand Name vs Brand Logo */}
          <div className="grid grid-cols-3 gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSponsorType('none')}
              className={`py-2 px-2 sm:px-3 rounded-lg text-xs font-bold transition-all border ${
                sponsorType === 'none'
                  ? 'bg-slate-800 text-white border-white/40 shadow-md'
                  : 'bg-slate-950/60 text-slate-400 border-white/10 hover:border-white/20'
              }`}
            >
              No Sponsor
            </button>

            <button
              type="button"
              onClick={() => setSponsorType('name')}
              className={`py-2 px-2 sm:px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                sponsorType === 'name'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'bg-slate-950/60 text-slate-400 border-white/10 hover:border-white/20'
              }`}
            >
              <span>Brand Name</span>
            </button>

            <button
              type="button"
              onClick={() => setSponsorType('logo')}
              className={`py-2 px-2 sm:px-3 rounded-lg text-xs font-bold transition-all border flex items-center justify-center gap-1 ${
                sponsorType === 'logo'
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/60 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                  : 'bg-slate-950/60 text-slate-400 border-white/10 hover:border-white/20'
              }`}
            >
              <span>Brand Logo</span>
            </button>
          </div>

          {/* Option 1: Sponsor Brand Name */}
          {sponsorType === 'name' && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-medium text-slate-300">Sponsor / Brand Name</label>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {formData.sponsorName.length}/30
                    </span>
                  </div>
                  <input 
                    type="text"
                    maxLength={30}
                    value={formData.sponsorName}
                    onChange={e => {
                      const sanitized = e.target.value.replace(/[^a-zA-Z\u0980-\u09E5\u09F0-\u09FF\s]/g, '').slice(0, 30);
                      setFormData({ ...formData, sponsorName: sanitized });
                    }}
                    placeholder="e.g. জামাল ফ্যাশন হাউস / কামাল খান দুবাই প্রবাসী"
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-amber-500/50"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Only English and Bangla letters & spaces are allowed (max 30 letters).
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Facebook Page / Website / Profile Link</label>
                  <input 
                    type="url"
                    value={formData.sponsorLinkUrl}
                    onChange={e => setFormData({ ...formData, sponsorLinkUrl: e.target.value })}
                    placeholder="https://facebook.com/sponsorpage"
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-amber-500/50"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Option 2: Sponsor Brand Logo */}
          {sponsorType === 'logo' && (
            <div className="space-y-3 pt-2">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Facebook Page / Website / Profile Link</label>
                  <input 
                    type="url"
                    value={formData.sponsorLinkUrl}
                    onChange={e => setFormData({ ...formData, sponsorLinkUrl: e.target.value })}
                    placeholder="https://facebook.com/sponsorpage"
                    className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-amber-500/50"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Sponsor Brand Logo</label>
                  {formData.sponsorLogoUrl ? (
                    <div className="flex items-center justify-between gap-3 p-2.5 bg-slate-900/90 border border-amber-500/40 rounded-xl">
                      <div className="flex items-center gap-3 min-w-0">
                        <img 
                          src={formData.sponsorLogoUrl} 
                          alt="Sponsor Logo Preview" 
                          className="w-12 h-12 rounded-lg object-cover border border-amber-400/50 shadow-md bg-slate-950 shrink-0" 
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                              ✓ Logo Uploaded & Compressed (~20 KB)
                            </span>
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setFormData({ ...formData, sponsorLogoUrl: '' })}
                        className="px-2.5 py-1 bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 rounded-lg text-xs font-semibold transition-colors shrink-0 flex items-center gap-1"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Remove</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-3">
                      <label className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 border border-dashed border-white/20 rounded-xl cursor-pointer hover:border-amber-500/50 transition-colors text-xs text-slate-300 w-full sm:w-auto shrink-0">
                        <Upload className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="font-semibold">{isUploadingSponsorLogo ? 'Uploading...' : 'Upload Sponsor Logo'}</span>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleSponsorLogoUpload}
                          disabled={isUploadingSponsorLogo}
                          className="hidden" 
                        />
                      </label>

                      <div className="flex-1 w-full">
                        <input 
                          type="text" 
                          value={formData.sponsorLogoUrl}
                          onChange={e => setFormData({ ...formData, sponsorLogoUrl: e.target.value })}
                          placeholder="Or paste direct image URL (https://...)"
                          className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white text-xs outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Squad Location Restrictions */}
        <div className={`p-4 bg-slate-900/80 border ${currentTheme.border} rounded-xl space-y-3 mx-auto`}>
          <div className="flex items-center justify-between mb-1">
            <h3 className={`text-xs font-bold uppercase tracking-wider ${currentTheme.text} flex items-center gap-1.5`}>
              <MapPin className="w-4 h-4 text-emerald-400" />
              <span>Squad Location Restrictions</span>
            </h3>
          </div>
          
          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-medium text-slate-300 mb-1">
                Allowed Region for Squads
              </label>
              <select
                value={formData.locationRestrictionType}
                onChange={e => {
                  const type = e.target.value as any;
                  setFormData(prev => ({
                    ...prev,
                    locationRestrictionType: type,
                    allowedDivision: type === 'all_bangladesh' ? '' : prev.allowedDivision,
                    allowedDistrict: (type === 'all_bangladesh' || type === 'specific_division') ? '' : prev.allowedDistrict,
                    allowedUpazila: type === 'specific_upazila' ? prev.allowedUpazila : '',
                    representationRule: type === 'all_bangladesh' ? 'any' : prev.representationRule
                  }));
                }}
                className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white font-medium text-sm outline-none focus:border-emerald-500/50"
              >
                <option value="all_bangladesh">Anywhere in Bangladesh</option>
                <option value="specific_division">Specific Division Only</option>
                <option value="specific_district">Specific District Only</option>
                <option value="specific_upazila">Specific Upazila Only</option>
              </select>
            </div>

            {formData.locationRestrictionType !== 'all_bangladesh' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-950/50 rounded-lg border border-white/5">
                <div>
                  <label className="block text-[10px] font-medium text-slate-400 mb-1">Select Division</label>
                  <select
                    value={formData.allowedDivision}
                    onChange={e => {
                      const div = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        allowedDivision: div,
                        allowedDistrict: '',
                        allowedUpazila: ''
                      }));
                    }}
                    className="w-full bg-slate-900 border border-white/10 rounded-md px-2.5 py-1.5 text-white font-medium text-xs outline-none focus:border-emerald-500/50"
                  >
                    <option value="">-- Choose Division --</option>
                    {BANGLADESH_DIVISIONS.map(d => (
                      <option key={d.name} value={d.name}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {(formData.locationRestrictionType === 'specific_district' || formData.locationRestrictionType === 'specific_upazila') && (
                  <div>
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">Select District</label>
                    <select
                      value={formData.allowedDistrict}
                      onChange={e => {
                        setFormData(prev => ({
                          ...prev,
                          allowedDistrict: e.target.value,
                          allowedUpazila: ''
                        }));
                      }}
                      disabled={!formData.allowedDivision}
                      className="w-full bg-slate-900 border border-white/10 rounded-md px-2.5 py-1.5 text-white font-medium text-xs outline-none focus:border-emerald-500/50 disabled:opacity-50"
                    >
                      <option value="">-- Choose District --</option>
                      {formData.allowedDivision && BANGLADESH_DIVISIONS.find(d => d.name === formData.allowedDivision)?.districts.map(dist => (
                        <option key={dist} value={dist}>{dist}</option>
                      ))}
                    </select>
                  </div>
                )}

                {formData.locationRestrictionType === 'specific_upazila' && (
                  <div className="sm:col-span-2">
                    <label className="block text-[10px] font-medium text-slate-400 mb-1">Select Upazila</label>
                    <select
                      value={formData.allowedUpazila}
                      onChange={e => setFormData(prev => ({ ...prev, allowedUpazila: e.target.value }))}
                      disabled={!formData.allowedDistrict}
                      className="w-full bg-slate-900 border border-white/10 rounded-md px-2.5 py-1.5 text-white font-medium text-xs outline-none focus:border-emerald-500/50 disabled:opacity-50"
                    >
                      <option value="">-- Choose Upazila --</option>
                      {formData.allowedDistrict && BANGLADESH_UPAZILAS_BY_DISTRICT[formData.allowedDistrict]?.map(upa => (
                        <option key={upa} value={upa}>{upa}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}

            {formData.locationRestrictionType !== 'specific_upazila' && (
              <div>
                <label className="block text-[11px] font-medium text-slate-300 mb-1">
                  Representation Rule
                </label>
                <select
                  value={formData.representationRule}
                  onChange={e => setFormData(prev => ({ ...prev, representationRule: e.target.value as any }))}
                  className="w-full bg-slate-800 border border-white/10 rounded-lg px-3 py-2 text-white font-medium text-sm outline-none focus:border-emerald-500/50"
                >
                  <option value="any">Multiple squads allowed from the same area (No Restriction)</option>
                  
                  {/* For all_bangladesh, we can restrict to one per division, district, or upazila */}
                  {formData.locationRestrictionType === 'all_bangladesh' && (
                    <>
                      <option value="one_squad_per_division">Only One Squad per Division allowed</option>
                      <option value="one_squad_per_district">Only One Squad per District allowed</option>
                      <option value="one_squad_per_upazila">Only One Squad per Upazila allowed</option>
                    </>
                  )}

                  {/* For specific_division, we can restrict to one per district, or upazila */}
                  {formData.locationRestrictionType === 'specific_division' && (
                    <>
                      <option value="one_squad_per_district">Only One Squad per District allowed</option>
                      <option value="one_squad_per_upazila">Only One Squad per Upazila allowed</option>
                    </>
                  )}
                  
                  {/* For specific_district, we can restrict to one per upazila */}
                  {formData.locationRestrictionType === 'specific_district' && (
                    <option value="one_squad_per_upazila">Only One Squad per Upazila allowed</option>
                  )}
                </select>
                <p className="text-[10px] text-slate-500 mt-1">
                  Control if multiple squads from the same internal region can join.
                </p>
              </div>
            )}

            {/* Local / Regional Venue Address Option */}
            <div className="pt-3 border-t border-slate-800/80">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isLocalVenue}
                  onChange={(e) => setIsLocalVenue(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-700 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-900"
                />
                <div>
                  <span className="text-xs font-bold text-slate-200 block">
                    Is this for a specific School / Village / Bazar / Town / Area?
                  </span>
                  <p className="text-[10.5px] text-slate-400 leading-tight mt-0.5">
                    Enable this if the league is centered in a local neighborhood, market, campus, or town area so participants can see the exact area name and district/upazila address directly under the league name.
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
                    <span>These address details will be displayed under the league title on league cards.</span>
                  </p>
                </motion.div>
              )}
            </div>

            {/* League Privacy / Access Type */}
            <div className="pt-3 border-t border-slate-800/80">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block mb-2 font-mono flex items-center justify-between">
                <span>League Access Type / Privacy</span>
                <span className="text-[10px] text-cyan-400 font-normal lowercase">
                  (controls how squads join this league)
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
                    Open to all eligible squads to join directly.
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
                    Host invites specific PlayVear IDs from league menu.
                  </p>
                </button>
              </div>

              {/* Access Code Input if accessType === 'code' */}
              {accessType === 'code' && (
                <div className="bg-amber-950/20 border border-amber-500/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10.5px] font-mono font-bold text-amber-300 uppercase block">
                      Set League Access Code / PIN
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
                      placeholder="e.g. LX8492"
                      maxLength={10}
                      className="flex-1 bg-slate-950 border border-amber-500/50 focus:border-amber-400 rounded-lg px-3 py-2 text-xs font-mono font-black tracking-widest text-amber-300 uppercase focus:outline-none"
                      required
                    />
                  </div>
                  <p className="text-[10px] text-slate-400 font-mono">
                    Squad Captains will need to enter this code when registering their squad in this league.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Match Scheduling Section */}
        <div className={`p-1.5 bg-slate-900/80 border ${currentTheme.border} rounded-lg space-y-1.5 max-w-[480px] mx-auto`}>
          {/* Header & Toggle Buttons */}
          <div>
            <div className="flex items-center justify-between mb-0.5">
              <h3 className={`text-[9.5px] font-bold uppercase tracking-wider ${currentTheme.text} flex items-center gap-1`}>
                <CalendarDays className="w-2.5 h-2.5 text-cyan-400" />
                <span>Match Scheduling Mode</span>
              </h3>
              <span className="text-[7.5px] text-slate-400 bg-slate-800 px-1 py-0.2 rounded-full font-mono border border-white/5">
                {scheduleMode === 'auto' ? '⚡ Auto Mode' : '📝 Manual Mode'}
              </span>
            </div>
            <p className="text-[8px] text-slate-400 mb-1 leading-tight">
              Choose whether to auto-generate match dates/times or set every match date and time manually.
            </p>

            {/* Two Option Buttons */}
            <div className="grid grid-cols-2 gap-1">
              <button
                type="button"
                onClick={() => setScheduleMode('auto')}
                className={`p-1 rounded-md border flex flex-col items-center justify-center gap-0.5 transition-all text-[9.5px] font-bold cursor-pointer ${
                  scheduleMode === 'auto'
                    ? 'bg-gradient-to-r from-cyan-600 via-fuchsia-500 to-cyan-600 border-cyan-400/50 text-white shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-800/80 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1 text-[8.5px]">
                  <Zap className={`w-2.5 h-2.5 ${scheduleMode === 'auto' ? 'text-yellow-300 fill-yellow-300' : 'text-slate-400'}`} />
                  <span>Auto-Schedule</span>
                </div>
                <span className="text-[7px] opacity-80 font-normal">Auto-schedule key matches & daily times</span>
              </button>

              <button
                type="button"
                onClick={() => setScheduleMode('manual')}
                className={`p-1 rounded-md border flex flex-col items-center justify-center gap-0.5 transition-all text-[9.5px] font-bold cursor-pointer ${
                  scheduleMode === 'manual'
                    ? 'bg-gradient-to-r from-cyan-600 via-fuchsia-500 to-cyan-600 border-cyan-400/50 text-white shadow-sm shadow-cyan-500/20'
                    : 'bg-slate-800/80 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1 text-[8.5px]">
                  <ListFilter className={`w-2.5 h-2.5 ${scheduleMode === 'manual' ? 'text-cyan-300' : 'text-slate-400'}`} />
                  <span>Manual Schedule</span>
                </div>
                <span className="text-[7px] opacity-80 font-normal">Individual date & time for every match</span>
              </button>
            </div>
          </div>

          {/* Auto-Schedule View */}
          {scheduleMode === 'auto' && (
            <div className="space-y-1.5 pt-1 border-t border-white/5">
              {/* Key Matches Selection */}
              <div className="bg-slate-950/60 p-1 rounded-md border border-white/5 space-y-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-[8px] font-bold text-slate-200 flex items-center gap-1 uppercase tracking-wide">
                    <Calendar className="w-2 h-2 text-cyan-400" />
                    <span>Key Matches (Calendar & Clock Selection)</span>
                  </h4>
                  <span className="text-[7px] text-slate-400 font-mono bg-slate-900 px-1 py-0.2 rounded border border-white/5">
                    {formData.squadSize <= 4 ? '7 Total Matches' : formData.squadSize <= 8 ? '15 Total Matches' : formData.squadSize <= 16 ? '31 Total Matches' : formData.squadSize <= 32 ? '63 Total Matches' : '127 Total Matches'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-0.5">
                  {/* Opening Match */}
                  <div className="bg-slate-900/90 p-0.5 rounded border border-cyan-500/20 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[8px] font-bold text-cyan-300">Opening Match</label>
                      <span className="text-[7px] bg-cyan-500/20 text-cyan-300 px-0.5 py-0.1 rounded uppercase font-semibold">Match #1</span>
                    </div>
                    <div className="grid grid-cols-2 gap-0.5">
                      <div className="flex items-center gap-0.5 bg-slate-800 px-0.5 py-0.2 rounded border border-white/10">
                        <Calendar className="w-1.5 h-1.5 text-cyan-400 shrink-0" />
                        <input
                          type="date"
                          value={formData.openingMatchDate}
                          onChange={e => setFormData({ ...formData, openingMatchDate: e.target.value })}
                          className="w-full bg-transparent text-[7.5px] text-white outline-none cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-0.5 bg-slate-800 px-0.5 py-0.2 rounded border border-white/10">
                        <Clock className="w-1.5 h-1.5 text-cyan-400 shrink-0" />
                        <input
                          type="time"
                          value={formData.openingMatchTime}
                          onChange={e => setFormData({ ...formData, openingMatchTime: e.target.value })}
                          className="w-full bg-transparent text-[7.5px] text-white outline-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Semi-Finals only for 8+ squads */}
                  {formData.squadSize > 4 && (
                    <>
                      {/* Semi-Final Match 1 */}
                      <div className="bg-slate-900/90 p-0.5 rounded border border-cyan-500/20 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-[8px] font-bold text-cyan-300">Semi-Final Match 1</label>
                          <span className="text-[7px] bg-cyan-500/20 text-cyan-300 px-0.5 py-0.1 rounded uppercase font-semibold">Match #{formData.squadSize <= 8 ? 13 : formData.squadSize <= 16 ? 29 : formData.squadSize <= 32 ? 61 : 125}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-0.5">
                          <div className="flex items-center gap-0.5 bg-slate-800 px-0.5 py-0.2 rounded border border-white/10">
                            <Calendar className="w-1.5 h-1.5 text-cyan-400 shrink-0" />
                            <input
                              type="date"
                              value={formData.semiFinal1Date}
                              onChange={e => setFormData({ ...formData, semiFinal1Date: e.target.value })}
                              className="w-full bg-transparent text-[7.5px] text-white outline-none cursor-pointer"
                            />
                          </div>
                          <div className="flex items-center gap-0.5 bg-slate-800 px-0.5 py-0.2 rounded border border-white/10">
                            <Clock className="w-1.5 h-1.5 text-cyan-400 shrink-0" />
                            <input
                              type="time"
                              value={formData.semiFinal1Time}
                              onChange={e => setFormData({ ...formData, semiFinal1Time: e.target.value })}
                              className="w-full bg-transparent text-[7.5px] text-white outline-none cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Semi-Final Match 2 */}
                      <div className="bg-slate-900/90 p-0.5 rounded border border-cyan-500/20 space-y-0.5">
                        <div className="flex items-center justify-between">
                          <label className="block text-[8px] font-bold text-cyan-300">Semi-Final Match 2</label>
                          <span className="text-[7px] bg-cyan-500/20 text-cyan-300 px-0.5 py-0.1 rounded uppercase font-semibold">Match #{formData.squadSize <= 8 ? 14 : formData.squadSize <= 16 ? 30 : formData.squadSize <= 32 ? 62 : 126}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-0.5">
                          <div className="flex items-center gap-0.5 bg-slate-800 px-0.5 py-0.2 rounded border border-white/10">
                            <Calendar className="w-1.5 h-1.5 text-cyan-400 shrink-0" />
                            <input
                              type="date"
                              value={formData.semiFinal2Date}
                              onChange={e => setFormData({ ...formData, semiFinal2Date: e.target.value })}
                              className="w-full bg-transparent text-[7.5px] text-white outline-none cursor-pointer"
                            />
                          </div>
                          <div className="flex items-center gap-0.5 bg-slate-800 px-0.5 py-0.2 rounded border border-white/10">
                            <Clock className="w-1.5 h-1.5 text-cyan-400 shrink-0" />
                            <input
                              type="time"
                              value={formData.semiFinal2Time}
                              onChange={e => setFormData({ ...formData, semiFinal2Time: e.target.value })}
                              className="w-full bg-transparent text-[7.5px] text-white outline-none cursor-pointer"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}

                  {/* Final Match */}
                  <div className="bg-slate-900/90 p-0.5 rounded border border-amber-500/20 space-y-0.5">
                    <div className="flex items-center justify-between">
                      <label className="block text-[8px] font-bold text-amber-300">Final Match</label>
                      <span className="text-[7px] bg-amber-500/20 text-amber-300 px-0.5 py-0.1 rounded uppercase font-semibold">Match #{formData.squadSize <= 4 ? 7 : formData.squadSize <= 8 ? 15 : formData.squadSize <= 16 ? 31 : formData.squadSize <= 32 ? 63 : 127}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-0.5">
                      <div className="flex items-center gap-0.5 bg-slate-800 px-0.5 py-0.2 rounded border border-white/10">
                        <Calendar className="w-1.5 h-1.5 text-amber-400 shrink-0" />
                        <input
                          type="date"
                          value={formData.finalDate}
                          onChange={e => setFormData({ ...formData, finalDate: e.target.value })}
                          className="w-full bg-transparent text-[7.5px] text-white outline-none cursor-pointer"
                        />
                      </div>
                      <div className="flex items-center gap-0.5 bg-slate-800 px-0.5 py-0.2 rounded border border-white/10">
                        <Clock className="w-1.5 h-1.5 text-amber-400 shrink-0" />
                        <input
                          type="time"
                          value={formData.finalTime}
                          onChange={e => setFormData({ ...formData, finalTime: e.target.value })}
                          className="w-full bg-transparent text-[7.5px] text-white outline-none cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Days Span Summary Banner */}
                {formData.openingMatchDate && (formData.squadSize <= 4 ? formData.finalDate : formData.semiFinal1Date) && (
                  <div className="bg-cyan-950/40 border border-cyan-500/30 rounded p-1 flex items-center justify-between text-[8.5px] text-cyan-200">
                    <div className="flex items-center gap-1">
                      <Zap className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                      <span>
                        <strong>{calculateDaysBetween(formData.openingMatchDate, formData.squadSize <= 4 ? formData.finalDate : formData.semiFinal1Date)} Days Span</strong> between Opening Match and {formData.squadSize <= 4 ? 'Final Match' : 'Semi-Finals'}
                      </span>
                    </div>
                    <span className="text-[7.5px] bg-cyan-600/30 px-1 py-0.2 rounded-full font-mono text-cyan-300 border border-cyan-400/20">
                      Auto-Spreading Matches
                    </span>
                  </div>
                )}
              </div>

              {/* Number of Slots & Slot Times Config */}
              <div className="bg-slate-950/60 p-1 rounded-md border border-white/5 space-y-1">
                <div className="flex items-center justify-between gap-1">
                  <div>
                    <h4 className="text-[8.5px] font-bold text-slate-200 flex items-center gap-1 uppercase tracking-wide">
                      <Clock className="w-2 h-2 text-amber-400" />
                      <span>Daily Match Slots & Gap Configuration</span>
                    </h4>
                    <p className="text-[7.5px] text-slate-400 leading-none">
                      Configure the number of slots per day and time for each slot.
                    </p>
                  </div>

                  {/* Match Gap Picker */}
                  <div className="flex items-center gap-0.5 bg-slate-900 border border-white/10 px-1 py-0.2 rounded shrink-0">
                    <span className="text-[7.5px] text-slate-400">Gap:</span>
                    <select
                      value={formData.matchGapMinutes}
                      onChange={e => setFormData({ ...formData, matchGapMinutes: Number(e.target.value) })}
                      className="bg-transparent text-[8px] text-white font-semibold outline-none cursor-pointer"
                    >
                      <option value={60}>60 Mins (1h)</option>
                      <option value={90}>90 Mins (1.5h)</option>
                      <option value={120}>120 Mins (2h)</option>
                    </select>
                  </div>
                </div>

                {/* Break Days Management */}
                <div className="mt-1 bg-slate-900/60 p-2 rounded-lg border border-cyan-500/20 shadow-lg shadow-cyan-500/5">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <div className="p-1 bg-red-500/10 rounded">
                        <CalendarX2 className="w-3 h-3 text-red-400" />
                      </div>
                      <h4 className="text-[9px] font-bold text-white uppercase tracking-wider">Step 1: Set Break Days (No Matches)</h4>
                    </div>
                    <span className="text-[7.5px] font-bold text-cyan-400">
                      Limit: {formData.breakDays.length} / {
                        formData.squadSize <= 4 ? 2 :
                        formData.squadSize <= 8 ? 3 :
                        formData.squadSize <= 16 ? 5 :
                        formData.squadSize <= 32 ? 10 : 20
                      }
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1 mb-2">
                    {formData.breakDays.map((date, idx) => (
                      <div key={idx} className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/10 border border-red-500/20 rounded text-[7.5px] text-red-400 animate-in fade-in zoom-in duration-200">
                        <Calendar className="w-2 h-2" />
                        <span className="font-mono">{date}</span>
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, breakDays: formData.breakDays.filter((_, i) => i !== idx) })}
                          className="ml-1 p-0.2 hover:bg-red-500/20 rounded-full transition cursor-pointer"
                        >
                          <X className="w-2 h-2" />
                        </button>
                      </div>
                    ))}

                    {formData.breakDays.length < (formData.squadSize <= 4 ? 2 : formData.squadSize <= 8 ? 3 : formData.squadSize <= 16 ? 5 : formData.squadSize <= 32 ? 10 : 20) && (
                      <div className="relative group">
                        <button
                          type="button"
                          className="flex items-center gap-1 px-1.5 py-0.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 rounded text-[7.5px] text-cyan-400 transition cursor-pointer font-bold uppercase"
                        >
                          <Plus className="w-2 h-2" />
                          Add Break Day
                        </button>
                        <input
                          type="date"
                          className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                          onChange={(e) => {
                            const newDate = e.target.value;
                            if (newDate && !formData.breakDays.includes(newDate)) {
                              setFormData({ ...formData, breakDays: [...formData.breakDays, newDate].sort() });
                            }
                          }}
                        />
                      </div>
                    )}
                  </div>
                  
                  {formData.breakDays.length === 0 && (
                    <p className="text-[7px] text-slate-500 italic">No break days added. System will schedule matches consecutively.</p>
                  )}
                </div>

                {/* Slot Count Selector */}
                <div>
                  <div className="flex items-center gap-1.5 mb-1">
                    <div className="p-1 bg-cyan-500/10 rounded">
                      <Clock className="w-3 h-3 text-cyan-400" />
                    </div>
                    <h4 className="text-[9px] font-bold text-white uppercase tracking-wider">Step 2: Match Slots & Times</h4>
                  </div>
                  <label className="block text-[7.5px] font-semibold text-slate-400 mb-0.5 uppercase">
                    Number of Slots Per Day
                  </label>
                  <div className="grid grid-cols-4 gap-0.5">
                    {[1, 2, 3, 4].map(count => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setFormData({ ...formData, slotsPerDay: count })}
                        className={`py-0.2 rounded border text-[7.5px] font-bold transition cursor-pointer ${
                          formData.slotsPerDay === count
                            ? 'bg-cyan-600 border-cyan-400 text-white shadow-sm shadow-cyan-500/20'
                            : 'bg-slate-900 border-white/10 text-slate-400 hover:text-white hover:bg-slate-800'
                        }`}
                      >
                        {count} {count === 1 ? 'Slot' : 'Slots'}/Day
                      </button>
                    ))}
                  </div>
                </div>

                {/* Dynamic Slot Time Inputs */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-0.5">
                  <div>
                    <label className="block text-[7.5px] font-medium text-cyan-300 mb-0.5">Slot 1 Time</label>
                    <div className="flex items-center gap-0.5 bg-slate-900 px-0.5 py-0.2 rounded border border-white/10">
                      <Clock className="w-2 h-2 text-cyan-400 shrink-0" />
                      <input
                        type="time"
                        value={formData.slot1Time}
                        onChange={e => setFormData({ ...formData, slot1Time: e.target.value })}
                        className="w-full bg-transparent text-[8px] text-white outline-none cursor-pointer"
                      />
                    </div>
                  </div>

                  {formData.slotsPerDay >= 2 && (
                    <div>
                      <label className="block text-[7.5px] font-medium text-cyan-300 mb-0.5">Slot 2 Time</label>
                      <div className="flex items-center gap-0.5 bg-slate-900 px-0.5 py-0.2 rounded border border-white/10">
                        <Clock className="w-2 h-2 text-cyan-400 shrink-0" />
                        <input
                          type="time"
                          value={formData.slot2Time}
                          onChange={e => setFormData({ ...formData, slot2Time: e.target.value })}
                          className="w-full bg-transparent text-[8px] text-white outline-none cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {formData.slotsPerDay >= 3 && (
                    <div>
                      <label className="block text-[7.5px] font-medium text-cyan-300 mb-0.5">Slot 3 Time</label>
                      <div className="flex items-center gap-0.5 bg-slate-900 px-0.5 py-0.2 rounded border border-white/10">
                        <Clock className="w-2 h-2 text-cyan-400 shrink-0" />
                        <input
                          type="time"
                          value={formData.slot3Time}
                          onChange={e => setFormData({ ...formData, slot3Time: e.target.value })}
                          className="w-full bg-transparent text-[8px] text-white outline-none cursor-pointer"
                        />
                      </div>
                    </div>
                  )}

                  {formData.slotsPerDay >= 4 && (
                    <div>
                      <label className="block text-[7.5px] font-medium text-amber-300 mb-0.5">Slot 4 Time</label>
                      <div className="flex items-center gap-0.5 bg-slate-900 px-0.5 py-0.2 rounded border border-white/10">
                        <Clock className="w-2 h-2 text-amber-400 shrink-0" />
                        <input
                          type="time"
                          value={formData.slot4Time}
                          onChange={e => setFormData({ ...formData, slot4Time: e.target.value })}
                          className="w-full bg-transparent text-[8px] text-white outline-none cursor-pointer"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Summary Note */}
                <div className="flex items-center gap-1.5 px-2 py-1.5 bg-cyan-500/5 border border-cyan-500/10 rounded-lg">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                  <p className="text-[8px] text-cyan-400/90 uppercase font-bold tracking-wider">
                    Auto-Schedule skips defined Break Days and maintains 40min gaps.
                  </p>
                </div>
              </div>

              {/* Filled Slots Schedule Preview */}
              <div className="bg-slate-950/60 p-2 rounded-md border border-white/5 space-y-1.5 max-w-xl">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1">
                    <Layers className="w-2 h-2 text-cyan-400" />
                    <h4 className="text-[8px] font-bold text-white uppercase tracking-wide">
                      Filled Slots Schedule Preview
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFullSchedule(true)}
                    className="flex items-center gap-1 px-1.5 py-0.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded text-[7px] font-bold text-cyan-400 transition-all cursor-pointer uppercase"
                  >
                    <ListFilter className="w-2 h-2" />
                    Full Schedule
                  </button>
                </div>

                <div className="space-y-0.5 max-h-[150px] overflow-y-auto pr-1 scrollbar-thin">
                  {generateAutoScheduledMatches(
                    formData.squadSize,
                    formData.openingMatchDate,
                    formData.openingMatchTime,
                    formData.semiFinal1Date,
                    formData.semiFinal1Time,
                    formData.semiFinal2Date,
                    formData.semiFinal2Time,
                    formData.finalDate,
                    formData.finalTime,
                    formData.slotsPerDay,
                    formData.slot1Time,
                    formData.slot2Time,
                    formData.slot3Time,
                    formData.slot4Time,
                    formData.breakDays
                  ).map(match => {
                    const isKeyMatch = match.matchName.includes('Opening') || match.matchName.includes('Semi') || match.matchName.includes('Final');
                    return (
                      <div
                        key={match.matchNumber}
                        className={`py-0.2 px-0.5 rounded border flex items-center justify-between gap-1 text-[8px] transition ${
                          match.matchName.includes('Opening')
                            ? 'bg-cyan-950/40 border-cyan-500/30'
                            : match.matchName.includes('Semi')
                            ? 'bg-cyan-950/40 border-cyan-500/30'
                            : match.matchName.includes('Final')
                            ? 'bg-amber-950/40 border-amber-500/30'
                            : 'bg-slate-900/80 border-white/5 hover:border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-1 min-w-0">
                          <span className={`w-3 h-3 rounded flex items-center justify-center text-[7px] font-mono font-bold shrink-0 ${
                            isKeyMatch ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/30' : 'bg-slate-800 text-slate-300'
                          }`}>
                            #{match.matchNumber}
                          </span>
                          <div className="truncate">
                            <span className="font-bold text-white text-[8px]">{match.matchName}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-0.5 shrink-0 text-[7.5px] font-mono">
                          <span className="flex items-center gap-0.5 text-slate-300 bg-slate-800/80 px-0.5 py-0.1 rounded border border-white/5">
                            <Calendar className="w-1.5 h-1.5 text-cyan-400" />
                            {match.date || 'Pending'}
                          </span>
                          <span className="flex items-center gap-0.5 text-slate-200 bg-slate-800/80 px-0.5 py-0.1 rounded border border-white/5">
                            <Clock className="w-1.5 h-1.5 text-cyan-400" />
                            {match.time || '18:00'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Manual-Schedule View */}
          {scheduleMode === 'manual' && (
            <div className="space-y-1 pt-1 border-t border-white/5">
              <div className="flex items-center justify-between bg-slate-950/60 p-1 rounded-md border border-white/5">
                <div>
                  <span className="text-[8.5px] font-bold text-white flex items-center gap-1">
                    <Layers className="w-2 h-2 text-cyan-400" />
                    <span>Vertical Match List ({formData.squadSize} Squads)</span>
                  </span>
                  <p className="text-[7.5px] text-slate-400 leading-none">
                    Total {manualMatches.length} Matches. Set date & time for each match number on the right.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const today = new Date().toISOString().split('T')[0];
                    setManualMatches(prev => prev.map(m => ({ ...m, date: m.date || today })));
                  }}
                  className="text-[7px] bg-cyan-600/20 text-cyan-300 hover:bg-cyan-600/30 border border-cyan-500/30 px-1 py-0.2 rounded font-semibold transition cursor-pointer shrink-0"
                >
                  Fill Today's Date
                </button>
              </div>

              {/* Vertical List of Matches */}
              <div className="space-y-0.5 max-h-[600px] overflow-y-auto pr-1 scrollbar-thin">
                {manualMatches.map((m, idx) => (
                  <div
                    key={m.matchNumber}
                    className="bg-slate-950/80 border border-white/10 hover:border-cyan-500/40 rounded py-0.2 px-1 flex flex-row items-center justify-between gap-1 transition"
                  >
                    {/* Left: Match Number Badge & Stage Name */}
                    <div className="flex items-center gap-1">
                      <span className="w-3.5 h-3.5 rounded bg-cyan-600/20 border border-cyan-500/30 text-cyan-300 font-mono font-black text-[7px] flex items-center justify-center shrink-0">
                        #{m.matchNumber}
                      </span>
                      <div>
                        <h4 className="text-[8px] font-bold text-white leading-tight">{m.matchName}</h4>
                        <p className="text-[7px] text-slate-400 leading-none">Match Number {m.matchNumber}</p>
                      </div>
                    </div>

                    {/* Right: Calendar (Date) & Clock (Time) */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {/* Date / Calendar */}
                      <div className="flex items-center gap-0.5 bg-slate-900 border border-white/10 rounded px-0.5 py-0.2 focus-within:border-cyan-500 max-w-[85px]">
                        <Calendar className="w-1.5 h-1.5 text-cyan-400 shrink-0" />
                        <input
                          type="date"
                          value={m.date}
                          onChange={e => {
                            const newDate = e.target.value;
                            setManualMatches(prev =>
                              prev.map((item, i) => (i === idx ? { ...item, date: newDate } : item))
                            );
                          }}
                          className="w-[68px] bg-transparent text-[7.5px] text-white outline-none cursor-pointer font-mono"
                        />
                      </div>

                      {/* Time / Clock */}
                      <div className="flex items-center gap-0.5 bg-slate-900 border border-white/10 rounded px-0.5 py-0.2 focus-within:border-cyan-500 max-w-[58px]">
                        <Clock className="w-1.5 h-1.5 text-cyan-400 shrink-0" />
                        <input
                          type="time"
                          value={m.time}
                          onChange={e => {
                            const newTime = e.target.value;
                            setManualMatches(prev =>
                              prev.map((item, i) => (i === idx ? { ...item, time: newTime } : item))
                            );
                          }}
                          className="w-[42px] bg-transparent text-[7.5px] text-white outline-none cursor-pointer font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
        
        <button 
          onClick={handleGenerate}
          disabled={isGenerating}
          className={`w-full py-4 ${currentTheme.accentBg} rounded-xl text-white font-bold text-lg ${currentTheme.shadow} disabled:opacity-50 transition-all cursor-pointer`}
        >
          {isGenerating ? 'Generating...' : 'Generate League'}
        </button>
      </div>

      {showSubModal && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-start justify-center pt-6 sm:pt-12 pb-12 px-4 overflow-y-auto">
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#090d22] border border-cyan-500/30 rounded-2xl p-6 max-w-md w-full relative max-h-[85vh] overflow-y-auto shadow-2xl">
            <button onClick={() => setShowSubModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-white font-bold text-lg">&times;</button>
            <h3 className="text-xl font-black text-white mb-2 text-center uppercase tracking-wider font-mono">Pro Host Subscription</h3>
            <p className="text-slate-400 text-xs text-center mb-6">Select a plan to activate your league hosting features.</p>
            
            <div className="space-y-4">
              <div 
                className="p-4 border border-cyan-500/30 bg-cyan-500/10 rounded-xl flex flex-col items-center cursor-pointer hover:bg-cyan-500/20 transition" 
                onClick={() => { setPendingSubPlan('monthly'); setSubError(''); }}
              >
                <h4 className="text-white font-bold text-lg">Monthly</h4>
                <p className="text-cyan-400 font-black text-2xl my-2">{subscriptionConfig.monthlyFee} <span className="text-sm font-normal text-slate-400">Tokens</span></p>
                <ul className="text-xs text-slate-300 space-y-1 text-center">
                  <li>Generate up to 16 Squad Leagues</li>
                  <li>Auto-scheduling enabled</li>
                  <li>Custom Brand Card</li>
                </ul>
              </div>
              
              <div 
                className="p-4 border border-cyan-500/30 bg-cyan-500/10 rounded-xl flex flex-col items-center cursor-pointer hover:bg-cyan-500/20 transition relative overflow-hidden" 
                onClick={() => { setPendingSubPlan('yearly'); setSubError(''); }}
              >
                <div className="absolute top-0 right-0 bg-cyan-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">BEST VALUE</div>
                <h4 className="text-white font-bold text-lg">Yearly</h4>
                <p className="text-cyan-400 font-black text-2xl my-2">{subscriptionConfig.yearlyFee} <span className="text-sm font-normal text-slate-400">Tokens</span></p>
                <ul className="text-xs text-slate-300 space-y-1 text-center">
                  <li>Generate up to 32 Squad Leagues</li>
                  <li>All Monthly Features</li>
                  <li>Priority Support</li>
                </ul>
              </div>

              <div 
                className="p-4 border border-amber-500/30 bg-amber-500/10 rounded-xl flex flex-col items-center cursor-pointer hover:bg-amber-500/20 transition relative overflow-hidden" 
                onClick={() => { setPendingSubPlan('apex'); setSubError(''); }}
              >
                <div className="absolute top-0 right-0 bg-amber-600 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">ULTIMATE</div>
                <h4 className="text-white font-bold text-lg">Apex (Yearly)</h4>
                <p className="text-amber-400 font-black text-2xl my-2">{subscriptionConfig.apexFee} <span className="text-sm font-normal text-slate-400">Tokens</span></p>
                <ul className="text-xs text-slate-300 space-y-1 text-center">
                  <li>Generate up to 64 Squad Leagues</li>
                  <li>All Yearly Features</li>
                  <li>Premium Dedicated Support</li>
                </ul>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Subscription Confirmation Modal */}
      {pendingSubPlan && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div ref={confirmModalRef} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#090d22] border border-cyan-500/30 rounded-2xl p-6 max-w-sm w-full relative shadow-2xl">
            <h3 className="text-md font-black text-white uppercase tracking-wider font-mono mb-4 border-b border-white/10 pb-2">Confirm Subscription</h3>
            
            <div className="space-y-3 text-xs mb-5">
              <div className="flex justify-between">
                <span className="text-slate-400">Selected Plan:</span>
                <span className="text-white font-bold uppercase">{pendingSubPlan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Current Balance:</span>
                <span className="text-cyan-400 font-bold font-mono">{(typeof tokens === 'number' ? tokens : 0).toFixed(2)} Tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Subscription Cost:</span>
                <span className="text-amber-400 font-bold font-mono">
                  {pendingSubPlan === 'apex' ? subscriptionConfig.apexFee : pendingSubPlan === 'yearly' ? subscriptionConfig.yearlyFee : subscriptionConfig.monthlyFee} Tokens
                </span>
              </div>
            </div>

            {tokens < (pendingSubPlan === 'apex' ? subscriptionConfig.apexFee : pendingSubPlan === 'yearly' ? subscriptionConfig.yearlyFee : subscriptionConfig.monthlyFee) && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg mb-4 font-semibold">
                ⚠️ Warning: Insufficient wallet balance to purchase this subscription. Please buy more tokens first.
              </div>
            )}

            {subError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg mb-4 font-semibold">
                {subError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setPendingSubPlan(null)}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const cost = pendingSubPlan === 'apex' ? subscriptionConfig.apexFee : pendingSubPlan === 'yearly' ? subscriptionConfig.yearlyFee : subscriptionConfig.monthlyFee;
                  if (tokens < cost) {
                    setSubError("Warning: Insufficient balance. Buy tokens to proceed.");
                    return;
                  }
                  try {
                    await handleSubscribe(pendingSubPlan);
                    setPendingSubPlan(null);
                    setShowSubSuccessModal(true);
                  } catch (err: any) {
                    setSubError(err.message || "Failed to purchase subscription.");
                  }
                }}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition"
              >
                Confirm
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Subscription Success Modal */}
      {showSubSuccessModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#090d22] border border-green-500/30 rounded-2xl p-6 max-w-sm w-full relative shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/10 border border-green-500/25 flex items-center justify-center mx-auto mb-4 text-green-400 text-xl font-bold">✓</div>
            <h3 className="text-md font-black text-white uppercase tracking-wider font-mono mb-2">Subscription Activated!</h3>
            <p className="text-slate-400 text-xs leading-relaxed mb-6">
              Thank you for subscribing! Your Pro Host plan has been activated successfully and the transaction was secure.
            </p>
            <button
              onClick={() => {
                setShowSubSuccessModal(false);
                handleGenerate();
              }}
              className="w-full py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition"
            >
              Get Started
            </button>
          </motion.div>
        </div>
      )}

      {/* Token Transfer Confirmation Modal (Host Wallet) */}
      {showTransferModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div ref={transferModalRef} initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="bg-[#090d22] border border-cyan-500/30 rounded-2xl p-6 max-w-sm w-full relative shadow-2xl">
            <h3 className="text-md font-black text-white uppercase tracking-wider font-mono mb-3 border-b border-white/10 pb-2 flex items-center justify-between">
              <span>Host Wallet Transfer</span>
              <span className="text-[11px] font-bold text-cyan-400 font-mono bg-cyan-950/80 border border-cyan-500/40 px-2.5 py-0.5 rounded-full">
                {depositPercentage}% Security
              </span>
            </h3>
            
            <p className="text-slate-300 text-xs leading-relaxed mb-3">
              To host this league, transfer <span className="font-bold text-cyan-400">{depositPercentage}% of the prize pool</span> to your <span className="font-bold text-cyan-400">Host Wallet</span> as security (10% to 100%).
            </p>

            {/* Percentage Selector Control */}
            <div className="bg-slate-900/90 p-3 rounded-xl border border-cyan-500/20 mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 font-mono uppercase">Security Deposit %</span>
                <span className="text-xs font-black text-cyan-400 font-mono">{depositPercentage}% of Prize Pool</span>
              </div>

              {/* Stepper Buttons and Quick Increment */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setDepositPercentage(prev => Math.max(10, prev - 10))}
                  disabled={depositPercentage <= 10}
                  className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-30 border border-white/10 rounded-lg text-slate-200 text-xs font-bold font-mono flex items-center justify-center gap-1 transition"
                  title="Decrease 10%"
                >
                  <Minus className="w-3.5 h-3.5 text-slate-400" />
                  <span>-10%</span>
                </button>

                <div className="px-3 py-1 bg-cyan-950/80 border border-cyan-500/40 rounded-lg text-sm font-black text-cyan-300 font-mono min-w-[54px] text-center">
                  {depositPercentage}%
                </div>

                <button
                  type="button"
                  onClick={() => setDepositPercentage(prev => Math.min(100, prev + 10))}
                  disabled={depositPercentage >= 100}
                  className="flex-1 py-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 disabled:opacity-30 border border-cyan-500/40 rounded-lg text-cyan-300 text-xs font-black font-mono flex items-center justify-center gap-1 transition shadow-[0_0_10px_rgba(6,182,212,0.15)]"
                  title="Increase 10%"
                >
                  <Plus className="w-3.5 h-3.5 text-cyan-400" />
                  <span>+10%</span>
                </button>
              </div>

              {/* Quick Preset Buttons */}
              <div className="grid grid-cols-5 gap-1 pt-1 border-t border-white/5">
                {[10, 25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setDepositPercentage(pct)}
                    className={`py-1 rounded text-[10px] font-mono font-bold transition ${
                      depositPercentage === pct
                        ? 'bg-cyan-500 text-black font-black shadow-[0_0_8px_rgba(6,182,212,0.4)]'
                        : 'bg-slate-950 hover:bg-slate-800 text-slate-400 border border-white/5'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-950/80 p-3.5 rounded-xl border border-white/5 space-y-2 mb-3 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Prize Pool:</span>
                <span className="text-white font-bold">{formData.prizePool} Tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Transfer Fee ({depositPercentage}%):</span>
                <span className="text-cyan-400 font-bold">{Math.floor(formData.prizePool * (depositPercentage / 100))} Tokens</span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-2">
                <span className="text-slate-400">Your Token Balance:</span>
                <span className="text-amber-400 font-bold">{(typeof tokens === 'number' ? tokens : 0).toFixed(2)} Tokens</span>
              </div>
            </div>

            <div className="flex justify-center mb-3">
              <button
                type="button"
                onClick={() => setShowFullSchedule(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-[10px] font-black text-cyan-400 uppercase italic transition-all cursor-pointer"
              >
                <CalendarDays className="w-3 h-3" />
                Review Full Schedule
              </button>
            </div>

            <p className="text-[10px] text-red-400 bg-red-500/5 border border-red-500/10 p-2.5 rounded-lg leading-relaxed mb-3">
              ⚠️ Note: This Host Wallet will be <span className="font-bold">LOCKED</span> upon transfer. It cannot be withdrawn until approved or unlocked by the System Admin.
            </p>

            {tokens < Math.floor(formData.prizePool * (depositPercentage / 100)) && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg mb-3 font-semibold">
                ⚠️ Warning: Your balance is too low for this {depositPercentage}% transfer ({Math.floor(formData.prizePool * (depositPercentage / 100))} Tokens needed).
              </div>
            )}

            {transferError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg mb-3 font-semibold">
                {transferError}
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => setShowTransferModal(false)}
                disabled={isTransferring}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmTransferAndGenerate}
                disabled={isTransferring || tokens < Math.floor(formData.prizePool * (depositPercentage / 100))}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition flex items-center justify-center gap-1.5 disabled:opacity-50 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                {isTransferring ? 'Transferring...' : 'Confirm'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* Full Screen Schedule Modal */}
      {showFullSchedule && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl p-4 md:p-8 flex flex-col overflow-hidden"
        >
          <div className="max-w-5xl mx-auto w-full flex flex-col h-full">
            <div className="flex items-center justify-between mb-6 border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-cyan-500/20 rounded-xl">
                  <CalendarDays className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-black text-white uppercase tracking-tighter italic">VORTEX <span className="text-cyan-400">LEAGUE SCHEDULE</span></h2>
                  <p className="text-slate-400 text-xs md:text-sm">Complete match listing for the upcoming league</p>
                </div>
              </div>
              <button 
                onClick={() => setShowFullSchedule(false)}
                className="p-2 hover:bg-white/10 rounded-full transition-colors group cursor-pointer"
              >
                <X className="w-6 h-6 text-white group-hover:text-red-400 transition-colors" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
              {(scheduleMode === 'auto' ? generateAutoScheduledMatches(
                formData.squadSize,
                formData.openingMatchDate,
                formData.openingMatchTime,
                formData.semiFinal1Date,
                formData.semiFinal1Time,
                formData.semiFinal2Date,
                formData.semiFinal2Time,
                formData.finalDate,
                formData.finalTime,
                formData.slotsPerDay,
                formData.slot1Time,
                formData.slot2Time,
                formData.slot3Time,
                formData.slot4Time,
                formData.breakDays
              ) : manualMatches).reduce((acc: any[], match: any) => {
                const date = match.date;
                const existing = acc.find(g => g.date === date);
                if (existing) {
                  existing.matches.push(match);
                } else {
                  acc.push({ date, matches: [match] });
                }
                return acc;
              }, []).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).map((group, gIdx) => (
                <div key={gIdx} className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
                  <div className="bg-white/5 px-4 py-2 border-b border-white/10 flex items-center justify-between">
                    <span className="text-xs font-bold text-cyan-400 uppercase tracking-widest flex items-center gap-2">
                      <Calendar className="w-3 h-3" />
                      {new Date(group.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono italic">Matches: {group.matches.length}</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-white/5">
                    {group.matches.map((match: any, mIdx: number) => {
                      const isKeyMatch = match.matchName.includes('Opening') || match.matchName.includes('Semi') || match.matchName.includes('Final');
                      return (
                        <div key={mIdx} className={`p-4 flex items-center justify-between bg-[#04060e] hover:bg-white/[0.02] transition-colors ${isKeyMatch ? 'border-l-2 border-cyan-500' : ''}`}>
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center font-mono text-sm font-bold text-slate-400">
                              #{match.matchNumber}
                            </div>
                            <div>
                              <h4 className={`text-sm font-bold uppercase tracking-tight ${isKeyMatch ? 'text-cyan-400' : 'text-white'}`}>
                                {match.matchName}
                              </h4>
                              <div className="flex items-center gap-2 mt-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                <span className="text-xs text-slate-400 font-mono tracking-wider">{match.time}</span>
                              </div>
                            </div>
                          </div>
                          {isKeyMatch && (
                            <div className="px-2 py-1 bg-cyan-500/10 border border-cyan-500/20 rounded text-[10px] font-black text-cyan-400 uppercase italic">
                              Prime Slot
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 flex items-center justify-between text-slate-500">
              <p className="text-xs">Generated by Vortex Tournament Engine</p>
              <div className="flex items-center gap-4 text-[10px] uppercase font-bold tracking-widest">
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-cyan-500" /> Standard Match</span>
                <span className="flex items-center gap-1.5"><div className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Key Event</span>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
}
