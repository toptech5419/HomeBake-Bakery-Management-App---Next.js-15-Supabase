"use client";

import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { BackButton } from '@/components/ui/back-button';
import { Package, Clock, RefreshCw, Archive } from 'lucide-react';
import { ProductionLoading, ProductionError } from '@/components/ui/production-loading';
import ErrorBoundary from '@/components/error/ErrorBoundary';
import { useInventoryData } from '@/hooks/use-inventory-data';
import { useAuth } from '@/hooks/use-auth';

interface InventoryItem {
  id: string;
  name: string;
  size?: string;
  price?: number;
  quantity: number;
  batches?: number;
  archivedBatches?: number;
}

interface InventoryClientProps {
  serverUser?: unknown;
}

function InventoryClientInner({ serverUser }: InventoryClientProps) {
  const { user: clientUser } = useAuth();

  // Use server user if available, otherwise fall back to client user
  const user = serverUser || clientUser;

  const { 
    inventory, 
    totalUnits, 
    isLoading, 
    error, 
    dataSourceInfo,
    isFetching,
    isError,
    refetch
  } = useInventoryData(user); // Uses automatic 10AM/10PM inventory shift logic

  // Handle loading state
  if (isLoading) {
    return (
      <ProductionLoading 
        type="page"
        message="Loading inventory data..."
        icon={Package}
      />
    );
  }

  // Handle error state
  if (isError && error) {
    return (
      <ProductionError 
        type="page"
        message={`Failed to load inventory: ${error.message}`}
        onRetry={refetch}
      />
    );
  }


  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-white">
      {/* Real-time indicators */}
      {isFetching && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm flex items-center gap-2">
            <div className="animate-spin rounded-full h-3 w-3 border border-white border-t-transparent"></div>
            <span>Updating...</span>
          </div>
        </div>
      )}
      

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm px-2 py-2 border-b border-orange-100">
        <div className="flex items-center justify-between">
          <BackButton 
            userRole={
              ((user as any)?.user_metadata?.role as string) || 
              ((user as any)?.role as string) || 
              'owner'
            }
            size="sm"
            showText={false}
            className="flex-shrink-0"
          />
          <h1 className="text-lg sm:text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            Inventory
          </h1>
          <div className="w-8"></div> {/* Spacer for centering */}
        </div>
      </div>

      <div className="p-1 space-y-1 md:p-2 md:space-y-2">
        {/* Enhanced Shift Info Card */}
        <Card className="border-orange-200 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-1.5 md:p-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-orange-500" />
                <span className="font-semibold text-gray-900 capitalize text-xs sm:text-sm">{dataSourceInfo.currentShift}</span>
                <span className="text-xs bg-green-100 text-green-700 px-1 py-0.5 rounded">AUTO</span>
                {dataSourceInfo.source === 'all_batches' && (
                  <Archive className="w-3 h-3 text-purple-500" />
                )}
              </div>
              <div className="text-right">
                <span className="text-xs text-gray-600">Next: </span>
                <span className="text-xs sm:text-sm font-medium text-orange-600">{dataSourceInfo.timeUntilNextShift}</span>
              </div>
            </div>
            
            {/* Enhanced shift details - Mobile responsive grid */}
            <div className="grid grid-cols-3 gap-1 text-xs">
              <div>
                <span className="text-gray-500">{dataSourceInfo.source}</span>
              </div>
              <div>
                <span className="font-medium">{dataSourceInfo.totalBatches} active</span>
              </div>
              <div>
                <span className="font-medium">{dataSourceInfo.totalArchivedBatches} archived</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Production Overview - Compact */}
        <Card className="border-orange-200 bg-gradient-to-br from-orange-100 to-amber-100">
          <CardContent className="p-1.5">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-1">
                <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse"></div>
                <h2 className="text-xs sm:text-sm font-semibold text-gray-900">Production</h2>
              </div>
              <button
                onClick={() => dataSourceInfo.refreshData()}
                className="p-0.5 text-orange-600 hover:text-orange-800"
                title="Refresh"
              >
                <RefreshCw className="w-3 h-3" />
              </button>
            </div>
            <div className="text-center">
              <div className="text-xl sm:text-2xl font-bold text-gray-900 mb-0.5">
                {totalUnits.toLocaleString()}
              </div>
              <div className="text-orange-600 font-medium text-xs">Total Units</div>
              <div className="mt-1 grid grid-cols-2 gap-1 text-xs">
                <div>
                  <span className="font-semibold text-gray-700">{dataSourceInfo.totalBatches}</span>
                  <span className="text-gray-500"> active</span>
                </div>
                <div>
                  <span className="font-semibold text-gray-700">{dataSourceInfo.totalArchivedBatches}</span>
                  <span className="text-gray-500"> archived</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory List - Enhanced with animations */}
        <div className="space-y-1">
          {inventory.length === 0 ? (
            <Card className="border-orange-200 bg-white/90 backdrop-blur-sm">
              <CardContent className="p-2 text-center">
                <div className="text-orange-400 text-lg mb-1 animate-bounce">📦</div>
                <h3 className="text-sm font-semibold text-gray-900 mb-0.5">No Inventory</h3>
                <p className="text-gray-600 mb-1 text-xs">No batches recorded</p>
                <div className="text-xs text-orange-500 animate-pulse">
                  Waiting for data...
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="text-xs font-medium text-gray-700 mb-1">
                {inventory.length} Type{inventory.length !== 1 ? 's' : ''}
              </div>
              {inventory.map((item: InventoryItem, index: number) => (
                <div 
                  key={item.id} 
                  className="bg-white/95 backdrop-blur-sm p-1.5 rounded-lg border border-orange-200 
                           shadow-sm hover:shadow-md hover:border-orange-300 
                           transition-all duration-200 ease-out
                           animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1 mb-0.5">
                        <Package className="w-2.5 h-2.5 text-orange-500" />
                        <h3 className="font-semibold text-gray-900 text-sm truncate">{item.name}</h3>
                        {item.archivedBatches && item.archivedBatches > 0 && (
                          <Archive className="w-2 h-2 text-purple-500" />
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        {item.size && (
                          <span className="text-gray-600">{item.size}</span>
                        )}
                        <span className="text-orange-600 font-semibold">
                          ₦{item.price?.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-lg sm:text-xl font-bold text-orange-600">
                        {item.quantity.toLocaleString()}
                      </div>
                      {item.batches && item.batches > 0 && (
                        <div className="text-xs text-gray-400">
                          {item.batches}b{item.archivedBatches && item.archivedBatches > 0 && (
                            <span className="text-purple-500">•{item.archivedBatches}</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress bar */}
                  {totalUnits > 0 && (
                    <div className="mt-1">
                      <div className="w-full bg-orange-100 rounded-full h-1">
                        <div 
                          className="bg-gradient-to-r from-orange-400 to-amber-500 h-1 rounded-full 
                                   transition-all duration-300 ease-out"
                          style={{ width: `${Math.min((item.quantity / totalUnits) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* Footer Stats */}
        {inventory.length > 0 && (
          <Card className="border-orange-200 bg-white/90 backdrop-blur-sm">
            <CardContent className="p-1.5">
              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <div className="text-lg sm:text-xl font-bold text-orange-600">{inventory.length}</div>
                  <div className="text-xs text-gray-600">TYPES</div>
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-bold text-orange-600">{totalUnits.toLocaleString()}</div>
                  <div className="text-xs text-gray-600">UNITS</div>
                </div>
                <div>
                  <div className="text-lg sm:text-xl font-bold text-orange-600">{dataSourceInfo.totalBatches}</div>
                  <div className="text-xs text-gray-600">BATCHES</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

// Export the component wrapped in an error boundary
export default function InventoryClient(props: InventoryClientProps) {
  return (
    <ErrorBoundary
      onError={(error, errorInfo) => {
        console.error('🚨 InventoryClient Error:', error, errorInfo);
      }}
    >
      <InventoryClientInner {...props} />
    </ErrorBoundary>
  );
}
