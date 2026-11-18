import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useContentStore } from '../stores/contentStore';
import { PosterCard } from '../components/cards/PosterCard';
import { PosterSkeleton } from '../components/skeletons/PosterSkeleton';
import { Button } from '../components/ui/Button';
import { ArrowLeft, RefreshCw, LayoutGrid } from 'lucide-react';

export const CategoryPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const filter = searchParams.get('filter') || '';
  const title = searchParams.get('title') || 'Category';

  const [page, setPage] = useState(1);

  const {
    categoryPosts,
    categoryHasMore,
    isLoadingHome,
    isLoadingMore,
    loadCategoryPosts,
  } = useContentStore();

  const posts = categoryPosts[filter] || [];
  const hasMore = categoryHasMore[filter] !== false;

  useEffect(() => {
    // If not already fetched, load first page
    if (!categoryPosts[filter] || categoryPosts[filter].length === 0) {
      loadCategoryPosts(filter, 1);
    }
  }, [filter, loadCategoryPosts, categoryPosts]);

  const handleLoadMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    loadCategoryPosts(filter, nextPage);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
      {/* Category Header */}
      <div className="flex items-center justify-between mb-8" data-nav-section="category-header">
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Back"
            data-focusable="true"
            data-nav-section="category-header"
            onClick={() => navigate(-1)}
            className="p-2.5 rounded-full bg-vega-surface2 hover:bg-vega-surface3 text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {title}
            </h1>
            <p className="text-xs sm:text-sm text-vega-textSecondary mt-0.5">
              Showing {posts.length} items
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Refresh category"
            data-focusable="true"
            data-nav-section="category-header"
            onClick={() => {
              setPage(1);
              loadCategoryPosts(filter, 1);
            }}
            className="p-2.5 rounded-full bg-vega-surface2 hover:bg-vega-surface3 text-white transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${isLoadingHome ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Grid of Posters */}
      <div
        className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-6"
        data-nav-section="category-grid"
      >
        {posts.map((post, idx) => (
          <PosterCard
            key={`${post.link}-${idx}`}
            post={post}
            navSection="category-grid"
            className="w-full"
          />
        ))}

        {isLoadingHome && <PosterSkeleton count={12} />}
        {isLoadingMore && <PosterSkeleton count={6} />}
      </div>

      {/* Load More Button */}
      {hasMore && posts.length > 0 && !isLoadingHome && (
        <div className="flex justify-center mt-12 mb-6" data-nav-section="category-footer">
          <Button
            variant="secondary"
            size="lg"
            isLoading={isLoadingMore}
            onClick={handleLoadMore}
            navSection="category-footer"
            className="px-8 shadow-lg"
          >
            Load More Titles
          </Button>
        </div>
      )}
    </div>
  );
};
