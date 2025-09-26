import React from 'react';
import { clsx } from 'clsx';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'default' | 'glass' | 'elevated';
  padding?: 'none' | 'sm' | 'md' | 'lg' | 'xl';
}

export function Card({
  children,
  className,
  variant = 'default',
  padding = 'md'
}: CardProps) {
  const baseStyles = 'rounded-xl border transition-all duration-200';
  
  const variants = {
    default: 'bg-white border-gray-200 shadow-sm hover:shadow-md',
    glass: 'bg-white/10 backdrop-blur-md border-white/20 shadow-lg',
    elevated: 'bg-white border-gray-200 shadow-lg hover:shadow-xl',
  };

  const paddings = {
    none: '',
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8',
    xl: 'p-10',
  };

  return (
    <div className={clsx(
      baseStyles,
      variants[variant],
      paddings[padding],
      className
    )}>
      {children}
    </div>
  );
}