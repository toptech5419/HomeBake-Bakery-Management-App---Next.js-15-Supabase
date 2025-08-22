import { createServer, createServiceRoleClient } from '@/lib/supabase/server';
import { breadTypeSchema, breadTypeUpdateSchema, breadTypeStatusSchema } from '@/lib/validations/bread-types';
import { isOwner, isManager, User } from '@/lib/auth/rbac';
import { BreadType } from '@/types';

interface BreadTypeInput {
  name: string;
  size?: string;
  unit_price: number;
  is_active?: boolean;
}

// Enhanced getBreadTypes with soft delete support
export async function getBreadTypes(includeInactive: boolean = false): Promise<BreadType[]> {
  try {
    const supabase = await createServer();
    
    let query = supabase
      .from('bread_types')
      .select('id, name, size, unit_price, created_by, created_at, is_active')
      .order('name');
    
    // By default, only show active bread types
    if (!includeInactive) {
      query = query.eq('is_active', true);
    }
    
    const { data, error } = await query.limit(50); // Increased limit for better UX
    
    if (error) {
      console.error('Error fetching bread types:', error);
      return [];
    }
    
    if (!data || data.length === 0) {
      return [];
    }
    
    // Enhanced transformation with soft delete support
    return data.map(item => ({
      id: item.id,
      name: item.name,
      size: item.size || undefined,
      unit_price: item.unit_price,
      created_by: item.created_by || undefined,
      created_at: item.created_at,
      is_active: item.is_active !== false, // Default to true for backwards compatibility
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
    is_active: parsed.data.is_active !== undefined ? parsed.data.is_active : true,
    created_by: currentUser.id
  }]);
  
  if (error) {
    console.error('Bread type creation error:', error);
    throw new Error(`Failed to create bread type: ${error.message}`);
  }
  
  return true;
}

export async function updateBreadType(currentUser: User, id: string, input: BreadTypeInput) {
  if (!isOwner(currentUser) && !isManager(currentUser)) {
    throw new Error('Unauthorized: Only owners and managers can update bread types');
  }
  
  const parsed = breadTypeUpdateSchema.safeParse(input);
  if (!parsed.success) {
    console.error('Bread type validation error:', parsed.error);
    throw new Error('Invalid bread type data');
  }
  
  const supabase = await createServer();
  
  // Get the current bread type data for comparison
  const { data: currentBreadType, error: fetchError } = await supabase
    .from('bread_types')
    .select('id, name, size, unit_price, is_active')
    .eq('id', id)
    .single();
    
  if (fetchError || !currentBreadType) {
    throw new Error('Bread type not found');
  }
  
  // Perform the update - database triggers handle name/price synchronization
  const updateData: any = {
    name: parsed.data.name,
    size: parsed.data.size,
    unit_price: parsed.data.unit_price
  };
  
  // Only include is_active if it's provided
  if (parsed.data.is_active !== undefined) {
    updateData.is_active = parsed.data.is_active;
  }
  
  const { error } = await supabase.from('bread_types').update(updateData).eq('id', id);
  
  if (error) {
    console.error('Bread type update error:', error);
    throw new Error(`Failed to update bread type: ${error.message}`);
  }
  
  // Enhanced audit logging
  const changes = [];
  if (currentBreadType.name !== parsed.data.name) {
    changes.push(`name: "${currentBreadType.name}" → "${parsed.data.name}"`);
  }
  if (currentBreadType.unit_price !== parsed.data.unit_price) {
    changes.push(`price: ₦${currentBreadType.unit_price} → ₦${parsed.data.unit_price}`);
  }
  if (currentBreadType.size !== parsed.data.size) {
    changes.push(`size: "${currentBreadType.size || 'none'}" → "${parsed.data.size || 'none'}"`);
  }
  if (parsed.data.is_active !== undefined && currentBreadType.is_active !== parsed.data.is_active) {
    changes.push(`status: ${currentBreadType.is_active ? 'ACTIVE' : 'INACTIVE'} → ${parsed.data.is_active ? 'ACTIVE' : 'INACTIVE'}`);
  }
  
  console.log(`✅ Bread type updated: ${changes.join(', ')} (ID: ${id})`);
  return true;
}

// New function: Soft delete (deactivate)
export async function deactivateBreadType(currentUser: User, id: string): Promise<boolean> {
  if (!isOwner(currentUser) && !isManager(currentUser)) {
    throw new Error('Unauthorized: Only owners and managers can deactivate bread types');
  }
  
  const supabase = await createServer();
  
  // Check if bread type exists and is currently active
  const { data: existing, error: fetchError } = await supabase
    .from('bread_types')
    .select('id, name, is_active')
    .eq('id', id)
    .single();
    
  if (fetchError || !existing) {
    throw new Error('Bread type not found');
  }
  
  if (!existing.is_active) {
    throw new Error('Bread type is already inactive');
  }
  
  // Perform soft delete
  const { error } = await supabase
    .from('bread_types')
    .update({ is_active: false })
    .eq('id', id);
  
  if (error) {
    console.error('Bread type deactivation error:', error);
    throw new Error(`Failed to deactivate bread type: ${error.message}`);
  }
  
  console.log(`✅ Bread type "${existing.name}" deactivated successfully (ID: ${id})`);
  return true;
}

// New function: Reactivate bread type
export async function reactivateBreadType(currentUser: User, id: string): Promise<boolean> {
  if (!isOwner(currentUser) && !isManager(currentUser)) {
    throw new Error('Unauthorized: Only owners and managers can reactivate bread types');
  }
  
  const supabase = await createServer();
  
  // Check if bread type exists and is currently inactive
  const { data: existing, error: fetchError } = await supabase
    .from('bread_types')
    .select('id, name, is_active')
    .eq('id', id)
    .single();
    
  if (fetchError || !existing) {
    throw new Error('Bread type not found');
  }
  
  if (existing.is_active) {
    throw new Error('Bread type is already active');
  }
  
  // Reactivate
  const { error } = await supabase
    .from('bread_types')
    .update({ is_active: true })
    .eq('id', id);
  
  if (error) {
    console.error('Bread type reactivation error:', error);
    throw new Error(`Failed to reactivate bread type: ${error.message}`);
  }
  
  console.log(`✅ Bread type "${existing.name}" reactivated successfully (ID: ${id})`);
  return true;
}

// Enhanced deleteBreadType - now even more restrictive since we have soft delete
export async function deleteBreadType(currentUser: User, id: string) {
  // Only owners can perform HARD deletes
  if (!isOwner(currentUser)) {
    throw new Error('Unauthorized: Only owners can permanently delete bread types. Consider deactivating instead.');
  }
  
  const supabase = createServiceRoleClient();
  
  // Check if bread type exists
  const { data: existing, error: fetchError } = await supabase
    .from('bread_types')
    .select('id, name, is_active')
    .eq('id', id)
    .single();
    
  if (fetchError || !existing) {
    throw new Error('Bread type not found');
  }
  
  // Recommend soft delete if bread type is still active
  if (existing.is_active) {
    throw new Error(
      `Cannot permanently delete active bread type "${existing.name}". ` +
      'Please deactivate it first if you want to remove it from active use.'
    );
  }
  
  // Enhanced dependency checking with detailed counts
  const dependencyChecks = await Promise.all([
    supabase.from('batches').select('id', { count: 'exact', head: true }).eq('bread_type_id', id),
    supabase.from('all_batches').select('id', { count: 'exact', head: true }).eq('bread_type_id', id),
    supabase.from('available_stock').select('id', { count: 'exact', head: true }).eq('bread_type_id', id),
    supabase.from('sales_logs').select('id', { count: 'exact', head: true }).eq('bread_type_id', id),
    supabase.from('production_logs').select('id', { count: 'exact', head: true }).eq('bread_type_id', id),
    supabase.from('remaining_bread').select('id', { count: 'exact', head: true }).eq('bread_type_id', id),
    supabase.from('inventory_logs').select('id', { count: 'exact', head: true }).eq('bread_type_id', id)
  ]);
  
  const [
    batchesResult, allBatchesResult, stockResult, salesResult, 
    productionResult, remainingBreadResult, inventoryLogsResult
  ] = dependencyChecks;
  
  // Enhanced dependency checking with comprehensive report
  const dependencies = [];
  if (batchesResult.count && batchesResult.count > 0) dependencies.push(`${batchesResult.count} active batches`);
  if (allBatchesResult.count && allBatchesResult.count > 0) dependencies.push(`${allBatchesResult.count} historical batches`);
  if (stockResult.count && stockResult.count > 0) dependencies.push(`${stockResult.count} inventory records`);
  if (salesResult.count && salesResult.count > 0) dependencies.push(`${salesResult.count} sales transactions`);
  if (productionResult.count && productionResult.count > 0) dependencies.push(`${productionResult.count} production logs`);
  if (remainingBreadResult.count && remainingBreadResult.count > 0) dependencies.push(`${remainingBreadResult.count} remaining bread records`);
  if (inventoryLogsResult.count && inventoryLogsResult.count > 0) dependencies.push(`${inventoryLogsResult.count} inventory adjustments`);
  
  if (dependencies.length > 0) {
    throw new Error(
      `❌ CANNOT PERMANENTLY DELETE "${existing.name}"\n\n` +
      `📊 Business Records Found:\n• ${dependencies.join('\n• ')}\n\n` +
      `🏛️ These records are required for:\n` +
      `• Financial auditing and tax compliance\n` +
      `• Business analytics and reporting\n` +
      `• Operational history tracking\n\n` +
      `💡 SOLUTION: The bread type has been deactivated and is hidden from daily operations. ` +
      `This preserves your business data while removing it from active use.`
    );
  }
  
  // If we reach here, it's truly safe to delete
  const { error } = await supabase.from('bread_types').delete().eq('id', id);
  
  if (error) {
    console.error('Bread type deletion error:', error);
    
    // Handle foreign key constraint violations with user-friendly messages
    if (error.code === '23503') {
      if (error.message.includes('batches') || error.message.includes('batch')) {
        throw new Error('Cannot delete this bread type as it has batch records. Historical batch data is required for reporting and auditing purposes.');
      } else if (error.message.includes('all_batches')) {
        throw new Error('Cannot delete this bread type as it has historical batch records. These records are needed for reporting and auditing.');
      } else if (error.message.includes('available_stock')) {
        throw new Error('Cannot delete this bread type as it has inventory records. Please clear the inventory first.');
      } else if (error.message.includes('sales_logs')) {
        throw new Error('Cannot delete this bread type as it has sales records. These records are needed for financial reporting.');
      } else if (error.message.includes('production_logs')) {
        throw new Error('Cannot delete this bread type as it has production records. These records are needed for operational tracking.');
      } else if (error.message.includes('remaining_bread')) {
        throw new Error('Cannot delete this bread type as it has remaining bread records. Please process remaining inventory first.');
      } else if (error.message.includes('inventory_logs')) {
        throw new Error('Cannot delete this bread type as it has inventory log records. These records are needed for audit trails.');
      } else {
        throw new Error('Cannot delete this bread type as it is being used by other records in the system. Historical data must be preserved for auditing purposes.');
      }
    }
    
    throw new Error(`Failed to delete bread type: ${error.message}`);
  }
  
  console.log(`✅ Bread type "${existing.name}" permanently deleted (ID: ${id})`);
  return true;
}