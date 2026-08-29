import React, { useState, useEffect } from 'react';
import { 
  collection, 
  getDocs, 
  addDoc, 
  deleteDoc, 
  doc, 
  updateDoc, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Clock,
  DollarSign, 
  Tag, 
  Trash2, 
  Edit3, 
  RefreshCw, 
  ArrowLeft, 
  Loader2, 
  TrendingUp, 
  Megaphone, 
  Server, 
  Gift, 
  Briefcase, 
  HelpCircle,
  X,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export interface ExpenseRecord {
  id?: string;
  purpose: string;
  amount: number;
  currency: string;
  category: 'Marketing & Ads' | 'Server & Infrastructure' | 'Tournaments & Prizes' | 'Operations & Salaries' | 'Miscellaneous';
  expenseDate: string; // YYYY-MM-DD
  expenseTime?: string; // HH:mm
  monthKey: string; // YYYY-MM
  notes?: string;
  addedByEmail?: string;
  createdAt: string;
}

interface PlatformExpensesAdminProps {
  onBack?: () => void;
  userEmail?: string;
}

export function PlatformExpensesAdmin({ onBack, userEmail }: PlatformExpensesAdminProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedMonth, setSelectedMonth] = useState<string>('ALL');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [refreshing, setRefreshing] = useState<boolean>(false);

  // Modal states
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseRecord | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form inputs
  const getCurrentTimeHHMM = () => {
    const now = new Date();
    const hh = String(now.getHours()).padStart(2, '0');
    const mm = String(now.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  };

  const [formPurpose, setFormPurpose] = useState<string>('');
  const [formAmount, setFormAmount] = useState<string>('');
  const [formCurrency, setFormCurrency] = useState<string>('BDT');
  const [formCategory, setFormCategory] = useState<ExpenseRecord['category']>('Marketing & Ads');
  const [formDate, setFormDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [formTime, setFormTime] = useState<string>(getCurrentTimeHHMM());
  const [formNotes, setFormNotes] = useState<string>('');

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const querySnapshot = await getDocs(collection(db, 'platform_expenses'));
      const list: ExpenseRecord[] = [];

      querySnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        const createdAtVal = data.createdAt || new Date().toISOString();
        let fallbackTime = '';
        if (createdAtVal) {
          try {
            const d = new Date(createdAtVal);
            if (!isNaN(d.getTime())) {
              fallbackTime = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
            }
          } catch {}
        }

        list.push({
          id: docSnap.id,
          purpose: data.purpose || 'Expense',
          amount: Number(data.amount) || 0,
          currency: data.currency || 'BDT',
          category: data.category || 'Marketing & Ads',
          expenseDate: data.expenseDate || new Date().toISOString().split('T')[0],
          expenseTime: data.expenseTime || fallbackTime,
          monthKey: data.monthKey || (data.expenseDate ? data.expenseDate.slice(0, 7) : new Date().toISOString().slice(0, 7)),
          notes: data.notes || '',
          addedByEmail: data.addedByEmail || 'Admin',
          createdAt: createdAtVal
        });
      });

      // Sort descending by timestamp combining date and time
      list.sort((a, b) => {
        const timeA = new Date(`${a.expenseDate}T${a.expenseTime || '00:00'}:00`).getTime();
        const timeB = new Date(`${b.expenseDate}T${b.expenseTime || '00:00'}:00`).getTime();
        if (!isNaN(timeA) && !isNaN(timeB) && timeA !== timeB) {
          return timeB - timeA;
        }
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      setExpenses(list);
    } catch (err: any) {
      console.error("Error fetching platform expenses:", err);
      setFetchError(err?.message || 'Failed to load platform expenses. Please check your connection and permissions.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchExpenses();
  };

  const handleOpenAddModal = () => {
    setEditingExpense(null);
    setFormPurpose('');
    setFormAmount('');
    setFormCurrency('BDT');
    setFormCategory('Marketing & Ads');
    setFormDate(new Date().toISOString().split('T')[0]);
    setFormTime(getCurrentTimeHHMM());
    setFormNotes('');
    setStatusMsg(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEditModal = (item: ExpenseRecord) => {
    setEditingExpense(item);
    setFormPurpose(item.purpose);
    setFormAmount(item.amount.toString());
    setFormCurrency(item.currency || 'BDT');
    setFormCategory(item.category);
    setFormDate(item.expenseDate);
    setFormTime(item.expenseTime || (item.createdAt ? new Date(item.createdAt).toTimeString().slice(0, 5) : getCurrentTimeHHMM()));
    setFormNotes(item.notes || '');
    setStatusMsg(null);
    setIsAddModalOpen(true);
  };

  const handleSubmitExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formPurpose.trim() || !formAmount || Number(formAmount) <= 0 || !formDate) {
      setStatusMsg({ type: 'error', text: 'Please fill in purpose, valid amount (>0), and date.' });
      return;
    }

    try {
      setSubmitting(true);
      setStatusMsg(null);

      const monthKey = formDate.slice(0, 7); // YYYY-MM
      let timestampISO = new Date().toISOString();
      try {
        const parsedDate = new Date(`${formDate}T${formTime || '00:00'}:00`);
        if (!isNaN(parsedDate.getTime())) {
          timestampISO = parsedDate.toISOString();
        }
      } catch {}

      const payload = {
        purpose: formPurpose.trim(),
        amount: Number(formAmount),
        currency: formCurrency,
        category: formCategory,
        expenseDate: formDate,
        expenseTime: formTime || '00:00',
        monthKey: monthKey,
        notes: formNotes.trim(),
        addedByEmail: userEmail || 'Admin',
        createdAt: editingExpense?.createdAt || timestampISO,
        updatedAt: new Date().toISOString()
      };

      if (editingExpense && editingExpense.id) {
        await updateDoc(doc(db, 'platform_expenses', editingExpense.id), payload);
      } else {
        await addDoc(collection(db, 'platform_expenses'), payload);
      }

      setIsAddModalOpen(false);
      fetchExpenses();
    } catch (err: any) {
      console.error("Error saving expense record:", err);
      setStatusMsg({ type: 'error', text: err?.message || 'Failed to save expense record.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id?: string) => {
    if (!id) return;
    if (!window.confirm("Are you sure you want to delete this expense record?")) return;

    try {
      await deleteDoc(doc(db, 'platform_expenses', id));
      setExpenses(prev => prev.filter(item => item.id !== id));
    } catch (err) {
      console.error("Error deleting expense:", err);
      alert("Failed to delete record.");
    }
  };

  // Get unique months list for filtering
  const monthsList = Array.from(new Set(expenses.map(e => e.monthKey))).sort().reverse();

  // Filter expenses
  const filteredExpenses = expenses.filter(item => {
    // Month filter
    if (selectedMonth !== 'ALL' && item.monthKey !== selectedMonth) return false;
    
    // Category filter
    if (selectedCategory !== 'ALL' && item.category !== selectedCategory) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      const matchPurpose = item.purpose.toLowerCase().includes(q);
      const matchNotes = item.notes?.toLowerCase().includes(q);
      const matchAdmin = item.addedByEmail?.toLowerCase().includes(q);
      const matchCategory = item.category.toLowerCase().includes(q);
      return matchPurpose || matchNotes || matchAdmin || matchCategory;
    }

    return true;
  });

  // Calculate Metrics
  const totalFilteredAmount = filteredExpenses.reduce((sum, item) => sum + item.amount, 0);
  const totalAllTimeAmount = expenses.reduce((sum, item) => sum + item.amount, 0);

  // Category breakdown
  const categoryBreakdown = filteredExpenses.reduce((acc, item) => {
    acc[item.category] = (acc[item.category] || 0) + item.amount;
    return acc;
  }, {} as Record<string, number>);

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'Marketing & Ads': return <Megaphone className="w-3.5 h-3.5 text-pink-400" />;
      case 'Server & Infrastructure': return <Server className="w-3.5 h-3.5 text-cyan-400" />;
      case 'Tournaments & Prizes': return <Gift className="w-3.5 h-3.5 text-amber-400" />;
      case 'Operations & Salaries': return <Briefcase className="w-3.5 h-3.5 text-purple-400" />;
      default: return <HelpCircle className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  const getCategoryBadgeClass = (cat: string) => {
    switch (cat) {
      case 'Marketing & Ads': return 'bg-pink-950/80 text-pink-300 border-pink-800/60';
      case 'Server & Infrastructure': return 'bg-cyan-950/80 text-cyan-300 border-cyan-800/60';
      case 'Tournaments & Prizes': return 'bg-amber-950/80 text-amber-300 border-amber-800/60';
      case 'Operations & Salaries': return 'bg-purple-950/80 text-purple-300 border-purple-800/60';
      default: return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="w-full space-y-4 text-left font-sans">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl backdrop-blur-md">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2.5 bg-slate-800 hover:bg-slate-700 text-cyan-400 rounded-xl transition-all border border-slate-700 active:scale-95 cursor-pointer shrink-0"
              title="Back to Admin Dashboard"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <div className="flex items-center gap-2">
              <Receipt className="w-5 h-5 text-rose-400 animate-pulse" />
              <h2 className="text-lg sm:text-xl font-black text-white uppercase tracking-wider font-mono">
                Platform Expenses Tracker
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Log marketing, server hosting, prizes, and operational costs across time periods
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            disabled={refreshing || loading}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-bold border border-slate-700 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>

          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-900/30 transition-all active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Expense</span>
          </button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Filtered Total */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">
              {selectedMonth === 'ALL' ? 'Total Expenses (All Time)' : `Expense for ${selectedMonth}`}
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-rose-400 font-mono">
                ৳ {totalFilteredAmount.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-bold">BDT</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-rose-950/50 border border-rose-800/40 flex items-center justify-center shrink-0">
            <DollarSign className="w-5 h-5 text-rose-400" />
          </div>
        </div>

        {/* All-Time Expense */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">
              All-Time Platform Expense
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl font-black text-amber-400 font-mono">
                ৳ {totalAllTimeAmount.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-500 font-mono font-bold">BDT</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-950/50 border border-amber-800/40 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-amber-400" />
          </div>
        </div>

        {/* Total Records */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">
              Total Recorded Entries
            </span>
            <span className="text-xl font-black text-cyan-400 font-mono mt-1 block">
              {filteredExpenses.length} Records
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-cyan-950/50 border border-cyan-800/40 flex items-center justify-center shrink-0">
            <Receipt className="w-5 h-5 text-cyan-400" />
          </div>
        </div>

        {/* Top Category */}
        <div className="bg-slate-900/80 border border-slate-800 p-4 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">
              Top Expense Category
            </span>
            <span className="text-xs font-black text-purple-300 font-mono mt-1 block truncate max-w-[150px]">
              {Object.keys(categoryBreakdown).length > 0
                ? Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0][0]
                : 'None'}
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-purple-950/50 border border-purple-800/40 flex items-center justify-center shrink-0">
            <Tag className="w-5 h-5 text-purple-400" />
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-900/90 border border-slate-800 p-3 rounded-2xl">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search expense by purpose, notes, category, or admin..."
            className="w-full bg-slate-950 border border-slate-800 text-white pl-9 pr-4 py-2 rounded-xl text-xs placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-all font-mono"
          />
        </div>

        {/* Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Monthly Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-rose-400 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-white text-xs font-mono font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Months</option>
              {monthsList.map(m => (
                <option key={m} value={m} className="bg-slate-900 text-white">
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl">
            <Filter className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-transparent text-white text-xs font-mono font-bold focus:outline-none cursor-pointer"
            >
              <option value="ALL" className="bg-slate-900 text-white">All Categories</option>
              <option value="Marketing & Ads" className="bg-slate-900 text-white">Marketing & Ads</option>
              <option value="Server & Infrastructure" className="bg-slate-900 text-white">Server & Infrastructure</option>
              <option value="Tournaments & Prizes" className="bg-slate-900 text-white">Tournaments & Prizes</option>
              <option value="Operations & Salaries" className="bg-slate-900 text-white">Operations & Salaries</option>
              <option value="Miscellaneous" className="bg-slate-900 text-white">Miscellaneous</option>
            </select>
          </div>
        </div>
      </div>

      {/* Expenses History Table */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-slate-900/60 border border-slate-800 rounded-2xl">
          <Loader2 className="w-8 h-8 text-rose-400 animate-spin mb-3" />
          <p className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
            Fetching Expense History...
          </p>
        </div>
      ) : fetchError ? (
        <div className="flex flex-col items-center justify-center py-12 px-4 bg-slate-900/90 border border-rose-900/50 rounded-2xl text-center space-y-3">
          <AlertCircle className="w-10 h-10 text-rose-400" />
          <p className="text-sm font-mono text-rose-300 max-w-md">
            {fetchError}
          </p>
          <button
            onClick={fetchExpenses}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700 text-xs font-bold font-mono rounded-xl transition-all cursor-pointer"
          >
            Try Again
          </button>
        </div>
      ) : (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-4 py-3 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
            <span>Expenses History Log ({filteredExpenses.length})</span>
            <span>Monthly Cost Tracking</span>
          </div>

          {filteredExpenses.length === 0 ? (
            <div className="py-16 text-center text-slate-500 text-xs font-mono">
              No expense records found. Click "Add Expense" to log new costs.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-sans text-xs">
                <thead>
                  <tr className="bg-slate-950 text-slate-400 border-b border-slate-800 font-mono text-[11px] uppercase tracking-wider">
                    <th className="p-3">Date & Time</th>
                    <th className="p-3">Purpose / Title</th>
                    <th className="p-3">Category</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Logged By</th>
                    <th className="p-3">Notes</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {filteredExpenses.map((item) => {
                    const formatTime12h = (timeStr?: string, isoStr?: string) => {
                      if (timeStr && timeStr.includes(':')) {
                        const [h, m] = timeStr.split(':');
                        let hourNum = parseInt(h, 10);
                        if (!isNaN(hourNum)) {
                          const ampm = hourNum >= 12 ? 'PM' : 'AM';
                          hourNum = hourNum % 12 || 12;
                          return `${String(hourNum).padStart(2, '0')}:${m} ${ampm}`;
                        }
                      }
                      if (isoStr) {
                        try {
                          const d = new Date(isoStr);
                          if (!isNaN(d.getTime())) {
                            return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
                          }
                        } catch {}
                      }
                      return '';
                    };

                    const timeDisplay = formatTime12h(item.expenseTime, item.createdAt);

                    return (
                      <tr 
                        key={item.id}
                        className="hover:bg-slate-800/40 transition-colors font-sans"
                      >
                        {/* Date & Time */}
                        <td className="p-3 font-mono whitespace-nowrap">
                          <div className="font-bold text-xs text-cyan-300 flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>{item.expenseDate}</span>
                          </div>
                          {timeDisplay ? (
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <Clock className="w-3 h-3 text-rose-400 shrink-0" />
                              <span className="font-semibold text-slate-300">{timeDisplay}</span>
                            </div>
                          ) : null}
                        </td>

                      {/* Purpose */}
                      <td className="p-3 font-bold text-white max-w-[220px]">
                        <span className="line-clamp-2">{item.purpose}</span>
                      </td>

                      {/* Category */}
                      <td className="p-3 whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-bold border ${getCategoryBadgeClass(item.category)}`}>
                          {getCategoryIcon(item.category)}
                          <span>{item.category}</span>
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="p-3 font-mono font-black text-rose-400 text-sm whitespace-nowrap">
                        ৳ {item.amount.toLocaleString()} <span className="text-[10px] font-normal text-slate-500">{item.currency || 'BDT'}</span>
                      </td>

                      {/* Logged By */}
                      <td className="p-3 font-mono text-slate-400 whitespace-nowrap max-w-[150px] truncate">
                        {item.addedByEmail}
                      </td>

                      {/* Notes */}
                      <td className="p-3 text-slate-400 text-xs max-w-[200px]">
                        <span className="line-clamp-1">{item.notes || '-'}</span>
                      </td>

                      {/* Actions */}
                      <td className="p-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenEditModal(item)}
                            className="p-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg transition-all border border-slate-700 cursor-pointer"
                            title="Edit Record"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteExpense(item.id)}
                            className="p-1.5 bg-slate-800 hover:bg-rose-950 text-rose-400 rounded-lg transition-all border border-slate-700 cursor-pointer"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Add / Edit Expense Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-slate-900 border border-slate-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden text-left"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-5 py-4 bg-slate-950 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <Receipt className="w-5 h-5 text-rose-400" />
                  <h3 className="font-mono font-black text-white uppercase text-sm">
                    {editingExpense ? 'Edit Expense Record' : 'Add New Platform Expense'}
                  </h3>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Form */}
              <form onSubmit={handleSubmitExpense} className="p-5 space-y-4">
                {statusMsg && (
                  <div className={`p-3 rounded-xl border text-xs font-mono flex items-center gap-2 ${
                    statusMsg.type === 'error' ? 'bg-rose-950/80 border-rose-800 text-rose-300' : 'bg-emerald-950/80 border-emerald-800 text-emerald-300'
                  }`}>
                    {statusMsg.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <CheckCircle2 className="w-4 h-4 shrink-0" />}
                    <span>{statusMsg.text}</span>
                  </div>
                )}

                {/* Purpose / Title */}
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                    Purpose / Expense Title <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formPurpose}
                    onChange={(e) => setFormPurpose(e.target.value)}
                    placeholder="e.g. Facebook Marketing Ads August 2026"
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-rose-500 font-sans"
                  />
                </div>

                {/* Amount & Currency */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2">
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                      Expense Amount <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      min="1"
                      step="any"
                      required
                      value={formAmount}
                      onChange={(e) => setFormAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-rose-500 font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                      Currency
                    </label>
                    <select
                      value={formCurrency}
                      onChange={(e) => setFormCurrency(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-rose-500 font-mono font-bold"
                    >
                      <option value="BDT">BDT (৳)</option>
                      <option value="USD">USD ($)</option>
                      <option value="Tokens">Tokens (🪙)</option>
                    </select>
                  </div>
                </div>

                {/* Category, Date & Time */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                      Category
                    </label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value as any)}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-rose-500 font-mono"
                    >
                      <option value="Marketing & Ads">Marketing & Ads</option>
                      <option value="Server & Infrastructure">Server & Infrastructure</option>
                      <option value="Tournaments & Prizes">Tournaments & Prizes</option>
                      <option value="Operations & Salaries">Operations & Salaries</option>
                      <option value="Miscellaneous">Miscellaneous</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                      Date <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="date"
                      required
                      value={formDate}
                      onChange={(e) => setFormDate(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                      Time <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="time"
                      required
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-rose-500 font-mono"
                    />
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-xs font-mono font-bold text-slate-300 mb-1">
                    Notes / Receipt Details (Optional)
                  </label>
                  <textarea
                    rows={3}
                    value={formNotes}
                    onChange={(e) => setFormNotes(e.target.value)}
                    placeholder="Add invoice reference, transaction transaction ID, or detailed breakdown..."
                    className="w-full bg-slate-950 border border-slate-800 text-white px-3 py-2 rounded-xl text-xs focus:outline-none focus:border-rose-500 font-sans resize-none"
                  />
                </div>

                {/* Submit Actions */}
                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="flex items-center gap-2 px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-lg shadow-rose-900/30 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    <span>{editingExpense ? 'Update Expense' : 'Save Expense'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
