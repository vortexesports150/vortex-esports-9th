import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, serverTimestamp, initializeFirestore } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

async function test() {
  await setDoc(doc(db, "system", "upazila_sponsor_config"), { costPerDay: 58, updatedAt: serverTimestamp() }, { merge: true });
  console.log("Updated to 58");
  process.exit(0);
}
test();
