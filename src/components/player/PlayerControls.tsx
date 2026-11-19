import React, { useState } from 'react';
import {
  ArrowLeft,
  Play,
  Pause,
  RotateCcw,
  RotateCw,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Sliders,
  Server,
  PictureInPicture2,
  Lock,
  Scaling,
  ListVideo,
  Zap,
} from 'lucide-react';
import { ProgressBar } from './ProgressBar';
import { QualitySelector, QualityOption } from './QualitySelector';
import { ServerSelector } from './ServerSelector';
import { Stream } from '../../lib/providers/types';

export type AspectRatioMode = 'contain' | 'cover' | 'fill';

interface EpisodeItem {
  title: string;
  link: string;
}

interface PlayerControlsProps {
  title: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  buffered: number;
  volume: number;
  isMuted: boolean;
  isFullscreen: boolean;
  isLocked: boolean;
  aspectRatio: AspectRatioMode;
  playbackSpeed: number;
  qualities: QualityOption[];
  currentQuality: number;
  streams: Stream[];
  currentStreamIndex: number;
  streamRoutingMode?: 'direct' | 'proxy';
  isVisible: boolean;
  episodes?: EpisodeItem[];
  currentEpisodeLink?: string;
  onPlayPause: () => void;
  onSeek: (time: number) => void;
  onSkip: (delta: number) => void;
  onVolumeChange: (vol: number) => void;
  onToggleMute: () => void;
  onToggleFullscreen: () => void;
  onTogglePiP: () => void;
  onToggleLock: () => void;
  onToggleRoutingMode?: () => void;
  onCycleAspectRatio: () => void;
  onSpeedChange: (speed: number) => void;
  onQualitySelect: (index: number) => void;
  onStreamSelect: (index: number) => void;
  onEpisodeSelect?: (ep: EpisodeItem) => void;
  onBack: () => void;
}

