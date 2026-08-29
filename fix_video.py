with open('src/components/PulseMediaVideoCard.tsx', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
skip = False
for line in lines:
    if '<div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300" />' in line:
        new_lines.append(line)
        skip = True
        continue
    
    if skip and '</div>' in line and '        </div>' in line:
        # We assume the matching </div> for the thumbnail wrapper is reached.
        # Actually it's easier to just overwrite the tail end.
        pass
