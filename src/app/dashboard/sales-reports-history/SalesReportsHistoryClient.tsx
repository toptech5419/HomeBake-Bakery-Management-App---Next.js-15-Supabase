'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileText, 
  Download, 
  Eye, 
  Calendar, 
  DollarSign, 
  Package, 
  Filter, 
  Search, 
  ChevronDown, 
  Share2,
  ArrowLeft,
  Loader2,
  X
} from 'lucide-react';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { UserRole } from '@/types';
import { supabase } from '@/lib/supabase/client';
import { toast } from 'sonner';
import { FinalReportModal } from '@/components/dashboards/sales/FinalReportModal';

// Type for sales data items
interface SalesDataItem {
  breadType?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  timestamp?: string;
}

// Type for remaining bread items
interface RemainingBreadItem {
  breadType?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
}

// Type for shift report data from database
interface ShiftReport {
  id: string;
  user_id: string;
  shift: 'morning' | 'night';
  report_date: string;
  total_revenue: number;
  total_items_sold: number;
  total_remaining: number;
  feedback: string | null;
  sales_data: SalesDataItem[];
  remaining_breads: RemainingBreadItem[];
  created_at: string;
  updated_at: string;
}

// Type for FinalReportModal data structure
interface ReportData {
  salesRecords: Array<{
    breadType: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
    timestamp: string;
  }>;
  remainingBreads: Array<{
    breadType: string;
    quantity: number;
    unitPrice: number;
    totalAmount: number;
  }>;
  totalRevenue: number;
  totalItemsSold: number;
  totalRemaining: number;
  shift?: string;
}

interface SalesReportsHistoryClientProps {
  userId: string;
  userRole: UserRole;
}

