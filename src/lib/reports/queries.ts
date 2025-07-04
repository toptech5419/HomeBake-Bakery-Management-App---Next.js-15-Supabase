'use server';

import { createServer } from '@/lib/supabase/server';
import { BreadType, ProductionLog, SalesLog, ShiftType } from '@/types';

export interface ReportFilters {
  startDate?: string;
  endDate?: string;
  shift?: ShiftType;
  breadTypeId?: string;
  recordedBy?: string;
}

export interface ShiftSummary {
  id: string;
  date: string;
  shift: ShiftType;
  totalProduced: number;
  totalSold: number;
  totalRevenue: number;
  totalLeftover: number;
  totalDiscounts: number;
  breadTypeBreakdown: BreadTypeBreakdown[];
  recordedBy: string;
  createdAt: Date;
}

export interface BreadTypeBreakdown {
  breadTypeId: string;
  breadTypeName: string;
  breadTypePrice: number;
  produced: number;
  sold: number;
  revenue: number;
  leftover: number;
  discounts: number;
}

export interface ReportSummary {
  totalProduced: number;
  totalSold: number;
  totalRevenue: number;
  totalLeftover: number;
  totalDiscounts: number;
  averageDailyRevenue: number;
  bestPerformingBreadType: string;
  bestPerformingShift: ShiftType;
  shifts: ShiftSummary[];
}

