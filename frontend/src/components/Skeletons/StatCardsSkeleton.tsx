import Skeleton from "../Skeletons/Skeleton";

export default function StatCardSkeleton() {
  return (
    <div className="stat-card">
      <Skeleton className="stat-card-icon-skeleton" />
      <div className="stat-card-content">
        <Skeleton className="stat-card-content-skeleton" />
      </div>
    </div>
  );
}