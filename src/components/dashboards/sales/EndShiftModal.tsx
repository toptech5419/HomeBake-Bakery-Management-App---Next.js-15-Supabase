'use client';

import React from 'react';
import { Modal } from '@/components/ui/modal';
import { ModernButton } from '@/components/ui/modern-button';
import { AlertTriangle } from 'lucide-react';

interface EndShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function EndShiftModal({ isOpen, onClose, onConfirm }: EndShiftModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Are you sure you want to end shift?"
      className="sm:max-w-md"
    >
      <div className="space-y-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="h-6 w-6 text-red-600" />
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-600 leading-relaxed">
              This will clear all dashboard data except Production Target, Sales Target, 
              Sales Target Progress, and Remaining Target tabs. These tabs will continue 
              to update in real-time from production data.
            </p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <ModernButton
            variant="secondary"
            fullWidth
            onClick={onClose}
            className="hover-lift"
          >
            Back
          </ModernButton>
          <ModernButton
            variant="danger"
            fullWidth
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="hover-lift"
          >
            Confirm
          </ModernButton>
        </div>
      </div>
    </Modal>
  );
}
