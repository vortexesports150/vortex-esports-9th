import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, AlertTriangle, Shield, User, MessageSquare, Clock } from 'lucide-react';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, where, getDocs, updateDoc, doc } from 'firebase/firestore';

interface MatchChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  match: any; // Using any for simplicity as match type varies between groups/knockouts
  leagueId: string;
  userProfile: any;
  canManage?: boolean;
  isSystemAdmin?: boolean;
  isHostOrCoHost?: boolean;
  hostName?: string;
}

export function MatchChatModal({ 
  isOpen, 
  onClose, 
  match, 
  leagueId, 
  userProfile, 
  canManage = false, 
  isSystemAdmin = false, 
  isHostOrCoHost = false,
  hostName
}: MatchChatModalProps) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [squads, setSquads] = useState<any[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const matchIdStr = match?.id || match?.matchId || 'M1';
  const targetLeagueId = leagueId || match?.leagueId || 'default_league';
  const matchTitle = match?.title || `Match #${match?.globalOrder || match?.matchNumber || matchIdStr}`;
  const effectiveHostName = hostName || match?.submittedByName || 'League Host';

  const currentUserId = userProfile?.userId || userProfile?.uid || 'guest';
  const currentUserName = userProfile?.displayName || userProfile?.gameName || userProfile?.name || (isSystemAdmin ? 'System Admin' : 'League Host');

  const isUserHost = isHostOrCoHost || userProfile?.userId === match?.submittedBy || userProfile?.uid === match?.submittedBy;

  useEffect(() => {
    if (!targetLeagueId) return;
    const q = query(collection(db, 'pro_league_squads'), where('leagueId', '==', targetLeagueId));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSquads(list);
    }, (error) => {
      console.error("Error fetching squads in MatchChatModal:", error);
    });
    return () => unsubscribe();
  }, [targetLeagueId]);

  const getSquadName = (tbdId: string) => {
    if (!tbdId) return '';
    const cleanId = tbdId.trim();
    const found = squads.find(s => 
      s.tbdId === cleanId || 
      s.teamId === cleanId || 
      s.id === cleanId || 
      (s.teamName && s.teamName.toLowerCase() === cleanId.toLowerCase()) || 
      (s.squadName && s.squadName.toLowerCase() === cleanId.toLowerCase())
    );
    return found?.teamName || found?.squadName || found?.teamId || tbdId;
  };

  useEffect(() => {
    if (!isOpen || !match) return;

    // We store messages in a subcollection under the match document in a dedicated chats collection
    const chatDocKey = `${targetLeagueId}_${matchIdStr}`;
    const chatRef = collection(db, 'league_match_chats', chatDocKey, 'messages');
    const q = query(chatRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as any[];
      
      // Filter logic:
      // - System Admins see ALL messages
      // - Host sees System Admin messages + Host messages
      // - Captain sees System Admin messages + Captain messages
      // - Host & Captain cannot message each other directly; messaging is strictly with Admin
      const visibleMsgs = msgs.filter(msg => {
        if (isSystemAdmin) return true;
        if (msg.senderId === currentUserId) return true; // Own messages
        if (msg.senderRole === 'system_admin') return true; // System Admin messages
        if (isUserHost && msg.senderRole === 'host') return true; // Host messages
        if (!isUserHost && (msg.senderRole === 'captain' || msg.senderRole === 'player')) return true; // Captain messages
        return false;
      });
      
      setMessages(visibleMsgs);
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'league_match_chats');
    });

    return () => unsubscribe();
  }, [isOpen, match, targetLeagueId, matchIdStr, isSystemAdmin, currentUserId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || isSending) return;

    setIsSending(true);
    const textMessage = newMessage.trim();
    try {
      const chatDocKey = `${targetLeagueId}_${matchIdStr}`;
      const chatRef = collection(db, 'league_match_chats', chatDocKey, 'messages');
      
      let roleToSave = 'captain';
      if (isSystemAdmin) roleToSave = 'system_admin';
      else if (isUserHost) roleToSave = 'host';
      
      await addDoc(chatRef, {
        text: textMessage,
        senderId: currentUserId,
        senderName: currentUserName,
        senderPhoto: userProfile?.photoURL || userProfile?.avatarUrl || '',
        senderRole: roleToSave,
        createdAt: serverTimestamp(),
      });

      // Sync to admin_messages if sender is not an admin
      const isSenderAdmin = isSystemAdmin || userProfile?.role === 'main_admin' || userProfile?.role === 'sub_admin' || userProfile?.role === 'admin';
      if (!isSenderAdmin) {
        try {
          const adminMsgQuery = query(
            collection(db, 'admin_messages'),
            where('sourceContext.matchId', '==', matchIdStr),
            where('sourceContext.leagueId', '==', targetLeagueId)
          );
          const adminMsgSnap = await getDocs(adminMsgQuery);
          
          if (!adminMsgSnap.empty) {
            // Update existing admin message thread
            const adminDoc = adminMsgSnap.docs[0];
            const adminDocId = adminDoc.id;
            const adminData = adminDoc.data();
            
            // Append the reply
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
              senderPhoto: userProfile?.photoURL || userProfile?.avatarUrl || null,
              type: 'match_support',
              message: textMessage,
              status: 'unread',
              replies: [],
              sourceContext: {
                type: 'match_card',
                leagueId: targetLeagueId,
                matchId: matchIdStr
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
      handleFirestoreError(error, OperationType.CREATE, 'league_match_chats');
    } finally {
      setIsSending(false);
    }
  };

  const formatMsgTime = (timestamp: any) => {
    if (!timestamp) return 'Just now';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    } catch (e) {
      return 'Just now';
    }
  };

  if (!isOpen || !match) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/85 backdrop-blur-md"
        />
        
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className="relative bg-[#070914] border border-cyan-500/30 rounded-3xl w-full max-w-lg shadow-[0_0_60px_rgba(6,182,212,0.2)] flex flex-col h-[82vh] max-h-[640px] overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-500 via-blue-500 to-cyan-400" />

          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-cyan-500/20 bg-slate-900/60">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <MessageSquare className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                  {matchTitle} - Match support  Chat
                </h2>
                <p className="text-[10px] text-cyan-400/90 font-mono font-bold tracking-wider mt-0.5">
                  {getSquadName(match.t1)} VS {getSquadName(match.t2)} • Host: {effectiveHostName}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-slate-400 rounded-full transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Info Banner */}
          <div className="px-4 py-2 bg-cyan-500/10 border-b border-cyan-500/20 flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
            <p className="text-[9.5px] text-cyan-200/90 font-medium leading-relaxed">
              {isSystemAdmin 
                ? `Direct private messaging with Host (${effectiveHostName}) regarding this match result.` 
                : "Direct private messaging with the System Admin regarding your submitted match result."}
            </p>
          </div>

          {/* Messages Container */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-black/40">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-2 py-10">
                <Shield className="w-10 h-10 text-cyan-500/30" />
                <p className="text-xs font-black uppercase tracking-wider text-slate-400">No Messages Yet</p>
                <p className="text-[10px] text-slate-500 max-w-xs text-center">
                  Start the conversation between Admin and Host about this match result review.
                </p>
              </div>
            ) : (
              messages.map((msg) => {
                const isMe = msg.senderId === currentUserId;
                const isSystemAdminMsg = msg.senderRole === 'system_admin';
                return (
                  <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'}`}>
                    <div className="flex items-center gap-1.5 mb-1 px-1">
                      {isSystemAdminMsg ? (
                        <Shield className="w-3 h-3 text-cyan-400 shrink-0" />
                      ) : (
                        <User className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                      <span className={`text-[9.5px] font-black uppercase tracking-wider ${isSystemAdminMsg ? 'text-cyan-400' : 'text-slate-300'}`}>
                        {msg.senderName} {isMe && '(You)'} {msg.senderRole === 'host' ? '[HOST]' : ''} {isSystemAdminMsg ? '[ADMIN]' : ''}
                      </span>
                    </div>

                    <div 
                      className={`px-3.5 py-2.5 rounded-2xl text-xs max-w-[85%] break-words shadow-md ${
                        isMe 
                          ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none' 
                          : isSystemAdminMsg 
                            ? 'bg-cyan-950/80 border border-cyan-500/30 text-cyan-100 rounded-tl-none'
                            : 'bg-slate-900 border border-white/10 text-slate-200 rounded-tl-none'
                      }`}
                    >
                      <p className="leading-relaxed font-medium">{msg.text}</p>
                      <div className="mt-1 flex items-center justify-end gap-1 text-[8px] font-mono opacity-70">
                        <Clock className="w-2.5 h-2.5" />
                        <span>{formatMsgTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input Form */}
          <div className="p-4 border-t border-cyan-500/20 bg-slate-900/80">
            <form onSubmit={handleSend} className="flex gap-2">
              <input
                type="text"
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder={isSystemAdmin ? "Write a message to the host..." : "Message admin about this result..."}
                className="flex-1 bg-black/60 border border-cyan-500/30 focus:border-cyan-400 rounded-2xl px-4 py-3 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-400 transition-all font-medium"
                maxLength={500}
              />
              <button
                type="submit"
                disabled={!newMessage.trim() || isSending}
                className="bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-800 disabled:text-slate-600 text-black font-black px-4 py-3 rounded-2xl text-xs uppercase tracking-wider transition-all flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20 cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

