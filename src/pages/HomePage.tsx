import React, { useEffect, useState } from 'react';
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
import { ProxySettingsModal } from '../components/modals/ProxySettingsModal';
import { smartProxy } from '../lib/providers/smartProxy';
import { Play, Sparkles, RefreshCw, Radio, Layers } from 'lucide-react';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [proxyModalOpen, setProxyModalOpen] = useState(false);

  const { activeProvider, isLoading: isProviderLoading } = useProviderStore();
  const {
    catalogs,
    categoryPosts,
    heroPosts,
    activeCategoryFilter,
    isLoadingHome,
    loadHomeContent,
    error,
  } = useContentStore();

  const continueWatching = useWatchHistoryStore((state) => state.getContinueWatchingList());

  const [proxyOnline, setProxyOnline] = useState(false);
  const [proxyUrl, setProxyUrl] = useState('');

  useEffect(() => {
    return smartProxy.subscribe((url: string, isConn: boolean) => {
      setProxyUrl(url);
      setProxyOnline(isConn);
    });
  }, []);

  useEffect(() => {
    if (activeProvider?.value) {
      loadHomeContent();
    }
  }, [activeProvider?.value]);

  // Loading skeleton shown while initial content is loading
  if ((isLoadingHome || isProviderLoading) && heroPosts.length === 0) {
    return (
      <div className="pt-2 pb-24">
        <HeroSkeleton />
        <div className="px-4 sm:px-8 space-y-8 mt-6">
          <div>
            <div className="h-6 w-48 bg-vega-surface1 rounded mb-4 animate-pulse" />
            <div className="flex gap-4 overflow-hidden">
              <PosterSkeleton count={6} />
            </div>
          </div>
          <div>
            <div className="h-6 w-48 bg-vega-surface1 rounded mb-4 animate-pulse" />
            <div className="flex gap-4 overflow-hidden">
              <PosterSkeleton count={6} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Filter catalogs based on selected category chip if any
  const displayedCatalogs = activeCategoryFilter
    ? catalogs.filter((c) => c.filter === activeCategoryFilter)
    : catalogs;

  const hasAnyPosts = displayedCatalogs.some(
    (cat) => (categoryPosts[cat.filter] || []).length > 0
  );

  return (
    <div className="min-h-screen pb-24">
      {/* Proxy Quick Status Bar for TV & Mobile */}
      <div className="px-4 sm:px-8 pt-3 pb-2 flex items-center justify-between gap-4">
        <button
          type="button"
          onClick={() => setProxyModalOpen(true)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
            proxyOnline
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
              : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20 shadow-lg'
          }`}
          data-focusable="true"
        >
          <span
            className={`w-2 h-2 rounded-full ${
              proxyOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span>
            {proxyOnline
              ? 'Streaming Proxy: Online'
              : 'Streaming Proxy: Tap to Connect (Smart TV / Mobile)'}
          </span>
          <Radio className="w-3.5 h-3.5 ml-0.5 opacity-70" />
        </button>

        <div className="text-xs text-white/50 flex items-center gap-2">
          <span className="hidden sm:inline">Active Provider:</span>
          <span className="font-semibold text-white px-2 py-0.5 rounded bg-white/5 border border-white/10">
            {activeProvider?.display_name || 'VMovies'}
          </span>
        </div>
      </div>

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
      {displayedCatalogs.map((cat, idx) => {
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
            {posts.slice(0, 18).map((post, pIdx) => (
              <PosterCard
                key={`${post.link}-${pIdx}`}
                post={post}
                navSection={`cat-row-${idx}`}
              />
            ))}
          </ScrollRow>
        );
      })}

      {/* Fallback Banner if all categories currently empty and not loading */}
      {!hasAnyPosts && !isLoadingHome && (
        <div className="min-h-[55vh] flex flex-col items-center justify-center text-center p-6 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-vega-surface2 flex items-center justify-center mb-4 text-vega-ctaPrimary shadow-xl border border-white/5">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">
            {error ? 'Content Loading Notice' : 'Ready to Stream'}
          </h3>
          <p className="text-xs sm:text-sm text-vega-textSecondary mb-6 leading-relaxed">
            {error ||
              `Currently selected: ${activeProvider?.display_name || 'Vega'}. Ensure your proxy is running or choose another streaming provider.`}
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button
              variant="primary"
              onClick={() => loadHomeContent()}
              className="gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Retry Feeds</span>
            </Button>
            <Button
              variant="secondary"
              onClick={() => setProxyModalOpen(true)}
              className="gap-2"
            >
              <Radio className="w-4 h-4 text-emerald-400" />
              <span>Proxy Setup</span>
            </Button>
          </div>
        </div>
      )}

      {/* Proxy Settings Modal */}
      <ProxySettingsModal
        isOpen={proxyModalOpen}
        onClose={() => setProxyModalOpen(false)}
      />
    </div>
  );
};
