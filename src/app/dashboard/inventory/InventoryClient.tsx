"use client";

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { BackButton } from '@/components/ui/back-button';
import { Package, TrendingUp, Clock, RefreshCw, Archive, AlertTriangle } from 'lucide-react';
import { useInventoryData } from '@/hooks/use-inventory-data';
import { useAuth } from '@/hooks/use-auth';
import { useAutoShift } from '@/hooks/use-auto-shift';

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

export default function InventoryClient({ serverUser }: InventoryClientProps) {
  const { user: clientUser } = useAuth();

  // Use server user if available, otherwise fall back to client user
  const user = serverUser || clientUser;

  const { 
    inventory, 
    totalUnits, 
    isLoading, 
    error, 
    shiftStatus, 
    dataSourceInfo,
    isFetching,
    isError,
    refetch,
    realtimeConnectionState
  } = useInventoryData(user); // Uses automatic 10AM/10PM inventory shift logic

  // Handle loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading inventory data...</p>
        </div>
      </div>
    );
  }

  // Handle error state
  if (isError && error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-500 mb-4">
            <AlertTriangle className="h-12 w-12 mx-auto mb-2" />
            <h3 className="text-lg font-semibold">Failed to load inventory</h3>
            <p className="text-sm text-gray-600 mt-1">{error.message}</p>
          </div>
              <button 
            onClick={() => refetch()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Try Again
              </button>
        </div>
      </div>
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
      
      {/* Real-time connection status */}
      <div className="fixed top-4 left-4 z-40">
        <div className={`px-2 py-1 rounded-full text-xs flex items-center gap-1 ${
          realtimeConnectionState === 'connected' 
            ? 'bg-green-500 text-white' 
            : realtimeConnectionState === 'connecting'
            ? 'bg-yellow-500 text-white'
            : 'bg-red-500 text-white'
        }`}>
          <div className={`w-2 h-2 rounded-full ${
            realtimeConnectionState === 'connected' ? 'bg-white animate-pulse' : 'bg-white/60'
          }`}></div>
          <span className="capitalize">{realtimeConnectionState || 'offline'}</span>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm px-4 py-4 border-b border-orange-100">
        <div className="flex items-center justify-between">
          <BackButton 
            userRole={
              ((user as any)?.user_metadata?.role as string) || 
              ((user as any)?.role as string) || 
              'owner'
            }
            size="md"
            showText={false}
            className="flex-shrink-0"
          />
          <h1 className="text-xl md:text-2xl font-bold bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
            Inventory
          </h1>
          <div className="w-10"></div> {/* Spacer for centering */}
        </div>
      </div>

      <div className="p-4 space-y-4 md:space-y-6">
        {/* Enhanced Shift Info Card */}
        <Card className="border-orange-200 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
              <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
                  <span className="font-semibold text-gray-900 capitalize text-sm md:text-base">{dataSourceInfo.currentShift} Shift</span>
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">AUTO</span>
                </div>
                              <div className="flex items-center gap-1">
                {dataSourceInfo.source === 'all_batches' && (
                  <Archive className="w-4 h-4 text-purple-500" />
                )}
              </div>
              </div>
              <div className="text-right">
                <span className="text-xs md:text-sm text-gray-600">Next shift in</span>
                <div className="text-xs md:text-sm font-medium text-orange-600">{dataSourceInfo.timeUntilNextShift}</div>
              </div>
            </div>
            
            {/* Enhanced shift details - Mobile responsive grid */}
            <div className="grid grid-cols-3 gap-3 md:gap-4 text-xs md:text-sm">
              <div>
                <span className="text-gray-600">Data Source:</span>
                <div className="font-medium capitalize">{dataSourceInfo.source}</div>
              </div>
              <div>
                <span className="text-gray-600">Total Batches:</span>
                <div className="font-medium">{dataSourceInfo.totalBatches}</div>
              </div>
              <div>
                <span className="text-gray-600">Archived:</span>
                <div className="font-medium">{dataSourceInfo.totalArchivedBatches}</div>
              </div>
            </div>
            
            <div className="mt-2 text-xs text-gray-500">
              {dataSourceInfo.recordCount} records • Auto-switching at {dataSourceInfo.nextShiftTime}
              <div className="mt-1 text-blue-600">{dataSourceInfo.dataWindow}</div>
              {shiftStatus.shouldShowArchivedData && (
                <div className="flex items-center space-x-1 mt-1 text-purple-600">
                  <Archive className="w-3 h-3" />
                  <span>Showing archived data from previous shift</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Production Overview - Enhanced with orange theme */}
        <Card className="border-orange-200 bg-gradient-to-br from-orange-100 to-amber-100">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 md:w-4 md:h-4 bg-orange-500 rounded-full animate-pulse"></div>
              <h2 className="text-base md:text-lg font-semibold text-gray-900">Production Overview</h2>
              <button
                onClick={() => dataSourceInfo.refreshData()}
                className="ml-auto p-1 text-orange-600 hover:text-orange-800"
                title="Refresh data"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-3xl md:text-4xl font-bold text-gray-900 mb-2 animate-count-in">
                {totalUnits.toLocaleString()}
              </div>
              <div className="text-orange-600 font-medium text-sm md:text-base">Total Units Produced</div>
              <div className="mt-2 flex items-center justify-center space-x-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-xs md:text-sm text-gray-600">Real-time tracking</span>
              </div>
              {/* Enhanced batch information */}
              <div className="mt-3 grid grid-cols-2 gap-4 text-xs md:text-sm">
                <div>
                  <div className="font-semibold text-gray-700">{dataSourceInfo.totalBatches}</div>
                  <div className="text-gray-500">Active Batches</div>
                </div>
                <div>
                  <div className="font-semibold text-gray-700">{dataSourceInfo.totalArchivedBatches}</div>
                  <div className="text-gray-500">Archived</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory List - Enhanced with animations */}
        <div className="space-y-3 md:space-y-4">
          {inventory.length === 0 ? (
            <Card className="border-orange-200 bg-white/90 backdrop-blur-sm">
              <CardContent className="p-6 md:p-8 text-center">
                <div className="text-orange-400 text-4xl md:text-6xl mb-4 animate-bounce">📦</div>
                <h3 className="text-base md:text-lg font-semibold text-gray-900 mb-2">No Inventory Items</h3>
                <p className="text-gray-600 mb-4 text-sm md:text-base">No batches recorded for this shift yet</p>
                <div className="text-xs md:text-sm text-orange-500 animate-pulse">
                  Waiting for production data...
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="text-xs md:text-sm font-medium text-gray-700 mb-3">
                {inventory.length} Bread Type{inventory.length !== 1 ? 's' : ''} in Production
              </div>
              {inventory.map((item: InventoryItem, index: number) => (
                <div 
                  key={item.id} 
                  className="bg-white/95 backdrop-blur-sm p-4 md:p-6 rounded-xl border border-orange-200 
                           shadow-sm hover:shadow-lg hover:border-orange-300 
                           transition-all duration-300 ease-out transform hover:-translate-y-1
                           animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Package className="w-4 h-4 md:w-5 md:h-5 text-orange-500" />
                        <h3 className="font-semibold text-gray-900 text-base md:text-lg">{item.name}</h3>
                        {item.archivedBatches && item.archivedBatches > 0 && (
                          <Archive className="w-3 h-3 md:w-4 md:h-4 text-purple-500" />
                        )}
                      </div>
                      {item.size && (
                        <p className="text-gray-600 text-xs md:text-sm ml-6 md:ml-7">{item.size}</p>
                      )}
                      <p className="text-orange-600 font-semibold text-xs md:text-sm ml-6 md:ml-7">
                        ₦{item.price?.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-xl md:text-2xl font-bold text-orange-600 mb-1">
                        {item.quantity.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">units</div>
                      {item.batches && item.batches > 0 && (
                        <div className="text-xs text-gray-400">
                          {item.batches} batch{item.batches !== 1 ? 'es' : ''}
                          {item.archivedBatches && item.archivedBatches > 0 && (
                            <span className="text-purple-500"> • {item.archivedBatches} archived</span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Progress bar for visual representation */}
                  {totalUnits > 0 && (
                    <div className="mt-3">
                      <div className="w-full bg-orange-100 rounded-full h-2">
                        <div 
                          className="bg-gradient-to-r from-orange-400 to-amber-500 h-2 rounded-full 
                                   transition-all duration-500 ease-out"
                          style={{ width: `${Math.min((item.quantity / totalUnits) * 100, 100)}%` }}
                        ></div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1 text-right">
                        {((item.quantity / totalUnits) * 100).toFixed(1)}% of total
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
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-xl md:text-2xl font-bold text-orange-600">{inventory.length}</div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Types</div>
                </div>
                <div>
                  <div className="text-xl md:text-2xl font-bold text-orange-600">{totalUnits.toLocaleString()}</div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Total Units</div>
                </div>
                <div>
                  <div className="text-xl md:text-2xl font-bold text-orange-600">{dataSourceInfo.totalBatches}</div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Batches</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
