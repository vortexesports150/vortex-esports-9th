import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { IMGBB_API_KEY, uploadScreenshotToImgBB } from './imgbb';

export interface MigrationLog {
  timestamp: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
}

export interface MigrationResult {
  totalProcessed: number;
  successCount: number;
  failedCount: number;
  logs: MigrationLog[];
}

/**
 * Utility: Convert an image URL or dataUrl into a base64 string
 */
export async function urlToBase64(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith('data:image')) {
    return imageUrl.split(',')[1];
  }

  const response = await fetch(imageUrl, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const res = reader.result as string;
      resolve(res.includes(',') ? res.split(',')[1] : res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Utility: Convert an image URL or dataUrl into a Data URL (data:image/jpeg;base64,...)
 */
export async function urlToDataUrl(imageUrl: string): Promise<string> {
  if (imageUrl.startsWith('data:image')) {
    return imageUrl;
  }

  const response = await fetch(imageUrl, { mode: 'cors' });
  if (!response.ok) {
    throw new Error(`Failed to fetch image from URL: ${response.statusText}`);
  }
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Upload any external/storage image URL to ImgBB
 */
export async function transferUrlToImgBB(imageUrl: string): Promise<string> {
  if (!imageUrl || imageUrl.trim() === '') {
    throw new Error('Image URL is empty');
  }
  if (imageUrl.includes('ibb.co') || imageUrl.includes('imgbb.com')) {
    // Already hosted on ImgBB
    return imageUrl;
  }

  const base64Data = await urlToBase64(imageUrl);
  return await uploadScreenshotToImgBB(`data:image/jpeg;base64,${base64Data}`, 'migrated');
}

/**
 * Upload any external/ImgBB image URL to Firebase Cloud Storage
 */
export async function transferUrlToFirebaseStorage(
  imageUrl: string,
  storagePath: string = `migrated_images/${Date.now()}_${Math.floor(Math.random() * 1000)}.jpg`
): Promise<string> {
  if (!imageUrl || imageUrl.trim() === '') {
    throw new Error('Image URL is empty');
  }
  if (imageUrl.includes('firebasestorage.googleapis.com')) {
    // Already hosted on Firebase Storage
    return imageUrl;
  }

  const dataUrl = await urlToDataUrl(imageUrl);
  const storageRef = ref(storage, storagePath);
  await uploadString(storageRef, dataUrl, 'data_url');
  return await getDownloadURL(storageRef);
}

/**
 * Batch transfer a list of URLs to either ImgBB or Firebase Cloud Storage
 */
export async function transferUrlBatch(
  urls: string[],
  target: 'imgbb' | 'firebase',
  onProgress?: (index: number, total: number, result: { originalUrl: string; newUrl: string; status: 'success' | 'failed'; error?: string }) => void
): Promise<{ originalUrl: string; newUrl: string; status: 'success' | 'failed'; error?: string }[]> {
  const results: { originalUrl: string; newUrl: string; status: 'success' | 'failed'; error?: string }[] = [];

  for (let i = 0; i < urls.length; i++) {
    const originalUrl = urls[i].trim();
    if (!originalUrl) continue;

    try {
      let newUrl = '';
      if (target === 'imgbb') {
        newUrl = await transferUrlToImgBB(originalUrl);
      } else {
        newUrl = await transferUrlToFirebaseStorage(originalUrl, `batch_migrated/${Date.now()}_${i}.jpg`);
      }
      const itemResult = { originalUrl, newUrl, status: 'success' as const };
      results.push(itemResult);
      if (onProgress) onProgress(i + 1, urls.length, itemResult);
    } catch (err: any) {
      const itemResult = { originalUrl, newUrl: originalUrl, status: 'failed' as const, error: err.message || 'Transfer failed' };
      results.push(itemResult);
      if (onProgress) onProgress(i + 1, urls.length, itemResult);
    }
  }

  return results;
}

/**
 * Batch Migrate a Firestore Collection's image field from Firebase Storage to ImgBB (or vice versa)
 */
export function getNestedValue(obj: any, path: string): any {
  if (!obj) return undefined;
  return path.split('.').reduce((acc, part) => acc && acc[part], obj);
}

export function setNestedValue(obj: any, path: string, value: any): any {
  const parts = path.split('.');
  if (parts.length === 1) {
    return { ...obj, [parts[0]]: value };
  }
  const root = { ...obj };
  let curr = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    curr[key] = curr[key] ? { ...curr[key] } : {};
    curr = curr[key];
  }
  curr[parts[parts.length - 1]] = value;
  return root;
}

/**
 * Batch Migrate a Firestore Collection's image field(s) from Firebase Storage to ImgBB (or vice versa)
 * Supports single field, nested field path (e.g. 'mediaLink.thumbnailUrl'), or comma-separated fields (e.g. 'imageUrl,userPhoto')
 */
export async function migrateFirestoreCollection(
  collectionName: string,
  fieldName: string,
  targetStorage: 'imgbb' | 'firebase',
  onLog?: (log: MigrationLog) => void
): Promise<MigrationResult> {
  const logs: MigrationLog[] = [];
  const addLog = (type: MigrationLog['type'], message: string) => {
    const entry = { timestamp: new Date().toLocaleTimeString(), type, message };
    logs.push(entry);
    if (onLog) onLog(entry);
  };

  addLog('info', `Starting migration for collection '${collectionName}' (Field(s): '${fieldName}') -> Target: ${targetStorage.toUpperCase()}`);

  let successCount = 0;
  let failedCount = 0;
  let totalProcessed = 0;

  try {
    const colRef = collection(db, collectionName);
    const snapshot = await getDocs(colRef);

    if (snapshot.empty) {
      addLog('warning', `No documents found in collection '${collectionName}'.`);
      return { totalProcessed: 0, successCount: 0, failedCount: 0, logs };
    }

    addLog('info', `Found ${snapshot.size} documents in '${collectionName}'.`);
    const fieldList = fieldName.split(',').map(f => f.trim()).filter(Boolean);

    for (const docSnap of snapshot.docs) {
      const data = docSnap.data();
      let docUpdates: Record<string, any> = {};
      let docHadUpdates = false;

      for (const singleField of fieldList) {
        const currentUrl = getNestedValue(data, singleField);

        if (!currentUrl || typeof currentUrl !== 'string' || currentUrl.trim() === '') {
          continue;
        }

        const isFirebaseUrl = currentUrl.includes('firebasestorage.googleapis.com');
        const isImgBBUrl = currentUrl.includes('ibb.co') || currentUrl.includes('imgbb.com');

        // Check if migration is necessary
        if (targetStorage === 'imgbb' && isImgBBUrl) {
          addLog('info', `Doc ID [${docSnap.id}] field '${singleField}': Already hosted on ImgBB. Skipping.`);
          continue;
        }
        if (targetStorage === 'firebase' && isFirebaseUrl) {
          addLog('info', `Doc ID [${docSnap.id}] field '${singleField}': Already hosted on Firebase Storage. Skipping.`);
          continue;
        }

        totalProcessed++;
        addLog('info', `Migrating Doc ID [${docSnap.id}] field '${singleField}'...`);

        try {
          let newUrl = '';
          if (targetStorage === 'imgbb') {
            newUrl = await transferUrlToImgBB(currentUrl);
          } else {
            newUrl = await transferUrlToFirebaseStorage(
              currentUrl,
              `${collectionName}/${docSnap.id}_${singleField.replace(/\./g, '_')}_${Date.now()}.jpg`
            );
          }

          docUpdates = setNestedValue({ ...data, ...docUpdates }, singleField, newUrl);
          docHadUpdates = true;
          successCount++;
          addLog('success', `Doc ID [${docSnap.id}] field '${singleField}' updated! New URL: ${newUrl.substring(0, 45)}...`);
        } catch (err: any) {
          failedCount++;
          addLog('error', `Doc ID [${docSnap.id}] field '${singleField}' failed: ${err.message || 'Transfer error'}`);
        }
      }

      if (docHadUpdates) {
        docUpdates.storageProvider = targetStorage === 'imgbb' ? 'ImgBB' : 'FirebaseStorage';
        docUpdates.lastStorageMigrationAt = new Date().toISOString();
        await updateDoc(doc(db, collectionName, docSnap.id), docUpdates);
      }
    }

    addLog('success', `Collection '${collectionName}' migration complete! Processed: ${totalProcessed}, Success: ${successCount}, Failed: ${failedCount}`);
  } catch (err: any) {
    addLog('error', `Collection '${collectionName}' migration aborted: ${err.message || 'Firestore read error'}`);
  }

  return { totalProcessed, successCount, failedCount, logs };
}

export interface AllPicturesMigrationPreset {
  collectionName: string;
  fieldName: string;
  label: string;
}

export const ALL_PICTURE_PRESETS: AllPicturesMigrationPreset[] = [
  { collectionName: 'pulse_posts', fieldName: 'imageUrl,userPhoto', label: 'Pulse Posts (Photos & Author Avatars)' },
  { collectionName: 'users', fieldName: 'avatar,photoURL', label: 'User Profiles (Avatars & Photos)' },
  { collectionName: 'squads', fieldName: 'coverUrl,logoUrl', label: 'Squad Profiles (Cover & Logo)' },
  { collectionName: 'teams', fieldName: 'logoUrl,bannerUrl', label: 'Team Profiles (Logo & Banner)' },
  { collectionName: 'tournaments_freefire', fieldName: 'bannerUrl', label: 'FreeFire Tournaments (Banners)' },
  { collectionName: 'tournaments_pubg', fieldName: 'bannerUrl', label: 'PUBG Tournaments (Banners)' },
  { collectionName: 'tournaments_ludo', fieldName: 'bannerUrl', label: 'Ludo Tournaments (Banners)' },
  { collectionName: 'tournaments', fieldName: 'bannerUrl', label: 'Global Tournaments (Banners)' },
  { collectionName: 'pro_hosted_leagues', fieldName: 'bannerUrl', label: 'Pro Hosted Leagues (Banners)' },
  { collectionName: 'lone_wolf_matches', fieldName: 'resultScreenshotUrl', label: 'Lone Wolf Matches (Screenshots)' },
  { collectionName: 'match_results', fieldName: 'screenshotUrl', label: 'Match Results (Proof Screenshots)' },
  { collectionName: 'match_history_results', fieldName: 'screenshotUrl', label: 'Match History (Proof Screenshots)' },
  { collectionName: 'upazila_sponsors', fieldName: 'logoUrl', label: 'Upazila Sponsors (Logos)' },
  { collectionName: 'tournament_sponsors', fieldName: 'logoUrl', label: 'Tournament Sponsors (Logos)' },
  { collectionName: 'ads', fieldName: 'bannerUrl', label: 'Ads (Banners)' },
  { collectionName: 'ad_campaigns', fieldName: 'bannerUrl', label: 'Ad Campaigns (Banners)' }
];

/**
 * Auto-migrate all picture collections in one click
 */
export async function migrateAllPictureCollections(
  targetStorage: 'imgbb' | 'firebase',
  onLog?: (log: MigrationLog) => void
): Promise<{ totalProcessed: number; successCount: number; failedCount: number }> {
  let grandTotal = 0;
  let grandSuccess = 0;
  let grandFailed = 0;

  if (onLog) {
    onLog({
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: `=== STARTING FULL AUTO-MIGRATION OF ALL PICTURE COLLECTIONS (${ALL_PICTURE_PRESETS.length} Collections) -> Target: ${targetStorage.toUpperCase()} ===`
    });
  }

  for (const preset of ALL_PICTURE_PRESETS) {
    if (onLog) {
      onLog({
        timestamp: new Date().toLocaleTimeString(),
        type: 'info',
        message: `>>> Processing ${preset.label} [Collection: '${preset.collectionName}']...`
      });
    }

    const res = await migrateFirestoreCollection(preset.collectionName, preset.fieldName, targetStorage, onLog);
    grandTotal += res.totalProcessed;
    grandSuccess += res.successCount;
    grandFailed += res.failedCount;
  }

  if (onLog) {
    onLog({
      timestamp: new Date().toLocaleTimeString(),
      type: 'success',
      message: `=== ALL PICTURE COLLECTIONS MIGRATION COMPLETED! Processed: ${grandTotal}, Success: ${grandSuccess}, Failed: ${grandFailed} ===`
    });
  }

  return { totalProcessed: grandTotal, successCount: grandSuccess, failedCount: grandFailed };
}

/**
 * Export a single Firestore collection as a JSON string for quick backup or inspection
 */
export async function exportSingleCollectionJson(collectionName: string): Promise<string> {
  const colRef = collection(db, collectionName);
  const snapshot = await getDocs(colRef);
  const docsData: Record<string, any> = {};

  snapshot.forEach((docSnap) => {
    docsData[docSnap.id] = docSnap.data();
  });

  return JSON.stringify(docsData, null, 2);
}
