'use client';

import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { 
  ArrowLeft, 
  DollarSign, 
  FileText,
  Package, 
  Search, 
  Download, 
  Clock, 
  Calendar,
  Eye, 
  Share2, 
  ChevronDown,
  Mail,
  MessageCircle,
  Copy,
  RefreshCw
} from 'lucide-react';
import { getSalesReports, type SalesReport, type SalesDataItem, type RemainingBreadItem } from '@/lib/reports/sales-reports-server-actions';
import { cn } from '@/lib/utils';
import { Logger } from '@/lib/utils/logger';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { Button } from '@/components/ui/button';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';

interface OwnerSalesReportsClientProps {
  user: { id: string; email?: string };
  displayName: string;
}

// Types are imported from server actions

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

const getTopItems = (salesData: SalesDataItem[]) => {
  if (!salesData || salesData.length === 0) return [];
  
  const itemMap = new Map<string, number>();
  salesData.forEach((item) => {
    const name = item.breadType || 'Unknown';
    itemMap.set(name, (itemMap.get(name) || 0) + (item.quantity || 0));
  });
  
  return Array.from(itemMap.entries())
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([name, quantity]) => `${name} (${quantity} units)`);
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

export default function OwnerSalesReportsClient({ user, displayName }: OwnerSalesReportsClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<SalesReport[]>([]);
  const [search, setSearch] = useState('');
  const [filterShift, setFilterShift] = useState('All');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewModalData, setViewModalData] = useState<SalesReport | null>(null);
  const [viewModalTitle, setViewModalTitle] = useState('');
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareModalData, setShareModalData] = useState<SalesReport | null>(null);
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
      const reportsData = await getSalesReports();
      setReports(reportsData);
    } catch (error) {
      Logger.error('Error fetching sales reports', error);
      setReports([]);
    }
    
    setLoading(false);
  };

  // Filtering logic
  const filtered = reports.filter((r) => {
    const matchesShift = filterShift === 'All' || r.shift === filterShift;
    const matchesSearch = search === '' ||
      r.report_date.includes(search) ||
      r.shift.toLowerCase().includes(search.toLowerCase()) ||
      (r.sales_data || []).some(item => 
        item.breadType?.toLowerCase().includes(search.toLowerCase())
      );
    return matchesShift && matchesSearch;
  });

  // Summary calculations
  const totalReports = filtered.length;
  const totalRevenue = filtered.reduce((sum, r) => sum + r.total_revenue, 0);
  const totalItemsSold = filtered.reduce((sum, r) => sum + r.total_items_sold, 0);
  const totalRemaining = filtered.reduce((sum, r) => sum + r.total_remaining, 0);

  // Export functionality
  const handleExportReport = (report: SalesReport) => {
    const csvRows = [
      ['Sales Report', report.shift, report.report_date],
      [''],
      ['Summary'],
      ['Total Revenue', 'Total Items Sold', 'Total Remaining'],
      [report.total_revenue, report.total_items_sold, report.total_remaining],
      [''],
      ['Sales Data'],
      ['Bread Type', 'Quantity', 'Unit Price', 'Total Amount', 'Timestamp'],
      ...(report.sales_data || []).map(sale => [
        sale.breadType || 'N/A',
        sale.quantity || 0,
        sale.unitPrice || 0,
        sale.totalAmount || 0,
        sale.timestamp || report.created_at
      ]),
      [''],
      ['Remaining Breads'],
      ['Bread Type', 'Quantity', 'Unit Price', 'Total Value'],
      ...(report.remaining_breads || []).map(bread => [
        bread.breadType || 'N/A',
        bread.quantity || 0,
        bread.unitPrice || 0,
        bread.totalAmount || 0
      ])
    ];

    const csvContent = csvRows.map(row => row.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sales-report-${report.report_date}-${report.shift}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  const handleExportAll = () => {
    if (filtered.length === 0) return;
    
    const csvRows = [
      ['Sales Reports Export'],
      ['Date', 'Shift', 'Total Revenue', 'Items Sold', 'Remaining', 'Top Items'],
      ...filtered.map(r => [
        r.report_date,
        r.shift,
        r.total_revenue,
        r.total_items_sold,
        r.total_remaining,
        getTopItems(r.sales_data).join('; ')
      ])
    ];

    const csvContent = csvRows.map(row => row.map(String).map(v => `"${v.replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all-sales-reports-${new Date().toISOString().slice(0,10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Share functionality
  const getShareText = (report: SalesReport) => 
    `💰 Sales Report - ${report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} (${formatDate(report.report_date)})\n💵 Revenue: ${formatCurrencyNGN(report.total_revenue)}\n📦 Items Sold: ${report.total_items_sold}\n🍞 Remaining: ${formatCurrencyNGN(report.total_remaining)}\n🔥 Top Items: ${getTopItems(report.sales_data).slice(0,2).join(', ')}`;

  const handleShare = (platform: string, report: SalesReport) => {
    const text = getShareText(report);
    
    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'email':
        window.location.href = `mailto:?subject=Sales Report - ${report.shift} ${report.report_date}&body=${encodeURIComponent(text)}`;
        break;
      case 'copy':
        navigator.clipboard.writeText(text).then(() => {
          alert('Report summary copied to clipboard!');
        });
        break;
    }
    
    setShowDropdown(null);
  };

  // Handle view report - show sales details
  const handleViewReport = (report: SalesReport) => {
    setShowDropdown(null);
    setViewModalData(report);
    setViewModalTitle(`${formatDate(report.report_date)} - ${report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} Shift Sales`);
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
  const handleShareClick = (report: SalesReport) => {
    setShareModalData(report);
    setShareModalOpen(true);
  };

  const handleBackNavigation = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile-First Header with Back Button */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-400 text-white">
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
              <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Sales Reports</h1>
              <p className="text-green-100 text-xs sm:text-sm truncate">
                Revenue reports & analytics • {displayName}
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
              <span className="text-xs opacity-80">Revenue</span>
              <span className="text-sm sm:text-lg font-bold block">{formatCurrencyNGN(totalRevenue)}</span>
            </div>
            <div className="bg-white/10 rounded-lg p-2 sm:p-3 backdrop-blur-sm">
              <span className="text-xs opacity-80">Items Sold</span>
              <span className="text-lg sm:text-xl font-bold block">{totalItemsSold.toLocaleString()}</span>
            </div>
            <div className="bg-white/10 rounded-lg p-2 sm:p-3 backdrop-blur-sm">
              <span className="text-xs opacity-80">Remaining</span>
              <span className="text-sm font-bold block">{formatCurrencyNGN(totalRemaining)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Full Screen Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-green-50/30 to-emerald-50/30">
        <div className="px-3 sm:px-4 py-4 space-y-4 sm:space-y-6">

          {/* Controls - Compact Mobile Design */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-green-200/50 shadow-sm">
            <div className="space-y-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-green-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-green-200 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                />
              </div>
              
              {/* Filters Row */}
              <div className="flex gap-2">
                {/* Shift Filter */}
                <Select value={filterShift} onValueChange={setFilterShift}>
                  <SelectTrigger className="flex-1 h-10 px-3 border-2 border-green-200 rounded-lg text-sm">
                    <SelectValue placeholder="All Shifts" />
                  </SelectTrigger>
                  <SelectContent className="z-[9999]">
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
                    className="flex items-center gap-2 px-3 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-medium"
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
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 sm:p-12 border border-green-200/50 shadow-sm text-center">
              <DollarSign className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No sales reports found</h3>
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
                  className="bg-white/80 backdrop-blur-sm rounded-lg p-3 sm:p-4 border border-green-200/50 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Report Header - Compact */}
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 bg-gradient-to-r from-green-500 to-emerald-500 rounded-md flex items-center justify-center">
                        <FileText className="h-3 w-3 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900">
                          {formatDate(report.report_date)}
                        </h4>
                        <p className="text-xs text-gray-500">
                          {report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} Shift • {formatTime(report.created_at)}
                        </p>
                      </div>
                    </div>
                    <span className="px-2 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full text-xs font-medium">
                      Completed
                    </span>
                  </div>

                  {/* Report Content - Compact Grid */}
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2">
                      <p className="text-xs text-gray-600">Revenue</p>
                      <p className="text-sm font-bold text-green-600">{formatCurrencyNGN(report.total_revenue)}</p>
                    </div>
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-2">
                      <p className="text-xs text-gray-600">Items Sold</p>
                      <p className="text-sm font-bold text-blue-600">{report.total_items_sold}</p>
                    </div>
                  </div>

                  {/* Top Items */}
                  <div className="mb-2">
                    <p className="text-xs text-gray-600 mb-1">Top Items:</p>
                    <div className="flex flex-wrap gap-1">
                      {getTopItems(report.sales_data).slice(0, 2).map((item, i) => (
                        <span key={i} className="px-2 py-1 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 rounded-lg text-xs font-medium">
                          {item.split(' (')[0]}
                        </span>
                      ))}
                      {getTopItems(report.sales_data).length > 2 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-lg text-xs">
                          +{getTopItems(report.sales_data).length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {/* Action Buttons - Compact */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <Calendar size={12} />
                      <span>{formatDate(report.report_date)}</span>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => handleViewReport(report)}
                        className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors touch-manipulation"
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

      {/* Sales Details Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title={viewModalTitle}>
        <div className="space-y-4">
          {!viewModalData ? (
            <div className="text-center text-gray-500 py-8">No data available.</div>
          ) : (
            <div className="space-y-6">
              {/* Summary Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <DollarSign className="w-5 h-5 text-green-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">Total Revenue</p>
                  <p className="text-base font-bold text-green-600">{formatCurrencyNGN(viewModalData.total_revenue)}</p>
                </div>
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <Package className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                  <p className="text-xs text-gray-600">Items Sold</p>
                  <p className="text-base font-bold text-blue-600">{viewModalData.total_items_sold}</p>
                </div>
              </div>

              {/* Sales Data - Compact */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-2 text-sm">Sales Details</h4>
                <div className="space-y-2">
                  {(viewModalData.sales_data || []).map((sale, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 text-sm">{sale.breadType || 'Unknown'}</p>
                        <p className="text-xs text-gray-500">Qty: {sale.quantity} @ {formatCurrencyNGN(sale.unitPrice || 0)}</p>
                      </div>
                      <p className="font-semibold text-green-600 text-sm">{formatCurrencyNGN(sale.totalAmount || 0)}</p>
                    </div>
                  ))}
                  {(!viewModalData.sales_data || viewModalData.sales_data.length === 0) && (
                    <div className="py-4 text-center text-gray-500 text-sm">No sales data available</div>
                  )}
                </div>
              </div>

              {/* Feedback */}
              {viewModalData.feedback && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2 text-sm">Feedback</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg text-sm">{viewModalData.feedback}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>

      {/* Share Modal - 100% Reliable */}
      {shareModalOpen && shareModalData && (
        <SalesShareModal
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

// Sales Share Modal Component - Always works perfectly
function SalesShareModal({ 
  report, 
  onClose, 
  onShare 
}: { 
  report: SalesReport; 
  onClose: () => void; 
  onShare: (platform: string, report: SalesReport) => void;
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
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-4 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-lg">Share Sales Report</h3>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              ✕
            </button>
          </div>
          <p className="text-green-100 text-sm mt-1">
            {formatDate(report.report_date)} • {report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} Shift
          </p>
        </div>

        {/* Content */}
        <div className="p-4">
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-600">Report Summary</div>
            <div className="font-semibold text-gray-900">{formatCurrencyNGN(report.total_revenue)} • {report.total_items_sold} items sold</div>
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