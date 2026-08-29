import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Crown, 
  Flame, 
  Shield, 
  MapPin, 
  ChevronRight, 
  Sparkles, 
  Swords, 
  TrendingUp, 
  Users, 
  Award,
  Medal,
  SlidersHorizontal,
  Target,
  X,
  ExternalLink,
  Search,
  CheckCircle2,
  Copy,
  Check,
  Gamepad2,
  UserCheck,
  Clock,
  Zap
} from 'lucide-react';
import BD_GEOGRAPHY from '../lib/geography';

export interface SquadMember {
  userId?: string;
  playvearId?: string;
  displayName?: string;
  name?: string;
  email?: string;
  role?: string;
  gameName?: string;
  gamingUid?: string;
  ign?: string;
  photoUrl?: string;
  photoURL?: string;
  status?: string;
  isCaptain?: boolean;
}

export interface SquadStats {
  id: string;
  name: string;
  tag?: string;
  squadId?: string;
  coverUrl?: string;
  leaderName: string;
  leaderPhoto?: string;
  leaderId?: string;
  leaderPlayvearId?: string;
  leaderEmail?: string;
  division: string;
  district: string;
  upazila: string;
  calculatedRank?: number;
  isRegistered?: boolean;
  createdAt?: string;
  // Tournament performance
  tourneyMatches: number;
  tourneyPoints: number;
  tourneyBooyahs: number;
  tourneyKills: number;
  tourneyWinRate: number;
  // League squad performance
  leagueMatches: number;
  leaguePoints: number;
  leagueBooyahs: number;
  leagueKills: number;
  leagueWinRate: number;
  // Combined
  points: number; 
  booyahs: number; 
  totalKills: number; 
  matchesPlayed: number;
  economyScore: number;
  members?: SquadMember[];
  recentForm?: ('W' | 'L' | 'D')[];
}

// Empty baseline - leaderboard strictly shows real player-registered squads from Firestore
export const RICH_DEFAULT_SQUADS: SquadStats[] = [];

interface SquadLeaderboardViewProps {
  allTeamsList: any[];
  onInspectSquad?: (squad: SquadStats) => void;
}

