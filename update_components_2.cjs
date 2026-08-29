const fs = require('fs');

function replaceBrand(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // Safe replacements for UI text
    const protectedTerms = [
        "vortexesports150@gmail.com",
        "vortex_tokens_",
        "vortex_user_profile_",
        "vortex-img-process",
        "vortex.test",
        "vortex_esports_device_id",
        "vortex_firestore_backup",
        "vortex-welcome-notification",
        "vortex.com"
    ];

    let maskedContent = content;
    const maskMap = {};
    protectedTerms.forEach((term, idx) => {
        const mask = `__PROTECTED_TERM_${idx}__`;
        maskMap[mask] = term;
        maskedContent = maskedContent.split(term).join(mask);
    });

    maskedContent = maskedContent.replace(/VORTEX ESPORTS/gi, "PLAYVEAR");
    maskedContent = maskedContent.replace(/Vortex Esports/gi, "PlayVear");
    maskedContent = maskedContent.replace(/VORTEX/gi, "PLAYVEAR");
    maskedContent = maskedContent.replace(/Vortex/gi, "PlayVear");
    
    // Unmask protected terms
    for (const [mask, term] of Object.entries(maskMap)) {
        maskedContent = maskedContent.split(mask).join(term);
    }

    fs.writeFileSync(filePath, maskedContent);
    console.log(`Updated ${filePath}`);
}

['src/components/PulseFeedView.tsx', 'src/components/PulseUserProfileModal.tsx', 'src/components/HostProfileModal.tsx', 'src/lib/pushNotifications.ts', 'src/lib/imgbb.ts', 'src/lib/firestoreBackup.ts', 'src/App.tsx'].forEach(file => {
    if (fs.existsSync(file)) {
        replaceBrand(file);
    }
});
