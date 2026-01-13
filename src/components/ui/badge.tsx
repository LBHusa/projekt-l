import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'default' | 'outline';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className = '', variant = 'default', ...props }, ref) => {
    const variants = {
      default: 'bg-blue-100 text-blue-800',
      outline: 'border border-gray-300 text-gray-800',
    };

    return (
      <span
        ref={ref}
        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${variants[variant]} ${className}`}
        {...props}
      />
    );
  }
);

Badge.displayName = 'Badge';
