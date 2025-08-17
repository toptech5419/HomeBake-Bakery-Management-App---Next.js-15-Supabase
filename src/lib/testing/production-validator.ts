/**
 * Production Readiness Validator
 * Comprehensive testing and validation for production deployment
 */

import { initializeEnvironment, runHealthChecks } from '@/lib/config/environment-validation';
import { queryClient } from '@/lib/react-query/query-client';

interface ValidationResult {
  category: string;
  name: string;
  status: 'pass' | 'fail' | 'warning';
  message: string;
  details?: any;
}

interface ProductionValidationReport {
  overall: 'ready' | 'warning' | 'not-ready';
  score: number;
  results: ValidationResult[];
  summary: {
    passed: number;
    warnings: number;
    failed: number;
    total: number;
  };
}

/**
 * Run comprehensive production readiness validation
 */
export async function validateProductionReadiness(): Promise<ProductionValidationReport> {
  console.log('🔍 Starting production readiness validation...');
  
  const results: ValidationResult[] = [];

  // 1. Environment Configuration
  console.log('📝 Validating environment configuration...');
  try {
    const healthChecks = await runHealthChecks();
    
    results.push({
      category: 'Environment',
      name: 'Environment Variables',
      status: healthChecks.environment.isValid ? 'pass' : 'fail',
      message: healthChecks.environment.isValid 
        ? 'All required environment variables are present'
        : `Missing variables: ${healthChecks.environment.errors.join(', ')}`,
      details: healthChecks.environment
    });

    results.push({
      category: 'Environment',
      name: 'Database Connection',
      status: healthChecks.database.isConnected ? 'pass' : 'fail',
      message: healthChecks.database.isConnected 
        ? `Connected successfully (${healthChecks.database.latency}ms)`
        : `Connection failed: ${healthChecks.database.error}`,
      details: healthChecks.database
    });

    results.push({
      category: 'Environment',
      name: 'Authentication',
      status: healthChecks.authentication.isConfigured ? 'pass' : 'fail',
      message: healthChecks.authentication.isConfigured 
        ? 'Authentication configured correctly'
        : `Auth error: ${healthChecks.authentication.error}`,
      details: healthChecks.authentication
    });
  } catch (error) {
    results.push({
      category: 'Environment',
      name: 'Health Check',
      status: 'fail',
      message: `Health check failed: ${error.message}`,
      details: error
    });
  }

  // 2. PWA Configuration
  console.log('📱 Validating PWA configuration...');
  await validatePWAConfiguration(results);

  // 3. Service Worker
  console.log('⚙️ Validating service worker...');
  await validateServiceWorker(results);

  // 4. Performance & Optimization
  console.log('⚡ Validating performance optimizations...');
  await validatePerformance(results);

  // 5. Security
  console.log('🔒 Validating security configurations...');
  await validateSecurity(results);

  // 6. Mobile Optimization
  console.log('📱 Validating mobile optimization...');
  await validateMobileOptimization(results);

  // 7. Error Handling
  console.log('🚨 Validating error handling...');
  await validateErrorHandling(results);

  // 8. Data Management
  console.log('💾 Validating data management...');
  await validateDataManagement(results);

  // Calculate overall score and status
  const summary = {
    passed: results.filter(r => r.status === 'pass').length,
    warnings: results.filter(r => r.status === 'warning').length,
    failed: results.filter(r => r.status === 'fail').length,
    total: results.length
  };

  const score = Math.round((summary.passed / summary.total) * 100);
  
  let overall: 'ready' | 'warning' | 'not-ready';
  if (summary.failed > 0) {
    overall = 'not-ready';
  } else if (summary.warnings > 0) {
    overall = 'warning';
  } else {
    overall = 'ready';
  }

  console.log(`✅ Production validation complete - Score: ${score}% (${overall.toUpperCase()})`);

  return {
    overall,
    score,
    results,
    summary
  };
}

