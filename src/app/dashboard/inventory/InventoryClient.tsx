'use client';

import { useInventory } from '@/contexts/DataContext';
import { MobileLoading } from '@/components/ui/mobile-loading';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useData } from '@/contexts/DataContext';

export function InventoryClient() {
  const { inventory, totalValue } = useInventory();
  const { isLoading, error, refreshData } = useData();
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
          <p className="text-muted-foreground mb-4">{error}</p>
          <Button onClick={handleRefresh}>Try Again</Button>
        </Card>
      </div>
    );
  }

  // Sort inventory by available quantity (descending)
  const sortedInventory = [...inventory].sort((a, b) => b.available - a.available);
  const lowStockItems = inventory.filter(item => item.available > 0 && item.available < 20);
  const outOfStockItems = inventory.filter(item => item.available <= 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventory</h1>
          <p className="text-muted-foreground">Real-time stock levels</p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="p-4">
          <div className="text-2xl font-bold text-green-600">₦{totalValue.toLocaleString()}</div>
          <div className="text-sm text-muted-foreground">Total Value</div>
        </Card>
        <Card className="p-4">
          <div className="text-2xl font-bold">{inventory.length}</div>
          <div className="text-sm text-muted-foreground">Bread Types</div>
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
          <h3 className="font-semibold">Stock Levels</h3>
          <p className="text-sm text-muted-foreground">Based on production and sales</p>
        </div>
        <div className="divide-y">
          {sortedInventory.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              No inventory data available
            </div>
          ) : (
            sortedInventory.map((item) => {
              const stockStatus = item.available <= 0 ? 'out' : item.available < 20 ? 'low' : 'good';
              const trend = item.produced > item.sold ? 'up' : 'down';
              
              return (
                <div key={item.breadType.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="font-medium">{item.breadType.name}</h4>
                        {stockStatus === 'out' && (
                          <Badge className="bg-red-100 text-red-800 text-xs">Out of Stock</Badge>
                        )}
                        {stockStatus === 'low' && (
                          <Badge className="bg-orange-100 text-orange-800 text-xs">Low Stock</Badge>
                        )}
                      </div>
                      <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground">Produced:</span>
                          <span className="ml-1 font-medium">{item.produced}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sold:</span>
                          <span className="ml-1 font-medium">{item.sold}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Value:</span>
                          <span className="ml-1 font-medium">₦{item.value.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
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
                        <span>Available</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </Card>
    </div>
  );
}