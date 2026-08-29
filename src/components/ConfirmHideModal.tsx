import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, X, Loader2, ShieldAlert } from 'lucide-react';

interface ConfirmHideModalProps {
  isOpen: boolean;
  title?: string;
  itemName?: string;
  isHidden: boolean; // Current state: true if currently hidden, false if currently visible
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmHideModal({
  isOpen,
  title,
  itemName,
  isHidden,
  onClose,
  onConfirm,
}: ConfirmHideModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const willHide = !isHidden; // Toggling state
  const actionTitle = title || (willHide ? "Hide Match Confirmation" : "Unhide Match Confirmation");
  const description = willHide
    ? "Hiding this match will remove it from public player feeds. Only Admins and Hosts will be able to view and manage it."
    : "Unhiding this match will restore its visibility to all players in the public feeds.";

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
    } catch (err) {
      console.error("Error toggling hide status:", err);
    } finally {
      setLoading(false);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
        {/* Backdrop click to close */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={loading ? undefined : onClose}
          className="absolute inset-0"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          className="relative w-full max-w-md bg-slate-900 border border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-[0_0_40px_rgba(245,158,11,0.25)] text-left overflow-hidden z-10 space-y-4"
        >
          {/* Top Decorative Header */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-amber-950/80 border border-amber-500/50 flex items-center justify-center text-amber-400 shrink-0 shadow-[0_0_15px_rgba(245,158,11,0.3)]">
                {willHide ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase font-mono tracking-wider">
                  {actionTitle}
                </h3>
                <p className="text-[10px] text-amber-400 font-mono font-semibold uppercase tracking-wider">
                  Visibility Toggle
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              disabled={loading}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body Content */}
          <div className="space-y-2">
            {itemName && (
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] font-mono text-slate-500 uppercase block mb-0.5">Match Title:</span>
                <p className="text-xs font-bold text-amber-300 font-mono break-all">{itemName}</p>
              </div>
            )}

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              {description}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-xl text-xs font-black transition-all shadow-[0_0_15px_rgba(245,158,11,0.4)] flex items-center justify-center gap-2 cursor-pointer border border-amber-300/50 uppercase"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Updating...</span>
                </>
              ) : (
                <>
                  {willHide ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  <span>{willHide ? 'Yes, Hide Match' : 'Yes, Unhide Match'}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
