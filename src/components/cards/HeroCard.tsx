import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Play, Info as InfoIcon, Bookmark, Check } from 'lucide-react';
import { Post } from '../../lib/providers/types';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { useWatchlistStore } from '../../stores/watchlistStore';
import { useProviderStore } from '../../stores/providerStore';

interface HeroCardProps {
  posts: Post[];
  navSection?: string;
}

export const HeroCard: React.FC<HeroCardProps> = ({ posts, navSection = 'hero' }) => {
  const navigate = useNavigate();
  const [currentIndex, setCurrentIndex] = useState(0);

  const activeProvider = useProviderStore((state) => state.activeProvider);
  const { isInWatchlist, toggleItem } = useWatchlistStore();

  const currentPost = posts[currentIndex] || null;

  // Auto-advance hero carousel every 7 seconds
  useEffect(() => {
    if (posts.length <= 1) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % posts.length);
    }, 7000);
    return () => clearInterval(interval);
  }, [posts.length]);

  if (!currentPost) return null;

  const inWatchlist = isInWatchlist(currentPost.link);

  const handleWatchNow = () => {
    navigate(`/detail?link=${encodeURIComponent(currentPost.link)}&autoplay=true`);
  };

  const handleDetails = () => {
    navigate(`/detail?link=${encodeURIComponent(currentPost.link)}`);
  };

  const handleToggleWatchlist = () => {
    toggleItem({
      link: currentPost.link,
      title: currentPost.title,
      image: currentPost.image,
      providerValue: activeProvider?.value || 'unknown',
      tag: currentPost.tag || currentPost.cornerTag,
    });
  };

  return (
    <div
      className="relative w-full aspect-[16/9] max-h-[68vh] min-h-[380px] sm:min-h-[460px] overflow-hidden rounded-3xl mb-8 group"
      data-nav-section={navSection}
    >
      {/* Background Poster Image */}
      <div className="absolute inset-0">
        <img
          key={currentPost.link}
          src={currentPost.image}
          alt={currentPost.title}
          className="w-full h-full object-cover object-center transform scale-100 group-hover:scale-105 transition-transform duration-1000 ease-out"
        />

        {/* Dramatic Cinematic Vignette Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/50 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />
      </div>

      {/* Content overlay */}
      <div className="absolute inset-0 flex flex-col justify-end p-6 sm:p-12 md:p-16 z-10 max-w-3xl">
        <div className="space-y-3">
          {/* Badge */}
          <div className="flex items-center gap-2">
            <Badge variant="frosted" className="font-semibold text-xs tracking-wider uppercase">
              {currentPost.cornerTag || currentPost.tag || 'Featured'}
            </Badge>
            {activeProvider ? (
              <Badge variant="solid" className="text-white/80">
                {activeProvider.display_name}
              </Badge>
            ) : null}
          </div>

          {/* Hero Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white line-clamp-2 leading-tight drop-shadow-md">
            {currentPost.title}
          </h1>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3 pt-3">
            <Button
              variant="primary"
              size="lg"
              navSection={navSection}
              onClick={handleWatchNow}
              className="gap-2 shadow-xl hover:shadow-2xl"
            >
              <Play className="w-5 h-5 fill-vega-ctaText" />
              <span>Watch Now</span>
            </Button>

            <Button
              variant="secondary"
              size="lg"
              navSection={navSection}
              onClick={handleDetails}
              className="gap-2 backdrop-blur-md"
            >
              <InfoIcon className="w-5 h-5" />
              <span>Details</span>
            </Button>

            <Button
              variant="secondary"
              size="icon"
              navSection={navSection}
              onClick={handleToggleWatchlist}
              title={inWatchlist ? 'In Library' : 'Add to Library'}
              className="backdrop-blur-md"
            >
              {inWatchlist ? (
                <Check className="w-5 h-5 text-vega-success" />
              ) : (
                <Bookmark className="w-5 h-5" />
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Carousel Pagination Capsule / Dots */}
      {posts.length > 1 && (
        <div className="absolute bottom-6 right-6 sm:right-12 z-20 flex items-center gap-2">
          {posts.map((_, idx) => (
            <button
              key={idx}
              type="button"
              aria-label={`Go to slide ${idx + 1}`}
              onClick={() => setCurrentIndex(idx)}
              data-focusable="true"
              data-nav-section={navSection}
              className={`h-2 rounded-full transition-all duration-300 ${
                idx === currentIndex
                  ? 'w-7 bg-vega-ctaPrimary'
                  : 'w-2 bg-white/30 hover:bg-white/60'
              }`}
            />
          ))}
        </div>
      )}
    </div>
  );
};
