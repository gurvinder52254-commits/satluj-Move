import { useRef, useState, useCallback } from 'react';
import { formatTime } from '../utils/formatTime';

export default function ProgressBar({
  currentTime,
  duration,
  bufferedRanges,
  onSeek,
}) {
  const barRef = useRef(null);
  const [hoverTime, setHoverTime] = useState(null);
  const [hoverX, setHoverX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const getTimeFromEvent = useCallback(
    (e) => {
      const rect = barRef.current.getBoundingClientRect();
      const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      return ratio * (duration || 0);
    },
    [duration]
  );

  const handleMouseMove = useCallback(
    (e) => {
      if (!barRef.current || !duration) return;
      const rect = barRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      setHoverX(x);
      setHoverTime(getTimeFromEvent(e));
      if (isDragging) onSeek(getTimeFromEvent(e));
    },
    [duration, isDragging, getTimeFromEvent, onSeek]
  );

  const handleMouseDown = useCallback(
    (e) => {
      setIsDragging(true);
      onSeek(getTimeFromEvent(e));
    },
    [getTimeFromEvent, onSeek]
  );

  const handleMouseUp = useCallback(() => setIsDragging(false), []);
  const handleMouseLeave = useCallback(() => {
    setHoverTime(null);
    setIsDragging(false);
  }, []);

  const playedPercent = duration ? (currentTime / duration) * 100 : 0;

  return (
    <div className="progress-wrapper">
      {/* Hover tooltip */}
      {hoverTime !== null && (
        <div className="progress-tooltip" style={{ left: `${hoverX}px` }}>
          {formatTime(hoverTime)}
        </div>
      )}

      {/* The actual bar */}
      <div
        id="progress-bar"
        ref={barRef}
        className="progress-bar"
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
      >
        {/* Track */}
        <div className="progress-track">
          {/* Buffered ranges */}
          {bufferedRanges.map((range, i) => {
            if (!duration) return null;
            const left = (range.start / duration) * 100;
            const width = ((range.end - range.start) / duration) * 100;
            return (
              <div
                key={i}
                className="progress-buffered"
                style={{ left: `${left}%`, width: `${width}%` }}
              />
            );
          })}

          {/* Played */}
          <div className="progress-played" style={{ width: `${playedPercent}%` }}>
            <div className="progress-thumb" />
          </div>
        </div>
      </div>
    </div>
  );
}
