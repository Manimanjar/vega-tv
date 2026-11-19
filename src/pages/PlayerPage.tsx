import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ProviderEngine } from '../lib/providers/providerEngine';
import { Stream } from '../lib/providers/types';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { useSettingsStore } from '../stores/settingsStore';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const PlayerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const link = searchParams.get('link') || '';
  const title = searchParams.get('title') || 'Playback';
  const poster = searchParams.get('poster') || '';
  const provider = searchParams.get('provider') || '';
  const type = searchParams.get('type') || 'movie';

  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStreams = async () => {
    if (!link) {
      setError('No playback link provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const engine = ProviderEngine.getInstance();
      const resolved = await engine.getStream(provider, link, type);

      if (!resolved || resolved.length === 0) {
        // Fallback: if link is already direct m3u8 or mp4
        if (link.startsWith('http')) {
          setStreams([
            {
              server: 'Direct Link',
              link,
              type: link.includes('m3u8') ? 'm3u8' : 'mp4',
              quality: 'Original',
            },
          ]);
          setIsLoading(false);
          return;
        }
        throw new Error('No playable video streams returned by provider');
      }

      setStreams(resolved);
      setIsLoading(false);
    } catch (err: any) {
      console.error('Failed to extract stream:', err);
      // Fallback check: if link is a direct video url
      if (link.startsWith('http') && (link.includes('.m3u8') || link.includes('.mp4'))) {
        setStreams([
          {
            server: 'Direct Stream',
            link,
            type: link.includes('m3u8') ? 'm3u8' : 'mp4',
            quality: 'Direct',
          },
        ]);
        setIsLoading(false);
        return;
      }

      setError(
        err.message ||
          'Failed to resolve stream link. You may need a configured CORS proxy.'
      );
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStreams();
  }, [link, provider, type]);

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
        <div className="w-16 h-16 border-4 border-vega-ctaPrimary/30 border-t-vega-ctaPrimary rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold text-white mb-1">Loading Video Stream...</h2>
        <p className="text-xs text-vega-textSecondary max-w-sm text-center">
          Connecting to provider source and resolving media endpoints.
        </p>
      </div>
    );
  }

  if (error || streams.length === 0) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-6 z-50 text-center">
        <div className="w-16 h-16 rounded-full bg-vega-surface2 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-vega-error" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Stream Playback Failed</h2>
        <p className="text-sm text-vega-textSecondary max-w-md mb-6 leading-relaxed">
          {error || 'No stream URLs were found for this item.'}
        </p>
        <div className="flex gap-3">
          <Button variant="primary" onClick={fetchStreams}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Retry
          </Button>
          <Button variant="secondary" onClick={() => navigate(-1)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black z-50 w-screen h-screen overflow-hidden">
      <VideoPlayer
        streams={streams}
        title={title}
        poster={poster}
        contentId={link}
        providerValue={provider}
        onBack={() => navigate(-1)}
      />
    </div>
  );
};
