import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserProfile } from '../types';
import { 
  Coins, 
  Search, 
  RefreshCw, 
  ArrowLeft, 
  Loader2,
  Table as TableIcon
} from 'lucide-react';

interface TopBalancesAdminProps {
  onBack?: () => void;
}

export function TopBalancesAdmin({ onBack }: TopBalancesAdminProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchTopUsers = async () => {
    try {
      setLoading(true);
      const querySnapshot = await getDocs(collection(db, 'users'));
      const fetchedUsers: UserProfile[] = [];
      
      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        fetchedUsers.push({
          userId: docSnap.id,
          email: data.email || '',
          displayName: data.displayName || data.fullName || data.name || 'N/A',
          fullName: data.fullName,
          playvearId: data.playvearId || 'N/A',
          photoURL: data.photoURL || null,
          role: data.role || 'user',
          tokens: Number(data.tokens) || 0,
          mobile: data.mobile || 'N/A',
          country: data.country || 'N/A',
          createdAt: data.createdAt || '',
          updatedAt: data.updatedAt || ''
        } as UserProfile);
      });

      // Sort descending by tokens
      fetchedUsers.sort((a, b) => (b.tokens || 0) - (a.tokens || 0));

      setUsers(fetchedUsers);
    } catch (err) {
      console.error("Error fetching user balances:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTopUsers();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchTopUsers();
  };

  // Filter top users based on search
  const filteredUsers = users.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return (
      u.displayName?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.playvearId?.toLowerCase().includes(q) ||
      u.mobile?.toLowerCase().includes(q)
    );
  });

  // Top 20 users for internal verification
  const top20Users = filteredUsers.slice(0, 20);

  // Aggregate metrics
  const totalTop20Tokens = top20Users.reduce((sum, u) => sum + (u.tokens || 0), 0);
  const avgTop20Tokens = top20Users.length > 0 ? Math.round(totalTop20Tokens / top20Users.length) : 0;

  return (
    <div className="w-full space-y-3 text-left font-mono text-[9px] select-text">
      {/* Excel Sheet Style Header */}
      <div className="flex items-center justify-between gap-2 bg-slate-900 border border-slate-800 px-3 py-2 rounded-lg text-[9px]">
        <div className="flex items-center gap-2">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded transition-all border border-slate-700 active:scale-95 cursor-pointer shrink-0"
              title="Back"
            >
              <ArrowLeft className="w-3 h-3" />
            </button>
          )}
          <div className="flex items-center gap-1.5">
            <TableIcon className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-bold text-white uppercase tracking-wider text-[9px]">
              Top 20 User Balances Data Sheet
            </span>
            <span className="text-slate-500 text-[9px]">
              (Internal Admin Verification View)
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded text-[9px] font-bold border border-slate-700 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Toolbar / Search Bar */}
      <div className="flex items-center gap-2 bg-slate-900/80 border border-slate-800 px-2.5 py-1.5 rounded-md text-[9px]">
        <Search className="w-3 h-3 text-slate-400 shrink-0" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Filter by Name, Email, Phone or PlayVear ID..."
          className="w-full bg-transparent text-white placeholder:text-slate-600 focus:outline-none text-[9px] font-mono"
        />
        {searchQuery && (
          <button 
            onClick={() => setSearchQuery('')}
            className="text-slate-500 hover:text-white text-[9px] px-1"
          >
            Clear
          </button>
        )}
      </div>

      {/* Excel Style Data Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-12 bg-slate-900/60 border border-slate-800 rounded-lg text-[9px]">
          <Loader2 className="w-5 h-5 text-cyan-400 animate-spin mb-2" />
          <span className="text-slate-400 font-bold uppercase tracking-wider text-[9px]">
            Loading User Records...
          </span>
        </div>
      ) : (
        <div className="border border-slate-700/80 rounded-md overflow-x-auto bg-slate-950 shadow-inner">
          <table className="w-full text-left border-collapse font-mono text-[9px]">
            {/* Table Header (Excel Header Row) */}
            <thead>
              <tr className="bg-slate-800/90 text-slate-300 border-b border-slate-700 select-none text-[9px]">
                <th className="px-2 py-1.5 border-r border-slate-700/80 font-bold w-10 text-center text-slate-400 bg-slate-800/50">
                  #
                </th>
                <th className="px-2 py-1.5 border-r border-slate-700/80 font-bold text-slate-300">
                  PlayVear ID
                </th>
                <th className="px-2 py-1.5 border-r border-slate-700/80 font-bold text-slate-300">
                  Display Name
                </th>
                <th className="px-2 py-1.5 border-r border-slate-700/80 font-bold text-slate-300">
                  Email
                </th>
                <th className="px-2 py-1.5 border-r border-slate-700/80 font-bold text-slate-300">
                  Mobile
                </th>
                <th className="px-2 py-1.5 border-r border-slate-700/80 font-bold text-slate-300">
                  Role
                </th>
                <th className="px-2 py-1.5 font-bold text-right text-amber-300 bg-amber-950/20">
                  Balance (Tokens)
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody>
              {top20Users.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-3 py-6 text-center text-slate-500 text-[9px]">
                    No matching user records found.
                  </td>
                </tr>
              ) : (
                top20Users.map((u, idx) => {
                  const rowNum = idx + 1;
                  const isEven = idx % 2 === 0;

                  return (
                    <tr 
                      key={u.userId}
                      className={`border-b border-slate-800/80 transition-colors hover:bg-slate-800/60 text-[9px] ${
                        isEven ? 'bg-slate-900/40' : 'bg-slate-950'
                      }`}
                    >
                      {/* Row Index */}
                      <td className="px-2 py-1 border-r border-slate-800 text-center font-bold text-slate-500 bg-slate-900/30 text-[9px]">
                        {rowNum}
                      </td>

                      {/* PlayVear ID */}
                      <td className="px-2 py-1 border-r border-slate-800 font-bold text-cyan-400 whitespace-nowrap text-[9px]">
                        {u.playvearId ? `#${u.playvearId}` : 'N/A'}
                      </td>

                      {/* Display Name */}
                      <td className="px-2 py-1 border-r border-slate-800 text-white font-medium whitespace-nowrap text-[9px]">
                        {u.displayName || 'N/A'}
                      </td>

                      {/* Email */}
                      <td className="px-2 py-1 border-r border-slate-800 text-slate-300 whitespace-nowrap text-[9px]">
                        {u.email || 'N/A'}
                      </td>

                      {/* Mobile */}
                      <td className="px-2 py-1 border-r border-slate-800 text-slate-400 whitespace-nowrap text-[9px]">
                        {u.mobile || 'N/A'}
                      </td>

                      {/* Role */}
                      <td className="px-2 py-1 border-r border-slate-800 text-slate-400 uppercase whitespace-nowrap text-[9px]">
                        {u.role || 'user'}
                      </td>

                      {/* Balance (Tokens) */}
                      <td className="px-2 py-1 font-bold text-right text-emerald-400 bg-emerald-950/10 whitespace-nowrap text-[9px]">
                        {(u.tokens || 0).toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>

          {/* Excel Style Status Summary Bar at bottom */}
          <div className="bg-slate-900 border-t border-slate-700/80 px-3 py-1.5 flex flex-wrap items-center justify-between gap-3 text-slate-400 text-[9px] font-mono">
            <div className="flex items-center gap-4">
              <span>
                Total Rows: <strong className="text-white">{top20Users.length}</strong>
              </span>
              <span>
                Average Balance: <strong className="text-emerald-400">{avgTop20Tokens.toLocaleString()}</strong>
              </span>
            </div>
            <div>
              Sum Total Tokens: <strong className="text-amber-300">{totalTop20Tokens.toLocaleString()}</strong>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
