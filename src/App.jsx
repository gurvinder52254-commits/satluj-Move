import { useState, useEffect } from 'react';
import VideoPlayer from './components/VideoPlayer';
import FileDropZone from './components/FileDropZone';
import './App.css';

// ─── Movie Configuration ──────────────────────────────────────────────────────
// Maps various cloud links (Dropbox, Google Drive, direct links) into direct video stream URLs
function getDirectStreamUrl(urlOrId) {
  if (!urlOrId) return '';
  
  // 1. Dropbox link: convert to raw stream (change dl=0 or dl=1 to raw=1)
  if (urlOrId.includes('dropbox.com')) {
    return urlOrId.replace(/[?&]dl=[01]/, '').concat(urlOrId.includes('?') ? '&raw=1' : '?raw=1');
  }

  // 2. Google Drive sharing URL or ID
  const driveMatch = urlOrId.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const fileId = driveMatch ? driveMatch[1] : urlOrId;
  
  // Direct stream endpoint for Google Drive (Note: Google Drive blocks range requests and large file fetches)
  if (fileId && fileId.length > 20 && !urlOrId.includes('/') && !urlOrId.includes('.')) {
    return `https://docs.google.com/uc?export=download&id=${fileId}`;
  }

  return urlOrId;
}

// Paste your direct link or Dropbox link below
const MOVIE_LINK = 'https://drive.google.com/file/d/1aoSQBElI2sBCB0X1K5sBw0wWdAUtrmVX/view?usp=drive_link';
const MOVIE_SRC = getDirectStreamUrl(MOVIE_LINK);
const MOVIE_TITLE = '95-Satluj (Stream)';

function App() {
  const [movieSrc, setMovieSrc] = useState(MOVIE_SRC);
  const [selectedLocalFile, setSelectedLocalFile] = useState(null);
  const [mode, setMode] = useState('server'); // 'server' | 'local'

  const handleLocalFileSelect = (file) => {
    setSelectedLocalFile(file);
    setMode('local');
  };

  const switchToServerMode = () => {
    setSelectedLocalFile(null);
    setMode('server');
  };

  const handleVideoError = () => {
    console.warn('[CinePlay] Video source failed to load. Large Google Drive files are blocked by Google virus scan screen.');
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
            Cloud Stream Mode
          </button>
          <button 
            className={`mode-toggle-btn ${mode === 'local' ? 'mode-toggle-btn--active' : ''}`}
            onClick={() => setMode('local')}
          >
            Local File Mode
          </button>
          <div className="app-header__badge">
            {mode === 'local' ? 'Local Play' : 'Cloud Stream'}
          </div>
        </div>
      </header>

      {/* Cloud Stream Notice */}
      {mode === 'server' && (
        <div className="conversion-banner conversion-banner--converting" id="stream-banner">
          <div className="cb-icon">☁️</div>
          <div className="cb-text">
            <strong>Cloud Stream mode active</strong>
            <span> — If the video shows "Format not supported", it is because Google Drive blocks large file streams (virus warning screen). We recommend using **Dropbox** or **Local File Mode**.</span>
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
                  Select the file from your local hard drive. It plays 100% offline in your browser with zero uploads or buffering.
                </p>
              </div>
              
              <FileDropZone onFileSelect={handleLocalFileSelect} />
            </div>
          ) : (
            /* Video Player view */
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
                    <>Stream source: <code>{MOVIE_LINK.substring(0, 70)}...</code></>
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
