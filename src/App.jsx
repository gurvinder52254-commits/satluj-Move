import { useState, useEffect } from 'react';
import VideoPlayer from './components/VideoPlayer';
import FileDropZone from './components/FileDropZone';
import './App.css';

// ─── Movie Configuration ──────────────────────────────────────────────────────
// Helper to generate a direct streamable link from any Google Drive share link.
function getGoogleDriveStreamUrl(shareUrlOrId) {
  if (!shareUrlOrId) return '';
  // Extract ID from full sharing URL
  const match = shareUrlOrId.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  const fileId = match ? match[1] : shareUrlOrId;
  
  // Direct download/stream URL for Google Drive
  return `https://docs.google.com/uc?export=download&id=${fileId}`;
}

// Default stream URL using the user's Google Drive movie ID
const GOOGLE_DRIVE_ID = '1aoSQBElI2sBCB0X1K5sBw0wWdAUtrmVX';
const MOVIE_SRC = getGoogleDriveStreamUrl(GOOGLE_DRIVE_ID);
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
    // If the Google Drive link fails or hits a quota limit, warn the user
    console.warn('[CinePlay] Video source failed to load. If using Google Drive, the download quota may be exceeded.');
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
            Google Drive Stream
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
            <strong>Streaming from Google Drive</strong>
            <span> — Make sure to upload the converted <code>95-satluj-aac.mkv</code> to your Google Drive to get working sound natively.</span>
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
                    <>Playing from Google Drive (ID: <code>{GOOGLE_DRIVE_ID}</code>)</>
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
