'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Search, Package, Clock, User, Calendar, Download, 
  Share2, FileText, FileSpreadsheet, MessageSquare, Facebook, 
  Twitter, Mail, Check, X, RefreshCw, Filter, CheckSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { getBatches } from '@/lib/batches/api-actions';
import { Batch } from '@/lib/batches/actions';
import { useShift } from '@/contexts/ShiftContext';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';

interface ExportProductionBatchesClientProps {
  userId: string;
  userName: string;
  userRole: 'manager' | 'owner';
}

interface BatchWithDetails extends Batch {
  bread_type?: {
    name: string;
    unit_price: number;
  };
  created_by_user?: {
    name?: string;
  };
}

export function ExportProductionBatchesClient({ userId, userName, userRole }: ExportProductionBatchesClientProps) {
  const { currentShift } = useShift();
  const router = useRouter();
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [exporting, setExporting] = useState(false);
  const [showExportOptions, setShowExportOptions] = useState(false);

  // Fetch all batches with details and shift filtering
  const {
    data: batches = [],
    isLoading,
    error,
    refetch
  } = useQuery({
    queryKey: ['batches', 'all', 'export', currentShift],
    queryFn: () => getBatches(currentShift),
    staleTime: 30000, // 30 seconds
  });

  // Filter and search batches
  const filteredBatches = useMemo(() => {
    return (batches as BatchWithDetails[]).filter((batch: BatchWithDetails) => {
      const matchesSearch = searchTerm === '' || 
        batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.bread_type?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.created_by_user?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus = statusFilter === 'all' || batch.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [batches, searchTerm, statusFilter]);

  // Calculate summary stats
  const totalBatches = filteredBatches.length;
  const totalQuantity = useMemo(() => {
    return filteredBatches.reduce((sum, batch) => sum + (batch.actual_quantity || 0), 0);
  }, [filteredBatches]);
  const selectedQuantity = useMemo(() => {
    return filteredBatches
      .filter(batch => selectedBatches.includes(batch.id))
      .reduce((sum, batch) => sum + (batch.actual_quantity || 0), 0);
  }, [filteredBatches, selectedBatches]);
  const totalValue = useMemo(() => {
    return filteredBatches.reduce((sum, batch) => {
      const unitPrice = batch.bread_type?.unit_price || 0;
      const quantity = batch.actual_quantity || 0;
      return sum + (unitPrice * quantity);
    }, 0);
  }, [filteredBatches]);
  const selectedValue = useMemo(() => {
    return filteredBatches
      .filter(batch => selectedBatches.includes(batch.id))
      .reduce((sum, batch) => {
        const unitPrice = batch.bread_type?.unit_price || 0;
        const quantity = batch.actual_quantity || 0;
        return sum + (unitPrice * quantity);
      }, 0);
  }, [filteredBatches, selectedBatches]);

  // Handle select all/deselect all
  const handleSelectAll = () => {
    if (selectedBatches.length === filteredBatches.length) {
      setSelectedBatches([]);
    } else {
      setSelectedBatches(filteredBatches.map(batch => batch.id));
    }
  };

  // Handle individual batch selection
  const handleSelectBatch = (batchId: string) => {
    if (selectedBatches.includes(batchId)) {
      setSelectedBatches(selectedBatches.filter(id => id !== batchId));
    } else {
      setSelectedBatches([...selectedBatches, batchId]);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'active':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'cancelled':
        return 'bg-red-100 text-red-700 border-red-200';
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  // Get status display text
  const getStatusDisplay = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'active':
        return 'Active';
      case 'cancelled':
        return 'Cancelled';
      default:
        return 'Unknown';
    }
  };

  // Export functions
  const handleShareToWhatsApp = () => {
    if (selectedBatches.length === 0) {
      toast.error('Please select batches to export');
      return;
    }

    const selectedBatchData = filteredBatches.filter(batch => selectedBatches.includes(batch.id));
    const text = `🍞 HomeBake Production Report
📅 Date: ${new Date().toLocaleDateString()}
🌅 Shift: ${currentShift === 'morning' ? 'Morning' : 'Night'}
📦 Total Production: ${selectedQuantity} units
💰 Total Value: ${formatCurrencyNGN(selectedValue)}
🔢 Selected Batches: ${selectedBatches.length}

${selectedBatchData.map(batch => 
  `• ${batch.bread_type?.name || 'Unknown'} - ${batch.actual_quantity} units (${batch.status})`
).join('\n')}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    toast.success('Opening WhatsApp...');
  };

  const handleExportToCSV = () => {
    if (selectedBatches.length === 0) {
      toast.error('Please select batches to export');
      return;
    }

    const selectedBatchData = filteredBatches.filter(batch => selectedBatches.includes(batch.id));
    
    const csvContent = [
      ['HomeBake Production Report'],
      ['Date', new Date().toLocaleDateString()],
      ['Shift', currentShift === 'morning' ? 'Morning' : 'Night'],
      ['Total Production', selectedQuantity, 'units'],
      ['Total Value', selectedValue, 'NGN'],
      ['Selected Batches', selectedBatches.length],
      [''],
      ['Batch ID', 'Bread Type', 'Quantity', 'Unit Price', 'Total Value', 'Status', 'Manager', 'Created Date', 'Notes'],
      ...selectedBatchData.map(batch => [
        batch.batch_number,
        batch.bread_type?.name || 'Unknown',
        batch.actual_quantity || 0,
        batch.bread_type?.unit_price || 0,
        (batch.actual_quantity || 0) * (batch.bread_type?.unit_price || 0),
        batch.status,
        batch.created_by_user?.name || 'Unknown',
        new Date(batch.created_at).toLocaleDateString(),
        batch.notes || ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `homebake-production-export-${currentShift}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('CSV exported successfully!');
  };

  const handleExportToPDF = async () => {
    if (selectedBatches.length === 0) {
      toast.error('Please select batches to export');
      return;
    }

    setExporting(true);
    try {
      // For now, just log the action - PDF export can be implemented later
      console.log('Exporting to PDF:', selectedBatches);
      toast.success('PDF export functionality coming soon!');
    } catch (error) {
      console.error('Error exporting to PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setExporting(false);
    }
  };

  const handleShareToFacebook = () => {
    if (selectedBatches.length === 0) {
      toast.error('Please select batches to export');
      return;
    }

    const text = `🍞 HomeBake Production Report - ${currentShift === 'morning' ? 'Morning' : 'Night'} Shift - ${selectedQuantity} units produced today! 📦 Total Value: ${formatCurrencyNGN(selectedValue)}`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`, '_blank');
    toast.success('Opening Facebook...');
  };

  const handleShareToTwitter = () => {
    if (selectedBatches.length === 0) {
      toast.error('Please select batches to export');
      return;
    }

    const text = `🍞 HomeBake Production Report - ${currentShift === 'morning' ? 'Morning' : 'Night'} Shift - ${selectedQuantity} units produced today! 📦 ${formatCurrencyNGN(selectedValue)} #HomeBake #Production`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    toast.success('Opening Twitter...');
  };

  const handleShareViaEmail = () => {
    if (selectedBatches.length === 0) {
      toast.error('Please select batches to export');
      return;
    }

    const selectedBatchData = filteredBatches.filter(batch => selectedBatches.includes(batch.id));
    const subject = `HomeBake Production Report - ${currentShift === 'morning' ? 'Morning' : 'Night'} Shift - ${new Date().toLocaleDateString()}`;
    const body = `🍞 HomeBake Production Report

📅 Date: ${new Date().toLocaleDateString()}
🌅 Shift: ${currentShift === 'morning' ? 'Morning' : 'Night'}
📦 Total Production: ${selectedQuantity} units
💰 Total Value: ${formatCurrencyNGN(selectedValue)}
🔢 Selected Batches: ${selectedBatches.length}

Production Details:
${selectedBatchData.map(batch => 
  `• ${batch.bread_type?.name || 'Unknown'} - ${batch.actual_quantity} units (${batch.status}) - ${formatCurrencyNGN((batch.actual_quantity || 0) * (batch.bread_type?.unit_price || 0))}`
).join('\n')}

Generated from HomeBake Bakery Management System`;

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast.success('Opening email client...');
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('all');
    setSelectedBatches([]);
  };

  const exportOptions = [
    { 
      icon: FileSpreadsheet, 
      label: 'CSV Export', 
      color: 'bg-green-500 hover:bg-green-600', 
      action: handleExportToCSV,
      description: 'Download as spreadsheet'
    },
    { 
      icon: MessageSquare, 
      label: 'WhatsApp', 
      color: 'bg-green-600 hover:bg-green-700', 
      action: handleShareToWhatsApp,
      description: 'Share via WhatsApp'
    },
    { 
      icon: Mail, 
      label: 'Email', 
      color: 'bg-gray-600 hover:bg-gray-700', 
      action: handleShareViaEmail,
      description: 'Send via email'
    },
    { 
      icon: FileText, 
      label: 'PDF (Soon)', 
      color: 'bg-red-500 hover:bg-red-600 opacity-50 cursor-not-allowed', 
      action: handleExportToPDF,
      description: 'Coming soon'
    },
    { 
      icon: Facebook, 
      label: 'Facebook', 
      color: 'bg-blue-600 hover:bg-blue-700', 
      action: handleShareToFacebook,
      description: 'Share on Facebook'
    },
    { 
      icon: Twitter, 
      label: 'Twitter', 
      color: 'bg-blue-400 hover:bg-blue-500', 
      action: handleShareToTwitter,
      description: 'Share on Twitter'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile-First Header with Back Button */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
        <div className="px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl touch-manipulation flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-white/20 p-2 sm:p-3 rounded-xl flex-shrink-0">
              <Download className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Export Production Batches</h1>
              <p className="text-blue-100 text-xs sm:text-sm truncate">
                {currentShift?.charAt(0).toUpperCase() + currentShift?.slice(1)} Shift • {userName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Full Screen Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-50/30 to-cyan-50/30">
        <div className="px-3 sm:px-4 py-4 space-y-4 sm:space-y-6">
          
          {/* Summary Stats - Mobile First Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl p-3 sm:p-4 border border-blue-200/50 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg sm:text-xl lg:text-2xl font-display font-bold text-gray-900 truncate">{totalBatches}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Available</div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl p-3 sm:p-4 border border-blue-200/50 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-green-500 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <CheckSquare className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg sm:text-xl lg:text-2xl font-display font-bold text-gray-900 truncate">{selectedBatches.length}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Selected</div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl p-3 sm:p-4 border border-blue-200/50 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-lg sm:text-xl lg:text-2xl font-display font-bold text-gray-900 truncate">{selectedQuantity}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Units</div>
                </div>
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl p-3 sm:p-4 border border-blue-200/50 shadow-sm">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r from-orange-500 to-amber-500 rounded-lg flex items-center justify-center flex-shrink-0">
                  <Package className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-base sm:text-lg lg:text-xl font-display font-bold text-gray-900 truncate">{formatCurrencyNGN(selectedValue)}</div>
                  <div className="text-xs sm:text-sm text-gray-600">Value</div>
                </div>
              </div>
            </div>
          </div>

          {/* Search and Filter Controls - Mobile First */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl p-4 sm:p-6 border border-blue-200/50 shadow-sm">
            <div className="space-y-3 sm:space-y-4">
              {/* Search Bar */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 h-4 w-4 sm:h-5 sm:w-5" />
                <Input
                  placeholder="Search batches, bread types, managers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 sm:pl-12 pr-4 py-2 sm:py-3 text-sm sm:text-base border border-blue-200 rounded-lg sm:rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white/70 backdrop-blur-sm"
                />
              </div>

              {/* Filter and Selection Controls */}
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 sm:items-center">
                <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                  <span className="text-sm font-medium text-gray-700 whitespace-nowrap">Status:</span>
                  <div className="flex gap-1 sm:gap-2">
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'active', label: 'Active' },
                      { value: 'completed', label: 'Done' }
                    ].map((filter) => (
                      <button
                        key={filter.value}
                        onClick={() => setStatusFilter(filter.value)}
                        className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all duration-200 touch-manipulation ${
                          statusFilter === filter.value
                            ? 'bg-blue-500 text-white shadow-md'
                            : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                        }`}
                      >
                        {filter.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2 sm:gap-3 sm:ml-auto">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors touch-manipulation"
                  >
                    <CheckSquare className="h-3 w-3 sm:h-4 sm:w-4" />
                    {selectedBatches.length === filteredBatches.length ? 'Deselect All' : 'Select All'}
                  </button>
                  {(searchTerm || statusFilter !== 'all' || selectedBatches.length > 0) && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center gap-1 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors touch-manipulation"
                    >
                      <X className="h-3 w-3 sm:h-4 sm:w-4" />
                      Clear
                    </button>
                  )}
                  <button
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1 sm:py-1.5 text-xs sm:text-sm text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors touch-manipulation disabled:opacity-50"
                  >
                    <RefreshCw className={`h-3 w-3 sm:h-4 sm:w-4 ${isLoading ? 'animate-spin' : ''}`} />
                    <span className="hidden sm:inline">Refresh</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Export Options - Shown when batches are selected */}
          {selectedBatches.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl lg:rounded-2xl p-4 sm:p-6 border border-blue-200/50 shadow-sm"
            >
              <div className="flex items-center gap-2 sm:gap-3 mb-4">
                <Share2 className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                <h3 className="text-lg sm:text-xl font-bold text-blue-800">Export Options</h3>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
                {exportOptions.map((option, index) => (
                  <motion.button
                    key={option.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    onClick={option.action}
                    disabled={option.label.includes('Soon') || exporting}
                    className={`flex flex-col items-center gap-2 sm:gap-3 p-3 sm:p-4 rounded-xl text-white transition-all duration-200 touch-manipulation hover:scale-105 ${option.color}`}
                  >
                    <option.icon className="h-5 w-5 sm:h-6 sm:w-6" />
                    <div className="text-center">
                      <div className="text-xs sm:text-sm font-semibold">{option.label}</div>
                      <div className="text-xs opacity-90 mt-1 hidden sm:block">{option.description}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-xs sm:text-sm text-blue-600">
                  {selectedBatches.length} batches selected • {selectedQuantity} units • {formatCurrencyNGN(selectedValue)}
                </p>
              </div>
            </motion.div>
          )}

          {/* Main Content - Batches List */}
          {isLoading ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl p-8 sm:p-12 border border-blue-200/50 shadow-sm">
              <div className="flex flex-col items-center justify-center">
                <div className="h-10 w-10 sm:h-12 sm:w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-4 sm:mt-6 text-gray-600 text-sm sm:text-lg">Loading production batches...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl p-8 sm:p-12 border border-blue-200/50 shadow-sm">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="text-4xl sm:text-5xl mb-4">⚠️</div>
                <p className="text-red-600 text-lg mb-2">Error loading batches</p>
                <p className="text-gray-500 text-sm mb-4">Please try again</p>
                <Button onClick={() => refetch()} className="bg-blue-500 hover:bg-blue-600">
                  Retry
                </Button>
              </div>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl p-8 sm:p-12 border border-blue-200/50 shadow-sm">
              <div className="flex flex-col items-center justify-center text-center">
                <Package className="h-12 w-12 sm:h-16 sm:w-16 text-gray-400 mb-4" />
                <p className="text-gray-600 text-lg mb-2">No batches found</p>
                <p className="text-gray-500 text-sm">
                  {searchTerm || statusFilter !== 'all'
                    ? 'Try adjusting your search or filter criteria'
                    : 'No production batches recorded for this shift yet'
                  }
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-3 sm:space-y-4">
              {/* Batch Selection Cards - Mobile-First Design */}
              {filteredBatches.map((batch: BatchWithDetails, index) => (
                <motion.div
                  key={batch.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => handleSelectBatch(batch.id)}
                  className={`cursor-pointer bg-white/80 backdrop-blur-sm rounded-xl lg:rounded-2xl p-4 sm:p-6 border transition-all duration-200 touch-manipulation hover:shadow-md ${
                    selectedBatches.includes(batch.id)
                      ? 'border-blue-500 bg-blue-50/80 shadow-md'
                      : 'border-blue-200/50 shadow-sm hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3 sm:gap-4">
                    {/* Selection Checkbox */}
                    <div className={`w-5 h-5 sm:w-6 sm:h-6 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selectedBatches.includes(batch.id)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}>
                      {selectedBatches.includes(batch.id) && (
                        <Check className="w-3 h-3 sm:w-4 sm:h-4 text-white" />
                      )}
                    </div>

                    {/* Batch Icon */}
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Package className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                    </div>

                    {/* Batch Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 sm:gap-3 mb-1 sm:mb-2">
                        <h4 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                          {batch.bread_type?.name || 'Unknown'}
                        </h4>
                        <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full flex-shrink-0">
                          #{batch.batch_number}
                        </span>
                        <Badge className={`${getStatusColor(batch.status)} text-xs flex-shrink-0`} variant="outline">
                          {getStatusDisplay(batch.status)}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 mb-2">
                        <div className="flex items-center gap-1">
                          <Package className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>{batch.actual_quantity || 0} units</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="text-orange-600 font-medium">{formatCurrencyNGN((batch.actual_quantity || 0) * (batch.bread_type?.unit_price || 0))}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span>{new Date(batch.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-3 h-3 sm:w-4 sm:h-4 flex-shrink-0" />
                          <span className="truncate">{batch.created_by_user?.name || 'Unknown'}</span>
                        </div>
                      </div>

                      {batch.notes && (
                        <div className="text-xs sm:text-sm text-gray-600 truncate">
                          📝 {batch.notes}
                        </div>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}