import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, initializeFirestore } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

async function test() {
  try {
    const snap = await getDocs(collection(db, "upazila_sponsor_ads"));
    console.log("Ads count:", snap.size);
    snap.forEach(d => {
      console.log(d.id, "=>", d.data().brandName, "Status:", d.data().status);
    });
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
test();
