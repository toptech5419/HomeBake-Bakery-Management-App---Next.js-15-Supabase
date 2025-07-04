'use client';

import { Suspense } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { ErrorBoundaryWrapper } from '@/components/error-boundary';
import LoadingSpinner from '@/components/ui/loading';
import ProductionForm from './production-form';
import { BreadType } from '@/types';

interface ProductionFormWrapperProps {
  breadTypes: BreadType[];
  managerId: string;
}

function ProductionFormErrorFallback() {
  const handleRefresh = () => {
    window.location.reload();
  };

  return (
    <Card className="p-6 text-center border-red-200 bg-red-50">
      <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-red-600" />
      <h3 className="text-lg font-semibold mb-2 text-red-800">Production Form Error</h3>
      <p className="text-red-700 mb-4">
        There was an issue loading the production form. Please refresh the page.
      </p>
      <Button onClick={handleRefresh} className="flex items-center gap-2">
        <RefreshCw className="h-4 w-4" />
        Refresh Page
      </Button>
    </Card>
  );
}

export default function ProductionFormWrapper({ breadTypes, managerId }: ProductionFormWrapperProps) {
  return (
    <ErrorBoundaryWrapper 
      fallback={<ProductionFormErrorFallback />}
      componentName="Production Form"
    >
      <Suspense fallback={<LoadingSpinner message="Loading production form..." />}>
        <ProductionForm 
          breadTypes={breadTypes} 
          managerId={managerId}
        />
      </Suspense>
    </ErrorBoundaryWrapper>
  );
}