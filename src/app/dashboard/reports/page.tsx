"use client";

import React, { useEffect, useState } from "react";
import { BarChart3, FileText, TrendingUp, Package, Search, Filter, Download, ChevronDown, Plus, Clock, User, Eye, Share2, ArrowUpRight, ArrowDownRight, Calendar, X } from "lucide-react";
import { cn } from '@/lib/utils';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Select, SelectTrigger, SelectContent, SelectItem, SelectValue } from '@/components/ui/select';
import ReportFiltersComponent from '@/components/reports/report-filters';
import { getBreadTypesClient } from '@/lib/bread-types/client-actions';
import type { BreadType } from '@/types';
import type { ReportFilters } from '@/lib/reports/queries';

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
  <div className="animate-pulse space-y-4">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 flex flex-col gap-4">
        <div className="h-4 w-1/3 bg-gray-200 rounded" />
        <div className="h-3 w-1/2 bg-gray-100 rounded" />
        <div className="h-8 w-full bg-gray-100 rounded" />
      </div>
    ))}
  </div>
);

// Helper to safely extract name from possible array/object/null
function getName(val: any): string {
  if (!val) return 'Unknown';
  if (Array.isArray(val)) {
    if (val.length && typeof val[0]?.name === 'string') return val[0].name;
    return 'Unknown';
  }
  if (typeof val === 'object' && typeof val.name === 'string') return val.name;
  return 'Unknown';
}

