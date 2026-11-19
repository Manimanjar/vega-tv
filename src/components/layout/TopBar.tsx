import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, Menu, Search, Layers, RefreshCw, Radio, Zap } from 'lucide-react';
import { useProviderStore } from '../../stores/providerStore';
import { useContentStore } from '../../stores/contentStore';
import { ProviderDrawer } from './ProviderDrawer';
import { ProviderTestDialog } from '../modals/ProviderTestProgress';
import { ProxySettingsModal } from '../modals/ProxySettingsModal';
import { smartProxy } from '../../lib/providers/smartProxy';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ title, showBack = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [proxyModalOpen, setProxyModalOpen] = useState(false);
  const [testProviderValue, setTestProviderValue] = useState<string | null>(null);
  const [hasProxy, setHasProxy] = useState(false);

  const { activeProvider, activeSourceId } = useProviderStore();
  const { loadHomeContent, isLoadingHome, catalogs, activeCategoryFilter, setActiveCategoryFilter } = useContentStore();

  const isHome = location.pathname === '/';

  useEffect(() => {
    return smartProxy.subscribe((proxyUrl, isConnected) => {
      setHasProxy(isConnected || !!proxyUrl);
    });
  }, []);

  return (
    <>
      <header
        data-nav-section="top-bar"
        className="sticky top-0 inset-x-0 z-30 bg-vega-black/95 backdrop-blur-2xl border-b border-white/5 safe-area-pt"
      >
        <div className="px-4 sm:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            {showBack ? (
              <button
                type="button"
                aria-label="Back"
                data-focusable="true"
                data-nav-section="top-bar"
                onClick={() => navigate(-1)}
                className="p-2 -ml-2 rounded-full text-white/80 hover:text-white hover:bg-vega-surface2 transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : (
              <button
                type="button"
                aria-label="Open Provider Menu"
                data-focusable="true"
                data-nav-section="top-bar"
                onClick={() => setDrawerOpen(true)}
                className="p-2 -ml-2 rounded-full text-white/80 hover:text-white hover:bg-vega-surface2 transition-colors"
              >
                <Menu className="w-5 h-5" />
              </button>
            )}

            {/* Vega Logo and App Name */}
            <div
              role="button"
              tabIndex={0}
              onClick={() => navigate('/')}
              className="flex items-center gap-2.5 cursor-pointer focus:outline-none"
            >
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-white via-gray-200 to-gray-400 flex items-center justify-center shadow-lg shadow-white/5">
                <svg
                  className="w-4 h-4 text-black fill-current ml-0.5"
                  viewBox="0 0 24 24"
                >
                  <polygon points="5 3 19 12 5 21 5 3" />
                </svg>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-lg tracking-tight text-white">Vega</span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-vega-surface3 text-vega-ctaPrimary uppercase tracking-wider">
                  {activeSourceId === 'zenda-official' ? 'Zenda' : 'Custom'}
                </span>
              </div>
            </div>

            {title && <span className="text-sm font-semibold text-vega-textSecondary hidden sm:inline">/ {title}</span>}
          </div>

          {/* Quick Actions & Active Provider Pill */}
          <div className="flex items-center gap-2">
            {/* Proxy Status Pill */}
            <button
              type="button"
              aria-label="Proxy Settings"
              data-focusable="true"
              data-nav-section="top-bar"
              onClick={() => setProxyModalOpen(true)}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-vega-surface2 hover:bg-vega-surface3 border border-white/5 text-xs text-white/80 hover:text-white transition-all shadow-sm"
              title="CORS & Streaming Proxy Configuration"
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  hasProxy ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
                }`}
              />
              <span className="hidden sm:inline font-medium">
                {hasProxy ? 'Proxy' : 'Connect Proxy'}
              </span>
            </button>

            {/* Quick Search Button */}
            <button
              type="button"
              aria-label="Search"
              data-focusable="true"
              data-nav-section="top-bar"
              onClick={() => navigate('/search')}
              className="p-2 rounded-full bg-vega-surface2 hover:bg-vega-surface3 text-white/80 hover:text-white transition-colors"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Refresh */}
            {isHome && (
              <button
                type="button"
                aria-label="Refresh content"
                data-focusable="true"
                data-nav-section="top-bar"
                onClick={() => loadHomeContent()}
                disabled={isLoadingHome}
                className="p-2 rounded-full bg-vega-surface2 hover:bg-vega-surface3 text-white/80 hover:text-white transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isLoadingHome ? 'animate-spin' : ''}`} />
              </button>
            )}

            {/* Active Provider Button (Opens Drawer) */}
            <button
              type="button"
              data-focusable="true"
              data-nav-section="top-bar"
              onClick={() => setDrawerOpen(true)}
              className="flex items-center gap-2 pl-2 pr-3 py-1.5 rounded-full bg-vega-surface2 hover:bg-vega-surface3 border border-white/10 text-xs font-semibold text-white transition-all shadow-sm active:scale-95"
            >
              {activeProvider?.icon ? (
                <img
                  src={activeProvider.icon}
                  alt=""
                  className="w-5 h-5 rounded-full object-cover border border-white/20"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              ) : (
                <Layers className="w-4 h-4 text-vega-ctaPrimary" />
              )}
              <span className="max-w-[110px] sm:max-w-[150px] truncate">
                {activeProvider?.display_name || 'Providers'}
              </span>
            </button>
          </div>
        </div>

        {/* Category Horizontal Filter Chips (shown on Home screen) */}
        {isHome && catalogs.length > 0 && (
          <div className="px-4 sm:px-8 pb-2.5 pt-0.5 flex gap-2 overflow-x-auto no-scrollbar scroll-smooth">
            <button
              onClick={() => setActiveCategoryFilter('')}
              className={`flex-shrink-0 px-3.5 py-1 rounded-full text-xs font-medium transition-all ${
                activeCategoryFilter === ''
                  ? 'bg-vega-ctaPrimary text-vega-ctaText font-semibold shadow-sm'
                  : 'bg-vega-surface2 text-white/70 hover:bg-vega-surface3 hover:text-white'
              }`}
            >
              All Categories
            </button>
            {catalogs.slice(0, 10).map((cat) => {
              const isSelected = activeCategoryFilter === cat.filter;
              return (
                <button
                  key={cat.filter || cat.title}
                  onClick={() => setActiveCategoryFilter(cat.filter)}
                  className={`flex-shrink-0 px-3.5 py-1 rounded-full text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-vega-ctaPrimary text-vega-ctaText font-semibold shadow-sm'
                      : 'bg-vega-surface2 text-white/70 hover:bg-vega-surface3 hover:text-white'
                  }`}
                >
                  {cat.title}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Slide-over Provider Drawer */}
      <ProviderDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onOpenProxyModal={() => {
          setDrawerOpen(false);
          setProxyModalOpen(true);
        }}
        onOpenTestModal={(val) => {
          setDrawerOpen(false);
          setTestProviderValue(val);
        }}
      />

      {/* Proxy Settings Modal */}
      <ProxySettingsModal
        isOpen={proxyModalOpen}
        onClose={() => setProxyModalOpen(false)}
      />

      {/* Provider Test Modal */}
      {testProviderValue && (
        <ProviderTestDialog
          isOpen={!!testProviderValue}
          providerValue={testProviderValue}
          providerName={testProviderValue}
          onClose={() => setTestProviderValue(null)}
        />
      )}
    </>
  );
};
