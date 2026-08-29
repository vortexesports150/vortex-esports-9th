import React, { useState, useEffect } from 'react';
import { 
  Search, Shield, KeyRound, CheckCircle2, AlertCircle, Phone, 
  Mail, Gamepad2, Coins, MapPin, Globe, Clock, RefreshCw, UserCheck, 
  ArrowRight, ExternalLink, HelpCircle, MessageSquare, AlertTriangle, User,
  Sparkles, Check, Hash
} from 'lucide-react';
import { 
  collection, query, where, getDocs, doc, updateDoc, 
  serverTimestamp, arrayUnion, onSnapshot, orderBy, limit 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { getCountryByCodeOrName } from '../lib/countries';
import { provisionPlayvearIdsForAllUsers, PlayvearIdSyncResult } from '../lib/playvearIdSync';

interface AccountRecoveryAdminProps {
  currentAdminEmail?: string;
  onNavigateToMessages?: () => void;
  initialSearchQuery?: string;
}

export const AccountRecoveryAdmin: React.FC<AccountRecoveryAdminProps> = ({
  currentAdminEmail = 'vortexesports150@gmail.com',
  onNavigateToMessages,
  initialSearchQuery = ''
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [foundUser, setFoundUser] = useState<any | null>(null);
  
  // Gmail Change inputs
  const [newGmail, setNewGmail] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState<string | null>(null);
  const [updateError, setUpdateError] = useState<string | null>(null);

  // PlayVear ID Mass Provisioning state
  const [isSyncingPlayvearIds, setIsSyncingPlayvearIds] = useState(false);
  const [playvearIdSyncResult, setPlayvearIdSyncResult] = useState<PlayvearIdSyncResult | null>(null);
  const [playvearIdSyncProgress, setPlayvearIdSyncProgress] = useState<string | null>(null);

  const handleSyncAllPlayvearIds = async () => {
    setIsSyncingPlayvearIds(true);
    setPlayvearIdSyncResult(null);
    setPlayvearIdSyncProgress('Starting PlayVear ID scan & generation for all users...');

    try {
      const res = await provisionPlayvearIdsForAllUsers((p) => {
        setPlayvearIdSyncProgress(p.message);
      });
      setPlayvearIdSyncResult(res);
      setPlayvearIdSyncProgress(null);
    } catch (err: any) {
      setPlayvearIdSyncProgress('Sync failed: ' + (err.message || 'Unknown database error'));
    } finally {
      setIsSyncingPlayvearIds(false);
    }
  };

  // Incoming Recovery Tickets list
  const [recoveryTickets, setRecoveryTickets] = useState<any[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<any | null>(null);
  const [loadingTickets, setLoadingTickets] = useState(true);

  // Realtime listener for incoming recovery tickets
  useEffect(() => {
    const q = query(
      collection(db, 'admin_messages'),
      where('type', '==', 'account_recovery'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );

    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setRecoveryTickets(list);
      setLoadingTickets(false);
    }, (err) => {
      console.warn("Recovery tickets listener fallback (may need composite index):", err);
      // Fallback without orderBy if index pending
      const fallbackQ = query(
        collection(db, 'admin_messages'),
        where('type', '==', 'account_recovery')
      );
      getDocs(fallbackQ).then(res => {
        setRecoveryTickets(res.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoadingTickets(false);
      }).catch(() => setLoadingTickets(false));
    });

    return () => unsub();
  }, []);

  // Handle Initial Search if provided
  useEffect(() => {
    if (initialSearchQuery.trim()) {
      handleSearch(initialSearchQuery.trim());
    }
  }, [initialSearchQuery]);

  const handleSearch = async (queryStr?: string) => {
    const term = (queryStr !== undefined ? queryStr : searchQuery).trim();
    if (!term) {
      setSearchError("Please enter a PlayVear ID, Mobile Number, Old Login Gmail, or FreeFire Gaming UID to search.");
      return;
    }

    setIsSearching(true);
    setSearchError(null);
    setFoundUser(null);
    setUpdateSuccess(null);
    setUpdateError(null);

    try {
      const usersCol = collection(db, 'users');
      let matchedDoc: any = null;

      // 1. Try search by exact mobile number
      // Normalize mobile variations (e.g. removing +88, leading zeroes)
      const cleanDigits = term.replace(/\D/g, '');
      const queriesToTry = [
        query(usersCol, where('playvearId', '==', term)),
        query(usersCol, where('mobile', '==', term)),
        query(usersCol, where('email', '==', term.toLowerCase())),
        query(usersCol, where('gamingUid', '==', term))
      ];

      if (cleanDigits.length >= 6) {
        queriesToTry.push(query(usersCol, where('mobile', '==', cleanDigits)));
        if (cleanDigits.startsWith('880')) {
          queriesToTry.push(query(usersCol, where('mobile', '==', '0' + cleanDigits.slice(3))));
          queriesToTry.push(query(usersCol, where('mobile', '==', cleanDigits.slice(2))));
        } else if (cleanDigits.startsWith('01')) {
          queriesToTry.push(query(usersCol, where('mobile', '==', '+88' + cleanDigits)));
          queriesToTry.push(query(usersCol, where('mobile', '==', '88' + cleanDigits)));
        }
      }

      for (const q of queriesToTry) {
        const snap = await getDocs(q);
        if (!snap.empty) {
          matchedDoc = { id: snap.docs[0].id, ...snap.docs[0].data() };
          break;
        }
      }

      // If still not found, try client-side fuzzy scan for partial match if small dataset
      if (!matchedDoc) {
        setSearchError(`No player account found matching "${term}". Please verify the mobile number or FreeFire Gaming UID.`);
      } else {
        setFoundUser(matchedDoc);
      }
    } catch (err: any) {
      console.error("Search player error:", err);
      setSearchError("Search failed: " + (err.message || "Unknown database error"));
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectTicket = (ticket: any) => {
    setSelectedTicket(ticket);
    const searchTarget = (ticket.playvearId && ticket.playvearId !== 'Not Provided') 
      ? ticket.playvearId 
      : (ticket.registeredPhone || ticket.senderEmail || ticket.gamingUid || '');
    setSearchQuery(searchTarget);
    if (ticket.newGmail) {
      setNewGmail(ticket.newGmail.trim().toLowerCase());
    }
    if (searchTarget) {
      handleSearch(searchTarget);
    }
  };

  const handleUpdateGmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foundUser) return;

    const cleanNewEmail = newGmail.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanNewEmail || !emailRegex.test(cleanNewEmail)) {
      setUpdateError("⚠️ Please enter a valid Gmail address (e.g. name@gmail.com).");
      return;
    }

    const currentDocEmail = (foundUser.email || '').trim().toLowerCase();
    if (cleanNewEmail === currentDocEmail) {
      setUpdateError("⚠️ The new Gmail is identical to the current login Gmail. Please enter a different Gmail address.");
      return;
    }

    // Check if new Gmail already belongs to another user
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateSuccess(null);

    try {
      const usersCol = collection(db, 'users');
      const conflictQ = query(usersCol, where('email', '==', cleanNewEmail));
      const conflictSnap = await getDocs(conflictQ);

      const isConflict = conflictSnap.docs.some(d => d.id !== foundUser.id && d.id !== foundUser.userId);
      if (isConflict) {
        throw new Error(`⚠️ The Gmail "${cleanNewEmail}" is already linked to another active player account. The player must provide a new or unlinked Gmail.`);
      }

      // Perform Update on the player's account document
      const userDocRef = doc(db, 'users', foundUser.id);
      await updateDoc(userDocRef, {
        email: cleanNewEmail,
        emailChangedAt: serverTimestamp(),
        emailChangedByAdmin: currentAdminEmail,
        previousEmails: arrayUnion(currentDocEmail || 'unregistered'),
        updatedAt: serverTimestamp()
      });

      // If this was initiated from a ticket, mark ticket as resolved
      if (selectedTicket) {
        try {
          const ticketRef = doc(db, 'admin_messages', selectedTicket.id);
          const replyObj = {
            senderId: 'admin',
            senderName: 'Vortex Authority Admin',
            senderRole: 'admin',
            text: `✅ ACCOUNT RECOVERED: Your login Gmail has been successfully updated to ${cleanNewEmail}. You can now sign in with this new Google account to immediately access all your existing tokens, rank, and player profile!`,
            createdAt: new Date().toISOString()
          };

          await updateDoc(ticketRef, {
            status: 'resolved',
            updatedAt: serverTimestamp(),
            replies: arrayUnion(replyObj)
          });
        } catch (ticketErr) {
          console.warn("Could not update ticket state:", ticketErr);
        }
      }

      // Update local state
      const updatedUser = { ...foundUser, email: cleanNewEmail };
      setFoundUser(updatedUser);
      setUpdateSuccess(`🎉 Success! Account Login Gmail has been updated to "${cleanNewEmail}". The player can now log in directly using this Google account!`);
      setNewGmail('');
    } catch (err: any) {
      console.error("Update Gmail failed:", err);
      setUpdateError(err.message || "Failed to update account login Gmail.");
    } finally {
      setIsUpdating(false);
    }
  };

  const countryInfo = getCountryByCodeOrName(foundUser?.country || 'Bangladesh');

  return (
    <div className="space-y-6 text-left max-w-4xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-[#0a1526] to-slate-900 border border-cyan-500/30 p-5 rounded-3xl relative overflow-hidden shadow-[0_0_25px_rgba(6,182,212,0.12)]">
        <div className="absolute top-0 right-0 h-32 w-32 bg-cyan-500/10 blur-3xl rounded-full" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div className="flex items-center gap-3.5">
            <div className="h-12 w-12 rounded-2xl bg-cyan-500/15 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.25)]">
              <KeyRound className="h-6 w-6 stroke-[2.5]" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
                Account Recovery & Login Reassignment
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Search player by PlayVear ID, Mobile Number, Old Login Gmail, or FreeFire Gaming UID to reassign their Login Gmail without losing any data.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono font-bold text-[10px] uppercase tracking-wider flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Verified Authority
            </span>
          </div>
        </div>
      </div>

      {/* Main Grid: Pending Tickets Queue & Search Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Incoming Recovery Requests List */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-black text-white uppercase tracking-wider flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5 text-cyan-400" />
              Recovery Tickets
              {recoveryTickets.filter(t => t.status === 'pending').length > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[9px] font-black">
                  {recoveryTickets.filter(t => t.status === 'pending').length}
                </span>
              )}
            </h3>
            <span className="text-[10px] text-slate-500 font-mono">Live Sync</span>
          </div>

          <div className="bg-slate-900/90 border border-white/10 rounded-2xl p-2.5 max-h-[480px] overflow-y-auto custom-scrollbar space-y-2">
            {loadingTickets ? (
              <div className="py-8 text-center text-slate-500 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                Loading tickets...
              </div>
            ) : recoveryTickets.length === 0 ? (
              <div className="py-8 text-center text-slate-500 text-xs px-3">
                <CheckCircle2 className="w-6 h-6 text-slate-600 mx-auto mb-1.5" />
                No active account recovery tickets found.
              </div>
            ) : (
              recoveryTickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                const isPending = ticket.status === 'pending';

                return (
                  <div
                    key={ticket.id}
                    onClick={() => handleSelectTicket(ticket)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer text-left relative ${
                      isSelected
                        ? 'bg-cyan-950/50 border-cyan-500/60 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
                        : isPending
                        ? 'bg-slate-950/80 border-amber-500/30 hover:border-amber-500/60'
                        : 'bg-slate-950/40 border-white/5 opacity-70 hover:opacity-100 hover:border-white/20'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <span className="font-bold text-xs text-white truncate">
                        {ticket.senderName || 'Player'}
                      </span>
                      <span className={`text-[8.5px] font-mono px-1.5 py-0.5 rounded font-black uppercase ${
                        isPending ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-emerald-500/20 text-emerald-300'
                      }`}>
                        {ticket.status || 'pending'}
                      </span>
                    </div>

                    <div className="mt-1.5 space-y-0.5 text-[10.5px] font-mono">
                      {ticket.playvearId && ticket.playvearId !== 'Not Provided' && (
                        <div className="flex items-center gap-1.5 text-cyan-300 font-bold">
                          <Hash className="w-3 h-3 text-cyan-400 shrink-0" />
                          <span>PlayVear ID: #{ticket.playvearId}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-slate-300">
                        <Phone className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span className="truncate">{ticket.registeredPhone || ticket.contactPhone || 'No Phone'}</span>
                      </div>
                      {ticket.newGmail && (
                        <div className="flex items-center gap-1.5 text-amber-300/90 truncate">
                          <Mail className="w-3 h-3 text-amber-400 shrink-0" />
                          <span className="truncate">New: {ticket.newGmail}</span>
                        </div>
                      )}
                    </div>

                    {ticket.message && (
                      <p className="text-[10px] text-slate-400 mt-1.5 line-clamp-2 italic bg-black/30 p-1.5 rounded">
                        "{ticket.message}"
                      </p>
                    )}

                    <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[9px] text-slate-500">
                      <span>{ticket.createdAt?.toDate ? ticket.createdAt.toDate().toLocaleDateString() : 'Recent'}</span>
                      <span className="text-cyan-400 font-bold flex items-center gap-1">
                        Select & Autofill <ArrowRight className="w-2.5 h-2.5" />
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column (2 cols): Search & Recovery Action Panel */}
        <div className="lg:col-span-2 space-y-4">

          {/* PlayVear ID PROVISIONING TOOL CARD */}
          <div className="bg-gradient-to-br from-slate-900/90 via-slate-950/90 to-cyan-950/30 border border-cyan-500/20 p-4 rounded-2xl shadow-lg relative overflow-hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Hash className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                    PlayVear ID Manager
                    <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-400 text-[8px] font-mono font-bold">Auto-Sync</span>
                  </h3>
                  <p className="text-[10px] text-slate-400">Assign sequential numeric PlayVear IDs (4001, 4002, 4003...) with collision-free atomic transactions</p>
                </div>
              </div>

              <button
                onClick={handleSyncAllPlayvearIds}
                disabled={isSyncingPlayvearIds}
                className="bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/40 text-cyan-300 font-bold px-3.5 py-2 rounded-xl text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 cursor-pointer shrink-0"
              >
                {isSyncingPlayvearIds ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                    <span>Assigning IDs...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Sync All Users' PlayVear IDs</span>
                  </>
                )}
              </button>
            </div>

            {/* Progress or Status Message */}
            {playvearIdSyncProgress && (
              <div className="mt-3 p-2.5 rounded-xl bg-cyan-950/40 border border-cyan-500/30 text-cyan-300 text-[11px] font-mono flex items-center gap-2 animate-pulse">
                <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0 text-cyan-400" />
                <span>{playvearIdSyncProgress}</span>
              </div>
            )}

            {/* Sync Result Summary */}
            {playvearIdSyncResult && (
              <div className="mt-3 p-3 rounded-xl bg-slate-950/80 border border-emerald-500/30 space-y-2">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Sync Complete! Checked {playvearIdSyncResult.totalChecked} registered users in Firestore.</span>
                </div>
                
                <div className="grid grid-cols-3 gap-2 pt-1 font-mono text-[10px]">
                  <div className="bg-black/40 p-2 rounded-lg border border-white/5 text-center">
                    <span className="block text-slate-400">Total Checked</span>
                    <span className="text-white font-bold">{playvearIdSyncResult.totalChecked}</span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg border border-white/5 text-center">
                    <span className="block text-emerald-400">Newly Assigned</span>
                    <span className="text-emerald-300 font-bold">+{playvearIdSyncResult.newlyAssigned}</span>
                  </div>
                  <div className="bg-black/40 p-2 rounded-lg border border-white/5 text-center">
                    <span className="block text-cyan-400">Already Active</span>
                    <span className="text-cyan-300 font-bold">{playvearIdSyncResult.alreadyHadId}</span>
                  </div>
                </div>

                {playvearIdSyncResult.assignedList.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-white/5 max-h-32 overflow-y-auto space-y-1">
                    <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-bold">Newly Generated IDs:</span>
                    {playvearIdSyncResult.assignedList.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between text-[9.5px] font-mono text-slate-300 bg-white/[0.02] px-2 py-1 rounded">
                        <span className="truncate max-w-[160px]">{item.displayName} ({item.email})</span>
                        <span className="text-cyan-400 font-bold">ID: {item.playvearId}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Search Box */}
          <div className="bg-slate-900 border border-white/10 p-4 rounded-2xl shadow-lg space-y-3">
            <label className="text-xs font-black text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Search className="w-4 h-4 text-cyan-400" />
              Search Player Account
            </label>
            
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
              className="flex gap-2"
            >
              <div className="relative flex-1">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setSearchError(null);
                  }}
                  placeholder="Enter PlayVear ID, Mobile Number (e.g. 017XXXXXXXX), Old Login Gmail, or FreeFire Gaming UID..."
                  className="w-full bg-slate-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-500 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                />
              </div>

              <button
                type="submit"
                disabled={isSearching}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-4 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
              >
                {isSearching ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Searching...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </form>

            {searchError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{searchError}</span>
              </div>
            )}
          </div>

          {/* Player Account Details Card */}
          {foundUser && (
            <div className="bg-slate-900 border border-cyan-500/30 p-5 rounded-3xl space-y-5 shadow-[0_0_25px_rgba(6,182,212,0.08)]">
              
              {/* Profile Top Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3.5">
                  <div className="relative">
                    <div className="h-14 w-14 rounded-2xl bg-slate-950 border border-cyan-500/40 flex items-center justify-center font-black text-lg text-white overflow-hidden uppercase">
                      {foundUser.photoURL ? (
                        <img src={foundUser.photoURL} alt={foundUser.displayName} className="h-full w-full object-cover" />
                      ) : (
                        (foundUser.displayName || 'P').substring(0, 2)
                      )}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-black text-white">{foundUser.displayName || 'Unnamed Player'}</h4>
                      <span className="px-2 py-0.5 rounded bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[9px] font-mono font-bold uppercase">
                        {foundUser.role || 'Player'}
                      </span>
                    </div>
                    <p className="text-[11px] font-mono text-slate-400 mt-0.5 flex items-center gap-1.5">
                      <Gamepad2 className="w-3.5 h-3.5 text-cyan-400" />
                      ID: <span className="text-white font-bold">{foundUser.playvearId || 'N/A'}</span>
                      <span className="text-slate-600">|</span>
                      FreeFire Name: <span className="text-white font-bold">{foundUser.gameName || 'N/A'}</span>
                      <span className="text-slate-600">|</span>
                      FreeFire UID: <span className="text-cyan-300 font-bold">{foundUser.gamingUid || 'Not Set'}</span>
                    </p>
                  </div>
                </div>

                {/* Tokens Badge */}
                <div className="flex items-center gap-3 bg-slate-950 border border-white/10 px-3.5 py-2 rounded-2xl self-start sm:self-auto">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <div>
                    <span className="text-[9px] text-slate-500 font-mono uppercase block">Tokens Balance</span>
                    <span className="text-xs font-black text-amber-300 font-mono">{foundUser.tokens ?? 0} 🪙</span>
                  </div>
                </div>
              </div>

              {/* Information Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                {/* Registered Phone */}
                <div className="bg-slate-950/70 border border-white/5 p-3 rounded-xl flex items-center justify-between">
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Registered Mobile</span>
                    <span className="text-xs font-black text-cyan-300 font-mono mt-0.5 block">
                      {foundUser.mobile || 'Not Set'}
                    </span>
                  </div>
                  {foundUser.mobile && (
                    <div className="flex items-center gap-1.5">
                      <a
                        href={`tel:${foundUser.mobile}`}
                        className="h-8 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 flex items-center gap-1 text-[10px] font-bold transition-all"
                        title="Direct Call Player"
                      >
                        <Phone className="w-3 h-3" />
                        <span>Call</span>
                      </a>
                      <a
                        href={`https://wa.me/${foundUser.mobile.replace(/\D/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="h-8 px-2.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 flex items-center gap-1 text-[10px] font-bold transition-all"
                        title="WhatsApp Chat"
                      >
                        <span>WhatsApp</span>
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Current Login Gmail */}
                <div className="bg-slate-950/70 border border-amber-500/20 p-3 rounded-xl">
                  <span className="text-[9px] font-mono text-amber-400 uppercase font-bold block">Current Login Gmail</span>
                  <span className="text-xs font-black text-slate-100 font-mono mt-0.5 block truncate">
                    {foundUser.email || 'No Gmail Assigned'}
                  </span>
                </div>

                {/* Location details */}
                <div className="bg-slate-950/70 border border-white/5 p-3 rounded-xl flex items-center gap-2">
                  <div className="text-lg">{countryInfo.flag}</div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Location</span>
                    <span className="text-xs font-bold text-slate-200 truncate block">
                      {countryInfo.name} • {foundUser.state || foundUser.division || 'N/A'} {foundUser.city || foundUser.district ? `(${foundUser.city || foundUser.district})` : ''}
                    </span>
                  </div>
                </div>

                {/* Joined Date */}
                <div className="bg-slate-950/70 border border-white/5 p-3 rounded-xl flex items-center gap-2.5">
                  <Clock className="w-4 h-4 text-slate-500" />
                  <div>
                    <span className="text-[9px] font-mono text-slate-500 uppercase block">Account Created</span>
                    <span className="text-xs font-bold text-slate-300">
                      {foundUser.createdAt ? new Date(foundUser.createdAt).toLocaleDateString() : 'Active Member'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Admin Verification Checklist Alert */}
              <div className="bg-cyan-950/30 border border-cyan-500/20 p-3.5 rounded-2xl flex items-start gap-3 text-xs text-cyan-200">
                <AlertTriangle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-cyan-300">Admin Security Verification Checklist:</p>
                  <ul className="text-[11px] text-slate-300 list-disc list-inside space-y-0.5">
                    <li>Call the player's registered number to confirm ownership.</li>
                    <li>Verify the In-Game Name (<span className="text-cyan-300 font-mono font-bold">{foundUser.gameName || 'N/A'}</span>) or UID.</li>
                    <li>Provide the New Gmail below to switch authentication immediately.</li>
                  </ul>
                </div>
              </div>

              {/* Form to Update Login Gmail */}
              <form onSubmit={handleUpdateGmail} className="bg-slate-950 border border-cyan-500/40 p-4 rounded-2xl space-y-3.5">
                <div className="space-y-1">
                  <label className="text-xs font-black text-cyan-400 uppercase tracking-wider flex items-center gap-1.5">
                    <KeyRound className="w-3.5 h-3.5" />
                    Enter New Login Gmail Address
                  </label>
                  <p className="text-[10px] text-slate-400">
                    The player will use this new Google account to log into this exact account with all previous tokens and records.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row gap-2.5">
                  <input
                    type="email"
                    required
                    value={newGmail}
                    onChange={(e) => {
                      setNewGmail(e.target.value);
                      setUpdateError(null);
                      setUpdateSuccess(null);
                    }}
                    placeholder="e.g. player_new_email@gmail.com"
                    className="flex-1 bg-slate-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/50"
                  />

                  <button
                    type="submit"
                    disabled={isUpdating || !newGmail.trim()}
                    className="bg-gradient-to-r from-cyan-500 via-sky-500 to-cyan-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 font-black px-5 py-2.5 rounded-xl text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 cursor-pointer shrink-0 shadow-[0_0_15px_rgba(6,182,212,0.3)]"
                  >
                    {isUpdating ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Updating Gmail...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck className="w-3.5 h-3.5" />
                        <span>Assign New Login Gmail</span>
                      </>
                    )}
                  </button>
                </div>

                {updateError && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{updateError}</span>
                  </div>
                )}

                {updateSuccess && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span className="font-semibold">{updateSuccess}</span>
                  </div>
                )}
              </form>

            </div>
          )}

        </div>
      </div>
    </div>
  );
};
