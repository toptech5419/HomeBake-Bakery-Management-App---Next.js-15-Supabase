/**
 * Production-safe logging utility
 * Reduces verbose console logs in production while maintaining error tracking
 */

const isDevelopment = process.env.NODE_ENV === 'development';

interface LogContext {
  [key: string]: any;
}

class Logger {
  static debug(message: string, context?: LogContext) {
    if (isDevelopment) {
      console.log(`🔧 ${message}`, context || '');
    }
  }

  static info(message: string, context?: LogContext) {
    console.log(`ℹ️ ${message}`, context || '');
  }

  static warn(message: string, context?: LogContext) {
    console.warn(`⚠️ ${message}`, context || '');
  }

  static error(message: string, error?: Error | any, context?: LogContext) {
    console.error(`❌ ${message}`, error, context || '');
  }

  static tracker(message: string, context?: LogContext) {
    if (isDevelopment) {
      console.log(`📊 ${message}`, context || '');
    }
  }

  static realtime(message: string, context?: LogContext) {
    if (isDevelopment) {
      console.log(`🔄 ${message}`, context || '');
    }
  }

  static success(message: string, context?: LogContext) {
    if (isDevelopment) {
      console.log(`✅ ${message}`, context || '');
    }
  }
}

export { Logger };