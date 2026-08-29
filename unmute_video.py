with open('src/components/PulseMediaVideoCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('autoplay=1&mute=1', 'autoplay=1')
content = content.replace('autoplay=true&mute=true', 'autoplay=true')
content = content.replace('autoplay=1&muted=1', 'autoplay=1')

with open('src/components/PulseMediaVideoCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
