interface PointDetailsPanelSkeletonProps {
  onClose?: () => void;
}

export default function PointDetailsPanelSkeleton({ onClose }: PointDetailsPanelSkeletonProps) {
  const rowWidths = ['skeleton-text-80', 'skeleton-text-90', 'skeleton-text-70', 'skeleton-text-85'];
  const barWidths = ['skeleton-text-80', 'skeleton-text-60', 'skeleton-text-40'];

  return (
    <div className="Points-panel fade-in-animation">
      {/* Titre du panneau */}
      <div className="panel-title">
        <span className="skeleton-box skeleton-title-lg" />
        {onClose && (
          <span onClick={onClose} className="panel-close-btn material-symbols-outlined">
            close_small
          </span>
        )}
      </div>

      {/* Tableau Skeleton */}
      <table className="panel-table">
        <thead>
          <tr className="table-titles">
            <th className="phrases-title">
              <span className="skeleton-box skeleton-th-md" />
            </th>
            <th className="score-title">
              <span className="skeleton-box skeleton-th-sm" />
            </th>
          </tr>
        </thead>
        <tbody>
          {rowWidths.map((widthClass, index) => (
            <tr key={index} className="table-titles">
              <td className="text">
                <span className={`skeleton-box ${widthClass}`} />
              </td>
              <td className="score">
                <span className="skeleton-box skeleton-score" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Section Distribution Skeleton */}
      <div className="attribution-section">
        <div className="attribution-title">
          <span className="skeleton-box skeleton-title-md" />
        </div>
        <div className="panel-bars-list">
          {barWidths.map((widthClass, index) => (
            <div key={index} className="bar-row">
              <div className="bar-label-line">
                <span className="skeleton-box skeleton-label" />
                <span className="skeleton-box skeleton-pct" />
              </div>
              <div className="bar-track">
                <div className={`skeleton-box skeleton-bar-fill ${widthClass}`} />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section Neighbors Skeleton */}
    <div className="attribution-section">
        <div className="attribution-title">
          <span className="skeleton-box skeleton-title-md" />
        </div>
        <div className="panel-bars-list">
          {barWidths.map((widthClass, index) => (
            <div key={index} className="bar-row">
              <div className="bar-label-line">
                <span className="skeleton-box skeleton-label" />
                <span className="skeleton-box skeleton-pct" />
              </div>
              <div className="bar-track">
                <div className={`skeleton-box skeleton-bar-fill ${widthClass}`} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}