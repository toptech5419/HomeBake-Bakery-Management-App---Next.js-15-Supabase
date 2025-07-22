'use client';

import React from 'react';
import { X, Download, Share2, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrencyNGN } from '@/lib/utils/currency';
import { useShift } from '@/contexts/ShiftContext';

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
  }>;
  feedback?: string;
  totalRevenue: number;
  totalItemsSold: number;
  totalRemaining: number;
}

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: ReportData;
  onExport: (format: 'csv' | 'pdf') => void;
  onShare: () => void;
}

export function ReportModal({ isOpen, onClose, reportData, onExport, onShare }: ReportModalProps) {
  const { currentShift } = useShift();

  if (!isOpen) return null;

  const handleExportCSV = () => {
    onExport('csv');
  };

  const handleExportPDF = () => {
    onExport('pdf');
  };

  const handleShare = () => {
    onShare();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50">
      <div className="h-full w-full md:flex md:items-center md:justify-center md:p-4">
        <div className="bg-white h-full w-full md:h-auto md:max-h-[90vh] md:w-full md:max-w-4xl md:rounded-2xl shadow-2xl flex flex-col">
          
          {/* Header */}
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white p-6 flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="bg-white/20 p-3 rounded-xl">
                  <FileText className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Shift Report Summary</h2>
                  <p className="text-green-100 text-sm">
                    {currentShift.charAt(0).toUpperCase() + currentShift.slice(1)} Shift - Completed
                  </p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6 space-y-6">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-green-800">Total Revenue</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-900">
                      {formatCurrencyNGN(reportData.totalRevenue)}
                    </div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-blue-50 to-cyan-50 border-blue-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-blue-800">Items Sold</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-900">{reportData.totalItemsSold}</div>
                  </CardContent>
                </Card>

                <Card className="bg-gradient-to-br from-yellow-50 to-amber-50 border-yellow-200">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium text-yellow-800">Remaining</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-900">{reportData.totalRemaining}</div>
                  </CardContent>
                </Card>
              </div>

              {/* Sales Records */}
              {reportData.salesRecords.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-3">Sales Records ({reportData.salesRecords.length})</h3>
                  <div className="space-y-2">
                    {reportData.salesRecords.map((record, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                        <div>
                          <p className="font-medium">{record.breadType}</p>
                          <p className="text-sm text-gray-600">
                            {new Date(record.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold">{record.quantity} units</p>
                          <p className="text-sm text-gray-600">{formatCurrencyNGN(record.totalAmount)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remaining Breads */}
              {reportData.remainingBreads.length > 0 && (
                <div>
                  <h3 className="text-lg font-bold mb-3">Remaining Breads ({reportData.remainingBreads.length})</h3>
                  <div className="space-y-2">
                    {reportData.remainingBreads.map((item, index) => (
                      <div key={index} className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                        <div>
                          <p className="font-medium">{item.breadType}</p>
                          <p className="text-sm text-gray-600">Remaining quantity</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-yellow-700">{item.quantity} units</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Feedback */}
              {reportData.feedback && (
                <div>
                  <h3 className="text-lg font-bold mb-3">Feedback</h3>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <p className="text-gray-700">{reportData.feedback}</p>
                  </div>
                </div>
              )}

              {/* Export Options */}
              <div className="border-t pt-6">
                <h3 className="text-lg font-bold mb-4">Export & Share</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleExportCSV}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export CSV
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleExportPDF}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Export PDF
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={handleShare}
                  >
                    <Share2 className="mr-2 h-4 w-4" />
                    Share Report
                  </Button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 bg-gray-50 border-t flex-shrink-0">
            <Button
              onClick={onClose}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600"
            >
              Close Report
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
