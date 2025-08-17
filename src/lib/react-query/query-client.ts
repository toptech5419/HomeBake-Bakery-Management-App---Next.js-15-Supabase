import { QueryClient } from '@tanstack/react-query';
import { createProductionQueryClient, logQueryError, logQuerySuccess } from './config';
import { logUtils } from '@/lib/monitoring/production-logger';

// Create production-optimized query client
export const queryClient = createProductionQueryClient();

// Add global error and success logging for production monitoring
// Note: Global callbacks need to be handled differently in newer React Query versions

// Export the standardized query keys from config
export { QUERY_KEYS as queryKeys } from './config';

// Legacy query keys for backward compatibility (will be removed after migration)
export const legacyQueryKeys = {
  inventory: {
    all: ['inventory'] as const,
    current: () => ['inventory', 'current'] as const,
    logs: () => ['inventory', 'logs'] as const,
  },
  sales: {
    all: ['sales'] as const,
    current: () => ['sales', 'current'] as const,
    today: () => ['sales', 'today'] as const,
  },
  production: {
    all: ['production'] as const,
    current: () => ['production', 'current'] as const,
    today: () => ['production', 'today'] as const,
  },
  breadTypes: {
    all: ['breadTypes'] as const,
    active: () => ['breadTypes', 'active'] as const,
  },
  reports: {
    all: ['reports'] as const,
    summary: (filters?: any) => ['reports', 'summary', filters] as const,
  },
} as const;