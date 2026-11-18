import React, { useState } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { useProviderStore } from '../stores/providerStore';
import { useWatchHistoryStore } from '../stores/watchHistoryStore';
import { useWatchlistStore } from '../stores/watchlistStore';
import { useUIStore } from '../stores/uiStore';
import { ProviderTestDialog } from '../components/modals/ProviderTestProgress';
import { Button } from '../components/ui/Button';
import {
  Layers,
  Wifi,
  PlaySquare,
  Moon,
  Database,
  Info,
  Plus,
  Trash2,
  FlaskConical,
  ExternalLink,
  ShieldCheck,
  RotateCcw,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const {
    corsProxyUrl,
    setCorsProxyUrl,
    defaultQuality,
    setDefaultQuality,
    bufferSize,
    setBufferSize,
    autoPlayNext,
    setAutoPlayNext,
    playbackSpeed,
    setPlaybackSpeed,
    skipDuration,
    setSkipDuration,
    resetSettings,
  } = useSettingsStore();

  const {
    sources,
    manifests,
    activeProvider,
    setActiveProvider,
    removeSource,
  } = useProviderStore();

  const { openModal, showToast } = useUIStore();
  const clearHistory = useWatchHistoryStore((state) => state.clearHistory);
  const clearWatchlist = useWatchlistStore((state) => state.clearWatchlist);

  // Provider testing state
  const [testingProvider, setTestingProvider] = useState<{
    value: string;
    name: string;
  } | null>(null);

  const proxyPresets = [
    { label: 'Direct (No Proxy)', value: '' },
    { label: 'AllOrigins', value: 'https://api.allorigins.win/raw?url=' },
    { label: 'CorsProxy.io', value: 'https://corsproxy.io/?url=' },
  ];

  const handleExportData = () => {
    try {
      const data = {
        settings: localStorage.getItem('vega_settings_v1'),
        history: localStorage.getItem('vega_watch_history_v1'),
        watchlist: localStorage.getItem('vega_watchlist_v1'),
        sources: localStorage.getItem('vega_provider_sources_v1'),
        exportedAt: new Date().toISOString(),
      };
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `vega-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast('Data exported successfully', 'success');
    } catch {
      showToast('Failed to export data', 'error');
    }
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        if (json.settings) localStorage.setItem('vega_settings_v1', json.settings);
        if (json.history) localStorage.setItem('vega_watch_history_v1', json.history);
        if (json.watchlist) localStorage.setItem('vega_watchlist_v1', json.watchlist);
        if (json.sources) localStorage.setItem('vega_provider_sources_v1', json.sources);

        showToast('Data restored! Reloading...', 'success');
        setTimeout(() => window.location.reload(), 1000);
      } catch {
        showToast('Invalid backup JSON file', 'error');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-8 py-8 space-y-10">
      {/* Title */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Settings
        </h1>
        <p className="text-xs sm:text-sm text-vega-textSecondary mt-1">
          Customize video playback, CORS proxies, providers, and application data
        </p>
      </div>

      {/* Section 1: Providers & Sources */}
      <section className="space-y-4" data-nav-section="settings-providers">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
            <Layers className="w-4 h-4 text-vega-ctaPrimary" />
            <span>Content Providers</span>
          </div>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => openModal('addSource')}
            navSection="settings-providers"
          >
            <Plus className="w-3.5 h-3.5 mr-1" />
            Add Source
          </Button>
        </div>

        {/* Source List */}
        <div className="bg-vega-surface1 border border-white/5 rounded-3xl p-4 sm:p-6 space-y-4">
          <div className="text-xs font-semibold text-vega-textSecondary uppercase tracking-wider">
            Provider Sources ({sources.length})
          </div>
          <div className="space-y-2">
            {sources.map((src) => (
              <div
                key={src.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-vega-surface2/60 border border-white/5"
              >
                <div className="min-w-0 pr-4">
                  <h4 className="text-sm font-semibold text-white truncate">{src.name}</h4>
                  <p className="text-xs text-vega-textSecondary truncate font-mono mt-0.5">
                    {src.url}
                  </p>
                </div>
                {sources.length > 1 && (
                  <button
                    type="button"
                    aria-label="Remove source"
                    data-focusable="true"
                    data-nav-section="settings-providers"
                    onClick={() => removeSource(src.id)}
                    className="p-2 rounded-full text-vega-textSecondary hover:text-white hover:bg-vega-error transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Installed Providers */}
          <div className="pt-4 border-t border-white/5">
            <div className="text-xs font-semibold text-vega-textSecondary uppercase tracking-wider mb-3">
              Available Providers ({manifests.length})
            </div>

            <div className="space-y-2">
              {manifests.map((m) => {
                const isActive = activeProvider?.value === m.value;
                return (
                  <div
                    key={m.value}
                    className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                      isActive
                        ? 'bg-vega-surface2 border-white/20'
                        : 'bg-vega-surface2/50 border-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {m.icon ? (
                        <img
                          src={m.icon}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover flex-shrink-0"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-vega-surface3 flex items-center justify-center flex-shrink-0">
                          <Layers className="w-4 h-4 text-white" />
                        </div>
                      )}
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-white truncate">
                            {m.display_name}
                          </span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/80">
                            v{m.version}
                          </span>
                        </div>
                        <span className="text-xs text-vega-textSecondary">
                          {m.type?.toUpperCase()}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Test Provider Button */}
                      <button
                        type="button"
                        data-focusable="true"
                        data-nav-section="settings-providers"
                        onClick={() =>
                          setTestingProvider({
                            value: m.value,
                            name: m.display_name,
                          })
                        }
                        title="Test 5-stage pipeline"
                        className="p-2 rounded-full bg-vega-surface3 hover:bg-white/20 text-white text-xs font-semibold transition-colors flex items-center gap-1.5"
                      >
                        <FlaskConical className="w-4 h-4 text-amber-400" />
                        <span className="hidden sm:inline">Test</span>
                      </button>

                      {/* Select / Active */}
                      <button
                        type="button"
                        data-focusable="true"
                        data-nav-section="settings-providers"
                        onClick={() => setActiveProvider(m.value)}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                          isActive
                            ? 'bg-vega-ctaPrimary text-vega-ctaText'
                            : 'bg-vega-surface3 text-white hover:bg-white/20'
                        }`}
                      >
                        {isActive ? 'Active' : 'Select'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Section 2: Streaming & CORS Proxy */}
      <section className="space-y-4" data-nav-section="settings-streaming">
        <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
          <Wifi className="w-4 h-4 text-vega-ctaPrimary" />
          <span>Streaming & CORS Proxy</span>
        </div>

        <div className="bg-vega-surface1 border border-white/5 rounded-3xl p-4 sm:p-6 space-y-5">
          {/* CORS Proxy input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-vega-textSecondary mb-2">
              CORS Proxy URL Prefix
            </label>
            <input
              type="text"
              data-focusable="true"
              data-nav-section="settings-streaming"
              value={corsProxyUrl}
              onChange={(e) => setCorsProxyUrl(e.target.value)}
              placeholder="e.g. https://api.allorigins.win/raw?url="
              className="w-full bg-vega-surface2 text-white px-4 py-3 rounded-2xl border border-white/10 focus:border-white/30 text-sm font-mono"
            />
            <p className="text-xs text-vega-textSecondary mt-2">
              All provider API and scraping requests pass through this proxy to bypass browser CORS restrictions.
            </p>

            {/* Presets */}
            <div className="flex flex-wrap gap-2 mt-3">
              {proxyPresets.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  data-focusable="true"
                  data-nav-section="settings-streaming"
                  onClick={() => {
                    setCorsProxyUrl(p.value);
                    showToast(`Proxy set to: ${p.label}`, 'info');
                  }}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                    corsProxyUrl === p.value
                      ? 'bg-vega-navPill text-white border border-white/20'
                      : 'bg-vega-surface2 text-vega-textSecondary hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Default Quality Preference */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-white">Default Video Quality</h4>
              <p className="text-xs text-vega-textSecondary">
                Preferred resolution when starting streams
              </p>
            </div>
            <select
              data-focusable="true"
              data-nav-section="settings-streaming"
              value={defaultQuality}
              onChange={(e) => setDefaultQuality(e.target.value as any)}
              className="bg-vega-surface2 text-white px-4 py-2 rounded-2xl border border-white/10 text-xs font-semibold cursor-pointer"
            >
              <option value="auto">Auto (Best)</option>
              <option value="1080p">1080p FHD</option>
              <option value="720p">720p HD</option>
              <option value="480p">480p SD</option>
            </select>
          </div>

          {/* Buffer Size */}
          <div className="pt-4 border-t border-white/5">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-white">Forward Buffer Size</h4>
              <span className="text-xs font-mono text-vega-textSecondary">{bufferSize} seconds</span>
            </div>
            <input
              type="range"
              min="10"
              max="90"
              step="5"
              value={bufferSize}
              onChange={(e) => setBufferSize(parseInt(e.target.value))}
              className="w-full accent-vega-ctaPrimary cursor-pointer"
            />
          </div>
        </div>
      </section>

      {/* Section 3: Player Preferences */}
      <section className="space-y-4" data-nav-section="settings-player">
        <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
          <PlaySquare className="w-4 h-4 text-vega-ctaPrimary" />
          <span>Player Preferences</span>
        </div>

        <div className="bg-vega-surface1 border border-white/5 rounded-3xl p-4 sm:p-6 space-y-4">
          {/* Auto Play Next */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-white">Auto-play Next Episode</h4>
              <p className="text-xs text-vega-textSecondary">
                Automatically start next episode when current finishes
              </p>
            </div>
            <button
              type="button"
              data-focusable="true"
              data-nav-section="settings-player"
              onClick={() => setAutoPlayNext(!autoPlayNext)}
              className={`w-12 h-7 rounded-full p-1 transition-colors ${
                autoPlayNext ? 'bg-vega-ctaPrimary' : 'bg-vega-surface3'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-black transition-transform ${
                  autoPlayNext ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Default Playback Speed */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-white">Default Playback Speed</h4>
              <p className="text-xs text-vega-textSecondary">Speed rate when video loads</p>
            </div>
            <select
              data-focusable="true"
              data-nav-section="settings-player"
              value={playbackSpeed}
              onChange={(e) => setPlaybackSpeed(parseFloat(e.target.value))}
              className="bg-vega-surface2 text-white px-4 py-2 rounded-2xl border border-white/10 text-xs font-semibold cursor-pointer"
            >
              <option value="0.75">0.75x</option>
              <option value="1">1.0x (Normal)</option>
              <option value="1.25">1.25x</option>
              <option value="1.5">1.5x</option>
            </select>
          </div>

          {/* Skip Duration */}
          <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-white">Skip Button Duration</h4>
              <p className="text-xs text-vega-textSecondary">Seconds skipped on remote arrow / buttons</p>
            </div>
            <select
              data-focusable="true"
              data-nav-section="settings-player"
              value={skipDuration}
              onChange={(e) => setSkipDuration(parseInt(e.target.value))}
              className="bg-vega-surface2 text-white px-4 py-2 rounded-2xl border border-white/10 text-xs font-semibold cursor-pointer"
            >
              <option value="5">5 Seconds</option>
              <option value="10">10 Seconds</option>
              <option value="15">15 Seconds</option>
              <option value="30">30 Seconds</option>
            </select>
          </div>
        </div>
      </section>

      {/* Section 4: Data Management & Backups */}
      <section className="space-y-4" data-nav-section="settings-data">
        <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
          <Database className="w-4 h-4 text-vega-ctaPrimary" />
          <span>Storage & Data</span>
        </div>

        <div className="bg-vega-surface1 border border-white/5 rounded-3xl p-4 sm:p-6 space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="secondary"
              onClick={handleExportData}
              navSection="settings-data"
            >
              Export Backup JSON
            </Button>

            <label className="cursor-pointer inline-flex items-center justify-center font-medium transition-all duration-200 select-none text-sm px-5 py-2.5 rounded-full bg-vega-pillBg text-white hover:bg-vega-surface3 border border-white/5">
              <span>Import Backup</span>
              <input
                type="file"
                accept=".json"
                onChange={handleImportData}
                className="hidden"
              />
            </label>

            <Button
              variant="danger"
              onClick={() => {
                if (confirm('Are you sure you want to clear your watch history?')) {
                  clearHistory();
                  showToast('Watch history cleared', 'info');
                }
              }}
              navSection="settings-data"
            >
              Clear History
            </Button>

            <Button
              variant="ghost"
              onClick={() => {
                resetSettings();
                showToast('Settings reset to defaults', 'info');
              }}
              navSection="settings-data"
            >
              <RotateCcw className="w-3.5 h-3.5 mr-1" />
              Reset Settings
            </Button>
          </div>
        </div>
      </section>

      {/* Section 5: About */}
      <section className="space-y-4" data-nav-section="settings-about">
        <div className="flex items-center gap-2 text-sm font-bold text-white uppercase tracking-wider">
          <Info className="w-4 h-4 text-vega-ctaPrimary" />
          <span>About Vega Web</span>
        </div>

        <div className="bg-vega-surface1 border border-white/5 rounded-3xl p-6 text-sm text-vega-textSecondary space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Application</span>
            <span className="font-mono text-xs">Vega Web v1.0.0</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Target Platforms</span>
            <span className="text-xs">Smart TV Browsers, Desktop, Mobile Web</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-white">Design Theme</span>
            <span className="text-xs">Pure AMOLED Black (#000000)</span>
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <span className="font-semibold text-white">Provider Repository</span>
            <a
              href="https://github.com/Manimanjar/vega-providers"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-vega-ctaPrimary hover:underline flex items-center gap-1"
            >
              <span>GitHub / Manimanjar / vega-providers</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      </section>

      {/* Test Provider Dialog */}
      {testingProvider && (
        <ProviderTestDialog
          isOpen={true}
          providerValue={testingProvider.value}
          providerName={testingProvider.name}
          onClose={() => setTestingProvider(null)}
        />
      )}
    </div>
  );
};
