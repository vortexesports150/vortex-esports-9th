import re
with open('src/components/PulseCreatePostModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

bad_text = r"""              <span className="text-xs font-mono font-bold text-cyan-300 flex items-center gap-1.5">
                <Video className="w-3.5 h-3.5" />
                Detected Video Link Preview:
              </span>"""

content = content.replace(bad_text, "")

with open('src/components/PulseCreatePostModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
