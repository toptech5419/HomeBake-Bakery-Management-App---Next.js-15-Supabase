import { createServer } from '@/lib/supabase/server';
import { InventoryClient } from './InventoryClient';
import { redirect } from 'next/navigation';

export default async function InventoryPage() {
  const supabase = await createServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return <InventoryClient />;
}