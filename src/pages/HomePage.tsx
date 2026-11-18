import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContentStore } from '../stores/contentStore';
import { useProviderStore } from '../stores/providerStore';
import { useWatchHistoryStore } from '../stores/watchHistoryStore';
import { HeroCard } from '../components/cards/HeroCard';
import { PosterCard } from '../components/cards/PosterCard';
import { ScrollRow } from '../components/ui/ScrollRow';
import { HeroSkeleton } from '../components/skeletons/HeroSkeleton';
import { PosterSkeleton } from '../components/skeletons/PosterSkeleton';
import { Button } from '../components/ui/Button';
import { AlertCircle, Film, RefreshCw, Play } from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();

  const { activeProvider, isLoading: isProviderLoading } = useProviderStore();
  const {
    catalogs,
    categoryPosts,
    heroPosts,
    isLoadingHome,
    error,
    loadHomeContent,
  } = useContentStore();

  const continueWatching = useWatchHistoryStore((state) => state.getContinueWatchingList());

  useEffect(() => {
    if (activeProvider) {
      loadHomeContent();
    }
  }, [activeProvider, loadHomeContent]);

  // Loading state
  if (isProviderLoading || (isLoadingHome && heroPosts.length === 0)) {
    return (
      <div className="pt-2 pb-16">
        <HeroSkeleton />
        <div className="px-4 sm:px-8 space-y-8">
          <div>
            <div className="h-6 w-48 bg-vega-surface1 rounded mb-4" />
            <div className="flex gap-4 overflow-hidden">
              <PosterSkeleton count={6} />
            </div>
          </div>
          <div>
            <div className="h-6 w-48 bg-vega-surface1 rounded mb-4" />
            <div className="flex gap-4 overflow-hidden">
              <PosterSkeleton count={6} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Error state
  if (error && heroPosts.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-vega-surface2 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-vega-error" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Unable to Load Content</h2>
        <p className="text-sm text-vega-textSecondary max-w-md mb-6 leading-relaxed">
          {error}
        </p>
        <div className="flex gap-3">
          <Button variant="primary" onClick={() => loadHomeContent()}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <Button variant="secondary" onClick={() => navigate('/settings')}>
            Configure CORS Proxy
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12">
      {/* Featured Hero Carousel */}
      {heroPosts.length > 0 && <HeroCard posts={heroPosts} />}

      {/* Continue Watching Row */}
      {continueWatching.length > 0 && (
        <ScrollRow
          title="Continue Watching"
          subtitle="Pick up where you left off"
          onSeeAll={() => navigate('/library')}
          navSection="continue-watching"
        >
          {continueWatching.map((item) => {
            const progressPercent = Math.min(
              100,
              Math.round((item.currentTime / (item.duration || 1)) * 100)
            );
            return (
              <div
                key={item.id}
                tabIndex={0}
                role="button"
                data-focusable="true"
                data-nav-section="continue-watching"
                onClick={() =>
                  navigate(
                    `/player?link=${encodeURIComponent(item.id)}&title=${encodeURIComponent(
                      item.title
                    )}&poster=${encodeURIComponent(item.image)}&provider=${item.providerValue}`
                  )
                }
                className="group flex-shrink-0 w-52 sm:w-64 cursor-pointer outline-none transition-all duration-200"
              >
                <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-vega-surface1 shadow-card group-hover:shadow-2xl">
                  <img
                    src={item.image}
                    alt={item.title}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />

                  {/* Play badge */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 rounded-full bg-white/30 backdrop-blur-md flex items-center justify-center transform group-hover:scale-110 transition-transform">
                      <Play className="w-5 h-5 fill-white text-white ml-0.5" />
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="absolute bottom-0 inset-x-0 h-1.5 bg-black/70">
                    <div
                      className="h-full bg-vega-ctaPrimary"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 px-1">
                  <h4 className="text-xs sm:text-sm font-semibold text-white truncate">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-vega-textSecondary">
                    {progressPercent}% watched
                  </p>
                </div>
              </div>
            );
          })}
        </ScrollRow>
      )}

      {/* Catalog Categories Horizontal Rows */}
      {catalogs.map((cat, idx) => {
        const posts = categoryPosts[cat.filter] || [];
        if (posts.length === 0) return null;

        return (
          <ScrollRow
            key={cat.filter || `cat-${idx}`}
            title={cat.title}
            onSeeAll={() =>
              navigate(
                `/category?filter=${encodeURIComponent(cat.filter)}&title=${encodeURIComponent(
                  cat.title
                )}`
              )
            }
            navSection={`cat-row-${idx}`}
          >
            {posts.slice(0, 16).map((post, pIdx) => (
              <PosterCard
                key={`${post.link}-${pIdx}`}
                post={post}
                navSection={`cat-row-${idx}`}
              />
            ))}
          </ScrollRow>
        );
      })}

      {/* Empty State if provider has no content */}
      {!isLoadingHome && catalogs.length === 0 && (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
          <Film className="w-12 h-12 text-vega-textSecondary mb-3" />
          <h3 className="text-lg font-bold text-white mb-1">No content found</h3>
          <p className="text-xs text-vega-textSecondary mb-4">
            Try switching to another provider in the top bar.
          </p>
          <Button variant="secondary" onClick={() => navigate('/settings')}>
            Manage Providers
          </Button>
        </div>
      )}
    </div>
  );
};
