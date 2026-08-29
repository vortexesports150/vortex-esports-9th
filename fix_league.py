import re

with open('src/components/ProLeagueDetails.tsx', 'r') as f:
    content = f.read()

# First, remove the previously inserted block
to_remove = """  const [currentTheme, setCurrentTheme] = useState(BRAND_THEMES[0]);
  useEffect(() => {
    if (league?.hostId) {
      setCurrentTheme(BRAND_THEMES[getHostThemeIndex(league.hostId)]);
    }
  }, [league?.hostId]);"""
content = content.replace(to_remove, "")

# Now insert it after the activeTab line
target = "const [activeTab, setActiveTab] = useState<'info' | 'standings' | 'matches' | 'rules'>('info');"
new_code = target + "\n" + to_remove
content = content.replace(target, new_code)

with open('src/components/ProLeagueDetails.tsx', 'w') as f:
    f.write(content)
