'use client';

import React, { useState } from 'react';
import { Plus, Minus } from 'lucide-react';

interface SimpleQuantityInputProps {
  initialValue: number;
  itemId: string;
  variant?: 'blue' | 'amber';
  onChange?: (itemId: string, value: number) => void;
}

export function SimpleQuantityInput({ 
  initialValue, 
  itemId,
  variant = 'blue',
  onChange
}: SimpleQuantityInputProps) {
  const [value, setValue] = useState(initialValue);

  const colorClasses = variant === 'blue' 
    ? 'focus:ring-blue-500 border-blue-200' 
    : 'focus:ring-amber-500 border-amber-200';

  const handleIncrement = () => {
    const newValue = value + 1;
    setValue(newValue);
    onChange?.(itemId, newValue);
  };

  const handleDecrement = () => {
    const newValue = Math.max(0, value - 1);
    setValue(newValue);
    onChange?.(itemId, newValue);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(e.target.value) || 0;
    const safeValue = Math.max(0, newValue);
    setValue(safeValue);
    onChange?.(itemId, safeValue);
  };

  return (
    <div className="flex items-center gap-3 sm:gap-3 justify-center sm:justify-end">
      <button
        type="button"
        onClick={handleDecrement}
        className="h-12 w-12 sm:h-12 sm:w-12 p-0 rounded-full border border-gray-200 bg-white hover:bg-red-50 hover:border-red-200 transition-colors touch-manipulation flex-shrink-0 flex items-center justify-center shadow-sm hover:shadow-md active:scale-95"
        aria-label="Decrease quantity by 1"
        title="Decrease quantity"
      >
        <Minus className="h-5 w-5 sm:h-5 sm:w-5 text-gray-600" />
      </button>
      
      <input
        type="number"
        min="0"
        value={value || ''}
        onChange={handleInputChange}
        id={`simple-quantity-${itemId}`}
        name={`simple-quantity-${itemId}`}
        className={`w-20 sm:w-24 h-12 sm:h-12 text-center border rounded-lg sm:rounded-xl px-3 sm:px-3 py-2 font-semibold focus:border-transparent transition-all text-base sm:text-base touch-manipulation focus:ring-2 focus:outline-none ${colorClasses}`}
        placeholder="0"
        autoComplete="off"
      />
      
      <button
        type="button"
        onClick={handleIncrement}
        className="h-12 w-12 sm:h-12 sm:w-12 p-0 rounded-full border border-gray-200 bg-white hover:bg-green-50 hover:border-green-200 transition-colors touch-manipulation flex-shrink-0 flex items-center justify-center shadow-sm hover:shadow-md active:scale-95"
        aria-label="Increase quantity by 1"
        title="Increase quantity"
      >
        <Plus className="h-5 w-5 sm:h-5 sm:w-5 text-gray-600" />
      </button>
    </div>
  );
}