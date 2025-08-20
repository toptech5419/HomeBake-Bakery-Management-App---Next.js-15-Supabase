/**
 * SIMPLIFIED PERFORMANCE UTILITIES - PRODUCTION READY
 * 
 * Removed complex idle scheduling that was causing race conditions in production.
 * Replaced with simple, reliable alternatives for 100% production compatibility.
 */

/**
 * Simple, reliable work scheduler without complex idle callbacks
 * Uses basic setTimeout for predictable behavior across all environments
 */
export function scheduleIdleWork<T>(
  callback: () => T | Promise<T>,
  options: { timeout?: number; priority?: 'low' | 'normal' | 'high' } = {}
): Promise<T> {
  const { priority = 'normal' } = options;

  return new Promise((resolve, reject) => {
    // Simple priority-based delays
    const delay = priority === 'high' ? 0 : priority === 'normal' ? 4 : 16;
    
    setTimeout(async () => {
      try {
        const result = callback();
        if (result instanceof Promise) {
          result.then(resolve).catch(reject);
        } else {
          resolve(result);
        }
      } catch (error) {
        reject(error);
      }
    }, delay);
  });
}

/**
 * Simple work chunking without complex scheduling
 */
export async function scheduleWorkInChunks<T>(
  items: T[],
  processor: (item: T, index: number) => void | Promise<void>,
  chunkSize = 5
): Promise<void> {
  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);
    
    // Process chunk synchronously
    for (let j = 0; j < chunk.length; j++) {
      await processor(chunk[j], i + j);
    }
    
    // Simple yield between chunks
    if (i + chunkSize < items.length) {
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
}

/**
 * Simple batched processor
 */
export class ScheduledBatch<T> {
  private pending: T[] = [];
  private timeoutId: number | null = null;
  
  constructor(
    private processor: (items: T[]) => Promise<void> | void,
    private delay = 100,
    private maxBatchSize = 10
  ) {}

  schedule(item: T): void {
    this.pending.push(item);
    
    // Process immediately if batch is full
    if (this.pending.length >= this.maxBatchSize) {
      this.flush();
      return;
    }

    // Schedule processing
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
    }

    this.timeoutId = window.setTimeout(() => this.flush(), this.delay);
  }

  private flush(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }

    if (this.pending.length === 0) return;

    const batch = [...this.pending];
    this.pending = [];

    // Process immediately without complex scheduling
    try {
      this.processor(batch);
    } catch (error) {
      console.error('Batch processing failed:', error);
    }
  }

  destroy(): void {
    if (this.timeoutId) {
      clearTimeout(this.timeoutId);
      this.timeoutId = null;
    }
    this.pending = [];
  }
}

/**
 * Simple transition wrapper - no complex React integration
 */
export function scheduleTransition<T>(callback: () => T | Promise<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    // Simple immediate execution
    try {
      const result = callback();
      if (result instanceof Promise) {
        result.then(resolve).catch(reject);
      } else {
        resolve(result);
      }
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * DEPRECATED FUNCTIONS - Kept for backward compatibility but simplified
 */

// Keep these exports for existing code that imports them
export const deprecatedScheduleIdleWork = scheduleIdleWork;
export const deprecatedScheduleTransition = scheduleTransition;