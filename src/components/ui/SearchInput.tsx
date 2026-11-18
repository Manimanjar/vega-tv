import React, { InputHTMLAttributes, forwardRef } from 'react';
import { Search, X } from 'lucide-react';

interface SearchInputProps extends InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void;
  containerClassName?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onChange, onClear, placeholder = 'Search titles, categories, tags...', containerClassName = '', ...props }, ref) => {
    return (
      <div className={`relative flex items-center w-full ${containerClassName}`}>
        <div className="absolute left-4.5 pointer-events-none text-vega-textSecondary">
          <Search className="w-5 h-5 text-vega-textSecondary/80" />
        </div>
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          data-focusable="true"
          className="w-full bg-vega-surface1 hover:bg-vega-surface2 focus:bg-vega-surface2 text-white placeholder-vega-textSecondary/60 pl-12 pr-12 py-3.5 rounded-full border border-white/5 transition-all duration-200 text-base shadow-inner focus:border-white/20"
          {...props}
        />
        {value ? (
          <button
            type="button"
            onClick={onClear}
            data-focusable="true"
            aria-label="Clear search"
            className="absolute right-3.5 p-1.5 rounded-full text-vega-textSecondary hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        ) : null}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
