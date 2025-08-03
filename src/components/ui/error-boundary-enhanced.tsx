'use client';

import { Component, ReactNode, ErrorInfo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AlertTriangle, RefreshCw, Bug, Home, Wifi, WifiOff } from 'lucide-react';
import { handleErrorBoundary } from '@/lib/errors/global-error-handler';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  showDetails?: boolean;
  componentName?: string;
  retryCount?: number;
  maxRetries?: number;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string;
  retryCount: number;
  isOnline: boolean;
}

export class EnhancedErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: Math.random().toString(36).substring(7),
      retryCount: 0,
      isOnline: navigator.onLine
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: Math.random().toString(36).substring(7)
    };
  }

  componentDidMount() {
    // Listen for online/offline events
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  componentWillUnmount() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
      errorId: Math.random().toString(36).substring(7)
    });

    // Log error with enhanced context
    handleErrorBoundary(error, errorInfo);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  handleOnline = () => {
    this.setState({ isOnline: true });
  };

  handleOffline = () => {
    this.setState({ isOnline: false });
  };

  handleReset = () => {
    const { maxRetries = 3 } = this.props;
    
    if (this.state.retryCount < maxRetries) {
      this.setState(prevState => ({
        hasError: false,
        error: null,
        errorInfo: null,
        errorId: Math.random().toString(36).substring(7),
        retryCount: prevState.retryCount + 1
      }));
    } else {
      // After max retries, reload the page
      window.location.reload();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  isNetworkError = (error: Error): boolean => {
    return error.message.includes('fetch') || 
           error.message.includes('network') || 
           error.message.includes('connection') ||
           error.name === 'TypeError' && error.message.includes('fetch');
  };

  isAuthError = (error: Error): boolean => {
    return error.message.includes('auth') || 
           error.message.includes('unauthorized') || 
           error.message.includes('permission');
  };

  getErrorType = (error: Error): 'network' | 'auth' | 'data' | 'general' => {
    if (this.isNetworkError(error)) return 'network';
    if (this.isAuthError(error)) return 'auth';
    if (error.message.includes('data') || error.message.includes('parse')) return 'data';
    return 'general';
  };

  getErrorMessage = (error: Error): string => {
    const errorType = this.getErrorType(error);
    
    switch (errorType) {
      case 'network':
        return this.state.isOnline 
          ? 'Connection error. Please check your internet and try again.'
          : 'You are offline. Please check your connection.';
      case 'auth':
        return 'Authentication error. Please log in again.';
      case 'data':
        return 'Data loading error. Please refresh the page.';
      default:
        return error.message || 'An unexpected error occurred.';
    }
  };

  getErrorIcon = (error: Error) => {
    const errorType = this.getErrorType(error);
    
    switch (errorType) {
      case 'network':
        return this.state.isOnline ? <Wifi className="h-8 w-8 text-orange-600" /> : <WifiOff className="h-8 w-8 text-red-600" />;
      case 'auth':
        return <AlertTriangle className="h-8 w-8 text-yellow-600" />;
      default:
        return <AlertTriangle className="h-8 w-8 text-red-600" />;
    }
  };

  render() {
    if (this.state.hasError) {
      // Return custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const { error, errorInfo, errorId, retryCount, isOnline } = this.state;
      const { showDetails = false, componentName, maxRetries = 3 } = this.props;

      if (!error) return null;

      const errorType = this.getErrorType(error);
      const errorMessage = this.getErrorMessage(error);
      const errorIcon = this.getErrorIcon(error);

      return (
        <Card className="p-6 m-4 border-red-200 bg-red-50">
          <div className="flex flex-col items-center text-center space-y-4">
            {/* Error Icon */}
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
              {errorIcon}
            </div>

            {/* Error Message */}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold text-red-800">
                {componentName ? `${componentName} Error` : 'Something went wrong'}
              </h3>
              <p className="text-red-700 text-sm max-w-md">
                {errorMessage}
              </p>
              
              {/* Retry Count */}
              {retryCount > 0 && (
                <p className="text-xs text-red-600">
                  Retry attempt {retryCount} of {maxRetries}
                </p>
              )}
            </div>

            {/* Network Status */}
            {errorType === 'network' && (
              <div className="flex items-center gap-2 text-sm">
                {isOnline ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-600" />
                    <span className="text-green-700">Online</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-red-600" />
                    <span className="text-red-700">Offline</span>
                  </>
                )}
              </div>
            )}

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
                      <h4 className="font-medium text-red-800 text-sm">Error Type:</h4>
                      <code className="text-xs text-red-700 bg-red-200 px-2 py-1 rounded">
                        {errorType}
                      </code>
                    </div>
                    
                    <div>
                      <h4 className="font-medium text-red-800 text-sm">Error:</h4>
                      <pre className="text-xs text-red-700 mt-1 whitespace-pre-wrap">
                        {error.toString()}
                      </pre>
                    </div>
                    
                    {error.stack && (
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
                disabled={retryCount >= maxRetries}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                {retryCount >= maxRetries ? 'Max Retries' : 'Try Again'}
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

// Convenience wrapper for functional components
export function ErrorBoundaryWrapper({ 
  children, 
  fallback, 
  componentName,
  showDetails = false,
  retryCount = 0,
  maxRetries = 3
}: {
  children: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
  showDetails?: boolean;
  retryCount?: number;
  maxRetries?: number;
}) {
  return (
    <EnhancedErrorBoundary
      fallback={fallback}
      componentName={componentName}
      showDetails={showDetails}
      retryCount={retryCount}
      maxRetries={maxRetries}
    >
      {children}
    </EnhancedErrorBoundary>
  );
}

// Quick error boundary for simple use cases
export function QuickErrorBoundary({ 
  children, 
  name 
}: { 
  children: ReactNode; 
  name?: string; 
}) {
  return (
    <EnhancedErrorBoundary componentName={name}>
      {children}
    </EnhancedErrorBoundary>
  );
}

// Inline error boundary for small components
export function InlineErrorBoundary({ children }: { children: ReactNode }) {
  return (
    <EnhancedErrorBoundary
      fallback={
        <div className="p-4 text-center text-sm text-red-600 bg-red-50 rounded-md">
          Component error. Please refresh the page.
        </div>
      }
    >
      {children}
    </EnhancedErrorBoundary>
  );
} 