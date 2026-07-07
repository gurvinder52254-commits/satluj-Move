import { useRef, useState, useCallback } from 'react';
import { formatFileSize } from '../utils/formatTime';

const MAX_FILE_SIZE = 3 * 1024 * 1024 * 1024; // 3GB
const SUPPORTED_TYPES = ['.mkv', '.mp4', '.webm', '.avi', '.mov', '.m4v'];

export default function FileDropZone({ onFileSelect }) {
  const inputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [warning, setWarning] = useState('');

  const processFile = useCallback(
    (file) => {
      if (!file) return;
      setWarning('');

      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!SUPPORTED_TYPES.includes(ext)) {
        setWarning(`Unsupported format "${ext}". Supported: ${SUPPORTED_TYPES.join(', ')}`);
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        setWarning(`File is larger than 3GB (${formatFileSize(file.size)}). Performance may be affected.`);
      }

      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      processFile(file);
    },
    [processFile]
  );

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };
  const handleDragLeave = () => setIsDragging(false);

  const handleInputChange = (e) => {
    processFile(e.target.files[0]);
    e.target.value = '';
  };

  return (
    <div
      id="file-drop-zone"
      className={`drop-zone ${isDragging ? 'drop-zone--active' : ''}`}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
    >
      <div className="drop-zone__icon">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
          />
        </svg>
      </div>

      <h2 className="drop-zone__title">Drop your movie here</h2>
      <p className="drop-zone__subtitle">
        Supports MKV, MP4, WebM, AVI, MOV &bull; Up to 3GB
      </p>

      <button
        id="browse-file-btn"
        className="drop-zone__btn"
        onClick={() => inputRef.current?.click()}
      >
        <span>Browse File</span>
      </button>

      <input
        ref={inputRef}
        id="file-input"
        type="file"
        accept=".mkv,.mp4,.webm,.avi,.mov,.m4v,video/*"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />

      {warning && (
        <div className="drop-zone__warning">
          <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
            <path d="M12 2L1 21h22L12 2zm0 3.5 8.5 15.5H3.5L12 5.5zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z" />
          </svg>
          {warning}
        </div>
      )}

      <div className="drop-zone__formats">
        {SUPPORTED_TYPES.map((t) => (
          <span key={t} className="format-tag">
            {t.toUpperCase().slice(1)}
          </span>
        ))}
      </div>
    </div>
  );
}
