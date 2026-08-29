const { initializeApp } = require('firebase/app');
const { collection, query, where, getDocs, doc, deleteDoc, updateDoc, initializeFirestore } = require('firebase/firestore');
const fs = require('fs');

const firebaseConfig = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(firebaseConfig);
const db = initializeFirestore(app, { experimentalForceLongPolling: true });

async function cleanup() {
  try {
    console.log("Finding admin user...");
    const adminQ = query(collection(db, 'users'), where('email', '==', 'vortexesports150@gmail.com'));
    const adminSnap = await getDocs(adminQ);
    if (adminSnap.empty) {
      console.log("Admin not found!");
      return process.exit(1);
    }
    const adminUid = adminSnap.docs[0].id;
    console.log("Admin UID:", adminUid);

    console.log("Updating old pulse posts...");
    const postsQ = query(collection(db, 'pulse_posts'));
    const postsSnap = await getDocs(postsQ);
    let updatedCount = 0;
    for (const d of postsSnap.docs) {
      const data = d.data();
      if (data.userId === 'playvear_official_giveaway' || data.userId === '20268211706164') {
        await updateDoc(d.ref, { userId: adminUid });
        updatedCount++;
      }
    }
    console.log(`Updated ${updatedCount} old posts to point to the real admin UID.`);

    console.log("Deleting sandbox profiles...");
    await deleteDoc(doc(db, 'users', 'playvear_official_giveaway')).catch(() => {});
    await deleteDoc(doc(db, 'host_brands', 'playvear_official_giveaway')).catch(() => {});
    
    // We also delete the dummy user '20268211706164' if it was created by accident
    await deleteDoc(doc(db, 'users', '20268211706164')).catch(() => {});
    await deleteDoc(doc(db, 'host_brands', '20268211706164')).catch(() => {});

    console.log("Cleanup complete!");
  } catch (e) {
    console.error(e);
  }
  process.exit(0);
}
cleanup();
