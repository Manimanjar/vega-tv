import React, { forwardRef } from 'react';

interface FocusableCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  navSection?: string;
  onClick?: () => void;
  className?: string;
}

export const FocusableCard = forwardRef<HTMLDivElement, FocusableCardProps>(
  ({ children, navSection, onClick, className = '', ...props }, ref) => {
    return (
      <div
        ref={ref}
        tabIndex={0}
        role="button"
        data-focusable="true"
        data-nav-section={navSection}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        className={`group relative outline-none cursor-pointer transition-all duration-200 transform-gpu ${className}`}
        {...props}
      >
        {children}
      </div>
    );
  }
);

FocusableCard.displayName = 'FocusableCard';
