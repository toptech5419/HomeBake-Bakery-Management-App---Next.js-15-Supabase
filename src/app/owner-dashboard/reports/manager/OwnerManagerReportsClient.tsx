'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, 
  BarChart3, 
  Package, 
  Search, 
  Download, 
  Clock, 
  User, 
  Eye, 
  Share2, 
  Calendar,
  ChevronDown,
  FileText,
  Mail,
  MessageCircle,
  Copy,
  RefreshCw
} from 'lucide-react';
import { getManagerReports, type BatchData, type GroupedReport } from '@/lib/reports/manager-reports-server-actions';
import { cn } from '@/lib/utils';
import { Logger } from '@/lib/utils/logger';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface OwnerManagerReportsClientProps {
  user: { id: string; email?: string };
  displayName: string;
}

// Utility functions
const formatDate = (dateStr: string) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString();
};

const formatTime = (dateStr: string) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
};

const getStatusColor = (status: string) => {
  switch (status) {
    case 'Completed': return 'bg-green-100 text-green-700';
    case 'In Progress': return 'bg-blue-100 text-blue-700';
    default: return 'bg-gray-100 text-gray-700';
  }
};

// Helper to safely extract name from possible array/object/null
const getName = (val: unknown): string => {
  if (!val) return 'Unknown';
  if (Array.isArray(val)) {
    if (val.length && typeof val[0]?.name === 'string') return val[0].name;
    return 'Unknown';
  }
  if (typeof val === 'object' && typeof val.name === 'string') return val.name;
  return 'Unknown';
};

const LoadingSkeleton = () => (
  <div className="animate-pulse space-y-3">
    {[...Array(3)].map((_, i) => (
      <div key={i} className="bg-gray-100 rounded-lg p-4 space-y-3">
        <div className="h-3 w-1/3 bg-gray-200 rounded" />
        <div className="h-2 w-1/2 bg-gray-200 rounded" />
        <div className="h-6 w-full bg-gray-200 rounded" />
      </div>
    ))}
  </div>
);

