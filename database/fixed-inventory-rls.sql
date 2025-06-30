-- FIX INVENTORY RLS POLICIES FOR MANAGER ACCESS
-- This fixes the production log save error by allowing managers to update inventory

-- Drop existing inventory policies
DROP POLICY IF EXISTS "inventory_select_all" ON inventory;
DROP POLICY IF EXISTS "inventory_update_manager_owner" ON inventory;
DROP POLICY IF EXISTS "inventory_insert_owner" ON inventory;
DROP POLICY IF EXISTS "inventory_delete_owner" ON inventory;

-- Recreate inventory policies with proper manager access
-- All authenticated users can read inventory
CREATE POLICY "inventory_select_all" ON inventory
  FOR SELECT USING (auth.role() = 'authenticated');

-- Managers and owners can insert/update inventory (needed for production logging)
CREATE POLICY "inventory_insert_manager_owner" ON inventory
  FOR INSERT WITH CHECK (
    get_current_user_role() IN ('manager', 'owner')
  );

CREATE POLICY "inventory_update_manager_owner" ON inventory
  FOR UPDATE USING (
    get_current_user_role() IN ('manager', 'owner')
  );

-- Only owners can delete inventory items
CREATE POLICY "inventory_delete_owner" ON inventory
  FOR DELETE USING (get_current_user_role() = 'owner');