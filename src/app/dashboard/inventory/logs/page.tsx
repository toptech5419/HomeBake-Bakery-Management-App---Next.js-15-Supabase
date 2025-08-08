import { getProductionLogs } from '@/lib/dashboard/queries';
import { getCurrentUser } from '@/lib/auth/actions';
import { redirect } from 'next/navigation';
import InventoryLogsClient from './InventoryLogsClient';
import type { ProductionLogWithBreadType } from '@/types/database';

export default async function InventoryLogsPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  // Only owners and managers can view inventory logs
  if (user.role !== 'owner' && user.role !== 'manager') {
    redirect('/dashboard');
  }

  const productionLogs = await getProductionLogs();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Inventory Logs</h1>
        <p className="text-gray-600 mt-2">
          Track production and sales data for inventory management
        </p>
      </div>

      <InventoryLogsClient 
        productionLogs={productionLogs as any[]}
      />
    </div>
  );
}