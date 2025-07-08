'use client';

import { useInventory } from '@/contexts/DataContext';
import { MobileLoading } from '@/components/ui/mobile-loading';
import { ConnectionStatus } from '@/components/ui/connection-status';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, RefreshCw, TrendingUp, TrendingDown, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useData } from '@/contexts/DataContext';

export function InventoryClient() {
  const { inventory, totalValue, totalAvailable, lastUpdated } = useInventory();
  const { isLoading, error, refreshData, connectionStatus } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refreshData();
    } finally {
      setIsRefreshing(false);
    }
  };

  if (isLoading) {
    return <MobileLoading message="Loading inventory..." />;
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="w-full max-w-md flex flex-col items-center py-12">
          <Package className="h-12 w-12 mb-4 text-destructive" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Inventory</h2>
          <p className="text-muted-foreground mb-4 text-center">{error}</p>
          <Button onClick={handleRefresh} disabled={isRefreshing}>
            {isRefreshing ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Retrying...
              </>
            ) : (
              'Try Again'
            )}
          </Button>
        </Card>
      </div>
    );
  }

  // Sort inventory by available quantity (descending)
  const sortedInventory = [...inventory].sort((a, b) => b.available - a.available);
  const lowStockItems = inventory.filter(item => item.available > 0 && item.available < 20);
  const outOfStockItems = inventory.filter(item => item.available <= 0);

  return (
    <div className="space-y-4 pb-6">
      {/* Connection Status */}
      <ConnectionStatus />

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>Real-time stock levels</span>
            {lastUpdated && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  <span>{lastUpdated.toLocaleTimeString()}</span>
                </div>
              </>
            )}
          </div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing || connectionStatus === 'connecting'}
        >
          <RefreshCw className={cn(
            "h-4 w-4", 
            (isRefreshing || connectionStatus === 'connecting') && "animate-spin"
          )} />
        </Button>
      </div>

      {/* Enhanced Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">₦{totalValue.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Total Value</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{totalAvailable}</div>
          <div className="text-sm text-muted-foreground">Units Available</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-orange-600">{lowStockItems.length}</div>
          <div className="text-sm text-muted-foreground">Low Stock</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold text-red-600">{outOfStockItems.length}</div>
          <div className="text-sm text-muted-foreground">Out of Stock</div>
        </Card>
      </div>

      {/* Inventory List */}
      <Card>
        <div className="p-4 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold">Stock Levels</h3>
              <p className="text-sm text-muted-foreground">Based on production and sales</p>
            </div>
            {inventory.length > 0 && (
              <Badge className="text-xs bg-gray-100 text-gray-800">
                {inventory.length} types
              </Badge>
            )}
          </div>
        </div>
        <div className="divide-y">
          {sortedInventory.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium mb-2">No inventory data available</p>
              <p className="text-sm">Production and sales data will appear here once recorded</p>
            </div>
          ) : (
            sortedInventory.map((item) => {
              const stockStatus = item.available <= 0 ? 'out' : item.available < 20 ? 'low' : 'good';
              const trend = item.produced > item.sold ? 'up' : 'down';
              
              return (
                <div key={item.breadType.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h4 className="font-medium truncate">{item.breadType.name}</h4>
                        {stockStatus === 'out' && (
                          <Badge className="bg-red-100 text-red-800 text-xs shrink-0">Out of Stock</Badge>
                        )}
                        {stockStatus === 'low' && (
                          <Badge className="bg-orange-100 text-orange-800 text-xs shrink-0">Low Stock</Badge>
                        )}
                      </div>
                      <div className="grid grid-cols-3 gap-3 text-sm">
                        <div>
                          <span className="text-muted-foreground">Produced:</span>
                          <div className="font-medium">{item.produced}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sold:</span>
                          <div className="font-medium">{item.sold}</div>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Value:</span>
                          <div className="font-medium">₦{item.value.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className={cn(
                        "text-2xl font-bold",
                        stockStatus === 'out' ? 'text-red-600' : 
                        stockStatus === 'low' ? 'text-orange-600' : 
                        'text-green-600'
                      )}>
                        {item.available}
                      </div>
                      <div className="flex items-center justify-end gap-1 text-sm text-muted-foreground">
                        {trend === 'up' ? (
                          <TrendingUp className="h-3 w-3 text-green-600" />
                        ) : (
                          <TrendingDown className="h-3 w-3 text-red-600" />
                        )}
                        <span className="text-xs">Available</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>

      {/* Quick Stats Footer for Mobile */}
      <div className="md:hidden bg-gray-50 rounded-lg p-4">
        <div className="text-center">
          <div className="text-sm text-muted-foreground mb-1">
            {lowStockItems.length > 0 && (
              <span className="text-orange-600">⚠️ {lowStockItems.length} items low</span>
            )}
            {outOfStockItems.length > 0 && (
              <>
                {lowStockItems.length > 0 && <span className="mx-2">•</span>}
                <span className="text-red-600">🚫 {outOfStockItems.length} out of stock</span>
              </>
            )}
            {lowStockItems.length === 0 && outOfStockItems.length === 0 && (
              <span className="text-green-600">✅ All items in stock</span>
            )}
          </div>
          {lastUpdated && (
            <div className="text-xs text-muted-foreground">
              Last synced: {lastUpdated.toLocaleString()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}