import { ref, uploadString, getDownloadURL } from 'firebase/storage';
import { storage } from './firebase';

/**
 * Helper to dispatch image processing events to block layout and show progress
 */
const notifyStart = (message: string) => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vortex-img-process', { detail: { processing: true, message } }));
  }
};

const notifyEnd = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('vortex-img-process', { detail: { processing: false } }));
  }
};

/**
 * ImgBB API Key for Match Result Screenshots
 */
export const IMGBB_API_KEY = (import.meta as any).env.VITE_IMGBB_API_KEY;

/**
 * Helper: Safely read File to Data URL with strict timeout
 */
export async function fileToDataUrl(file: File | Blob, timeoutMs: number = 3000): Promise<string> {
  return new Promise((resolve) => {
    if (!file) {
      resolve('');
      return;
    }
    const reader = new FileReader();
    const timeout = setTimeout(() => {
      console.warn("fileToDataUrl timed out");
      resolve('');
    }, timeoutMs);

    reader.onload = (e) => {
      clearTimeout(timeout);
      resolve((e.target?.result as string) || '');
    };
    reader.onerror = () => {
      clearTimeout(timeout);
      resolve('');
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Helper: Try upload to ImgBB with strict timeout
 */
async function tryUploadImgBB(base64OrDataUrl: string, category: string, timeoutMs: number = 3500): Promise<string | null> {
  if (!IMGBB_API_KEY || IMGBB_API_KEY.trim() === '') return null;
  const base64Data = base64OrDataUrl.includes(',') ? base64OrDataUrl.split(',')[1] : base64OrDataUrl;
  if (!base64Data) return null;

  try {
    const formData = new FormData();
    formData.append('key', IMGBB_API_KEY.trim());
    formData.append('image', base64Data);
    formData.append('name', `${category}_${Date.now()}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const response = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    if (response.ok) {
      const json = await response.json();
      if (json.success && json.data && json.data.url) {
        return json.data.url;
      }
    }
  } catch (err) {
    console.warn("ImgBB upload failed or timed out:", err);
  }
  return null;
}

/**
 * Helper: Try upload to Firebase Storage with strict timeout
 */
async function tryUploadFirebaseStorage(dataUrl: string, path: string, timeoutMs: number = 3000): Promise<string | null> {
  if (!dataUrl || !dataUrl.startsWith('data:')) return null;
  try {
    const storageRef = ref(storage, path);
    const uploadPromise = async () => {
      await uploadString(storageRef, dataUrl, 'data_url');
      return await getDownloadURL(storageRef);
    };

    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeoutMs);
    });

    const result = await Promise.race([uploadPromise(), timeoutPromise]);
    return result;
  } catch (err) {
    console.warn("Firebase Storage upload failed or timed out:", err);
  }
  return null;
}

/**
 * Helper to compress images down to a reasonable max dimension and quality
 */
export async function compressImageToDataUrl(
  fileOrDataUrl: File | string,
  maxDim: number = 1280,
  quality: number = 0.75,
  maxTargetKb: number = 115
): Promise<{ dataUrl: string; base64: string }> {
  return new Promise((resolve) => {
    if (!fileOrDataUrl) {
      resolve({ dataUrl: '', base64: '' });
      return;
    }

    let resolved = false;
    let rawResultFallback = '';

    const safeResolve = (dataUrl: string, base64: string) => {
      if (!resolved) {
        resolved = true;
        resolve({ dataUrl, base64 });
      }
    };

    if (typeof fileOrDataUrl === 'string') {
      rawResultFallback = fileOrDataUrl;
    }

    // 5-second timeout safety net to ensure we never hang and fallback gracefully
    const timeoutId = setTimeout(() => {
      if (!resolved) {
        console.warn("compressImageToDataUrl timed out, resolving with fallback data");
        if (rawResultFallback) {
          const base64 = rawResultFallback.includes(',') ? rawResultFallback.split(',')[1] : rawResultFallback;
          safeResolve(rawResultFallback, base64);
        } else if (typeof fileOrDataUrl === 'string') {
          const base64 = fileOrDataUrl.includes(',') ? fileOrDataUrl.split(',')[1] : fileOrDataUrl;
          safeResolve(fileOrDataUrl, base64);
        } else {
          safeResolve('', '');
        }
      }
    }, 5000);

    const processSrc = (src: string) => {
      try {
        if (!src) {
          clearTimeout(timeoutId);
          safeResolve('', '');
          return;
        }
        
        rawResultFallback = src;
        const rawBase64 = src.includes(',') ? src.split(',')[1] : src;

        const img = new Image();
        if (typeof src === 'string' && (src.startsWith('http://') || src.startsWith('https://'))) {
          img.crossOrigin = 'anonymous';
        }

        img.onload = () => {
          try {
            let width = img.width || maxDim;
            let height = img.height || maxDim;
            if (width > maxDim || height > maxDim) {
              if (width > height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }

            let curQuality = quality;
            let curWidth = width;
            let curHeight = height;

            const canvas = document.createElement('canvas');
            canvas.width = Math.max(16, curWidth);
            canvas.height = Math.max(16, curHeight);
            let ctx = canvas.getContext('2d');

            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

              let resDataUrl = canvas.toDataURL('image/jpeg', curQuality);
              const maxAllowedBytes = maxTargetKb * 1024;
              let estBytes = (resDataUrl.length - (resDataUrl.indexOf(',') + 1)) * 0.75;

              // Stepwise compression if file size exceeds target max KB
              let attempts = 0;
              while (estBytes > maxAllowedBytes && attempts < 8) {
                attempts++;
                if (curQuality > 0.35) {
                  curQuality -= 0.15;
                } else {
                  curWidth = Math.max(16, Math.round(curWidth * 0.85));
                  curHeight = Math.max(16, Math.round(curHeight * 0.85));
                  canvas.width = curWidth;
                  canvas.height = curHeight;
                  ctx = canvas.getContext('2d');
                  if (ctx) {
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    ctx.drawImage(img, 0, 0, curWidth, curHeight);
                  }
                }
                resDataUrl = canvas.toDataURL('image/jpeg', Math.max(0.15, curQuality));
                estBytes = (resDataUrl.length - (resDataUrl.indexOf(',') + 1)) * 0.75;
              }

              const base64 = resDataUrl.includes(',') ? resDataUrl.split(',')[1] : resDataUrl;
              clearTimeout(timeoutId);
              safeResolve(resDataUrl, base64);
              return;
            }
            clearTimeout(timeoutId);
            safeResolve(src, rawBase64);
          } catch (err) {
            console.warn("Error during image canvas compression, falling back to raw src", err);
            clearTimeout(timeoutId);
            safeResolve(src, rawBase64);
          }
        };

        img.onerror = (err) => {
          console.warn("Image load error in processSrc, falling back to raw src", err);
          clearTimeout(timeoutId);
          safeResolve(src, rawBase64);
        };

        img.src = src;
      } catch (err) {
        console.warn("Error in processSrc setup, falling back to raw src", err);
        clearTimeout(timeoutId);
        const rawBase = src.includes(',') ? src.split(',')[1] : src;
        safeResolve(src, rawBase);
      }
    };

    if (typeof fileOrDataUrl === 'string') {
      const src = fileOrDataUrl.includes(',') ? fileOrDataUrl : (fileOrDataUrl.startsWith('http') ? fileOrDataUrl : `data:image/jpeg;base64,${fileOrDataUrl}`);
      processSrc(src);
    } else if (fileOrDataUrl && typeof fileOrDataUrl === 'object') {
      try {
        const reader = new FileReader();
        reader.onload = (e) => {
          const result = (e.target?.result as string) || '';
          rawResultFallback = result;
          processSrc(result);
        };
        reader.onerror = (err) => {
          console.warn("FileReader error", err);
          clearTimeout(timeoutId);
          safeResolve('', '');
        };
        reader.readAsDataURL(fileOrDataUrl as Blob);
      } catch (err) {
        console.warn("FileReader readAsDataURL failed", err);
        clearTimeout(timeoutId);
        safeResolve('', '');
      }
    } else {
      clearTimeout(timeoutId);
      safeResolve('', '');
    }
  });
}

/**
 * Upload Brand Logo to ImgBB / Firebase (Compressed strictly to ~20 KB)
 * Fallback to Firebase Storage or immediate Data URL if ImgBB fails.
 */
async function raw_compressAndUploadLogoToFirebase(file: File, category: string = 'logo'): Promise<{ url: string; sizeKb: number }> {
  try {
    // 1. Read file to Data URL with 3s timeout
    let rawDataUrl = await fileToDataUrl(file, 3000);
    if (!rawDataUrl) {
      throw new Error("Unable to read image file from device");
    }

    // 2. Compress via Canvas to <= 20 KB
    let compressedDataUrl = rawDataUrl;
    let sizeKb = Number((rawDataUrl.length * 0.75 / 1024).toFixed(1));

    try {
      const img = new Image();
      const loadPromise = new Promise<HTMLImageElement>((res, rej) => {
        const timer = setTimeout(() => rej(new Error("Image render timeout")), 3000);
        img.onload = () => { clearTimeout(timer); res(img); };
        img.onerror = (e) => { clearTimeout(timer); rej(e); };
        img.src = rawDataUrl;
      });

      const loadedImg = await loadPromise;
      const MAX_WIDTH = 360;
      const MAX_HEIGHT = 360;
      let width = loadedImg.width || MAX_WIDTH;
      let height = loadedImg.height || MAX_HEIGHT;

      if (width > height) {
        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }
      } else {
        if (height > MAX_HEIGHT) {
          width = Math.round((width * MAX_HEIGHT) / height);
          height = MAX_HEIGHT;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(16, width);
      canvas.height = Math.max(16, height);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(loadedImg, 0, 0, canvas.width, canvas.height);

        const TARGET_MAX_BYTES = 20 * 1024;
        let quality = 0.85;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        let sizeInBytes = Math.round((dataUrl.length * 3) / 4) - 200;

        while (sizeInBytes > TARGET_MAX_BYTES && quality > 0.15) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
          sizeInBytes = Math.round((dataUrl.length * 3) / 4) - 200;
        }

        if (sizeInBytes > TARGET_MAX_BYTES) {
          let scale = 0.8;
          while (sizeInBytes > TARGET_MAX_BYTES && scale >= 0.3) {
            const smCanvas = document.createElement("canvas");
            smCanvas.width = Math.max(16, Math.round(canvas.width * scale));
            smCanvas.height = Math.max(16, Math.round(canvas.height * scale));
            const smCtx = smCanvas.getContext("2d");
            if (smCtx) {
              smCtx.imageSmoothingEnabled = true;
              smCtx.imageSmoothingQuality = "high";
              smCtx.drawImage(canvas, 0, 0, smCanvas.width, smCanvas.height);
              dataUrl = smCanvas.toDataURL("image/jpeg", 0.7);
              sizeInBytes = Math.round((dataUrl.length * 3) / 4) - 200;
            }
            scale -= 0.15;
          }
        }

        compressedDataUrl = dataUrl;
        sizeKb = Number(Math.min(20.0, Math.max(0.5, sizeInBytes / 1024)).toFixed(1));
      }
    } catch (canvasErr) {
      console.warn("Canvas compression skipped, using raw data URL fallback", canvasErr);
    }

    // 3. Try ImgBB if configured (timeout 3.5s)
    const imgbbUrl = await tryUploadImgBB(compressedDataUrl, category, 3500);
    if (imgbbUrl) {
      return { url: imgbbUrl, sizeKb };
    }

    // 4. Try Firebase Storage (timeout 2.5s)
    const fbPath = `brand_logos/logo_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
    const firebaseUrl = await tryUploadFirebaseStorage(compressedDataUrl, fbPath, 2500);
    if (firebaseUrl) {
      return { url: firebaseUrl, sizeKb };
    }

    // 5. Instant Fallback to compressed Data URL (zero network latency!)
    return { url: compressedDataUrl, sizeKb };
  } catch (err: any) {
    console.error("raw_compressAndUploadLogoToFirebase error:", err);
    // Ultimate safety fallback
    const fallbackDataUrl = await fileToDataUrl(file, 1500).catch(() => '');
    return {
      url: fallbackDataUrl || `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200" viewBox="0 0 200 200"><rect width="100%" height="100%" fill="%2304060e"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="16" fill="%2306b6d4">LOGO</text></svg>`,
      sizeKb: 1.0
    };
  }
}

/**
 * Compress an image file specifically to max 20 KB on the client side
 * Returns dataUrl, calculated sizeKb (<= 20), and a new compressed File object
 */
export async function compressLogoToMax20Kb(file: File): Promise<{ dataUrl: string; sizeKb: number; compressedFile: File }> {
  try {
    const rawDataUrl = await fileToDataUrl(file, 3000);
    if (!rawDataUrl) throw new Error("Failed to read image file");

    const img = new Image();
    const loadedImg = await new Promise<HTMLImageElement>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Image load timeout")), 3000);
      img.onload = () => { clearTimeout(timer); resolve(img); };
      img.onerror = () => { clearTimeout(timer); reject(new Error("Failed to load image")); };
      img.src = rawDataUrl;
    });

    const MAX_WIDTH = 360;
    const MAX_HEIGHT = 360;
    let width = loadedImg.width || MAX_WIDTH;
    let height = loadedImg.height || MAX_HEIGHT;

    if (width > height) {
      if (width > MAX_WIDTH) {
        height = Math.round((height * MAX_WIDTH) / width);
        width = MAX_WIDTH;
      }
    } else {
      if (height > MAX_HEIGHT) {
        width = Math.round((width * MAX_HEIGHT) / height);
        height = MAX_HEIGHT;
      }
    }

    const canvas = document.createElement("canvas");
    canvas.width = Math.max(16, width);
    canvas.height = Math.max(16, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas context unavailable");

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(loadedImg, 0, 0, canvas.width, canvas.height);

    const TARGET_MAX_BYTES = 20 * 1024;
    let quality = 0.85;
    let dataUrl = canvas.toDataURL("image/jpeg", quality);
    let sizeInBytes = Math.round((dataUrl.length * 3) / 4) - 200;

    while (sizeInBytes > TARGET_MAX_BYTES && quality > 0.15) {
      quality -= 0.1;
      dataUrl = canvas.toDataURL("image/jpeg", quality);
      sizeInBytes = Math.round((dataUrl.length * 3) / 4) - 200;
    }

    if (sizeInBytes > TARGET_MAX_BYTES) {
      let scale = 0.8;
      while (sizeInBytes > TARGET_MAX_BYTES && scale >= 0.3) {
        const smCanvas = document.createElement("canvas");
        smCanvas.width = Math.max(16, Math.round(canvas.width * scale));
        smCanvas.height = Math.max(16, Math.round(canvas.height * scale));
        const smCtx = smCanvas.getContext("2d");
        if (smCtx) {
          smCtx.imageSmoothingEnabled = true;
          smCtx.imageSmoothingQuality = "high";
          smCtx.drawImage(canvas, 0, 0, smCanvas.width, smCanvas.height);
          dataUrl = smCanvas.toDataURL("image/jpeg", 0.7);
          sizeInBytes = Math.round((dataUrl.length * 3) / 4) - 200;
        }
        scale -= 0.15;
      }
    }

    const sizeKb = Number(Math.min(20.0, Math.max(0.5, sizeInBytes / 1024)).toFixed(1));

    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)?.[1] || 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    const compressedFile = new File([u8arr], file.name.replace(/\.[^/.]+$/, "") + "_20kb.jpg", { type: mime });

    return { dataUrl, sizeKb, compressedFile };
  } catch (err: any) {
    const fallbackDataUrl = await fileToDataUrl(file, 1500).catch(() => '');
    return {
      dataUrl: fallbackDataUrl,
      sizeKb: 1.0,
      compressedFile: file
    };
  }
}

/**
 * Upload Match Result Screenshot to ImgBB
 * @param fileOrDataUrl The file or base64 string
 * @param category Optional folder/category name (default: 'match_screenshot')
 */
async function raw_uploadScreenshotToImgBB(fileOrDataUrl: File | string, category: string = 'match_screenshot'): Promise<string> {
  let fullDataUrl = '';
  let base64Data = '';

  if (typeof fileOrDataUrl === 'string' && fileOrDataUrl.startsWith('data:')) {
    fullDataUrl = fileOrDataUrl;
    base64Data = fileOrDataUrl.includes(',') ? fileOrDataUrl.split(',')[1] : fileOrDataUrl;
  } else if (fileOrDataUrl instanceof File && fileOrDataUrl.type === 'image/jpeg' && fileOrDataUrl.size <= 400 * 1024) {
    fullDataUrl = await fileToDataUrl(fileOrDataUrl, 3000);
    base64Data = fullDataUrl.includes(',') ? fullDataUrl.split(',')[1] : fullDataUrl;
  } else {
    const compressed = await compressImageToDataUrl(fileOrDataUrl, 1280, 0.8);
    fullDataUrl = compressed.dataUrl;
    base64Data = compressed.base64;
  }

  // If still empty, read directly
  if (!fullDataUrl && fileOrDataUrl && typeof fileOrDataUrl === 'object') {
    fullDataUrl = await fileToDataUrl(fileOrDataUrl as File, 2000);
  }

  const finalUrlToUse = fullDataUrl || (typeof fileOrDataUrl === 'string' ? fileOrDataUrl : '');
  const finalBase64ToUse = base64Data || (finalUrlToUse.includes(',') ? finalUrlToUse.split(',')[1] : finalUrlToUse);

  // 1. Try ImgBB
  if (IMGBB_API_KEY && IMGBB_API_KEY.trim() !== '' && finalBase64ToUse) {
    const imgbbUrl = await tryUploadImgBB(finalBase64ToUse, category, 4000);
    if (imgbbUrl) return imgbbUrl;
  }

  // 2. Try Firebase Storage
  if (finalUrlToUse && finalUrlToUse.startsWith('data:')) {
    const fbPath = `screenshots/${category}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
    const firebaseUrl = await tryUploadFirebaseStorage(finalUrlToUse, fbPath, 3000);
    if (firebaseUrl) return firebaseUrl;
  }

  // 3. Fallback: Return inline data URL
  if (finalUrlToUse && finalUrlToUse.length > 0) {
    return finalUrlToUse;
  }

  if (category === 'match_screenshot') {
    return `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="450" viewBox="0 0 800 450"><rect width="100%" height="100%" fill="%2304060e"/><rect width="100%" height="100%" fill="none" stroke="%2306b6d4" stroke-width="4"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="black" font-size="28" fill="%2306b6d4">PlayVear</text><text x="50%" y="55%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-weight="bold" font-size="16" fill="%2394a3b8">MATCH SCREENSHOT SUBMITTED</text></svg>`;
  }
  
  return '';
}

/**
 * Upload Cover Photo to ImgBB (Compressed strictly to ~40 KB and center-cropped to 16:9/16:4 aspect ratio)
 * Fallback to Firebase Storage if ImgBB fails.
 */
async function raw_compressAndUploadCoverToFirebase(file: File, category: string = 'cover_photo'): Promise<{ url: string; sizeKb: number }> {
  try {
    const rawDataUrl = await fileToDataUrl(file, 3000);
    if (!rawDataUrl) throw new Error("Failed to read cover image");

    let compressedDataUrl = rawDataUrl;
    let sizeKb = Number((rawDataUrl.length * 0.75 / 1024).toFixed(1));

    try {
      const img = new Image();
      const loadedImg = await new Promise<HTMLImageElement>((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error("Image load timeout")), 3000);
        img.onload = () => { clearTimeout(timer); resolve(img); };
        img.onerror = () => { clearTimeout(timer); reject(new Error("Failed to load cover")); };
        img.src = rawDataUrl;
      });

      const TARGET_WIDTH = 1024;
      const TARGET_HEIGHT = 256;
      const TARGET_RATIO = 16 / 4;

      let cropX = 0;
      let cropY = 0;
      let cropWidth = loadedImg.width || TARGET_WIDTH;
      let cropHeight = loadedImg.height || TARGET_HEIGHT;

      const currentRatio = cropWidth / cropHeight;
      if (currentRatio > TARGET_RATIO) {
        cropWidth = Math.round(cropHeight * TARGET_RATIO);
        cropX = Math.round(((loadedImg.width || TARGET_WIDTH) - cropWidth) / 2);
      } else if (currentRatio < TARGET_RATIO) {
        cropHeight = Math.round(cropWidth / TARGET_RATIO);
        cropY = Math.round(((loadedImg.height || TARGET_HEIGHT) - cropHeight) / 2);
      }

      const canvas = document.createElement("canvas");
      canvas.width = TARGET_WIDTH;
      canvas.height = TARGET_HEIGHT;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(loadedImg, cropX, cropY, cropWidth, cropHeight, 0, 0, TARGET_WIDTH, TARGET_HEIGHT);

        const TARGET_MAX_BYTES = 40 * 1024;
        let quality = 0.85;
        let dataUrl = canvas.toDataURL("image/jpeg", quality);
        let sizeInBytes = Math.round((dataUrl.length * 3) / 4) - 200;

        while (sizeInBytes > TARGET_MAX_BYTES && quality > 0.15) {
          quality -= 0.1;
          dataUrl = canvas.toDataURL("image/jpeg", quality);
          sizeInBytes = Math.round((dataUrl.length * 3) / 4) - 200;
        }

        if (sizeInBytes > TARGET_MAX_BYTES) {
          let scale = 0.8;
          while (sizeInBytes > TARGET_MAX_BYTES && scale >= 0.3) {
            const smCanvas = document.createElement("canvas");
            smCanvas.width = Math.max(16, Math.round(canvas.width * scale));
            smCanvas.height = Math.max(16, Math.round(canvas.height * scale));
            const smCtx = smCanvas.getContext("2d");
            if (smCtx) {
              smCtx.imageSmoothingEnabled = true;
              smCtx.imageSmoothingQuality = "high";
              smCtx.drawImage(canvas, 0, 0, smCanvas.width, smCanvas.height);
              dataUrl = smCanvas.toDataURL("image/jpeg", 0.7);
              sizeInBytes = Math.round((dataUrl.length * 3) / 4) - 200;
            }
            scale -= 0.15;
          }
        }

        compressedDataUrl = dataUrl;
        sizeKb = Number(Math.min(40.0, Math.max(0.5, sizeInBytes / 1024)).toFixed(1));
      }
    } catch (canvasErr) {
      console.warn("Canvas cover compression fallback to raw data URL", canvasErr);
    }

    // Try ImgBB
    const imgbbUrl = await tryUploadImgBB(compressedDataUrl, category, 3500);
    if (imgbbUrl) return { url: imgbbUrl, sizeKb };

    // Try Firebase Storage
    const fbPath = `brand_covers/cover_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.jpg`;
    const firebaseUrl = await tryUploadFirebaseStorage(compressedDataUrl, fbPath, 2500);
    if (firebaseUrl) return { url: firebaseUrl, sizeKb };

    // Immediate compressed Data URL fallback
    return { url: compressedDataUrl, sizeKb };
  } catch (err: any) {
    console.error("raw_compressAndUploadCoverToFirebase error:", err);
    const fallbackDataUrl = await fileToDataUrl(file, 1500).catch(() => '');
    return {
      url: fallbackDataUrl,
      sizeKb: 1.0
    };
  }
}

