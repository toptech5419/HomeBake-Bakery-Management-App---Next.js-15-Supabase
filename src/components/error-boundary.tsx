'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Bug, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  componentName?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: Math.random().toString(36).substring(7)
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      errorId: Math.random().toString(36).substring(7)
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
      errorId: Math.random().toString(36).substring(7)
    });

    // Log error to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // In production, you might want to send this to an error reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: Math.random().toString(36).substring(7)
    });
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  render() {
    if (this.state.hasError) {
      // Return custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, errorId } = this.state;
      const { showDetails = false, componentName } = this.props;

      return (
        <Card className="p-6 m-4 border-red-200 bg-red-50">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Error Icon */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-red-800">
                {componentName ? `${componentName} Error` : 'Something went wrong'}
              </h3>
              <p className="text-red-700 text-sm max-w-md">
                {error?.message || 'An unexpected error occurred in this component.'}
              </p>
            </div>

            {/* Error Details (Development/Debug Mode) */}
            {showDetails && process.env.NODE_ENV === 'development' && (
              <details className="w-full max-w-2xl">
                <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800 flex items-center gap-2">
                  <Bug className="h-4 w-4" />
                  View Technical Details
                </summary>
                <div className="mt-3 p-4 bg-red-100 rounded-md text-left">
                  <div className="space-y-3">
                    <div>
                      <h4 className="font-medium text-red-800 text-sm">Error:</h4>
                      <pre className="text-xs text-red-700 mt-1 whitespace-pre-wrap">
                        {error?.toString()}
                      </pre>
                    </div>
                    
                    {error?.stack && (
                      <div>
                        <h4 className="font-medium text-red-800 text-sm">Stack Trace:</h4>
                        <pre className="text-xs text-red-700 mt-1 whitespace-pre-wrap overflow-x-auto">
                          {error.stack}
                        </pre>
                      </div>
                    )}
                    
                    {errorInfo?.componentStack && (
                      <div>
                        <h4 className="font-medium text-red-800 text-sm">Component Stack:</h4>
                        <pre className="text-xs text-red-700 mt-1 whitespace-pre-wrap">
                          {errorInfo.componentStack}
                        </pre>
                      </div>
                    )}
                    
                    <div>
                      <h4 className="font-medium text-red-800 text-sm">Error ID:</h4>
                      <code className="text-xs text-red-700 bg-red-200 px-2 py-1 rounded">
                        {errorId}
                      </code>
                    </div>
                  </div>
                </div>
              </details>
            )}

            {/* Error ID for Support */}
            <div className="text-xs text-red-600 bg-red-100 px-3 py-1 rounded-full">
              Error ID: {errorId}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
              <Button 
                onClick={this.handleReset}
                variant="outline"
                size="sm"
                className="flex-1 border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Try Again
              </Button>
              
              <Button 
                onClick={this.handleReload}
                variant="outline"
                size="sm"
                className="flex-1 border-red-300 text-red-700 hover:bg-red-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reload Page
              </Button>
              
              <Button 
                onClick={this.handleGoHome}
                size="sm"
                className="flex-1 bg-red-600 hover:bg-red-700 text-white"
              >
                <Home className="h-4 w-4 mr-2" />
                Go Home
              </Button>
            </div>

            {/* Help Text */}
            <p className="text-xs text-red-600 max-w-md">
              If this error persists, please contact support and provide the Error ID above.
            </p>
          </div>
        </Card>
      );
    }

    return this.props.children;
  }
}

// Functional wrapper for easier use
interface ErrorBoundaryWrapperProps {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  showDetails?: boolean;
}

export function ErrorBoundaryWrapper({ 
  children, 
  fallback, 
  componentName,
  showDetails = false 
}: ErrorBoundaryWrapperProps) {
  return (
    <ErrorBoundary 
      fallback={fallback}
      componentName={componentName}
      showDetails={showDetails}
      onError={(error, errorInfo) => {
        // Log to console in development
        if (process.env.NODE_ENV === 'development') {
          console.error(`ErrorBoundary (${componentName}):`, error, errorInfo);
        }
        
        // In production, send to error tracking service
        // Example: errorTracker.captureException(error, { extra: errorInfo });
      }}
    >
      {children}
    </ErrorBoundary>
  );
}

// Quick error boundary for specific sections
export function QuickErrorBoundary({ children, name }: { children: ReactNode; name?: string }) {
  return (
    <ErrorBoundaryWrapper componentName={name}>
      {children}
    </ErrorBoundaryWrapper>
  );
}

// Inline error boundary with minimal UI
export function InlineErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <ErrorBoundary
      fallback={
        <div className="p-4 border border-red-200 bg-red-50 rounded-md">
          <div className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-4 w-4" />
            <span className="text-sm">Failed to load this section</span>
          </div>
        </div>
      }
    >
      {children}
    </ErrorBoundary>
  );
}