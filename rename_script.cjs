const fs = require('fs');

function replaceBrand(filePath) {
    let content = fs.readFileSync(filePath, 'utf8');

    // 1. Replace the image import specifically
    content = content.replace(/import vortexHeaderImage from '\.\/assets\/images\/vortex_header_image\.png';/g, "import playVearHeaderImage from './assets/images/playVear_logo.webp';");
    content = content.replace(/vortexHeaderImage/g, 'playVearHeaderImage');

    // 2. Safe replacements for UI text
    const protectedTerms = [
        "vortexesports150@gmail.com",
        "vortex_tokens_",
        "vortex_user_profile_",
        "vortex-img-process",
        "vortex.test",
        "vortex_esports_device_id",
        "vortex.contender@gmail.com"
    ];

    let maskedContent = content;
    const maskMap = {};
    protectedTerms.forEach((term, idx) => {
        const mask = `__PROTECTED_TERM_${idx}__`;
        maskMap[mask] = term;
        maskedContent = maskedContent.split(term).join(mask);
    });

    // Replace the rest
    maskedContent = maskedContent.replace(/VORTEX ESPORTS/g, "PLAYVEAR");
    maskedContent = maskedContent.replace(/Vortex Esports/g, "PlayVear");
    maskedContent = maskedContent.replace(/VORTEX/g, "PLAYVEAR");
    maskedContent = maskedContent.replace(/Vortex/g, "PlayVear");
    
    // Specifically handle "vortex" lowercase cases
    maskedContent = maskedContent.replace(/vortex/g, "playVear");

    // Unmask protected terms
    for (const [mask, term] of Object.entries(maskMap)) {
        maskedContent = maskedContent.split(mask).join(term);
    }

    // Fix the old dummy email
    maskedContent = maskedContent.replace(/vortex\.contender@gmail\.com/g, "playvear.contender@gmail.com");

    fs.writeFileSync(filePath, maskedContent);
    console.log(`Updated ${filePath}`);
}

['src/App.tsx', 'index.html', 'metadata.json', 'AGENTS.md'].forEach(file => {
    if (fs.existsSync(file)) {
        replaceBrand(file);
    }
});
