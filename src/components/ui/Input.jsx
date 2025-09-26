import React from 'react';
import { clsx } from 'clsx';

export function Input({
  label,
  error,
  icon,
  fullWidth = false,
  className,
  ...props
}) {
  const inputStyles = clsx(
    'block rounded-lg border transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent',
    {
      'w-full': fullWidth,
      'border-red-300 focus:ring-red-500': error,
      'border-gray-300 focus:ring-blue-500': !error,
      'pl-10': icon,
      'px-4 py-3': !icon,
    },
    className
  );

  return (
    <div className={clsx('space-y-1', fullWidth && 'w-full')}>
      {label && (
        <label className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
            {icon}
          </div>
        )}
        <input
          className={inputStyles}
          style={icon ? { paddingLeft: '2.5rem', paddingRight: '1rem', paddingTop: '0.75rem', paddingBottom: '0.75rem' } : {}}
          {...props}
        />
      </div>
      {error && (
        <p className="text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}