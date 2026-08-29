import os
import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Replace purple/magenta hex colors with cyan/slate hex colors
    replacements = {
        '#0b051c': '#040b16',
        '#0d0721': '#060e1d',
        '#140828': '#081428',
        '#110c22': '#0b1622',
        '#0f0724': '#071224',
        '#11092a': '#09152a',
        '#0e0728': '#071028',
        '#0a061b': '#050d1b',
        '#0c051a': '#050c1a',
        '#120726': '#071526',
        '#14082c': '#08152c',
        '#181132': '#0c1b32',
        '#080d26': '#081326',
        '#0b0518': '#050b18',
        '#05020a': '#02070a',
        '#070312': '#030812',
        '#080a1a': '#06101a',
        '#0e0722': '#071022',
        '#0d0f20': '#081120',
        '#090e1a': '#060e1a',
        '#0c071d': '#060d1d',
        '#0d091e': '#070c1e',
        '#0e0818': '#060a18',
        '#a855f7': '#06b6d4', # purple-500 to cyan-500
        '#d946ef': '#3b82f6', # fuchsia-500 to blue-500
    }
    
    for old, new in replacements.items():
        content = content.replace(old, new)
        
    # Also replace any stray shadow-[0_0_...rgba(...)] that isn't already cyan or amber/red/green etc.
    # We'll just replace rgba(168,85,247 and rgba(217,70,239 and rgba(139,92,246 that might have been missed
    content = content.replace('rgba(168,85,247', 'rgba(6,182,212')
    content = content.replace('rgba(217,70,239', 'rgba(59,130,246')
    content = content.replace('rgba(139,92,246', 'rgba(14,165,233')

    with open(filepath, 'w') as f:
        f.write(content)

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith('.tsx') and file != 'ProHostPanel.tsx' and file != 'ProLeagueDetails.tsx':
            process_file(os.path.join(root, file))

