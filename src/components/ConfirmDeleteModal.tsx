import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle, Trash2, X, Loader2 } from 'lucide-react';

interface ConfirmDeleteModalProps {
  isOpen: boolean;
  title: string;
  itemName?: string;
  description?: string;
  confirmText?: string;
  onClose: () => void;
  onConfirm: () => Promise<void> | void;
}

export function ConfirmDeleteModal({
  isOpen,
  title,
  itemName,
  description = "Are you sure you want to permanently delete this? This action cannot be undone and will erase all data associated with it.",
  confirmText = "Delete Permanently",
  onClose,
  onConfirm,
}: ConfirmDeleteModalProps) {
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
    } catch (err) {
      console.error("Error confirming deletion:", err);
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
          className="relative w-full max-w-md bg-slate-900 border border-rose-500/40 rounded-2xl p-5 sm:p-6 shadow-[0_0_40px_rgba(244,63,94,0.25)] text-left overflow-hidden z-10 space-y-4"
        >
          {/* Top Decorative Header */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-rose-950/80 border border-rose-500/50 flex items-center justify-center text-rose-400 shrink-0 shadow-[0_0_15px_rgba(244,63,94,0.3)]">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-sm font-black text-white uppercase font-mono tracking-wider">
                  {title}
                </h3>
                <p className="text-[10px] text-rose-400 font-mono font-semibold uppercase tracking-wider">
                  Permanent Action Warning
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
                <span className="text-[10px] font-mono text-slate-500 uppercase block mb-0.5">Item Selected:</span>
                <p className="text-xs font-bold text-rose-300 font-mono break-all">{itemName}</p>
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
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_rgba(225,29,72,0.4)] flex items-center justify-center gap-2 cursor-pointer border border-rose-400/50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <>
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>{confirmText}</span>
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
