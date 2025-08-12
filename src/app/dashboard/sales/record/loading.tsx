import { ShoppingCart, Calculator } from 'lucide-react';

export default function RecordSalesLoading() {
  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col">
      {/* Mobile-First Header Skeleton - Full Width */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white w-full flex-shrink-0">
        <div className="px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-white/20 rounded-xl animate-pulse"></div>
            <div className="bg-white/20 p-3 rounded-xl">
              <ShoppingCart className="h-6 w-6 opacity-60" />
            </div>
            <div className="flex-1">
              <div className="h-6 w-32 bg-white/20 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-40 bg-white/10 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-First Content Skeleton - Fill Remaining Height */}
      <div className="flex-1 px-4 py-6 space-y-6 overflow-y-auto">
        
        {/* Bread Type Selection Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="bg-orange-100 p-3 rounded-2xl">
            <Calculator className="h-6 w-6 text-orange-600 opacity-60" />
          </div>
          <div className="h-7 w-48 bg-gray-200 rounded animate-pulse"></div>
        </div>

        {/* Mobile-First Bread Types Grid - 2 columns on mobile - More items */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-orange-100 p-4 animate-pulse">
              <div className="text-center space-y-3">
                <div className="w-16 h-16 bg-gray-200 rounded-2xl mx-auto"></div>
                <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
                <div className="h-3 bg-gray-200 rounded w-12 mx-auto"></div>
              </div>
            </div>
          ))}
        </div>

        {/* Mobile Sales Form Skeleton - Larger */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-orange-100 p-6 space-y-6">
          <div className="h-7 w-40 bg-gray-200 rounded animate-pulse"></div>
          
          {/* Mobile-optimized form fields - More fields */}
          <div className="space-y-5">
            {['Product', 'Quantity', 'Unit Price', 'Discount', 'Total Amount'].map((_, index) => (
              <div key={index} className="space-y-3">
                <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
                <div className="h-16 bg-gray-200 rounded-xl animate-pulse"></div>
              </div>
            ))}
          </div>
          
          {/* Submit Button Skeleton - Larger */}
          <div className="h-16 bg-gray-200 rounded-2xl animate-pulse mt-8"></div>
        </div>

        {/* Quick Actions Mobile Skeleton */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-orange-100 p-6">
          <div className="h-6 w-36 bg-gray-200 rounded animate-pulse mb-6"></div>
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-14 bg-gray-200 rounded-xl animate-pulse"></div>
            ))}
          </div>
        </div>

        {/* Extra content to fill screen */}
        <div className="space-y-4 pb-20">
          <div className="h-20 bg-white/60 rounded-2xl animate-pulse"></div>
          <div className="h-20 bg-white/60 rounded-2xl animate-pulse"></div>
        </div>
      </div>

      {/* Fixed Loading Indicator - Mobile Optimized */}
      <div className="absolute bottom-6 left-4 right-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-orange-200 px-6 py-4 flex items-center justify-center gap-3 mx-auto max-w-sm">
          <div className="w-6 h-6 border-3 border-orange-300 border-t-orange-600 rounded-full animate-spin"></div>
          <span className="text-base font-medium text-gray-700">Loading record sales...</span>
        </div>
      </div>
    </div>
  );
}