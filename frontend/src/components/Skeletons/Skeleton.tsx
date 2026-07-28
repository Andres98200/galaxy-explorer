interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "" }: SkeletonProps) {
  // On combine TOUJOURS 'skeleton-box' (qui contient l'animation) avec tes classes custom
  return <div className={`skeleton-box ${className}`} />;
}
export default function Skeleton({ className = "" }) {
  return <div className={`skeleton ${className}`} />;
}
