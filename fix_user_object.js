import fs from 'fs';

let content = fs.readFileSync('src/App.tsx', 'utf-8');

const regex = /return \{ uid, email: '' \}; \/\/ Fake user to prevent login flash/;
content = content.replace(regex, "return { uid, email: '', displayName: 'Gamer', photoURL: null }; // Fake user to prevent login flash");

fs.writeFileSync('src/App.tsx', content, 'utf-8');
