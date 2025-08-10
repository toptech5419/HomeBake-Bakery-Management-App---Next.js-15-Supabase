'use client';

import React from 'react';
import { ArrowLeft, FileText, UserCheck, TrendingUp } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useReportCounters } from '@/hooks/use-report-counters';

interface OwnerReportsClientProps {
  user: { id: string; email?: string };
  displayName: string;
}

export default function OwnerReportsClient({ user, displayName }: OwnerReportsClientProps) {
  const router = useRouter();
  const { managerCount, salesCount, markAsViewed } = useReportCounters();

  const handleManagerReports = () => {
    markAsViewed('manager');
    router.push('/owner-dashboard/reports/manager');
  };

  const handleSalesReports = () => {
    markAsViewed('sales');
    router.push('/owner-dashboard/reports/sales');
  };

  const handleBackNavigation = () => {
    router.back();
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Mobile-First Header with Back Button */}
      <div className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white">
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
              <TrendingUp className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg sm:text-2xl font-bold truncate">Reports</h1>
              <p className="text-blue-100 text-xs sm:text-sm truncate">
                Choose report type • {displayName}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area - Full Screen Scrollable */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-blue-50/30 to-cyan-50/30">
        <div className="px-3 sm:px-4 py-6 sm:py-8 space-y-6 sm:space-y-8">
          
          {/* Welcome Section */}
          <div className="text-center">
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">
              Choose Report Type
            </h2>
            <p className="text-gray-600 text-sm sm:text-base">
              Select the role reports you want to check
            </p>
          </div>

          {/* Report Type Cards */}
          <div className="space-y-3 sm:space-y-4 max-w-md mx-auto">
            
            {/* Manager Reports Card */}
            <button
              onClick={handleManagerReports}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 flex items-center justify-between transition-all duration-300 ease-in-out transform hover:scale-[1.02] shadow-lg hover:shadow-xl touch-manipulation min-h-[64px] sm:min-h-[80px]"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                  <FileText size={20} />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-base sm:text-lg mb-1">Manager Reports</h3>
                  <p className="text-blue-100 text-xs sm:text-sm opacity-90">Production batches & analytics</p>
                </div>
              </div>
              {managerCount > 0 && (
                <div className="bg-red-500 text-white text-xs sm:text-sm rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center font-bold animate-pulse shadow-lg flex-shrink-0">
                  {managerCount}
                </div>
              )}
            </button>

            {/* Sales Rep Reports Card */}
            <button
              onClick={handleSalesReports}
              className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl sm:rounded-2xl p-4 sm:p-6 flex items-center justify-between transition-all duration-300 ease-in-out transform hover:scale-[1.02] shadow-lg hover:shadow-xl touch-manipulation min-h-[64px] sm:min-h-[80px]"
            >
              <div className="flex items-center gap-3 sm:gap-4">
                <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white bg-opacity-20 rounded-full flex items-center justify-center flex-shrink-0">
                  <UserCheck size={20} />
                </div>
                <div className="text-left">
                  <h3 className="font-semibold text-base sm:text-lg mb-1">Sales Rep Reports</h3>
                  <p className="text-green-100 text-xs sm:text-sm opacity-90">Revenue & sales analytics</p>
                </div>
              </div>
              {salesCount > 0 && (
                <div className="bg-red-500 text-white text-xs sm:text-sm rounded-full w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center font-bold animate-pulse shadow-lg flex-shrink-0">
                  {salesCount}
                </div>
              )}
            </button>

          </div>

        </div>
      </div>
    </div>
  );
}