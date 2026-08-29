const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const coverOld = `          // Iterate to keep size strictly under 70 KB
          while (targetWidth >= 320) {
            canvas.width = targetWidth;
            canvas.height = Math.round(targetWidth / targetAspect);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
            }
            finalDataUrl = canvas.toDataURL('image/jpeg', targetQuality);
            const sizeInKb = (finalDataUrl.length * 0.75) / 1024;
            if (sizeInKb <= 70.0) {
              break;
            }
            targetWidth -= 80;
            targetQuality -= 0.1;
            if (targetQuality < 0.3) {
              targetQuality = 0.3;
            }
          }

          // Strict fallback
          if (((finalDataUrl.length * 0.75) / 1024) > 70.0) {
            canvas.width = 320;
            canvas.height = 180;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 320, 180);
            }
            finalDataUrl = canvas.toDataURL('image/jpeg', 0.4);
          }

          const finalSizeKb = (finalDataUrl.length * 0.75) / 1024;
          if (isEditingTeam) {
            setEditTeamCoverUrl(finalDataUrl);
          } else {
            setTeamFormCoverUrl(finalDataUrl);
          }
          setCoverUploadSuccess(\`Cover uploaded successfully! Compressed to \${finalSizeKb.toFixed(1)} KB (strictly under 70 KB limit).\`);
        } catch (err) {
          console.error("Error compressing cover:", err);
          setCoverUploadError("Failed to compress team cover image.");
        } finally {
          setIsUploadingCover(false);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };`;

const coverNew = `          // Iterate to keep size strictly under 60 KB
          while (targetWidth >= 320) {
            canvas.width = targetWidth;
            canvas.height = Math.round(targetWidth / targetAspect);
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.imageSmoothingEnabled = true;
              ctx.imageSmoothingQuality = 'high';
              ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, canvas.width, canvas.height);
            }
            finalDataUrl = canvas.toDataURL('image/jpeg', targetQuality);
            const sizeInKb = (finalDataUrl.length * 0.75) / 1024;
            if (sizeInKb <= 60.0) {
              break;
            }
            targetWidth -= 80;
            targetQuality -= 0.1;
            if (targetQuality < 0.3) {
              targetQuality = 0.3;
            }
          }

          // Strict fallback
          if (((finalDataUrl.length * 0.75) / 1024) > 60.0) {
            canvas.width = 320;
            canvas.height = 180;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, 320, 180);
            }
            finalDataUrl = canvas.toDataURL('image/jpeg', 0.4);
          }

          // Upload to Firebase Storage
          const storageRef = ref(storage, \`team_covers/\${user.uid}_\${Date.now()}.jpg\`);
          await uploadString(storageRef, finalDataUrl, 'data_url');
          const downloadURL = await getDownloadURL(storageRef);

          const finalSizeKb = (finalDataUrl.length * 0.75) / 1024;
          if (isEditingTeam) {
            setEditTeamCoverUrl(downloadURL);
          } else {
            setTeamFormCoverUrl(downloadURL);
          }
          setCoverUploadSuccess(\`Cover uploaded successfully! Compressed to \${finalSizeKb.toFixed(1)} KB (strictly under 60 KB limit).\`);
        } catch (err) {
          console.error("Error compressing cover:", err);
          setCoverUploadError("Failed to compress team cover image.");
        } finally {
          setIsUploadingCover(false);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };`;

if (code.includes(coverOld)) {
  code = code.replace(coverOld, coverNew);
  fs.writeFileSync('src/App.tsx', code);
  console.log("Cover upload patched");
} else {
  console.log("Could not find cover block to patch");
}
