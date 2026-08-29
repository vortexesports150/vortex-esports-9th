import React, { useState, useEffect } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  Megaphone, 
  MessageCircle, 
  Save, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  ExternalLink, 
  Sparkles, 
  Phone, 
  Globe, 
  Trash2,
  Eye,
  RefreshCw,
  X
} from 'lucide-react';
import { ProfileHeadlineBar, ProfileHeadlineData, formatWhatsAppUrl } from './ProfileHeadlineBar';

interface HeadlineNewsManagerProps {
  onClose?: () => void;
  currentUserEmail?: string | null;
}

const PRESET_TEMPLATES = [
  {
    title: 'Server Maintenance',
    tag: 'MAINTENANCE',
    text: '⚙️ Notice: System maintenance is scheduled tonight from 02:00 AM to 04:00 AM. In-game matches will remain active.',
    prefill: 'Hello PlayVear Team, I have a question regarding the server maintenance:'
  },
  {
    title: 'Tournament Support',
    tag: 'HEADLINE',
    text: '🏆 Pro Tournament slot booking is now live! If you face any room/slot issues, contact our support team immediately.',
    prefill: 'Hello PlayVear Team, I need help with tournament slot registration:'
  },
  {
    title: 'Urgent Issue / Alert',
    tag: 'URGENT',
    text: '⚠️ Alert: Free Fire ID verification delay. If your points are not updated within 15 minutes, ping us on WhatsApp.',
    prefill: 'Hello PlayVear Support, my match points were not updated. My details are:'
  },
  {
    title: 'General Announcement',
    tag: 'ANNOUNCEMENT',
    text: '📢 Welcome to PlayVear Esports! Enjoy high-speed matches, fast token withdrawals, and round-the-clock admin support.',
    prefill: 'Hello PlayVear Team, I would like to get more information about:'
  }
];

