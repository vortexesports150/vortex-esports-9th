import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Eye, 
  EyeOff, 
  Trash2, 
  Shield, 
  Trophy, 
  Swords, 
  Search, 
  RefreshCw, 
  AlertCircle,
  Clock,
  User,
  Coins
} from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, onSnapshot, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface HiddenArchivesAdminProps {
  onBack?: () => void;
}

export function HiddenArchivesAdmin({ onBack }: HiddenArchivesAdminProps) {
  const [activeTab, setActiveTab] = useState<'leagues' | 'tournaments' | 'lonewolf'>('leagues');
  
  const [hiddenLeagues, setHiddenLeagues] = useState<any[]>([]);
  const [hiddenTournaments, setHiddenTournaments] = useState<any[]>([]);
  const [hiddenLoneWolf, setHiddenLoneWolf] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  // Delete modal target
  const [deleteTarget, setDeleteTarget] = useState<{ collectionName: string; id: string; name: string } | null>(null);

  // Real-time listener for Hidden Leagues
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'pro_hosted_leagues'), (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.isHidden === true) {
          list.push({ ...data, id: d.id });
        }
      });
      setHiddenLeagues(list);
    }, (err) => {
      console.error("Error listening to hidden leagues:", err);
    });
    return () => unsub();
  }, []);

  // Real-time listener for Hidden Tournaments
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'tournaments_freefire'), (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.isHidden === true) {
          list.push({ ...data, id: d.id });
        }
      });
      setHiddenTournaments(list);
    }, (err) => {
      console.error("Error listening to hidden tournaments:", err);
    });
    return () => unsub();
  }, []);

  // Real-time listener for Hidden Lone Wolf Matches
  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'lone_wolf_matches'), (snap) => {
      const list: any[] = [];
      snap.forEach(d => {
        const data = d.data();
        if (data.isHidden === true) {
          list.push({ ...data, id: d.id });
        }
      });
      setHiddenLoneWolf(list);
      setLoading(false);
    }, (err) => {
      console.error("Error listening to hidden lone wolf matches:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  // Handle Unhide Item
  const handleUnhideItem = async (collectionName: string, id: string, name: string) => {
    try {
      setActionError(null);
      await updateDoc(doc(db, collectionName, id), {
        isHidden: false,
        updatedAt: new Date().toISOString()
      });
      setActionSuccess(`"${name}" has been unhidden and restored to public view!`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      console.error("Error unhiding item:", err);
      setActionError("Failed to unhide item: " + err.message);
    }
  };

  // Handle Permanent Delete Item
  const handleDeleteItem = async (collectionName: string, id: string, name: string) => {
    try {
      setActionError(null);
      await deleteDoc(doc(db, collectionName, id));
      setActionSuccess(`"${name}" deleted permanently from system!`);
      setTimeout(() => setActionSuccess(null), 3500);
    } catch (err: any) {
      console.error("Error deleting item permanently:", err);
      setActionError("Failed to delete item: " + err.message);
    }
  };

  // Filter items by search query
  const filteredLeagues = hiddenLeagues.filter(l => 
    (l.leagueName || l.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (l.hostName || l.hostEmail || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredTournaments = hiddenTournaments.filter(t => 
    (t.title || t.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    t.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.hostName || t.hostEmail || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredLoneWolf = hiddenLoneWolf.filter(m => 
    (m.title || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (m.hostName || m.hostEmail || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalHiddenCount = hiddenLeagues.length + hiddenTournaments.length + hiddenLoneWolf.length;

  return (
    <div className="bg-slate-900 border border-slate-800 p-4 sm:p-6 rounded-2xl relative text-left space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-amber-950/80 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.2)]">
            <EyeOff className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider font-mono flex items-center gap-2">
              <span>Hidden Archives Console</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-[10px] font-bold">
                {totalHiddenCount} Total Hidden
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 font-medium mt-0.5">
              Review and manage hidden leagues, tournaments, and 1v1 lone wolf matches.
            </p>
          </div>
        </div>

        {onBack && (
          <button
            onClick={onBack}
            className="self-start sm:self-auto px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold border border-slate-700 transition-all cursor-pointer"
          >
            &larr; Back to Admin
          </button>
        )}
      </div>

      {/* Notifications */}
      <AnimatePresence>
        {actionSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-3 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 font-medium flex items-center justify-between"
          >
            <span>{actionSuccess}</span>
            <button onClick={() => setActionSuccess(null)} className="text-emerald-400 font-bold ml-2">✕</button>
          </motion.div>
        )}
        {actionError && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl text-xs text-rose-300 font-medium flex items-center justify-between"
          >
            <span>{actionError}</span>
            <button onClick={() => setActionError(null)} className="text-rose-400 font-bold ml-2">✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Category Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0">
          <button
            onClick={() => setActiveTab('leagues')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono uppercase transition-all flex items-center gap-2 cursor-pointer border shrink-0 ${
              activeTab === 'leagues'
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-[0_0_12px_rgba(245,158,11,0.2)]'
                : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4 text-amber-400" />
            <span>Hidden Leagues ({hiddenLeagues.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tournaments')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono uppercase transition-all flex items-center gap-2 cursor-pointer border shrink-0 ${
              activeTab === 'tournaments'
                ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.2)]'
                : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Trophy className="w-4 h-4 text-cyan-400" />
            <span>Hidden Tournaments ({hiddenTournaments.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('lonewolf')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold font-mono uppercase transition-all flex items-center gap-2 cursor-pointer border shrink-0 ${
              activeTab === 'lonewolf'
                ? 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/50 shadow-[0_0_12px_rgba(217,70,239,0.2)]'
                : 'bg-slate-950/80 text-slate-400 border-slate-800 hover:text-slate-200'
            }`}
          >
            <Swords className="w-4 h-4 text-fuchsia-400" />
            <span>Hidden Lone Wolf ({hiddenLoneWolf.length})</span>
          </button>
        </div>

        {/* Search */}
        <div className="relative shrink-0 sm:w-64">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by title, ID, or host..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-cyan-500/50 pl-9 pr-3 py-1.5 rounded-xl text-xs text-white placeholder:text-slate-500 outline-none transition-all font-mono"
          />
        </div>
      </div>

      {/* ITEMS DISPLAY */}
      {loading ? (
        <div className="py-12 text-center text-slate-400 font-mono text-xs flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Loading hidden items...</span>
        </div>
      ) : activeTab === 'leagues' ? (
        filteredLeagues.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400 space-y-2">
            <Shield className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-mono">No hidden leagues found in archive.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredLeagues.map((league) => (
              <div
                key={league.id}
                className="bg-slate-950 border border-amber-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3 relative overflow-hidden shadow-lg"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-amber-400 font-bold uppercase tracking-wider bg-amber-950/60 border border-amber-500/30 px-2 py-0.5 rounded-md">
                      #{league.id.slice(-6)}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Status: {league.status || 'Active'}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-white font-mono uppercase">
                    {league.leagueName || league.title || 'Untitled League'}
                  </h4>

                  <div className="text-[11px] text-slate-400 space-y-0.5 font-sans">
                    <p className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Host: {league.hostName || league.hostEmail || 'System Admin'}</span>
                    </p>
                    {league.totalPrizePool && (
                      <p className="flex items-center gap-1.5 text-amber-300 font-mono font-bold">
                        <Coins className="w-3.5 h-3.5 text-amber-400" />
                        <span>Prize Pool: {league.totalPrizePool} 🪙</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleUnhideItem('pro_hosted_leagues', league.id, league.leagueName || league.title || 'League')}
                    className="flex-1 py-1.5 px-3 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Unhide (Restore)</span>
                  </button>

                  <button
                    onClick={() => setDeleteTarget({ collectionName: 'pro_hosted_leagues', id: league.id, name: league.leagueName || league.title || 'League' })}
                    className="py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Delete Permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : activeTab === 'tournaments' ? (
        filteredTournaments.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400 space-y-2">
            <Trophy className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-mono">No hidden tournaments found in archive.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredTournaments.map((tourney) => (
              <div
                key={tourney.id}
                className="bg-slate-950 border border-cyan-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3 relative overflow-hidden shadow-lg"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-cyan-400 font-bold uppercase tracking-wider bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded-md">
                      #{tourney.tournamentNumber || tourney.id.slice(-6)}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Mode: {tourney.mode || 'BR'}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-white font-mono uppercase">
                    {tourney.title || tourney.name || 'Untitled Tournament'}
                  </h4>

                  <div className="text-[11px] text-slate-400 space-y-0.5 font-sans">
                    <p className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Host: {tourney.hostName || tourney.hostEmail || tourney.createdBy || 'System Admin'}</span>
                    </p>
                    {tourney.prizePool && (
                      <p className="flex items-center gap-1.5 text-yellow-300 font-mono font-bold">
                        <Coins className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Prize Pool: {tourney.prizePool} 🪙</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleUnhideItem('tournaments_freefire', tourney.id, tourney.title || tourney.name || 'Tournament')}
                    className="flex-1 py-1.5 px-3 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Unhide (Restore)</span>
                  </button>

                  <button
                    onClick={() => setDeleteTarget({ collectionName: 'tournaments_freefire', id: tourney.id, name: tourney.title || tourney.name || 'Tournament' })}
                    className="py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Delete Permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        filteredLoneWolf.length === 0 ? (
          <div className="p-8 text-center bg-slate-950/60 border border-slate-800 rounded-2xl text-slate-400 space-y-2">
            <Swords className="w-8 h-8 text-slate-600 mx-auto" />
            <p className="text-xs font-mono">No hidden Lone Wolf matches found in archive.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredLoneWolf.map((match) => (
              <div
                key={match.id}
                className="bg-slate-950 border border-fuchsia-500/30 rounded-2xl p-4 flex flex-col justify-between gap-3 relative overflow-hidden shadow-lg"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-fuchsia-400 font-bold uppercase tracking-wider bg-fuchsia-950/60 border border-fuchsia-500/30 px-2 py-0.5 rounded-md">
                      #{match.matchNumber || match.id.slice(-6)}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      Status: {match.status || 'Registration'}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-white font-mono uppercase">
                    {match.title || '1v1 Lone Wolf Duel'}
                  </h4>

                  <div className="text-[11px] text-slate-400 space-y-0.5 font-sans">
                    <p className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                      <span>Host: {match.hostName || match.hostEmail || 'System Admin'}</span>
                    </p>
                    {match.prizePool && (
                      <p className="flex items-center gap-1.5 text-yellow-300 font-mono font-bold">
                        <Coins className="w-3.5 h-3.5 text-yellow-400" />
                        <span>Winner Prize: {match.prizePool} 🪙</span>
                      </p>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
                  <button
                    onClick={() => handleUnhideItem('lone_wolf_matches', match.id, match.title || 'Lone Wolf Match')}
                    className="flex-1 py-1.5 px-3 bg-fuchsia-500/20 hover:bg-fuchsia-500/30 text-fuchsia-300 border border-fuchsia-500/40 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Unhide (Restore)</span>
                  </button>

                  <button
                    onClick={() => setDeleteTarget({ collectionName: 'lone_wolf_matches', id: match.id, name: match.title || 'Lone Wolf Match' })}
                    className="py-1.5 px-3 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 rounded-xl text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                    title="Delete Permanently"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Confirmation Delete Modal */}
      <ConfirmDeleteModal
        isOpen={!!deleteTarget}
        title="Delete Item Permanently"
        itemName={deleteTarget?.name}
        description="Are you sure you want to PERMANENTLY delete this archive record? This action cannot be undone."
        confirmText="Yes, Delete Permanently"
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (deleteTarget) {
            await handleDeleteItem(deleteTarget.collectionName, deleteTarget.id, deleteTarget.name);
          }
        }}
      />
    </div>
  );
}
