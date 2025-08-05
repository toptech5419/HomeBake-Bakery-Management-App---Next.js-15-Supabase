'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { X, Download, Share2, FileText, FileSpreadsheet, MessageCircle, Facebook, Twitter, Mail, Calendar, Clock, User, Package, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { getBatches } from '@/lib/batches/api-actions';
import { Batch } from '@/lib/batches/actions';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase/client';
import { formatCurrencyNGN } from '@/lib/utils/currency';

interface ExportAllBatchesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentShift: 'morning' | 'night';
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

export function ExportAllBatchesModal({ isOpen, onClose, currentShift }: ExportAllBatchesModalProps) {
  const [selectedBatches, setSelectedBatches] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
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
    enabled: isOpen,
    staleTime: 30000, // 30 seconds
  });

  // Debug logging
  useEffect(() => {
    if (isOpen) {
      console.log('🔍 ExportAllBatchesModal opened');
      console.log('📊 Fetched batches for shift:', currentShift);
      console.log('📊 Fetched batches:', batches);
    }
  }, [isOpen, batches, currentShift]);

  // Filter and search batches
  const filteredBatches = useMemo(() => {
    return (batches as BatchWithDetails[]).filter((batch: BatchWithDetails) => {
      const matchesSearch = searchTerm === '' || 
        batch.batch_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.bread_type?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        batch.created_by_user?.name?.toLowerCase().includes(searchTerm.toLowerCase());

      return matchesSearch;
    });
  }, [batches, searchTerm]);

  // Handle modal close
  const handleClose = () => {
    setSearchTerm('');
    setSelectedBatches([]);
    onClose();
  };

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

  // Calculate total quantity of selected batches
  const totalQuantity = useMemo(() => {
    return filteredBatches
      .filter(batch => selectedBatches.includes(batch.id))
      .reduce((sum, batch) => sum + (batch.actual_quantity || 0), 0);
  }, [filteredBatches, selectedBatches]);

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

  // Export options
  const exportOptions = [
    { 
      icon: MessageCircle, 
      label: 'WhatsApp', 
      color: 'bg-green-500', 
      action: () => handleShareToWhatsApp() 
    },
    { 
      icon: FileText, 
      label: 'PDF', 
      color: 'bg-red-500', 
      action: () => handleExportToPDF() 
    },
    { 
      icon: FileSpreadsheet, 
      label: 'CSV', 
      color: 'bg-green-600', 
      action: () => handleExportToCSV() 
    },
    { 
      icon: Facebook, 
      label: 'Facebook', 
      color: 'bg-blue-600', 
      action: () => handleShareToFacebook() 
    },
    { 
      icon: Twitter, 
      label: 'Twitter', 
      color: 'bg-blue-400', 
      action: () => handleShareToTwitter() 
    },
    { 
      icon: Mail, 
      label: 'Email', 
      color: 'bg-gray-600', 
      action: () => handleShareViaEmail() 
    }
  ];

  // Share to WhatsApp
  const handleShareToWhatsApp = () => {
    if (selectedBatches.length === 0) {
      toast.error('Please select batches to export');
      return;
    }

    console.log('📱 Sharing to WhatsApp:', selectedBatches);
    const selectedBatchData = filteredBatches.filter(batch => selectedBatches.includes(batch.id));
    const text = `🍞 HomeBake Production Report
📅 Date: ${new Date().toLocaleDateString()}
🌅 Shift: ${currentShift === 'morning' ? 'Morning' : 'Night'}
📦 Total Production: ${totalQuantity} units
🔢 Selected Batches: ${selectedBatches.length}

${selectedBatchData.map(batch => 
  `• ${batch.bread_type?.name || 'Unknown'} - ${batch.actual_quantity} units (${batch.status})`
).join('\n')}`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
    toast.success('Opening WhatsApp...');
  };

  // Export to PDF
  const handleExportToPDF = async () => {
    if (selectedBatches.length === 0) {
      toast.error('Please select batches to export');
      return;
    }

    console.log('📄 Exporting to PDF:', selectedBatches);
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

  // Export to CSV
  const handleExportToCSV = () => {
    if (selectedBatches.length === 0) {
      toast.error('Please select batches to export');
      return;
    }

    console.log('📊 Exporting to CSV:', selectedBatches);
    const selectedBatchData = filteredBatches.filter(batch => selectedBatches.includes(batch.id));
    
    const csvContent = [
      ['HomeBake Production Report'],
      ['Date', new Date().toLocaleDateString()],
      ['Shift', currentShift === 'morning' ? 'Morning' : 'Night'],
      ['Total Production', totalQuantity, 'units'],
      ['Selected Batches', selectedBatches.length],
      [''],
      ['Batch ID', 'Bread Type', 'Quantity', 'Status', 'Manager', 'Created Date', 'Notes'],
      ...selectedBatchData.map(batch => [
        batch.batch_number,
        batch.bread_type?.name || 'Unknown',
        batch.actual_quantity || 0,
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
    a.download = `homebake-production-report-${currentShift}-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('CSV exported successfully!');
  };

  // Share to Facebook
  const handleShareToFacebook = () => {
    if (selectedBatches.length === 0) {
      toast.error('Please select batches to export');
      return;
    }

    const text = `🍞 HomeBake Production Report - ${currentShift === 'morning' ? 'Morning' : 'Night'} Shift - ${totalQuantity} units produced today! 📦`;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`, '_blank');
    toast.success('Opening Facebook...');
  };

  // Share to Twitter
  const handleShareToTwitter = () => {
    if (selectedBatches.length === 0) {
      toast.error('Please select batches to export');
      return;
    }

    const text = `🍞 HomeBake Production Report - ${currentShift === 'morning' ? 'Morning' : 'Night'} Shift - ${totalQuantity} units produced today! 📦 #HomeBake #Production`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}`, '_blank');
    toast.success('Opening Twitter...');
  };

  // Share via Email
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
📦 Total Production: ${totalQuantity} units
🔢 Selected Batches: ${selectedBatches.length}

Production Details:
${selectedBatchData.map(batch => 
  `• ${batch.bread_type?.name || 'Unknown'} - ${batch.actual_quantity} units (${batch.status})`
).join('\n')}

Generated from HomeBake Bakery Management System`;

    window.location.href = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    toast.success('Opening email client...');
  };

  // Save export to Supabase
  const saveExportToSupabase = async () => {
    if (selectedBatches.length === 0) return;

    try {
      const selectedBatchData = filteredBatches.filter(batch => selectedBatches.includes(batch.id));
      
      console.log('💾 Saving export to all_batches table:', {
        selectedBatches: selectedBatches.length,
        totalQuantity,
        batches: selectedBatchData.map(batch => ({
          id: batch.id,
          bread_type: batch.bread_type?.name,
          quantity: batch.actual_quantity,
          status: batch.status
        }))
      });
      
      // Save to all_batches table
      const { error } = await supabase
        .from('all_batches')
        .insert(
          selectedBatchData.map(batch => ({
            bread_type_id: batch.bread_type_id,
            batch_number: batch.batch_number,
            start_time: batch.start_time,
            end_time: batch.end_time,
            actual_quantity: batch.actual_quantity,
            status: batch.status,
            notes: batch.notes,
            created_by: batch.created_by,
            shift: currentShift, // Use currentShift prop
          }))
        );

      if (error) {
        console.error('Error saving export to Supabase:', error);
        // Don't throw error as this is not critical
      } else {
        console.log('✅ Export saved to all_batches table successfully');
      }
    } catch (error) {
      console.error('Error saving export:', error);
      // Don't throw error as this is not critical
    }
  };

  // Handle export selected
  const handleExportSelected = async () => {
    if (selectedBatches.length === 0) {
      toast.error('Please select batches to export');
      return;
    }

    setExporting(true);
    try {
      // Log export for debugging
      await saveExportToSupabase();
      
      // Export as CSV by default
      handleExportToCSV();
      
      toast.success(`Exported ${selectedBatches.length} batches successfully!`);
    } catch (error) {
      console.error('Error exporting batches:', error);
      toast.error('Failed to export batches');
    } finally {
      setExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-4xl max-h-[95vh] rounded-2xl shadow-2xl flex flex-col">
        
        {/* Compact Header with Quick Actions */}
        <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white p-4 flex-shrink-0 rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-lg">
                <Download className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold">Export Batches</h2>
                <div className="flex items-center gap-2 text-sm text-blue-100">
                  <span>{currentShift === 'morning' ? '🌅 Morning' : '🌙 Night'} Shift</span>
                  <span>•</span>
                  <span>{selectedBatches.length > 0 ? `${selectedBatches.length} selected` : `${filteredBatches.length} total`}</span>
                </div>
              </div>
            </div>
            
            {/* Quick Export Actions */}
            <div className="flex items-center gap-2">
              {selectedBatches.length > 0 && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={handleExportToCSV}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                    title="Quick CSV Export"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleShareToWhatsApp}
                    className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
                    title="Share to WhatsApp"
                  >
                    <MessageCircle className="h-4 w-4" />
                  </button>
                </div>
              )}
              <button
                onClick={handleClose}
                className="bg-white/20 hover:bg-white/30 p-2 rounded-lg transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Compact Search and Controls */}
        <div className="p-4 bg-gray-50 border-b flex-shrink-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Package className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search batches..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 h-10"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSelectAll}
                className="text-blue-500 text-sm font-medium hover:text-blue-600 whitespace-nowrap"
              >
                {selectedBatches.length === filteredBatches.length ? 'Deselect All' : 'Select All'}
              </button>
              {selectedBatches.length > 0 && (
                <div className="text-sm text-gray-600 bg-white px-2 py-1 rounded border">
                  {totalQuantity} units selected
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Primary Batch Selection Area - Maximum Space */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {isLoading ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"></div>
              <p className="mt-4 text-gray-600">Loading batches...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <div className="h-12 w-12 text-red-500 mb-4">⚠️</div>
              <p className="text-red-600 mb-2">Error loading batches</p>
              <Button onClick={() => refetch()} size="sm">Retry</Button>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center">
              <Package className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-600 mb-2">No batches found</p>
              <p className="text-gray-500 text-sm">
                {searchTerm ? 'Try adjusting your search' : 'Create batches to export'}
              </p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-2">
                {filteredBatches.map((batch: BatchWithDetails) => (
                  <div
                    key={batch.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-all hover:shadow-sm ${
                      selectedBatches.includes(batch.id)
                        ? 'border-blue-300 bg-blue-50 shadow-sm'
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => handleSelectBatch(batch.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900 truncate">
                            {batch.bread_type?.name || 'Unknown Bread'}
                          </span>
                          <span className="text-xs px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full">
                            #{batch.batch_number}
                          </span>
                          <Badge className={`text-xs px-2 py-0.5 ${getStatusColor(batch.status)}`}>
                            {getStatusDisplay(batch.status)}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-gray-500">
                          <span className="flex items-center gap-1">
                            <Package className="w-3 h-3" />
                            {batch.actual_quantity || 0} units
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {new Date(batch.created_at).toLocaleTimeString([], { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" />
                            {batch.created_by_user?.name || 'Unknown'}
                          </span>
                        </div>
                        {batch.notes && (
                          <div className="mt-1 text-xs text-gray-600 truncate">
                            📝 {batch.notes}
                          </div>
                        )}
                      </div>
                      <div className={`ml-3 w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                        selectedBatches.includes(batch.id)
                          ? 'border-blue-500 bg-blue-500'
                          : 'border-gray-300'
                      }`}>
                        {selectedBatches.includes(batch.id) && (
                          <Check className="w-3 h-3 text-white" />
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Compact Footer with Export Options */}
        <div className="flex-shrink-0 p-4 bg-gray-50 border-t rounded-b-2xl">
          {selectedBatches.length > 0 ? (
            <div className="space-y-3">
              {/* Export Format Selection */}
              <div className="flex items-center justify-center gap-2 flex-wrap">
                <button
                  onClick={handleExportToCSV}
                  className="flex items-center gap-2 px-3 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  CSV
                </button>
                <button
                  onClick={handleExportToPDF}
                  className="flex items-center gap-2 px-3 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors text-sm"
                >
                  <FileText className="w-4 h-4" />
                  PDF
                </button>
                <button
                  onClick={handleShareToWhatsApp}
                  className="flex items-center gap-2 px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                >
                  <MessageCircle className="w-4 h-4" />
                  WhatsApp
                </button>
                <button
                  onClick={handleShareViaEmail}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors text-sm"
                >
                  <Mail className="w-4 h-4" />
                  Email
                </button>
              </div>
              
              {/* Action buttons */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  onClick={handleClose}
                  className="flex-1"
                  size="sm"
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleExportSelected}
                  disabled={exporting}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-cyan-400 text-white hover:shadow-lg"
                  size="sm"
                >
                  {exporting ? (
                    <>
                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                      Exporting...
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4 mr-2" />
                      Export {selectedBatches.length} Batches
                    </>
                  )}
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-gray-500 text-sm mb-3">Select batches to enable export options</p>
              <Button
                variant="outline"
                onClick={handleClose}
                size="sm"
              >
                Close
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 