import { supabase } from '@/lib/supabase/client';
import { breadTypeSchema } from '@/lib/validations/bread-types';

interface BreadTypeInput {
  name: string;
  size?: string;
  unit_price: number;
}

interface User {
  id: string;
  email?: string;
  role: string;
}

export async function deleteBreadTypeClient(user: User, id: string) {
  if (user.role !== 'owner') throw new Error('Unauthorized');
  
  const { error } = await supabase.from('bread_types').delete().eq('id', id);
  if (error) throw error;
  return true;
}

export async function createBreadTypeClient(user: User, input: BreadTypeInput) {
  if (user.role !== 'owner') throw new Error('Unauthorized');
  
  const parsed = breadTypeSchema.safeParse(input);
  if (!parsed.success) throw parsed.error;
  
  const { error } = await supabase.from('bread_types').insert([parsed.data]);
  if (error) throw error;
  return true;
}

export async function updateBreadTypeClient(user: User, id: string, input: BreadTypeInput) {
  if (user.role !== 'owner') throw new Error('Unauthorized');
  
  const parsed = breadTypeSchema.safeParse(input);
  if (!parsed.success) throw parsed.error;
  
  const { error } = await supabase.from('bread_types').update(parsed.data).eq('id', id);
  if (error) throw error;
  return true;
} 