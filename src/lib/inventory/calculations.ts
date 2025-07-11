import { createServer } from '@/lib/supabase/server';

export interface InventorySummary {
  bread_type_id: string;
  bread_name: string;
  total_produced: number;
  total_sold: number;
  available_inventory: number;
  unsold_loaves: number;
  revenue: number;
}

export async function calculateInventoryForShift(shift: 'morning' | 'night') {
  const supabase = await createServer();
  const today = new Date();
  today.setHours(0,0,0,0);

  // Fetch production logs for the shift
  const { data: productionLogs } = await supabase
    .from('production_logs')
    .select(`
      bread_type_id, 
      quantity, 
      bread_types(name)
    `)
    .eq('shift', shift)
    .gte('created_at', today.toISOString());

  // Fetch sales logs for the shift
  const { data: salesLogs } = await supabase
    .from('sales_logs')
    .select(`
      bread_type_id, 
      quantity, 
      discount, 
      bread_types(name, unit_price)
    `)
    .eq('shift', shift)
    .gte('created_at', today.toISOString());

  const inventoryMap = new Map<string, InventorySummary>();

  // Initialize with production data
  productionLogs?.forEach(log => {
    inventoryMap.set(log.bread_type_id, {
      bread_type_id: log.bread_type_id,
      bread_name: log.bread_types?.name || 'Unknown',
      total_produced: log.quantity,
      total_sold: 0,
      available_inventory: log.quantity,
      unsold_loaves: log.quantity,
      revenue: 0,
    });
  });

  // Subtract sales and calculate revenue
  salesLogs?.forEach(log => {
    const existing = inventoryMap.get(log.bread_type_id);
    if (existing) {
      const discountAmount = log.discount || 0;
      const unitPrice = log.bread_types?.unit_price || 0;
      const saleRevenue = log.quantity * (unitPrice - discountAmount);
      
      existing.total_sold += log.quantity;
      existing.available_inventory = Math.max(0, existing.total_produced - existing.total_sold);
      existing.unsold_loaves = Math.max(0, existing.total_produced - existing.total_sold);
      existing.revenue += saleRevenue;
    }
  });

  return Array.from(inventoryMap.values());
}

export async function getShiftSummary(shift: 'morning' | 'night') {
  const inventory = await calculateInventoryForShift(shift);
  
  const summary = {
    shift,
    total_sales: inventory.reduce((sum, item) => sum + item.total_sold, 0),
    total_revenue: inventory.reduce((sum, item) => sum + item.revenue, 0),
    unsold_loaves: inventory.reduce((sum, item) => sum + item.unsold_loaves, 0),
    total_produced: inventory.reduce((sum, item) => sum + item.total_produced, 0),
    items: inventory,
  };

  return summary;
}

export async function getUnsoldLoaves(shift: 'morning' | 'night') {
  const inventory = await calculateInventoryForShift(shift);
  return inventory.filter(item => item.unsold_loaves > 0);
} 