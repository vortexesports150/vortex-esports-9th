import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, X, Send, ShieldAlert, CheckCircle2, 
  Clock, Sparkles, UserCheck, HelpCircle, AlertCircle, RefreshCw, KeyRound
} from 'lucide-react';
import { 
  collection, query, where, orderBy, onSnapshot, addDoc, updateDoc, doc, serverTimestamp 
} from 'firebase/firestore';
import { db } from '../lib/firebase';

interface PlayerSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  userProfile: any;
  user: any;
}

export const PlayerSupportModal: React.FC<PlayerSupportModalProps> = ({
  isOpen,
  onClose,
  userProfile,
  user
}) => {
  const [messages, setMessages] = useState<any[]>([]);
  const [selectedMessage, setSelectedMessage] = useState<any | null>(null);
  const [newMessageText, setNewMessageText] = useState('');
  const [replyText, setReplyText] = useState('');
  const [category, setCategory] = useState<'captain_support' | 'match_issue' | 'general' | 'bug' | 'account_recovery'>('general');
  const [subject, setSubject] = useState('');
  const [registeredPhone, setRegisteredPhone] = useState(userProfile?.mobile || '');
  const [supportPlayvearId, setSupportPlayvearId] = useState(userProfile?.playvearId || '');
  const [newGmail, setNewGmail] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [activeTab, setActiveTab] = useState<'inbox' | 'new'>('inbox');

  const userId = userProfile?.userId || user?.uid;
  const userEmail = userProfile?.email || user?.email || '';
  const userName = userProfile?.displayName || userProfile?.name || 'Player';

  useEffect(() => {
    if (!isOpen || !userId) return;

    // Listen to messages sent by or addressed to this user
    const q = query(
      collection(db, 'admin_messages'),
      where('senderId', '==', userId),
      orderBy('createdAt', 'desc')
    );

    const unsub = onSnapshot(q, (snapshot) => {
      const list = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setMessages(list);
      if (selectedMessage) {
        const updated = list.find(m => m.id === selectedMessage.id);
        if (updated) setSelectedMessage(updated);
      }
    }, (err) => {
      console.error("Error fetching player support messages:", err);
    });

    return () => unsub();
  }, [isOpen, userId]);

  if (!isOpen) return null;

  const handleSendNewTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessageText.trim() || isSending) return;

    setIsSending(true);
    try {
      await addDoc(collection(db, 'admin_messages'), {
        senderId: userId,
        senderName: userName,
        senderEmail: userEmail,
        senderRole: userProfile?.isCaptain || userProfile?.role === 'captain' ? 'captain' : 'player',
        type: category,
        subject: subject.trim() || (category === 'account_recovery' ? `Account Recovery: ${userName}${supportPlayvearId ? ` [PlayVear ID: #${supportPlayvearId}]` : ''}` : category === 'captain_support' ? 'Captain Support Inquiry' : 'General Inquiry'),
        playvearId: supportPlayvearId.trim() || userProfile?.playvearId || 'Not Provided',
        registeredPhone: registeredPhone.trim() || userProfile?.mobile || '',
        newGmail: newGmail.trim().toLowerCase(),
        gamingUid: userProfile?.gamingUid || '',
        message: newMessageText.trim(),
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        replies: []
      });

      setNewMessageText('');
      setSubject('');
      setNewGmail('');
      setActiveTab('inbox');
    } catch (err) {
      console.error("Failed to send message to admin:", err);
    } finally {
      setIsSending(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedMessage || isSending) return;

    setIsSending(true);
    try {
      const msgRef = doc(db, 'admin_messages', selectedMessage.id);
      const existingReplies = selectedMessage.replies || [];
      const newReplyObj = {
        senderId: userId,
        senderName: userName,
        senderRole: 'user',
        text: replyText.trim(),
        createdAt: new Date().toISOString()
      };

      await updateDoc(msgRef, {
        replies: [...existingReplies, newReplyObj],
        status: 'pending', // Re-open ticket for admin
        updatedAt: serverTimestamp()
      });

      setReplyText('');
    } catch (err) {
      console.error("Failed to send reply:", err);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#090d22] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <MessageSquare className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider flex items-center gap-2">
                Support & Admin Messaging
                {userProfile?.isCaptain && (
                  <span className="text-[9px] font-extrabold px-2 py-0.5 bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 rounded-full">
                    CAPTAIN
                  </span>
                )}
              </h3>
              <p className="text-[10px] text-slate-400">Direct 1-on-1 communication with Super Admin & Main Admin</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-white/10 bg-slate-900/40">
          <button
            onClick={() => { setActiveTab('inbox'); setSelectedMessage(null); }}
            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'inbox' 
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            Inbox ({messages.length})
          </button>
          <button
            onClick={() => { setActiveTab('new'); setSelectedMessage(null); }}
            className={`flex-1 py-2.5 text-xs font-black uppercase tracking-wider transition-all border-b-2 flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'new' 
                ? 'border-cyan-500 text-cyan-400 bg-cyan-500/10' 
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Send className="w-4 h-4" />
            New Message
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4">
          
          {/* INBOX TAB */}
          {activeTab === 'inbox' && !selectedMessage && (
            <div className="space-y-3">
              {messages.length === 0 ? (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 mx-auto rounded-full bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                    <MessageSquare className="w-6 h-6" />
                  </div>
                  <h4 className="text-xs font-black text-slate-300 uppercase">No Messages Yet</h4>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    You haven't sent any support or inquiry messages to Admin. Click "New Message" to start a conversation!
                  </p>
                  <button
                    onClick={() => setActiveTab('new')}
                    className="mt-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-cyan-500/20"
                  >
                    Send Message to Admin
                  </button>
                </div>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    onClick={() => setSelectedMessage(msg)}
                    className="p-3.5 bg-slate-950/60 border border-white/10 hover:border-cyan-500/40 rounded-xl transition-all cursor-pointer flex items-center justify-between gap-3 group"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 text-[8px] font-extrabold uppercase rounded border ${
                          msg.status === 'replied' || msg.status === 'resolved'
                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                            : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                        }`}>
                          {msg.status === 'replied' ? 'ADMIN REPLIED' : msg.status?.toUpperCase() || 'PENDING'}
                        </span>
                        <h4 className="text-xs font-extrabold text-white truncate group-hover:text-cyan-400 transition-colors">
                          {msg.subject || 'Admin Support Inquiry'}
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate leading-snug">{msg.message}</p>
                      {msg.replies && msg.replies.length > 0 && (
                        <p className="text-[9.5px] text-cyan-400 font-medium flex items-center gap-1 mt-1">
                          💬 {msg.replies.length} reply/replies from Admin
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-[9px] text-slate-500 font-mono">
                        {msg.createdAt?.toDate ? msg.createdAt.toDate().toLocaleDateString() : 'Recent'}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* VIEW SINGLE THREAD */}
          {activeTab === 'inbox' && selectedMessage && (
            <div className="space-y-4">
              <button
                onClick={() => setSelectedMessage(null)}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                ← Back to Inbox
              </button>

              <div className="p-3.5 bg-slate-950/80 border border-cyan-500/20 rounded-xl space-y-2">
                <div className="flex items-center justify-between border-b border-white/5 pb-2">
                  <h4 className="text-sm font-black text-white">{selectedMessage.subject || 'Support Ticket'}</h4>
                  <span className={`px-2 py-0.5 text-[8px] font-extrabold uppercase rounded border ${
                    selectedMessage.status === 'replied' || selectedMessage.status === 'resolved'
                      ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                      : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                  }`}>
                    {selectedMessage.status?.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{selectedMessage.message}</p>
              </div>

              {/* Replies History */}
              {selectedMessage.replies && selectedMessage.replies.length > 0 && (
                <div className="space-y-2.5 pt-2 border-t border-white/10">
                  <h5 className="text-[10px] font-black text-cyan-400 uppercase tracking-wider">Conversation History</h5>
                  {selectedMessage.replies.map((r: any, idx: number) => (
                    <div 
                      key={idx}
                      className={`p-3 rounded-xl border ${
                        r.senderRole === 'admin' || r.senderRole === 'super_admin'
                          ? 'bg-cyan-950/40 border-cyan-500/30 text-cyan-100'
                          : 'bg-slate-900/60 border-white/10 text-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[9px] font-bold text-cyan-300 mb-1">
                        <span>{r.senderName || (r.senderRole === 'admin' ? 'Admin Support' : 'You')}</span>
                        <span className="text-slate-500 font-mono">{r.createdAt ? new Date(r.createdAt).toLocaleTimeString() : ''}</span>
                      </div>
                      <p className="text-xs leading-relaxed">{r.text}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Reply Box */}
              <form onSubmit={handleSendReply} className="space-y-2 pt-2 border-t border-white/10">
                <textarea
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  placeholder="Type your reply to Admin..."
                  rows={2}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
                <button
                  type="submit"
                  disabled={!replyText.trim() || isSending}
                  className="w-full py-2 bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isSending ? 'Sending...' : 'Send Reply'}
                </button>
              </form>
            </div>
          )}

          {/* NEW MESSAGE TAB */}
          {activeTab === 'new' && (
            <form onSubmit={handleSendNewTicket} className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Category
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setCategory('general')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      category === 'general'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    💬 General Inquiry
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('captain_support')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      category === 'captain_support'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    👑 Captain Support
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('match_issue')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      category === 'match_issue'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    ⚔️ Match Issue / Appeal
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('account_recovery')}
                    className={`p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      category === 'account_recovery'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    🔑 Account Recovery / Gmail Change
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategory('bug')}
                    className={`col-span-2 p-2.5 rounded-xl border text-left text-xs font-bold transition-all cursor-pointer ${
                      category === 'bug'
                        ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300'
                        : 'bg-slate-950/60 border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    🐛 Report Bug
                  </button>
                </div>
              </div>

              {category === 'account_recovery' && (
                <div className="p-3 bg-amber-950/20 border border-amber-500/30 rounded-2xl space-y-2.5">
                  <div className="text-[11px] text-amber-300 font-bold flex items-center gap-1.5 font-mono">
                    <KeyRound className="w-3.5 h-3.5" />
                    Account Recovery & Gmail Link Details
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-mono uppercase text-cyan-300 block">PlayVear ID (Recommended for quick lookup)</label>
                    <input
                      type="text"
                      value={supportPlayvearId}
                      onChange={(e) => setSupportPlayvearId(e.target.value)}
                      placeholder="e.g. 1001, 1002"
                      className="w-full bg-slate-950 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 font-mono font-bold focus:outline-none focus:border-cyan-400"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-mono uppercase text-slate-400 block">Registered Mobile Number</label>
                    <input
                      type="tel"
                      value={registeredPhone}
                      onChange={(e) => setRegisteredPhone(e.target.value)}
                      placeholder="e.g. 017XXXXXXXX"
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9.5px] font-mono uppercase text-amber-400 block">New Gmail ID to Link</label>
                    <input
                      type="email"
                      value={newGmail}
                      onChange={(e) => setNewGmail(e.target.value)}
                      placeholder="e.g. new_player@gmail.com"
                      className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Subject / Topic
                </label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Question about upcoming league match slot..."
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  Message Details
                </label>
                <textarea
                  value={newMessageText}
                  onChange={(e) => setNewMessageText(e.target.value)}
                  placeholder="Write your message to the Super Admin & Main Admin team here..."
                  rows={4}
                  className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={!newMessageText.trim() || isSending}
                className="w-full py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 disabled:opacity-50 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                {isSending ? 'Sending Message...' : 'Send Direct Message to Admin'}
              </button>
            </form>
          )}

        </div>
      </div>
    </div>
  );
};
