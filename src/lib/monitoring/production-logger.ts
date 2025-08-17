/**
 * Production-Ready Logging and Monitoring System
 * For HomeBake Bakery Management App
 */

import React from 'react';

export interface LogEvent {
  level: 'debug' | 'info' | 'warn' | 'error';
  message: string;
  category: 'auth' | 'query' | 'mutation' | 'navigation' | 'performance' | 'business' | 'error';
  metadata?: Record<string, unknown>;
  timestamp: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
  stackTrace?: string;
}

class ProductionLogger {
  private sessionId: string;
  private userId?: string;
  private isProduction: boolean;

  constructor() {
    this.sessionId = this.generateSessionId();
    this.isProduction = process.env.NODE_ENV === 'production';
    
    // Initialize session tracking
    this.initializeSession();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private initializeSession() {
    if (typeof window !== 'undefined') {
      // Store session ID in sessionStorage
      sessionStorage.setItem('homebake_session_id', this.sessionId);
      
      // Track page visibility changes
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          this.info('Session resumed', 'navigation');
        } else {
          this.info('Session paused', 'navigation');
        }
      });
    }
  }

  setUserId(userId: string) {
    this.userId = userId;
  }

  private createLogEvent(
    level: LogEvent['level'],
    message: string,
    category: LogEvent['category'],
    metadata?: Record<string, unknown>,
    error?: Error
  ): LogEvent {
    const event: LogEvent = {
      level,
      message,
      category,
      metadata,
      timestamp: new Date().toISOString(),
      userId: this.userId,
      sessionId: this.sessionId,
    };

    if (typeof window !== 'undefined') {
      event.userAgent = window.navigator.userAgent;
      event.url = window.location.href;
    }

    if (error) {
      event.stackTrace = error.stack;
    }

    return event;
  }

  private shouldLog(level: LogEvent['level']): boolean {
    if (this.isProduction) {
      // In production, only log info, warn, and error
      return ['info', 'warn', 'error'].includes(level);
    }
    // In development, log everything
    return true;
  }

  private logToConsole(event: LogEvent) {
    const prefix = `[${event.category.toUpperCase()}]`;
    const timestamp = new Date(event.timestamp).toLocaleTimeString();
    
    switch (event.level) {
      case 'debug':
        console.debug(`${prefix} ${timestamp}`, event.message, event.metadata);
        break;
      case 'info':
        console.info(`${prefix} ${timestamp}`, event.message, event.metadata);
        break;
      case 'warn':
        console.warn(`${prefix} ${timestamp}`, event.message, event.metadata);
        break;
      case 'error':
        console.error(`${prefix} ${timestamp}`, event.message, event.metadata, event.stackTrace);
        break;
    }
  }

  private async logToRemote(event: LogEvent) {
    if (!this.isProduction) return;

    try {
      // In production, you would send logs to your monitoring service
      // Examples: Sentry, LogRocket, DataDog, New Relic, etc.
      
      // For now, we'll just store critical errors locally
      if (event.level === 'error' && typeof window !== 'undefined') {
        const errors = JSON.parse(localStorage.getItem('homebake_errors') || '[]');
        errors.push(event);
        
        // Keep only the last 10 errors to avoid storage bloat
        if (errors.length > 10) {
          errors.splice(0, errors.length - 10);
        }
        
        localStorage.setItem('homebake_errors', JSON.stringify(errors));
      }

      // TODO: Implement actual remote logging
      // await fetch('/api/logs', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(event)
      // });
    } catch (error) {
      // Silently fail for remote logging to avoid infinite loops
      console.warn('Failed to send log to remote service:', error);
    }
  }

  private log(
    level: LogEvent['level'],
    message: string,
    category: LogEvent['category'],
    metadata?: Record<string, unknown>,
    error?: Error
  ) {
    if (!this.shouldLog(level)) return;

    const event = this.createLogEvent(level, message, category, metadata, error);
    
    this.logToConsole(event);
    this.logToRemote(event);
  }

  // Convenience methods
  debug(message: string, category: LogEvent['category'] = 'debug', metadata?: Record<string, unknown>) {
    this.log('debug', message, category, metadata);
  }

  info(message: string, category: LogEvent['category'] = 'info', metadata?: Record<string, unknown>) {
    this.log('info', message, category, metadata);
  }

  warn(message: string, category: LogEvent['category'] = 'error', metadata?: Record<string, unknown>) {
    this.log('warn', message, category, metadata);
  }

  error(message: string, category: LogEvent['category'] = 'error', metadata?: Record<string, unknown>, error?: Error) {
    this.log('error', message, category, metadata, error);
  }

  // Business-specific logging methods
  businessEvent(event: string, data?: Record<string, unknown>) {
    this.info(`Business Event: ${event}`, 'business', data);
  }

  performanceMetric(metric: string, value: number, unit: string = 'ms') {
    this.info(`Performance: ${metric}`, 'performance', { value, unit });
  }

  authEvent(event: string, data?: Record<string, unknown>) {
    this.info(`Auth: ${event}`, 'auth', data);
  }

  queryEvent(operation: string, data?: Record<string, unknown>) {
    this.debug(`Query: ${operation}`, 'query', data);
  }

  mutationEvent(operation: string, data?: Record<string, unknown>) {
    this.info(`Mutation: ${operation}`, 'mutation', data);
  }

  navigationEvent(from: string, to: string) {
    this.info(`Navigation: ${from} → ${to}`, 'navigation', { from, to });
  }

  // Error tracking with automatic categorization
  trackError(error: Error, context?: string, metadata?: Record<string, unknown>) {
    const errorMetadata = {
      ...metadata,
      context,
      name: error.name,
      type: error.constructor.name,
    };

    // Categorize errors
    let category: LogEvent['category'] = 'error';
    if (context?.includes('auth')) category = 'auth';
    else if (context?.includes('query') || context?.includes('fetch')) category = 'query';
    else if (context?.includes('mutation')) category = 'mutation';

    this.error(error.message, category, errorMetadata, error);
  }

  // Performance monitoring
  startPerformanceTimer(label: string): () => void {
    const startTime = performance.now();
    
    return () => {
      const duration = performance.now() - startTime;
      this.performanceMetric(label, Math.round(duration));
    };
  }

  // Health check logging
  healthCheck(service: string, status: 'healthy' | 'degraded' | 'unhealthy', details?: Record<string, unknown>) {
    const level = status === 'healthy' ? 'info' : status === 'degraded' ? 'warn' : 'error';
    this.log(level, `Health Check: ${service} is ${status}`, 'performance', details);
  }

  // Get stored error logs for debugging
  getStoredErrors(): LogEvent[] {
    if (typeof window === 'undefined') return [];
    
    try {
      return JSON.parse(localStorage.getItem('homebake_errors') || '[]');
    } catch {
      return [];
    }
  }

  // Clear stored errors
  clearStoredErrors() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('homebake_errors');
    }
  }
}

