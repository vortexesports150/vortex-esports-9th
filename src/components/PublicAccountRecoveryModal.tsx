import React, { useState } from 'react';
import { 
  KeyRound, X, Send, Phone, Mail, Gamepad2, AlertCircle, 
  CheckCircle2, ShieldAlert, Sparkles, HelpCircle, MessageSquare, RefreshCw, User
} from 'lucide-react';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { COUNTRIES, getCountryByCodeOrName } from '../lib/countries';

interface PublicAccountRecoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PublicAccountRecoveryModal: React.FC<PublicAccountRecoveryModalProps> = ({
  isOpen,
  onClose
}) => {
  const [country, setCountry] = useState('Bangladesh');
  const [playvearId, setPlayvearId] = useState('');
  const [registeredPhone, setRegisteredPhone] = useState('');
  const [gamingUid, setGamingUid] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [newGmail, setNewGmail] = useState('');
  const [contactWhatsApp, setContactWhatsApp] = useState('');
  const [problemDescription, setProblemDescription] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanPhone = registeredPhone.trim();
    const cleanNewEmail = newGmail.trim().toLowerCase();
    const cleanPlayvearId = playvearId.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanPhone) {
      setErrorMessage("⚠️ Please provide your registered mobile number.");
      return;
    }

    if (!cleanNewEmail || !emailRegex.test(cleanNewEmail)) {
      setErrorMessage("⚠️ Please enter a valid new Gmail address where you want to access your account.");
      return;
    }

    setIsSubmitting(true);

    try {
      const dialCode = getCountryByCodeOrName(country).dialCode;
      const fullRegisteredPhone = cleanPhone.startsWith('+') ? cleanPhone : `${dialCode}${cleanPhone}`;

      await addDoc(collection(db, 'admin_messages'), {
        senderId: 'guest_recovery_' + Date.now(),
        senderName: playerName.trim() || 'Player (Account Recovery)',
        senderEmail: cleanNewEmail,
        playvearId: cleanPlayvearId || 'Not Provided',
        registeredPhone: fullRegisteredPhone,
        rawPhone: cleanPhone,
        country: country,
        gamingUid: gamingUid.trim() || 'Not Provided',
        newGmail: cleanNewEmail,
        contactWhatsApp: contactWhatsApp.trim() || fullRegisteredPhone,
        type: 'account_recovery',
        subject: `Account Recovery: ${playerName.trim() || 'Player'}${cleanPlayvearId ? ` [PlayVear ID: #${cleanPlayvearId}]` : ''} (${cleanPhone})`,
        message: problemDescription.trim() || 'Player cannot log into their previous Gmail and requested to link new Gmail.',
        status: 'pending',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        replies: []
      });

      setSubmitSuccess(true);
    } catch (err: any) {
      console.error("Submit recovery request error:", err);
      setErrorMessage("Failed to submit recovery request: " + (err.message || "Network error. Please try again."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetAndClose = () => {
    setSubmitSuccess(false);
    setErrorMessage(null);
    setPlayvearId('');
    setRegisteredPhone('');
    setGamingUid('');
    setPlayerName('');
    setNewGmail('');
    setContactWhatsApp('');
    setProblemDescription('');
    onClose();
  };

  const countryInfo = getCountryByCodeOrName(country);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in text-left font-sans">
      <div className="relative w-full max-w-lg bg-slate-950 border border-cyan-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(6,182,212,0.15)] overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 right-0 h-40 w-40 bg-cyan-500/10 blur-3xl rounded-full pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10 relative z-10">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <KeyRound className="h-5 w-5 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-white uppercase tracking-wider">
                Player Account Recovery
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                Recover access with your registered mobile number and PlayVear ID
              </p>
            </div>
          </div>

          <button
            onClick={resetAndClose}
            className="h-8 w-8 rounded-full bg-slate-900 border border-white/10 hover:bg-slate-800 text-slate-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Modal Body */}
        {submitSuccess ? (
          <div className="py-8 text-center space-y-4 relative z-10">
            <div className="h-16 w-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto shadow-[0_0_20px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-1.5 max-w-sm mx-auto">
              <h4 className="text-base font-black text-white">Recovery Request Submitted!</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                Your request has been forwarded to the Vortex Support Admin team. An admin will verify your identity via phone call (<span className="text-cyan-400 font-mono font-bold">{registeredPhone}</span>){playvearId ? <> for PlayVear ID <span className="text-cyan-300 font-mono font-bold">#{playvearId}</span></> : ''} and assign your new Gmail.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-white/10 p-3.5 rounded-2xl text-[11px] text-slate-400 max-w-sm mx-auto font-mono text-left space-y-1">
              <p className="text-cyan-300 font-bold">⚡ What happens next?</p>
              <p>1. Admin verifies your ownership via phone call.</p>
              <p>2. Your account is linked to: <span className="text-white font-bold">{newGmail}</span>.</p>
              <p>3. You sign in with your new Google account & all tokens/rank are restored.</p>
            </div>

            <button
              onClick={resetAndClose}
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 px-6 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 transition-all cursor-pointer"
            >
              Done & Return to Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="py-4 space-y-3.5 relative z-10 max-h-[70vh] overflow-y-auto custom-scrollbar pr-1">
            
            <div className="bg-cyan-950/30 border border-cyan-500/20 p-3 rounded-2xl flex items-start gap-2.5 text-xs text-cyan-200">
              <HelpCircle className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed">
                Forgot or lost access to your login Gmail? Provide your <strong className="text-cyan-300">PlayVear ID (e.g. 1001)</strong>, registered mobile number, and new Gmail. Our support team will verify and reconnect your existing account & tokens.
              </p>
            </div>

            {/* PlayVear ID (Recommended for fast search) */}
            <div className="space-y-1 bg-cyan-950/20 border border-cyan-500/30 p-3 rounded-2xl">
              <div className="flex items-center justify-between">
                <label className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  PlayVear ID (Recommended)
                </label>
                <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  Fastest Recovery
                </span>
              </div>
              <input
                type="text"
                value={playvearId}
                onChange={(e) => setPlayvearId(e.target.value)}
                placeholder="e.g. 1001, 1002 (Found on your profile or match card)"
                className="w-full bg-slate-900 border border-cyan-500/40 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-500 font-mono font-bold focus:outline-none focus:border-cyan-400"
              />
              <span className="text-[9.5px] text-slate-400 font-mono block leading-snug">
                Entering your numeric PlayVear ID helps admins immediately identify and recover your exact account.
              </span>
            </div>

            {/* Country Selector */}
            <div className="space-y-1">
              <label className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-slate-300 block">
                Country
              </label>
              <select
                value={country}
                onChange={(e) => setCountry(e.target.value)}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
              >
                {COUNTRIES.map(c => (
                  <option key={c.code} value={c.name}>
                    {c.flag} {c.name} ({c.dialCode})
                  </option>
                ))}
              </select>
            </div>

            {/* Registered Mobile */}
            <div className="space-y-1">
              <label className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-cyan-400 block">
                Registered Mobile Number *
              </label>
              <div className="relative flex items-center">
                <span className="absolute left-3 text-xs font-mono font-bold text-cyan-400 pointer-events-none">
                  {countryInfo.dialCode}
                </span>
                <input
                  type="tel"
                  required
                  value={registeredPhone}
                  onChange={(e) => {
                    let val = e.target.value;
                    if (val.startsWith(countryInfo.dialCode)) val = val.slice(countryInfo.dialCode.length);
                    setRegisteredPhone(val);
                  }}
                  placeholder="017XXXXXXXX"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl pl-14 pr-3 py-2 text-xs text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* FreeFire Name / Gaming UID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-400 block">
                  FreeFire Name / Player Name
                </label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="e.g. vortex_hero (FreeFire Name)"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-400 block">
                  FreeFire Gaming UID (if remembered)
                </label>
                <input
                  type="text"
                  value={gamingUid}
                  onChange={(e) => setGamingUid(e.target.value)}
                  placeholder="Enter FreeFire UID"
                  className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
            </div>

            {/* New Gmail Address to Link */}
            <div className="space-y-1">
              <label className="text-[10.5px] font-mono font-bold uppercase tracking-wider text-amber-400 block flex items-center gap-1">
                <Mail className="w-3 h-3 text-amber-400" />
                New Gmail to Link *
              </label>
              <input
                type="email"
                required
                value={newGmail}
                onChange={(e) => setNewGmail(e.target.value)}
                placeholder="your_new_email@gmail.com"
                className="w-full bg-slate-900 border border-amber-500/30 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-amber-400"
              />
              <span className="text-[9px] text-slate-500 font-mono block">
                After recovery, you will sign in with this Google account to access your existing account.
              </span>
            </div>

            {/* Contact WhatsApp / Alternative Phone */}
            <div className="space-y-1">
              <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-400 block">
                Alternative Contact / WhatsApp (Optional)
              </label>
              <input
                type="tel"
                value={contactWhatsApp}
                onChange={(e) => setContactWhatsApp(e.target.value)}
                placeholder="Alternative phone number for verification call"
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder:text-slate-600 font-mono focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Problem Description */}
            <div className="space-y-1">
              <label className="text-[10.5px] font-mono uppercase tracking-wider text-slate-400 block">
                Reason / Note
              </label>
              <textarea
                rows={2}
                value={problemDescription}
                onChange={(e) => setProblemDescription(e.target.value)}
                placeholder="Briefly describe what happened (e.g., lost Gmail access, bought new phone)..."
                className="w-full bg-slate-900 border border-white/10 rounded-xl p-2.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2 border-t border-white/10 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={resetAndClose}
                className="px-4 py-2 rounded-xl text-xs font-bold text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-800 transition-all cursor-pointer"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-gradient-to-r from-cyan-500 to-sky-500 hover:from-cyan-400 hover:to-sky-400 text-slate-950 px-5 py-2 rounded-xl font-black text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_15px_rgba(6,182,212,0.3)] active:scale-95 disabled:opacity-50 transition-all cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Submit Recovery Ticket</span>
                  </>
                )}
              </button>
            </div>

          </form>
        )}

      </div>
    </div>
  );
};
