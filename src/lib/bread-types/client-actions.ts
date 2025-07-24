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

export async function createBreadType(data: {
  name: string;
  unit_price: number;
  size?: string;
  created_by: string;
}) {
  const { error } = await supabase.from('bread_types').insert([{
    name: data.name,
    unit_price: data.unit_price,
    size: data.size,
    created_by: data.created_by,
  }]);

  if (error) {
    throw new Error(`Failed to create bread type: ${error.message}`);
  }

  return { success: true };
}

export async function updateBreadTypeClient(user: User, id: string, input: BreadTypeInput) {
  if (user.role !== 'owner') throw new Error('Unauthorized');
  
  const parsed = breadTypeSchema.safeParse(input);
  if (!parsed.success) throw parsed.error;
  
  const { error } = await supabase.from('bread_types').update(parsed.data).eq('id', id);
  if (error) throw error;
  return true;
} 

export async function getBreadTypesClient() {
  const { data, error } = await supabase
    .from('bread_types')
    .select('id, name, size, unit_price, created_by, created_at')
    .order('name');
  if (error) {
    console.error('Error fetching bread types:', error);
    return [];
  }
  return (data || []).map(item => ({
    id: item.id,
    name: item.name,
    size: item.size ?? null,
    unit_price: item.unit_price,
    created_by: item.created_by,
    created_at: item.created_at,
  }));
} 