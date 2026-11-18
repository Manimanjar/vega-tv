import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FocusableCard } from '../ui/FocusableCard';
import { Badge } from '../ui/Badge';
import { Post } from '../../lib/providers/types';
import { useWatchHistoryStore } from '../../stores/watchHistoryStore';
import { Play } from 'lucide-react';

interface PosterCardProps {
  post: Post;
  navSection?: string;
  className?: string;
}

export const PosterCard: React.FC<PosterCardProps> = ({
  post,
  navSection,
  className = '',
}) => {
  const navigate = useNavigate();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  const progress = useWatchHistoryStore((state) => state.getProgress(post.link));

  const handleClick = () => {
    // Navigate to detail page with encoded link
    navigate(`/detail?link=${encodeURIComponent(post.link)}`);
  };

  const progressPercentage =
    progress && progress.duration > 0
      ? Math.min(100, Math.round((progress.currentTime / progress.duration) * 100))
      : 0;

  // Fallback image if provider returns empty or broken image
  const displayImage =
    !hasError && post.image
      ? post.image
      : 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=500&auto=format&fit=crop&q=60';

  return (
    <FocusableCard
      navSection={navSection}
      onClick={handleClick}
      className={`flex-shrink-0 w-36 sm:w-44 md:w-48 lg:w-52 transition-all duration-300 ${className}`}
    >
      <div className="relative aspect-poster w-full rounded-2xl overflow-hidden bg-vega-surface1 shadow-card group-hover:shadow-2xl transition-all duration-300">
        {/* Placeholder shimmer before image loads */}
        {!imageLoaded && (
          <div className="absolute inset-0 skeleton-shimmer z-0" />
        )}

        <img
          src={displayImage}
          alt={post.title}
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setHasError(true);
            setImageLoaded(true);
          }}
          className={`w-full h-full object-cover transition-transform duration-500 group-hover:scale-105 ${
            imageLoaded ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Subtle vignette gradient */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-70 group-hover:opacity-90 transition-opacity" />

        {/* Top Badges */}
        <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between pointer-events-none z-10">
          {post.tag || post.cornerTag ? (
            <Badge variant="frosted" className="text-[11px] font-medium">
              {post.cornerTag || post.tag}
            </Badge>
          ) : <div />}

          {/* Quick Play icon on hover */}
          <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <Play className="w-3.5 h-3.5 fill-white text-white ml-0.5" />
          </div>
        </div>

        {/* Resume progress bar */}
        {progressPercentage > 0 && (
          <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/60 z-10">
            <div
              className="h-full bg-vega-ctaPrimary rounded-r"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
        )}
      </div>

      {/* Title & metadata */}
      <div className="pt-2.5 px-1">
        <h3
          title={post.title}
          className="text-xs sm:text-sm font-semibold text-white/90 group-hover:text-white line-clamp-2 leading-snug transition-colors"
        >
          {post.title}
        </h3>
        {progressPercentage > 0 && (
          <p className="text-[11px] text-vega-textSecondary mt-0.5 font-medium">
            Resume ({progressPercentage}%)
          </p>
        )}
      </div>
    </FocusableCard>
  );
};