export const HeadlineNewsManager: React.FC<HeadlineNewsManagerProps> = ({ 
  onClose,
  currentUserEmail 
}) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [enabled, setEnabled] = useState(true);
  const [badgeLabel, setBadgeLabel] = useState('HEADLINE');
  const [headlineText, setHeadlineText] = useState('');
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [whatsappPrefillText, setWhatsappPrefillText] = useState('Hello PlayVear Team, I am contacting you regarding:');

  // Load existing headline config from Firestore
  useEffect(() => {
    const fetchConfig = async () => {
      setLoading(true);
      setError(null);
      try {
        const snap = await getDoc(doc(db, 'system_config', 'profile_headline'));
        if (snap.exists()) {
          const data = snap.data() as ProfileHeadlineData;
          setEnabled(data.enabled ?? true);
          setBadgeLabel(data.badgeLabel || 'HEADLINE');
          setHeadlineText(data.headlineText || '');
          setWhatsappNumber(data.whatsappNumber || '');
          setWhatsappPrefillText(data.whatsappPrefillText || 'Hello PlayVear Team, I am contacting you regarding:');
        } else {
          // Default initial state
          setEnabled(false);
          setBadgeLabel('HEADLINE');
          setHeadlineText('');
          setWhatsappNumber('+8801700000000');
        }
      } catch (err: any) {
        console.error('[HeadlineNewsManager] Error fetching config:', err);
        setError('Failed to load existing headline settings.');
      } finally {
        setLoading(false);
      }
    };

    fetchConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSaveSuccess(false);

    try {
      const dataToSave: ProfileHeadlineData = {
        enabled,
        badgeLabel: badgeLabel.trim() || 'HEADLINE',
        headlineText: headlineText.trim(),
        whatsappNumber: whatsappNumber.trim(),
        whatsappPrefillText: whatsappPrefillText.trim(),
        updatedAt: new Date().toISOString(),
        updatedBy: currentUserEmail || 'Admin'
      };

      await setDoc(doc(db, 'system_config', 'profile_headline'), {
        ...dataToSave,
        serverUpdatedAt: serverTimestamp()
      }, { merge: true });

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3500);
    } catch (err: any) {
      console.error('[HeadlineNewsManager] Error saving headline:', err);
      setError(err?.message || 'Failed to save headline configuration.');
    } finally {
      setSaving(false);
    }
  };

  const handleApplyPreset = (template: typeof PRESET_TEMPLATES[0]) => {
    setBadgeLabel(template.tag);
    setHeadlineText(template.text);
    if (template.prefill) {
      setWhatsappPrefillText(template.prefill);
    }
    setEnabled(true);
  };

  const previewData: ProfileHeadlineData = {
    enabled,
    badgeLabel: badgeLabel || 'HEADLINE',
    headlineText: headlineText || 'This is how your headline news announcement will appear on the profile screen.',
    whatsappNumber: whatsappNumber || '+8801700000000',
    whatsappPrefillText: whatsappPrefillText || 'Hello PlayVear Support:'
  };

  const testWaUrl = whatsappNumber ? formatWhatsAppUrl(whatsappNumber, whatsappPrefillText) : '';

  return (
    <div className="w-full bg-[#060918] border border-cyan-500/20 rounded-2xl p-4 sm:p-6 shadow-2xl space-y-6 text-left relative overflow-hidden">
      {/* Top Cyber Accents */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-cyan-500 via-blue-600 to-cyan-400" />

      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-white/10 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.2)]">
            <Megaphone className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-black text-white uppercase tracking-wider flex items-center gap-2">
              Profile Headlines News
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-mono">
                Real-time
              </span>
            </h2>
            <p className="text-xs text-slate-400 font-medium">
              Post urgent notices, updates, or issues below the profile header with an instant WhatsApp contact link.
            </p>
          </div>
        </div>

        {onClose && (
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center gap-3 text-cyan-400">
          <Loader2 className="w-8 h-8 animate-spin" />
          <span className="text-xs font-mono font-bold tracking-widest uppercase">Loading Headline Settings...</span>
        </div>
      ) : (
        <div className="space-y-6">

          {/* Quick Presets / Templates */}
          <div>
            <label className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5 mb-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              Quick Templates / Presets:
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
              {PRESET_TEMPLATES.map((tmpl, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleApplyPreset(tmpl)}
                  className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-cyan-950/40 border border-white/5 hover:border-cyan-500/40 transition-all text-left group cursor-pointer"
                >
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-200 group-hover:text-cyan-300">
                    <span>{tmpl.title}</span>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                      {tmpl.tag}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Settings Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* Status Toggle */}
            <div className="bg-slate-900/80 border border-white/5 p-4 rounded-xl flex flex-col justify-between">
              <div>
                <label className="text-xs font-bold text-slate-200 block mb-1">
                  Headline Visibility
                </label>
                <p className="text-[11px] text-slate-400 leading-snug">
                  Toggle whether the solid headline line is shown on the profile screen.
                </p>
              </div>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => setEnabled(prev => !prev)}
                  className={`w-full py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer ${
                    enabled
                      ? 'bg-emerald-600 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)] border border-emerald-400'
                      : 'bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-700'
                  }`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${enabled ? 'bg-white animate-pulse' : 'bg-slate-500'}`} />
                  {enabled ? 'Active (Visible on Profile)' : 'Disabled (Hidden)'}
                </button>
              </div>
            </div>

            {/* Badge Tag */}
            <div className="bg-slate-900/80 border border-white/5 p-4 rounded-xl space-y-2">
              <label className="text-xs font-bold text-slate-200 block">
                Badge / Tag Label
              </label>
              <input
                type="text"
                value={badgeLabel}
                onChange={(e) => setBadgeLabel(e.target.value.toUpperCase())}
                placeholder="e.g. HEADLINE, NOTICE, URGENT"
                maxLength={20}
                className="w-full bg-slate-950 border border-cyan-500/30 rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 font-bold focus:outline-none focus:border-cyan-400"
              />
              <p className="text-[10px] text-slate-400">
                Pill label displayed on the left of the solid line.
              </p>
            </div>

            {/* WhatsApp Phone Number (Any Country Supported) */}
            <div className="bg-slate-900/80 border border-white/5 p-4 rounded-xl space-y-2">
              <label className="text-xs font-bold text-slate-200 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-400" />
                  WhatsApp Number
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Any Country</span>
              </label>
              <input
                type="text"
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value)}
                placeholder="+880 1712-345678 or +91 9876543210"
                className="w-full bg-slate-950 border border-emerald-500/30 rounded-xl px-3 py-2 text-xs font-mono text-emerald-300 font-bold focus:outline-none focus:border-emerald-400"
              />
              <p className="text-[10px] text-slate-400">
                Include country code (e.g. +880 for BD, +91 for India, +1 for USA).
              </p>
            </div>

          </div>

          {/* Headline Announcement Message Textarea */}
          <div className="bg-slate-900/80 border border-white/5 p-4 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-cyan-400" />
                Headline Announcement / Issue Text
              </label>
              <span className="text-[10px] text-slate-400 font-mono">
                {headlineText.length} characters
              </span>
            </div>
            <textarea
              rows={3}
              value={headlineText}
              onChange={(e) => setHeadlineText(e.target.value)}
              placeholder="Write the headline text, maintenance notice, or issue message here..."
              className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-sans leading-relaxed"
            />
          </div>

          {/* WhatsApp Pre-filled message */}
          <div className="bg-slate-900/80 border border-white/5 p-4 rounded-xl space-y-2">
            <label className="text-xs font-bold text-slate-200 flex items-center gap-2">
              <MessageCircle className="w-4 h-4 text-emerald-400" />
              WhatsApp Pre-filled Starter Message (Optional)
            </label>
            <input
              type="text"
              value={whatsappPrefillText}
              onChange={(e) => setWhatsappPrefillText(e.target.value)}
              placeholder="e.g. Hello PlayVear Team, I need assistance regarding the announcement:"
              className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-400"
            />
            <p className="text-[10px] text-slate-400">
              When users tap the WhatsApp number, this text will automatically be typed into their chat box.
            </p>
          </div>

          {/* Live Preview Box */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-cyan-400" />
                Live Profile Screen Preview:
              </span>
              {testWaUrl && (
                <a
                  href={testWaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[10px] font-mono font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 hover:underline"
                >
                  <ExternalLink className="w-3 h-3" /> Test WhatsApp Link
                </a>
              )}
            </div>

            <div className="border border-cyan-500/30 rounded-xl overflow-hidden bg-[#04060e] p-2 shadow-inner">
              <div className="text-[10px] text-slate-500 font-mono px-2 py-1 flex items-center justify-between border-b border-white/5 mb-2">
                <span>Header area (Profile Screen)</span>
                <span>{enabled ? 'Status: VISIBLE' : 'Status: HIDDEN'}</span>
              </div>
              <ProfileHeadlineBar previewData={previewData} />
            </div>
          </div>

          {/* Feedback messages */}
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {saveSuccess && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-300 text-xs flex items-center gap-2 font-semibold">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Headline successfully updated & broadcasted in real-time across all profiles!</span>
            </div>
          )}

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setHeadlineText('');
                setWhatsappNumber('');
                setEnabled(false);
              }}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              Clear / Reset
            </button>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                type="button"
                disabled={saving}
                onClick={handleSave}
                className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-[0_0_20px_rgba(6,182,212,0.4)] active:scale-95 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {saving ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Saving to Firebase...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>Save & Broadcast Headline</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </div>
      )}
    </div>
  );
};
