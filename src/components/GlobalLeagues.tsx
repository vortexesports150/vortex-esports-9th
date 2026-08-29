import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, Shield, ShieldCheck, Calendar, Users, Star, Lock, ChevronLeft, ChevronRight, Layers, Zap, Clock, Eye, EyeOff, MoreVertical, MapPin, Key, Mail, Send, Trash2, Copy, Check, CheckCircle2, AlertTriangle, X, Globe, BookOpen, Youtube } from 'lucide-react';
import { LeagueScheduleView } from './LeagueScheduleView';
import { db } from '../lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, deleteDoc, getDocs, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { ProHostedLeague } from '../types';
import { HostProfileModal } from './HostProfileModal';
import { HostFollowButton } from './HostFollowButton';
import { hasOpeningMatchStarted } from '../lib/dateUtils';
import { checkAndCancelUnderfundedLeague } from '../lib/leagueAutoCancel';

import { UserProfile } from '../types';
import { getHostThemeIndex } from './ProHostPanel';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface GlobalLeaguesProps {
  userProfile: UserProfile | null;
  tokens: number;
  setTokens: (v: number | ((prev: number) => number)) => void;
  onViewMySquad?: () => void;
  navigationContext?: any;
  onBackToInbox?: () => void;
  onTagMatchForPulse?: (match: any) => void;
}

const ITEMS_PER_PAGE = 10;

const NEON_THEMES = [
  {
    borderColor: 'border-cyan-500/40 hover:border-cyan-400/70',
    accentText: 'text-cyan-300',
    topLineGradient: 'from-cyan-400 via-cyan-400 via-[80%] to-fuchsia-500',
    glowRgb: '6, 182, 212',
    badgeBg: 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/15 to-fuchsia-500/15 text-cyan-300 border-cyan-500/40',
    iconColor: 'text-cyan-400'
  },
  {
    borderColor: 'border-cyan-500/40 hover:border-cyan-400/70',
    accentText: 'text-cyan-300',
    topLineGradient: 'from-cyan-400 via-cyan-400 via-[80%] to-pink-500',
    glowRgb: '6, 182, 212',
    badgeBg: 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/15 to-pink-500/15 text-cyan-300 border-cyan-500/40',
    iconColor: 'text-cyan-400'
  },
  {
    borderColor: 'border-cyan-500/40 hover:border-cyan-400/70',
    accentText: 'text-cyan-300',
    topLineGradient: 'from-cyan-400 via-cyan-400 via-[80%] to-fuchsia-500',
    glowRgb: '6, 182, 212',
    badgeBg: 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/15 to-fuchsia-500/15 text-cyan-300 border-cyan-500/40',
    iconColor: 'text-cyan-400'
  },
  {
    borderColor: 'border-cyan-500/40 hover:border-cyan-400/70',
    accentText: 'text-cyan-300',
    topLineGradient: 'from-cyan-400 via-cyan-400 via-[80%] to-pink-500',
    glowRgb: '6, 182, 212',
    badgeBg: 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/15 to-pink-500/15 text-cyan-300 border-cyan-500/40',
    iconColor: 'text-cyan-400'
  },
  {
    borderColor: 'border-cyan-500/40 hover:border-cyan-400/70',
    accentText: 'text-cyan-300',
    topLineGradient: 'from-cyan-400 via-cyan-400 via-[80%] to-fuchsia-500',
    glowRgb: '6, 182, 212',
    badgeBg: 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/15 to-fuchsia-500/15 text-cyan-300 border-cyan-500/40',
    iconColor: 'text-cyan-400'
  },
  {
    borderColor: 'border-cyan-500/40 hover:border-cyan-400/70',
    accentText: 'text-cyan-300',
    topLineGradient: 'from-cyan-400 via-cyan-400 via-[80%] to-pink-500',
    glowRgb: '6, 182, 212',
    badgeBg: 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/15 to-pink-500/15 text-cyan-300 border-cyan-500/40',
    iconColor: 'text-cyan-400'
  },
  {
    borderColor: 'border-cyan-500/40 hover:border-cyan-400/70',
    accentText: 'text-cyan-300',
    topLineGradient: 'from-cyan-400 via-cyan-400 via-[80%] to-fuchsia-500',
    glowRgb: '6, 182, 212',
    badgeBg: 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/15 to-fuchsia-500/15 text-cyan-300 border-cyan-500/40',
    iconColor: 'text-cyan-400'
  },
  {
    borderColor: 'border-cyan-500/40 hover:border-cyan-400/70',
    accentText: 'text-cyan-300',
    topLineGradient: 'from-cyan-400 via-cyan-400 via-[80%] to-pink-500',
    glowRgb: '6, 182, 212',
    badgeBg: 'bg-gradient-to-r from-cyan-500/20 via-cyan-500/15 to-pink-500/15 text-cyan-300 border-cyan-500/40',
    iconColor: 'text-cyan-400'
  }
];

