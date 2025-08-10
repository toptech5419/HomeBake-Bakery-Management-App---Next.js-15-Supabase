'use client';

import React from 'react';
import { ArrowLeft, Sun, Moon, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

interface PerformanceShiftSelectorClientProps {
  user: { id: string; email?: string };
  displayName: string;
}

export default function PerformanceShiftSelectorClient({ user, displayName }: PerformanceShiftSelectorClientProps) {
  const router = useRouter();

  const handleMorningPerformance = () => {
    router.push('/owner-dashboard/performance/morning');
  };

  const handleNightPerformance = () => {
    router.push('/owner-dashboard/performance/night');
  };

  const handleBackNavigation = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile-First Header with Back Button */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white">
        <div className="px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleBackNavigation}
              className="h-10 w-10 p-0 text-white hover:bg-white/20 rounded-xl touch-manipulation flex-shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="bg-white/20 p-2 sm:p-3 rounded-xl flex-shrink-0">
              <Users className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Performance Check</h1>
              <p className="text-green-100 text-xs sm:text-sm truncate">
                Choose shift performance • {displayName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Full Screen Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-green-50/30 to-emerald-50/30">
        <div className="px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
          
          {/* Welcome Section */}
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Choose Shift Performance
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Select which shift performance you want to check
            </p>
          </div>

          {/* Shift Selection Cards */}
          <div className="space-y-3 sm:space-y-4 max-w-md mx-auto">
            
            {/* Morning Shift Card */}
            <button
              onClick={handleMorningPerformance}
              className="w-full bg-gradient-to-r from-orange-100 to-amber-100 hover:from-orange-200 hover:to-amber-200 text-orange-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex items-center justify-center gap-3 sm:gap-4 transition-all duration-300 ease-in-out transform hover:scale-[1.02] shadow-sm hover:shadow-md touch-manipulation min-h-[64px] sm:min-h-[80px] border border-orange-200"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-orange-200 rounded-full flex items-center justify-center flex-shrink-0">
                <Sun size={20} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-base sm:text-lg mb-1">Morning Performance</h3>
              </div>
            </button>

            {/* Night Shift Card */}
            <button
              onClick={handleNightPerformance}
              className="w-full bg-gradient-to-r from-indigo-100 to-purple-100 hover:from-indigo-200 hover:to-purple-200 text-indigo-600 rounded-xl sm:rounded-2xl p-4 sm:p-6 flex items-center justify-center gap-3 sm:gap-4 transition-all duration-300 ease-in-out transform hover:scale-[1.02] shadow-sm hover:shadow-md touch-manipulation min-h-[64px] sm:min-h-[80px] border border-indigo-200"
            >
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-indigo-200 rounded-full flex items-center justify-center flex-shrink-0">
                <Moon size={20} />
              </div>
              <div className="text-left">
                <h3 className="font-semibold text-base sm:text-lg mb-1">Night Performance</h3>
              </div>
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}