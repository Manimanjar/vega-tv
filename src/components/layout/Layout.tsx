import React, { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { BottomNav } from './BottomNav';
import { TopBar } from './TopBar';
import { AddSourceModal } from '../modals/AddSourceModal';
import { useUIStore } from '../../stores/uiStore';
import { useProviderStore } from '../../stores/providerStore';
import { useSpatialNavigation } from '../../lib/spatial/useSpatialNavigation';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export const Layout: React.FC = () => {
  const location = useLocation();
  const { toast } = useUIStore();
  const { loadProviders } = useProviderStore();

  // Spatial navigation enabled globally
  useSpatialNavigation();

  // Initial load of provider manifests
  useEffect(() => {
    loadProviders();
  }, [loadProviders]);

  const isPlayer = location.pathname.startsWith('/player');
  const showBack = location.pathname.startsWith('/category') || location.pathname.startsWith('/detail');

  return (
    <div className="min-h-screen bg-vega-black text-vega-textPrimary flex flex-col font-sans">
      {/* TopBar on non-player screens */}
      {!isPlayer && <TopBar showBack={showBack} />}

      {/* Main Content Area */}
      <main className={`flex-1 ${!isPlayer ? 'pb-24' : ''}`}>
        <Outlet />
      </main>

      {/* Bottom Navigation on non-player screens */}
      {!isPlayer && <BottomNav />}

      {/* Modals */}
      <AddSourceModal />

      {/* Floating Toast Notification */}
      {toast && (
        <div
          role="status"
          className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-2.5 px-5 py-3 rounded-full bg-vega-surface1/95 border border-white/15 text-white text-sm shadow-2xl backdrop-blur-xl animate-bounce-in"
        >
          {toast.type === 'success' && <CheckCircle2 className="w-4 h-4 text-vega-success" />}
          {toast.type === 'error' && <AlertCircle className="w-4 h-4 text-vega-error" />}
          {toast.type === 'info' && <Info className="w-4 h-4 text-vega-ctaPrimary" />}
          <span>{toast.message}</span>
        </div>
      )}
    </div>
  );
};