async function validatePWAConfiguration(results: ValidationResult[]) {
  try {
    // Check manifest.json
    const manifestResponse = await fetch('/manifest.json');
    if (!manifestResponse.ok) {
      results.push({
        category: 'PWA',
        name: 'Manifest File',
        status: 'fail',
        message: 'manifest.json not accessible'
      });
      return;
    }

    const manifest = await manifestResponse.json();
    
    // Validate required manifest fields
    const requiredFields = ['name', 'short_name', 'start_url', 'display', 'theme_color', 'icons'];
    const missingFields = requiredFields.filter(field => !manifest[field]);
    
    if (missingFields.length > 0) {
      results.push({
        category: 'PWA',
        name: 'Manifest Fields',
        status: 'fail',
        message: `Missing required fields: ${missingFields.join(', ')}`,
        details: manifest
      });
    } else {
      results.push({
        category: 'PWA',
        name: 'Manifest Configuration',
        status: 'pass',
        message: 'Manifest properly configured'
      });
    }

    // Validate icons
    if (manifest.icons && manifest.icons.length > 0) {
      const hasLargeIcon = manifest.icons.some((icon: any) => 
        parseInt(icon.sizes.split('x')[0]) >= 192
      );
      
      results.push({
        category: 'PWA',
        name: 'PWA Icons',
        status: hasLargeIcon ? 'pass' : 'warning',
        message: hasLargeIcon 
          ? 'PWA icons properly configured'
          : 'No large icons (192x192+) found'
      });
    }

  } catch (error) {
    results.push({
      category: 'PWA',
      name: 'PWA Configuration',
      status: 'fail',
      message: `PWA validation failed: ${error.message}`
    });
  }
}

async function validateServiceWorker(results: ValidationResult[]) {
  if (typeof window === 'undefined') {
    results.push({
      category: 'Service Worker',
      name: 'Service Worker Support',
      status: 'warning',
      message: 'Running in server environment, cannot test service worker'
    });
    return;
  }

  try {
    if (!('serviceWorker' in navigator)) {
      results.push({
        category: 'Service Worker',
        name: 'Browser Support',
        status: 'warning',
        message: 'Service Worker not supported in this browser'
      });
      return;
    }

    // Check if service worker is registered
    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      results.push({
        category: 'Service Worker',
        name: 'Service Worker Registration',
        status: 'fail',
        message: 'Service Worker not registered'
      });
      return;
    }

    results.push({
      category: 'Service Worker',
      name: 'Service Worker Registration',
      status: 'pass',
      message: 'Service Worker registered successfully'
    });

    // Check if service worker is active
    if (registration.active) {
      results.push({
        category: 'Service Worker',
        name: 'Service Worker Status',
        status: 'pass',
        message: 'Service Worker is active'
      });
    } else {
      results.push({
        category: 'Service Worker',
        name: 'Service Worker Status',
        status: 'warning',
        message: 'Service Worker is not active'
      });
    }

  } catch (error) {
    results.push({
      category: 'Service Worker',
      name: 'Service Worker Validation',
      status: 'fail',
      message: `Service Worker validation failed: ${error.message}`
    });
  }
}

async function validatePerformance(results: ValidationResult[]) {
  try {
    // Check if React Query is properly configured
    if (queryClient) {
      results.push({
        category: 'Performance',
        name: 'React Query Configuration',
        status: 'pass',
        message: 'React Query properly configured'
      });
    } else {
      results.push({
        category: 'Performance',
        name: 'React Query Configuration',
        status: 'fail',
        message: 'React Query not properly configured'
      });
    }

    // Check for console warnings/errors
    const originalConsole = {
      warn: console.warn,
      error: console.error
    };
    
    let warningCount = 0;
    let errorCount = 0;
    
    console.warn = (...args) => {
      warningCount++;
      originalConsole.warn(...args);
    };
    
    console.error = (...args) => {
      errorCount++;
      originalConsole.error(...args);
    };

    // Wait a bit to capture any immediate console messages
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Restore console
    console.warn = originalConsole.warn;
    console.error = originalConsole.error;

    if (errorCount > 0) {
      results.push({
        category: 'Performance',
        name: 'Console Errors',
        status: 'fail',
        message: `Found ${errorCount} console errors`
      });
    } else if (warningCount > 0) {
      results.push({
        category: 'Performance',
        name: 'Console Warnings',
        status: 'warning',
        message: `Found ${warningCount} console warnings`
      });
    } else {
      results.push({
        category: 'Performance',
        name: 'Console Clean',
        status: 'pass',
        message: 'No console errors or warnings detected'
      });
    }

  } catch (error) {
    results.push({
      category: 'Performance',
      name: 'Performance Validation',
      status: 'fail',
      message: `Performance validation failed: ${error.message}`
    });
  }
}

