import React, { useState, useEffect, useRef } from 'react';

// Helper component for long-press functionality
const LongPressButton = ({ 
  children, 
  onAction, 
  onHoldAction,
  className,
  disabled = false
}: { 
  children: React.ReactNode; 
  onAction: () => void; 
  onHoldAction?: () => void;
  className: string;
  disabled?: boolean;
}) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isActingRef = useRef(false);

  const startAction = (e: React.PointerEvent) => {
    if (disabled || isActingRef.current) return;
    
    isActingRef.current = true;
    onAction();

    timerRef.current = setTimeout(() => {
      intervalRef.current = setInterval(() => {
        if (onHoldAction) {
          onHoldAction();
        } else {
          onAction();
        }
      }, 100);
    }, 400);
  };

  const stopAction = () => {
    isActingRef.current = false;
    if (timerRef.current) clearTimeout(timerRef.current);
    if (intervalRef.current) clearInterval(intervalRef.current);
  };

  return (
    <button
      type="button"
      onPointerDown={startAction}
      onPointerUp={stopAction}
      onPointerLeave={stopAction}
      onPointerCancel={stopAction}
      className={className}
      disabled={disabled}
      style={{ touchAction: 'none' }}
    >
      {children}
    </button>
  );
};
import { 
  Shield, 
  Plus, 
  MoreVertical, 
  UserPlus, 
  Users, 
  X, 
  Trash2, 
  Check, 
  Search, 
  AlertCircle,
  ImagePlus,
  Upload,
  Loader2,
  Palette,
  Edit3,
  Wallet,
  Clock,
  FileCheck,
  MapPin,
  ShieldAlert,
  FileText,
  AlertTriangle,
  Globe,
  Trophy,
  Coins,
  Award,
  Calendar,
  ChevronRight,
  ShieldCheck,
  Unlock,
  Eye,
  MessageSquare,
  Send,
  ArrowLeft,
  ExternalLink,
  Inbox,
  Flame,
  Play,
  Key,
  CheckCircle,
  CheckCircle2,
  Map,
  DollarSign,
  Target,
  Camera,
  Minus,
  Crown,
  Video,
  Swords,
  XCircle,
  Ban
} from 'lucide-react';
import { LeagueScheduleView } from './LeagueScheduleView';
import { LoneWolfView } from './LoneWolfView';
import { validateSocialMediaLink } from './HostProfileModal';
import { motion, AnimatePresence } from 'framer-motion';
import { db, auth } from '../lib/firebase';
import { 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  runTransaction,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import { UserProfile, ProHostedLeague } from '../types';
import { hasOpeningMatchStarted } from '../lib/dateUtils';
import { checkAndCancelUnderfundedLeague } from '../lib/leagueAutoCancel';
import { GenerateLeagueView } from './GenerateLeagueView';
import { GenerateTournamentView } from './GenerateTournamentView';
import { GenerateLoneWolfView } from './GenerateLoneWolfView';
import { compressAndUploadLogoToFirebase, compressAndUploadCoverToFirebase } from '../lib/imgbb';
import { CoHostPermissionsMatrix } from './CoHostPermissionsMatrix';
import { 
  CO_HOST_PERMISSIONS, 
  CO_HOST_PERMISSION_CATEGORIES, 
  getDefaultCoHostPermissions, 
  checkCoHostPermission,
  CoHostPermissionDef 
} from '../lib/coHostPermissions';

interface ProHostPanelProps {
  userProfile: UserProfile | null;
  targetHostId?: string | null;
  tokens: number;
  setTokens: (v: number | ((prev: number) => number)) => void;
  onViewMySquad?: () => void;
  onBackToInbox?: () => void;
  onOpenSubscriptionModal?: () => void;
  onTagMatchForPulse?: (match: any) => void;
}

interface CoHost {
  id: string;
  hostId: string;
  name: string;
  identifier: string; // Registered PlayVear ID
  role: string;
  photoURL?: string;
  status?: 'active' | 'suspended';
  permissions?: Record<string, boolean>;
  createdAt?: any;
  updatedAt?: any;
}

// Random / System generated theme color palettes for host brand panel
export const BRAND_THEMES = [
  {
    id: 'cyan',
    name: 'Neon Cyan',
    border: 'border-cyan-500/40',
    bg: 'bg-cyan-950/25',
    text: 'text-cyan-400',
    accentBg: 'bg-cyan-600 hover:bg-cyan-500',
    shadow: 'shadow-[0_0_20px_rgba(6,182,212,0.15)]',
    badge: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30',
  },
  {
    id: 'emerald',
    name: 'Emerald Volt',
    border: 'border-emerald-500/40',
    bg: 'bg-emerald-950/25',
    text: 'text-emerald-400',
    accentBg: 'bg-emerald-600 hover:bg-emerald-500',
    shadow: 'shadow-[0_0_20px_rgba(16,185,129,0.15)]',
    badge: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  },
  {
    id: 'amber',
    name: 'Flame Gold',
    border: 'border-amber-500/40',
    bg: 'bg-amber-950/25',
    text: 'text-amber-400',
    accentBg: 'bg-amber-600 hover:bg-amber-500',
    shadow: 'shadow-[0_0_20px_rgba(245,158,11,0.15)]',
    badge: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  },
  {
    id: 'rose',
    name: 'Neon Rose',
    border: 'border-rose-500/40',
    bg: 'bg-rose-950/25',
    text: 'text-rose-400',
    accentBg: 'bg-rose-600 hover:bg-rose-500',
    shadow: 'shadow-[0_0_20px_rgba(244,63,94,0.15)]',
    badge: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  },
  {
    id: 'electric-blue',
    name: 'Electric Blue',
    border: 'border-blue-500/40',
    bg: 'bg-blue-950/25',
    text: 'text-blue-400',
    accentBg: 'bg-blue-600 hover:bg-blue-500',
    shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]',
    badge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  },
  {
    id: 'fuchsia',
    name: 'Hyper Fuchsia',
    border: 'border-blue-500/40',
    bg: 'bg-blue-950/25',
    text: 'text-sky-400',
    accentBg: 'bg-blue-600 hover:bg-blue-500',
    shadow: 'shadow-[0_0_20px_rgba(59,130,246,0.15)]',
    badge: 'bg-blue-500/15 text-sky-300 border-blue-500/30',
  },
  {
    id: 'teal',
    name: 'Cyber Teal',
    border: 'border-teal-500/40',
    bg: 'bg-teal-950/25',
    text: 'text-teal-400',
    accentBg: 'bg-teal-600 hover:bg-teal-500',
    shadow: 'shadow-[0_0_20px_rgba(20,184,166,0.15)]',
    badge: 'bg-teal-500/15 text-teal-300 border-teal-500/30',
  },
  {
    id: 'orange',
    name: 'Vortex Orange',
    border: 'border-orange-500/40',
    bg: 'bg-orange-950/25',
    text: 'text-orange-400',
    accentBg: 'bg-orange-600 hover:bg-orange-500',
    shadow: 'shadow-[0_0_20px_rgba(249,115,22,0.15)]',
    badge: 'bg-orange-500/15 text-orange-300 border-orange-500/30',
  },
];

// Helper: Get unique deterministic theme index per host ID
export function getHostThemeIndex(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash << 5) - hash + id.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash) % BRAND_THEMES.length;
}

