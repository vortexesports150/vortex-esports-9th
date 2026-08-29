import re

with open('src/components/PulseCreatePostModal.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Match from Video Error Message Alert to right before Attached Video Link Preview Card
ui_match = re.search(r"\{\/\* Video Error Message Alert \*\/.*?\{\/\* Attached Video Link Preview Card \*\/", content, flags=re.DOTALL)
if ui_match:
    content = content.replace(ui_match.group(0), "{/* Attached Video Link Preview Card */")

with open('src/components/PulseCreatePostModal.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

