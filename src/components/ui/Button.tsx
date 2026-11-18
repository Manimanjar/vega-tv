import React, { ButtonHTMLAttributes, forwardRef } from 'react';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  isLoading?: boolean;
  navSection?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'secondary',
      size = 'md',
      isLoading = false,
      navSection,
      className = '',
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-all duration-200 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none active:scale-95 focus:outline-none';

    const sizeStyles = {
      sm: 'text-xs px-3.5 py-1.5 rounded-full gap-1.5',
      md: 'text-sm px-5 py-2.5 rounded-full gap-2',
      lg: 'text-base px-7 py-3.5 rounded-full gap-2.5 font-semibold',
      icon: 'p-2.5 rounded-full aspect-square',
    };

    const variantStyles = {
      primary:
        'bg-vega-ctaPrimary text-vega-ctaText hover:bg-white shadow-sm',
      secondary:
        'bg-vega-pillBg text-white hover:bg-vega-surface3 border border-white/5',
      accent:
        'bg-vega-navPill text-white hover:bg-vega-surface3 shadow-sm',
      danger:
        'bg-vega-error text-white hover:bg-red-700',
      ghost:
        'bg-transparent text-vega-textSecondary hover:text-white hover:bg-white/10',
    };

    return (
      <button
        ref={ref}
        data-focusable="true"
        data-nav-section={navSection}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
        {...props}
      >
        {isLoading ? (
          <span className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
        ) : null}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';
