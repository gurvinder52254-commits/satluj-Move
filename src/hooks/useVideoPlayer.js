import { useState, useRef, useEffect, useCallback } from 'react';

export function useVideoPlayer() {
  const videoRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [bufferedRanges, setBufferedRanges] = useState([]);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [error, setError] = useState(null);

  const controlsTimerRef = useRef(null);
  // Web Audio API context — kept in a ref so it persists across renders
  const audioCtxRef = useRef(null);

  // ─── Unlock AudioContext on first interaction ─────────────────────────────
  // Chrome suspends the AudioContext until a user gesture. Resuming it here
  // ensures that audio plays even after the browser's autoplay policy kicked in.
  const unlockAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      try {
        audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        return; // AudioContext not available — no-op
      }
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  // ─── Event Handlers ───────────────────────────────────────────────────────
  const handleTimeUpdate = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setCurrentTime(video.currentTime);

    const ranges = [];
    for (let i = 0; i < video.buffered.length; i++) {
      ranges.push({ start: video.buffered.start(i), end: video.buffered.end(i) });
    }
    setBufferedRanges(ranges);
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration);
    setError(null);

    // ── FIX Bug 2: Sync React state from the actual DOM element after load ──
    // The browser may have changed muted/volume during load (autoplay policy).
    setVolume(video.volume);
    setIsMuted(video.muted);
  }, []);

  const handleWaiting = useCallback(() => setIsBuffering(true), []);
  const handleCanPlay = useCallback(() => setIsBuffering(false), []);
  const handlePlaying = useCallback(() => {
    setIsBuffering(false);
    setIsPlaying(true);

    // Sync muted state every time playback resumes — browser can re-mute
    const video = videoRef.current;
    if (video) {
      setVolume(video.volume);
      setIsMuted(video.muted);
    }
  }, []);

  const handlePause = useCallback(() => setIsPlaying(false), []);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setCurrentTime(0);
  }, []);

  const handleError = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const code = video.error?.code;
    const messages = {
      1: 'Playback aborted.',
      2: 'Network error during loading.',
      3: 'Media decode failed — audio codec may not be supported (AC3/DTS). See the Audio Diagnostic below.',
      4: 'Format not supported. Use Chrome or Edge for MKV files.',
    };
    setError(messages[code] || 'Unknown playback error.');
    setIsBuffering(false);
    setIsPlaying(false);
  }, []);

  const handleProgress = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    const ranges = [];
    for (let i = 0; i < video.buffered.length; i++) {
      ranges.push({ start: video.buffered.start(i), end: video.buffered.end(i) });
    }
    setBufferedRanges(ranges);
  }, []);

  // ── FIX Bug 1: Listen to volumechange event ──────────────────────────────
  // This is the PRIMARY fix. Without this handler, React state becomes out of
  // sync whenever the browser's autoplay policy silently mutes the video.
  const handleVolumeChange = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    setVolume(video.volume);
    setIsMuted(video.muted);
  }, []);

  // ─── Fullscreen change listener ───────────────────────────────────────────
  useEffect(() => {
    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => document.removeEventListener('fullscreenchange', onFsChange);
  }, []);

  // ─── Controls auto-hide ───────────────────────────────────────────────────
  const resetControlsTimer = useCallback(() => {
    setShowControls(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    controlsTimerRef.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused) {
        setShowControls(false);
      }
    }, 3000);
  }, []);

  // ─── Player Actions ───────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    unlockAudioContext(); // ── FIX Bug 3: unlock AudioContext on user gesture
    if (video.paused) {
      // Ensure audio is on before playing
      if (video.muted) {
        video.muted = false;
        setIsMuted(false);
      }
      video.play().catch((err) => {
        // NotAllowedError = autoplay blocked; user must interact
        console.warn('[CinePlay] play() blocked:', err.name, err.message);
      });
    } else {
      video.pause();
    }
  }, [unlockAudioContext]);

  const seek = useCallback((time) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(time, video.duration || 0));
  }, []);

  const skip = useCallback((seconds) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(video.currentTime + seconds, video.duration || 0));
  }, []);

  const changeVolume = useCallback((val) => {
    const video = videoRef.current;
    if (!video) return;
    unlockAudioContext();
    const clamped = Math.max(0, Math.min(1, val));
    video.volume = clamped;
    video.muted = clamped === 0;
    // State will be updated by the volumechange handler automatically
  }, [unlockAudioContext]);

  const toggleMute = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    unlockAudioContext();
    video.muted = !video.muted;
    // State will be updated by the volumechange handler automatically
  }, [unlockAudioContext]);

  const changePlaybackRate = useCallback((rate) => {
    const video = videoRef.current;
    if (!video) return;
    video.playbackRate = rate;
    setPlaybackRate(rate);
  }, []);

  const toggleFullscreen = useCallback((containerRef) => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  }, []);

  return {
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
    // Handlers to attach to <video>
    handlers: {
      onTimeUpdate: handleTimeUpdate,
      onLoadedMetadata: handleLoadedMetadata,
      onWaiting: handleWaiting,
      onCanPlay: handleCanPlay,
      onPlaying: handlePlaying,
      onPause: handlePause,
      onEnded: handleEnded,
      onError: handleError,
      onProgress: handleProgress,
      // ── FIX Bug 1: volumechange now wired into the video element
      onVolumeChange: handleVolumeChange,
    },
    // Actions
    togglePlay,
    seek,
    skip,
    changeVolume,
    toggleMute,
    changePlaybackRate,
    toggleFullscreen,
    resetControlsTimer,
    setShowControls,
    unlockAudioContext,
  };
}
