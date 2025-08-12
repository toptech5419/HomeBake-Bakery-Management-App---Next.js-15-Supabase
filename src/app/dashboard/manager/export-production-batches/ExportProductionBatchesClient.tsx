'use client';

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, Search, Package, Clock, User, Download, 
  Share2, FileText, FileSpreadsheet, MessageSquare, Facebook, 
  Twitter, Mail, Check, X, RefreshCw, CheckSquare
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { getBatches } from '@/lib/batches/api-actions';
import { Batch } from '@/lib/batches/actions';
import { useShift } from '@/contexts/ShiftContext';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { motion } from 'framer-motion';
import { toast } from 'sonner';

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

export function ExportProductionBatchesClient({ userName }: ExportProductionBatchesClientProps) {
  const { currentShift } = useShift();
  const router = useRouter();
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [exporting, setExporting] = useState(false);

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
  const selectedQuantity = useMemo(() => {
    return filteredBatches
      .filter(batch => selectedBatches.includes(batch.id))
      .reduce((sum, batch) => sum + (batch.actual_quantity || 0), 0);
  }, [filteredBatches, selectedBatches]);
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
    <div className="min-h-screen flex flex-col w-full max-w-full overflow-x-hidden">
      {/* Mobile-First Header with Back Button */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white w-full">
        <div className="px-3 py-4 w-full max-w-full">
          <div className="flex items-center gap-3 w-full">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl touch-manipulation flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-white/20 p-2 rounded-xl flex-shrink-0">
              <Download className="h-5 w-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-base sm:text-lg font-bold truncate">Export Production</h1>
              <p className="text-blue-100 text-xs truncate">
                {currentShift?.charAt(0).toUpperCase() + currentShift?.slice(1)} • {userName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Full Screen Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-50/30 to-cyan-50/30 w-full">
        <div className="px-3 py-4 space-y-4 w-full max-w-full">
          
          {/* Summary Stats - Compact Grid */}
          <div className="grid grid-cols-2 gap-2 w-full">
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2.5 border border-blue-200/50 shadow-sm min-w-0">
              <div className="text-center">
                <div className="text-lg font-bold text-blue-600">{totalBatches}</div>
                <div className="text-xs text-gray-600 mt-0.5">Available</div>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2.5 border border-blue-200/50 shadow-sm min-w-0">
              <div className="text-center">
                <div className="text-lg font-bold text-green-600">{selectedBatches.length}</div>
                <div className="text-xs text-gray-600 mt-0.5">Selected</div>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2.5 border border-blue-200/50 shadow-sm min-w-0">
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">{selectedQuantity}</div>
                <div className="text-xs text-gray-600 mt-0.5">Units</div>
              </div>
            </div>
            <div className="bg-white/80 backdrop-blur-sm rounded-lg p-2.5 border border-blue-200/50 shadow-sm min-w-0">
              <div className="text-center">
                <div className="text-sm font-bold text-orange-600 truncate">{formatCurrencyNGN(selectedValue)}</div>
                <div className="text-xs text-gray-600 mt-0.5">Value</div>
              </div>
            </div>
          </div>

          {/* Search and Filter Controls - Mobile First */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 border border-blue-200/50 shadow-sm w-full">
            <div className="space-y-3 w-full">
              {/* Search Bar */}
              <div className="relative w-full">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-blue-400 h-4 w-4" />
                <Input
                  placeholder="Search batches..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2.5 text-sm border border-blue-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 focus:border-transparent bg-white/70 backdrop-blur-sm w-full"
                />
              </div>

              {/* Filter and Selection Controls */}
              <div className="flex flex-col gap-3 w-full">
                <div className="flex items-center gap-2 w-full">
                  <span className="text-sm font-medium text-gray-700 flex-shrink-0">Status:</span>
                  <div className="flex gap-1.5 flex-1">
                    {[
                      { value: 'all', label: 'All' },
                      { value: 'active', label: 'Active' },
                      { value: 'completed', label: 'Done' }
                    ].map((filter) => (
                      <button
                        key={filter.value}
                        onClick={() => setStatusFilter(filter.value)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 touch-manipulation min-h-[44px] flex-1 ${
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

                <div className="flex gap-2 w-full">
                  <button
                    onClick={handleSelectAll}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-xs text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors touch-manipulation min-h-[44px] flex-1"
                  >
                    <CheckSquare className="h-4 w-4" />
                    <span className="truncate">{selectedBatches.length === filteredBatches.length ? 'Deselect' : 'Select All'}</span>
                  </button>
                  {(searchTerm || statusFilter !== 'all' || selectedBatches.length > 0) && (
                    <button
                      onClick={clearFilters}
                      className="flex items-center justify-center gap-1 px-3 py-2 text-xs text-gray-600 hover:text-gray-800 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors touch-manipulation min-h-[44px] flex-1"
                    >
                      <X className="h-4 w-4" />
                      <span>Clear</span>
                    </button>
                  )}
                  <button
                    onClick={() => refetch()}
                    disabled={isLoading}
                    className="flex items-center justify-center gap-1 px-3 py-2 text-xs text-blue-600 hover:text-blue-800 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors touch-manipulation disabled:opacity-50 min-h-[44px] w-16 flex-shrink-0"
                  >
                    <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
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
              className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl p-4 border border-blue-200/50 shadow-sm w-full"
            >
              <div className="flex items-center gap-2 mb-4">
                <Share2 className="h-5 w-5 text-blue-600" />
                <h3 className="text-lg font-bold text-blue-800">Export Options</h3>
              </div>
              
              <div className="grid grid-cols-2 gap-3 w-full">
                {exportOptions.map((option, index) => (
                  <motion.button
                    key={option.label}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    onClick={option.action}
                    disabled={option.label.includes('Soon') || exporting}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl text-white transition-all duration-200 touch-manipulation hover:scale-105 min-h-[80px] justify-center ${option.color}`}
                  >
                    <option.icon className="h-5 w-5" />
                    <div className="text-center">
                      <div className="text-xs font-semibold truncate">{option.label}</div>
                    </div>
                  </motion.button>
                ))}
              </div>
              
              <div className="mt-4 text-center">
                <p className="text-xs text-blue-600 break-words">
                  {selectedBatches.length} batches • {selectedQuantity} units • {formatCurrencyNGN(selectedValue)}
                </p>
              </div>
            </motion.div>
          )}

          {/* Main Content - Batches List */}
          {isLoading ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 border border-blue-200/50 shadow-sm w-full">
              <div className="flex flex-col items-center justify-center">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
                <p className="mt-4 text-gray-600 text-sm">Loading production batches...</p>
              </div>
            </div>
          ) : error ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 border border-blue-200/50 shadow-sm w-full">
              <div className="flex flex-col items-center justify-center text-center">
                <div className="text-4xl mb-4">⚠️</div>
                <p className="text-red-600 text-lg mb-2">Error loading batches</p>
                <p className="text-gray-500 text-sm mb-4">Please try again</p>
                <Button onClick={() => refetch()} className="bg-blue-500 hover:bg-blue-600">
                  Retry
                </Button>
              </div>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl p-8 border border-blue-200/50 shadow-sm w-full">
              <div className="flex flex-col items-center justify-center text-center">
                <Package className="h-12 w-12 text-gray-400 mb-4" />
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
            <div className="space-y-3 w-full">
              {/* Batch Selection Cards - Mobile-First Design */}
              {filteredBatches.map((batch: BatchWithDetails, index) => (
                <motion.div
                  key={batch.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  onClick={() => handleSelectBatch(batch.id)}
                  className={`cursor-pointer bg-white/80 backdrop-blur-sm rounded-lg p-3 border transition-all duration-200 touch-manipulation hover:shadow-md w-full min-h-[60px] ${
                    selectedBatches.includes(batch.id)
                      ? 'border-blue-500 bg-blue-50/80 shadow-md'
                      : 'border-blue-200/50 shadow-sm hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3 w-full">
                    {/* Selection Checkbox */}
                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      selectedBatches.includes(batch.id)
                        ? 'border-blue-500 bg-blue-500'
                        : 'border-gray-300 hover:border-blue-400'
                    }`}>
                      {selectedBatches.includes(batch.id) && (
                        <Check className="w-3 h-3 text-white" />
                      )}
                    </div>

                    {/* Batch Icon */}
                    <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-md flex items-center justify-center flex-shrink-0">
                      <Package className="h-3 w-3 text-white" />
                    </div>

                    {/* Batch Details - Mobile Optimized */}
                    <div className="flex-1 min-w-0 w-full">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-semibold text-gray-900 truncate">
                            {batch.bread_type?.name || 'Unknown'}
                          </h4>
                          <div className="flex items-center gap-1 mt-0.5">
                            <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">
                              #{batch.batch_number.slice(-3)}
                            </span>
                            <Badge className={`${getStatusColor(batch.status)} text-xs px-1.5 py-0.5`} variant="outline">
                              {getStatusDisplay(batch.status)}
                            </Badge>
                          </div>
                        </div>
                      </div>
                      
                      {/* Mobile-optimized info */}
                      <div className="flex justify-between items-center text-xs text-gray-600 w-full">
                        <span>{batch.actual_quantity || 0} units</span>
                        <span className="text-orange-600 font-medium truncate ml-2">
                          {formatCurrencyNGN((batch.actual_quantity || 0) * (batch.bread_type?.unit_price || 0))}
                        </span>
                      </div>
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