"use client";

import React, { useEffect, useState } from "react";
import { BarChart3, Package, Search, Filter, Download, ChevronDown, Clock, User, Eye, Share2, Calendar, X, ArrowLeft } from "lucide-react";
import { ProductionLoading, ProductionError, ReportSkeleton } from '@/components/ui/production-loading';
import ErrorBoundary from '@/components/error/ErrorBoundary';
import { cn } from '@/lib/utils';
import { getManagerReports } from '@/lib/reports/manager-reports-server-actions';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import ReportFiltersComponent from '@/components/reports/report-filters';
import { getBreadTypesClient } from '@/lib/bread-types/client-actions';
import type { BreadType } from '@/types';
import type { ReportFilters } from '@/lib/reports/queries';

// Type definitions for the reports page
interface BatchData {
  id: string;
  bread_type_id: string;
  batch_number: string;
  start_time: string;
  end_time?: string;
  actual_quantity: number;
  status: string;
  shift: string;
  created_by: string;
  notes?: string;
  bread_types: { name: string } | { name: string }[] | null;
  users: { name: string } | { name: string }[] | null;
}

interface GroupedReportBuilder {
  id: string;
  date: string;
  shift: string;
  batches: BatchData[];
  manager: string;
  breadTypes: Set<string>;
  endTimes: string[];
  statuses: string[];
  totalUnits: number;
  missingManager: boolean;
}

interface GroupedReport {
  id: string;
  date: string;
  shift: string;
  batches: BatchData[];
  manager: string;
  breadTypes: string[];
  endTimes: string[];
  statuses: string[];
  totalUnits: number;
  missingManager: boolean;
  totalBatches: number;
  status: string;
  latestEndTime: string;
}

// Utility: Format date
function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return d.toLocaleDateString();
}
function formatTime(dateStr: string) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Completed': return 'bg-green-100 text-green-700';
    case 'In Progress': return 'bg-blue-100 text-blue-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

const LoadingSkeleton = () => (
  <div className="space-y-4">
    {[...Array(3)].map((_, i) => (
      <ReportSkeleton key={i} />
    ))}
  </div>
);

// Helper to safely extract name from possible array/object/null
function getName(val: unknown): string {
  if (!val) return 'Unknown';
  if (Array.isArray(val)) {
    if (val.length && typeof val[0]?.name === 'string') return val[0].name;
    return 'Unknown';
  }
  if (typeof val === 'object' && val && 'name' in val && typeof val.name === 'string') return val.name;
  return 'Unknown';
}

