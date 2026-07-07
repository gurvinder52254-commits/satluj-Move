import { useState, useEffect, useRef } from 'react';

/**
 * Checks browser support for audio codecs commonly found in MKV files.
 * Uses canPlayType() — returns 'probably', 'maybe', or '' (unsupported).
 */
function getCodecSupport() {
  const v = document.createElement('video');
  const t = (mime) => v.canPlayType(mime);
  return [
    {
      name: 'AAC',
      note: 'Most common in modern MKV',
      support: t('audio/mp4; codecs="mp4a.40.2"') || t('audio/aac'),
      good: true,
    },
    {
      name: 'MP3',
      note: 'Sometimes used in MKV',
      support: t('audio/mpeg'),
      good: true,
    },
    {
      name: 'AC-3 (Dolby)',
      note: 'Very common in Indian movies — Windows only',
      support: t('video/mp4; codecs="ac-3"') || t('audio/ac3'),
      good: false,
    },
    {
      name: 'E-AC-3 (Dolby+)',
      note: 'Common in Blu-ray MKV rips',
      support: t('video/mp4; codecs="ec-3"') || t('audio/eac3'),
      good: false,
    },
    {
      name: 'DTS',
      note: 'Blu-ray audio — not supported anywhere in browsers',
      support: t('audio/vnd.dts') || t('audio/x-dca'),
      good: false,
    },
    {
      name: 'Opus',
      note: 'Modern codec — fully supported',
      support: t('audio/ogg; codecs=opus') || t('audio/webm; codecs=opus'),
      good: true,
    },
    {
      name: 'Vorbis',
      note: 'Older open codec',
      support: t('audio/ogg; codecs=vorbis'),
      good: true,
    },
    {
      name: 'FLAC',
      note: 'Lossless audio',
      support: t('audio/flac') || t('audio/x-flac'),
      good: true,
    },
  ];
}

function SupportBadge({ support }) {
  if (support === 'probably')
    return <span className="codec-badge codec-badge--ok">✓ Yes</span>;
  if (support === 'maybe')
    return <span className="codec-badge codec-badge--maybe">~ Maybe</span>;
  return <span className="codec-badge codec-badge--no">✗ No</span>;
}

export default function AudioDiagnostic({ videoRef, isMuted, volume, isPlaying }) {
  const [open, setOpen] = useState(false);
  const [liveState, setLiveState] = useState({ vol: 1, muted: false, tracks: null });
  const [codecs] = useState(getCodecSupport);
  const intervalRef = useRef(null);

  // Poll live audio state from the video element
  useEffect(() => {
    const poll = () => {
      const v = videoRef?.current;
      if (!v) return;
      setLiveState({
        vol: v.volume,
        muted: v.muted,
        tracks: v.audioTracks ? v.audioTracks.length : null,
      });
    };
    intervalRef.current = setInterval(poll, 500);
    return () => clearInterval(intervalRef.current);
  }, [videoRef]);

  // Detect potentially unsupported codecs — AC3/DTS not supported = bad
  const unsupportedDangerous = codecs.filter(
    (c) => !c.good && c.support === ''
  );
  const hasPotentialAudioIssue =
    unsupportedDangerous.some((c) => c.name.includes('AC-3') || c.name.includes('DTS'));

  const isSilent = liveState.muted || liveState.vol === 0;

  return (
    <div className="audio-diag" id="audio-diagnostic">
      {/* Compact status bar — always visible */}
      <div
        className={`audio-diag__bar ${isSilent ? 'audio-diag__bar--warn' : ''}`}
        onClick={() => setOpen((o) => !o)}
        title="Click to open Audio Diagnostic"
      >
        <span className="audio-diag__bar-icon">
          {isSilent ? '🔇' : '🔊'}
        </span>
        <span className="audio-diag__bar-text">
          {isSilent
            ? 'Audio appears silent — click to diagnose'
            : `Audio OK — Vol ${Math.round(liveState.vol * 100)}% ${liveState.muted ? '(Muted)' : ''}`}
        </span>
        {hasPotentialAudioIssue && (
          <span className="audio-diag__bar-warn">⚠ AC3/DTS may not be supported</span>
        )}
        <span className="audio-diag__bar-toggle">{open ? '▲' : '▼'}</span>
      </div>

      {/* Expanded panel */}
      {open && (
        <div className="audio-diag__panel">
          {/* Live state */}
          <div className="audio-diag__section">
            <h4>🎛️ Live Audio State (from video element)</h4>
            <div className="audio-diag__live">
              <div className={`live-stat ${isSilent ? 'live-stat--bad' : 'live-stat--ok'}`}>
                <span>DOM Muted</span>
                <strong>{liveState.muted ? 'YES ⚠' : 'No ✓'}</strong>
              </div>
              <div className={`live-stat ${liveState.vol === 0 ? 'live-stat--bad' : 'live-stat--ok'}`}>
                <span>DOM Volume</span>
                <strong>{Math.round(liveState.vol * 100)}%</strong>
              </div>
              <div className="live-stat live-stat--neutral">
                <span>Audio Tracks</span>
                <strong>{liveState.tracks === null ? 'API N/A' : liveState.tracks}</strong>
              </div>
              <div className={`live-stat ${isPlaying ? 'live-stat--ok' : 'live-stat--neutral'}`}>
                <span>Playing</span>
                <strong>{isPlaying ? 'Yes ▶' : 'Paused'}</strong>
              </div>
            </div>
          </div>

          {/* Codec support table */}
          <div className="audio-diag__section">
            <h4>📋 Browser Audio Codec Support</h4>
            <table className="codec-table">
              <thead>
                <tr>
                  <th>Codec</th>
                  <th>Browser Support</th>
                  <th>Note</th>
                </tr>
              </thead>
              <tbody>
                {codecs.map((c) => (
                  <tr key={c.name} className={!c.good && c.support === '' ? 'codec-row--warn' : ''}>
                    <td><strong>{c.name}</strong></td>
                    <td><SupportBadge support={c.support} /></td>
                    <td className="codec-note">{c.note}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Fix instructions */}
          <div className="audio-diag__section">
            <h4>🔧 Fix: Convert Audio to AAC (if AC3/DTS)</h4>
            <p className="diag-hint">
              If your MKV uses AC-3 or DTS audio (common in Bollywood/Punjabi movie rips),
              convert it to AAC using <strong>VLC</strong> or <strong>FFmpeg</strong>:
            </p>
            <div className="diag-cmd-group">
              <label>FFmpeg (recommended — fast, lossless container remux):</label>
              <code className="diag-cmd">
                ffmpeg -i input.mkv -c:v copy -c:a aac -b:a 192k output.mkv
              </code>
            </div>
            <div className="diag-cmd-group">
              <label>VLC → Media → Convert/Save → Profile: "Video - H.264 + AAC (MP4)"</label>
            </div>
            <p className="diag-hint" style={{ marginTop: '8px' }}>
              💡 The <code>-c:v copy</code> flag keeps the video track unchanged (instant, no re-encode).
              Only the audio is converted, which takes ~1-2 minutes for a 3GB file.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