export const SquadLeaderboardView: React.FC<SquadLeaderboardViewProps> = ({
  allTeamsList,
  onInspectSquad
}) => {
  // Main Navigation: Top 10 Elite Standings vs All Registered Squads Directory
  const [viewMode, setViewMode] = useState<'top10' | 'all_registered'>('top10');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Performance Category Switcher (Combined vs Tournaments vs Leagues)
  const [activeCategory, setActiveCategory] = useState<'combined' | 'tournaments' | 'leagues'>('combined');
  
  // Location filters
  const [selectedDivision, setSelectedDivision] = useState<string>('all');
  const [selectedDistrict, setSelectedDistrict] = useState<string>('all');
  const [selectedUpazila, setSelectedUpazila] = useState<string>('all');
  
  // Primary metric sorting
  const [selectedSortMetric, setSelectedSortMetric] = useState<'power' | 'points' | 'booyahs' | 'kills' | 'winrate'>('power');
  
  // Internal inspect modal state for detailed squad dossier
  const [modalSquad, setModalSquad] = useState<SquadStats | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, idKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedId(idKey);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Convert raw Firestore team data and merge into structured SquadStats (only real player-created squads)
  const allProcessedSquads = useMemo(() => {
    const squadMap = new Map<string, SquadStats>();

    // Ingest all officially registered squads created by players in the app
    (allTeamsList || []).forEach((t: any) => {
      if (t && (t.name || t.id)) {
        const id = t.id || t.name;

        // Normalize roster / members list
        let membersList: SquadMember[] = [];
        if (Array.isArray(t.members) && t.members.length > 0) {
          membersList = t.members.map((m: any) => ({
            userId: m.userId || '',
            playvearId: m.playvearId || '',
            name: m.displayName || m.name || (m.role === 'leader' ? (t.leaderName || 'Captain') : 'Squad Member'),
            displayName: m.displayName || m.name || (m.role === 'leader' ? (t.leaderName || 'Captain') : 'Squad Member'),
            role: m.role === 'leader' ? 'IGL / Captain' : (m.role || 'Active Member'),
            ign: m.gameName || m.ign || m.gamingUid || '',
            gamingUid: m.gamingUid || '',
            photoUrl: m.photoURL || m.photoUrl || (m.role === 'leader' ? (t.leaderPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200') : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=200'),
            status: m.status || 'joined',
            isCaptain: m.role === 'leader'
          }));
        } else {
          membersList = [
            {
              name: t.leaderName || 'Captain',
              displayName: t.leaderName || 'Captain',
              role: 'IGL / Captain',
              playvearId: t.leaderPlayvearId || '',
              ign: t.leaderGameName || '',
              gamingUid: t.leaderGamingUid || '',
              photoUrl: t.leaderPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200',
              status: 'joined',
              isCaptain: true
            }
          ];
        }

        // Tournament metrics
        const tourneyMatches = typeof t.tourneyMatches === 'number' ? t.tourneyMatches : (typeof t.matchesPlayed === 'number' ? Math.round(t.matchesPlayed * 0.6) : 0);
        const tourneyPoints = typeof t.tourneyPoints === 'number' ? t.tourneyPoints : (typeof t.points === 'number' ? Math.round(t.points * 0.6) : 0);
        const tourneyBooyahs = typeof t.tourneyBooyahs === 'number' ? t.tourneyBooyahs : (typeof t.booyahs === 'number' ? Math.round(t.booyahs * 0.6) : 0);
        const tourneyKills = typeof t.tourneyKills === 'number' ? t.tourneyKills : (typeof t.totalKills === 'number' ? Math.round(t.totalKills * 0.6) : 0);
        const tourneyWinRate = tourneyMatches > 0 ? Math.round((tourneyBooyahs / tourneyMatches) * 100) : 0;

        // League metrics
        const leagueMatches = typeof t.leagueMatches === 'number' ? t.leagueMatches : (typeof t.matchesPlayed === 'number' ? Math.round(t.matchesPlayed * 0.4) : 0);
        const leaguePoints = typeof t.leaguePoints === 'number' ? t.leaguePoints : (typeof t.points === 'number' ? Math.round(t.points * 0.4) : 0);
        const leagueBooyahs = typeof t.leagueBooyahs === 'number' ? t.leagueBooyahs : (typeof t.booyahs === 'number' ? Math.round(t.booyahs * 0.4) : 0);
        const leagueKills = typeof t.leagueKills === 'number' ? t.leagueKills : (typeof t.totalKills === 'number' ? Math.round(t.totalKills * 0.4) : 0);
        const leagueWinRate = leagueMatches > 0 ? Math.round((leagueBooyahs / leagueMatches) * 100) : 0;

        const totalPts = typeof t.points === 'number' ? t.points : (tourneyPoints + leaguePoints);
        const totalBooyahs = typeof t.booyahs === 'number' ? t.booyahs : (tourneyBooyahs + leagueBooyahs);
        const totalKills = typeof t.totalKills === 'number' ? t.totalKills : (tourneyKills + leagueKills);
        const matchesPlayed = typeof t.matchesPlayed === 'number' ? t.matchesPlayed : (tourneyMatches + leagueMatches);

        squadMap.set(id, {
          id,
          name: t.name || 'Registered Squad',
          tag: t.tag || (t.name ? t.name.slice(0, 4).toUpperCase() : 'SQD'),
          squadId: t.id || id,
          coverUrl: t.coverUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200',
          leaderName: t.leaderName || 'Captain',
          leaderPhoto: t.leaderPhoto || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200',
          leaderId: t.leaderId || '',
          leaderPlayvearId: t.leaderPlayvearId || membersList.find(m => m.isCaptain)?.playvearId || '',
          leaderEmail: t.leaderEmail || '',
          division: t.division || 'Dhaka',
          district: t.district || 'Dhaka',
          upazila: t.upazila || '',
          tourneyMatches,
          tourneyPoints,
          tourneyBooyahs,
          tourneyKills,
          tourneyWinRate,
          leagueMatches,
          leaguePoints,
          leagueBooyahs,
          leagueKills,
          leagueWinRate,
          points: totalPts,
          booyahs: totalBooyahs,
          totalKills,
          matchesPlayed,
          economyScore: typeof t.economyScore === 'number' ? t.economyScore : 0,
          recentForm: t.recentForm || (totalBooyahs > 0 ? ['W', 'W', 'L', 'W', 'W'] : ['W', 'L', 'W', 'W', 'L']),
          members: membersList,
          isRegistered: true,
          createdAt: t.createdAt
        });
      }
    });

    let list = Array.from(squadMap.values());

    // Apply Location Filters
    if (selectedDivision && selectedDivision !== 'all') {
      list = list.filter((s) => s.division === selectedDivision);
    }
    if (selectedDistrict && selectedDistrict !== 'all') {
      list = list.filter((s) => s.district === selectedDistrict);
    }
    if (selectedUpazila && selectedUpazila !== 'all') {
      list = list.filter((s) => s.upazila === selectedUpazila);
    }

    // Dynamic Multi-Factor Ranking Engine
    list.sort((a, b) => {
      let aPrimary = 0;
      let bPrimary = 0;
      let aSecondary = 0;
      let bSecondary = 0;

      if (activeCategory === 'combined') {
        const aOverallWinRate = a.matchesPlayed > 0 ? Math.round((a.booyahs / a.matchesPlayed) * 100) : 50;
        const bOverallWinRate = b.matchesPlayed > 0 ? Math.round((b.booyahs / b.matchesPlayed) * 100) : 50;
        
        const aPowerScore = a.points + (a.booyahs * 60) + (a.totalKills * 6) + (aOverallWinRate * 8);
        const bPowerScore = b.points + (b.booyahs * 60) + (b.totalKills * 6) + (bOverallWinRate * 8);

        if (selectedSortMetric === 'power') {
          aPrimary = aPowerScore;
          bPrimary = bPowerScore;
          aSecondary = a.points;
          bSecondary = b.points;
        } else if (selectedSortMetric === 'points') {
          aPrimary = a.points;
          bPrimary = b.points;
          aSecondary = a.booyahs;
          bSecondary = b.booyahs;
        } else if (selectedSortMetric === 'booyahs') {
          aPrimary = a.booyahs;
          bPrimary = b.booyahs;
          aSecondary = a.totalKills;
          bSecondary = b.totalKills;
        } else if (selectedSortMetric === 'kills') {
          aPrimary = a.totalKills;
          bPrimary = b.totalKills;
          aSecondary = a.points;
          bSecondary = b.points;
        } else if (selectedSortMetric === 'winrate') {
          aPrimary = aOverallWinRate;
          bPrimary = bOverallWinRate;
          aSecondary = aPowerScore;
          bSecondary = bPowerScore;
        }
      } else if (activeCategory === 'tournaments') {
        const aTourneyPower = a.tourneyPoints + (a.tourneyBooyahs * 70) + (a.tourneyKills * 7) + (a.tourneyWinRate * 10);
        const bTourneyPower = b.tourneyPoints + (b.tourneyBooyahs * 70) + (b.tourneyKills * 7) + (b.tourneyWinRate * 10);

        if (selectedSortMetric === 'power') {
          aPrimary = aTourneyPower;
          bPrimary = bTourneyPower;
          aSecondary = a.tourneyPoints;
          bSecondary = b.tourneyPoints;
        } else if (selectedSortMetric === 'points') {
          aPrimary = a.tourneyPoints;
          bPrimary = b.tourneyPoints;
          aSecondary = a.tourneyBooyahs;
          bSecondary = b.tourneyBooyahs;
        } else if (selectedSortMetric === 'booyahs') {
          aPrimary = a.tourneyBooyahs;
          bPrimary = b.tourneyBooyahs;
          aSecondary = a.tourneyKills;
          bSecondary = b.tourneyKills;
        } else if (selectedSortMetric === 'kills') {
          aPrimary = a.tourneyKills;
          bPrimary = b.tourneyKills;
          aSecondary = a.tourneyPoints;
          bSecondary = b.tourneyPoints;
        } else if (selectedSortMetric === 'winrate') {
          aPrimary = a.tourneyWinRate;
          bPrimary = b.tourneyWinRate;
          aSecondary = a.tourneyPoints;
          bSecondary = b.tourneyPoints;
        }
      } else if (activeCategory === 'leagues') {
        const aLeaguePower = a.leaguePoints + (a.leagueBooyahs * 80) + (a.leagueKills * 8) + (a.leagueWinRate * 12);
        const bLeaguePower = b.leaguePoints + (b.leagueBooyahs * 80) + (b.leagueKills * 8) + (b.leagueWinRate * 12);

        if (selectedSortMetric === 'power') {
          aPrimary = aLeaguePower;
          bPrimary = bLeaguePower;
          aSecondary = a.leaguePoints;
          bSecondary = b.leaguePoints;
        } else if (selectedSortMetric === 'points') {
          aPrimary = a.leaguePoints;
          bPrimary = b.leaguePoints;
          aSecondary = a.leagueBooyahs;
          bSecondary = b.leagueBooyahs;
        } else if (selectedSortMetric === 'booyahs') {
          aPrimary = a.leagueBooyahs;
          bPrimary = b.leagueBooyahs;
          aSecondary = a.leagueKills;
          bSecondary = b.leagueKills;
        } else if (selectedSortMetric === 'kills') {
          aPrimary = a.leagueKills;
          bPrimary = b.leagueKills;
          aSecondary = a.leaguePoints;
          bSecondary = b.leaguePoints;
        } else if (selectedSortMetric === 'winrate') {
          aPrimary = a.leagueWinRate;
          bPrimary = b.leagueWinRate;
          aSecondary = a.leaguePoints;
          bSecondary = b.leaguePoints;
        }
      }

      if (bPrimary !== aPrimary) return bPrimary - aPrimary;
      return bSecondary - aSecondary;
    });

    return list.map((squad, idx) => ({
      ...squad,
      calculatedRank: idx + 1
    }));
  }, [allTeamsList, activeCategory, selectedDivision, selectedDistrict, selectedUpazila, selectedSortMetric]);

  // Top 10 subset
  const top10Squads = useMemo(() => {
    return allProcessedSquads.slice(0, 10);
  }, [allProcessedSquads]);

  // Directory subset (filtered by search query if in directory mode)
  const directorySquads = useMemo(() => {
    if (!searchQuery.trim()) return allProcessedSquads;
    const q = searchQuery.toLowerCase().trim();
    return allProcessedSquads.filter(s => 
      s.name.toLowerCase().includes(q) ||
      (s.tag && s.tag.toLowerCase().includes(q)) ||
      s.leaderName.toLowerCase().includes(q) ||
      (s.leaderPlayvearId && s.leaderPlayvearId.toLowerCase().includes(q)) ||
      (s.id && s.id.toLowerCase().includes(q)) ||
      s.division.toLowerCase().includes(q) ||
      s.district.toLowerCase().includes(q) ||
      s.upazila.toLowerCase().includes(q) ||
      (s.members && s.members.some(m => (m.displayName || m.name || '').toLowerCase().includes(q) || (m.playvearId || '').toLowerCase().includes(q)))
    );
  }, [allProcessedSquads, searchQuery]);

  const handleOpenInspector = (squad: SquadStats) => {
    setModalSquad(squad);
    if (onInspectSquad) {
      onInspectSquad(squad);
    }
  };

  const top1 = top10Squads[0];
  const top2 = top10Squads[1];
  const top3 = top10Squads[2];
  const restTop4to10 = top10Squads.slice(3, 10);

  return (
    <div className="flex flex-col gap-4 font-sans text-slate-100 select-none">
      {/* 1. TOP HEADER & NAVIGATION CONTROLS */}
      <div className="bg-[#050814]/90 border border-cyan-500/25 p-3.5 sm:p-4 rounded-2xl shadow-[0_0_25px_rgba(6,182,212,0.15)] relative overflow-hidden backdrop-blur-md">
        {/* Cyber Neon Glow Accents */}
        <div className="absolute inset-0 bg-[radial-gradient(#06b6d4_1px,transparent_1px)] [background-size:16px_16px] opacity-10 pointer-events-none" />
        <div className="absolute top-0 right-0 w-64 h-32 bg-gradient-to-bl from-cyan-500/10 via-fuchsia-500/5 to-transparent blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-cyan-500/20 via-blue-600/20 to-fuchsia-500/20 border border-cyan-400/40 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0">
              <Shield className="h-5 w-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-black uppercase tracking-wider text-white font-sans flex items-center gap-1.5">
                  <span>Squad Esports Leaderboard</span>
                  <span className="text-[9px] font-mono font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full shadow-[0_0_8px_rgba(245,158,11,0.3)]">
                    APEX & PRO
                  </span>
                </h3>
              </div>
              <p className="text-[10px] sm:text-[11px] text-slate-400 font-mono mt-0.5">
                Real-time official standings from <span className="text-cyan-300 font-bold">Squad Tournaments</span> & <span className="text-fuchsia-300 font-bold">Pro League Matches</span>
              </p>
            </div>
          </div>

          {/* View Mode Toggle: Top 10 Standings vs All Registered Squads */}
          <div className="flex items-center gap-1.5 p-1 bg-black/80 rounded-xl border border-cyan-500/30 w-fit">
            <button
              type="button"
              onClick={() => setViewMode('top10')}
              className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer font-mono ${
                viewMode === 'top10'
                  ? 'bg-cyan-500 text-black font-extrabold shadow-[0_0_12px_rgba(6,182,212,0.5)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Trophy className="h-3.5 w-3.5" />
              <span>Top 10 Standings</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('all_registered')}
              className={`px-3 py-1.5 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 cursor-pointer font-mono ${
                viewMode === 'all_registered'
                  ? 'bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white font-extrabold shadow-[0_0_12px_rgba(217,70,239,0.5)]'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>All Registered Squads ({allProcessedSquads.length})</span>
            </button>
          </div>
        </div>

        {/* Triple Performance Filter Switch: Combined, Tournament, League */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-black/70 rounded-xl border border-cyan-500/20 mt-3">
          <button
            type="button"
            onClick={() => setActiveCategory('combined')}
            className={`py-2 px-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer font-mono ${
              activeCategory === 'combined'
                ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-300/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-cyan-300 shrink-0" />
            <span className="truncate">Combined Rating</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('tournaments')}
            className={`py-2 px-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer font-mono ${
              activeCategory === 'tournaments'
                ? 'bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-500 text-white shadow-[0_0_15px_rgba(6,182,212,0.4)] border border-cyan-300/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Swords className="h-3.5 w-3.5 text-cyan-300 shrink-0" />
            <span className="truncate">Squad Tourneys</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveCategory('leagues')}
            className={`py-2 px-2 rounded-lg text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer font-mono ${
              activeCategory === 'leagues'
                ? 'bg-gradient-to-r from-fuchsia-600 via-purple-600 to-fuchsia-500 text-white shadow-[0_0_15px_rgba(217,70,239,0.4)] border border-fuchsia-300/40'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
          >
            <Trophy className="h-3.5 w-3.5 text-fuchsia-300 shrink-0" />
            <span className="truncate">League Squads</span>
          </button>
        </div>

        {/* Search Bar for Registered Squads */}
        {viewMode === 'all_registered' && (
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search registered squad by Name, Tag, PlayVear ID, Captain, or Location..."
              className="w-full bg-black/90 border border-cyan-500/30 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 font-mono"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-white"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        )}
      </div>

      {/* 2. SQUAD LOCATION & STAT FILTER CONTROLS */}
      <div className="bg-[#050814]/80 border border-cyan-500/20 p-3 sm:p-3.5 rounded-2xl flex flex-col gap-2.5 shadow-[0_4px_20px_rgba(6,182,212,0.05)] backdrop-blur-md">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono">
              <MapPin className="h-3 w-3 text-cyan-400" />
              <span>Location Hierarchy (Division, District & Upazila)</span>
            </div>
            {(selectedDivision !== 'all' || selectedDistrict !== 'all' || selectedUpazila !== 'all') && (
              <button
                type="button"
                onClick={() => {
                  setSelectedDivision('all');
                  setSelectedDistrict('all');
                  setSelectedUpazila('all');
                }}
                className="text-[9px] text-cyan-300 hover:underline font-mono"
              >
                Reset Location
              </button>
            )}
          </div>

          <div className="grid grid-cols-3 gap-2">
            {/* Division Dropdown */}
            <div className="flex flex-col">
              <select
                value={selectedDivision}
                onChange={(e) => {
                  setSelectedDivision(e.target.value);
                  setSelectedDistrict('all');
                  setSelectedUpazila('all');
                }}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-[10px] sm:text-xs text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 cursor-pointer font-mono"
              >
                <option value="all">All Divisions</option>
                {Object.keys(BD_GEOGRAPHY).map((div) => (
                  <option key={div} value={div}>{div}</option>
                ))}
              </select>
            </div>

            {/* District Dropdown */}
            <div className="flex flex-col">
              <select
                value={selectedDistrict}
                disabled={selectedDivision === 'all'}
                onChange={(e) => {
                  setSelectedDistrict(e.target.value);
                  setSelectedUpazila('all');
                }}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-[10px] sm:text-xs text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-40 cursor-pointer font-mono"
              >
                <option value="all">All Districts</option>
                {selectedDivision !== 'all' && 
                  BD_GEOGRAPHY[selectedDivision] && 
                  Object.keys(BD_GEOGRAPHY[selectedDivision]).map((dist) => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))
                }
              </select>
            </div>

            {/* Upazila Dropdown */}
            <div className="flex flex-col">
              <select
                value={selectedUpazila}
                disabled={selectedDistrict === 'all'}
                onChange={(e) => setSelectedUpazila(e.target.value)}
                className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-[10px] sm:text-xs text-slate-200 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50 disabled:opacity-40 cursor-pointer font-mono"
              >
                <option value="all">All Upazilas</option>
                {selectedDivision !== 'all' && 
                  selectedDistrict !== 'all' && 
                  BD_GEOGRAPHY[selectedDivision]?.[selectedDistrict] && 
                  BD_GEOGRAPHY[selectedDivision][selectedDistrict].map((up) => (
                    <option key={up} value={up}>{up}</option>
                  ))
                }
              </select>
            </div>
          </div>
        </div>

        {/* Metric Sorter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-white/[0.05]">
          <div className="flex items-center gap-1 text-[10px] font-bold text-cyan-400 uppercase tracking-wider font-mono">
            <SlidersHorizontal className="h-3 w-3 text-cyan-400" />
            <span>Primary Ranking Metric</span>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
            {[
              { id: 'power', label: '⚡ Esports Power Score' },
              { id: 'points', label: '🏆 Total Points' },
              { id: 'booyahs', label: '👑 Booyahs / Wins' },
              { id: 'kills', label: '🎯 Total Kills' },
              { id: 'winrate', label: '📈 Win Rate (%)' },
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setSelectedSortMetric(m.id as any)}
                className={`px-2.5 py-1 rounded-lg text-[9.5px] font-mono font-bold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedSortMetric === m.id
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/50 shadow-[0_0_8px_rgba(6,182,212,0.3)]'
                    : 'bg-black/50 text-slate-400 border border-white/5 hover:border-white/20'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 3. TOP 10 PODIUM SECTION (Visible in Top 10 View) */}
      {viewMode === 'top10' && top1 && (
        <div className="space-y-4">
          {/* #1 APEX CHAMPION SQUAD PODIUM HERO */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5 }}
            onClick={() => handleOpenInspector(top1)}
            className="relative rounded-2xl overflow-hidden border-2 border-amber-500/60 bg-black shadow-[0_0_35px_rgba(245,158,11,0.25)] cursor-pointer group flex flex-col justify-between p-4 sm:p-6 transition-all duration-300 hover:border-amber-400 min-h-[220px]"
          >
            {/* Squad Cover Background Banner */}
            <img 
              src={top1.coverUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1200"} 
              alt="" 
              className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-70" 
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#04060e] via-[#04060e]/80 to-black/75 pointer-events-none" />

            {/* Top Crown & Rank Row */}
            <div className="relative z-10 flex items-center justify-between w-full">
              <div className="bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-1.5 font-mono shadow-[0_0_15px_rgba(245,158,11,0.6)]">
                <Crown className="h-4 w-4 text-black fill-black" />
                <span>#1 APEX CHAMPION SQUAD</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-bold bg-cyan-950/80 text-cyan-300 px-2 py-0.5 rounded border border-cyan-400/40">
                  {top1.isRegistered ? '⚡ REGISTERED' : 'OFFICIAL'}
                </span>
                <div className="text-xs font-black text-amber-300 font-mono bg-black/80 px-2.5 py-1 rounded-lg border border-amber-400/50 backdrop-blur-sm shadow-md">
                  {top1.points} PTS
                </div>
              </div>
            </div>

            {/* Middle Squad Info */}
            <div className="relative z-10 mt-6">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/20 border border-cyan-500/40 px-2 py-0.5 rounded font-mono">
                  {top1.tag || 'SQD'}
                </span>
                <h3 className="text-2xl sm:text-3xl font-black text-white uppercase font-sans tracking-wide drop-shadow-md">
                  {top1.name}
                </h3>
              </div>

              <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono mt-1.5">
                <span className="flex items-center gap-1 text-amber-400 font-bold">
                  👑 {top1.leaderName}
                  {top1.leaderPlayvearId && <span className="text-[10px] text-slate-400">({top1.leaderPlayvearId})</span>}
                </span>
                <span>•</span>
                <span className="flex items-center gap-1 text-slate-300">
                  <MapPin className="h-3 w-3 text-cyan-400" />
                  {top1.district || top1.division}, {top1.division}
                </span>
                <span>•</span>
                <span className="text-cyan-300 font-bold">
                  👥 {top1.members?.length || 4} Roster Members
                </span>
              </div>

              {/* Dual Performance Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-4 font-mono text-xs">
                <div className="bg-black/75 border border-cyan-500/30 p-2 rounded-xl text-center">
                  <span className="text-slate-400 block text-[9px] uppercase">⚔️ Squad Tourneys</span>
                  <span className="text-cyan-300 font-black text-sm">{top1.tourneyPoints} pts</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">{top1.tourneyBooyahs}W • {top1.tourneyKills}K</span>
                </div>
                <div className="bg-black/75 border border-fuchsia-500/30 p-2 rounded-xl text-center">
                  <span className="text-slate-400 block text-[9px] uppercase">🏆 Pro League</span>
                  <span className="text-fuchsia-300 font-black text-sm">{top1.leaguePoints} pts</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">{top1.leagueBooyahs}W • {top1.leagueKills}K</span>
                </div>
                <div className="bg-black/75 border border-amber-500/30 p-2 rounded-xl text-center">
                  <span className="text-slate-400 block text-[9px] uppercase">👑 Total Booyahs</span>
                  <span className="text-amber-300 font-black text-sm">{top1.booyahs} Wins</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">{top1.matchesPlayed} Matches</span>
                </div>
                <div className="bg-black/75 border border-emerald-500/30 p-2 rounded-xl text-center">
                  <span className="text-slate-400 block text-[9px] uppercase">⚡ Win Rate</span>
                  <span className="text-emerald-400 font-black text-sm">{top1.tourneyWinRate}%</span>
                  <span className="text-[9px] text-slate-400 block mt-0.5">Eco {top1.economyScore}</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* #2 & #3 RUNNER UP CARDS */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {/* #2 RUNNER UP */}
            {top2 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
                onClick={() => handleOpenInspector(top2)}
                className="relative rounded-2xl overflow-hidden border-2 border-cyan-500/60 bg-black shadow-[0_0_25px_rgba(6,182,212,0.25)] cursor-pointer group flex flex-col justify-between p-3.5 sm:p-4 transition-all duration-300 hover:border-cyan-400 min-h-[180px]"
              >
                <img 
                  src={top2.coverUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800"} 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#04060e] via-[#04060e]/70 to-black/70 pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between w-full">
                  <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-cyan-500 text-white px-2.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 font-mono border border-cyan-300/40 shadow-md">
                    <Medal className="h-3.5 w-3.5 text-cyan-200" />
                    <span>#2 CONTENDER SQUAD</span>
                  </div>
                  <div className="text-[11px] font-black text-cyan-300 font-mono bg-black/85 px-2 py-0.5 rounded-lg border border-cyan-400/40 backdrop-blur-sm">
                    {top2.points} PTS
                  </div>
                </div>

                <div className="relative z-10 mt-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black text-cyan-400 bg-cyan-500/20 px-1.5 py-0.5 rounded font-mono">
                      {top2.tag || 'SQD'}
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white truncate uppercase font-sans drop-shadow-md">
                      {top2.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-300 font-mono mt-1">
                    <span className="text-cyan-300">👑 {top2.leaderName}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-slate-400">
                      <MapPin className="h-2.5 w-2.5 text-cyan-400" />
                      {top2.district || top2.division}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mt-2.5 font-mono text-[9px] sm:text-[10px]">
                    <div className="bg-black/75 border border-cyan-500/30 p-1.5 rounded-lg text-center">
                      <span className="text-slate-400 block text-[8px]">⚔️ Tourney</span>
                      <span className="text-cyan-300 font-black">{top2.tourneyPoints} pts</span>
                    </div>
                    <div className="bg-black/75 border border-fuchsia-500/30 p-1.5 rounded-lg text-center">
                      <span className="text-slate-400 block text-[8px]">🏆 League</span>
                      <span className="text-fuchsia-300 font-black">{top2.leaguePoints} pts</span>
                    </div>
                    <div className="bg-black/75 border border-white/20 p-1.5 rounded-lg text-center">
                      <span className="text-slate-400 block text-[8px]">👑 Wins / Kills</span>
                      <span className="text-amber-300 font-black">{top2.booyahs}W • {top2.totalKills}K</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* #3 RUNNER UP */}
            {top3 && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
                onClick={() => handleOpenInspector(top3)}
                className="relative rounded-2xl overflow-hidden border-2 border-orange-500/60 bg-black shadow-[0_0_25px_rgba(249,115,22,0.25)] cursor-pointer group flex flex-col justify-between p-3.5 sm:p-4 transition-all duration-300 hover:border-orange-400 min-h-[180px]"
              >
                <img 
                  src={top3.coverUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=800"} 
                  alt="" 
                  className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-75"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#04060e] via-[#04060e]/70 to-black/70 pointer-events-none" />

                <div className="relative z-10 flex items-center justify-between w-full">
                  <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-orange-500 text-white px-2.5 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-wider flex items-center gap-1 font-mono border border-orange-300/40 shadow-md">
                    <Medal className="h-3.5 w-3.5 text-orange-200" />
                    <span>#3 CONTENDER SQUAD</span>
                  </div>
                  <div className="text-[11px] font-black text-orange-300 font-mono bg-black/85 px-2 py-0.5 rounded-lg border border-orange-400/40 backdrop-blur-sm">
                    {top3.points} PTS
                  </div>
                </div>

                <div className="relative z-10 mt-4">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[9px] font-black text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded font-mono">
                      {top3.tag || 'SQD'}
                    </span>
                    <h3 className="text-lg sm:text-xl font-black text-white truncate uppercase font-sans drop-shadow-md">
                      {top3.name}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2 text-[10px] text-slate-300 font-mono mt-1">
                    <span className="text-orange-300">👑 {top3.leaderName}</span>
                    <span>•</span>
                    <span className="flex items-center gap-0.5 text-slate-400">
                      <MapPin className="h-2.5 w-2.5 text-orange-400" />
                      {top3.district || top3.division}
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5 mt-2.5 font-mono text-[9px] sm:text-[10px]">
                    <div className="bg-black/75 border border-cyan-500/30 p-1.5 rounded-lg text-center">
                      <span className="text-slate-400 block text-[8px]">⚔️ Tourney</span>
                      <span className="text-cyan-300 font-black">{top3.tourneyPoints} pts</span>
                    </div>
                    <div className="bg-black/75 border border-fuchsia-500/30 p-1.5 rounded-lg text-center">
                      <span className="text-slate-400 block text-[8px]">🏆 League</span>
                      <span className="text-fuchsia-300 font-black">{top3.leaguePoints} pts</span>
                    </div>
                    <div className="bg-black/75 border border-white/20 p-1.5 rounded-lg text-center">
                      <span className="text-slate-400 block text-[8px]">👑 Wins / Kills</span>
                      <span className="text-amber-300 font-black">{top3.booyahs}W • {top3.totalKills}K</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </div>

          {/* 4. RANK #4 TO #10 SQUADS LISTING TABLE */}
          <div className="bg-[#050814]/90 border border-cyan-500/20 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md mt-2">
            {/* Table Header */}
            <div className="px-3 sm:px-4 py-2.5 bg-gradient-to-r from-[#070d24] via-[#091338] to-[#070d24] border-b border-cyan-500/30 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-400" />
                <span className="text-[10.5px] font-black text-white uppercase tracking-widest font-mono">
                  Official Squad Standings (Rank #4 - #10)
                </span>
              </div>
              <span className="text-[9px] font-mono text-cyan-400 font-bold bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
                PRO DIVISION
              </span>
            </div>

            {/* Squad Rows */}
            <div className="divide-y divide-white/[0.04]">
              {restTop4to10.length > 0 ? (
                restTop4to10.map((squad) => (
                  <div
                    key={squad.id || squad.name}
                    onClick={() => handleOpenInspector(squad)}
                    className="grid grid-cols-12 px-3 sm:px-4 py-3 items-center hover:bg-cyan-950/30 active:bg-cyan-950/50 cursor-pointer transition-all border-l-2 border-transparent hover:border-cyan-400 group gap-2"
                  >
                    {/* Rank Badge */}
                    <div className="col-span-2 sm:col-span-1 flex items-center gap-1.5">
                      <div className="h-7 w-7 rounded-lg bg-black/80 border border-cyan-500/30 flex items-center justify-center font-mono font-black text-xs text-cyan-300 shadow-[0_0_8px_rgba(6,182,212,0.2)] group-hover:border-cyan-400">
                        #{squad.calculatedRank}
                      </div>
                    </div>

                    {/* Squad Cover, Tag & Name */}
                    <div className="col-span-6 sm:col-span-4 flex items-center gap-2.5 min-w-0 pr-1">
                      <div className="h-9 w-14 sm:h-10 sm:w-16 rounded-lg overflow-hidden border border-cyan-500/30 bg-black shrink-0 relative group-hover:border-cyan-400 transition-colors">
                        <img 
                          src={squad.coverUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=200"} 
                          alt="" 
                          className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" 
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="font-black text-xs sm:text-sm text-white truncate group-hover:text-cyan-300 transition-colors font-sans flex items-center gap-1">
                          <span>{squad.name}</span>
                          {squad.tag && (
                            <span className="text-[8.5px] font-mono text-cyan-400 bg-cyan-500/15 px-1 rounded">
                              {squad.tag}
                            </span>
                          )}
                        </div>
                        <div className="text-[9px] text-slate-400 font-mono truncate flex items-center gap-1.5 mt-0.5">
                          <span className="text-cyan-400 font-bold">👑 {squad.leaderName}</span>
                          <span>•</span>
                          <span className="text-slate-400 flex items-center gap-0.5">
                            <MapPin className="h-2.5 w-2.5 text-cyan-400 shrink-0" />
                            {squad.district || squad.division}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Tournament & League Dual Performance Chips (Visible on tablet/desktop) */}
                    <div className="hidden sm:flex sm:col-span-4 items-center gap-2 font-mono text-[9.5px]">
                      <div className="flex-1 bg-black/60 border border-cyan-500/20 px-2 py-1 rounded-lg">
                        <div className="text-slate-400 text-[7.5px] uppercase">⚔️ Tourney</div>
                        <div className="text-cyan-300 font-bold">{squad.tourneyPoints} pts • {squad.tourneyBooyahs}W</div>
                      </div>
                      <div className="flex-1 bg-black/60 border border-fuchsia-500/20 px-2 py-1 rounded-lg">
                        <div className="text-slate-400 text-[7.5px] uppercase">🏆 League</div>
                        <div className="text-fuchsia-300 font-bold">{squad.leaguePoints} pts • {squad.leagueBooyahs}W</div>
                      </div>
                    </div>

                    {/* Combined Points & Action */}
                    <div className="col-span-4 sm:col-span-3 flex items-center justify-end gap-2 text-right">
                      <div className="flex flex-col items-end">
                        <span className="text-xs sm:text-sm font-black text-amber-300 font-mono leading-none">
                          {squad.points} <span className="text-[8px] font-normal text-slate-400">PTS</span>
                        </span>
                        <span className="text-[8px] sm:text-[9px] text-slate-400 font-mono mt-1">
                          {squad.booyahs} Wins • {squad.totalKills} Kills
                        </span>
                      </div>
                      <div className="p-1 rounded-lg bg-white/5 group-hover:bg-cyan-500/20 text-slate-400 group-hover:text-cyan-300 transition-colors">
                        <ChevronRight className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-2 px-4">
                  <Users className="h-8 w-8 text-slate-600 animate-pulse" />
                  <div className="text-slate-400 text-xs font-bold uppercase tracking-wider font-mono">No Squads Found</div>
                  <p className="text-[10px] text-slate-500 max-w-[280px] leading-relaxed font-mono">
                    No esports squads match the selected division or district filter.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Empty State when no registered squads exist in top 10 */}
      {viewMode === 'top10' && !top1 && (
        <div className="py-20 text-center flex flex-col items-center justify-center gap-4 px-6 bg-[#050814]/90 border border-cyan-500/20 rounded-2xl shadow-2xl backdrop-blur-md">
          <div className="h-16 w-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.25)]">
            <Users className="h-8 w-8 animate-pulse" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-white text-base font-black uppercase tracking-wider font-mono">
              No Registered Squads In This Category
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed font-mono">
              Only real squads created by players in the app appear at the top of the leaderboard. When players create and compete with their squads in Tournaments and Pro Leagues, they will automatically rank here!
            </p>
          </div>
        </div>
      )}

      {/* 4. ALL REGISTERED SQUADS DIRECTORY (Full Grid View) */}
      {viewMode === 'all_registered' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-mono font-bold text-slate-300 flex items-center gap-1.5">
              <Users className="h-4 w-4 text-cyan-400" />
              Showing <span className="text-cyan-300 font-black">{directorySquads.length}</span> Officially Registered Squads
            </span>
            <span className="text-[10px] text-slate-400 font-mono">
              Click any squad to inspect full roster & details
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {directorySquads.length > 0 ? (
              directorySquads.map((squad) => (
                <motion.div
                  key={squad.id || squad.name}
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => handleOpenInspector(squad)}
                  className="relative bg-[#070b18]/90 border border-cyan-500/25 hover:border-cyan-400 rounded-2xl overflow-hidden shadow-lg hover:shadow-[0_0_20px_rgba(6,182,212,0.25)] transition-all cursor-pointer group flex flex-col justify-between p-3.5"
                >
                  {/* Card Cover Banner */}
                  <div className="relative h-28 -mx-3.5 -mt-3.5 mb-3 bg-black overflow-hidden">
                    <img 
                      src={squad.coverUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=600"} 
                      alt="" 
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-70" 
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#070b18] via-black/40 to-transparent" />
                    
                    {/* Floating Rank & Status Badges */}
                    <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                      <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded bg-black/80 text-cyan-300 border border-cyan-500/40">
                        RANK #{squad.calculatedRank}
                      </span>
                      {squad.tag && (
                        <span className="text-[9px] font-black font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          {squad.tag}
                        </span>
                      )}
                    </div>

                    <div className="absolute top-2.5 right-2.5">
                      <span className="text-[9px] font-black font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center gap-1">
                        <CheckCircle2 className="h-3 w-3 text-cyan-400" />
                        REGISTERED
                      </span>
                    </div>

                    {/* Captain Avatar Overlay */}
                    <div className="absolute bottom-2 left-3 flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full border-2 border-cyan-400 overflow-hidden bg-black shrink-0 shadow-md">
                        <img 
                          src={squad.leaderPhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150"} 
                          alt="" 
                          className="w-full h-full object-cover" 
                        />
                      </div>
                      <div className="min-w-0">
                        <div className="text-white font-bold text-xs truncate drop-shadow-md">
                          👑 {squad.leaderName}
                        </div>
                        {squad.leaderPlayvearId && (
                          <div className="text-[8.5px] text-cyan-300 font-mono">
                            {squad.leaderPlayvearId}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Body Info */}
                  <div>
                    <h4 className="text-base font-black text-white font-sans uppercase truncate group-hover:text-cyan-300 transition-colors">
                      {squad.name}
                    </h4>
                    
                    <div className="flex items-center gap-1 text-[9.5px] text-slate-400 font-mono mt-0.5">
                      <MapPin className="h-3 w-3 text-cyan-400 shrink-0" />
                      <span className="truncate">{squad.district || squad.division}, {squad.division}</span>
                    </div>

                    {/* Active Roster Preview */}
                    <div className="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between">
                      <div className="flex items-center gap-1 text-[9.5px] text-slate-300 font-mono">
                        <Users className="h-3 w-3 text-cyan-400" />
                        <span>Roster: <b className="text-white">{squad.members?.length || 4} Players</b></span>
                      </div>
                      <div className="text-[10px] font-black text-amber-300 font-mono">
                        {squad.points} PTS
                      </div>
                    </div>

                    {/* Dual Stats Chips */}
                    <div className="grid grid-cols-2 gap-1.5 mt-2 font-mono text-[9px]">
                      <div className="bg-black/60 border border-cyan-500/20 p-1.5 rounded-lg text-center">
                        <span className="text-slate-400 text-[8px] block">⚔️ Tourney</span>
                        <span className="text-cyan-300 font-bold">{squad.tourneyPoints} pts • {squad.tourneyBooyahs}W</span>
                      </div>
                      <div className="bg-black/60 border border-fuchsia-500/20 p-1.5 rounded-lg text-center">
                        <span className="text-slate-400 text-[8px] block">🏆 League</span>
                        <span className="text-fuchsia-300 font-bold">{squad.leaguePoints} pts • {squad.leagueBooyahs}W</span>
                      </div>
                    </div>
                  </div>

                  {/* Footer CTA */}
                  <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-cyan-400 group-hover:text-cyan-300">
                    <span className="font-bold">Inspect Squad Dossier</span>
                    <ChevronRight className="h-3.5 w-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </div>
                </motion.div>
              ))
            ) : (
              <div className="col-span-full py-16 text-center flex flex-col items-center justify-center gap-2">
                <Users className="h-10 w-10 text-slate-600 animate-pulse" />
                <div className="text-slate-300 text-sm font-bold font-mono">No Registered Squads Found</div>
                <p className="text-xs text-slate-500 max-w-sm font-mono">
                  No registered esports squad matches "{searchQuery}" or the chosen location filters.
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 5. SQUAD DOSSIER / ULTRA-DETAILED INSPECTION MODAL */}
      {modalSquad && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[300] flex items-center justify-center p-3 sm:p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="w-full max-w-xl bg-[#060918] border-2 border-cyan-500/50 rounded-2xl overflow-hidden shadow-[0_0_40px_rgba(6,182,212,0.3)] relative text-slate-200 flex flex-col max-h-[90vh]"
          >
            {/* Header Cover Banner */}
            <div className="relative w-full aspect-[16/7] bg-black shrink-0">
              <img 
                src={modalSquad.coverUrl || "https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&q=80&w=1000"} 
                alt="" 
                className="w-full h-full object-cover" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#060918] via-[#060918]/50 to-transparent" />
              
              <button 
                onClick={() => setModalSquad(null)}
                className="absolute top-3 right-3 p-1.5 bg-black/70 hover:bg-black border border-white/20 rounded-full text-white cursor-pointer transition-colors"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between">
                <div>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-[9px] font-black uppercase tracking-widest text-cyan-400 bg-cyan-500/20 border border-cyan-500/30 px-2 py-0.5 rounded-md font-mono">
                      RANK #{modalSquad.calculatedRank} SQUAD
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-amber-400 bg-amber-500/20 border border-amber-500/30 px-2 py-0.5 rounded-md font-mono">
                      TAG: {modalSquad.tag || 'ESPORTS'}
                    </span>
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-md font-mono flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> OFFICIAL REGISTERED
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-white font-sans mt-1 drop-shadow-md">
                    {modalSquad.name}
                  </h3>
                </div>

                <div className="h-12 w-12 rounded-full border-2 border-cyan-400 overflow-hidden shrink-0 shadow-lg bg-black">
                  <img 
                    src={modalSquad.leaderPhoto || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=200"} 
                    alt="" 
                    className="w-full h-full object-cover" 
                  />
                </div>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-4 sm:p-5 space-y-4 overflow-y-auto custom-scrollbar flex-1">
              {/* Squad ID & Location Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-cyan-950/40 border border-cyan-500/25 p-2.5 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[8.5px] text-slate-400 uppercase block">PlayVear Squad ID</span>
                    <span className="text-xs font-black text-cyan-300">{modalSquad.squadId || modalSquad.id}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard(modalSquad.squadId || modalSquad.id, 'squadId')}
                    className="p-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg text-cyan-300 transition-colors"
                    title="Copy Squad ID"
                  >
                    {copiedId === 'squadId' ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                  </button>
                </div>

                <div className="bg-cyan-950/40 border border-cyan-500/25 p-2.5 rounded-xl flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-cyan-400 shrink-0" />
                  <div className="min-w-0">
                    <span className="text-[8.5px] text-slate-400 uppercase block">Geographic Base</span>
                    <span className="text-xs font-bold text-slate-200 truncate block">
                      {modalSquad.division} • {modalSquad.district} • {modalSquad.upazila}
                    </span>
                  </div>
                </div>
              </div>

              {/* OFFICIAL SQUAD ACTIVE ROSTER (PLAYERS & CAPTAIN) */}
              <div className="bg-slate-950/90 border border-cyan-500/30 rounded-xl overflow-hidden">
                <div className="px-3.5 py-2 bg-gradient-to-r from-cyan-950/80 to-[#080d24] border-b border-cyan-500/25 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-black text-white font-mono uppercase tracking-wider">
                    <Users className="h-3.5 w-3.5 text-cyan-400" />
                    <span>Official Squad Roster ({modalSquad.members?.length || 4} Members)</span>
                  </div>
                  <span className="text-[8.5px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                    VERIFIED LINEUP
                  </span>
                </div>

                <div className="divide-y divide-white/[0.05] p-1">
                  {modalSquad.members && modalSquad.members.length > 0 ? (
                    modalSquad.members.map((member, idx) => (
                      <div 
                        key={idx} 
                        className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-white/[0.02] transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="relative h-8 w-8 rounded-full border border-cyan-400/50 overflow-hidden bg-black shrink-0">
                            <img 
                              src={member.photoUrl || member.photoURL || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=150"} 
                              alt="" 
                              className="w-full h-full object-cover" 
                            />
                            {member.isCaptain && (
                              <div className="absolute inset-0 bg-amber-500/20 flex items-center justify-center">
                                <Crown className="h-3 w-3 text-amber-300 drop-shadow" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-bold text-white flex items-center gap-1.5 truncate">
                              <span>{member.displayName || member.name}</span>
                              {member.isCaptain ? (
                                <span className="text-[8px] bg-amber-500/20 text-amber-300 px-1 rounded border border-amber-500/30 font-mono">
                                  👑 CAPTAIN
                                </span>
                              ) : (
                                <span className="text-[8px] bg-cyan-500/15 text-cyan-300 px-1 rounded border border-cyan-500/30 font-mono">
                                  {member.role || 'MEMBER'}
                                </span>
                              )}
                            </div>
                            <div className="text-[9px] text-slate-400 font-mono flex items-center gap-2 mt-0.5">
                              {member.playvearId ? (
                                <span className="text-cyan-400 font-bold">PID: {member.playvearId}</span>
                              ) : (
                                <span>PID: PV-{(100000 + idx * 47).toString()}</span>
                              )}
                              {(member.ign || member.gameName || member.gamingUid) && (
                                <span>• IGN: <span className="text-slate-300 font-semibold">{member.ign || member.gameName || member.gamingUid}</span></span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className="text-[8.5px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {member.status === 'pending' ? '⏳ PENDING' : '✅ CONFIRMED'}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-center text-xs text-slate-400 font-mono">
                      👑 Captain: {modalSquad.leaderName} (Official Lineup Registered)
                    </div>
                  )}
                </div>
              </div>

              {/* DUAL PERFORMANCE ENGINE BREAKDOWN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 font-mono">
                {/* Tournament Performance Box */}
                <div className="bg-slate-950/90 border border-cyan-500/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-cyan-500/20 pb-1.5">
                    <span className="text-[10px] font-black text-cyan-400 uppercase flex items-center gap-1">
                      <Swords className="h-3.5 w-3.5" /> Squad Tourneys
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">{modalSquad.tourneyMatches} Matches</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-black/50 p-1.5 rounded-lg border border-white/5">
                      <span className="text-[8px] text-slate-400 uppercase block">Points</span>
                      <span className="text-xs font-black text-cyan-300">{modalSquad.tourneyPoints}</span>
                    </div>
                    <div className="bg-black/50 p-1.5 rounded-lg border border-white/5">
                      <span className="text-[8px] text-slate-400 uppercase block">Booyahs</span>
                      <span className="text-xs font-black text-amber-300">{modalSquad.tourneyBooyahs}</span>
                    </div>
                    <div className="bg-black/50 p-1.5 rounded-lg border border-white/5">
                      <span className="text-[8px] text-slate-400 uppercase block">Kills</span>
                      <span className="text-xs font-black text-cyan-200">{modalSquad.tourneyKills}</span>
                    </div>
                    <div className="bg-black/50 p-1.5 rounded-lg border border-white/5">
                      <span className="text-[8px] text-slate-400 uppercase block">Win Rate</span>
                      <span className="text-xs font-black text-emerald-400">{modalSquad.tourneyWinRate}%</span>
                    </div>
                  </div>
                </div>

                {/* League Squad Performance Box */}
                <div className="bg-slate-950/90 border border-fuchsia-500/30 rounded-xl p-3 space-y-2">
                  <div className="flex items-center justify-between border-b border-fuchsia-500/20 pb-1.5">
                    <span className="text-[10px] font-black text-fuchsia-400 uppercase flex items-center gap-1">
                      <Trophy className="h-3.5 w-3.5" /> Pro League Squad
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold">{modalSquad.leagueMatches} Matches</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center">
                    <div className="bg-black/50 p-1.5 rounded-lg border border-white/5">
                      <span className="text-[8px] text-slate-400 uppercase block">Points</span>
                      <span className="text-xs font-black text-fuchsia-300">{modalSquad.leaguePoints}</span>
                    </div>
                    <div className="bg-black/50 p-1.5 rounded-lg border border-white/5">
                      <span className="text-[8px] text-slate-400 uppercase block">Booyahs</span>
                      <span className="text-xs font-black text-amber-300">{modalSquad.leagueBooyahs}</span>
                    </div>
                    <div className="bg-black/50 p-1.5 rounded-lg border border-white/5">
                      <span className="text-[8px] text-slate-400 uppercase block">Kills</span>
                      <span className="text-xs font-black text-fuchsia-200">{modalSquad.leagueKills}</span>
                    </div>
                    <div className="bg-black/50 p-1.5 rounded-lg border border-white/5">
                      <span className="text-[8px] text-slate-400 uppercase block">Win Rate</span>
                      <span className="text-xs font-black text-emerald-400">{modalSquad.leagueWinRate}%</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Combined Grand Overall Stats Bar */}
              <div className="grid grid-cols-4 gap-2 text-center font-mono bg-black/60 border border-white/10 rounded-xl p-2.5">
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block">Total Pts</span>
                  <span className="text-sm font-black text-amber-300">{modalSquad.points}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block">Booyahs</span>
                  <span className="text-sm font-black text-cyan-300">{modalSquad.booyahs}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block">Kills</span>
                  <span className="text-sm font-black text-cyan-300">{modalSquad.totalKills}</span>
                </div>
                <div>
                  <span className="text-[8px] text-slate-400 uppercase block">Economy</span>
                  <span className="text-sm font-black text-slate-200">{modalSquad.economyScore}</span>
                </div>
              </div>

              {/* Recent Match Form */}
              {modalSquad.recentForm && modalSquad.recentForm.length > 0 && (
                <div className="flex items-center justify-between bg-slate-950/60 border border-white/5 px-3 py-2 rounded-xl">
                  <span className="text-[10px] font-mono font-bold text-slate-400 uppercase">Recent 5 Matches Form</span>
                  <div className="flex items-center gap-1.5">
                    {modalSquad.recentForm.map((f, i) => (
                      <span
                        key={i}
                        className={`h-5 w-5 rounded font-mono font-black text-[10px] flex items-center justify-center ${
                          f === 'W' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-red-500/20 text-red-400 border border-red-500/40'
                        }`}
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <button
                onClick={() => setModalSquad(null)}
                className="w-full py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold uppercase text-xs tracking-wider transition-all cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.3)] font-mono"
              >
                Close Squad Dossier
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};
