const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const avatarOld = `          // Interactive size reducer loop to guarantee data URL size is kept optimized strictly under 5KB
          while (targetSize >= 40) {
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'medium';
              ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
            }
            finalDataUrl = canvas.toDataURL('image/jpeg', targetQuality);
            
            const currentKb = (finalDataUrl.length * 0.75) / 1024;
            if (currentKb <= 5.0) {
              break;
            }
            targetSize -= 10;
            targetQuality -= 0.1;
            if (targetQuality < 0.2) targetQuality = 0.2;
          }

          // Strict fallback just in case
          if (((finalDataUrl.length * 0.75) / 1024) > 5.0) {
             canvas.width = 40;
             canvas.height = 40;
             const ctx = canvas.getContext('2d');
             if (ctx) {
                ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 40, 40);
             }
             finalDataUrl = canvas.toDataURL('image/jpeg', 0.2);
          }

          // Directly save to Firestore to persist immediately
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            photoURL: finalDataUrl
          });

          // Update local state instantly for UI
          setUserProfile(prev => prev ? { ...prev, photoURL: finalDataUrl } : null);
          setAvatarSuccess('Profile picture updated successfully!');
        } catch (err) {
          console.error("Error compressing or saving avatar:", err);
          triggerAvatarError("Failed to process or save image.");
        } finally {
          setIsUploadingAvatar(false);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };`;

const avatarNew = `          // Interactive size reducer loop to guarantee data URL size is kept optimized strictly under 10KB
          while (targetSize >= 40) {
            canvas.width = targetSize;
            canvas.height = targetSize;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'medium';
              ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, targetSize, targetSize);
            }
            finalDataUrl = canvas.toDataURL('image/jpeg', targetQuality);
            
            const currentKb = (finalDataUrl.length * 0.75) / 1024;
            if (currentKb <= 10.0) {
              break;
            }
            targetSize -= 10;
            targetQuality -= 0.1;
            if (targetQuality < 0.2) targetQuality = 0.2;
          }

          // Strict fallback just in case
          if (((finalDataUrl.length * 0.75) / 1024) > 10.0) {
             canvas.width = 40;
             canvas.height = 40;
             const ctx = canvas.getContext('2d');
             if (ctx) {
                ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, 40, 40);
             }
             finalDataUrl = canvas.toDataURL('image/jpeg', 0.2);
          }

          // Upload to Firebase Storage
          const storageRef = ref(storage, \`avatars/\${user.uid}_\${Date.now()}.jpg\`);
          await uploadString(storageRef, finalDataUrl, 'data_url');
          const downloadURL = await getDownloadURL(storageRef);

          // Directly save to Firestore to persist immediately
          const userRef = doc(db, 'users', user.uid);
          await updateDoc(userRef, {
            photoURL: downloadURL
          });

          // Update local state instantly for UI
          setUserProfile(prev => prev ? { ...prev, photoURL: downloadURL } : null);
          setAvatarSuccess('Profile picture updated successfully!');
        } catch (err) {
          console.error("Error compressing or saving avatar:", err);
          triggerAvatarError("Failed to process or save image.");
        } finally {
          setIsUploadingAvatar(false);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };`;

if (code.includes(avatarOld)) {
  code = code.replace(avatarOld, avatarNew);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Avatar upload patched");
} else {
  console.log("Could not find avatar block to patch");
}
