import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useWatchHistoryStore } from '../stores/watchHistoryStore';
import { PosterCard } from '../components/cards/PosterCard';
import { Button } from '../components/ui/Button';
import { Bookmark, Clock, History as HistoryIcon, Trash2, Play, Film } from 'lucide-react';

export const LibraryPage: React.FC = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'watchlist' | 'continue' | 'history'>('watchlist');

  const { items: watchlistItems, removeItem: removeWatchlist, clearWatchlist } = useWatchlistStore();
  const { history, clearHistory, removeFromHistory } = useWatchHistoryStore();

  const historyItems = Object.values(history).sort((a, b) => b.updatedAt - a.updatedAt);
  const continueItems = historyItems.filter(
    (item) => item.currentTime > 5 && item.currentTime < (item.duration || 1) * 0.95
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
      {/* Library Title & Tab Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            My Library
          </h1>
          <p className="text-xs sm:text-sm text-vega-textSecondary mt-0.5">
            Your saved titles, watch history, and bookmarks
          </p>
        </div>

        {/* Material 3 Segmented Pill Tabs */}
        <div
          className="flex items-center bg-vega-surface1 p-1 rounded-full border border-white/5 self-start sm:self-auto"
          data-nav-section="library-tabs"
        >
          <button
            type="button"
            data-focusable="true"
            data-nav-section="library-tabs"
            onClick={() => setActiveTab('watchlist')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'watchlist'
                ? 'bg-vega-navPill text-white shadow-sm'
                : 'text-vega-textSecondary hover:text-white'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>Watchlist ({watchlistItems.length})</span>
          </button>

          <button
            type="button"
            data-focusable="true"
            data-nav-section="library-tabs"
            onClick={() => setActiveTab('continue')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'continue'
                ? 'bg-vega-navPill text-white shadow-sm'
                : 'text-vega-textSecondary hover:text-white'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            <span>Continue ({continueItems.length})</span>
          </button>

          <button
            type="button"
            data-focusable="true"
            data-nav-section="library-tabs"
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-vega-navPill text-white shadow-sm'
                : 'text-vega-textSecondary hover:text-white'
            }`}
          >
            <HistoryIcon className="w-3.5 h-3.5" />
            <span>History ({historyItems.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Watchlist */}
      {activeTab === 'watchlist' && (
        <div data-nav-section="watchlist-grid">
          {watchlistItems.length > 0 && (
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={clearWatchlist}
                data-focusable="true"
                data-nav-section="watchlist-grid"
                className="text-xs text-vega-textSecondary hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Watchlist</span>
              </button>
            </div>
          )}

          {watchlistItems.length === 0 ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-vega-surface2 flex items-center justify-center mb-4">
                <Bookmark className="w-8 h-8 text-vega-textSecondary" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">Your Watchlist is Empty</h3>
              <p className="text-xs text-vega-textSecondary max-w-sm mb-6">
                Explore movies and series on Vega and tap the "Add to Library" button to save them here.
              </p>
              <Button variant="primary" onClick={() => navigate('/')}>
                Explore Featured
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
              {watchlistItems.map((item) => (
                <div key={item.link} className="relative group">
                  <PosterCard
                    post={{
                      title: item.title,
                      link: item.link,
                      image: item.image,
                      tag: item.tag,
                    }}
                    navSection="watchlist-grid"
                    className="w-full"
                  />
                  <button
                    type="button"
                    aria-label="Remove from watchlist"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeWatchlist(item.link);
                    }}
                    className="absolute top-2 right-2 p-1.5 rounded-full bg-black/80 hover:bg-vega-error text-white/80 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity z-20"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Continue Watching */}
      {activeTab === 'continue' && (
        <div data-nav-section="continue-grid">
          {continueItems.length === 0 ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-vega-surface2 flex items-center justify-center mb-4">
                <Clock className="w-8 h-8 text-vega-textSecondary" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No Ongoing Playbacks</h3>
              <p className="text-xs text-vega-textSecondary max-w-sm mb-6">
                When you pause a video part-way through, it will automatically appear here so you can resume anytime.
              </p>
              <Button variant="primary" onClick={() => navigate('/')}>
                Start Watching
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {continueItems.map((item) => {
                const progressPct = Math.min(
                  100,
                  Math.round((item.currentTime / (item.duration || 1)) * 100)
                );
                return (
                  <div
                    key={item.id}
                    tabIndex={0}
                    role="button"
                    data-focusable="true"
                    data-nav-section="continue-grid"
                    onClick={() =>
                      navigate(
                        `/player?link=${encodeURIComponent(item.id)}&title=${encodeURIComponent(
                          item.title
                        )}&poster=${encodeURIComponent(item.image)}&provider=${item.providerValue}`
                      )
                    }
                    className="group bg-vega-surface1 hover:bg-vega-surface2 border border-white/5 rounded-2xl p-3 cursor-pointer transition-all duration-200 outline-none"
                  >
                    <div className="relative aspect-video w-full rounded-xl overflow-hidden bg-vega-surface2 mb-3">
                      <img
                        src={item.image}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <div className="w-10 h-10 rounded-full bg-vega-ctaPrimary text-vega-ctaText flex items-center justify-center shadow-lg">
                          <Play className="w-5 h-5 fill-current ml-0.5" />
                        </div>
                      </div>
                      <div className="absolute bottom-0 inset-x-0 h-1 bg-black/80">
                        <div
                          className="h-full bg-vega-ctaPrimary"
                          style={{ width: `${progressPct}%` }}
                        />
                      </div>
                    </div>

                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h4 className="text-sm font-semibold text-white truncate">
                          {item.title}
                        </h4>
                        <p className="text-xs text-vega-textSecondary mt-0.5">
                          {progressPct}% completed
                        </p>
                      </div>
                      <button
                        type="button"
                        aria-label="Remove item"
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFromHistory(item.id);
                        }}
                        className="p-1 rounded-full text-vega-textSecondary hover:text-white hover:bg-white/10"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: History */}
      {activeTab === 'history' && (
        <div data-nav-section="history-grid">
          {historyItems.length > 0 && (
            <div className="flex justify-end mb-4">
              <button
                type="button"
                onClick={clearHistory}
                data-focusable="true"
                data-nav-section="history-grid"
                className="text-xs text-vega-textSecondary hover:text-white flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear All History</span>
              </button>
            </div>
          )}

          {historyItems.length === 0 ? (
            <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
              <div className="w-16 h-16 rounded-full bg-vega-surface2 flex items-center justify-center mb-4">
                <HistoryIcon className="w-8 h-8 text-vega-textSecondary" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">No Watch History</h3>
              <p className="text-xs text-vega-textSecondary max-w-sm mb-6">
                Your watched videos and shows will be recorded here automatically.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {historyItems.map((item) => (
                <div
                  key={item.id}
                  tabIndex={0}
                  role="button"
                  data-focusable="true"
                  data-nav-section="history-grid"
                  onClick={() =>
                    navigate(
                      `/player?link=${encodeURIComponent(item.id)}&title=${encodeURIComponent(
                        item.title
                      )}&poster=${encodeURIComponent(item.image)}&provider=${item.providerValue}`
                    )
                  }
                  className="flex items-center justify-between p-3 sm:p-4 rounded-2xl bg-vega-surface1 hover:bg-vega-surface2 border border-white/5 cursor-pointer transition-all duration-200 group"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-20 sm:w-28 aspect-video rounded-xl overflow-hidden bg-vega-surface2 flex-shrink-0">
                      <img
                        src={item.image}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-sm font-semibold text-white group-hover:text-vega-ctaPrimary transition-colors truncate">
                        {item.title}
                      </h4>
                      <p className="text-xs text-vega-textSecondary mt-0.5">
                        Watched on {new Date(item.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Remove from history"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFromHistory(item.id);
                    }}
                    className="p-2 rounded-full text-vega-textSecondary hover:text-white hover:bg-white/10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
