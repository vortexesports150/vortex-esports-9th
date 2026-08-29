import re

with open('src/components/PulseCreatePostModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace the specific block
# It looks like:
#             <div className="flex items-center justify-between mb-2">
#               <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
#                 <Video className="w-3.5 h-3.5" />
#                 Detected Video Link Preview:
#               </span>
#               <button
#                 type="button"
#                 onClick={() => {
#                   setAttachedMediaLink(null);
#                 }}
#                 className="text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer"
#               >
#                 <X className="w-3.5 h-3.5" />
#                 <span>Remove Link Preview</span>
#               </button>
#             </div>

match = re.search(r'<div className="flex items-center justify-between mb-2">.*?<X className="w-3\.5 h-3\.5" \/>.*?<\/button>\s*<\/div>', content, flags=re.DOTALL)
if match:
    # Instead of completely removing, let's just make it a clean "Remove" button that floats over it, or just keep it simple without text.
    new_header = """<div className="flex justify-end mb-2">
              <button
                type="button"
                onClick={() => setAttachedMediaLink(null)}
                className="text-rose-400 hover:text-rose-300 transition-colors flex items-center gap-1 cursor-pointer text-xs font-mono"
              >
                <X className="w-3.5 h-3.5" />
                <span>Remove Video</span>
              </button>
            </div>"""
    content = content.replace(match.group(0), new_header)

with open('src/components/PulseCreatePostModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
