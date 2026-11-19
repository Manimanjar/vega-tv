import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useContentStore } from '../stores/contentStore';
import { useProviderStore } from '../stores/providerStore';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useWatchHistoryStore } from '../stores/watchHistoryStore';
import { DetailSkeleton } from '../components/skeletons/DetailSkeleton';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import {
  Play,
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  Film,
  Tv,
  Clock,
  Layers,
} from 'lucide-react';

export const DetailPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const link = searchParams.get('link') || '';
  const autoPlay = searchParams.get('autoplay') === 'true';

  const [isSynopsisExpanded, setIsSynopsisExpanded] = useState(false);
  const [selectedSeasonIdx, setSelectedSeasonIdx] = useState(0);

  const activeProvider = useProviderStore((state) => state.activeProvider);
  const { currentDetail, isLoadingDetail, loadDetail } = useContentStore();
  const { isInWatchlist, toggleItem } = useWatchlistStore();
  const getProgress = useWatchHistoryStore((state) => state.getProgress);

  useEffect(() => {
    if (link) {
      loadDetail(link).then((detail) => {
        if (detail && autoPlay) {
          // Trigger immediate playback for movie or first episode
          handlePlay(detail);
        }
      });
    }
  }, [link, loadDetail, autoPlay]);

  if (isLoadingDetail || !currentDetail) {
    return <DetailSkeleton />;
  }

  const isSeries = currentDetail.type === 'series' || (currentDetail.linkList && currentDetail.linkList.length > 1);
  const inWatchlist = isInWatchlist(link);
  const progress = getProgress(link);

  const handlePlay = (detail: typeof currentDetail, directLink?: string, episodeTitle?: string) => {
    const streamLink = directLink || link;
    const playTitle = episodeTitle
      ? `${detail.title} - ${episodeTitle}`
      : detail.title;

    navigate(
      `/player?link=${encodeURIComponent(streamLink)}&title=${encodeURIComponent(
        playTitle
      )}&poster=${encodeURIComponent(detail.poster || detail.image)}&provider=${
        activeProvider?.value || 'unknown'
      }&type=${detail.type || 'movie'}&infoUrl=${encodeURIComponent(link)}`
    );
  };

  const handleToggleWatchlist = () => {
    toggleItem({
      link,
      title: currentDetail.title,
      image: currentDetail.poster || currentDetail.image,
      providerValue: activeProvider?.value || 'unknown',
      type: currentDetail.type,
    });
  };

  const backdropImage = currentDetail.image || currentDetail.poster;
  const posterImage = currentDetail.poster || currentDetail.image;

  return (
    <div className="min-h-screen pb-24">
      {/* Hero Backdrop Banner */}
      <div className="relative w-full aspect-[21/9] min-h-[340px] max-h-[550px] overflow-hidden">
        {backdropImage ? (
          <img
            src={backdropImage}
            alt=""
            className="w-full h-full object-cover object-center filter blur-xs brightness-75 scale-105"
          />
        ) : (
          <div className="w-full h-full bg-vega-surface1" />
        )}

        {/* Dramatic Black Vignette Gradients */}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/60 to-black/30" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent" />

        {/* Back Floating Button */}
        <button
          type="button"
          aria-label="Back"
          data-focusable="true"
          data-nav-section="detail-top"
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 z-20 p-2.5 rounded-full bg-black/50 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>

      {/* Main Info Box */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 -mt-32 sm:-mt-48 relative z-10 flex flex-col md:flex-row gap-8 items-start">
        {/* Poster Card */}
        <div className="flex-shrink-0 w-44 sm:w-56 md:w-64 rounded-3xl overflow-hidden shadow-2xl bg-vega-surface1 border border-white/10 aspect-poster">
          <img
            src={posterImage}
            alt={currentDetail.title}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Meta Content */}
        <div className="flex-1 space-y-4 pt-2 md:pt-16" data-nav-section="detail-actions">
          {/* Tags / Badges */}
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="accent" className="font-bold uppercase tracking-wider text-[11px]">
              {isSeries ? 'Series' : 'Movie'}
            </Badge>

            {activeProvider && (
              <Badge variant="solid" className="text-white/80">
                {activeProvider.display_name}
              </Badge>
            )}

            {currentDetail.year && (
              <Badge variant="frosted">{currentDetail.year}</Badge>
            )}

            {currentDetail.rating && (
              <Badge variant="frosted" className="font-semibold text-amber-400">
                ★ {currentDetail.rating}
              </Badge>
            )}
          </div>

          {/* Title */}
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
            {currentDetail.title}
          </h1>

          {/* Action CTAs */}
          <div className="flex flex-wrap items-center gap-3.5 pt-2">
            <Button
              variant="primary"
              size="lg"
              data-focusable="true"
              navSection="detail-actions"
              onClick={() => {
                if (
                  currentDetail.linkList?.[0]?.directLinks?.[0]
                ) {
                  const firstLink = currentDetail.linkList[0].directLinks[0];
                  handlePlay(currentDetail, firstLink.link, firstLink.title);
                } else {
                  handlePlay(currentDetail);
                }
              }}
              className="gap-2.5 shadow-xl hover:shadow-2xl"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>{progress ? 'Resume Play' : 'Play Now'}</span>
            </Button>

            <Button
              variant="secondary"
              size="lg"
              data-focusable="true"
              navSection="detail-actions"
              onClick={handleToggleWatchlist}
              className="gap-2"
            >
              {inWatchlist ? (
                <>
                  <Check className="w-5 h-5 text-vega-success" />
                  <span>In Library</span>
                </>
              ) : (
                <>
                  <Bookmark className="w-5 h-5" />
                  <span>Add to Library</span>
                </>
              )}
            </Button>
          </div>

          {/* Synopsis */}
          {currentDetail.synopsis && (
            <div className="pt-2">
              <p
                className={`text-sm sm:text-base text-vega-textSecondary leading-relaxed transition-all ${
                  isSynopsisExpanded ? '' : 'line-clamp-3'
                }`}
              >
                {currentDetail.synopsis}
              </p>
              {currentDetail.synopsis.length > 200 && (
                <button
                  type="button"
                  data-focusable="true"
                  data-nav-section="detail-actions"
                  onClick={() => setIsSynopsisExpanded((p) => !p)}
                  className="mt-1 text-xs font-semibold text-vega-ctaPrimary hover:underline flex items-center gap-1"
                >
                  <span>{isSynopsisExpanded ? 'Show less' : 'Read more'}</span>
                  {isSynopsisExpanded ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Series Seasons & Episodes List */}
      {currentDetail.linkList && currentDetail.linkList.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-12" data-nav-section="detail-episodes">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Tv className="w-5 h-5 text-vega-textSecondary" />
              <span>Episodes & Sources</span>
            </h2>

            {/* Season Selector Tabs */}
            {currentDetail.linkList.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                {currentDetail.linkList.map((season, idx) => (
                  <button
                    key={idx}
                    type="button"
                    data-focusable="true"
                    data-nav-section="detail-episodes"
                    onClick={() => setSelectedSeasonIdx(idx)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition-all ${
                      selectedSeasonIdx === idx
                        ? 'bg-vega-navPill text-white shadow-sm'
                        : 'bg-vega-surface2 text-vega-textSecondary hover:text-white'
                    }`}
                  >
                    {season.title || `Season ${idx + 1}`}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Episode rows for selected group */}
          <div className="space-y-2.5">
            {currentDetail.linkList[selectedSeasonIdx]?.directLinks?.map((ep, epIdx) => {
              const epProgress = getProgress(ep.link);
              const watchedPct =
                epProgress && epProgress.duration > 0
                  ? Math.round((epProgress.currentTime / epProgress.duration) * 100)
                  : 0;

              return (
                <div
                  key={epIdx}
                  tabIndex={0}
                  role="button"
                  data-focusable="true"
                  data-nav-section="detail-episodes"
                  onClick={() => handlePlay(currentDetail, ep.link, ep.title)}
                  className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-vega-surface1 hover:bg-vega-surface2 border border-white/5 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-vega-surface3 flex items-center justify-center flex-shrink-0 group-hover:bg-vega-ctaPrimary group-hover:text-vega-ctaText transition-colors">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </div>

                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white group-hover:text-vega-ctaPrimary transition-colors truncate">
                        {ep.title || `Episode ${epIdx + 1}`}
                      </h4>
                      {watchedPct > 0 && (
                        <p className="text-[11px] text-vega-textSecondary">
                          Watched {watchedPct}%
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {watchedPct > 0 && (
                      <div className="w-16 h-1 bg-white/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-vega-ctaPrimary rounded-full"
                          style={{ width: `${watchedPct}%` }}
                        />
                      </div>
                    )}
                    <span className="text-xs font-semibold text-vega-textSecondary group-hover:text-white">
                      Play ›
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
