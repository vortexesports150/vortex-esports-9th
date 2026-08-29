const fs = require('fs');
let code = fs.readFileSync('src/components/YoutubeGiveawayAdmin.tsx', 'utf8');

const toReplace = `        // Find admin uid
        const adminQ = query(collection(db, 'users'), where('email', '==', adminEmail));
        const adminSnap = await getDocs(adminQ);
        if (!adminSnap.empty) {
          const adminUid = adminSnap.docs[0].id;
          
          // Reassign pulse posts
          const postsQ = query(collection(db, 'pulse_posts'));
          const postsSnap = await getDocs(postsQ);
          postsSnap.forEach(async (d) => {
            const data = d.data();
            if (data.userId === 'playvear_official_giveaway' || data.userId === '20268211706164') {
              await updateDoc(d.ref, { userId: adminUid });
            }
          });
        }`;

const replacement = `        // Find admin uid
        const adminQ = query(collection(db, 'users'), where('email', '==', adminEmail));
        const adminSnap = await getDocs(adminQ);
        if (!adminSnap.empty) {
          const adminUid = adminSnap.docs[0].id;
          
          const migrateCollection = async (collName, idField) => {
            const q1 = query(collection(db, collName), where(idField, '==', '20268211706164'));
            const s1 = await getDocs(q1);
            s1.forEach(d => updateDoc(d.ref, { [idField]: adminUid }));

            const q2 = query(collection(db, collName), where(idField, '==', 'playvear_official_giveaway'));
            const s2 = await getDocs(q2);
            s2.forEach(d => updateDoc(d.ref, { [idField]: adminUid }));
          };

          await migrateCollection('pro_hosted_leagues', 'hostId');
          await migrateCollection('tournaments_freefire', 'hostId');
          await migrateCollection('lone_wolf_matches', 'hostId');
          await migrateCollection('pulse_posts', 'userId');
        }`;

code = code.replace(toReplace, replacement);

fs.writeFileSync('src/components/YoutubeGiveawayAdmin.tsx', code);
console.log("Updated migration logic");