export function GlobalLeagues({ 
  userProfile, 
  tokens, 
  setTokens, 
  onViewMySquad, 
  navigationContext, 
  onBackToInbox,
  onTagMatchForPulse 
}: GlobalLeaguesProps) {
  const [leagues, setLeagues] = useState<ProHostedLeague[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'registration' | 'ongoing' | 'completed'>('registration');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeScheduleLeague, setActiveScheduleLeague] = useState<ProHostedLeague | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [openMenuLeagueId, setOpenMenuLeagueId] = useState<string | null>(null);
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [leagueToDelete, setLeagueToDelete] = useState<{ id: string; name: string } | null>(null);

  const isSuperAdmin = userProfile?.email === 'vortexesports150@gmail.com' || userProfile?.role === 'main_admin' || userProfile?.role === 'admin';

  // Host Profile Modal State
  const [selectedHostForModal, setSelectedHostForModal] = useState<{ hostId: string; hostName?: string; hostPhotoUrl?: string } | null>(null);
  const [showRulesLeague, setShowRulesLeague] = useState<ProHostedLeague | null>(null);
  
  // Followed Hosts State
  const [followedHostIds, setFollowedHostIds] = useState<Set<string>>(new Set());

  // Listen to followed hosts for current user
  useEffect(() => {
    if (!userProfile?.userId) return;
    const q = query(collection(db, 'user_follows'), where('userId', '==', userProfile.userId));
    const unsub = onSnapshot(q, (snap) => {
      const ids = new Set<string>();
      snap.docs.forEach(d => {
        const data = d.data();
        if (data.hostId) ids.add(data.hostId);
      });
      setFollowedHostIds(ids);
    }, (err) => {
      console.error("Error fetching user follows in GlobalLeagues:", err);
    });
    return () => unsub();
  }, [userProfile?.userId]);
  const [hostCodeModalLeague, setHostCodeModalLeague] = useState<ProHostedLeague | null>(null);
  const [inputAccessCode, setInputAccessCode] = useState<string>('');
  const [codeUpdateError, setCodeUpdateError] = useState<string | null>(null);
  const [codeUpdateSuccess, setCodeUpdateSuccess] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Host Invite Modal State
  const [hostInviteModalLeague, setHostInviteModalLeague] = useState<ProHostedLeague | null>(null);
  const [inviteEmailInput, setInviteEmailInput] = useState<string>('');
  const [inviteModalError, setInviteModalError] = useState<string | null>(null);
  const [inviteModalSuccess, setInviteModalSuccess] = useState<string | null>(null);

  const handleSaveAccessCode = async () => {
    if (!hostCodeModalLeague) return;
    const cleanCode = inputAccessCode.trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (!cleanCode) {
      setCodeUpdateError('Please enter a valid alphanumeric access code.');
      return;
    }

    try {
      setCodeUpdateError(null);
      const leagueRef = doc(db, 'pro_hosted_leagues', hostCodeModalLeague.id);
      await updateDoc(leagueRef, {
        accessCode: cleanCode,
        updatedAt: new Date().toISOString()
      });

      // Update local state
      setHostCodeModalLeague(prev => prev ? { ...prev, accessCode: cleanCode } : null);
      setLeagues(prev => prev.map(l => l.id === hostCodeModalLeague.id ? { ...l, accessCode: cleanCode } : l));
      setCodeUpdateSuccess('Access code updated successfully!');
      setTimeout(() => {
        setCodeUpdateSuccess(null);
        setHostCodeModalLeague(null);
      }, 1500);
    } catch (err: any) {
      console.error('Failed to update access code:', err);
      setCodeUpdateError(err?.message || 'Failed to update access code. Please try again.');
    }
  };

  const handleSendInviteEmail = async () => {
    if (!hostInviteModalLeague) return;
    const inputTerm = inviteEmailInput.trim();
    if (!inputTerm) {
      setInviteModalError('Please enter a PlayVear ID or Gmail.');
      return;
    }

    let finalEmail = inputTerm.toLowerCase();
    
    // If input is 4 digits, try to find the user's email first
    if (/^\d{4}$/.test(inputTerm)) {
      try {
        const usersCol = collection(db, 'users');
        const userQ = query(usersCol, where('playvearId', '==', inputTerm));
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty) {
          finalEmail = userSnap.docs[0].data().email.toLowerCase();
        } else {
          setInviteModalError(`No player found with PlayVear ID "${inputTerm}".`);
          return;
        }
      } catch (err) {
        console.error("Error looking up PlayVear ID:", err);
      }
    } else {
      // Basic email check if not a 4-digit ID
      if (!finalEmail.includes('@')) {
        setInviteModalError('Please enter a valid PlayVear ID (4 digits) or Gmail.');
        return;
      }
    }

    const currentInvited = hostInviteModalLeague.invitedEmails || [];
    if (currentInvited.map(e => e.toLowerCase()).includes(finalEmail)) {
      setInviteModalError('This player is already invited.');
      return;
    }

    try {
      setInviteModalError(null);
      const updatedInvited = [...currentInvited, finalEmail];
      const leagueRef = doc(db, 'pro_hosted_leagues', hostInviteModalLeague.id);
      await updateDoc(leagueRef, {
        invitedEmails: updatedInvited,
        updatedAt: new Date().toISOString()
      });

      // Send in-app notification doc to invited user if user profile exists
      try {
        const usersQuery = query(collection(db, 'users'), where('email', '==', finalEmail));
        const userSnap = await getDocs(usersQuery);
        if (!userSnap.empty) {
          const targetUserId = userSnap.docs[0].id;
          const notifRef = doc(collection(db, 'users', targetUserId, 'notifications'));
          await setDoc(notifRef, {
            title: 'League Invitation',
            message: `Host ${userProfile?.displayName || 'Host'} invited your squad to join league "${hostInviteModalLeague.leagueName}".`,
            type: 'league_invite',
            leagueId: hostInviteModalLeague.id,
            read: false,
            createdAt: serverTimestamp()
          });
        }
      } catch (notifErr) {
        console.warn('Could not send notification doc to invited user:', notifErr);
      }

      setHostInviteModalLeague(prev => prev ? { ...prev, invitedEmails: updatedInvited } : null);
      setLeagues(prev => prev.map(l => l.id === hostInviteModalLeague.id ? { ...l, invitedEmails: updatedInvited } : l));
      setInviteEmailInput('');
      setInviteModalSuccess(`Invitation sent to ${finalEmail}!`);
      setTimeout(() => setInviteModalSuccess(null), 2500);
    } catch (err: any) {
      console.error('Failed to send invitation:', err);
      setInviteModalError(err?.message || 'Failed to send invite.');
    }
  };

  const handleRemoveInviteEmail = async (emailToRemove: string) => {
    if (!hostInviteModalLeague) return;
    try {
      const updatedInvited = (hostInviteModalLeague.invitedEmails || []).filter(
        e => e.toLowerCase() !== emailToRemove.toLowerCase()
      );
      const leagueRef = doc(db, 'pro_hosted_leagues', hostInviteModalLeague.id);
      await updateDoc(leagueRef, {
        invitedEmails: updatedInvited,
        updatedAt: new Date().toISOString()
      });

      setHostInviteModalLeague(prev => prev ? { ...prev, invitedEmails: updatedInvited } : null);
      setLeagues(prev => prev.map(l => l.id === hostInviteModalLeague.id ? { ...l, invitedEmails: updatedInvited } : l));
    } catch (err: any) {
      console.error('Failed to remove invited email:', err);
      setInviteModalError('Failed to remove email.');
    }
  };

  useEffect(() => {
    if ((navigationContext?.type === 'match_card' || navigationContext?.type === 'pulse_tagged_match') && navigationContext.leagueId) {
      const target = leagues.find(l => l.id === navigationContext.leagueId);
      if (target) {
        if (!activeScheduleLeague || activeScheduleLeague.id !== target.id) {
          setActiveScheduleLeague(target);
        }
      } else {
        // Direct fetch from Firestore in case the league is on another filter tab or page
        getDoc(doc(db, 'pro_hosted_leagues', navigationContext.leagueId)).then(snap => {
          if (snap.exists()) {
            const data = { id: snap.id, ...snap.data() } as ProHostedLeague;
            setActiveScheduleLeague(data);
          }
        }).catch(err => console.error('Error fetching navigation target league:', err));
      }
    }
  }, [navigationContext, leagues, activeScheduleLeague]);

  const handleSetLeagueStatus = async (leagueId: string, newStatus: 'approved' | 'ongoing') => {
    try {
      setUpdatingStatusId(leagueId);
      const leagueRef = doc(db, 'pro_hosted_leagues', leagueId);
      await updateDoc(leagueRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      setOpenMenuLeagueId(null);
    } catch (error) {
      console.error('Failed to update league status:', error);
      alert('Failed to update status. Please try again.');
    } finally {
      setUpdatingStatusId(null);
    }
  };

  useEffect(() => {
    setLoading(true);
    setCurrentPage(1);
    
    const statusMap: Record<string, string> = {
      registration: 'approved',
      ongoing: 'ongoing',
      completed: 'completed'
    };

    const q = query(
      collection(db, 'pro_hosted_leagues'), 
      where('status', 'in', ['approved', 'ongoing', 'completed'])
    );

    let rawLeagues: ProHostedLeague[] = [];

    const processAndFilterLeagues = (dataList: ProHostedLeague[]) => {
      const processed = dataList.map(league => {
        if (league.status === 'approved') {
          // Check for auto-cancellation if wallet is underfunded (< prizePool)
          checkAndCancelUnderfundedLeague(league).catch(e => console.error('Auto cancel check error:', e));

          if (hasOpeningMatchStarted(league.openingMatchDate, league.openingMatchTime)) {
            // If wallet balance >= prize pool, transition to ongoing normally
            const walletBal = Number(league.walletBalance) || 0;
            const targetPrize = Number(league.prizePool) || 0;
            if (walletBal >= targetPrize) {
              const leagueRef = doc(db, 'pro_hosted_leagues', league.id);
              updateDoc(leagueRef, {
                status: 'ongoing',
                updatedAt: new Date().toISOString()
              }).catch(err => console.error('Error auto-updating league status to ongoing:', err));

              return { ...league, status: 'ongoing' as const };
            }
          }
        }
        return league;
      });

      const targetStatus = statusMap[filter];
      const filtered = processed.filter(l => l.status === targetStatus && (l as any).isHidden !== true);
      filtered.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
      setLeagues(filtered);
      setLoading(false);
    };

    const unsubscribe = onSnapshot(q, (snapshot) => {
      rawLeagues = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProHostedLeague));
      processAndFilterLeagues(rawLeagues);
    }, (error) => {
      console.error('Error in global leagues snapshot:', error);
      setLoading(false);
    });

    // Periodically check every 15s to auto-transition if exact date/time arrives
    const interval = setInterval(() => {
      if (rawLeagues.length > 0) {
        processAndFilterLeagues(rawLeagues);
      }
    }, 15000);

    return () => {
      unsubscribe();
      clearInterval(interval);
    };
  }, [filter]);

  const sortedLeagues = [...leagues].sort((a, b) => {
    const aFollowed = a.hostId && followedHostIds.has(a.hostId) ? 1 : 0;
    const bFollowed = b.hostId && followedHostIds.has(b.hostId) ? 1 : 0;
    if (aFollowed !== bFollowed) {
      return bFollowed - aFollowed; // Followed host leagues first
    }
    return 0;
  });

  const totalPages = Math.ceil(sortedLeagues.length / ITEMS_PER_PAGE) || 1;
  const paginatedLeagues = sortedLeagues.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  if (activeScheduleLeague) {
    return (
      <LeagueScheduleView 
        league={activeScheduleLeague} 
        userProfile={userProfile}
        tokens={tokens}
        setTokens={setTokens}
        onViewMySquad={onViewMySquad}
        onBack={() => {
          if (navigationContext) {
            onBackToInbox?.();
          } else {
            setActiveScheduleLeague(null);
          }
        }}
        navigationContext={navigationContext}
        onTagMatchForPulse={onTagMatchForPulse}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex justify-between items-center mb-6 px-2">
        <h2 className="text-2xl font-black text-white uppercase tracking-wider flex items-center gap-2">
          <Trophy className="w-7 h-7 text-cyan-400" />
          Global Leagues
        </h2>
      </div>
      
      <div className="flex gap-2 px-2 overflow-x-auto pb-2">
        {[
          { key: 'registration', label: 'Registration' },
          { key: 'ongoing', label: 'Ongoing' },
          { key: 'completed', label: 'Completed' }
        ].map(tab => (
          <button 
            key={tab.key}
            onClick={() => setFilter(tab.key as any)}
            className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase whitespace-nowrap transition-all cursor-pointer ${filter === tab.key ? 'bg-gradient-to-r from-cyan-500 via-cyan-600 via-[80%] to-fuchsia-600 text-white shadow-lg shadow-cyan-950/60 border border-cyan-400/50' : 'bg-slate-900/80 border border-cyan-500/20 text-slate-400 hover:text-cyan-300'}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 space-y-4">
          <div className="relative flex items-center justify-center">
            <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 border-r-blue-500 animate-spin" />
            <Trophy className="w-5 h-5 text-cyan-400 animate-pulse absolute" />
          </div>
          <div className="text-center space-y-1">
            <p className="text-xs font-bold text-white tracking-wider uppercase">Loading {filter} Leagues...</p>
            <p className="text-[10px] text-slate-400">Fetching live esports tournaments</p>
          </div>
        </div>
      ) : leagues.length === 0 ? (
        <div className="text-center py-16 bg-slate-800/30 rounded-xl border border-white/5">
          <Trophy className="w-16 h-16 text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">No Leagues Found</h3>
          <p className="text-slate-400">There are currently no leagues in this category.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {paginatedLeagues.map(league => {
            const hostTheme = NEON_THEMES[getHostThemeIndex(league.hostId)];

            const isHostOrCoHost = Boolean(
              userProfile && (
                league.hostId === userProfile.userId ||
                (league.hostEmail && userProfile.email && league.hostEmail.toLowerCase() === userProfile.email.toLowerCase()) ||
                (league.coordinators && (
                  league.coordinators.includes(userProfile.userId) || 
                  (userProfile.email && league.coordinators.includes(userProfile.email))
                )) ||
                userProfile.role === 'admin' || 
                userProfile.role === 'main_admin'
              )
            );

            const formatDate = (dateString: string) => {
              if (!dateString) return '';
              try {
                const [year, month, day] = dateString.split('-');
                const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
                if (!year || !month || !day) return dateString;
                return `${parseInt(day)} ${months[parseInt(month) - 1]} ${year}`;
              } catch (e) {
                return dateString;
              }
            };

            const totalMatches = league.squadSize <= 4 ? 7 : league.squadSize <= 8 ? 15 : league.squadSize <= 16 ? 31 : league.squadSize <= 32 ? 63 : 127;
            const numGroups = Math.max(1, Math.floor(league.squadSize / 4));
            
            const calculateDuration = (d1: string, d2: string) => {
              if (!d1 || !d2) return 0;
              const date1 = new Date(d1);
              const date2 = new Date(d2);
              const diffTime = date2.getTime() - date1.getTime();
              const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
              return (diffDays >= 0 ? diffDays : 0) + 1;
            };
            const duration = calculateDuration(league.openingMatchDate, league.finalDate);
            
            return (
            <div 
              key={league.id} 
              className="relative bg-gradient-to-br from-[#04091a]/95 via-[#06122d]/95 to-[#12071a]/95 border-2 border-cyan-500/60 hover:border-cyan-300 rounded-2xl p-4 sm:p-5 transition-all duration-300 overflow-hidden flex flex-col justify-between items-start gap-4 group w-[95%] mx-auto shadow-[0_0_25px_rgba(6,182,212,0.35),0_0_10px_rgba(6,182,212,0.2)] hover:shadow-[0_0_45px_rgba(6,182,212,0.65),0_0_20px_rgba(6,182,212,0.35)]"
            >
              {/* Top Accent Glowing line (80% Neon Cyan, 20% Neon Magenta) */}
              <div 
                className="absolute top-0 left-0 right-0 h-[3.5px] bg-gradient-to-r from-cyan-400 via-cyan-400 via-[80%] to-fuchsia-500 shadow-[0_0_20px_rgba(6,182,212,0.85)]" 
              />

              {/* Top Level Details (Full Width) */}
              <div className="w-full space-y-2.5 mb-[2px]">
                {/* Row 1: League ID & Location & Rule */}
                <div className="flex flex-wrap justify-between items-center gap-1 text-[8px] font-mono uppercase tracking-wider text-slate-500">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`font-bold px-2 py-0.5 text-[7.5px] sm:text-[8px] rounded-md border border-white/5 ${hostTheme.accentText}`} style={{ backgroundColor: `rgba(${hostTheme.glowRgb}, 0.15)` }}>
                      ID: {league.id}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2.5 sm:gap-3">
                    <span className="font-black text-slate-400 flex items-center gap-1">
                      <span className={`h-1.5 w-1.5 rounded-full bg-current ${hostTheme.accentText} animate-pulse`} />
                      {league.locationRestrictionType === 'specific_division' ? `${league.allowedDivision} Division` :
                       league.locationRestrictionType === 'specific_district' ? `${league.allowedDistrict} District (${league.allowedDivision})` :
                       league.locationRestrictionType === 'specific_upazila' ? `${league.allowedUpazila} Upazila (${league.allowedDistrict})` :
                       'GLOBAL ONLINE'}
                    </span>
                    <span className="text-cyan-500/80 font-black border-l border-white/10 pl-2.5 sm:pl-3 text-[8px]">
                      RULE: {league.representationRule === 'one_squad_per_upazila' ? 'One Squad per Upazila' :
                             league.representationRule === 'one_squad_per_district' ? 'One Squad per District' :
                             league.representationRule === 'one_squad_per_division' ? 'One Squad per Division' :
                             'Multiple Squads Allowed'}
                    </span>

                    {/* Access / Privacy Badges */}
                    {(league.accessType === 'code' || league.accessCode) && (
                      <span className="text-amber-300 font-bold px-1.5 py-0.5 rounded bg-amber-950/70 border border-amber-500/40 text-[7.5px] flex items-center gap-1">
                        <Key className="w-2.5 h-2.5 text-amber-400" />
                        ACCESS CODE
                      </span>
                    )}

                    {league.accessType === 'invite' && (
                      <span className="text-purple-300 font-bold px-1.5 py-0.5 rounded bg-purple-950/70 border border-purple-500/40 text-[7.5px] flex items-center gap-1">
                        <Mail className="w-2.5 h-2.5 text-purple-400" />
                        INVITE ONLY
                      </span>
                    )}

                    {/* Three-Dot Menu Icon for Host / Co-Host ONLY */}
                    {isHostOrCoHost && (
                      <div className="relative z-30 ml-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuLeagueId(openMenuLeagueId === league.id ? null : league.id);
                          }}
                          className="p-1 hover:bg-cyan-500/20 rounded-lg transition border border-cyan-500/40 text-cyan-400 hover:text-white cursor-pointer bg-slate-950/90 shadow-[0_0_12px_rgba(6,182,212,0.25)] flex items-center justify-center"
                          title="Host Settings"
                        >
                          <MoreVertical className="w-3.5 h-3.5" />
                        </button>

                        {openMenuLeagueId === league.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuLeagueId(null);
                              }}
                            />
                            <div 
                              className="absolute right-0 mt-2 w-56 bg-[#060a17] border border-cyan-500/40 rounded-xl shadow-[0_10px_35px_rgba(0,0,0,0.9)] z-50 overflow-hidden py-1.5 backdrop-blur-md"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-3.5 py-2 border-b border-white/10 bg-gradient-to-r from-cyan-500/15 to-blue-500/15 flex items-center justify-between">
                                <span className="text-[9.5px] font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                                  <ShieldCheck className="w-3 h-3 text-cyan-400" />
                                  Host Controls
                                </span>
                                <span className="text-[8px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-800/80 text-cyan-300 border border-white/10 uppercase">
                                  {league.status}
                                </span>
                              </div>

                              <div className="p-1 space-y-1">
                                {/* Edit Access Code - Only shown if league is Code Protected */}
                                {(league.accessType === 'code' || league.accessCode) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuLeagueId(null);
                                      setHostCodeModalLeague(league);
                                      setInputAccessCode(league.accessCode || '');
                                      setCodeUpdateError(null);
                                      setCodeUpdateSuccess(null);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-mono font-bold text-slate-200 hover:bg-amber-950/80 hover:text-amber-300 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Key className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                                    <span>Edit Access Code {league.accessCode ? `(${league.accessCode})` : ''}</span>
                                  </button>
                                )}

                                {/* Manage Invitations - Only shown if league is Invite Only */}
                                {league.accessType === 'invite' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenMenuLeagueId(null);
                                      setHostInviteModalLeague(league);
                                      setInviteEmailInput('');
                                      setInviteModalError(null);
                                      setInviteModalSuccess(null);
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-mono font-bold text-slate-200 hover:bg-purple-950/80 hover:text-purple-300 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                                    <span>Manage Invitations ({league.invitedEmails?.length || 0})</span>
                                  </button>
                                )}

                                <button
                                  onClick={() => handleSetLeagueStatus(league.id, 'ongoing')}
                                  disabled={updatingStatusId === league.id}
                                  className={`w-full px-3 py-2 text-left hover:bg-cyan-500/20 rounded-lg text-xs font-black flex items-center justify-between transition-colors cursor-pointer ${
                                    league.status === 'ongoing' ? 'text-cyan-400 bg-cyan-500/20 border border-cyan-500/30' : 'text-slate-100 hover:text-cyan-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <span className="relative flex h-2 w-2">
                                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                                      <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
                                    </span>
                                    <span>Go Live / Set Ongoing</span>
                                  </div>
                                  {league.status === 'ongoing' && (
                                    <span className="text-[8px] font-mono bg-cyan-500/30 text-cyan-300 px-1.5 py-0.5 rounded uppercase font-bold">Active</span>
                                  )}
                                </button>

                                 <button
                                  onClick={() => handleSetLeagueStatus(league.id, 'approved')}
                                  disabled={updatingStatusId === league.id}
                                  className={`w-full px-3 py-2 text-left hover:bg-blue-500/20 rounded-lg text-xs font-black flex items-center justify-between transition-colors cursor-pointer ${
                                    league.status === 'approved' ? 'text-blue-400 bg-blue-500/20 border border-blue-500/30' : 'text-slate-200 hover:text-blue-300'
                                  }`}
                                >
                                  <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 rounded-full bg-blue-400" />
                                    <span>Set Registration</span>
                                  </div>
                                  {league.status === 'approved' && (
                                    <span className="text-[8px] font-mono bg-blue-500/30 text-blue-300 px-1.5 py-0.5 rounded uppercase font-bold">Active</span>
                                  )}
                                </button>

                                {/* Hide / Unhide League */}
                                <button
                                  type="button"
                                  onClick={async (e) => {
                                    e.stopPropagation();
                                    setOpenMenuLeagueId(null);
                                    try {
                                      const leagueRef = doc(db, 'pro_hosted_leagues', league.id);
                                      await updateDoc(leagueRef, {
                                        isHidden: !(league as any).isHidden,
                                        updatedAt: new Date().toISOString()
                                      });
                                    } catch (err: any) {
                                      console.error('Error toggling hide league:', err);
                                    }
                                  }}
                                  className="w-full text-left px-3 py-2 rounded-lg text-xs font-mono font-bold text-slate-200 hover:bg-amber-950/80 hover:text-amber-300 flex items-center gap-2 transition-colors cursor-pointer"
                                >
                                  {(league as any).isHidden ? <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                  <span>{(league as any).isHidden ? 'Unhide League' : 'Hide League'}</span>
                                </button>

                                {/* Delete League Permanently (Super Admin Only) */}
                                {isSuperAdmin && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setOpenMenuLeagueId(null);
                                      setLeagueToDelete({ id: league.id, name: league.leagueName });
                                    }}
                                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-mono font-bold text-slate-200 hover:bg-rose-950/80 hover:text-rose-300 flex items-center gap-2 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                    <span>Delete League</span>
                                  </button>
                                )}
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Row 2: League Name */}
                <div 
                  className="w-full text-center py-2 px-3 mt-0.5 mb-1 rounded-xl border border-cyan-500/35 bg-gradient-to-r from-cyan-950/40 via-slate-900/90 to-fuchsia-950/25 shadow-[0_0_15px_rgba(6,182,212,0.15)] flex flex-col items-center justify-center"
                >
                  <h3 
                    className="text-xl sm:text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 via-cyan-100 to-fuchsia-300 uppercase tracking-widest font-mono select-none drop-shadow-[0_0_12px_rgba(6,182,212,0.6)]"
                  >
                    {league.leagueName}
                  </h3>

                  {/* Regional / Local Venue Address details - Directly under League Title */}
                  {(league.isLocalVenue || league.localVenueName) && (
                    <div className="mt-1 inline-flex items-center justify-center gap-1 p-0.5 px-2 bg-cyan-950/80 border border-cyan-500/40 rounded text-[7.5px] sm:text-[8px] font-mono max-w-[95%] overflow-hidden whitespace-nowrap">
                      <div className="flex items-center gap-1 min-w-0 truncate text-cyan-300 font-bold">
                        <MapPin className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                        <span className="truncate">{league.localVenueName}</span>
                      </div>
                      {league.localUpazilaDistrict && (
                        <div className="text-slate-200/90 flex items-center gap-1 shrink-0 border-l border-cyan-500/40 pl-1.5">
                          <span className="text-cyan-400 shrink-0 text-[7.5px]">📍</span>
                          <span className="truncate font-semibold">{league.localUpazilaDistrict}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Full Width Sponsor Banner / Sponsored By (Same Row + Original Aspect Ratio) */}
                {(league.sponsorName || league.sponsorLogoUrl) && (
                  <div 
                    onClick={(e) => {
                      e.stopPropagation();
                      if (league.sponsorLinkUrl) {
                        let target = league.sponsorLinkUrl.trim();
                        if (!target.startsWith('http://') && !target.startsWith('https://')) {
                          target = 'https://' + target;
                        }
                        window.open(target, '_blank', 'noopener,noreferrer');
                      }
                    }}
                    title={league.sponsorLinkUrl ? `Sponsored by ${league.sponsorName || 'Sponsor'} (Click to visit)` : `Sponsored by ${league.sponsorName || 'Sponsor'}`}
                    className={`w-auto my-2 mx-auto flex flex-row items-center justify-center gap-3 sm:gap-4 px-2 py-1 bg-transparent border-none shadow-none ${league.sponsorLinkUrl ? 'hover:opacity-80 transition-opacity cursor-pointer' : 'cursor-default'}`}
                  >
                    <span className="text-[8px] font-black tracking-wider uppercase text-cyan-300 shrink-0 flex items-center gap-1.5 whitespace-nowrap">
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
                      SPONSORED BY:
                    </span>
                    {league.sponsorLogoUrl && (
                      <img 
                        src={league.sponsorLogoUrl} 
                        alt="Sponsor Logo" 
                        className="h-14 sm:h-18 w-auto max-w-[280px] object-contain drop-shadow-md" 
                      />
                    )}
                    {league.sponsorName && (
                      <span className="text-sm sm:text-lg font-extrabold uppercase text-cyan-200 tracking-wider truncate">
                        {league.sponsorName}
                      </span>
                    )}
                  </div>
                )}

                {/* Horizontal Layout for Top 3 Prizes and Champion Table */}
                <div className="flex flex-row items-stretch justify-between gap-3 w-full mt-1.5 px-1 min-h-[140px] sm:min-h-[160px]">
                  
                  {/* Left Side: Top 3 Rank Prizes (Normal Text Design) */}
                  <div className="w-[40%] text-left flex flex-col justify-center p-3 sm:p-4 bg-gradient-to-br from-cyan-950/20 to-fuchsia-950/10 border border-cyan-500/20 rounded-xl">
                    <div className="text-[7px] sm:text-[8px] font-bold text-cyan-300/80 uppercase tracking-widest mb-2 border-b border-cyan-500/20 pb-1 inline-block self-start">
                      TOP 3 RANK PLAYERS PRIZES
                    </div>
                    <div className="flex flex-col gap-1">
                      <p className="text-[6.5px] sm:text-[7.5px] font-mono font-black text-cyan-300 uppercase tracking-widest leading-relaxed drop-shadow-sm flex items-center gap-1">
                        <span className="booyah-icon-animated">🥇</span> RANK 1 (BOOYAH): <span className="booyah-text-animated">{league.topRank1Prize || 0} TKN</span>
                      </p>
                      <p className="text-[6px] sm:text-[7px] font-mono font-bold text-slate-300 uppercase tracking-widest leading-relaxed drop-shadow-sm">
                        🥈 RANK 2: {league.topRank2Prize || 0} TKN
                      </p>
                      <p className="text-[6px] sm:text-[7px] font-mono font-bold text-pink-300 uppercase tracking-widest leading-relaxed drop-shadow-sm">
                        🥉 RANK 3: {league.topRank3Prize || 0} TKN
                      </p>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-cyan-500/20 flex flex-col gap-1">
                      <div className="text-[7.5px] sm:text-[8px] font-mono font-bold text-slate-300 uppercase flex flex-col gap-1">
                        <span className="text-cyan-400 tracking-wider">OPENING MATCH:</span>
                        <span className="flex items-center gap-1.5 text-[8.5px] sm:text-[9px] text-white">
                          <Calendar className="w-2.5 h-2.5 text-cyan-400" />
                          {league.openingMatchDate ? `${formatDate(league.openingMatchDate)} ${league.openingMatchTime ? `| ${league.openingMatchTime}` : ''}` : 'NOT SET'}
                        </span>
                      </div>
                      <div className="text-[7.5px] sm:text-[8px] font-mono font-bold text-slate-300 uppercase flex flex-col gap-1 mt-0.5">
                        <span className="text-pink-400 tracking-wider">FINAL MATCH:</span>
                        <span className="flex items-center gap-1.5 text-[8.5px] sm:text-[9px] text-white">
                          <Calendar className="w-2.5 h-2.5 text-pink-400" />
                          {league.finalDate ? `${formatDate(league.finalDate)} ${league.finalTime ? `| ${league.finalTime}` : ''}` : 'NOT SET'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Champion, Runner-Up, Entry Fee List */}
                  <div className="w-[60%] shrink-0 rounded-xl border border-cyan-500/40 bg-gradient-to-br from-[#041026] via-[#081838] to-[#160a22] overflow-hidden flex flex-col shadow-[0_0_20px_rgba(6,182,212,0.18)]">
                    <div className="booyah-prize-card-badge flex flex-col flex-1 p-1.5 sm:p-2 items-center justify-center text-center border-b border-cyan-500/30">
                      <div className="flex items-center gap-1 mb-0.5">
                        <span className="text-[10px] sm:text-[11px] font-black text-cyan-300 uppercase tracking-widest leading-tight">CHAMPION BOOYAH</span>
                        <span className="px-1 py-[0.5px] bg-pink-500/30 border border-pink-400/50 rounded text-[6.5px] text-pink-300 font-extrabold tracking-tighter">1ST</span>
                      </div>
                      <span className="text-[14px] sm:text-[17px] font-black booyah-text-animated font-mono tracking-wider drop-shadow-md flex items-center gap-1">
                        <Trophy className="w-4 h-4 text-cyan-300 booyah-icon-animated" />
                        {league.championPrize}
                      </span>
                    </div>
                    <div className="flex flex-col flex-1 p-1.5 sm:p-2 items-center justify-center text-center border-b border-cyan-500/20">
                      <span className="text-[10px] sm:text-[12px] font-bold text-slate-300 uppercase tracking-widest leading-tight mb-1">RUNNER-UP</span>
                      <span className="text-[14px] sm:text-[17px] font-black text-slate-200 font-mono tracking-wider drop-shadow-md">🥈 {league.runnerUpPrize}</span>
                    </div>
                    <div className="flex flex-col flex-1 p-1.5 sm:p-2 items-center justify-center text-center bg-gradient-to-r from-cyan-500/20 via-transparent to-fuchsia-500/15">
                      <span className="text-[10px] sm:text-[12px] font-bold text-cyan-300 uppercase tracking-widest leading-tight mb-1">ENTRY FEE</span>
                      <span className="text-[14px] sm:text-[17px] font-black text-cyan-300 font-mono tracking-wider drop-shadow-[0_0_10px_rgba(6,182,212,0.6)]">🎟️ {league.entryFee}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Main Content Split */}
              <div className="flex flex-col w-full gap-4 xl:gap-5 items-start">
                {/* Left Side: Remaining Details */}
                <div className="flex-1 w-full space-y-2.5 text-left">
                  {/* Row 4: Squad count (10px font) */}
                  <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-[10px] font-black text-slate-300 uppercase font-mono p-2.5 rounded-xl border border-cyan-500/30 bg-gradient-to-r from-cyan-950/40 via-slate-900/80 to-fuchsia-950/20 shadow-[0_0_12px_rgba(6,182,212,0.1)]">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      SQUADS: {league.squadSize}
                    </span>
                    <span className="flex items-center gap-1 border-l border-cyan-500/20 pl-5">
                      <Layers className="w-3.5 h-3.5 text-cyan-400" />
                      GROUPS: {numGroups}
                    </span>
                    <span className="flex items-center gap-1 border-l border-cyan-500/20 pl-5">
                      <Zap className="w-3.5 h-3.5 text-cyan-400" />
                      MATCHES: {totalMatches}
                    </span>
                    <span className="flex items-center gap-1 border-l border-cyan-500/20 pl-5">
                      <Clock className="w-3.5 h-3.5 text-cyan-400" />
                      DURATION: {duration} {duration === 1 ? 'DAY' : 'DAYS'}
                    </span>
                  </div>

                  {/* League Wallet Funding Status Indicator */}
                  {league.status === 'cancelled' ? (
                    <div className="p-2 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-bold font-mono flex items-center justify-between gap-2">
                      <span>🔴 Auto-Cancelled: {league.cancellationReason || 'League Wallet target not met'}</span>
                      {!!league.squadRefundPerCap && <span>(Refund + Bonus: 🪙{league.squadRefundPerCap})</span>}
                    </div>
                  ) : (league.walletBalance || 0) >= (league.prizePool || 0) ? (
                    <div className="p-2 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold font-mono flex items-center justify-between gap-2 shadow-[0_0_12px_rgba(16,185,129,0.15)]">
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                        League Wallet: 🪙{league.walletBalance || 0} / 🪙{league.prizePool}
                      </span>
                      <div className="text-[7.5px] leading-tight bg-cyan-500/20 px-2 py-1 rounded-md text-cyan-200 border border-cyan-400/40 uppercase tracking-tight font-black flex items-center gap-1.5 shrink-0">
                        <Lock className="w-2.5 h-2.5 shrink-0 text-cyan-400" />
                        <div className="flex flex-col text-left">
                          <span>Locked by Admin</span>
                          <span className="text-[6.5px] text-cyan-300/80">Until Prize Distribution</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-2 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold font-mono flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 shrink-0">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
                        League Wallet: 🪙{league.walletBalance || 0} / 🪙{league.prizePool}
                      </span>
                      <div className="text-[7.5px] leading-tight bg-cyan-500/20 px-2 py-1 rounded-md text-cyan-200 border border-cyan-400/40 uppercase tracking-tight font-black flex items-center gap-1.5 shrink-0">
                        <Lock className="w-2.5 h-2.5 shrink-0 text-cyan-400" />
                        <div className="flex flex-col text-left">
                          <span>Locked by Admin</span>
                          <span className="text-[6.5px] text-cyan-300/80">Until Prize Distribution</span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {/* Row 5: Host Photo, Name, 100% Secure Badge, Brand Stars (Moved to bottom) */}
                  <div className="flex items-center gap-2 sm:gap-2.5 border-t border-white/5 pt-2 mt-0.5 overflow-hidden">
                    <img 
                      src={league.logoUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=100&auto=format&fit=crop&q=80"} 
                      alt="Host" 
                      className={`w-[28px] h-[28px] sm:w-[32px] sm:h-[32px] rounded object-cover border ${hostTheme.borderColor} shrink-0 shadow-[0_0_15px_rgba(${hostTheme.glowRgb},0.2)] cursor-pointer hover:scale-105 transition-transform`}
                      style={{ backgroundColor: `rgba(${hostTheme.glowRgb}, 0.1)` }} 
                      referrerPolicy="no-referrer"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (league.hostId) {
                          setSelectedHostForModal({
                            hostId: league.hostId,
                            hostName: league.brandName || league.hostName || 'Host',
                            hostPhotoUrl: league.logoUrl
                          });
                        }
                      }}
                      title="Click to view host profile"
                    />
                    <div className="flex items-center gap-1.5 min-w-0">
                      <p 
                        onClick={(e) => {
                          e.stopPropagation();
                          if (league.hostId) {
                            setSelectedHostForModal({
                              hostId: league.hostId,
                              hostName: league.brandName || league.hostName || 'Host',
                              hostPhotoUrl: league.logoUrl
                            });
                          }
                        }}
                        className="text-[8px] sm:text-[10px] font-black text-white uppercase tracking-wider truncate cursor-pointer hover:text-cyan-300 transition-colors underline decoration-cyan-500/20"
                        title="Click to view host profile"
                      >
                        HOST: {league.brandName || league.hostName}
                      </p>
                      <HostFollowButton 
                        hostId={league.hostId || (league as any).hostUserId || (league as any).createdBy || 'official_host'} 
                        currentUserId={userProfile?.userId || (userProfile as any)?.uid || (userProfile as any)?.id} 
                        followType="host"
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowRulesLeague(league);
                        }}
                        className="ml-2 px-2 py-0.5 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/40 rounded text-[9.5px] sm:text-[10px] font-black text-cyan-300 hover:text-cyan-200 flex items-center gap-1 cursor-pointer transition-colors shrink-0"
                      >
                        <BookOpen className="w-3.5 h-3.5 shrink-0" />
                        <span>Rules</span>
                      </button>
                    </div>
                    <div className="flex items-center gap-0.5 shrink-0 ml-auto sm:ml-2">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <Star key={s} className="w-2.5 h-2.5 text-yellow-400 fill-yellow-400 drop-shadow-[0_0_4px_rgba(234,179,8,0.4)]" />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* View & Join Button - Floating at bottom right */}
              <div className="absolute -bottom-2 -right-2 z-20">
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveScheduleLeague(league);
                  }}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-500 via-cyan-600 via-[80%] to-fuchsia-600 hover:from-cyan-400 hover:to-fuchsia-500 text-white text-[10px] sm:text-xs font-black uppercase tracking-[0.2em] rounded-xl border border-white/30 shadow-[0_8px_20px_-4px_rgba(6,182,212,0.5),0_4px_12px_rgba(236,72,153,0.3)] transition-all hover:scale-105 active:scale-95 group/btn cursor-pointer ring-1 ring-white/10"
                >
                  <Eye className="w-4 h-4 group-hover/btn:scale-110 transition-transform" />
                  View & Join
                </button>
              </div>
            </div>
            );
          })}

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center bg-slate-900/60 border border-white/10 p-3 rounded-xl w-[95%] mx-auto">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white uppercase rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <span className="text-xs font-bold font-mono text-cyan-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white uppercase rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Host Edit Access Code Modal */}
      {hostCodeModalLeague && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-amber-500/40 rounded-2xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-[0_0_50px_rgba(245,158,11,0.2)] font-mono"
          >
            <div className="flex items-center justify-between border-b border-amber-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Manage Access Code
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHostCodeModalLeague(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              League: <span className="text-amber-300 font-bold">{hostCodeModalLeague.leagueName}</span> (#{hostCodeModalLeague.id})
            </p>

            {/* Current Code Box */}
            <div className="bg-amber-950/40 border border-amber-500/30 p-3 rounded-xl flex items-center justify-between font-mono">
              <div>
                <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold block">Current Access Code</span>
                <span className="text-amber-200 text-lg font-black tracking-widest">{hostCodeModalLeague.accessCode || 'NONE'}</span>
              </div>
              {hostCodeModalLeague.accessCode && (
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(hostCodeModalLeague.accessCode || '');
                    setCopiedField(`modal-accesscode-${hostCodeModalLeague.id}`);
                    setTimeout(() => setCopiedField(null), 2000);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-900/60 hover:bg-amber-800/80 text-amber-300 text-xs font-bold border border-amber-500/40 flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  {copiedField === `modal-accesscode-${hostCodeModalLeague.id}` ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {/* Input Form */}
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Set New Access Code</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={inputAccessCode}
                    onChange={(e) => setInputAccessCode(e.target.value.toUpperCase())}
                    placeholder="e.g. LX9876"
                    maxLength={10}
                    className="flex-1 bg-slate-950 border border-amber-500/50 focus:border-amber-400 rounded-lg px-3 py-2 text-sm font-mono font-bold tracking-wider text-amber-300 uppercase outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
                      let code = '';
                      for (let i = 0; i < 6; i++) {
                        code += chars.charAt(Math.floor(Math.random() * chars.length));
                      }
                      setInputAccessCode(code);
                    }}
                    className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                  >
                    Random
                  </button>
                </div>
              </div>

              <div className="p-2.5 bg-slate-950/80 border border-cyan-500/20 rounded-xl text-[11px] text-slate-300 space-y-1">
                <span className="text-cyan-400 font-bold block">ℹ️ Important Note:</span>
                <p className="text-slate-400 leading-tight">
                  Changing the access code will only apply to new squads registering. Squads that have already registered with the previous code will remain in the league.
                </p>
              </div>

              {codeUpdateError && (
                <p className="text-xs text-rose-400 bg-rose-950/50 border border-rose-500/30 p-2 rounded-lg font-mono">
                  {codeUpdateError}
                </p>
              )}

              {codeUpdateSuccess && (
                <p className="text-xs text-emerald-400 bg-emerald-950/50 border border-emerald-500/30 p-2 rounded-lg font-mono">
                  {codeUpdateSuccess}
                </p>
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setHostCodeModalLeague(null)}
                className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveAccessCode}
                className="px-4 py-2 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition-all shadow-md cursor-pointer flex items-center gap-1.5"
              >
                <Key className="w-3.5 h-3.5" />
                <span>Update Access Code</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Host Manage Invitations Modal */}
      {hostInviteModalLeague && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-purple-500/40 rounded-2xl p-5 sm:p-6 max-w-md w-full space-y-4 shadow-[0_0_50px_rgba(168,85,247,0.2)] font-mono"
          >
            <div className="flex items-center justify-between border-b border-purple-500/20 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="w-5 h-5 text-purple-400 shrink-0" />
                <h3 className="text-base font-black text-white uppercase tracking-wider">
                  Invite Squads / Players
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setHostInviteModalLeague(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              League: <span className="text-purple-300 font-bold">{hostInviteModalLeague.leagueName}</span> (#{hostInviteModalLeague.id})
            </p>

            {inviteModalError && (
              <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{inviteModalError}</span>
              </div>
            )}

            {inviteModalSuccess && (
              <div className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{inviteModalSuccess}</span>
              </div>
            )}

            {/* Input to send invite */}
            <div className="space-y-2">
              <label className="block text-[11px] text-purple-300 font-bold uppercase">
                Add Captain PlayVear ID
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inviteEmailInput}
                  onChange={(e) => {
                    setInviteEmailInput(e.target.value);
                    if (inviteModalError) setInviteModalError(null);
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendInviteEmail();
                  }}
                  placeholder="Enter 4-digit PlayVear ID or Gmail..."
                  className="flex-1 bg-slate-950 border border-slate-700 focus:border-purple-400 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none font-mono"
                />
                <button
                  type="button"
                  onClick={handleSendInviteEmail}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold font-mono uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(168,85,247,0.3)] cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5 text-white" />
                  <span>Send Invite</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 font-mono">
                Invited users receive an in-app notification and can register their squad into this league directly.
              </p>
            </div>

            {/* List of currently invited emails */}
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs font-mono font-bold text-slate-300 uppercase">
                <span>Invited Captains ({hostInviteModalLeague.invitedEmails?.length || 0})</span>
              </div>

              {(!hostInviteModalLeague.invitedEmails || hostInviteModalLeague.invitedEmails.length === 0) ? (
                <div className="p-4 bg-slate-950 rounded-xl text-center text-xs text-slate-500 font-mono">
                  No PlayVear ID invitations sent yet.
                </div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
                  {hostInviteModalLeague.invitedEmails.map((email: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-2 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between text-xs font-mono text-slate-200"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                        <span className="truncate">{email}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveInviteEmail(email)}
                        className="p-1 hover:bg-rose-950 text-slate-400 hover:text-rose-400 rounded transition-colors cursor-pointer"
                        title="Remove Invitation"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="pt-2 text-right">
              <button
                onClick={() => setHostInviteModalLeague(null)}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Image Preview Modal */}
      {previewImage && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={() => setPreviewImage(null)}
        >
          <div 
            className="relative bg-slate-900 border border-cyan-500/30 p-2 rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.3)] max-w-full max-h-full"
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              className="absolute -top-4 -right-4 bg-red-500 hover:bg-red-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shadow-lg border border-white/20 transition-colors z-10 cursor-pointer"
              onClick={() => setPreviewImage(null)}
            >
              ✕
            </button>
            <img 
              src={previewImage} 
              alt="Preview" 
              className="max-w-[90vw] max-h-[85vh] rounded-xl object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      )}

      {/* League Rules Modal */}
      <AnimatePresence>
        {showRulesLeague && (
          <div className="fixed inset-0 z-[120] bg-black/90 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#04060e] border border-cyan-500/30 rounded-2xl p-6 w-full max-w-lg max-h-[85vh] overflow-y-auto space-y-6 shadow-[0_0_50px_rgba(6,182,212,0.15)] relative font-sans"
            >
              {/* Glowing Background Details */}
              <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-pink-500/5 rounded-full blur-2xl pointer-events-none" />

              {/* Header */}
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-gradient-to-br from-cyan-950 to-blue-950 border border-cyan-500/40 rounded-xl text-cyan-400">
                    <BookOpen className="w-5 h-5 shrink-0" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">League Rules & Regulations</h3>
                    <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest">Esports Pro Standards</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRulesLeague(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-900 border border-white/5 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Body Content */}
              <div className="space-y-5">
                {/* 1. Host Operations & YouTube Streaming */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-red-950/25 to-slate-900/50 border border-red-500/20 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <Youtube className="w-4.5 h-4.5 text-red-500 animate-pulse" />
                    <span className="text-[11px] font-black text-red-300 uppercase tracking-wider">01. Host Duties & YouTube Streaming</span>
                  </div>
                  <ul className="space-y-2.5 text-[10.5px] font-mono text-slate-300 pl-1.5 list-disc list-inside">
                    <li>
                      <strong className="text-white uppercase">YOUTUBE LIVE STREAM:</strong> Every match in this league MUST be live-streamed on YouTube by the Host.
                    </li>
                    <li>
                      <strong className="text-white uppercase">ROOM LOBBY TIMING:</strong> The Host will set and publish the Room ID & Password precisely 15 minutes before the scheduled match time.
                    </li>
                    <li>
                      <strong className="text-white uppercase">LOBBY KICK AUTHORITY:</strong> Only registered players or squads sitting inside their correct assigned slots are allowed. The Host holds absolute authority to kick unauthorized players.
                    </li>
                    <li>
                      <strong className="text-white uppercase">HOST DECISION & PROOF:</strong> The Host processes the final match results and uploads the scoreboard screenshots. Player submissions are NOT required. Host decision is final.
                    </li>
                  </ul>
                </div>

                {/* 2. Player Roster & Punctuality */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/25 to-slate-900/50 border border-cyan-500/20 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="w-4.5 h-4.5 text-cyan-400" />
                    <span className="text-[11px] font-black text-cyan-300 uppercase tracking-wider">02. Player Roster & Attendance</span>
                  </div>
                  <ul className="space-y-2.5 text-[10.5px] font-mono text-slate-300 pl-1.5 list-disc list-inside">
                    <li>
                      <strong className="text-white uppercase">REGISTERED PLAYERS ONLY:</strong> Squads must strictly play with players listed on their team registration form.
                    </li>
                    <li>
                      <strong className="text-white uppercase">STRICT PUNCTUALITY:</strong> All squads must join the custom room at least 5 minutes before match start. Delayed slots will not be held and entry fees are non-refundable.
                    </li>
                    <li>
                      <strong className="text-white uppercase">CANCELLATION REFUND:</strong> If the Host cancels the match for server issues, 100% of entry tokens will be refunded instantly.
                    </li>
                  </ul>
                </div>

                {/* 3. Fair Play & Anti-Cheat */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/25 to-slate-900/50 border border-indigo-500/20 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4.5 h-4.5 text-indigo-400" />
                    <span className="text-[11px] font-black text-indigo-300 uppercase tracking-wider">03. Fair Play & Anti-Cheat</span>
                  </div>
                  <ul className="space-y-2.5 text-[10.5px] font-mono text-slate-300 pl-1.5 list-disc list-inside">
                    <li>
                      <strong className="text-white uppercase">HACK & SCRIPTS:</strong> Use of hacks, aimbots, custom config files, wallhacks, or scripts is strictly banned. Violators will face immediate lifetime platform bans.
                    </li>
                    <li>
                      <strong className="text-white uppercase">MOBILE-ONLY (NO EMULATOR):</strong> Players must play exclusively on mobile devices. PC/Emulator users are strictly forbidden.
                    </li>
                    <li>
                      <strong className="text-white uppercase">NO TEAMING UP:</strong> Collaboration with opponent teams inside the match is strictly prohibited and results in immediate disqualification.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Close Action Button */}
              <button
                onClick={() => setShowRulesLeague(null)}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all duration-300 active:scale-[0.98] shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer text-center"
              >
                Accept & Close Rules
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Host Profile Modal */}
      {selectedHostForModal && (
        <HostProfileModal
          hostId={selectedHostForModal.hostId}
          hostName={selectedHostForModal.hostName}
          hostPhotoUrl={selectedHostForModal.hostPhotoUrl}
          currentUserProfile={userProfile}
          onClose={() => setSelectedHostForModal(null)}
        />
      )}

      {/* Confirmation Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!leagueToDelete}
        title="Delete League Permanently"
        itemName={leagueToDelete?.name}
        description="Are you sure you want to PERMANENTLY delete this league? All matches, registrations, and leaderboard data for this league will be removed."
        confirmText="Yes, Delete League"
        onClose={() => setLeagueToDelete(null)}
        onConfirm={async () => {
          if (leagueToDelete) {
            await deleteDoc(doc(db, 'pro_hosted_leagues', leagueToDelete.id));
          }
        }}
      />
    </div>
  );
}
