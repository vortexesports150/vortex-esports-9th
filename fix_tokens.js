import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const replacementTokens = `  const [tokens, setTokensState] = useState<number>(() => {
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('vortex_tokens_')) {
          const cached = localStorage.getItem(key);
          if (cached) return Number(cached);
        }
      }
    } catch(e) {}
    return 50;
  });`;

content = content.replace('  const [tokens, setTokensState] = useState<number>(50); // Welcome bonus of 50 tokens', replacementTokens);

fs.writeFileSync('src/App.tsx', content, 'utf-8');
