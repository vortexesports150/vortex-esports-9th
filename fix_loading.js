import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const replacement = `  const [authLoading, setAuthLoading] = useState(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('vortex_user_profile_')) {
          return false;
        }
      }
    } catch(e) {}
    return true;
  });`;

content = content.replace('  const [authLoading, setAuthLoading] = useState(true);', replacement);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
