import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ProviderEngine } from '../lib/providers/providerEngine';
import { Stream, Info } from '../lib/providers/types';
import { VideoPlayer } from '../components/player/VideoPlayer';
import { ArrowLeft, AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '../components/ui/Button';

export const PlayerPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const link = searchParams.get('link') || '';
  const title = searchParams.get('title') || 'Playback';
  const poster = searchParams.get('poster') || '';
  const provider = searchParams.get('provider') || '';
  const type = searchParams.get('type') || 'movie';
  const infoUrl = searchParams.get('infoUrl') || '';

  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [metaInfo, setMetaInfo] = useState<Info | null>(null);

  // Load stream links
  const fetchStreams = async (targetLink: string = link) => {
    if (!targetLink) {
      setError('No playback link provided');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const engine = ProviderEngine.getInstance();
      const resolved = await engine.getStream(provider, targetLink, type);

      if (!resolved || resolved.length === 0) {
        if (targetLink.startsWith('http')) {
          setStreams([
            {
              server: 'Direct Link',
              link: targetLink,
              type: targetLink.includes('m3u8') ? 'm3u8' : 'mp4',
              quality: 'Original',
            },
          ]);
          setIsLoading(false);
          return;
        }
        throw new Error('No playable video streams returned by provider');
      }

      // Prioritize high-speed native browser streams (HLS/MP4) first over raw MKV
      const sorted = [...resolved].sort((a, b) => {
        const isAMkv = a?.type === 'mkv' || a?.link?.endsWith('.mkv') || a?.link?.includes('.mkv?');
        const isBMkv = b?.type === 'mkv' || b?.link?.endsWith('.mkv') || b?.link?.includes('.mkv?');
        const aScore =
          (isAMkv ? -100 : 0) +
          (a?.type === 'm3u8' || a?.link?.includes('.m3u8') ? 60 : 20) +
          (a?.quality?.includes('1080')
            ? 30
            : a?.quality?.includes('720')
            ? 15
            : 5);
        const bScore =
          (isBMkv ? -100 : 0) +
          (b?.type === 'm3u8' || b?.link?.includes('.m3u8') ? 60 : 20) +
          (b?.quality?.includes('1080')
            ? 30
            : b?.quality?.includes('720')
            ? 15
            : 5);
        return bScore - aScore;
      });

      setStreams(sorted);
      setIsLoading(false);
    } catch (err: any) {
      console.warn('Primary stream extraction warning:', err);
      try {
        // Direct media failover ONLY if targetLink is genuinely a media URL, NOT an HTML webpage, title or JSON!
        const isMediaUrl =
          typeof targetLink === 'string' &&
          (targetLink.startsWith('http://') || targetLink.startsWith('https://')) &&
          !targetLink.startsWith('{') &&
          !targetLink.endsWith('/') &&
          !targetLink.endsWith('.html') &&
          !targetLink.includes('/download-') &&
          !targetLink.includes('/archives/') &&
          (targetLink.includes('.m3u8') || targetLink.includes('.mp4') || targetLink.endsWith('.mkv') || targetLink.includes('.mkv?'));

        if (isMediaUrl) {
          setStreams([
            {
              server: 'Direct Media Failover',
              link: targetLink,
              type: targetLink.includes('.m3u8') ? 'm3u8' : targetLink.endsWith('.mkv') || targetLink.includes('.mkv?') ? 'mkv' : 'mp4',
              quality: 'Direct',
            },
          ]);
          setIsLoading(false);
          return;
        }
      } catch {}

      setError(
        err?.message ||
          'Failed to resolve playable streams. Please return to Details and select an episode, or switch provider.'
      );
      setIsLoading(false);
    }
  };

  // Load metadata for series episode list if infoUrl or link available
  useEffect(() => {
    const metaTarget = infoUrl || link;
    if (metaTarget && provider) {
      const engine = ProviderEngine.getInstance();
      engine
        .getMeta(provider, metaTarget)
        .then((m) => setMetaInfo(m))
        .catch(() => {});
    }
  }, [infoUrl, link, provider]);

  useEffect(() => {
    fetchStreams(link);
  }, [link, provider, type]);

  // Derive flat list of episodes from metaInfo
  const allEpisodes = React.useMemo(() => {
    if (!metaInfo?.linkList) return [];
    const list: { title: string; link: string }[] = [];
    metaInfo.linkList.forEach((group) => {
      group.directLinks?.forEach((item) => {
        list.push({
          title: item.title || group.title,
          link: item.link,
        });
      });
    });
    return list;
  }, [metaInfo]);

  // Determine next episode
  const nextEpisode = React.useMemo(() => {
    if (allEpisodes.length === 0) return undefined;
    const currentIndex = allEpisodes.findIndex((e) => e.link === link);
    if (currentIndex >= 0 && currentIndex < allEpisodes.length - 1) {
      return allEpisodes[currentIndex + 1];
    }
    return undefined;
  }, [allEpisodes, link]);

  const handleSelectEpisode = (ep: { title: string; link: string }) => {
    setSearchParams({
      link: ep.link,
      title: `${metaInfo?.title || title} - ${ep.title}`,
      poster,
      provider,
      type,
      infoUrl: infoUrl || link,
    });
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center z-50">
        <div className="w-16 h-16 border-4 border-vega-ctaPrimary/30 border-t-vega-ctaPrimary rounded-full animate-spin mb-4" />
        <h2 className="text-lg font-bold text-white mb-1">Connecting Stream Server...</h2>
        <p className="text-xs text-vega-textSecondary max-w-sm text-center">
          Resolving media endpoints with high-speed proxy routing.
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
          <Button variant="primary" onClick={() => fetchStreams(link)}>
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
        episodes={allEpisodes}
        currentEpisodeLink={link}
        nextEpisode={nextEpisode}
        onSelectEpisode={handleSelectEpisode}
        onBack={() => navigate(-1)}
      />
    </div>
  );
};
