import { createServer } from '@/lib/supabase/server';
import { breadTypeSchema } from '@/lib/validations/bread-types';
import { isOwner, isManager, User } from '@/lib/auth/rbac';
import { BreadType } from '@/types';

interface BreadTypeInput {
  name: string;
  size?: string;
  unit_price: number;
}

export async function getBreadTypes(): Promise<BreadType[]> {
  try {
    const supabase = await createServer();
    const { data, error } = await supabase.from('bread_types').select('*').order('name');
    
    if (error) {
      console.error('Error fetching bread types:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Transform the data to match our TypeScript interface
    return data.map(item => ({
      id: item.id,
      name: item.name,
      size: item.size || undefined,
      unit_price: item.unit_price,
      createdBy: item.created_by,
      createdAt: new Date(item.created_at),
      updatedAt: undefined, // Not in database schema
      isActive: true, // Default to true since not in database schema
    }));
  } catch (error) {
    console.error('Error in getBreadTypes:', error);
    return [];
  }
}

export async function createBreadType(currentUser: User, input: BreadTypeInput) {
  if (!isOwner(currentUser) && !isManager(currentUser)) {
    throw new Error('Unauthorized: Only owners and managers can create bread types');
  }
  
  const parsed = breadTypeSchema.safeParse(input);
  if (!parsed.success) {
    console.error('Bread type validation error:', parsed.error);
    throw new Error('Invalid bread type data');
  }
  
  const supabase = await createServer();
  
  const { error } = await supabase.from('bread_types').insert([{
    name: parsed.data.name,
    size: parsed.data.size,
    unit_price: parsed.data.unit_price,
    created_by: currentUser.id
  }]);
  
  if (error) {
    console.error('Bread type creation error:', error);
    throw new Error(`Failed to create bread type: ${error.message}`);
  }
  
  return true;
}

export async function updateBreadType(currentUser: User, id: string, input: BreadTypeInput) {
  if (!isOwner(currentUser) && !isManager(currentUser)) throw new Error('Unauthorized');
  const parsed = breadTypeSchema.safeParse(input);
  if (!parsed.success) throw parsed.error;
  
  const supabase = await createServer();
  const { error } = await supabase.from('bread_types').update({
    name: parsed.data.name,
    size: parsed.data.size,
    unit_price: parsed.data.unit_price
  }).eq('id', id);
  if (error) throw error;
  return true;
}

export async function deleteBreadType(currentUser: User, id: string) {
  if (!isOwner(currentUser) && !isManager(currentUser)) {
    throw new Error('Unauthorized: Only owners and managers can delete bread types');
  }
  
  const supabase = await createServer();
  
  // First check if the bread type exists
  const { data: existing, error: fetchError } = await supabase
    .from('bread_types')
    .select('id, name')
    .eq('id', id)
    .single();
    
  if (fetchError || !existing) {
    throw new Error('Bread type not found');
  }
  
  // Check if this bread type is being used in production or sales logs
  const { data: productionLogs } = await supabase
    .from('production_logs')
    .select('id')
    .eq('bread_type_id', id)
    .limit(1);
    
  const { data: salesLogs } = await supabase
    .from('sales_logs')
    .select('id')
    .eq('bread_type_id', id)
    .limit(1);
    
  if (productionLogs && productionLogs.length > 0) {
    throw new Error('Cannot delete this bread type as it has production records. Please archive it instead.');
  }
  
  if (salesLogs && salesLogs.length > 0) {
    throw new Error('Cannot delete this bread type as it has sales records. Please archive it instead.');
  }
  
  // Perform the deletion
  const { error } = await supabase.from('bread_types').delete().eq('id', id);
  
  if (error) {
    console.error('Bread type deletion error:', error);
    throw new Error(`Failed to delete bread type: ${error.message}`);
  }
  
  return true;
} 