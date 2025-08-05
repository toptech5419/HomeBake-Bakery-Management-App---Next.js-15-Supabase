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
    // OPTIMIZED: Limit results and select only necessary fields
    const { data, error } = await supabase
      .from('bread_types')
      .select('id, name, size, unit_price, created_by, created_at')
      .order('name')
      .limit(20); // Limit to prevent excessive data processing
    
    if (error) {
      console.error('Error fetching bread types:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Simplified transformation to reduce processing time
    return data.map(item => ({
      id: item.id,
      name: item.name,
      size: item.size || undefined,
      unit_price: item.unit_price,
      created_by: item.created_by,
      created_at: item.created_at,
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
  
  // Check if this bread type is being used in any related tables
  const checks = await Promise.all([
    // Check production logs
    supabase
      .from('production_logs')
      .select('id')
      .eq('bread_type_id', id)
      .limit(1),
    
    // Check sales logs
    supabase
      .from('sales_logs')
      .select('id')
      .eq('bread_type_id', id)
      .limit(1)
  ]);
  
  const [productionResult, salesResult] = checks;
  
  if (productionResult.data && productionResult.data.length > 0) {
    throw new Error('Cannot delete this bread type as it has production records. Please archive it instead.');
  }
  
  if (salesResult.data && salesResult.data.length > 0) {
    throw new Error('Cannot delete this bread type as it has sales records. Please archive it instead.');
  }
  
  // Note: Additional checks for inventory table will be handled by database constraints
  
  // Perform the deletion
  const { error } = await supabase.from('bread_types').delete().eq('id', id);
  
  if (error) {
    console.error('Bread type deletion error:', error);
    
    // Handle foreign key constraint violations with user-friendly messages
    if (error.code === '23503') {
      if (error.message.includes('inventory')) {
        throw new Error('Cannot delete this bread type as it has inventory records. Please clear the inventory first or contact your administrator.');
      } else if (error.message.includes('production_logs')) {
        throw new Error('Cannot delete this bread type as it has production records. Please archive it instead.');
      } else if (error.message.includes('sales_logs')) {
        throw new Error('Cannot delete this bread type as it has sales records. Please archive it instead.');
      } else {
        throw new Error('Cannot delete this bread type as it is being used by other records in the system.');
      }
    }
    
    throw new Error(`Failed to delete bread type: ${error.message}`);
  }
  
  return true;
} 