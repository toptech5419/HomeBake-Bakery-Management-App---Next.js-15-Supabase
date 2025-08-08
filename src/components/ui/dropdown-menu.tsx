"use client";

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface DropdownMenuItem {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'default' | 'danger' | 'warning' | 'success';
  disabled?: boolean;
}

interface DropdownMenuProps {
  trigger: React.ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right';
  disabled?: boolean;
}

export function DropdownMenu({ 
  trigger, 
  items, 
  align = 'right',
  disabled = false 
}: DropdownMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const handleItemClick = (item: DropdownMenuItem) => {
    if (!item.disabled) {
      item.onClick();
      setIsOpen(false);
    }
  };

  const getVariantStyles = (variant: DropdownMenuItem['variant']) => {
    switch (variant) {
      case 'danger':
        return 'text-red-600 hover:bg-red-50 hover:text-red-700';
      case 'warning':
        return 'text-amber-600 hover:bg-amber-50 hover:text-amber-700';
      case 'success':
        return 'text-green-600 hover:bg-green-50 hover:text-green-700';
      default:
        return 'text-gray-700 hover:bg-gray-100 hover:text-gray-900';
    }
  };

  return (
    <div className={`relative inline-block text-left ${isOpen ? 'z-50' : ''}`} ref={dropdownRef}>
      <div>
        <button
          type="button"
          onClick={() => !disabled && setIsOpen(!isOpen)}
          disabled={disabled}
          className={`inline-flex items-center justify-center w-full rounded-lg p-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 ${
            disabled 
              ? 'opacity-50 cursor-not-allowed' 
              : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
          }`}
        >
          {trigger}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            className={`absolute mt-2 w-56 origin-top-${align} rounded-xl bg-white shadow-lg ring-1 ring-black ring-opacity-5 backdrop-blur-xl ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
            style={{
              zIndex: 9999,
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04), 0 0 0 1px rgba(0, 0, 0, 0.05)'
            }}
          >
            <div className="py-2">
              {items.map((item, index) => (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  onClick={() => handleItemClick(item)}
                  disabled={item.disabled}
                  className={`group flex w-full items-center px-4 py-3 text-sm transition-all duration-200 ${
                    item.disabled 
                      ? 'opacity-50 cursor-not-allowed' 
                      : getVariantStyles(item.variant)
                  }`}
                >
                  <div className="mr-3 flex-shrink-0">
                    {item.icon}
                  </div>
                  <span className="truncate">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Export individual trigger components for convenience
export function DropdownTrigger({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`inline-flex items-center justify-center ${className}`}>
      {children}
    </div>
  );
}