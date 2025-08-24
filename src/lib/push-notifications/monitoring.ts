'use server';

/**
 * Production-grade monitoring and retry system for push notifications
 * Provides comprehensive error handling, retry logic, and health monitoring
 */

interface NotificationAttempt {
  id: string;
  activity_type: string;
  user_name: string;
  message: string;
  attempt: number;
  max_attempts: number;
  status: 'pending' | 'success' | 'failed' | 'abandoned';
  last_error?: string;
  created_at: Date;
  updated_at: Date;
}

interface RetryConfig {
  maxAttempts: number;
  baseDelay: number; // milliseconds
  maxDelay: number; // milliseconds
  exponentialBackoff: boolean;
}

interface MonitoringMetrics {
  total_attempts: number;
  successful_attempts: number;
  failed_attempts: number;
  abandoned_attempts: number;
  success_rate: number;
  average_retry_count: number;
  last_24h_volume: number;
  health_status: 'healthy' | 'degraded' | 'critical';
  last_updated: Date;
}

// In-memory storage for notification attempts (in production, use Redis or database)
const notificationAttempts = new Map<string, NotificationAttempt>();
const metrics: MonitoringMetrics = {
  total_attempts: 0,
  successful_attempts: 0,
  failed_attempts: 0,
  abandoned_attempts: 0,
  success_rate: 0,
  average_retry_count: 0,
  last_24h_volume: 0,
  health_status: 'healthy',
  last_updated: new Date()
};

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 30000, // 30 seconds
  exponentialBackoff: true
};

/**
 * Enhanced retry mechanism with exponential backoff
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  config: Partial<RetryConfig> = {},
  context: { activity_type: string; user_name: string; message: string } = {
    activity_type: 'unknown',
    user_name: 'unknown',
    message: 'unknown operation'
  }
): Promise<T> {
  const fullConfig = { ...DEFAULT_RETRY_CONFIG, ...config };
  const attemptId = `${context.activity_type}_${context.user_name}_${Date.now()}`;
  
  // Track attempt
  const attempt: NotificationAttempt = {
    id: attemptId,
    activity_type: context.activity_type,
    user_name: context.user_name,
    message: context.message,
    attempt: 0,
    max_attempts: fullConfig.maxAttempts,
    status: 'pending',
    created_at: new Date(),
    updated_at: new Date()
  };
  
  notificationAttempts.set(attemptId, attempt);
  metrics.total_attempts++;
  
  let lastError: Error;
  
  for (let attemptNumber = 1; attemptNumber <= fullConfig.maxAttempts; attemptNumber++) {
    try {
      attempt.attempt = attemptNumber;
      attempt.updated_at = new Date();
      
      console.log(`🔄 Attempt ${attemptNumber}/${fullConfig.maxAttempts} for ${context.activity_type} notification`);
      
      const result = await operation();
      
      // Success!
      attempt.status = 'success';
      attempt.updated_at = new Date();
      metrics.successful_attempts++;
      updateHealthMetrics();
      
      console.log(`✅ Notification attempt succeeded on try ${attemptNumber}`);
      return result;
      
    } catch (error) {
      lastError = error as Error;
      attempt.last_error = lastError.message;
      attempt.updated_at = new Date();
      
      console.warn(`❌ Attempt ${attemptNumber} failed:`, lastError.message);
      
      // If this was the last attempt, mark as failed
      if (attemptNumber === fullConfig.maxAttempts) {
        attempt.status = 'abandoned';
        metrics.abandoned_attempts++;
        updateHealthMetrics();
        break;
      }
      
      // Calculate delay for next attempt
      let delay = fullConfig.baseDelay;
      if (fullConfig.exponentialBackoff) {
        delay = Math.min(
          fullConfig.baseDelay * Math.pow(2, attemptNumber - 1),
          fullConfig.maxDelay
        );
      }
      
      // Add jitter to prevent thundering herd
      const jitter = Math.random() * 0.3 * delay;
      const finalDelay = delay + jitter;
      
      console.log(`⏳ Waiting ${Math.round(finalDelay)}ms before retry...`);
      await new Promise(resolve => setTimeout(resolve, finalDelay));
    }
  }
  
  metrics.failed_attempts++;
  updateHealthMetrics();
  
  // All attempts exhausted
  console.error(`💥 All ${fullConfig.maxAttempts} attempts failed for ${context.activity_type} notification`);
  throw lastError!;
}

/**
 * Update health metrics based on recent performance
 */
function updateHealthMetrics(): void {
  const total = metrics.successful_attempts + metrics.failed_attempts + metrics.abandoned_attempts;
  
  if (total > 0) {
    metrics.success_rate = (metrics.successful_attempts / total) * 100;
    
    // Calculate average retry count
    const attempts = Array.from(notificationAttempts.values());
    const totalRetries = attempts.reduce((sum, attempt) => sum + attempt.attempt, 0);
    metrics.average_retry_count = attempts.length > 0 ? totalRetries / attempts.length : 0;
    
    // Determine health status
    if (metrics.success_rate >= 95) {
      metrics.health_status = 'healthy';
    } else if (metrics.success_rate >= 80) {
      metrics.health_status = 'degraded';
    } else {
      metrics.health_status = 'critical';
    }
  }
  
  metrics.last_updated = new Date();
}

/**
 * Get current monitoring metrics
 */
