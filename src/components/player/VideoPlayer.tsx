import React, { useRef, useState, useEffect, useCallback } from 'react';
import Hls from 'hls.js';
import { Stream } from '../../lib/providers/types';
import { PlayerControls } from './PlayerControls';
import { QualityOption } from './QualitySelector';
import { useWatchHistoryStore } from '../../stores/watchHistoryStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface VideoPlayerProps {
  streams: Stream[];
  title: string;
  poster?: string;
  contentId: string;
  providerValue: string;
  onBack: () => void;
  onEnded?: () => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  streams,
  title,
  poster,
  contentId,
  providerValue,
  onBack,
  onEnded,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const hideControlsTimerRef = useRef<any>(null);
  const lastProgressSavedRef = useRef<number>(0);

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

  const [qualities, setQualities] = useState<QualityOption[]>([]);
  const [currentQuality, setCurrentQuality] = useState(-1); // -1 auto

  const { playbackSpeed, setPlaybackSpeed } = useSettingsStore();
  const { updateProgress, getProgress } = useWatchHistoryStore();

  const activeStream = streams[currentStreamIndex] || streams[0];

  // Show controls and reset hide timer
  const showControls = useCallback(() => {
    setIsControlsVisible(true);
    if (hideControlsTimerRef.current) {
      clearTimeout(hideControlsTimerRef.current);
    }
    hideControlsTimerRef.current = setTimeout(() => {
      setIsControlsVisible(false);
    }, 3500);
  }, []);

  // Initialize playback source
  useEffect(() => {
    if (!activeStream || !videoRef.current) return;
    const video = videoRef.current;
    setErrorMessage(null);
    setIsBuffering(true);

    const streamUrl = activeStream.link;
    const isHls =
      activeStream.type === 'm3u8' ||
      streamUrl.includes('.m3u8') ||
      streamUrl.includes('m3u8');

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
        backBufferLength: 60,
        xhrSetup: (xhr) => {
          if (activeStream.headers) {
            Object.entries(activeStream.headers).forEach(([k, v]) => {
              try {
                xhr.setRequestHeader(k, v);
              } catch (e) {
                // Ignore restricted header errors
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
        console.warn('HLS error:', data);
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              hls.recoverMediaError();
              break;
            default:
              setErrorMessage('Failed to play stream. Try switching stream server.');
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

      video.addEventListener('loadedmetadata', onLoaded, { once: true });
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

  // Double tap handler for seeking (mobile/tablet)
  const handleDoubleTap = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    if (clickX < rect.width * 0.35) {
      handleSkip(-10);
    } else if (clickX > rect.width * 0.65) {
      handleSkip(10);
    } else {
      handlePlayPause();
    }
  };

  // Keyboard controls
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      showControls();
      switch (e.key) {
        case ' ':
          e.preventDefault();
          handlePlayPause();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          handleSkip(-10);
          break;
        case 'ArrowRight':
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
      }
    };

    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [volume, showControls]);

  return (
    <div
      ref={containerRef}
      onMouseMove={showControls}
      onTouchStart={showControls}
      className="relative w-full h-full bg-black flex items-center justify-center overflow-hidden select-none"
    >
      {/* HTML5 Video */}
      <video
        ref={videoRef}
        poster={poster}
        playsInline
        onPlay={() => setIsPlaying(true)}
        onPause={() => setIsPlaying(false)}
        onTimeUpdate={handleTimeUpdate}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => setIsBuffering(false)}
        onEnded={onEnded}
        onClick={handleDoubleTap}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Buffering Spinner */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-14 h-14 border-4 border-vega-ctaPrimary/30 border-t-vega-ctaPrimary rounded-full animate-spin" />
        </div>
      )}

      {/* Error state */}
      {errorMessage && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 p-6 z-40 text-center">
          <div className="w-12 h-12 rounded-full bg-vega-error flex items-center justify-center mb-4">
            <span className="text-xl font-bold">!</span>
          </div>
          <h2 className="text-lg font-bold text-white mb-2">{errorMessage}</h2>
          <p className="text-sm text-vega-textSecondary mb-6 max-w-sm">
            Check your CORS proxy configuration or select another video source.
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

      {/* Overlay controls */}
      <PlayerControls
        title={title}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        buffered={buffered}
        volume={volume}
        isMuted={isMuted}
        isFullscreen={isFullscreen}
        playbackSpeed={playbackSpeed}
        qualities={qualities}
        currentQuality={currentQuality}
        streams={streams}
        currentStreamIndex={currentStreamIndex}
        isVisible={isControlsVisible}
        onPlayPause={handlePlayPause}
        onSeek={handleSeek}
        onSkip={handleSkip}
        onVolumeChange={handleVolumeChange}
        onToggleMute={handleToggleMute}
        onToggleFullscreen={handleToggleFullscreen}
        onTogglePiP={handleTogglePiP}
        onSpeedChange={handleSpeedChange}
        onQualitySelect={handleQualitySelect}
        onStreamSelect={handleStreamSelect}
        onBack={onBack}
      />
    </div>
  );
};
