import { initializeApp } from 'firebase/app';
import { getFirestore, collection, query, getDocs } from 'firebase/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const q = query(collection(db, 'pro_hosted_leagues'));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    const d = doc.data();
    if (d.title && d.title.includes('দুবাই')) {
      console.log('League:', d.title, 'hostId:', d.hostId);
    }
  });
  process.exit(0);
}
check();
