import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import { UserRole } from '@/types';
import SalesNewClient from './SalesNewClient';

export default async function SalesNewPage() {
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

  // Fetch bread types
  const { data: breadTypes } = await supabase
    .from('bread_types')
    .select('*')
    .order('name');

  // Fetch today's production
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { data: todayProduction } = await supabase
    .from('production_logs')
    .select('bread_type_id, quantity')
    .gte('created_at', today.toISOString());

  // Fetch today's sales
  const { data: todaySales } = await supabase
    .from('sales_logs')
    .select('bread_type_id, quantity')
    .gte('created_at', today.toISOString());

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <SalesNewClient 
          breadTypes={breadTypes || []}
          todayProduction={todayProduction || []}
          todaySales={todaySales || []}
        />
      </div>
    </div>
  );
}