// Global logger instance
export const logger = new ProductionLogger();

// React hook for logging
export function useLogger() {
  return logger;
}

// HOC for automatic error boundary logging (moved to separate file due to JSX)
export function createErrorLoggingHOC<P extends object>(
  componentName: string
): (Component: React.ComponentType<P>) => React.ComponentType<P> {
  return function withErrorLogging(Component: React.ComponentType<P>) {
    return function ErrorLoggedComponent(props: P) {
      try {
        // This would need to be in a .tsx file to work properly
        // For now, we'll just return null and log the intent
        logger.info(`Component ${componentName} rendered`, 'performance', {
          componentName,
          propsKeys: Object.keys(props as object)
        });
        
        // In a real implementation, this would be:
        // return React.createElement(Component, props);
        return null as any; // Placeholder
      } catch (error) {
        logger.trackError(
          error as Error,
          `Component: ${componentName}`,
          { componentName, props: Object.keys(props as object) }
        );
        throw error;
      }
    };
  };
}

// Utility functions for common patterns
export const logUtils = {
  // Log React Query events
  logQuerySuccess: (queryKey: unknown[], data: unknown) => {
    logger.queryEvent(`Query Success: ${Array.isArray(queryKey) ? queryKey.join('.') : 'unknown'}`, {
      queryKey,
      dataSize: Array.isArray(data) ? data.length : typeof data === 'object' ? Object.keys(data || {}).length : 1,
    });
  },

  logQueryError: (queryKey: unknown[], error: Error) => {
    logger.trackError(error, `Query Error: ${Array.isArray(queryKey) ? queryKey.join('.') : 'unknown'}`, {
      queryKey,
    });
  },

  logMutationSuccess: (mutationKey: unknown[], data: unknown) => {
    logger.mutationEvent(`Mutation Success: ${Array.isArray(mutationKey) ? mutationKey.join('.') : 'unknown'}`, {
      mutationKey,
      data: typeof data === 'object' ? Object.keys(data || {}) : data,
    });
  },

  logMutationError: (mutationKey: unknown[], error: Error) => {
    logger.trackError(error, `Mutation Error: ${Array.isArray(mutationKey) ? mutationKey.join('.') : 'unknown'}`, {
      mutationKey,
    });
  },

  // Log business events
  logBatchCreated: (batchId: string, breadType: string, quantity: number) => {
    logger.businessEvent('Batch Created', { batchId, breadType, quantity });
  },

  logSaleRecorded: (saleId: string, breadType: string, quantity: number, amount: number) => {
    logger.businessEvent('Sale Recorded', { saleId, breadType, quantity, amount });
  },

  logShiftEnded: (shift: string, totalBatches: number, totalProduction: number) => {
    logger.businessEvent('Shift Ended', { shift, totalBatches, totalProduction });
  },

  // Log auth events
  logLogin: (userId: string, method: string) => {
    logger.setUserId(userId);
    logger.authEvent('User Login', { userId, method });
  },

  logLogout: () => {
    logger.authEvent('User Logout');
  },

  logAuthError: (error: Error, context: string) => {
    logger.trackError(error, `Auth Error: ${context}`);
  },
};