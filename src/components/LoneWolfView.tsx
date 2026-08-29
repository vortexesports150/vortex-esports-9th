import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Swords, 
  Trophy, 
  Flame, 
  Shield, 
  ShieldCheck,
  Coins, 
  Clock, 
  Calendar, 
  Users, 
  Key, 
  Lock, 
  Unlock, 
  Copy, 
  Check, 
  Search, 
  Filter, 
  AlertTriangle, 
  Award, 
  Sparkles, 
  X, 
  ChevronRight, 
  Play, 
  CheckCircle2, 
  Globe, 
  MapPin, 
  Crown, 
  ExternalLink,
  Share2,
  Trash2,
  RefreshCw,
  Eye,
  EyeOff,
  UserCheck,
  MoreVertical,
  Video,
  Wallet,
  Youtube,
  Edit3,
  XCircle,
  Plus,
  Minus,
  Loader2,
  Megaphone,
  MessageSquare,
  Send,
  Zap,
  BookOpen
} from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { HostProfileModal } from './HostProfileModal';
import { HostFollowButton } from './HostFollowButton';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';
import { 
  collection, 
  onSnapshot, 
  doc, 
  runTransaction, 
  serverTimestamp, 
  updateDoc, 
  deleteDoc,
  query, 
  orderBy,
  arrayUnion,
  addDoc,
  limit,
  where,
  getDocs
} from 'firebase/firestore';
import { uploadScreenshotToImgBB, compressImageToDataUrl } from '../lib/imgbb';
import { UserProfile, LoneWolfMatch, LoneWolfPlayer } from '../types';

const parseMsgTimestamp = (val: any): number => {
  if (!val) return 0;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (typeof val.seconds === 'number') return val.seconds * 1000;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const t = new Date(val).getTime();
    if (!isNaN(t)) return t;
  }
  return 0;
};

function LoneWolfChatButton({ 
  match, 
  userProfile, 
  onClick, 
  isActive 
}: { 
  match: any; 
  userProfile: any; 
  onClick: () => void; 
  isActive?: boolean; 
}) {
  const [hasNew, setHasNew] = useState(false);
  const currentUid = userProfile?.userId || (userProfile as any)?.uid || '';

  // Synchronize with chat opened or viewed state
  useEffect(() => {
    if (isActive && currentUid && match?.id) {
      localStorage.setItem(`chat_viewed_lonewolf_${match.id}_${currentUid}`, Date.now().toString());
      setHasNew(false);
    }
  }, [isActive, match?.id, currentUid]);

  // Listen to global chat viewed events for this match
  useEffect(() => {
    const handleChatViewed = (e: any) => {
      if (e.detail?.matchId === match?.id) {
        setHasNew(false);
      }
    };
    window.addEventListener('lonewolf_chat_viewed', handleChatViewed);
    return () => window.removeEventListener('lonewolf_chat_viewed', handleChatViewed);
  }, [match?.id]);

  useEffect(() => {
    if (!currentUid || !match?.id) return;
    const chatRef = collection(db, 'lone_wolf_chats', match.id, 'messages');
    const q = query(chatRef, orderBy('createdAt', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        const lastViewed = parseInt(localStorage.getItem(`chat_viewed_lonewolf_${match.id}_${currentUid}`) || '0');
        
        let foundNew = false;
        for (const doc of snap.docs) {
          const msg = doc.data({ serverTimestamps: 'estimate' });
          const msgTime = parseMsgTimestamp(msg.createdAt);
          
          if (msgTime && msgTime <= lastViewed) break;
          if (msg.senderId && msg.senderId === currentUid) continue;
          
          if (msgTime > lastViewed) {
            foundNew = true;
            break;
          }
        }
        setHasNew(foundNew);
      } else {
        setHasNew(false);
      }
    }, (err) => {
      console.error("Error checking unread chats for Lone Wolf:", err);
      handleFirestoreError(err, OperationType.GET, `lone_wolf_chats/${match.id}/messages`);
    });
    return () => unsub();
  }, [match?.id, currentUid]);

  return (
    <button
      onClick={(e) => {
        e.stopPropagation();
        if (currentUid && match?.id) {
          localStorage.setItem(`chat_viewed_lonewolf_${match.id}_${currentUid}`, Date.now().toString());
          window.dispatchEvent(new CustomEvent('lonewolf_chat_viewed', { detail: { matchId: match.id } }));
        }
        setHasNew(false);
        onClick();
      }}
      className="p-2 bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 rounded-xl text-cyan-400 hover:text-cyan-300 transition-all cursor-pointer flex items-center justify-center relative active:scale-95 h-full min-h-[38px] min-w-[38px]"
      title="Match Chat"
    >
      <MessageSquare className="w-4 h-4 text-cyan-400" />
      {hasNew && (
        <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[#0a0c16] animate-pulse"></span>
      )}
    </button>
  );
}

interface LoneWolfChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: LoneWolfMatch;
  userProfile: UserProfile | null;
  isSystemAdmin: boolean;
}

