import React from 'react';
import { cn } from '@/lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', children, ...props }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 disabled:pointer-events-none disabled:opacity-50';
    
    const variants = {
      primary: 'text-white hover:bg-teal-900',
      secondary: 'bg-stone-200 text-stone-900 hover:bg-stone-300',
      outline: 'border border-stone-300 bg-transparent hover:bg-stone-50',
      ghost: 'hover:bg-stone-100 hover:text-stone-900'
    };
    
    const sizes = {
      sm: 'h-8 px-3 text-sm rounded-full',
      md: 'h-10 px-4 py-2 rounded-full',
      lg: 'h-12 px-8 text-lg rounded-full'
    };

    return (
      <button
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        style={variant === 'primary' ? { backgroundColor: '#165641' } : undefined}
        ref={ref}
        {...props}
      >
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };
