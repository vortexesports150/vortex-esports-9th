import re

with open('src/components/PulseCreatePostModal.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
for i, line in enumerate(lines):
    # If the line contains only uppercase words, normal words, no HTML tags, no javascript (except maybe some spaces)
    # Let's just wrap it in {/* */} if it looks like the broken comments.
    stripped = line.strip()
    if stripped and not stripped.startswith('<') and not stripped.startswith('}') and not stripped.startswith('(') and not '=' in stripped and not '{' in stripped and not ')' in stripped:
        if "Mobile drag handle" in stripped or \
           "Header" in stripped or \
           "User Profile Header" in stripped or \
           "Active Posting Identity" in stripped or \
           "Facebook Page vs" in stripped or \
           "Host Profile" in stripped or \
           "Player Profile" in stripped or \
           "Category Selector" in stripped or \
           "Text Area" in stripped or \
           "Video Error" in stripped or \
           "Validating Video" in stripped or \
           "Selected 16s" in stripped or \
           "Video Snapshot" in stripped or \
           "Snapshot /" in stripped or \
           "Custom Thumbnail" in stripped or \
           "Upload Progress" in stripped or \
           "Attached Video" in stripped or \
           "Selected Image" in stripped or \
           "Attached Tournament" in stripped or \
           "Attached League" in stripped or \
           "Attached Lone" in stripped or \
           "Selected Match Data" in stripped or \
           "Cancel Selection" in stripped or \
           "Actions Bar" in stripped or \
           "YouTube Link Picker" in stripped or \
           "Image Picker" in stripped or \
           "Tag Match" in stripped or \
           "Submit Post" in stripped or \
           "Tabbed Interactive" in stripped or \
           "Category Header" in stripped or \
           "Search Bar" in stripped or \
           "Tournament List" in stripped or \
           "League Match List" in stripped or \
           "Lone Wolf Match List" in stripped or \
           "Close actions" in stripped or \
           "FULL SCREEN" in stripped or \
           "Background Neon" in stripped or \
           "Cyberpunk Animated" in stripped or \
           "Title & Bengali" in stripped or \
           "Progress Bar for" in stripped or \
           "Live Status" in stripped or \
           "Strict Non-Clickable" in stripped or \
           "Close Modal Background" in stripped:
            new_lines.append(f"{{/* {stripped} */}}\n")
            continue
    new_lines.append(line)

with open('src/components/PulseCreatePostModal.tsx', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)
