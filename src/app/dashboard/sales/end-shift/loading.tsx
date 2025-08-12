import { Clock } from 'lucide-react';

export default function EndShiftLoading() {
  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col">
      {/* Mobile-First Header Skeleton - Full Width */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white w-full flex-shrink-0">
        <div className="px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-white/20 rounded-xl animate-pulse"></div>
            <div className="bg-white/20 p-3 rounded-xl">
              <Clock className="h-6 w-6 opacity-60" />
            </div>
            <div className="flex-1">
              <div className="h-6 w-28 bg-white/20 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-36 bg-white/10 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-First Content Skeleton - Fill Remaining Height */}
      <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        {/* Stats Cards - Mobile Stacked - More to fill screen */}
        <div className="space-y-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div key={index} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-orange-100 p-5">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-14 h-14 bg-gray-200 rounded-2xl animate-pulse flex-shrink-0"></div>
                <div className="flex-1 min-w-0">
                  <div className="h-5 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
              </div>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="flex justify-between items-center">
                    <div className="h-4 bg-gray-200 rounded w-20 animate-pulse"></div>
                    <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Form Section Skeleton - Larger */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-orange-100 p-5">
          <div className="h-6 w-40 bg-gray-200 rounded animate-pulse mb-6"></div>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="space-y-3">
                <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-14 bg-gray-200 rounded-xl animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Action Buttons Skeleton - Fill to bottom */}
        <div className="space-y-4 pb-20">
          <div className="h-16 bg-gray-200 rounded-2xl animate-pulse"></div>
          <div className="h-16 bg-gray-200 rounded-2xl animate-pulse"></div>
          <div className="h-16 bg-gray-200 rounded-2xl animate-pulse"></div>
        </div>
      </div>

      {/* Fixed Loading Indicator - Mobile Optimized */}
      <div className="absolute bottom-6 left-4 right-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-orange-200 px-6 py-4 flex items-center justify-center gap-3 mx-auto max-w-sm">
          <div className="w-6 h-6 border-3 border-orange-300 border-t-orange-600 rounded-full animate-spin"></div>
          <span className="text-base font-medium text-gray-700">Loading end shift...</span>
        </div>
      </div>
    </div>
  );
}