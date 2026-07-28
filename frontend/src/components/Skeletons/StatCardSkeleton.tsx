import Skeleton from "../Skeletons/Skeleton";

export default function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <div className="stat-card-icon">
        <Skeleton className="stat-card-icon-skeleton" />
      </div>

      <div className="stat-card-content">
        <div className="stat-card-title">
          <Skeleton className="stat-card-title-skeleton" />
        </div>
        <div className="stat-card-value">
          <Skeleton className="stat-card-value-skeleton" />
        </div>
      </div>
    </div>
  );
}