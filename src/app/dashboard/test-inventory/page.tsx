import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function TestInventoryPage() {
  const supabase = await createServer();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Direct database queries without React Query
  const { data: breadTypes } = await supabase
    .from('bread_types')
    .select('*')
    .limit(10);

  const { data: productionLogs } = await supabase
    .from('production_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: salesLogs } = await supabase
    .from('sales_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Test Inventory Page (No React Query)</h1>
        <Link href="/dashboard">
          <Button variant="outline">Back to Dashboard</Button>
        </Link>
      </div>
      
      <div className="grid grid-cols-3 gap-4">
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Bread Types</h2>
          <p className="text-2xl">{breadTypes?.length || 0}</p>
        </div>
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Recent Production</h2>
          <p className="text-2xl">{productionLogs?.length || 0}</p>
        </div>
        <div className="border rounded p-4">
          <h2 className="font-semibold mb-2">Recent Sales</h2>
          <p className="text-2xl">{salesLogs?.length || 0}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Navigation Test Links:</h3>
          <div className="flex gap-2">
            <Link href="/dashboard/production">
              <Button>Go to Production</Button>
            </Link>
            <Link href="/dashboard/reports">
              <Button>Go to Reports</Button>
            </Link>
            <Link href="/dashboard/inventory">
              <Button variant="destructive">Go to Real Inventory (May Freeze)</Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="p-4 bg-green-50 border border-green-200 rounded">
        <p className="text-green-800">
          ✅ This page loaded successfully without React Query!
        </p>
        <p className="text-sm text-green-700 mt-1">
          If this page works but the real inventory page freezes, the issue is with React Query or client-side data fetching.
        </p>
      </div>
    </div>
  );
}