function ReportsPageInner() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groupedReports, setGroupedReports] = useState<GroupedReport[]>([]);
  const [search, setSearch] = useState("");
  const [filterShift, setFilterShift] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBatches, setModalBatches] = useState<BatchData[]>([]);
  const [modalTitle, setModalTitle] = useState("");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [breadTypes, setBreadTypes] = useState<BreadType[]>([]);
  const [reportFilters, setReportFilters] = useState<ReportFilters & { search?: string }>({});
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareReport, setShareReport] = useState<GroupedReport | null>(null);

  // Handle back navigation with cookies
  const handleBackNavigation = () => {
    // Get the last visited page from cookies
    const getFromCookies = (name: string) => {
      if (typeof document !== 'undefined') {
        const value = `; ${document.cookie}`;
        const parts = value.split(`; ${name}=`);
        if (parts.length === 2) return parts.pop()?.split(';').shift();
      }
      return null;
    };

    const lastPage = getFromCookies('lastDashboardPage');
    
    // If we have a last page in cookies, navigate there, otherwise default to manager dashboard
    if (lastPage && lastPage !== '/dashboard/reports') {
      router.push(lastPage);
    } else {
      router.push('/dashboard/manager');
    }
  };

  // Set current page in cookies for navigation tracking  
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.cookie = `lastDashboardPage=/dashboard/reports; path=/; max-age=86400`; // 24 hours
    }
  }, []);

  // Refetch function for error retry
  const fetchReports = async () => {
    setLoading(true);
    setError(null);
    try {
      // Use server action to fetch reports data (already grouped)
      const groupedReports = await getManagerReports();
      console.log('✅ Fetched grouped reports:', groupedReports.length, 'reports');
      
      // Convert from server action GroupedReport to page GroupedReport format
      const pageReports = groupedReports.map(report => ({
        ...report,
        missingManager: report.manager.startsWith('User ID'),
        endTimes: report.batches
          .filter(batch => batch.end_time)
          .map(batch => batch.end_time!),
        statuses: report.batches.map(batch => batch.status),
        latestEndTime: report.batches
          .filter(batch => batch.end_time)
          .map(batch => batch.end_time!)
          .sort()
          .slice(-1)[0] || ''
      }));
      
      setGroupedReports(pageReports);
    } catch (error) {
      console.error('🚨 Error fetching reports:', error);
      setError(error instanceof Error ? error.message : 'Failed to load reports');
      setGroupedReports([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  useEffect(() => {
    async function fetchBreadTypes() {
      const types = await getBreadTypesClient();
      setBreadTypes(types);
    }
    fetchBreadTypes();
  }, []);

  // Filtering
  const filtered = groupedReports.filter((r) => {
    // Use reportFilters if set, otherwise fallback to search/filterShift
    const matchesShift = reportFilters.shift ? r.shift === reportFilters.shift : (filterShift === 'All' || r.shift === filterShift);
    const matchesSearch =
      (reportFilters.search || search) === '' ||
      r.date.includes(reportFilters.search || search) ||
      r.manager.toLowerCase().includes((reportFilters.search || search).toLowerCase()) ||
      r.breadTypes.some((b: string) => b.toLowerCase().includes((reportFilters.search || search).toLowerCase()));
    // Date range filter
    const matchesStartDate = !reportFilters.startDate || r.date >= reportFilters.startDate;
    const matchesEndDate = !reportFilters.endDate || r.date <= reportFilters.endDate;
    // Bread type filter
    const matchesBreadType = !reportFilters.breadTypeId || r.breadTypes.includes(breadTypes.find(bt => bt.id === reportFilters.breadTypeId)?.name || '');
    return matchesShift && matchesSearch && matchesStartDate && matchesEndDate && matchesBreadType;
  });

  // Summary
  const totalReports = filtered.length;
  const totalProduction = filtered.reduce((sum, r) => sum + r.totalUnits, 0);

  // Modal open handler
  const handleOpenModal = (report: GroupedReport) => {
    setModalBatches(report.batches);
    setModalTitle(`${formatDate(report.date)} - ${report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} Shift`);
    setModalOpen(true);
  };

  // Export to CSV for a single report
  function handleExportReportCSV(report: GroupedReport) {
    const csvRows = [
      [
        'Date',
        'Shift',
        'Manager',
        'Total Batches',
        'Total Units',
        'Status',
        'Bread Types'
      ],
      [
        report.date,
        report.shift,
        report.manager,
        report.totalBatches,
        report.totalUnits,
        report.status,
        (report.breadTypes || []).join('; ')
      ]
    ];
    const csvContent = csvRows.map(row => row.map(String).map(v => '"' + v.replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report_${report.date}_${report.shift}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    alert('CSV exported!');
  }

  // Restore Export All CSV logic for the Export All button
  const handleExportAllCSV = () => {
    if (filtered.length === 0) return;
    const csvRows = [
      [
        'Date',
        'Shift',
        'Manager',
        'Total Batches',
        'Total Units',
        'Status',
        'Bread Types'
      ],
      ...filtered.map(r => [
        r.date,
        r.shift,
        r.manager,
        r.totalBatches,
        r.totalUnits,
        r.status,
        (r.breadTypes || []).join('; ')
      ])
    ];
    const csvContent = csvRows.map(row => row.map(String).map(v => '"' + v.replace(/"/g, '""') + '"').join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reports_export_${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Share summary text builder
  const getShareText = (report: GroupedReport) =>
    `🍞 Production Report - ${report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} (${formatDate(report.date)})\n👤 Manager: ${report.manager}\n📦 Batches: ${report.totalBatches}\n🔢 Units: ${report.totalUnits}\n🍞 Bread Types: ${(report.breadTypes || []).join(", ")}\nStatus: ${report.status}`;

  // Share handler
  const handleShare = async (report: GroupedReport) => {
    setShareReport(report);
    setShareModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white p-4 sm:p-6">
        <div className="flex items-center gap-2 sm:gap-4 mb-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackNavigation}
            className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl touch-manipulation flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg sm:text-2xl font-bold truncate">Reports</h1>
            <p className="text-xs sm:text-sm opacity-90 truncate">Production reports and analytics</p>
          </div>
        </div>
        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white bg-opacity-10 rounded-lg p-3 flex flex-col">
            <span className="text-xs opacity-80">Total Reports</span>
            <span className="text-xl font-bold">{totalReports}</span>
          </div>
          <div className="bg-white bg-opacity-10 rounded-lg p-3 flex flex-col">
            <span className="text-xs opacity-80">Total Production</span>
            <span className="text-xl font-bold">{totalProduction.toLocaleString()}</span>
          </div>
        </div>
      </div>
      {/* Filters */}
      <div className="p-4 bg-white border-b flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="flex flex-col sm:flex-row flex-1 gap-2 w-full">
          {/* Custom mobile-first dropdown for shift filter */}
          <div className="w-full sm:w-auto">
            <Select value={filterShift} onValueChange={setFilterShift}>
              <SelectTrigger className="bg-white border-2 border-blue-500 rounded-lg px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 min-w-[120px] max-w-xs w-full sm:w-auto">
                <SelectValue placeholder="All Shifts" />
              </SelectTrigger>
              <SelectContent className="max-h-[40vh] min-w-[120px] max-w-xs overflow-y-auto rounded-lg shadow-lg border bg-white z-50">
                <SelectItem value="All" className="px-4 py-2 focus:bg-blue-100 focus:text-blue-700 hover:bg-blue-50 rounded-md cursor-pointer">All Shifts</SelectItem>
                <SelectItem value="morning" className="px-4 py-2 focus:bg-blue-100 focus:text-blue-700 hover:bg-blue-50 rounded-md cursor-pointer">Morning</SelectItem>
                <SelectItem value="night" className="px-4 py-2 focus:bg-blue-100 focus:text-blue-700 hover:bg-blue-50 rounded-md cursor-pointer">Night</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="relative flex-1 mt-2 sm:mt-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search reports..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full"
            />
          </div>
        </div>
        <div className="flex flex-row gap-2 justify-end items-center w-full sm:w-auto mt-2 sm:mt-0">
          <Button variant="outline" size="sm" leftIcon={<Filter className="w-4 h-4" />} onClick={() => setMoreFiltersOpen(true)}>
            <span className="text-xs sm:text-sm">More Filters</span>
          </Button>
          <Button variant="primary" size="sm" leftIcon={<Download className="w-4 h-4" />} onClick={handleExportAllCSV}>
            <span className="text-xs sm:text-sm">Export All</span>
          </Button>
        </div>
      </div>
      {/* More Filters Modal */}
      <Modal 
        isOpen={moreFiltersOpen} 
        onClose={() => setMoreFiltersOpen(false)} 
        title="More Filters"
        footer={
          <div className="flex flex-col sm:flex-row justify-end gap-3 w-full">
            <Button 
              variant="outline" 
              onClick={() => setMoreFiltersOpen(false)}
              className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] touch-manipulation"
            >
              Cancel
            </Button>
            <Button 
              variant="primary" 
              onClick={() => setMoreFiltersOpen(false)}
              className="w-full sm:w-auto px-6 py-2.5 min-h-[44px] touch-manipulation"
            >
              Apply Filters
            </Button>
          </div>
        }
      >
        <ReportFiltersComponent
          breadTypes={breadTypes}
          filters={reportFilters}
          onFiltersChange={setReportFilters}
          loading={loading}
        />
      </Modal>
      {/* Reports List */}
      <main className="flex-1 p-2 sm:p-4">
        {loading ? (
          <LoadingSkeleton />
        ) : error ? (
          <ProductionError 
            type="card"
            message={error}
            onRetry={fetchReports}
            showRetry={true}
          />
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4 animate-pulse" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">No reports found</h3>
            <p className="text-gray-500">Try adjusting your filters or search terms</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((report) => (
              <Card key={report.id} variant="elevated" hover="lift" className={cn("flex flex-col gap-2 p-4 animate-fade-in")}> 
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-600">{report.id}</span>
                  {report.status === 'Completed' && (
                    <span className={cn("text-xs px-2 py-1 rounded-full", getStatusColor(report.status))}>{report.status}</span>
                  )}
                  <span className="ml-auto text-xs text-gray-400">{report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} Shift</span>
                </div>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Calendar className="w-4 h-4" />
                      {formatDate(report.date)}
                      <Clock className="w-4 h-4 ml-4" />
                      {formatTime(report.latestEndTime)}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <User className="w-4 h-4" />
                      {report.manager}
                      {report.missingManager && (
                        <span className="ml-2 text-xs text-red-500">(Manager name missing!)</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-sm text-gray-500 flex-wrap">
                      <Package className="w-4 h-4" />
                      <span className="font-medium">{report.totalBatches}</span> batches
                      <BarChart3 className="w-4 h-4 ml-4" />
                      <span className="font-medium">{report.totalUnits}</span> units
                    </div>
                    <div className="flex items-center gap-2 text-xs text-blue-600 flex-wrap mt-1">
                      {report.breadTypes.map((b: string, i: number) => (
                        <span key={i} className="bg-blue-50 px-2 py-1 rounded-full">{b}</span>
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-2 sm:mt-0">
                    <Button variant="ghost" size="icon" onClick={() => handleOpenModal(report)} leftIcon={<Eye className="w-4 h-4" />} />
                    <Button variant="ghost" size="icon" leftIcon={<Download className="w-4 h-4" />} onClick={() => handleExportReportCSV(report)} />
                    <Button variant="ghost" size="icon" leftIcon={<Share2 className="w-4 h-4" />} onClick={() => handleShare(report)} />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </main>
      {/* Batch Details Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={modalTitle}>
        <div className="space-y-4">
          {modalBatches.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No batches in this group.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {modalBatches.map((batch) => (
                <Card key={batch.id} variant="filled" className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-none border-0">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">#{batch.batch_number}</span>
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">{getName(batch.bread_types) || 'Unknown Bread'}</span>
                      <span className={cn("text-xs px-2 py-1 rounded-full", getStatusColor(batch.status))}>{batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}</span>
                    </div>
                    <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-1">
                      <span><Clock className="inline w-3 h-3 mr-1" />{formatTime(batch.start_time)}</span>
                      {batch.end_time && <span><Clock className="inline w-3 h-3 mr-1" />End: {formatTime(batch.end_time)}</span>}
                      <span><User className="inline w-3 h-3 mr-1" />{getName(batch.users)}</span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Package className="w-3 h-3" />
                      <span>Quantity: {batch.actual_quantity}</span>
                    </div>
                    {batch.notes && <div className="mt-2 text-xs text-gray-600">📝 {batch.notes}</div>}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Modal>
      {shareModalOpen && shareReport && (
        <ShareModal
          report={shareReport}
          onClose={() => setShareModalOpen(false)}
          getShareText={getShareText}
        />
      )}
      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.6s cubic-bezier(0.4,0,0.2,1);
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: none; }
        }
      `}</style>
    </div>
  );
}

// Export the component wrapped in an error boundary
export default function ReportsPage() {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('🚨 ReportsPage Error:', error, errorInfo);
      }}
    >
      <ReportsPageInner />
    </ErrorBoundary>
  );
}

interface ShareModalProps {
  report: GroupedReport;
  onClose: () => void;
  getShareText: (r: GroupedReport) => string;
}

function ShareModal({ report, onClose, getShareText }: ShareModalProps) {
  const shareOptions = [
    { platform: 'whatsapp', label: 'WhatsApp', icon: '💬', color: 'bg-green-50 hover:bg-green-100 text-green-600' },
    { platform: 'email', label: 'Email', icon: '📧', color: 'bg-blue-50 hover:bg-blue-100 text-blue-600' },
    { platform: 'twitter', label: 'Twitter', icon: '🐦', color: 'bg-sky-50 hover:bg-sky-100 text-sky-600' },
    { platform: 'facebook', label: 'Facebook', icon: '📘', color: 'bg-blue-50 hover:bg-blue-100 text-blue-600' },
    { platform: 'copy', label: 'Copy', icon: '📋', color: 'bg-gray-50 hover:bg-gray-100 text-gray-600' },
  ];
  const shareText = getShareText(report);

  const [hasWebShare, setHasWebShare] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined' && typeof window.navigator.share === 'function') {
      setHasWebShare(true);
    }
  }, []);

  const handleShare = async (platform: string) => {
    if (platform === 'copy') {
      try {
        await window.navigator.clipboard.writeText(shareText);
        alert('Report summary copied!');
      } catch {
        alert('Failed to copy');
      }
      onClose();
      return;
    }
    if (platform === 'whatsapp') {
      window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'email') {
      window.location.href = `mailto:?subject=Production Report&body=${encodeURIComponent(shareText)}`;
    } else if (platform === 'twitter') {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`, '_blank');
    } else if (platform === 'facebook') {
      window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(shareText)}`, '_blank');
    }
    onClose();
  };

  const handleWebShare = async () => {
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined' && typeof window.navigator.share === 'function') {
      try {
        await window.navigator.share({
          title: 'Production Report',
          text: shareText,
          url: window.location.href,
        });
        alert('Shared!');
      } catch {}
    } else {
      alert('Web Share not supported');
    }
    onClose();
  };

  return (
    <Modal 
      isOpen={true} 
      onClose={onClose} 
      title="Share Report"
      className="w-full sm:max-w-xs"
    >
      <div className="flex flex-col gap-4">
        <div className="text-xs text-gray-500">{report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} Shift • {formatDate(report.date)}</div>
        <div className="p-2 bg-gray-50 rounded text-xs text-gray-700 whitespace-pre-line">{shareText}</div>
        <div className="grid grid-cols-3 gap-2">
          {shareOptions.map(opt => (
            <button key={opt.platform} onClick={() => handleShare(opt.platform)} className={`flex flex-col items-center gap-1 rounded-lg p-2 text-xs font-medium transition-colors touch-manipulation ${opt.color}`}>
              <span className="text-lg">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
          {hasWebShare && (
            <button onClick={handleWebShare} className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs font-medium bg-orange-50 hover:bg-orange-100 text-orange-600 col-span-3 sm:col-span-1 mt-2 sm:mt-0 transition-colors touch-manipulation">
              <span className="text-lg">📲</span>
              Share...</button>
          )}
        </div>
      </div>
    </Modal>
  );
}