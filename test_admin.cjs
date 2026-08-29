const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const q = query(collection(db, 'users'), where('email', '==', 'vortexesports150@gmail.com'));
  const snap = await getDocs(q);
  if (!snap.empty) {
    console.log('Admin UID:', snap.docs[0].id);
  }
  process.exit(0);
}
check();
