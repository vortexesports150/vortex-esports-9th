with open('src/components/PulseMediaVideoCard.tsx', 'w', encoding='utf-8') as f:
    f.write("""import React, { useState, useEffect } from 'react';
import { Play, Loader2 } from 'lucide-react';
import { MediaLinkInfo } from '../utils/mediaLinkHelper';

interface PulseMediaVideoCardProps {
  mediaLink: MediaLinkInfo | null;
}

export const PulseMediaVideoCard: React.FC<PulseMediaVideoCardProps> = ({ mediaLink }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>('');
  const [hasImgError, setHasImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const info = mediaLink;

  useEffect(() => {
    if (!info) return;
    setImgSrc('');
    setHasImgError(false);
    setIsLoading(true);

    if (info.thumbnailUrl) {
      setImgSrc(info.thumbnailUrl);
      setIsLoading(false);
    } else {
      setIsLoading(false);
    }
  }, [info]);

  if (!info) return null;

  const extractInstagramId = (url: string) => {
    const match = url.match(/(?:reel|p)\/([a-zA-Z0-9_-]+)/i);
    return match ? match[1] : null;
  };

  const extractTikTokId = (url: string) => {
    const match = url.match(/video\/(\d+)/i);
    return match ? match[1] : null;
  };

  const getEmbedUrl = () => {
    if (info.platform === 'youtube' && info.videoId) {
      return `https://www.youtube.com/embed/${info.videoId}?autoplay=1&rel=0&modestbranding=1&controls=0&showinfo=0&fs=0&iv_load_policy=3`;
    }
    if (info.platform === 'facebook') {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(info.url)}&show_text=false&autoplay=true`;
    }
    if (info.platform === 'instagram') {
      const igId = extractInstagramId(info.url);
      if (igId) return `https://www.instagram.com/reel/${igId}/embed`;
      return `https://www.instagram.com/p/embed`;
    }
    if (info.platform === 'tiktok') {
      const tiktokId = extractTikTokId(info.url);
      if (tiktokId) return `https://www.tiktok.com/embed/v2/${tiktokId}?autoplay=1`;
    }
    return '';
  };

  const embedUrl = getEmbedUrl();

  const handleOpenExternal = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(info.url, '_blank', 'noopener,noreferrer');
  };

  const handleCardClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (embedUrl) {
      setIsPlaying(true);
    } else {
      window.open(info.url, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div
      onDoubleClick={handleOpenExternal}
      className="group relative rounded-2xl overflow-hidden bg-black shadow-lg transition-all duration-300 block select-none w-full aspect-[9/16]"
    >
      {isPlaying && embedUrl ? (
        <div className="relative w-full h-full bg-black">
          <iframe
            src={embedUrl}
            title="Video Player"
            className="w-full h-full border-0 pointer-events-none"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
          {/* Invisible overlay to capture double clicks while playing without interacting with iframe directly */}
          <div 
            className="absolute inset-0 z-10 cursor-pointer" 
            onDoubleClick={handleOpenExternal}
            onClick={(e) => {
              e.stopPropagation();
              // A single click on the overlay when it's already playing.
              // We could pause it, but since we are using a raw iframe with pointer-events-none, 
              // we just let it play. If they double click, it opens YouTube.
            }}
          />
        </div>
      ) : (
        <div onClick={handleCardClick} className="relative w-full h-full cursor-pointer bg-black">
          {isLoading ? (
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <Loader2 className="w-6 h-6 text-cyan-400 animate-spin" />
            </div>
          ) : !hasImgError && imgSrc ? (
            <img
              src={imgSrc}
              alt="Video thumbnail"
              onError={() => setHasImgError(true)}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-4">
              <Play className="w-10 h-10 fill-cyan-400 text-cyan-400" />
            </div>
          )}
          
          <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300" />
          
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-black/50 backdrop-blur-sm border-2 border-white/20 flex items-center justify-center shadow-lg group-hover:bg-cyan-500/20 group-hover:border-cyan-400 transition-all duration-300">
              <Play className="w-7 h-7 text-white fill-white ml-1 group-hover:text-cyan-300 group-hover:fill-cyan-400" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
""")

