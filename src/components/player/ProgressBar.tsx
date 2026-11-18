import React, { useRef, useState } from 'react';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  buffered: number;
  onSeek: (time: number) => void;
  navSection?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTime,
  duration,
  buffered,
  onSeek,
  navSection = 'player-controls',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoverPosition, setHoverPosition] = useState<number | null>(null);

  const safeDuration = duration > 0 ? duration : 1;
  const currentPercent = Math.min(100, Math.max(0, (currentTime / safeDuration) * 100));
  const bufferedPercent = Math.min(100, Math.max(0, (buffered / safeDuration) * 100));

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

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    onSeek(ratio * safeDuration);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(ratio * safeDuration);
  };

  const handleMouseLeave = () => {
    setHoverPosition(null);
  };

  return (
    <div
      ref={containerRef}
      role="slider"
      aria-label="Video progress"
      aria-valuemin={0}
      aria-valuemax={duration}
      aria-valuenow={currentTime}
      data-focusable="true"
      data-nav-section={navSection}
      onPointerDown={handlePointerDown}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onKeyDown={(e) => {
        if (e.key === 'ArrowLeft') {
          e.preventDefault();
          onSeek(Math.max(0, currentTime - 10));
        } else if (e.key === 'ArrowRight') {
          e.preventDefault();
          onSeek(Math.min(safeDuration, currentTime + 10));
        }
      }}
      className="relative w-full h-8 flex items-center cursor-pointer group focus:outline-none"
    >
      {/* Background track */}
      <div className="w-full h-1.5 group-hover:h-2.5 bg-white/20 rounded-full overflow-hidden transition-all duration-200">
        {/* Buffered indicator */}
        <div
          className="h-full bg-white/30 rounded-full transition-all duration-200"
          style={{ width: `${bufferedPercent}%` }}
        />
      </div>

      {/* Played progress fill */}
      <div
        className="absolute top-1/2 -translate-y-1/2 left-0 h-1.5 group-hover:h-2.5 bg-vega-ctaPrimary rounded-full transition-all duration-75"
        style={{ width: `${currentPercent}%` }}
      />

      {/* Scrubber thumb */}
      <div
        className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-vega-ctaPrimary rounded-full shadow-lg scale-0 group-hover:scale-100 group-focus:scale-100 transition-transform duration-150 -ml-2"
        style={{ left: `${currentPercent}%` }}
      />

      {/* Time hover tooltip */}
      {hoverPosition !== null && (
        <div
          className="absolute -top-7 transform -translate-x-1/2 px-2 py-0.5 bg-black/80 text-white text-xs rounded border border-white/10 pointer-events-none"
          style={{ left: `${(hoverPosition / safeDuration) * 100}%` }}
        >
          {formatTime(hoverPosition)}
        </div>
      )}
    </div>
  );
};