export function ProHostPanel({ 
  userProfile, 
  targetHostId, 
  tokens, 
  setTokens, 
  onViewMySquad, 
  onBackToInbox, 
  onOpenSubscriptionModal,
  onTagMatchForPulse 
}: ProHostPanelProps) {
  const hostId = targetHostId || userProfile?.userId || '';
  const [view, setView] = useState<'dashboard' | 'generate_league' | 'generate_tournament' | 'generate_lone_wolf'>('dashboard');
  const [showGenerateChoiceModal, setShowGenerateChoiceModal] = useState(false);
  const [activeScheduleLeague, setActiveScheduleLeague] = useState<ProHostedLeague | null>(null);
  const [hostNavigationContext, setHostNavigationContext] = useState<any>(null);
  const [liveProfile, setLiveProfile] = useState<UserProfile | null>(null);

  const [showAppealsModal, setShowAppealsModal] = useState(false);
  const [appealMessage, setAppealMessage] = useState('');
  const [isSendingAppeal, setIsSendingAppeal] = useState(false);
  const [hostAppeals, setHostAppeals] = useState<any[]>([]);

  useEffect(() => {
    if (!hostId || !showAppealsModal) return;
    const q = query(
      collection(db, 'admin_messages'),
      where('senderId', '==', hostId),
      orderBy('createdAt', 'desc')
    );
    const unsub = onSnapshot(q, (snap) => {
      setHostAppeals(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [hostId, showAppealsModal]);

  useEffect(() => {
    if (!hostId) return;
    const unsub = onSnapshot(doc(db, 'users', hostId), (snap) => {
      if (snap.exists()) {
        setLiveProfile(snap.data() as UserProfile);
      }
    }, (err) => {
      console.warn("Real-time user snapshot listener error:", err);
    });
    return () => unsub();
  }, [hostId]);

  const activeUser = targetHostId ? liveProfile : (liveProfile || userProfile);

  if (targetHostId && !activeUser) {
    return (
      <div className="flex items-center justify-center py-20 text-cyan-400">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  const handleSendAppeal = async () => {
    if (!appealMessage.trim() || !activeUser) return;
    setIsSendingAppeal(true);
    try {
      await addDoc(collection(db, 'admin_messages'), {
        senderId: activeUser.userId,
        senderName: activeUser.displayName || 'Host',
        senderEmail: activeUser.email || '',
        senderPhoto: activeUser.photoURL || null,
        type: 'suspension_appeal',
        message: appealMessage.trim(),
        status: 'unread',
        replies: [],
        sourceContext: {
          type: 'host_panel',
          hostId: activeUser.userId
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setAppealMessage('');
      alert("Your message has been sent to the admin team.");
    } catch (err: any) {
      console.error("Error sending appeal:", err);
      alert("Failed to send message: " + err.message);
    } finally {
      setIsSendingAppeal(false);
    }
  };

  const isSuspended = Boolean(
    activeUser?.isHostSuspended &&
    (activeUser?.hostSuspensionIsLifetime ||
      !activeUser?.hostSuspensionUntil ||
      new Date(activeUser.hostSuspensionUntil).getTime() > Date.now())
  );

  if (isSuspended) {
    return (
      <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">
        <div className="p-6 md:p-8 bg-gradient-to-b from-rose-950/80 via-slate-950 to-slate-950 border-2 border-rose-500/50 rounded-3xl shadow-[0_0_50px_rgba(244,63,94,0.25)] space-y-6 text-center relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="w-20 h-20 mx-auto rounded-3xl bg-rose-500/20 border-2 border-rose-500/40 flex items-center justify-center text-rose-400 shadow-[0_0_25px_rgba(244,63,94,0.3)]">
            <ShieldAlert className="w-10 h-10 animate-pulse" />
          </div>

          <div className="space-y-2">
            <span className="px-3 py-1 bg-rose-500/20 border border-rose-500/40 rounded-full text-xs font-black text-rose-400 uppercase tracking-widest font-mono">
              ACCESS RESTRICTED
            </span>
            <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-wider font-mono">
              Host Panel Suspended
            </h2>
            <p className="text-xs md:text-sm text-slate-300 max-w-md mx-auto leading-relaxed">
              Your host account privileges have been suspended by the tournament administration. You cannot host new tournaments or leagues during this period.
            </p>
          </div>

          <div className="max-w-md mx-auto bg-slate-900/90 border border-rose-500/30 p-4 rounded-2xl text-left space-y-3 font-mono text-xs">
            <div>
              <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider block">Reason for Suspension</span>
              <p className="text-rose-300 font-bold mt-0.5">{activeUser?.hostSuspensionReason || 'Violation of host guidelines'}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10 text-[11px]">
              <div>
                <span className="text-slate-500 text-[10px] block">League</span>
                <span className="text-cyan-400 font-bold">{activeUser?.hostSuspensionLeagueName || 'Pro League'}</span>
              </div>
              <div>
                <span className="text-slate-500 text-[10px] block">Duration</span>
                <span className="text-amber-400 font-bold">{activeUser?.hostSuspensionDurationLabel || 'Active Suspension'}</span>
              </div>
            </div>

            {activeUser?.hostSuspensionUntil ? (
              <div className="pt-2 border-t border-white/10 text-[10px] text-slate-400 flex items-center justify-between">
                <span>Suspension Expires:</span>
                <span className="text-slate-200 font-bold">{new Date(activeUser.hostSuspensionUntil).toLocaleString()}</span>
              </div>
            ) : activeUser?.hostSuspensionIsLifetime ? (
              <div className="pt-2 border-t border-white/10 text-[10px] text-rose-400 flex items-center justify-between font-bold">
                <span>Type:</span>
                <span>Lifetime Suspension</span>
              </div>
            ) : null}
          </div>

          <div className="pt-4 flex justify-center">
            <button
              onClick={() => setShowAppealsModal(true)}
              className="w-14 h-14 bg-slate-900 border border-slate-700 hover:border-cyan-500 hover:bg-cyan-500/10 rounded-full flex items-center justify-center text-slate-400 hover:text-cyan-400 transition-all cursor-pointer shadow-lg active:scale-95"
              title="Contact Admin / Appeals"
            >
              <MessageSquare className="w-6 h-6" />
            </button>
          </div>
        </div>

        {/* Appeals/Messages Modal */}
        {showAppealsModal && (
          <div className="fixed inset-0 z-[200] bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
            <div className="bg-[#0a0e22] border border-cyan-500/50 rounded-3xl max-w-lg w-full p-6 text-left shadow-2xl relative flex flex-col max-h-[85vh]">
              <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
                <div className="flex items-center gap-2 text-cyan-400">
                  <MessageSquare className="w-5 h-5" />
                  <h3 className="text-sm font-black text-white uppercase tracking-wider">
                    Admin Messages
                  </h3>
                </div>
                <button
                  onClick={() => setShowAppealsModal(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-full hover:bg-white/10 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-4 min-h-[300px] scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent pr-2">
                {hostAppeals.length === 0 ? (
                  <div className="text-center text-slate-500 font-mono text-xs py-10">
                    No messages sent yet.
                  </div>
                ) : (
                  hostAppeals.map(msg => (
                    <div key={msg.id} className="space-y-2">
                      <div className="bg-slate-800/50 border border-slate-700 p-3 rounded-xl rounded-tr-sm ml-8 text-right font-mono">
                        <p className="text-xs text-white">{msg.message}</p>
                        <div className="text-[9px] text-slate-400 mt-2 flex justify-end gap-2 items-center">
                          {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString() : 'Just now'}
                          {msg.status === 'read' && <span className="text-cyan-400 flex items-center gap-0.5"><Check className="w-3 h-3" /><Check className="w-3 h-3 -ml-2" /> Read</span>}
                        </div>
                      </div>
                      
                      {msg.replies && msg.replies.map((reply: any, idx: number) => (
                        <div key={idx} className="bg-cyan-950/30 border border-cyan-500/30 p-3 rounded-xl rounded-tl-sm mr-8 text-left font-mono">
                          <p className="text-xs text-cyan-50">{reply.message}</p>
                          <div className="text-[9px] text-cyan-500 mt-2">
                            Admin • {new Date(reply.createdAt).toLocaleString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))
                )}
              </div>

              <div className="pt-4 border-t border-white/10 shrink-0 mt-auto">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={appealMessage}
                    onChange={(e) => setAppealMessage(e.target.value)}
                    placeholder="Type a message to admin..."
                    className="flex-1 bg-slate-900 border border-slate-700 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none font-mono"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendAppeal();
                    }}
                  />
                  <button
                    onClick={handleSendAppeal}
                    disabled={!appealMessage.trim() || isSendingAppeal}
                    className="h-auto px-4 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl flex items-center justify-center transition-all cursor-pointer disabled:opacity-50"
                  >
                    {isSendingAppeal ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  }

  if (activeScheduleLeague) {
    return (
      <LeagueScheduleView 
        league={activeScheduleLeague} 
        userProfile={userProfile}
        tokens={tokens}
        setTokens={setTokens}
        onViewMySquad={onViewMySquad}
        onBack={() => {
          if (targetHostId) {
            onBackToInbox?.();
          } else {
            setActiveScheduleLeague(null);
            setHostNavigationContext(null);
          }
        }} 
        navigationContext={hostNavigationContext}
        onTagMatchForPulse={onTagMatchForPulse}
      />
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6 pb-20">
      {view === 'dashboard' && (
        <DashboardView 
          userProfile={userProfile} 
          onGenerate={() => setShowGenerateChoiceModal(true)} 
          onSelectLeague={() => {}}
          setActiveScheduleLeague={setActiveScheduleLeague}
          setHostNavigationContext={setHostNavigationContext}
          tokens={tokens}
          setTokens={setTokens}
          targetHostId={targetHostId}
          onBackToInbox={onBackToInbox}
        />
      )}

      {/* Generation Type Selection Pop-Up Window */}
      {showGenerateChoiceModal && (
        <div className="fixed inset-0 bg-black/90 z-50 flex items-center justify-center p-4 backdrop-blur-md">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-cyan-500/40 rounded-3xl p-6 w-full max-w-md space-y-5 shadow-2xl relative text-center"
          >
            <button
              onClick={() => setShowGenerateChoiceModal(false)}
              className="absolute top-4 right-4 p-1.5 bg-slate-800 text-slate-400 hover:text-white rounded-xl cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-1">
              <div className="w-12 h-12 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl flex items-center justify-center mx-auto text-cyan-400">
                <Plus className="w-6 h-6" />
              </div>
              <h3 className="text-base font-black text-white uppercase font-mono tracking-wider pt-1">
                Select Host Generation Mode
              </h3>
              <p className="text-xs text-slate-400 font-sans">
                Choose whether to host a full staged League or a single Global Tournament.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3 pt-2">
              {/* Option 1: Generate League */}
              <button
                onClick={() => {
                  setShowGenerateChoiceModal(false);
                  setView('generate_league');
                }}
                className="p-4 bg-slate-950 border border-cyan-500/30 hover:border-cyan-400 rounded-2xl flex items-center gap-3.5 text-left transition-all hover:scale-[1.02] cursor-pointer group shadow-lg"
              >
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl group-hover:bg-cyan-500/20">
                  <Trophy className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase font-mono group-hover:text-cyan-300">
                    Generate League
                  </h4>
                  <p className="text-[10.5px] text-slate-400 leading-tight mt-0.5">
                    Multi-match staged tournament with group stages, knockouts, and auto-scheduler.
                  </p>
                </div>
              </button>

              {/* Option 2: Generate Tournament */}
              <button
                onClick={() => {
                  setShowGenerateChoiceModal(false);
                  setView('generate_tournament');
                }}
                className="p-4 bg-slate-950 border border-indigo-500/30 hover:border-indigo-400 rounded-2xl flex items-center gap-3.5 text-left transition-all hover:scale-[1.02] cursor-pointer group shadow-lg"
              >
                <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-xl group-hover:bg-indigo-500/20">
                  <Flame className="w-6 h-6 text-indigo-400" />
                </div>
                <div>
                  <h4 className="text-xs font-black text-white uppercase font-mono group-hover:text-indigo-300">
                    Generate Tournament
                  </h4>
                  <p className="text-[10.5px] text-slate-400 leading-tight mt-0.5">
                    Single Battle Royale tournament (Solo / Squad), locked host deposit, and custom sponsor limits.
                  </p>
                </div>
              </button>

              {/* Option 3: Generate Lone Wolf */}
              <button
                onClick={() => {
                  setShowGenerateChoiceModal(false);
                  setView('generate_lone_wolf');
                }}
                className="p-4 bg-slate-950 border border-cyan-500/40 hover:border-cyan-400 rounded-2xl flex items-center gap-3.5 text-left transition-all hover:scale-[1.02] cursor-pointer group shadow-lg"
              >
                <div className="p-3 bg-cyan-500/10 border border-cyan-500/20 rounded-xl group-hover:bg-cyan-500/20">
                  <Swords className="w-6 h-6 text-cyan-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-black text-white uppercase font-mono group-hover:text-cyan-300">
                      Generate Lone Wolf
                    </h4>
                    <span className="text-[9px] font-mono px-1.5 py-0.2 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-full font-bold">
                      FREE HOST
                    </span>
                  </div>
                  <p className="text-[10.5px] text-slate-400 leading-tight mt-0.5">
                    Free Fire 1vs1 Duel Arena (TBD 1 vs TBD 2), no subscription required with 100% prize security deposit.
                  </p>
                </div>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {view === 'generate_league' && (
        <GenerateLeagueView 
          userProfile={userProfile} 
          tokens={tokens} 
          onBack={() => setView('dashboard')}
          onLeagueGenerated={() => {
            setView('dashboard');
          }}
        />
      )}

      {view === 'generate_tournament' && (
        <GenerateTournamentView
          userProfile={userProfile}
          tokens={tokens}
          setTokens={setTokens}
          onBack={() => setView('dashboard')}
          onTournamentGenerated={() => {
            setView('dashboard');
          }}
          onOpenSubscriptionModal={() => {
            onOpenSubscriptionModal?.();
          }}
        />
      )}

      {view === 'generate_lone_wolf' && (
        <GenerateLoneWolfView
          userProfile={userProfile}
          tokens={tokens}
          setTokens={setTokens}
          onBack={() => setView('dashboard')}
          onLoneWolfGenerated={() => {
            setView('dashboard');
          }}
          onOpenSubscriptionModal={() => {
            onOpenSubscriptionModal?.();
          }}
        />
      )}
    </div>
  );
}

function DashboardView({ 
  userProfile, 
  onGenerate, 
  onSelectLeague,
  setActiveScheduleLeague,
  setHostNavigationContext,
  tokens,
  setTokens,
  targetHostId,
  onBackToInbox
}: { 
  userProfile: UserProfile | null; 
  onGenerate: () => void; 
  onSelectLeague: (leagueId: string) => void;
  setActiveScheduleLeague: (league: ProHostedLeague) => void;
  setHostNavigationContext?: (ctx: any) => void;
  tokens: number;
  setTokens: (v: number | ((prev: number) => number)) => void;
  targetHostId?: string | null;
  onBackToInbox?: () => void;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showCoHostModal, setShowCoHostModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);

  // Host Messages Inbox States
  const [showHostInboxModal, setShowHostInboxModal] = useState(false);
  const [hostInboxMessages, setHostInboxMessages] = useState<any[]>([]);
  const [inboxFilter, setInboxFilter] = useState<'all' | 'unread' | 'issues' | 'direct'>('all');
  const [replyInputMap, setReplyInputMap] = useState<Record<string, string>>({});
  const [isReplyingMap, setIsReplyingMap] = useState<Record<string, boolean>>({});
  const [directMsgText, setDirectMsgText] = useState('');
  const [isSendingDirect, setIsSendingDirect] = useState(false);
  
  // Co-Host form and list states
  const [coHosts, setCoHosts] = useState<CoHost[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [role, setRole] = useState('Match Manager');
  const [newCoHostPermissions, setNewCoHostPermissions] = useState<Record<string, boolean>>(() => getDefaultCoHostPermissions(true));
  const [editingCoHost, setEditingCoHost] = useState<CoHost | null>(null);
  const [editingPermissions, setEditingPermissions] = useState<Record<string, boolean>>({});
  const [savingPermissions, setSavingPermissions] = useState(false);
  const [editingDetailsCoHost, setEditingDetailsCoHost] = useState<CoHost | null>(null);
  const [editName, setEditName] = useState('');
  const [editIdentifier, setEditIdentifier] = useState('');
  const [editRole, setEditRole] = useState('Match Manager');
  const [savingDetails, setSavingDetails] = useState(false);
  const [togglingStatusId, setTogglingStatusId] = useState<string | null>(null);
  const [coHostActiveTab, setCoHostActiveTab] = useState<'list' | 'add'>('list');
  const [coHostSearchTerm, setCoHostSearchTerm] = useState('');
  const [currentCoHostRecord, setCurrentCoHostRecord] = useState<CoHost | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isMainHost = !targetHostId || targetHostId === userProfile?.userId;

  useEffect(() => {
    if (isMainHost || !targetHostId) return;
    const fetchCurrentCoHost = async () => {
      try {
        const q = query(collection(db, 'co_hosts'), where('hostId', '==', targetHostId));
        const snap = await getDocs(q);
        const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as CoHost));
        const myId = (userProfile?.userId || '').trim().toLowerCase();
        const myEmail = (userProfile?.email || '').trim().toLowerCase();
        const myMobile = (userProfile?.mobile || '').trim().toLowerCase();
        const myGamingUid = (userProfile?.gamingUid || '').trim().toLowerCase();
        
        const matched = list.find(c => {
          const ident = (c.identifier || '').trim().toLowerCase();
          return (myId && ident === myId) || 
                 (myEmail && ident === myEmail) || 
                 (myMobile && ident === myMobile) || 
                 (myGamingUid && ident === myGamingUid);
        });

        if (matched) {
          setCurrentCoHostRecord(matched);
        }
      } catch (e) {
        console.warn("Error resolving current co-host perms:", e);
      }
    };
    fetchCurrentCoHost();
  }, [targetHostId, userProfile?.userId, isMainHost]);

  const userCoHostPermissions = currentCoHostRecord?.permissions || (isMainHost ? null : getDefaultCoHostPermissions(false));

  const hasPermission = (permKey: string) => {
    return checkCoHostPermission(isMainHost, userCoHostPermissions, permKey, currentCoHostRecord?.status);
  };
  const [openLeagueMenuId, setOpenLeagueMenuId] = useState<string | null>(null);
  const [openTournamentMenuId, setOpenTournamentMenuId] = useState<string | null>(null);
  const [transferring, setTransferring] = useState<string | null>(null);
  const [showWalletModalLeague, setShowWalletModalLeague] = useState<ProHostedLeague | null>(null);
  const [showWalletModalTourney, setShowWalletModalTourney] = useState<any | null>(null);
  const [walletHistory, setWalletHistory] = useState<any[]>([]);
  const [isLoadingWallet, setIsLoadingWallet] = useState(false);

  const lastFetchedLeagueId = useRef<string | null>(null);
  const lastFetchedTourneyId = useRef<string | null>(null);

  useEffect(() => {
    if (showWalletModalLeague) {
      if (lastFetchedLeagueId.current === showWalletModalLeague.id) {
        return;
      }
      const fetchWallet = async () => {
        setIsLoadingWallet(true);
        try {
          lastFetchedLeagueId.current = showWalletModalLeague.id;
          
          const leagueDocRef = doc(db, 'pro_hosted_leagues', showWalletModalLeague.id);
          const [leagueSnap, historySnap] = await Promise.all([
            getDoc(leagueDocRef),
            getDocs(query(collection(db, 'pro_host_wallet_history'), where('leagueId', '==', showWalletModalLeague.id)))
          ]);
          
          if (leagueSnap.exists()) {
            const data = leagueSnap.data();
            setShowWalletModalLeague(prev => prev ? { ...prev, ...data } : null);
            setHostLeagues(prev => prev.map(l => l.id === showWalletModalLeague.id ? { ...l, ...data } : l));
            setPendingLeagues(prev => prev.map(l => l.id === showWalletModalLeague.id ? { ...l, ...data } : l));
          }

          const hist = historySnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
          });
          setWalletHistory(hist);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingWallet(false);
        }
      };
      fetchWallet();
    } else {
      lastFetchedLeagueId.current = null;
    }
  }, [showWalletModalLeague]);

  useEffect(() => {
    if (showWalletModalTourney) {
      if (lastFetchedTourneyId.current === showWalletModalTourney.id) {
        return;
      }
      const fetchTourneyWallet = async () => {
        setIsLoadingWallet(true);
        try {
          lastFetchedTourneyId.current = showWalletModalTourney.id;
          
          const tourneyDocRef = doc(db, 'tournaments_freefire', showWalletModalTourney.id);
          const [tourneySnap, historySnap] = await Promise.all([
            getDoc(tourneyDocRef),
            getDocs(query(collection(db, 'pro_host_wallet_history'), where('tournamentId', '==', showWalletModalTourney.id)))
          ]);
          
          if (tourneySnap.exists()) {
            const data = tourneySnap.data();
            setShowWalletModalTourney(prev => prev ? { ...prev, ...data } : null);
            setHostTournaments(prev => prev.map(t => t.id === showWalletModalTourney.id ? { ...t, ...data } : t));
          }

          const hist = historySnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
            const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
            const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
            return timeB - timeA;
          });
          setWalletHistory(hist);
        } catch (e) {
          console.error(e);
        } finally {
          setIsLoadingWallet(false);
        }
      };
      fetchTourneyWallet();
    } else {
      lastFetchedTourneyId.current = null;
    }
  }, [showWalletModalTourney]);

  const handleSetLeagueStatus = async (leagueId: string, newStatus: 'approved' | 'ongoing') => {
    try {
      const leagueRef = doc(db, 'pro_hosted_leagues', leagueId);
      await updateDoc(leagueRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      setOpenLeagueMenuId(null);
    } catch (error) {
      console.error('Failed to update league status:', error);
      alert('Failed to update status. Please try again.');
    }
  };

  const handleTransferFromLeagueWallet = async (league: ProHostedLeague) => {
    const availableBalance = Number(league.walletBalance) || 0;
    if (availableBalance <= 0) return;
    const isUnlocked = (league.walletStatus as string) === 'unlocked' || league.walletStatus === 'active' || (league.walletStatus as string) === 'approved';
    if (!isUnlocked) {
      alert("This League Wallet is currently LOCKED. Please contact the System Admin for approval.");
      return;
    }

    setTransferring(league.id);
    try {
      const targetUserId = league.hostId || userProfile?.userId;
      if (!targetUserId) throw new Error("Host user ID not found");

      await runTransaction(db, async (transaction) => {
        const leagueRef = doc(db, 'pro_hosted_leagues', league.id);
        const userRef = doc(db, 'users', targetUserId);
        
        const leagueSnap = await transaction.get(leagueRef);
        const userSnap = await transaction.get(userRef);
        
        if (!leagueSnap.exists()) throw new Error("League document not found");
        
        const currentBalance = Number(leagueSnap.data().walletBalance) || 0;
        if (currentBalance <= 0) throw new Error("Insufficient balance in league wallet");
        
        transaction.update(leagueRef, { 
          walletBalance: 0,
          walletStatus: 'active',
          transferredToMainAt: new Date().toISOString(),
          updatedAt: serverTimestamp()
        });
        
        if (userSnap.exists()) {
          transaction.update(userRef, { 
            tokens: (Number(userSnap.data().tokens) || 0) + currentBalance,
            updatedAt: new Date().toISOString()
          });
        } else {
          transaction.set(userRef, {
            userId: targetUserId,
            email: userProfile?.email || league.hostEmail || '',
            displayName: userProfile?.displayName || league.hostName || 'Host',
            tokens: currentBalance,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }

        const lName = league.leagueName || (league as any).name || 'League';

        // Host history log
        const hostHistRef = doc(collection(db, 'pro_host_wallet_history'));
        transaction.set(hostHistRef, {
          leagueId: league.id,
          leagueName: lName,
          hostId: targetUserId,
          type: 'transfer_to_main_wallet',
          amount: currentBalance,
          balanceAfter: 0,
          description: `Transferred to Host Main Account from League (${lName})`,
          createdAt: serverTimestamp()
        });

        // User main wallet history
        const userHistRef = doc(collection(db, 'wallet_history'));
        transaction.set(userHistRef, {
          userId: targetUserId,
          type: 'credit',
          amount: currentBalance,
          balanceAfter: (userSnap.exists() ? (Number(userSnap.data().tokens) || 0) : 0) + currentBalance,
          description: `League Host Wallet Payout (${lName})`,
          createdAt: new Date().toISOString(),
          timestamp: serverTimestamp()
        });

        // User personal token transactions
        const userTxRef = doc(collection(db, 'users', targetUserId, 'tokenTransactions'));
        transaction.set(userTxRef, {
          type: 'transfer',
          amount: currentBalance,
          balanceAfter: (userSnap.exists() ? (Number(userSnap.data().tokens) || 0) : 0) + currentBalance,
          leagueId: league.id,
          leagueName: lName,
          description: `League Host Wallet Payout (${lName})`,
          reason: `Transferred from Host League Wallet (${lName})`,
          createdAt: serverTimestamp()
        });
      });
      
      if (setTokens) {
        setTokens((prev) => prev + availableBalance);
      }
      setShowWalletModalLeague(prev => prev ? { ...prev, walletBalance: 0 } : null);
      setHostLeagues(prev => prev.map(l => l.id === league.id ? { ...l, walletBalance: 0 } : l));
      
      // Refresh history
      try {
        const histSnap = await getDocs(query(collection(db, 'pro_host_wallet_history'), where('leagueId', '==', league.id)));
        const hist = histSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        setWalletHistory(hist);
      } catch (e) {
        console.error("Error refreshing wallet history:", e);
      }
    } catch (err: any) {
      console.error("Transfer error:", err);
      alert("Failed to transfer tokens: " + (err.message || String(err)));
    } finally {
      setTransferring(null);
    }
  };

  const handleTransferFromTourneyWallet = async (tourney: any) => {
    const calculatedEntryFees = tourney.mode === 'squad'
      ? ((tourney.joinedSquads?.length || 0) * (Number(tourney.entryFee) || 0))
      : ((tourney.joinedPlayers?.length || tourney.joinedCount || 0) * (Number(tourney.entryFee) || 0));
    const availableBalance = tourney.walletBalance !== undefined 
      ? Number(tourney.walletBalance) 
      : ((Number(tourney.walletTokens) || 0) + calculatedEntryFees);

    if (availableBalance <= 0) return;
    const isUnlocked = tourney.walletStatus === 'unlocked' || tourney.walletStatus === 'active' || tourney.walletStatus === 'approved';
    if (!isUnlocked) {
      alert("This Tournament Wallet is currently LOCKED. Please contact System Admin for approval.");
      return;
    }

    setTransferring(tourney.id);
    try {
      const targetUserId = tourney.hostId || userProfile?.userId;
      if (!targetUserId) throw new Error("Host user ID not found");

      await runTransaction(db, async (transaction) => {
        const tourneyRef = doc(db, 'tournaments_freefire', tourney.id);
        const userRef = doc(db, 'users', targetUserId);
        
        const tourneySnap = await transaction.get(tourneyRef);
        const userSnap = await transaction.get(userRef);
        
        if (!tourneySnap.exists()) throw new Error("Tournament document not found");
        
        const currentData = tourneySnap.data();
        const curBal = currentData.walletBalance !== undefined 
          ? Number(currentData.walletBalance) 
          : ((Number(currentData.walletTokens) || 0) + (
              currentData.mode === 'squad' 
                ? ((currentData.joinedSquads?.length || 0) * (Number(currentData.entryFee) || 0))
                : ((currentData.joinedPlayers?.length || currentData.joinedCount || 0) * (Number(currentData.entryFee) || 0))
            ));

        if (curBal <= 0) throw new Error("Insufficient balance in tournament wallet");
        
        transaction.update(tourneyRef, { 
          walletBalance: 0,
          walletStatus: 'unlocked',
          transferredToMainAt: new Date().toISOString(),
          updatedAt: serverTimestamp()
        });
        
        if (userSnap.exists()) {
          transaction.update(userRef, { 
            tokens: (Number(userSnap.data().tokens) || 0) + curBal,
            updatedAt: new Date().toISOString()
          });
        } else {
          transaction.set(userRef, {
            userId: targetUserId,
            email: userProfile?.email || tourney.hostEmail || '',
            displayName: userProfile?.displayName || tourney.hostName || 'Host',
            tokens: curBal,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }

        // Host history log
        const hostHistRef = doc(collection(db, 'pro_host_wallet_history'));
        transaction.set(hostHistRef, {
          tournamentId: tourney.id,
          tournamentNumber: tourney.tournamentNumber || tourney.id,
          hostId: targetUserId,
          type: 'transfer_to_main_wallet',
          amount: curBal,
          balanceAfter: 0,
          description: `Transferred to Host Main Account from Tournament #${tourney.tournamentNumber || tourney.id}`,
          createdAt: serverTimestamp()
        });

        // User main wallet history
        const userHistRef = doc(collection(db, 'wallet_history'));
        transaction.set(userHistRef, {
          userId: targetUserId,
          type: 'credit',
          amount: curBal,
          balanceAfter: (userSnap.exists() ? (Number(userSnap.data().tokens) || 0) : 0) + curBal,
          description: `Tournament Payout - TRN #${tourney.tournamentNumber || tourney.id} (${tourney.title})`,
          createdAt: new Date().toISOString(),
          timestamp: serverTimestamp()
        });

        // User personal token transactions
        const userTxRef = doc(collection(db, 'users', targetUserId, 'tokenTransactions'));
        transaction.set(userTxRef, {
          type: 'transfer',
          amount: curBal,
          balanceAfter: (userSnap.exists() ? (Number(userSnap.data().tokens) || 0) : 0) + curBal,
          tournamentId: tourney.id,
          tournamentNumber: tourney.tournamentNumber || tourney.id,
          tournamentTitle: tourney.title,
          description: `Tournament Payout - TRN #${tourney.tournamentNumber || tourney.id} (${tourney.title})`,
          reason: `Transferred from Host Tournament Wallet - TRN #${tourney.tournamentNumber || tourney.id}`,
          createdAt: serverTimestamp()
        });
      });
      
      if (setTokens) {
        setTokens((prev) => prev + availableBalance);
      }
      setShowWalletModalTourney(prev => prev ? { ...prev, walletBalance: 0 } : null);
      setHostTournaments(prev => prev.map(t => t.id === tourney.id ? { ...t, walletBalance: 0 } : t));

      // Refresh history
      try {
        const histSnap = await getDocs(query(collection(db, 'pro_host_wallet_history'), where('tournamentId', '==', tourney.id)));
        const hist = histSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a: any, b: any) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : 0;
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : 0;
          return timeB - timeA;
        });
        setWalletHistory(hist);
      } catch (e) {
        console.error("Error refreshing wallet history:", e);
      }
    } catch (err: any) {
      console.error("Transfer error:", err);
      alert("Failed to transfer tokens: " + (err.message || String(err)));
    } finally {
      setTransferring(null);
    }
  };

  const hostId = userProfile?.userId || 'guest_host';

  // Host Brand States
  const [brandName, setBrandName] = useState('');
  const [brandLogoUrl, setBrandLogoUrl] = useState('');
  const [brandCoverUrl, setBrandCoverUrl] = useState('');
  const [facebookUrl, setFacebookUrl] = useState('');
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [themeIndex, setThemeIndex] = useState<number>(0);
  const [tempBrandName, setTempBrandName] = useState('');
  const [savingBrandName, setSavingBrandName] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [hostNameCheckStatus, setHostNameCheckStatus] = useState<'idle' | 'checking' | 'available' | 'taken'>('idle');

  // Pending Leagues Review states
  const [showPendingLeagueModal, setShowPendingLeagueModal] = useState(false);
  const [pendingLeagues, setPendingLeagues] = useState<ProHostedLeague[]>([]);
  const [loadingPendingLeagues, setLoadingPendingLeagues] = useState(false);
  const [uploadingCertId, setUploadingCertId] = useState<string | null>(null);

  // Pending Tournaments Review states
  const [showPendingTournamentModal, setShowPendingTournamentModal] = useState(false);
  const [pendingTournaments, setPendingTournaments] = useState<any[]>([]);
  const [loadingPendingTournaments, setLoadingPendingTournaments] = useState(false);

  // Host Approved / Ongoing / Completed Leagues states
  const [hostLeagues, setHostLeagues] = useState<ProHostedLeague[]>([]);
  const [hostTournaments, setHostTournaments] = useState<any[]>([]);
  const [hostLoneWolfMatches, setHostLoneWolfMatches] = useState<any[]>([]);
  const [activeHostViewTab, setActiveHostViewTab] = useState<'leagues' | 'tournaments' | 'lone_wolf'>('leagues');

  // Pending Lone Wolf Review states
  const [showPendingLoneWolfModal, setShowPendingLoneWolfModal] = useState(false);
  const [pendingLoneWolfTab, setPendingLoneWolfTab] = useState<'all' | 'pending' | 'rejected'>('all');

  // Computed Pending & Rejected Lone Wolf matches
  const pendingAndRejectedLoneWolf = hostLoneWolfMatches.filter((m: any) => {
    const isPending = m.approvalStatus === 'pending' || (m.isApproved === false && m.approvalStatus !== 'rejected');
    const isRejected = m.approvalStatus === 'rejected';
    return isPending || isRejected;
  });

  const pendingOnlyLoneWolf = pendingAndRejectedLoneWolf.filter((m: any) => 
    m.approvalStatus === 'pending' || (m.isApproved === false && m.approvalStatus !== 'rejected')
  );

  const rejectedOnlyLoneWolf = pendingAndRejectedLoneWolf.filter((m: any) => 
    m.approvalStatus === 'rejected'
  );

  // Real-time listener for host's Lone Wolf matches
  useEffect(() => {
    if (!hostId || hostId === 'guest_host') return;
    const q = query(collection(db, 'lone_wolf_matches'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const filtered = list.filter((m: any) => 
        m.hostId === hostId || 
        (m.hostEmail && userProfile?.email && m.hostEmail.toLowerCase() === userProfile.email.toLowerCase())
      );
      setHostLoneWolfMatches(filtered);
    }, (err) => {
      console.warn("Host Lone Wolf matches listener warning:", err);
    });
    return () => unsub();
  }, [hostId, userProfile?.email]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [deletingLeagueId, setDeletingLeagueId] = useState<string | null>(null);
  const [deletingTournamentId, setDeletingTournamentId] = useState<string | null>(null);
  const [confirmingOngoingTourneyId, setConfirmingOngoingTourneyId] = useState<string | null>(null);
  const [confirmingOngoingTourney, setConfirmingOngoingTourney] = useState<any | null>(null);

  // Set Room ID & Password states for Host Panel
  const [roomDetailsTournament, setRoomDetailsTournament] = useState<any | null>(null);
  const [hostRoomId, setHostRoomId] = useState('');
  const [hostRoomPass, setHostRoomPass] = useState('');
  const [hostYoutubeLink, setHostYoutubeLink] = useState('');
  const [hostRoomError, setHostRoomError] = useState<string | null>(null);
  const [isSavingHostRoom, setIsSavingHostRoom] = useState(false);

  // Set Result Modal States for Host Panel
  const [resultSetTournament, setResultSetTournament] = useState<any | null>(null);
  const [resultSetData, setResultSetData] = useState<Array<{ id: string; name: string; gameName: string; avatar: string; kills: number; damage: number }>>([]);
  const [resultSetSquads, setResultSetSquads] = useState<Array<{ id: string; name: string; logo: string; leaderName: string; kills: number; damage: number; antiCheat?: string; members: any[] }>>([]);
  const [booyahSelection, setBooyahSelection] = useState<string>('');
  const [runnerUpSelection, setRunnerUpSelection] = useState<string>('');
  const [isSavingResult, setIsSavingResult] = useState(false);
  const [resultScreenshot, setResultScreenshot] = useState<File | null>(null);
  const [resultScreenshotPreview, setResultScreenshotPreview] = useState<string | null>(null);
  const [isReviewingResults, setIsReviewingResults] = useState(false);
  const [isCompressingImage, setIsCompressingImage] = useState(false);

  useEffect(() => {
    if (roomDetailsTournament) {
      setHostRoomId(roomDetailsTournament.roomId || '');
      setHostRoomPass(roomDetailsTournament.roomPass || roomDetailsTournament.roomPassword || '');
      setHostYoutubeLink(roomDetailsTournament.youtubeLiveUrl || roomDetailsTournament.youtubeLiveLink || roomDetailsTournament.youtubeUrl || '');
      setHostRoomError(null);
    }
  }, [roomDetailsTournament]);

  useEffect(() => {
    if (!resultSetTournament) {
      setResultSetData([]);
      setResultSetSquads([]);
      setBooyahSelection('');
      setRunnerUpSelection('');
      return;
    }

    const fetchLatestGameNames = async (initialData: any[]) => {
      try {
        const enrichedData = [...initialData];
        const userIds = initialData.map(p => p.id).filter(id => id && id.length > 5);
        
        if (userIds.length === 0) return;

        const chunks = [];
        for (let i = 0; i < userIds.length; i += 30) {
          chunks.push(userIds.slice(i, i + 30));
        }

        for (const chunk of chunks) {
          const q = query(collection(db, 'users'), where('userId', 'in', chunk));
          const querySnapshot = await getDocs(q);
          querySnapshot.forEach((docSnap) => {
            const profile = docSnap.data();
            const index = enrichedData.findIndex(p => p.id === profile.userId);
            if (index !== -1 && profile.gameName) {
              enrichedData[index].gameName = profile.gameName;
            }
          });
        }
        setResultSetData(enrichedData);
      } catch (err) {
        console.error("Error enriching results data:", err);
      }
    };

    if (resultSetTournament.mode === 'solo') {
      const players = resultSetTournament.joinedPlayers || [];
      const existingData = resultSetTournament.tempResultData || resultSetTournament.finalResultData || [];
      
      const formatted = players.map((p: any) => {
        const userId = p.userId || p.uid || p.id || p.email;
        const prevData = existingData.find((ed: any) => (ed.id || ed.userId) === userId);
        
        return {
          id: userId || Math.random().toString(),
          name: p.displayName || p.name || 'Player',
          gameName: p.gameName || p.ingameName || p.name || p.displayName || 'Player',
          avatar: p.avatarUrl || p.photoURL || p.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150',
          kills: prevData ? Number(prevData.kills) : (Number(p.kills) || 0),
          damage: prevData ? Number(prevData.damage) : (Number(p.damage) || 0),
        };
      });
      setResultSetData(formatted);
      fetchLatestGameNames(formatted);
      
      setBooyahSelection(resultSetTournament.booyahWinner || (formatted.length > 0 ? formatted[0].id : ''));
      setRunnerUpSelection(resultSetTournament.runnerUp || (formatted.length > 1 ? formatted[1].id : ''));
    } else {
      const squads = resultSetTournament.joinedSquads || [];
      const existingData = resultSetTournament.tempResultSquads || resultSetTournament.finalResultSquads || resultSetTournament.tempResultData || [];
      
      const formatted = squads.map((sqd: any) => {
        const squadId = sqd.id || sqd.squadId;
        const prevData = existingData.find((ed: any) => (ed.id || ed.squadId || ed.userId) === squadId);
        const prevMembers = prevData?.members || [];
        
        const rawMembers = sqd.members || [];
        const members = rawMembers.map((m: any, mIdx: number) => {
          const mKey = m.userId || m.id || m.gameName || m.ingameName || m.name || `m_${mIdx}`;
          const prevM = prevMembers.find((pm: any) => (pm.userId || pm.id || pm.gameName || pm.ingameName || pm.name) === mKey);
          return {
            ...m,
            gameName: m.gameName || m.ingameName || m.name || 'Member',
            avatar: m.avatarUrl || m.photoURL || m.avatar || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150',
            kills: prevM ? (Number(prevM.kills) || 0) : (Number(m.kills) || 0),
            damage: prevM ? (Number(prevM.damage) || 0) : (Number(m.damage) || 0)
          };
        });

        const calcKills = members.length > 0 
          ? members.reduce((sum: number, m: any) => sum + (Number(m.kills) || 0), 0)
          : (prevData ? Number(prevData.kills) : (Number(sqd.kills) || 0));

        const calcDamage = members.length > 0 
          ? members.reduce((sum: number, m: any) => sum + (Number(m.damage) || 0), 0)
          : (prevData ? Number(prevData.damage) : (Number(sqd.damage) || 0));

        return {
          id: squadId || sqd.name || Math.random().toString(),
          name: sqd.name || sqd.squadName || 'Squad',
          logo: sqd.logoUrl || sqd.logo || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150',
          leaderName: sqd.leaderName || 'Leader',
          kills: calcKills,
          damage: calcDamage,
          antiCheat: prevData?.antiCheat || '',
          members: members
        };
      });
      setResultSetSquads(formatted);
      setBooyahSelection(resultSetTournament.booyahWinner || (formatted.length > 0 ? formatted[0].name : ''));
      setRunnerUpSelection(resultSetTournament.runnerUp || (formatted.length > 1 ? formatted[1].name : ''));
    }
  }, [resultSetTournament]);

  // Real-time listener for host inbox messages
  useEffect(() => {
    if (!hostId || hostId === 'guest_host') return;

    const q = query(collection(db, 'admin_messages'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snap) => {
      const allMsgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      const myLeagueIds = new Set([
        ...hostLeagues.map(l => l.id),
        ...pendingLeagues.map(l => l.id)
      ]);

      const filtered = allMsgs.filter((msg: any) => {
        if (msg.senderId === hostId) return true;
        if (msg.sourceContext?.hostId === hostId) return true;
        if (msg.sourceContext?.leagueId && myLeagueIds.has(msg.sourceContext.leagueId)) return true;
        if (msg.type === 'match_issue' || msg.type === 'match_support' || msg.type === 'suspension_appeal') {
          if (msg.sourceContext?.leagueId && myLeagueIds.has(msg.sourceContext.leagueId)) return true;
          if (msg.senderId === hostId || msg.sourceContext?.hostId === hostId) return true;
        }
        return false;
      });

      setHostInboxMessages(filtered);
    }, (err) => {
      console.warn("Host inbox snapshot listener warning:", err);
    });

    return () => unsub();
  }, [hostId, hostLeagues, pendingLeagues]);

  const unreadHostCount = hostInboxMessages.filter((msg: any) => msg.senderId !== hostId && msg.status === 'unread').length;

  const handleVisitSourceContent = async (msg: any) => {
    if (msg.status === 'unread' && msg.id) {
      try {
        await updateDoc(doc(db, 'admin_messages', msg.id), { status: 'read' });
      } catch (err) {
        console.error("Error marking message read:", err);
      }
    }

    const sourceCtx = msg.sourceContext;
    if (sourceCtx?.leagueId) {
      const targetLeagueId = sourceCtx.leagueId;
      let targetLeague = hostLeagues.find(l => l.id === targetLeagueId) || pendingLeagues.find(l => l.id === targetLeagueId);

      if (!targetLeague) {
        try {
          const snap = await getDoc(doc(db, 'pro_hosted_leagues', targetLeagueId));
          if (snap.exists()) {
            targetLeague = { id: snap.id, ...snap.data() } as ProHostedLeague;
          }
        } catch (e) {
          console.error("Error fetching source league doc:", e);
        }
      }

      if (targetLeague) {
        if (setHostNavigationContext) {
          setHostNavigationContext({
            type: 'match_card',
            leagueId: targetLeagueId,
            matchId: sourceCtx.matchId
          });
        }
        setActiveScheduleLeague(targetLeague);
        setShowHostInboxModal(false);
        return;
      }
    }

    alert("Source league content was not found or is no longer available.");
  };

  const handleSendHostReply = async (msg: any) => {
    const text = replyInputMap[msg.id]?.trim();
    if (!text) return;

    setIsReplyingMap(prev => ({ ...prev, [msg.id]: true }));
    try {
      const msgRef = doc(db, 'admin_messages', msg.id);
      const newReply = {
        senderId: hostId,
        senderName: brandName || userProfile?.displayName || 'Host',
        message: text,
        createdAt: new Date().toISOString(),
        isHost: true
      };

      const updatedReplies = [...(msg.replies || []), newReply];
      await updateDoc(msgRef, {
        message: text,
        replies: updatedReplies,
        status: 'replied',
        updatedAt: serverTimestamp()
      });

      if (msg.sourceContext?.type === 'match_card' && msg.sourceContext?.leagueId && msg.sourceContext?.matchId) {
        const { leagueId, matchId } = msg.sourceContext;
        const chatDocKey = `${leagueId}_${matchId}`;
        const chatRef = collection(db, 'league_match_chats', chatDocKey, 'messages');
        await addDoc(chatRef, {
          text: text,
          senderId: hostId,
          senderName: brandName || userProfile?.displayName || 'Host',
          senderPhoto: userProfile?.photoURL || null,
          senderRole: 'host',
          createdAt: serverTimestamp(),
        });
      }

      setReplyInputMap(prev => ({ ...prev, [msg.id]: '' }));
    } catch (err: any) {
      console.error("Error sending reply:", err);
      alert("Failed to send reply: " + err.message);
    } finally {
      setIsReplyingMap(prev => ({ ...prev, [msg.id]: false }));
    }
  };

  const handleSendDirectToAdmin = async () => {
    if (!directMsgText.trim()) return;
    setIsSendingDirect(true);
    try {
      await addDoc(collection(db, 'admin_messages'), {
        senderId: hostId,
        senderName: brandName || userProfile?.displayName || 'Host',
        senderEmail: userProfile?.email || '',
        senderPhoto: userProfile?.photoURL || null,
        type: 'host_notice',
        message: directMsgText.trim(),
        status: 'unread',
        replies: [],
        sourceContext: {
          type: 'host_panel',
          hostId: hostId
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      setDirectMsgText('');
      alert("Your message has been sent to the Admin team!");
    } catch (err: any) {
      console.error("Error sending direct message:", err);
      alert("Failed to send message: " + err.message);
    } finally {
      setIsSendingDirect(false);
    }
  };

  // Debounced check for unique host brand name
  useEffect(() => {
    let isMounted = true;
    const trimmedName = tempBrandName.trim();
    if (!trimmedName) {
      setHostNameCheckStatus('idle');
      return;
    }

    setHostNameCheckStatus('checking');

    const timer = setTimeout(async () => {
      try {
        const brandsSnap = await getDocs(collection(db, 'host_brands'));
        if (!isMounted) return;

        const isTaken = brandsSnap.docs.some(doc => {
          const bData = doc.data();
          const isOwnHost = doc.id === hostId;
          if (isOwnHost) return false;
          return bData.brandName && bData.brandName.trim().toLowerCase() === trimmedName.toLowerCase();
        });

        if (isMounted) {
          setHostNameCheckStatus(isTaken ? 'taken' : 'available');
        }
      } catch (err) {
        console.error("Error checking host name uniqueness:", err);
        if (isMounted) {
          setHostNameCheckStatus('idle');
        }
      }
    }, 400);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [tempBrandName, hostId]);

  // Host Wallet states
  const [hostWallet, setHostWallet] = useState<{ balance: number; isLocked: boolean }>({ balance: 0, isLocked: false });
  const [showHostWalletModal, setShowHostWalletModal] = useState(false);
  const [walletTransferAmount, setWalletTransferAmount] = useState('');
  const [walletError, setWalletError] = useState('');
  const [walletSuccess, setWalletSuccess] = useState('');
  const [isTransferringWallet, setIsTransferringWallet] = useState(false);

  // Subscription details modal states
  const [showSubscriptionModal, setShowSubscriptionModal] = useState(false);
  const [subscriptionList, setSubscriptionList] = useState<any[]>([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(false);

  const currentTheme = BRAND_THEMES[themeIndex % BRAND_THEMES.length];

  // Fetch Pending Leagues for Host (standalone helper)
  const fetchPendingLeagues = async () => {
    if (!hostId || hostId === 'guest_host') return;
    setLoadingPendingLeagues(true);
    try {
      const q = query(collection(db, 'pro_hosted_leagues'), where('hostId', '==', hostId));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProHostedLeague));
      
      const enrichedList = list.map(l => {
        let status = l.status;
        if (status === 'approved') {
          checkAndCancelUnderfundedLeague(l).catch(e => console.error('Auto cancel check error:', e));

          if (hasOpeningMatchStarted(l.openingMatchDate, l.openingMatchTime)) {
            const walletBal = Number(l.walletBalance) || 0;
            const targetPrize = Number(l.prizePool) || 0;
            if (walletBal >= targetPrize) {
              status = 'ongoing';
              const leagueRef = doc(db, 'pro_hosted_leagues', l.id);
              updateDoc(leagueRef, {
                status: 'ongoing',
                updatedAt: new Date().toISOString()
              }).catch(err => console.error('Error auto-updating host league status to ongoing:', err));
            }
          }
        }
        return {
          ...l,
          status,
          hostUpazila: l.hostUpazila || userProfile?.upazila || '',
          hostDistrict: l.hostDistrict || userProfile?.district || '',
          hostDivision: l.hostDivision || userProfile?.division || '',
        };
      });
      setPendingLeagues(enrichedList.filter(l => l.status === 'pending' || l.status === 'rejected'));
      setHostLeagues(enrichedList.filter(l => l.status === 'approved' || l.status === 'ongoing' || l.status === 'completed' || l.status === 'cancelled'));
    } catch (err) {
      console.error('Error fetching pending leagues:', err);
    } finally {
      setLoadingPendingLeagues(false);
    }
  };

  // Fetch Pending Tournaments for Host (standalone helper)
  const fetchPendingTournaments = async () => {
    if (!hostId || hostId === 'guest_host') return;
    setLoadingPendingTournaments(true);
    try {
      const q = query(collection(db, 'tournaments_freefire'), where('hostId', '==', hostId));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0).getTime() - new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0).getTime());
      
      setPendingTournaments(list.filter((t: any) => t.status === 'Pending' || t.status === 'Rejected'));
      setHostTournaments(list.filter((t: any) => t.status !== 'Pending' && t.status !== 'Rejected'));
    } catch (err) {
      console.error('Error fetching pending tournaments:', err);
    } finally {
      setLoadingPendingTournaments(false);
    }
  };

  const fetchSubscriptionDetails = async () => {
    if (!hostId || hostId === 'guest_host') return;
    setLoadingSubscriptions(true);
    try {
      const q = query(collection(db, 'pro_host_subscriptions'), where('userId', '==', hostId));
      const snap = await getDocs(q);
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      list.sort((a: any, b: any) => new Date(b.subscribedAt || 0).getTime() - new Date(a.subscribedAt || 0).getTime());
      setSubscriptionList(list);
    } catch (err) {
      console.error('Error fetching subscription details:', err);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  // Initial load effect for all Host Panel details
  useEffect(() => {
    if (!hostId || hostId === 'guest_host') {
      setInitialLoading(false);
      return;
    }

    let isMounted = true;
    setInitialLoading(true);

    const loadAllDetails = async () => {
      try {
        await Promise.allSettled([
          // 1. Host Wallet
          (async () => {
            try {
              const walletRef = doc(db, 'host_wallets', hostId);
              const snap = await getDoc(walletRef);
              if (snap.exists()) {
                const data = snap.data();
                if (isMounted) {
                  setHostWallet({
                    balance: Number(data.balance) || 0,
                    isLocked: !!data.isLocked
                  });
                }
              } else {
                await setDoc(walletRef, {
                  hostId,
                  balance: 0,
                  isLocked: false,
                  createdAt: new Date().toISOString()
                });
                if (isMounted) setHostWallet({ balance: 0, isLocked: false });
              }
            } catch (err) {
              console.error('Error fetching host wallet:', err);
            }
          })(),

          // 2. Pending & Host Leagues
          (async () => {
            try {
              const q = query(collection(db, 'pro_hosted_leagues'), where('hostId', '==', hostId));
              const snap = await getDocs(q);
              const list = snap.docs.map(d => ({ id: d.id, ...d.data() } as ProHostedLeague));
              const enrichedList = list.map(l => {
                let status = l.status;
                if (status === 'approved') {
                  checkAndCancelUnderfundedLeague(l).catch(e => console.error('Auto cancel check error:', e));

                  if (hasOpeningMatchStarted(l.openingMatchDate, l.openingMatchTime)) {
                    const walletBal = Number(l.walletBalance) || 0;
                    const targetPrize = Number(l.prizePool) || 0;
                    if (walletBal >= targetPrize) {
                      status = 'ongoing';
                      const leagueRef = doc(db, 'pro_hosted_leagues', l.id);
                      updateDoc(leagueRef, {
                        status: 'ongoing',
                        updatedAt: new Date().toISOString()
                      }).catch(err => console.error('Error auto-updating host league status to ongoing:', err));
                    }
                  }
                }
                return {
                  ...l,
                  status,
                  hostUpazila: l.hostUpazila || userProfile?.upazila || '',
                  hostDistrict: l.hostDistrict || userProfile?.district || '',
                  hostDivision: l.hostDivision || userProfile?.division || '',
                };
              });
              if (isMounted) {
                setPendingLeagues(enrichedList.filter(l => l.status === 'pending' || l.status === 'rejected'));
                setHostLeagues(enrichedList.filter(l => l.status === 'approved' || l.status === 'ongoing' || l.status === 'completed' || l.status === 'cancelled'));
              }
            } catch (err) {
              console.error('Error fetching leagues:', err);
            }
          })(),

          // 3. Subscription Details
          (async () => {
            try {
              const q = query(collection(db, 'pro_host_subscriptions'), where('userId', '==', hostId));
              const snap = await getDocs(q);
              const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
              list.sort((a: any, b: any) => new Date(b.subscribedAt || 0).getTime() - new Date(a.subscribedAt || 0).getTime());
              if (isMounted) {
                setSubscriptionList(list);
              }
            } catch (err) {
              console.error('Error fetching subscriptions:', err);
            }
          })(),

          // 4. Host Brand
          (async () => {
            try {
              const brandRef = doc(db, 'host_brands', hostId);
              const snap = await getDoc(brandRef);
              if (snap.exists()) {
                const data = snap.data();
                if (data.brandName && isMounted) {
                  setBrandName(data.brandName);
                  setTempBrandName(data.brandName);
                } else if (userProfile?.displayName && isMounted) {
                  setTempBrandName(userProfile.displayName);
                }
                if (data.brandLogoUrl && isMounted) setBrandLogoUrl(data.brandLogoUrl);
                if (data.brandCoverUrl && isMounted) setBrandCoverUrl(data.brandCoverUrl);
                if (data.facebookUrl && isMounted) setFacebookUrl(data.facebookUrl);
                if (data.youtubeUrl && isMounted) setYoutubeUrl(data.youtubeUrl);
                if (data.tiktokUrl && isMounted) setTiktokUrl(data.tiktokUrl);
                if (typeof data.themeIndex === 'number' && isMounted) {
                  setThemeIndex(data.themeIndex % BRAND_THEMES.length);
                } else if (isMounted) {
                  setThemeIndex(getHostThemeIndex(hostId));
                }
              } else if (isMounted) {
                setThemeIndex(getHostThemeIndex(hostId));
                if (userProfile?.displayName) {
                  setTempBrandName(userProfile.displayName);
                }
              }
            } catch (err) {
              console.error('Error fetching host brand:', err);
            }
          })(),

          // 5. Host Tournaments
          (async () => {
            try {
              const q = query(collection(db, 'tournaments_freefire'), where('hostId', '==', hostId));
              const snap = await getDocs(q);
              const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
              list.sort((a: any, b: any) => new Date(b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0).getTime() - new Date(a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0).getTime());
              if (isMounted) {
                setPendingTournaments(list.filter((t: any) => t.status === 'Pending' || t.status === 'Rejected'));
                setHostTournaments(list.filter((t: any) => t.status !== 'Pending' && t.status !== 'Rejected'));
              }
            } catch (err) {
              console.error('Error fetching host tournaments:', err);
            }
          })()
        ]);
      } finally {
        if (isMounted) {
          setInitialLoading(false);
        }
      }
    };

    loadAllDetails();

    return () => {
      isMounted = false;
    };
  }, [hostId, userProfile?.displayName]);

  const activeSub = userProfile?.proHostSubscription || (subscriptionList.length > 0 ? subscriptionList[0] : null);
  const isSubActive = activeSub?.expiresAt ? new Date(activeSub.expiresAt) > new Date() : false;

  const sortedHostLeagues = [...hostLeagues]
    .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());

  const sortedHostTournaments = [...hostTournaments];

  const handleDeleteTournament = async (tournamentId: string) => {
    try {
      await deleteDoc(doc(db, 'tournaments_freefire', tournamentId));
      setHostTournaments(prev => prev.filter(t => t.id !== tournamentId));
      setPendingTournaments(prev => prev.filter(t => t.id !== tournamentId));
    } catch (err: any) {
      console.error("Error deleting tournament:", err);
      alert("Failed to delete tournament: " + err.message);
    }
  };

  const handleSetTournamentStatus = async (tournamentId: string, newStatus: string) => {
    try {
      await updateDoc(doc(db, 'tournaments_freefire', tournamentId), {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });
      setHostTournaments(prev => prev.map(t => t.id === tournamentId ? { ...t, status: newStatus } : t));
      alert(`Tournament status updated to ${newStatus}!`);
    } catch (err: any) {
      console.error("Error updating tournament status:", err);
      alert("Failed to update status: " + err.message);
    }
  };

  const handleScreenshotSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsCompressingImage(true);
    try {
      const { compressImageToDataUrl } = await import('../lib/imgbb');
      const compressed = await compressImageToDataUrl(file, 1280, 0.7, 125); // Target 125KB
      
      setResultScreenshotPreview(compressed.dataUrl);
      
      const arr = compressed.dataUrl.split(',');
      const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      const newFile = new File([u8arr], "result_screenshot.jpg", { type: mime });
      setResultScreenshot(newFile);
    } catch (err) {
      console.error("Compression error:", err);
      alert("Failed to process image. Please try again.");
    } finally {
      setIsCompressingImage(false);
    }
  };

  const handleSaveTournamentResult = async () => {
    if (!resultScreenshot) {
      alert("Please upload a match result screenshot first. It is mandatory.");
      return;
    }
    setIsReviewingResults(true);
  };

  const handleFinalConfirmAndSubmit = async () => {
    if (!resultSetTournament || !resultScreenshot) return;
    setIsSavingResult(true);
    try {
      const { uploadScreenshotToImgBB } = await import('../lib/imgbb');
      const screenshotUrl = await uploadScreenshotToImgBB(resultScreenshot, 'tournament_result');

      const tourneyRef = doc(db, 'tournaments_freefire', resultSetTournament.id);
      const isSolo = resultSetTournament.mode === 'solo';

      const updatePayload: any = {
        booyahWinner: booyahSelection,
        runnerUp: runnerUpSelection,
        resultScreenshotUrl: screenshotUrl,
        resultSubmittedAt: new Date().toISOString(),
        status: 'ResultUnderReview',
        updatedAt: serverTimestamp()
      };

      if (isSolo) {
        updatePayload.tempResultData = resultSetData.map(p => ({
          userId: p.id,
          gameName: p.gameName,
          displayName: p.name,
          kills: p.kills,
          damage: p.damage,
          avatar: p.avatar
        }));
      } else {
        updatePayload.tempResultSquads = resultSetSquads.map(sqd => ({
          id: sqd.id,
          name: sqd.name,
          kills: sqd.kills,
          damage: sqd.damage,
          logo: sqd.logo,
          leaderName: sqd.leaderName,
          members: sqd.members
        }));
      }

      await updateDoc(tourneyRef, updatePayload);

      setHostTournaments(prev => prev.map(t => t.id === resultSetTournament.id ? {
        ...t,
        ...updatePayload
      } : t));

      setResultSetTournament(null);
      setIsReviewingResults(false);
      setResultScreenshot(null);
      setResultScreenshotPreview(null);
      alert("Results submitted successfully! Admin will review and verify shortly.");
    } catch (err: any) {
      console.error("Error submitting tournament result:", err);
      alert("Error submitting result: " + err.message);
    } finally {
      setIsSavingResult(false);
    }
  };

  const handleSaveHostRoomDetails = async () => {
    if (!roomDetailsTournament) return;
    setHostRoomError(null);

    const hasRoomDetails = hostRoomId.trim() !== '' || hostRoomPass.trim() !== '';
    const hasYoutubeLink = hostYoutubeLink.trim() !== '';

    if (hasRoomDetails && !hasYoutubeLink) {
      setHostRoomError("YouTube Live Link is required when setting Room ID or Password!");
      return;
    }

    if (hasYoutubeLink) {
      const ytPattern = /^(https?:\/\/)?(www\.|m\.)?(youtube\.com|youtu\.be)\/.+$/i;
      if (!ytPattern.test(hostYoutubeLink.trim())) {
        setHostRoomError("Please enter a valid YouTube Live Stream URL!");
        return;
      }
    }

    setIsSavingHostRoom(true);
    try {
      const tourneyRef = doc(db, 'tournaments_freefire', roomDetailsTournament.id);
      await updateDoc(tourneyRef, {
        roomId: hostRoomId.trim(),
        roomPass: hostRoomPass.trim(),
        roomPassword: hostRoomPass.trim(),
        youtubeLiveUrl: hostYoutubeLink.trim(),
        youtubeLiveLink: hostYoutubeLink.trim(),
        youtubeUrl: hostYoutubeLink.trim(),
        roomProvidedAt: new Date().toISOString()
      });

      // Update local state instantly
      setHostTournaments(prev => prev.map(t => t.id === roomDetailsTournament.id ? {
        ...t,
        roomId: hostRoomId.trim(),
        roomPass: hostRoomPass.trim(),
        roomPassword: hostRoomPass.trim(),
        youtubeLiveUrl: hostYoutubeLink.trim(),
        youtubeLiveLink: hostYoutubeLink.trim(),
        youtubeUrl: hostYoutubeLink.trim()
      } : t));

      setRoomDetailsTournament(null);
      alert("Room credentials and YouTube Live Link successfully saved!");
    } catch (err: any) {
      console.error("Error saving room details from host panel:", err);
      setHostRoomError("Error: " + err.message);
    } finally {
      setIsSavingHostRoom(false);
    }
  };

  const handleHostAntiDopingCertUpload = async (leagueId: string, file: File) => {
    setUploadingCertId(leagueId);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const dataUrl = reader.result as string;
        const leagueRef = doc(db, 'pro_hosted_leagues', leagueId);
        await updateDoc(leagueRef, {
          antiDopingCertificateUrl: dataUrl,
          antiDopingStatus: 'submitted',
          antiDopingNote: 'Updated by Host for Administrator review',
          updatedAt: new Date().toISOString()
        });
        setPendingLeagues(prev => prev.map(l => l.id === leagueId ? {
          ...l,
          antiDopingCertificateUrl: dataUrl,
          antiDopingStatus: 'submitted',
          antiDopingNote: 'Updated by Host for Administrator review'
        } : l));
        alert('Anti-Doping Certificate submitted successfully for Administrator review!');
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error(err);
      alert('Failed to upload certificate: ' + err.message);
    } finally {
      setUploadingCertId(null);
    }
  };

  // Fetch Host Brand from Firestore
  useEffect(() => {
    const fetchBrand = async () => {
      try {
        const brandRef = doc(db, 'host_brands', hostId);
        const snap = await getDoc(brandRef);
        if (snap.exists()) {
          const data = snap.data();
          if (data.brandName) {
            setBrandName(data.brandName);
            setTempBrandName(data.brandName);
          } else if (userProfile?.displayName) {
            setTempBrandName(userProfile.displayName);
          }
          if (data.brandLogoUrl) setBrandLogoUrl(data.brandLogoUrl);
          if (data.brandCoverUrl) setBrandCoverUrl(data.brandCoverUrl);
          if (typeof data.themeIndex === 'number') {
            setThemeIndex(data.themeIndex % BRAND_THEMES.length);
          } else {
            setThemeIndex(getHostThemeIndex(hostId));
          }
        } else {
          setThemeIndex(getHostThemeIndex(hostId));
          if (userProfile?.displayName) {
            setTempBrandName(userProfile.displayName);
          }
        }
      } catch (err) {
        console.error('Error fetching host brand:', err);
      }
    };

    fetchBrand();
  }, [hostId, userProfile?.displayName]);

  // Save / Update Host Name & Social Media Links
  const handleSaveBrandName = async (): Promise<boolean> => {
    const sanitized = tempBrandName.replace(/[^\u0980-\u09FFa-zA-Z0-9 ]/g, '').slice(0, 30).trim();
    if (!sanitized) return false;
    if (hostNameCheckStatus === 'taken') {
      alert("This name is already taken by another host. Please choose a unique name!");
      return false;
    }
    if (hostNameCheckStatus === 'checking') {
      alert("Checking name availability. Please wait a moment.");
      return false;
    }

    // Validate Facebook URL / username
    const fbCheck = validateSocialMediaLink('facebook', facebookUrl);
    if (!fbCheck.isValid) {
      alert(`⚠️ Facebook Link Error: ${fbCheck.errorMessage}`);
      return false;
    }

    // Validate YouTube URL / handle
    const ytCheck = validateSocialMediaLink('youtube', youtubeUrl);
    if (!ytCheck.isValid) {
      alert(`⚠️ YouTube Link Error: ${ytCheck.errorMessage}`);
      return false;
    }

    // Validate TikTok URL / username
    const ttCheck = validateSocialMediaLink('tiktok', tiktokUrl);
    if (!ttCheck.isValid) {
      alert(`⚠️ TikTok Link Error: ${ttCheck.errorMessage}`);
      return false;
    }

    setSavingBrandName(true);
    try {
      const brandRef = doc(db, 'host_brands', hostId);
      await setDoc(
        brandRef,
        {
          hostId,
          brandName: sanitized,
          brandLogoUrl: brandLogoUrl || '',
          brandCoverUrl: brandCoverUrl || '',
          facebookUrl: facebookUrl.trim(),
          youtubeUrl: youtubeUrl.trim(),
          tiktokUrl: tiktokUrl.trim(),
          themeIndex,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setBrandName(sanitized);
      setTempBrandName(sanitized);
      return true;
    } catch (err) {
      console.error('Error saving host name:', err);
      return false;
    } finally {
      setSavingBrandName(false);
    }
  };

  // Upload Host Logo with Compression and ImgBB / Backup Storage
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingLogo(true);
    window.dispatchEvent(new CustomEvent('vortex-img-process', { detail: { processing: true, message: 'OPTIMIZING HOST LOGO' } }));
    try {
      const { url: uploadedUrl } = await compressAndUploadLogoToFirebase(file, 'host_logo');

      const brandRef = doc(db, 'host_brands', hostId);
      await setDoc(
        brandRef,
        {
          hostId,
          brandName: brandName || tempBrandName || userProfile?.displayName || '',
          brandLogoUrl: uploadedUrl,
          themeIndex,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      // Also update user's profile doc hostLogoUrl if applicable for seamless sync across feed
      try {
        const userRef = doc(db, 'users', hostId);
        await updateDoc(userRef, {
          brandLogoUrl: uploadedUrl,
          hostLogoUrl: uploadedUrl,
          hostPhotoUrl: uploadedUrl,
        });
      } catch (uErr) {
        // Safe catch if user doc has partial permissions
        console.warn('Could not sync user hostLogoUrl:', uErr);
      }

      setBrandLogoUrl(uploadedUrl);
    } catch (err) {
      console.error('Error uploading host logo:', err);
      alert('Failed to upload host logo. Please try again.');
    } finally {
      setUploadingLogo(false);
      window.dispatchEvent(new CustomEvent('vortex-img-process', { detail: { processing: false } }));
    }
  };

  // Remove Brand Logo
  const handleRemoveLogo = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const brandRef = doc(db, 'host_brands', hostId);
      await setDoc(
        brandRef,
        {
          brandLogoUrl: '',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      try {
        const userRef = doc(db, 'users', hostId);
        await updateDoc(userRef, {
          brandLogoUrl: '',
          hostLogoUrl: '',
          hostPhotoUrl: '',
        });
      } catch (uErr) {
        console.warn('Could not remove user hostLogoUrl:', uErr);
      }
      setBrandLogoUrl('');
    } catch (err) {
      console.error('Error removing host logo:', err);
    }
  };

  // Upload Cover with ~40KB Compression and ImgBB / Backup Storage
  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingCover(true);
    window.dispatchEvent(new CustomEvent('vortex-img-process', { detail: { processing: true, message: 'COMPRESSING BRAND COVER' } }));
    try {
      // Use centralized cover utility with 40KB compression and 16:9 crop
      const { url: uploadedUrl } = await compressAndUploadCoverToFirebase(file, 'host_cover');

      const brandRef = doc(db, 'host_brands', hostId);
      await setDoc(
        brandRef,
        {
          hostId,
          brandName: brandName || tempBrandName || userProfile?.displayName || '',
          brandCoverUrl: uploadedUrl,
          themeIndex,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );

      setBrandCoverUrl(uploadedUrl);
    } catch (err) {
      console.error('Error uploading cover photo:', err);
      alert('Failed to upload cover photo. Please try again.');
    } finally {
      setUploadingCover(false);
      window.dispatchEvent(new CustomEvent('vortex-img-process', { detail: { processing: false } }));
    }
  };

  // Remove Brand Cover
  const handleRemoveCover = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    try {
      const brandRef = doc(db, 'host_brands', hostId);
      await setDoc(
        brandRef,
        {
          brandCoverUrl: '',
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setBrandCoverUrl('');
    } catch (err) {
      console.error('Error removing cover photo:', err);
    }
  };

  // Cycle/Shuffle Theme Color
  const handleShuffleTheme = async () => {
    const nextIdx = (themeIndex + 1) % BRAND_THEMES.length;
    setThemeIndex(nextIdx);
    try {
      const brandRef = doc(db, 'host_brands', hostId);
      await setDoc(
        brandRef,
        {
          themeIndex: nextIdx,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Error saving theme index:', err);
    }
  };

  const handleHostWalletTransferOut = async () => {
    if (hostWallet.isLocked) {
      setWalletError("Your host wallet is locked by Admin. You cannot transfer tokens out.");
      return;
    }
    const amountInt = Math.floor(Number(walletTransferAmount));
    if (!hasPermission('transfer_wallet_tokens')) {
      setWalletError("Access Denied: You do not have permission to transfer tokens from the host wallet.");
      return;
    }
    if (isNaN(amountInt) || amountInt <= 0) {
      setWalletError("Please enter a valid transfer amount.");
      return;
    }
    if (amountInt > hostWallet.balance) {
      setWalletError(`Insufficient host wallet balance. You only have ${hostWallet.balance} tokens.`);
      return;
    }

    setIsTransferringWallet(true);
    setWalletError('');
    setWalletSuccess('');

    try {
      await runTransaction(db, async (transaction) => {
        const userRef = doc(db, 'users', hostId);
        const walletRef = doc(db, 'host_wallets', hostId);

        const userSnap = await transaction.get(userRef);
        const walletSnap = await transaction.get(walletRef);

        if (!userSnap.exists()) throw new Error("User profile not found.");
        if (!walletSnap.exists()) throw new Error("Host wallet not found.");

        const currentTokens = Number(userSnap.data().tokens) || 0;
        const currentWalletBal = Number(walletSnap.data().balance) || 0;

        if (amountInt > currentWalletBal) {
          throw new Error("Insufficient host wallet balance.");
        }

        transaction.update(userRef, {
          tokens: currentTokens + amountInt
        });

        transaction.update(walletRef, {
          balance: currentWalletBal - amountInt
        });
      });

      setHostWallet(prev => ({ ...prev, balance: prev.balance - amountInt }));
      if (setTokens) {
        setTokens(prev => prev + amountInt);
      }
      setWalletSuccess(`Successfully transferred ${amountInt} tokens to your main Token Wallet.`);
      setWalletTransferAmount('');
    } catch (err: any) {
      setWalletError(err.message || "Failed to transfer tokens.");
    } finally {
      setIsTransferringWallet(false);
    }
  };

  // Fetch Co-hosts for current host and enrich with user account profile photo
  const fetchCoHosts = async () => {
    setLoading(true);
    try {
      const q = query(collection(db, 'co_hosts'), where('hostId', '==', hostId));
      const snap = await getDocs(q);
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() } as CoHost));

      // Enrich co-hosts list with account photoURL from registered users collection
      const enrichedList = await Promise.all(list.map(async (coHost) => {
        if (!coHost.identifier) return coHost;
        try {
          const userQ = query(
            collection(db, 'users'),
            where('email', '==', coHost.identifier.trim().toLowerCase())
          );
          const userSnap = await getDocs(userQ);
          if (!userSnap.empty) {
            const userData = userSnap.docs[0].data();
            if (userData.photoURL) {
              return { ...coHost, photoURL: userData.photoURL };
            }
          }
        } catch (e) {
          console.error("Error fetching user photo for co-host:", e);
        }
        return coHost;
      }));

      setCoHosts(enrichedList);
    } catch (err: any) {
      console.error('Error fetching co-hosts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (showCoHostModal) {
      fetchCoHosts();
    }
  }, [showCoHostModal, userProfile?.userId]);

  const handleAddCoHost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Please enter Co-Host Name');
      return;
    }
    const inputTerm = identifier.trim();
    if (!inputTerm) {
      setError('Please enter PlayVear ID or Gmail');
      return;
    }

    let finalIdentifier = inputTerm.toLowerCase();
    let accountPhotoURL: string | undefined = undefined;

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      // Look up account from registered user in 'users' collection
      const usersCol = collection(db, 'users');
      let userQ;
      
      if (/^\d{4}$/.test(inputTerm)) {
        userQ = query(usersCol, where('playvearId', '==', inputTerm));
      } else {
        userQ = query(usersCol, where('email', '==', inputTerm.toLowerCase()));
      }

      const userSnap = await getDocs(userQ);
      if (!userSnap.empty) {
        const uData = userSnap.docs[0].data() as any;
        accountPhotoURL = uData.photoURL || undefined;
        // If they searched by PlayVear ID, use the actual email for identifier storage to ensure login works
        finalIdentifier = uData.email.toLowerCase();
      } else if (!finalIdentifier.includes('@')) {
        setError(`No player found with PlayVear ID "${inputTerm}".`);
        setSubmitting(false);
        return;
      }

      const docData: any = {
        hostId,
        name: name.trim(),
        identifier: finalIdentifier,
        role,
        status: 'active',
        permissions: newCoHostPermissions,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };
      if (accountPhotoURL) {
        docData.photoURL = accountPhotoURL;
      }

      const docRef = await addDoc(collection(db, 'co_hosts'), docData);

      const newRecord: CoHost = {
        id: docRef.id,
        hostId,
        name: name.trim(),
        identifier: identifier.trim(),
        role,
        status: 'active',
        photoURL: accountPhotoURL,
        permissions: newCoHostPermissions,
        createdAt: new Date().toISOString()
      };

      setCoHosts((prev) => [...prev, newRecord]);

      setName('');
      setIdentifier('');
      setNewCoHostPermissions(getDefaultCoHostPermissions(true));
      setCoHostActiveTab('list');
      setSuccess(`Co-Host "${name.trim()}" added successfully!`);
      setTimeout(() => setSuccess(''), 3500);
    } catch (err: any) {
      console.error(err);
      setError('Failed to add Co-Host: ' + (err.message || 'Error'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleSuspendCoHost = async (coHost: CoHost) => {
    setTogglingStatusId(coHost.id);
    setError('');
    setSuccess('');
    const newStatus: 'active' | 'suspended' = coHost.status === 'suspended' ? 'active' : 'suspended';
    try {
      const coHostRef = doc(db, 'co_hosts', coHost.id);
      await updateDoc(coHostRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
      });

      setCoHosts(prev => prev.map(c => c.id === coHost.id ? { ...c, status: newStatus } : c));
      setSuccess(`Co-Host "${coHost.name}" is now ${newStatus === 'active' ? 'Reactivated' : 'Suspended'}.`);
      setTimeout(() => setSuccess(''), 3500);
    } catch (err: any) {
      console.error("Error toggling co-host status:", err);
      setError('Failed to update status: ' + (err.message || 'Error'));
    } finally {
      setTogglingStatusId(null);
    }
  };

  const handleSaveCoHostDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDetailsCoHost) return;
    if (!editName.trim()) {
      setError('Please enter Co-Host Name');
      return;
    }
    if (!editIdentifier.trim()) {
      setError('Please enter Registered PlayVear ID address');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(editIdentifier.trim())) {
      setError('Please enter a valid Gmail address');
      return;
    }

    setSavingDetails(true);
    setError('');
    setSuccess('');

    try {
      // Look up account photo from registered user in 'users' collection for the updated email
      let accountPhotoURL: string | undefined = editingDetailsCoHost.photoURL;
      try {
        const userQ = query(
          collection(db, 'users'),
          where('email', '==', editIdentifier.trim().toLowerCase())
        );
        const userSnap = await getDocs(userQ);
        if (!userSnap.empty) {
          const uData = userSnap.docs[0].data();
          accountPhotoURL = uData.photoURL || undefined;
        }
      } catch (e) {
        console.error("Error checking user account photo:", e);
      }

      const coHostRef = doc(db, 'co_hosts', editingDetailsCoHost.id);
      await updateDoc(coHostRef, {
        name: editName.trim(),
        identifier: editIdentifier.trim(),
        role: editRole,
        photoURL: accountPhotoURL || null,
        updatedAt: serverTimestamp()
      });

      setCoHosts(prev => prev.map(c => c.id === editingDetailsCoHost.id ? {
        ...c,
        name: editName.trim(),
        identifier: editIdentifier.trim(),
        role: editRole,
        photoURL: accountPhotoURL
      } : c));

      setEditingDetailsCoHost(null);
      setSuccess('Co-Host details updated successfully!');
      setTimeout(() => setSuccess(''), 3500);
    } catch (err: any) {
      console.error("Error updating co-host details:", err);
      setError('Failed to update details: ' + (err.message || 'Error'));
    } finally {
      setSavingDetails(false);
    }
  };

  const handleSaveEditingPermissions = async () => {
    if (!editingCoHost) return;
    setSavingPermissions(true);
    setError('');
    setSuccess('');
    try {
      const coHostRef = doc(db, 'co_hosts', editingCoHost.id);
      await updateDoc(coHostRef, {
        permissions: editingPermissions,
        updatedAt: serverTimestamp()
      });

      setCoHosts(prev => prev.map(c => c.id === editingCoHost.id ? { ...c, permissions: editingPermissions } : c));
      setEditingCoHost(null);
      setSuccess(`Permissions updated successfully for ${editingCoHost.name}!`);
      setTimeout(() => setSuccess(''), 3500);
    } catch (err: any) {
      console.error("Error updating permissions:", err);
      setError('Failed to update permissions: ' + (err.message || 'Error'));
    } finally {
      setSavingPermissions(false);
    }
  };

  const handleRemoveCoHost = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'co_hosts', id));
      setCoHosts((prev) => prev.filter((c) => c.id !== id));
      if (editingCoHost?.id === id) {
        setEditingCoHost(null);
      }
      setSuccess('Co-Host removed successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      console.error('Error deleting co-host:', err);
      setError('Failed to remove co-host: ' + err.message);
    }
  };

  const handleDeleteLeague = async (leagueId: string) => {
    if (!hasPermission('delete_cancel_matches')) {
      alert("Access Denied: You do not have permission to delete or cancel matches/leagues.");
      return;
    }
    try {
      await deleteDoc(doc(db, 'pro_hosted_leagues', leagueId));
      
      // Update local state
      setHostLeagues(prev => prev.filter(l => l.id !== leagueId));
      setPendingLeagues(prev => prev.filter(l => l.id !== leagueId));
      setDeletingLeagueId(null);
    } catch (err: any) {
      console.error('Error deleting league:', err);
      alert('Failed to delete league: ' + err.message);
      setDeletingLeagueId(null);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-28 px-4 space-y-4 min-h-[400px]">
        <div className="relative flex items-center justify-center">
          <div className="w-14 h-14 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 border-r-blue-500 animate-spin" />
          <Loader2 className="w-6 h-6 text-cyan-400 animate-spin absolute" />
        </div>
        <div className="text-center space-y-1">
          <p className="text-xs font-bold text-white tracking-wider uppercase">Loading Host Details...</p>
          <p className="text-[10px] text-slate-400">Fetching host profile, wallet & leagues data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Top Header Card */}
      <div className={`p-4 sm:p-6 bg-slate-900/50 rounded-2xl border ${currentTheme.border} flex items-center justify-between relative`}>
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          {targetHostId && onBackToInbox && (
            <button
              onClick={onBackToInbox}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors text-cyan-400 mr-1 flex items-center justify-center cursor-pointer"
              title="Back to Message Inbox"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <Shield className={`w-6 h-6 ${currentTheme.text}`} />
          Host Panel
        </h2>

        {/* Right Action Container: Messages Icon + Generate Button + 3-dots Menu */}
        <div className="flex items-center gap-2 sm:gap-2.5 relative">
          {hasPermission('host_messages_inbox') && (
            <button
              onClick={() => setShowHostInboxModal(true)}
              className="relative p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-cyan-400 rounded-lg border border-white/10 hover:border-cyan-500/50 transition-all cursor-pointer shadow-md group flex items-center justify-center"
              title="Host Messages Inbox"
              aria-label="Host Messages Inbox"
            >
              <MessageSquare className="w-5 h-5 text-cyan-400 group-hover:scale-110 transition-transform" />
              {unreadHostCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 px-1.5 py-0.5 text-[9px] font-black bg-rose-500 text-white rounded-full animate-pulse shadow-[0_0_10px_rgba(244,63,94,0.7)] border border-rose-300 font-mono">
                  {unreadHostCount}
                </span>
              )}
            </button>
          )}

          {(hasPermission('create_tournaments') || hasPermission('create_leagues') || hasPermission('create_lone_wolf')) && (
            <button
              onClick={onGenerate}
              className={`flex items-center gap-2 px-4 py-2 ${currentTheme.accentBg} text-white rounded-lg font-medium transition-colors text-sm ${currentTheme.shadow} cursor-pointer`}
            >
              <Plus className="w-4 h-4" />
              Generate
            </button>
          )}

          {/* 3-Dots Menu Button */}
          <div className="relative">
            <button
              onClick={() => setShowMenu((prev) => !prev)}
              className={`p-2 bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border ${currentTheme.border} transition-all cursor-pointer`}
              aria-label="Host Options"
            >
              <MoreVertical className={`w-5 h-5 ${currentTheme.text}`} />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setShowMenu(false)} />
                <div className={`absolute right-0 mt-2 w-52 bg-[#090d22] border ${currentTheme.border} rounded-xl shadow-2xl py-1 z-40 animate-in fade-in slide-in-from-top-2 duration-150`}>
                  {hasPermission('host_messages_inbox') && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowHostInboxModal(true);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 flex items-center justify-between gap-2.5 transition-all cursor-pointer border-b border-white/5`}
                    >
                      <div className="flex items-center gap-2.5">
                        <MessageSquare className={`h-4 w-4 ${currentTheme.text}`} />
                        <span>Messages Inbox</span>
                      </div>
                      {unreadHostCount > 0 && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full animate-pulse">
                          {unreadHostCount}
                        </span>
                      )}
                    </button>
                  )}

                  {hasPermission('edit_host_profile') && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setTempBrandName(brandName || userProfile?.displayName || '');
                        setShowProfileModal(true);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 flex items-center gap-2.5 transition-all cursor-pointer border-b border-white/5`}
                    >
                      <Edit3 className={`h-4 w-4 ${currentTheme.text}`} />
                      <span>Edit Host Profile</span>
                    </button>
                  )}

                  {isMainHost && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowCoHostModal(true);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 flex items-center gap-2.5 transition-all cursor-pointer border-b border-white/5`}
                    >
                      <UserPlus className={`h-4 w-4 ${currentTheme.text}`} />
                      <span>Manage Co-Hosts</span>
                    </button>
                  )}

                  {hasPermission('view_host_wallet') && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowHostWalletModal(true);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 flex items-center gap-2.5 transition-all cursor-pointer border-b border-white/5`}
                    >
                      <Wallet className={`h-4 w-4 ${currentTheme.text}`} />
                      <span>Host Wallet</span>
                    </button>
                  )}

                  {isMainHost && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        fetchSubscriptionDetails();
                        setShowSubscriptionModal(true);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 flex items-center justify-between gap-2.5 transition-all cursor-pointer border-b border-white/5`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Award className={`h-4 w-4 ${currentTheme.text}`} />
                        <span>Subscription Details</span>
                      </div>
                      {userProfile?.proHostSubscription?.type && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-md uppercase">
                          {userProfile.proHostSubscription.type}
                        </span>
                      )}
                    </button>
                  )}

                  {(hasPermission('create_leagues') || isMainHost) && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        fetchPendingLeagues();
                        setShowPendingLeagueModal(true);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 flex items-center justify-between gap-2.5 transition-all cursor-pointer border-b border-white/5`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Clock className={`h-4 w-4 ${currentTheme.text}`} />
                        <span>Pending League</span>
                      </div>
                      {pendingLeagues.length > 0 && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-full animate-pulse">
                          {pendingLeagues.length}
                        </span>
                      )}
                    </button>
                  )}

                  {(hasPermission('create_tournaments') || isMainHost) && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        fetchPendingTournaments();
                        setShowPendingTournamentModal(true);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 flex items-center justify-between gap-2.5 transition-all cursor-pointer border-b border-white/5`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Trophy className={`h-4 w-4 ${currentTheme.text}`} />
                        <span>Pending Tournament</span>
                      </div>
                      {pendingTournaments.length > 0 && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full animate-pulse font-mono">
                          {pendingTournaments.length}
                        </span>
                      )}
                    </button>
                  )}

                  {(hasPermission('create_lone_wolf') || isMainHost) && (
                    <button
                      onClick={() => {
                        setShowMenu(false);
                        setShowPendingLoneWolfModal(true);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-white/10 flex items-center justify-between gap-2.5 transition-all cursor-pointer`}
                    >
                      <div className="flex items-center gap-2.5">
                        <Swords className={`h-4 w-4 ${currentTheme.text}`} />
                        <span>Lone wolf pending</span>
                      </div>
                      {pendingAndRejectedLoneWolf.length > 0 && (
                        <span className="px-1.5 py-0.5 text-[9px] font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full animate-pulse font-mono">
                          {pendingAndRejectedLoneWolf.length}
                        </span>
                      )}
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Host Banner - Horizontal Clean View Layout with Integrated Cover Background */}
      <div className={`p-5 sm:p-6 rounded-2xl border ${currentTheme.border} ${currentTheme.bg} ${currentTheme.shadow} transition-all duration-300 relative overflow-hidden backdrop-blur-sm min-h-[140px] flex items-center`}>
        {/* Sleek cover photo in the background layout of these components */}
        {brandCoverUrl && (
          <>
            <img 
              src={brandCoverUrl} 
              alt="Host Cover" 
              className="absolute inset-0 w-full h-full object-cover z-0 opacity-90 transition-opacity duration-300 pointer-events-none" 
            />
            {/* Elegant deep gradient to keep typography and icons highly clear and contrast-friendly */}
            <div className="absolute inset-0 bg-gradient-to-r from-slate-950 via-slate-950/75 to-transparent z-10 pointer-events-none" />
          </>
        )}

        <div className="flex items-center gap-4 sm:gap-6 relative z-20 w-full">
          {/* Square Image Box (Host Logo / Profile Picture) */}
          <div className="relative shrink-0">
            <div className={`w-20 h-20 sm:w-24 sm:h-24 rounded-2xl border-2 ${currentTheme.border} flex flex-col items-center justify-center overflow-hidden relative bg-slate-900/90 shadow-lg`}>
              {brandLogoUrl || userProfile?.photoURL ? (
                <img 
                  src={brandLogoUrl || userProfile?.photoURL} 
                  alt="Host Logo" 
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover rounded-2xl" 
                />
              ) : (
                <div className="flex flex-col items-center justify-center p-2 text-center">
                  <Shield className={`w-8 h-8 mb-1 ${currentTheme.text}`} />
                  <span className={`text-[10px] font-bold text-slate-400`}>No Logo</span>
                </div>
              )}
            </div>
          </div>

          {/* Host Name Section */}
          <div className="flex-1 min-w-0 space-y-2">
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider border ${currentTheme.badge} bg-slate-950/80`}>
                HOST PROFILE
              </span>
            </div>

            <h3 className="text-xl sm:text-2xl font-black text-white tracking-wide truncate drop-shadow-md">
              {brandName || userProfile?.displayName || 'Host User'}
            </h3>

            <p className="text-xs text-slate-300 font-medium truncate drop-shadow-sm flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Official Host
            </p>
          </div>
        </div>

        {brandCoverUrl && (
          <div className="absolute top-3 right-3 bg-slate-950/80 border border-white/10 px-2 py-0.5 rounded-md text-[8px] font-bold text-cyan-400 font-mono uppercase tracking-wider z-20 select-none">
            Cover Integrated
          </div>
        )}
      </div>

      {/* Approved Host Leagues Card Layout Section */}
      <div className={`p-4 rounded-2xl border ${currentTheme.border} ${currentTheme.bg} ${currentTheme.shadow} space-y-3.5`}>
        {/* Simple clean Section Header with Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/10 pb-3">
          <div className="flex bg-slate-900/60 p-1 border border-white/5 rounded-lg flex-wrap gap-1">
            <button
              onClick={() => setActiveHostViewTab('leagues')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold font-mono uppercase transition-all ${
                activeHostViewTab === 'leagues'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hosted Leagues
            </button>
            <button
              onClick={() => setActiveHostViewTab('tournaments')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold font-mono uppercase transition-all ${
                activeHostViewTab === 'tournaments'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Hosted Tournaments
            </button>
            <button
              onClick={() => setActiveHostViewTab('lone_wolf')}
              className={`px-3 py-1.5 rounded-md text-[10px] font-bold font-mono uppercase transition-all flex items-center gap-1.5 ${
                activeHostViewTab === 'lone_wolf'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Swords className="w-3 h-3 text-cyan-400" />
              <span>Lone Wolf</span>
            </button>
          </div>
          <span className="bg-slate-950/80 text-[10px] px-2 py-0.5 rounded-full font-mono text-cyan-400 font-bold border border-white/5 w-fit">
            Total: {activeHostViewTab === 'leagues' ? sortedHostLeagues.length : activeHostViewTab === 'tournaments' ? sortedHostTournaments.length : hostLoneWolfMatches.length}
          </span>
        </div>

        {/* Dynamic Content Based on Tab */}
        {activeHostViewTab === 'leagues' ? (
          <>
            {sortedHostLeagues.length === 0 ? (
              <div className="text-center py-6 bg-slate-900/40 rounded-xl border border-white/5 space-y-1">
              <Trophy className="w-6 h-6 text-slate-600 mx-auto opacity-50" />
              <p className="text-slate-300 text-xs font-bold">
                No leagues found
              </p>
              <p className="text-slate-500 text-[10px]">
                Leagues approved by Administrator will show here in card layout.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedHostLeagues.map((league) => (
                <div
                  key={league.id}
                  className="p-2.5 bg-slate-900/80 border border-cyan-500/20 rounded-xl space-y-1.5 relative hover:border-cyan-500/40 transition-all shadow-lg"
                >
                {/* Top Row: Host photo, League #, Status, Season & Name */}
                <div className="flex items-center justify-between border-b border-white/5 pb-1.5">
                  <div className="flex items-center gap-3">
                    <img
                      src={league.hostPhotoUrl || userProfile?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                      alt="Host Photo"
                      className="w-10 h-10 rounded-xl object-cover border border-cyan-500/30 shrink-0 shadow-md"
                    />
                    <div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 uppercase">
                          ID: {league.id}
                        </span>
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
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300 ${league.sponsorLinkUrl ? 'hover:bg-amber-500/25 cursor-pointer' : 'cursor-default'}`}
                          >
                            <span className="text-[7px] font-black uppercase text-amber-400">SPONSOR:</span>
                            {league.sponsorLogoUrl && (
                              <img src={league.sponsorLogoUrl} alt="Sponsor" className="h-5 max-w-[90px] object-contain rounded border border-amber-400/50 bg-slate-950/60 p-0.5" />
                            )}
                            {league.sponsorName && (
                              <span className="text-[8px] font-bold text-amber-200 uppercase">{league.sponsorName}</span>
                            )}
                          </div>
                        )}
                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          league.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          league.status === 'ongoing' ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 animate-pulse' :
                          league.status === 'cancelled' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                          'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                        }`}>
                          {league.status === 'approved' ? 'Approved & Ready' : league.status === 'cancelled' ? '🔴 Auto-Cancelled' : league.status}
                        </span>
                      </div>
                      <h4 className="text-white font-extrabold text-xs sm:text-sm">{league.leagueName}</h4>
                      
                      {/* Region & Representation Rules */}
                      <div className="space-y-1 mt-1.5 border-t border-white/5 pt-1.5">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-tight">
                            <MapPin className="w-3 h-3 text-emerald-400" />
                            <span>Allowed Region:</span>
                            <span className="text-white">
                              {league.locationRestrictionType === 'specific_division' ? `${league.allowedDivision} Division` :
                               league.locationRestrictionType === 'specific_district' ? `${league.allowedDistrict} District (${league.allowedDivision})` :
                               league.locationRestrictionType === 'specific_upazila' ? `${league.allowedUpazila} Upazila (${league.allowedDistrict})` :
                               'Global Online'}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-cyan-400 font-bold uppercase tracking-tight">
                            <ShieldAlert className="w-3 h-3" />
                            <span>Rule:</span>
                            <span className="text-slate-200">
                              {league.representationRule === 'one_squad_per_upazila' ? 'One Squad per Upazila' :
                               league.representationRule === 'one_squad_per_district' ? 'One Squad per District' :
                               league.representationRule === 'one_squad_per_division' ? 'One Squad per Division' :
                               'Multiple Squads Allowed'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block uppercase font-mono">Season</span>
                      <span className="text-xs font-bold text-cyan-400">S{league.seasonNumber}</span>
                    </div>

                    <div className="relative">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation();
                          setOpenLeagueMenuId(openLeagueMenuId === league.id ? null : league.id);
                        }}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition border border-white/5 text-slate-400 hover:text-white cursor-pointer"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      <AnimatePresence>
                        {openLeagueMenuId === league.id && (
                          <>
                            <div 
                              className="fixed inset-0 z-40" 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenLeagueMenuId(null);
                              }}
                            />
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95, y: 10 }}
                              animate={{ opacity: 1, scale: 1, y: 0 }}
                              exit={{ opacity: 0, scale: 0.95, y: 10 }}
                              className="absolute right-0 mt-2 w-48 bg-[#090d22] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1.5"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <div className="px-4 py-2 border-b border-white/5 bg-cyan-500/5 flex items-center justify-between">
                                <div>
                                  <div className="flex items-center gap-2 text-cyan-400">
                                    <Wallet className="w-3.5 h-3.5" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">League Wallet</span>
                                  </div>
                                  <div className="text-sm font-bold text-white mt-0.5">{league.walletBalance || 0} Tokens</div>
                                </div>
                                <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${league.walletStatus === 'locked' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                                  {league.walletStatus || 'Locked'}
                                </div>
                              </div>
                              
                                                            <button
                                onClick={() => {
                                  setShowWalletModalLeague(league);
                                  setOpenLeagueMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-white/5 text-slate-300 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <Eye className="w-4 h-4" />
                                View League Wallet
                              </button>
                              
                              <button
                                onClick={() => {
                                  setActiveScheduleLeague(league);
                                  setOpenLeagueMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left hover:bg-white/5 text-slate-300 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer"
                              >
                                <ChevronRight className="w-4 h-4" />
                                View Details
                              </button>

                              <div className="border-t border-white/5 py-1">
                                <div className="px-4 py-1 text-[9px] font-black uppercase text-slate-400">Set League Status</div>
                                <button
                                  onClick={() => handleSetLeagueStatus(league.id, 'ongoing')}
                                  className={`w-full px-4 py-1.5 text-left hover:bg-cyan-500/10 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${league.status === 'ongoing' ? 'text-cyan-400 bg-cyan-500/10' : 'text-slate-300'}`}
                                >
                                  <span className="w-2 h-2 rounded-full bg-cyan-400" />
                                  Go Live / Set Ongoing
                                </button>
                                <button
                                  onClick={() => handleSetLeagueStatus(league.id, 'approved')}
                                  className={`w-full px-4 py-1.5 text-left hover:bg-blue-500/10 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${league.status === 'approved' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-300'}`}
                                >
                                  <span className="w-2 h-2 rounded-full bg-blue-400" />
                                  Set Registration
                                </button>
                              </div>
                            </motion.div>
                          </>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </div>

                {/* Region & Squad Rules */}
                <div className="bg-slate-950/60 p-2.5 rounded-lg border border-white/5 space-y-1 text-xs">
                  <div className="flex items-center gap-1 text-slate-300 font-semibold">
                    <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    <span>Location & Eligibility:</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-[10px] text-slate-400">
                    <div>
                      <span className="text-slate-500 font-bold">Allowed Region: </span>
                      <span className="text-white font-medium">
                        {league.locationRestrictionType === 'specific_division' ? `Division: ${league.allowedDivision}` :
                         league.locationRestrictionType === 'specific_district' ? `District: ${league.allowedDistrict}` :
                         league.locationRestrictionType === 'specific_upazila' ? `Upazila: ${league.allowedUpazila}` :
                         'Anywhere in Bangladesh'}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 font-bold">Squad Limit Rule: </span>
                      <span className="text-cyan-300 font-medium">
                        {league.representationRule === 'one_squad_per_upazila' ? '1 Squad per Upazila' :
                         league.representationRule === 'one_squad_per_district' ? '1 Squad per District' :
                         league.representationRule === 'one_squad_per_division' ? '1 Squad per Division' :
                         'Multiple Squads Allowed'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Prize Breakdown & Fee */}
                <div className="bg-slate-950/80 px-2.5 py-1.5 rounded-lg border border-white/5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                  <div className="flex items-center gap-2 text-slate-300">
                    <span>🏆 Champ: <strong className="text-amber-400 font-bold">{league.championPrize ?? Math.floor((league.prizePool || 0) * 0.5)} T</strong></span>
                    <span>|</span>
                    <span>🥈 Runner-Up: <strong className="text-slate-200 font-bold">{league.runnerUpPrize ?? Math.floor((league.prizePool || 0) * 0.3)} T</strong></span>
                  </div>
                  <div className="flex items-center gap-2 text-slate-300">
                    <span>Pool: <strong className="text-yellow-400">{league.prizePool} T</strong></span>
                    <span>•</span>
                    <span>Entry: <strong className="text-cyan-400">{league.entryFee} T</strong></span>
                  </div>
                </div>

                {/* Card Action: View Details & Manage */}
                <div className="pt-0.5 flex gap-2">
                  <button
                    onClick={() => setActiveScheduleLeague(league)}
                    className="flex-1 px-3 py-1.5 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 text-cyan-300 border border-cyan-500/40 rounded-lg text-[10px] font-bold uppercase transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                  >
                    <span>View League Details & Manage</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
            )}
          </>
        ) : activeHostViewTab === 'tournaments' ? (
          <>
            {sortedHostTournaments.length === 0 ? (
              <div className="text-center py-6 bg-slate-900/40 rounded-xl border border-white/5 space-y-1">
              <Flame className="w-6 h-6 text-slate-600 mx-auto opacity-50" />
              <p className="text-slate-300 text-xs font-bold">
                No tournaments found
              </p>
              <p className="text-slate-500 text-[10px]">
                Tournaments you host will appear here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedHostTournaments.map((tournament) => (
                <div
                  key={tournament.id}
                  className="p-3 bg-slate-900/80 border border-cyan-500/20 rounded-xl space-y-2 relative hover:border-cyan-500/40 transition-all shadow-lg"
                >
                  <div className="flex flex-col gap-2 border-b border-white/5 pb-2">
                    {/* Top Status Indicators */}
                    <div className="flex items-center gap-2">
                      {(tournament.isMatchPlayed || tournament.matchPlayed || tournament.status === 'ResultUnderReview') && (
                        <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-emerald-500/15 border border-emerald-500/40 rounded-lg animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.1)]">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span className="text-[10px] font-black font-mono text-emerald-400 uppercase tracking-tighter">
                            Match Played
                          </span>
                        </div>
                      )}
                      {tournament.status === 'ResultUnderReview' && (
                        <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-cyan-500/15 border border-cyan-500/40 rounded-lg animate-pulse shadow-[0_0_10px_rgba(6,182,212,0.1)]">
                          <Clock className="w-3.5 h-3.5 text-cyan-400" />
                          <span className="text-[10px] font-black font-mono text-cyan-400 uppercase tracking-tighter">
                            Under Review
                          </span>
                        </div>
                      )}
                      {tournament.status === 'ResultRejected' && (
                        <div className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-rose-500/15 border border-rose-500/40 rounded-lg shadow-[0_0_10px_rgba(244,63,94,0.1)]">
                          <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                          <span className="text-[10px] font-black font-mono text-rose-500 uppercase tracking-tighter">
                            Result Rejected
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Rejection Reason display for Host with Action Button */}
                    {tournament.status === 'ResultRejected' && (
                      <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg space-y-3 shadow-inner">
                        <div className="flex items-start gap-2">
                          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-[10px] font-black text-rose-400 uppercase tracking-wider flex items-center gap-1">
                              Rejection Reason
                            </p>
                            <p className="text-[11px] text-rose-100 font-medium leading-relaxed italic">
                              "{tournament.rejectionReason || "No specific reason provided"}"
                            </p>
                          </div>
                        </div>
                        
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setResultSetTournament(tournament);
                          }}
                          className="w-full py-2 bg-rose-500 hover:bg-rose-600 text-white text-[11px] font-black uppercase tracking-widest rounded-md flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-rose-500/20"
                        >
                          <Award className="w-4 h-4" />
                          Edit & Resubmit Results
                        </button>
                      </div>
                    )}

                    <div className="flex justify-between items-start gap-2 w-full">
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-white tracking-wide">{tournament.title}</h4>
                        <div className="flex gap-2 items-center mt-1 text-[10px] text-slate-400 font-mono flex-wrap">
                          {tournament.tournamentNumber && (
                            <span className="bg-cyan-950/50 px-1.5 py-0.5 rounded text-cyan-200 border border-cyan-500/20 uppercase font-black">
                              T#{tournament.tournamentNumber}
                            </span>
                          )}
                          <span className="bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded border border-orange-500/20 text-[8px] font-black uppercase">
                            Free Fire
                          </span>
                          <span className="bg-slate-950/80 px-1.5 py-0.5 rounded text-cyan-400 border border-cyan-500/30 uppercase">
                            ID: {tournament.id}
                          </span>
                          {tournament.hasSponsor && (tournament.sponsorName || tournament.sponsorLogoUrl) && (
                            <div className="flex items-center gap-1 px-1.5 py-0.5 rounded-full border border-amber-500/40 bg-amber-500/10 text-amber-300">
                              <span className="text-[7px] font-black uppercase text-amber-400">SPONSORED</span>
                              {tournament.sponsorLogoUrl && (
                                <img src={tournament.sponsorLogoUrl} alt="Sponsor" className="h-3 max-w-[50px] object-contain rounded border border-amber-400/50 bg-slate-950/40 p-0.5" />
                              )}
                              {tournament.sponsorName && (
                                <span className="text-[8px] font-bold text-amber-200 uppercase truncate max-w-[60px]">{tournament.sponsorName}</span>
                              )}
                            </div>
                          )}
                          <span className={`px-1.5 py-0.5 rounded uppercase font-bold border ${
                            tournament.status === 'Open' ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' :
                            tournament.status === 'Ongoing' ? 'bg-amber-500/20 text-amber-400 border-amber-500/30' :
                            tournament.status === 'ResultUnderReview' ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30 animate-pulse' :
                            tournament.status === 'ResultRejected' ? 'bg-rose-500/20 text-rose-400 border-rose-500/30' :
                            tournament.status === 'Played' || tournament.status === 'played' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                            'bg-rose-500/20 text-rose-400 border-rose-500/30'
                          }`}>
                            {tournament.status === 'ResultUnderReview' ? 'Under Review' : 
                             tournament.status === 'ResultRejected' ? 'Rejected' : 
                             tournament.status}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 shrink-0">
                        {tournament.isLocalVenue && tournament.localVenueName && (
                          <div className="flex items-center gap-1.5 bg-emerald-500/5 border border-emerald-500/20 px-2 py-1 rounded-lg w-fit">
                            <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                            <span className="text-[9px] text-slate-300 font-bold uppercase tracking-tight">Venue: {tournament.localVenueName}</span>
                          </div>
                        )}

                        <div className="relative">
                          {tournament.status !== 'ResultUnderReview' && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenTournamentMenuId(openTournamentMenuId === tournament.id ? null : tournament.id);
                              }}
                              className="p-1.5 hover:bg-white/10 rounded-lg transition border border-white/5 text-slate-400 hover:text-white cursor-pointer"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          )}
                          <AnimatePresence>
                            {openTournamentMenuId === tournament.id && (
                              <>
                                <div 
                                  className="fixed inset-0 z-40"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setOpenTournamentMenuId(null);
                                  }}
                                />
                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                  className="absolute right-0 mt-2 w-48 bg-[#090d22] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden py-1.5"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {/* Tournament Wallet Overview */}
                                  {(() => {
                                    const calculatedEntryFees = tournament.mode === 'squad'
                                      ? ((tournament.joinedSquads?.length || 0) * (tournament.entryFee || 0))
                                      : ((tournament.joinedPlayers?.length || tournament.joinedCount || 0) * (tournament.entryFee || 0));
                                    const tourneyWalletBalance = tournament.walletBalance !== undefined 
                                      ? tournament.walletBalance 
                                      : ((tournament.walletTokens || 0) + calculatedEntryFees);
                                    const isUnlocked = tournament.walletStatus === 'unlocked' || tournament.walletStatus === 'active';

                                    return (
                                      <>
                                        <div className="px-4 py-2 border-b border-white/5 bg-cyan-500/10 flex items-center justify-between">
                                          <div>
                                            <div className="flex items-center gap-1.5 text-cyan-400">
                                              <Wallet className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                              <span className="text-[10px] font-black uppercase tracking-widest">Tournament Wallet</span>
                                            </div>
                                            <div className="text-sm font-black text-white mt-0.5 font-mono flex items-center gap-1">
                                              <span className="text-cyan-300">🪙 {tourneyWalletBalance}</span>
                                              <span className="text-[9px] font-bold text-slate-400 uppercase">Tokens</span>
                                            </div>
                                          </div>
                                          <div className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-tighter ${
                                            isUnlocked 
                                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                                              : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                          }`}>
                                            {isUnlocked ? 'Unlocked' : (tournament.walletStatus || 'Deposit Locked')}
                                          </div>
                                        </div>

                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setShowWalletModalTourney(tournament);
                                            setOpenTournamentMenuId(null);
                                          }}
                                          className="w-full px-4 py-2 text-left hover:bg-white/5 text-cyan-300 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border-b border-white/[0.05]"
                                        >
                                          <Eye className="w-4 h-4 text-cyan-400" />
                                          <span>View Tournament Wallet</span>
                                        </button>
                                      </>
                                    );
                                  })()}
                                  {confirmingOngoingTourneyId === tournament.id ? (
                                    <div className="px-4 py-2 bg-amber-950/40 border-t border-amber-500/30 flex flex-col gap-2">
                                      <span className="text-[10px] font-bold text-amber-300">Move match to Ongoing?</span>
                                      <div className="flex gap-2">
                                        <button
                                          onClick={() => {
                                            handleSetTournamentStatus(tournament.id, 'Ongoing');
                                            setConfirmingOngoingTourneyId(null);
                                            setOpenTournamentMenuId(null);
                                          }}
                                          className="flex-1 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-[10px] font-black rounded cursor-pointer transition-colors uppercase"
                                        >
                                          Yes
                                        </button>
                                        <button
                                          onClick={() => setConfirmingOngoingTourneyId(null)}
                                          className="flex-1 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold rounded cursor-pointer transition-colors"
                                        >
                                          No
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="space-y-1">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setConfirmingOngoingTourney(tournament);
                                          setOpenTournamentMenuId(null);
                                        }}
                                        disabled={tournament.status === 'Ongoing' || tournament.status === 'ongoing'}
                                        className={`w-full px-4 py-2 text-left hover:bg-amber-500/10 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer ${
                                          (tournament.status === 'Ongoing' || tournament.status === 'ongoing') ? 'text-slate-500 opacity-50' : 'text-amber-400'
                                        }`}
                                      >
                                        <Play className="w-4 h-4 text-amber-400 shrink-0" />
                                        <span>{(tournament.status === 'Ongoing' || tournament.status === 'ongoing') ? 'Already Ongoing' : 'Go Live / Move to Ongoing'}</span>
                                      </button>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setRoomDetailsTournament(tournament);
                                          setOpenTournamentMenuId(null);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-cyan-500/10 text-cyan-400 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border-t border-white/[0.03]"
                                      >
                                        <Key className="w-4 h-4 text-cyan-400 shrink-0" />
                                        <span>Set Room ID & Password</span>
                                      </button>

                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setResultSetTournament(tournament);
                                          setOpenTournamentMenuId(null);
                                        }}
                                        className="w-full px-4 py-2 text-left hover:bg-emerald-500/10 text-emerald-400 text-xs font-bold flex items-center gap-2 transition-colors cursor-pointer border-t border-white/[0.03]"
                                      >
                                        <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                                        <span>{tournament.status === 'ResultRejected' || (tournament.tempResultData || tournament.finalResultData) ? 'Edit Result' : 'Set Result'}</span>
                                      </button>
                                    </div>
                                  )}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-[10px] sm:text-xs text-slate-300">
                    <div className="flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-slate-500" />
                      <span>{tournament.mode === 'solo' ? 'Solo' : 'Squad'} Mode</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Trophy className="w-3.5 h-3.5 text-yellow-500" />
                      <span>{tournament.prizePool} Tk Prize Pool</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Coins className="w-3.5 h-3.5 text-cyan-400" />
                      <span className="truncate">Entry: {tournament.entryFee} Tk</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Target className="w-3.5 h-3.5 text-rose-400" />
                      <span className="truncate">Per Kill: {tournament.perKill} Tk</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Map className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="truncate">Map: {tournament.map || 'Bermuda'}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <UserPlus className="w-3.5 h-3.5 text-blue-400" />
                      <span className="truncate">
                        Joined: {tournament.mode === 'solo' 
                          ? `${tournament.joinedPlayers?.length || tournament.joinedCount || 0} / ${tournament.maxPlayers || 48}`
                          : `${tournament.joinedSquads?.length || tournament.joinedSquadCount || 0} / ${tournament.maxSquads || 12}`
                        }
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span>{tournament.matchDate}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-purple-400" />
                      <span>{tournament.matchTime}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            )}
          </>
        ) : (
          <div className="pt-2">
            <LoneWolfView
              userProfile={userProfile}
              tokens={tokens}
              setTokens={setTokens}
            />
          </div>
        )}
      </div>

      {/* Edit Host Profile Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className={`bg-[#090d22] border ${currentTheme.border} rounded-2xl p-5 sm:p-6 max-w-lg w-full relative space-y-4 shadow-2xl ${currentTheme.shadow} my-auto max-h-[90vh] overflow-y-auto custom-scrollbar`}
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3 sticky -top-5 sm:-top-6 bg-[#090d22]/95 backdrop-blur-md pt-1 z-20">
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 className={`w-5 h-5 ${currentTheme.text}`} />
                  <span>Edit Host Profile</span>
                </h3>
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-lg bg-white/5 hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Host Logo & Cover Photos Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Host Profile Picture / Logo Section */}
                <div className="space-y-2.5 bg-slate-900/80 p-3.5 rounded-xl border border-cyan-500/20 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-bold uppercase tracking-wider ${currentTheme.text} flex items-center gap-1.5`}>
                      <Shield className="w-3.5 h-3.5" />
                      Host Logo / Avatar
                    </label>
                    <span className="text-[9px] text-cyan-400 font-mono font-semibold px-1.5 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
                      1:1 Square
                    </span>
                  </div>

                  <div className="flex flex-col items-center gap-2 pt-1">
                    <div className="relative">
                      <input
                        type="file"
                        id="modal-host-logo-upload"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="modal-host-logo-upload"
                        className={`w-24 h-24 rounded-2xl border-2 border-dashed ${
                          brandLogoUrl ? 'border-cyan-400' : 'border-cyan-500/40 hover:border-cyan-400'
                        } flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group transition-all bg-slate-950/80 hover:bg-slate-900 shadow-lg`}
                      >
                        {brandLogoUrl ? (
                          <>
                            <img src={brandLogoUrl} alt="Host Logo" referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-2xl" />
                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1">
                              <Upload className="w-4 h-4 text-cyan-400" />
                              <span>Change Logo</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-2 text-center">
                            {uploadingLogo ? (
                              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                            ) : (
                              <>
                                <Shield className={`w-6 h-6 mb-1 text-cyan-400`} />
                                <span className={`text-[11px] font-bold text-white`}>+ Upload Logo</span>
                                <span className="text-[9px] text-slate-400">Tap to select</span>
                              </>
                            )}
                          </div>
                        )}
                      </label>

                      {brandLogoUrl && !uploadingLogo && (
                        <button
                          onClick={handleRemoveLogo}
                          className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full p-1.5 shadow-lg cursor-pointer transition-transform hover:scale-110 z-10"
                          title="Remove Logo"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-300 text-center font-medium">
                      Official Organization / Brand Logo
                    </p>
                  </div>
                </div>

                {/* Cover Photo Section */}
                <div className="space-y-2.5 bg-slate-900/80 p-3.5 rounded-xl border border-white/10 shadow-sm flex flex-col justify-between">
                  <div className="flex items-center justify-between">
                    <label className={`text-xs font-bold uppercase tracking-wider ${currentTheme.text} flex items-center gap-1.5`}>
                      <ImagePlus className="w-3.5 h-3.5" />
                      Cover Banner
                    </label>
                    <span className="text-[9px] text-slate-400 font-mono font-semibold px-1.5 py-0.5 rounded bg-white/5 border border-white/10">
                      16:6 Wide
                    </span>
                  </div>

                  <div className="flex flex-col gap-2 pt-1">
                    <div className="relative w-full">
                      <input
                        type="file"
                        id="modal-host-cover-upload"
                        accept="image/*"
                        onChange={handleCoverChange}
                        className="hidden"
                      />
                      <label
                        htmlFor="modal-host-cover-upload"
                        className={`w-full aspect-[16/7] rounded-xl border-2 border-dashed ${
                          brandCoverUrl ? 'border-transparent' : 'border-white/20 hover:border-white/40'
                        } flex flex-col items-center justify-center cursor-pointer overflow-hidden relative group transition-all bg-slate-950/80 hover:bg-slate-900 shadow-inner`}
                      >
                        {brandCoverUrl ? (
                          <>
                            <img src={brandCoverUrl} alt="Cover Banner" referrerPolicy="no-referrer" className="w-full h-full object-cover rounded-xl" />
                            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-bold gap-1">
                              <Upload className="w-4 h-4 text-cyan-400" />
                              <span>Change Cover</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex flex-col items-center justify-center p-2 text-center">
                            {uploadingCover ? (
                              <Loader2 className="w-6 h-6 animate-spin text-white" />
                            ) : (
                              <>
                                <ImagePlus className={`w-6 h-6 mb-1 text-slate-400`} />
                                <span className={`text-[11px] font-bold text-white`}>+ Upload Cover</span>
                                <span className="text-[9px] text-slate-400">Header Banner</span>
                              </>
                            )}
                          </div>
                        )}
                      </label>

                      {brandCoverUrl && !uploadingCover && (
                        <button
                          onClick={handleRemoveCover}
                          className="absolute -top-1.5 -right-1.5 bg-red-600 hover:bg-red-500 text-white rounded-full p-1.5 shadow-lg cursor-pointer transition-transform hover:scale-110 z-10"
                          title="Remove Cover"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="text-[10px] text-slate-300 text-center font-medium">
                      Host Studio Header Banner
                    </p>
                  </div>
                </div>
              </div>

              {/* Host Name Section */}
              <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-white/5">
                <label className={`text-xs font-bold uppercase tracking-wider ${currentTheme.text} flex justify-between items-center`}>
                  <span className="flex items-center gap-1.5">
                    <Edit3 className="w-3.5 h-3.5" />
                    Host Name
                  </span>
                  <span className="text-[10px] text-slate-400 normal-case font-normal">
                    {tempBrandName.length}/30
                  </span>
                </label>
                <div className="space-y-1">
                  <input
                    type="text"
                    maxLength={30}
                    value={tempBrandName}
                    onChange={(e) => setTempBrandName(e.target.value.replace(/[^\u0980-\u09FFa-zA-Z0-9 ]/g, '').slice(0, 30))}
                    placeholder="Enter Host Name..."
                    className="w-full bg-slate-800/80 border border-white/10 rounded-lg px-3 py-2 text-xs text-white outline-none focus:border-white/30"
                  />
                  {/* Host Name Availability Indicator */}
                  {tempBrandName.trim().length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1.5 text-[11px]">
                      {hostNameCheckStatus === 'checking' && (
                        <span className="text-slate-400 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Checking name availability...
                        </span>
                      )}
                      {hostNameCheckStatus === 'taken' && (
                        <span className="text-red-500 font-semibold flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 animate-pulse" />
                          This name not available
                        </span>
                      )}
                      {hostNameCheckStatus === 'available' && (
                        <span className="text-emerald-500 font-semibold flex items-center gap-1">
                          <Check className="w-3.5 h-3.5" />
                          This name is available
                        </span>
                      )}
                    </div>
                  )}
                  <p className="text-[10px] text-slate-400 pt-0.5">
                    * Max 30 characters. English/Bengali letters and spaces only.
                  </p>
                </div>
              </div>

              {/* Social Media Links Section */}
              <div className="space-y-3 bg-slate-900/60 p-4 rounded-xl border border-white/5">
                <label className={`text-xs font-bold uppercase tracking-wider ${currentTheme.text} flex items-center gap-1.5`}>
                  <Globe className="w-3.5 h-3.5" />
                  <span>Social Media Links</span>
                </label>
                <div className="space-y-2.5">
                  {/* Facebook */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5"><span className="text-[#1877F2]">Facebook</span> Page / Profile URL</span>
                      {facebookUrl.trim() && (
                        <span className={`text-[10px] font-bold ${validateSocialMediaLink('facebook', facebookUrl).isValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {validateSocialMediaLink('facebook', facebookUrl).isValid ? '✓ Valid Link' : '⚠ Invalid'}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={facebookUrl}
                      onChange={(e) => setFacebookUrl(e.target.value)}
                      placeholder="e.g. facebook.com/yourbrand or username"
                      className={`w-full bg-slate-800/80 border ${facebookUrl.trim() && !validateSocialMediaLink('facebook', facebookUrl).isValid ? 'border-rose-500/80 text-rose-200' : 'border-white/10 text-white'} rounded-lg px-3 py-2 text-xs outline-none focus:border-cyan-400 font-mono`}
                    />
                    {facebookUrl.trim() && !validateSocialMediaLink('facebook', facebookUrl).isValid && (
                      <p className="text-[10.5px] text-rose-400 font-semibold flex items-center gap-1 mt-1 font-mono bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md">
                        <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                        <span>{validateSocialMediaLink('facebook', facebookUrl).errorMessage}</span>
                      </p>
                    )}
                  </div>

                  {/* YouTube */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5"><span className="text-[#FF0000]">YouTube</span> Channel URL or Handle</span>
                      {youtubeUrl.trim() && (
                        <span className={`text-[10px] font-bold ${validateSocialMediaLink('youtube', youtubeUrl).isValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {validateSocialMediaLink('youtube', youtubeUrl).isValid ? '✓ Valid Link' : '⚠ Invalid'}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={youtubeUrl}
                      onChange={(e) => setYoutubeUrl(e.target.value)}
                      placeholder="e.g. youtube.com/@yourchannel or @yourchannel"
                      className={`w-full bg-slate-800/80 border ${youtubeUrl.trim() && !validateSocialMediaLink('youtube', youtubeUrl).isValid ? 'border-rose-500/80 text-rose-200' : 'border-white/10 text-white'} rounded-lg px-3 py-2 text-xs outline-none focus:border-cyan-400 font-mono`}
                    />
                    {youtubeUrl.trim() && !validateSocialMediaLink('youtube', youtubeUrl).isValid && (
                      <p className="text-[10.5px] text-rose-400 font-semibold flex items-center gap-1 mt-1 font-mono bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md">
                        <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                        <span>{validateSocialMediaLink('youtube', youtubeUrl).errorMessage}</span>
                      </p>
                    )}
                  </div>

                  {/* TikTok */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between mb-1">
                      <span className="flex items-center gap-1.5"><span className="text-[#00f2fe]">TikTok</span> Account URL or Username</span>
                      {tiktokUrl.trim() && (
                        <span className={`text-[10px] font-bold ${validateSocialMediaLink('tiktok', tiktokUrl).isValid ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {validateSocialMediaLink('tiktok', tiktokUrl).isValid ? '✓ Valid Link' : '⚠ Invalid'}
                        </span>
                      )}
                    </label>
                    <input
                      type="text"
                      value={tiktokUrl}
                      onChange={(e) => setTiktokUrl(e.target.value)}
                      placeholder="e.g. tiktok.com/@youraccount or @youraccount"
                      className={`w-full bg-slate-800/80 border ${tiktokUrl.trim() && !validateSocialMediaLink('tiktok', tiktokUrl).isValid ? 'border-rose-500/80 text-rose-200' : 'border-white/10 text-white'} rounded-lg px-3 py-2 text-xs outline-none focus:border-cyan-400 font-mono`}
                    />
                    {tiktokUrl.trim() && !validateSocialMediaLink('tiktok', tiktokUrl).isValid && (
                      <p className="text-[10.5px] text-rose-400 font-semibold flex items-center gap-1 mt-1 font-mono bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-md">
                        <AlertTriangle className="w-3 h-3 text-rose-400 shrink-0" />
                        <span>{validateSocialMediaLink('tiktok', tiktokUrl).errorMessage}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Theme Selector */}
              <div className="space-y-2 bg-slate-900/60 p-4 rounded-xl border border-white/5">
                <div className="flex justify-between items-center">
                  <label className={`text-xs font-bold uppercase tracking-wider ${currentTheme.text} flex items-center gap-1.5`}>
                    <Palette className="w-3.5 h-3.5" />
                    Theme Color
                  </label>
                  <button
                    onClick={handleShuffleTheme}
                    type="button"
                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[11px] font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <Palette className="w-3 h-3" />
                    <span>Shuffle</span>
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${currentTheme.badge}`}>
                    {currentTheme.name}
                  </span>
                </div>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={async () => {
                    const trimmed = tempBrandName.trim();
                    if (!trimmed) return;
                    if (hostNameCheckStatus === 'taken') {
                      alert("This name is already taken by another host. Please choose a unique name!");
                      return;
                    }
                    if (hostNameCheckStatus === 'checking') {
                      alert("Still checking name availability. Please wait.");
                      return;
                    }
                    const success = await handleSaveBrandName();
                    if (success) {
                      setShowProfileModal(false);
                    }
                  }}
                  disabled={savingBrandName || (tempBrandName.trim().length > 0 && hostNameCheckStatus === 'taken') || hostNameCheckStatus === 'checking'}
                  className={`px-4 py-2 ${
                    savingBrandName || (tempBrandName.trim().length > 0 && hostNameCheckStatus === 'taken') || hostNameCheckStatus === 'checking'
                      ? 'bg-slate-800 text-slate-500 border border-white/5 cursor-not-allowed'
                      : currentTheme.accentBg + ' text-white cursor-pointer'
                  } rounded-lg text-xs font-bold transition flex items-center gap-1.5 ${currentTheme.shadow}`}
                >
                  {savingBrandName ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  <span>Save Profile</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Co-Host Management Modal */}
      <AnimatePresence>
        {showCoHostModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className={`bg-[#090d22] border ${currentTheme.border} rounded-3xl p-5 sm:p-6 max-w-2xl w-full relative space-y-5 shadow-2xl ${currentTheme.shadow} my-auto max-h-[90vh] flex flex-col`}
            >
              {/* Header */}
              <div className="flex justify-between items-center border-b border-white/10 pb-3.5 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/30 rounded-2xl">
                    <Users className={`w-5 h-5 ${currentTheme.text}`} />
                  </div>
                  <div>
                    <h3 className="text-base sm:text-lg font-black text-white uppercase font-mono tracking-wider flex items-center gap-2">
                      <span>Co-Host & Staff Management</span>
                    </h3>
                    <p className="text-xs text-slate-400 font-sans">
                      Assign granular access rights and manage your tournament operations team
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowCoHostModal(false);
                    setEditingCoHost(null);
                  }}
                  className="text-slate-400 hover:text-white p-2 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Messages */}
              {error && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2 shrink-0">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {success && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs flex items-center gap-2 shrink-0">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{success}</span>
                </div>
              )}

              {/* Navigation Tabs */}
              {!editingCoHost && !editingDetailsCoHost && (
                <div className="flex items-center gap-2 bg-slate-950/80 p-1.5 rounded-2xl border border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setCoHostActiveTab('list')}
                    className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      coHostActiveTab === 'list'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <Users className="w-4 h-4" />
                    <span>Active Co-Hosts ({coHosts.length})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoHostActiveTab('add')}
                    className={`flex-1 py-2 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer ${
                      coHostActiveTab === 'add'
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <UserPlus className="w-4 h-4" />
                    <span>Add New Co-Host</span>
                  </button>
                </div>
              )}

              {/* Modal Body Container with Scroll */}
              <div className="flex-1 overflow-y-auto pr-1 space-y-4">
                {/* View 0: Edit Co-Host Info/Details Form */}
                {editingDetailsCoHost ? (
                  <form onSubmit={handleSaveCoHostDetails} className="space-y-4 bg-slate-900/80 p-4 sm:p-5 rounded-2xl border border-amber-500/30">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          Edit Co-Host Profile
                        </span>
                        <h4 className="text-sm font-black text-white mt-1">{editingDetailsCoHost.name}</h4>
                      </div>
                      <button
                        type="button"
                        onClick={() => setEditingDetailsCoHost(null)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-xl cursor-pointer"
                      >
                        Back to List
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-300 font-mono">Co-Host Name</label>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-300 font-mono">Registered PlayVear ID</label>
                        <input
                          type="email"
                          value={editIdentifier}
                          onChange={(e) => setEditIdentifier(e.target.value)}
                          className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-300 font-mono">Assigned Title / Role</label>
                      <select
                        value={editRole}
                        onChange={(e) => setEditRole(e.target.value)}
                        className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500/50"
                      >
                        <option value="Match Manager">Match Manager (Room & Results)</option>
                        <option value="Tournament Organizer">Tournament Organizer (Creation & Operations)</option>
                        <option value="Referee & Anti-Cheat">Referee & Anti-Cheat Officer</option>
                        <option value="Full Co-Host">Full Co-Host (All Access)</option>
                      </select>
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setEditingDetailsCoHost(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold font-mono transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={savingDetails}
                        className="px-5 py-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-slate-950 font-black rounded-xl text-xs font-mono transition flex items-center gap-2 cursor-pointer shadow-md"
                      >
                        {savingDetails ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving Changes...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Update Co-Host Info</span>
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                ) : editingCoHost ? (
                  /* View 1: Editing Existing Co-Host Permissions */
                  <div className="space-y-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-cyan-500/30">
                    <div className="flex items-center justify-between border-b border-white/10 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                            Editing Permissions
                          </span>
                          <span className="text-sm font-black text-white">{editingCoHost.name}</span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 font-mono">
                          {editingCoHost.identifier} • <span className={currentTheme.text}>{editingCoHost.role}</span>
                        </p>
                      </div>

                      <button
                        onClick={() => setEditingCoHost(null)}
                        className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-mono rounded-xl cursor-pointer"
                      >
                        Back to List
                      </button>
                    </div>

                    <CoHostPermissionsMatrix
                      permissions={editingPermissions}
                      onChange={setEditingPermissions}
                      themeColorClass={currentTheme.text}
                      themeAccentBg={currentTheme.accentBg}
                    />

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setEditingCoHost(null)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold font-mono transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleSaveEditingPermissions}
                        disabled={savingPermissions}
                        className={`px-5 py-2 ${currentTheme.accentBg} disabled:opacity-50 text-white rounded-xl text-xs font-bold font-mono transition flex items-center gap-2 ${currentTheme.shadow} cursor-pointer`}
                      >
                        {savingPermissions ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            <span>Saving...</span>
                          </>
                        ) : (
                          <>
                            <Check className="w-3.5 h-3.5" />
                            <span>Save Permissions</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : coHostActiveTab === 'add' ? (
                  /* View 2: Add New Co-Host Form */
                  <form onSubmit={handleAddCoHost} className="space-y-4 bg-slate-900/60 p-4 sm:p-5 rounded-2xl border border-white/5">
                    <h4 className={`text-xs font-bold uppercase tracking-wider ${currentTheme.text} flex items-center gap-1.5 font-mono`}>
                      <UserPlus className="w-4 h-4" />
                      Create & Authorize New Co-Host
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-300 font-mono">Co-Host Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Rahul Hasan"
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-500/50"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-slate-300 font-mono">Registered PlayVear ID</label>
                        <input
                          type="email"
                          placeholder="e.g. user@gmail.com"
                          value={identifier}
                          onChange={(e) => setIdentifier(e.target.value)}
                          className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-500/50"
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-slate-300 font-mono">Assigned Title / Role</label>
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full bg-slate-950/80 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white outline-none focus:border-cyan-500/50"
                      >
                        <option value="Match Manager">Match Manager (Room & Results)</option>
                        <option value="Tournament Organizer">Tournament Organizer (Creation & Operations)</option>
                        <option value="Referee & Anti-Cheat">Referee & Anti-Cheat Officer</option>
                        <option value="Full Co-Host">Full Co-Host (All Access)</option>
                      </select>
                    </div>

                    {/* Permissions Matrix for new co-host */}
                    <div className="pt-2">
                      <CoHostPermissionsMatrix
                        permissions={newCoHostPermissions}
                        onChange={setNewCoHostPermissions}
                        themeColorClass={currentTheme.text}
                        themeAccentBg={currentTheme.accentBg}
                      />
                    </div>

                    <div className="pt-2 flex items-center justify-end gap-2 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => setCoHostActiveTab('list')}
                        className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold font-mono transition cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={submitting}
                        className={`px-5 py-2.5 ${currentTheme.accentBg} disabled:opacity-50 text-white rounded-xl text-xs font-bold font-mono transition flex items-center gap-2 ${currentTheme.shadow} cursor-pointer`}
                      >
                        <UserPlus className="w-4 h-4" />
                        {submitting ? 'Creating Co-Host...' : 'Confirm & Add Co-Host'}
                      </button>
                    </div>
                  </form>
                ) : (
                  /* View 3: Active Co-Hosts List */
                  <div className="space-y-3">
                    {/* Search filter */}
                    {coHosts.length > 2 && (
                      <div className="relative">
                        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search co-hosts by name or registered email..."
                          value={coHostSearchTerm}
                          onChange={(e) => setCoHostSearchTerm(e.target.value)}
                          className="w-full bg-slate-900/90 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white outline-none focus:border-cyan-500/40"
                        />
                      </div>
                    )}

                    {loading ? (
                      <div className="text-center py-10 text-xs text-slate-400 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                        <span>Loading co-hosts team...</span>
                      </div>
                    ) : coHosts.length === 0 ? (
                      <div className="text-center py-12 bg-slate-900/40 rounded-2xl border border-white/5 space-y-3">
                        <div className="w-12 h-12 bg-slate-800/80 border border-white/10 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
                          <Users className="w-6 h-6" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">No Co-Hosts Assigned Yet</p>
                          <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                            Add trusted managers or referees to assist with tournament operations and room management.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setCoHostActiveTab('add')}
                          className={`px-4 py-2 ${currentTheme.accentBg} text-white rounded-xl text-xs font-mono font-bold cursor-pointer inline-flex items-center gap-1.5`}
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                          <span>Add First Co-Host</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Scroll hint for mobile screens */}
                        <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono px-1">
                          <span>Co-Hosts List ({coHosts.filter(c => {
                            if (!coHostSearchTerm.trim()) return true;
                            const term = coHostSearchTerm.toLowerCase();
                            return (
                              c.name?.toLowerCase().includes(term) ||
                              c.identifier?.toLowerCase().includes(term) ||
                              c.role?.toLowerCase().includes(term)
                            );
                          }).length})</span>
                          <span className="text-[10px] text-cyan-400/80 sm:hidden flex items-center gap-1">
                            <span>Slide horizontally for full controls</span>
                            <span>→</span>
                          </span>
                        </div>

                        {/* Table layout container with horizontal scroll */}
                        <div className="w-full overflow-x-auto rounded-2xl border border-white/10 bg-slate-900/90 shadow-xl custom-scrollbar">
                          <table className="w-full text-left border-collapse min-w-[760px]">
                            <thead>
                              <tr className="bg-slate-950/90 border-b border-white/10 text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-400">
                                <th className="py-3 px-3.5">Co-Host Profile</th>
                                <th className="py-3 px-3.5">Registered PlayVear ID</th>
                                <th className="py-3 px-3.5">Role / Title</th>
                                <th className="py-3 px-3.5">Status</th>
                                <th className="py-3 px-3.5">Access Level</th>
                                <th className="py-3 px-3.5 text-right">Management Options</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5 text-xs font-mono">
                              {coHosts
                                .filter((c) => {
                                  if (!coHostSearchTerm.trim()) return true;
                                  const term = coHostSearchTerm.toLowerCase();
                                  return (
                                    c.name?.toLowerCase().includes(term) ||
                                    c.identifier?.toLowerCase().includes(term) ||
                                    c.role?.toLowerCase().includes(term)
                                  );
                                })
                                .map((coHost) => {
                                  const perms = coHost.permissions || {};
                                  const enabledCount = CO_HOST_PERMISSIONS.filter(p => Boolean(perms[p.key])).length;
                                  const totalCount = CO_HOST_PERMISSIONS.length;
                                  const isSuspended = coHost.status === 'suspended';

                                  return (
                                    <tr
                                      key={coHost.id}
                                      className={`transition-colors hover:bg-slate-800/40 ${
                                        isSuspended ? 'bg-rose-950/10' : ''
                                      }`}
                                    >
                                      {/* Col 1: Profile Picture & Name */}
                                      <td className="py-3 px-3.5 whitespace-nowrap">
                                        <div className="flex items-center gap-2.5">
                                          <div className="relative shrink-0">
                                            {coHost.photoURL ? (
                                              <img
                                                src={coHost.photoURL}
                                                alt={coHost.name}
                                                className={`w-9 h-9 rounded-xl object-cover border-2 shadow-sm ${
                                                  isSuspended ? 'border-rose-500/50 grayscale' : 'border-cyan-400/80 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                                                }`}
                                              />
                                            ) : (
                                              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center font-mono font-bold text-xs uppercase ${
                                                isSuspended
                                                  ? 'bg-rose-950/80 border-rose-500/40 text-rose-300'
                                                  : 'bg-gradient-to-br from-cyan-950 to-blue-950 border-cyan-400/80 text-cyan-300'
                                              }`}>
                                                {coHost.name?.charAt(0)?.toUpperCase() || 'C'}
                                              </div>
                                            )}
                                            <span className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border border-slate-950 ${
                                              isSuspended ? 'bg-rose-500' : 'bg-emerald-400'
                                            }`} />
                                          </div>
                                          <div>
                                            <span className="font-bold text-white text-xs block tracking-wide">{coHost.name}</span>
                                          </div>
                                        </div>
                                      </td>

                                      {/* Col 2: Registered PlayVear ID */}
                                      <td className="py-3 px-3.5 whitespace-nowrap">
                                        <span className="text-cyan-300 select-all font-medium text-xs">
                                          {coHost.identifier}
                                        </span>
                                      </td>

                                      {/* Col 3: Role / Title */}
                                      <td className="py-3 px-3.5 whitespace-nowrap">
                                        <span className="px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase bg-cyan-500/10 text-cyan-300 border border-cyan-500/30">
                                          {coHost.role}
                                        </span>
                                      </td>

                                      {/* Col 4: Status */}
                                      <td className="py-3 px-3.5 whitespace-nowrap">
                                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase inline-flex items-center gap-1 border ${
                                          isSuspended
                                            ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                                        }`}>
                                          {isSuspended ? (
                                            <>
                                              <Ban className="w-2.5 h-2.5 text-rose-400" />
                                              <span>Suspended</span>
                                            </>
                                          ) : (
                                            <>
                                              <CheckCircle className="w-2.5 h-2.5 text-emerald-400" />
                                              <span>Active</span>
                                            </>
                                          )}
                                        </span>
                                      </td>

                                      {/* Col 5: Access Level */}
                                      <td className="py-3 px-3.5 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                          <span className={`font-mono text-[10.5px] font-bold ${
                                            isSuspended ? 'text-slate-500 line-through' : 'text-slate-300'
                                          }`}>
                                            {isSuspended ? 'Paused' : `${enabledCount}/${totalCount}`}
                                          </span>
                                          {!isSuspended && (
                                            <div className="w-14 h-1.5 bg-slate-800 rounded-full overflow-hidden shrink-0">
                                              <div
                                                className="h-full bg-cyan-500 rounded-full"
                                                style={{ width: `${(enabledCount / totalCount) * 100}%` }}
                                              />
                                            </div>
                                          )}
                                        </div>
                                      </td>

                                      {/* Col 6: Actions (Edit Perms, Edit Info, Suspend/Reactivate) - NO DELETE BUTTON */}
                                      <td className="py-3 px-3.5 text-right whitespace-nowrap">
                                        <div className="flex items-center justify-end gap-1.5">
                                          {/* Edit Permissions Button */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingCoHost(coHost);
                                              setEditingPermissions(coHost.permissions || getDefaultCoHostPermissions(true));
                                            }}
                                            className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 hover:border-cyan-400 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                                            title="Manage Permissions"
                                          >
                                            <ShieldCheck className="w-3 h-3 text-cyan-400" />
                                            <span>Edit Perms</span>
                                          </button>

                                          {/* Edit Profile Info Button */}
                                          <button
                                            type="button"
                                            onClick={() => {
                                              setEditingDetailsCoHost(coHost);
                                              setEditName(coHost.name || '');
                                              setEditIdentifier(coHost.identifier || '');
                                              setEditRole(coHost.role || 'Match Manager');
                                            }}
                                            className="px-2.5 py-1 bg-slate-800/90 hover:bg-slate-700 text-slate-200 border border-white/10 hover:border-white/20 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95"
                                            title="Edit Profile Details"
                                          >
                                            <Edit3 className="w-3 h-3 text-amber-400" />
                                            <span>Edit Info</span>
                                          </button>

                                          {/* Suspend / Reactivate Button */}
                                          <button
                                            type="button"
                                            onClick={() => handleToggleSuspendCoHost(coHost)}
                                            disabled={togglingStatusId === coHost.id}
                                            className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer shadow-sm active:scale-95 border ${
                                              isSuspended
                                                ? 'bg-emerald-950/80 hover:bg-emerald-900 text-emerald-300 border-emerald-500/40 hover:border-emerald-400'
                                                : 'bg-amber-950/80 hover:bg-amber-900 text-amber-300 border-amber-500/40 hover:border-amber-400'
                                            }`}
                                            title={isSuspended ? 'Reactivate Co-Host' : 'Suspend Co-Host'}
                                          >
                                            {togglingStatusId === coHost.id ? (
                                              <Loader2 className="w-3 h-3 animate-spin" />
                                            ) : isSuspended ? (
                                              <>
                                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                                <span>Reactivate</span>
                                              </>
                                            ) : (
                                              <>
                                                <Ban className="w-3 h-3 text-amber-400" />
                                                <span>Suspend</span>
                                              </>
                                            )}
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Host Wallet Modal */}
      <AnimatePresence>
        {showHostWalletModal && (
          <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 15 }}
              className="bg-[#090d22] border border-cyan-500/30 rounded-2xl p-6 max-w-sm w-full relative shadow-2xl shadow-cyan-950/40 text-left"
            >
              <button
                onClick={() => {
                  setShowHostWalletModal(false);
                  setWalletError('');
                  setWalletSuccess('');
                }}
                className="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold"
              >
                &times;
              </button>
              
              <div className="flex items-center gap-2.5 mb-4 border-b border-white/5 pb-3">
                <Wallet className={`h-5 w-5 ${currentTheme.text}`} />
                <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">Host Wallet</h3>
              </div>

              <div className="bg-slate-950/80 p-4 rounded-xl border border-white/5 space-y-3 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Host Balance:</span>
                  <span className="text-lg font-black text-cyan-400 font-mono">{hostWallet.balance} Tokens</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Lock Status:</span>
                  <div className="flex items-center gap-1.5">
                    {hostWallet.isLocked ? (
                      <>
                        <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
                        <span className="text-xs font-black text-red-400 uppercase tracking-wider font-mono">LOCKED BY ADMIN</span>
                      </>
                    ) : (
                      <>
                        <div className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                        <span className="text-xs font-black text-green-400 uppercase tracking-wider font-mono">UNLOCKED</span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {hostWallet.isLocked ? (
                <p className="text-[10px] text-slate-400 bg-slate-950/40 border border-red-500/10 p-3 rounded-lg leading-relaxed mb-4">
                  🔒 Your host wallet is locked for active league security. You can only transfer tokens back to your main wallet once the System Admin approves/unlocks this wallet.
                </p>
              ) : (
                <div className="space-y-3 mb-4">
                  <div className="flex items-center justify-between">
                    <label className="block text-[10px] font-bold text-slate-300 uppercase tracking-wider">Transfer Out to Main Wallet</label>
                    <span className="text-[10px] text-cyan-400 font-mono font-bold">Max: {hostWallet.balance} Tokens</span>
                  </div>

                  {/* Quick +10% Increment & Percentage Shortcuts */}
                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <button
                      type="button"
                      onClick={() => {
                        const current = Number(walletTransferAmount) || 0;
                        const tenPercent = Math.max(1, Math.round(hostWallet.balance * 0.1));
                        const newVal = Math.min(hostWallet.balance, current + tenPercent);
                        setWalletTransferAmount(String(newVal));
                      }}
                      className="px-2.5 py-1 bg-cyan-950/80 hover:bg-cyan-900 text-cyan-300 border border-cyan-500/40 rounded-lg text-[10.5px] font-mono font-black flex items-center gap-1 transition-all active:scale-95 cursor-pointer shrink-0 shadow-sm"
                      title="Add +10% of total host balance"
                    >
                      <span>+10%</span>
                    </button>
                    {[25, 50, 75, 100].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          const val = pct === 100 ? hostWallet.balance : Math.round(hostWallet.balance * (pct / 100));
                          setWalletTransferAmount(String(val));
                        }}
                        className="px-2 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-white/10 rounded-lg text-[10px] font-mono font-bold transition-all active:scale-95 cursor-pointer shrink-0"
                      >
                        {pct === 100 ? 'MAX (100%)' : `${pct}%`}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="number"
                      placeholder="Amount"
                      value={walletTransferAmount}
                      onChange={e => setWalletTransferAmount(e.target.value)}
                      disabled={isTransferringWallet}
                      className="flex-1 bg-slate-950 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white font-mono font-bold outline-none focus:border-cyan-500/50"
                    />
                    <button
                      onClick={handleHostWalletTransferOut}
                      disabled={isTransferringWallet || !walletTransferAmount || Number(walletTransferAmount) <= 0}
                      className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg transition cursor-pointer"
                    >
                      {isTransferringWallet ? 'Transferring...' : 'Transfer'}
                    </button>
                  </div>
                </div>
              )}

              {walletError && (
                <div className="p-2.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-lg mb-3 font-semibold">
                  {walletError}
                </div>
              )}

              {walletSuccess && (
                <div className="p-2.5 bg-green-500/10 border border-green-500/20 text-green-400 text-xs rounded-lg mb-3 font-semibold">
                  {walletSuccess}
                </div>
              )}

              <button
                onClick={() => {
                  setShowHostWalletModal(false);
                  setWalletError('');
                  setWalletSuccess('');
                }}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition uppercase tracking-wider"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pending Leagues / Under Review Modal */}
      <AnimatePresence>
        {showPendingLeagueModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`bg-[#090d22] border ${currentTheme.border} rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto relative space-y-5 shadow-2xl ${currentTheme.shadow}`}
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3 sticky top-0 bg-[#090d22] z-10 pt-1">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Clock className={`w-5 h-5 ${currentTheme.text}`} />
                    <span>Pending Leagues (Under Review)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Leagues submitted to Administrator for review and verification
                  </p>
                </div>
                <button
                  onClick={() => setShowPendingLeagueModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingPendingLeagues ? (
                <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  <span>Loading pending leagues...</span>
                </div>
              ) : pendingLeagues.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/40 rounded-xl border border-white/5 space-y-2">
                  <FileText className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-slate-300 text-xs font-bold">No Pending Leagues under review</p>
                  <p className="text-slate-500 text-[11px]">All your leagues have been approved or you haven't generated a league yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingLeagues.map((league) => (
                    <div
                      key={league.id}
                      className="p-4 bg-slate-900/80 border border-white/10 rounded-xl space-y-3 relative hover:border-cyan-500/30 transition-all"
                    >
                      {/* Top Bar: League Number & Host Photo */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-3">
                          <img
                            src={league.hostPhotoUrl || userProfile?.photoURL || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&q=80'}
                            alt="Host Photo"
                            className="w-10 h-10 rounded-xl object-cover border border-cyan-500/30 shrink-0"
                          />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 uppercase">
                                League #{league.leagueNumber || '1001'}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                league.status === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse' :
                                'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {league.status === 'pending' ? 'Under Review by Admin' : league.status}
                              </span>
                            </div>
                            <h4 className="text-white font-bold text-sm mt-1">{league.leagueName}</h4>
                            {(league.hostUpazila || league.hostDistrict || userProfile?.upazila || userProfile?.district) && (
                              <p className="text-[10px] text-slate-400 mt-0.5 font-sans">
                                Host Location: <span className="text-emerald-400 font-bold">{league.hostUpazila || userProfile?.upazila || 'N/A'}, {league.hostDistrict || userProfile?.district || 'N/A'}</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Season</span>
                          <span className="text-xs font-bold text-cyan-400">S{league.seasonNumber}</span>
                        </div>
                      </div>

                      {/* Location & Who Can Join Section */}
                      <div className="bg-slate-950/60 p-3 rounded-lg border border-white/5 space-y-1.5 text-xs">
                        <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                          <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
                          <span>Location & Eligibility (Who Can Join):</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] text-slate-400 pt-1">
                          <div>
                            <span className="text-slate-500 font-bold">Allowed Region: </span>
                            <span className="text-white font-medium">
                              {league.locationRestrictionType === 'specific_division' ? `Division: ${league.allowedDivision}` :
                               league.locationRestrictionType === 'specific_district' ? `District: ${league.allowedDistrict} (${league.allowedDivision})` :
                               league.locationRestrictionType === 'specific_upazila' ? `Upazila: ${league.allowedUpazila} (${league.allowedDistrict})` :
                               'Anywhere in Bangladesh'}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 font-bold">Squad Limit Rule: </span>
                            <span className="text-cyan-300 font-medium">
                              {league.representationRule === 'one_squad_per_upazila' ? '1 Squad per Upazila' :
                               league.representationRule === 'one_squad_per_district' ? '1 Squad per District' :
                               league.representationRule === 'one_squad_per_division' ? '1 Squad per Division' :
                               'Multiple Squads Allowed (No Restriction)'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Prize Distribution Breakdown (Compact Single Row) */}
                      <div className="bg-slate-950/70 px-3 py-2 rounded-lg border border-white/5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold shrink-0">
                          <Trophy className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="uppercase tracking-wider">Prizes:</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-300">
                          <span className="whitespace-nowrap">
                            🏆 Champ: <strong className="text-amber-400 font-bold">{league.championPrize ?? Math.floor((league.prizePool || 0) * 0.5)} T</strong>
                          </span>
                          <span className="text-slate-600">|</span>
                          <span className="whitespace-nowrap">
                            🥈 Runner-Up: <strong className="text-slate-200 font-bold">{league.runnerUpPrize ?? Math.floor((league.prizePool || 0) * 0.3)} T</strong>
                          </span>
                          <span className="text-slate-600">|</span>
                          <span className="whitespace-nowrap">
                            🏅 Top 3: <strong className="text-cyan-300">#{1}: {league.topRank1Prize ?? league.top3Prizes?.[0] ?? Math.floor((league.prizePool || 0) * 0.1)} T</strong> • <strong className="text-cyan-300">#{2}: {league.topRank2Prize ?? league.top3Prizes?.[1] ?? Math.floor((league.prizePool || 0) * 0.06)} T</strong> • <strong className="text-cyan-300">#{3}: {league.topRank3Prize ?? league.top3Prizes?.[2] ?? Math.floor((league.prizePool || 0) * 0.04)} T</strong>
                          </span>
                        </div>
                      </div>

                      {/* Summary details */}
                      <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
                        <div>
                          Squads: <span className="text-white font-bold">{league.squadSize}</span> • Entry Fee: <span className="text-cyan-400 font-bold">{league.entryFee} T</span>
                        </div>
                        <div>
                          Prize Pool: <span className="text-yellow-400 font-bold">{league.prizePool} Tokens</span>
                        </div>
                      </div>


                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowPendingLeagueModal(false)}
                className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition uppercase tracking-wider"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pending Tournaments / Under Review Modal */}
      <AnimatePresence>
        {showPendingTournamentModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`bg-[#090d22] border ${currentTheme.border} rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto relative space-y-5 shadow-2xl ${currentTheme.shadow}`}
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3 sticky top-0 bg-[#090d22] z-10 pt-1">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Trophy className={`w-5 h-5 ${currentTheme.text}`} />
                    <span>Pending Tournaments (Under Review)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Tournaments submitted to Administrator for review and verification
                  </p>
                </div>
                <button
                  onClick={() => setShowPendingTournamentModal(false)}
                  className="text-slate-400 hover:text-white p-2 rounded-lg transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingPendingTournaments ? (
                <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  <span>Loading pending tournaments...</span>
                </div>
              ) : pendingTournaments.length === 0 ? (
                <div className="text-center py-10 bg-slate-900/40 rounded-xl border border-white/5 space-y-2">
                  <Trophy className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-slate-300 text-xs font-bold">No Pending Tournaments under review</p>
                  <p className="text-slate-500 text-[11px]">All your tournaments have been approved or you haven't generated one yet.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingTournaments.map((tournament) => (
                    <div
                      key={tournament.id}
                      className="p-4 bg-slate-900/80 border border-white/10 rounded-xl space-y-3 relative hover:border-cyan-500/30 transition-all"
                    >
                      {/* Top Bar: Tournament ID & Status */}
                      <div className="flex items-center justify-between border-b border-white/5 pb-3">
                        <div className="flex items-center gap-3">
                          <div className="p-2 bg-cyan-950/40 rounded-lg border border-cyan-500/20">
                            <Trophy className="w-5 h-5 text-cyan-400" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black font-mono bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 uppercase">
                                ID: {tournament.id}
                              </span>
                              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                tournament.status?.toLowerCase() === 'pending' ? 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 animate-pulse' :
                                'bg-red-500/10 text-red-400 border border-red-500/20'
                              }`}>
                                {tournament.status === 'Pending' ? 'Under Review' : tournament.status}
                              </span>
                            </div>
                            <h4 className="text-white font-bold text-sm mt-1">{tournament.title}</h4>
                            {tournament.isLocalVenue && tournament.localUpazilaDistrict ? (
                              <p className="text-[10px] text-slate-400 mt-0.5 font-sans">
                                Location restriction: <span className="text-emerald-400 font-bold">{tournament.localUpazilaDistrict}</span>
                              </p>
                            ) : (
                              <p className="text-[10px] text-slate-400 mt-0.5 font-sans">
                                Location: <span className="text-cyan-400 font-bold">Global / All over Bangladesh</span>
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-[10px] text-slate-400 block">Mode</span>
                          <span className="text-xs font-black text-cyan-400 uppercase font-mono">
                            {tournament.mode === 'squad' ? 'Squad BR' : 'Solo BR'}
                          </span>
                        </div>
                      </div>

                      {/* Info grid */}
                      <div className="grid grid-cols-2 gap-3 text-[11px] bg-slate-950/40 p-2.5 rounded-lg border border-white/5 font-mono text-slate-300">
                        <div>
                          <span className="text-slate-500 font-bold">Slots: </span>
                          <span className="text-white">
                            {tournament.mode === 'squad' ? `${tournament.maxSquads || 4} Squads (${(tournament.maxSquads || 4) * 4} Players)` : `${tournament.maxPlayers || 16} Players`}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold">Entry Fee: </span>
                          <span className="text-cyan-400 font-bold">🪙 {tournament.entryFee || 0} Tokens</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold">Total Prize: </span>
                          <span className="text-yellow-400 font-bold">🪙 {tournament.prizePool || 0} Tokens</span>
                        </div>
                        <div>
                          <span className="text-slate-500 font-bold">Deposit Paid: </span>
                          <span className="text-amber-400 font-bold">🪙 {tournament.walletTokens || 0} T ({tournament.depositPercentage || 10}%)</span>
                        </div>
                      </div>

                      {/* Prize Breakdown details */}
                      <div className="bg-slate-950/70 px-3 py-2 rounded-lg border border-white/5 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold shrink-0">
                          <Coins className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span className="uppercase tracking-wider">Prize Breakdown:</span>
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-[10px] text-slate-300">
                          <span className="whitespace-nowrap">
                            🏆 Booyah: <strong className="text-amber-400 font-bold">🪙 {tournament.booyahPrize || 0} T</strong>
                          </span>
                          <span className="text-slate-600">|</span>
                          <span className="whitespace-nowrap">
                            🥈 Runner-Up: <strong className="text-slate-200 font-bold">🪙 {tournament.runnerUpPrize || 0} T</strong>
                          </span>
                          <span className="text-slate-600">|</span>
                          <span className="whitespace-nowrap">
                            ⚔️ Per Kill: <strong className="text-cyan-300 font-bold">🪙 {tournament.perKill || 0} T</strong>
                          </span>
                        </div>
                      </div>

                      {/* Admin feedback if rejected */}
                      {tournament.status === 'Rejected' && tournament.rejectionReason && (
                        <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-lg text-[11px] text-rose-300 space-y-1">
                          <div className="font-bold uppercase tracking-wider flex items-center gap-1 text-rose-400 text-[10px]">
                            <span className="w-1.5 h-1.5 bg-rose-500 rounded-full inline-block animate-pulse" />
                            Admin Rejection Reason
                          </div>
                          <p className="font-sans italic">{tournament.rejectionReason}</p>
                        </div>
                      )}


                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={() => setShowPendingTournamentModal(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg transition uppercase tracking-wider cursor-pointer min-h-[44px]"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Lone Wolf Pending Match Modal */}
      <AnimatePresence>
        {showPendingLoneWolfModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#090d22] border border-cyan-500/40 rounded-3xl p-5 sm:p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto relative space-y-4 shadow-2xl text-slate-100 font-mono"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-white/10 pb-3 sticky top-0 bg-[#090d22] z-10 pt-1">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2 font-mono uppercase">
                    <Swords className="w-5 h-5 text-cyan-400" />
                    <span>Lone wolf Pending Match</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    View Lone Wolf matches under admin review or rejected by admin
                  </p>
                </div>
                <button
                  onClick={() => setShowPendingLoneWolfModal(false)}
                  className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-900/80 border border-white/10 transition-colors cursor-pointer"
                  aria-label="Close modal"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                <button
                  onClick={() => setPendingLoneWolfTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    pendingLoneWolfTab === 'all'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({pendingAndRejectedLoneWolf.length})
                </button>
                <button
                  onClick={() => setPendingLoneWolfTab('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    pendingLoneWolfTab === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Pending ({pendingOnlyLoneWolf.length})</span>
                </button>
                <button
                  onClick={() => setPendingLoneWolfTab('rejected')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 ${
                    pendingLoneWolfTab === 'rejected'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <XCircle className="w-3 h-3 text-rose-400" />
                  <span>Rejected ({rejectedOnlyLoneWolf.length})</span>
                </button>
              </div>

              {/* Matches List */}
              {(() => {
                const listToDisplay = pendingLoneWolfTab === 'pending' 
                  ? pendingOnlyLoneWolf 
                  : pendingLoneWolfTab === 'rejected' 
                  ? rejectedOnlyLoneWolf 
                  : pendingAndRejectedLoneWolf;

                if (listToDisplay.length === 0) {
                  return (
                    <div className="text-center py-10 bg-slate-900/40 rounded-2xl border border-white/5 space-y-2">
                      <Swords className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="text-slate-300 text-xs font-bold uppercase">No Lone Wolf matches in this status</p>
                      <p className="text-slate-500 text-[11px]">
                        Matches pending admin approval or rejected matches will appear here.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {listToDisplay.map((m: any) => {
                      const isRejected = m.approvalStatus === 'rejected' || (m.isApproved === false && m.status === 'Cancelled');

                      return (
                        <div
                          key={m.id}
                          className={`p-4 bg-slate-900/80 border ${
                            isRejected ? 'border-rose-500/40' : 'border-amber-500/40'
                          } rounded-2xl space-y-3 relative shadow-lg`}
                        >
                          {/* Top Row: Match ID & Status */}
                          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-cyan-950 text-cyan-400 border border-cyan-500/30 uppercase">
                                #{m.matchNumber || m.id.slice(-4)}
                              </span>
                              <h4 className="text-white font-bold text-sm uppercase">{m.title}</h4>
                              {m.weaponRule && (
                                <span className="text-[9.5px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                                  {m.weaponRule}
                                </span>
                              )}
                            </div>
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 ${
                              isRejected 
                                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40' 
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                            }`}>
                              {isRejected ? (
                                <>
                                  <XCircle className="w-3.5 h-3.5 text-rose-400" />
                                  <span>Rejected</span>
                                </>
                              ) : (
                                <>
                                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                                  <span>Under Review</span>
                                </>
                              )}
                            </span>
                          </div>

                          {/* Match Info */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-white/5 text-slate-300">
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">Match Date/Time</span>
                              <span className="text-white font-bold">{m.matchDate || 'N/A'} at {m.matchTime || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">Entry Fee</span>
                              <span className="text-cyan-400 font-bold">🪙 {m.entryFee} Tokens</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">Winner Prize</span>
                              <span className="text-yellow-400 font-bold">🪙 {m.prizePool} Tokens</span>
                            </div>
                          </div>

                          {/* Notice Box */}
                          <div className={`p-3 rounded-xl border text-xs leading-relaxed flex items-start gap-2.5 ${
                            isRejected 
                              ? 'bg-rose-950/40 border-rose-500/30 text-rose-200' 
                              : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                          }`}>
                            {isRejected ? (
                              <>
                                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="font-bold text-rose-300 block">Match Rejected by Administrator:</strong>
                                  <p className="text-[11px] mt-0.5 text-rose-200/90 font-sans">
                                    This Lone Wolf match was rejected by the admin. Your deposit of <span className="font-bold text-white">{m.walletTokens || m.prizePool} Tokens</span> has been refunded to your wallet balance.
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="font-bold text-amber-300 block">Pending Admin Approval (Under Review):</strong>
                                  <p className="text-[11px] mt-0.5 text-amber-200/90 font-sans">
                                    This match is under review by the Administrator. It will be published live once approved.
                                  </p>
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              })()}

              <button
                onClick={() => setShowPendingLoneWolfModal(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition uppercase tracking-wider cursor-pointer"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Subscription Details Modal */}
      <AnimatePresence>
        {showSubscriptionModal && (
          <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className={`bg-[#090d22] border ${currentTheme.border} rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto relative space-y-5 shadow-2xl ${currentTheme.shadow}`}
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-3 sticky top-0 bg-[#090d22] z-10 pt-1">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Award className={`w-5 h-5 ${currentTheme.text}`} />
                    <span>Host Subscription Details</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Your current subscription status, unlocked privileges & billing history
                  </p>
                </div>
                <button
                  onClick={() => setShowSubscriptionModal(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingSubscriptions ? (
                <div className="text-center py-10 text-slate-400 text-xs flex flex-col items-center gap-2">
                  <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
                  <span>Loading subscription details...</span>
                </div>
              ) : (
                <div className="space-y-5 text-left">
                  {/* Active Subscription Overview Card */}
                  <div className="p-4 bg-slate-900/90 border border-white/10 rounded-xl space-y-4">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/5 pb-3">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">Subscriber / Host</div>
                        <div className="text-base font-bold text-white flex items-center gap-2">
                          {userProfile?.displayName || 'Host User'}
                          <span className="text-xs font-normal text-slate-400">({userProfile?.email || 'N/A'})</span>
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          📍 {userProfile?.upazila || 'Upazila N/A'}, {userProfile?.district || 'District N/A'}
                        </div>
                      </div>
                      <div>
                        {isSubActive ? (
                          <span className="bg-green-500/20 text-green-400 border border-green-500/30 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-sm">
                            <Check className="w-4 h-4" /> Active Subscription
                          </span>
                        ) : (
                          <span className="bg-slate-800 text-slate-400 border border-slate-700 px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-400" /> Standard / Expired Host
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Subscription Specs */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3 bg-slate-950/60 rounded-lg border border-white/5">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Plan Type</div>
                        <div className="text-sm font-bold text-cyan-400 uppercase mt-0.5">
                          {activeSub?.type ? `${activeSub.type} HOST` : 'STANDARD FREE'}
                        </div>
                      </div>

                      <div className="p-3 bg-slate-950/60 rounded-lg border border-white/5">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Expires At</div>
                        <div className="text-xs font-bold text-white mt-0.5">
                          {activeSub?.expiresAt ? new Date(activeSub.expiresAt).toLocaleDateString() : 'N/A'}
                        </div>
                        {activeSub?.expiresAt && (
                          <div className="text-[10px] text-slate-400 font-mono">
                            {new Date(activeSub.expiresAt).toLocaleTimeString()}
                          </div>
                        )}
                      </div>

                      <div className="p-3 bg-slate-950/60 rounded-lg border border-white/5">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Subscribed At</div>
                        <div className="text-xs font-bold text-slate-200 mt-0.5">
                          {activeSub?.subscribedAt ? new Date(activeSub.subscribedAt).toLocaleDateString() : 'N/A'}
                        </div>
                        {activeSub?.tokensPaid && (
                          <div className="text-[10px] text-cyan-400 font-mono font-bold mt-0.5">
                            Cost: {activeSub.tokensPaid} Tokens
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Unlocked Privileges */}
                  <div className="p-4 bg-slate-900/60 border border-cyan-500/20 rounded-xl space-y-3">
                    <h4 className="text-xs font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-2">
                      <Shield className="w-4 h-4" /> Host Privileges & Access
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      <div className="flex items-center gap-2 text-slate-300">
                        <Check className="w-4 h-4 text-green-400 shrink-0" />
                        <span>Pro League Generation Access</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Check className="w-4 h-4 text-green-400 shrink-0" />
                        <span>Custom Room & Tournament Creation</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Check className="w-4 h-4 text-green-400 shrink-0" />
                        <span>Verified Upazila/District Host Status</span>
                      </div>
                      <div className="flex items-center gap-2 text-slate-300">
                        <Check className="w-4 h-4 text-green-400 shrink-0" />
                        <span>Priority Admin Review Queue</span>
                      </div>
                    </div>
                  </div>

                  {/* History Logs */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                      <Clock className="w-4 h-4 text-cyan-400" /> Subscription History
                    </h4>
                    {subscriptionList.length === 0 ? (
                      <div className="p-4 bg-slate-900/40 rounded-xl border border-white/5 text-center text-xs text-slate-500 italic">
                        No previous subscription records found in history.
                      </div>
                    ) : (
                      <div className="overflow-x-auto rounded-xl border border-white/5">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-900 text-[10px] uppercase text-slate-400 font-bold border-b border-white/5">
                              <th className="p-2.5">Plan</th>
                              <th className="p-2.5">Tokens Paid</th>
                              <th className="p-2.5">Subscribed Date</th>
                              <th className="p-2.5">Expiry Date</th>
                              <th className="p-2.5">Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subscriptionList.map((sub, idx) => {
                              const active = new Date(sub.expiresAt) > new Date();
                              return (
                                <tr key={sub.id || idx} className="border-b border-white/5 bg-slate-900/30 hover:bg-slate-900/60">
                                  <td className="p-2.5 font-bold uppercase text-cyan-400">{sub.type}</td>
                                  <td className="p-2.5 font-mono font-bold text-slate-200">{sub.tokensPaid || 0} T</td>
                                  <td className="p-2.5 text-slate-400">{sub.subscribedAt ? new Date(sub.subscribedAt).toLocaleDateString() : 'N/A'}</td>
                                  <td className="p-2.5 text-slate-400">{sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString() : 'N/A'}</td>
                                  <td className="p-2.5">
                                    {active ? (
                                      <span className="text-[10px] font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded border border-green-500/20">Active</span>
                                    ) : (
                                      <span className="text-[10px] font-bold text-slate-500 bg-slate-800 px-2 py-0.5 rounded border border-slate-700">Expired</span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              <button
                onClick={() => setShowSubscriptionModal(false)}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition uppercase tracking-wider"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {showWalletModalLeague && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-[#04060e]/90 backdrop-blur-sm" onClick={() => setShowWalletModalLeague(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-[#090d22] border border-white/10 w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(6,182,212,0.15)]"
          >
            <div className="flex justify-between items-center p-4 border-b border-white/5 bg-slate-800/50">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-cyan-400" />
                  LEAGUE WALLET
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-1">ID: {showWalletModalLeague.leagueNumber || showWalletModalLeague.id}</p>
              </div>
              <button onClick={() => setShowWalletModalLeague(null)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="bg-gradient-to-br from-[#090d22] to-slate-950 border border-white/10 rounded-2xl p-6 text-center shadow-lg relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 p-4">
                  <div className={`px-2 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${showWalletModalLeague.walletStatus === 'locked' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'bg-green-500/20 text-green-400 border border-green-500/30'}`}>
                    {showWalletModalLeague.walletStatus === 'locked' ? <AlertCircle className="w-3.5 h-3.5" /> : <Check className="w-3.5 h-3.5" />}
                    {showWalletModalLeague.walletStatus === 'locked' ? 'LOCKED' : 'UNLOCKED'}
                  </div>
                </div>
                
                <h4 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Available Balance</h4>
                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 font-mono drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  {showWalletModalLeague.walletBalance || 0}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-widest">Vortex Tokens</div>

                <div className="mt-6">
                  <button
                    onClick={() => {
                      handleTransferFromLeagueWallet(showWalletModalLeague);
                    }}
                    disabled={!!transferring || showWalletModalLeague.walletStatus === 'locked' || (showWalletModalLeague.walletBalance || 0) <= 0}
                    className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 mx-auto ${showWalletModalLeague.walletStatus === 'locked' ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' : 'bg-green-600 hover:bg-green-500 text-white shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:scale-105 cursor-pointer'}`}
                  >
                    {transferring === showWalletModalLeague.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                    {transferring === showWalletModalLeague.id ? 'Transferring...' : 'Transfer to Main Wallet'}
                  </button>
                  {showWalletModalLeague.walletStatus === 'locked' && (
                    <p className="text-xs text-red-400/80 mt-3 font-medium">This wallet is locked by Admin. Wait for unlock.</p>
                  )}
                </div>
              </div>

              <div className="bg-[#090d22] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 bg-slate-800/30">
                  <h4 className="font-bold text-white text-sm">Transaction History</h4>
                </div>
                <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
                  {isLoadingWallet ? (
                    <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin mb-2" />
                      Loading history...
                    </div>
                  ) : walletHistory.length === 0 ? (
                    <div className="p-8 text-center text-slate-500 text-sm">
                      No transactions found for this league wallet.
                    </div>
                  ) : (
                    walletHistory.map(tx => (
                      <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'income' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {tx.type === 'income' ? <Plus className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{tx.description}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{tx.userName || tx.userEmail || 'System'}</span>
                              <span className="w-1 h-1 bg-slate-600 rounded-full" />
                              <span>{tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString() : 'Just now'}</span>
                            </div>
                          </div>
                        </div>
                        <div className={`text-right font-mono font-black ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.type === 'income' ? '+' : '-'}{tx.amount}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {showWalletModalTourney && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="fixed inset-0 bg-[#04060e]/90 backdrop-blur-sm" onClick={() => setShowWalletModalTourney(null)} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="relative bg-[#090d22] border border-white/10 w-full max-w-2xl rounded-2xl overflow-hidden flex flex-col max-h-[85vh] shadow-[0_0_50px_rgba(6,182,212,0.15)]"
          >
            <div className="flex justify-between items-center p-4 border-b border-white/5 bg-slate-800/50">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-cyan-400" />
                  TOURNAMENT WALLET
                </h3>
                <p className="text-xs text-slate-400 font-mono mt-1">ID: TRN-{showWalletModalTourney.tournamentNumber || showWalletModalTourney.id}</p>
              </div>
              <button onClick={() => setShowWalletModalTourney(null)} className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
              <div className="bg-gradient-to-br from-[#090d22] to-slate-950 border border-white/10 rounded-2xl p-6 text-center shadow-lg relative overflow-hidden mb-6">
                <div className="absolute top-0 right-0 p-4">
                  {(() => {
                    const isUnlocked = showWalletModalTourney.walletStatus === 'unlocked' || showWalletModalTourney.walletStatus === 'active' || showWalletModalTourney.walletStatus === 'approved';
                    return (
                      <div className={`px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                        isUnlocked 
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' 
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}>
                        {isUnlocked ? <Unlock className="w-3.5 h-3.5" /> : <AlertCircle className="w-3.5 h-3.5" />}
                        {isUnlocked ? 'UNLOCKED' : (showWalletModalTourney.walletStatus ? showWalletModalTourney.walletStatus.toUpperCase() : 'DEPOSIT LOCKED')}
                      </div>
                    );
                  })()}
                </div>
                
                <h4 className="text-slate-400 text-sm font-bold uppercase tracking-widest mb-2">Available Tournament Balance</h4>
                <div className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 mb-2 font-mono drop-shadow-[0_0_15px_rgba(6,182,212,0.3)]">
                  {(() => {
                    const calculatedEntryFees = showWalletModalTourney.mode === 'squad'
                      ? ((showWalletModalTourney.joinedSquads?.length || 0) * (Number(showWalletModalTourney.entryFee) || 0))
                      : ((showWalletModalTourney.joinedPlayers?.length || showWalletModalTourney.joinedCount || 0) * (Number(showWalletModalTourney.entryFee) || 0));
                    return showWalletModalTourney.walletBalance !== undefined 
                      ? Number(showWalletModalTourney.walletBalance) 
                      : ((Number(showWalletModalTourney.walletTokens) || 0) + calculatedEntryFees);
                  })()}
                </div>
                <div className="text-xs text-slate-500 uppercase tracking-widest">Vortex Tokens</div>

                {/* Tournament Financial Breakdown Grid */}
                <div className="grid grid-cols-3 gap-2 mt-6 pt-4 border-t border-white/10 text-left">
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Host Security Deposit</span>
                    <span className="text-sm font-black text-amber-400 font-mono">🪙 {showWalletModalTourney.walletTokens || 0}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Entry Fees Collected</span>
                    <span className="text-sm font-black text-emerald-400 font-mono">
                      🪙 {showWalletModalTourney.mode === 'squad'
                        ? ((showWalletModalTourney.joinedSquads?.length || 0) * (Number(showWalletModalTourney.entryFee) || 0))
                        : ((showWalletModalTourney.joinedPlayers?.length || showWalletModalTourney.joinedCount || 0) * (Number(showWalletModalTourney.entryFee) || 0))}
                    </span>
                  </div>
                  <div className="bg-slate-900/60 p-2.5 rounded-xl border border-white/5">
                    <span className="text-[9px] text-slate-400 font-bold uppercase block">Prize Pool Target</span>
                    <span className="text-sm font-black text-cyan-400 font-mono">🪙 {showWalletModalTourney.prizePool || 0}</span>
                  </div>
                </div>

                <div className="mt-6">
                  {(() => {
                    const calculatedEntryFees = showWalletModalTourney.mode === 'squad'
                      ? ((showWalletModalTourney.joinedSquads?.length || 0) * (Number(showWalletModalTourney.entryFee) || 0))
                      : ((showWalletModalTourney.joinedPlayers?.length || showWalletModalTourney.joinedCount || 0) * (Number(showWalletModalTourney.entryFee) || 0));
                    const availBal = showWalletModalTourney.walletBalance !== undefined 
                      ? Number(showWalletModalTourney.walletBalance) 
                      : ((Number(showWalletModalTourney.walletTokens) || 0) + calculatedEntryFees);
                    const isUnlocked = showWalletModalTourney.walletStatus === 'unlocked' || showWalletModalTourney.walletStatus === 'active' || showWalletModalTourney.walletStatus === 'approved';
                    const isLocked = !isUnlocked;

                    return (
                      <>
                        <button
                          onClick={() => {
                            handleTransferFromTourneyWallet(showWalletModalTourney);
                          }}
                          disabled={!!transferring || isLocked || availBal <= 0}
                          className={`px-6 py-3 rounded-xl font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 mx-auto ${
                            isLocked || availBal <= 0 
                              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700' 
                              : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-105 cursor-pointer active:scale-95'
                          }`}
                        >
                          {transferring === showWalletModalTourney.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                          {transferring === showWalletModalTourney.id ? 'Transferring Tokens...' : 'Transfer to Main Wallet'}
                        </button>
                        {isLocked ? (
                          <p className="text-xs text-amber-400/80 mt-3 font-medium flex items-center justify-center gap-1.5">
                            <AlertCircle className="w-3.5 h-3.5" />
                            This tournament wallet is currently locked by Admin. Wait for unlock approval.
                          </p>
                        ) : availBal <= 0 ? (
                          <p className="text-xs text-slate-400 mt-3 font-medium flex items-center justify-center gap-1.5">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                            Wallet balance has been transferred to your Main Account.
                          </p>
                        ) : null}
                      </>
                    );
                  })()}
                </div>
              </div>

              <div className="bg-[#090d22] border border-white/5 rounded-2xl overflow-hidden">
                <div className="px-4 py-3 border-b border-white/5 bg-slate-800/30 flex items-center justify-between">
                  <h4 className="font-bold text-white text-sm">Transaction & Registration History</h4>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {showWalletModalTourney.mode === 'squad' 
                      ? `${showWalletModalTourney.joinedSquads?.length || 0} Squads Joined`
                      : `${showWalletModalTourney.joinedPlayers?.length || showWalletModalTourney.joinedCount || 0} Players Joined`}
                  </span>
                </div>
                <div className="divide-y divide-white/5 max-h-[300px] overflow-y-auto">
                  {isLoadingWallet ? (
                    <div className="p-8 text-center text-slate-500 flex flex-col items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin mb-2 text-cyan-400" />
                      Loading wallet records...
                    </div>
                  ) : walletHistory.length === 0 ? (
                    <div className="p-6 text-center text-slate-500 text-xs">
                      No explicit wallet history logs found. Current balance includes host deposit and entry fees.
                    </div>
                  ) : (
                    walletHistory.map(tx => (
                      <div key={tx.id} className="p-4 flex items-center justify-between hover:bg-white/5 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${tx.type === 'income' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {tx.type === 'income' ? <Plus className="w-5 h-5" /> : <Trash2 className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="text-sm font-bold text-white">{tx.description}</div>
                            <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                              <span>{tx.userName || tx.userEmail || 'System'}</span>
                              <span className="w-1 h-1 bg-slate-600 rounded-full" />
                              <span>{tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString() : 'Just now'}</span>
                            </div>
                          </div>
                        </div>
                        <div className={`text-right font-mono font-black ${tx.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                          {tx.type === 'income' ? '+' : '-'}{tx.amount}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}

      {/* Host Message Inbox Modal */}
      {showHostInboxModal && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-[#090d22] border border-cyan-500/40 rounded-3xl max-w-2xl w-full p-4 sm:p-6 text-left shadow-[0_0_50px_rgba(6,182,212,0.2)] relative flex flex-col max-h-[85vh]">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
                  <MessageSquare className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2 font-mono">
                    Host Messages Inbox
                    {unreadHostCount > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-full animate-pulse">
                        {unreadHostCount} Unread
                      </span>
                    )}
                  </h3>
                  <p className="text-xs text-slate-400">Incoming messages from players, support chats, and admin team</p>
                </div>
              </div>
              <button
                onClick={() => setShowHostInboxModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-white/10 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 py-3 border-b border-white/5 overflow-x-auto shrink-0 scrollbar-none">
              <button
                onClick={() => setInboxFilter('all')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${inboxFilter === 'all' ? 'bg-cyan-500 text-slate-950 shadow-[0_0_10px_rgba(6,182,212,0.4)]' : 'bg-slate-800/80 text-slate-400 hover:text-white'}`}
              >
                All Messages ({hostInboxMessages.length})
              </button>
              <button
                onClick={() => setInboxFilter('unread')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5 ${inboxFilter === 'unread' ? 'bg-rose-500 text-white shadow-[0_0_10px_rgba(244,63,94,0.4)]' : 'bg-slate-800/80 text-slate-400 hover:text-white'}`}
              >
                Unread ({unreadHostCount})
              </button>
              <button
                onClick={() => setInboxFilter('issues')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${inboxFilter === 'issues' ? 'bg-amber-500 text-slate-950 shadow-[0_0_10px_rgba(245,158,11,0.4)]' : 'bg-slate-800/80 text-slate-400 hover:text-white'}`}
              >
                Match Issues & Support
              </button>
              <button
                onClick={() => setInboxFilter('direct')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${inboxFilter === 'direct' ? 'bg-purple-500 text-white shadow-[0_0_10px_rgba(168,85,247,0.4)]' : 'bg-slate-800/80 text-slate-400 hover:text-white'}`}
              >
                Direct Admin
              </button>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1 scrollbar-thin scrollbar-thumb-cyan-500/20 scrollbar-track-transparent">
              {(() => {
                const filtered = hostInboxMessages.filter((msg) => {
                  if (inboxFilter === 'unread') return msg.status === 'unread' && msg.senderId !== hostId;
                  if (inboxFilter === 'issues') return msg.type === 'match_issue' || msg.type === 'match_support';
                  if (inboxFilter === 'direct') return msg.type === 'suspension_appeal' || msg.type === 'host_notice' || !msg.sourceContext?.matchId;
                  return true;
                });

                if (filtered.length === 0) {
                  return (
                    <div className="py-12 text-center text-slate-500 font-mono text-xs space-y-2">
                      <Inbox className="w-8 h-8 mx-auto text-slate-600 opacity-60" />
                      <p>No messages found in this view.</p>
                    </div>
                  );
                }

                return filtered.map((msg) => {
                  const isUnread = msg.status === 'unread' && msg.senderId !== hostId;
                  const hasSourceMatch = Boolean(msg.sourceContext?.leagueId);

                  return (
                    <div
                      key={msg.id}
                      className={`p-4 rounded-2xl border transition-all space-y-3 relative ${isUnread ? 'bg-cyan-950/20 border-cyan-500/60 shadow-[0_0_15px_rgba(6,182,212,0.15)]' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'}`}
                    >
                      {/* Message Header info */}
                      <div className="flex items-start justify-between gap-3 border-b border-white/5 pb-2.5">
                        <div className="flex items-center gap-2.5">
                          {msg.senderPhoto ? (
                            <img src={msg.senderPhoto} alt={msg.senderName} className="w-8 h-8 rounded-full object-cover border border-cyan-500/40" />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-cyan-400 font-bold text-xs">
                              {(msg.senderName || 'U')[0].toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-white">{msg.senderName || 'User / Admin'}</span>
                              <span className={`px-1.5 py-0.2 rounded text-[9px] font-bold font-mono uppercase ${msg.type === 'match_issue' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : msg.type === 'match_support' ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30' : msg.type === 'suspension_appeal' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'}`}>
                                {msg.type === 'match_issue' ? 'MATCH ISSUE' : msg.type === 'match_support' ? 'MATCH SUPPORT' : msg.type === 'suspension_appeal' ? 'APPEAL' : 'NOTICE'}
                              </span>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono">
                              {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleString() : 'Recently'}
                            </span>
                          </div>
                        </div>

                        {/* Status tag */}
                        <div className="flex items-center gap-2 shrink-0">
                          {isUnread && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30 animate-pulse">
                              NEW UNREAD
                            </span>
                          )}
                          {msg.status === 'replied' && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                              REPLIED
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Source Content Banner & Visit Source Button */}
                      {hasSourceMatch && (
                        <div className="bg-slate-950/80 border border-cyan-500/30 rounded-xl p-3 flex items-center justify-between gap-3 shadow-inner">
                          <div className="min-w-0">
                            <span className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest block font-mono">Source Content Location</span>
                            <p className="text-xs text-slate-200 font-mono truncate">
                              League: <span className="text-cyan-300 font-bold">{msg.sourceContext?.leagueId?.slice(0, 10)}...</span>
                              {msg.sourceContext?.matchId && (
                                <> • Match Card: <span className="text-amber-300 font-bold">#{msg.sourceContext.matchId}</span></>
                              )}
                            </p>
                          </div>
                          
                          <button
                            onClick={() => handleVisitSourceContent(msg)}
                            className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-[0_0_12px_rgba(6,182,212,0.3)] shrink-0 active:scale-95"
                          >
                            <span>Visit Source</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* Main Message Body */}
                      <div className="bg-slate-950/50 p-3 rounded-xl border border-white/5 font-sans text-xs text-slate-200 leading-relaxed">
                        {msg.message}
                      </div>

                      {/* Replies Conversation Thread */}
                      {msg.replies && msg.replies.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-white/5">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Replies Thread ({msg.replies.length})</span>
                          <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                            {msg.replies.map((reply: any, idx: number) => (
                              <div
                                key={idx}
                                className={`p-2.5 rounded-xl text-xs font-sans ${reply.isAdmin ? 'bg-cyan-950/40 border border-cyan-500/30 text-cyan-100' : reply.isHost ? 'bg-blue-950/40 border border-blue-500/30 text-blue-100 ml-4' : 'bg-slate-800/60 border border-slate-700 text-slate-200 mr-4'}`}
                              >
                                <div className="flex items-center justify-between text-[9px] font-mono text-slate-400 mb-1">
                                  <span className="font-bold text-white">{reply.senderName || (reply.isAdmin ? 'System Admin' : reply.isHost ? 'Host' : 'User')}</span>
                                  <span>{reply.createdAt ? new Date(reply.createdAt).toLocaleString() : ''}</span>
                                </div>
                                <p>{reply.message}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Reply Form */}
                      <div className="pt-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={replyInputMap[msg.id] || ''}
                          onChange={(e) => setReplyInputMap(prev => ({ ...prev, [msg.id]: e.target.value }))}
                          placeholder="Type a reply to this thread..."
                          className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500/60 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono placeholder:text-slate-600"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSendHostReply(msg);
                          }}
                        />
                        <button
                          onClick={() => handleSendHostReply(msg)}
                          disabled={!replyInputMap[msg.id]?.trim() || isReplyingMap[msg.id]}
                          className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 transition-all cursor-pointer disabled:opacity-50 shrink-0"
                        >
                          {isReplyingMap[msg.id] ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          <span>Reply</span>
                        </button>
                      </div>

                    </div>
                  );
                });
              })()}
            </div>

            {/* Modal Bottom: Quick Direct Message to Admin */}
            <div className="pt-4 border-t border-white/10 shrink-0 mt-auto space-y-2">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block font-mono">Send Direct Support Message to Admin</span>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={directMsgText}
                  onChange={(e) => setDirectMsgText(e.target.value)}
                  placeholder="Ask admin team or submit notice..."
                  className="flex-1 bg-slate-950 border border-slate-800 focus:border-cyan-500 rounded-xl px-4 py-2.5 text-xs text-white outline-none font-mono placeholder:text-slate-600"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleSendDirectToAdmin();
                  }}
                />
                <button
                  onClick={handleSendDirectToAdmin}
                  disabled={!directMsgText.trim() || isSendingDirect}
                  className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                >
                  {isSendingDirect ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  <span>Send Admin</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Set Room ID & Password Modal in ProHostPanel */}
      {roomDetailsTournament && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[99999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-cyan-500/50 rounded-2xl p-4 sm:p-6 w-full max-w-md space-y-4 shadow-[0_0_50px_rgba(6,182,212,0.3)] relative my-auto z-[99999]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Key className="w-5 h-5 text-cyan-400 shrink-0" />
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono">
                  Set Room ID & Password
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRoomDetailsTournament(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Brief info */}
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1">
              <p className="text-xs text-slate-300 font-mono">
                Tournament: <span className="text-cyan-400 font-bold">{roomDetailsTournament.title}</span>
              </p>
              <p className="text-[10px] text-slate-400 font-mono">
                TRN #{roomDetailsTournament.tournamentNumber || '101'} • {roomDetailsTournament.mode === 'squad' ? 'Squad BR' : 'Solo BR'}
              </p>
            </div>

            {hostRoomError && (
              <div className="bg-red-950/80 border border-red-500/80 rounded-xl p-2.5 text-xs text-red-200 flex items-center gap-2 font-mono">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{hostRoomError}</span>
              </div>
            )}

            <div className="space-y-3 font-mono text-xs">
              <div>
                <label className="block text-[11px] text-cyan-300 font-bold uppercase mb-1">Room ID</label>
                <input
                  type="text"
                  value={hostRoomId}
                  onChange={(e) => {
                    setHostRoomId(e.target.value);
                    if (hostRoomError) setHostRoomError(null);
                  }}
                  placeholder="e.g. 5839201"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2.5 text-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-cyan-300 font-bold uppercase mb-1">Room Password</label>
                <input
                  type="text"
                  value={hostRoomPass}
                  onChange={(e) => {
                    setHostRoomPass(e.target.value);
                    if (hostRoomError) setHostRoomError(null);
                  }}
                  placeholder="e.g. 1234"
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2.5 text-white font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] text-cyan-300 font-bold uppercase mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-red-400">
                    <Video className="w-3.5 h-3.5 text-red-500" />
                    YouTube Live Link *
                  </span>
                  <span className="text-[10px] text-amber-400 font-normal lowercase">(Mandatory)</span>
                </label>
                <input
                  type="url"
                  value={hostYoutubeLink}
                  onChange={(e) => {
                    setHostYoutubeLink(e.target.value);
                    if (hostRoomError) setHostRoomError(null);
                  }}
                  placeholder="e.g. https://www.youtube.com/watch?v=..."
                  className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded-xl px-3 py-2.5 text-white outline-none font-mono text-xs"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  A YouTube Live Link must be provided to save the Room ID & Password.
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRoomDetailsTournament(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveHostRoomDetails}
                disabled={isSavingHostRoom}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isSavingHostRoom ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-white" />
                    <span>Save & Publish</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Move to Ongoing Confirmation Modal in ProHostPanel */}
      {confirmingOngoingTourney && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-slate-900 border border-amber-500/50 rounded-2xl p-4 sm:p-6 w-full max-w-md space-y-4 shadow-[0_0_50px_rgba(245,158,11,0.25)] relative my-auto z-[9999]"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Play className="w-5 h-5 text-amber-400 fill-amber-400 shrink-0 animate-pulse" />
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono">
                  Confirm Move to Ongoing
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmingOngoingTourney(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tournament Details Brief */}
            <div className="bg-slate-950/90 p-3.5 rounded-xl border border-amber-500/30 space-y-2 text-xs font-mono">
              <div className="flex justify-between items-start gap-2">
                <h4 className="text-sm font-black text-white">{confirmingOngoingTourney.title}</h4>
                <span className="text-[10px] text-amber-400 font-bold bg-amber-950 px-2 py-0.5 rounded border border-amber-500/30 shrink-0">
                  TRN #{confirmingOngoingTourney.tournamentNumber || '101'}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-300 pt-1.5 border-t border-white/10">
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Mode</span>
                  <span className="font-bold text-cyan-300">
                    {confirmingOngoingTourney.mode === 'squad' ? 'Squad BR' : 'Solo BR'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 text-[10px] uppercase block">Current Status</span>
                  <span className="font-bold text-amber-400 uppercase">
                    {confirmingOngoingTourney.status || 'Open'}
                  </span>
                </div>
              </div>
            </div>

            {/* Notice Message */}
            <div className="bg-amber-950/60 border border-amber-500/40 p-3 rounded-xl space-y-1 text-center">
              <p className="text-xs text-amber-200 font-bold font-mono">
                Are you sure you want to change this tournament's status to "Ongoing"?
              </p>
              <p className="text-[11px] text-slate-400">
                This match will be moved to the Ongoing tab immediately for all players and hosts.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={() => setConfirmingOngoingTourney(null)}
                className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  await handleSetTournamentStatus(confirmingOngoingTourney.id, 'Ongoing');
                  setConfirmingOngoingTourney(null);
                }}
                className="flex-1 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Play className="w-4 h-4 text-slate-950 fill-slate-950 shrink-0" />
                <span>Confirm & Set Ongoing</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Set Result Modal */}
      {resultSetTournament && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-[9999] flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`bg-slate-900 border ${isReviewingResults ? 'border-cyan-500/50' : 'border-emerald-500/50'} rounded-2xl p-4 sm:p-6 w-[98vw] max-w-[98vw] space-y-4 shadow-2xl relative my-auto z-[9999] max-h-[95vh] flex flex-col transition-all duration-300`}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 pb-3 shrink-0">
              <div className="flex items-center gap-2">
                {isReviewingResults ? (
                  <Eye className="w-5 h-5 text-cyan-400 shrink-0 animate-pulse" />
                ) : (
                  <Award className="w-5 h-5 text-emerald-400 shrink-0 animate-pulse" />
                )}
                <h3 className="text-sm sm:text-base font-black text-white uppercase tracking-wider font-mono">
                  {isReviewingResults ? 'Reconfirm & Verify Results' : `Set Match Result (${resultSetTournament.mode === 'solo' ? 'Solo Mode' : 'Squad Mode'})`}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (isReviewingResults) {
                    setIsReviewingResults(false);
                  } else {
                    setResultSetTournament(null);
                  }
                }}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition-colors cursor-pointer"
              >
                {isReviewingResults ? <ArrowLeft className="w-4 h-4" /> : <X className="w-4 h-4" />}
              </button>
            </div>

            {isReviewingResults ? (
              /* Review / Reconfirmation View */
              <div className="flex-1 flex flex-col gap-4 overflow-hidden">
                <div className="bg-cyan-500/10 border border-cyan-500/30 p-3 rounded-xl text-[11px] text-cyan-200 font-mono flex items-center justify-between">
                  <div>
                    <p className="font-bold uppercase flex items-center gap-2 text-cyan-300">
                      <ShieldCheck className="w-4 h-4 text-cyan-400" />
                      Reconfirm & Verify Results Before Submission (ফলাফল পুনর্যাচাই)
                    </p>
                    <p className="mt-1 text-[10px] opacity-80">
                      Please carefully review squad names, cover photos, member gamertags, kills, and damage before final submission to admin review.
                    </p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar">
                  {resultSetTournament.mode === 'solo' ? (
                    resultSetData.map((p, idx) => (
                      <div key={p.id} className="bg-slate-950 border border-white/5 p-3 rounded-xl flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="text-[10px] font-mono text-slate-500 w-4">{idx + 1}.</span>
                          <img src={p.avatar} alt="" className="w-8 h-8 rounded-lg object-cover border border-white/10 shrink-0" />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-white truncate">{p.gameName}</p>
                            <p className="text-[10px] text-slate-500 truncate">{p.name}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6 shrink-0 font-mono">
                          <div className="text-center">
                            <p className="text-[9px] text-slate-500 uppercase">Kills</p>
                            <p className="text-sm font-black text-cyan-400">{p.kills}</p>
                          </div>
                          <div className="text-center">
                            <p className="text-[9px] text-slate-500 uppercase">Damage</p>
                            <p className="text-sm font-black text-emerald-400">{p.damage}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  ) : (
                    resultSetSquads.map((sqd, idx) => (
                      <div key={sqd.id} className="bg-slate-950 border border-slate-800/90 hover:border-cyan-500/40 p-3.5 rounded-2xl space-y-3 shadow-xl transition-all">
                        {/* Squad Cover Photo / Logo & Name Header */}
                        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/90 p-3 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3 min-w-0">
                            <img 
                              src={sqd.logo} 
                              alt={sqd.name} 
                              className="w-12 h-12 rounded-xl object-cover border-2 border-cyan-500/40 shrink-0 shadow-md" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="text-xs font-black text-white truncate tracking-wide">{sqd.name}</p>
                                <span className="text-[9px] font-mono font-bold bg-cyan-950 text-cyan-400 px-2 py-0.5 rounded border border-cyan-500/30 shrink-0">
                                  Squad #{idx + 1}
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                                <span>Leader: <strong className="text-slate-200">{sqd.leaderName}</strong></span>
                              </p>
                            </div>
                          </div>

                          {/* Total Squad Kills & Damage Summary */}
                          <div className="flex items-center gap-3 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 font-mono shrink-0">
                            <div className="text-center">
                              <span className="text-[8px] uppercase font-bold text-slate-400 block">Total Kills</span>
                              <span className="text-xs font-black text-cyan-400">{sqd.kills}</span>
                            </div>
                            <div className="w-px h-5 bg-slate-800" />
                            <div className="text-center">
                              <span className="text-[8px] uppercase font-bold text-slate-400 block">Total Damage</span>
                              <span className="text-xs font-black text-emerald-400">{sqd.damage}</span>
                            </div>
                          </div>
                        </div>

                        {/* Member Details List View: Profile Picture, Game Name, Individual Kills & Damage */}
                        <div className="bg-slate-900/80 p-3 rounded-xl border border-white/5 space-y-2.5">
                          <p className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                            <Users className="w-3.5 h-3.5 text-cyan-400" />
                            Squad Members Breakdown — Check Individual Kills & Damage ({sqd.members?.length || 0})
                          </p>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                            {sqd.members && sqd.members.length > 0 ? (
                              sqd.members.map((m: any, mIdx: number) => (
                                <div key={mIdx} className="bg-slate-950 border border-slate-800 p-2.5 rounded-xl flex items-center justify-between gap-3 shadow-md">
                                  <div className="flex items-center gap-2.5 min-w-0">
                                    <img 
                                      src={m.avatar || m.avatarUrl || m.photoURL || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150'} 
                                      alt="" 
                                      className="w-9 h-9 rounded-full object-cover border-2 border-cyan-500/50 shrink-0 shadow-sm" 
                                      referrerPolicy="no-referrer"
                                    />
                                    <div className="min-w-0">
                                      <p className="text-xs font-black text-white truncate leading-tight">
                                        {m.gameName || m.ingameName || m.name || `Player #${mIdx + 1}`}
                                      </p>
                                      <span className="text-[9px] font-mono font-semibold text-cyan-400">Player #{mIdx + 1}</span>
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2.5 font-mono shrink-0 bg-slate-900/90 px-2.5 py-1.5 rounded-lg border border-slate-800">
                                    <div className="text-center">
                                      <span className="text-[8px] text-slate-400 uppercase block font-semibold">Kills</span>
                                      <span className="text-xs font-black text-cyan-400">{m.kills || 0}</span>
                                    </div>
                                    <div className="w-px h-5 bg-slate-800" />
                                    <div className="text-center">
                                      <span className="text-[8px] text-slate-400 uppercase block font-semibold">Damage</span>
                                      <span className="text-xs font-black text-emerald-400">{m.damage || 0}</span>
                                    </div>
                                  </div>
                                </div>
                              ))
                            ) : (
                              <div className="col-span-2 bg-slate-950 p-2.5 rounded-xl border border-slate-800 flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <img 
                                    src={sqd.logo} 
                                    alt="" 
                                    className="w-8 h-8 rounded-full object-cover border border-cyan-500/30 shrink-0" 
                                  />
                                  <div>
                                    <p className="text-xs font-bold text-white truncate">{sqd.leaderName || sqd.name}</p>
                                    <span className="text-[9px] font-mono text-cyan-400">Squad Leader</span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3 font-mono shrink-0 text-xs font-black">
                                  <span className="text-cyan-400">Kills: {sqd.kills || 0}</span>
                                  <span className="text-emerald-400">Damage: {sqd.damage || 0}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>

                        {sqd.antiCheat && (
                          <div className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 p-2 rounded-lg border border-cyan-500/20 flex items-center gap-1.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                            <span>Anti-Cheat Verification: <strong>{sqd.antiCheat}</strong></span>
                          </div>
                        )}
                      </div>
                    ))
                  )}

                  {/* Screenshot & Winner Summary inside scrollable container */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="bg-amber-500/10 border border-amber-500/30 p-2.5 rounded-xl text-center">
                      <p className="text-[9px] font-black text-amber-400 uppercase tracking-widest mb-1">👑 Booyah Winner</p>
                      <p className="text-xs font-bold text-white font-mono truncate">
                        {booyahSelection || 'N/A'}
                      </p>
                    </div>
                    <div className="bg-cyan-500/10 border border-cyan-500/30 p-2.5 rounded-xl text-center">
                      <p className="text-[9px] font-black text-cyan-400 uppercase tracking-widest mb-1">🥈 Runner-Up</p>
                      <p className="text-xs font-bold text-white font-mono truncate">
                        {runnerUpSelection || 'N/A'}
                      </p>
                    </div>
                    {resultScreenshotPreview ? (
                      <div className="flex items-center gap-2 bg-slate-900 p-2 rounded-xl border border-slate-800">
                        <img src={resultScreenshotPreview} alt="Screenshot" className="w-12 h-8 rounded object-cover border border-slate-700 shrink-0" />
                        <div className="min-w-0 font-mono text-[9px] text-slate-300">
                          <p className="font-bold text-emerald-400 flex items-center gap-1"><Check className="w-3 h-3" /> Screenshot Attached</p>
                          <p className="text-slate-500 truncate">Compressed & Verified</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center p-2 bg-slate-900 rounded-xl border border-slate-800 text-[10px] font-mono text-rose-400">
                        No Screenshot Attached
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Bar: Edit Result on one side & Confirm Submit on the other side */}
                <div className="flex flex-col sm:flex-row gap-3 pt-2 shrink-0 border-t border-white/10">
                  <button
                    type="button"
                    onClick={() => setIsReviewingResults(false)}
                    className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 rounded-xl text-xs font-bold uppercase transition-all flex items-center justify-center gap-2 cursor-pointer border border-cyan-500/40 shadow-md"
                  >
                    <Edit3 className="w-4 h-4 text-cyan-400" />
                    <span>Edit Result (সম্পাদনা করুন)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleFinalConfirmAndSubmit}
                    disabled={isSavingResult}
                    className="flex-[2] py-3 bg-gradient-to-r from-cyan-500 via-teal-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.3)] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingResult ? <Loader2 className="w-4 h-4 animate-spin text-slate-950" /> : <ShieldCheck className="w-4 h-4 text-slate-950" />}
                    <span>Confirm & Submit for Review (সাবমিট করুন)</span>
                  </button>
                </div>
              </div>
            ) : (
              /* Data Entry View */
              <>
                {/* Tournament Brief */}
                <div className="bg-slate-950/90 p-3 rounded-xl border border-emerald-500/30 space-y-1 text-xs font-mono shrink-0">
                  <div className="flex justify-between items-center">
                    <h4 className="text-sm font-bold text-white">{resultSetTournament.title}</h4>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30 uppercase">
                      {resultSetTournament.mode === 'solo' ? `${resultSetData.length} Players` : `${resultSetSquads.length} Squads`}
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">Set Kills, Damage, Booyah and Runner-up for match completion.</p>
                </div>

                {/* Participants / Squads List Scrollable */}
                <div className="space-y-2 overflow-y-auto flex-1 pr-1 custom-scrollbar">
                  <label className="text-[10px] uppercase font-black tracking-wider text-slate-400 block sticky top-0 bg-slate-900 py-1 z-10">
                    {resultSetTournament.mode === 'solo' ? 'Joined Players (Game Name, Kills, Damage)' : 'Joined Squads & Members'}
                  </label>

                  {resultSetTournament.mode === 'solo' ? (
                    resultSetData.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs font-mono">No players joined yet.</div>
                    ) : (
                      resultSetData.map((p, idx) => (
                        <div key={p.id} className="bg-slate-950 border border-slate-800 hover:border-emerald-500/30 p-2.5 rounded-xl flex flex-col gap-3">
                          {/* First Row: Photo & Name */}
                          <div className="flex items-center gap-2.5 min-w-0">
                            <img 
                              src={p.avatar} 
                              alt={p.name} 
                              className="w-8 h-8 rounded-lg object-cover border border-slate-700 shrink-0" 
                              referrerPolicy="no-referrer"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-[11px] font-bold text-white break-words leading-tight">{p.gameName}</p>
                            </div>
                          </div>

                          {/* Second Row: Controls */}
                          <div className="flex items-center gap-8 border-t border-white/[0.03] pt-2.5">
                            {/* Kills Counter - Single Tap +/- 1 */}
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] font-mono uppercase text-slate-500 mb-1">Kills</span>
                              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-lg p-1">
                                <LongPressButton
                                  onAction={() => {
                                    setResultSetData(prev => prev.map(item => item.id === p.id ? { ...item, kills: Math.max(0, item.kills - 1) } : item));
                                  }}
                                  className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-black cursor-pointer transition-colors"
                                >
                                  -1
                                </LongPressButton>
                                <span className="w-8 text-center text-xs font-mono font-bold text-emerald-400">{p.kills}</span>
                                <LongPressButton
                                  onAction={() => {
                                    setResultSetData(prev => prev.map(item => item.id === p.id ? { ...item, kills: item.kills + 1 } : item));
                                  }}
                                  className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-black cursor-pointer transition-colors"
                                >
                                  +1
                                </LongPressButton>
                              </div>
                            </div>

                            {/* Damage Input - Double Buttons +/- 1 and +/- 10 */}
                            <div className="flex flex-col items-center">
                              <span className="text-[8px] font-mono uppercase text-slate-500 mb-1">Damage</span>
                              <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-lg p-1">
                                <div className="flex gap-1">
                                  <LongPressButton
                                    onAction={() => {
                                      setResultSetData(prev => prev.map(item => item.id === p.id ? { ...item, damage: Math.max(0, item.damage - 10) } : item));
                                    }}
                                    className="w-9 h-9 flex items-center justify-center bg-red-950/40 hover:bg-red-900/60 text-red-400 rounded text-[9px] font-black cursor-pointer transition-colors border border-red-500/20"
                                  >
                                    -10
                                  </LongPressButton>
                                  <LongPressButton
                                    onAction={() => {
                                      setResultSetData(prev => prev.map(item => item.id === p.id ? { ...item, damage: Math.max(0, item.damage - 1) } : item));
                                    }}
                                    className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-black cursor-pointer transition-colors"
                                  >
                                    -1
                                  </LongPressButton>
                                </div>
                                
                                <input
                                  type="number"
                                  value={p.damage}
                                  readOnly
                                  onChange={(e) => {
                                    const val = Math.max(0, Number(e.target.value) || 0);
                                    setResultSetData(prev => prev.map(item => item.id === p.id ? { ...item, damage: val } : item));
                                  }}
                                  className="w-16 bg-transparent text-sm text-center text-emerald-400 outline-none font-mono font-bold cursor-default"
                                />

                                <div className="flex gap-1">
                                  <LongPressButton
                                    onAction={() => {
                                      setResultSetData(prev => prev.map(item => item.id === p.id ? { ...item, damage: item.damage + 1 } : item));
                                    }}
                                    className="w-8 h-8 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-black cursor-pointer transition-colors"
                                  >
                                    +1
                                  </LongPressButton>
                                  <LongPressButton
                                    onAction={() => {
                                      setResultSetData(prev => prev.map(item => item.id === p.id ? { ...item, damage: item.damage + 10 } : item));
                                    }}
                                    className="w-9 h-9 flex items-center justify-center bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-400 rounded text-[9px] font-black cursor-pointer transition-colors border border-emerald-500/20"
                                  >
                                    +10
                                  </LongPressButton>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    resultSetSquads.length === 0 ? (
                      <div className="text-center py-8 text-slate-500 text-xs font-mono">No squads joined yet.</div>
                    ) : (
                      resultSetSquads.map((sqd, idx) => (
                        <div key={sqd.id} className="bg-slate-950 border border-slate-800 hover:border-cyan-500/40 p-3.5 rounded-2xl flex flex-col gap-3 shadow-xl transition-all">
                          {/* Top Header: Cover Photo/Logo, Squad Name, Leader & Total Squad Summary */}
                          <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/80 p-3 rounded-xl border border-white/5">
                            <div className="flex items-center gap-3 min-w-0">
                              <img 
                                src={sqd.logo} 
                                alt={sqd.name} 
                                className="w-12 h-12 rounded-xl object-cover border-2 border-cyan-500/30 shrink-0 shadow-md" 
                                referrerPolicy="no-referrer"
                              />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-black text-white truncate tracking-wide">{sqd.name}</span>
                                  <span className="text-[9px] font-mono font-bold bg-cyan-950/80 text-cyan-400 border border-cyan-500/30 px-2 py-0.5 rounded-md shrink-0">
                                    Squad #{idx + 1}
                                  </span>
                                </div>
                                <p className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center gap-1">
                                  <Crown className="w-3 h-3 text-amber-400 shrink-0" />
                                  <span>Leader: <strong className="text-slate-200">{sqd.leaderName}</strong></span>
                                </p>
                              </div>
                            </div>

                            {/* Total Squad Kills & Damage Display Badge */}
                            <div className="flex items-center gap-3 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 shrink-0">
                              <div className="text-center">
                                <span className="text-[8px] font-mono uppercase text-slate-400 block">Total Kills</span>
                                <span className="text-xs font-mono font-black text-cyan-400">{sqd.kills}</span>
                              </div>
                              <div className="w-px h-6 bg-slate-800" />
                              <div className="text-center">
                                <span className="text-[8px] font-mono uppercase text-slate-400 block">Total Damage</span>
                                <span className="text-xs font-mono font-black text-emerald-400">{sqd.damage}</span>
                              </div>
                            </div>
                          </div>

                          {/* Individual Squad Members Section: Player Profile Pic, Gamertag, Individual Kills & Individual Damage */}
                          <div className="bg-slate-900/40 p-3 rounded-xl border border-white/[0.03] space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5 text-cyan-400" />
                                Squad Members — Set Kills & Damage Per Player ({sqd.members?.length || 0})
                              </span>
                            </div>

                            <div className="space-y-2.5">
                              {sqd.members && sqd.members.length > 0 ? (
                                sqd.members.map((m: any, mIdx: number) => (
                                  <div key={mIdx} className="bg-slate-950 border border-slate-800/90 rounded-xl p-3 space-y-2 hover:border-cyan-500/20 transition-all">
                                    {/* Member Header: Profile Pic & Gamertag */}
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2.5 min-w-0">
                                        <img 
                                          src={m.avatar || m.avatarUrl || m.photoURL || 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150'} 
                                          alt="" 
                                          className="w-8 h-8 rounded-full object-cover border-2 border-cyan-500/40 shrink-0 shadow-sm" 
                                          referrerPolicy="no-referrer"
                                        />
                                        <div className="min-w-0">
                                          <p className="text-xs font-black text-white truncate">
                                            {m.gameName || m.ingameName || m.name || `Player #${mIdx + 1}`}
                                          </p>
                                          <span className="text-[9px] font-mono text-cyan-400">Player #{mIdx + 1}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Individual Player Kills & Damage Controls */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1 border-t border-white/[0.04]">
                                      {/* Individual Kills Controller */}
                                      <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 flex items-center justify-between gap-2">
                                        <span className="text-[9px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1">
                                          <Target className="w-3 h-3 text-cyan-400" /> Kills
                                        </span>
                                        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                                          <LongPressButton
                                            onAction={() => {
                                              setResultSetSquads(prev => prev.map(item => {
                                                if (item.id !== sqd.id) return item;
                                                const updatedMembers = (item.members || []).map((mem: any, mIndex: number) => {
                                                  if (mIndex !== mIdx) return mem;
                                                  return { ...mem, kills: Math.max(0, (Number(mem.kills) || 0) - 1) };
                                                });
                                                const sumKills = updatedMembers.reduce((acc: number, cur: any) => acc + (Number(cur.kills) || 0), 0);
                                                return { ...item, members: updatedMembers, kills: sumKills };
                                              }));
                                            }}
                                            className="w-7 h-7 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded text-xs font-black cursor-pointer"
                                          >
                                            <Minus className="w-3 h-3" />
                                          </LongPressButton>
                                          <span className="w-7 text-center text-xs font-mono font-black text-cyan-400">{m.kills || 0}</span>
                                          <LongPressButton
                                            onAction={() => {
                                              setResultSetSquads(prev => prev.map(item => {
                                                if (item.id !== sqd.id) return item;
                                                const updatedMembers = (item.members || []).map((mem: any, mIndex: number) => {
                                                  if (mIndex !== mIdx) return mem;
                                                  return { ...mem, kills: (Number(mem.kills) || 0) + 1 };
                                                });
                                                const sumKills = updatedMembers.reduce((acc: number, cur: any) => acc + (Number(cur.kills) || 0), 0);
                                                return { ...item, members: updatedMembers, kills: sumKills };
                                              }));
                                            }}
                                            className="w-7 h-7 flex items-center justify-center bg-cyan-600 hover:bg-cyan-500 text-white rounded text-xs font-black cursor-pointer"
                                          >
                                            <Plus className="w-3 h-3" />
                                          </LongPressButton>
                                        </div>
                                      </div>

                                      {/* Individual Damage Controller */}
                                      <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-800 flex items-center justify-between gap-1.5 flex-wrap">
                                        <span className="text-[9px] font-mono uppercase font-bold text-slate-400 flex items-center gap-1">
                                          <Flame className="w-3 h-3 text-emerald-400" /> Damage
                                        </span>
                                        <div className="flex items-center gap-1 bg-slate-950 p-0.5 rounded-lg border border-slate-800">
                                          <LongPressButton
                                            onAction={() => {
                                              setResultSetSquads(prev => prev.map(item => {
                                                if (item.id !== sqd.id) return item;
                                                const updatedMembers = (item.members || []).map((mem: any, mIndex: number) => {
                                                  if (mIndex !== mIdx) return mem;
                                                  return { ...mem, damage: Math.max(0, (Number(mem.damage) || 0) - 10) };
                                                });
                                                const sumDamage = updatedMembers.reduce((acc: number, cur: any) => acc + (Number(cur.damage) || 0), 0);
                                                return { ...item, members: updatedMembers, damage: sumDamage };
                                              }));
                                            }}
                                            className="w-6 h-6 flex items-center justify-center bg-red-950/60 hover:bg-red-900/80 text-red-400 rounded text-[9px] font-bold border border-red-500/20"
                                          >
                                            -10
                                          </LongPressButton>
                                          <LongPressButton
                                            onAction={() => {
                                              setResultSetSquads(prev => prev.map(item => {
                                                if (item.id !== sqd.id) return item;
                                                const updatedMembers = (item.members || []).map((mem: any, mIndex: number) => {
                                                  if (mIndex !== mIdx) return mem;
                                                  return { ...mem, damage: Math.max(0, (Number(mem.damage) || 0) - 1) };
                                                });
                                                const sumDamage = updatedMembers.reduce((acc: number, cur: any) => acc + (Number(cur.damage) || 0), 0);
                                                return { ...item, members: updatedMembers, damage: sumDamage };
                                              }));
                                            }}
                                            className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold"
                                          >
                                            -1
                                          </LongPressButton>

                                          <input
                                            type="number"
                                            value={m.damage || 0}
                                            onChange={(e) => {
                                              const val = Math.max(0, Number(e.target.value) || 0);
                                              setResultSetSquads(prev => prev.map(item => {
                                                if (item.id !== sqd.id) return item;
                                                const updatedMembers = (item.members || []).map((mem: any, mIndex: number) => {
                                                  if (mIndex !== mIdx) return mem;
                                                  return { ...mem, damage: val };
                                                });
                                                const sumDamage = updatedMembers.reduce((acc: number, cur: any) => acc + (Number(cur.damage) || 0), 0);
                                                return { ...item, members: updatedMembers, damage: sumDamage };
                                              }));
                                            }}
                                            className="w-14 bg-slate-900 border border-slate-700 text-[11px] text-center text-emerald-400 outline-none font-mono font-black rounded py-0.5"
                                          />

                                          <LongPressButton
                                            onAction={() => {
                                              setResultSetSquads(prev => prev.map(item => {
                                                if (item.id !== sqd.id) return item;
                                                const updatedMembers = (item.members || []).map((mem: any, mIndex: number) => {
                                                  if (mIndex !== mIdx) return mem;
                                                  return { ...mem, damage: (Number(mem.damage) || 0) + 1 };
                                                });
                                                const sumDamage = updatedMembers.reduce((acc: number, cur: any) => acc + (Number(cur.damage) || 0), 0);
                                                return { ...item, members: updatedMembers, damage: sumDamage };
                                              }));
                                            }}
                                            className="w-6 h-6 flex items-center justify-center bg-slate-800 hover:bg-slate-700 text-white rounded text-[10px] font-bold"
                                          >
                                            +1
                                          </LongPressButton>
                                          <LongPressButton
                                            onAction={() => {
                                              setResultSetSquads(prev => prev.map(item => {
                                                if (item.id !== sqd.id) return item;
                                                const updatedMembers = (item.members || []).map((mem: any, mIndex: number) => {
                                                  if (mIndex !== mIdx) return mem;
                                                  return { ...mem, damage: (Number(mem.damage) || 0) + 10 };
                                                });
                                                const sumDamage = updatedMembers.reduce((acc: number, cur: any) => acc + (Number(cur.damage) || 0), 0);
                                                return { ...item, members: updatedMembers, damage: sumDamage };
                                              }));
                                            }}
                                            className="w-6 h-6 flex items-center justify-center bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-400 rounded text-[9px] font-bold border border-emerald-500/20"
                                          >
                                            +10
                                          </LongPressButton>
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <p className="text-[10px] text-slate-500 font-mono italic col-span-2">No member details found.</p>
                              )}
                            </div>
                          </div>

                          {/* Anti-Cheat Field */}
                          <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                            <label className="text-[9px] font-mono uppercase font-bold text-cyan-300 mb-1 flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                              Anti-Cheat Verification / Status
                            </label>
                            <input
                              type="text"
                              value={sqd.antiCheat || ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                setResultSetSquads(prev => prev.map(item => item.id === sqd.id ? { ...item, antiCheat: val } : item));
                              }}
                              placeholder="e.g. Verified Clean / Anti-Cheat Passed"
                              className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-slate-200 outline-none font-mono"
                            />
                          </div>
                        </div>
                      ))
                    )
                  )}

                  {/* Screenshot Upload Section - Mandatory (Moved to bottom of list) */}
                  <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 mt-4">
                    <label className="text-[10px] uppercase font-black tracking-wider text-rose-400 block mb-2 flex items-center gap-2">
                      <Camera className="w-3.5 h-3.5" />
                      Mandatory: Result Screenshot Upload
                    </label>
                    
                    <div className="flex items-center gap-4">
                      <div className="relative shrink-0 group">
                        <div className="w-24 h-14 bg-slate-900 rounded-lg border-2 border-dashed border-slate-700 flex items-center justify-center overflow-hidden transition-all group-hover:border-cyan-500/50">
                          {resultScreenshotPreview ? (
                            <img src={resultScreenshotPreview} alt="Preview" className="w-full h-full object-cover" />
                          ) : (
                            <div className="flex flex-col items-center gap-1 opacity-40 group-hover:opacity-100 transition-opacity">
                              <Upload className="w-5 h-5 text-slate-400 group-hover:text-cyan-400" />
                              <span className="text-[8px] font-bold text-slate-500 uppercase">No Image</span>
                            </div>
                          )}
                        </div>
                        <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleScreenshotSelect}
                          className="absolute inset-0 opacity-0 cursor-pointer z-10"
                        />
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <p className="text-[10px] text-slate-400 leading-tight">
                          Select your result screenshot. It will be compressed to <strong className="text-cyan-400">&le; 130 KB</strong> automatically.
                        </p>
                        {isCompressingImage ? (
                          <div className="flex items-center gap-2 text-cyan-400 text-[10px] font-bold animate-pulse">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>COMPRESSING...</span>
                          </div>
                        ) : resultScreenshot ? (
                          <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-bold">
                            <Check className="w-3 h-3" />
                            <span>READY: {(resultScreenshot.size / 1024).toFixed(1)} KB</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-rose-400 text-[10px] font-bold">
                            <AlertTriangle className="w-3 h-3" />
                            <span>REQUIRED BEFORE SAVING</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Dropdown Winners Selection (Moved to bottom of list) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-950/60 p-3 rounded-xl border border-slate-800 mt-3">
                    <div>
                      <label className="text-[10px] uppercase font-black tracking-wider text-amber-400 block mb-1">
                        👑 Booyah (1st Place Winner)
                      </label>
                      <select
                        value={booyahSelection}
                        onChange={(e) => setBooyahSelection(e.target.value)}
                        className="w-full bg-slate-950 border border-amber-500/40 focus:border-amber-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                      >
                        <option value="">-- Select Booyah Winner --</option>
                        {resultSetTournament.mode === 'solo' ? (
                          resultSetData.map(p => (
                            <option key={p.id} value={p.id}>{p.gameName} ({p.name})</option>
                          ))
                        ) : (
                          resultSetSquads.map(sqd => (
                            <option key={sqd.id} value={sqd.name}>🏆 {sqd.name} (Leader: {sqd.leaderName})</option>
                          ))
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] uppercase font-black tracking-wider text-cyan-400 block mb-1">
                        🥈 Runner-Up (2nd Place)
                      </label>
                      <select
                        value={runnerUpSelection}
                        onChange={(e) => setRunnerUpSelection(e.target.value)}
                        className="w-full bg-slate-950 border border-cyan-500/40 focus:border-cyan-500 rounded-xl px-3 py-2 text-xs text-white outline-none font-mono"
                      >
                        <option value="">-- Select Runner-Up --</option>
                        {resultSetTournament.mode === 'solo' ? (
                          resultSetData.map(p => (
                            <option key={p.id} value={p.id}>{p.gameName} ({p.name})</option>
                          ))
                        ) : (
                          resultSetSquads.map(sqd => (
                            <option key={sqd.id} value={sqd.name}>🥈 {sqd.name} (Leader: {sqd.leaderName})</option>
                          ))
                        )}
                      </select>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2 border-t border-white/10 shrink-0">
                  <button
                    type="button"
                    onClick={() => setResultSetTournament(null)}
                    className="flex-1 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold uppercase transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveTournamentResult}
                    disabled={isSavingResult || isCompressingImage || !resultScreenshot}
                    className="flex-1 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all shadow-lg flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Check className="w-4 h-4 text-slate-950" />
                    <span>Save Result & Finish Match</span>
                  </button>
                </div>
              </>
            )}
          </motion.div>
        </div>
      )}

    </div>
  );
}