function LoneWolfChatModal({ isOpen, onClose, match, userProfile, isSystemAdmin }: LoneWolfChatModalProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const currentUserId = userProfile?.userId || (userProfile as any)?.uid || '';
  const currentUserName = userProfile?.displayName || userProfile?.gameName || 'Player';
  const isHost = match.hostId === currentUserId;

  // Mark messages as viewed immediately when the modal is open or receives messages
  useEffect(() => {
    if (isOpen && match?.id && currentUserId) {
      localStorage.setItem(`chat_viewed_lonewolf_${match.id}_${currentUserId}`, Date.now().toString());
      window.dispatchEvent(new CustomEvent('lonewolf_chat_viewed', { detail: { matchId: match.id } }));
    }
  }, [isOpen, match?.id, currentUserId, messages.length]);

  useEffect(() => {
    if (!isOpen || !match) return;

    const chatRef = collection(db, 'lone_wolf_chats', match.id, 'messages');
    const q = query(chatRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      setMessages(msgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      console.error("Error fetching Lone Wolf chat messages:", error);
      handleFirestoreError(error, OperationType.GET, `lone_wolf_chats/${match.id}/messages`);
    });

    return () => unsubscribe();
  }, [isOpen, match.id]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const textMessage = newMessage.trim();
    try {
      const chatRef = collection(db, 'lone_wolf_chats', match.id, 'messages');
      
      let roleToSave = 'player';
      if (isSystemAdmin) roleToSave = 'admin';
      else if (isHost) roleToSave = 'host';
      
      await addDoc(chatRef, {
        text: textMessage,
        senderId: currentUserId,
        senderName: currentUserName,
        senderPhoto: userProfile?.photoURL || '',
        senderRole: roleToSave,
        createdAt: serverTimestamp(),
      });

      // Sync to admin_messages if sender is not an admin
      const isSenderAdmin = isSystemAdmin || userProfile?.role === 'main_admin' || userProfile?.role === 'sub_admin' || userProfile?.role === 'admin';
      if (!isSenderAdmin) {
        try {
          const adminMsgQuery = query(
            collection(db, 'admin_messages'),
            where('sourceContext.matchId', '==', match.id),
            where('sourceContext.type', '==', 'lone_wolf_match')
          );
          const adminMsgSnap = await getDocs(adminMsgQuery);
          
          if (!adminMsgSnap.empty) {
            // Update existing admin message thread
            const adminDoc = adminMsgSnap.docs[0];
            const adminDocId = adminDoc.id;
            const adminData = adminDoc.data();
            
            const newReply = {
              senderId: currentUserId,
              senderName: currentUserName,
              message: textMessage,
              createdAt: new Date().toISOString(),
              isAdmin: false
            };
            const updatedReplies = [...(adminData.replies || []), newReply];
            
            await updateDoc(doc(db, 'admin_messages', adminDocId), {
              message: textMessage,
              replies: updatedReplies,
              status: 'unread',
              createdAt: serverTimestamp(), // Bump to top of inbox
              updatedAt: serverTimestamp()
            });
          } else {
            // Create a brand new admin message thread
            await addDoc(collection(db, 'admin_messages'), {
              senderId: currentUserId,
              senderName: currentUserName,
              senderEmail: userProfile?.email || '',
              senderPhoto: userProfile?.photoURL || null,
              type: 'lone_wolf_support',
              message: textMessage,
              status: 'unread',
              replies: [],
              sourceContext: {
                type: 'lone_wolf_match',
                matchId: match.id,
                matchTitle: match.title || 'Lone Wolf Match'
              },
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp()
            });
          }
        } catch (adminErr) {
          console.error("Error syncing message to admin_messages:", adminErr);
        }
      }

      setNewMessage('');
    } catch (error) {
      console.error("Error sending Lone Wolf chat message:", error);
      handleFirestoreError(error, OperationType.WRITE, `lone_wolf_chats/${match.id}/messages`);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="relative w-full max-w-lg bg-[#04060e] border border-cyan-500/30 rounded-2xl overflow-hidden flex flex-col h-[70vh] shadow-[0_0_30px_rgba(6,182,212,0.15)]"
      >
        {/* Header */}
        <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-gradient-to-r from-cyan-950/40 to-slate-950/40 shrink-0">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-cyan-400 animate-pulse" />
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">Match Support Chat</h3>
              <p className="text-[9px] text-cyan-400/80 font-semibold uppercase tracking-wide">
                {match.title}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Message area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-black/30">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4">
              <MessageSquare className="h-8 w-8 text-slate-600 mb-2 stroke-[1.5]" />
              <p className="text-xs text-slate-400 font-bold">No messages yet</p>
              <p className="text-[9px] text-slate-500 mt-1">Host, players and admins can discuss match details here.</p>
            </div>
          ) : (
            messages.map((msg) => {
              const isOwn = msg.senderId === currentUserId;
              const senderRoleLabel = msg.senderRole === 'admin' ? 'Admin' : msg.senderRole === 'host' ? 'Host' : 'Player';
              
              return (
                <div key={msg.id} className={`flex flex-col ${isOwn ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-center gap-1.5 mb-0.5 text-[9px] text-slate-400">
                    <span className="font-bold">{msg.senderName}</span>
                    <span className={`px-1 rounded-[4px] text-[7px] font-bold uppercase ${
                      msg.senderRole === 'admin' 
                        ? 'bg-red-950 text-red-400 border border-red-500/20' 
                        : msg.senderRole === 'host' 
                        ? 'bg-amber-950 text-amber-400 border border-amber-500/20' 
                        : 'bg-cyan-950 text-cyan-400 border border-cyan-500/20'
                    }`}>
                      {senderRoleLabel}
                    </span>
                  </div>
                  <div className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                    isOwn 
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-[0_0_10px_rgba(6,182,212,0.15)]' 
                      : 'bg-slate-900 border border-white/5 text-slate-200 rounded-tl-none'
                  }`}>
                    {msg.text}
                  </div>
                  <span className="text-[8px] text-slate-600 mt-0.5 font-mono">
                    {msg.createdAt ? new Date(msg.createdAt.toMillis()).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <form onSubmit={handleSend} className="p-3 border-t border-white/[0.06] bg-slate-950 flex items-center gap-2 shrink-0">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-black border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
          />
          <button
            type="submit"
            disabled={!newMessage.trim() || isSending}
            className="p-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-500 rounded-xl text-white transition flex items-center justify-center shrink-0 cursor-pointer"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </motion.div>
    </div>
  );
}

interface LoneWolfViewProps {
  userProfile: UserProfile | null;
  tokens: number;
  setTokens: (v: number | ((prev: number) => number)) => void;
  onOpenGamerInfo?: () => void;
  onOpenGenerate?: () => void;
  navigationContext?: any;
  onBackToInbox?: () => void;
  onTagMatchForPulse?: (match: any) => void;
}

export function LoneWolfView({
  userProfile,
  tokens,
  setTokens,
  onOpenGamerInfo,
  onOpenGenerate,
  navigationContext,
  onBackToInbox,
  onTagMatchForPulse
}: LoneWolfViewProps) {
  // 3 Primary Tabs as requested
  const [activeTab, setActiveTab] = useState<'Registration' | 'Ongoing' | 'Completed'>('Registration');
  const [highlightedLoneWolfId, setHighlightedLoneWolfId] = useState<string | null>(null);
  
  // Matches state from Firestore
  const [matches, setMatches] = useState<LoneWolfMatch[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Join Modal State
  const [selectedMatchToJoin, setSelectedMatchToJoin] = useState<{ match: LoneWolfMatch; slot: 1 | 2 } | null>(null);
  const [joinIgn, setJoinIgn] = useState<string>('');
  const [joinUid, setJoinUid] = useState<string>('');
  const [isJoining, setIsJoining] = useState<boolean>(false);
  const [joinError, setJoinError] = useState<string>('');
  const [joinSuccess, setJoinSuccess] = useState<string>('');

  // Access Code Prompt Modal
  const [showAccessCodeModal, setShowAccessCodeModal] = useState<boolean>(false);
  const [enteredAccessCode, setEnteredAccessCode] = useState<string>('');

  // Room Details & YouTube Stream Modal
  const [selectedMatchForRoom, setSelectedMatchForRoom] = useState<LoneWolfMatch | null>(null);
  const [inputRoomId, setInputRoomId] = useState<string>('');
  const [inputRoomPass, setInputRoomPass] = useState<string>('');
  const [inputYoutubeUrl, setInputYoutubeUrl] = useState<string>('');
  const [isUpdatingRoom, setIsUpdatingRoom] = useState<boolean>(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // Three-dot Dropdown Menu State
  const [openMenuMatchId, setOpenMenuMatchId] = useState<string | null>(null);

  // Lone Wolf Wallet Modal
  const [selectedMatchForWallet, setSelectedMatchForWallet] = useState<LoneWolfMatch | null>(null);

  // Reschedule Match Modal
  const [selectedMatchToReschedule, setSelectedMatchToReschedule] = useState<LoneWolfMatch | null>(null);
  const [inputRescheduleDate, setInputRescheduleDate] = useState<string>('');
  const [inputRescheduleTime, setInputRescheduleTime] = useState<string>('');
  const [isRescheduling, setIsRescheduling] = useState<boolean>(false);

  // Result & Prize Modal
  const [selectedMatchForResult, setSelectedMatchForResult] = useState<LoneWolfMatch | null>(null);
  const [resultWinnerSlot, setResultWinnerSlot] = useState<1 | 2>(1);
  const [player1Score, setPlayer1Score] = useState<number>(5);
  const [player2Score, setPlayer2Score] = useState<number>(3);
  const [isSubmittingResult, setIsSubmittingResult] = useState<boolean>(false);
  const [resultError, setResultError] = useState<string>('');
  const [resultScreenshotUrl, setResultScreenshotUrl] = useState<string>('');
  const [isUploadingScreenshot, setIsUploadingScreenshot] = useState<boolean>(false);

  // Auto-sync winner slot whenever round scores change
  useEffect(() => {
    if (player1Score > player2Score) {
      setResultWinnerSlot(1);
    } else if (player2Score > player1Score) {
      setResultWinnerSlot(2);
    }
  }, [player1Score, player2Score]);

  // Cancel match confirmation
  const [matchToCancel, setMatchToCancel] = useState<LoneWolfMatch | null>(null);
  const [isCancelling, setIsCancelling] = useState<boolean>(false);
  const [isClaimingWallet, setIsClaimingWallet] = useState<boolean>(false);

  // Image Fullscreen Preview (Host Avatar, Player Profile, Sponsor Logo)
  const [previewImageModal, setPreviewImageModal] = useState<{ url: string; title?: string } | null>(null);

  // Host Profile Modal State
  const [selectedHostForModal, setSelectedHostForModal] = useState<{ hostId: string; hostName?: string; hostPhotoUrl?: string } | null>(null);
  const [showRulesMatch, setShowRulesMatch] = useState<any | null>(null);
  
  // Followed Hosts State
  const [followedHostIds, setFollowedHostIds] = useState<Set<string>>(new Set());

  // Listen to followed hosts for logged in user
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
      console.error("Error fetching user follows in LoneWolf:", err);
    });
    return () => unsub();
  }, [userProfile?.userId]);

  // Lone wolf Pending Match Modal State
  const [showPendingLoneWolfModal, setShowPendingLoneWolfModal] = useState<boolean>(false);
  const [pendingModalTab, setPendingModalTab] = useState<'all' | 'pending' | 'rejected'>('all');
  const [matchToDelete, setMatchToDelete] = useState<{ id: string; title: string } | null>(null);

  // Announcement & Chat Modals State
  const [activeAnnouncementMatch, setActiveAnnouncementMatch] = useState<LoneWolfMatch | null>(null);
  const [announcementText, setAnnouncementText] = useState<string>('');
  const [isSubmittingAnnouncement, setIsSubmittingAnnouncement] = useState<boolean>(false);
  const [activeChatMatch, setActiveChatMatch] = useState<LoneWolfMatch | null>(null);

  const handleAddAnnouncement = async (match: LoneWolfMatch) => {
    if (!announcementText.trim() || isSubmittingAnnouncement || !userProfile) return;
    setIsSubmittingAnnouncement(true);

    try {
      const announcerRole = isSystemAdmin ? 'Admin' : 'Host';
      const announcerName = userProfile.displayName || userProfile.gameName || 'Host';
      const newAnnouncementObj = {
        id: 'ann_' + Date.now(),
        text: announcementText.trim(),
        announcerName,
        announcerEmail: currentUserEmail,
        role: announcerRole,
        createdAt: new Date().toISOString()
      };

      const matchRef = doc(db, 'lone_wolf_matches', match.id);
      await updateDoc(matchRef, {
        announcements: arrayUnion(newAnnouncementObj)
      });

      // Update active state in-place
      setActiveAnnouncementMatch(prev => {
        if (!prev || prev.id !== match.id) return prev;
        const currentAnnouncements = prev.announcements || [];
        return {
          ...prev,
          announcements: [...currentAnnouncements, newAnnouncementObj]
        };
      });

      setAnnouncementText('');
    } catch (err) {
      console.error("Error adding announcement to Lone Wolf match:", err);
    } finally {
      setIsSubmittingAnnouncement(false);
    }
  };

  const handleDeleteAnnouncement = async (match: LoneWolfMatch, announcementId: string) => {
    if (!window.confirm("Are you sure you want to delete this announcement?")) return;

    try {
      const currentAnnouncements = match.announcements || [];
      const updatedAnnouncements = currentAnnouncements.filter((ann: any) => ann.id !== announcementId);

      const matchRef = doc(db, 'lone_wolf_matches', match.id);
      await updateDoc(matchRef, {
        announcements: updatedAnnouncements
      });

      // Update active state in-place
      setActiveAnnouncementMatch(prev => {
        if (!prev || prev.id !== match.id) return prev;
        return {
          ...prev,
          announcements: updatedAnnouncements
        };
      });
    } catch (err) {
      console.error("Error deleting announcement from Lone Wolf match:", err);
    }
  };

  const hasUnreadAnnouncements = (matchId: string, announcements?: any[]) => {
    if (!announcements || announcements.length === 0) return false;
    const uid = userProfile?.userId || (userProfile as any)?.uid || '';
    const lastViewed = parseInt(localStorage.getItem(`announcements_viewed_lonewolf_${matchId}_${uid}`) || '0');
    const latestAnnouncementTime = new Date(announcements[announcements.length - 1].createdAt).getTime();
    return latestAnnouncementTime > lastViewed;
  };

  const currentUserId = userProfile?.userId || '';
  const currentUserEmail = (userProfile?.email || '').toLowerCase().trim();
  const isSystemAdmin = 
    currentUserEmail === 'vortexesports150@gmail.com' || 
    userProfile?.role === 'admin' || 
    userProfile?.role === 'main_admin' || 
    userProfile?.role === 'sub_admin';

  const isOwnerAdmin = userProfile?.role === 'owner_admin' || 
    userProfile?.role === 'main_admin' || 
    currentUserEmail === 'vortexesports150@gmail.com';

  const canDeleteOrHideMatch = isOwnerAdmin || (isSystemAdmin && (
    checkAdminPermission(currentUserEmail, (userProfile as any)?.permissions, 'pro_tournaments_admin') ||
    checkAdminPermission(currentUserEmail, (userProfile as any)?.permissions, 'delete_hide_tournaments')
  ));

  // Compute Pending and Rejected Lone Wolf Matches for Host / Admin
  const hostPendingAndRejectedMatches = matches.filter(m => {
    const isHost = m.hostId === currentUserId || (m.hostEmail && currentUserEmail && m.hostEmail.toLowerCase() === currentUserEmail);
    if (!isHost && !isSystemAdmin) return false;

    const isPending = (m as any).approvalStatus === 'pending' || ((m as any).isApproved === false && (m as any).approvalStatus !== 'rejected');
    const isRejected = (m as any).approvalStatus === 'rejected';

    return isPending || isRejected;
  });

  const hostOnlyPendingMatches = hostPendingAndRejectedMatches.filter(m => 
    (m as any).approvalStatus === 'pending' || ((m as any).isApproved === false && (m as any).approvalStatus !== 'rejected')
  );

  const hostOnlyRejectedMatches = hostPendingAndRejectedMatches.filter(m => 
    (m as any).approvalStatus === 'rejected'
  );

  // Listen to lone_wolf_matches collection
  useEffect(() => {
    setLoading(true);
    const q = query(collection(db, 'lone_wolf_matches'), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: LoneWolfMatch[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...(docSnap.data() as any) });
      });
      setMatches(list);
      setLoading(false);
    }, (err) => {
      console.error('Error fetching Lone Wolf matches:', err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Auto-open chat or scroll to match from navigationContext
  useEffect(() => {
    if (navigationContext?.type === 'lone_wolf_match' && navigationContext.matchId && matches.length > 0) {
      const targetMatch = matches.find(m => m.id === navigationContext.matchId);
      if (targetMatch) {
        setActiveChatMatch(targetMatch);
        const matchStatus = targetMatch.status as string;
        if (matchStatus === 'Completed' || matchStatus === 'completed') {
          setActiveTab('Completed');
        } else if (matchStatus === 'Ongoing' || matchStatus === 'ongoing' || matchStatus === 'Progress' || matchStatus === 'UnderReview' || matchStatus === 'ResultUnderReview') {
          setActiveTab('Ongoing');
        } else {
          setActiveTab('Registration');
        }
      }
    }

    if (navigationContext?.type === 'pulse_tagged_lone_wolf' && navigationContext.matchId && matches.length > 0) {
      const targetId = navigationContext.matchId;
      setHighlightedLoneWolfId(targetId);

      const targetMatch = matches.find(m => m.id === targetId);
      if (targetMatch) {
        const matchStatus = targetMatch.status as string;
        if (matchStatus === 'Completed' || matchStatus === 'completed') {
          setActiveTab('Completed');
        } else if (matchStatus === 'Ongoing' || matchStatus === 'ongoing' || matchStatus === 'Progress' || matchStatus === 'UnderReview' || matchStatus === 'ResultUnderReview') {
          setActiveTab('Ongoing');
        } else {
          setActiveTab('Registration');
        }
      }

      const attemptScroll = () => {
        const el = document.getElementById(`lonewolf-card-${targetId}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
          return true;
        }
        return false;
      };

      const t1 = setTimeout(attemptScroll, 150);
      const t2 = setTimeout(attemptScroll, 450);
      const t3 = setTimeout(attemptScroll, 900);
      const t4 = setTimeout(attemptScroll, 1600);

      const clearTimer = setTimeout(() => {
        setHighlightedLoneWolfId(null);
      }, 15000);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
        clearTimeout(t4);
        clearTimeout(clearTimer);
      };
    }
  }, [navigationContext, matches]);

  // Filter matches by tab and approval status
  const filteredByTab = matches.filter(m => {
    // Exclude hidden matches
    if ((m as any).isHidden === true) {
      return false;
    }

    // A match is approved if approvalStatus is 'approved', isApproved is true, or approval fields are omitted (legacy matches)
    const isApproved = (m as any).approvalStatus === 'approved' || (m as any).isApproved === true || ((m as any).approvalStatus === undefined && (m as any).isApproved === undefined);
    const isHostOfMatch = m.hostId === currentUserId;

    // Non-approved matches only appear to the Match Host or Admins for preview
    if (!isApproved && !isHostOfMatch && !isSystemAdmin) {
      return false;
    }

    if (activeTab === 'Registration') {
      return m.status === 'Registration';
    } else if (activeTab === 'Ongoing') {
      return m.status === 'Ongoing' || m.status === 'ResultUnderReview' || m.status === 'ResultRejected';
    } else {
      return m.status === 'Completed' || m.status === 'Cancelled';
    }
  });

  const displayedMatches = [...filteredByTab].sort((a, b) => {
    const aFollowed = a.hostId && followedHostIds.has(a.hostId) ? 1 : 0;
    const bFollowed = b.hostId && followedHostIds.has(b.hostId) ? 1 : 0;
    if (aFollowed !== bFollowed) {
      return bFollowed - aFollowed; // Followed host matches first
    }
    return 0;
  });

  // Copy helper
  const handleCopy = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setTimeout(() => setCopiedField(null), 2000);
  };

  // Open Join Modal with prefilled user info
  const handleInitiateJoin = (match: LoneWolfMatch, slot: 1 | 2) => {
    if (!userProfile) {
      alert('Please log in to join Lone Wolf matches.');
      return;
    }

    // Check if user is already joined in the other slot
    if (slot === 1 && match.player2?.userId === currentUserId) {
      alert('You are already registered in Slot 2 for this duel.');
      return;
    }
    if (slot === 2 && match.player1?.userId === currentUserId) {
      alert('You are already registered in Slot 1 for this duel.');
      return;
    }

    // Check private access code
    if (match.accessType === 'code' && match.accessCode) {
      setSelectedMatchToJoin({ match, slot });
      setShowAccessCodeModal(true);
      return;
    }

    proceedToJoinModal(match, slot);
  };

  const proceedToJoinModal = (match: LoneWolfMatch, slot: 1 | 2) => {
    setJoinIgn(userProfile?.gameName || userProfile?.displayName || '');
    setJoinUid(userProfile?.gamingUid || '');
    setJoinError('');
    setJoinSuccess('');
    setSelectedMatchToJoin({ match, slot });
    setShowAccessCodeModal(false);
  };

  const verifyAccessCodeAndProceed = () => {
    if (!selectedMatchToJoin) return;
    const correctCode = (selectedMatchToJoin.match.accessCode || '').trim().toUpperCase();
    if (enteredAccessCode.trim().toUpperCase() !== correctCode) {
      setJoinError('Invalid Access Code! Please verify the code from the host.');
      return;
    }
    proceedToJoinModal(selectedMatchToJoin.match, selectedMatchToJoin.slot);
  };

  // Confirm Join in Firestore Transaction
  const handleConfirmJoin = async () => {
    if (!selectedMatchToJoin || !userProfile) return;
    const { match, slot } = selectedMatchToJoin;
    const fee = match.entryFee || 0;

    if (!joinIgn.trim()) {
      setJoinError('Please provide your Free Fire Game In-Game Name (IGN).');
      return;
    }

    if (!joinUid.trim()) {
      setJoinError('Please provide your Free Fire Gaming UID.');
      return;
    }

    if (tokens < fee) {
      setJoinError(`Insufficient Tokens! Entry Fee is ${fee} Tokens. You have ${(Number(tokens) || 0).toFixed(2)} Tokens.`);
      return;
    }

    setIsJoining(true);
    setJoinError('');

    try {
      await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, 'lone_wolf_matches', match.id);
        const matchSnap = await transaction.get(matchRef);

        if (!matchSnap.exists()) {
          throw new Error('This match does not exist anymore.');
        }

        const freshMatch = matchSnap.data() as LoneWolfMatch;

        if (freshMatch.status !== 'Registration') {
          throw new Error('Registration is no longer open for this duel.');
        }

        // Check if slot is already occupied
        if (slot === 1 && freshMatch.player1) {
          throw new Error('Slot 1 (TBD 1) was just taken by another fighter!');
        }
        if (slot === 2 && freshMatch.player2) {
          throw new Error('Slot 2 (TBD 2) was just taken by another fighter!');
        }

        // Check User Tokens
        const userRef = doc(db, 'users', userProfile.userId);
        const userSnap = await transaction.get(userRef);
        const currentTokens = userSnap.data()?.tokens || 0;

        if (currentTokens < fee) {
          throw new Error(`Insufficient tokens! You need ${fee} tokens to join.`);
        }

        // Deduct Entry Fee if > 0
        if (fee > 0) {
          transaction.update(userRef, {
            tokens: currentTokens - fee,
            updatedAt: new Date().toISOString()
          });

          // Global wallet history
          const historyRef = doc(collection(db, 'wallet_history'));
          transaction.set(historyRef, {
            userId: userProfile.userId,
            userName: userProfile.displayName,
            type: 'debit',
            amount: fee,
            balanceAfter: currentTokens - fee,
            description: `Entry Fee for Lone Wolf #${match.matchNumber || match.id} (${match.title})`,
            matchId: match.id,
            createdAt: serverTimestamp()
          });

          // User tokenTransactions
          const userTokenTxRef = doc(collection(db, 'users', userProfile.userId, 'tokenTransactions'));
          transaction.set(userTokenTxRef, {
            type: 'entry_fee',
            amount: fee,
            balanceAfter: currentTokens - fee,
            matchId: match.id,
            matchTitle: match.title,
            description: `Lone Wolf 1v1 Entry Fee (Slot ${slot})`,
            createdAt: serverTimestamp()
          });
        }

        const newPlayer: LoneWolfPlayer = {
          userId: userProfile.userId,
          displayName: userProfile.displayName || 'Vortex Challenger',
          email: userProfile.email,
          photoURL: userProfile.photoURL || null,
          gamingUid: joinUid.trim(),
          gameName: joinIgn.trim(),
          slotNumber: slot,
          joinedAt: new Date().toISOString()
        };

        const updatedPlayer1 = slot === 1 ? newPlayer : (freshMatch.player1 || null);
        const updatedPlayer2 = slot === 2 ? newPlayer : (freshMatch.player2 || null);
        const newJoinedCount = (updatedPlayer1 ? 1 : 0) + (updatedPlayer2 ? 1 : 0);

        // If both players joined, transition status to 'Ongoing' (or keep Registration until match time)
        const newStatus = newJoinedCount === 2 ? 'Ongoing' : 'Registration';

        transaction.update(matchRef, {
          player1: updatedPlayer1,
          player2: updatedPlayer2,
          joinedCount: newJoinedCount,
          status: newStatus,
          updatedAt: serverTimestamp()
        });
      });

      if (fee > 0) {
        setTokens(prev => prev - fee);
      }

      setJoinSuccess(`Successfully joined Slot ${slot}! Prepare for battle.`);
      setTimeout(() => {
        setSelectedMatchToJoin(null);
        setJoinSuccess('');
      }, 1500);
    } catch (err: any) {
      console.error('Error joining lone wolf match:', err);
      setJoinError(err?.message || 'Failed to join match. Please try again.');
    } finally {
      setIsJoining(false);
    }
  };

  // Host / Admin update Room Credentials & YouTube Stream Link
  const handleSaveRoomDetails = async () => {
    if (!selectedMatchForRoom) return;

    if (!inputRoomId.trim()) {
      alert('Please enter the Room ID.');
      return;
    }

    if (!inputYoutubeUrl.trim()) {
      alert('⚠️ YouTube stream/live link is MANDATORY to set Room ID and Password!');
      return;
    }

    setIsUpdatingRoom(true);
    try {
      const matchRef = doc(db, 'lone_wolf_matches', selectedMatchForRoom.id);
      await updateDoc(matchRef, {
        roomId: inputRoomId.trim(),
        roomPassword: inputRoomPass.trim() || 'No Password',
        youtubeUrl: inputYoutubeUrl.trim(),
        youtubeLink: inputYoutubeUrl.trim(),
        roomProvidedAt: new Date().toISOString(),
        status: 'Ongoing',
        updatedAt: serverTimestamp()
      });

      setSelectedMatchForRoom(null);
      alert('Room credentials & YouTube live stream published successfully!');
    } catch (err: any) {
      console.error('Error saving room details:', err);
      alert('Failed to update room details.');
    } finally {
      setIsUpdatingRoom(false);
    }
  };

  // Upload Screenshot for Result
  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setResultError('Please select a valid image file.');
      return;
    }

    setIsUploadingScreenshot(true);
    setResultError('');
    try {
      // Compress image to ~120KB
      const { dataUrl } = await compressImageToDataUrl(file, 1280, 0.75, 120);
      
      // Upload compressed dataURL to ImgBB
      const uploadedUrl = await uploadScreenshotToImgBB(dataUrl, 'lonewolf_result');
      setResultScreenshotUrl(uploadedUrl);
    } catch (err: any) {
      console.error('Error uploading screenshot:', err);
      setResultError('Failed to upload screenshot. Try again.');
    } finally {
      setIsUploadingScreenshot(false);
    }
  };

  // Submit Result to Admin Review
  const handleSubmitMatchResult = async () => {
    if (!selectedMatchForResult) return;
    const match = selectedMatchForResult;

    const currentYoutube = inputYoutubeUrl.trim() || match.youtubeUrl || match.youtubeLink || '';
    if (!currentYoutube) {
      setResultError('⚠️ YouTube live stream link is required before declaring a winner! Please set the YouTube link first.');
      return;
    }

    if (!resultScreenshotUrl) {
      setResultError('⚠️ Please upload a match result screenshot before declaring a winner.');
      return;
    }

    const winner = resultWinnerSlot === 1 ? match.player1 : match.player2;
    if (!winner) {
      setResultError('Selected winning player does not exist.');
      return;
    }

    setIsSubmittingResult(true);
    setResultError('');

    try {
      await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, 'lone_wolf_matches', match.id);
        const matchSnap = await transaction.get(matchRef);

        if (!matchSnap.exists()) {
          throw new Error('Match not found.');
        }

        const freshMatch = matchSnap.data() as LoneWolfMatch;
        if (freshMatch.status === 'Completed' || freshMatch.status === 'ResultUnderReview' || freshMatch.prizeDistributed) {
          throw new Error('Match result is already submitted or completed.');
        }

        // Update Match document to ResultUnderReview
        transaction.update(matchRef, {
          status: 'ResultUnderReview',
          winnerSlot: resultWinnerSlot,
          winnerId: winner.userId,
          winnerName: winner.displayName,
          player1Score: Number(player1Score) || 0,
          player2Score: Number(player2Score) || 0,
          youtubeUrl: currentYoutube,
          youtubeLink: currentYoutube,
          resultScreenshotUrl: resultScreenshotUrl,
          resultSubmittedAt: new Date().toISOString(),
          updatedAt: serverTimestamp()
        });
      });

      setSelectedMatchForResult(null);
      setResultScreenshotUrl('');
      alert(`Match result submitted! It is now pending admin review.`);
    } catch (err: any) {
      console.error('Error submitting result:', err);
      setResultError(err?.message || 'Failed to submit match result.');
    } finally {
      setIsSubmittingResult(false);
    }
  };

  // Host Reschedule Match
  const handleRescheduleMatch = async () => {
    if (!selectedMatchToReschedule) return;

    if (!inputRescheduleDate.trim() || !inputRescheduleTime.trim()) {
      alert('Please enter both Date and Time to reschedule.');
      return;
    }

    setIsRescheduling(true);
    try {
      const matchRef = doc(db, 'lone_wolf_matches', selectedMatchToReschedule.id);
      await updateDoc(matchRef, {
        matchDate: inputRescheduleDate.trim(),
        matchTime: inputRescheduleTime.trim(),
        isRescheduled: true,
        rescheduledAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      alert(`Match rescheduled successfully to ${inputRescheduleDate.trim()} at ${inputRescheduleTime.trim()}!`);
      setSelectedMatchToReschedule(null);
    } catch (err: any) {
      console.error('Error rescheduling match:', err);
      alert('Failed to reschedule match.');
    } finally {
      setIsRescheduling(false);
    }
  };

  // Host Cancel Match & Refund Deposit
  const handleCancelMatch = async () => {
    if (!matchToCancel || !userProfile) return;
    const match = matchToCancel;

    setIsCancelling(true);
    try {
      const refundAmount = match.walletTokens || match.prizePool || 0;

      await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, 'lone_wolf_matches', match.id);
        const hostRef = doc(db, 'users', match.hostId);
        const hostSnap = await transaction.get(hostRef);
        const hostTokens = hostSnap.data()?.tokens || 0;

        // Refund host deposit
        transaction.update(hostRef, {
          tokens: hostTokens + refundAmount,
          updatedAt: new Date().toISOString()
        });

        // Record in wallet_history
        const historyRef = doc(collection(db, 'wallet_history'));
        transaction.set(historyRef, {
          userId: match.hostId,
          userName: match.hostName,
          type: 'credit',
          amount: refundAmount,
          balanceAfter: hostTokens + refundAmount,
          description: `Refund for Cancelled Lone Wolf #${match.matchNumber || match.id}`,
          matchId: match.id,
          createdAt: serverTimestamp()
        });

        // Refund entry fee to player1 if joined and fee > 0
        if (match.player1 && match.entryFee > 0) {
          const p1Ref = doc(db, 'users', match.player1.userId);
          const p1Snap = await transaction.get(p1Ref);
          if (p1Snap.exists()) {
            const p1Tokens = p1Snap.data()?.tokens || 0;
            transaction.update(p1Ref, { tokens: p1Tokens + match.entryFee });
          }
        }

        // Refund entry fee to player2 if joined and fee > 0
        if (match.player2 && match.entryFee > 0) {
          const p2Ref = doc(db, 'users', match.player2.userId);
          const p2Snap = await transaction.get(p2Ref);
          if (p2Snap.exists()) {
            const p2Tokens = p2Snap.data()?.tokens || 0;
            transaction.update(p2Ref, { tokens: p2Tokens + match.entryFee });
          }
        }

        // Update match status to Cancelled
        transaction.update(matchRef, {
          status: 'Cancelled',
          walletTokens: 0,
          updatedAt: serverTimestamp()
        });
      });

      if (match.hostId === currentUserId) {
        setTokens(prev => prev + refundAmount);
      }

      setMatchToCancel(null);
      alert(`Match cancelled. ${refundAmount} Tokens refunded to the host.`);
    } catch (err: any) {
      console.error('Error cancelling match:', err);
      alert('Failed to cancel match.');
    } finally {
      setIsCancelling(false);
    }
  };

  // Claim Lone Wolf Host Wallet
  const handleClaimLoneWolfWallet = async (match: LoneWolfMatch, amount: number) => {
    if (!match || isClaimingWallet || !userProfile) return;
    setIsClaimingWallet(true);

    try {
      await runTransaction(db, async (transaction) => {
        const matchRef = doc(db, 'lone_wolf_matches', match.id);
        const hostRef = doc(db, 'users', match.hostId);

        const matchSnap = await transaction.get(matchRef);
        const hostSnap = await transaction.get(hostRef);

        if (!matchSnap.exists()) {
          throw new Error('Match not found.');
        }

        const freshMatch = matchSnap.data();
        if (freshMatch.walletStatus !== 'unlocked') {
          throw new Error('Wallet is not unlocked by admin yet.');
        }

        const claimableBalance = freshMatch.walletBalance !== undefined ? Number(freshMatch.walletBalance) : amount;
        if (claimableBalance <= 0) {
          throw new Error('No claimable balance in this wallet.');
        }

        const hostTokens = hostSnap.data()?.tokens || 0;

        // Credit tokens to host main wallet
        transaction.update(hostRef, {
          tokens: hostTokens + claimableBalance,
          updatedAt: new Date().toISOString()
        });

        // Record in wallet_history
        const historyRef = doc(collection(db, 'wallet_history'));
        transaction.set(historyRef, {
          userId: match.hostId,
          userName: match.hostName || userProfile.displayName || 'Host',
          type: 'credit',
          amount: claimableBalance,
          balanceAfter: hostTokens + claimableBalance,
          description: `Claimed Unlocked Lone Wolf #${match.matchNumber || match.id} Wallet Balance (${claimableBalance} 🪙)`,
          matchId: match.id,
          createdAt: serverTimestamp()
        });

        // Record in tokenTransactions
        const tokenTxRef = doc(collection(db, 'users', match.hostId, 'tokenTransactions'));
        transaction.set(tokenTxRef, {
          type: 'prize',
          amount: claimableBalance,
          balanceAfter: hostTokens + claimableBalance,
          matchId: match.id,
          matchTitle: match.title,
          description: `Claimed Unlocked Lone Wolf 1v1 Host Wallet (${match.title})`,
          createdAt: serverTimestamp()
        });

        // Log in pro_host_wallet_history
        const hostHistRef = doc(collection(db, 'pro_host_wallet_history'));
        transaction.set(hostHistRef, {
          matchId: match.id,
          matchNumber: match.matchNumber || match.id,
          hostId: match.hostId,
          type: 'claimed',
          amount: claimableBalance,
          balanceAfter: 0,
          description: `Host claimed unlocked wallet balance of ${claimableBalance} Tokens to main wallet`,
          createdAt: serverTimestamp()
        });

        // Update match wallet status to claimed
        transaction.update(matchRef, {
          walletStatus: 'claimed',
          walletBalance: 0,
          claimedAt: new Date().toISOString(),
          updatedAt: serverTimestamp()
        });
      });

      // Update local state if host matches current user
      if (match.hostId === currentUserId) {
        setTokens(prev => prev + (match.walletBalance !== undefined ? Number(match.walletBalance) : amount));
      }

      alert(`Successfully claimed 🪙 ${match.walletBalance !== undefined ? match.walletBalance : amount} tokens to your main wallet!`);
      setSelectedMatchForWallet(null);
    } catch (err: any) {
      console.error('Error claiming lone wolf wallet:', err);
      alert('Failed to claim wallet: ' + (err.message || String(err)));
    } finally {
      setIsClaimingWallet(false);
    }
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-4 pb-24 text-slate-100 animate-in fade-in duration-300 px-2 sm:px-4">
      {/* LONE WOLF COMPACT CYBER HEADER */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#06102b] via-[#090e24] to-[#04060e] border border-cyan-500/30 p-3.5 sm:p-5 shadow-[0_0_30px_rgba(6,182,212,0.15)]">
        {/* Background Cyber Glow Accent */}
        <div className="absolute top-0 right-0 w-48 sm:w-80 h-48 sm:h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 sm:w-80 h-48 sm:h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-cyan-950/90 border border-cyan-400/50 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)] shrink-0">
              <Swords className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-black text-white uppercase tracking-wider font-mono drop-shadow-[0_0_15px_rgba(6,182,212,0.3)] leading-tight">
                Lone Wolf Arena
              </h1>
              <span className="text-[10px] text-cyan-400 font-mono font-semibold tracking-wide">1v1 Duel Cage</span>
            </div>
          </div>

          {/* Top Controls: Pending Matches & Tokens */}
          <div className="flex items-center gap-2 shrink-0">
            {hostPendingAndRejectedMatches.length > 0 && (
              <button
                onClick={() => setShowPendingLoneWolfModal(true)}
                className="bg-amber-950/80 hover:bg-amber-900/90 border border-amber-500/50 px-2.5 py-1 rounded-xl flex items-center gap-1.5 font-mono text-amber-300 text-[10px] font-bold shrink-0 transition cursor-pointer shadow-[0_0_12px_rgba(245,158,11,0.25)] animate-pulse"
                title="View Pending/Rejected Lone Wolf Matches"
              >
                <Clock className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <span className="hidden sm:inline">Lone Wolf Pending</span>
                <span className="inline sm:hidden">Pending</span>
                <span className="px-1.5 py-0.2 text-[9px] bg-amber-500/30 text-amber-200 border border-amber-400/40 rounded-full font-black">
                  {hostPendingAndRejectedMatches.length}
                </span>
              </button>
            )}

            {/* Quick Tokens Indicator */}
            <div className="bg-slate-950/80 border border-cyan-500/30 px-2.5 py-1 rounded-xl flex items-center gap-1.5 font-mono shrink-0">
              <Coins className="w-3 h-3 text-yellow-400" />
              <span className="text-[10px] font-bold text-white">
                {(Number(tokens) || 0).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3 PRIMARY TABS (Registration / Ongoing / Completed) - Mobile Responsive Grid/Row */}
      <div className="grid grid-cols-3 gap-1.5 sm:gap-3 border-b border-white/10 pb-3">
        {[
          { id: 'Registration', label: 'Registration', shortLabel: 'Register', count: matches.filter(m => m.status === 'Registration').length, icon: Swords },
          { id: 'Ongoing', label: 'Ongoing', shortLabel: 'Live', count: matches.filter(m => m.status === 'Ongoing' || m.status === 'ResultUnderReview' || m.status === 'ResultRejected').length, icon: Play },
          { id: 'Completed', label: 'Completed', shortLabel: 'Done', count: matches.filter(m => m.status === 'Completed' || m.status === 'Cancelled').length, icon: Trophy },
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`py-2 px-1.5 sm:px-5 rounded-xl text-[11px] sm:text-xs font-black uppercase font-mono tracking-wider transition-all flex items-center justify-center gap-1 sm:gap-2 cursor-pointer touch-manipulation select-none active:scale-95 ${
                isActive
                  ? 'bg-cyan-500 text-slate-950 shadow-[0_0_15px_rgba(6,182,212,0.5)] font-black'
                  : 'bg-slate-900/90 text-slate-400 hover:text-slate-200 border border-white/5'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-slate-950' : 'text-cyan-400'}`} />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="inline sm:hidden">{tab.shortLabel}</span>
              <span className={`text-[9.5px] sm:text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                isActive ? 'bg-black/30 text-slate-950 font-black' : 'bg-slate-800 text-slate-400'
              }`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* MATCHES LIST VIEW */}
      {loading ? (
        <div className="py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Loading Lone Wolf Duels...</p>
        </div>
      ) : displayedMatches.length === 0 ? (
        <div className="py-14 text-center bg-slate-950/60 border border-white/5 rounded-3xl p-5 space-y-3">
          <Swords className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-sm font-black text-slate-300 uppercase font-mono">
            No {activeTab} Duels Found
          </h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {activeTab === 'Registration'
              ? 'No open 1v1 matches right now. Check back soon for new duels!'
              : `There are currently no matches in the ${activeTab} stage.`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:gap-4">
          {displayedMatches.map((match) => {
            const isHost = match.hostId === currentUserId;
            const isPlayer1 = match.player1?.userId === currentUserId;
            const isPlayer2 = match.player2?.userId === currentUserId;
            const isParticipant = isPlayer1 || isPlayer2;
            const canManage = isHost || isSystemAdmin;
            const canSeeMessageIcon = isHost || isParticipant || isSystemAdmin;
            const hasRoomCredentials = Boolean(match.roomId);
            const isHighlighted = highlightedLoneWolfId === match.id;

            return (
              <motion.div
                key={match.id}
                id={`lonewolf-card-${match.id}`}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl sm:rounded-3xl p-3.5 sm:p-5 transition-all relative ${
                  isHighlighted
                    ? 'bg-gradient-to-b from-[#180e28] to-[#0a0518] border-2 border-pink-400 shadow-[0_0_35px_rgba(244,63,94,0.55)] ring-4 ring-pink-500/25 scale-[1.01]'
                    : 'bg-gradient-to-b from-[#090d24] to-[#040612] border border-cyan-500/25 hover:border-cyan-400/50 shadow-xl'
                }`}
              >
                {/* Highlight Badge */}
                {isHighlighted && (
                  <div className="absolute -top-3 left-4 z-20 flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-gradient-to-r from-pink-500 to-amber-500 text-black font-mono font-black text-[9px] uppercase tracking-wider shadow-[0_0_15px_rgba(244,63,94,0.7)] animate-bounce">
                    <span>🎯</span>
                    <span>Tagged Lone Wolf Match in Post</span>
                  </div>
                )}

                {/* Pulse Tagging Button (Top Right / Full Round Floating View) */}
                {onTagMatchForPulse && (isParticipant || isHost || isSystemAdmin) && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      const p1 = match.player1 as any;
                      const p2 = match.player2 as any;
                      const uProf = userProfile as any;

                      const p1IGN = p1?.gameName || p1?.inGameName || p1?.gamerTag || p1?.inGameUsername || p1?.ign;
                      const p1UserIGN = (p1?.userId === uProf?.userId || p1?.id === uProf?.userId) ? (uProf?.gameName || uProf?.inGameName || uProf?.gamerTag || uProf?.inGameUsername || uProf?.ign) : '';
                      const p1GameName = p1IGN || p1UserIGN || p1?.displayName || p1?.name || (typeof p1 === 'string' ? p1 : 'TBD 1');

                      const p2IGN = p2?.gameName || p2?.inGameName || p2?.gamerTag || p2?.inGameUsername || p2?.ign;
                      const p2UserIGN = (p2?.userId === uProf?.userId || p2?.id === uProf?.userId) ? (uProf?.gameName || uProf?.inGameName || uProf?.gamerTag || uProf?.inGameUsername || uProf?.ign) : '';
                      const p2GameName = p2IGN || p2UserIGN || p2?.displayName || p2?.name || (typeof p2 === 'string' ? p2 : 'TBD 2');
                      
                      onTagMatchForPulse({
                        type: 'lone_wolf',
                        id: match.id,
                        title: match.title || `Lone Wolf #${match.matchNumber || match.id.slice(-4)}`,
                        matchNumber: match.matchNumber || 101,
                        time: match.time || `${match.matchDate} at ${match.matchTime}`,
                        entryFee: match.entryFee || 0,
                        prizePool: match.prizePool || 0,
                        player1: p1GameName,
                        player2: p2GameName,
                        player1Photo: p1?.photoURL || p1?.avatar || '',
                        player2Photo: p2?.photoURL || p2?.avatar || '',
                        status: match.status
                      });
                    }}
                    className="absolute top-0 right-0 -translate-y-[65%] translate-x-[65%] w-[26px] h-[26px] flex items-center justify-center rounded-full bg-gradient-to-tr from-cyan-500 via-cyan-400 to-blue-500 shadow-[0_0_14px_rgba(6,182,212,0.8)] z-40 hover:scale-110 active:scale-95 transition-all cursor-pointer border-[1.5px] border-cyan-100"
                    title="Tag this Lone Wolf match in a Pulse post"
                  >
                    <Zap className="w-3 h-3 fill-slate-950 text-slate-950 shrink-0" />
                  </button>
                )}
                {/* SPONSOR BANNER AT THE TOP OF THE CARD - Sponsor by on left, Centered Large Full-Height Logo */}
                {match.hasSponsor && (match.sponsorName || match.sponsorLogoUrl || (match.sponsorType && match.sponsorType !== 'none')) && (() => {
                  const hasLogo = !!match.sponsorLogoUrl;
                  const customName = match.sponsorName && match.sponsorName !== 'Official Partner' ? match.sponsorName : null;

                  return (
                    <div 
                      className={`mb-2.5 h-10 sm:h-12 px-3 py-1 bg-gradient-to-r from-slate-950 via-cyan-950/40 to-slate-950 border border-cyan-500/35 hover:border-cyan-400/60 rounded-xl flex items-center justify-between gap-2 relative overflow-hidden shadow-[0_0_12px_rgba(6,182,212,0.15)] transition-all ${
                        match.sponsorLinkUrl ? 'cursor-pointer' : ''
                      }`}
                      onClick={(e) => {
                        if (match.sponsorLinkUrl) {
                          e.stopPropagation();
                          let link = match.sponsorLinkUrl.trim();
                          if (!link.startsWith('http://') && !link.startsWith('https://')) {
                            link = 'https://' + link;
                          }
                          window.open(link, '_blank', 'noopener,noreferrer');
                        }
                      }}
                    >
                      {/* Left Side: "SPONSORED BY" text */}
                      <div className="flex flex-col justify-center text-left shrink-0 z-10">
                        <div className="flex items-center gap-1 leading-none">
                          <Sparkles className="w-2.5 h-2.5 text-cyan-400 shrink-0" />
                          <span className="text-[9px] sm:text-[10px] font-mono font-bold text-cyan-400 uppercase tracking-wider">
                            SPONSORED BY
                          </span>
                        </div>
                        {customName && (
                          <div className="text-[10px] sm:text-xs font-black text-white font-mono truncate max-w-[100px] sm:max-w-[140px] mt-0.5 leading-none">
                            {customName}
                          </div>
                        )}
                      </div>

                      {/* Center: Full-Height Large Centered Logo */}
                      <div className="flex-1 flex items-center justify-center h-full px-2 z-10 min-w-0">
                        {hasLogo ? (
                          <div 
                            onClick={(e) => {
                              e.stopPropagation();
                              setPreviewImageModal({ url: match.sponsorLogoUrl!, title: customName || 'Sponsor' });
                            }}
                            className="h-full w-full max-w-[180px] sm:max-w-[240px] flex items-center justify-center cursor-pointer group"
                            title="Click to view sponsor logo preview"
                          >
                            <img 
                              src={match.sponsorLogoUrl!} 
                              alt={customName || 'Sponsor Logo'} 
                              className="h-full w-full object-contain group-hover:scale-105 active:scale-95 transition-transform drop-shadow-[0_0_8px_rgba(6,182,212,0.4)]" 
                            />
                          </div>
                        ) : null}
                      </div>

                      {/* Right Side: Visit Link Button if present */}
                      {match.sponsorLinkUrl ? (
                        <div className="shrink-0 z-10">
                          <a
                            href={match.sponsorLinkUrl.startsWith('http') ? match.sponsorLinkUrl : `https://${match.sponsorLinkUrl}`}
                            target="_blank"
                            rel="noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 sm:px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black rounded-lg text-[9px] sm:text-[10px] font-mono flex items-center gap-1 transition shadow-[0_0_10px_rgba(6,182,212,0.4)] border border-cyan-300/40 touch-manipulation active:scale-95 shrink-0"
                          >
                            <span>Visit</span>
                            <ExternalLink className="w-2.5 h-2.5 text-slate-950 shrink-0" />
                          </a>
                        </div>
                      ) : (
                        <div className="w-8 shrink-0 hidden sm:block"></div>
                      )}
                    </div>
                  );
                })()}

                {/* TOP BAR: Match Title, Rules & Prize */}
                {((match as any).approvalStatus === 'pending' || (match as any).isApproved === false) && (
                  <div className="w-full bg-rose-500/15 border border-rose-500/40 text-rose-300 text-[10px] font-black font-mono px-3 py-1.5 rounded-xl mb-3 flex items-center justify-between uppercase tracking-wider animate-pulse">
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-rose-400" />
                      <span>Pending Admin Approval (Under Review)</span>
                    </span>
                    <span className="text-[9px] bg-rose-500/20 px-2 py-0.5 rounded text-rose-200">
                      Hidden from players
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-2.5 mb-2.5 flex-wrap sm:flex-nowrap">
                  <div className="flex items-center gap-1.5 flex-wrap min-w-0">
                    <span className="px-2 py-0.5 bg-cyan-950 border border-cyan-500/40 rounded-md text-[9.5px] font-black text-cyan-300 font-mono uppercase shrink-0">
                      #{match.matchNumber || match.id.slice(-4)}
                    </span>
                    {match.weaponRule && (
                      <span className="text-[9.5px] sm:text-[10.5px] px-1.5 sm:px-2 py-0.5 rounded-md bg-indigo-950/80 border border-indigo-500/30 text-indigo-300 font-mono shrink-0">
                        {match.weaponRule}
                      </span>
                    )}
                    {((match as any).isRescheduled) && (
                      <span className="text-[9.5px] sm:text-[10.5px] px-2 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-mono font-bold flex items-center gap-1 uppercase tracking-wider shrink-0 shadow-[0_0_8px_rgba(245,158,11,0.25)] animate-pulse">
                        <Clock className="w-3 h-3 text-amber-400 shrink-0" />
                        <span>Rescheduled</span>
                      </span>
                    )}
                    {match.status === 'ResultUnderReview' && (
                      <span className="text-[9.5px] sm:text-[10.5px] px-2 py-0.5 rounded-md bg-yellow-500/20 border border-yellow-500/40 text-yellow-300 font-mono font-bold flex items-center gap-1 uppercase tracking-wider shrink-0 animate-pulse">
                        <Clock className="w-3 h-3 text-yellow-400 shrink-0" />
                        <span>Under Review</span>
                      </span>
                    )}
                  </div>

                  {/* Winner Prize and Entry Fee Box */}
                  <div className="flex items-center gap-1.5 sm:gap-2.5 font-mono shrink-0">
                    {/* Entry Fee */}
                    <div className="bg-slate-950/80 border border-slate-700/60 px-2 sm:px-2.5 py-1 rounded-xl text-right flex flex-col justify-center">
                      <div className="text-[7.5px] sm:text-[8.5px] text-slate-400 uppercase font-bold tracking-wider">
                        Entry Fee
                      </div>
                      <div className="text-[11px] sm:text-xs font-black text-slate-200 flex items-center justify-end gap-1">
                        {match.entryFee > 0 ? (
                          <>
                            <span>{match.entryFee}</span>
                            <span className="text-[10px]">🪙</span>
                          </>
                        ) : (
                          <span className="text-cyan-400 font-black">FREE</span>
                        )}
                      </div>
                    </div>

                    {/* Winner Prize (Booyah) - 80% Cyan + 20% Magenta Animated */}
                    <div className="booyah-prize-card-badge px-2.5 sm:px-3 py-1 rounded-xl text-right flex flex-col justify-center">
                      <div className="text-[7.5px] sm:text-[8.5px] text-cyan-300 uppercase font-black tracking-wider flex items-center justify-end gap-1">
                        <Trophy className="w-2.5 h-2.5 text-cyan-300 booyah-icon-animated" />
                        <span className="drop-shadow-sm">Booyah Prize</span>
                        <span className="px-1 py-[0.5px] bg-pink-500/30 border border-pink-400/50 rounded text-[6.5px] text-pink-300 font-extrabold ml-0.5">1v1</span>
                      </div>
                      <div className="text-xs sm:text-sm font-black booyah-text-animated flex items-center justify-end gap-1">
                        <Coins className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-300 shrink-0 booyah-icon-animated" />
                        <span>{match.prizePool} 🪙</span>
                      </div>
                    </div>

                    {/* Action Icons (Announcements, Chat & Three-Dot Dropdown Menu) */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Rules Icon Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowRulesMatch(match);
                        }}
                        className="p-2 bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 rounded-xl text-cyan-400 hover:text-cyan-300 transition touch-manipulation active:scale-95 flex items-center justify-center h-full min-h-[38px] min-w-[38px]"
                        title="Match Rules"
                      >
                        <BookOpen className="w-4 h-4 text-cyan-400" />
                      </button>

                      {/* Announcement Icon */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setActiveAnnouncementMatch(match);
                          if (userProfile) {
                            localStorage.setItem(`announcements_viewed_lonewolf_${match.id}_${userProfile.userId}`, Date.now().toString());
                          }
                        }}
                        className="p-2 bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 rounded-xl text-cyan-400 hover:text-cyan-300 transition touch-manipulation active:scale-95 flex items-center justify-center h-full min-h-[38px] min-w-[38px] relative"
                        title="Match Announcements"
                      >
                        <Megaphone className="w-4 h-4 text-cyan-400" />
                        {hasUnreadAnnouncements(match.id, match.announcements) && (
                          <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full border border-[#0a0c16] animate-pulse"></span>
                        )}
                      </button>

                      {/* Message / Chat Icon */}
                      {canSeeMessageIcon && (
                        <LoneWolfChatButton
                          match={match}
                          userProfile={userProfile}
                          isActive={activeChatMatch?.id === match.id}
                          onClick={() => {
                            setActiveChatMatch(match);
                            const uid = userProfile?.userId || (userProfile as any)?.uid || '';
                            if (uid) {
                              localStorage.setItem(`chat_viewed_lonewolf_${match.id}_${uid}`, Date.now().toString());
                              window.dispatchEvent(new CustomEvent('lonewolf_chat_viewed', { detail: { matchId: match.id } }));
                            }
                          }}
                        />
                      )}

                      {/* Three-Dot Dropdown Menu for Hosts / Admins (Top Right) */}
                      {canManage && (
                        <div className="relative">
                          <button
                            onClick={() => setOpenMenuMatchId(openMenuMatchId === match.id ? null : match.id)}
                            className="p-2 bg-slate-900/90 hover:bg-slate-800 border border-cyan-500/40 rounded-xl text-cyan-400 hover:text-cyan-300 transition touch-manipulation active:scale-95 flex items-center justify-center shadow-[0_0_8px_rgba(6,182,212,0.25)] h-full min-h-[38px]"
                            title="Host Options Menu"
                          >
                            <MoreVertical className="w-4 h-4 text-cyan-400" />
                          </button>

                          {/* Dropdown Menu */}
                          <AnimatePresence>
                            {openMenuMatchId === match.id && (
                              <>
                                {/* Backdrop */}
                                <div 
                                  className="fixed inset-0 z-40" 
                                  onClick={() => setOpenMenuMatchId(null)} 
                                />

                                <motion.div
                                  initial={{ opacity: 0, scale: 0.95, y: -5 }}
                                  animate={{ opacity: 1, scale: 1, y: 0 }}
                                  exit={{ opacity: 0, scale: 0.95, y: -5 }}
                                  className="absolute right-0 top-full mt-1.5 z-50 w-60 bg-[#080d24] border border-cyan-500/50 rounded-2xl p-2 shadow-[0_0_25px_rgba(0,0,0,0.85)] space-y-1 font-mono text-xs text-slate-200"
                                >
                                  <div className="px-2.5 py-1 text-[9.5px] font-bold text-cyan-400 uppercase border-b border-white/10 tracking-wider">
                                    Host Actions
                                  </div>

                                  {/* Option 1: Lone Wolf Wallet */}
                                  <button
                                    onClick={() => {
                                      setOpenMenuMatchId(null);
                                      setSelectedMatchForWallet(match);
                                    }}
                                    className="w-full px-2.5 py-2 rounded-xl hover:bg-emerald-950/70 text-emerald-300 flex items-center gap-2 transition text-left"
                                  >
                                    <Wallet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                    <span>Lone Wolf Wallet</span>
                                  </button>

                                  {/* Option 2: Set Room ID, Password & YouTube Link */}
                                  <button
                                    onClick={() => {
                                      setOpenMenuMatchId(null);
                                      setSelectedMatchForRoom(match);
                                      setInputRoomId(match.roomId || '');
                                      setInputRoomPass(match.roomPassword || '');
                                      setInputYoutubeUrl(match.youtubeUrl || match.youtubeLink || '');
                                    }}
                                    className="w-full px-2.5 py-2 rounded-xl hover:bg-cyan-950/70 text-cyan-300 flex items-center gap-2 transition text-left"
                                  >
                                    <Key className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                                    <span>Room ID, Pass & YouTube</span>
                                  </button>

                                  {/* Option 3: Declare Winner */}
                                  {!['ResultUnderReview', 'Completed', 'Cancelled'].includes(match.status) && !match.prizeDistributed && (
                                    <button
                                      onClick={() => {
                                        setOpenMenuMatchId(null);
                                        setSelectedMatchForResult(match);
                                        const p1 = typeof match.player1Score === 'number' && match.player1Score > 0 ? match.player1Score : 5;
                                        const p2 = typeof match.player2Score === 'number' && match.player2Score > 0 ? match.player2Score : 3;
                                        setPlayer1Score(p1);
                                        setPlayer2Score(p2);
                                        setResultWinnerSlot(p1 >= p2 ? 1 : 2);
                                        setInputYoutubeUrl(match.youtubeUrl || match.youtubeLink || '');
                                      }}
                                      className="w-full px-2.5 py-2 rounded-xl hover:bg-yellow-950/70 text-yellow-300 flex items-center gap-2 transition text-left"
                                    >
                                      <Trophy className="w-3.5 h-3.5 text-yellow-400 shrink-0" />
                                      <span>Declare Winner</span>
                                    </button>
                                  )}

                                  {/* Option 4: Reschedule (Available if in Registration & joinedCount < 2) */}
                                  {match.status === 'Registration' && (match.joinedCount || 0) < 2 && (
                                    <button
                                      onClick={() => {
                                        setOpenMenuMatchId(null);
                                        setSelectedMatchToReschedule(match);
                                        const rawDate = (match.matchDate || '').trim();
                                        const validDate = /^\d{4}-\d{2}-\d{2}$/.test(rawDate) ? rawDate : '';
                                        const rawTime = (match.matchTime || '').trim();
                                        const validTime = /^\d{2}:\d{2}$/.test(rawTime) ? rawTime : rawTime;
                                        setInputRescheduleDate(validDate || rawDate);
                                        setInputRescheduleTime(validTime || rawTime);
                                      }}
                                      className="w-full px-2.5 py-2 rounded-xl hover:bg-indigo-950/70 text-indigo-300 flex items-center gap-2 transition text-left border-t border-white/5 pt-1.5"
                                    >
                                      <Calendar className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                      <span>Reschedule Match</span>
                                    </button>
                                  )}

                                  {/* Option 5: Cancel Match & Refund */}
                                  {isHost && match.status === 'Registration' && (match.joinedCount || 0) === 0 && !match.player1 && !match.player2 && (
                                    <button
                                      onClick={() => {
                                        setOpenMenuMatchId(null);
                                        setMatchToCancel(match);
                                      }}
                                      className="w-full px-2.5 py-2 rounded-xl hover:bg-red-950/70 text-red-400 flex items-center gap-2 transition text-left border-t border-white/10 mt-1"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
                                      <span>Cancel Match & Refund</span>
                                    </button>
                                  )}

                                  {/* Option 6: Hide / Unhide Match (Admin/Host) */}
                                  {/* Option 6: Hide Match */}
                                  {canDeleteOrHideMatch && (
                                    <button
                                      onClick={async (e) => {
                                        e.stopPropagation();
                                        setOpenMenuMatchId(null);
                                        try {
                                          const matchRef = doc(db, 'lone_wolf_matches', match.id);
                                          await updateDoc(matchRef, {
                                            isHidden: !(match as any).isHidden,
                                            updatedAt: serverTimestamp()
                                          });
                                        } catch (err: any) {
                                          console.error('Error toggling hide match:', err);
                                        }
                                      }}
                                      className="w-full px-2.5 py-2 rounded-xl hover:bg-amber-950/70 text-amber-300 flex items-center gap-2 transition text-left border-t border-white/10 mt-1 cursor-pointer"
                                    >
                                      {(match as any).isHidden ? <Eye className="w-3.5 h-3.5 text-amber-400 shrink-0" /> : <EyeOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                                      <span>{(match as any).isHidden ? 'Unhide Match' : 'Hide Match'}</span>
                                    </button>
                                  )}

                                  {/* Option 7: Delete Match Permanently (Owner/Super Admin Only) */}
                                  {canDeleteOrHideMatch && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setOpenMenuMatchId(null);
                                        setMatchToDelete({ id: match.id, title: match.title || '1v1 Lone Wolf Match' });
                                      }}
                                      className="w-full px-2.5 py-2 rounded-xl hover:bg-rose-950/70 text-rose-300 flex items-center gap-2 transition text-left border-t border-white/10 mt-1 cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                      <span>Delete Match</span>
                                    </button>
                                  )}
                                </motion.div>
                              </>
                            )}
                          </AnimatePresence>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Row 2: Match Name / Title (Single dedicated row below) */}
                <div className="mb-3 flex items-center gap-2">
                  <span className="w-1 h-3.5 bg-gradient-to-b from-cyan-400 to-blue-500 rounded-full shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.5)]"></span>
                  <h3 className="text-xs sm:text-[13px] font-black text-slate-100 uppercase tracking-wide font-mono truncate">
                    {match.title}
                  </h3>
                </div>

                {/* THE 1v1 VERSUS ARENA BOX - Side-by-Side Row Layout */}
                <div className="flex items-stretch gap-1.5 sm:gap-3 my-2.5">
                  {/* LEFT BOX: TBD 1 / ALPHA SIDE (Cyan Accent) */}
                  <div className="flex-1 min-w-0 bg-gradient-to-r from-cyan-950/40 via-slate-950/90 to-slate-950/80 border border-cyan-500/30 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between min-h-[120px] sm:min-h-[140px] relative shadow-lg">
                    {match.winnerSlot === 1 && (
                      <div className="flex justify-end mb-1">
                        <span className="text-[8px] sm:text-[9.5px] font-black text-yellow-300 font-mono bg-yellow-500/20 border border-yellow-400/40 px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-[0_0_8px_rgba(234,179,8,0.4)] shrink-0">
                          <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-400" /> WINNER
                        </span>
                      </div>
                    )}

                    {match.player1 ? (
                      <div className="flex flex-col items-center justify-center my-auto py-1 space-y-1.5 w-full text-center">
                        <span className="text-[8.5px] sm:text-[9.5px] font-mono font-black text-cyan-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-cyan-950/80 border border-cyan-500/30">
                          Slot 1 (Alpha)
                        </span>
                        <div 
                          onClick={() => {
                            if (match.player1?.photoURL) {
                              setPreviewImageModal({ 
                                url: match.player1.photoURL, 
                                title: `${match.player1.gameName || match.player1.displayName}'s Profile Picture` 
                              });
                            }
                          }}
                          className={`w-18 h-18 sm:w-22 sm:h-22 rounded-full bg-cyan-950/90 border-2 sm:border-[3px] border-cyan-400 flex items-center justify-center text-cyan-300 font-bold font-mono text-2xl sm:text-3xl overflow-hidden shadow-[0_0_20px_rgba(6,182,212,0.55)] shrink-0 ${
                            match.player1?.photoURL ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''
                          }`}
                          title={match.player1?.photoURL ? "Click to preview profile picture" : (match.player1.gameName || match.player1.displayName)}
                        >
                          {match.player1.photoURL ? (
                            <img src={match.player1.photoURL} alt={match.player1.gameName || match.player1.displayName} className="w-full h-full object-cover" />
                          ) : (
                            (match.player1.gameName || match.player1.displayName).charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="space-y-0.5 max-w-full">
                          <div className="text-xs sm:text-sm font-black text-white font-mono truncate max-w-full px-1 tracking-wide" title={match.player1.gameName || match.player1.displayName}>
                            {match.player1.gameName || match.player1.displayName}
                          </div>
                          {match.player1.gamingUid && (
                            <div className="text-[8.5px] sm:text-[9.5px] font-mono text-cyan-300/80 font-bold bg-slate-950/60 px-1.5 py-0.5 rounded border border-white/5 truncate">
                              UID: {match.player1.gamingUid}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-1 sm:py-2 space-y-1 my-auto">
                        <span className="text-[8.5px] sm:text-[9.5px] font-mono font-black text-cyan-400/80 uppercase tracking-wider px-2 py-0.5 rounded bg-slate-950/80 border border-white/10">
                          Slot 1 (Alpha)
                        </span>
                        <div className="text-[10px] sm:text-xs font-mono font-bold text-cyan-400/90 leading-tight">
                          Waiting for Challenger (TBD 1)
                        </div>
                        <p className="text-[8px] sm:text-[9.5px] text-slate-400">Open slot ready to claim</p>
                        
                        {match.status === 'Registration' && (
                          <button
                            onClick={() => handleInitiateJoin(match, 1)}
                            className="w-full py-1.5 sm:py-2 px-1 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black uppercase text-[10px] sm:text-xs font-mono rounded-lg sm:rounded-xl transition shadow-[0_0_12px_rgba(6,182,212,0.3)] cursor-pointer touch-manipulation active:scale-95"
                          >
                            Join TBD 1
                          </button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* CENTER BOX: VS BADGE & TIME/DATE - Always in Middle */}
                  <div className="shrink-0 flex flex-col items-center justify-center min-w-[52px] sm:min-w-[76px] px-0.5 sm:px-1.5 font-mono gap-1 sm:gap-1.5 text-center">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-slate-950 border-2 border-cyan-400 flex items-center justify-center shadow-[0_0_15px_rgba(6,182,212,0.5)] shrink-0">
                      <span className="text-xs sm:text-sm font-black text-cyan-400 italic tracking-tighter drop-shadow-[0_0_8px_rgba(6,182,212,0.8)]">
                        VS
                      </span>
                    </div>

                    <div className="flex flex-col items-center">
                      <div className="text-[9.5px] sm:text-[11px] font-bold text-slate-200 flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-cyan-400 shrink-0" />
                        <span>{match.matchTime || 'Scheduled'}</span>
                      </div>
                      <div className="text-[8px] sm:text-[9px] text-slate-400 font-medium">
                        {match.matchDate}
                      </div>
                      {((match as any).isRescheduled) && (
                        <span className="text-[7.5px] font-bold text-amber-300 uppercase bg-amber-500/20 border border-amber-500/40 px-1.5 py-0.5 rounded mt-0.5 flex items-center gap-0.5 font-mono shadow-[0_0_6px_rgba(245,158,11,0.3)]">
                          <Clock className="w-2 h-2 text-amber-400 shrink-0" />
                          <span>Rescheduled</span>
                        </span>
                      )}
                    </div>

                    {match.status === 'Completed' && (
                      <div className="text-[9px] sm:text-xs font-black text-yellow-400 font-mono bg-yellow-500/15 px-1.5 py-0.5 rounded border border-yellow-500/30 whitespace-nowrap">
                        {match.player1Score || 0} - {match.player2Score || 0}
                      </div>
                    )}
                  </div>

                  {/* RIGHT BOX: TBD 2 / OMEGA SIDE (Magenta/Pink Accent) */}
                  <div className="flex-1 min-w-0 bg-gradient-to-l from-fuchsia-950/40 via-slate-950/90 to-slate-950/80 border border-fuchsia-500/30 rounded-xl sm:rounded-2xl p-2.5 sm:p-3.5 flex flex-col justify-between min-h-[120px] sm:min-h-[140px] relative shadow-lg">
                    {match.winnerSlot === 2 && (
                      <div className="flex justify-end mb-1">
                        <span className="text-[8px] sm:text-[9.5px] font-black text-yellow-300 font-mono bg-yellow-500/20 border border-yellow-400/40 px-1.5 py-0.5 rounded-full flex items-center gap-1 shadow-[0_0_8px_rgba(234,179,8,0.4)] shrink-0">
                          <Crown className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-yellow-400" /> WINNER
                        </span>
                      </div>
                    )}

                    {match.player2 ? (
                      <div className="flex flex-col items-center justify-center my-auto py-1 space-y-1.5 w-full text-center">
                        <span className="text-[8.5px] sm:text-[9.5px] font-mono font-black text-fuchsia-400 uppercase tracking-wider px-2 py-0.5 rounded-md bg-fuchsia-950/80 border border-fuchsia-500/30">
                          Slot 2 (Omega)
                        </span>
                        <div 
                          onClick={() => {
                            if (match.player2?.photoURL) {
                              setPreviewImageModal({ 
                                url: match.player2.photoURL, 
                                title: `${match.player2.gameName || match.player2.displayName}'s Profile Picture` 
                              });
                            }
                          }}
                          className={`w-18 h-18 sm:w-22 sm:h-22 rounded-full bg-fuchsia-950/90 border-2 sm:border-[3px] border-fuchsia-400 flex items-center justify-center text-fuchsia-300 font-bold font-mono text-2xl sm:text-3xl overflow-hidden shadow-[0_0_20px_rgba(217,70,239,0.55)] shrink-0 ${
                            match.player2?.photoURL ? 'cursor-pointer hover:scale-105 active:scale-95 transition-transform' : ''
                          }`}
                          title={match.player2?.photoURL ? "Click to preview profile picture" : (match.player2.gameName || match.player2.displayName)}
                        >
                          {match.player2.photoURL ? (
                            <img src={match.player2.photoURL} alt={match.player2.gameName || match.player2.displayName} className="w-full h-full object-cover" />
                          ) : (
                            (match.player2.gameName || match.player2.displayName).charAt(0).toUpperCase()
                          )}
                        </div>
                        <div className="space-y-0.5 max-w-full">
                          <div className="text-xs sm:text-sm font-black text-white font-mono truncate max-w-full px-1 tracking-wide" title={match.player2.gameName || match.player2.displayName}>
                            {match.player2.gameName || match.player2.displayName}
                          </div>
                          {match.player2.gamingUid && (
                            <div className="text-[8.5px] sm:text-[9.5px] font-mono text-fuchsia-300/80 font-bold bg-slate-950/60 px-1.5 py-0.5 rounded border border-white/5 truncate">
                              UID: {match.player2.gamingUid}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-1 sm:py-2 space-y-1 my-auto">
                        <span className="text-[8.5px] sm:text-[9.5px] font-mono font-black text-fuchsia-400/80 uppercase tracking-wider px-2 py-0.5 rounded bg-slate-950/80 border border-white/10">
                          Slot 2 (Omega)
                        </span>
                        <div className="text-[10px] sm:text-xs font-mono font-bold text-fuchsia-400/90 leading-tight">
                          Waiting for Challenger (TBD 2)
                        </div>
                        <p className="text-[8px] sm:text-[9.5px] text-slate-400">Open slot ready to claim</p>
                        
                        {match.status === 'Registration' && (
                          <button
                            onClick={() => handleInitiateJoin(match, 2)}
                            className="w-full py-1.5 sm:py-2 px-1 bg-gradient-to-r from-fuchsia-600 to-pink-600 hover:from-fuchsia-500 hover:to-pink-500 text-white font-black uppercase text-[10px] sm:text-xs font-mono rounded-lg sm:rounded-xl transition shadow-[0_0_12px_rgba(217,70,239,0.3)] cursor-pointer touch-manipulation active:scale-95"
                          >
                            Join TBD 2
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* REJECTION NOTICE */}
                {match.status === 'ResultRejected' && (
                  <div className="mt-3 bg-red-950/40 border border-red-500/30 rounded-xl p-3 shadow-inner">
                    <div className="flex items-center gap-1.5 mb-1 text-red-400 font-bold text-[10.5px] uppercase tracking-wider font-mono">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Result Rejected by Admin</span>
                    </div>
                    <p className="text-xs text-red-200/90 font-mono">
                      {match.rejectedReason || 'No specific reason provided. Please verify scores and proofs before resubmitting.'}
                    </p>
                  </div>
                )}

                {/* BOTTOM CONTROLS & ACTIONS - Mobile Friendly Responsive Flex */}
                <div className="mt-2.5 pt-2.5 border-t border-white/10 flex flex-col xs:flex-row items-start xs:items-center justify-between gap-2 text-xs font-mono">
                  {/* Host info with Profile Picture, Map & Admin Locked Tokens Badge strictly on the right */}
                  <div className="flex items-center gap-2 text-slate-400 text-[10.5px] sm:text-[11.5px] min-w-0 max-w-full flex-nowrap overflow-x-auto no-scrollbar py-0.5">
                    {/* Host Avatar & Name */}
                    <div 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (match.hostId) {
                          setSelectedHostForModal({
                            hostId: match.hostId,
                            hostName: match.hostName || 'Host',
                            hostPhotoUrl: match.hostPhotoUrl
                          });
                        }
                      }}
                      className="flex items-center gap-1.5 shrink-0 whitespace-nowrap cursor-pointer hover:opacity-90 transition-opacity"
                      title="Click to view host profile"
                    >
                      <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-full bg-cyan-950 border border-cyan-400/60 overflow-hidden flex items-center justify-center text-cyan-300 font-bold font-mono text-[10px] shrink-0 shadow-[0_0_8px_rgba(6,182,212,0.35)] hover:scale-110 transition-transform">
                        {match.hostPhotoUrl ? (
                          <img src={match.hostPhotoUrl} alt={match.hostName} className="w-full h-full object-cover" />
                        ) : (
                          (match.hostName || 'H').charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 min-w-0 whitespace-nowrap">
                        <span className="text-[10px] sm:text-[11px] font-black text-white uppercase tracking-wider truncate cursor-pointer hover:text-cyan-300 transition-colors underline decoration-cyan-500/20">
                          HOST: {match.hostName}
                        </span>
                        <HostFollowButton 
                          hostId={match.hostId || (match as any).hostUserId || (match as any).createdBy || 'official_host'} 
                          currentUserId={currentUserId || (userProfile as any)?.userId || (userProfile as any)?.uid} 
                          followType="host"
                        />
                        {match.mapName && (
                          <span className="text-slate-400 font-mono text-[10px] shrink-0">• {match.mapName}</span>
                        )}
                      </div>
                    </div>

                    {/* Locked Tokens Badge (Lock Icon & Coins Only) */}
                    {(() => {
                      const hostDeposit = Number(match.walletTokens) || Number(match.prizePool) || 0;
                      const p1Fee = match.player1 ? (Number(match.entryFee) || 0) : 0;
                      const p2Fee = match.player2 ? (Number(match.entryFee) || 0) : 0;
                      const totalLockedTokens = match.walletBalance !== undefined ? match.walletBalance : (hostDeposit + p1Fee + p2Fee);
                      const isUnlocked = match.walletStatus === 'unlocked';

                      return (
                        <div 
                          onClick={(e) => {
                            if (canManage) {
                              e.stopPropagation();
                              setSelectedMatchForWallet(match);
                            }
                          }}
                          className={`flex items-center gap-1 px-1.5 py-0.5 rounded-lg border font-mono text-[10px] sm:text-xs shrink-0 whitespace-nowrap shadow-md transition-all ${
                            canManage ? 'cursor-pointer hover:scale-105' : ''
                          } ${
                            isUnlocked 
                              ? 'bg-cyan-950/90 border-cyan-500/40 text-cyan-300' 
                              : 'bg-emerald-950/90 border-emerald-500/40 text-emerald-300'
                          }`}
                          title={canManage ? `Click to view wallet details. ${isUnlocked ? 'Unlocked' : 'Locked'}: ${totalLockedTokens} 🪙` : `${isUnlocked ? 'Unlocked' : 'Total Locked'} Tokens: ${totalLockedTokens} 🪙`}
                        >
                          {isUnlocked ? <Unlock className="w-3 h-3 text-cyan-400 shrink-0" /> : <Lock className="w-3 h-3 text-emerald-400 shrink-0" />}
                          <span className="font-black text-white">{totalLockedTokens} 🪙</span>
                        </div>
                      );
                    })()}
                  </div>

                  {/* Actions buttons */}
                  <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full xs:w-auto justify-end relative">
                    {/* Direct Wallet / Claim option for Completed matches */}
                    {match.status === 'Completed' && canManage && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedMatchForWallet(match);
                        }}
                        className={`px-2.5 py-1 text-[10px] sm:text-[11px] font-bold font-mono rounded-xl transition flex items-center gap-1.5 shrink-0 cursor-pointer ${
                          match.walletStatus === 'unlocked'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-500/20 active:scale-95'
                            : match.walletStatus === 'claimed'
                            ? 'bg-cyan-950/80 border border-cyan-500/30 text-cyan-400'
                            : 'bg-slate-900 border border-slate-700/60 text-slate-400'
                        }`}
                      >
                        <Wallet className="w-3.5 h-3.5" />
                        <span>
                          {match.walletStatus === 'unlocked' 
                            ? 'Claim Wallet' 
                            : match.walletStatus === 'claimed' 
                            ? 'Claimed' 
                            : 'Wallet Locked'}
                        </span>
                      </button>
                    )}

                    {/* YouTube Stream Link button if present */}
                    {(match.youtubeUrl || match.youtubeLink) && (
                      <a
                        href={match.youtubeUrl || match.youtubeLink || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-2 sm:px-2.5 py-1 bg-red-600/20 hover:bg-red-600/30 border border-red-500/40 rounded-xl text-red-400 text-[10px] sm:text-[11px] font-mono font-bold flex items-center gap-1 transition shadow-[0_0_8px_rgba(239,68,68,0.2)] shrink-0"
                        title="Watch Live Stream on YouTube"
                      >
                        <Youtube className="w-3.5 h-3.5 text-red-500 animate-pulse shrink-0" />
                        <span className="hidden sm:inline">Watch Stream</span>
                        <span className="sm:hidden">Live</span>
                      </a>
                    )}

                    {/* Room Credentials Info button */}
                    {hasRoomCredentials && (
                      <button
                        onClick={() => {
                          setSelectedMatchForRoom(match);
                          setInputRoomId(match.roomId || '');
                          setInputRoomPass(match.roomPassword || '');
                          setInputYoutubeUrl(match.youtubeUrl || match.youtubeLink || '');
                        }}
                        className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 border border-cyan-500/40 text-cyan-300 font-bold text-[10px] sm:text-[11px] rounded-xl transition flex items-center gap-1 shrink-0"
                      >
                        <Key className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Room Info</span>
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* JOIN CONFIRMATION MODAL */}
      {selectedMatchToJoin && !showAccessCodeModal && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#080d22] border border-cyan-500/40 rounded-3xl p-6 max-w-md w-full relative shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-500/20 rounded-xl text-cyan-400">
                  <Swords className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                    Join Lone Wolf 1v1 (Slot {selectedMatchToJoin.slot})
                  </h3>
                  <p className="text-[10px] text-cyan-300/80 font-mono">Free Fire Duel Arena</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMatchToJoin(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {joinError && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{joinError}</span>
              </div>
            )}

            {joinSuccess && (
              <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{joinSuccess}</span>
              </div>
            )}

            <div className="bg-slate-950/80 border border-white/5 rounded-2xl p-3.5 space-y-2 text-xs font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Match Title:</span>
                <span className="text-white font-bold">{selectedMatchToJoin.match.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Winner Prize:</span>
                <span className="text-yellow-400 font-bold">{selectedMatchToJoin.match.prizePool} Tokens</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Entry Fee:</span>
                <span className="text-cyan-400 font-bold">
                  {selectedMatchToJoin.match.entryFee > 0 ? `${selectedMatchToJoin.match.entryFee} Tokens` : 'FREE'}
                </span>
              </div>
              <div className="flex justify-between border-t border-white/5 pt-2">
                <span className="text-slate-400">Your Balance:</span>
                <span className="text-white font-bold">{(Number(tokens) || 0).toFixed(2)} Tokens</span>
              </div>
            </div>

            {/* Game In-Game Name and Gaming UID */}
            <div className="space-y-3 pt-1">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-300 uppercase font-mono">
                  Free Fire In-Game Name (IGN)
                </label>
                <input
                  type="text"
                  value={joinIgn}
                  onChange={e => setJoinIgn(e.target.value)}
                  placeholder="Your FF character name"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-300 uppercase font-mono">
                  Free Fire Gaming UID
                </label>
                <input
                  type="text"
                  value={joinUid}
                  onChange={e => setJoinUid(e.target.value)}
                  placeholder="e.g. 192837465"
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setSelectedMatchToJoin(null)}
                disabled={isJoining}
                className="flex-1 py-2.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold font-mono transition"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmJoin}
                disabled={isJoining}
                className="flex-1 py-2.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-black text-xs uppercase tracking-wider font-mono rounded-xl transition shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isJoining ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
                    <span>Joining...</span>
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4 text-black font-black" />
                    <span>Confirm & Join</span>
                  </>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ACCESS CODE MODAL IF MATCH IS PRIVATE */}
      {showAccessCodeModal && selectedMatchToJoin && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#080d22] border border-indigo-500/40 rounded-3xl p-6 max-w-sm w-full relative shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/20 rounded-xl text-indigo-400">
                  <Key className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-black text-white uppercase font-mono">
                  Private Duel Access
                </h3>
              </div>
              <button
                onClick={() => {
                  setShowAccessCodeModal(false);
                  setSelectedMatchToJoin(null);
                }}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300">
              This Lone Wolf match requires an Access Code provided by the host.
            </p>

            {joinError && (
              <div className="p-2 bg-red-500/10 border border-red-500/30 rounded-lg text-[11px] text-red-400">
                {joinError}
              </div>
            )}

            <input
              type="text"
              placeholder="Enter 6-character Code"
              value={enteredAccessCode}
              onChange={e => setEnteredAccessCode(e.target.value.toUpperCase())}
              className="w-full bg-slate-950 border border-indigo-500/40 rounded-xl px-3.5 py-2.5 text-center text-sm font-black font-mono tracking-widest text-indigo-300 uppercase outline-none focus:border-indigo-400"
            />

            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowAccessCodeModal(false);
                  setSelectedMatchToJoin(null);
                }}
                className="flex-1 py-2 bg-slate-900 text-slate-300 rounded-xl text-xs font-bold font-mono"
              >
                Cancel
              </button>
              <button
                onClick={verifyAccessCodeAndProceed}
                className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold font-mono transition"
              >
                Unlock
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* ROOM DETAILS MODAL (VIEW OR EDIT) */}
      {selectedMatchForRoom && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#080d22] border border-cyan-500/40 rounded-3xl p-6 max-w-md w-full relative shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-cyan-500/20 rounded-xl text-cyan-400">
                  <Key className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                    Custom Room Credentials
                  </h3>
                  <p className="text-[10px] text-cyan-300/80 font-mono">
                    {selectedMatchForRoom.title}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMatchForRoom(null)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Host Edit Form if Host / Admin */}
            {(selectedMatchForRoom.hostId === currentUserId || isSystemAdmin) ? (
              <div className="space-y-3 font-mono">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-cyan-300 uppercase">
                    Room ID
                  </label>
                  <input
                    type="text"
                    value={inputRoomId}
                    onChange={e => setInputRoomId(e.target.value)}
                    placeholder="e.g. 8492049"
                    className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-cyan-300 uppercase">
                    Room Password
                  </label>
                  <input
                    type="text"
                    value={inputRoomPass}
                    onChange={e => setInputRoomPass(e.target.value)}
                    placeholder="e.g. 1234"
                    className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Mandatory YouTube Stream Link */}
                <div className="space-y-1 pt-1">
                  <label className="block text-[11px] font-bold text-red-400 uppercase flex items-center justify-between">
                    <span className="flex items-center gap-1">
                      <Youtube className="w-3.5 h-3.5 text-red-500" />
                      YouTube Stream Link (Mandatory)
                    </span>
                    <span className="text-[9px] text-red-400 font-normal">*Required</span>
                  </label>
                  <input
                    type="url"
                    value={inputYoutubeUrl}
                    onChange={e => setInputYoutubeUrl(e.target.value)}
                    placeholder="https://youtube.com/live/... or https://youtu.be/..."
                    className="w-full bg-slate-950 border border-red-500/40 rounded-xl px-3.5 py-2 text-xs text-white outline-none focus:border-red-400"
                  />
                  <p className="text-[9.5px] text-slate-400">
                    ⚠️ Mandatory: Room ID & Winner declaration require a valid YouTube live stream URL.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSaveRoomDetails}
                  disabled={isUpdatingRoom}
                  className="w-full py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition shadow-[0_0_15px_rgba(6,182,212,0.4)] disabled:opacity-50 mt-2"
                >
                  {isUpdatingRoom ? 'Saving...' : 'Publish Room to Players'}
                </button>
              </div>
            ) : (
              /* Player View Credentials Box */
              <div className="space-y-3 font-mono">
                {selectedMatchForRoom.roomId ? (
                  <div className="space-y-2">
                    <div className="bg-slate-950 border border-cyan-500/30 rounded-2xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Room ID</div>
                        <div className="text-base font-black text-cyan-300">
                          {selectedMatchForRoom.roomId}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(selectedMatchForRoom.roomId || '', 'room_id')}
                        className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                      >
                        {copiedField === 'room_id' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'room_id' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <div className="bg-slate-950 border border-cyan-500/30 rounded-2xl p-3 flex items-center justify-between">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase">Room Password</div>
                        <div className="text-base font-black text-cyan-300">
                          {selectedMatchForRoom.roomPassword || 'No Password'}
                        </div>
                      </div>
                      <button
                        onClick={() => handleCopy(selectedMatchForRoom.roomPassword || '', 'room_pass')}
                        className="px-3 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                      >
                        {copiedField === 'room_pass' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'room_pass' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    {(selectedMatchForRoom.youtubeUrl || selectedMatchForRoom.youtubeLink) && (
                      <a
                        href={selectedMatchForRoom.youtubeUrl || selectedMatchForRoom.youtubeLink || '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl transition flex items-center justify-center gap-2 shadow-[0_0_12px_rgba(239,68,68,0.4)]"
                      >
                        <Youtube className="w-4 h-4 text-white animate-pulse" />
                        <span>Watch Live Stream on YouTube</span>
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="py-6 text-center text-slate-400 text-xs">
                    ⏳ The host has not published Room ID yet. Please check 5-10 minutes before match time!
                  </div>
                )}
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* LONE WOLF WALLET DETAILS MODAL */}
      {selectedMatchForWallet && (() => {
        const hostDeposit = Number(selectedMatchForWallet.walletTokens) || Number(selectedMatchForWallet.prizePool) || 0;
        const p1Fee = selectedMatchForWallet.player1 ? (Number(selectedMatchForWallet.entryFee) || 0) : 0;
        const p2Fee = selectedMatchForWallet.player2 ? (Number(selectedMatchForWallet.entryFee) || 0) : 0;
        const totalLockedTokens = selectedMatchForWallet.walletBalance !== undefined ? selectedMatchForWallet.walletBalance : (hostDeposit + p1Fee + p2Fee);
        const isUnlocked = selectedMatchForWallet.walletStatus === 'unlocked';

        return (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`bg-[#080d22] border rounded-3xl p-6 max-w-sm w-full relative shadow-2xl space-y-4 ${isUnlocked ? 'border-cyan-500/40' : 'border-emerald-500/40'}`}
            >
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <div className="flex items-center gap-2">
                  <div className={`p-2 rounded-xl ${isUnlocked ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                    {isUnlocked ? <Unlock className="w-5 h-5" /> : <Wallet className="w-5 h-5" />}
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                      Lone Wolf Wallet
                    </h3>
                    <p className={`text-[10px] font-mono ${isUnlocked ? 'text-cyan-400' : 'text-emerald-400'}`}>
                      {isUnlocked ? 'Unlocked Token Breakdown' : 'Locked Token Breakdown'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedMatchForWallet(null)}
                  className="p-1.5 text-slate-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="bg-slate-950/90 border border-emerald-500/30 rounded-2xl p-4 space-y-3 font-mono">
                <div className="flex justify-between items-center text-xs border-b border-white/5 pb-2">
                  <span className="text-slate-400">Match:</span>
                  <span className="text-white font-bold">#{selectedMatchForWallet.matchNumber || selectedMatchForWallet.id.slice(-4)} {selectedMatchForWallet.title}</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-slate-400">Host Deposit:</span>
                    <span className="text-cyan-300 font-bold">{hostDeposit} 🪙</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 truncate max-w-[200px]">
                      Slot 1 (Alpha) Fee {selectedMatchForWallet.player1 ? `(${selectedMatchForWallet.player1.gameName || selectedMatchForWallet.player1.displayName})` : ''}:
                    </span>
                    <span className="text-cyan-300 font-bold shrink-0">{p1Fee} 🪙</span>
                  </div>
                  <div className="flex justify-between items-center text-[11px]">
                    <span className="text-slate-400 truncate max-w-[200px]">
                      Slot 2 (Omega) Fee {selectedMatchForWallet.player2 ? `(${selectedMatchForWallet.player2.gameName || selectedMatchForWallet.player2.displayName})` : ''}:
                    </span>
                    <span className="text-fuchsia-300 font-bold shrink-0">{p2Fee} 🪙</span>
                  </div>
                </div>

                <div className={`border-t pt-2 flex justify-between items-center text-sm ${isUnlocked ? 'border-cyan-500/40' : 'border-emerald-500/40'}`}>
                  <span className={`font-bold ${isUnlocked ? 'text-cyan-400' : 'text-emerald-400'}`}>{isUnlocked ? 'Current Wallet Balance:' : 'Total Locked Balance:'}</span>
                  <span className={`font-black text-base ${isUnlocked ? 'text-cyan-300' : 'text-emerald-300'}`}>{totalLockedTokens} 🪙</span>
                </div>
              </div>

              <div className={`p-2.5 border rounded-xl text-[10.5px] font-mono flex items-center gap-2 ${isUnlocked ? 'bg-cyan-950/60 border-cyan-500/30 text-cyan-300' : 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'}`}>
                {isUnlocked ? <Unlock className="w-4 h-4 shrink-0" /> : <ShieldCheck className="w-4 h-4 shrink-0" />}
                <span>{isUnlocked ? 'Wallet has been unlocked by System Admin. You can now use these tokens.' : 'Tokens are safely locked by System Admin until match completion.'}</span>
              </div>

              <div className="flex gap-2">
                {isUnlocked && totalLockedTokens > 0 && selectedMatchForWallet.hostId === currentUserId && (
                  <button
                    onClick={() => handleClaimLoneWolfWallet(selectedMatchForWallet, totalLockedTokens)}
                    disabled={isClaimingWallet}
                    className="flex-1 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold font-mono transition disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {isClaimingWallet ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wallet className="w-3.5 h-3.5" />}
                    <span>Claim to Main Wallet</span>
                  </button>
                )}
                <button
                  onClick={() => setSelectedMatchForWallet(null)}
                  className={`py-2 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold font-mono transition ${isUnlocked && totalLockedTokens > 0 && selectedMatchForWallet.hostId === currentUserId ? 'w-1/3' : 'w-full'}`}
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        );
      })()}

      {/* RESCHEDULE MATCH MODAL */}
      {selectedMatchToReschedule && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#080d22] border border-cyan-500/40 rounded-3xl p-6 max-w-sm w-full relative shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-cyan-500/20 border border-cyan-500/30 rounded-2xl text-cyan-400 relative flex items-center justify-center shrink-0">
                  <Calendar className="w-5 h-5 text-cyan-400" />
                  <Clock className="w-3.5 h-3.5 text-amber-400 absolute -bottom-1 -right-1 bg-[#080d22] rounded-full p-0.5 border border-amber-400/50" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                    Reschedule Match
                  </h3>
                  <p className="text-[10px] text-cyan-300/80 font-mono font-bold">
                    {selectedMatchToReschedule.title || 'Lone Wolf 1v1 Clash'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMatchToReschedule(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 font-mono leading-relaxed">
              Change the scheduled date & time for this 1v1 match. Registered players will be notified of the new schedule.
            </p>

            <div className="space-y-3 font-mono">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-300 uppercase flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <div className="relative flex items-center shrink-0">
                      <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                      <Clock className="w-2.5 h-2.5 text-amber-400 absolute -bottom-0.5 -right-0.5" />
                    </div>
                    <span>New Date</span>
                  </span>
                  <span className="text-[9px] text-cyan-400/80 font-normal">Opens Calendar</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="date"
                    value={inputRescheduleDate}
                    onChange={e => setInputRescheduleDate(e.target.value)}
                    onClick={e => {
                      try {
                        (e.target as HTMLInputElement).showPicker?.();
                      } catch (err) {}
                    }}
                    className="w-full bg-slate-950 border border-white/15 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none cursor-pointer [color-scheme:dark] transition-all shadow-inner"
                  />
                  <Calendar 
                    className="w-4 h-4 text-cyan-400 absolute right-3 pointer-events-none opacity-80" 
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-300 uppercase flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>New Match Time</span>
                  </span>
                  <span className="text-[9px] text-cyan-400/80 font-normal">Opens Clock</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type="time"
                    value={inputRescheduleTime}
                    onChange={e => setInputRescheduleTime(e.target.value)}
                    onClick={e => {
                      try {
                        (e.target as HTMLInputElement).showPicker?.();
                      } catch (err) {}
                    }}
                    className="w-full bg-slate-950 border border-white/15 focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono outline-none cursor-pointer [color-scheme:dark] transition-all shadow-inner"
                  />
                  <Clock 
                    className="w-4 h-4 text-amber-400 absolute right-3 pointer-events-none opacity-80" 
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedMatchToReschedule(null)}
                disabled={isRescheduling}
                className="flex-1 py-2 bg-slate-900 text-slate-300 hover:bg-slate-800 rounded-xl text-xs font-bold font-mono transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRescheduleMatch}
                disabled={isRescheduling}
                className="flex-1 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold font-mono transition shadow-[0_0_12px_rgba(6,182,212,0.4)] cursor-pointer"
              >
                {isRescheduling ? 'Saving...' : 'Confirm Reschedule'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* DECLARE WINNER & PRIZE DISTRIBUTION MODAL */}
      {selectedMatchForResult && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#080d22] border border-yellow-500/40 rounded-3xl p-6 max-w-md w-full relative shadow-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-yellow-500/20 rounded-xl text-yellow-400">
                  <Trophy className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono">
                    Declare 1v1 Winner
                  </h3>
                  <p className="text-[10px] text-yellow-400/80 font-mono">Auto Prize Distribution (100%)</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedMatchForResult(null)}
                className="p-1.5 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {resultError && (
              <div className="p-2.5 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 font-mono flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
                <span>{resultError}</span>
              </div>
            )}

            <p className="text-xs text-slate-300 font-mono">
              Select the victorious challenger. The full prize pool (<span className="text-yellow-400 font-bold">{selectedMatchForResult.prizePool} Tokens</span>) will instantly be transferred to their Token Wallet.
            </p>

            {/* Winner Selection Radio */}
            <div className="grid grid-cols-2 gap-3">
              {/* Slot 1 (Alpha) */}
              <button
                type="button"
                onClick={() => {
                  setResultWinnerSlot(1);
                  if (player1Score <= player2Score) {
                    setPlayer1Score(Math.max(player2Score + 1, 5));
                  }
                }}
                className={`p-3 rounded-2xl border text-center flex flex-col items-center transition relative overflow-hidden cursor-pointer ${
                  resultWinnerSlot === 1
                    ? 'bg-gradient-to-b from-cyan-950/90 to-cyan-950/40 border-cyan-400 text-white shadow-[0_0_16px_rgba(6,182,212,0.45)] ring-2 ring-cyan-400/40'
                    : 'bg-slate-950 border-white/10 text-slate-400 hover:border-cyan-500/30'
                }`}
              >
                {resultWinnerSlot === 1 && (
                  <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-400/60 text-[8.5px] font-black text-yellow-300 font-mono flex items-center gap-1 shadow-[0_0_8px_rgba(234,179,8,0.4)] animate-pulse">
                    <Crown className="w-2.5 h-2.5 text-yellow-400" />
                    <span>WINNER</span>
                  </div>
                )}
                <div className="text-[10px] font-mono uppercase text-cyan-400 font-black mb-1.5 flex items-center gap-1">
                  <span>Slot 1 (Alpha)</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                    {player1Score} W
                  </span>
                </div>
                <div className="w-11 h-11 rounded-full border-2 border-cyan-500/40 overflow-hidden mb-1.5 shrink-0 bg-cyan-950 flex items-center justify-center text-cyan-400 text-sm font-bold shadow-[0_0_10px_rgba(6,182,212,0.3)]">
                  {selectedMatchForResult.player1?.photoURL ? (
                    <img src={selectedMatchForResult.player1.photoURL} alt="P1" className="w-full h-full object-cover" />
                  ) : (
                    (selectedMatchForResult.player1?.gameName || selectedMatchForResult.player1?.displayName || '?')[0].toUpperCase()
                  )}
                </div>
                <div className="text-xs font-black truncate w-full px-1 text-white">
                  {selectedMatchForResult.player1?.gameName || selectedMatchForResult.player1?.displayName || 'Player 1'}
                </div>
                {selectedMatchForResult.player1?.gamingUid && (
                  <div className="text-[9.5px] font-mono text-cyan-300/80 font-bold mt-0.5 truncate w-full px-1">
                    UID: {selectedMatchForResult.player1.gamingUid}
                  </div>
                )}
              </button>

              {/* Slot 2 (Omega) */}
              <button
                type="button"
                onClick={() => {
                  setResultWinnerSlot(2);
                  if (player2Score <= player1Score) {
                    setPlayer2Score(Math.max(player1Score + 1, 5));
                  }
                }}
                className={`p-3 rounded-2xl border text-center flex flex-col items-center transition relative overflow-hidden cursor-pointer ${
                  resultWinnerSlot === 2
                    ? 'bg-gradient-to-b from-fuchsia-950/90 to-fuchsia-950/40 border-fuchsia-400 text-white shadow-[0_0_16px_rgba(217,70,239,0.45)] ring-2 ring-fuchsia-400/40'
                    : 'bg-slate-950 border-white/10 text-slate-400 hover:border-fuchsia-500/30'
                }`}
              >
                {resultWinnerSlot === 2 && (
                  <div className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-full bg-yellow-500/20 border border-yellow-400/60 text-[8.5px] font-black text-yellow-300 font-mono flex items-center gap-1 shadow-[0_0_8px_rgba(234,179,8,0.4)] animate-pulse">
                    <Crown className="w-2.5 h-2.5 text-yellow-400" />
                    <span>WINNER</span>
                  </div>
                )}
                <div className="text-[10px] font-mono uppercase text-fuchsia-400 font-black mb-1.5 flex items-center gap-1">
                  <span>Slot 2 (Omega)</span>
                  <span className="text-[9px] px-1 py-0.2 rounded bg-fuchsia-950 border border-fuchsia-500/30 text-fuchsia-300">
                    {player2Score} W
                  </span>
                </div>
                <div className="w-11 h-11 rounded-full border-2 border-fuchsia-500/40 overflow-hidden mb-1.5 shrink-0 bg-fuchsia-950 flex items-center justify-center text-fuchsia-400 text-sm font-bold shadow-[0_0_10px_rgba(217,70,239,0.3)]">
                  {selectedMatchForResult.player2?.photoURL ? (
                    <img src={selectedMatchForResult.player2.photoURL} alt="P2" className="w-full h-full object-cover" />
                  ) : (
                    (selectedMatchForResult.player2?.gameName || selectedMatchForResult.player2?.displayName || '?')[0].toUpperCase()
                  )}
                </div>
                <div className="text-xs font-black truncate w-full px-1 text-white">
                  {selectedMatchForResult.player2?.gameName || selectedMatchForResult.player2?.displayName || 'Player 2'}
                </div>
                {selectedMatchForResult.player2?.gamingUid && (
                  <div className="text-[9.5px] font-mono text-fuchsia-300/80 font-bold mt-0.5 truncate w-full px-1">
                    UID: {selectedMatchForResult.player2.gamingUid}
                  </div>
                )}
              </button>
            </div>

            {/* YouTube Link Field in Declare Winner */}
            <div className="space-y-1 font-mono">
              <label className="block text-[10.5px] font-bold text-red-400 uppercase flex items-center gap-1">
                <Youtube className="w-3.5 h-3.5 text-red-500" />
                YouTube Stream Link (Required to Declare Winner)
              </label>
              <input
                type="url"
                value={inputYoutubeUrl}
                onChange={e => setInputYoutubeUrl(e.target.value)}
                placeholder="https://youtube.com/live/..."
                className="w-full bg-slate-950 border border-red-500/40 rounded-xl px-3 py-2 text-xs text-white font-mono outline-none focus:border-red-400"
              />
            </div>

            {/* Result Screenshot Upload Field */}
            <div className="space-y-1 font-mono">
              <label className="block text-[10.5px] font-bold text-cyan-400 uppercase flex items-center gap-1">
                <Video className="w-3.5 h-3.5 text-cyan-500" />
                Match Result Screenshot (Auto 120KB)
              </label>
              <div className="flex flex-col gap-2 relative">
                {resultScreenshotUrl ? (
                  <div className="relative group">
                    <img 
                      src={resultScreenshotUrl} 
                      alt="Match Screenshot" 
                      className="w-full h-24 object-cover rounded-xl border border-cyan-500/40"
                    />
                    <button
                      onClick={() => setResultScreenshotUrl('')}
                      className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-red-500 text-white rounded-lg transition-colors border border-white/10"
                    >
                      <XCircle className="w-4 h-4" />
                    </button>
                    <div className="absolute inset-0 border-2 border-emerald-500/50 rounded-xl pointer-events-none" />
                  </div>
                ) : (
                  <label className={`w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-3 py-3 flex items-center justify-center gap-2 cursor-pointer transition-all ${isUploadingScreenshot ? 'opacity-50 cursor-not-allowed' : 'hover:border-cyan-400'}`}>
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={handleScreenshotUpload}
                      disabled={isUploadingScreenshot}
                    />
                    {isUploadingScreenshot ? (
                      <>
                        <div className="w-4 h-4 border-2 border-cyan-500/30 border-t-cyan-500 rounded-full animate-spin shrink-0" />
                        <span className="text-xs text-slate-400 font-bold">Compressing & Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Edit3 className="w-4 h-4 text-cyan-500 shrink-0" />
                        <span className="text-xs text-slate-400 font-bold">Select Screenshot Image</span>
                      </>
                    )}
                  </label>
                )}
              </div>
            </div>

            {/* Round Scores with +/- Controls */}
            <div className="grid grid-cols-2 gap-2.5 pt-1 font-mono">
              {/* Slot 1 Score Counter */}
              <div className={`space-y-1.5 bg-slate-950/90 p-2.5 rounded-2xl border transition-all ${
                resultWinnerSlot === 1 ? 'border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.25)]' : 'border-cyan-500/25'
              }`}>
                <label className="block text-[9.5px] font-bold text-cyan-300/90 uppercase truncate" title={selectedMatchForResult.player1?.gameName || selectedMatchForResult.player1?.displayName}>
                  Slot 1 ({selectedMatchForResult.player1?.gameName || selectedMatchForResult.player1?.displayName || 'Alpha'})
                </label>
                <div className="flex items-center justify-between gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPlayer1Score(prev => {
                        const next = Math.max(0, prev - 1);
                        if (next < player2Score) setResultWinnerSlot(2);
                        else if (next > player2Score) setResultWinnerSlot(1);
                        return next;
                      });
                    }}
                    disabled={player1Score <= 0}
                    className="w-8 h-8 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 active:scale-90 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold transition-all cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.2)] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                    title="Decrease Score"
                  >
                    <Minus className="w-3.5 h-3.5 text-cyan-300" />
                  </button>

                  <span className="text-lg font-black text-cyan-300 font-mono tracking-wider min-w-[28px] text-center select-none">
                    {player1Score}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setPlayer1Score(prev => {
                        const next = prev + 1;
                        if (next > player2Score) setResultWinnerSlot(1);
                        return next;
                      });
                    }}
                    className="w-8 h-8 rounded-xl bg-cyan-950/90 hover:bg-cyan-900 active:scale-90 border border-cyan-500/40 text-cyan-300 flex items-center justify-center font-bold transition-all cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.2)]"
                    title="Increase Score"
                  >
                    <Plus className="w-3.5 h-3.5 text-cyan-300" />
                  </button>
                </div>
              </div>

              {/* Slot 2 Score Counter */}
              <div className={`space-y-1.5 bg-slate-950/90 p-2.5 rounded-2xl border transition-all ${
                resultWinnerSlot === 2 ? 'border-fuchsia-400 shadow-[0_0_10px_rgba(217,70,239,0.25)]' : 'border-fuchsia-500/25'
              }`}>
                <label className="block text-[9.5px] font-bold text-fuchsia-300/90 uppercase truncate" title={selectedMatchForResult.player2?.gameName || selectedMatchForResult.player2?.displayName}>
                  Slot 2 ({selectedMatchForResult.player2?.gameName || selectedMatchForResult.player2?.displayName || 'Omega'})
                </label>
                <div className="flex items-center justify-between gap-1 pt-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setPlayer2Score(prev => {
                        const next = Math.max(0, prev - 1);
                        if (next < player1Score) setResultWinnerSlot(1);
                        else if (next > player1Score) setResultWinnerSlot(2);
                        return next;
                      });
                    }}
                    disabled={player2Score <= 0}
                    className="w-8 h-8 rounded-xl bg-fuchsia-950/90 hover:bg-fuchsia-900 active:scale-90 border border-fuchsia-500/40 text-fuchsia-300 flex items-center justify-center font-bold transition-all cursor-pointer shadow-[0_0_8px_rgba(217,70,239,0.2)] disabled:opacity-30 disabled:cursor-not-allowed disabled:active:scale-100"
                    title="Decrease Score"
                  >
                    <Minus className="w-3.5 h-3.5 text-fuchsia-300" />
                  </button>

                  <span className="text-lg font-black text-fuchsia-300 font-mono tracking-wider min-w-[28px] text-center select-none">
                    {player2Score}
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setPlayer2Score(prev => {
                        const next = prev + 1;
                        if (next > player1Score) setResultWinnerSlot(2);
                        return next;
                      });
                    }}
                    className="w-8 h-8 rounded-xl bg-fuchsia-950/90 hover:bg-fuchsia-900 active:scale-90 border border-fuchsia-500/40 text-fuchsia-300 flex items-center justify-center font-bold transition-all cursor-pointer shadow-[0_0_8px_rgba(217,70,239,0.2)]"
                    title="Increase Score"
                  >
                    <Plus className="w-3.5 h-3.5 text-fuchsia-300" />
                  </button>
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setSelectedMatchForResult(null)}
                disabled={isSubmittingResult}
                className="flex-1 py-2.5 bg-slate-900 text-slate-300 rounded-xl text-xs font-bold font-mono"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitMatchResult}
                disabled={isSubmittingResult}
                className="flex-1 py-2.5 bg-gradient-to-r from-yellow-500 to-amber-500 hover:from-yellow-400 hover:to-amber-400 text-black font-black text-xs uppercase tracking-wider font-mono rounded-xl transition shadow-[0_0_15px_rgba(234,179,8,0.4)] disabled:opacity-50"
              >
                {isSubmittingResult ? 'Transferring Prize...' : 'Confirm Winner 🏆'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* CANCEL MATCH CONFIRMATION */}
      {matchToCancel && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-[#080d22] border border-red-500/40 rounded-3xl p-6 max-w-sm w-full relative shadow-2xl space-y-4"
          >
            <div className="flex items-center gap-2 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-sm font-black uppercase font-mono">Cancel Lone Wolf Duel?</h3>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Are you sure you want to cancel <span className="font-bold text-white">"{matchToCancel.title}"</span>? Your <span className="text-cyan-400 font-bold">{matchToCancel.walletTokens || matchToCancel.prizePool} Tokens</span> deposit will be refunded to your Token Wallet.
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => setMatchToCancel(null)}
                disabled={isCancelling}
                className="flex-1 py-2 bg-slate-900 text-slate-300 rounded-xl text-xs font-bold font-mono"
              >
                Keep Match
              </button>
              <button
                onClick={handleCancelMatch}
                disabled={isCancelling}
                className="flex-1 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold font-mono transition"
              >
                {isCancelling ? 'Cancelling...' : 'Confirm Cancel'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* FULLSCREEN IMAGE PREVIEW MODAL */}
      {previewImageModal && (
        <div 
          onClick={() => setPreviewImageModal(null)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="relative bg-[#070c1e] border border-cyan-500/40 rounded-3xl p-5 max-w-sm w-full shadow-[0_0_30px_rgba(6,182,212,0.4)] flex flex-col items-center gap-3"
          >
            <button
              onClick={() => setPreviewImageModal(null)}
              className="absolute top-3 right-3 p-1.5 bg-slate-900 border border-white/10 text-slate-300 hover:text-white rounded-full transition"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="text-xs font-mono font-bold text-cyan-400 uppercase tracking-widest mt-1 text-center truncate max-w-[85%]">
              {previewImageModal.title || 'Profile Preview'}
            </div>
            <div className="w-full max-h-[320px] flex items-center justify-center bg-slate-950/80 rounded-2xl p-2.5 border border-cyan-500/20 shadow-inner overflow-hidden">
              <img 
                src={previewImageModal.url} 
                alt="Preview" 
                className="max-h-[280px] max-w-full object-contain rounded-xl shadow-lg"
              />
            </div>
          </motion.div>
        </div>
      )}

      {/* LONE WOLF PENDING MATCH MODAL */}
      <AnimatePresence>
        {showPendingLoneWolfModal && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-[#090d22] border border-cyan-500/40 rounded-3xl p-5 sm:p-6 max-w-2xl w-full max-h-[85vh] overflow-y-auto relative space-y-4 shadow-2xl text-slate-100"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center border-b border-white/10 pb-3 sticky top-0 bg-[#090d22] z-10 pt-1">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                    <Swords className="w-5 h-5 text-cyan-400" />
                    <span>Lone wolf Pending Match</span>
                  </h3>
                  <p className="text-[11px] text-slate-400 mt-0.5 font-mono">
                    View your Lone Wolf matches under admin review or rejected by admin
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
                  onClick={() => setPendingModalTab('all')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition cursor-pointer ${
                    pendingModalTab === 'all'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({hostPendingAndRejectedMatches.length})
                </button>
                <button
                  onClick={() => setPendingModalTab('pending')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1.5 ${
                    pendingModalTab === 'pending'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Clock className="w-3 h-3 text-amber-400" />
                  <span>Pending ({hostOnlyPendingMatches.length})</span>
                </button>
                <button
                  onClick={() => setPendingModalTab('rejected')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition cursor-pointer flex items-center gap-1.5 ${
                    pendingModalTab === 'rejected'
                      ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <XCircle className="w-3 h-3 text-rose-400" />
                  <span>Rejected ({hostOnlyRejectedMatches.length})</span>
                </button>
              </div>

              {/* Matches List */}
              {(() => {
                const listToDisplay = pendingModalTab === 'pending' 
                  ? hostOnlyPendingMatches 
                  : pendingModalTab === 'rejected' 
                  ? hostOnlyRejectedMatches 
                  : hostPendingAndRejectedMatches;

                if (listToDisplay.length === 0) {
                  return (
                    <div className="text-center py-10 bg-slate-900/40 rounded-2xl border border-white/5 space-y-2">
                      <Swords className="w-8 h-8 text-slate-500 mx-auto" />
                      <p className="text-slate-300 text-xs font-bold">No Lone Wolf matches found</p>
                      <p className="text-slate-500 text-[11px] font-mono">
                        Matches pending admin approval or rejected matches will appear here.
                      </p>
                    </div>
                  );
                }

                return (
                  <div className="space-y-3">
                    {listToDisplay.map((m) => {
                      const isRejected = (m as any).approvalStatus === 'rejected' || ((m as any).isApproved === false && (m as any).status === 'Cancelled');

                      return (
                        <div
                          key={m.id}
                          className={`p-4 bg-slate-900/80 border ${
                            isRejected ? 'border-rose-500/40' : 'border-amber-500/40'
                          } rounded-2xl space-y-3 relative shadow-lg`}
                        >
                          {/* Top Row: Match Number & Status */}
                          <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 rounded text-[9.5px] font-black font-mono bg-cyan-950 text-cyan-400 border border-cyan-500/30 uppercase">
                                #{m.matchNumber || m.id.slice(-4)}
                              </span>
                              <h4 className="text-white font-bold text-xs font-mono uppercase">{m.title}</h4>
                              {m.weaponRule && (
                                <span className="text-[9.5px] px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30 font-mono">
                                  {m.weaponRule}
                                </span>
                              )}
                            </div>
                            <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider font-mono flex items-center gap-1.5 ${
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
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-slate-950/60 p-3 rounded-xl border border-white/5 font-mono text-slate-300">
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">Match Date/Time</span>
                              <span className="text-white font-bold">{m.matchDate || 'N/A'} at {m.matchTime || 'N/A'}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block text-[9px] uppercase font-bold">Entry Fee</span>
                              <span className="text-cyan-400 font-bold">🪙 {m.entryFee} Tokens</span>
                            </div>
                            <div className="booyah-prize-card-badge px-2 py-1 rounded-lg">
                              <span className="text-pink-300 block text-[8px] uppercase font-black tracking-wider">Booyah Winner Prize</span>
                              <span className="booyah-text-animated font-black text-xs">🪙 {m.prizePool} Tokens</span>
                            </div>
                          </div>

                          {/* Notice Box */}
                          <div className={`p-3 rounded-xl border text-xs font-mono leading-relaxed flex items-start gap-2.5 ${
                            isRejected 
                              ? 'bg-rose-950/40 border-rose-500/30 text-rose-200' 
                              : 'bg-amber-950/40 border-amber-500/30 text-amber-200'
                          }`}>
                            {isRejected ? (
                              <>
                                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="font-bold text-rose-300 block">Match Rejected by Administrator:</strong>
                                  <p className="text-[11px] mt-0.5 text-rose-200/90">
                                    This Lone Wolf match was rejected by the admin. Your deposit of <span className="font-bold text-white">{m.walletTokens || m.prizePool} Tokens</span> has been refunded to your wallet balance.
                                  </p>
                                </div>
                              </>
                            ) : (
                              <>
                                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="font-bold text-amber-300 block">Pending Admin Approval (Under Review):</strong>
                                  <p className="text-[11px] mt-0.5 text-amber-200/90">
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
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-xl transition uppercase tracking-wider cursor-pointer font-mono"
              >
                Close
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LONE WOLF ANNOUNCEMENT MODAL */}
      <AnimatePresence>
        {activeAnnouncementMatch && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative w-full max-w-lg bg-[#04060e] border border-cyan-500/30 rounded-2xl overflow-hidden flex flex-col h-[65vh] shadow-[0_0_30px_rgba(6,182,212,0.15)] font-mono"
            >
              {/* Header */}
              <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-gradient-to-r from-cyan-950/40 to-slate-950/40 shrink-0">
                <div className="flex items-center gap-2">
                  <Megaphone className="h-5 w-5 text-cyan-400 animate-pulse" />
                  <div>
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Match Announcements</h3>
                    <p className="text-[9px] text-cyan-400/80 font-semibold uppercase tracking-wide">
                      {activeAnnouncementMatch.title}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveAnnouncementMatch(null)}
                  className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Announcements List */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3.5 custom-scrollbar bg-black/30">
                {(!activeAnnouncementMatch.announcements || activeAnnouncementMatch.announcements.length === 0) ? (
                  <div className="h-full flex flex-col items-center justify-center text-center p-4">
                    <Megaphone className="h-8 w-8 text-slate-600 mb-2 stroke-[1.5]" />
                    <p className="text-xs text-slate-400 font-bold">No announcements yet</p>
                    <p className="text-[9px] text-slate-500 mt-1">Host/Admin will update any match notifications here.</p>
                  </div>
                ) : (
                  [...activeAnnouncementMatch.announcements].reverse().map((ann: any) => {
                    const canDeleteAnn = isSystemAdmin || (activeAnnouncementMatch.hostId === currentUserId && ann.announcerEmail === currentUserEmail);
                    return (
                      <div 
                        key={ann.id} 
                        className="bg-slate-950 border border-cyan-500/10 hover:border-cyan-500/20 rounded-xl p-3 shadow-md flex items-start justify-between gap-2.5 transition"
                      >
                        <div className="flex-1 space-y-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[10px] text-cyan-400 font-bold">
                              {ann.announcerName}
                            </span>
                            <span className={`px-1 rounded-[4px] text-[7px] font-bold uppercase ${
                              ann.role === 'Admin' 
                                ? 'bg-red-950 text-red-400 border border-red-500/20' 
                                : 'bg-amber-950 text-amber-400 border border-amber-500/20'
                            }`}>
                              {ann.role}
                            </span>
                            <span className="text-[8px] text-slate-500 font-normal">
                              {new Date(ann.createdAt).toLocaleString(undefined, { dateStyle: 'short', timeStyle: 'short' })}
                            </span>
                          </div>
                          <p className="text-xs text-slate-200 leading-relaxed font-sans whitespace-pre-wrap">
                            {ann.text}
                          </p>
                        </div>

                        {canDeleteAnn && (
                          <button
                            onClick={() => handleDeleteAnnouncement(activeAnnouncementMatch, ann.id)}
                            className="p-1.5 bg-red-950/40 hover:bg-red-900 border border-red-500/20 hover:border-red-500/40 rounded-lg text-red-400 hover:text-red-300 transition shrink-0 cursor-pointer"
                            title="Delete Announcement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })
                )}
              </div>

              {/* Create Announcement (Host/Admin only) */}
              {(isSystemAdmin || activeAnnouncementMatch.hostId === currentUserId) && (
                <div className="p-3.5 border-t border-white/[0.06] bg-slate-950 space-y-2 shrink-0">
                  <div className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest">
                    Create New Announcement
                  </div>
                  <div className="flex items-center gap-2">
                    <textarea
                      value={announcementText}
                      onChange={(e) => setAnnouncementText(e.target.value)}
                      placeholder="Type important match updates or announcements..."
                      rows={2}
                      className="flex-1 bg-black border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/50 resize-none font-sans"
                    />
                    <button
                      onClick={() => handleAddAnnouncement(activeAnnouncementMatch)}
                      disabled={!announcementText.trim() || isSubmittingAnnouncement}
                      className="p-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:from-slate-800 disabled:to-slate-800 disabled:text-slate-500 rounded-xl text-white font-black text-xs transition flex items-center justify-center shrink-0 cursor-pointer h-12"
                    >
                      {isSubmittingAnnouncement ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                      ) : (
                        <Send className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* LONE WOLF SUPPORT CHAT MODAL */}
      <AnimatePresence>
        {activeChatMatch && (
          <LoneWolfChatModal
            isOpen={!!activeChatMatch}
            onClose={() => setActiveChatMatch(null)}
            match={activeChatMatch}
            userProfile={userProfile}
            isSystemAdmin={isSystemAdmin}
          />
        )}
      </AnimatePresence>

      {/* HOST PROFILE MODAL */}
      {selectedHostForModal && (
        <HostProfileModal
          hostId={selectedHostForModal.hostId}
          hostName={selectedHostForModal.hostName}
          hostPhotoUrl={selectedHostForModal.hostPhotoUrl}
          currentUserProfile={userProfile}
          onClose={() => setSelectedHostForModal(null)}
        />
      )}

      {/* HOST PROFILE MODAL */}
      {selectedHostForModal && (
        <HostProfileModal
          hostId={selectedHostForModal.hostId}
          hostName={selectedHostForModal.hostName}
          hostPhotoUrl={selectedHostForModal.hostPhotoUrl}
          currentUserProfile={userProfile}
          onClose={() => setSelectedHostForModal(null)}
        />
      )}

      {/* LONE WOLF RULES MODAL */}
      <AnimatePresence>
        {showRulesMatch && (
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
                    <h3 className="text-sm font-black text-white uppercase tracking-wider">Lone Wolf Duel Rules</h3>
                    <p className="text-[10px] text-cyan-400 font-mono uppercase tracking-widest">1v1 Combat Regulations</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowRulesMatch(null)}
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
                      <strong className="text-white uppercase">YOUTUBE LIVE STREAM:</strong> Every Lone Wolf duel match MUST be live-streamed on YouTube by the Host.
                    </li>
                    <li>
                      <strong className="text-white uppercase">CUSTOM ROOM MANAGEMENT:</strong> The Host publishes Room ID & Password precisely 15 minutes before match start.
                    </li>
                    <li>
                      <strong className="text-white uppercase">SPECTATOR RESTRICION:</strong> No third-party players or spectators are allowed. The Host will immediately kick anyone who enters other than the registered challenger and defender.
                    </li>
                    <li>
                      <strong className="text-white uppercase">DECISION & REWARDS:</strong> The Host calculates final points, takes lobby screenshots, and processes winners directly. Players do not need to upload proof.
                    </li>
                  </ul>
                </div>

                {/* 2. Combat Settings & Limitations */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-950/25 to-slate-900/50 border border-cyan-500/20 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <Swords className="w-4.5 h-4.5 text-cyan-400" />
                    <span className="text-[11px] font-black text-cyan-300 uppercase tracking-wider">02. Match Combat Rules</span>
                  </div>
                  <ul className="space-y-2.5 text-[10.5px] font-mono text-slate-300 pl-1.5 list-disc list-inside">
                    <li>
                      <strong className="text-white uppercase">WEAPON SETTINGS:</strong> Players must strictly follow the custom weapon rules and restrictions defined by the Host for the match (e.g. Pistols, Snipers, or standard weapons).
                    </li>
                    <li>
                      <strong className="text-white uppercase">UTILITY BAN:</strong> Using flashbangs, standard explosive grenades, or spamming healing gear/inhalers may be banned by the Host.
                    </li>
                    <li>
                      <strong className="text-white uppercase">PUNCTUALITY LIMIT:</strong> Both dueling players must enter within 5 minutes. Delayed players are marked as no-show and lose their entry tokens.
                    </li>
                  </ul>
                </div>

                {/* 3. Fair Play, Recording & Disputes */}
                <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-950/25 to-slate-900/50 border border-indigo-500/20 relative overflow-hidden">
                  <div className="flex items-center gap-2 mb-3">
                    <Shield className="w-4.5 h-4.5 text-indigo-400" />
                    <span className="text-[11px] font-black text-indigo-300 uppercase tracking-wider">03. Fair Play & Hack Reporting</span>
                  </div>
                  <ul className="space-y-2.5 text-[10.5px] font-mono text-slate-300 pl-1.5 list-disc list-inside">
                    <li>
                      <strong className="text-white uppercase">STRICT MOBILE POLICY:</strong> Only mobile players are allowed. Emulator/PC usage is strictly banned.
                    </li>
                    <li>
                      <strong className="text-white uppercase">HACK DISPUTE RECORDING:</strong> To report a headshot hack or cheat file usage, you must submit a raw, full-length match screen recording to the main admin within 30 minutes of the match.
                    </li>
                    <li>
                      <strong className="text-white uppercase">ACCOUNT TERMINATION:</strong> Confirmed cheating results in an immediate, permanent device and wallet ban.
                    </li>
                  </ul>
                </div>
              </div>

              {/* Close Action Button */}
              <button
                onClick={() => setShowRulesMatch(null)}
                className="w-full py-3 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition-all duration-300 active:scale-[0.98] shadow-[0_0_15px_rgba(6,182,212,0.4)] cursor-pointer text-center"
              >
                Accept & Close Rules
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!matchToDelete}
        title="Delete Match Permanently"
        itemName={matchToDelete?.title}
        description="Are you sure you want to PERMANENTLY delete this Lone Wolf match? All duel chats and result records will be removed."
        confirmText="Yes, Delete Match"
        onClose={() => setMatchToDelete(null)}
        onConfirm={async () => {
          if (matchToDelete) {
            await deleteDoc(doc(db, 'lone_wolf_matches', matchToDelete.id));
          }
        }}
      />
    </div>
  );
}
