import React from 'react';

interface SkeletonProps {
  className?: string;
  rounded?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  rounded = 'rounded-2xl',
}) => {
  return (
    <div
      aria-hidden="true"
      className={`skeleton-shimmer bg-vega-surface1 ${rounded} ${className}`}
    />
  );
};
