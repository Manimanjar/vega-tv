import React, { useRef } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ScrollRowProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  onSeeAll?: () => void;
  seeAllText?: string;
  className?: string;
  navSection?: string;
}

export const ScrollRow: React.FC<ScrollRowProps> = ({
  children,
  title,
  subtitle,
  onSeeAll,
  seeAllText = 'See all',
  className = '',
  navSection,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: 'left' | 'right') => {
    if (scrollRef.current) {
      const scrollAmount = scrollRef.current.clientWidth * 0.75;
      scrollRef.current.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth',
      });
    }
  };

  return (
    <div className={`w-full my-6 ${className}`} data-nav-section={navSection}>
      {title ? (
        <div className="flex items-center justify-between px-4 sm:px-8 mb-3">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">{title}</h2>
            {subtitle ? (
              <p className="text-xs sm:text-sm text-vega-textSecondary mt-0.5">{subtitle}</p>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            {onSeeAll ? (
              <button
                type="button"
                onClick={onSeeAll}
                data-focusable="true"
                data-nav-section={navSection}
                className="text-xs sm:text-sm font-medium text-vega-textSecondary hover:text-white px-3 py-1.5 rounded-full hover:bg-vega-surface2 transition-colors flex items-center gap-1 focus:ring-1 focus:ring-white/40"
              >
                <span>{seeAllText}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : null}

            {/* Desktop scroll buttons */}
            <div className="hidden md:flex items-center gap-1.5 ml-2">
              <button
                type="button"
                aria-label="Scroll left"
                onClick={() => scroll('left')}
                className="p-1.5 rounded-full bg-vega-surface2 hover:bg-vega-surface3 text-white/80 hover:text-white transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="Scroll right"
                onClick={() => scroll('right')}
                className="p-1.5 rounded-full bg-vega-surface2 hover:bg-vega-surface3 text-white/80 hover:text-white transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      ) : null}

      <div
        ref={scrollRef}
        data-scroll-container="true"
        className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar px-4 sm:px-8 py-2 scroll-smooth"
      >
        {children}
      </div>
    </div>
  );
};
