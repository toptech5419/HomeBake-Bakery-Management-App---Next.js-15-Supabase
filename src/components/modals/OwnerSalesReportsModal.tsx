'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  DollarSign, 
  FileText,
  Package, 
  Search, 
  Filter, 
  Download, 
  Clock, 
  Calendar,
  Eye, 
  Share2, 
  ChevronDown,
  Mail,
  MessageCircle,
  Copy
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Card } from '@/components/ui/card';
import { formatCurrencyNGN } from '@/lib/utils/currency';

// Types matching the sales reports structure
interface SalesDataItem {
  breadType?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
  timestamp?: string;
}

interface RemainingBreadItem {
  breadType?: string;
  quantity?: number;
  unitPrice?: number;
  totalAmount?: number;
}

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

interface OwnerSalesReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
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

export function OwnerSalesReportsModal({ isOpen, onClose }: OwnerSalesReportsModalProps) {
  const [loading, setLoading] = useState(true);
  const [reports, setReports] = useState<ShiftReport[]>([]);
  const [search, setSearch] = useState('');
  const [filterShift, setFilterShift] = useState('All');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewModalData, setViewModalData] = useState<ShiftReport | null>(null);
  const [viewModalTitle, setViewModalTitle] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchReports();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showDropdown && !target.closest('.dropdown-container')) {
        setShowDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDropdown]);

  const fetchReports = async () => {
    setLoading(true);
    const supabase = createClientComponentClient();
    
    try {
      const { data: reportsData, error } = await supabase
        .from('shift_reports')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching sales reports:', error);
        setReports([]);
        setLoading(false);
        return;
      }

      setReports(reportsData || []);
    } catch (error) {
      console.error('Error fetching sales reports:', error);
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
  const handleExportReport = (report: ShiftReport) => {
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
  const getShareText = (report: ShiftReport) => 
    `💰 Sales Report - ${report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} (${formatDate(report.report_date)})\n💵 Revenue: ${formatCurrencyNGN(report.total_revenue)}\n📦 Items Sold: ${report.total_items_sold}\n🍞 Remaining: ${formatCurrencyNGN(report.total_remaining)}\n🔥 Top Items: ${getTopItems(report.sales_data).slice(0,2).join(', ')}`;

  const handleShare = (platform: string, report: ShiftReport) => {
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
  const handleViewReport = (report: ShiftReport) => {
    setShowDropdown(null); // Close any open dropdowns
    setViewModalData(report);
    setViewModalTitle(`${formatDate(report.report_date)} - ${report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} Shift Sales`);
    setViewModalOpen(true);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 transition-opacity duration-300"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
        <div 
          className="bg-white w-full max-w-6xl max-h-[95vh] rounded-2xl shadow-2xl transform transition-all duration-300 flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header - Green/Emerald Theme */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-400 text-white p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">Sales Reports</h2>
                  <p className="text-sm opacity-90">Revenue reports and analytics</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/20 hover:scale-105 shadow-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Summary Cards - Green Theme */}
            <div className="grid grid-cols-4 gap-3 mt-4">
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <span className="text-xs opacity-80">Total Reports</span>
                <span className="text-lg font-bold block">{totalReports}</span>
              </div>
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <span className="text-xs opacity-80">Revenue</span>
                <span className="text-sm sm:text-lg font-bold block">{formatCurrencyNGN(totalRevenue)}</span>
              </div>
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <span className="text-xs opacity-80">Items Sold</span>
                <span className="text-lg font-bold block">{totalItemsSold.toLocaleString()}</span>
              </div>
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <span className="text-xs opacity-80">Remaining</span>
                <span className="text-sm font-bold block">{formatCurrencyNGN(totalRemaining)}</span>
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="p-4 border-b bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Search reports..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 text-sm"
                />
              </div>
              
              {/* Shift Filter */}
              <Select
                value={filterShift}
                onValueChange={setFilterShift}
              >
                <SelectTrigger className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 focus:border-green-500 bg-white hover:border-gray-300 transition-colors text-sm">
                  <SelectValue placeholder="All Shifts" />
                </SelectTrigger>
                <SelectContent 
                  position="popper" 
                  side="bottom" 
                  sideOffset={4}
                  className="z-[60] w-[var(--radix-select-trigger-width)] max-h-[40vh] overflow-y-auto bg-white border border-gray-200 rounded-xl shadow-lg"
                  align="start"
                >
                  <SelectItem 
                    value="All" 
                    className="px-4 py-2.5 text-sm cursor-pointer hover:bg-green-50 focus:bg-green-50 focus:text-green-900 data-[highlighted]:bg-green-50 data-[highlighted]:text-green-900 rounded-lg mx-1 my-1"
                  >
                    All Shifts
                  </SelectItem>
                  <SelectItem 
                    value="morning" 
                    className="px-4 py-2.5 text-sm cursor-pointer hover:bg-green-50 focus:bg-green-50 focus:text-green-900 data-[highlighted]:bg-green-50 data-[highlighted]:text-green-900 rounded-lg mx-1 my-1"
                  >
                    🌅 Morning
                  </SelectItem>
                  <SelectItem 
                    value="night" 
                    className="px-4 py-2.5 text-sm cursor-pointer hover:bg-green-50 focus:bg-green-50 focus:text-green-900 data-[highlighted]:bg-green-50 data-[highlighted]:text-green-900 rounded-lg mx-1 my-1"
                  >
                    🌙 Night
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Export All Button */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => setShowDropdown(showDropdown === 'export-all' ? null : 'export-all')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-green-500 hover:bg-green-600 text-white rounded-xl transition-colors text-sm font-medium"
                >
                  <Download size={16} />
                  Export All
                  <ChevronDown size={16} className={cn("transition-transform", showDropdown === 'export-all' && "rotate-180")} />
                </button>
                
                {/* Export Dropdown */}
                {showDropdown === 'export-all' && (
                  <div className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-lg border border-gray-200 py-2 min-w-[160px] z-[70]">
                    <button
                      onClick={handleExportAll}
                      className="w-full px-4 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                    >
                      <FileText size={16} />
                      Export CSV
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Content - Scrollable Area */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <LoadingSkeleton />
            ) : filtered.length === 0 ? (
              <div className="text-center py-12">
                <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No sales reports found</h3>
                <p className="text-gray-500">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filtered.map((report) => (
                  <div
                    key={report.id}
                    className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition-shadow"
                  >
                    {/* Report Header */}
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                          <FileText className="text-white" size={16} />
                        </div>
                        <div>
                          <h3 className="text-sm font-semibold text-gray-900">
                            {report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} • {formatDate(report.report_date)}
                          </h3>
                          <p className="text-xs text-gray-500">
                            {formatTime(report.created_at)}
                          </p>
                        </div>
                      </div>
                      <span className="px-2 py-1 bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 rounded-full text-xs font-medium">
                        Completed
                      </span>
                    </div>

                    {/* Report Content - Two Column Grid */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Left Column - Key Metrics */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-2.5">
                            <p className="text-xs text-gray-600">Revenue</p>
                            <p className="text-sm font-bold text-green-600">{formatCurrencyNGN(report.total_revenue)}</p>
                          </div>
                          <div className="bg-gradient-to-br from-blue-50 to-cyan-50 rounded-lg p-2.5">
                            <p className="text-xs text-gray-600">Sold</p>
                            <p className="text-sm font-bold text-blue-600">{report.total_items_sold}</p>
                          </div>
                          <div className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-2.5">
                            <p className="text-xs text-gray-600">Remaining</p>
                            <p className="text-sm font-bold text-purple-600">{formatCurrencyNGN(report.total_remaining)}</p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar size={16} />
                          <span>{formatDate(report.report_date)}</span>
                          <Clock size={16} className="ml-4" />
                          <span>{formatTime(report.created_at)}</span>
                        </div>
                      </div>

                      {/* Right Column - Top Items & Actions */}
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs text-gray-600 mb-1.5">Top Items:</p>
                          <div className="flex flex-wrap gap-1.5">
                            {getTopItems(report.sales_data).slice(0, 2).map((item, index) => (
                              <span key={index} className="px-2 py-1 bg-gradient-to-r from-amber-100 to-yellow-100 text-amber-800 rounded-lg text-xs font-medium">
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
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleViewReport(report)}
                            className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                          >
                            <Eye size={16} />
                          </button>
                          
                          {/* Export Dropdown */}
                          <div className="relative dropdown-container">
                            <button
                              onClick={() => setShowDropdown(showDropdown === `export-${report.id}` ? null : `export-${report.id}`)}
                              className="p-2 text-gray-400 hover:text-green-500 hover:bg-green-50 rounded-lg transition-colors"
                            >
                              <Download size={16} />
                            </button>
                            
                            {showDropdown === `export-${report.id}` && (
                              <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[140px] z-[70]">
                                <button
                                  onClick={() => handleExportReport(report)}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                                >
                                  <FileText size={14} />
                                  Export CSV
                                </button>
                              </div>
                            )}
                          </div>
                          
                          {/* Share Dropdown */}
                          <div className="relative dropdown-container">
                            <button
                              onClick={() => setShowDropdown(showDropdown === `share-${report.id}` ? null : `share-${report.id}`)}
                              className="p-2 text-gray-400 hover:text-purple-500 hover:bg-purple-50 rounded-lg transition-colors"
                            >
                              <Share2 size={16} />
                            </button>
                            
                            {showDropdown === `share-${report.id}` && (
                              <div className="absolute top-full mt-1 right-0 bg-white rounded-lg shadow-lg border border-gray-200 py-2 min-w-[140px] z-[70]">
                                <button
                                  onClick={() => handleShare('whatsapp', report)}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                                >
                                  <MessageCircle size={14} />
                                  WhatsApp
                                </button>
                                <button
                                  onClick={() => handleShare('email', report)}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                                >
                                  <Mail size={14} />
                                  Email
                                </button>
                                <button
                                  onClick={() => handleShare('copy', report)}
                                  className="w-full px-3 py-2 text-left hover:bg-gray-50 flex items-center gap-2 text-sm"
                                >
                                  <Copy size={14} />
                                  Copy
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
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
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <DollarSign className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Total Revenue</p>
                  <p className="text-lg font-bold text-green-600">{formatCurrencyNGN(viewModalData.total_revenue)}</p>
                </div>
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <Package className="w-6 h-6 text-blue-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Items Sold</p>
                  <p className="text-lg font-bold text-blue-600">{viewModalData.total_items_sold}</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <Package className="w-6 h-6 text-purple-600 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Remaining Value</p>
                  <p className="text-lg font-bold text-purple-600">{formatCurrencyNGN(viewModalData.total_remaining)}</p>
                </div>
              </div>

              {/* Sales Data */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Sales Details</h4>
                <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {(viewModalData.sales_data || []).map((sale, index) => (
                    <div key={index} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{sale.breadType || 'Unknown'}</p>
                        <p className="text-sm text-gray-500">Qty: {sale.quantity} @ {formatCurrencyNGN(sale.unitPrice || 0)}</p>
                      </div>
                      <p className="font-semibold text-green-600">{formatCurrencyNGN(sale.totalAmount || 0)}</p>
                    </div>
                  ))}
                  {(!viewModalData.sales_data || viewModalData.sales_data.length === 0) && (
                    <div className="py-8 text-center text-gray-500">No sales data available</div>
                  )}
                </div>
              </div>

              {/* Remaining Breads */}
              <div>
                <h4 className="font-semibold text-gray-900 mb-3">Remaining Items</h4>
                <div className="divide-y divide-gray-100 max-h-48 overflow-y-auto">
                  {(viewModalData.remaining_breads || []).map((bread, index) => (
                    <div key={index} className="py-3 flex justify-between items-center">
                      <div>
                        <p className="font-medium text-gray-900">{bread.breadType || 'Unknown'}</p>
                        <p className="text-sm text-gray-500">Qty: {bread.quantity} @ {formatCurrencyNGN(bread.unitPrice || 0)}</p>
                      </div>
                      <p className="font-semibold text-purple-600">{formatCurrencyNGN(bread.totalAmount || 0)}</p>
                    </div>
                  ))}
                  {(!viewModalData.remaining_breads || viewModalData.remaining_breads.length === 0) && (
                    <div className="py-8 text-center text-gray-500">No remaining items</div>
                  )}
                </div>
              </div>

              {/* Feedback */}
              {viewModalData.feedback && (
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Feedback</h4>
                  <p className="text-gray-700 bg-gray-50 p-3 rounded-lg">{viewModalData.feedback}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </Modal>
    </>
  );
}