import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf-8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function run() {
  const snapshot = await getDocs(collection(db, 'tournaments_freefire'));
  for (const document of snapshot.docs) {
    const data = document.data();
    console.log(`[${data.status}] ${data.title} (Host: ${data.hostName}) (ID: ${document.id})`);
  }
}
run().catch(console.error).then(() => process.exit(0));
