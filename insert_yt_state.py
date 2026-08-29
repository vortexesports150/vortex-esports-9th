with open('src/components/PulseCreatePostModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

state_defs = """
  const [youtubeLink, setYoutubeLink] = useState('');
  const [isVerifyingYoutube, setIsVerifyingYoutube] = useState(false);
  const [youtubeError, setYoutubeError] = useState<string | null>(null);
"""
if "isVerifyingYoutube" not in content:
    content = content.replace("  const [showMediaInput, setShowMediaInput] = useState(false);", state_defs + "  const [showMediaInput, setShowMediaInput] = useState(false);")

with open('src/components/PulseCreatePostModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
