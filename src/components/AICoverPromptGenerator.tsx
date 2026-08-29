import React, { useState } from 'react';
import { Sparkles, Copy, Check, Wand2, Info, Lock } from 'lucide-react';

interface AICoverPromptGeneratorProps {
  squadName?: string;
  initialSquadName?: string;
}

const CROP_LEVELS = [
  { value: 'Chest / Bust Level', label: 'বুক পর্যন্ত ছবি' },
  { value: 'Below Bust Level (Mid-Torso)', label: 'বুকের নিচে / পেট পর্যন্ত' },
  { value: 'Waist Level', label: 'কোমর পর্যন্ত ছবি' }
];

const JERSEY_COLORS = [
  { value: 'Cyan & Silver White', label: 'সায়ান ও রুপালি সাদা' },
  { value: 'Neon Blue', label: 'নিয়ন নীল' },
  { value: 'Crimson Red & Black', label: 'গাঢ় লাল ও কালো' },
  { value: 'Gold & Obsidian', label: 'সোনালী হলুদ ও ঘন কালো' },
  { value: 'Midnight Purple & Neon', label: 'মিডনাইট বেগুনি ও নিয়ন' },
  { value: 'Electric Green', label: 'ইলেকট্রিক সবুজ' },
  { value: 'Dark Carbon & Cyan', label: 'ডার্ক কার্বন ও সায়ান' },
  { value: 'Vortex Sky Blue', label: 'ভোরটেক্স স্কাই ব্লু' }
];

const TEAM_STYLES = [
  { value: 'Cyberpunk Esports', label: 'সাইবারপাঙ্ক এস্পোর্টস লুক' },
  { value: 'Aggressive Competitive Stance', label: 'আগ্রাসী কম্পিটিটিভ লুক' },
  { value: 'Futuristic Sci-Fi Elite', label: 'ফিউচারিস্টিক সাই-ফাই প্রফেশনাল' },
  { value: 'Minimalist Professional', label: 'সিম্পল ও ক্লিন প্রফেশনাল' },
  { value: 'Dark Tactical Warfare', label: 'ডার্ক ট্যাকটিক্যাল ওয়ারফেয়ার' }
];

const JERSEY_PATTERNS = [
  { value: 'Geometric Hexagon', label: 'জিওমেট্রিক হেক্সাগন ডিজাইন' },
  { value: 'Vortex Cyber Lines', label: 'ভোরটেক্স সাইবার লাইন্স' },
  { value: 'Flame Energy Waves', label: 'ফ্লেম ও এনার্জি ওয়েভ' },
  { value: 'Tech Grid Stripes', label: 'টেক গ্রিড স্ট্রাইপস' },
  { value: 'Diamond Armor Mesh', label: 'ডায়মন্ড আর্মার মেশ' }
];

const POSE_STYLES = [
  { value: 'Heroic Cross-Armed Stance', label: 'হাত ক্রস করে বীরের মত দাঁড়ানো' },
  { value: 'Aggressive Esports Frontline', label: 'আগ্রাসী ফ্রন্টলাইন পোজ' },
  { value: 'Victory V-Pose Lineup', label: 'ভিক্টরি V-লাইনআপ পোজ' },
  { value: 'Tactical Squad Stance', label: 'ট্যাকটিক্যাল স্কোয়াড পোজ' },
  { value: 'Focused Battle Ready', label: 'যুদ্ধের জন্য প্রস্তুত পোজ' }
];

const BACKGROUND_THEMES = [
  { value: 'High-Tech Esports Stadium Arena', label: 'হাই-টেক এস্পোর্টস স্টেডিয়াম অ্যারেনা' },
  { value: 'Neon Cyberpunk City Skyline', label: 'নিয়ন সাইবারপাঙ্ক সিটির রাতের দৃশ্য' },
  { value: 'Glowing Holographic Grid Stage', label: 'ঝলমলে হোলোগ্রাফিক গ্রিড স্টেজ' },
  { value: 'Smoky Dark Battleground', label: 'ধোঁয়াশাচ্ছন্ন ডার্ক ব্যাটেলগ্রাউন্ড' },
  { value: 'Vortex Energy Core', label: 'ভোরটেক্স এনার্জি কোর লাইটিং' }
];

