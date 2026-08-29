import { initializeApp } from "firebase/app";
import { getFirestore, doc, updateDoc, serverTimestamp, initializeFirestore } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

async function test() {
  try {
    console.log("Saving...");
    await updateDoc(doc(db, "system", "upazila_sponsor_config"), {
      costPerDay: 56,
      updatedAt: serverTimestamp()
    });
    console.log("Saved successfully!");
  } catch(e) {
    console.error("Error:", e);
  }
  process.exit(0);
}
test();
