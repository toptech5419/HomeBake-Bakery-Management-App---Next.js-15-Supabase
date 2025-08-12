import { TrendingUp, Search, Filter, DollarSign, Package, ShoppingCart } from 'lucide-react';

export default function AllSalesLoading() {
  return (
    <div className="fixed inset-0 w-full h-full bg-gray-50 flex flex-col">
      {/* Mobile-First Header Skeleton - Full Width */}
      <div className="bg-gradient-to-r from-green-500 to-emerald-500 text-white w-full flex-shrink-0">
        <div className="px-4 py-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="h-10 w-10 bg-white/20 rounded-xl animate-pulse"></div>
            <div className="bg-white/20 p-3 rounded-xl">
              <TrendingUp className="h-6 w-6 opacity-60" />
            </div>
            <div className="flex-1">
              <div className="h-6 w-28 bg-white/20 rounded animate-pulse mb-2"></div>
              <div className="h-4 w-40 bg-white/10 rounded animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-First Search and Stats Bar */}
      <div className="bg-orange-50 border-b border-gray-200 px-4 py-4 w-full flex-shrink-0">
        <div className="space-y-4">
          {/* Search Bar Skeleton */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5 opacity-50" />
            <div className="h-14 bg-gray-200 rounded-xl animate-pulse"></div>
          </div>

          {/* Mobile Stats Grid - 2x2 */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { icon: DollarSign, label: 'Revenue' },
              { icon: Package, label: 'Items' },
              { icon: ShoppingCart, label: 'Sales' },
              { icon: Filter, label: 'Active' }
            ].map((stat, index) => (
              <div key={index} className="bg-white rounded-2xl p-5 shadow-sm border border-gray-200">
                <div className="flex items-center gap-3">
                  <stat.icon className="h-6 w-6 text-gray-400 opacity-50 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="h-3 bg-gray-200 rounded w-12 mb-2 animate-pulse"></div>
                    <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile-First Sales List Skeleton - Fill Remaining Height */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="space-y-4">
          {Array.from({ length: 15 }).map((_, index) => (
            <div key={index} className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5 animate-pulse">
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  {/* Product info */}
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-14 h-14 bg-gray-200 rounded-2xl flex-shrink-0"></div>
                    <div className="flex-1 min-w-0">
                      <div className="h-5 bg-gray-200 rounded w-28 mb-2"></div>
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </div>
                  </div>
                  
                  {/* Mobile details - vertical stack */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                      <div className="h-4 bg-gray-200 rounded w-16"></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-gray-200 rounded w-24"></div>
                      <div className="h-4 bg-gray-200 rounded w-20"></div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="h-4 bg-gray-200 rounded w-18"></div>
                      <div className="h-4 bg-gray-200 rounded w-14"></div>
                    </div>
                  </div>
                </div>
                
                {/* Price info */}
                <div className="text-right flex-shrink-0">
                  <div className="h-6 bg-gray-200 rounded w-20 mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-16"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
        
        {/* Bottom spacing for mobile */}
        <div className="pb-20"></div>
      </div>

      {/* Fixed Loading Indicator - Mobile Optimized */}
      <div className="absolute bottom-6 left-4 right-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-green-200 px-6 py-4 flex items-center justify-center gap-3 mx-auto max-w-sm">
          <div className="w-6 h-6 border-3 border-green-300 border-t-green-600 rounded-full animate-spin"></div>
          <span className="text-base font-medium text-gray-700">Loading all sales...</span>
        </div>
      </div>
    </div>
  );
}