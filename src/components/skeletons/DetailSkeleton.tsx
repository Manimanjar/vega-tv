import React from 'react';
import { Skeleton } from '../ui/Skeleton';

export const DetailSkeleton: React.FC = () => {
  return (
    <div className="min-h-screen pb-24">
      {/* Backdrop skeleton */}
      <div className="relative w-full aspect-[21/9] min-h-[320px] max-h-[500px]">
        <Skeleton className="w-full h-full rounded-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
      </div>

      {/* Info skeleton */}
      <div className="max-w-6xl mx-auto px-4 sm:px-8 -mt-24 sm:-mt-36 relative z-10 flex flex-col md:flex-row gap-8">
        <div className="flex-shrink-0 w-44 sm:w-56 md:w-64">
          <Skeleton className="w-full aspect-poster rounded-3xl shadow-2xl" />
        </div>
        <div className="flex-1 space-y-4 pt-4 md:pt-16">
          <Skeleton className="w-3/4 h-10 rounded-xl" />
          <div className="flex gap-2">
            <Skeleton className="w-20 h-6 rounded-full" />
            <Skeleton className="w-24 h-6 rounded-full" />
            <Skeleton className="w-16 h-6 rounded-full" />
          </div>
          <div className="space-y-2 pt-2">
            <Skeleton className="w-full h-4 rounded" />
            <Skeleton className="w-full h-4 rounded" />
            <Skeleton className="w-3/4 h-4 rounded" />
          </div>
          <div className="flex gap-4 pt-4">
            <Skeleton className="w-36 h-12 rounded-full" />
            <Skeleton className="w-36 h-12 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
