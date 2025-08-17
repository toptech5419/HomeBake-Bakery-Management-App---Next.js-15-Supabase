/**
 * Production Environment Validation
 * Ensures all required environment variables are present and valid
 */

import { createClient } from '@supabase/supabase-js';

interface EnvironmentConfig {
  NEXT_PUBLIC_SUPABASE_URL: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  NEXT_PUBLIC_APP_URL: string;
  NODE_ENV: 'development' | 'production' | 'test';
  NEXT_PUBLIC_VAPID_KEY?: string;
}

interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  config: Partial<EnvironmentConfig>;
}

/**
 * Required environment variables for production
 */
const REQUIRED_ENV_VARS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL',
] as const;

/**
 * Optional but recommended environment variables
 */
const OPTIONAL_ENV_VARS = [
  'SUPABASE_SERVICE_ROLE_KEY',
  'NEXT_PUBLIC_VAPID_KEY',
] as const;

/**
 * Validate environment configuration
 */
export function validateEnvironment(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const config: Partial<EnvironmentConfig> = {};

  // Check required environment variables
  for (const envVar of REQUIRED_ENV_VARS) {
    const value = process.env[envVar];
    if (!value) {
      errors.push(`Missing required environment variable: ${envVar}`);
    } else {
      config[envVar] = value;
    }
  }

  // Check optional environment variables
  for (const envVar of OPTIONAL_ENV_VARS) {
    const value = process.env[envVar];
    if (!value) {
      warnings.push(`Missing optional environment variable: ${envVar} - some features may not work`);
    } else {
      config[envVar] = value;
    }
  }

  // Validate specific values
  if (config.NEXT_PUBLIC_SUPABASE_URL) {
    if (!isValidUrl(config.NEXT_PUBLIC_SUPABASE_URL)) {
      errors.push('NEXT_PUBLIC_SUPABASE_URL is not a valid URL');
    } else if (!config.NEXT_PUBLIC_SUPABASE_URL.includes('supabase')) {
      warnings.push('NEXT_PUBLIC_SUPABASE_URL does not appear to be a Supabase URL');
    }
  }

  if (config.NEXT_PUBLIC_APP_URL) {
    if (!isValidUrl(config.NEXT_PUBLIC_APP_URL)) {
      errors.push('NEXT_PUBLIC_APP_URL is not a valid URL');
    }
  }

  if (config.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    if (config.NEXT_PUBLIC_SUPABASE_ANON_KEY.length < 100) {
      warnings.push('NEXT_PUBLIC_SUPABASE_ANON_KEY appears to be too short');
    }
  }

  // Validate NODE_ENV
  config.NODE_ENV = process.env.NODE_ENV as any;
  if (!['development', 'production', 'test'].includes(config.NODE_ENV || '')) {
    errors.push('NODE_ENV must be one of: development, production, test');
  }

  // Production-specific validations
  if (config.NODE_ENV === 'production') {
    if (!config.SUPABASE_SERVICE_ROLE_KEY) {
      warnings.push('SUPABASE_SERVICE_ROLE_KEY is recommended for production');
    }

    if (config.NEXT_PUBLIC_APP_URL?.includes('localhost')) {
      errors.push('NEXT_PUBLIC_APP_URL cannot be localhost in production');
    }

    if (!config.NEXT_PUBLIC_VAPID_KEY) {
      warnings.push('NEXT_PUBLIC_VAPID_KEY is required for push notifications in production');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    config,
  };
}

/**
 * Validate URL format
 */
function isValidUrl(url: string): boolean {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Test database connectivity
 */
export async function testDatabaseConnection(): Promise<{
  isConnected: boolean;
  error?: string;
  latency?: number;
}> {
  try {
    const startTime = Date.now();
    
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        isConnected: false,
        error: 'Missing Supabase configuration',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Simple query to test connection
    const { error } = await supabase
      .from('bread_types')
      .select('count', { count: 'exact', head: true });

    const latency = Date.now() - startTime;

    if (error) {
      return {
        isConnected: false,
        error: error.message,
        latency,
      };
    }

    return {
      isConnected: true,
      latency,
    };
  } catch (error) {
    return {
      isConnected: false,
      error: error instanceof Error ? error.message : 'Unknown database error',
    };
  }
}

/**
 * Test authentication configuration
 */
export async function testAuthentication(): Promise<{
  isConfigured: boolean;
  error?: string;
}> {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      return {
        isConfigured: false,
        error: 'Missing Supabase configuration',
      };
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // Test auth configuration by getting current user (should work even if no user)
    const { error } = await supabase.auth.getUser();

    // Auth is configured correctly if we don't get a configuration error
    if (error && error.message.includes('Invalid API key')) {
      return {
        isConfigured: false,
        error: 'Invalid Supabase API key',
      };
    }

    return {
      isConfigured: true,
    };
  } catch (error) {
    return {
      isConfigured: false,
      error: error instanceof Error ? error.message : 'Unknown auth error',
    };
  }
}

/**
 * Run comprehensive health checks
 */
export async function runHealthChecks(): Promise<{
  environment: ValidationResult;
  database: Awaited<ReturnType<typeof testDatabaseConnection>>;
  authentication: Awaited<ReturnType<typeof testAuthentication>>;
  overall: 'healthy' | 'warning' | 'error';
}> {
  const environment = validateEnvironment();
  const database = await testDatabaseConnection();
  const authentication = await testAuthentication();

  let overall: 'healthy' | 'warning' | 'error' = 'healthy';

  // Determine overall health
  if (!environment.isValid || !database.isConnected || !authentication.isConfigured) {
    overall = 'error';
  } else if (environment.warnings.length > 0) {
    overall = 'warning';
  }

  return {
    environment,
    database,
    authentication,
    overall,
  };
}

/**
 * Log health check results
 */
export function logHealthCheck(results: Awaited<ReturnType<typeof runHealthChecks>>): void {
  const { environment, database, authentication, overall } = results;

  console.log(`🏥 Health Check Results - Overall: ${overall.toUpperCase()}`);
  
  // Environment validation
  console.log('📝 Environment Validation:');
  if (environment.isValid) {
    console.log('  ✅ All required environment variables present');
  } else {
    console.log('  ❌ Environment validation failed:');
    environment.errors.forEach(error => console.log(`    - ${error}`));
  }
  
  if (environment.warnings.length > 0) {
    console.log('  ⚠️ Environment warnings:');
    environment.warnings.forEach(warning => console.log(`    - ${warning}`));
  }

  // Database connectivity
  console.log('🗄️ Database Connectivity:');
  if (database.isConnected) {
    console.log(`  ✅ Connected (${database.latency}ms)`);
  } else {
    console.log(`  ❌ Connection failed: ${database.error}`);
  }

  // Authentication
  console.log('🔐 Authentication:');
  if (authentication.isConfigured) {
    console.log('  ✅ Configured correctly');
  } else {
    console.log(`  ❌ Configuration error: ${authentication.error}`);
  }

  // Overall status
  if (overall === 'error') {
    console.log('🚨 Application may not function correctly. Please fix the errors above.');
  } else if (overall === 'warning') {
    console.log('⚠️ Application should work but some features may be limited.');
  } else {
    console.log('✅ Application is ready for production!');
  }
}

/**
 * Initialize environment validation on app startup
 */
export async function initializeEnvironment(): Promise<boolean> {
  console.log('🚀 Initializing HomeBake environment...');
  
  const results = await runHealthChecks();
  logHealthCheck(results);

  // In production, fail fast if critical errors exist
  if (process.env.NODE_ENV === 'production' && results.overall === 'error') {
    throw new Error('Application cannot start due to environment configuration errors');
  }

  return results.overall !== 'error';
}

/**
 * Get safe environment config for client-side use
 */
export function getClientConfig(): {
  appUrl: string;
  supabaseUrl: string;
  environment: string;
  vapidKey?: string;
} {
  return {
    appUrl: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    environment: process.env.NODE_ENV || 'development',
    vapidKey: process.env.NEXT_PUBLIC_VAPID_KEY,
  };
}