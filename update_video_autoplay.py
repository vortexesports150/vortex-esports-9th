with open('src/components/PulseMediaVideoCard.tsx', 'w', encoding='utf-8') as f:
    f.write("""import React, { useState, useEffect, useRef } from 'react';
import { Loader2 } from 'lucide-react';
import { MediaLinkInfo } from '../utils/mediaLinkHelper';

interface PulseMediaVideoCardProps {
  mediaLink: MediaLinkInfo | null;
}

export const PulseMediaVideoCard: React.FC<PulseMediaVideoCardProps> = ({ mediaLink }) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [imgSrc, setImgSrc] = useState<string>('');
  const [hasImgError, setHasImgError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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

  // Intersection Observer for Autoplay on Scroll
  useEffect(() => {
    if (!info || !containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsPlaying(true);
          } else {
            setIsPlaying(false);
          }
        });
      },
      { threshold: 0.5 } // Trigger when 50% of the video is visible in the viewport
    );

    observer.observe(containerRef.current);

    return () => {
      if (containerRef.current) {
        observer.unobserve(containerRef.current);
      }
    };
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
      // mute=1 is strictly required by most modern browsers for autoplay to work without prior user interaction
      return `https://www.youtube.com/embed/${info.videoId}?autoplay=1&mute=1&rel=0&modestbranding=1&controls=0&showinfo=0&fs=0&iv_load_policy=3`;
    }
    if (info.platform === 'facebook') {
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(info.url)}&show_text=false&autoplay=true&mute=true`;
    }
    if (info.platform === 'instagram') {
      const igId = extractInstagramId(info.url);
      if (igId) return `https://www.instagram.com/reel/${igId}/embed`;
      return `https://www.instagram.com/p/embed`;
    }
    if (info.platform === 'tiktok') {
      const tiktokId = extractTikTokId(info.url);
      if (tiktokId) return `https://www.tiktok.com/embed/v2/${tiktokId}?autoplay=1&muted=1`;
    }
    return '';
  };

  const embedUrl = getEmbedUrl();

  const handleOpenExternal = () => {
    window.open(info.url, '_blank', 'noopener,noreferrer');
  };

  const handleOverlayClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (clickTimeout.current) {
      clearTimeout(clickTimeout.current);
      clickTimeout.current = null;
      handleOpenExternal();
    } else {
      clickTimeout.current = setTimeout(() => {
        setIsPlaying(!isPlaying);
        clickTimeout.current = null;
      }, 250);
    }
  };

  return (
    <div
      ref={containerRef}
      className="group relative rounded-2xl overflow-hidden bg-black shadow-lg transition-all duration-300 block select-none w-[80%] mx-auto aspect-[9/16]"
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
          {/* Invisible overlay captures double click for external redirect and single click for play/pause */}
          <div 
            className="absolute inset-0 z-10 cursor-pointer" 
            onClick={handleOverlayClick}
          />
        </div>
      ) : (
        <div onClick={handleOverlayClick} className="relative w-full h-full cursor-pointer bg-black">
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
            <div className="w-full h-full flex flex-col items-center justify-center p-4" />
          )}
        </div>
      )}
    </div>
  );
};
""")
