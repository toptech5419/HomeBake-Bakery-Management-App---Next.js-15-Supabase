'use client';

import React, { useState } from 'react';
import { X, FileText, UserCheck } from 'lucide-react';
import { OwnerManagerReportsModal } from './OwnerManagerReportsModal';
import { OwnerSalesReportsModal } from './OwnerSalesReportsModal';
import { useReportCounters } from '@/hooks/use-report-counters';

interface OwnerReportsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OwnerReportsModal({ isOpen, onClose }: OwnerReportsModalProps) {
  const [showManagerReports, setShowManagerReports] = useState(false);
  const [showSalesReports, setShowSalesReports] = useState(false);
  
  // Get counter data and functions
  const { managerCount, salesCount, markAsViewed } = useReportCounters();

  if (!isOpen) return null;

  const handleOpenManagerReports = () => {
    // Mark manager reports as viewed when clicked
    markAsViewed('manager');
    setShowManagerReports(true);
  };

  const handleOpenSalesReports = () => {
    // Mark sales reports as viewed when clicked
    markAsViewed('sales');
    setShowSalesReports(true);
  };

  const handleCloseManagerReports = () => {
    setShowManagerReports(false);
  };

  const handleCloseSalesReports = () => {
    setShowSalesReports(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 z-50 transition-opacity duration-300 ease-in-out"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-white rounded-2xl w-full max-w-sm mx-auto shadow-2xl transform transition-all duration-300 ease-in-out"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <h2 className="text-lg font-semibold text-gray-900">
              Choose Report Type
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 shadow-lg hover:shadow-xl bg-white border border-gray-200 hover:border-gray-300 backdrop-blur-sm"
              style={{
                background: 'linear-gradient(145deg, #ffffff, #f1f5f9)',
                boxShadow: '8px 8px 16px #d1d5db, -8px -8px 16px #ffffff'
              }}
              aria-label="Close modal"
            >
              <X size={20} className="text-gray-600 hover:text-gray-800 transition-colors duration-200" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            <p className="text-gray-600 text-center mb-6">
              Choose the role reports you wanna check
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Manager Reports Button */}
              <button
                onClick={handleOpenManagerReports}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-4 flex items-center justify-between transition-all duration-300 ease-in-out transform hover:scale-[1.02] shadow-lg hover:shadow-xl min-h-[44px] touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <FileText size={18} />
                  </div>
                  <span className="font-medium text-base">Manager</span>
                </div>
                {managerCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse shadow-lg">
                    {managerCount}
                  </span>
                )}
              </button>

              {/* Sales Rep Reports Button */}
              <button
                onClick={handleOpenSalesReports}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl p-4 flex items-center justify-between transition-all duration-300 ease-in-out transform hover:scale-[1.02] shadow-lg hover:shadow-xl min-h-[44px] touch-manipulation"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <UserCheck size={18} />
                  </div>
                  <span className="font-medium text-base">Sales Rep</span>
                </div>
                {salesCount > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold animate-pulse shadow-lg">
                    {salesCount}
                  </span>
                )}
              </button>

              {/* Cancel Button */}
              <button
                onClick={onClose}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl p-4 flex items-center justify-center transition-all duration-300 ease-in-out min-h-[44px] touch-manipulation mt-4"
              >
                <span className="font-medium text-base">Cancel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Child Modals */}
      <OwnerManagerReportsModal 
        isOpen={showManagerReports} 
        onClose={handleCloseManagerReports} 
      />
      
      <OwnerSalesReportsModal 
        isOpen={showSalesReports} 
        onClose={handleCloseSalesReports} 
      />
    </>
  );
}