async function validateSecurity(results: ValidationResult[]) {
  // Check HTTPS in production
  if (typeof window !== 'undefined') {
    const isHTTPS = window.location.protocol === 'https:';
    const isLocalhost = window.location.hostname === 'localhost';
    
    if (!isHTTPS && !isLocalhost) {
      results.push({
        category: 'Security',
        name: 'HTTPS',
        status: 'fail',
        message: 'Application should use HTTPS in production'
      });
    } else {
      results.push({
        category: 'Security',
        name: 'HTTPS',
        status: 'pass',
        message: 'Secure connection established'
      });
    }
  }

  // Check for exposed secrets (basic check)
  const exposedSecrets = [];
  
  if (typeof window !== 'undefined') {
    const scripts = Array.from(document.scripts);
    for (const script of scripts) {
      if (script.innerHTML.includes('sk_') || script.innerHTML.includes('secret_key')) {
        exposedSecrets.push('Potential secret key in script');
      }
    }
  }

  if (exposedSecrets.length > 0) {
    results.push({
      category: 'Security',
      name: 'Secret Exposure',
      status: 'fail',
      message: `Potential secrets exposed: ${exposedSecrets.join(', ')}`
    });
  } else {
    results.push({
      category: 'Security',
      name: 'Secret Exposure',
      status: 'pass',
      message: 'No obvious secret exposure detected'
    });
  }
}

async function validateMobileOptimization(results: ValidationResult[]) {
  if (typeof window === 'undefined') {
    results.push({
      category: 'Mobile',
      name: 'Mobile Optimization',
      status: 'warning',
      message: 'Cannot test mobile optimization in server environment'
    });
    return;
  }

  // Check viewport meta tag
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (!viewportMeta) {
    results.push({
      category: 'Mobile',
      name: 'Viewport Meta Tag',
      status: 'fail',
      message: 'Viewport meta tag missing'
    });
  } else {
    const content = viewportMeta.getAttribute('content') || '';
    if (content.includes('width=device-width')) {
      results.push({
        category: 'Mobile',
        name: 'Viewport Configuration',
        status: 'pass',
        message: 'Viewport properly configured for mobile'
      });
    } else {
      results.push({
        category: 'Mobile',
        name: 'Viewport Configuration',
        status: 'warning',
        message: 'Viewport may not be optimized for mobile'
      });
    }
  }

  // Check for touch-action CSS
  const hasTouch = 'ontouchstart' in window;
  results.push({
    category: 'Mobile',
    name: 'Touch Support',
    status: hasTouch ? 'pass' : 'warning',
    message: hasTouch ? 'Touch events supported' : 'Touch events not detected'
  });
}

async function validateErrorHandling(results: ValidationResult[]) {
  try {
    // Check if error boundaries are in place
    const hasErrorBoundary = document.querySelector('[data-error-boundary]') !== null;
    
    results.push({
      category: 'Error Handling',
      name: 'Error Boundaries',
      status: hasErrorBoundary ? 'pass' : 'warning',
      message: hasErrorBoundary 
        ? 'Error boundaries detected'
        : 'No error boundaries detected in DOM'
    });

    // Check if global error handler is available
    if (typeof window !== 'undefined') {
      const hasGlobalErrorHandler = 'onerror' in window;
      results.push({
        category: 'Error Handling',
        name: 'Global Error Handler',
        status: hasGlobalErrorHandler ? 'pass' : 'warning',
        message: hasGlobalErrorHandler 
          ? 'Global error handler available'
          : 'No global error handler detected'
      });
    }

  } catch (error) {
    results.push({
      category: 'Error Handling',
      name: 'Error Handling Validation',
      status: 'fail',
      message: `Error handling validation failed: ${error.message}`
    });
  }
}

