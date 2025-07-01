"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { AlertTriangle, RefreshCw, Home, Bug } from "lucide-react";
import Link from "next/link";
import { getFriendlyErrorMessage, logError } from "@/lib/errors/handlers";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    // Log the error with context
    logError(error, {
      component: 'GlobalErrorBoundary',
      action: 'page-error',
      metadata: {
        digest: error.digest,
        url: window.location.href,
        userAgent: navigator.userAgent
      }
    });
  }, [error]);

  const friendlyMessage = getFriendlyErrorMessage(error);
  const errorId = error.digest || Math.random().toString(36).substring(7);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="max-w-lg w-full p-8 text-center border-red-200 bg-red-50">
        {/* Error Icon */}
        <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
          <AlertTriangle className="h-10 w-10 text-red-600" />
        </div>

        {/* Error Message */}
        <h1 className="text-2xl font-bold text-red-800 mb-2">Something went wrong</h1>
        <p className="text-red-700 mb-6 max-w-md mx-auto">
          {friendlyMessage}
        </p>

        {/* Error Details (Development only) */}
        {process.env.NODE_ENV === 'development' && (
          <details className="mb-6 text-left">
            <summary className="cursor-pointer text-sm text-red-600 hover:text-red-800 flex items-center justify-center gap-2 mb-2">
              <Bug className="h-4 w-4" />
              View Technical Details
            </summary>
            <div className="mt-3 p-4 bg-red-100 rounded-md text-xs">
              <div className="space-y-2">
                <div>
                  <strong>Error:</strong> {error.message}
                </div>
                {error.stack && (
                  <div>
                    <strong>Stack:</strong>
                    <pre className="mt-1 whitespace-pre-wrap text-xs overflow-x-auto">
                      {error.stack}
                    </pre>
                  </div>
                )}
                {error.digest && (
                  <div>
                    <strong>Digest:</strong> {error.digest}
                  </div>
                )}
              </div>
            </div>
          </details>
        )}

        {/* Error ID */}
        <div className="text-xs text-red-600 bg-red-100 px-3 py-1 rounded-full mb-6 inline-block">
          Error ID: {errorId}
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={reset}
              variant="outline"
              className="flex-1 border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
            
            <Button 
              onClick={() => window.location.reload()}
              variant="outline"
              className="flex-1 border-red-300 text-red-700 hover:bg-red-100"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Reload Page
            </Button>
          </div>
          
          <Button asChild className="w-full bg-red-600 hover:bg-red-700">
            <Link href="/dashboard" className="flex items-center justify-center">
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
        </div>

        {/* Help Text */}
        <div className="mt-8 pt-6 border-t border-red-200">
          <p className="text-xs text-red-600 mb-3">
            If this error persists, please contact support and provide the Error ID above.
          </p>
          
          {/* Quick Links */}
          <div className="flex flex-col sm:flex-row gap-2 text-xs">
            <Link href="/dashboard/production" className="text-red-600 hover:text-red-700">
              Production
            </Link>
            <span className="hidden sm:inline text-red-300">•</span>
            <Link href="/dashboard/sales" className="text-red-600 hover:text-red-700">
              Sales
            </Link>
            <span className="hidden sm:inline text-red-300">•</span>
            <Link href="/dashboard/inventory" className="text-red-600 hover:text-red-700">
              Inventory
            </Link>
            <span className="hidden sm:inline text-red-300">•</span>
            <Link href="/dashboard/reports" className="text-red-600 hover:text-red-700">
              Reports
            </Link>
          </div>
        </div>

        {/* HomeBake Branding */}
        <div className="mt-6 pt-4 border-t border-red-200">
          <p className="text-xs text-red-400">HomeBake v1.0</p>
        </div>
      </Card>
    </div>
  );
} 