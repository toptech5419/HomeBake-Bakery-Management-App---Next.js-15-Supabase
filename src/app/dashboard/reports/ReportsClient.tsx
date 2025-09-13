'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BreadType, UserRole } from '@/types';
import { ReportSummary, ReportFilters } from '@/lib/reports/queries';
import { fetchReportData } from '@/lib/reports/actions';
import { useShift } from '@/contexts/ShiftContext';
import { useToast } from '@/components/ui/ToastProvider';
import { exportToCSV, exportToPDF } from '@/lib/reports/export';

import ReportFiltersComponent from '@/components/reports/report-filters';
import SummaryCards from '@/components/reports/summary-cards';
import ExportButtons from '@/components/reports/export-buttons';

import {
  ArrowLeft,
  RefreshCw,
  Calendar,
  Clock,
  BarChart3,
  Eye,
  ExternalLink
} from 'lucide-react';

interface ReportsClientProps {
  initialReportData: ReportSummary;
  breadTypes: BreadType[];
  userRole: UserRole;
  userId: string;
  initialFilters: ReportFilters;
}

export default function ReportsClient({
  initialReportData,
  breadTypes,
  userRole,
  initialFilters
}: ReportsClientProps) {
  const { currentShift } = useShift();
  const [reportData, setReportData] = useState<ReportSummary>(initialReportData);
  const [filters, setFilters] = useState<ReportFilters>({
    ...initialFilters,
    // Use current shift as default if no shift is specified
    shift: initialFilters.shift || currentShift
  });
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();
  const toast = useToast();

  const updateFilters = useCallback(async (newFilters: ReportFilters) => {
    setLoading(true);
    setFilters(newFilters);

    // Update URL with new filters
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(newFilters).forEach(([key, value]) => {
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
    });

    router.replace(`/dashboard/reports?${params.toString()}`);

    try {
      const result = await fetchReportData(newFilters);
      if (result.success && result.data) {
        setReportData(result.data);
      } else {
        toast.error(result.error || 'Failed to fetch report data');
      }
          } catch {
        toast.error('Failed to update filters');
      } finally {
      setLoading(false);
    }
  }, [router, searchParams, toast]);

  const refreshData = async () => {
    setLoading(true);
    try {
      const result = await fetchReportData(filters);
      if (result.success && result.data) {
        setReportData(result.data);
        toast.success('Report data refreshed');
      } else {
        toast.error(result.error || 'Failed to refresh data');
      }
         } catch {
       toast.error('Failed to refresh report data');
     } finally {
      setLoading(false);
    }
  };

  const handleShiftClick = (shiftId: string) => {
    router.push(`/dashboard/reports/${shiftId}`);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };




  return (
    <div className="min-h-screen bg-gray-50" id="reports-dashboard">
      <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Business Reports</h1>
              <p className="text-gray-600 mt-1">
                Comprehensive performance analytics and insights
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Badge className="bg-blue-100 text-blue-800 border border-blue-200">
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)} Access
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={refreshData}
              disabled={loading}
              className="flex items-center gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <ExportButtons
              reportData={reportData}
              elementId="reports-dashboard"
              title="HomeBake Business Report"
              subtitle={`Performance Report • ${new Date().toLocaleDateString()}`}
              disabled={loading}
            />
          </div>
        </div>

        {/* Filters */}
        <ReportFiltersComponent
          breadTypes={breadTypes}
          filters={filters}
          onFiltersChange={updateFilters}
          loading={loading}
        />

        {/* Summary Cards */}
        <SummaryCards reportData={reportData} loading={loading} />

        {/* Shifts Breakdown */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-purple-100">
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Shift Breakdown</h3>
                <p className="text-sm text-gray-600">
                  Detailed performance by individual shifts
                </p>
              </div>
            </div>
            <Badge className="bg-purple-100 text-purple-800 border border-purple-200">
              {reportData.shifts.length} shifts
            </Badge>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">Loading shifts...</span>
            </div>
          )}

          {!loading && reportData.shifts.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Data Found</h3>
              <p className="text-gray-600 mb-4">
                No shifts found for the selected criteria. Try adjusting your filters.
              </p>
              <Button
                variant="outline"
                onClick={() => updateFilters({})}
                className="flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Clear Filters
              </Button>
            </div>
          )}

          {!loading && reportData.shifts.length > 0 && (
            <div className="space-y-4">
              {/* Shifts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {reportData.shifts.map((shift) => (
                  <div
                    key={shift.id}
                    className="border rounded-lg p-4 hover:shadow-lg hover:border-blue-300 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 bg-white cursor-pointer"
                    onClick={() => handleShiftClick(shift.id)}
                    role="button"
                    tabIndex={0}
                    aria-label={`View detailed report for ${new Date(shift.date).toLocaleDateString()} ${shift.shift} shift`}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        handleShiftClick(shift.id);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-full ${
                          shift.shift === 'morning'
                            ? 'bg-orange-100'
                            : 'bg-indigo-100'
                        }`}>
                          <Clock className={`h-4 w-4 ${
                            shift.shift === 'morning'
                              ? 'text-orange-600'
                              : 'text-indigo-600'
                          }`} />
                        </div>
                        <div>
                          <h4 className="font-medium text-gray-900">
                            {new Date(shift.date).toLocaleDateString()} - {shift.shift}
                          </h4>
                          <p className="text-xs text-gray-500">
                            {shift.breadTypeBreakdown.length} bread types
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-medium pointer-events-none">
                        <Eye className="h-4 w-4" />
                        Click card to view
                        <ExternalLink className="h-3 w-3" />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">Produced</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {shift.totalProduced}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-600">Sold</p>
                        <p className="text-lg font-semibold text-gray-900">
                          {shift.totalSold}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600">
                        Revenue: <span className="font-medium text-green-600">
                          {formatCurrency(shift.totalRevenue)}
                        </span>
                      </div>
                      <div className="text-sm text-gray-600">
                        Leftover: <span className={`font-medium ${
                          shift.totalLeftover > 10 ? 'text-red-600' : 'text-gray-900'
                        }`}>
                          {shift.totalLeftover}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More / Pagination placeholder */}
              {reportData.shifts.length >= 20 && (
                <div className="text-center py-4">
                  <p className="text-sm text-gray-600">
                    Showing {reportData.shifts.length} shifts. Adjust filters to view more.
                  </p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}