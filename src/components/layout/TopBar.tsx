import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { ArrowLeft, ChevronDown, Check, Layers, RefreshCw } from 'lucide-react';
import { useProviderStore } from '../../stores/providerStore';
import { useContentStore } from '../../stores/contentStore';

interface TopBarProps {
  title?: string;
  showBack?: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({ title, showBack = false }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showProviderMenu, setShowProviderMenu] = useState(false);

  const { manifests, activeProvider, setActiveProvider } = useProviderStore();
  const { loadHomeContent, isLoadingHome } = useContentStore();

  const isHome = location.pathname === '/';

  const handleProviderChange = (value: string) => {
    setActiveProvider(value);
    setShowProviderMenu(false);
    loadHomeContent();
  };

  return (
    <header
      data-nav-section="top-bar"
      className="sticky top-0 inset-x-0 z-30 bg-vega-black/80 backdrop-blur-xl border-b border-white/5 px-4 sm:px-8 py-3.5 flex items-center justify-between"
    >
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
        ) : null}

        {/* Vega Logo and App Name */}
        <div
          role="button"
          tabIndex={0}
          onClick={() => navigate('/')}
          className="flex items-center gap-2 cursor-pointer focus:outline-none"
        >
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-white to-gray-400 flex items-center justify-center shadow-md">
            <svg
              className="w-4 h-4 text-black fill-current ml-0.5"
              viewBox="0 0 24 24"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
          </div>
          <div>
            <span className="font-extrabold text-lg tracking-tight text-white">Vega</span>
            <span className="text-xs font-semibold ml-1 px-1.5 py-0.5 rounded bg-vega-surface3 text-vega-ctaPrimary">
              WEB
            </span>
          </div>
        </div>

        {title && <span className="text-sm font-semibold text-vega-textSecondary">/ {title}</span>}
      </div>

      {/* Provider Selector Dropdown & Actions */}
      <div className="flex items-center gap-2 sm:gap-3">
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

        {/* Active Provider Pill Dropdown */}
        <div className="relative">
          <button
            type="button"
            data-focusable="true"
            data-nav-section="top-bar"
            onClick={() => setShowProviderMenu((prev) => !prev)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-vega-surface2 hover:bg-vega-surface3 border border-white/5 text-xs font-semibold text-white transition-all shadow-sm"
          >
            {activeProvider?.icon ? (
              <img
                src={activeProvider.icon}
                alt=""
                className="w-4 h-4 rounded-full object-cover"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            ) : (
              <Layers className="w-3.5 h-3.5 text-vega-textSecondary" />
            )}
            <span className="max-w-[120px] truncate">
              {activeProvider?.display_name || 'Select Provider'}
            </span>
            <ChevronDown className="w-3 h-3 text-vega-textSecondary" />
          </button>

          {/* Dropdown Menu */}
          {showProviderMenu && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowProviderMenu(false)}
              />
              <div
                className="absolute right-0 top-10 w-64 max-h-72 bg-vega-surface1 border border-white/10 rounded-2xl shadow-2xl p-2 z-50 overflow-y-auto no-scrollbar"
                data-nav-section="provider-menu"
              >
                <div className="px-3 py-2 text-[11px] font-semibold text-vega-textSecondary uppercase tracking-wider border-b border-white/5">
                  Installed Providers
                </div>
                <div className="py-1">
                  {manifests.length === 0 ? (
                    <div className="px-3 py-3 text-xs text-vega-textSecondary text-center">
                      No providers available. Check settings or network.
                    </div>
                  ) : (
                    manifests.map((m) => {
                      const isSelected = activeProvider?.value === m.value;
                      return (
                        <button
                          key={m.value}
                          type="button"
                          data-focusable="true"
                          data-nav-section="provider-menu"
                          onClick={() => handleProviderChange(m.value)}
                          disabled={m.disabled}
                          className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-xs transition-colors ${
                            isSelected
                              ? 'bg-vega-navPill text-white font-semibold'
                              : 'text-white/80 hover:bg-white/5 hover:text-white'
                          } ${m.disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            {m.icon && (
                              <img
                                src={m.icon}
                                alt=""
                                className="w-4 h-4 rounded-full object-cover flex-shrink-0"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = 'none';
                                }}
                              />
                            )}
                            <div className="truncate">
                              <span className="block truncate">{m.display_name}</span>
                              <span className="text-[10px] text-vega-textSecondary">
                                v{m.version}
                              </span>
                            </div>
                          </div>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-vega-ctaPrimary flex-shrink-0 ml-2" />
                          )}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
