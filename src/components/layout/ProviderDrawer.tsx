import React from 'react';
import { X, Layers, Check, ExternalLink, ShieldCheck, Film, Plus, RefreshCw, Play } from 'lucide-react';
import { useProviderStore } from '../../stores/providerStore';
import { useContentStore } from '../../stores/contentStore';
import { useUIStore } from '../../stores/uiStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface ProviderDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenTestModal: (providerValue: string) => void;
  onOpenProxyModal?: () => void;
}

export const ProviderDrawer: React.FC<ProviderDrawerProps> = ({
  isOpen,
  onClose,
  onOpenTestModal,
  onOpenProxyModal,
}) => {
  const { sources, activeSourceId, manifests, activeProvider, setActiveProvider, setActiveSource, loadProviders, isLoading } =
    useProviderStore();
  const { loadHomeContent } = useContentStore();
  const { openModal } = useUIStore();
  const { corsProxyUrl } = useSettingsStore();

  if (!isOpen) return null;

  const handleSelectProvider = (val: string) => {
    setActiveProvider(val);
    onClose();
    loadHomeContent();
  };

  const handleSourceChange = async (sourceId: string) => {
    await setActiveSource(sourceId);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Panel */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-vega-surface1 border-l border-white/10 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-5 border-b border-white/5 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-vega-surface2 flex items-center justify-center text-vega-ctaPrimary">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Streaming Providers</h3>
                <p className="text-xs text-vega-textSecondary">Select content catalog & servers</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/70 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Proxy Status Indicator (Clickable to open proxy modal) */}
          <div
            onClick={onOpenProxyModal}
            className="px-5 py-3 bg-vega-surface2/50 hover:bg-vega-surface2 border-b border-white/5 flex items-center justify-between cursor-pointer transition-colors"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  corsProxyUrl ? 'bg-emerald-400 animate-pulse' : 'bg-emerald-400'
                }`}
              />
              <span className="text-xs text-white/90">
                {corsProxyUrl ? 'Streaming Proxy Active' : 'Auto Local/Edge Proxy Active'}
              </span>
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Settings ›
            </span>
          </div>

          {/* Source Tabs */}
          <div className="p-4 border-b border-white/5">
            <div className="text-[11px] font-semibold text-vega-textSecondary uppercase tracking-wider mb-2.5">
              Provider Source
            </div>
            <div className="grid grid-cols-2 gap-2">
              {sources.map((src) => {
                const isActive = activeSourceId === src.id;
                return (
                  <button
                    key={src.id}
                    onClick={() => handleSourceChange(src.id)}
                    className={`px-3 py-2.5 rounded-xl text-left transition-all ${
                      isActive
                        ? 'bg-vega-navPill text-white font-semibold border border-white/15 shadow-sm'
                        : 'bg-vega-surface2 text-white/70 hover:bg-vega-surface3 hover:text-white border border-transparent'
                    }`}
                  >
                    <div className="text-xs truncate font-medium">{src.name}</div>
                    <div className="text-[10px] text-vega-textSecondary truncate mt-0.5">
                      {src.id === 'zenda-official' ? 'Movies & Series' : 'Custom Providers'}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Provider List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-vega-textSecondary uppercase tracking-wider">
                Available Providers ({manifests.length})
              </span>
              <button
                onClick={() => loadProviders()}
                disabled={isLoading}
                className="p-1 rounded-full text-white/60 hover:text-white transition-colors"
                title="Refresh Providers"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
            </div>

            {manifests.map((m) => {
              const isSelected = activeProvider?.value === m.value;
              return (
                <div
                  key={m.value}
                  className={`p-3 rounded-2xl border transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-vega-surface2 border-vega-ctaPrimary/40 shadow-lg'
                      : 'bg-vega-surface1/60 border-white/5 hover:border-white/15 hover:bg-vega-surface2/60'
                  }`}
                >
                  <button
                    onClick={() => handleSelectProvider(m.value)}
                    className="flex items-center gap-3 flex-1 text-left truncate mr-2"
                  >
                    {m.icon ? (
                      <img
                        src={m.icon}
                        alt=""
                        className="w-9 h-9 rounded-xl object-cover bg-black/40 border border-white/10"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    ) : (
                      <div className="w-9 h-9 rounded-xl bg-vega-surface3 flex items-center justify-center text-white/60">
                        <Film className="w-4 h-4" />
                      </div>
                    )}
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white truncate">
                          {m.display_name}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-white/10 text-white/70">
                          v{m.version}
                        </span>
                      </div>
                      <span className="text-xs text-vega-textSecondary">
                        {m.type === 'global' ? 'Streaming Source' : m.type}
                      </span>
                    </div>
                  </button>

                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    {/* Test Button */}
                    <button
                      onClick={() => onOpenTestModal(m.value)}
                      title="Run 5-stage test"
                      className="p-2 rounded-xl bg-vega-surface3/80 hover:bg-white/15 text-white/80 hover:text-white transition-colors"
                    >
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    </button>

                    {/* Select indicator */}
                    <button
                      onClick={() => handleSelectProvider(m.value)}
                      className={`p-2 rounded-xl transition-all ${
                        isSelected
                          ? 'bg-vega-ctaPrimary text-vega-ctaText font-bold shadow-md'
                          : 'bg-vega-surface3/40 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {isSelected ? <Check className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Footer Actions */}
          <div className="p-4 border-t border-white/5 bg-vega-surface1/80 space-y-2">
            <button
              onClick={() => {
                onClose();
                openModal('addSource');
              }}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-full bg-vega-surface2 hover:bg-vega-surface3 text-white text-xs font-semibold transition-colors border border-white/5"
            >
              <Plus className="w-4 h-4" />
              Add Custom Provider Source
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
