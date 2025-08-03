// UI Components Barrel Export
// This file exports all reusable UI components for cleaner imports

// Core UI Components
export { Button } from './button';
export { Card } from './card';
export { Input } from './input';
export { Label } from './label';
export { Badge } from './badge';
export { Skeleton } from './skeleton';
export { Textarea } from './textarea';
export { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './select';
export { Progress } from './progress';
export { ConnectionIndicator } from './connection-indicator';
export { Checkbox } from './checkbox';

// Loading components
export { LoadingSpinner } from './loading';
export { LoadingButton } from './loading-button';
export { 
  PageLoader, 
  DashboardLoader, 
  ModalLoader, 
  FormLoader, 
  BakeryLoader, 
  InlineLoader, 
  SkeletonLoader 
} from './page-loader';
export { 
  OptimizedLoadingSpinner,
  SkeletonCard,
  SkeletonTable,
  SkeletonForm,
  SkeletonDashboard,
  SkeletonList,
  ProgressiveLoading,
  MobileLoading,
  MobilePageLoading
} from './loading-optimized';

// Error Boundary components
export { 
  EnhancedErrorBoundary,
  ErrorBoundaryWrapper,
  QuickErrorBoundary,
  InlineErrorBoundary
} from './error-boundary-enhanced';

// Toast components
export * from './ToastProvider';
export { 
  OptimizedToastProvider,
  useOptimizedToast,
  createToastHelpers,
  showNetworkStatus,
  showErrorWithRetry,
  showSuccess,
  showInfo
} from './toast-optimized';

// Performance-optimized components
export {
  OptimizedDataTable,
  OptimizedSearchInput,
  OptimizedPagination,
  OptimizedVirtualList,
  OptimizedInfiniteScroll,
  OptimizedModal,
  OptimizedForm,
  OptimizedImage
} from './performance-optimized';

// Legacy components (for backward compatibility)
export { default as LoadingSpinner } from './LoadingSpinner';
export { MobileLoading as MobileLoadingLegacy } from './mobile-loading';
export { ToastProvider as ToastProviderLegacy } from './toast-provider';