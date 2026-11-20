import React from 'react';
import { Check, Volume2 } from 'lucide-react';

export interface AudioTrackOption {
  id: number;
  name: string;
  lang?: string;
}

interface AudioSelectorProps {
  tracks: AudioTrackOption[];
  currentTrackId: number;
  onSelect: (trackId: number) => void;
  onClose: () => void;
  navSection?: string;
}

export const AudioSelector: React.FC<AudioSelectorProps> = ({
  tracks,
  currentTrackId,
  onSelect,
  onClose,
  navSection = 'player-settings',
}) => {
  return (
    <div
      className="absolute bottom-16 right-12 sm:right-28 bg-vega-surface1/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 w-52 shadow-2xl z-50 text-sm"
      data-nav-section={navSection}
    >
      <div className="px-3 py-2 text-xs font-semibold text-vega-textSecondary uppercase tracking-wider border-b border-white/5 flex items-center gap-1.5">
        <Volume2 className="w-3.5 h-3.5 text-vega-ctaPrimary" />
        <span>Audio Language</span>
      </div>
      <div className="py-1 max-h-56 overflow-y-auto no-scrollbar">
        {tracks.map((t) => {
          const isSelected = currentTrackId === t.id;
          return (
            <button
              key={t.id}
              type="button"
              data-focusable="true"
              data-nav-section={navSection}
              onClick={() => {
                onSelect(t.id);
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                isSelected
                  ? 'bg-vega-navPill text-white font-medium'
                  : 'text-vega-textSecondary hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="flex flex-col min-w-0 pr-2">
                <span className="truncate">{t.name}</span>
                {t.lang && (
                  <span className="text-[10px] text-vega-textSecondary uppercase">
                    {t.lang}
                  </span>
                )}
              </div>
              {isSelected ? <Check className="w-4 h-4 text-vega-ctaPrimary flex-shrink-0" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};
