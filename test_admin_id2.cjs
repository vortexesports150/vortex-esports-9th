const { initializeApp } = require('firebase/app');
const { getFirestore, collection, query, where, getDocs } = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function check() {
  const q = query(collection(db, 'users'), where('email', '==', 'vortexesports150@gmail.com'));
  // Use a local snapshot rather than listener to avoid grpc hang locally maybe? No, the issue is offline mode.
}
