import { initializeApp } from "firebase/app";
import { getFirestore, doc, getDoc, initializeFirestore } from "firebase/firestore";
import fs from "fs";

const config = JSON.parse(fs.readFileSync("firebase-applet-config.json", "utf8"));
const app = initializeApp(config);
const db = initializeFirestore(app, {}, config.firestoreDatabaseId);

async function test() {
  const snap = await getDoc(doc(db, "system", "upazila_sponsor_config"));
  console.log("Current costPerDay:", snap.data());
  process.exit(0);
}
test();