export default function SalesReportsHistoryClient({ userId, userRole }: SalesReportsHistoryClientProps) {
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [filteredReports, setFilteredReports] = useState<ShiftReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ShiftReport | null>(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [shareReportId, setShareReportId] = useState<string | null>(null);
  const [reportDataForModal, setReportDataForModal] = useState<ReportData | null>(null);
  
  const router = useRouter();

  // Handle clicking outside filter dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showFilters && !target.closest('.filter-dropdown')) {
        setShowFilters(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showFilters]);

  // Fetch reports from Supabase with real async query
  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      let query = supabase
        .from('shift_reports')
        .select('*')
        .order('created_at', { ascending: false });

      // Only show reports for the logged-in sales rep
      if (userRole === 'sales_rep') {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching reports:', error);
        toast.error('Failed to load reports');
        return;
      }

      const reportsData = data as ShiftReport[] || [];
      setReports(reportsData);
      setFilteredReports(reportsData);
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to load reports');
    } finally {
      setLoading(false);
    }
  }, [userId, userRole]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  // Filter reports based on search and filter criteria
  useEffect(() => {
    let filtered = reports;

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(report => {
        const searchLower = searchTerm.toLowerCase();
        return (
          report.shift.toLowerCase().includes(searchLower) ||
          report.report_date.includes(searchTerm)
        );
      });
    }

    // Apply category filter
    if (selectedFilter === 'day') {
      filtered = filtered.filter(report => report.shift === 'morning');
    } else if (selectedFilter === 'night') {
      filtered = filtered.filter(report => report.shift === 'night');
    } else if (selectedFilter === 'high-revenue') {
      filtered = filtered.filter(report => report.total_revenue > 15000);
    }

    setFilteredReports(filtered);
  }, [reports, searchTerm, selectedFilter]);

  // Convert ShiftReport to ReportData for FinalReportModal
  const convertToReportData = (report: ShiftReport): ReportData => {
    return {
      salesRecords: (report.sales_data || []).map((sale) => ({
        breadType: sale.breadType || 'Unknown',
        quantity: sale.quantity || 0,
        unitPrice: sale.unitPrice || 0,
        totalAmount: sale.totalAmount || 0,
        timestamp: sale.timestamp || report.created_at
      })),
      remainingBreads: (report.remaining_breads || []).map((bread) => ({
        breadType: bread.breadType || 'Unknown',
        quantity: bread.quantity || 0,
        unitPrice: bread.unitPrice || 0,
        totalAmount: bread.totalAmount || 0
      })),
      totalRevenue: report.total_revenue,
      totalItemsSold: report.total_items_sold,
      totalRemaining: report.total_remaining,
      shift: report.shift
    };
  };

  const handleViewReport = (report: ShiftReport) => {
    setSelectedReport(report);
    setReportDataForModal(convertToReportData(report));
  };

  const handleDownloadReport = (report: ShiftReport) => {
    const csvContent = [
      ['Shift Report', report.shift, report.report_date],
      [''],
      ['Summary'],
      ['Total Revenue', report.total_revenue],
      ['Total Items Sold', report.total_items_sold],
      ['Total Remaining', report.total_remaining],
      [''],
      ['Sales Data'],
      ['Bread Type', 'Quantity', 'Unit Price', 'Total Amount'],
      ...(report.sales_data || []).map((sale) => [
        sale.breadType || 'N/A',
        sale.quantity || 0,
        sale.unitPrice || 0,
        sale.totalAmount || 0
      ]),
      [''],
      ['Remaining Breads'],
      ['Bread Type', 'Quantity', 'Unit Price', 'Total Value'],
      ...(report.remaining_breads || []).map((bread) => [
        bread.breadType || 'N/A',
        bread.quantity || 0,
        bread.unitPrice || 0,
        bread.totalAmount || 0
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `shift-report-${report.shift}-${report.report_date}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Report downloaded successfully');
  };

  const handleShareReport = (reportId: string) => {
    setShareReportId(reportId);
    setShowShareModal(true);
  };

  const shareToSocial = (platform: string, report: ShiftReport) => {
    const text = `🍞 Shift Report - ${report.shift} (${report.report_date})
💰 Revenue: ${formatCurrencyNGN(report.total_revenue)}
📦 Items Sold: ${report.total_items_sold}
🥖 Remaining: ${formatCurrencyNGN(report.total_remaining)}`;

    switch (platform) {
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'email':
        window.location.href = `mailto:?subject=Shift Report - ${report.shift} ${report.report_date}&body=${encodeURIComponent(text)}`;
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`, '_blank');
        break;
    }
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  // Summary calculations
  const totalRevenue = filteredReports.reduce((sum, report) => sum + report.total_revenue, 0);
  const totalItemsSold = filteredReports.reduce((sum, report) => sum + report.total_items_sold, 0);
  const totalReports = filteredReports.length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-green-600" />
              <span className="ml-2 text-gray-600">Loading reports...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header with Back Button */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex flex-col gap-4">
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 transition-colors w-fit"
            >
              <ArrowLeft size={16} />
              Back to Dashboard
            </button>
            
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <FileText className="text-green-600" size={28} />
                Sales Report History
              </h1>
              <p className="text-gray-600 mt-1">
                {userRole === 'sales_rep' ? 'View your completed shift reports' : 'View all sales reports'}
              </p>
            </div>
            
            {/* Search + Filter Bar - Mobile First */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Input */}
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
                <input
                  type="text"
                  placeholder="Search reports by shift or date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent text-sm"
                />
              </div>
              
              {/* Filter Dropdown */}
              <div className="relative filter-dropdown">
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="flex items-center justify-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700 bg-white min-w-[140px]"
                >
                  <Filter size={16} />
                  <span className="hidden sm:inline">Filter</span>
                  <ChevronDown className={`transform transition-transform duration-200 ${showFilters ? 'rotate-180' : ''}`} size={16} />
                </button>
                
                {/* Filter Dropdown Menu */}
                {showFilters && (
                  <div className="absolute right-0 top-full mt-1 w-56 bg-white border border-gray-200 rounded-lg shadow-lg z-10 filter-dropdown">
                    <div className="p-2">
                      {[
                        { value: 'all', label: 'All Reports', icon: '📊' },
                        { value: 'day', label: 'Day Shift', icon: '🌅' },
                        { value: 'night', label: 'Night Shift', icon: '🌙' },
                        { value: 'high-revenue', label: 'High Revenue (>₦15,000)', icon: '💰' }
                      ].map((filter) => (
                        <button
                          key={filter.value}
                          onClick={() => {
                            setSelectedFilter(filter.value);
                            setShowFilters(false);
                          }}
                          className={`w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                            selectedFilter === filter.value
                              ? 'bg-green-50 text-green-700 border border-green-200'
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <span className="text-base">{filter.icon}</span>
                          <span className="flex-1 text-left">{filter.label}</span>
                          {selectedFilter === filter.value && (
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
            
            {/* Active Filter Display */}
            {selectedFilter !== 'all' && (
              <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                <span className="text-sm text-gray-500">Active filter:</span>
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-medium">
                  {selectedFilter === 'day' && '🌅 Day Shift'}
                  {selectedFilter === 'night' && '🌙 Night Shift'}
                  {selectedFilter === 'high-revenue' && '💰 High Revenue (>₦15,000)'}
                </span>
                <button
                  onClick={() => setSelectedFilter('all')}
                  className="text-xs text-gray-400 hover:text-gray-600"
                >
                  Clear
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <FileText className="text-green-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Reports</p>
                <p className="text-xl font-bold text-gray-900">{totalReports}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <DollarSign className="text-blue-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Revenue</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrencyNGN(totalRevenue)}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                <Package className="text-purple-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">Items Sold</p>
                <p className="text-xl font-bold text-gray-900">{totalItemsSold.toLocaleString()}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <Calendar className="text-orange-600" size={20} />
              </div>
              <div>
                <p className="text-sm text-gray-600">This Week</p>
                <p className="text-xl font-bold text-gray-900">
                  {filteredReports.filter(r => {
                    const reportDate = new Date(r.report_date);
                    const weekAgo = new Date();
                    weekAgo.setDate(weekAgo.getDate() - 7);
                    return reportDate >= weekAgo;
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
          {filteredReports.map((report) => (
            <div key={report.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
              <div className="p-4">
                <div className="flex flex-col gap-4">
                  {/* Report Info */}
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                        <FileText className="text-green-600" size={24} />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} Shift - {formatDate(report.report_date)}
                        </h3>
                        <p className="text-sm text-gray-600">
                          Submitted at {formatTime(report.created_at)}
                        </p>
                      </div>
                      <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                        Completed
                      </span>
                    </div>
                    
                    {/* Key Metrics */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-600">Total Revenue</p>
                        <p className="text-lg font-bold text-green-600">{formatCurrencyNGN(report.total_revenue)}</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-600">Items Sold</p>
                        <p className="text-lg font-bold text-gray-900">{report.total_items_sold} units</p>
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3">
                        <p className="text-sm text-gray-600">Remaining Value</p>
                        <p className="text-lg font-bold text-gray-900">{formatCurrencyNGN(report.total_remaining)}</p>
                      </div>
                    </div>
                    
                    {/* Top Items */}
                    <div className="mb-4">
                      <p className="text-sm text-gray-600 mb-2">Top Selling Items:</p>
                      <div className="flex flex-wrap gap-2">
                        {getTopItems(report.sales_data).map((item, index) => (
                          <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  {/* Actions */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      onClick={() => handleViewReport(report)}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
                    >
                      <Eye size={16} />
                      <span className="hidden sm:inline">View</span>
                    </button>
                    
                    <button
                      onClick={() => handleDownloadReport(report)}
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <Download size={16} />
                      <span className="hidden sm:inline">Download</span>
                    </button>
                    
                    <button
                      onClick={() => handleShareReport(report.id)}
                      className="flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                      <Share2 size={16} />
                      <span className="hidden sm:inline">Share</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto text-gray-400 mb-4" size={48} />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No reports found</h3>
            <p className="text-gray-600">Try adjusting your search or filter criteria.</p>
          </div>
        )}
      </div>

      {/* Use FinalReportModal for viewing reports in view-only mode */}
      <FinalReportModal
        isOpen={!!selectedReport}
        onClose={() => setSelectedReport(null)}
        reportData={reportDataForModal}
        viewOnly={true}
      />

      {/* Share Modal */}
      {showShareModal && shareReportId && (
        <ShareModal
          reportId={shareReportId}
          reports={reports}
          onClose={() => setShowShareModal(false)}
          onShare={shareToSocial}
        />
      )}
    </div>
  );
}

// Share Modal Component - Mobile-First Responsive
function ShareModal({ 
  reportId, 
  reports, 
  onClose, 
  onShare 
}: { 
  reportId: string; 
  reports: ShiftReport[]; 
  onClose: () => void; 
  onShare: (platform: string, report: ShiftReport) => void;
}) {
  const report = reports.find(r => r.id === reportId);
  const [isClosing, setIsClosing] = useState(false);
  
  const handleClose = useCallback(() => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 300);
  }, [onClose]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [handleClose]);

  if (!report) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const shareOptions = [
    {
      platform: 'whatsapp',
      label: 'WhatsApp',
      icon: '💬',
      color: 'bg-green-50 hover:bg-green-100 text-green-600',
      description: 'Share via WhatsApp'
    },
    {
      platform: 'email',
      label: 'Email',
      icon: '📧',
      color: 'bg-blue-50 hover:bg-blue-100 text-blue-600',
      description: 'Send via email'
    },
    {
      platform: 'twitter',
      label: 'Twitter',
      icon: '🐦',
      color: 'bg-sky-50 hover:bg-sky-100 text-sky-600',
      description: 'Share on Twitter'
    },
    {
      platform: 'facebook',
      label: 'Facebook',
      icon: '📘',
      color: 'bg-blue-50 hover:bg-blue-100 text-blue-600',
      description: 'Share on Facebook'
    },
    {
      platform: 'copy',
      label: 'Copy Link',
      icon: '📋',
      color: 'bg-gray-50 hover:bg-gray-100 text-gray-600',
      description: 'Copy to clipboard'
    },
    {
      platform: 'print',
      label: 'Print',
      icon: '🖨️',
      color: 'bg-purple-50 hover:bg-purple-100 text-purple-600',
      description: 'Print report'
    }
  ];

  const handleShare = (platform: string) => {
    if (platform === 'copy') {
      // Copy report summary to clipboard
      const text = `🍞 Shift Report - ${report.shift} (${report.report_date})
💰 Revenue: ${formatCurrencyNGN(report.total_revenue)}
📦 Items Sold: ${report.total_items_sold}
🥖 Remaining: ${formatCurrencyNGN(report.total_remaining)}`;
      
      navigator.clipboard.writeText(text).then(() => {
        toast.success('Report summary copied to clipboard');
      }).catch(() => {
        toast.error('Failed to copy to clipboard');
      });
    } else if (platform === 'print') {
      // Print functionality
      window.print();
    } else {
      onShare(platform, report);
    }
    handleClose();
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      onClick={handleBackdropClick}
    >
      <div 
        className={`bg-white rounded-2xl shadow-2xl w-[95%] max-w-sm h-auto max-h-[90vh] overflow-y-auto transition-all duration-300 ${
          isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'
        }`}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 md:p-5 rounded-t-2xl sticky top-0 z-10">
          <button
            onClick={handleClose}
            className="absolute top-3 right-3 md:top-4 md:right-4 bg-white/20 hover:bg-white/30 text-white w-8 h-8 rounded-lg flex items-center justify-center transition-colors duration-200"
            aria-label="Close share modal"
          >
            <X className="w-4 h-4" />
          </button>
          <h3 className="text-lg md:text-xl font-bold mb-1 pr-8">Share Report</h3>
          <div className="text-xs md:text-sm opacity-90">
            {report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} Shift - {new Date(report.report_date).toLocaleDateString('en-GB', {
              day: '2-digit',
              month: 'short',
              year: 'numeric'
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6">
          {/* Report Summary */}
          <div className="mb-4 p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Report Summary</span>
              <span className="text-xs text-gray-500">{formatCurrencyNGN(report.total_revenue)}</span>
            </div>
            <div className="text-xs text-gray-600">
              {report.total_items_sold} items sold • {formatCurrencyNGN(report.total_remaining)} remaining
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-gray-900 mb-3">Choose sharing method:</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {shareOptions.map((option) => (
                <button
                  key={option.platform}
                  onClick={() => handleShare(option.platform)}
                  className={`flex flex-col items-center gap-2 p-3 sm:p-4 rounded-lg transition-all duration-200 ${option.color} hover:shadow-md hover:-translate-y-0.5`}
                >
                  <div className="text-xl sm:text-2xl">{option.icon}</div>
                  <div className="text-center">
                    <div className="text-xs sm:text-sm font-semibold">{option.label}</div>
                    <div className="text-[10px] sm:text-xs opacity-75 hidden sm:block">{option.description}</div>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mt-6 pt-4 border-t border-gray-100">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => {
                  // Download functionality
                  const csvContent = [
                    ['Shift Report', report.shift, report.report_date],
                    [''],
                    ['Summary'],
                    ['Total Revenue', report.total_revenue],
                    ['Total Items Sold', report.total_items_sold],
                    ['Total Remaining', report.total_remaining],
                    [''],
                    ['Sales Data'],
                    ['Bread Type', 'Quantity', 'Unit Price', 'Total Amount'],
                    ...(report.sales_data || []).map((sale) => [
                      sale.breadType || 'N/A',
                      sale.quantity || 0,
                      sale.unitPrice || 0,
                      sale.totalAmount || 0
                    ]),
                    [''],
                    ['Remaining Breads'],
                    ['Bread Type', 'Quantity', 'Unit Price', 'Total Value'],
                    ...(report.remaining_breads || []).map((bread) => [
                      bread.breadType || 'N/A',
                      bread.quantity || 0,
                      bread.unitPrice || 0,
                      bread.totalAmount || 0
                    ])
                  ].map(row => row.join(',')).join('\n');

                  const blob = new Blob([csvContent], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `shift-report-${report.shift}-${report.report_date}.csv`;
                  a.click();
                  window.URL.revokeObjectURL(url);
                  toast.success('Report downloaded successfully');
                  handleClose();
                }}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
              >
                <Download size={16} />
                Download CSV
              </button>
              <button
                onClick={handleClose}
                className="flex-1 flex items-center justify-center gap-2 py-3 px-4 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
