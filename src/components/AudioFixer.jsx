import { useState, useEffect, useRef } from 'react';
import { useAudioTranscoder } from '../hooks/useAudioTranscoder';

/**
 * AudioFixer
 *
 * Shows when AC3/DTS codec is detected. Provides:
 *  1. One-click audio conversion using ffmpeg.wasm (AC3/DTS → AAC)
 *  2. Synchronized playback of the transcoded audio with the original video
 *  3. FFmpeg CLI command for permanent conversion
 *
 * @param {string}  videoSrc    - The /public URL of the MKV file
 * @param {object}  videoRef    - React ref pointing to the <video> element
 * @param {boolean} isPlaying   - Whether the video is currently playing
 */
export default function AudioFixer({ videoSrc, videoRef, isPlaying, file }) {
  const { status, progress, detectedCodec, audioSrc, logs, probeCodec, transcodeAudio, reset } =
    useAudioTranscoder();

  const audioRef = useRef(null);
  const [syncEnabled, setSyncEnabled] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [probed, setProbed] = useState(false);
  const [copyDone, setCopyDone] = useState(false);

  // ─── Auto-probe on first render ───────────────────────────────────────────
  useEffect(() => {
    if (!probed && videoSrc) {
      setProbed(true);
      probeCodec(videoSrc, file).catch(() => {});
    }
  }, [videoSrc, file, probed, probeCodec]);

  // ─── Sync audio element with video ───────────────────────────────────────
  useEffect(() => {
    const video = videoRef?.current;
    const audio = audioRef?.current;
    if (!audio || !video || !syncEnabled) return;

    const syncTime = () => {
      if (Math.abs(audio.currentTime - video.currentTime) > 0.2) {
        audio.currentTime = video.currentTime;
      }
    };

    const syncPlay = () => {
      audio.currentTime = video.currentTime;
      audio.play().catch(() => {});
    };

    const syncPause = () => audio.pause();
    const syncRate = () => { audio.playbackRate = video.playbackRate; };
    const syncSeeked = () => { audio.currentTime = video.currentTime; };

    // Mute the video's own audio track — our transcoded audio takes over
    video.muted = true;
    audio.volume = video.volume;
    audio.playbackRate = video.playbackRate;

    if (!video.paused) {
      audio.currentTime = video.currentTime;
      audio.play().catch(() => {});
    }

    video.addEventListener('play', syncPlay);
    video.addEventListener('pause', syncPause);
    video.addEventListener('seeked', syncSeeked);
    video.addEventListener('ratechange', syncRate);
    video.addEventListener('timeupdate', syncTime);

    return () => {
      video.removeEventListener('play', syncPlay);
      video.removeEventListener('pause', syncPause);
      video.removeEventListener('seeked', syncSeeked);
      video.removeEventListener('ratechange', syncRate);
      video.removeEventListener('timeupdate', syncTime);
      video.muted = false;
    };
  }, [syncEnabled, audioSrc, videoRef]);

  // ─── Volume sync ──────────────────────────────────────────────────────────
  useEffect(() => {
    const video = videoRef?.current;
    const audio = audioRef?.current;
    if (!audio || !video || !syncEnabled) return;

    const syncVol = () => {
      audio.volume = video.muted ? 0 : video.volume;
    };
    video.addEventListener('volumechange', syncVol);
    return () => video.removeEventListener('volumechange', syncVol);
  }, [syncEnabled, videoRef]);

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const isUnsupportedCodec = detectedCodec && ['ac3', 'dts', 'eac3', 'dts-hd', 'truehd'].includes(detectedCodec);
  const filename = videoSrc?.split('/').pop() || 'movie.mkv';
  const ffmpegCmd = `ffmpeg -i "${filename}" -c:v copy -c:a aac -b:a 192k "${filename.replace(/\.mkv$/i, '-aac.mkv')}"`;

  const handleCopy = () => {
    navigator.clipboard.writeText(ffmpegCmd).then(() => {
      setCopyDone(true);
      setTimeout(() => setCopyDone(false), 2000);
    });
  };

  const handleTranscode = async () => {
    try {
      const url = await transcodeAudio(videoSrc, file);
      if (url) setSyncEnabled(true);
    } catch (err) {
      console.error('[AudioFixer] transcode failed:', err);
    }
  };

  const handleDisableSync = () => {
    setSyncEnabled(false);
    reset();
    const video = videoRef?.current;
    if (video) video.muted = false;
  };

  // Don't render until probe is complete
  if (!probed && status === 'idle') return null;

  // If codec is supported (AAC/MP3/Opus), show minimal status
  if (probed && detectedCodec && !isUnsupportedCodec && status === 'idle') {
    return (
      <div className="audio-fixer audio-fixer--ok" id="audio-fixer">
        <span className="af-icon">✅</span>
        <span>Audio codec: <strong>{detectedCodec.toUpperCase()}</strong> — supported natively</span>
      </div>
    );
  }

  return (
    <div className={`audio-fixer ${isUnsupportedCodec ? 'audio-fixer--warn' : ''} ${status === 'done' ? 'audio-fixer--done' : ''}`} id="audio-fixer">
      {/* Hidden audio element for synchronized transcoded playback */}
      {audioSrc && (
        <audio ref={audioRef} src={audioSrc} preload="auto" style={{ display: 'none' }} />
      )}

      {/* ── Header ── */}
      <div className="af-header">
        <span className="af-icon">
          {status === 'done' ? '🔊' : status === 'transcoding' || status === 'loading' ? '⚙️' : '🔇'}
        </span>
        <div className="af-header-text">
          <strong>
            {status === 'done'
              ? 'Audio Fixed — Transcoded AAC Playing'
              : status === 'transcoding'
              ? 'Converting Audio…'
              : status === 'loading'
              ? 'Loading ffmpeg.wasm…'
              : status === 'probing'
              ? 'Detecting audio codec…'
              : isUnsupportedCodec
              ? `Audio Codec Not Supported: ${detectedCodec?.toUpperCase()}`
              : 'Checking audio codec…'}
          </strong>
          {isUnsupportedCodec && status === 'idle' && (
            <span className="af-sub">
              Chrome cannot play {detectedCodec?.toUpperCase()} audio in MKV. Use the fix below.
            </span>
          )}
        </div>

        {/* Sync indicator */}
        {status === 'done' && (
          <div className="af-sync-badge">
            🔗 Synced
          </div>
        )}
      </div>

      {/* ── Progress bar ── */}
      {(status === 'transcoding' || status === 'loading') && (
        <div className="af-progress">
          <div className="af-progress-bar" style={{ width: `${progress}%` }} />
          <span className="af-progress-label">
            {status === 'loading' ? 'Loading ffmpeg.wasm from CDN…' : `Converting: ${progress}%`}
          </span>
        </div>
      )}

      {/* ── Action buttons ── */}
      {isUnsupportedCodec && status === 'idle' && (
        <div className="af-actions">
          {/* Browser-side fix */}
          <button id="btn-transcode" className="af-btn af-btn--primary" onClick={handleTranscode}>
            <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
            </svg>
            Fix Audio in Browser (ffmpeg.wasm)
          </button>

          <div className="af-divider">or convert permanently on your PC</div>

          {/* One-click copy FFmpeg command */}
          <div className="af-cmd-box">
            <code className="af-cmd">{ffmpegCmd}</code>
            <button id="btn-copy-ffmpeg" className="af-copy-btn" onClick={handleCopy}>
              {copyDone ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <p className="af-cmd-note">
            Run in PowerShell/Terminal · Only audio is converted (video untouched) · ~1–2 min
          </p>
        </div>
      )}

      {/* ── Done: disable sync option ── */}
      {status === 'done' && (
        <div className="af-actions">
          <button id="btn-disable-sync" className="af-btn af-btn--ghost" onClick={handleDisableSync}>
            Disable Audio Fix
          </button>
        </div>
      )}

      {/* ── Log output (collapsible) ── */}
      {logs.length > 0 && (
        <div className="af-logs">
          <button className="af-logs-toggle" onClick={() => setShowLogs((s) => !s)}>
            {showLogs ? '▲ Hide' : '▼ Show'} ffmpeg log ({logs.length} lines)
          </button>
          {showLogs && (
            <pre className="af-log-pre">{logs.join('\n')}</pre>
          )}
        </div>
      )}
    </div>
  );
}
