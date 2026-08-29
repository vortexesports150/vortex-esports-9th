with open('src/components/PulseMediaVideoCard.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace("""            onClick={(e) => {
              e.stopPropagation();
              // A single click on the overlay when it's already playing.
              // We could pause it, but since we are using a raw iframe with pointer-events-none, 
              // we just let it play. If they double click, it opens YouTube.
            }}""", """            onClick={(e) => {
              e.stopPropagation();
              setIsPlaying(false);
            }}""")

with open('src/components/PulseMediaVideoCard.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