async function validateDataManagement(results: ValidationResult[]) {
  try {
    // Check React Query cache
    if (queryClient) {
      const cache = queryClient.getQueryCache();
      results.push({
        category: 'Data Management',
        name: 'Query Cache',
        status: 'pass',
        message: `Query cache initialized with ${cache.getAll().length} queries`
      });
    }

    // Check local storage availability
    if (typeof window !== 'undefined') {
      try {
        const testKey = '__storage_test__';
        localStorage.setItem(testKey, 'test');
        localStorage.removeItem(testKey);
        
        results.push({
          category: 'Data Management',
          name: 'Local Storage',
          status: 'pass',
          message: 'Local storage available'
        });
      } catch {
        results.push({
          category: 'Data Management',
          name: 'Local Storage',
          status: 'warning',
          message: 'Local storage not available'
        });
      }
    }

  } catch (error) {
    results.push({
      category: 'Data Management',
      name: 'Data Management Validation',
      status: 'fail',
      message: `Data management validation failed: ${error.message}`
    });
  }
}

/**
 * Generate a production readiness report
 */
export function generateProductionReport(validation: ProductionValidationReport): string {
  const { overall, score, results, summary } = validation;
  
  let report = `
# HomeBake Production Readiness Report

## Overall Status: ${overall.toUpperCase()}
## Score: ${score}/100

## Summary
- ✅ Passed: ${summary.passed}
- ⚠️ Warnings: ${summary.warnings}
- ❌ Failed: ${summary.failed}
- 📊 Total: ${summary.total}

## Detailed Results

`;

  // Group results by category
  const categories = [...new Set(results.map(r => r.category))];
  
  categories.forEach(category => {
    report += `### ${category}\n\n`;
    
    const categoryResults = results.filter(r => r.category === category);
    categoryResults.forEach(result => {
      const icon = result.status === 'pass' ? '✅' : result.status === 'warning' ? '⚠️' : '❌';
      report += `${icon} **${result.name}**: ${result.message}\n\n`;
    });
  });

  if (overall === 'not-ready') {
    report += `
## ⚠️ CRITICAL ISSUES

The application has critical issues that must be resolved before production deployment:

`;
    results.filter(r => r.status === 'fail').forEach(result => {
      report += `- **${result.category} - ${result.name}**: ${result.message}\n`;
    });
  }

  if (summary.warnings > 0) {
    report += `
## ⚠️ WARNINGS

These issues should be addressed for optimal production performance:

`;
    results.filter(r => r.status === 'warning').forEach(result => {
      report += `- **${result.category} - ${result.name}**: ${result.message}\n`;
    });
  }

  report += `
## 🚀 Next Steps

`;

  if (overall === 'ready') {
    report += `✅ **Your application is ready for production deployment!**

All critical checks have passed. You can proceed with confidence.`;
  } else if (overall === 'warning') {
    report += `⚠️ **Your application is mostly ready, but has some warnings.**

Address the warnings above to improve production performance and reliability.`;
  } else {
    report += `❌ **Your application is not ready for production.**

Please resolve all critical issues listed above before deploying.`;
  }

  return report;
}

/**
 * Run production validation and log results
 */
export async function runProductionValidation(): Promise<void> {
  const validation = await validateProductionReadiness();
  const report = generateProductionReport(validation);
  
  console.log(report);
  
  if (validation.overall === 'not-ready') {
    console.error('🚨 Application is not ready for production!');
  } else if (validation.overall === 'warning') {
    console.warn('⚠️ Application has warnings that should be addressed');
  } else {
    console.log('🚀 Application is ready for production!');
  }
}