import { getCurrentUser } from '@/lib/auth/actions';
import { getTodaysSales, getBreadTypes } from '@/lib/dashboard/queries';
import { redirect } from 'next/navigation';
import ShiftEndClient from './ShiftEndClient';
import type { SalesLogWithBreadType, BreadTypeDB } from '@/types/database';

export default async function ShiftEndPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }

  // Only sales reps can end shifts
  if (user.role !== 'sales_rep') {
    redirect('/dashboard');
  }

  const [todaysSales, breadTypes] = await Promise.all([
    getTodaysSales(user),
    getBreadTypes(user)
  ]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">End Shift</h1>
        <p className="text-gray-600 mt-2">
          Review today's sales and end your shift
        </p>
      </div>

      <ShiftEndClient 
        todaysSales={todaysSales as SalesLogWithBreadType[]}
        breadTypes={breadTypes as BreadTypeDB[]}
      />
    </div>
  );
}