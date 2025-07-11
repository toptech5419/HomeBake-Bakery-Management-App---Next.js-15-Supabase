import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { SalesMetrics } from '@/components/dashboards/sales/sales-metrics';

export default async function SalesMetricsPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Get user profile
  const { data: profile } = await supabase
    .from('users')
    .select('name, role')
    .eq('id', user.id)
    .single();

  if (!profile || profile.role !== 'sales_rep') {
    return redirect('/dashboard');
  }

  // Fetch sales data for this sales rep
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data: salesData } = await supabase
    .from('sales_logs')
    .select(`
      *,
      bread_types (
        id,
        name,
        unit_price
      )
    `)
    .eq('recorded_by', user.id)
    .gte('created_at', today.toISOString());

  const shift = new Date().getHours() >= 6 && new Date().getHours() < 14 ? 'morning' : 'night';

  // Transform data to match SalesMetrics expected structure
  const transformedData = {
    todaySales: (salesData || []).map(sale => ({
      id: sale.id,
      breadType: sale.bread_types?.name || 'Unknown',
      quantity: sale.quantity,
      unitPrice: sale.unit_price || 0,
      discount: sale.discount || 0,
      timestamp: sale.created_at,
      customerType: 'individual' as const,
    })),
    salesTarget: {
      dailyTarget: 50000,
      currentSales: (salesData || []).reduce((sum, sale) => 
        sum + (sale.quantity * (sale.unit_price || 0)) - (sale.discount || 0), 0
      ),
      completion: 0,
      timeRemaining: shift === 'morning' ? 6 : 8,
    },
    averageOrderValue: 2500,
    customerCount: (salesData || []).length,
    topSellingBread: 'White Bread',
    currentShift: shift,
    previousDaySales: 45000,
    weeklyAverage: 48000,
    lastUpdate: new Date().toISOString(),
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Sales Performance</h1>
              <p className="text-gray-600">Your sales metrics and performance overview</p>
            </div>
            <a 
              href="/dashboard/sales" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Record Sales
            </a>
          </div>
          <SalesMetrics data={transformedData} shift={shift} />
        </div>
      </div>
    </div>
  );
} 