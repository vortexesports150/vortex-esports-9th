const fs = require('fs');

function replaceBrand(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    content = content.replace(/VORTEX ESPORTS/g, "PLAYVEAR");
    content = content.replace(/Vortex Esports/g, "PlayVear");

    fs.writeFileSync(filePath, content);
    console.log(`Updated ${filePath}`);
}

['src/components/PulseFeedView.tsx', 'src/components/PulseUserProfileModal.tsx', 'src/components/HostProfileModal.tsx', 'src/lib/pushNotifications.ts', 'src/lib/imgbb.ts', 'src/lib/firestoreBackup.ts'].forEach(file => {
    if (fs.existsSync(file)) {
        replaceBrand(file);
    }
});
