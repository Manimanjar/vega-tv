import React from 'react';
import { Skeleton } from '../ui/Skeleton';

interface PosterSkeletonProps {
  count?: number;
}

export const PosterSkeleton: React.FC<PosterSkeletonProps> = ({ count = 6 }) => {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-36 sm:w-44 md:w-52 space-y-2.5">
          <Skeleton className="w-full aspect-poster rounded-2xl" />
          <div className="space-y-1.5 px-1">
            <Skeleton className="w-4/5 h-3.5 rounded" />
            <Skeleton className="w-1/2 h-3 rounded" />
          </div>
        </div>
      ))}
    </>
  );
};
