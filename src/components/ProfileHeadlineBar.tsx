import React, { useEffect, useState } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MessageCircle, Megaphone, Sparkles, ExternalLink, Check, Copy } from 'lucide-react';

export interface ProfileHeadlineData {
  enabled: boolean;
  headlineText: string;
  whatsappNumber?: string;
  whatsappPrefillText?: string;
  badgeLabel?: string;
  updatedAt?: string;
  updatedBy?: string;
}

interface ProfileHeadlineBarProps {
  previewData?: ProfileHeadlineData;
  className?: string;
}

/**
 * Normalizes phone numbers from any country into wa.me format (digits only).
 * e.g., "+880 1712-345678" -> "8801712345678"
 * e.g., "01712345678" (BD local) -> "8801712345678"
 */
export function formatWhatsAppUrl(phoneNumber: string, prefillText?: string): string {
  if (!phoneNumber) return '';
  // Remove all spaces, dashes, brackets, and plus signs
  let clean = phoneNumber.replace(/[^0-9]/g, '');
  
  // Handle local Bangladesh 01XXXXXXXXX if someone entered without country code
  if (clean.startsWith('01') && clean.length === 11) {
    clean = '88' + clean;
  }
  
  const textQuery = prefillText ? `?text=${encodeURIComponent(prefillText)}` : '';
  return `https://wa.me/${clean}${textQuery}`;
}

export const ProfileHeadlineBar: React.FC<ProfileHeadlineBarProps> = ({ previewData, className = '' }) => {
  const [headline, setHeadline] = useState<ProfileHeadlineData | null>(previewData || null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (previewData) {
      setHeadline(previewData);
      return;
    }

    try {
      const unsub = onSnapshot(
        doc(db, 'system_config', 'profile_headline'),
        (snapshot) => {
          if (snapshot.exists()) {
            setHeadline(snapshot.data() as ProfileHeadlineData);
          } else {
            setHeadline(null);
          }
        },
        (err) => {
          console.warn('[ProfileHeadlineBar] Snapshot listener error:', err);
        }
      );
      return () => unsub();
    } catch (e) {
      console.warn('[ProfileHeadlineBar] Failed to attach listener:', e);
    }
  }, [previewData]);

  // If previewData updates
  useEffect(() => {
    if (previewData) {
      setHeadline(previewData);
    }
  }, [previewData]);

  // Don't render if not enabled or empty headline
  if (!headline || !headline.enabled || !headline.headlineText?.trim()) {
    return null;
  }

  const rawPhone = headline.whatsappNumber?.trim() || '';
  const waUrl = rawPhone ? formatWhatsAppUrl(rawPhone, headline.whatsappPrefillText || 'Hello PlayVear Team, I need help regarding:') : '';
  const badge = headline.badgeLabel?.trim() || 'HEADLINE';

  const handleWhatsAppClick = (e: React.MouseEvent) => {
    if (!waUrl) return;
    
    // Copy number to clipboard as a helpful fallback
    if (rawPhone) {
      try {
        navigator.clipboard.writeText(rawPhone);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      } catch {
        // clipboard write fallback
      }
    }
  };

  return (
    <div 
      className={`w-full bg-[#060918] border-b-2 border-cyan-500/40 relative shadow-[0_4px_20px_rgba(6,182,212,0.12)] z-10 ${className}`}
    >
      {/* Top micro glowing accent line */}
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-80" />

      <div className="w-full max-w-7xl mx-auto px-3 sm:px-4 py-2 sm:py-2.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
        
        {/* Left Side: Solid Badge + Headline Text */}
        <div className="flex items-center gap-2.5 flex-1 min-w-0 pr-1">
          {/* Solid Notice/Headline Badge */}
          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-gradient-to-r from-cyan-500/25 to-blue-600/25 border border-cyan-400/40 text-cyan-300 font-mono text-[10px] font-black tracking-wider uppercase shrink-0 shadow-[0_0_10px_rgba(6,182,212,0.25)]">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500 shadow-[0_0_6px_rgba(6,182,212,0.9)]"></span>
            </span>
            <Megaphone className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>{badge}</span>
          </div>

          {/* Headline Announcement Message */}
          <div className="text-slate-100 font-semibold text-[11px] sm:text-xs leading-snug tracking-wide break-words">
            {headline.headlineText}
          </div>
        </div>

        {/* Right Side: Distinctive Clickable WhatsApp Direct Action */}
        {rawPhone && waUrl && (
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <a
              href={waUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleWhatsAppClick}
              title={`Click to chat on WhatsApp: ${rawPhone}`}
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-400/50 hover:border-emerald-300 text-emerald-300 hover:text-emerald-100 text-[11px] font-bold transition-all shadow-[0_0_12px_rgba(16,185,129,0.25)] active:scale-95 group cursor-pointer"
            >
              <div className="w-5 h-5 rounded-full bg-emerald-500/30 flex items-center justify-center border border-emerald-400/40 group-hover:scale-110 transition-transform">
                <MessageCircle className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-mono font-extrabold leading-none">
                  WhatsApp Us
                </span>
                <span className="text-[11px] text-white font-mono font-black tracking-tight leading-tight flex items-center gap-1">
                  {rawPhone}
                  <ExternalLink className="w-2.5 h-2.5 text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </a>

            {/* Quick Copy Confirmation Feedback */}
            {copied && (
              <span className="text-[10px] text-emerald-400 font-mono font-bold animate-in fade-in duration-150 flex items-center gap-1">
                <Check className="w-3 h-3" /> Copied!
              </span>
            )}
          </div>
        )}
      </div>

      {/* Bottom solid cyan glow strip */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-cyan-500 to-transparent opacity-90" />
    </div>
  );
};
