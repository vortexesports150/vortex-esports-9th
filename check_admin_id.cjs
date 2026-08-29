const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs, getDoc, doc } = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  console.log("Admin account ID check:");
  const q = query(collection(db, 'users'), where('email', '==', 'vortexesports150@gmail.com'));
  const snap = await getDocs(q);
  if (!snap.empty) {
    console.log("Actual Admin UID:", snap.docs[0].id);
  }
  
  console.log("Who hosts Dubai League?");
  const q2 = query(collection(db, 'pro_hosted_leagues'));
  const snap2 = await getDocs(q2);
  snap2.forEach(d => {
    if (d.data().title && d.data().title.includes('দুবাই')) {
      console.log('League:', d.data().title, 'HostID:', d.data().hostId);
    }
  });
  
  process.exit(0);
}
check();
