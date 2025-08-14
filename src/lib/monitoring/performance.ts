/**
 * Performance Monitoring and Metrics Collection
 * Production-ready infrastructure for monitoring app performance
 */

interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'bytes' | 'count' | 'percentage';
  timestamp: number;
  metadata?: Record<string, unknown>;
}

interface UserAction {
  action: string;
  component: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private userActions: UserAction[] = [];
  private timers: Map<string, number> = new Map();

  /**
   * Start timing an operation
   */
  startTimer(name: string): void {
    this.timers.set(name, performance.now());
  }

  /**
   * End timing and record metric
   */
  endTimer(name: string, metadata?: Record<string, unknown>): number {
    const startTime = this.timers.get(name);
    if (!startTime) {
      console.warn(`Timer '${name}' was not started`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.timers.delete(name);

    this.recordMetric({
      name,
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      metadata
    });

    return duration;
  }

  /**
   * Record a performance metric
   */
  recordMetric(metric: PerformanceMetric): void {
    this.metrics.push(metric);

    // Log in development
    if (process.env.NODE_ENV === 'development') {
      console.log(`📊 Performance: ${metric.name} = ${metric.value}${metric.unit}`);
    }

    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      this.sendToMonitoringService(metric);
    }
  }

  /**
   * Track user actions for UX analytics
   */
  trackUserAction(action: UserAction): void {
    this.userActions.push(action);

    if (process.env.NODE_ENV === 'development') {
      console.log(`👤 User Action: ${action.action} in ${action.component}`);
    }
  }

  /**
   * Get Core Web Vitals
   */
  getCoreWebVitals(): void {
    // Largest Contentful Paint
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordMetric({
        name: 'LCP',
        value: lastEntry.startTime,
        unit: 'ms',
        timestamp: Date.now()
      });
    }).observe({ type: 'largest-contentful-paint', buffered: true });

    // First Input Delay
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        this.recordMetric({
          name: 'FID',
          value: entry.processingStart - entry.startTime,
          unit: 'ms',
          timestamp: Date.now()
        });
      });
    }).observe({ type: 'first-input', buffered: true });

    // Cumulative Layout Shift
    new PerformanceObserver((list) => {
      const entries = list.getEntries();
      entries.forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          this.recordMetric({
            name: 'CLS',
            value: entry.value,
            unit: 'count',
            timestamp: Date.now()
          });
        }
      });
    }).observe({ type: 'layout-shift', buffered: true });
  }

  /**
   * Monitor React Query performance
   */
  trackQueryPerformance(queryKey: string, duration: number, status: 'success' | 'error'): void {
    this.recordMetric({
      name: 'react_query_duration',
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      metadata: { queryKey, status }
    });
  }

  /**
   * Monitor database operation performance
   */
  trackDatabaseOperation(operation: string, duration: number, success: boolean): void {
    this.recordMetric({
      name: 'db_operation_duration',
      value: duration,
      unit: 'ms',
      timestamp: Date.now(),
      metadata: { operation, success }
    });
  }

  /**
   * Send metrics to external monitoring service
   */
  private sendToMonitoringService(metric: PerformanceMetric): void {
    // Example: Send to Sentry, DataDog, or New Relic
    // This would be replaced with actual monitoring service API calls
    
    if (typeof window !== 'undefined' && (window as any).gtag) {
      // Google Analytics 4 custom event
      (window as any).gtag('event', 'performance_metric', {
        metric_name: metric.name,
        metric_value: metric.value,
        metric_unit: metric.unit
      });
    }

    // Example: Send to custom analytics endpoint
    if (process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT) {
      fetch(process.env.NEXT_PUBLIC_ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'performance_metric', data: metric })
      }).catch(console.error);
    }
  }

  /**
   * Get performance summary
   */
  getPerformanceSummary(): {
    averageResponseTime: number;
    totalMetrics: number;
    recentActions: UserAction[];
  } {
    const responseTimes = this.metrics
      .filter(m => m.unit === 'ms')
      .map(m => m.value);

    const averageResponseTime = responseTimes.length > 0
      ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length
      : 0;

    return {
      averageResponseTime,
      totalMetrics: this.metrics.length,
      recentActions: this.userActions.slice(-10)
    };
  }

  /**
   * Clear old metrics (call periodically to prevent memory leaks)
   */
  cleanup(): void {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    this.metrics = this.metrics.filter(m => m.timestamp > oneHourAgo);
    this.userActions = this.userActions.filter(a => a.timestamp > oneHourAgo);
  }
}

// Singleton instance
export const performanceMonitor = new PerformanceMonitor();

// React Hook for easy usage in components
export function usePerformanceMonitor() {
  return {
    startTimer: performanceMonitor.startTimer.bind(performanceMonitor),
    endTimer: performanceMonitor.endTimer.bind(performanceMonitor),
    recordMetric: performanceMonitor.recordMetric.bind(performanceMonitor),
    trackUserAction: performanceMonitor.trackUserAction.bind(performanceMonitor),
    trackQueryPerformance: performanceMonitor.trackQueryPerformance.bind(performanceMonitor),
    trackDatabaseOperation: performanceMonitor.trackDatabaseOperation.bind(performanceMonitor)
  };
}

// Initialize Core Web Vitals monitoring
if (typeof window !== 'undefined') {
  performanceMonitor.getCoreWebVitals();
  
  // Cleanup every hour
  setInterval(() => {
    performanceMonitor.cleanup();
  }, 60 * 60 * 1000);
}

export default performanceMonitor;