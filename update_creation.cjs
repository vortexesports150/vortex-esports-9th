const fs = require('fs');

let code = fs.readFileSync('src/UserAdsManager.tsx', 'utf8');

// 1. Add runTransaction to imports
code = code.replace(
  "doc, serverTimestamp, getDoc, orderBy, setDoc",
  "doc, serverTimestamp, getDoc, orderBy, setDoc, runTransaction"
);

// 2. Remove Custom ID state
code = code.replace(
  "  const [customCampaignId, setCustomCampaignId] = useState('');\n",
  ""
);

code = code.replace(
  "      setCustomCampaignId('');\n",
  ""
);

// 3. Remove Custom ID input from UI
const customInputRegex = /<div className="space-y-1\.5">\s*<label className="text-\[10px\] text-slate-400 uppercase font-black tracking-widest pl-1">Custom Campaign ID \(Optional\)<\/label>\s*<input\s*type="text"\s*value=\{customCampaignId\}\s*onChange=\{e => setCustomCampaignId\(e\.target\.value\)\}\s*placeholder="e\.g\. summer-promo-2026"\s*className="w-full bg-slate-900 border border-white\/10 rounded-xl p-3 text-sm text-white placeholder-slate-600 focus:border-blue-500\/50 focus:outline-none transition font-mono"\s*\/>\s*<p className="text-\[9px\] text-slate-500 pl-1 font-mono">Use this to easily search and track your campaign later\.<\/p>\s*<\/div>/;
code = code.replace(customInputRegex, "");

// 4. Update the creation logic
const oldCreationRegex = /      const campData = \{[\s\S]*?\} else \{\s*await addDoc\(collection\(db, 'ad_campaigns'\), campData\);\s*\}/;

const newCreation = `      let newSerial = 1;
      const counterRef = doc(db, 'system', 'campaign_counter');
      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        if (!counterDoc.exists()) {
          transaction.set(counterRef, { count: 1 });
          newSerial = 1;
        } else {
          newSerial = (counterDoc.data().count || 0) + 1;
          transaction.update(counterRef, { count: newSerial });
        }
      });

      const now = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      const year = now.getFullYear();
      const month = pad(now.getMonth() + 1);
      const day = pad(now.getDate());
      const hours = pad(now.getHours());
      const mins = pad(now.getMinutes());
      const secs = pad(now.getSeconds());
      const serialStr = pad(newSerial);
      
      const generatedId = \`CAMP-\${year}\${month}\${day}-\${hours}\${mins}\${secs}-\${serialStr}\`;

      const campData = {
        advertiserId: user.uid,
        advertiserEmail: user.email,
        advertiserName: user.displayName || 'Unknown',
        videoUrl: \`https://www.youtube.com/watch?v=\${vidId}\`,
        title,
        targetViews: viewsNum,
        targetAudienceType,
        targetLocations: targetAudienceType === 'specific' ? targetLocations : [],
        costPerView: pricing.costPerView,
        totalCost,
        status: 'pending',
        viewsCount: 0,
        createdAt: serverTimestamp()
      };

      await setDoc(doc(db, 'ad_campaigns', generatedId), campData);`;

code = code.replace(oldCreationRegex, newCreation);

fs.writeFileSync('src/UserAdsManager.tsx', code);
