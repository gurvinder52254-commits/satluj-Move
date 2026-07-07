export default function LoadingOverlay({ isBuffering }) {
  if (!isBuffering) return null;

  return (
    <div className="loading-overlay" id="loading-overlay">
      <div className="spinner">
        <div className="spinner__ring" />
        <div className="spinner__ring spinner__ring--2" />
      </div>
      <p className="loading-overlay__text">Buffering…</p>
    </div>
  );
}
