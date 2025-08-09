'use client';

import React from 'react';
import { X, MessageSquare } from 'lucide-react';
import { formatCurrencyNGN } from '@/lib/utils/currency';

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
  feedback?: string;
}

interface FinalReportViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  reportData: ReportData | null;
  userName?: string;
  reportDate?: string;
}

export function FinalReportViewModal({ 
  isOpen, 
  onClose, 
  reportData, 
  userName = 'User',
  reportDate 
}: FinalReportViewModalProps) {

  if (!isOpen || !reportData) return null;

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-60 z-50 transition-opacity duration-300 ease-in-out backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
        <div 
          className="bg-white rounded-2xl w-full max-w-4xl mx-auto shadow-2xl transform transition-all duration-300 ease-in-out max-h-[95vh] flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header - Fixed */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-t-2xl flex-shrink-0">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="bg-white/20 p-3 rounded-xl">
                    <span className="text-lg">📊</span>
                  </div>
                  <div>
                    <h2 className="text-xl sm:text-2xl font-bold">Final Report</h2>
                    <div className="text-sm text-white/90 capitalize">
                      {reportData.shift || 'Unknown'} Shift • {reportDate || 'Unknown Date'} • {userName}
                    </div>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/20 rounded-full transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl bg-white/10 backdrop-blur-sm touch-manipulation"
                  aria-label="Close modal"
                >
                  <X size={20} className="text-white" />
                </button>
              </div>
            </div>
          </div>

          {/* Modal Content - Scrollable */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 space-y-6">
              
              {/* Summary Cards */}
              <div className="space-y-4">
                {/* Revenue Card - Hero Style */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200 shadow-sm">
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-lg">💰</span>
                      </div>
                      <span className="text-lg font-bold text-green-700">Total Revenue</span>
                    </div>
                    <div className="text-3xl sm:text-4xl font-bold text-green-800 mb-2">
                      {formatCurrencyNGN(reportData.totalRevenue)}
                    </div>
                  </div>
                </div>
                
                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Items Sold */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 border border-blue-200 text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="text-xl sm:text-2xl">📦</span>
                    </div>
                    <div className="text-2xl sm:text-3xl font-bold text-blue-800 mb-2">
                      {reportData.totalItemsSold}
                    </div>
                    <div className="text-sm font-semibold text-blue-600">Items Sold</div>
                  </div>
                  
                  {/* Remaining Value */}
                  <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl p-4 sm:p-6 border border-amber-200 text-center">
                    <div className="flex items-center justify-center gap-2 mb-3">
                      <span className="text-xl sm:text-2xl">🍞</span>
                    </div>
                    <div className="text-xl sm:text-2xl font-bold text-amber-800 mb-2">
                      {formatCurrencyNGN(reportData.totalRemaining)}
                    </div>
                    <div className="text-sm font-semibold text-amber-600">Remaining</div>
                  </div>
                </div>
              </div>

              {/* Sales Records */}
              {reportData.salesRecords.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                      <span className="text-sm">💳</span>
                    </div>
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Sales ({reportData.salesRecords.length})</h3>
                  </div>
                  
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    {reportData.salesRecords.map((sale, index) => (
                      <div key={index} className="flex justify-between items-center p-4 border-b border-gray-100 last:border-b-0 touch-manipulation min-h-[72px]">
                        <div className="flex-1 min-w-0">
                          <div className="text-base font-bold text-gray-900 truncate">{sale.breadType}</div>
                          <div className="text-sm text-gray-500 mt-1">
                            {sale.quantity} units • {new Date(sale.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                        <div className="text-base font-bold text-green-600 ml-3 flex-shrink-0">
                          {formatCurrencyNGN(sale.totalAmount)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Remaining Inventory */}
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-6 h-6 bg-gray-100 rounded flex items-center justify-center">
                    <span className="text-sm">📋</span>
                  </div>
                  <h3 className="text-lg sm:text-xl font-bold text-gray-900">Remaining Stock</h3>
                </div>
                
                {(() => {
                  const filteredBreads = reportData.remainingBreads.filter(bread => bread.quantity > 0);
                  if (filteredBreads.length > 0) {
                    return (
                      <div className="bg-amber-50 rounded-xl border border-amber-200 overflow-hidden">
                        {filteredBreads.map((bread, index) => (
                          <div key={index} className="flex justify-between items-center p-4 border-b border-amber-100 last:border-b-0 touch-manipulation min-h-[72px]">
                            <div className="flex-1 min-w-0">
                              <div className="text-base font-bold text-gray-900 truncate">{bread.breadType}</div>
                              <div className="text-sm text-amber-600 mt-1">{bread.quantity} left</div>
                            </div>
                            <div className="text-base font-bold text-amber-700 ml-3 flex-shrink-0">
                              {formatCurrencyNGN(bread.totalAmount)}
                            </div>
                          </div>
                        ))}
                      </div>
                    );
                  } else {
                    return (
                      <div className="bg-green-50 rounded-xl border border-green-200 p-6 text-center">
                        <div className="text-green-600 text-base font-medium">✅ All items sold out!</div>
                      </div>
                    );
                  }
                })()}
              </div>

              {/* Feedback */}
              {reportData.feedback && (
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <MessageSquare className="w-6 h-6 text-gray-600" />
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900">Feedback</h3>
                  </div>
                  
                  <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-700">{userName}</span>
                      <span className="text-sm text-gray-500">{reportDate}</span>
                    </div>
                    <div className="text-base text-gray-800">
                      {reportData.feedback}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </>
  );
}