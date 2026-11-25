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
  Layers,
  Zap,
  HardDrive,
  Volume2,
  Sparkles,
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

  // Reset season index whenever navigating between different titles
  useEffect(() => {
    setSelectedSeasonIdx(0);
  }, [link]);

  useEffect(() => {
    if (link) {
      loadDetail(link).then((detail) => {
        if (detail && autoPlay) {
          handlePlay(detail);
        }
      });
    }
  }, [link, loadDetail, autoPlay]);

  if (isLoadingDetail) {
    return <DetailSkeleton />;
  }

  if (!currentDetail) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
        <Film className="w-16 h-16 text-vega-textSecondary mb-4" />
        <h2 className="text-xl font-bold text-white mb-2">Details Unavailable</h2>
        <p className="text-sm text-vega-textSecondary mb-6">
          Could not load details for this title from {activeProvider?.display_name || 'this provider'}. You can try reloading or switch to another provider.
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3">
          <Button variant="primary" onClick={() => loadDetail(link)}>
            Retry
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  // A title is a Series ONLY if its type is 'series' or if any link has an episodesLink
  const hasEpisodesLink = Boolean(currentDetail.linkList?.some((l) => Boolean(l.episodesLink)));
  const isSeries = currentDetail.type === 'series' || hasEpisodesLink;
  const inWatchlist = isInWatchlist(link);
  const progress = getProgress(link);

  // Derive the best playable direct stream for movies (defaulting to highest resolution: 1080p > 720p > 480p)
  const bestPlayable = (() => {
    if (!currentDetail.linkList || currentDetail.linkList.length === 0 || isSeries) return null;
    const candidates: { link: string; title: string; qualityLabel: string; score: number }[] = [];

    currentDetail.linkList.forEach((group) => {
      const groupTitle = group.title || '';
      let score = 50;
      let qualityLabel = group.quality || 'Direct Stream';

      if (/2160p|4k/i.test(groupTitle)) {
        score = 400;
        qualityLabel = '4K UHD';
      } else if (/1080p/i.test(groupTitle)) {
        score = 300;
        qualityLabel = '1080p FHD';
      } else if (/720p/i.test(groupTitle)) {
        score = 200;
        qualityLabel = '720p HD';
      } else if (/480p/i.test(groupTitle)) {
        score = 100;
        qualityLabel = '480p SD';
      }

      if (/hevc|10bit|x265/i.test(groupTitle)) score += 20;

      if (group.directLinks && group.directLinks.length > 0) {
        group.directLinks.forEach((dl) => {
          candidates.push({
            link: dl.link,
            title: dl.title || groupTitle,
            qualityLabel,
            score,
          });
        });
      } else if (group.link) {
        candidates.push({
          link: group.link,
          title: groupTitle,
          qualityLabel,
          score,
        });
      }
    });

    if (candidates.length === 0) return null;
    candidates.sort((a, b) => b.score - a.score);
    return candidates[0];
  })();

  // Parse movie quality tiers matching Vega App
  const parsedQualityGroups = (() => {
    if (!currentDetail.linkList || isSeries) return [];

    return currentDetail.linkList.map((group, idx) => {
      const rawTitle = group.title || `Quality ${idx + 1}`;

      let resolution = group.quality || 'Direct Stream';
      let resBadge = group.quality || 'Direct';
      if (/2160p|4k/i.test(rawTitle)) {
        resolution = '4K Ultra HD (2160p)';
        resBadge = '4K UHD';
      } else if (/1080p/i.test(rawTitle)) {
        resolution = 'Full HD (1080p)';
        resBadge = '1080p FHD';
      } else if (/720p/i.test(rawTitle)) {
        resolution = 'HD (720p)';
        resBadge = '720p HD';
      } else if (/480p/i.test(rawTitle)) {
        resolution = 'SD (480p)';
        resBadge = '480p SD';
      }

      const sizeMatch = rawTitle.match(/\[(.*?)\]/);
      const size = sizeMatch ? sizeMatch[1] : undefined;

      const audioMatch = rawTitle.match(/\{(.*?)\}/);
      const audio = audioMatch ? audioMatch[1] : undefined;

      let codec = '';
      if (/10bit/i.test(rawTitle)) codec = '10-Bit HEVC';
      else if (/hevc|x265/i.test(rawTitle)) codec = 'HEVC';
      else if (/x264|h\.264/i.test(rawTitle)) codec = 'x264';

      const directLinks =
        group.directLinks && group.directLinks.length > 0
          ? group.directLinks
          : group.link
          ? [{ title: 'Play Direct Server', link: group.link }]
          : [];

      return {
        rawTitle,
        resolution,
        resBadge,
        size,
        audio,
        codec,
        directLinks,
      };
    });
  })();

  const handlePlay = (detail: typeof currentDetail, directLink?: string, episodeTitle?: string) => {
    // If series and no directLink, try to pick first episode
    const seriesFirstEp = isSeries ? detail.linkList?.[0]?.directLinks?.[0] : null;
    const target = directLink || bestPlayable?.link || seriesFirstEp?.link || link;
    const playTitle = episodeTitle
      ? `${detail.title} - ${episodeTitle}`
      : seriesFirstEp && !directLink
      ? `${detail.title} - ${seriesFirstEp.title || 'Episode 1'}`
      : bestPlayable && !directLink
      ? `${detail.title} (${bestPlayable.qualityLabel})`
      : detail.title;

    navigate(
      `/player?link=${encodeURIComponent(target)}&title=${encodeURIComponent(
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

            {bestPlayable && (
              <Badge variant="frosted" className="text-emerald-400 font-semibold flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                <span>{bestPlayable.qualityLabel} Available</span>
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
                if (bestPlayable) {
                  handlePlay(currentDetail, bestPlayable.link, bestPlayable.title);
                } else if (isSeries) {
                  const firstEp = currentDetail.linkList?.[0]?.directLinks?.[0];
                  if (firstEp) {
                    handlePlay(currentDetail, firstEp.link, firstEp.title);
                  } else {
                    const el = document.querySelector('[data-nav-section="detail-episodes"]');
                    if (el) {
                      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }
                  }
                } else {
                  handlePlay(currentDetail);
                }
              }}
              className="gap-2.5 shadow-xl hover:shadow-2xl"
            >
              <Play className="w-5 h-5 fill-current" />
              <span>
                {progress
                  ? 'Resume Play'
                  : bestPlayable
                  ? `Play in ${bestPlayable.qualityLabel}`
                  : isSeries && currentDetail.linkList?.[0]?.directLinks?.[0]
                  ? 'Play Season 1 Ep 1'
                  : 'Play Now'}
              </span>
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

      {/* MOVIE: Select Quality & Direct Server Sources (Exact Vega App Parity) */}
      {!isSeries && parsedQualityGroups.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-12" data-nav-section="detail-qualities">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Layers className="w-5 h-5 text-vega-ctaPrimary" />
              <span>Available Qualities & Direct Servers</span>
            </h2>
            <span className="text-xs text-vega-textSecondary">
              {parsedQualityGroups.length} Quality {parsedQualityGroups.length === 1 ? 'Tier' : 'Tiers'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {parsedQualityGroups.map((grp, qIdx) => (
              <div
                key={qIdx}
                className="p-4 sm:p-5 rounded-2xl bg-vega-surface1/80 border border-white/10 hover:border-white/20 transition-all space-y-3"
              >
                {/* Quality Header Bar */}
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-vega-ctaPrimary/20 text-vega-ctaPrimary border border-vega-ctaPrimary/30 font-bold text-xs">
                      {grp.resBadge}
                    </span>
                    <span className="text-sm font-bold text-white">
                      {grp.resolution}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    {grp.size && (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-white/5 text-[11px] font-semibold text-white/90">
                        <HardDrive className="w-3 h-3 text-vega-textSecondary" />
                        {grp.size}
                      </span>
                    )}

                    {grp.codec && (
                      <span className="px-2 py-0.5 rounded-md bg-white/5 text-[11px] font-semibold text-vega-textSecondary">
                        {grp.codec}
                      </span>
                    )}
                  </div>
                </div>

                {/* Audio Details Pill */}
                {grp.audio && (
                  <div className="flex items-center gap-1.5 text-xs text-vega-textSecondary">
                    <Volume2 className="w-3.5 h-3.5 text-vega-ctaPrimary" />
                    <span>Dual / Multi Audio: <strong className="text-white/80">{grp.audio}</strong></span>
                  </div>
                )}

                {/* Direct Server Buttons */}
                <div className="pt-1 flex flex-wrap gap-2">
                  {grp.directLinks.map((dl, dlIdx) => (
                    <button
                      key={dlIdx}
                      type="button"
                      data-focusable="true"
                      data-nav-section="detail-qualities"
                      onClick={() => handlePlay(currentDetail, dl.link, `${grp.resBadge} - ${dl.title}`)}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-vega-surface2 hover:bg-vega-ctaPrimary hover:text-vega-ctaText text-white text-xs font-semibold transition-all group active:scale-95 border border-white/5"
                    >
                      <Zap className="w-3.5 h-3.5 text-vega-ctaPrimary group-hover:text-vega-ctaText fill-current" />
                      <span className="truncate max-w-[200px]">{dl.title || `Server ${dlIdx + 1}`}</span>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SERIES: Seasons & Episodes List */}
      {isSeries && currentDetail.linkList && currentDetail.linkList.length > 0 && (
        <div className="max-w-6xl mx-auto px-4 sm:px-8 mt-12" data-nav-section="detail-episodes">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Tv className="w-5 h-5 text-vega-textSecondary" />
              <span>Episodes & Seasons</span>
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

          {/* Episode rows for selected season */}
          <div className="space-y-2.5">
            {(!currentDetail.linkList[selectedSeasonIdx]?.directLinks || currentDetail.linkList[selectedSeasonIdx]?.directLinks?.length === 0) && (
              <div className="p-8 rounded-2xl bg-vega-surface1 text-center border border-white/5 flex flex-col items-center gap-3">
                <p className="text-sm font-semibold text-white">
                  No direct episode streams extracted for {currentDetail.linkList[selectedSeasonIdx]?.title || 'this season'}.
                </p>
                <p className="text-xs text-vega-textSecondary max-w-md">
                  This provider requires web browser interaction for episode listings. Switch to MultiStream in the top bar for instant 1080p series streaming.
                </p>
                <div className="flex items-center gap-3 mt-1">
                  <Button
                    variant="primary"
                    size="sm"
                    data-focusable="true"
                    navSection="detail-episodes"
                    onClick={() => {
                      useProviderStore.getState().setActiveProvider('autoEmbed');
                      loadDetail(link);
                    }}
                  >
                    Switch to MultiStream
                  </Button>
                </div>
              </div>
            )}

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
