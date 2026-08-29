import re

with open('src/components/PulseCreatePostModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the Full Screen Screen-Blocking Progress Notifier Overlay
overlay_match = re.search(r"\{\/\* FULL SCREEN.*?\{showAutoSplitModal", content, flags=re.DOTALL)
if overlay_match:
    new_overlay = """{/* FULL SCREEN SCREEN-BLOCKING PROGRESS NOTIFIER OVERLAY */}
      {isSubmitting && (
        <div 
          className="fixed inset-0 z-[300] bg-black/95 backdrop-blur-2xl flex flex-col items-center justify-center p-6 text-center select-none pointer-events-auto cursor-wait animate-fadeIn"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
          }}
        >
          <div className="max-w-md w-full bg-[#040714] border-2 border-cyan-500/60 rounded-3xl p-6 sm:p-8 shadow-[0_0_90px_rgba(6,182,212,0.5)] flex flex-col items-center gap-5 relative overflow-hidden">
            <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
            <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-pink-500/25 rounded-full blur-3xl pointer-events-none animate-pulse" />
            
            <div className="relative flex items-center justify-center my-2">
              <div className="w-20 h-20 rounded-full border-4 border-cyan-500/20 border-t-cyan-400 border-r-pink-500 animate-spin shadow-[0_0_30px_rgba(6,182,212,0.6)]" />
              <div className="absolute w-14 h-14 rounded-full border-2 border-pink-500/30 border-b-cyan-300 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
              <Sparkles className="absolute w-7 h-7 text-pink-400 animate-pulse" />
            </div>
            
            <div className="space-y-1.5">
              <h3 className="text-base sm:text-lg font-black text-white font-mono uppercase tracking-wider flex items-center justify-center gap-2">
                <span>Publishing Pulse Post...</span>
              </h3>
              <p className="text-xs text-cyan-300 font-mono font-bold">
                পোস্টটি ফিডে পাবলিশ করা হচ্ছে...
              </p>
            </div>

            <div className="px-4 py-2.5 bg-slate-950/90 border border-cyan-500/40 rounded-xl text-xs font-mono text-cyan-200 w-full flex items-center justify-center gap-2 shadow-inner">
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
              <span className="truncate font-bold">{uploadStatusText || 'Processing upload...'}</span>
            </div>

            <div className="p-3 bg-rose-950/80 border border-rose-500/50 rounded-xl flex items-start gap-2 text-[11px] text-rose-200 text-left w-full shadow-lg">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <span className="leading-snug">
                🛑 <b>অনুগ্রহ করে অপেক্ষা করুন:</b> আপলোড সম্পূর্ণ না হওয়া পর্যন্ত পেজ পরিবর্তন করবেন না।
              </span>
            </div>
          </div>
        </div>
      )}
      {/* """
    content = content.replace(overlay_match.group(0), new_overlay + "{showAutoSplitModal")

# Remove the Auto Split modal from the bottom
auto_split_match = re.search(r"\{showAutoSplitModal && fileForAutoSplit.*?\)\}", content, flags=re.DOTALL)
if auto_split_match:
    content = content.replace(auto_split_match.group(0), "")

# also remove 'isValidatingVideo', 'isCompressing', 'videoUploadProgress', 'selectedVideoFile' references in buttons
content = content.replace("isValidatingVideo ||", "")
content = content.replace("isCompressing ||", "")
content = content.replace("!selectedVideoFile &&", "")
content = content.replace("videoUploadProgress > 0 ? `${Math.round(videoUploadProgress)}%` :", "")
content = content.replace("videoUploadProgress", "0") # just in case

with open('src/components/PulseCreatePostModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
