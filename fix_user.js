import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const replacementProfile = `  const [userProfile, setUserProfile] = useState<UserProfile | null>(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('vortex_user_profile_')) {
          const cached = localStorage.getItem(key);
          if (cached) return JSON.parse(cached);
        }
      }
    } catch(e) {}
    return null;
  });`;

const replacementUser = `  const [user, setUser] = useState<any>(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('vortex_user_profile_')) {
          const uid = key.replace('vortex_user_profile_', '');
          return { uid, email: '' }; // Fake user to prevent login flash
        }
      }
    } catch(e) {}
    return null;
  });`;

content = content.replace('  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);', replacementProfile);
content = content.replace('  const [user, setUser] = useState<User | null>(null);', replacementUser);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
