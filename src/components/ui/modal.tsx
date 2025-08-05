'use client';

import * as React from 'react';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
  title?: string;
  className?: string;
  footer?: React.ReactNode;
}

export function Modal({ isOpen, onClose, children, title, className, footer }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm overflow-y-auto">
      <div className="min-h-full w-full flex items-start justify-center p-3 py-4 sm:p-4 sm:py-12">
        <div
          className={cn(
            'relative w-full max-w-lg rounded-lg border bg-white shadow-lg max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3rem)] flex flex-col',
            className
          )}
        >
          {/* Fixed Header */}
          <div className="flex items-start justify-between p-4 sm:p-6 pb-3 sm:pb-4 border-b border-gray-100 flex-shrink-0">
            {title && <h2 className="text-lg font-semibold text-gray-900 pr-8">{title}</h2>}
            <button
              onClick={onClose}
              className="absolute right-3 top-3 sm:right-4 sm:top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none z-10 p-1"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Close</span>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-3 sm:py-4">
            {children}
          </div>

          {/* Fixed Footer */}
          {footer && (
            <div className="p-4 sm:p-6 pt-3 sm:pt-4 border-t border-gray-100 flex-shrink-0 bg-white rounded-b-lg">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 