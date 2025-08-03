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
  ExternalLink,
  Search,
  Filter,
  Download,
  Package,
  ChevronDown,
  Plus,
  FileText,
  ArrowUpRight,
  ArrowDownRight,
  Share2,
  User
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
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [exportingId, setExportingId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  // Click-away handler for dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuOpenId && menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null);
      }
    }
    if (menuOpenId) {
      document.addEventListener('mousedown', handleClick);
    } else {
      document.removeEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [menuOpenId]);

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

  // --- NEW: Card UI for grouped batch reports ---
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-700';
      case 'Pending': return 'bg-yellow-100 text-yellow-700';
      case 'In Progress': return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  // For now, trend and change are placeholders
  const getTrendIcon = (trend: string) => {
    return trend === 'up' ?
      <ArrowUpRight className="w-4 h-4 text-green-500" /> :
      <ArrowDownRight className="w-4 h-4 text-red-500" />;
  };

  // Filtering logic (can be expanded)
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [dateRange, setDateRange] = useState('Today');
  const [searchTerm, setSearchTerm] = useState('');

  const filterOptions = ['All', 'Daily', 'Weekly', 'Monthly', 'morning', 'night'];
  const dateOptions = ['Today', 'Yesterday', 'This Week', 'This Month', 'Custom Range'];

  // Adapted grouped data to report card structure
  const reports = (reportData.shifts || []).map((shift) => {
    const s = shift as typeof shift & { latestEndTime?: string; status?: string; totalBatches?: number };
    return {
      id: s.id,
      title: 'Daily Production Report',
      date: s.date,
      time: s.latestEndTime ? new Date(s.latestEndTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
      manager: s.recordedBy,
      totalBatches: s.totalBatches || 0,
      totalUnits: s.totalProduced,
      status: s.status || 'In Progress',
      type: 'Daily',
      shift: s.shift,
      categories: s.breadTypeBreakdown?.map(b => b.breadTypeName) || [],
      trend: 'up',
      change: '+0',
    };
  });

  const filteredReports = reports.filter(report => {
    const matchesFilter = selectedFilter === 'All' || report.type === selectedFilter || report.shift === selectedFilter;
    const matchesSearch = report.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.manager.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  // Summary statistics
  const totalReports = filteredReports.length;
  const totalProduction = filteredReports.reduce((sum, report) => sum + report.totalUnits, 0);

  // Helper to get ShiftSummary by id
  const getShiftSummaryById = (id: string) => reportData.shifts.find(s => s.id === id);

  // Per-report export handler
  const handleExport = async (reportId: string, type: 'csv' | 'pdf') => {
    const shift = getShiftSummaryById(reportId);
    if (!shift) {
      toast.error('Report data not found');
      return;
    }
    setExportingId(reportId);
    setMenuOpenId(null);
    try {
      if (type === 'csv') {
        exportToCSV(shift, { filename: `homebake-report-${shift.date}-${shift.shift}.csv` });
        toast.success('CSV exported!');
      } else {
        await exportToPDF('', shift, { title: 'HomeBake Report', subtitle: `${shift.date} - ${shift.shift} shift`, filename: `homebake-report-${shift.date}-${shift.shift}.pdf` });
        toast.success('PDF exported!');
      }
    } catch {
      toast.error('Export failed');
    } finally {
      setExportingId(null);
    }
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
                    className="border rounded-lg p-4 hover:shadow-md transition-shadow duration-200 bg-white"
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
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleShiftClick(shift.id)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                        <ExternalLink className="h-3 w-3" />
                      </Button>
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

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Reports</h1>
              <p className="text-sm opacity-90">Production reports and analytics</p>
            </div>
          </div>
          <button className="bg-white bg-opacity-20 hover:bg-opacity-30 px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <Plus className="w-4 h-4" />
            <span className="text-sm font-medium">New Report</span>
          </button>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Total Reports</p>
                <p className="text-2xl font-bold">{totalReports}</p>
              </div>
              <FileText className="w-8 h-8 opacity-60" />
            </div>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm opacity-80">Total Production</p>
                <p className="text-2xl font-bold">{totalProduction.toLocaleString()}</p>
              </div>
              <Package className="w-8 h-8 opacity-60" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="p-6 bg-white border-b">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Search reports..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full md:w-64"
              />
            </div>

            {/* Filter Dropdown */}
            <div className="relative">
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {filterOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>

            {/* Date Range */}
            <div className="relative">
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {dateOptions.map(option => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
            </div>
          </div>

          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Filter className="w-4 h-4" />
              <span className="text-sm">More Filters</span>
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-500 to-cyan-400 text-white rounded-lg hover:shadow-lg">
              <Download className="w-4 h-4" />
              <span className="text-sm">Export All</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reports List */}
      <div className="p-6">
        <div className="space-y-4">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg border border-gray-200 hover:shadow-md transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-800">{report.title}</h3>
                      <span className="text-xs px-2 py-1 bg-gray-100 text-gray-600 rounded-full">
                        {report.id}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(report.status)}`}>
                        {report.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-6 text-sm text-gray-500 mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        {new Date(report.date).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {report.time}
                      </span>
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {report.manager}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-sm">
                      <span className="text-gray-600">Categories:</span>
                      {report.categories.map((category, index) => (
                        <span key={index} className="text-blue-600 font-medium">
                          {category}{index < report.categories.length - 1 ? ', ' : ''}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="flex items-center gap-1 text-sm text-gray-500 mb-1">
                        {getTrendIcon(report.trend)}
                        <span className={report.trend === 'up' ? 'text-green-600' : 'text-red-600'}>
                          {report.change}
                        </span>
                      </div>
                      <div className="text-xs text-gray-400">vs last period</div>
                    </div>
                  </div>
                </div>

                {/* Stats Row */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        <span className="font-medium">{report.totalBatches}</span> batches
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <BarChart3 className="w-4 h-4 text-gray-400" />
                      <span className="text-sm text-gray-600">
                        <span className="font-medium">{report.totalUnits.toLocaleString()}</span> units
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon">
                      <Eye className="w-4 h-4" />
                    </Button>
                    <div className="relative">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setMenuOpenId(report.id)}
                        aria-label="Download report"
                      >
                        {exportingId === report.id ? (
                          <span className="animate-spin"><Download className="w-4 h-4 text-green-500" /></span>
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </Button>
                      {menuOpenId === report.id && (
                        <div ref={menuRef} className="absolute right-0 mt-2 w-32 bg-white border rounded shadow z-10">
                          <button
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                            onClick={() => handleExport(report.id, 'csv')}
                            disabled={exportingId === report.id}
                          >
                            Export CSV
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left text-sm hover:bg-gray-100"
                            onClick={() => handleExport(report.id, 'pdf')}
                            disabled={exportingId === report.id}
                          >
                            Export PDF
                          </button>
                          <button
                            className="w-full px-4 py-2 text-left text-xs text-gray-500 hover:bg-gray-50"
                            onClick={() => setMenuOpenId(null)}
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>
                    <Button variant="ghost" size="icon">
                      <Share2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Empty State */}
        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No reports found</h3>
            <p className="text-gray-500">Try adjusting your filters or search terms</p>
          </div>
        )}
      </div>
    </div>
  );
}