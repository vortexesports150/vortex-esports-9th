import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Body parsing middleware
  app.use(express.json());

  // API health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Extract original media video metadata & original thumbnail URL from YouTube, TikTok, Facebook, Instagram
  app.get("/api/fetch-media-metadata", async (req, res) => {
    try {
      const targetUrl = req.query.url as string;
      if (!targetUrl || (!targetUrl.startsWith("http://") && !targetUrl.startsWith("https://"))) {
        return res.status(400).json({ error: "Invalid URL provided" });
      }

      const lowerUrl = targetUrl.toLowerCase();

      // 1. YouTube
      if (lowerUrl.includes("youtube.com") || lowerUrl.includes("youtu.be")) {
        let videoId = "";
        const match1 = targetUrl.match(/(?:v=|\/embed\/|\/shorts\/|\/v\/|youtu\.be\/|\/e\/)([a-zA-Z0-9_-]{11})/);
        if (match1) videoId = match1[1];

        const defaultThumb = videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : "";

        try {
          const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(targetUrl)}&format=json`;
          const resp = await fetch(oembedUrl);
          if (resp.ok) {
            const data = await resp.json();
            return res.json({
              title: data.title || "YouTube Video",
              authorName: data.author_name || "YouTube Creator",
              thumbnailUrl: data.thumbnail_url || defaultThumb,
              platform: "youtube",
              platformName: "YouTube",
              url: targetUrl
            });
          }
        } catch (e) {
          console.warn("YouTube oEmbed error:", e);
        }

        return res.json({
          title: "YouTube Video",
          thumbnailUrl: defaultThumb,
          platform: "youtube",
          platformName: "YouTube",
          url: targetUrl
        });
      }

      // 2. Instagram
      if (lowerUrl.includes("instagram.com") || lowerUrl.includes("instagr.am")) {
        const igMatch = targetUrl.match(/\/(reel|p|tv)\/([a-zA-Z0-9_-]+)/i);
        let igThumb = "";
        if (igMatch && igMatch[2]) {
          igThumb = `https://www.instagram.com/p/${igMatch[2]}/media/?size=l`;
        }

        try {
          const resp = await fetch(targetUrl, {
            headers: {
              "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
              "Accept-Language": "en-US,en;q=0.9"
            }
          });
          if (resp.ok) {
            const html = await resp.text();
            const ogImageMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
                                 html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i);
            const ogTitleMatch = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
                                 html.match(/<title[^>]*>([^<]+)<\/title>/i);

            return res.json({
              title: ogTitleMatch ? ogTitleMatch[1].trim() : "Instagram Reels / Video",
              thumbnailUrl: ogImageMatch ? ogImageMatch[1].trim() : igThumb,
              platform: "instagram",
              platformName: "Instagram",
              url: targetUrl
            });
          }
        } catch (e) {
          console.warn("Instagram fetch error:", e);
        }

        return res.json({
          title: "Instagram Video",
          thumbnailUrl: igThumb,
          platform: "instagram",
          platformName: "Instagram",
          url: targetUrl
        });
      }

      // 3. TikTok
      if (lowerUrl.includes("tiktok.com")) {
        try {
          const oembedUrl = `https://www.tiktok.com/oembed?url=${encodeURIComponent(targetUrl)}`;
          const resp = await fetch(oembedUrl, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            }
          });
          if (resp.ok) {
            const data = await resp.json();
            return res.json({
              title: data.title || "TikTok Video",
              authorName: data.author_name || "TikTok Creator",
              thumbnailUrl: data.thumbnail_url || "",
              platform: "tiktok",
              platformName: "TikTok",
              url: targetUrl
            });
          }
        } catch (e) {
          console.warn("TikTok oEmbed error:", e);
        }
      }

      // 4. Facebook / General OpenGraph Meta Parser
      try {
        // Try fetching Facebook plugin iframe page first to extract poster image
        let fbPoster = "";
        if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch') || lowerUrl.includes('fb.me')) {
          try {
            const fbPluginUrl = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(targetUrl)}&show_text=false`;
            const fbResp = await fetch(fbPluginUrl, {
              headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                "Accept-Language": "en-US,en;q=0.9"
              }
            });
            if (fbResp.ok) {
              const fbHtml = await fbResp.text();
              const posterMatch = fbHtml.match(/poster=["']([^"']+)["']/i) ||
                                  fbHtml.match(/background-image:\s*url\(([^)]+)\)/i) ||
                                  fbHtml.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i);
              if (posterMatch && posterMatch[1]) {
                fbPoster = posterMatch[1].replace(/&amp;/g, '&').replace(/\\/g, '');
              }
            }
          } catch (errFb) {
            console.warn("Facebook plugin fetch error:", errFb);
          }
        }

        const resp = await fetch(targetUrl, {
          headers: {
            "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
            "Accept-Language": "en-US,en;q=0.9"
          }
        });
        
        if (resp.ok) {
          const html = await resp.text();
          
          // Parse og:image
          const ogImageMatch = 
            html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ||
            html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i);
            
          // Parse og:title
          const ogTitleMatch = 
            html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i) ||
            html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i) ||
            html.match(/<title[^>]*>([^<]+)<\/title>/i);

          let platform: 'youtube' | 'tiktok' | 'facebook' | 'instagram' | 'other' = 'other';
          let platformName = 'Web Video';

          if (lowerUrl.includes('facebook.com') || lowerUrl.includes('fb.watch') || lowerUrl.includes('fb.me')) {
            platform = 'facebook';
            platformName = 'Facebook';
          }

          let title = ogTitleMatch ? ogTitleMatch[1].trim() : `${platformName} Video`;
          let thumbnailUrl = (ogImageMatch ? ogImageMatch[1].trim() : "") || fbPoster;

          // Unescape HTML entities in title
          title = title.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");

          return res.json({
            title,
            thumbnailUrl,
            platform,
            platformName,
            url: targetUrl
          });
        } else if (fbPoster) {
          return res.json({
            title: "Facebook Video",
            thumbnailUrl: fbPoster,
            platform: "facebook",
            platformName: "Facebook",
            url: targetUrl
          });
        }
      } catch (e) {
        console.warn("OpenGraph fetch error:", e);
      }

      return res.json({
        title: "Shared Video Link",
        thumbnailUrl: "",
        platform: "other",
        platformName: "Video Link",
        url: targetUrl
      });
    } catch (err: any) {
      console.error("Error fetching media metadata:", err);
      res.status(500).json({ error: "Failed to extract media metadata" });
    }
  });

  // Image proxy route to bypass hotlinking / 403 Forbidden on TikTok / Facebook / Instagram / CDN images
  app.get("/api/proxy-image", async (req, res) => {
    try {
      const imgUrl = req.query.url as string;
      if (!imgUrl || (!imgUrl.startsWith("http://") && !imgUrl.startsWith("https://"))) {
        return res.status(400).send("Invalid image URL");
      }

      const lower = imgUrl.toLowerCase();
      let referer = "https://www.google.com/";
      if (lower.includes("tiktokcdn.com") || lower.includes("tiktok.com")) {
        referer = "https://www.tiktok.com/";
      } else if (lower.includes("fbcdn.net") || lower.includes("facebook.com")) {
        referer = "https://www.facebook.com/";
      } else if (lower.includes("cdninstagram.com") || lower.includes("instagram.com")) {
        referer = "https://www.instagram.com/";
      }

      const imgResp = await fetch(imgUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Referer": referer,
          "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8"
        }
      });

      if (!imgResp.ok) {
        return res.status(imgResp.status).send("Failed to fetch image");
      }

      const contentType = imgResp.headers.get("content-type") || "image/jpeg";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Cache-Control", "public, max-age=86400"); // Cache 24h

      const arrayBuffer = await imgResp.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      return res.send(buffer);
    } catch (err) {
      console.error("Proxy image error:", err);
      return res.status(500).send("Proxy image error");
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
