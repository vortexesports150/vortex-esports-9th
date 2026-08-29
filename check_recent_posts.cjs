const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, orderBy, limit, getDocs, initializeFirestore } = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

async function check() {
  const q = query(collection(db, 'pulse_posts'), orderBy('createdAt', 'desc'), limit(5));
  const snap = await getDocs(q);
  snap.forEach(doc => {
    const d = doc.data();
    if (d.text && d.text.includes('GIVEAWAY')) {
      console.log('Post ID:', doc.id);
      console.log('userName:', d.userName);
      console.log('userId:', d.userId);
      console.log('createdAt:', d.createdAt?.toDate());
    }
  });
  process.exit(0);
}
check();
