'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw, Home } from 'lucide-react';

interface ClientErrorFallbackProps {
  title?: string;
  message?: string;
  showHomeButton?: boolean;
}

export function ClientErrorFallback({ 
  title = "Something went wrong",
  message = "There was an issue loading this page. Please try again.",
  showHomeButton = true
}: ClientErrorFallbackProps) {
  const handleRefresh = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <Card className="p-6 text-center border-red-200 bg-red-50 max-w-md w-full">
        <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-600" />
        <h3 className="text-lg font-semibold mb-2 text-red-800">{title}</h3>
        <p className="text-red-700 mb-6">{message}</p>
        
        <div className="space-y-3">
          <Button 
            onClick={handleRefresh}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Page
          </Button>
          
          {showHomeButton && (
            <Button 
              onClick={handleGoHome}
              variant="outline"
              className="w-full border-red-300 text-red-700 hover:bg-red-100"
            >
              <Home className="h-4 w-4 mr-2" />
              Go to Dashboard
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}

export function InventoryErrorFallback() {
  return (
    <ClientErrorFallback 
      title="Inventory Page Error"
      message="There was an issue loading the inventory dashboard. Please refresh the page."
    />
  );
}

export function ReportsErrorFallback() {
  return (
    <ClientErrorFallback 
      title="Reports Page Error"
      message="There was an issue loading the reports dashboard. Please refresh the page."
    />
  );
}

export function ProductionErrorFallback() {
  return (
    <ClientErrorFallback 
      title="Production Page Error"
      message="There was an issue loading the production page. Please refresh the page."
    />
  );
}