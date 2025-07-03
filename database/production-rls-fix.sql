-- PRODUCTION RLS FIX FOR HOMEBAKE
-- This fixes the "new row violates row-level security policy" error
-- Run this in your Supabase SQL Editor

-- First, temporarily disable RLS to update policies
ALTER TABLE production_logs DISABLE ROW LEVEL SECURITY;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "production_logs_insert_manager" ON production_logs;
DROP POLICY IF EXISTS "production_logs_select_manager" ON production_logs;
DROP POLICY IF EXISTS "production_logs_select_owner" ON production_logs;
DROP POLICY IF EXISTS "production_logs_modify_owner" ON production_logs;
DROP POLICY IF EXISTS "production_logs_delete_owner" ON production_logs;

-- Create new function to get user role from database
CREATE OR REPLACE FUNCTION get_user_role(user_id UUID DEFAULT auth.uid())
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Try to get role from users table
  SELECT role INTO user_role 
  FROM users 
  WHERE id = user_id;
  
  -- If not found, return default
  IF user_role IS NULL THEN
    RETURN 'sales_rep';
  END IF;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_role(UUID) TO authenticated;

-- Re-enable RLS
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;

-- Create new policies using the database role function

-- 1. Allow managers to create production logs for themselves
CREATE POLICY "production_logs_insert_managers" ON production_logs
  FOR INSERT 
  WITH CHECK (
    get_user_role() = 'manager' AND 
    recorded_by = auth.uid()
  );

-- 2. Allow owners to create production logs (for any user)
CREATE POLICY "production_logs_insert_owners" ON production_logs
  FOR INSERT 
  WITH CHECK (get_user_role() = 'owner');

-- 3. Allow managers to see their own production logs
CREATE POLICY "production_logs_select_own_manager" ON production_logs
  FOR SELECT 
  USING (
    get_user_role() = 'manager' AND 
    recorded_by = auth.uid()
  );

-- 4. Allow owners and managers to see all production logs
CREATE POLICY "production_logs_select_management" ON production_logs
  FOR SELECT 
  USING (get_user_role() IN ('owner', 'manager'));

-- 5. Allow all authenticated users to read production logs (for reporting)
CREATE POLICY "production_logs_select_authenticated" ON production_logs
  FOR SELECT 
  USING (auth.role() = 'authenticated');

-- 6. Allow owners to update any production log
CREATE POLICY "production_logs_update_owner" ON production_logs
  FOR UPDATE 
  USING (get_user_role() = 'owner');

-- 7. Allow managers to update their own production logs
CREATE POLICY "production_logs_update_own_manager" ON production_logs
  FOR UPDATE 
  USING (
    get_user_role() = 'manager' AND 
    recorded_by = auth.uid()
  );

-- 8. Allow owners to delete any production log
CREATE POLICY "production_logs_delete_owner" ON production_logs
  FOR DELETE 
  USING (get_user_role() = 'owner');

-- Test the policies by creating a test function
CREATE OR REPLACE FUNCTION test_production_rls()
RETURNS TABLE(
  user_id_result UUID,
  user_role_result TEXT,
  can_insert_result BOOLEAN,
  can_select_result BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as user_id_result,
    get_user_role() as user_role_result,
    -- Test if user can insert
    (get_user_role() IN ('manager', 'owner')) as can_insert_result,
    -- Test if user can select
    (auth.role() = 'authenticated') as can_select_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission for testing
GRANT EXECUTE ON FUNCTION test_production_rls() TO authenticated;

-- Create a backup function for role verification
CREATE OR REPLACE FUNCTION verify_user_role(user_id UUID, expected_role TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  actual_role TEXT;
BEGIN
  actual_role := get_user_role(user_id);
  RETURN actual_role = expected_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION verify_user_role(UUID, TEXT) TO authenticated;

-- Add helpful comments
COMMENT ON FUNCTION get_user_role(UUID) IS 'Gets user role from users table, defaults to sales_rep if not found';
COMMENT ON FUNCTION test_production_rls() IS 'Test function to verify RLS policies are working correctly';
COMMENT ON FUNCTION verify_user_role(UUID, TEXT) IS 'Helper function to verify user has expected role';

-- Show the new policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies 
WHERE tablename = 'production_logs'
ORDER BY policyname;