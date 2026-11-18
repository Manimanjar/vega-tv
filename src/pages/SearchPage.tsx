import React, { useState, useEffect, useRef } from 'react';
import { SearchInput } from '../components/ui/SearchInput';
import { PosterCard } from '../components/cards/PosterCard';
import { PosterSkeleton } from '../components/skeletons/PosterSkeleton';
import { useContentStore } from '../stores/contentStore';
import { useProviderStore } from '../stores/providerStore';
import { Search, Clock, Trash2, Film } from 'lucide-react';

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const activeProvider = useProviderStore((state) => state.activeProvider);
  const {
    searchResults,
    searchHistory,
    isSearching,
    search,
    clearSearchHistory,
    removeSearchHistoryItem,
  } = useContentStore();

  // Focus search input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Debounced search on query change
  useEffect(() => {
    if (!query.trim()) return;

    const timer = setTimeout(() => {
      search(query.trim());
    }, 400);

    return () => clearTimeout(timer);
  }, [query, search]);

  const handleSelectHistory = (item: string) => {
    setQuery(item);
    search(item);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
      {/* Search Bar Input */}
      <div className="mb-6 max-w-2xl mx-auto" data-nav-section="search-input">
        <SearchInput
          ref={inputRef}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onClear={() => setQuery('')}
          placeholder={`Search ${activeProvider?.display_name || 'movies, series, videos'}...`}
        />
      </div>

      {/* Recent Search History Chips */}
      {!query && searchHistory.length > 0 && (
        <div className="mb-8" data-nav-section="search-history">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-vega-textSecondary">
              <Clock className="w-3.5 h-3.5" />
              <span>Recent Searches</span>
            </div>
            <button
              type="button"
              onClick={clearSearchHistory}
              data-focusable="true"
              data-nav-section="search-history"
              className="text-xs text-vega-textSecondary hover:text-white flex items-center gap-1 transition-colors"
            >
              <Trash2 className="w-3 h-3" />
              <span>Clear</span>
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            {searchHistory.map((item) => (
              <div
                key={item}
                className="group flex items-center bg-vega-surface2 hover:bg-vega-surface3 rounded-full text-xs font-medium text-white transition-all shadow-sm"
              >
                <button
                  type="button"
                  data-focusable="true"
                  data-nav-section="search-history"
                  onClick={() => handleSelectHistory(item)}
                  className="px-3.5 py-1.5 focus:outline-none"
                >
                  {item}
                </button>
                <button
                  type="button"
                  aria-label={`Remove ${item}`}
                  onClick={() => removeSearchHistoryItem(item)}
                  className="pr-2.5 text-vega-textSecondary hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Searching Skeleton */}
      {isSearching && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6">
          <PosterSkeleton count={12} />
        </div>
      )}

      {/* Search Results Grid */}
      {!isSearching && searchResults.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-vega-textSecondary mb-4">
            Results ({searchResults.length})
          </h2>
          <div
            className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6"
            data-nav-section="search-results"
          >
            {searchResults.map((post, idx) => (
              <PosterCard
                key={`${post.link}-${idx}`}
                post={post}
                navSection="search-results"
                className="w-full"
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {!isSearching && query.trim() && searchResults.length === 0 && (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
          <div className="w-16 h-16 rounded-full bg-vega-surface2 flex items-center justify-center mb-4">
            <Search className="w-8 h-8 text-vega-textSecondary" />
          </div>
          <h3 className="text-lg font-bold text-white mb-1">No results found for "{query}"</h3>
          <p className="text-xs text-vega-textSecondary max-w-sm">
            Try checking for typos or searching with different keywords.
          </p>
        </div>
      )}

      {/* Idle placeholder before search */}
      {!query && searchHistory.length === 0 && (
        <div className="min-h-[50vh] flex flex-col items-center justify-center text-center p-6">
          <Film className="w-16 h-16 text-vega-surface3 mb-4" />
          <h3 className="text-lg font-bold text-white mb-1">Search Vega Content</h3>
          <p className="text-xs text-vega-textSecondary max-w-xs">
            Type anything in the search bar above to explore titles across categories.
          </p>
        </div>
      )}
    </div>
  );
};
