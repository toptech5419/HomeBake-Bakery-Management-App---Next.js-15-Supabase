'use client';

interface PerformanceMetric {
  componentName: string;
  renderTime: number;
  timestamp: number;
  memoryUsage?: number;
  interactionTime?: number;
}

interface UserInteraction {
  action: string;
  componentName: string;
  timestamp: number;
  duration?: number;
}

class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetric[] = [];
  private interactions: UserInteraction[] = [];
  private isEnabled: boolean = process.env.NODE_ENV === 'development';

  private constructor() {
    this.setupPerformanceObserver();
  }

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  private setupPerformanceObserver() {
    if (typeof window !== 'undefined' && 'PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'measure') {
              this.recordMetric({
                componentName: entry.name,
                renderTime: entry.duration,
                timestamp: Date.now(),
              });
            }
          }
        });
        observer.observe({ entryTypes: ['measure'] });
      } catch (error) {
        console.warn('Performance monitoring not available:', error);
      }
    }
  }

  startMeasure(componentName: string) {
    if (!this.isEnabled) return;
    
    const markName = `${componentName}-start`;
    performance.mark(markName);
  }

  endMeasure(componentName: string) {
    if (!this.isEnabled) return;
    
    const startMark = `${componentName}-start`;
    const endMark = `${componentName}-end`;
    const measureName = `${componentName}-render`;
    
    performance.mark(endMark);
    performance.measure(measureName, startMark, endMark);
    
    const measure = performance.getEntriesByName(measureName)[0];
    if (measure) {
      this.recordMetric({
        componentName,
        renderTime: measure.duration,
        timestamp: Date.now(),
      });
    }
  }

  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only last 100 metrics to prevent memory leaks
    if (this.metrics.length > 100) {
      this.metrics = this.metrics.slice(-100);
    }
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance: ${metric.componentName} rendered in ${metric.renderTime.toFixed(2)}ms`);
    }
  }

  recordInteraction(interaction: UserInteraction) {
    this.interactions.push(interaction);
    
    // Keep only last 50 interactions
    if (this.interactions.length > 50) {
      this.interactions = this.interactions.slice(-50);
    }
  }

  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getInteractions(): UserInteraction[] {
    return [...this.interactions];
  }

  getAverageRenderTime(componentName?: string): number {
    const relevantMetrics = componentName 
      ? this.metrics.filter(m => m.componentName === componentName)
      : this.metrics;
    
    if (relevantMetrics.length === 0) return 0;
    
    const totalTime = relevantMetrics.reduce((sum, m) => sum + m.renderTime, 0);
    return totalTime / relevantMetrics.length;
  }

  getSlowestComponents(limit: number = 5): PerformanceMetric[] {
    return [...this.metrics]
      .sort((a, b) => b.renderTime - a.renderTime)
      .slice(0, limit);
  }

  clearMetrics() {
    this.metrics = [];
    this.interactions = [];
  }

  enable() {
    this.isEnabled = true;
  }

  disable() {
    this.isEnabled = false;
  }
}

// React Hook for performance monitoring
export function usePerformanceMonitor(componentName: string) {
  const monitor = PerformanceMonitor.getInstance();
  
  React.useEffect(() => {
    monitor.startMeasure(componentName);
    
    return () => {
      monitor.endMeasure(componentName);
    };
  }, [componentName]);
  
  return {
    recordInteraction: (action: string, duration?: number) => {
      monitor.recordInteraction({
        action,
        componentName,
        timestamp: Date.now(),
        duration,
      });
    },
  };
}

// HOC for automatic performance monitoring
export function withPerformanceMonitoring<P extends object>(
  Component: React.ComponentType<P>,
  componentName: string
) {
  const WrappedComponent = React.forwardRef<any, P>((props, ref) => {
    usePerformanceMonitor(componentName);
    
    return <Component {...props} ref={ref} />;
  });
  
  WrappedComponent.displayName = `withPerformanceMonitoring(${componentName})`;
  
  return WrappedComponent;
}

// Utility for measuring async operations
export function measureAsync<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const monitor = PerformanceMonitor.getInstance();
  const startTime = performance.now();
  
  return operation().finally(() => {
    const duration = performance.now() - startTime;
    monitor.recordMetric({
      componentName: operationName,
      renderTime: duration,
      timestamp: Date.now(),
    });
  });
}

// Utility for measuring user interactions
export function measureInteraction(
  interaction: () => void,
  action: string,
  componentName: string
) {
  const monitor = PerformanceMonitor.getInstance();
  const startTime = performance.now();
  
  interaction();
  
  const duration = performance.now() - startTime;
  monitor.recordInteraction({
    action,
    componentName,
    timestamp: Date.now(),
    duration,
  });
}

// Export the monitor instance
export const performanceMonitor = PerformanceMonitor.getInstance();

// Development utilities
if (process.env.NODE_ENV === 'development') {
  (window as any).__PERFORMANCE_MONITOR__ = {
    getMetrics: () => performanceMonitor.getMetrics(),
    getInteractions: () => performanceMonitor.getInteractions(),
    getAverageRenderTime: (componentName?: string) => performanceMonitor.getAverageRenderTime(componentName),
    getSlowestComponents: (limit?: number) => performanceMonitor.getSlowestComponents(limit),
    clearMetrics: () => performanceMonitor.clearMetrics(),
    enable: () => performanceMonitor.enable(),
    disable: () => performanceMonitor.disable(),
  };
} 