export async function getNotificationMetrics(): Promise<MonitoringMetrics> {
  // Calculate last 24h volume
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recentAttempts = Array.from(notificationAttempts.values())
    .filter(attempt => attempt.created_at > last24h);
  
  metrics.last_24h_volume = recentAttempts.length;
  
  return { ...metrics };
}

/**
 * Get failed attempts for debugging
 */
export async function getFailedAttempts(): Promise<NotificationAttempt[]> {
  return Array.from(notificationAttempts.values())
    .filter(attempt => attempt.status === 'failed' || attempt.status === 'abandoned')
    .sort((a, b) => b.updated_at.getTime() - a.updated_at.getTime());
}

/**
 * Clear old attempts to prevent memory leaks
 * In production, this would be handled by database TTL or scheduled cleanup
 */
export async function cleanupOldAttempts(olderThanHours: number = 24): Promise<number> {
  const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000);
  let cleaned = 0;
  
  for (const [id, attempt] of notificationAttempts.entries()) {
    if (attempt.updated_at < cutoff) {
      notificationAttempts.delete(id);
      cleaned++;
    }
  }
  
  console.log(`🧹 Cleaned up ${cleaned} old notification attempts`);
  return cleaned;
}

/**
 * Enhanced error categorization for better debugging
 */
export async function categorizeNotificationError(error: any): Promise<{
  category: 'network' | 'auth' | 'config' | 'vapid' | 'subscription' | 'unknown';
  severity: 'low' | 'medium' | 'high' | 'critical';
  retryable: boolean;
  message: string;
}> {
  const errorMessage = error?.message || error?.toString() || 'Unknown error';
  const errorCode = error?.code || error?.statusCode;
  
  // Network-related errors
  if (errorCode === 'ECONNREFUSED' || errorCode === 'ENOTFOUND' || errorMessage.includes('timeout')) {
    return {
      category: 'network',
      severity: 'medium',
      retryable: true,
      message: 'Network connectivity issue'
    };
  }
  
  // Authentication errors
  if (errorCode === 401 || errorMessage.includes('Unauthorized') || errorMessage.includes('auth')) {
    return {
      category: 'auth',
      severity: 'high',
      retryable: false,
      message: 'Authentication failure'
    };
  }
  
  // VAPID configuration errors
  if (errorMessage.includes('VAPID') || errorMessage.includes('vapid')) {
    return {
      category: 'vapid',
      severity: 'critical',
      retryable: false,
      message: 'VAPID key configuration issue'
    };
  }
  
  // Push subscription errors
  if (errorCode === 410 || errorCode === 404 || errorCode === 403) {
    return {
      category: 'subscription',
      severity: 'medium',
      retryable: false,
      message: 'Invalid or expired push subscription'
    };
  }
  
  // Configuration errors
  if (errorCode === 503 || errorMessage.includes('configuration') || errorMessage.includes('config')) {
    return {
      category: 'config',
      severity: 'high',
      retryable: false,
      message: 'Service configuration issue'
    };
  }
  
  // Default to unknown
  return {
    category: 'unknown',
    severity: 'medium',
    retryable: true,
    message: errorMessage
  };
}

/**
 * Get current monitoring metrics
 */
export async function performHealthCheck(): Promise<{
  overall_status: 'healthy' | 'degraded' | 'critical';
  components: {
    api_reachable: boolean;
    vapid_configured: boolean;
    database_connection: boolean;
    recent_success_rate: number;
  };
  metrics: MonitoringMetrics;
  recommendations: string[];
}> {
  const recommendations: string[] = [];
  
  // Check API reachability
  let apiReachable = false;
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/notifications/push`, { method: 'GET' });
    apiReachable = response.ok;
  } catch {
    apiReachable = false;
    recommendations.push('Push notification API is not reachable');
  }
  
  // Check VAPID configuration
  const vapidConfigured = !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
  if (!vapidConfigured) {
    recommendations.push('VAPID keys are not configured');
  }
  
  // Database connection check would go here
  const databaseConnection = true; // Placeholder
  
  // Get current metrics
  const currentMetrics = getNotificationMetrics();
  
  // Calculate recent success rate (last 50 attempts)
  const recentAttempts = Array.from(notificationAttempts.values())
    .sort((a, b) => b.created_at.getTime() - a.created_at.getTime())
    .slice(0, 50);
  
  const recentSuccesses = recentAttempts.filter(a => a.status === 'success').length;
  const recentSuccessRate = recentAttempts.length > 0 ? (recentSuccesses / recentAttempts.length) * 100 : 100;
  
  // Add recommendations based on metrics
  if (currentMetrics.success_rate < 90) {
    recommendations.push(`Success rate is ${currentMetrics.success_rate.toFixed(1)}% - investigate common failure causes`);
  }
  
  if (currentMetrics.average_retry_count > 2) {
    recommendations.push('High retry rate detected - check network stability and API performance');
  }
  
  // Determine overall status
  let overallStatus: 'healthy' | 'degraded' | 'critical' = 'healthy';
  
  if (!apiReachable || !vapidConfigured || recentSuccessRate < 80) {
    overallStatus = 'critical';
  } else if (recentSuccessRate < 95 || currentMetrics.average_retry_count > 1.5) {
    overallStatus = 'degraded';
  }
  
  return {
    overall_status: overallStatus,
    components: {
      api_reachable: apiReachable,
      vapid_configured: vapidConfigured,
      database_connection: databaseConnection,
      recent_success_rate: recentSuccessRate
    },
    metrics: currentMetrics,
    recommendations
  };
}