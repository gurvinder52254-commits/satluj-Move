import { useState, useEffect } from 'react';
import VideoPlayer from './components/VideoPlayer';
import FileDropZone from './components/FileDropZone';
import './App.css';

// ─── Movie Configuration ──────────────────────────────────────────────────────
const MOVIE_ORIGINAL = '/95-satluj.mkv';
const MOVIE_AAC      = '/95-satluj-aac.mkv';
const MOVIE_TITLE    = '95-Satluj';

async function checkAacReady() {
  try {
    const res = await fetch(MOVIE_AAC, { method: 'HEAD' });
    return res.ok;
  } catch {
    return false;
  }
}

function App() {
  const [movieSrc, setMovieSrc] = useState(MOVIE_ORIGINAL);
  const [selectedLocalFile, setSelectedLocalFile] = useState(null);
  const [mode, setMode] = useState('server'); // 'server' | 'local'
  const [aacReady, setAacReady] = useState(false);
  const [checking, setChecking] = useState(true);

  // Poll for server-side AAC file
  useEffect(() => {
    let timer;
    const poll = async () => {
      const ready = await checkAacReady();
      if (ready) {
        setAacReady(true);
        setMovieSrc(MOVIE_AAC);
        setChecking(false);
      } else {
        setChecking(false);
        timer = setTimeout(poll, 15000);
      }
    };
    poll();
    return () => clearTimeout(timer);
  }, []);

  const handleLocalFileSelect = (file) => {
    setSelectedLocalFile(file);
    setMode('local');
  };

  const switchToServerMode = () => {
    setSelectedLocalFile(null);
    setMode('server');
  };

  const handleVideoError = () => {
    // If server mode fails (e.g. 404 on Render), automatically switch to local file picker
    if (mode === 'server' && !aacReady) {
      console.warn('[CinePlay] Server movie file not found on hosting. Switching to local file picker mode.');
      setMode('local');
    }
  };

  return (
    <div className="app" id="app">
      {/* Header */}
      <header className="app-header" id="app-header">
        <div className="app-header__logo">
          <svg viewBox="0 0 24 24" fill="currentColor" width="28" height="28">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z" />
          </svg>
          <span>CinePlay</span>
        </div>
        
        {/* Mode selector */}
        <div className="app-header__actions">
          <button 
            className={`mode-toggle-btn ${mode === 'server' ? 'mode-toggle-btn--active' : ''}`}
            onClick={switchToServerMode}
          >
            Server Mode
          </button>
          <button 
            className={`mode-toggle-btn ${mode === 'local' ? 'mode-toggle-btn--active' : ''}`}
            onClick={() => setMode('local')}
          >
            Local File Mode
          </button>
          <div className="app-header__badge">
            {mode === 'local' ? 'Local Play' : aacReady ? '🔊 AAC Audio' : 'MKV Ready'}
          </div>
        </div>
      </header>

      {/* Conversion status banners for Server mode */}
      {mode === 'server' && !aacReady && (
        <div className={`conversion-banner ${checking ? 'conversion-banner--checking' : 'conversion-banner--converting'}`} id="conversion-banner">
          <div className="cb-icon">{checking ? '🔍' : '⚙️'}</div>
          <div className="cb-text">
            {checking
              ? 'Checking for AAC audio file…'
              : <>
                  <strong>Server Mode</strong>
                  <span> — Looking for <code>{MOVIE_ORIGINAL}</code> on the server. If deploying to Render, please use **Local File Mode** below as 3GB files are not uploaded to Git.</span>
                </>
            }
          </div>
          <div className="cb-spinner" />
        </div>
      )}

      {mode === 'server' && aacReady && (
        <div className="conversion-banner conversion-banner--done" id="aac-ready-banner">
          <div className="cb-icon">✅</div>
          <div className="cb-text">
            <strong>Audio Fixed!</strong>
            <span> Playing AAC version from server — full 5.1 surround sound works.</span>
          </div>
        </div>
      )}

      {/* Main layout */}
      <main className="app-main app-main--player" id="app-main">
        <div className="player-wrapper" id="player-wrapper">
          
          {mode === 'local' && !selectedLocalFile ? (
            /* Local File mode: File Drop Zone */
            <div className="local-mode-welcome">
              <div className="landing__hero">
                <h1 className="landing__title">
                  Play Local Movie <span className="landing__accent">Instantly</span>
                </h1>
                <p className="landing__desc">
                  Since 3GB movies cannot be uploaded to GitHub/Render, select the file from your local hard drive. 
                  It plays 100% offline in your browser with zero uploads or buffering.
                </p>
              </div>
              
              <FileDropZone onFileSelect={handleLocalFileSelect} />
            </div>
          ) : (
            /* Video Player view (either local selected file or server mode) */
            <>
              {/* Keyboard hints */}
              <div className="shortcut-bar">
                <span className="kb-hint"><kbd>Space</kbd> Play/Pause</span>
                <span className="kb-hint"><kbd>←</kbd> <kbd>→</kbd> Skip 10s</span>
                <span className="kb-hint"><kbd>↑</kbd> <kbd>↓</kbd> Volume</span>
                <span className="kb-hint"><kbd>M</kbd> Mute</span>
                <span className="kb-hint"><kbd>F</kbd> Fullscreen</span>
              </div>

              <VideoPlayer 
                src={mode === 'local' ? URL.createObjectURL(selectedLocalFile) : movieSrc} 
                title={mode === 'local' ? selectedLocalFile.name : MOVIE_TITLE}
                file={mode === 'local' ? selectedLocalFile : null}
                onError={handleVideoError}
              />

              {/* Status footer */}
              <div className="file-path-hint">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <path d="M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z" />
                </svg>
                <span>
                  {mode === 'local' ? (
                    <>Playing Local File: <code>{selectedLocalFile.name}</code></>
                  ) : (
                    <>Playing Server File: <code>{movieSrc}</code></>
                  )}
                </span>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
