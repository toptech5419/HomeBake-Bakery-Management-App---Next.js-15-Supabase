"use client";
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import LoadingSpinner from '@/components/ui/loading';
import { Package, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import React from 'react';

const ProfessionalHistoryFilters = dynamic(() => import('@/components/production/professional-history-filters'), {
  loading: () => <div className="w-full h-32 bg-gray-100 animate-pulse rounded-lg" />
});
const ProductionTable = dynamic(() => import('@/components/production/production-table'), {
  loading: () => <div className="w-full h-64 bg-gray-100 animate-pulse rounded-lg" />
});
const CSVExport = dynamic(() => import('@/components/production/csv-export'), {
  loading: () => <div className="w-8 h-8 bg-gray-200 animate-pulse rounded" />
});

interface BreadType {
  id: string;
  name: string;
}

interface ProductionLog {
  id: string;
  bread_type_id: string;
  bread_type_name: string;
  quantity: number;
  shift: 'morning' | 'night';
  created_at: string;
  notes?: string;
}

interface ProductionHistoryClientProps {
  user: {
    id: string;
    email: string;
    role: string;
  } | null;
  logs: ProductionLog[];
  breadTypes: BreadType[];
  isLoading: boolean;
}

export default function ProductionHistoryClient({ user, logs, breadTypes, isLoading }: ProductionHistoryClientProps) {
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/production">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Production</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Production History</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">View and filter past bread production logs</p>
            </div>
          </div>
          <Card className="w-full">
            <div className="p-4 sm:p-6">
              <div className="text-center py-8">
                <LoadingSpinner message="Loading production history..." />
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md flex flex-col items-center py-12">
          <Package className="h-12 w-12 mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
          <p className="text-muted-foreground">Please log in to access production history.</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header with Back Button */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Link href="/dashboard/production">
              <Button variant="outline" size="sm" className="flex items-center gap-2">
                <ArrowLeft className="h-4 w-4" />
                <span className="hidden sm:inline">Back to Production</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Production History</h1>
              <p className="text-gray-600 mt-1 text-sm sm:text-base">View and filter past bread production logs</p>
            </div>
          </div>
        </div>

        {/* Responsive Filters */}
        <div className="w-full">
          <ProfessionalHistoryFilters breadTypes={breadTypes} />
        </div>

        {/* Responsive Results Card */}
        <Card className="w-full">
          <div className="p-4 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
              <div className="text-lg font-semibold">
                <span className="block sm:inline">Production Entries: </span>
                <span className="text-orange-600 font-bold">{logs.length}</span>
              </div>
              <div className="w-full sm:w-auto">
                <CSVExport logs={logs} filename="production-history" />
              </div>
            </div>
            {/* Responsive Table Container */}
            <div className="w-full overflow-hidden">
              <div className="overflow-x-auto">
                <ProductionTable logs={logs} />
              </div>
            </div>
          </div>
        </Card>
        {/* Mobile Bottom Padding */}
        <div className="h-4 sm:h-8" />
      </div>
    </div>
  );
} 