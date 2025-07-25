"use client";

import React from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Package, TrendingUp, Clock } from 'lucide-react';
import { useInventoryData } from '@/hooks/use-inventory-data';

export default function InventoryClient() {
  const { 
    inventory, 
    totalUnits, 
    isLoading, 
    error, 
    currentShift, 
    shiftStartTime 
  } = useInventoryData();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-orange-300 border-t-transparent rounded-full animate-spin mx-auto mb-4" style={{ animationDelay: '0.5s' }}></div>
            </div>
            <p className="text-orange-600 font-medium animate-pulse">Loading inventory...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50 to-amber-50">
        <div className="flex items-center justify-center min-h-screen p-4">
          <Card className="w-full max-w-md border-orange-200">
            <CardContent className="p-6 text-center">
              <div className="text-orange-500 text-5xl mb-4">⚠️</div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Inventory</h2>
              <p className="text-gray-600 mb-4">{error.message || 'Failed to load inventory data'}</p>
              <button 
                onClick={() => window.location.reload()} 
                className="bg-orange-500 text-white px-4 py-2 rounded-lg hover:bg-orange-600 transition-colors"
              >
                Try Again
              </button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-amber-50 to-white">
      {/* Header - Simplified with just title */}
      <div className="bg-white/80 backdrop-blur-sm px-4 py-4 border-b border-orange-100">
        <h1 className="text-2xl font-bold text-center bg-gradient-to-r from-orange-600 to-amber-600 bg-clip-text text-transparent">
          Inventory
        </h1>
      </div>

      <div className="p-4 space-y-6">
        {/* Shift Info Card */}
        <Card className="border-orange-200 bg-white/90 backdrop-blur-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Clock className="w-5 h-5 text-orange-500" />
                <span className="font-semibold text-gray-900 capitalize">{currentShift} Shift</span>
              </div>
              <div className="text-right">
                <span className="text-sm text-gray-600">Refresh Shift</span>
                <div className="text-sm font-medium text-orange-600">{shiftStartTime}</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Production Overview - Enhanced with orange theme */}
        <Card className="border-orange-200 bg-gradient-to-br from-orange-100 to-amber-100">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-500 rounded-full animate-pulse"></div>
              <h2 className="text-lg font-semibold text-gray-900">Production Overview</h2>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-center">
              <div className="text-4xl font-bold text-gray-900 mb-2 animate-count-in">
                {totalUnits.toLocaleString()}
              </div>
              <div className="text-orange-600 font-medium">Total Units Produced</div>
              <div className="mt-2 flex items-center justify-center space-x-1">
                <TrendingUp className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600">Live tracking</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Inventory List - Enhanced with animations */}
        <div className="space-y-4">
          {inventory.length === 0 ? (
            <Card className="border-orange-200 bg-white/90 backdrop-blur-sm">
              <CardContent className="p-8 text-center">
                <div className="text-orange-400 text-6xl mb-4 animate-bounce">📦</div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No Inventory Items</h3>
                <p className="text-gray-600 mb-4">No batches recorded for this shift yet</p>
                <div className="text-sm text-orange-500 animate-pulse">
                  Waiting for production data...
                </div>
              </CardContent>
            </Card>
          ) : (
            <>
              <div className="text-sm font-medium text-gray-700 mb-3">
                {inventory.length} Bread Type{inventory.length !== 1 ? 's' : ''} in Production
              </div>
              {inventory.map((item, index) => (
                <div 
                  key={item.id} 
                  className="bg-white/95 backdrop-blur-sm p-4 rounded-xl border border-orange-200 
                           shadow-sm hover:shadow-lg hover:border-orange-300 
                           transition-all duration-300 ease-out transform hover:-translate-y-1
                           animate-fade-in-up"
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <div className="flex justify-between items-center">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <Package className="w-5 h-5 text-orange-500" />
                        <h3 className="font-semibold text-gray-900 text-lg">{item.name}</h3>
                      </div>
                      {item.size && (
                        <p className="text-gray-600 text-sm ml-7">{item.size}</p>
                      )}
                      <p className="text-orange-600 font-semibold text-sm ml-7">
                        ₦{item.price.toLocaleString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-orange-600 mb-1">
                        {item.quantity.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-500 uppercase tracking-wide">units</div>
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
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-orange-600">{inventory.length}</div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Types</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-orange-600">{totalUnits.toLocaleString()}</div>
                  <div className="text-xs text-gray-600 uppercase tracking-wide">Total Units</div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* No inline styles needed - using global CSS */}
    </div>
  );
}
