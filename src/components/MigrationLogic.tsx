import { useEffect } from 'react';
import { db } from '../lib/firebase';
import { collection, query, where, getDocs, doc, updateDoc } from 'firebase/firestore';

export function useAdminMigration(adminEmail: string) {
  useEffect(() => {
    const migrate = async () => {
      try {
        if (!adminEmail) return;
        const adminQ = query(collection(db, 'users'), where('email', '==', adminEmail));
        const adminSnap = await getDocs(adminQ);
        if (adminSnap.empty) return;
        const adminUid = adminSnap.docs[0].id;

        const migrateCollection = async (collName: string, idField: string) => {
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
      } catch (e) {
        console.error('Migration error:', e);
      }
    };
    migrate();
  }, [adminEmail]);
}