export default function ReportsPage() {
  const [loading, setLoading] = useState(true);
  const [groupedReports, setGroupedReports] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [filterShift, setFilterShift] = useState("All");
  const [modalOpen, setModalOpen] = useState(false);
  const [modalBatches, setModalBatches] = useState<any[]>([]);
  const [modalTitle, setModalTitle] = useState("");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [breadTypes, setBreadTypes] = useState<BreadType[]>([]);
  const [reportFilters, setReportFilters] = useState<ReportFilters & { search?: string }>({});
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareReport, setShareReport] = useState<any | null>(null);

  useEffect(() => {
    const fetchReports = async () => {
      setLoading(true);
      const supabase = createClientComponentClient();
      // Fetch all_batches with bread_types and users
      const { data: batches, error } = await supabase
        .from('all_batches')
        .select(`id, bread_type_id, batch_number, start_time, end_time, actual_quantity, status, shift, created_by, notes, bread_types (name), users:created_by (name)`)
        .order('start_time', { ascending: false });
      console.log('Fetched batches:', batches); // DEBUG LOG
      if (error) {
        setGroupedReports([]);
        setLoading(false);
        return;
      }
      // Group by date+shift
      const groups: Record<string, any> = {};
      for (const batch of batches) {
        const date = batch.start_time ? batch.start_time.split('T')[0] : 'unknown';
        const shift = batch.shift;
        const key = `${date}-${shift}`;
        // Determine manager name or fallback to user id
        let managerName = 'Unknown';
        const userName = getName(batch.users);
        if (userName !== 'Unknown') {
          managerName = userName;
        } else if (batch.created_by) {
          managerName = `User ID: ${batch.created_by}`;
        }
        if (!groups[key]) {
          groups[key] = {
            id: key,
            date,
            shift,
            batches: [],
            manager: managerName,
            breadTypes: new Set(),
            endTimes: [],
            statuses: [],
            totalUnits: 0,
            missingManager: managerName.startsWith('User ID'),
          };
        }
        groups[key].batches.push(batch);
        let breadTypeName = getName(batch.bread_types);
        if (breadTypeName && breadTypeName !== 'Unknown') groups[key].breadTypes.add(breadTypeName);
        if (batch.end_time) groups[key].endTimes.push(batch.end_time);
        groups[key].statuses.push(batch.status);
        groups[key].totalUnits += batch.actual_quantity || 0;
      }
      // Build array
      const arr = Object.values(groups).map((g: any) => {
        const allCompleted = g.statuses.every((s: string) => s === 'completed');
        return {
          ...g,
          totalBatches: g.batches.length,
          totalUnits: g.totalUnits,
          status: allCompleted ? 'Completed' : 'In Progress',
          latestEndTime: g.endTimes.length > 0 ? g.endTimes.sort().slice(-1)[0] : '',
          breadTypes: Array.from(g.breadTypes),
        };
      });
      setGroupedReports(arr);
      setLoading(false);
    };
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
    const matchesBreadType = !reportFilters.breadTypeId || r.breadTypes.includes(breadTypes.find(bt => bt.id === reportFilters.breadTypeId)?.name);
    return matchesShift && matchesSearch && matchesStartDate && matchesEndDate && matchesBreadType;
  });

  // Summary
  const totalReports = filtered.length;
  const totalProduction = filtered.reduce((sum, r) => sum + r.totalUnits, 0);

  // Modal open handler
  const handleOpenModal = (report: any) => {
    setModalBatches(report.batches);
    setModalTitle(`${formatDate(report.date)} - ${report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} Shift`);
    setModalOpen(true);
  };

  // Export to CSV for a single report
  function handleExportReportCSV(report: any) {
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
  const getShareText = (report: any) =>
    `🍞 Production Report - ${report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} (${formatDate(report.date)})\n👤 Manager: ${report.manager}\n📦 Batches: ${report.totalBatches}\n🔢 Units: ${report.totalUnits}\n🍞 Bread Types: ${(report.breadTypes || []).join(", ")}\nStatus: ${report.status}`;

  // Share handler
  const handleShare = async (report: any) => {
    setShareReport(report);
    setShareModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Back Button */}
      <div className="p-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => window.location.href = '/'}
          className="flex items-center gap-2"
        >
          <ChevronDown style={{ transform: 'rotate(90deg)' }} className="w-4 h-4" />
          Back to Home
        </Button>
      </div>
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white p-4 sm:p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-2xl font-bold">Reports</h1>
              <p className="text-xs sm:text-sm opacity-90">Production reports and analytics</p>
            </div>
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
      <Modal isOpen={moreFiltersOpen} onClose={() => setMoreFiltersOpen(false)} title="More Filters">
        <ReportFiltersComponent
          breadTypes={breadTypes}
          filters={reportFilters}
          onFiltersChange={setReportFilters}
          loading={loading}
        />
        <div className="flex justify-end gap-2 mt-4">
          <Button variant="outline" onClick={() => setMoreFiltersOpen(false)}>Close</Button>
          <Button variant="primary" onClick={() => setMoreFiltersOpen(false)}>Apply Filters</Button>
        </div>
      </Modal>
      {/* Reports List */}
      <main className="flex-1 p-2 sm:p-4">
        {loading ? (
          <LoadingSkeleton />
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
              {modalBatches.map((batch, i) => (
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

function ShareModal({ report, onClose, getShareText }: { report: any; onClose: () => void; getShareText: (r: any) => string }) {
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
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined' && window.navigator.share) {
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
    if (typeof window !== 'undefined' && typeof window.navigator !== 'undefined' && window.navigator.share) {
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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white w-full sm:max-w-xs rounded-t-2xl sm:rounded-2xl shadow-lg p-4 sm:p-6 animate-fade-in flex flex-col gap-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-base font-bold">Share Report</h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100"><X className="w-5 h-5" /></button>
        </div>
        <div className="mb-2 text-xs text-gray-500">{report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} Shift • {formatDate(report.date)}</div>
        <div className="mb-2 p-2 bg-gray-50 rounded text-xs text-gray-700 whitespace-pre-line">{shareText}</div>
        <div className="grid grid-cols-3 gap-2">
          {shareOptions.map(opt => (
            <button key={opt.platform} onClick={() => handleShare(opt.platform)} className={`flex flex-col items-center gap-1 rounded-lg p-2 text-xs font-medium ${opt.color}`}>
              <span className="text-lg">{opt.icon}</span>
              {opt.label}
            </button>
          ))}
          {hasWebShare && (
            <button onClick={handleWebShare} className="flex flex-col items-center gap-1 rounded-lg p-2 text-xs font-medium bg-orange-50 hover:bg-orange-100 text-orange-600 col-span-3 sm:col-span-1 mt-2 sm:mt-0">
              <span className="text-lg">📲</span>
              Share...</button>
          )}
        </div>
      </div>
    </div>
  );
}