import { useState, useRef, useCallback } from 'react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

/**
 * useAudioTranscoder
 *
 * Uses ffmpeg.wasm to:
 *  1. Detect the audio codec in the MKV file (probe only, fast)
 *  2. Extract + transcode the audio stream to AAC if it's AC3/DTS
 *  3. Return a blob URL for the transcoded audio, ready for Web Audio API
 *
 * The video track is NEVER processed — only the audio stream is extracted,
 * so processing is fast even for large (3GB) files once the audio data is fetched.
 */

const FFMPEG_BASE_URL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';

export function useAudioTranscoder() {
  const ffmpegRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | loading | probing | transcoding | done | error
  const [progress, setProgress] = useState(0);
  const [detectedCodec, setDetectedCodec] = useState(null);
  const [audioSrc, setAudioSrc] = useState(null);
  const [logs, setLogs] = useState([]);
  const audioBlobRef = useRef(null);

  const addLog = (msg) => setLogs((prev) => [...prev.slice(-20), msg]);

  // ─── Load ffmpeg.wasm ─────────────────────────────────────────────────────
  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current) return ffmpegRef.current;

    setStatus('loading');
    addLog('Loading ffmpeg.wasm…');

    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => {
      addLog(message);

      // Parse codec from ffmpeg probe output (e.g. "Audio: ac3" or "Audio: dts")
      const codecMatch = message.match(/Audio:\s+(\w+)/i);
      if (codecMatch) {
        setDetectedCodec(codecMatch[1].toLowerCase());
      }
    });

    ffmpeg.on('progress', ({ progress: p }) => {
      setProgress(Math.round(p * 100));
    });

    try {
      await ffmpeg.load({
        coreURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${FFMPEG_BASE_URL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
      ffmpegRef.current = ffmpeg;
      addLog('ffmpeg.wasm loaded ✓');
      return ffmpeg;
    } catch (err) {
      setStatus('error');
      addLog(`Failed to load ffmpeg.wasm: ${err.message}`);
      throw err;
    }
  }, []);

  // ─── Probe the codec without full transcoding ─────────────────────────────
  const probeCodec = useCallback(async (videoSrc, file) => {
    setStatus('probing');
    setLogs([]);
    addLog('Probing audio codec (reading first 5MB)…');

    const ffmpeg = await loadFFmpeg();

    let partialData;
    if (file) {
      // Safe, memory-efficient slicing of local File
      const slice = file.slice(0, 5242880); // 5MB
      partialData = await slice.arrayBuffer();
    } else {
      // Fetch only the first 5MB — enough for MKV header and audio codec info
      const response = await fetch(videoSrc, {
        headers: { Range: 'bytes=0-5242879' }, // 5MB
      });
      partialData = await response.arrayBuffer();
    }
    await ffmpeg.writeFile('probe.mkv', new Uint8Array(partialData));

    // Run with -t 0 to get codec info without processing any frames
    try {
      await ffmpeg.exec(['-i', 'probe.mkv', '-t', '0', '-f', 'null', '-']);
    } catch {
      // ffmpeg exits with code 1 when no output file is specified — that's expected
    }

    await ffmpeg.deleteFile('probe.mkv');
    setStatus('idle');
    addLog('Probe complete.');
  }, [loadFFmpeg]);

  // ─── Full audio transcoding: AC3/DTS → AAC ───────────────────────────────
  const transcodeAudio = useCallback(async (videoSrc, file) => {
    setStatus('transcoding');
    setProgress(0);
    setAudioSrc(null);
    if (audioBlobRef.current) {
      URL.revokeObjectURL(audioBlobRef.current);
      audioBlobRef.current = null;
    }

    addLog('Fetching video file for audio extraction…');
    addLog('(This may take a moment for large files)');

    const ffmpeg = await loadFFmpeg();

    let fileData;
    if (file) {
      addLog('Reading local movie file…');
      fileData = await fetchFile(file);
    } else {
      addLog('Downloading movie file… (large file, please wait)');
      fileData = await fetchFile(videoSrc);
    }
    addLog(`File loaded: ${(fileData.byteLength / 1024 / 1024).toFixed(0)} MB`);

    await ffmpeg.writeFile('input.mkv', fileData);
    addLog('Extracting and converting audio: AC3/DTS → AAC…');

    // Extract ONLY the audio, convert to AAC, no video processing
    await ffmpeg.exec([
      '-i', 'input.mkv',
      '-vn',                // skip video — much faster
      '-c:a', 'aac',
      '-ac', '2',           // downmix to stereo (prevents voice dropout on normal speakers)
      '-b:a', '192k',
      '-strict', 'experimental',
      '-y',
      'output.aac',
    ]);

    addLog('Transcoding done. Reading output…');
    const data = await ffmpeg.readFile('output.aac');

    // Clean up virtual FS
    await ffmpeg.deleteFile('input.mkv');
    await ffmpeg.deleteFile('output.aac');

    const blob = new Blob([data.buffer], { type: 'audio/aac' });
    const url = URL.createObjectURL(blob);
    audioBlobRef.current = url;
    setAudioSrc(url);
    setStatus('done');
    setProgress(100);
    addLog('Audio ready ✓');

    return url;
  }, [loadFFmpeg]);

  // ─── Cleanup ──────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    if (audioBlobRef.current) {
      URL.revokeObjectURL(audioBlobRef.current);
      audioBlobRef.current = null;
    }
    setAudioSrc(null);
    setStatus('idle');
    setProgress(0);
    setDetectedCodec(null);
    setLogs([]);
  }, []);

  return {
    status,       // 'idle' | 'loading' | 'probing' | 'transcoding' | 'done' | 'error'
    progress,     // 0-100
    detectedCodec, // e.g. 'ac3', 'dts', 'aac'
    audioSrc,     // blob URL of transcoded AAC audio, or null
    logs,
    probeCodec,
    transcodeAudio,
    reset,
  };
}
