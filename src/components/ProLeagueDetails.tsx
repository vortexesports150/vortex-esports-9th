import React, { useState, useEffect } from 'react';
import { Trophy, ArrowLeft, Shield, Calendar, Users, Star, Lock, Info, Plus, Swords, Minus, AlertTriangle, Youtube, BookOpen, CheckCircle } from 'lucide-react';
import { db } from '../lib/firebase';
import { runTransaction } from 'firebase/firestore';
import { doc, getDoc, collection, query, where, getDocs, addDoc, serverTimestamp, updateDoc } from 'firebase/firestore';
import { Team } from '../types';
import { ProHostedLeague, UserProfile } from '../types';
import { BRAND_THEMES, getHostThemeIndex } from './ProHostPanel';
import { HostFollowButton } from './HostFollowButton';

interface ProLeagueDetailsProps {
  leagueId: string;
  userProfile: UserProfile | null;
  onBack: () => void;
}

export function ProLeagueDetails({ leagueId, userProfile, onBack }: ProLeagueDetailsProps) {

  const [league, setLeague] = useState<ProHostedLeague | null>(null);
  const [squads, setSquads] = useState<any[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'info' | 'standings' | 'matches' | 'rules'>('info');
  const [currentTheme, setCurrentTheme] = useState(BRAND_THEMES[0]);
  useEffect(() => {
    if (league?.hostId) {
      setCurrentTheme(BRAND_THEMES[getHostThemeIndex(league.hostId)]);
    }
  }, [league?.hostId]);
  
  // States for generating matches
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [squadA, setSquadA] = useState('');
  const [squadB, setSquadB] = useState('');

  const [myTeams, setMyTeams] = useState<Team[]>([]);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [alreadyJoinedModalOpen, setAlreadyJoinedModalOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<string>('');
  const [registering, setRegistering] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  // States for coordinator
  const [showCoordinatorModal, setShowCoordinatorModal] = useState(false);
  const [coordinatorSearchId, setCoordinatorSearchId] = useState('');
  const [foundCoordinator, setFoundCoordinator] = useState<any>(null);

  // States for setting results
  const [showResultModal, setShowResultModal] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<any>(null);
  const [resultData, setResultData] = useState<any>({
    squadAAbsent: false,
    squadBAbsent: false,
    squadAWinner: false,
    squadBWinner: false,
    playerStats: {}
  });

  useEffect(() => {
    fetchData();
  }, [leagueId]);

  const fetchData = async () => {
    const docRef = doc(db, 'pro_hosted_leagues', leagueId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      setLeague({ id: docSnap.id, ...docSnap.data() } as ProHostedLeague);
    }
    
    const squadsSnap = await getDocs(query(collection(db, 'pro_league_squads'), where('leagueId', '==', leagueId)));
    const s = squadsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    s.sort((a: any, b: any) => (b.points || 0) - (a.points || 0));
    setSquads(s);

    const matchesSnap = await getDocs(query(collection(db, 'pro_league_matches'), where('leagueId', '==', leagueId)));
    const m = matchesSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    setMatches(m);

    if (userProfile?.userId) {
      const teamsSnap = await getDocs(query(collection(db, 'teams'), where('leaderId', '==', userProfile.userId)));
      setMyTeams(teamsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Team)));
    }
    
    setLoading(false);
  };

  const handleAutoGenerateSchedule = async () => {
    if (squads.length < 2) return alert("Not enough squads to generate a schedule.");
    if (!confirm("This will randomly pair up all currently registered squads. Proceed?")) return;
    
    setLoading(true);
    try {
      // Shuffle squads
      const shuffled = [...squads].sort(() => 0.5 - Math.random());
      
      const batch: any[] = [];
      for (let i = 0; i < shuffled.length; i += 2) {
        if (i + 1 < shuffled.length) {
          const s1 = shuffled[i];
          const s2 = shuffled[i + 1];
          batch.push(
            addDoc(collection(db, 'pro_league_matches'), {
              leagueId,
              squadAId: s1.id,
              squadAName: s1.teamName,
              squadAPlayers: s1.players || [],
              squadBId: s2.id,
              squadBName: s2.teamName,
              squadBPlayers: s2.players || [],
              status: 'upcoming',
              createdAt: serverTimestamp()
            })
          );
        }
      }
      
      await Promise.all(batch);
      
      // Update league status to ongoing if it was approved
      if (league?.status === 'approved') {
         await updateDoc(doc(db, 'pro_hosted_leagues', leagueId), { status: 'ongoing' });
      }
      
      alert("Schedule generated successfully!");
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Failed to generate schedule.");
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateMatch = async () => {
    if (!squadA || !squadB || squadA === squadB) return alert("Select two different squads.");
    const s1 = squads.find(s => s.id === squadA);
    const s2 = squads.find(s => s.id === squadB);
    
    await addDoc(collection(db, 'pro_league_matches'), {
      leagueId,
      squadAId: squadA,
      squadAName: s1.teamName,
      squadAPlayers: s1.players || [],
      squadBId: squadB,
      squadBName: s2.teamName,
      squadBPlayers: s2.players || [],
      status: 'upcoming',
      createdAt: serverTimestamp()
    });
    
    setShowMatchModal(false);
    fetchData();
  };

  const openResultSetter = (match: any) => {
    setSelectedMatch(match);
    const stats: any = {};
    (match.squadAPlayers || []).forEach((p: any) => {
      stats[p.uid] = { name: p.gameName, kills: 0, absent: false };
    });
    (match.squadBPlayers || []).forEach((p: any) => {
      stats[p.uid] = { name: p.gameName, kills: 0, absent: false };
    });
    setResultData({
      squadAAbsent: false,
      squadBAbsent: false,
      squadAWinner: false,
      squadBWinner: false,
      playerStats: stats
    });
    setShowResultModal(true);
  };

  const searchCoordinator = async () => {
    if (!coordinatorSearchId) return;
    try {
      const q = query(collection(db, 'users'), where('userId', '==', coordinatorSearchId));
      const snap = await getDocs(q);
      if (snap.empty) {
        alert("User not found with this ID.");
        setFoundCoordinator(null);
      } else {
        setFoundCoordinator({ id: snap.docs[0].id, ...snap.docs[0].data() });
      }
    } catch (e) {
      alert("Error searching user.");
    }
  };

  const addCoordinator = async () => {
    if (!foundCoordinator) return;
    if (league?.coordinators?.includes(foundCoordinator.userId)) {
      alert("Already a coordinator.");
      return;
    }
    
    const updatedCoordinators = [...(league?.coordinators || []), foundCoordinator.userId];
    try {
      await updateDoc(doc(db, 'pro_hosted_leagues', leagueId), {
        coordinators: updatedCoordinators
      });
      alert("Coordinator added!");
      setShowCoordinatorModal(false);
      setFoundCoordinator(null);
      fetchData();
    } catch (e) {
      alert("Error adding coordinator.");
    }
  };

  const handleSetResult = async () => {
    try {
      await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, 'pro_league_matches', selectedMatch.id);
        const s1Ref = doc(db, 'pro_league_squads', selectedMatch.squadAId);
        const s2Ref = doc(db, 'pro_league_squads', selectedMatch.squadBId);

        const s1Doc = await transaction.get(s1Ref);
        const s2Doc = await transaction.get(s2Ref);

        let s1Points = s1Doc.data()?.points || 0;
        let s2Points = s2Doc.data()?.points || 0;
        
        // 7-0 victory logic
        let finalScoreA = 0;
        let finalScoreB = 0;

        if (resultData.squadAAbsent && resultData.squadBAbsent) {
          // both 0
        } else if (resultData.squadAAbsent) {
          s2Points += 3;
          finalScoreB = 7;
        } else if (resultData.squadBAbsent) {
          s1Points += 3;
          finalScoreA = 7;
        } else {
          if (resultData.squadAWinner) { s1Points += 3; finalScoreA = 7; }
          if (resultData.squadBWinner) { s2Points += 3; finalScoreB = 7; }
        }

        transaction.update(s1Ref, { points: s1Points });
        transaction.update(s2Ref, { points: s2Points });

        transaction.update(matchRef, {
          status: 'completed',
          result: {
            scoreA: finalScoreA,
            scoreB: finalScoreB,
            squadAAbsent: resultData.squadAAbsent,
            squadBAbsent: resultData.squadBAbsent,
            playerStats: resultData.playerStats
          }
        });
      });
      setShowResultModal(false);
      fetchData();
    } catch (e) {
      console.error(e);
      alert("Error setting result");
    }
  };

  if (loading || !league) return <div className="text-white text-center py-10">Loading...</div>;

  const isHost = userProfile?.userId === league.hostId;
  const isSuperAdmin = userProfile?.role === 'main_admin' || userProfile?.role === 'admin';
  const hasRegistered = squads.some(s => s.leaderId === userProfile?.userId);

  const handleRegister = async () => {
    setRegError(null);
    const uEmail = (userProfile?.email || '').trim().toLowerCase();
    const uUserId = userProfile?.userId || (userProfile as any)?.id || (userProfile as any)?.uid;
    const uGamingUid = (userProfile?.gamingUid || (userProfile as any)?.gameUid || (userProfile as any)?.inGameUid || (userProfile as any)?.uidInGame || '').toString().trim();
    const uGameName = (userProfile?.gameName || userProfile?.displayName || '').trim().toLowerCase();

    const isUserAlreadyInLeague = squads.some(squad => {
      // 1. Leader / Captain check
      if (squad.leaderId && (squad.leaderId === uUserId || squad.leaderId === userProfile?.userId)) return true;
      if (squad.leaderEmail && uEmail && squad.leaderEmail.trim().toLowerCase() === uEmail) return true;
      if (squad.captainId && (squad.captainId === uUserId || squad.captainId === userProfile?.userId)) return true;

      // 2. Owned squads check
      if (myTeams.some(t => t.id === squad.teamId || t.id === squad.id)) return true;

      // 3. Squad players / members check
      const squadPlayers = squad.players || squad.members || squad.playerList || squad.roster || [];
      if (Array.isArray(squadPlayers)) {
        const isPlayerMatch = squadPlayers.some((m: any) => {
          if (!m) return false;
          const mUserId = m.userId || m.uid || m.id;
          if (mUserId && uUserId && (mUserId === uUserId || mUserId === userProfile?.userId)) return true;

          const mEmail = (m.email || '').trim().toLowerCase();
          if (mEmail && uEmail && mEmail === uEmail) return true;

          const mGamingUid = (m.gamingUid || m.uid || m.gameUid || m.inGameUid || '').toString().trim();
          if (mGamingUid && uGamingUid && mGamingUid === uGamingUid) return true;

          const mInGameName = (m.inGameName || m.gameName || m.name || m.playerName || m.displayName || '').trim().toLowerCase();
          if (uGameName && mInGameName && mInGameName === uGameName && mInGameName.length > 2) return true;

          return false;
        });
        if (isPlayerMatch) return true;
      }

      return false;
    });

    if (isUserAlreadyInLeague) {
      setShowRegisterModal(false);
      setAlreadyJoinedModalOpen(true);
      return;
    }

    if (!selectedTeam) {
      setRegError('Select a team');
      return;
    }
    const team = myTeams.find(t => t.id === selectedTeam);
    if (!team) return;

    // Check if any member of the selected squad is already registered with another squad in this league
    const teamMembers = team.members || [];
    const conflictingMember = teamMembers.find((m: any) => {
      if (!m) return false;
      const mUid = m.userId || m.uid || m.id;
      const mEmail = (m.email || '').trim().toLowerCase();
      const mGamingUid = (m.gamingUid || m.uid || m.gameUid || m.inGameUid || '').toString().trim();

      return squads.some((sq: any) => {
        if (sq.leaderId && mUid && sq.leaderId === mUid) return true;
        if (sq.leaderEmail && mEmail && sq.leaderEmail.trim().toLowerCase() === mEmail) return true;

        const regPlayers = sq.players || sq.members || sq.playerList || sq.roster || [];
        return Array.isArray(regPlayers) && regPlayers.some((sp: any) => {
          if (!sp) return false;
          const spUid = sp.userId || sp.uid || sp.id;
          if (spUid && mUid && spUid === mUid) return true;
          const spEmail = (sp.email || '').trim().toLowerCase();
          if (spEmail && mEmail && spEmail === mEmail) return true;
          const spGamingUid = (sp.gamingUid || sp.uid || sp.gameUid || sp.inGameUid || '').toString().trim();
          if (spGamingUid && mGamingUid && spGamingUid === mGamingUid) return true;
          return false;
        });
      });
    });

    if (conflictingMember) {
      setRegError(`Member "${(conflictingMember as any).gameName || (conflictingMember as any).displayName || (conflictingMember as any).inGameName || conflictingMember.email || 'A player'}" is already registered with another Squad in this league!`);
      return;
    }
    
    // Check location restrictions
    const uDiv = userProfile?.division || '';
    const uDist = userProfile?.district || '';
    const uUpa = userProfile?.upazila || '';

    if (league?.locationRestrictionType === 'specific_division' && uDiv !== league.allowedDivision) {
      setRegError(`This league is restricted to squads from ${league.allowedDivision} division only.`);
      return;
    }
    if (league?.locationRestrictionType === 'specific_district' && uDist !== league.allowedDistrict) {
      setRegError(`This league is restricted to squads from ${league.allowedDistrict} district only.`);
      return;
    }
    if (league?.locationRestrictionType === 'specific_upazila' && uUpa !== league.allowedUpazila) {
      setRegError(`This league is restricted to squads from ${league.allowedUpazila} upazila only.`);
      return;
    }

    const isOwnSquad = (s: any) => 
      (s.leaderId && (s.leaderId === uUserId || s.leaderId === userProfile?.userId)) ||
      (s.leaderEmail && s.leaderEmail.trim().toLowerCase() === uEmail) ||
      myTeams.some(t => t.id === s.teamId);

    if (league?.representationRule && league.representationRule !== 'any') {
      if (league.representationRule === 'one_squad_per_division') {
         if (!uDiv) {
           setRegError("Your profile must have a division set to join this league.");
           return;
         }
         const existing = squads.find(s => s.division && s.division.trim().toLowerCase() === uDiv.trim().toLowerCase());
         if (existing) {
           setRegError(`Someone from your Division (${uDiv}) has already joined this league! Only 1 squad per Division is allowed.`);
           return;
         }
      }
      if (league.representationRule === 'one_squad_per_district') {
         if (!uDist) {
           setRegError("Your profile must have a district set to join this league.");
           return;
         }
         const existing = squads.find(s => s.district && s.district.trim().toLowerCase() === uDist.trim().toLowerCase());
         if (existing) {
           setRegError(`Someone from your District (${uDist}) has already joined this league! Only 1 squad per District is allowed.`);
           return;
         }
      }
      if (league.representationRule === 'one_squad_per_upazila') {
         if (!uUpa) {
           setRegError("Your profile must have an upazila set to join this league.");
           return;
         }
         const existing = squads.find(s => s.upazila && s.upazila.trim().toLowerCase() === uUpa.trim().toLowerCase());
         if (existing) {
           setRegError(`Someone from your Upazila (${uUpa}) has already joined this league! Only 1 squad per Upazila is allowed.`);
           return;
         }
      }
    }

    if (league?.entryFee && league.entryFee > 0) {
      if (!confirm(`This will deduct ${league.entryFee} tokens from your account. Proceed?`)) return;
    }

    setRegistering(true);
    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', userProfile!.userId);
        const leagueRef = doc(db, 'pro_hosted_leagues', league.id);

        const [userDoc, leagueDoc] = await Promise.all([
          transaction.get(userRef),
          transaction.get(leagueRef)
        ]);

        if (!leagueDoc.exists()) throw new Error('League not found');
        const leagueData = leagueDoc.data();
        const normalizedUserEmail = (userProfile?.email || '').toLowerCase();
        const isUserAdminOrHost = normalizedUserEmail === 'vortexesports150@gmail.com' || 
                                 userProfile?.role === 'admin' || 
                                 userProfile?.role === 'main_admin' || 
                                 userProfile?.role === 'sub_admin' || 
                                 leagueData?.hostId === userProfile?.userId;

        // Location Restrictions (Atomic)
        if (leagueData.locationRestrictionType) {
          if (leagueData.locationRestrictionType === 'specific_division') {
            if (!uDiv || uDiv.trim().toLowerCase() !== (leagueData.allowedDivision || '').trim().toLowerCase()) {
              throw new Error(`This league is restricted to squads from ${leagueData.allowedDivision || 'specific'} Division.`);
            }
          } else if (leagueData.locationRestrictionType === 'specific_district') {
            if (!uDist || uDist.trim().toLowerCase() !== (leagueData.allowedDistrict || '').trim().toLowerCase()) {
              throw new Error(`This league is restricted to squads from ${leagueData.allowedDistrict || 'specific'} District.`);
            }
          } else if (leagueData.locationRestrictionType === 'specific_upazila') {
            if (!uUpa || uUpa.trim().toLowerCase() !== (leagueData.allowedUpazila || '').trim().toLowerCase()) {
              throw new Error(`This league is restricted to squads from ${leagueData.allowedUpazila || 'specific'} Upazila.`);
            }
          }
        }

        // Regional representation checks (Atomic)
        if (leagueData.representationRule && leagueData.representationRule !== 'any') {
          if (leagueData.representationRule === 'one_squad_per_division') {
            if (!uDiv) throw new Error("Your profile must have a division set to join this league.");
            const existing = squads.find(s => s.division && s.division.trim().toLowerCase() === uDiv.trim().toLowerCase());
            if (existing) {
              throw new Error(`Someone from your Division (${uDiv}) has already joined this league! Only 1 squad per Division is allowed.`);
            }
          } else if (leagueData.representationRule === 'one_squad_per_district') {
            if (!uDist) throw new Error("Your profile must have a district set to join this league.");
            const existing = squads.find(s => s.district && s.district.trim().toLowerCase() === uDist.trim().toLowerCase());
            if (existing) {
              throw new Error(`Someone from your District (${uDist}) has already joined this league! Only 1 squad per District is allowed.`);
            }
          } else if (leagueData.representationRule === 'one_squad_per_upazila') {
            if (!uUpa) throw new Error("Your profile must have an upazila set to join this league.");
            const existing = squads.find(s => s.upazila && s.upazila.trim().toLowerCase() === uUpa.trim().toLowerCase());
            if (existing) {
              throw new Error(`Someone from your Upazila (${uUpa}) has already joined this league! Only 1 squad per Upazila is allowed.`);
            }
          }
        }

        if (league?.entryFee && league.entryFee > 0) {
          const currentTokens = userDoc.data()?.tokens || 0;
          if (currentTokens < league.entryFee) {
            throw new Error('Insufficient tokens');
          }
          transaction.update(userRef, { tokens: currentTokens - league.entryFee });
        }
        
        const newSquadRef = doc(collection(db, 'pro_league_squads'));
        transaction.set(newSquadRef, {
          leagueId,
          teamId: team.id,
          teamName: team.name,
          leaderId: userProfile?.userId,
          division: uDiv,
          district: uDist,
          upazila: uUpa,
          players: team.members,
          points: 0,
          createdAt: serverTimestamp()
        });

        // Update explicit regional lists in league doc
        const allSquadsList = [...squads, { division: uDiv, district: uDist, upazila: uUpa }];
        const finalUpazilas = Array.from(new Set(
          allSquadsList.map((s: any) => s.upazila).filter(Boolean).map((u: string) => u.trim())
        ));
        const finalDistricts = Array.from(new Set(
          allSquadsList.map((s: any) => s.district).filter(Boolean).map((d: string) => d.trim())
        ));
        const finalDivisions = Array.from(new Set(
          allSquadsList.map((s: any) => s.division).filter(Boolean).map((v: string) => v.trim())
        ));

        transaction.update(leagueRef, {
          registeredUpazilas: finalUpazilas,
          registeredDistricts: finalDistricts,
          registeredDivisions: finalDivisions
        });
      });

      setShowRegisterModal(false);
      fetchData();
    } catch (e: any) {
      alert(e.message || 'Error registering');
    } finally {
      setRegistering(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">
      <div className="flex items-center gap-4 mb-4">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-full transition-colors bg-slate-800">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <div>
          <h2 className="text-2xl font-black text-white uppercase tracking-wider">{league.leagueName}</h2>
          <p className="text-sm text-slate-400">{league.brandName} - League #{league.seasonNumber}</p>
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 overflow-hidden shadow-lg relative bg-slate-900">
        <div className="absolute top-0 left-0 w-full h-1.5" style={{ backgroundColor: league.cardColor }}></div>
        <div className="p-5">
           <div className="flex justify-between items-start mb-6">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl flex items-center justify-center font-black text-3xl text-white shadow-inner" style={{ backgroundColor: league.cardColor }}>
                {league.brandName.substring(0, 1)}
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">{league.brandName}</h3>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-sm text-slate-400">Hosted by: {league.brandName || league.hostName}</p>
                  <HostFollowButton 
                    hostId={league.hostId || (league as any).hostUserId || (league as any).createdBy || 'official_host'} 
                    currentUserId={userProfile?.userId || (userProfile as any)?.uid || (userProfile as any)?.id} 
                    followType="host"
                  />
                </div>
              </div>
            </div>
            <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${currentTheme.bg} ${currentTheme.text}`}>
              {league.status}
            </span>
          </div>

          {(isHost || isSuperAdmin) && (
            <div className={`p-4 ${currentTheme.bg} border ${currentTheme.border} rounded-xl flex gap-3 overflow-x-auto mb-6`}>
              <button 
                onClick={() => setShowMatchModal(true)}
                className={`whitespace-nowrap px-4 py-2 ${currentTheme.accentBg} text-white rounded-lg font-bold text-sm transition flex items-center gap-2`}
              >
                <Swords className="w-4 h-4"/> Create Match
              </button>
            </div>
          )}

          <div className="flex border-b border-white/10 overflow-x-auto">
            {['info', 'standings', 'matches', 'rules'].map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`px-6 py-3 font-bold text-sm uppercase tracking-wider transition-colors border-b-2 whitespace-nowrap ${
                  activeTab === tab ? `${currentTheme.border} ${currentTheme.text}` : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
          
          <div className="pt-6">
            {activeTab === 'info' && (
              <div className="space-y-6">
                 <div className="flex items-center gap-3 flex-wrap">
                   <p className="text-slate-400 text-sm font-mono">League ID: {league.id}</p>
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
                       className={`inline-flex items-center gap-1 px-1 py-0.5 bg-transparent border-none shadow-none text-amber-300 ${league.sponsorLinkUrl ? 'hover:opacity-80 cursor-pointer' : 'cursor-default'}`}
                     >
                       <span className="text-[8px] font-black uppercase text-amber-400 tracking-wider">SPONSORED BY:</span>
                       {league.sponsorLogoUrl && (
                         <img src={league.sponsorLogoUrl} alt="Sponsor Logo" className="h-5 max-w-[100px] object-contain drop-shadow-sm" />
                       )}
                       {league.sponsorName && (
                         <span className="text-[10px] font-extrabold text-amber-200 uppercase tracking-wider">{league.sponsorName}</span>
                       )}
                     </div>
                   )}
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <div className="text-xs text-slate-400 mb-1">Prize Pool</div>
                        <div className={`text-xl font-bold ${currentTheme.text}`}>{league.prizePool} Tokens</div>
                    </div>
                    <div className="bg-slate-800 p-4 rounded-xl border border-slate-700">
                        <div className="text-xs text-slate-400 mb-1">Squads</div>
                        <div className="text-xl font-bold text-white">{squads.length} / {league.squadSize}</div>
                    </div>
                 </div>
              </div>
            )}
            
            {activeTab === 'standings' && (
              <div className="space-y-3">
                {squads.length === 0 ? (
                  <div className="text-slate-400 text-center py-10">No squads registered.</div>
                ) : (
                  squads.map((s, idx) => (
                    <div key={s.id} className="flex justify-between items-center bg-slate-800 p-4 rounded-xl border border-white/5">
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-black w-6">{idx + 1}</span>
                        <div className="font-bold text-white">{s.teamName}</div>
                      </div>
                      <div className={`${currentTheme.text} font-bold`}>{s.points || 0} pts</div>
                    </div>
                  ))
                )}
              </div>
            )}
            
            {activeTab === 'matches' && (
              <div className="space-y-4">
                 {matches.map(m => (
                    <div key={m.id} className="bg-slate-800 p-4 rounded-xl border border-white/5 flex flex-col">
                      <div className="flex justify-between items-center mb-3 text-sm">
                        <span className="text-slate-400">{new Date(m.createdAt?.toDate?.() || Date.now()).toLocaleDateString()}</span>
                        <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${m.status === 'completed' ? 'bg-green-500/20 text-green-400' : `${currentTheme.bg} ${currentTheme.text}`}`}>
                          {m.status}
                        </span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <div className="flex-1 font-bold text-white text-center">{m.squadAName}</div>
                        <div className="px-4 text-slate-500 text-xs font-black">VS</div>
                        <div className="flex-1 font-bold text-white text-center">{m.squadBName}</div>
                      </div>
                      
                      {m.status === 'completed' && (
                        <div className="mt-3 bg-slate-900/50 rounded-lg p-2 flex justify-between items-center">
                           <div className={`flex-1 text-center font-black text-xl ${currentTheme.text}`}>{m.result.scoreA}</div>
                           <div className="px-2 text-[10px] text-slate-500 uppercase">Score</div>
                           <div className={`flex-1 text-center font-black text-xl ${currentTheme.text}`}>{m.result.scoreB}</div>
                        </div>
                      )}

                      {m.status === 'upcoming' && (isHost || isSuperAdmin) && (
                        <button onClick={() => openResultSetter(m)} className={`mt-4 w-full py-2 ${currentTheme.accentBg} text-white font-bold rounded-lg transition-colors text-sm`}>
                          Set Result
                        </button>
                      )}
                    </div>
                 ))}
              </div>
            )}

            {activeTab === 'rules' && (
              <div className="space-y-6">
                {/* Host Duties & Live Streaming Panel */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-red-950/20 to-slate-900/40 border border-red-500/20 relative overflow-hidden shadow-[0_0_15px_rgba(239,68,68,0.05)]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400">
                      <Youtube className="w-5 h-5 shrink-0" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">Host Streaming & Match Duties</h4>
                      <p className="text-[10px] text-red-400 font-mono uppercase tracking-widest">Mandatory Host Operations</p>
                    </div>
                  </div>
                  
                  <div className="space-y-3 font-mono text-[11px] text-slate-300">
                    <div className="flex gap-2.5 items-start">
                      <span className="text-red-400 font-black">01.</span>
                      <div>
                        <strong className="text-red-300 block mb-0.5">YOUTUBE LIVE STREAMING</strong>
                        Every single match of this Upazila League must be live-streamed on YouTube by the designated Host. The livestream link must be provided in the match details for players and spectators.
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="text-red-400 font-black">02.</span>
                      <div>
                        <strong className="text-red-300 block mb-0.5">ROOM ID & PASSWORD GENERATION</strong>
                        The Host is strictly required to create the custom Free Fire lobby room and publish the Room ID and Password exactly 15 minutes before the scheduled match start time.
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="text-red-400 font-black">03.</span>
                      <div>
                        <strong className="text-red-300 block mb-0.5">SLOT & ROSTER ALIGNMENT</strong>
                        The Host will verify each squad's registered players. Players must sit strictly inside their designated slot numbers in the custom lobby. The Host holds absolute authority to kick unregistered players or squads sitting in incorrect slots.
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="text-red-400 font-black">04.</span>
                      <div>
                        <strong className="text-red-300 block mb-0.5">SCOREBOARD CAPTURE & RESULTS</strong>
                        At the end of the match, the Host must take a high-resolution screenshot of the final score screen and upload it into the system to process kills, placement points, and automatically distribute prize rewards. Players do NOT need to submit screenshots.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Squad & Play Regulations */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-950/20 to-slate-900/40 border border-cyan-500/20 relative overflow-hidden shadow-[0_0_15px_rgba(6,182,212,0.05)]">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/5 rounded-full blur-2xl pointer-events-none" />
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
                      <BookOpen className="w-5 h-5 shrink-0" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">Squad Match Regulations</h4>
                      <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest">Roster & Attendance Guidelines</p>
                    </div>
                  </div>

                  <div className="space-y-3 font-mono text-[11px] text-slate-300">
                    <div className="flex gap-2.5 items-start">
                      <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-cyan-300 block mb-0.5">SQUAD INTEGRITY</strong>
                        Only registered squad players are allowed to participate. Using unregistered substitute players (ringers) is strictly forbidden and results in squad disqualification.
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-cyan-300 block mb-0.5">PUNCTUALITY & ATTENDANCE</strong>
                        All squads must be present inside the custom room lobby at least 5 minutes before match start. Delayed squads will be locked out; entry fees will NOT be refunded under any circumstances for no-show squads.
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <CheckCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                      <div>
                        <strong className="text-cyan-300 block mb-0.5">MATCH CANCELLATION & REFUNDS</strong>
                        If a match is cancelled by the Host due to technical, regional, or server problems, 100% of the squad's entry fee will be immediately refunded back to the team leader's main wallet.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fair Play & Anti-Cheat */}
                <div className="p-5 rounded-2xl bg-gradient-to-br from-indigo-950/20 to-slate-900/40 border border-indigo-500/20 relative overflow-hidden">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2.5 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-indigo-400">
                      <Shield className="w-5 h-5 shrink-0" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white uppercase tracking-wider">Fair Play & Anti-Cheat Policy</h4>
                      <p className="text-[10px] text-indigo-400 font-mono uppercase tracking-widest">Strict Platform Standards</p>
                    </div>
                  </div>

                  <div className="space-y-3 font-mono text-[11px] text-slate-300">
                    <div className="flex gap-2.5 items-start">
                      <span className="text-indigo-400 font-bold shrink-0">🚫</span>
                      <div>
                        <strong className="text-indigo-300 block mb-0.5">THIRD-PARTY HACKS & SCRIPTS</strong>
                        Using any form of third-party software, hacks, wallhacks, auto-aim files, modified APKs, or custom scripts is strictly banned. Violating accounts will be permanently frozen and blacklisted.
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="text-indigo-400 font-bold shrink-0">🚫</span>
                      <div>
                        <strong className="text-indigo-300 block mb-0.5">EMULATOR BAN (MOBILE-ONLY)</strong>
                        All players must play exclusively on mobile devices. Emulators (PC) are strictly prohibited. The Host will automatically monitor player devices and kick emulator users.
                      </div>
                    </div>
                    <div className="flex gap-2.5 items-start">
                      <span className="text-indigo-400 font-bold shrink-0">🚫</span>
                      <div>
                        <strong className="text-indigo-300 block mb-0.5">COLLABORATION & TEAMING</strong>
                        Teaming up with opponent squads is completely prohibited. If collusion is detected on the livestream or scoreboard records, both squads will be instantly disqualified from the entire league, and their previous points will be voided.
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {showCoordinatorModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
             <h3 className="text-lg font-bold text-white mb-4">Add Coordinator</h3>
             <div className="mb-4">
               <label className="text-xs text-slate-400 mb-1 block">User ID</label>
               <div className="flex gap-2">
                 <input 
                   type="text" 
                   value={coordinatorSearchId}
                   onChange={e => setCoordinatorSearchId(e.target.value)}
                   className="flex-1 bg-slate-800 text-white rounded-lg p-2 text-sm border border-slate-700 outline-none"
                   placeholder="Enter User ID"
                 />
                 <button onClick={searchCoordinator} className="px-4 py-2 bg-slate-700 text-white rounded-lg text-sm font-bold">Search</button>
               </div>
             </div>
             
             {foundCoordinator && (
               <div className="bg-slate-800 p-3 rounded-lg border border-slate-700 mb-6">
                 <div className="font-bold text-white">{foundCoordinator.name || foundCoordinator.username}</div>
                 <div className="text-xs text-slate-400">{foundCoordinator.email}</div>
                 <div className={`text-xs ${currentTheme.text} font-mono mt-1`}>{foundCoordinator.userId}</div>
               </div>
             )}
             
             <div className="flex gap-2">
               <button onClick={() => { setShowCoordinatorModal(false); setFoundCoordinator(null); }} className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold">Cancel</button>
               <button onClick={addCoordinator} disabled={!foundCoordinator} className={`flex-1 py-2 ${currentTheme.accentBg} text-white rounded-lg text-sm font-bold disabled:opacity-50`}>Add</button>
             </div>
           </div>
        </div>
      )}

      {showRegisterModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
             <h3 className="text-lg font-bold text-white mb-4">Register Your Squad</h3>
             
             {regError && (
               <div className="mb-4 bg-red-950/80 border border-red-500/80 rounded-xl p-3 text-xs text-red-200 flex items-start gap-2 animate-shake">
                 <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                 <span>{regError}</span>
               </div>
             )}

             {myTeams.length === 0 ? (
               <p className="text-slate-400 text-sm mb-4">You don't have any teams. Create a team first in My Team section.</p>
             ) : (
               <select value={selectedTeam} onChange={e => setSelectedTeam(e.target.value)} className="w-full bg-slate-800 text-white rounded-lg p-3 text-sm border border-slate-700 mb-6">
                 <option value="">Select your team</option>
                 {myTeams.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
               </select>
             )}
             <div className="flex gap-2">
               <button onClick={() => setShowRegisterModal(false)} className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold">Cancel</button>
               {myTeams.length > 0 && (
                 <button onClick={handleRegister} disabled={registering} className={`flex-1 py-2 ${currentTheme.accentBg} text-white rounded-lg text-sm font-bold disabled:opacity-50`}>
                   {registering ? 'Registering...' : 'Register'}
                 </button>
               )}
             </div>
           </div>
        </div>
      )}

      {showMatchModal && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4">
           <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-sm">
             <h3 className="text-lg font-bold text-white mb-4">Generate Match</h3>
             <div className="space-y-4">
               <div>
                 <label className="text-xs text-slate-400 mb-1 block">Squad A</label>
                 <select value={squadA} onChange={e => setSquadA(e.target.value)} className="w-full bg-slate-800 text-white rounded-lg p-2 text-sm border border-slate-700">
                   <option value="">Select Squad</option>
                   {squads.map(s => <option key={s.id} value={s.id}>{s.teamName}</option>)}
                 </select>
               </div>
               <div>
                 <label className="text-xs text-slate-400 mb-1 block">Squad B</label>
                 <select value={squadB} onChange={e => setSquadB(e.target.value)} className="w-full bg-slate-800 text-white rounded-lg p-2 text-sm border border-slate-700">
                   <option value="">Select Squad</option>
                   {squads.map(s => <option key={s.id} value={s.id}>{s.teamName}</option>)}
                 </select>
               </div>
             </div>
             <div className="flex gap-2 mt-6">
               <button onClick={() => setShowMatchModal(false)} className="flex-1 py-2 bg-slate-800 text-white rounded-lg text-sm font-bold">Cancel</button>
               <button onClick={handleGenerateMatch} className={`flex-1 py-2 ${currentTheme.accentBg} text-white rounded-lg text-sm font-bold`}>Create</button>
             </div>
           </div>
        </div>
      )}

      {showResultModal && selectedMatch && (
        <div className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 overflow-y-auto">
           <div className="bg-slate-900 border border-white/10 rounded-2xl p-6 w-full max-w-lg my-10">
             <h3 className="text-lg font-bold text-white mb-4 text-center">Set Match Result</h3>
             
             <div className="space-y-6">
                {/* Squad A */}
                <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                  <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
                    <h4 className={`font-bold ${currentTheme.text}`}>{selectedMatch.squadAName}</h4>
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input type="checkbox" checked={resultData.squadAAbsent} onChange={e => setResultData({...resultData, squadAAbsent: e.target.checked})} className="rounded bg-slate-900 border-slate-600"/>
                      Absent
                    </label>
                  </div>
                  
                  {!resultData.squadAAbsent && (
                    <>
                      <div className="space-y-3">
                        {(selectedMatch.squadAPlayers || []).map((p: any) => (
                          <div key={p.uid} className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">{p.gameName}</span>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1 text-[10px] text-red-400">
                                <input type="checkbox" checked={resultData.playerStats[p.uid]?.absent} onChange={e => {
                                  const st = {...resultData.playerStats};
                                  st[p.uid].absent = e.target.checked;
                                  setResultData({...resultData, playerStats: st});
                                }}/>
                                Abs
                              </label>
                              <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg">
                                <button onClick={() => {
                                  const st = {...resultData.playerStats};
                                  if (st[p.uid].kills > 0) st[p.uid].kills -= 1;
                                  setResultData({...resultData, playerStats: st});
                                }} className="p-1 hover:bg-slate-800 rounded"><Minus className="w-3 h-3 text-slate-400"/></button>
                                <span className="text-xs font-bold w-4 text-center">{resultData.playerStats[p.uid]?.kills || 0}</span>
                                <button onClick={() => {
                                  const st = {...resultData.playerStats};
                                  st[p.uid].kills += 1;
                                  setResultData({...resultData, playerStats: st});
                                }} className="p-1 hover:bg-slate-800 rounded"><Plus className="w-3 h-3 text-slate-400"/></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-700">
                        <label className="flex items-center gap-2 text-sm font-bold text-green-400">
                          <input type="checkbox" checked={resultData.squadAWinner} onChange={e => setResultData({...resultData, squadAWinner: e.target.checked, squadBWinner: !e.target.checked})} className="rounded bg-slate-900 border-green-500 accent-green-500"/>
                          Mark as Winner (7-0)
                        </label>
                      </div>
                    </>
                  )}
                </div>

                <div className="text-center font-black text-slate-500">VS</div>

                {/* Squad B */}
                <div className="p-4 bg-slate-800 rounded-xl border border-slate-700">
                  <div className="flex justify-between items-center mb-3 border-b border-slate-700 pb-2">
                    <h4 className={`font-bold ${currentTheme.text}`}>{selectedMatch.squadBName}</h4>
                    <label className="flex items-center gap-2 text-xs text-slate-300">
                      <input type="checkbox" checked={resultData.squadBAbsent} onChange={e => setResultData({...resultData, squadBAbsent: e.target.checked})} className="rounded bg-slate-900 border-slate-600"/>
                      Absent
                    </label>
                  </div>
                  
                  {!resultData.squadBAbsent && (
                    <>
                      <div className="space-y-3">
                        {(selectedMatch.squadBPlayers || []).map((p: any) => (
                          <div key={p.uid} className="flex justify-between items-center">
                            <span className="text-sm text-slate-300">{p.gameName}</span>
                            <div className="flex items-center gap-3">
                              <label className="flex items-center gap-1 text-[10px] text-red-400">
                                <input type="checkbox" checked={resultData.playerStats[p.uid]?.absent} onChange={e => {
                                  const st = {...resultData.playerStats};
                                  st[p.uid].absent = e.target.checked;
                                  setResultData({...resultData, playerStats: st});
                                }}/>
                                Abs
                              </label>
                              <div className="flex items-center gap-2 bg-slate-900 px-2 py-1 rounded-lg">
                                <button onClick={() => {
                                  const st = {...resultData.playerStats};
                                  if (st[p.uid].kills > 0) st[p.uid].kills -= 1;
                                  setResultData({...resultData, playerStats: st});
                                }} className="p-1 hover:bg-slate-800 rounded"><Minus className="w-3 h-3 text-slate-400"/></button>
                                <span className="text-xs font-bold w-4 text-center">{resultData.playerStats[p.uid]?.kills || 0}</span>
                                <button onClick={() => {
                                  const st = {...resultData.playerStats};
                                  st[p.uid].kills += 1;
                                  setResultData({...resultData, playerStats: st});
                                }} className="p-1 hover:bg-slate-800 rounded"><Plus className="w-3 h-3 text-slate-400"/></button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-4 pt-3 border-t border-slate-700">
                        <label className="flex items-center gap-2 text-sm font-bold text-green-400">
                          <input type="checkbox" checked={resultData.squadBWinner} onChange={e => setResultData({...resultData, squadBWinner: e.target.checked, squadAWinner: !e.target.checked})} className="rounded bg-slate-900 border-green-500 accent-green-500"/>
                          Mark as Winner (7-0)
                        </label>
                      </div>
                    </>
                  )}
                </div>
             </div>

             <div className="flex gap-2 mt-6">
               <button onClick={() => setShowResultModal(false)} className="flex-1 py-3 bg-slate-800 text-white rounded-lg text-sm font-bold">Cancel</button>
               <button onClick={handleSetResult} className={`flex-1 py-3 ${currentTheme.accentBg} text-white rounded-lg text-sm font-bold`}>Save Result</button>
             </div>
           </div>
        </div>
      )}

      {/* Already Joined Warning Pop-Up Modal */}
      {alreadyJoinedModalOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="bg-[#090d22] border-2 border-amber-500/60 rounded-3xl p-6 w-full max-w-sm text-center relative overflow-hidden shadow-[0_0_40px_rgba(245,158,11,0.3)]">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500" />
            
            <div className="w-16 h-16 rounded-full bg-amber-500/15 border-2 border-amber-500/40 flex items-center justify-center mx-auto mb-4 text-amber-400 shadow-[0_0_25px_rgba(245,158,11,0.35)] animate-pulse">
              <AlertTriangle className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-black text-white uppercase tracking-tight mb-2">
              Already Joined in this League
            </h3>

            <p className="text-xs text-slate-300 font-medium leading-relaxed mb-6 bg-white/5 border border-white/10 rounded-2xl p-4 text-center">
              You or a member of your squad are already registered with a Squad in this league. A player or account cannot join with another Squad in the same league.
            </p>

            <button
              onClick={() => setAlreadyJoinedModalOpen(false)}
              className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-slate-950 font-black text-xs uppercase tracking-widest rounded-xl transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] cursor-pointer active:scale-95"
            >
              Understood
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
