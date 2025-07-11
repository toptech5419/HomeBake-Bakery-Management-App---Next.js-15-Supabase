import { OptimizedLoadingSpinner } from '@/components/ui/loading-optimized';
 
export default function Loading() {
  return (
    <OptimizedLoadingSpinner 
      message="Loading your dashboard..." 
      variant="progressive"
      size="lg"
    />
  );
} 