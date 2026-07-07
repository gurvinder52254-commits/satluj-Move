import VolumeControl from './VolumeControl';
import ProgressBar from './ProgressBar';
import { formatTime } from '../utils/formatTime';

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

export default function PlayerControls({
  isPlaying,
  currentTime,
  duration,
  volume,
  isMuted,
  bufferedRanges,
  playbackRate,
  isFullscreen,
  fileName,
  visible,
  onTogglePlay,
  onSeek,
  onSkip,
  onVolumeChange,
  onToggleMute,
  onChangePlaybackRate,
  onToggleFullscreen,
  onClose,
}) {
  return (
    <div className={`controls ${visible ? 'controls--visible' : 'controls--hidden'}`} id="player-controls">
      {/* Top bar: title + close */}
      <div className="controls__top">
        <div className="controls__title" title={fileName}>
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
          </svg>
          <span>{fileName}</span>
        </div>
        {onClose && (
          <button id="close-btn" className="ctrl-btn ctrl-btn--close" onClick={onClose} title="Close file">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Progress bar */}
      <ProgressBar
        currentTime={currentTime}
        duration={duration}
        bufferedRanges={bufferedRanges}
        onSeek={onSeek}
      />

      {/* Bottom: main controls */}
      <div className="controls__bottom">
        {/* Left group */}
        <div className="controls__left">
          {/* Skip back */}
          <button id="skip-back-btn" className="ctrl-btn" onClick={() => onSkip(-10)} title="Rewind 10s">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M11.99 5V1l-5 5 5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6h-2c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
              <text x="7.5" y="15.5" fontSize="5.5" fontFamily="sans-serif" fontWeight="bold" fill="currentColor">10</text>
            </svg>
          </button>

          {/* Play / Pause */}
          <button id="play-pause-btn" className="ctrl-btn ctrl-btn--play" onClick={onTogglePlay} title={isPlaying ? 'Pause' : 'Play'}>
            {isPlaying ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          {/* Skip forward */}
          <button id="skip-forward-btn" className="ctrl-btn" onClick={() => onSkip(10)} title="Forward 10s">
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
              <text x="7.5" y="15.5" fontSize="5.5" fontFamily="sans-serif" fontWeight="bold" fill="currentColor">10</text>
            </svg>
          </button>

          {/* Volume */}
          <VolumeControl
            volume={volume}
            isMuted={isMuted}
            onVolumeChange={onVolumeChange}
            onToggleMute={onToggleMute}
          />

          {/* Time */}
          <span className="controls__time" id="time-display">
            {formatTime(currentTime)}
            <span className="controls__time-sep"> / </span>
            {formatTime(duration)}
          </span>
        </div>

        {/* Right group */}
        <div className="controls__right">
          {/* Speed */}
          <div className="speed-control" id="speed-control">
            {SPEEDS.map((s) => (
              <button
                key={s}
                id={`speed-${s}x`}
                className={`speed-btn ${playbackRate === s ? 'speed-btn--active' : ''}`}
                onClick={() => onChangePlaybackRate(s)}
              >
                {s}x
              </button>
            ))}
          </div>

          {/* Fullscreen */}
          <button id="fullscreen-btn" className="ctrl-btn" onClick={onToggleFullscreen} title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}>
            {isFullscreen ? (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