export async function getReportData(filters: ReportFilters = {}): Promise<ReportSummary> {
  const supabase = await createServer();
  
  // Set default date range (last 30 days)
  const endDate = filters.endDate || new Date().toISOString().split('T')[0];
  const startDate = filters.startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Build date range for queries
  const startDateTime = new Date(startDate);
  startDateTime.setHours(0, 0, 0, 0);
  const endDateTime = new Date(endDate);
  endDateTime.setHours(23, 59, 59, 999);

  // Fetch production logs
  let productionQuery = supabase
    .from('production_logs')
    .select(`
      *,
      bread_types (
        id,
        name,
        unit_price
      )
    `)
    .gte('created_at', startDateTime.toISOString())
    .lte('created_at', endDateTime.toISOString())
    .order('created_at', { ascending: false });

  if (filters.shift) productionQuery = productionQuery.eq('shift', filters.shift);
  if (filters.breadTypeId) productionQuery = productionQuery.eq('bread_type_id', filters.breadTypeId);
  if (filters.recordedBy) productionQuery = productionQuery.eq('recorded_by', filters.recordedBy);

  // Fetch sales logs
  let salesQuery = supabase
    .from('sales_logs')
    .select(`
      *,
      bread_types (
        id,
        name,
        unit_price
      )
    `)
    .gte('created_at', startDateTime.toISOString())
    .lte('created_at', endDateTime.toISOString())
    .order('created_at', { ascending: false });

  if (filters.shift) salesQuery = salesQuery.eq('shift', filters.shift);
  if (filters.breadTypeId) salesQuery = salesQuery.eq('bread_type_id', filters.breadTypeId);
  if (filters.recordedBy) salesQuery = salesQuery.eq('recorded_by', filters.recordedBy);

  const [{ data: productionLogs = [] }, { data: salesLogs = [] }] = await Promise.all([
    productionQuery,
    salesQuery
  ]);

  // Group data by date and shift
  const shifts = new Map<string, ShiftSummary>();

  // Process production logs
  (productionLogs || []).forEach((log: any) => {
    const date = new Date(log.created_at).toISOString().split('T')[0];
    const shiftKey = `${date}-${log.shift}`;
    
    if (!shifts.has(shiftKey)) {
      shifts.set(shiftKey, {
        id: shiftKey,
        date,
        shift: log.shift,
        totalProduced: 0,
        totalSold: 0,
        totalRevenue: 0,
        totalLeftover: 0,
        totalDiscounts: 0,
        breadTypeBreakdown: [],
        recordedBy: log.recorded_by,
        createdAt: new Date(log.created_at)
      });
    }

    const shift = shifts.get(shiftKey)!;
    shift.totalProduced += log.quantity;

    // Update bread type breakdown
    let breadTypeBreakdown = shift.breadTypeBreakdown.find(b => b.breadTypeId === log.bread_type_id);
    if (!breadTypeBreakdown) {
      breadTypeBreakdown = {
        breadTypeId: log.bread_type_id,
        breadTypeName: log.bread_types?.name || 'Unknown',
        breadTypePrice: log.bread_types?.unit_price || 0,
        produced: 0,
        sold: 0,
        revenue: 0,
        leftover: 0,
        discounts: 0
      };
      shift.breadTypeBreakdown.push(breadTypeBreakdown);
    }
    breadTypeBreakdown.produced += log.quantity;
  });

  // Process sales logs
  (salesLogs || []).forEach((log: any) => {
    const date = new Date(log.created_at).toISOString().split('T')[0];
    const shiftKey = `${date}-${log.shift}`;
    
    if (!shifts.has(shiftKey)) {
      shifts.set(shiftKey, {
        id: shiftKey,
        date,
        shift: log.shift,
        totalProduced: 0,
        totalSold: 0,
        totalRevenue: 0,
        totalLeftover: 0,
        totalDiscounts: 0,
        breadTypeBreakdown: [],
        recordedBy: log.recorded_by,
        createdAt: new Date(log.created_at)
      });
    }

    const shift = shifts.get(shiftKey)!;
    shift.totalSold += log.quantity;
    shift.totalRevenue += (log.quantity * (log.unit_price || log.bread_types?.unit_price || 0)) - (log.discount || 0);
    shift.totalLeftover += log.leftover || 0;
    shift.totalDiscounts += log.discount || 0;

    // Update bread type breakdown
    let breadTypeBreakdown = shift.breadTypeBreakdown.find(b => b.breadTypeId === log.bread_type_id);
    if (!breadTypeBreakdown) {
      breadTypeBreakdown = {
        breadTypeId: log.bread_type_id,
        breadTypeName: log.bread_types?.name || 'Unknown',
        breadTypePrice: log.bread_types?.unit_price || 0,
        produced: 0,
        sold: 0,
        revenue: 0,
        leftover: 0,
        discounts: 0
      };
      shift.breadTypeBreakdown.push(breadTypeBreakdown);
    }
    breadTypeBreakdown.sold += log.quantity;
    breadTypeBreakdown.revenue += (log.quantity * (log.unit_price || log.bread_types?.unit_price || 0)) - (log.discount || 0);
    breadTypeBreakdown.leftover += log.leftover || 0;
    breadTypeBreakdown.discounts += log.discount || 0;
  });

  const shiftsArray = Array.from(shifts.values()).sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  // Calculate summary totals
  const totalProduced = shiftsArray.reduce((sum, shift) => sum + shift.totalProduced, 0);
  const totalSold = shiftsArray.reduce((sum, shift) => sum + shift.totalSold, 0);
  const totalRevenue = shiftsArray.reduce((sum, shift) => sum + shift.totalRevenue, 0);
  const totalLeftover = shiftsArray.reduce((sum, shift) => sum + shift.totalLeftover, 0);
  const totalDiscounts = shiftsArray.reduce((sum, shift) => sum + shift.totalDiscounts, 0);

  const uniqueDays = new Set(shiftsArray.map(s => s.date)).size;
  const averageDailyRevenue = uniqueDays > 0 ? totalRevenue / uniqueDays : 0;

  // Find best performing bread type
  const breadTypeRevenues = new Map<string, number>();
  shiftsArray.forEach(shift => {
    shift.breadTypeBreakdown.forEach(bread => {
      const current = breadTypeRevenues.get(bread.breadTypeName) || 0;
      breadTypeRevenues.set(bread.breadTypeName, current + bread.revenue);
    });
  });
  const bestPerformingBreadType = Array.from(breadTypeRevenues.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';

  // Find best performing shift
  const shiftRevenues = new Map<ShiftType, number>();
  shiftsArray.forEach(shift => {
    const current = shiftRevenues.get(shift.shift) || 0;
    shiftRevenues.set(shift.shift, current + shift.totalRevenue);
  });
  const bestPerformingShift = Array.from(shiftRevenues.entries())
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'morning';

  return {
    totalProduced,
    totalSold,
    totalRevenue,
    totalLeftover,
    totalDiscounts,
    averageDailyRevenue,
    bestPerformingBreadType,
    bestPerformingShift,
    shifts: shiftsArray
  };
}

export async function getShiftDetails(shiftId: string): Promise<ShiftSummary | null> {
  const [date, shift] = shiftId.split('-');
  
  if (!date || !shift || !['morning', 'night'].includes(shift)) {
    return null;
  }

  const reportData = await getReportData({
    startDate: date,
    endDate: date,
    shift: shift as ShiftType
  });

  return reportData.shifts.find(s => s.id === shiftId) || null;
}

export async function getBreadTypes(): Promise<BreadType[]> {
  const supabase = await createServer();
  const { data, error } = await supabase
    .from('bread_types')
    .select('id, name, size, unit_price, created_by, created_at')
    .order('name');

  if (error) {
    console.error('Error fetching bread types:', error);
    return [];
  }

  return (data || []).map(item => ({
    id: item.id,
    name: item.name,
    size: item.size || undefined,
    unit_price: item.unit_price,
    createdBy: item.created_by,
    createdAt: new Date(item.created_at),
    isActive: true
  }));
}