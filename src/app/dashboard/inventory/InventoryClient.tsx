'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase/client';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, RefreshCw, AlertTriangle, Plus, ShoppingCart, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/hooks/use-auth';
import { useShift } from '@/contexts/ShiftContext';

interface BreadType {
  id: string;
  name: string;
  size: string | null;
  unit_price: number;
  created_by: string;
  created_at: string;
}

interface RemainingBread {
  id: string;
  bread_type_id: string;
  bread_type: string;
  quantity: number;
  unit_price: number;
  total_value: number;
  shift: string;
  recorded_by: string;
  created_at: string;
  updated_at: string;
}

interface InventoryItem {
  breadType: BreadType;
  quantity: number;
  unit_price: number;
  total_value: number;
  stockStatus: 'available' | 'low_stock' | 'out_of_stock';
}

export function InventoryClient() {
  const router = useRouter();
  const { user } = useAuth();
  const { currentShift } = useShift();
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  console.log('InventoryClient - User:', user);
  console.log('InventoryClient - Current Shift:', currentShift);
  console.log('InventoryClient - Loading state:', isLoading);

  const fetchInventory = async () => {
    try {
      console.log('Starting to fetch inventory...');
      setIsLoading(true);
      setError(null);

      // Fetch bread types
      console.log('Fetching bread types...');
      const { data: breadTypes, error: breadTypesError } = await supabase
        .from('bread_types')
        .select('*')
        .order('name');

      console.log('Bread types result:', breadTypes);
      console.log('Bread types error:', breadTypesError);

      if (breadTypesError) throw breadTypesError;

      // Fetch remaining bread for the current user and shift
      console.log('Fetching remaining bread for user:', user?.id, 'shift:', currentShift);
      let remainingBread: any[] = [];
      
      if (user?.id) {
        const { data: remainingData, error: remainingError } = await supabase
          .from('remaining_bread')
          .select('*')
          .eq('recorded_by', user.id)
          .eq('shift', currentShift) // Filter by current shift
          .order('created_at', { ascending: false });

        console.log('Remaining bread result for shift:', currentShift, remainingData);
        console.log('Remaining bread error:', remainingError);

        if (remainingError) {
          console.warn('Error fetching remaining bread:', remainingError);
        } else {
          remainingBread = remainingData || [];
        }
      } else {
        console.log('No user ID available, skipping remaining bread fetch');
      }

      // Combine bread types with remaining bread data
      const inventoryData: InventoryItem[] = breadTypes.map(breadType => {
        const remainingData = remainingBread.find(r => r.bread_type_id === breadType.id);
        const quantity = remainingData?.quantity || 0;
        const unit_price = breadType.unit_price;
        const total_value = quantity * unit_price;

        // Determine stock status
        let stockStatus: 'available' | 'low_stock' | 'out_of_stock';
        if (quantity === 0) {
          stockStatus = 'out_of_stock';
        } else if (quantity <= 10) {
          stockStatus = 'low_stock';
        } else {
          stockStatus = 'available';
        }

        return {
          breadType,
          quantity,
          unit_price,
          total_value,
          stockStatus
        };
      });

      console.log('Processed inventory data:', inventoryData);
      setInventory(inventoryData);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching inventory:', err);
      setError(err instanceof Error ? err.message : 'Failed to load inventory');
    } finally {
      console.log('Setting loading to false');
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchInventory();
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    console.log('InventoryClient useEffect - User ID:', user?.id);
    
    // Always try to fetch real data
    console.log('Fetching real inventory data...');
    fetchInventory();
  }, [user?.id, currentShift]); // Add currentShift to dependencies

  console.log('InventoryClient render - isLoading:', isLoading, 'error:', error, 'inventory length:', inventory.length);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-12 w-12 mx-auto mb-4 text-gray-400 animate-pulse" />
          <p className="text-gray-600">Loading inventory...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md flex flex-col items-center py-12">
          <Package className="h-12 w-12 mb-4 text-red-500" />
          <h2 className="text-xl font-semibold mb-2">Error Loading Inventory</h2>
          <p className="text-gray-600 mb-4 text-center">{error}</p>
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

  // Calculate summary statistics
  const totalItems = inventory.length;
  const availableItems = inventory.filter(item => item.stockStatus === 'available').length;
  const lowStockItems = inventory.filter(item => item.stockStatus === 'low_stock').length;
  const outOfStockItems = inventory.filter(item => item.stockStatus === 'out_of_stock').length;

  // Check for low stock alert (items with quantity <= 5)
  const lowStockAlertItems = inventory.filter(item => item.quantity <= 5 && item.quantity > 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-5 py-4 flex items-center justify-center">
        <div className="text-center font-semibold text-base w-full">Inventory</div>
      </header>

      <main className="p-5">
        {/* Shift Status */}
        <div className="bg-white rounded-xl p-5 mb-5 shadow-sm">
          <div className="flex justify-between items-center">
            <div className="font-semibold text-base text-gray-900">Morning Shift</div>
            <div className="text-sm text-gray-500">Started: 04:10 PM</div>
          </div>
        </div>

        {/* Low Stock Alert */}
        {lowStockAlertItems.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-5 flex items-center gap-2">
            <div className="text-yellow-600 text-lg">⚠️</div>
            <div className="text-yellow-800 text-sm font-medium flex-1">
              {lowStockAlertItems.length} items running low
            </div>
            <button 
              className="bg-orange-500 text-white px-3 py-2 rounded text-xs font-medium"
              onClick={() => router.push('/dashboard/sales')}
            >
              Update Stock
            </button>
          </div>
        )}

        {/* Stock Overview */}
        <div className="bg-white rounded-xl p-5 mb-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="font-semibold text-base text-gray-900">📊 Stock Overview</div>
          </div>
          <div className="grid grid-cols-2 gap-3 mb-5">
            <div className="bg-gray-50 rounded-lg p-4 text-center border-2 border-transparent">
              <div className="text-2xl font-bold text-gray-900 mb-1">{totalItems}</div>
              <div className="text-xs text-gray-500 font-medium">Total Items</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center border-2 border-transparent">
              <div className="text-2xl font-bold text-gray-900 mb-1">{availableItems}</div>
              <div className="text-xs text-gray-500 font-medium">Available</div>
            </div>
            <div className={cn(
              "rounded-lg p-4 text-center border-2",
              lowStockItems > 0 
                ? "border-yellow-300 bg-yellow-50" 
                : "border-transparent bg-gray-50"
            )}>
              <div className={cn(
                "text-2xl font-bold mb-1",
                lowStockItems > 0 ? "text-yellow-700" : "text-gray-900"
              )}>{lowStockItems}</div>
              <div className="text-xs text-gray-500 font-medium">Low Stock</div>
            </div>
            <div className={cn(
              "rounded-lg p-4 text-center border-2",
              outOfStockItems > 0 
                ? "border-red-300 bg-red-50" 
                : "border-transparent bg-gray-50"
            )}>
              <div className={cn(
                "text-2xl font-bold mb-1",
                outOfStockItems > 0 ? "text-red-700" : "text-gray-900"
              )}>{outOfStockItems}</div>
              <div className="text-xs text-gray-500 font-medium">Out of Stock</div>
            </div>
          </div>
        </div>

        {/* Inventory List */}
        <div className="bg-white rounded-xl overflow-hidden shadow-sm">
          {inventory.length === 0 ? (
            <div className="p-8 text-center">
              <Package className="h-12 w-12 mx-auto mb-4 text-gray-400" />
              <p className="text-gray-600">No inventory items found</p>
              <p className="text-sm text-gray-500 mt-2">Try adding some bread types first</p>
            </div>
          ) : (
            inventory.map((item) => (
              <div key={item.breadType.id} className="flex items-center justify-between p-5 border-b border-gray-100 last:border-b-0">
                <div className="flex-1">
                  <div className="font-semibold text-base text-gray-900 mb-1">
                    {item.breadType.name}
                  </div>
                  <div className="text-sm text-gray-500">
                    ₦{item.unit_price.toLocaleString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="font-semibold text-base text-gray-900 min-w-[40px] text-right">
                    {item.quantity}
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded-full text-xs font-medium",
                    item.stockStatus === 'available' && "bg-green-100 text-green-800",
                    item.stockStatus === 'low_stock' && "bg-yellow-100 text-yellow-800",
                    item.stockStatus === 'out_of_stock' && "bg-red-100 text-red-800"
                  )}>
                    {item.stockStatus === 'available' && 'Available'}
                    {item.stockStatus === 'low_stock' && 'Low Stock'}
                    {item.stockStatus === 'out_of_stock' && 'Out of Stock'}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </main>

      {/* Floating Action Button */}
      <div className="fixed bottom-5 right-5 z-50">
        <button
          className="w-14 h-14 rounded-full bg-orange-500 text-white text-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
          onClick={() => router.push('/dashboard/sales')}
        >
          +
        </button>
      </div>

      {/* Issue Badge */}
      {lowStockAlertItems.length > 0 && (
        <div className="fixed bottom-5 left-5 bg-red-600 text-white px-3 py-2 rounded-full text-xs font-semibold">
          <span>⚠</span> {lowStockAlertItems.length} Issue{lowStockAlertItems.length > 1 ? 's' : ''}
        </div>
      )}
    </div>
  );
}