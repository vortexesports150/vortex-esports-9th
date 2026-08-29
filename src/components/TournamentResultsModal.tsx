import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  X, 
  Crown, 
  Award, 
  Flame, 
  Users, 
  User, 
  Coins, 
  Calendar, 
  MapPin, 
  Eye, 
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Shield
} from 'lucide-react';

interface TournamentResultsModalProps {
  tourney: any;
  onClose: () => void;
}

export const TournamentResultsModal: React.FC<TournamentResultsModalProps> = ({
  tourney,
  onClose
}) => {
  const [showScreenshot, setShowScreenshot] = useState<boolean>(false);
  const [expandedSquadId, setExpandedSquadId] = useState<string | null>(null);

  if (!tourney) return null;

  const isSolo = tourney.mode === 'solo';
  const soloResults = tourney.finalResultData || tourney.tempResultData || [];
  
  // Resolve raw squad results and ensure members data exists (fallback to joinedSquads if needed)
  const rawSquadResults = tourney.finalResultSquads || tourney.tempResultSquads || [];
  const squadResults = rawSquadResults.map((sqd: any) => {
    let members = sqd.members || [];
    if (!members || members.length === 0) {
      const matchJoined = (tourney.joinedSquads || []).find((js: any) => 
        js.id === sqd.id || js.name === sqd.name || (js.squadName && js.squadName === sqd.name)
      );
      if (matchJoined && matchJoined.members && matchJoined.members.length > 0) {
        members = matchJoined.members;
      }
    }
    return {
      ...sqd,
      members: members.map((m: any, idx: number) => ({
        ...m,
        gameName: m.gameName || m.ingameName || m.name || `Player #${idx + 1}`,
        avatar: m.avatar || m.avatarUrl || m.photoURL || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150',
        kills: Number(m.kills) || 0,
        damage: Number(m.damage) || 0
      }))
    };
  });

  const perKillRate = Number(tourney.perKill) || 0;
  const booyahPrize = Number(tourney.booyahPrize) || 0;
  const runnerUpPrize = Number(tourney.runnerUpPrize) || 0;

  // Safe comparison helper for players
  const isPlayerMatch = (p: any, target: any) => {
    if (!p || !target) return false;
    if (typeof target === 'string' || typeof target === 'number') {
      const tStr = String(target).trim().toLowerCase();
      if (!tStr) return false;
      return (
        (p.userId && String(p.userId).trim().toLowerCase() === tStr) ||
        (p.id && String(p.id).trim().toLowerCase() === tStr) ||
        (p.gameName && String(p.gameName).trim().toLowerCase() === tStr) ||
        (p.displayName && String(p.displayName).trim().toLowerCase() === tStr)
      );
    }
    if (typeof target === 'object') {
      const targetUid = target.userId ? String(target.userId).trim().toLowerCase() : '';
      const targetId = target.id ? String(target.id).trim().toLowerCase() : '';
      const targetGameName = target.gameName ? String(target.gameName).trim().toLowerCase() : '';
      const targetDispName = target.displayName ? String(target.displayName).trim().toLowerCase() : '';

      const pUid = p.userId ? String(p.userId).trim().toLowerCase() : '';
      const pId = p.id ? String(p.id).trim().toLowerCase() : '';
      const pGameName = p.gameName ? String(p.gameName).trim().toLowerCase() : '';
      const pDispName = p.displayName ? String(p.displayName).trim().toLowerCase() : '';

      if (targetUid && pUid && targetUid === pUid) return true;
      if (targetId && pId && targetId === pId) return true;
      if (targetGameName && pGameName && targetGameName === pGameName) return true;
      if (targetDispName && pDispName && targetDispName === pDispName) return true;
      return false;
    }
    return false;
  };

  // Safe comparison helper for squads
  const isSquadMatch = (sqd: any, target: any) => {
    if (!sqd || !target) return false;
    if (typeof target === 'string' || typeof target === 'number') {
      const tStr = String(target).trim().toLowerCase();
      if (!tStr) return false;
      return (
        (sqd.id && String(sqd.id).trim().toLowerCase() === tStr) ||
        (sqd.name && String(sqd.name).trim().toLowerCase() === tStr) ||
        (sqd.squadName && String(sqd.squadName).trim().toLowerCase() === tStr)
      );
    }
    if (typeof target === 'object') {
      const targetId = target.id ? String(target.id).trim().toLowerCase() : '';
      const targetName = target.name ? String(target.name).trim().toLowerCase() : '';

      const sqdId = sqd.id ? String(sqd.id).trim().toLowerCase() : '';
      const sqdName = sqd.name ? String(sqd.name).trim().toLowerCase() : '';

      if (targetId && sqdId && targetId === sqdId) return true;
      if (targetName && sqdName && targetName === sqdName) return true;
      return false;
    }
    return false;
  };

  // Find winner and runner up objects
  let booyahWinnerDisplay: any = null;
  let runnerUpDisplay: any = null;

  if (isSolo) {
    if (tourney.booyahWinner) {
      booyahWinnerDisplay = soloResults.find((p: any) => isPlayerMatch(p, tourney.booyahWinner));
    }
    if (!booyahWinnerDisplay && soloResults.length > 0) {
      booyahWinnerDisplay = soloResults[0];
    }

    if (tourney.runnerUp) {
      runnerUpDisplay = soloResults.find((p: any) => isPlayerMatch(p, tourney.runnerUp) && !isPlayerMatch(p, booyahWinnerDisplay));
    }
    if (!runnerUpDisplay && soloResults.length > 1) {
      runnerUpDisplay = soloResults.find((p: any) => !isPlayerMatch(p, booyahWinnerDisplay)) || soloResults[1];
    }
  } else {
    if (tourney.booyahWinner) {
      booyahWinnerDisplay = squadResults.find((sqd: any) => isSquadMatch(sqd, tourney.booyahWinner));
    }
    if (!booyahWinnerDisplay && squadResults.length > 0) {
      booyahWinnerDisplay = squadResults[0];
    }

    if (tourney.runnerUp) {
      runnerUpDisplay = squadResults.find((sqd: any) => isSquadMatch(sqd, tourney.runnerUp) && !isSquadMatch(sqd, booyahWinnerDisplay));
    }
    if (!runnerUpDisplay && squadResults.length > 1) {
      runnerUpDisplay = squadResults.find((sqd: any) => !isSquadMatch(sqd, booyahWinnerDisplay)) || squadResults[1];
    }
  }

  // Calculate prizes
  const getSoloPlayerPrize = (p: any) => {
    if (!p) return 0;
    const kills = Number(p.kills) || 0;
    let total = kills * perKillRate;
    const isWin = booyahWinnerDisplay && isPlayerMatch(p, booyahWinnerDisplay);
    const isRunner = !isWin && runnerUpDisplay && isPlayerMatch(p, runnerUpDisplay);
    if (isWin) total += booyahPrize;
    else if (isRunner) total += runnerUpPrize;
    return total;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-slate-950 border border-cyan-500/30 rounded-3xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden relative"
      >
        {/* Top Cyberpunk Glow Lines */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent" />
        
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-white/10 flex items-center justify-between gap-4 bg-slate-900/60 sticky top-0 z-20 backdrop-blur-md">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
              <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/80 px-2.5 py-0.5 rounded-md border border-cyan-500/30 font-bold">
                  #{tourney.tournamentNumber || tourney.id}
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-white/10 font-bold">
                  {isSolo ? 'Solo Mode' : 'Squad Mode'}
                </span>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded-md bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 font-bold flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  Completed
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-black text-white truncate mt-1">
                {tourney.title}
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-white/10 transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-6 flex-1 custom-scrollbar">
          
          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3 bg-slate-900/60 p-3 sm:p-4 rounded-2xl border border-white/5 text-xs font-mono">
            <div>
              <span className="text-[9px] text-slate-500 uppercase block font-bold">Total Prize Pool</span>
              <span className="text-amber-400 font-bold text-sm sm:text-base flex items-center gap-1 mt-0.5">
                <Coins className="w-4 h-4 text-amber-400" />
                🪙 {tourney.prizePool || 0} Tk
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase block font-bold">Winner Booyah Prize</span>
              <span className="text-amber-300 font-bold text-sm sm:text-base flex items-center gap-1 mt-0.5">
                👑 🪙 {tourney.booyahPrize || 0} Tk
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase block font-bold">Runner-Up Prize</span>
              <span className="text-slate-300 font-bold text-sm sm:text-base flex items-center gap-1 mt-0.5">
                🥈 🪙 {tourney.runnerUpPrize || 0} Tk
              </span>
            </div>
            <div>
              <span className="text-[9px] text-slate-500 uppercase block font-bold">
                {isSolo ? 'Per Kill Prize' : 'Distribution Rule'}
              </span>
              <span className="text-cyan-400 font-bold text-sm sm:text-base flex items-center gap-1 mt-0.5">
                {isSolo ? `🎯 🪙 ${perKillRate} Tk` : '🛡️ Captain Account'}
              </span>
            </div>
          </div>

          {/* Screenshot On-Demand Bar */}
          {tourney.resultScreenshotUrl && (
            <div className="bg-slate-900/70 border border-cyan-500/20 rounded-2xl p-3.5 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white">Official Match Proof Screenshot</p>
                  <p className="text-[10px] text-slate-400">Verified by tournament host & admin review</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowScreenshot(!showScreenshot)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold font-mono uppercase tracking-wider bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 cursor-pointer flex items-center gap-1.5 transition-all shadow-[0_0_10px_rgba(6,182,212,0.15)]"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>{showScreenshot ? 'Hide Screenshot' : 'View Match Screenshot'}</span>
              </button>
            </div>
          )}

          {/* Screenshot Preview Dropdown */}
          <AnimatePresence>
            {showScreenshot && tourney.resultScreenshotUrl && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-black/90 border border-cyan-500/40 rounded-2xl p-2 sm:p-3 overflow-hidden shadow-2xl">
                  <img
                    src={tourney.resultScreenshotUrl}
                    alt="Official Tournament Result Screenshot Proof"
                    className="w-full max-h-[500px] object-contain rounded-xl"
                    referrerPolicy="no-referrer"
                    loading="lazy"
                  />
                  <div className="pt-2 text-center text-[10px] text-slate-400 font-mono">
                    Official End-Game Match Scoreboard Screenshot
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Top Podium Showcase (Winner & Runner-Up) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Booyah Champion Card */}
            <div className="bg-gradient-to-b from-amber-500/15 via-slate-900/90 to-slate-950 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 relative shadow-[0_0_25px_rgba(245,158,11,0.15)]">
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-black uppercase tracking-wider font-mono">
                <Crown className="w-3.5 h-3.5 text-amber-400" />
                <span>Booyah Champion</span>
              </div>

              <div className="flex items-center gap-3.5 mt-2">
                <div className="relative">
                  <img
                    src={
                      isSolo
                        ? (booyahWinnerDisplay?.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150')
                        : (booyahWinnerDisplay?.logo || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150')
                    }
                    alt=""
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-amber-400 bg-slate-900 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center font-black text-[10px]">
                    1
                  </div>
                </div>

                <div className="min-w-0">
                  <h4 className="text-base sm:text-lg font-black text-white truncate">
                    {isSolo
                      ? (booyahWinnerDisplay?.gameName || 'Winner')
                      : (booyahWinnerDisplay?.name || 'Winner Squad')}
                  </h4>
                  <p className="text-xs text-amber-300/90 font-mono font-bold">
                    {isSolo
                      ? (booyahWinnerDisplay?.displayName || 'Player')
                      : `Captain: ${booyahWinnerDisplay?.leaderName || 'Leader'}`}
                  </p>
                </div>
              </div>

              {/* Stats & Prize for Champion */}
              <div className="mt-4 pt-3 border-t border-amber-500/20 flex items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Kills</span>
                    <span className="text-cyan-400 font-bold text-sm">
                      {booyahWinnerDisplay?.kills || 0}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Damage</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {booyahWinnerDisplay?.damage || 0}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] text-amber-400 uppercase block font-bold">Prize Awarded</span>
                  <span className="text-amber-300 font-black text-sm sm:text-base">
                    🪙 {isSolo ? getSoloPlayerPrize(booyahWinnerDisplay) : booyahPrize} Tk
                  </span>
                </div>
              </div>
            </div>

            {/* Runner-Up Card */}
            <div className="bg-gradient-to-b from-slate-700/20 via-slate-900/90 to-slate-950 border border-slate-500/40 rounded-2xl p-4 sm:p-5 relative shadow-[0_0_20px_rgba(148,163,184,0.1)]">
              <div className="absolute top-3 right-3 flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-700/40 border border-slate-400/40 text-slate-200 text-[10px] font-black uppercase tracking-wider font-mono">
                <Award className="w-3.5 h-3.5 text-slate-300" />
                <span>Runner-Up</span>
              </div>

              <div className="flex items-center gap-3.5 mt-2">
                <div className="relative">
                  <img
                    src={
                      isSolo
                        ? (runnerUpDisplay?.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150')
                        : (runnerUpDisplay?.logo || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150')
                    }
                    alt=""
                    className="w-14 h-14 rounded-2xl object-cover border-2 border-slate-400 bg-slate-900 shadow-md"
                    referrerPolicy="no-referrer"
                  />
                  <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-slate-300 text-slate-950 flex items-center justify-center font-black text-[10px]">
                    2
                  </div>
                </div>

                <div className="min-w-0">
                  <h4 className="text-base sm:text-lg font-black text-white truncate">
                    {isSolo
                      ? (runnerUpDisplay?.gameName || 'Runner-Up')
                      : (runnerUpDisplay?.name || 'Runner-Up Squad')}
                  </h4>
                  <p className="text-xs text-slate-300/90 font-mono font-bold">
                    {isSolo
                      ? (runnerUpDisplay?.displayName || 'Player')
                      : `Captain: ${runnerUpDisplay?.leaderName || 'Leader'}`}
                  </p>
                </div>
              </div>

              {/* Stats & Prize for Runner-Up */}
              <div className="mt-4 pt-3 border-t border-slate-700/50 flex items-center justify-between gap-3 text-xs font-mono">
                <div className="flex items-center gap-3">
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Kills</span>
                    <span className="text-cyan-400 font-bold text-sm">
                      {runnerUpDisplay?.kills || 0}
                    </span>
                  </div>
                  <div className="w-px h-6 bg-white/10" />
                  <div>
                    <span className="text-[9px] text-slate-400 uppercase block">Damage</span>
                    <span className="text-emerald-400 font-bold text-sm">
                      {runnerUpDisplay?.damage || 0}
                    </span>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-[9px] text-slate-300 uppercase block font-bold">Prize Awarded</span>
                  <span className="text-slate-200 font-black text-sm sm:text-base">
                    🪙 {isSolo ? getSoloPlayerPrize(runnerUpDisplay) : runnerUpPrize} Tk
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Full Leaderboard / Participant Breakdowns */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <h3 className="text-xs sm:text-sm font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
                <Users className="w-4 h-4 text-cyan-400" />
                <span>{isSolo ? 'All Solo Participants Performance' : 'All Squads Performance & Member Breakdown'}</span>
              </h3>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {isSolo ? `${soloResults.length} Players` : `${squadResults.length} Squads`}
              </span>
            </div>

            {/* List for Squads */}
            {!isSolo && (
              <div className="space-y-3">
                {squadResults.map((sqd: any, idx: number) => {
                  const isExpanded = expandedSquadId === sqd.id || expandedSquadId === sqd.name;
                  const isWinnerSquad = booyahWinnerDisplay && isSquadMatch(sqd, booyahWinnerDisplay);
                  const isRunnerUpSquad = !isWinnerSquad && runnerUpDisplay && isSquadMatch(sqd, runnerUpDisplay);

                  return (
                    <div
                      key={idx}
                      className={`bg-slate-900/80 rounded-2xl border transition-all overflow-hidden ${
                        isWinnerSquad
                          ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-slate-900/90 to-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                          : isRunnerUpSquad
                          ? 'border-slate-500/40 bg-gradient-to-r from-slate-500/10 via-slate-900/90 to-slate-950'
                          : 'border-white/10 hover:border-cyan-500/30'
                      }`}
                    >
                      {/* Squad Header */}
                      <div 
                        onClick={() => sqd.members && sqd.members.length > 0 && setExpandedSquadId(isExpanded ? null : (sqd.id || sqd.name))}
                        className={`p-3.5 sm:p-4 flex items-center justify-between gap-3 ${sqd.members && sqd.members.length > 0 ? 'cursor-pointer hover:bg-white/[0.02]' : ''}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-6 font-mono font-black text-sm text-slate-500 text-center shrink-0">
                            #{idx + 1}
                          </div>
                          <img
                            src={sqd.logo || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150'}
                            alt=""
                            className="w-11 h-11 rounded-xl object-cover border border-white/10 bg-slate-950 shrink-0"
                            referrerPolicy="no-referrer"
                          />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-black text-white truncate">
                                {sqd.name || sqd.squadName || 'Squad'}
                              </h4>
                              {isWinnerSquad && (
                                <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                                  👑 Booyah
                                </span>
                              )}
                              {isRunnerUpSquad && (
                                <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-700/50 text-slate-200 border border-slate-500/30 whitespace-nowrap">
                                  🥈 2nd
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-400 font-mono truncate">
                              <span>Captain: <strong className="text-cyan-300">{sqd.leaderName || 'Leader'}</strong></span>
                              {sqd.members && sqd.members.length > 0 && (
                                <span className="text-[10px] text-cyan-400/80 bg-cyan-950/40 px-1.5 py-0.2 border border-cyan-500/20 rounded">
                                  {sqd.members.length} Members
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 sm:gap-4 shrink-0 font-mono">
                          <div className="text-center min-w-[36px]">
                            <span className="text-[8px] text-slate-500 uppercase block font-bold">Kills</span>
                            <span className="text-xs sm:text-sm font-black text-cyan-400">{sqd.kills || 0}</span>
                          </div>
                          <div className="text-center min-w-[42px]">
                            <span className="text-[8px] text-slate-500 uppercase block font-bold">Damage</span>
                            <span className="text-xs sm:text-sm font-black text-emerald-400">{sqd.damage || 0}</span>
                          </div>

                          {/* Expand Members Button */}
                          {sqd.members && sqd.members.length > 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setExpandedSquadId(isExpanded ? null : (sqd.id || sqd.name));
                              }}
                              className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                                isExpanded 
                                  ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300' 
                                  : 'bg-slate-800 border-white/5 hover:bg-slate-700 text-slate-300'
                              }`}
                              title={isExpanded ? "Hide Player Breakdown" : "View Player Breakdown"}
                            >
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Squad Members Breakdown (Collapsible / Visible) */}
                      {sqd.members && sqd.members.length > 0 && isExpanded && (
                        <div className="px-3.5 pb-3.5 pt-2 border-t border-white/5 bg-slate-950/60 space-y-2">
                          <span className="text-[9px] font-mono uppercase text-cyan-400 font-bold block">
                            Squad Members Individual Statistics ({sqd.members.length})
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {sqd.members.map((m: any, mIdx: number) => (
                              <div
                                key={mIdx}
                                className="bg-slate-900/90 p-2.5 rounded-xl border border-white/5 flex items-center justify-between gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={m.avatar || m.avatarUrl || m.photoURL || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150'}
                                    alt=""
                                    className="w-7 h-7 rounded-full object-cover border border-cyan-500/30 shrink-0"
                                    referrerPolicy="no-referrer"
                                  />
                                  <span className="text-xs font-bold text-white truncate">
                                    {m.gameName || m.ingameName || m.name || `Player #${mIdx + 1}`}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-xs font-mono shrink-0">
                                  <span className="text-cyan-400 font-bold">Kills: {m.kills || 0}</span>
                                  <span className="text-emerald-400 font-bold">Damage: {m.damage || 0}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* List for Solo */}
            {isSolo && (
              <div className="space-y-2.5">
                {soloResults.map((p: any, idx: number) => {
                  const isWinnerPlayer = booyahWinnerDisplay && isPlayerMatch(p, booyahWinnerDisplay);
                  const isRunnerUpPlayer = !isWinnerPlayer && runnerUpDisplay && isPlayerMatch(p, runnerUpDisplay);
                  const prize = getSoloPlayerPrize(p);

                  return (
                    <div
                      key={idx}
                      className={`p-3.5 sm:p-4 rounded-2xl border flex items-center justify-between gap-3 transition-all ${
                        isWinnerPlayer
                          ? 'border-amber-500/40 bg-gradient-to-r from-amber-500/10 via-slate-900/90 to-slate-950 shadow-[0_0_15px_rgba(245,158,11,0.1)]'
                          : isRunnerUpPlayer
                          ? 'border-slate-500/40 bg-gradient-to-r from-slate-500/10 via-slate-900/90 to-slate-950'
                          : 'border-white/10 bg-slate-900/70 hover:border-cyan-500/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-6 font-mono font-black text-sm text-slate-500 text-center shrink-0">
                          #{idx + 1}
                        </div>
                        <img
                          src={p.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150'}
                          alt=""
                          className="w-10 h-10 rounded-xl object-cover border border-white/10 bg-slate-950 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="text-sm font-black text-white truncate">
                              {p.gameName || p.ingameName || p.displayName || 'Player'}
                            </h4>
                            {isWinnerPlayer && (
                              <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 whitespace-nowrap">
                                👑 Champion
                              </span>
                            )}
                            {isRunnerUpPlayer && (
                              <span className="text-[9px] font-mono font-bold uppercase px-2 py-0.5 rounded bg-slate-700/50 text-slate-200 border border-slate-500/30 whitespace-nowrap">
                                🥈 Runner-Up
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-400 font-mono truncate">
                            {p.displayName || p.userName || 'Gamer'}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 sm:gap-6 shrink-0 font-mono text-xs">
                        <div className="text-center min-w-[36px]">
                          <span className="text-[8px] text-slate-500 uppercase block font-bold">Kills</span>
                          <span className="text-cyan-400 font-black text-xs sm:text-sm">{p.kills || 0}</span>
                        </div>
                        <div className="text-center min-w-[42px]">
                          <span className="text-[8px] text-slate-500 uppercase block font-bold">Damage</span>
                          <span className="text-emerald-400 font-black text-xs sm:text-sm">{p.damage || 0}</span>
                        </div>
                        <div className="text-right min-w-[70px]">
                          <span className="text-[8px] text-amber-400 uppercase block font-bold">Prize</span>
                          <span className="text-amber-300 font-black text-xs sm:text-sm">🪙 {prize} Tk</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-slate-900/80 flex items-center justify-between gap-3 text-xs font-mono">
          <div className="text-slate-400 text-[11px]">
            Approved & Finalized by Admin Review
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