export function AICoverPromptGenerator({ squadName, initialSquadName = '' }: AICoverPromptGeneratorProps) {
  const currentSquadName = squadName !== undefined ? squadName : initialSquadName;
  const [cropLevel, setCropLevel] = useState(CROP_LEVELS[0].value);
  const [jerseyColor, setJerseyColor] = useState(JERSEY_COLORS[0].value);
  const [teamStyle, setTeamStyle] = useState(TEAM_STYLES[0].value);
  const [jerseyPattern, setJerseyPattern] = useState(JERSEY_PATTERNS[0].value);
  const [poseStyle, setPoseStyle] = useState(POSE_STYLES[0].value);
  const [backgroundTheme, setBackgroundTheme] = useState(BACKGROUND_THEMES[0].value);

  const [generatedPrompt, setGeneratedPrompt] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleGeneratePrompt = () => {
    const rawName = currentSquadName.trim() || 'VORTEX SQUAD';
    const nameText = `"${rawName}"`;

    let cropPromptText = 'auto-crop to chest-level portraits';
    if (cropLevel === 'Below Bust Level (Mid-Torso)') {
      cropPromptText = 'auto-crop to mid-torso level portraits (slightly below chest level)';
    } else if (cropLevel === 'Waist Level') {
      cropPromptText = 'auto-crop to waist-level half-body portraits showing down to the waist';
    }

    const prompt = `Create a premium Free Fire esports squad cover photo in a strict 16:9 widescreen aspect ratio (--ar 16:9). MANDATORY TEXT REQUIREMENT: You MUST clearly render the EXACT squad name text ${nameText} at the top center of the artwork in large, bold 3D glowing metallic esports typography. Do NOT omit or forget to include the text ${nameText}! The text ${nameText} MUST be 100% visible, centered, and legible as the main team title. Details: Use the 4 uploaded player photos, keep real faces and features recognizable, ${cropPromptText} if full-body photos are uploaded, give each player a modern, confident esports hairstyle, matching professional esports jerseys with Jersey Primary Color: ${jerseyColor}, Team Style: ${teamStyle}, Jersey Pattern: ${jerseyPattern}, Pose Style: ${poseStyle} and Neon Cyan accents. Background Theme: ${backgroundTheme}. Ultra-HD 8K quality, no watermarks, no extra text other than ${nameText}.`;

    setGeneratedPrompt(prompt);
    setCopied(false);
  };

  const handleCopy = () => {
    if (!generatedPrompt) return;
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="w-full -mx-3.5 sm:-mx-5 md:mx-0 px-3.5 sm:px-5 py-4 bg-[#04060e]/95 border-y md:border border-cyan-500/40 md:rounded-xl space-y-3.5 shadow-[0_0_20px_rgba(6,182,212,0.15)] text-left">
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400 border border-cyan-500/40">
            <Wand2 className="w-4 h-4 animate-pulse" />
          </div>
          <div>
            <h5 className="text-xs font-black uppercase tracking-wider text-cyan-300 flex items-center gap-1.5">
              AI Cover Prompt Generator
            </h5>
            <p className="text-[8px] text-slate-400 font-mono">
              Generate custom AI prompts for Midjourney / ChatGPT to create squad cover art
            </p>
          </div>
        </div>
        <span className="text-[7.5px] font-mono font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
          PRO TOOL
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
        {/* Squad Name input (Auto-synced & Read-only) */}
        <div className="space-y-1 sm:col-span-2">
          <div className="flex items-center justify-between">
            <label className="text-[12px] font-bold uppercase tracking-wider text-cyan-300 flex items-center gap-1">
              <span>স্কোয়াডের নাম</span>
              <span className="text-[7.5px] text-cyan-400 font-sans font-normal">(Auto-synced)</span>
            </label>
            <span className="text-[7.5px] font-mono text-cyan-400/90 flex items-center gap-1 bg-cyan-500/10 px-1.5 py-0.5 rounded border border-cyan-500/20">
              <Lock className="w-2.5 h-2.5 text-cyan-400" /> Auto-Filled
            </span>
          </div>
          <input
            type="text"
            value={currentSquadName}
            readOnly
            disabled
            placeholder="Type Squad Name above..."
            className="w-full bg-slate-900/90 border border-cyan-500/30 rounded-lg px-3 py-1.5 text-[8px] text-cyan-300 font-bold focus:outline-none cursor-not-allowed opacity-90 shadow-inner select-none"
          />
        </div>

        {/* Photo Crop Level */}
        <div className="space-y-1 sm:col-span-2">
          <label className="text-[12px] font-bold uppercase tracking-wider text-slate-200 flex items-center justify-between">
            <span>ছবি কতটুকু কাট হবে / ক্রপ সাইজ</span>
          </label>
          <select
            value={cropLevel}
            onChange={(e) => setCropLevel(e.target.value)}
            className="w-full bg-slate-950/90 border border-cyan-500/40 rounded-lg px-2.5 py-1.5 text-[8px] text-cyan-200 font-semibold focus:outline-none focus:border-cyan-400 cursor-pointer"
          >
            {CROP_LEVELS.map(cl => (
              <option key={cl.value} value={cl.value} className="bg-slate-900 text-white text-[12px]">{cl.label}</option>
            ))}
          </select>
        </div>

        {/* Jersey Color */}
        <div className="space-y-1">
          <label className="text-[12px] font-bold uppercase tracking-wider text-slate-200 block">
            জার্সির কালার / রঙ
          </label>
          <select
            value={jerseyColor}
            onChange={(e) => setJerseyColor(e.target.value)}
            className="w-full bg-slate-950/90 border border-white/10 rounded-lg px-2.5 py-1.5 text-[8px] text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {JERSEY_COLORS.map(c => (
              <option key={c.value} value={c.value} className="bg-slate-900 text-white text-[12px]">{c.label}</option>
            ))}
          </select>
        </div>

        {/* Team Style */}
        <div className="space-y-1">
          <label className="text-[12px] font-bold uppercase tracking-wider text-slate-200 block">
            টিমের আউটফিট ও স্টাইল
          </label>
          <select
            value={teamStyle}
            onChange={(e) => setTeamStyle(e.target.value)}
            className="w-full bg-slate-950/90 border border-white/10 rounded-lg px-2.5 py-1.5 text-[8px] text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {TEAM_STYLES.map(s => (
              <option key={s.value} value={s.value} className="bg-slate-900 text-white text-[12px]">{s.label}</option>
            ))}
          </select>
        </div>

        {/* Jersey Pattern */}
        <div className="space-y-1">
          <label className="text-[12px] font-bold uppercase tracking-wider text-slate-200 block">
            জার্সির ডিজাইন ও টেক্সচার
          </label>
          <select
            value={jerseyPattern}
            onChange={(e) => setJerseyPattern(e.target.value)}
            className="w-full bg-slate-950/90 border border-white/10 rounded-lg px-2.5 py-1.5 text-[8px] text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {JERSEY_PATTERNS.map(p => (
              <option key={p.value} value={p.value} className="bg-slate-900 text-white text-[12px]">{p.label}</option>
            ))}
          </select>
        </div>

        {/* Pose Style */}
        <div className="space-y-1">
          <label className="text-[12px] font-bold uppercase tracking-wider text-slate-200 block">
            প্লেয়ারদের দাঁড়ানোর পোজ
          </label>
          <select
            value={poseStyle}
            onChange={(e) => setPoseStyle(e.target.value)}
            className="w-full bg-slate-950/90 border border-white/10 rounded-lg px-2.5 py-1.5 text-[8px] text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {POSE_STYLES.map(p => (
              <option key={p.value} value={p.value} className="bg-slate-900 text-white text-[12px]">{p.label}</option>
            ))}
          </select>
        </div>

        {/* Background Theme */}
        <div className="space-y-1 sm:col-span-2">
          <label className="text-[12px] font-bold uppercase tracking-wider text-slate-200 block">
            স্টেডিয়াম বা ব্যাকগ্রাউন্ড থিম
          </label>
          <select
            value={backgroundTheme}
            onChange={(e) => setBackgroundTheme(e.target.value)}
            className="w-full bg-slate-950/90 border border-white/10 rounded-lg px-2.5 py-1.5 text-[8px] text-slate-100 focus:outline-none focus:border-cyan-500 cursor-pointer"
          >
            {BACKGROUND_THEMES.map(b => (
              <option key={b.value} value={b.value} className="bg-slate-900 text-white text-[12px]">{b.label}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        type="button"
        onClick={handleGeneratePrompt}
        className="w-full py-2 px-4 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-black text-xs uppercase tracking-wider rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.4)] transition flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
      >
        <Sparkles className="w-4 h-4 text-cyan-200" />
        Generate Prompt
      </button>

      {generatedPrompt && (
        <div className="space-y-2 pt-2 border-t border-white/10 animate-fadeIn">
          <div className="flex items-center justify-between">
            <span className="text-[8.5px] font-mono uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-1">
              <Check className="w-3 h-3 text-emerald-400" /> Generated Prompt Ready:
            </span>
            <button
              type="button"
              onClick={handleCopy}
              className="px-2.5 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 rounded text-[9px] font-bold flex items-center gap-1 transition cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3 h-3 text-emerald-400" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3 h-3 text-cyan-400" />
                  <span>Copy Prompt</span>
                </>
              )}
            </button>
          </div>

          <div className="p-2.5 bg-slate-950/90 border border-cyan-500/30 rounded-lg font-mono text-[9px] text-slate-200 leading-relaxed select-all break-words">
            {generatedPrompt}
          </div>

          <div className="p-2 bg-blue-950/30 border border-blue-500/20 rounded-lg flex items-start gap-2 text-[8px] text-blue-300 font-mono">
            <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
            <span>
              Copy this prompt into Midjourney, ChatGPT (DALL-E 3), or Bing Image Creator along with your 4 squad player photos to automatically create tournament-ready esports cover artwork formatted in a strict 16:9 widescreen aspect ratio!
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
