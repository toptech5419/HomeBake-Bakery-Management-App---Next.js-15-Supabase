import { cn } from '@/lib/utils';

interface MobileLoadingProps {
  className?: string;
  message?: string;
  fullScreen?: boolean;
}

export function MobileLoading({ className, message = 'Loading...', fullScreen = true }: MobileLoadingProps) {
  const wrapperClass = fullScreen 
    ? 'fixed inset-0 w-screen h-screen z-50 flex items-center justify-center bg-gradient-to-br from-orange-50 to-amber-50'
    : 'flex items-center justify-center p-8';

  return (
    <div className={cn(wrapperClass, className)}>
      <div className="text-center">
        <div className="relative inline-flex">
          <div className="w-8 h-8 bg-blue-500 rounded-full animate-ping absolute"></div>
          <div className="w-8 h-8 bg-blue-600 rounded-full relative"></div>
        </div>
        <p className="mt-4 text-sm text-gray-600 font-medium">{message}</p>
      </div>
    </div>
  );
}

export function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-lg border bg-card p-4 space-y-3", className)}>
      <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
      <div className="h-3 bg-gray-200 rounded animate-pulse w-1/2"></div>
      <div className="h-8 bg-gray-200 rounded animate-pulse w-full"></div>
    </div>
  );
}

export function MobilePageLoading() {
  return (
    <div className="space-y-4 p-4">
      <div className="h-8 bg-gray-200 rounded animate-pulse w-1/3"></div>
      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <SkeletonCard key={i} />
        ))}
      </div>
    </div>
  );
}