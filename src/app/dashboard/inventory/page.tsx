import { createServer } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import InventoryClient from './InventoryClient';

export default async function InventoryPage() {
  const supabase = await createServer();
  const { data: { user }, error } = await supabase.auth.getUser();

  // Check authentication
  if (!user) {
    redirect('/login');
  }

  return <InventoryClient serverUser={user} />;
}
