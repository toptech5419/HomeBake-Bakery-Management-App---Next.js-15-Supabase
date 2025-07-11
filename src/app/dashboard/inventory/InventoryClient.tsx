'use client';

import { useInventory } from '@/contexts/DataContext';
import { MobileLoading } from '@/components/ui/mobile-loading';
import { ConnectionStatus } from '@/components/ui/connection-status';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, RefreshCw, TrendingUp, TrendingDown, Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { useData } from '@/contexts/DataContext';
import { useAuth } from '@/hooks/use-auth'; // Use the existing auth hook

export function InventoryClient() {
  const { inventory, totalValue, totalAvailable, lastUpdated } = useInventory();
  const { isLoading, error, refreshData, connectionStatus } = useData();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { user } = useAuth(); // Add this to get user role

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

  // Role-based quick actions
  const getQuickActions = () => {
    const actions = [];
    
    if (user?.role === 'manager' || user?.role === 'owner') {
      actions.push({
        label: 'Log Production',
        href: '/dashboard/production',
        variant: 'default' as const,
        icon: <TrendingUp className="h-4 w-4" />
      });
    }
    
    if (user?.role === 'sales_rep') {
      actions.push({
        label: 'Record Sale',
        href: '/dashboard/sales/new',
        variant: 'default' as const,
        icon: <TrendingDown className="h-4 w-4" />
      });
    }
    
    actions.push({
      label: 'View Reports',
      href: '/dashboard/reports',
      variant: 'outline' as const,
      icon: <Clock className="h-4 w-4" />
    });
    
    return actions;
  };

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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Stock</p>
              <p className="text-2xl font-bold">{totalAvailable}</p>
            </div>
            <Package className="h-8 w-8 text-blue-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Value</p>
              <p className="text-2xl font-bold">₦{totalValue.toLocaleString()}</p>
            </div>
            <TrendingUp className="h-8 w-8 text-green-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
              <p className="text-2xl font-bold text-orange-600">{lowStockItems.length}</p>
            </div>
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
        </Card>
        
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
              <p className="text-2xl font-bold text-red-600">{outOfStockItems.length}</p>
            </div>
            <TrendingDown className="h-8 w-8 text-red-600" />
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-2">
        {getQuickActions().map((action, index) => (
          <Button
            key={index}
            variant={action.variant}
            size="sm"
            onClick={() => window.location.href = action.href}
            className="flex items-center gap-2"
          >
            {action.icon}
            {action.label}
          </Button>
        ))}
      </div>

      {/* Inventory List */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Stock Levels</h2>
          <Badge variant="secondary">
            {inventory.length} items
          </Badge>
        </div>
        
        <div className="space-y-3">
          {sortedInventory.map((item) => {
            const stockStatus = item.available <= 0 ? 'out' : item.available < 20 ? 'low' : 'good';
            const trend = item.produced > item.sold ? 'up' : 'down';
            
            return (
              <div key={item.breadType.id} className="p-4 border rounded-lg">
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
                        <span className="text-muted-foreground">Available:</span>
                        <div className="font-medium">{item.available}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Produced:</span>
                        <div className="font-medium">{item.produced}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Value:</span>
                        <div className="font-medium">₦{item.value.toLocaleString()}</div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    {trend === 'up' ? (
                      <TrendingUp className="h-4 w-4 text-green-600" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}