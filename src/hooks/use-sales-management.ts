import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase/client';
import { formatCurrencyNGN } from '@/lib/utils/currency';

interface BreadType {
  id: string;
  name: string;
  unit_price: number;
}

interface ProductionItem {
  id: string;
  bread_type_id: string;
  quantity: number;
  unit_price: number;
  bread_types: BreadType;
  produced: number;
  sold: number;
  available: number;
}

interface SalesRecord {
  id: string;
  bread_type_id: string;
  quantity: number;
  unit_price: number | null;
  discount: number | null;
  returned: boolean;
  shift: string;
  recorded_by: string;
  created_at: string;
  bread_types: BreadType;
}

interface DashboardMetrics {
  todaySales: number;
  transactions: number;
  itemsSold: number;
}

interface AvailableStock {
  id: string;
  bread_type_id: string;
  bread_type_name: string;
  quantity: number;
  unit_price: number;
  last_updated: string;
}

export function useSalesManagement(userId: string, currentShift: string) {
  const [productionItems, setProductionItems] = useState<ProductionItem[]>([]);
  const [salesRecords, setSalesRecords] = useState<SalesRecord[]>([]);
  const [availableStock, setAvailableStock] = useState<AvailableStock[]>([]);
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    todaySales: 0,
    transactions: 0,
    itemsSold: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch all data for current shift
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

      // Fetch production data for current shift
      const { data: productionData, error: productionError } = await supabase
        .from('production_logs')
        .select(`
          *,
          bread_types (
            id,
            name,
            unit_price
          )
        `)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString())
        .eq('shift', currentShift);

      if (productionError) throw productionError;

      // Fetch sales data for current shift
      const { data: salesData, error: salesError } = await supabase
        .from('sales_logs')
        .select(`
          *,
          bread_types (
            id,
            name,
            unit_price
          )
        `)
        .gte('created_at', startOfDay.toISOString())
        .lt('created_at', endOfDay.toISOString())
        .eq('shift', currentShift)
        .order('created_at', { ascending: false });

      if (salesError) throw salesError;

      // Fetch available stock data
      const { data: stockData, error: stockError } = await supabase
        .from('available_stock')
        .select('*')
        .order('bread_type_name');

      if (stockError) throw stockError;

      // Process production items with calculated values
      if (productionData && salesData) {
        const processedItems = productionData.map(prod => {
          const sold = salesData
            .filter(sale => sale.bread_type_id === prod.bread_type_id)
            .reduce((sum, sale) => sum + sale.quantity, 0);
          
          return {
            id: prod.id,
            bread_type_id: prod.bread_type_id,
            quantity: prod.quantity,
            unit_price: prod.bread_types.unit_price,
            bread_types: prod.bread_types,
            produced: prod.quantity,
            sold,
            available: Math.max(0, prod.quantity - sold)
          };
        });

        setProductionItems(processedItems);

        // Calculate metrics
        const todaySales = salesData.reduce((sum, sale) => {
          const amount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
          return sum + amount;
        }, 0);

        const itemsSold = salesData.reduce((sum, sale) => sum + sale.quantity, 0);

        setMetrics({
          todaySales,
          transactions: salesData.length,
          itemsSold
        });

        setSalesRecords(salesData);
      }

      if (stockData) {
        setAvailableStock(stockData);
      }

    } catch (err) {
      console.error('Error fetching sales management data:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch data');
    } finally {
      setLoading(false);
    }
  }, [currentShift]);

  // Real-time subscription for production logs
  useEffect(() => {
    const productionChannel = supabase
      .channel('production_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'production_logs',
          filter: `shift=eq.${currentShift}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(productionChannel);
    };
  }, [currentShift, fetchData]);

  // Real-time subscription for sales logs
  useEffect(() => {
    const salesChannel = supabase
      .channel('sales_logs_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'sales_logs',
          filter: `shift=eq.${currentShift}`
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(salesChannel);
    };
  }, [currentShift, fetchData]);

  // Real-time subscription for available stock
  useEffect(() => {
    const stockChannel = supabase
      .channel('available_stock_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'available_stock'
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(stockChannel);
    };
  }, [fetchData]);

  // Initial data fetch
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Helper functions
  const getStatusIndicator = (available: number) => {
    if (available === 0) return 'sold-out';
    if (available <= 5) return 'low';
    return 'available';
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return 'text-green-600';
      case 'low':
        return 'text-yellow-600';
      case 'sold-out':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'available':
        return '✓';
      case 'low':
        return '⚠';
      case 'sold-out':
        return '✗';
      default:
        return '?';
    }
  };

  const filterProductionItems = (searchTerm: string, filter: 'all' | 'available' | 'low') => {
    return productionItems.filter(item => {
      const matchesSearch = item.bread_types.name.toLowerCase().includes(searchTerm.toLowerCase());
      const status = getStatusIndicator(item.available);
      const matchesFilter = 
        filter === 'all' ||
        (filter === 'available' && status === 'available') ||
        (filter === 'low' && (status === 'low' || status === 'sold-out'));
      return matchesSearch && matchesFilter;
    });
  };

  const getRecentSales = (limit: number = 3) => {
    return salesRecords.slice(0, limit);
  };

  const getTopSellingProducts = (limit: number = 5) => {
    const productSales = new Map<string, { name: string; quantity: number; revenue: number }>();
    
    salesRecords.forEach(sale => {
      const key = sale.bread_type_id;
      const existing = productSales.get(key) || { 
        name: sale.bread_types.name, 
        quantity: 0, 
        revenue: 0 
      };
      const amount = (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0);
      existing.quantity += sale.quantity;
      existing.revenue += amount;
      productSales.set(key, existing);
    });

    return Array.from(productSales.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, limit);
  };

  return {
    // Data
    productionItems,
    salesRecords,
    availableStock,
    metrics,
    loading,
    error,
    
    // Actions
    fetchData,
    
    // Helpers
    getStatusIndicator,
    getStatusColor,
    getStatusIcon,
    filterProductionItems,
    getRecentSales,
    getTopSellingProducts,
    
    // Formatted values
    formattedTodaySales: formatCurrencyNGN(metrics.todaySales),
    formattedMetrics: {
      todaySales: formatCurrencyNGN(metrics.todaySales),
      transactions: metrics.transactions.toString(),
      itemsSold: metrics.itemsSold.toString()
    }
  };
} 