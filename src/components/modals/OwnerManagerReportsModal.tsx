'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  BarChart3, 
  Package, 
  Search, 
  Filter, 
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
  Twitter,
  Facebook,
  Copy
} from 'lucide-react';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import { cn } from '@/lib/utils';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Modal } from '@/components/ui/modal';
import { Card } from '@/components/ui/card';

// Types matching the manager reports structure
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
  bread_types: { name: string } | { name: string }[] | null;
  users: { name: string } | { name: string }[] | null;
}

interface GroupedReport {
  id: string;
  date: string;
  shift: string;
  batches: BatchData[];
  manager: string;
  breadTypes: string[];
  totalBatches: number;
  totalUnits: number;
  status: string;
  latestEndTime: string;
}

interface OwnerManagerReportsModalProps {
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

export function OwnerManagerReportsModal({ isOpen, onClose }: OwnerManagerReportsModalProps) {
  const [loading, setLoading] = useState(true);
  const [groupedReports, setGroupedReports] = useState<GroupedReport[]>([]);
  const [search, setSearch] = useState('');
  const [filterShift, setFilterShift] = useState('All');
  const [showDropdown, setShowDropdown] = useState<string | null>(null);
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [viewModalBatches, setViewModalBatches] = useState<BatchData[]>([]);
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
      const { data: batches, error } = await supabase
        .from('all_batches')
        .select(`
          id, bread_type_id, batch_number, start_time, end_time, actual_quantity, 
          status, shift, created_by, 
          bread_types (name), 
          users:created_by (name)
        `)
        .order('start_time', { ascending: false });

      if (error) {
        setGroupedReports([]);
        setLoading(false);
        return;
      }

      // Group by date+shift
      const groups: Record<string, any> = {};
      for (const batch of batches || []) {
        const date = batch.start_time ? batch.start_time.split('T')[0] : 'unknown';
        const shift = batch.shift;
        const key = `${date}-${shift}`;
        
        if (!groups[key]) {
          groups[key] = {
            id: key,
            date,
            shift,
            batches: [],
            manager: getName(batch.users),
            breadTypes: new Set(),
            totalUnits: 0,
            endTimes: [],
            statuses: []
          };
        }
        
        groups[key].batches.push(batch);
        const breadTypeName = getName(batch.bread_types);
        if (breadTypeName && breadTypeName !== 'Unknown') {
          groups[key].breadTypes.add(breadTypeName);
        }
        if (batch.end_time) groups[key].endTimes.push(batch.end_time);
        groups[key].statuses.push(batch.status);
        groups[key].totalUnits += batch.actual_quantity || 0;
      }

      // Convert to array with calculated fields
      const arr = Object.values(groups).map((g: any) => {
        const allCompleted = g.statuses.every((s: string) => s === 'completed');
        return {
          ...g,
          totalBatches: g.batches.length,
          status: allCompleted ? 'Completed' : 'In Progress',
          latestEndTime: g.endTimes.length > 0 ? g.endTimes.sort().slice(-1)[0] : '',
          breadTypes: Array.from(g.breadTypes),
        };
      });

      setGroupedReports(arr);
    } catch (error) {
      console.error('Error fetching reports:', error);
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
      ['Batch Number', 'Bread Type', 'Quantity', 'Status', 'Start Time', 'End Time'],
      ...report.batches.map(batch => [
        batch.batch_number,
        getName(batch.bread_types),
        batch.actual_quantity,
        batch.status,
        formatDate(batch.start_time),
        batch.end_time ? formatTime(batch.end_time) : 'N/A'
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
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`, '_blank');
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
    setShowDropdown(null); // Close any open dropdowns
    setViewModalBatches(report.batches);
    setViewModalTitle(`${formatDate(report.date)} - ${report.shift.charAt(0).toUpperCase() + report.shift.slice(1)} Shift`);
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
          {/* Header */}
          <div className="bg-gradient-to-r from-blue-500 to-cyan-400 text-white p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                  <BarChart3 size={20} />
                </div>
                <div>
                  <h2 className="text-lg sm:text-xl font-bold">Manager Reports</h2>
                  <p className="text-sm opacity-90">Production reports and analytics</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-xl flex items-center justify-center transition-all duration-200 backdrop-blur-sm border border-white/20 hover:scale-105 shadow-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            {/* Summary Cards */}
            <div className="grid grid-cols-3 gap-3 mt-4">
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <span className="text-xs opacity-80">Total Reports</span>
                <span className="text-lg font-bold block">{totalReports}</span>
              </div>
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <span className="text-xs opacity-80">Completed</span>
                <span className="text-lg font-bold block">{completedReports}</span>
              </div>
              <div className="bg-white/10 rounded-xl p-3 backdrop-blur-sm">
                <span className="text-xs opacity-80">Production</span>
                <span className="text-lg font-bold block">{totalProduction.toLocaleString()}</span>
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
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
                />
              </div>
              
              {/* Shift Filter */}
              <Select
                value={filterShift}
                onValueChange={setFilterShift}
              >
                <SelectTrigger className="w-full h-11 px-4 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white hover:border-gray-300 transition-colors text-sm">
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
                    className="px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 focus:bg-blue-50 focus:text-blue-900 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-900 rounded-lg mx-1 my-1"
                  >
                    All Shifts
                  </SelectItem>
                  <SelectItem 
                    value="morning" 
                    className="px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 focus:bg-blue-50 focus:text-blue-900 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-900 rounded-lg mx-1 my-1"
                  >
                    🌅 Morning
                  </SelectItem>
                  <SelectItem 
                    value="night" 
                    className="px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 focus:bg-blue-50 focus:text-blue-900 data-[highlighted]:bg-blue-50 data-[highlighted]:text-blue-900 rounded-lg mx-1 my-1"
                  >
                    🌙 Night
                  </SelectItem>
                </SelectContent>
              </Select>
              
              {/* Export All Button */}
              <div className="relative dropdown-container">
                <button
                  onClick={() => setShowDropdown(showDropdown === 'export-all' ? null : 'export-all')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white rounded-xl transition-colors text-sm font-medium"
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
                <BarChart3 className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-600 mb-2">No reports found</h3>
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
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs">
                          {report.id}
                        </span>
                        {report.status === 'Completed' && (
                          <span className={cn("px-2 py-1 rounded-full text-xs", getStatusColor(report.status))}>
                            {report.status}
                          </span>
                        )}
                        <span className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">
                          {report.shift.charAt(0).toUpperCase() + report.shift.slice(1)}
                        </span>
                      </div>
                    </div>

                    {/* Report Content */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {/* Left Column */}
                      <div className="space-y-3">
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Calendar size={16} />
                          <span>{formatDate(report.date)}</span>
                          <Clock size={16} className="ml-4" />
                          <span>{formatTime(report.latestEndTime)}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <User size={16} />
                          <span>{report.manager}</span>
                        </div>
                        
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Package size={16} />
                          <span className="font-medium">{report.totalBatches}</span>
                          <span>batches</span>
                          <BarChart3 size={16} className="ml-4" />
                          <span className="font-medium">{report.totalUnits}</span>
                          <span>units</span>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-3">
                        <div className="flex flex-wrap gap-2">
                          {report.breadTypes.map((breadType: string, i: number) => (
                            <span key={i} className="px-2 py-1 bg-blue-50 text-blue-600 rounded-full text-xs">
                              {breadType}
                            </span>
                          ))}
                        </div>
                        
                        {/* Action Buttons */}
                        <div className="flex gap-2">
                          <button 
                            onClick={() => handleViewReport(report)}
                            className="p-2 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
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

      {/* Batch Details Modal */}
      <Modal isOpen={viewModalOpen} onClose={() => setViewModalOpen(false)} title={viewModalTitle}>
        <div className="space-y-4">
          {viewModalBatches.length === 0 ? (
            <div className="text-center text-gray-500 py-8">No batches in this report.</div>
          ) : (
            <div className="divide-y divide-gray-100">
              {viewModalBatches.map((batch) => (
                <Card key={batch.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 shadow-none border-0 bg-gray-50">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-gray-900">#{batch.batch_number}</span>
                      <span className="text-xs px-2 py-1 bg-blue-50 text-blue-600 rounded-full">
                        {getName(batch.bread_types) || 'Unknown Bread'}
                      </span>
                      <span className={cn("text-xs px-2 py-1 rounded-full", getStatusColor(batch.status))}>
                        {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                      </span>
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
    </>
  );
}