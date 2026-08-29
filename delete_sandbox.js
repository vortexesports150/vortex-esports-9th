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
    if (data.status === 'Ongoing' || data.status === 'Ended') {
      console.log(`Deleting [${data.status}] ${data.title} (ID: ${document.id})`);
      try {
        await deleteDoc(doc(db, 'tournaments_freefire', document.id));
        console.log(`Deleted ${document.id}`);
      } catch (err) {
        console.error(`Failed to delete ${document.id}:`, err.message);
      }
    }
  }
}
run().catch(console.error).then(() => process.exit(0));
