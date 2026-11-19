import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { smartProxy, ProxyPingResult } from '../../lib/providers/smartProxy';
import { useSettingsStore } from '../../stores/settingsStore';
import { useContentStore } from '../../stores/contentStore';
import { Wifi, Radio, Server, CheckCircle2, AlertCircle, RefreshCw, Tv, Zap } from 'lucide-react';
import { Button } from '../ui/Button';

interface ProxySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProxySettingsModal: React.FC<ProxySettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { corsProxyUrl, setCorsProxyUrl } = useSettingsStore();
  const { loadHomeContent } = useContentStore();

  const [inputUrl, setInputUrl] = useState(corsProxyUrl || smartProxy.getCustomProxy() || '');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ProxyPingResult | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = corsProxyUrl || smartProxy.getCustomProxy() || '';
      setInputUrl(current);
      if (current) {
        handleTest(current);
      }
    }
  }, [isOpen]);

  const handleTest = async (urlToTest: string) => {
    if (!urlToTest.trim()) return;
    setTesting(true);
    setTestResult(null);

    const result = await smartProxy.testProxy(urlToTest);
    setTestResult(result);
    setIsConnected(result.ok);
    setTesting(false);
  };

  const handleSave = () => {
    const trimmed = inputUrl.trim();
    smartProxy.setCustomProxy(trimmed);
    setCorsProxyUrl(trimmed);
    onClose();
    // Reload content with new proxy
    loadHomeContent();
  };

  const handleUseLocal = async () => {
    const local = 'http://localhost:8080/?url=';
    setInputUrl(local);
    await handleTest(local);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="CORS & Streaming Proxy Settings">
      <div className="space-y-5">
        {/* Status Banner */}
        <div className="p-4 rounded-2xl bg-vega-surface2 border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-3.5 h-3.5 rounded-full ${
                isConnected
                  ? 'bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.8)]'
                  : 'bg-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.8)]'
              }`}
            />
            <div>
              <div className="text-sm font-bold text-white flex items-center gap-1.5">
                <span>{isConnected ? 'Proxy Connected & Verified' : 'Proxy Not Connected'}</span>
                {testResult?.latencyMs && (
                  <span className="text-xs font-normal text-emerald-400">
                    ({testResult.latencyMs}ms)
                  </span>
                )}
              </div>
              <p className="text-xs text-vega-textSecondary truncate max-w-xs">
                {inputUrl || 'Bypasses browser CORS & injects CDN Referers'}
              </p>
            </div>
          </div>
          <span
            className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border ${
              isConnected
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
            }`}
          >
            {isConnected ? 'Online' : 'Offline'}
          </span>
        </div>

        {/* Input Box */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-white/90">Proxy Endpoint URL</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="http://localhost:8080/?url= or https://my-proxy.workers.dev/?url="
              className="flex-1 bg-vega-surface1 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-vega-ctaPrimary transition-colors font-mono"
            />
            <Button
              variant="secondary"
              size="sm"
              onClick={() => handleTest(inputUrl)}
              disabled={testing || !inputUrl.trim()}
              className="flex-shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 mr-1 ${testing ? 'animate-spin' : ''}`} />
              Test
            </Button>
          </div>
        </div>

        {/* Quick Connect Presets */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-vega-textSecondary uppercase tracking-wider">
            Quick Connect Presets
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleUseLocal}
              className="p-3 rounded-xl bg-vega-surface1 border border-white/5 hover:border-white/20 text-left transition-all group"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-white group-hover:text-vega-ctaPrimary">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>Local Device (8080)</span>
              </div>
              <p className="text-[10px] text-vega-textSecondary mt-0.5 truncate">
                http://localhost:8080/?url=
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                const cloudflare = 'https://cors-proxy.workers.dev/?url=';
                setInputUrl(cloudflare);
                handleTest(cloudflare);
              }}
              className="p-3 rounded-xl bg-vega-surface1 border border-white/5 hover:border-white/20 text-left transition-all group"
            >
              <div className="flex items-center gap-2 text-xs font-semibold text-white group-hover:text-vega-ctaPrimary">
                <Server className="w-3.5 h-3.5 text-blue-400" />
                <span>Cloudflare Worker</span>
              </div>
              <p className="text-[10px] text-vega-textSecondary mt-0.5 truncate">
                Edge Serverless Proxy
              </p>
            </button>
          </div>
        </div>

        {/* Smart TV Setup Box */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
          <div className="flex items-center gap-2 text-xs font-bold text-white">
            <Tv className="w-4 h-4 text-vega-ctaPrimary" />
            <span>Smart TV Streaming Guide</span>
          </div>
          <p className="text-[11px] text-vega-textSecondary leading-relaxed">
            When streaming on your Smart TV browser, enter your phone's local Wi-Fi IP address (e.g. <span className="font-mono text-white">http://192.168.1.X:8080/?url=</span>) or a free Cloudflare Worker URL to enjoy 100% full-speed playback without restrictions.
          </p>
        </div>

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
              testResult.ok
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
            )}
            <span>{testResult.message}</span>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave}>
            Save & Connect
          </Button>
        </div>
      </div>
    </Modal>
  );
};
