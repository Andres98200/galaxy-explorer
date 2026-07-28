interface SourceTextPanelSkeletonProps {
  onClose?: () => void;
}

export default function SourceTextPanelSkeleton({ onClose }: SourceTextPanelSkeletonProps) {
  return (
    <div className="Points-panel">
      <div className="panel-title">
        <span className="skeleton-box skeleton-title" />
        {onClose && (
          <span onClick={onClose} className="panel-close-btn material-symbols-outlined">
            close_small
          </span>
        )}
      </div>

      <div className="original-badge-container">
        <div className="original-info-tag">
          <span className="skeleton-box skeleton-badge-sm" />
        </div>

        <div className="original-info-tag">
          <span className="skeleton-box skeleton-badge-md" />
        </div>
      </div>

      <div className="original-text-section">
        <div className="original-section-title">
          <span className="skeleton-box skeleton-section-title" />
        </div>
        <blockquote className="original-prompt-box">
          <span className="skeleton-box skeleton-text-95" />
        </blockquote>
      </div>

      <div className="original-text-section">
        <div className="original-prompt-title">
          <span className="skeleton-box skeleton-section-title" />
        </div>
        <div className="original-response-box">
          <span className="skeleton-box skeleton-text-100" />
          <span className="skeleton-box skeleton-text-95" />
          <span className="skeleton-box skeleton-text-88" />
          <span className="skeleton-box skeleton-text-75" />
          <span className="skeleton-box skeleton-text-50" />
        </div>
      </div>
    </div>
  );
}