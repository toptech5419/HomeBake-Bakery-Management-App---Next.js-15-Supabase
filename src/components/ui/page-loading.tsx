'use client';

interface PageLoadingProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
}

export function PageLoading({ title, description, icon }: PageLoadingProps) {
  const defaultIcon = (
    <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
    </svg>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50 flex items-center justify-center">
      <div className="flex flex-col items-center justify-center text-center px-6 py-8 max-w-md">
        
        {/* Icon and Title */}
        <div className="mb-8">
          <div className="w-24 h-24 bg-gradient-to-r from-green-500 to-green-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
            {icon || defaultIcon}
          </div>
          <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-3">{title}</h1>
          {description && (
            <p className="text-lg text-gray-600">{description}</p>
          )}
        </div>

        {/* Loading Animation */}
        <div className="relative mb-8">
          <div className="w-16 h-16 border-4 border-green-200 border-t-green-500 rounded-full animate-spin"></div>
          <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-r-green-300 rounded-full animate-spin" style={{animationDirection: 'reverse', animationDuration: '1.5s'}}></div>
        </div>

        {/* Progress indicator */}
        <div className="w-64 bg-gray-200 rounded-full h-2 mb-4">
          <div className="bg-gradient-to-r from-green-400 to-green-600 h-2 rounded-full w-3/4 animate-pulse"></div>
        </div>
        
        <div className="text-sm text-gray-500 animate-pulse">
          Loading...
        </div>
      </div>
    </div>
  );
}