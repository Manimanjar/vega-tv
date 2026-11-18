import React from 'react';
import { Check } from 'lucide-react';

export interface QualityOption {
  index: number; // -1 for auto
  label: string;
  height?: number;
}

interface QualitySelectorProps {
  qualities: QualityOption[];
  currentQuality: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  navSection?: string;
}

export const QualitySelector: React.FC<QualitySelectorProps> = ({
  qualities,
  currentQuality,
  onSelect,
  onClose,
  navSection = 'player-settings',
}) => {
  return (
    <div
      className="absolute bottom-16 right-4 sm:right-8 bg-vega-surface1/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 w-48 shadow-2xl z-50 text-sm"
      data-nav-section={navSection}
    >
      <div className="px-3 py-2 text-xs font-semibold text-vega-textSecondary uppercase tracking-wider border-b border-white/5">
        Video Quality
      </div>
      <div className="py-1 max-h-56 overflow-y-auto no-scrollbar">
        {qualities.map((q) => {
          const isSelected = currentQuality === q.index;
          return (
            <button
              key={q.index}
              type="button"
              data-focusable="true"
              data-nav-section={navSection}
              onClick={() => {
                onSelect(q.index);
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                isSelected
                  ? 'bg-vega-navPill text-white font-medium'
                  : 'text-vega-textSecondary hover:text-white hover:bg-white/5'
              }`}
            >
              <span>{q.label}</span>
              {isSelected ? <Check className="w-4 h-4 text-vega-ctaPrimary" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};