export const PlayerControls: React.FC<PlayerControlsProps> = ({
  title,
  isPlaying,
  currentTime,
  duration,
  buffered,
  volume,
  isMuted,
  isFullscreen,
  isLocked,
  aspectRatio,
  playbackSpeed,
  qualities,
  currentQuality,
  streams,
  currentStreamIndex,
  streamRoutingMode = 'direct',
  isVisible,
  episodes = [],
  currentEpisodeLink,
  onPlayPause,
  onSeek,
  onSkip,
  onVolumeChange,
  onToggleMute,
  onToggleFullscreen,
  onTogglePiP,
  onToggleLock,
  onToggleRoutingMode,
  onCycleAspectRatio,
  onSpeedChange,
  onQualitySelect,
  onStreamSelect,
  onEpisodeSelect,
  onBack,
}) => {
  const [showQualityMenu, setShowQualityMenu] = useState(false);
  const [showServerMenu, setShowServerMenu] = useState(false);
  const [showEpisodesMenu, setShowEpisodesMenu] = useState(false);

  const speeds = [0.5, 0.75, 1.0, 1.25, 1.5, 2.0];

  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    if (hrs > 0) {
      return `${hrs}:${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
    }
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const handleNextSpeed = () => {
    const nextIdx = (speeds.indexOf(playbackSpeed) + 1) % speeds.length;
    onSpeedChange(speeds[nextIdx]);
  };

  const getAspectLabel = (mode: AspectRatioMode) => {
    switch (mode) {
      case 'cover':
        return 'Fill';
      case 'fill':
        return 'Stretch';
      default:
        return 'Fit';
    }
  };

  // If player is locked, don't show full overlay
  if (isLocked) {
    return null;
  }

  return (
    <div
      className={`absolute inset-0 z-30 flex flex-col justify-between p-4 sm:p-8 transition-opacity duration-300 pointer-events-none select-none bg-gradient-to-t from-black/90 via-black/25 to-black/85 ${
        isVisible ? 'opacity-100 pointer-events-auto' : 'opacity-0'
      }`}
      data-nav-section="player-overlay"
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-3 min-w-0">
          <button
            type="button"
            aria-label="Back"
            data-focusable="true"
            data-nav-section="player-top"
            onClick={onBack}
            className="p-2.5 rounded-full bg-black/50 hover:bg-white/20 text-white backdrop-blur-md transition-colors flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h1 className="text-sm sm:text-lg font-bold text-white truncate max-w-xs sm:max-w-md md:max-w-xl drop-shadow">
            {title}
          </h1>
        </div>

        {/* Top Controls Action Row */}
        <div className="flex items-center gap-2">
          {/* Stream Speed Mode Pill */}
          {onToggleRoutingMode && (
            <button
              type="button"
              data-focusable="true"
              data-nav-section="player-top"
              onClick={onToggleRoutingMode}
              title="Click to toggle Direct CDN (Full Speed) vs Edge Proxy"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold transition-all backdrop-blur-md ${
                streamRoutingMode === 'direct'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
              }`}
            >
              <Zap className="w-3.5 h-3.5 fill-current" />
              <span>{streamRoutingMode === 'direct' ? 'Direct CDN (30+ Mbps)' : 'Edge Proxy'}</span>
            </button>
          )}

          {/* Episode Switcher (Series) */}
          {episodes.length > 1 && (
            <div className="relative">
              <button
                type="button"
                data-focusable="true"
                data-nav-section="player-top"
                onClick={() => {
                  setShowEpisodesMenu((prev) => !prev);
                  setShowServerMenu(false);
                  setShowQualityMenu(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-colors"
              >
                <ListVideo className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Episodes</span>
              </button>

              {showEpisodesMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 max-h-72 overflow-y-auto bg-vega-surface1 border border-white/10 rounded-2xl p-2 shadow-2xl z-50 no-scrollbar">
                  <div className="text-[11px] font-bold text-vega-textSecondary px-2 py-1 uppercase">
                    Select Episode
                  </div>
                  {episodes.map((ep, idx) => {
                    const isCurrent = ep.link === currentEpisodeLink;
                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setShowEpisodesMenu(false);
                          onEpisodeSelect?.(ep);
                        }}
                        className={`w-full text-left p-2.5 rounded-xl text-xs font-semibold truncate transition-colors ${
                          isCurrent
                            ? 'bg-vega-ctaPrimary text-vega-ctaText'
                            : 'hover:bg-white/10 text-white'
                        }`}
                      >
                        {ep.title || `Episode ${idx + 1}`}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Server & Stream Switcher */}
          {streams.length > 1 && (
            <div className="relative">
              <button
                type="button"
                data-focusable="true"
                data-nav-section="player-top"
                onClick={() => {
                  setShowServerMenu((prev) => !prev);
                  setShowQualityMenu(false);
                  setShowEpisodesMenu(false);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-colors"
              >
                <Server className="w-3.5 h-3.5 text-vega-ctaPrimary" />
                <span className="max-w-[120px] truncate">
                  {streams[currentStreamIndex]?.server || `Server ${currentStreamIndex + 1}`}
                </span>
              </button>

              {showServerMenu && (
                <ServerSelector
                  streams={streams}
                  currentStreamIndex={currentStreamIndex}
                  onSelect={onStreamSelect}
                  onClose={() => setShowServerMenu(false)}
                />
              )}
            </div>
          )}

          {/* Aspect Ratio Toggle */}
          <button
            type="button"
            data-focusable="true"
            data-nav-section="player-top"
            onClick={onCycleAspectRatio}
            title={`Aspect ratio: ${getAspectLabel(aspectRatio)}`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/50 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-md transition-colors"
          >
            <Scaling className="w-3.5 h-3.5" />
            <span>{getAspectLabel(aspectRatio)}</span>
          </button>

          {/* Screen Lock Button */}
          <button
            type="button"
            aria-label="Lock screen controls"
            data-focusable="true"
            data-nav-section="player-top"
            onClick={onToggleLock}
            className="p-2.5 rounded-full bg-black/50 hover:bg-white/20 text-white backdrop-blur-md transition-colors"
          >
            <Lock className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Controls (Skip / Play / Skip) */}
      <div className="flex items-center justify-center gap-8 sm:gap-16">
        {/* Skip Back 10s */}
        <button
          type="button"
          aria-label="Skip backward 10 seconds"
          data-focusable="true"
          data-nav-section="player-center"
          onClick={() => onSkip(-10)}
          className="p-3.5 sm:p-5 rounded-full bg-black/50 hover:bg-white/20 text-white/90 hover:text-white backdrop-blur-md transition-all transform active:scale-90"
        >
          <RotateCcw className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>

        {/* Play / Pause Primary Button */}
        <button
          type="button"
          aria-label={isPlaying ? 'Pause' : 'Play'}
          data-focusable="true"
          data-nav-section="player-center"
          onClick={onPlayPause}
          className="p-5 sm:p-7 rounded-full bg-vega-ctaPrimary text-vega-ctaText shadow-2xl hover:scale-105 active:scale-95 transition-all"
        >
          {isPlaying ? (
            <Pause className="w-8 h-8 sm:w-11 sm:h-11 fill-current" />
          ) : (
            <Play className="w-8 h-8 sm:w-11 sm:h-11 fill-current ml-1" />
          )}
        </button>

        {/* Skip Forward 10s */}
        <button
          type="button"
          aria-label="Skip forward 10 seconds"
          data-focusable="true"
          data-nav-section="player-center"
          onClick={() => onSkip(10)}
          className="p-3.5 sm:p-5 rounded-full bg-black/50 hover:bg-white/20 text-white/90 hover:text-white backdrop-blur-md transition-all transform active:scale-90"
        >
          <RotateCw className="w-6 h-6 sm:w-8 sm:h-8" />
        </button>
      </div>

      {/* Bottom Controls */}
      <div className="w-full space-y-2.5">
        {/* Progress bar */}
        <ProgressBar
          currentTime={currentTime}
          duration={duration}
          buffered={buffered}
          onSeek={onSeek}
        />

        <div className="flex items-center justify-between text-white text-xs sm:text-sm font-medium">
          {/* Time & Volume */}
          <div className="flex items-center gap-4">
            <span className="font-mono text-vega-textSecondary">
              <span className="text-white font-semibold">{formatTime(currentTime)}</span> / {formatTime(duration)}
            </span>

            {/* Volume */}
            <div className="hidden sm:flex items-center gap-2">
              <button
                type="button"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
                data-focusable="true"
                data-nav-section="player-bottom"
                onClick={onToggleMute}
                className="p-1.5 rounded-full hover:bg-white/10 transition-colors"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-vega-textSecondary" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                className="w-20 h-1 bg-white/30 rounded-lg accent-vega-ctaPrimary cursor-pointer"
              />
            </div>
          </div>

          {/* Right Action Icons */}
          <div className="flex items-center gap-2 sm:gap-3">
            {/* Playback Speed */}
            <button
              type="button"
              data-focusable="true"
              data-nav-section="player-bottom"
              onClick={handleNextSpeed}
              className="px-2.5 py-1 rounded-full bg-black/50 hover:bg-white/20 text-xs font-semibold backdrop-blur-md transition-colors"
            >
              {playbackSpeed}x
            </button>

            {/* Quality Selector */}
            {qualities.length > 0 && (
              <div className="relative">
                <button
                  type="button"
                  data-focusable="true"
                  data-nav-section="player-bottom"
                  onClick={() => {
                    setShowQualityMenu((prev) => !prev);
                    setShowServerMenu(false);
                    setShowEpisodesMenu(false);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-black/50 hover:bg-white/20 text-xs font-semibold backdrop-blur-md transition-colors"
                >
                  <Sliders className="w-3 h-3" />
                  <span>
                    {qualities.find((q) => q.index === currentQuality)?.label || 'Quality'}
                  </span>
                </button>

                {showQualityMenu && (
                  <QualitySelector
                    qualities={qualities}
                    currentQuality={currentQuality}
                    onSelect={onQualitySelect}
                    onClose={() => setShowQualityMenu(false)}
                  />
                )}
              </div>
            )}

            {/* Picture-in-Picture */}
            {document.pictureInPictureEnabled && (
              <button
                type="button"
                aria-label="Picture-in-Picture"
                data-focusable="true"
                data-nav-section="player-bottom"
                onClick={onTogglePiP}
                className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
              >
                <PictureInPicture2 className="w-4 h-4" />
              </button>
            )}

            {/* Fullscreen */}
            <button
              type="button"
              aria-label={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
              data-focusable="true"
              data-nav-section="player-bottom"
              onClick={onToggleFullscreen}
              className="p-2 rounded-full hover:bg-white/10 text-white transition-colors"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
