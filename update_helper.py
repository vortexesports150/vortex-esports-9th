with open('src/utils/mediaLinkHelper.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# We can replace the themeColor occurrences
# Just use regex or simple string replacement.
import re

content = re.sub(r'  themeColor: \{[^\}]+\};', '', content)
content = re.sub(r'      themeColor: \{[^\}]+\},', '', content)
content = re.sub(r'    themeColor: \{[^\}]+\},', '', content)

with open('src/utils/mediaLinkHelper.ts', 'w', encoding='utf-8') as f:
    f.write(content)
