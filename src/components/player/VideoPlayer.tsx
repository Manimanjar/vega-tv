import React, { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { Stream } from '../../lib/providers/types';
import { PlayerControls, AspectRatioMode } from './PlayerControls';
import { QualityOption } from './QualitySelector';
import { useWatchHistoryStore } from '../../stores/watchHistoryStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { smartProxy } from '../../lib/providers/smartProxy';
import { Lock, Unlock, Play, X, RotateCcw, RotateCw } from 'lucide-react';

interface EpisodeItem {
  title: string;
  link: string;
}

interface VideoPlayerProps {
  streams: Stream[];
  title: string;
  poster?: string;
  contentId: string;
  providerValue: string;
  episodes?: EpisodeItem[];
  currentEpisodeLink?: string;
  nextEpisode?: EpisodeItem;
  onSelectEpisode?: (ep: EpisodeItem) => void;
  onBack: () => void;
  onEnded?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  streams,
  title,
  poster,
  contentId,
  providerValue,
  episodes = [],
  currentEpisodeLink,
  nextEpisode,
  onSelectEpisode,
  onBack,
  onEnded,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideControlsTimerRef = useRef<any>(null);
  const lastProgressSavedRef = useRef<number>(0);
  const lastTapTimeRef = useRef<number>(0);

  const [currentStreamIndex, setCurrentStreamIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isBuffering, setIsBuffering] = useState(true);
  const [isControlsVisible, setIsControlsVisible] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New features matching Vega App
  const [isLocked, setIsLocked] = useState(false);
  const [showUnlockPill, setShowUnlockPill] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<AspectRatioMode>('contain');
  const [seekRipple, setSeekRipple] = useState<{ side: 'left' | 'right'; text: string } | null>(null);
  const [autoNextDismissed, setAutoNextDismissed] = useState(false);

  const [qualities, setQualities] = useState<QualityOption[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 auto

  const { playbackSpeed, setPlaybackSpeed } = useSettingsStore();
  const { updateProgress, getProgress } = useWatchHistoryStore();

  const activeStream = streams[currentStreamIndex] || streams[0];

  // Show controls and reset hide timer
  const showControls = useCallback(() => {
    if (isLocked) {
      setShowUnlockPill(true);
      setTimeout(() => setShowUnlockPill(false), 3000);
      return;
    }

    setIsControlsVisible(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    hideControlsTimerRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, 4000);
  }, [isLocked]);

  // Cycle aspect ratio mode (fit -> fill -> stretch)
  const handleCycleAspectRatio = () => {
    setAspectRatio((prev) => {
      if (prev === 'contain') return 'cover';
      if (prev === 'cover') return 'fill';
      return 'contain';
    });
  };

  // Toggle touch lock
  const handleToggleLock = () => {
    setIsLocked((prev) => !prev);
    setIsControlsVisible(false);
  };

  // Initialize playback source with smartProxy routing
  useEffect(() => {
    if (!activeStream || !videoRef.current) return;
    const video = videoRef.current;
    setErrorMessage(null);
    setIsBuffering(true);

    // Format stream URL through smartProxy to bypass CORS & inject Referer headers
    const rawLink = activeStream.link;
    const streamUrl = smartProxy.formatUrl(rawLink);

    const isHls =
      activeStream.type === 'm3u8' ||
      rawLink.includes('.m3u8') ||
      rawLink.includes('m3u8');

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    // Check saved progress to resume
    const saved = getProgress(contentId);
    let initialSeek = 0;
    if (saved && saved.currentTime > 5 && saved.duration > 0 && saved.currentTime < saved.duration * 0.95) {
      initialSeek = saved.currentTime;
    }

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
        maxBufferLength: 60,
        xhrSetup: (xhr, url) => {
          // If the segment request is directly to CDN without proxy, route through proxy
          if (activeStream.headers) {
            Object.entries(activeStream.headers).forEach(([k, v]) => {
              try {
                xhr.setRequestHeader(k, v);
              } catch {
                // Ignore restricted headers
              }
            });
          }
        },
      });

      hlsRef.current = hls;
      hls.loadSource(streamUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        setIsBuffering(false);
        const qualityOptions: QualityOption[] = [
          { index: -1, label: 'Auto' },
          ...data.levels.map((lvl, idx) => ({
            index: idx,
            label: lvl.name || `${lvl.height}p` || `Level ${idx + 1}`,
            height: lvl.height,
          })),
        ];
        setQualities(qualityOptions);

        if (initialSeek > 0) {
          video.currentTime = initialSeek;
        }

        video.play().catch(() => {
          setIsPlaying(false);
        });
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        setCurrentQuality(hls.autoLevelEnabled ? -1 : data.level);
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.warn('HLS stream error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setErrorMessage('Playback error. Please try switching servers or check proxy.');
              break;
          }
        }
      });
    } else {
      // Native video playback (MP4 or Safari native HLS)
      video.src = streamUrl;
      video.load();

      const onLoaded = () => {
        setIsBuffering(false);
        if (initialSeek > 0) {
          video.currentTime = initialSeek;
        }
        video.play().catch(() => setIsPlaying(false));
      };

      const onError = () => {
        setIsBuffering(false);
        setErrorMessage('Failed to load video stream. Tap below to switch server.');
      };

      video.addEventListener('loadedmetadata', onLoaded, { once: true });
      video.addEventListener('error', onError, { once: true });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [activeStream, contentId, getProgress]);

  // Video event handlers
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    const dur = videoRef.current.duration || 0;
    setCurrentTime(cur);
    setDuration(dur);

    // Calculate buffered range
    if (videoRef.current.buffered.length > 0) {
      setBuffered(videoRef.current.buffered.end(videoRef.current.buffered.length - 1));
    }

    // Auto next trigger check
    if (dur > 30 && dur - cur <= 15 && nextEpisode && !autoNextDismissed) {
      // Show auto next card
    }

    // Save progress throttled to every 5 seconds
    const now = Date.now();
    if (now - lastProgressSavedRef.current > 5000 && dur > 0) {
      lastProgressSavedRef.current = now;
      updateProgress({
        id: contentId,
        title,
        image: poster || '',
        providerValue,
        currentTime: cur,
        duration: dur,
      });
    }
  };

  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
    showControls();
  };

  const handleSeek = (targetTime: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
    showControls();
  };

  const handleSkip = (delta: number) => {
    if (!videoRef.current) return;
    const target = Math.max(0, Math.min(duration, videoRef.current.currentTime + delta));
    videoRef.current.currentTime = target;
    setCurrentTime(target);

    // Trigger visual ripple indicator
    setSeekRipple({
      side: delta > 0 ? 'right' : 'left',
      text: delta > 0 ? `+${delta}s` : `${delta}s`,
    });
    setTimeout(() => setSeekRipple(null), 700);

    showControls();
  };

  const handleVolumeChange = (newVol: number) => {
    if (!videoRef.current) return;
    videoRef.current.volume = newVol;
    setVolume(newVol);
    setIsMuted(newVol === 0);
  };

  const handleToggleMute = () => {
    if (!videoRef.current) return;
    const nextMuted = !isMuted;
    videoRef.current.muted = nextMuted;
    setIsMuted(nextMuted);
  };

  const handleToggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      try {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } catch (e) {
        console.warn('Fullscreen request failed:', e);
      }
    } else {
      try {
        await document.exitFullscreen();
        setIsFullscreen(false);
      } catch (e) {
        console.warn('Exit fullscreen failed:', e);
      }
    }
  };

  const handleTogglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.warn('PiP error:', e);
    }
  };

  const handleQualitySelect = (qualityIndex: number) => {
    if (!hlsRef.current) return;
    setCurrentQuality(qualityIndex);
    if (qualityIndex === -1) {
      hlsRef.current.currentLevel = -1; // Auto
    } else {
      hlsRef.current.currentLevel = qualityIndex;
    }
  };

  const handleStreamSelect = (index: number) => {
    setCurrentStreamIndex(index);
  };

  const handleSpeedChange = (speed: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = speed;
    setPlaybackSpeed(speed);
  };

  // Double tap / click handler for mobile and touch
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isLocked) {
      setShowUnlockPill(true);
      setTimeout(() => setShowUnlockPill(false), 3000);
      return;
    }

    const now = Date.now();
    const timeDiff = now - lastTapTimeRef.current;
    lastTapTimeRef.current = now;

    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;

    if (timeDiff < 300) {
      // Double tap detected
      if (clickX < rect.width * 0.35) {
        handleSkip(-10);
      } else if (clickX > rect.width * 0.65) {
        handleSkip(10);
      } else {
        handlePlayPause();
      }
    } else {
      // Single tap toggles controls
      if (isControlsVisible) {
        setIsControlsVisible(false);
      } else {
        showControls();
      }
    }
  };

  // Keyboard controls for desktop & Smart TV
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      showControls();
      switch (e.key) {
        case ' ':
        case 'k':
        case 'K':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
        case 'j':
        case 'J':
          e.preventDefault();
          handleSkip(-10);
          break;
        case 'ArrowRight':
        case 'l':
        case 'L':
          e.preventDefault();
          handleSkip(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          handleVolumeChange(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          handleVolumeChange(Math.max(0, volume - 0.1));
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          handleToggleFullscreen();
          break;
        case 'm':
        case 'M':
          e.preventDefault();
          handleToggleMute();
          break;
        case 'Escape':
          if (isFullscreen) {
            handleToggleFullscreen();
          } else {
            onBack();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [volume, showControls, isFullscreen, onBack]);

  const remainingSeconds = Math.max(0, Math.ceil(duration - currentTime));
  const showAutoNext =
    duration > 30 &&
    remainingSeconds <= 15 &&
    remainingSeconds > 0 &&
    nextEpisode &&
    !autoNextDismissed;

  return (
    <div
      ref={containerRef}
      onMouseMove={showControls}
      onClick={handleContainerClick}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden select-none"
    >
      {/* HTML5 Video Element with Aspect Ratio mode */}
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={() => {
          if (nextEpisode && onSelectEpisode) {
            onSelectEpisode(nextEpisode);
          } else if (onEnded) {
            onEnded();
          }
        }}
        className={`w-full h-full ${
          aspectRatio === 'cover'
            ? 'object-cover'
            : aspectRatio === 'fill'
            ? 'object-fill'
            : 'object-contain'
        }`}
      />

      {/* Double Tap Seek Animation Ripples */}
      {seekRipple && (
        <div
          className={`absolute inset-y-0 w-1/3 flex items-center justify-center pointer-events-none z-20 ${
            seekRipple.side === 'left' ? 'left-0 bg-white/5 rounded-r-full' : 'right-0 bg-white/5 rounded-l-full'
          } animate-pulse`}
        >
          <div className="flex flex-col items-center gap-1.5 p-4 rounded-full bg-black/60 backdrop-blur-md border border-white/10">
            {seekRipple.side === 'left' ? (
              <RotateCcw className="w-8 h-8 text-white animate-spin" />
            ) : (
              <RotateCw className="w-8 h-8 text-white animate-spin" />
            )}
            <span className="text-sm font-bold text-white">{seekRipple.text}</span>
          </div>
        </div>
      )}

      {/* Floating Unlock Pill when Locked */}
      {isLocked && showUnlockPill && (
        <div className="absolute top-8 z-40 animate-bounce">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsLocked(false);
              setIsControlsVisible(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-vega-ctaPrimary text-vega-ctaText font-bold text-sm shadow-2xl border border-white/20 active:scale-95 transition-transform"
          >
            <Unlock className="w-4 h-4" />
            <span>Tap to Unlock Screen</span>
          </button>
        </div>
      )}

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-16 h-16 border-4 border-vega-ctaPrimary/30 border-t-vega-ctaPrimary rounded-full animate-spin" />
        </div>
      )}

      {/* Auto Next Episode Countdown Card */}
      {showAutoNext && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-24 right-6 sm:right-10 z-40 bg-vega-surface1/95 border border-white/15 rounded-2xl p-4 shadow-2xl backdrop-blur-xl flex flex-col gap-3 max-w-xs animate-slide-up"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-vega-ctaPrimary">
              Up Next in {remainingSeconds}s
            </span>
            <button
              onClick={() => setAutoNextDismissed(true)}
              className="text-white/60 hover:text-white p-1"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="text-xs font-semibold text-white truncate">
            {nextEpisode.title}
          </div>
          <button
            onClick={() => onSelectEpisode?.(nextEpisode)}
            className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-vega-ctaPrimary text-vega-ctaText text-xs font-bold shadow-md hover:bg-white transition-colors"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Play Next Episode</span>
          </button>
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute inset-0 flex flex-col items-center justify-center bg-black/95 p-6 z-40 text-center"
        >
          <div className="w-14 h-14 rounded-2xl bg-vega-surface2 flex items-center justify-center mb-4 text-vega-error border border-vega-error/30">
            <span className="text-2xl font-bold">!</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">{errorMessage}</h2>
          <p className="text-sm text-vega-textSecondary mb-6 max-w-sm">
            Check your CORS proxy configuration or switch to another server.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => {
                if (streams.length > 1) {
                  setCurrentStreamIndex((prev) => (prev + 1) % streams.length);
                } else {
                  onBack();
                }
              }}
              className="px-5 py-2.5 rounded-full bg-vega-ctaPrimary text-vega-ctaText text-sm font-semibold hover:bg-white"
            >
              {streams.length > 1 ? 'Try Next Server' : 'Go Back'}
            </button>
          </div>
        </div>
      )}

      {/* Overlay controls matching Vega App */}
      <PlayerControls
        title={title}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        buffered={buffered}
        volume={volume}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
        isLocked={isLocked}
        aspectRatio={aspectRatio}
        playbackSpeed={playbackSpeed}
        qualities={qualities}
        currentQuality={currentQuality}
        streams={streams}
        currentStreamIndex={currentStreamIndex}
        isVisible={isControlsVisible}
        episodes={episodes}
        currentEpisodeLink={currentEpisodeLink}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onSkip={handleSkip}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleFullscreen={handleToggleFullscreen}
        onTogglePiP={handleTogglePiP}
        onToggleLock={handleToggleLock}
        onCycleAspectRatio={handleCycleAspectRatio}
        onSpeedChange={handleSpeedChange}
        onQualitySelect={handleQualitySelect}
        onStreamSelect={handleStreamSelect}
        onEpisodeSelect={onSelectEpisode}
        onBack={onBack}
      />
    </div>
  );
};
