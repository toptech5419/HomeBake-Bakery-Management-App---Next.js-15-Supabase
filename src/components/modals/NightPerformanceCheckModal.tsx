'use client';

import React from 'react';
import { X, Moon, Activity } from 'lucide-react';

interface NightPerformanceCheckModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NightPerformanceCheckModal({ isOpen, onClose }: NightPerformanceCheckModalProps) {
  if (!isOpen) return null;

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
          className="bg-white rounded-2xl w-full max-w-md mx-auto shadow-2xl transform transition-all duration-300 ease-in-out"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                <Moon size={20} className="text-purple-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                Night Performance Check
              </h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
              aria-label="Close modal"
            >
              <X size={20} className="text-gray-600" />
            </button>
          </div>

          {/* Modal Content - Stub Implementation */}
          <div className="p-6">
            <div className="text-center py-8">
              <Activity size={48} className="mx-auto mb-4 text-gray-300" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Coming Soon</h3>
              <p className="text-gray-600 mb-6">
                Night performance check functionality will be implemented here.
              </p>
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <p className="text-sm text-purple-800">
                  This modal will display night shift performance metrics including:
                  <br />• Production efficiency
                  <br />• Sales performance  
                  <br />• Staff productivity
                  <br />• Batch completion rates
                </p>
              </div>
            </div>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="w-full bg-purple-500 hover:bg-purple-600 text-white rounded-xl p-4 flex items-center justify-center transition-all duration-300 ease-in-out min-h-[44px] touch-manipulation font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </>
  );
}