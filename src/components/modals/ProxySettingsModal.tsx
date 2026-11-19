import React, { useState, useEffect } from 'react';
import { Modal } from './Modal';
import { smartProxy, ProxyPingResult } from '../../lib/providers/smartProxy';
import { useSettingsStore } from '../../stores/settingsStore';
import { useContentStore } from '../../stores/contentStore';
import {
  Radio,
  Server,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Tv,
  Zap,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';
import { Button } from '../ui/Button';

interface ProxySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const WORKER_SCRIPT_SNIPPET = `export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "GET, HEAD, POST, PUT, DELETE, OPTIONS",
          "Access-Control-Allow-Headers": "*",
        },
      });
    }
    const reqUrl = new URL(request.url);
    const targetUrl = reqUrl.searchParams.get("url");
    if (!targetUrl) {
      return new Response(JSON.stringify({ status: "online", app: "Vega Proxy" }), {
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" },
      });
    }
    const parsedTarget = new URL(targetUrl);
    const headers = new Headers(request.headers);
    headers.delete("host");
    headers.delete("origin");
    headers.delete("referer");
    headers.set("Referer", \`\${parsedTarget.origin}/\`);
    headers.set("Origin", parsedTarget.origin);
    headers.set("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36");

    const range = request.headers.get("range");
    if (range) headers.set("Range", range);

    const upstream = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: request.method !== "GET" && request.method !== "HEAD" ? request.body : undefined,
      redirect: "follow",
    });

    const responseHeaders = new Headers(upstream.headers);
    responseHeaders.set("Access-Control-Allow-Origin", "*");
    responseHeaders.set("Access-Control-Allow-Methods", "GET, HEAD, POST, PUT, DELETE, OPTIONS");
    responseHeaders.set("Access-Control-Allow-Headers", "*");
    responseHeaders.set("Access-Control-Expose-Headers", "*");
    responseHeaders.set("Accept-Ranges", "bytes");

    return new Response(upstream.body, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: responseHeaders,
    });
  },
};`;

export const ProxySettingsModal: React.FC<ProxySettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { corsProxyUrl, setCorsProxyUrl } = useSettingsStore();
  const { loadHomeContent } = useContentStore();

  const [inputUrl, setInputUrl] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<ProxyPingResult | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      const current = corsProxyUrl || smartProxy.getCustomProxy() || '';
      // Don't prefill dead placeholders
      const clean = current.includes('cors-proxy.workers.dev') ? '' : current;
      setInputUrl(clean);
      if (clean) {
        handleTest(clean);
      }
    }
  }, [isOpen]);

  const handleTest = async (urlToTest: string) => {
    const trimmed = urlToTest.trim();
    if (!trimmed) {
      setTestResult({
        ok: false,
        latencyMs: 0,
        url: '',
        message: 'Please enter a proxy URL to test.',
      });
      setIsConnected(false);
      return;
    }

    setTesting(true);
    setTestResult(null);

    const result = await smartProxy.testProxy(trimmed);
    setTestResult(result);
    setIsConnected(result.ok);
    setTesting(false);
  };

  const handleSave = () => {
    const trimmed = inputUrl.trim();
    smartProxy.setCustomProxy(trimmed);
    setCorsProxyUrl(trimmed);
    onClose();
    // Reload home content with newly configured proxy
    loadHomeContent();
  };

  const handleCopyWorkerScript = () => {
    navigator.clipboard.writeText(WORKER_SCRIPT_SNIPPET);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleUseLocal = () => {
    const local = 'http://localhost:8080/?url=';
    setInputUrl(local);
    handleTest(local);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Streaming Proxy Setup">
      <div className="space-y-4 max-h-[82vh] overflow-y-auto pr-1">
        {/* Status Indicator */}
        <div className="p-3.5 rounded-2xl bg-vega-surface2 border border-white/5 flex items-center justify-between">
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
                <span>{isConnected ? 'Proxy Connected' : 'Proxy Not Connected'}</span>
                {testResult?.latencyMs ? (
                  <span className="text-xs font-normal text-emerald-400">
                    ({testResult.latencyMs}ms)
                  </span>
                ) : null}
              </div>
              <p className="text-xs text-vega-textSecondary truncate max-w-[240px] sm:max-w-xs">
                {inputUrl || 'Required to bypass browser CORS & stream media'}
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

        {/* Input Box with Test Button */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-white/90">
            HTTPS Proxy Endpoint URL
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={inputUrl}
              onChange={(e) => setInputUrl(e.target.value)}
              placeholder="https://your-worker.workers.dev/?url="
              className="flex-1 bg-vega-surface1 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-vega-ctaPrimary transition-colors font-mono"
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

        {/* Test Result Message */}
        {testResult && (
          <div
            className={`p-3 rounded-xl text-xs flex items-start gap-2.5 ${
              testResult.ok
                ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
            }`}
          >
            {testResult.ok ? (
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-rose-400" />
            )}
            <span className="leading-relaxed">{testResult.message}</span>
          </div>
        )}

        {/* Solution 1: Vercel Deploy (Zero Setup - Recommended) */}
        <div className="p-3.5 rounded-2xl bg-gradient-to-r from-blue-900/30 to-indigo-900/20 border border-blue-500/30 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Tv className="w-4 h-4 text-blue-400" />
              <span>Recommended for Smart TV & Mobile: Vercel</span>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Zero Setup
            </span>
          </div>
          <p className="text-[11px] text-white/70 leading-relaxed">
            Deploy to Vercel in 1 click (100% free). The app and its high-speed video proxy run on the exact same HTTPS domain with zero CORS errors and zero manual configuration!
          </p>
          <a
            href="https://vercel.com/new/clone?repository-url=https://github.com/Manimanjar/vega-web"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold shadow-lg transition-colors mt-1"
          >
            <span>Deploy to Vercel Free</span>
            <ExternalLink className="w-3.5 h-3.5 ml-1" />
          </a>
        </div>

        {/* Solution 2: Cloudflare Worker (100k requests/day free) */}
        <div className="p-3.5 rounded-2xl bg-vega-surface1 border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Server className="w-4 h-4 text-amber-400" />
              <span>Option 2: Cloudflare Worker (For GitHub Pages)</span>
            </div>
            <span className="text-[10px] text-emerald-400 font-semibold">100k req/day free</span>
          </div>
          <p className="text-[11px] text-vega-textSecondary leading-relaxed">
            Deploy your personal HTTPS proxy in 30 seconds:
          </p>
          <ol className="text-[11px] text-white/80 space-y-1 list-decimal list-inside pl-1">
            <li>
              Open{' '}
              <a
                href="https://dash.cloudflare.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-vega-ctaPrimary underline"
              >
                Cloudflare Dashboard
              </a>{' '}
              $\to$ <strong>Workers & Pages</strong> $\to$ <strong>Create Worker</strong>.
            </li>
            <li>Click <strong>Deploy</strong> $\to$ <strong>Edit code</strong> $\to$ paste the proxy script below.</li>
            <li>Copy your assigned URL (e.g. <span className="font-mono text-white/90">https://my-proxy.workers.dev/?url=</span>) and paste it into the box above!</li>
          </ol>
          <button
            type="button"
            onClick={handleCopyWorkerScript}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-medium transition-colors"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Worker Code Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Worker Script</span>
              </>
            )}
          </button>
        </div>

        {/* Solution 3: Local Device Proxy */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-bold text-white">
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>Option 3: Local Network Proxy (Localhost / LAN)</span>
            </div>
            <button
              type="button"
              onClick={handleUseLocal}
              className="text-[11px] text-vega-ctaPrimary hover:underline font-semibold"
            >
              Use Local (8080)
            </button>
          </div>
          <p className="text-[11px] text-vega-textSecondary leading-relaxed">
            Run <span className="font-mono text-white">node scripts/local-proxy.js</span> on your device. Note: Modern browsers enforce Mixed Content security and block plain HTTP requests from HTTPS GitHub Pages unless opened locally over HTTP (<span className="font-mono text-white">http://localhost:5173</span>).
          </p>
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-3 pt-2 border-t border-white/5">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleSave} disabled={!inputUrl.trim()}>
            Save & Connect
          </Button>
        </div>
      </div>
    </Modal>
  );
};
