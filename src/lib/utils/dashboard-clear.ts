/**
 * Utility function to clear dashboard data while preserving production-based tabs
 * This function encapsulates the clearing logic for the End Shift functionality
 */

export interface DashboardMetrics {
  todaySales: number;
  transactions: number;
  itemsSold: number;
  productionTarget: number;
  remainingTarget: number;
  salesTarget: number;
  topProducts: Array<{
    breadTypeId: string;
    name: string;
    quantity: number;
    revenue: number;
  }>;
  recentSales: Array<{
    id: string;
    breadType: string;
    quantity: number;
    totalAmount: number;
    paymentMethod: 'cash' | 'card' | 'mobile' | 'transfer';
    timestamp: string;
  }>;
}

export function clearDashboardExceptProductionTabs(prevMetrics: DashboardMetrics): DashboardMetrics {
  return {
    // Clear sales metrics
    todaySales: 0,
    transactions: 0,
    itemsSold: 0,
    topProducts: [],
    recentSales: [],
    
    // Preserve production-based tabs
    productionTarget: prevMetrics.productionTarget,
    remainingTarget: prevMetrics.remainingTarget,
    salesTarget: prevMetrics.salesTarget,
  };
}

/**
 * Clear all sales-related data for the current shift
 * This function can be called to reset all sales metrics to zero
 */
export function clearAllSalesData(): DashboardMetrics {
  return {
    todaySales: 0,
    transactions: 0,
    itemsSold: 0,
    productionTarget: 0,
    remainingTarget: 0,
    salesTarget: 0,
    topProducts: [],
    recentSales: [],
  };
}
