import { useEffect, useRef } from 'react';
import { useVideoPlayer } from '../hooks/useVideoPlayer';
import PlayerControls from './PlayerControls';
import LoadingOverlay from './LoadingOverlay';
import AudioFixer from './AudioFixer';

/**
 * VideoPlayer — loads video from the public folder via HTTP.
 * Uses HTTP range requests for efficient seeking in large files (3GB+).
 *
 * @param {string} src    - Public URL path to the video, e.g. "/movie.mkv"
 * @param {string} [title] - Display name shown in the controls bar
 */
export default function VideoPlayer({ src, title, onError, file }) {
  const containerRef = useRef(null);

  const {
    videoRef,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isBuffering,
    bufferedRanges,
    playbackRate,
    isFullscreen,
    showControls,
    error,
    handlers,
    togglePlay,
    seek,
    skip,
    changeVolume,
    toggleMute,
    changePlaybackRate,
    toggleFullscreen,
    resetControlsTimer,
    setShowControls,
  } = useVideoPlayer();

  // Notify parent on errors (like file not found on server)
  useEffect(() => {
    if (error && onError) {
      onError(error);
    }
  }, [error, onError]);

  // ── FIX Bug 2: Explicitly initialize audio state before loading ──────────
  // Without this, the browser's autoplay policy can silently set muted=true
  // at load time, and our React state would never know.
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    // Explicitly reset audio state — prevents autoplay-muted ghost state
    video.muted = false;
    video.volume = 1;

    video.src = src;
    video.load();
  }, [src]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT') return;
      resetControlsTimer();
      switch (e.code) {
        case 'Space':
        case 'KeyK':
          e.preventDefault();
          togglePlay();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          skip(-10);
          break;
        case 'ArrowRight':
          e.preventDefault();
          skip(10);
          break;
        case 'ArrowUp':
          e.preventDefault();
          changeVolume(Math.min(1, volume + 0.1));
          break;
        case 'ArrowDown':
          e.preventDefault();
          changeVolume(Math.max(0, volume - 0.1));
          break;
        case 'KeyM':
          toggleMute();
          break;
        case 'KeyF':
          toggleFullscreen(containerRef);
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [togglePlay, skip, changeVolume, volume, toggleMute, toggleFullscreen, resetControlsTimer]);

  const handleContainerMouseMove = () => resetControlsTimer();
  const handleContainerMouseLeave = () => {
    if (isPlaying) setShowControls(false);
  };

  const displayTitle = title || src?.split('/').pop() || 'Movie';
  const ext = displayTitle.split('.').pop()?.toUpperCase() || 'VIDEO';

  return (
    <>
      {/* Player box */}
      <div
        id="video-player-container"
        ref={containerRef}
        className={`player-container ${isFullscreen ? 'player-container--fullscreen' : ''} ${showControls ? '' : 'player-container--hide-cursor'}`}
        onMouseMove={handleContainerMouseMove}
        onMouseLeave={handleContainerMouseLeave}
      >
        {/* File info ribbon */}
        {!isFullscreen && (
          <div className="player-info-ribbon">
            <span className="info-chip">{displayTitle}</span>
            <span className="info-chip">{ext}</span>
            <span className="info-chip info-chip--live">● /public</span>
          </div>
        )}

        {/* Video element — HTTP range request enabled */}
        <video
          ref={videoRef}
          id="main-video"
          className="player-video"
          onClick={togglePlay}
          preload="metadata"
          playsInline
          {...handlers}
        />

        {/* Error state */}
        {error && (
          <div className="player-error" id="player-error">
            <div className="player-error__icon">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
              </svg>
            </div>
            <h3>Playback Error</h3>
            <p>{error}</p>
            <div className="player-error__steps">
              <p className="player-error__hint">
                🌐 Use <strong>Chrome</strong> or <strong>Edge</strong> for best MKV support.
              </p>
              <p className="player-error__hint">
                🔊 If video plays but no audio — see the Audio Diagnostic panel below.
              </p>
            </div>
          </div>
        )}

        {/* Buffering overlay */}
        <LoadingOverlay isBuffering={isBuffering && !error} />

        {/* Playback controls */}
        <PlayerControls
          isPlaying={isPlaying}
          currentTime={currentTime}
          duration={duration}
          volume={volume}
          isMuted={isMuted}
          bufferedRanges={bufferedRanges}
          playbackRate={playbackRate}
          isFullscreen={isFullscreen}
          fileName={displayTitle}
          visible={showControls}
          onTogglePlay={togglePlay}
          onSeek={seek}
          onSkip={skip}
          onVolumeChange={changeVolume}
          onToggleMute={toggleMute}
          onChangePlaybackRate={changePlaybackRate}
          onToggleFullscreen={() => toggleFullscreen(containerRef)}
          onClose={null}
        />
      </div>

      {/* AudioFixer — probes codec, shows warning, and transcodes AC3/DTS→AAC if needed */}
      <AudioFixer
        videoSrc={src}
        videoRef={videoRef}
        isPlaying={isPlaying}
        file={file}
      />
    </>
  );
}
