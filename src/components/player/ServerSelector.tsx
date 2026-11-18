import React from 'react';
import { Stream } from '../../lib/providers/types';
import { Check, Server } from 'lucide-react';

interface ServerSelectorProps {
  streams: Stream[];
  currentStreamIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
  navSection?: string;
}

export const ServerSelector: React.FC<ServerSelectorProps> = ({
  streams,
  currentStreamIndex,
  onSelect,
  onClose,
  navSection = 'player-settings',
}) => {
  return (
    <div
      className="absolute bottom-16 right-4 sm:right-16 bg-vega-surface1/95 backdrop-blur-xl border border-white/10 rounded-2xl p-2 w-56 shadow-2xl z-50 text-sm"
      data-nav-section={navSection}
    >
      <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-vega-textSecondary uppercase tracking-wider border-b border-white/5">
        <Server className="w-3.5 h-3.5" />
        <span>Select Stream Server</span>
      </div>
      <div className="py-1 max-h-56 overflow-y-auto no-scrollbar">
        {streams.map((stream, idx) => {
          const isSelected = currentStreamIndex === idx;
          return (
            <button
              key={idx}
              type="button"
              data-focusable="true"
              data-nav-section={navSection}
              onClick={() => {
                onSelect(idx);
                onClose();
              }}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-left transition-colors ${
                isSelected
                  ? 'bg-vega-navPill text-white font-medium'
                  : 'text-vega-textSecondary hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="truncate pr-2">
                <div className="text-white font-medium truncate">{stream.server || `Server ${idx + 1}`}</div>
                <div className="text-[11px] text-vega-textSecondary">
                  {stream.quality || 'Auto'} • {stream.type?.toUpperCase()}
                </div>
              </div>
              {isSelected ? <Check className="w-4 h-4 text-vega-ctaPrimary flex-shrink-0" /> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};
