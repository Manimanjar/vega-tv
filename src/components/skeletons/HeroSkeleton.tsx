import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const HeroSkeleton: React.FC = () => {
  return (
    <div className="relative w-full aspect-[16/9] max-h-[65vh] min-h-[360px] overflow-hidden rounded-3xl mx-auto mb-8 px-4 sm:px-8">
      <Skeleton className="w-full h-full rounded-3xl" />
      <div className="absolute bottom-10 left-8 sm:left-14 space-y-4 max-w-lg z-10">
        <Skeleton className="w-3/4 h-8 sm:h-12 rounded-xl" />
        <Skeleton className="w-full h-4 rounded" />
        <Skeleton className="w-2/3 h-4 rounded" />
        <div className="flex gap-3 pt-2">
          <Skeleton className="w-32 h-11 rounded-full" />
          <Skeleton className="w-32 h-11 rounded-full" />
        </div>
      </div>
    </div>
  );
};
