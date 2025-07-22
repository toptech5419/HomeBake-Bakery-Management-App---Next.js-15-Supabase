import { createServer } from '@/lib/supabase/server';
import { InventoryClient } from './InventoryClient';
import { redirect } from 'next/navigation';

export default async function InventoryPage() {
  const supabase = await createServer();
  const { data: { user }, error } = await supabase.auth.getUser();

  console.log('Inventory page - User:', user);
  console.log('Inventory page - Auth error:', error);

  // Test database connection
  try {
    const { data: breadTypes, error: breadError } = await supabase
      .from('bread_types')
      .select('*')
      .limit(1);
    
    console.log('Database test - Bread types:', breadTypes);
    console.log('Database test - Error:', breadError);
  } catch (dbError) {
    console.error('Database connection error:', dbError);
  }

  // Check authentication
  if (!user) {
    console.log('No user found, redirecting to login');
    redirect('/login');
  }

  return <InventoryClient />;
}