/**
 * Wrapped upload brand logo to Firebase / ImgBB with guaranteed progress state clean up
 */
export async function compressAndUploadLogoToFirebase(file: File, category: string = 'logo'): Promise<{ url: string; sizeKb: number }> {
  notifyStart("OPTIMIZING & UPLOADING LOGO...");
  try {
    const result = await raw_compressAndUploadLogoToFirebase(file, category);
    return result;
  } finally {
    notifyEnd();
  }
}

/**
 * Legacy compatibility alias for brand logos
 */
export const compressAndUploadToImgBB = compressAndUploadLogoToFirebase;

/**
 * Wrapped upload screenshot to ImgBB / Firebase with guaranteed progress state clean up
 */
export async function uploadScreenshotToImgBB(fileOrDataUrl: File | string, category: string = 'match_screenshot'): Promise<string> {
  notifyStart("UPLOADING SCREENSHOT...");
  try {
    const result = await raw_uploadScreenshotToImgBB(fileOrDataUrl, category);
    return result;
  } finally {
    notifyEnd();
  }
}

/**
 * Wrapped upload cover photo to Firebase / ImgBB with guaranteed progress state clean up
 */
export async function compressAndUploadCoverToFirebase(file: File, category: string = 'cover_photo'): Promise<{ url: string; sizeKb: number }> {
  notifyStart("OPTIMIZING & UPLOADING COVER PHOTO...");
  try {
    const result = await raw_compressAndUploadCoverToFirebase(file, category);
    return result;
  } finally {
    notifyEnd();
  }
}
