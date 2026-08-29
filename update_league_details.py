import re

with open('src/components/ProLeagueDetails.tsx', 'r') as f:
    content = f.read()

# Add imports
content = content.replace("import { ProHostedLeague, UserProfile } from '../types';", "import { ProHostedLeague, UserProfile } from '../types';\nimport { BRAND_THEMES, getHostThemeIndex } from './ProHostPanel';")

# Add currentTheme definition
hook_str = "export function ProLeagueDetails({ leagueId, userProfile, onBack }: ProLeagueDetailsProps) {"
replacement = hook_str + "\n  const [currentTheme, setCurrentTheme] = useState(BRAND_THEMES[0]);\n  useEffect(() => {\n    if (league?.hostId) {\n      setCurrentTheme(BRAND_THEMES[getHostThemeIndex(league.hostId)]);\n    }\n  }, [league?.hostId]);"
content = content.replace(hook_str, replacement)

# Replace styling
content = re.sub(r'bg-sky-600 hover:bg-sky-500', r'${currentTheme.accentBg}', content)
content = re.sub(r'bg-sky-600', r'${currentTheme.accentBg}', content)
content = re.sub(r'bg-blue-600', r'${currentTheme.accentBg}', content)
content = re.sub(r'text-sky-400', r'${currentTheme.text}', content)
content = re.sub(r'text-blue-400', r'${currentTheme.text}', content)
content = re.sub(r'border-sky-500/30', r'${currentTheme.border}', content)
content = re.sub(r'border-sky-500', r'${currentTheme.border}', content)

with open('src/components/ProLeagueDetails.tsx', 'w') as f:
    f.write(content)
