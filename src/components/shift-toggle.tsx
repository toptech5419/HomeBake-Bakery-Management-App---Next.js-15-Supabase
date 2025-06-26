'use client';

import { useShift } from '@/hooks/use-shift';
import { Badge } from '@/components/ui/badge';

export function ShiftToggle() {
  const { shift, setShift } = useShift();

  return (
    <div className="flex items-center space-x-2">
      <button
        type="button"
        className={`px-4 py-2 rounded-l-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-colors ${
          shift === 'morning'
            ? 'bg-orange-100 text-orange-800 border-orange-400'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
        aria-pressed={shift === 'morning'}
        onClick={() => setShift('morning')}
      >
        ☀ Morning
      </button>
      <button
        type="button"
        className={`px-4 py-2 rounded-r-md border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium transition-colors ${
          shift === 'night'
            ? 'bg-indigo-100 text-indigo-800 border-indigo-400'
            : 'bg-white text-gray-700 hover:bg-gray-50'
        }`}
        aria-pressed={shift === 'night'}
        onClick={() => setShift('night')}
      >
        🌙 Night
      </button>
      <Badge color={shift === 'morning' ? 'morning' : 'night'} className="ml-2">
        {shift === 'morning' ? 'Morning' : 'Night'}
      </Badge>
    </div>
  );
} 