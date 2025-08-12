import { TrendingUp, ShoppingCart, Package, DollarSign, Plus, History, Clock } from 'lucide-react';

export default function SalesLoading() {
  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-br from-orange-50 to-amber-50 flex flex-col">
      {/* Mobile-First Header Skeleton */}
      <div className="w-full px-4 py-6 flex-shrink-0">
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-orange-100 p-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center">
              <TrendingUp className="h-8 w-8 text-white" />
            </div>
            <div className="flex-1">
              <div className="h-8 bg-gray-200 rounded w-48 mb-3 animate-pulse"></div>
              <div className="h-5 bg-gray-200 rounded w-64 animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile-First Content - Fill Remaining Height */}
      <div className="flex-1 px-4 pb-6 space-y-6 overflow-y-auto">
        {/* Stats Grid Skeleton - Mobile Stacked */}
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {[
            { icon: DollarSign, color: 'from-green-500 to-emerald-500', label: 'Sales' },
            { icon: Package, color: 'from-blue-500 to-cyan-500', label: 'Items' },
            { icon: ShoppingCart, color: 'from-purple-500 to-pink-500', label: 'Orders' },
            { icon: TrendingUp, color: 'from-orange-500 to-amber-500', label: 'Target' },
            { icon: Clock, color: 'from-red-500 to-pink-500', label: 'Remaining' },
            { icon: TrendingUp, color: 'from-indigo-500 to-purple-500', label: 'Progress' }
          ].map((stat, index) => (
            <div key={index} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-orange-100 p-5">
              <div className="text-center space-y-3">
                <div className={`w-14 h-14 bg-gradient-to-r ${stat.color} rounded-2xl flex items-center justify-center mx-auto`}>
                  <stat.icon className="h-7 w-7 text-white" />
                </div>
                <div>
                  <div className="h-6 bg-gray-200 rounded w-16 mb-2 animate-pulse mx-auto"></div>
                  <div className="h-4 bg-gray-200 rounded w-12 animate-pulse mx-auto"></div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Progress Section Skeleton */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-orange-100 p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-5 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-4 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
              </div>
              <div className="space-y-4">
                <div className="h-3 bg-gray-200 rounded-full animate-pulse"></div>
                <div className="grid grid-cols-3 gap-2">
                  <div className="text-center">
                    <div className="h-6 bg-gray-200 rounded w-full animate-pulse mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-8 animate-pulse mx-auto"></div>
                  </div>
                  <div className="text-center">
                    <div className="h-6 bg-gray-200 rounded w-full animate-pulse mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-12 animate-pulse mx-auto"></div>
                  </div>
                  <div className="text-center">
                    <div className="h-6 bg-gray-200 rounded w-full animate-pulse mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-10 animate-pulse mx-auto"></div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Top Products Skeleton */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-orange-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          <div className="space-y-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center justify-between p-4 bg-orange-50/50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-24 mb-2 animate-pulse"></div>
                    <div className="h-3 bg-gray-200 rounded w-16 animate-pulse"></div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="h-5 bg-gray-200 rounded w-16 animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sales Log Skeleton */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-orange-100 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
            <div className="h-10 bg-gray-200 rounded w-24 animate-pulse"></div>
          </div>
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 p-4 bg-orange-50/30 rounded-xl">
                <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-32 mb-2 animate-pulse"></div>
                  <div className="h-3 bg-gray-200 rounded w-24 animate-pulse"></div>
                </div>
                <div className="h-4 bg-gray-200 rounded w-16 animate-pulse"></div>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions Skeleton */}
        <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-sm border border-orange-100 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gray-200 rounded-xl animate-pulse"></div>
            <div className="h-6 bg-gray-200 rounded w-32 animate-pulse"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="h-16 bg-gray-200 rounded-2xl animate-pulse"></div>
            ))}
          </div>
        </div>

        {/* Bottom spacing */}
        <div className="pb-20"></div>
      </div>

      {/* Floating Action Button Skeleton */}
      <div className="absolute bottom-8 right-8">
        <div className="w-16 h-16 bg-gray-200 rounded-full animate-pulse shadow-xl"></div>
      </div>

      {/* Loading indicator */}
      <div className="absolute bottom-6 left-4 right-4">
        <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-xl border border-orange-200 px-6 py-4 flex items-center justify-center gap-3 mx-auto max-w-sm">
          <div className="w-6 h-6 border-3 border-orange-300 border-t-orange-600 rounded-full animate-spin"></div>
          <span className="text-base font-medium text-gray-700">Loading dashboard...</span>
        </div>
      </div>
    </div>
  );
}