import admin from 'firebase-admin';

admin.initializeApp();
const db = admin.firestore();

async function run() {
  const snapshot = await db.collection('tournaments_freefire').get();
  snapshot.forEach(doc => {
    console.log(doc.id, '=>', doc.data().title, doc.data().status);
  });
}
run().catch(console.error);
