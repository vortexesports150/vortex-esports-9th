import re

with open('src/components/PulseCreatePostModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

youtube_ui = """
        {showMediaInput && !attachedMediaLink && (
          <div className="p-3 bg-slate-900 border border-white/10 rounded-xl space-y-2 mt-2">
            <div className="flex items-center gap-2 mb-1">
              <Link2 className="w-4 h-4 text-cyan-400" />
              <span className="text-xs font-mono font-bold text-slate-200">YouTube Video Link (Max 60 seconds)</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste YouTube link here..."
                value={mediaUrlInput}
                onChange={(e) => setMediaUrlInput(e.target.value)}
                className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 font-sans focus:outline-none focus:border-cyan-500"
              />
              <button
                type="button"
                onClick={async () => {
                  if (!mediaUrlInput) return;
                  const ytId = extractYouTubeId(mediaUrlInput);
                  if (!ytId) {
                    setYoutubeError("Invalid YouTube link");
                    return;
                  }
                  
                  setIsVerifyingYoutube(true);
                  setYoutubeError(null);
                  try {
                    let duration = 0;
                    if (isYouTubeShorts(mediaUrlInput)) {
                      duration = 60;
                    } else {
                      try {
                        duration = await checkYouTubeVideoDuration(ytId);
                      } catch (err) {
                        setYoutubeError("Could not verify video duration. Please ensure the video is public.");
                        setIsVerifyingYoutube(false);
                        return;
                      }
                    }
                    
                    if (duration > 61) {
                      setYoutubeError(`Video is too long (${Math.round(duration)}s). Maximum allowed is 60 seconds.`);
                    } else {
                      const mediaData = parseMediaUrl(mediaUrlInput);
                      if (mediaData) {
                        setAttachedMediaLink(mediaData);
                        setMediaUrlInput('');
                        setShowMediaInput(false);
                      }
                    }
                  } catch (err) {
                    setYoutubeError("Failed to verify YouTube link.");
                  } finally {
                    setIsVerifyingYoutube(false);
                  }
                }}
                disabled={isVerifyingYoutube}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-black uppercase text-[10px] rounded-lg tracking-wider disabled:opacity-50"
              >
                {isVerifyingYoutube ? 'Checking...' : 'Add'}
              </button>
            </div>
            {youtubeError && <p className="text-xs text-rose-400 font-mono mt-1">{youtubeError}</p>}
          </div>
        )}
"""

content = content.replace("{/* Attached Video Link Preview Card */", youtube_ui + "{/* Attached Video Link Preview Card */")

with open('src/components/PulseCreatePostModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