export default function OwnerManagerReportsClient({ user, displayName }: OwnerManagerReportsClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [groupedReports, setGroupedReports] = useState<GroupedReport[]>([]);
  const [search, setSearch] = useState('');
  const [filterShift, setFilterShift] = useState('All');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewModalBatches, setViewModalBatches] = useState<BatchData[]>([]);
  const [viewModalTitle, setViewModalTitle] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalData, setShareModalData] = useState<GroupedReport | null>(null);
  const [exportDropdownPosition, setExportDropdownPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);
  const exportButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

  useEffect(() => {
    fetchReports();
  }, []);

  // Set mounted state for portal
  useEffect(() => {
    setMounted(true);
  }, []);



  // Close dropdown when clicking outside - for export dropdowns with portal support
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showDropdown && 
          !target.closest('.dropdown-container') && 
          !target.closest('.export-dropdown-portal')) {
        setShowDropdown(null);
      }
    };

    const handleEscapeKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showDropdown) {
        setShowDropdown(null);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscapeKey);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
        document.removeEventListener('keydown', handleEscapeKey);
      };
    }
  }, [showDropdown]);

  const fetchReports = async () => {
    setLoading(true);
    
    try {
      const reports = await getManagerReports();
      setGroupedReports(reports);
    } catch (error) {
      Logger.error('Error fetching reports', error);
      setGroupedReports([]);
    }
    
    setLoading(false);
  };

  // Filtering logic
  const filtered = groupedReports.filter((r) => {
    const matchesShift = filterShift === 'All' || r.shift === filterShift;
    const matchesSearch = search === '' ||
      r.date.includes(search) ||
      r.manager.toLowerCase().includes(search.toLowerCase()) ||
      r.breadTypes.some((b: string) => b.toLowerCase().includes(search.toLowerCase()));
    return matchesShift && matchesSearch;
  });

  // Summary calculations
  const totalReports = filtered.length;
  const completedReports = filtered.filter(r => r.status === 'Completed').length;
  const totalProduction = filtered.reduce((sum, r) => sum + r.totalUnits, 0);

  // Export functionality
  const handleExportReport = (report: GroupedReport) => {
    const csvRows = [
      ['Manager Report', report.shift, report.date],
      [''],
      ['Summary'],
      ['Manager', 'Total Batches', 'Total Units', 'Status'],
      [report.manager, report.totalBatches, report.totalUnits, report.status],
      [''],
      ['Bread Types'],
      ...report.breadTypes.map(type => [type]),
      [''],
      ['Batch Details'],
      ['Batch Number', 'Bread Type', 'Quantity', 'Status', 'Start Time', 'End Time', 'Notes'],
      ...report.batches.map(batch => [
        batch.batch_number,
        getName(batch.bread_types),
        batch.actual_quantity,
        batch.status,
        formatDate(batch.start_time),
        batch.end_time ? formatTime(batch.end_time) : 'N/A',
        batch.notes && batch.notes.trim() ? batch.notes.trim() : 'N/A'
      ])
    ];

    const csvContent = csvRows.map(row => row.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `manager-report-${report.date}-${report.shift}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    if (filtered.length === 0) return;
    
    const csvRows = [
      ['Manager Reports Export'],
      ['Date', 'Shift', 'Manager', 'Total Batches', 'Total Units', 'Status', 'Bread Types'],
      ...filtered.map(r => [
        r.date,
        r.shift,
        r.manager,
        r.totalBatches,
        r.totalUnits,
        r.status,
        r.breadTypes.join('; ')
      ])
    ];

    const csvContent = csvRows.map(row => row.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-manager-reports-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Share functionality
  const getShareText = (report: GroupedReport) => 
    `🍞 Manager Report - ${report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} (${formatDate(report.date)})\n👤 Manager: ${report.manager}\n📦 Batches: ${report.totalBatches}\n🔢 Units: ${report.totalUnits}\n🍞 Types: ${report.breadTypes.join(', ')}\nStatus: ${report.status}`;

  const handleShare = (platform: string, report: GroupedReport) => {
    const text = getShareText(report);
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'email':
        window.location.href = `mailto:?subject=Manager Report - ${report.shift} ${report.date}&body=${encodeURIComponent(text)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(text).then(() => {
          alert('Report summary copied to clipboard!');
        });
        break;
    }
    
    setShowDropdown(null);
  };

  // Handle view report - show batch details
  const handleViewReport = (report: GroupedReport) => {
    setShowDropdown(null);
    setViewModalBatches(report.batches);
    setViewModalTitle(`${formatDate(report.date)} - ${report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} Shift`);
    setViewModalOpen(true);
  };


  // Handle export dropdown toggle with portal positioning
  const handleExportDropdownToggle = (dropdownId: string, buttonElement: HTMLButtonElement) => {
    if (showDropdown === dropdownId) {
      setShowDropdown(null);
    } else {
      // Calculate position for portal
      const rect = buttonElement.getBoundingClientRect();
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
      
      setExportDropdownPosition({
        top: rect.bottom + scrollTop + 4,
        left: rect.right + scrollLeft - 140 // Align to right edge of button
      });
      setShowDropdown(dropdownId);
      exportButtonRefs.current[dropdownId] = buttonElement;
    }
  };

  // Open share modal instead of dropdown - 100% reliable
  const handleShareClick = (report: GroupedReport) => {
    setShareModalData(report);
    setShareModalOpen(true);
  };

  const handleBackNavigation = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile-First Header with Back Button */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white">
        <div className="px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackNavigation}
              className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl touch-manipulation flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-white/20 p-2 sm:p-3 rounded-xl flex-shrink-0">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Manager Reports</h1>
              <p className="text-blue-100 text-xs sm:text-sm truncate">
                Production reports & analytics • {displayName}
              </p>
            </div>
          </div>
          
          {/* Summary Stats - Compact Grid */}
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div className="bg-white/10 rounded-lg p-2 sm:p-3 backdrop-blur-sm">
              <span className="text-xs opacity-80">Reports</span>
              <span className="text-lg sm:text-xl font-bold block">{totalReports}</span>
            </div>
            <div className="bg-white/10 rounded-lg p-2 sm:p-3 backdrop-blur-sm">
              <span className="text-xs opacity-80">Completed</span>
              <span className="text-lg sm:text-xl font-bold block">{completedReports}</span>
            </div>
            <div className="bg-white/10 rounded-lg p-2 sm:p-3 backdrop-blur-sm">
              <span className="text-xs opacity-80">Production</span>
              <span className="text-sm sm:text-lg font-bold block">{totalProduction.toLocaleString()}</span>
            </div>
            <div className="bg-white/10 rounded-lg p-2 sm:p-3 backdrop-blur-sm">
              <span className="text-xs opacity-80">Status</span>
              <span className="text-sm sm:text-lg font-bold block">Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Full Screen Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-50/30 to-cyan-50/30">
        <div className="px-3 sm:px-4 py-4 space-y-4 sm:space-y-6">

          {/* Controls - Compact Mobile Design */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-blue-200/50 shadow-sm">
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-blue-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-blue-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              
              {/* Filters Row */}
              <div className="flex gap-2">
                {/* Shift Filter */}
                <Select value={filterShift} onValueChange={setFilterShift}>
                  <SelectTrigger className="flex-1 h-10 px-3 border-2 border-blue-200 rounded-lg text-sm">
                    <SelectValue placeholder="All Shifts" />
                  </SelectTrigger>
                  <SelectContent className="z-40">
                    <SelectItem value="All">All Shifts</SelectItem>
                    <SelectItem value="morning">🌅 Morning</SelectItem>
                    <SelectItem value="night">🌙 Night</SelectItem>
                  </SelectContent>
                </Select>
                
                {/* Export All Button */}
                <div className="relative dropdown-container">
                  <button
                    ref={(el) => (exportButtonRefs.current['export-all'] = el)}
                    onClick={(e) => handleExportDropdownToggle('export-all', e.currentTarget)}
                    className="flex items-center gap-2 px-3 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm font-medium"
                  >
                    <Download size={14} />
                    Export
                    <ChevronDown size={14} className={cn("transition-transform", showDropdown === 'export-all' && "rotate-180")} />
                  </button>
                  
                  {/* Portal dropdown - always appears above everything */}
                  {mounted && showDropdown === 'export-all' && createPortal(
                    <div 
                      className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[140px] export-dropdown-portal"
                      style={{
                        top: exportDropdownPosition.top,
                        left: exportDropdownPosition.left,
                        zIndex: 99999
                      }}
                    >
                      <button
                        onClick={() => {
                          handleExportAll();
                          setShowDropdown(null);
                        }}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                      >
                        <FileText size={14} />
                        Export CSV
                      </button>
                    </div>,
                    document.body
                  )}
                </div>

                {/* Refresh Button */}
                <button
                  onClick={() => fetchReports()}
                  disabled={loading}
                  className="flex items-center gap-1 px-3 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>
          </div>

          {/* Reports List */}
          {loading ? (
            <LoadingSkeleton />
          ) : filtered.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 sm:p-12 border border-blue-200/50 shadow-sm text-center">
              <BarChart3 className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No reports found</h3>
              <p className="text-gray-500 text-sm">Try adjusting your search or filters</p>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {filtered.map((report, index) => (
                <motion.div
                  key={report.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  className="bg-white/80 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-blue-200/50 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Report Header - Compact */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-md flex items-center justify-center">
                        <Package className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">
                          {formatDate(report.date)}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} Shift
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={cn("px-2 py-1 rounded-full text-xs", getStatusColor(report.status))}>
                        {report.status}
                      </span>
                    </div>
                  </div>

                  {/* Report Content - 2 Column Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <User size={12} />
                        <span>{report.manager}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-600">
                        <Package size={12} />
                        <span>{report.totalBatches} batches</span>
                        <span>• {report.totalUnits} units</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-1">
                      {report.breadTypes.slice(0, 2).map((breadType: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">
                          {breadType}
                        </span>
                      ))}
                      {report.breadTypes.length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          +{report.breadTypes.length - 2}
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons - Compact */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Clock size={12} />
                      <span>{formatTime(report.latestEndTime)}</span>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleViewReport(report)}
                        className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors touch-manipulation"
                      >
                        <Eye size={14} />
                      </button>
                      
                      {/* Export Dropdown */}
                      <div className="relative dropdown-container">
                        <button
                          ref={(el) => (exportButtonRefs.current[`export-${report.id}`] = el)}
                          onClick={(e) => handleExportDropdownToggle(`export-${report.id}`, e.currentTarget)}
                          className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors touch-manipulation"
                        >
                          <Download size={14} />
                        </button>
                        
                        {/* Portal dropdown - always appears above everything */}
                        {mounted && showDropdown === `export-${report.id}` && createPortal(
                          <div 
                            className="fixed bg-white rounded-lg shadow-xl border border-gray-200 py-1 min-w-[120px] export-dropdown-portal"
                            style={{
                              top: exportDropdownPosition.top,
                              left: exportDropdownPosition.left,
                              zIndex: 99999
                            }}
                          >
                            <button
                              onClick={() => {
                                handleExportReport(report);
                                setShowDropdown(null);
                              }}
                              className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                            >
                              <FileText size={12} />
                              CSV
                            </button>
                          </div>,
                          document.body
                        )}
                      </div>
                      
                      {/* Share Button - Opens Modal */}
                      <button
                        onClick={() => handleShareClick(report)}
                        className="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors touch-manipulation"
                        title="Share Report"
                      >
                        <Share2 size={14} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Batch Details Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title={viewModalTitle}>
        <div className="space-y-4">
          {viewModalBatches.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No batches in this report.</div>
          ) : (
            <div className="space-y-3">
              {viewModalBatches.map((batch) => (
                <Card key={batch.id} className="p-3 bg-gray-50 border-0 shadow-sm">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold text-gray-900 text-sm">#{batch.batch_number}</span>
                    <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                      {getName(batch.bread_types) || 'Unknown Bread'}
                    </span>
                    <span className={cn("text-xs px-2 py-1 rounded-full", getStatusColor(batch.status))}>
                      {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
                    <div>
                      <Package className="inline w-3 h-3 mr-1" />
                      <span>{batch.actual_quantity} units</span>
                    </div>
                    <div>
                      <Clock className="inline w-3 h-3 mr-1" />
                      <span>{formatTime(batch.start_time)}</span>
                    </div>
                  </div>
                  {batch.end_time && (
                    <div className="text-xs text-gray-500 mt-1">
                      End: {formatTime(batch.end_time)}
                    </div>
                  )}
                  {batch.notes && batch.notes.trim() && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      <div className="flex items-start gap-2">
                        <MessageCircle className="inline w-3 h-3 mt-0.5 text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="text-xs font-medium text-blue-600">Notes:</span>
                          <p className="text-xs text-gray-700 mt-0.5 break-words">{batch.notes.trim()}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      </Modal>

      {/* Share Modal - 100% Reliable */}
      {shareModalOpen && shareModalData && (
        <ShareModal
          report={shareModalData}
          onClose={() => {
            setShareModalOpen(false);
            setShareModalData(null);
          }}
          onShare={handleShare}
        />
      )}
    </div>
  );
}

// Share Modal Component - Always works perfectly
function ShareModal({ 
  report, 
  onClose, 
  onShare 
}: { 
  report: GroupedReport; 
  onClose: () => void; 
  onShare: (platform: string, report: GroupedReport) => void;
}) {
  const shareOptions = [
    { platform: 'whatsapp', label: 'WhatsApp', icon: '💬', color: 'bg-green-500 hover:bg-green-600' },
    { platform: 'email', label: 'Email', icon: '📧', color: 'bg-blue-500 hover:bg-blue-600' },
    { platform: 'copy', label: 'Copy Link', icon: '📋', color: 'bg-gray-500 hover:bg-gray-600' }
  ];

  // Disable background scroll and interaction
  useEffect(() => {
    // Disable body scroll
    document.body.style.overflow = 'hidden';
    
    // Handle escape key
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    document.addEventListener('keydown', handleEscape);
    
    // Cleanup on unmount
    return () => {
      document.body.style.overflow = 'unset';
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleShareClick = (platform: string) => {
    onShare(platform, report);
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[999] flex items-center justify-center bg-black/50 backdrop-blur-sm overflow-hidden"
      onClick={handleBackdropClick}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-[90%] max-w-sm mx-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-500 to-indigo-500 text-white p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Share Report</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-purple-100 text-sm mt-1">
            {formatDate(report.date)} • {report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} Shift
          </p>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Report Summary</div>
            <div className="font-semibold text-gray-900">{report.totalBatches} batches • {report.totalUnits} units</div>
          </div>

          <div className="space-y-2">
            {shareOptions.map((option) => (
              <button
                key={option.platform}
                onClick={() => handleShareClick(option.platform)}
                className={`w-full flex items-center gap-3 p-3 rounded-lg text-white transition-colors ${
                  option.color
                }`}
              >
                <span className="text-xl">{option.icon}</span>
                <span className="font-medium">{option.label}</span>
              </button>
            ))}
          </div>

          <button
            onClick={onClose}
            className="w-full mt-4 p-3 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}