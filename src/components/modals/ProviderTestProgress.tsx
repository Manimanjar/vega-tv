import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { Button } from '../ui/Button';
import { TestStage } from '../../lib/providers/types';
import { ProviderEngine } from '../../lib/providers/providerEngine';
import { useSettingsStore } from '../../stores/settingsStore';
import { CheckCircle2, XCircle, Circle, Loader2, AlertCircle } from 'lucide-react';

interface ProviderTestDialogProps {
  isOpen: boolean;
  providerValue: string;
  providerName: string;
  sourceUrl?: string;
  onClose: () => void;
}

export const ProviderTestDialog: React.FC<ProviderTestDialogProps> = ({
  isOpen,
  providerValue,
  providerName,
  sourceUrl,
  onClose,
}) => {
  const [stages, setStages] = useState<TestStage[]>([
    { id: 'catalog', name: 'Catalog', status: 'pending' },
    { id: 'posts', name: 'Show List', status: 'pending' },
    { id: 'meta', name: 'Metadata', status: 'pending' },
    { id: 'playback', name: 'Playback Info', status: 'pending' },
    { id: 'stream', name: 'Streams', status: 'pending' },
  ]);
  const [isRunning, setIsRunning] = useState(false);
  const [failedStage, setFailedStage] = useState<TestStage | null>(null);

  useEffect(() => {
    if (!isOpen || !providerValue) return;

    let cancelled = false;
    setIsRunning(true);
    setFailedStage(null);

    const run = async () => {
      const engine = ProviderEngine.getInstance(() => useSettingsStore.getState().corsProxyUrl);
      const results = await engine.testProvider(
        providerValue,
        sourceUrl,
        (updatedStage) => {
          if (cancelled) return;
          setStages((prev) =>
            prev.map((s) => (s.id === updatedStage.id ? updatedStage : s))
          );
        }
      );

      if (cancelled) return;
      setStages(results);
      setIsRunning(false);

      const failed = results.find((s) => s.status === 'failed');
      if (failed) {
        setFailedStage(failed);
      }
    };

    run();

    return () => {
      cancelled = true;
    };
  }, [isOpen, providerValue, sourceUrl]);

  const renderStatusIcon = (status: TestStage['status']) => {
    switch (status) {
      case 'success':
        return <CheckCircle2 className="w-5 h-5 text-vega-success" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-vega-error" />;
      case 'running':
        return <Loader2 className="w-5 h-5 text-vega-ctaPrimary animate-spin" />;
      case 'pending':
      default:
        return <Circle className="w-5 h-5 text-vega-textSecondary/40" />;
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Testing Provider: ${providerName}`}
      navSection="test-provider-modal"
    >
      <div className="space-y-6">
        {/* Pipeline stage cards */}
        <div className="space-y-3">
          {stages.map((stage, idx) => (
            <div
              key={stage.id}
              className={`flex items-start gap-3.5 p-3.5 rounded-2xl border transition-all ${
                stage.status === 'running'
                  ? 'bg-vega-surface2 border-vega-ctaPrimary/30'
                  : stage.status === 'failed'
                  ? 'bg-vega-error/10 border-vega-error/30'
                  : 'bg-vega-surface2/60 border-white/5'
              }`}
            >
              <div className="mt-0.5 flex-shrink-0">{renderStatusIcon(stage.status)}</div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-white">
                    {idx + 1}. {stage.name}
                  </h4>
                  {stage.durationMs !== undefined && (
                    <span className="text-[11px] font-mono text-vega-textSecondary">
                      {stage.durationMs}ms
                    </span>
                  )}
                </div>

                {stage.message && (
                  <p
                    className={`text-xs mt-1 truncate ${
                      stage.status === 'failed' ? 'text-red-400 font-medium' : 'text-vega-textSecondary'
                    }`}
                  >
                    {stage.message}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Error diagnosis box */}
        {failedStage && (
          <div className="p-4 rounded-2xl bg-vega-error/15 border border-vega-error/30 flex items-start gap-3 text-xs">
            <AlertCircle className="w-5 h-5 text-vega-error flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-bold text-white mb-1">
                Failed at Stage: {failedStage.name}
              </p>
              <p className="text-red-300 break-words">{failedStage.message}</p>
              <p className="text-white/60 mt-2">
                Tip: If fetching failed due to CORS, configure a working CORS proxy URL in Vega Settings.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Button
            type="button"
            variant="primary"
            onClick={onClose}
            navSection="test-provider-modal"
          >
            {isRunning ? 'Cancel' : 'Done'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
