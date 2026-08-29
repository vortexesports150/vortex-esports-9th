const fs = require('fs');
let content = fs.readFileSync('src/index.css', 'utf8');

if (!content.includes('@keyframes slowZoom')) {
  content += `\n
@keyframes slowZoom {
  0% { transform: scale(1); }
  50% { transform: scale(1.1); }
  100% { transform: scale(1); }
}

.animate-slowZoom {
  animation: slowZoom 20s ease-in-out infinite;
}
`;
  fs.writeFileSync('src/index.css', content);
}
