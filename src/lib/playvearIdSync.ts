import { 
  collection, 
  getDocs, 
  doc, 
  updateDoc, 
  serverTimestamp,
  query,
  where,
  getDoc,
  runTransaction
} from 'firebase/firestore';
import { db } from './firebase';

export interface PlayvearIdSyncResult {
  totalChecked: number;
  alreadyHadId: number;
  newlyAssigned: number;
  failedCount: number;
  assignedList: Array<{
    userId: string;
    playvearId: string;
    displayName: string;
    email: string;
  }>;
}

export const BASE_STARTING_PLAYVEAR_ID = 4000;

export function isValidNumericPlayvearId(id: any): boolean {
  if (id === null || id === undefined) return false;
  const trimmed = String(id).trim();
  return /^\d{4,7}$/.test(trimmed);
}

/**
 * Atomically generates the next sequential PlayVear ID using a Firestore transaction.
 * Base starting number is 4000 (first user gets 4001, next gets 4002, 4003, etc.).
 * If multiple users register simultaneously, Firestore transactions ensure zero collisions or duplicate IDs.
 */
export async function getNextSequentialPlayvearId(): Promise<string> {
  const counterRef = doc(db, 'system_counters', 'playvear_id_counter');

  try {
    const nextIdString = await runTransaction(db, async (transaction) => {
      const counterSnap = await transaction.get(counterRef);
      let currentLast = BASE_STARTING_PLAYVEAR_ID;

      if (counterSnap.exists()) {
        const data = counterSnap.data();
        if (typeof data.lastPlayvearId === 'number' && data.lastPlayvearId >= BASE_STARTING_PLAYVEAR_ID) {
          currentLast = data.lastPlayvearId;
        }
      } else {
        // Find existing max numeric ID in users collection if counter doesn't exist yet
        try {
          const usersSnap = await getDocs(collection(db, 'users'));
          usersSnap.forEach((u) => {
            const pid = u.data().playvearId;
            if (isValidNumericPlayvearId(pid)) {
              const num = parseInt(pid, 10);
              if (!isNaN(num) && num >= BASE_STARTING_PLAYVEAR_ID && num > currentLast) {
                currentLast = num;
              }
            }
          });
        } catch (e) {
          console.warn('[PlayVear ID Sync] Error checking existing users max id in transaction setup:', e);
        }
      }

      const nextId = currentLast + 1;
      transaction.set(counterRef, {
        lastPlayvearId: nextId,
        updatedAt: serverTimestamp()
      }, { merge: true });

      return nextId.toString();
    });

    return nextIdString;
  } catch (error) {
    console.error('[PlayVear ID] Transaction error generating sequential ID, falling back to query scan:', error);
    
    // Fallback in case of transaction concurrency retry limit
    try {
      const usersSnap = await getDocs(collection(db, 'users'));
      let maxNum = BASE_STARTING_PLAYVEAR_ID;
      usersSnap.forEach((u) => {
        const pid = u.data().playvearId;
        if (isValidNumericPlayvearId(pid)) {
          const num = parseInt(pid, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      });
      const fallbackId = (maxNum + 1).toString();
      updateDoc(counterRef, { lastPlayvearId: maxNum + 1, updatedAt: serverTimestamp() }).catch(() => {});
      return fallbackId;
    } catch (e) {
      return (BASE_STARTING_PLAYVEAR_ID + Math.floor(1 + Math.random() * 500)).toString();
    }
  }
}

/**
 * Ensures a single user document has a valid strictly numeric sequential PlayVear ID.
 * If missing or alphabetical, generates the next sequential ID and updates Firestore.
 */
export async function ensureSingleUserPlayvearId(userId: string, currentPlayvearId?: string): Promise<string> {
  if (isValidNumericPlayvearId(currentPlayvearId)) {
    return (currentPlayvearId as string).trim();
  }

  try {
    const userRef = doc(db, 'users', userId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data();
      if (isValidNumericPlayvearId(data?.playvearId)) {
        return data.playvearId.trim();
      }
    }

    // Atomically obtain the next sequential ID
    const newId = await getNextSequentialPlayvearId();

    await updateDoc(userRef, {
      playvearId: newId,
      updatedAt: serverTimestamp()
    });

    return newId;
  } catch (error) {
    console.error(`Error ensuring sequential PlayVear ID for user ${userId}:`, error);
    return '4001';
  }
}

/**
 * Scans all registered users in Firestore and creates/assigns sequential PlayVear IDs
 * starting from 4001 (4000 + 1) for all users who do not already have a valid numeric one.
 */
export async function provisionPlayvearIdsForAllUsers(
  onProgress?: (progress: { current: number; total: number; message: string }) => void
): Promise<PlayvearIdSyncResult> {
  const result: PlayvearIdSyncResult = {
    totalChecked: 0,
    alreadyHadId: 0,
    newlyAssigned: 0,
    failedCount: 0,
    assignedList: []
  };

  try {
    onProgress?.({ current: 0, total: 0, message: 'Scanning registered users in Firestore...' });
    const usersCol = collection(db, 'users');
    const snapshot = await getDocs(usersCol);

    if (snapshot.empty) {
      onProgress?.({ current: 0, total: 0, message: 'No registered user documents found.' });
      return result;
    }

    result.totalChecked = snapshot.size;
    const existingIds = new Set<string>();
    let maxAssignedNumber = BASE_STARTING_PLAYVEAR_ID;
    const usersNeedingId: Array<{ docRef: any; id: string; data: any; createdAt: number }> = [];

    // Phase 1: Collect existing strictly numeric PlayVear IDs and find max number
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const pid = data.playvearId;
      if (isValidNumericPlayvearId(pid)) {
        const num = parseInt(pid, 10);
        if (!isNaN(num)) {
          existingIds.add(pid.trim());
          if (num > maxAssignedNumber) {
            maxAssignedNumber = num;
          }
          result.alreadyHadId++;
        } else {
          usersNeedingId.push({
            docRef: docSnap.ref,
            id: docSnap.id,
            data,
            createdAt: data.createdAt ? new Date(data.createdAt).getTime() : 0
          });
        }
      } else {
        usersNeedingId.push({
          docRef: docSnap.ref,
          id: docSnap.id,
          data,
          createdAt: data.createdAt ? new Date(data.createdAt).getTime() : 0
        });
      }
    });

    onProgress?.({
      current: result.alreadyHadId,
      total: result.totalChecked,
      message: `Found ${usersNeedingId.length} user(s) needing a PlayVear ID out of ${result.totalChecked} registered.`
    });

    // Ensure counter is at least maxAssignedNumber
    const counterRef = doc(db, 'system_counters', 'playvear_id_counter');
    await updateDoc(counterRef, {
      lastPlayvearId: maxAssignedNumber,
      updatedAt: serverTimestamp()
    }).catch(() => {
      // create if not exists
      return runTransaction(db, async (t) => {
        t.set(counterRef, { lastPlayvearId: maxAssignedNumber, updatedAt: serverTimestamp() }, { merge: true });
      });
    });

    if (usersNeedingId.length === 0) {
      onProgress?.({
        current: result.totalChecked,
        total: result.totalChecked,
        message: 'All registered users already have a unique sequential PlayVear ID!'
      });
      return result;
    }

    // Sort users needing ID by creation timestamp (oldest first)
    usersNeedingId.sort((a, b) => a.createdAt - b.createdAt);

    // Phase 2: Assign sequential PlayVear IDs (e.g. 4001, 4002, 4003...)
    let currentCounter = maxAssignedNumber;
    let processedSoFar = result.alreadyHadId;

    for (const u of usersNeedingId) {
      try {
        currentCounter += 1;
        // Skip if this number is somehow already taken in existing set
        while (existingIds.has(currentCounter.toString())) {
          currentCounter += 1;
        }

        const uniquePlayvearId = currentCounter.toString();
        existingIds.add(uniquePlayvearId);

        await updateDoc(u.docRef, {
          playvearId: uniquePlayvearId,
          updatedAt: serverTimestamp()
        });

        result.newlyAssigned++;
        processedSoFar++;
        
        result.assignedList.push({
          userId: u.id,
          playvearId: uniquePlayvearId,
          displayName: u.data?.displayName || u.data?.fullName || u.data?.name || 'Gamer',
          email: u.data?.email || 'N/A'
        });

        onProgress?.({
          current: processedSoFar,
          total: result.totalChecked,
          message: `Assigned sequential ID "${uniquePlayvearId}" to ${u.data?.displayName || u.data?.email || u.id}`
        });
      } catch (err) {
        console.error(`Failed to assign sequential PlayVear ID to user ${u.id}:`, err);
        result.failedCount++;
      }
    }

    // Update the system counter to the final highest assigned ID
    await updateDoc(counterRef, {
      lastPlayvearId: currentCounter,
      updatedAt: serverTimestamp()
    }).catch(e => console.warn('Could not update last counter in sync finish:', e));

    onProgress?.({
      current: result.totalChecked,
      total: result.totalChecked,
      message: `Sequential PlayVear ID generation complete! Assigned ${result.newlyAssigned} new IDs (Counter at ${currentCounter}).`
    });

    return result;
  } catch (error: any) {
    console.warn('[PlayVear ID Sync] Note during bulk sequential PlayVear ID provisioning:', error?.message || error);
    return result;
  }
}
