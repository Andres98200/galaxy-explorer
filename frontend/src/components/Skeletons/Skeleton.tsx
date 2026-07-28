// src/components/Skeletons/Skeleton.tsx
interface SkeletonProps {
  className?: string;
}

export default function Skeleton({ className = "" }: SkeletonProps) {
  // On combine TOUJOURS 'skeleton-box' (qui contient l'animation) avec tes classes custom
  return <div className={`skeleton-box ${className}`} />;
}