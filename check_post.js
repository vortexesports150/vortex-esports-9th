import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const q = query(collection(db, 'pulse_posts'), orderBy('createdAt', 'desc'), limit(5));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    const d = doc.data();
    if (d.text && d.text.includes('GIVEAWAY')) {
      console.log('ID:', doc.id);
      console.log('userName:', d.userName);
      console.log('authorIdentity:', d.authorIdentity);
      console.log('isHostPost:', d.isHostPost);
      console.log('userId:', d.userId);
    }
  });
  process.exit(0);
}
check();
