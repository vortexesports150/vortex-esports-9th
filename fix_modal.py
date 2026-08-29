import re

with open('src/components/PulseCreatePostModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix Imports
content = re.sub(r"import \{.*?\} from '\.\./lib/cloudinaryVideo';\n", "", content, flags=re.DOTALL)
content = re.sub(r"import \{ VearClipAutoSplitModal \} from '\./VearClipAutoSplitModal';\n", "", content)
content = content.replace("import { PulseMediaVideoCard } from './PulseMediaVideoCard';", 
"""import { PulseMediaVideoCard } from './PulseMediaVideoCard';
import { extractYouTubeId, isYouTubeShorts, checkYouTubeVideoDuration } from '../utils/youtubeHelper';""")
content = content.replace("import { calculatePulsePostTrendingScore } from '../lib/cloudinaryVideo';", "")

# 2. Remove Video States
content = re.sub(r"  const \[selectedVideoFile, setSelectedVideoFile\] = useState.*?;\n", "", content)
content = re.sub(r"  const \[videoPreviewUrl, setVideoPreviewUrl\] = useState.*?;\n", "", content)
content = re.sub(r"  const \[videoMetadata, setVideoMetadata\] = useState.*?;\n", "", content)
content = re.sub(r"  const \[videoUploadProgress, setVideoUploadProgress\] = useState.*?;\n", "", content)
content = re.sub(r"  const \[isValidatingVideo, setIsValidatingVideo\] = useState.*?;\n", "", content)
content = re.sub(r"  const \[videoErrorMessage, setVideoErrorMessage\] = useState.*?;\n", "", content)
content = re.sub(r"  const \[customThumbnailFile, setCustomThumbnailFile\] = useState.*?;\n", "", content)
content = re.sub(r"  const \[customThumbnailPreview, setCustomThumbnailPreview\] = useState.*?;\n", "", content)

# 3. Add YouTube States
youtube_states = """
  // YouTube specific states
  const [youtubeLink, setYoutubeLink] = useState('');
  const [isVerifyingYoutube, setIsVerifyingYoutube] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
"""
content = content.replace("  // Media / Video Link State (YouTube, TikTok, Instagram, Facebook)", youtube_states + "  // Media / Video Link State (YouTube, TikTok, Instagram, Facebook)")

# 4. Remove Video Logic (handleVideoSelect, etc)
content = re.sub(r"  const handleVideoSelect = async.*?};\n", "", content, flags=re.DOTALL)
content = re.sub(r"  const handleCustomThumbnailSelect = async.*?};\n", "", content, flags=re.DOTALL)

# 5. Modify handleSubmit
submit_find = "const handleSubmit = async () => {"
submit_replace = """const handleSubmit = async () => {
    if (!postText.trim() && !selectedImage && !attachedMediaLink) return;
    setIsSubmitting(true);
    setUploadStatusText('Preparing post...');
    
    try {
      let finalImageUrl = null;
      if (selectedImage) {
        setUploadStatusText('Uploading image...');
        const base64Data = await compressImageToDataUrl(selectedImage);
        finalImageUrl = await uploadScreenshotToImgBB(base64Data);
      }
"""
content = re.sub(r"const handleSubmit = async \(\) => \{.*?\n      \} else if \(attachedMediaLink\) \{", """const handleSubmit = async () => {
    if (!postText.trim() && !selectedImage && !attachedMediaLink && !selectedTournament && !selectedLeagueMatch && !selectedLoneWolfMatch) return;
    setIsSubmitting(true);
    setUploadStatusText('Preparing post...');
    
    try {
      let finalImageUrl = null;
      if (selectedImage) {
        setUploadStatusText('Uploading image...');
        const base64Data = await compressImageToDataUrl(selectedImage);
        finalImageUrl = await uploadScreenshotToImgBB(base64Data);
      }
      
      if (attachedMediaLink) {""", content, flags=re.DOTALL)

# 6. Replace UI
ui_replace_find = r"\{\/\* 16s Video Clip Picker \.*?<\/label>"
ui_replace_new = """
              {/* YouTube Link Picker */}
              <button 
                type="button"
                onClick={() => {
                  setShowMediaInput(true);
                }}
                disabled={isSubmitting}
                className="p-2.5 rounded-xl bg-red-950/40 border border-red-500/40 hover:border-red-400 text-red-300 hover:bg-red-500/20 cursor-pointer transition-all flex items-center gap-1.5 text-[11px] font-bold font-mono shadow-[0_0_12px_rgba(239,68,68,0.15)] group"
              >
                <Video className="w-3.5 h-3.5 text-red-400 group-hover:scale-110 transition-transform" />
                <span>YouTube Link (Max 60s)</span>
              </button>
"""
content = re.sub(r"\{\/\* 16s Video Clip Picker.*?\n              <\/label>", ui_replace_new, content, flags=re.DOTALL)

# 7. Add YouTube Input UI
# Remove the old Media Link Input rendering if exists, and replace it with YouTube specific one.
# Looking for `showMediaInput &&`
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
                    // Try to verify duration
                    let duration = 0;
                    if (isYouTubeShorts(mediaUrlInput)) {
                      duration = 60; // Shorts are fine
                    } else {
                      try {
                        duration = await checkYouTubeVideoDuration(ytId);
                      } catch (err) {
                        console.warn("Could not verify duration exactly:", err);
                        // If it fails due to cors/private, reject
                        setYoutubeError("Could not verify video duration. Please ensure the video is public and valid.");
                        setIsVerifyingYoutube(false);
                        return;
                      }
                    }
                    
                    if (duration > 61) { // allow 1 sec leeway
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

content = re.sub(r"\{showMediaInput && \!attachedMediaLink && \(.*?<\/div>\n        \)\}", youtube_ui, content, flags=re.DOTALL)

with open('src/components/PulseCreatePostModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

