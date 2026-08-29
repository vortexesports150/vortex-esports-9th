import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Send, AlertCircle, Coins, User, Gift, Youtube } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { YoutubeGiveawayAdmin } from './YoutubeGiveawayAdmin';

interface SendTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminName: string;
}

export function SendTokensModal({ isOpen, onClose, adminName }: SendTokensModalProps) {
  const [activeTab, setActiveTab] = useState<'single' | 'giveaway'>('single');
  const [playvearId, setPlayvearId] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!playvearId || !amount) return;
    
    const numAmount = parseInt(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setErrorMsg('Please enter a valid positive amount');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const targetIdToFind = playvearId.trim();
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('playvearId', '==', targetIdToFind));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        throw new Error('No user found with this PlayVear ID');
      }

      const userDoc = querySnapshot.docs[0];
      const targetUserId = userDoc.id;
      const targetUserData = userDoc.data();

      // Run transactional update to ensure safety & consistency
      await runTransaction(db, async (transaction) => {
        // 1. Read System Wallets to check balance
        const systemWalletRef = doc(db, 'system', 'wallets');
        const systemWalletSnap = await transaction.get(systemWalletRef);
        
        let currentMainWalletBalance = 0;
        if (systemWalletSnap.exists()) {
          currentMainWalletBalance = systemWalletSnap.data().mainWallet || 0;
        }

        if (currentMainWalletBalance < numAmount) {
          throw new Error(`Insufficient tokens in Main Wallet! Available balance: 🪙${currentMainWalletBalance.toFixed(2)}`);
        }

        // 2. Read User document
        const userRef = doc(db, 'users', targetUserId);
        const userSnap = await transaction.get(userRef);
        const currentTokens = userSnap.exists() ? (userSnap.data().tokens || 0) : (targetUserData.tokens || 0);

        // 3. Deduct from Main Wallet
        transaction.update(systemWalletRef, {
          mainWallet: currentMainWalletBalance - numAmount
        });

        // 4. Add to target User tokens
        transaction.set(userRef, {
          tokens: currentTokens + numAmount,
          updatedAt: serverTimestamp()
        }, { merge: true });

        // 5. Record transaction in user history
        const userHistoryRef = doc(collection(db, 'users', targetUserId, 'tokenTransactions'));
        transaction.set(userHistoryRef, {
          amount: numAmount,
          type: 'income',
          description: `Tokens received from System Main Wallet`,
          date: new Date().toISOString(),
          createdAt: serverTimestamp()
        });

        // 6. Record deduction in System Wallets history
        const systemHistoryRef = doc(collection(db, 'system', 'wallets', 'history'));
        transaction.set(systemHistoryRef, {
          walletType: 'mainWallet',
          amountDeducted: numAmount,
          type: 'deduction',
          reason: `Tokens sent to User (PlayVear ID: ${targetIdToFind})`,
          playerId: targetUserId,
          playerEmail: targetUserData.email || 'playvear.contender@gmail.com',
          playerName: targetUserData.displayName || 'PlayVear Contender',
          createdAt: serverTimestamp()
        });
      });

      setSuccessMsg(`Successfully sent ${numAmount} tokens to ${targetUserData.displayName || targetIdToFind}`);
      setTimeout(() => {
        onClose();
        setPlayvearId('');
        setAmount('');
        setSuccessMsg('');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to send tokens');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={loading ? undefined : onClose}
          className="absolute inset-0 bg-black/80 backdrop-blur-sm"
        />

        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          className={`relative w-full ${activeTab === 'giveaway' ? 'max-w-2xl' : 'max-w-md'} bg-slate-900 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden flex flex-col transition-all duration-300 max-h-[90vh] overflow-y-auto`}
        >
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between sticky top-0 bg-slate-900 z-20">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-cyan-500/20 rounded-lg">
                <Send className="w-4 h-4 text-cyan-400" />
              </div>
              <h2 className="text-sm font-black text-white uppercase tracking-wider font-mono">Token Dispatch Center</h2>
            </div>
            {!loading && (
              <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white hover:bg-white/5 rounded-full transition-colors cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Mode Selector Tabs */}
          <div className="p-3 bg-slate-950/80 border-b border-slate-800 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'single'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Single Send</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('giveaway')}
              className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
                activeTab === 'giveaway'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Youtube className="w-3.5 h-3.5 text-red-400" />
              <span>YouTube Giveaway</span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="p-5">
            {activeTab === 'giveaway' ? (
              <YoutubeGiveawayAdmin 
                adminName={adminName} 
                adminEmail="admin@playvear.com"
                onSuccess={() => {
                  setTimeout(() => {
                    onClose();
                  }, 2500);
                }} 
              />
            ) : (
              <div>
                {errorMsg && (
                  <div className="mb-4 p-3 bg-red-950/50 border border-red-500/30 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-red-200">{errorMsg}</p>
                  </div>
                )}
                
                {successMsg && (
                  <div className="mb-4 p-3 bg-green-950/50 border border-green-500/30 rounded-xl flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-green-400 mt-0.5 shrink-0" />
                    <p className="text-xs text-green-200">{successMsg}</p>
                  </div>
                )}

                <form onSubmit={handleSend} className="space-y-4">
                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">PlayVear ID</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-4 w-4 text-slate-500" />
                      </div>
                      <input
                        type="text"
                        value={playvearId}
                        onChange={(e) => setPlayvearId(e.target.value)}
                        placeholder="e.g. 4001"
                        required
                        disabled={loading}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5 text-left">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Amount (Tokens)</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Coins className="h-4 w-4 text-amber-400" />
                      </div>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="Enter amount"
                        min="1"
                        required
                        disabled={loading}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={loading || !playvearId || !amount}
                    className="w-full py-3 mt-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black uppercase tracking-widest text-xs rounded-xl transition-all flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer shadow-lg shadow-cyan-900/20"
                  >
                    {loading ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <Send className="w-4 h-4" />
                        <span>Send Tokens</span>
                      </>
                    )}
                  </button>
                </form>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
