'use client';

import React, { useState } from 'react';
import { X, Sun, Moon } from 'lucide-react';
import { MorningPerformanceCheckModal } from './MorningPerformanceCheckModal';
import { NightPerformanceCheckModal } from './NightPerformanceCheckModal';

interface PerformanceShiftSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PerformanceShiftSelectorModal({ isOpen, onClose }: PerformanceShiftSelectorModalProps) {
  const [showMorningModal, setShowMorningModal] = useState(false);
  const [showNightModal, setShowNightModal] = useState(false);

  if (!isOpen) return null;

  const handleOpenMorningModal = () => {
    setShowMorningModal(true);
  };

  const handleOpenNightModal = () => {
    setShowNightModal(true);
  };

  const handleCloseMorningModal = () => {
    setShowMorningModal(false);
  };

  const handleCloseNightModal = () => {
    setShowNightModal(false);
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
              Choose the shift performance check
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
              Select which shift performance you want to check
            </p>

            {/* Action Buttons */}
            <div className="space-y-3">
              {/* Morning Shift Button */}
              <button
                onClick={handleOpenMorningModal}
                className="w-full bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-xl p-4 flex items-center justify-center gap-3 transition-all duration-300 ease-in-out transform hover:scale-[1.02] font-semibold min-h-[44px] touch-manipulation"
              >
                <Sun size={20} />
                <span className="text-base">Morning</span>
              </button>

              {/* Night Shift Button */}
              <button
                onClick={handleOpenNightModal}
                className="w-full bg-orange-100 hover:bg-orange-200 text-orange-600 rounded-xl p-4 flex items-center justify-center gap-3 transition-all duration-300 ease-in-out transform hover:scale-[1.02] font-semibold min-h-[44px] touch-manipulation"
              >
                <Moon size={20} />
                <span className="text-base">Night</span>
              </button>

              {/* Cancel Button */}
              <button
                onClick={onClose}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl p-4 flex items-center justify-center transition-all duration-300 ease-in-out min-h-[44px] touch-manipulation mt-4 border border-gray-200"
              >
                <span className="font-medium text-base">Cancel</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Child Modals */}
      <MorningPerformanceCheckModal 
        isOpen={showMorningModal} 
        onClose={handleCloseMorningModal} 
      />
      
      <NightPerformanceCheckModal 
        isOpen={showNightModal} 
        onClose={handleCloseNightModal} 
      />
    </>
  );
}