import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import InventoryClient from './InventoryClient';

export default async function InventoryPage() {
  const supabase = await createServer();
  const { data: { user }, error } = await supabase.auth.getUser();

  console.log('Inventory page - User:', user);
  console.log('Inventory page - Auth error:', error);

  // Check authentication
  if (!user) {
    console.log('No user found, redirecting to login');
    redirect('/login');
  }

  return <InventoryClient />;
}
