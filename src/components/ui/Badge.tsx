import React from 'react';

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'frosted' | 'solid' | 'accent' | 'danger';
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'frosted',
  className = '',
}) => {
  const variantStyles = {
    frosted: 'bg-black/75 backdrop-blur-md text-white/95 border border-white/15',
    solid: 'bg-vega-surface3 text-white border border-white/5',
    accent: 'bg-vega-ctaPrimary text-vega-ctaText font-semibold',
    danger: 'bg-vega-error text-white font-medium',
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs tracking-wide shadow-sm select-none ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
