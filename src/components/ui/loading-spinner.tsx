import React from 'react';

interface LoadingSpinnerProps {
  message?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'spinner' | 'dots' | 'skeleton';
}

export const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  message, 
  size = 'md',
  variant = 'spinner' 
}) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-16 w-16',
    lg: 'h-24 w-24'
  };

  const messageSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  };

  if (variant === 'dots') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background" aria-busy="true" aria-live="polite" role="status">
        <div className="flex space-x-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className={`${sizeClasses[size]} bg-orange-500 rounded-full animate-pulse`}
              style={{
                animationDelay: `${i * 0.2}s`,
                animationDuration: '1.4s'
              }}
            />
          ))}
        </div>
        {message && (
          <p className={`mt-6 text-center font-medium text-orange-500 px-4 ${messageSizeClasses[size]}`}>
            {message}
          </p>
        )}
      </div>
    );
  }

  if (variant === 'skeleton') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background" aria-busy="true" aria-live="polite" role="status">
        <div className="w-32 h-4 bg-gray-200 rounded animate-pulse mb-4"></div>
        <div className="w-24 h-4 bg-gray-200 rounded animate-pulse"></div>
        {message && (
          <p className={`mt-6 text-center font-medium text-orange-500 px-4 ${messageSizeClasses[size]}`}>
            {message}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-background" aria-busy="true" aria-live="polite" role="status">
      <div className="flex items-center justify-center">
        <svg
          className={`${sizeClasses[size]} animate-spin text-orange-500`}
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      </div>
      {message && (
        <p className={`mt-6 text-center font-medium text-orange-500 px-4 ${messageSizeClasses[size]}`}>
          {message}
        </p>
      )}
    </div>
  );
};

export default LoadingSpinner; 