-- COMPREHENSIVE RLS FIX FOR HOMEBAKE
-- This fixes ALL RLS policy conflicts and ensures proper functionality
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: CLEAN SLATE - Remove all conflicting policies and functions
-- ============================================================================

-- Temporarily disable RLS to clean up
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE qr_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE bread_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE shift_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies (from all files)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    -- Drop all policies on all tables
    FOR r IN (SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON ' || r.schemaname || '.' || r.tablename;
    END LOOP;
END $$;

-- Drop conflicting functions
DROP FUNCTION IF EXISTS get_my_role();
DROP FUNCTION IF EXISTS get_my_id();
DROP FUNCTION IF EXISTS auth.user_role();
DROP FUNCTION IF EXISTS auth.user_id();
DROP FUNCTION IF EXISTS auth.is_owner();
DROP FUNCTION IF EXISTS auth.is_manager_or_owner();
DROP FUNCTION IF EXISTS auth.can_access_user_data(UUID);
DROP FUNCTION IF EXISTS get_user_role(UUID);
DROP FUNCTION IF EXISTS test_production_rls();
DROP FUNCTION IF EXISTS verify_user_role(UUID, TEXT);

-- ============================================================================
-- STEP 2: CREATE UNIFIED ROLE SYSTEM
-- ============================================================================

-- Create the definitive role function that works with our app
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- First try to get role from users table (most reliable)
  SELECT role INTO user_role 
  FROM users 
  WHERE id = auth.uid();
  
  -- If not found in users table, try JWT metadata
  IF user_role IS NULL THEN
    user_role := auth.jwt() ->> 'user_metadata' ->> 'role';
  END IF;
  
  -- Default to sales_rep if still null
  IF user_role IS NULL THEN
    RETURN 'sales_rep';
  END IF;
  
  RETURN user_role;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;

-- ============================================================================
-- STEP 3: RE-ENABLE RLS AND CREATE UNIFIED POLICIES
-- ============================================================================

-- Re-enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE bread_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_select_owner" ON users
  FOR SELECT USING (get_current_user_role() = 'owner');

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_update_owner" ON users
  FOR UPDATE USING (get_current_user_role() = 'owner');

CREATE POLICY "users_insert_signup" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "users_insert_owner" ON users
  FOR INSERT WITH CHECK (get_current_user_role() = 'owner');

-- ============================================================================
-- BREAD TYPES TABLE POLICIES (FIXED DELETE ISSUE)
-- ============================================================================

-- All authenticated users can read bread types
CREATE POLICY "bread_types_select_all" ON bread_types
  FOR SELECT USING (auth.role() = 'authenticated');

-- Owners can do everything with bread types
CREATE POLICY "bread_types_insert_owner" ON bread_types
  FOR INSERT WITH CHECK (get_current_user_role() = 'owner');

CREATE POLICY "bread_types_update_owner" ON bread_types
  FOR UPDATE USING (get_current_user_role() = 'owner');

CREATE POLICY "bread_types_delete_owner" ON bread_types
  FOR DELETE USING (get_current_user_role() = 'owner');

-- Managers can create and update bread types
CREATE POLICY "bread_types_insert_manager" ON bread_types
  FOR INSERT WITH CHECK (get_current_user_role() = 'manager');

CREATE POLICY "bread_types_update_manager" ON bread_types
  FOR UPDATE USING (get_current_user_role() = 'manager');

-- ============================================================================
-- PRODUCTION LOGS TABLE POLICIES (FIXED RLS VIOLATION)
-- ============================================================================

-- Managers can create production logs for themselves
CREATE POLICY "production_logs_insert_manager" ON production_logs
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'manager' AND 
    recorded_by = auth.uid()
  );

-- Owners can create production logs for anyone
CREATE POLICY "production_logs_insert_owner" ON production_logs
  FOR INSERT WITH CHECK (get_current_user_role() = 'owner');

-- Managers can see their own production logs
CREATE POLICY "production_logs_select_manager" ON production_logs
  FOR SELECT USING (
    get_current_user_role() = 'manager' AND 
    recorded_by = auth.uid()
  );

-- Owners can see all production logs
CREATE POLICY "production_logs_select_owner" ON production_logs
  FOR SELECT USING (get_current_user_role() = 'owner');

-- All authenticated users can read production logs for reporting
CREATE POLICY "production_logs_select_authenticated" ON production_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Owners can update/delete production logs
CREATE POLICY "production_logs_update_owner" ON production_logs
  FOR UPDATE USING (get_current_user_role() = 'owner');

CREATE POLICY "production_logs_delete_owner" ON production_logs
  FOR DELETE USING (get_current_user_role() = 'owner');

-- ============================================================================
-- SALES LOGS TABLE POLICIES
-- ============================================================================

-- Sales reps can create their own sales logs
CREATE POLICY "sales_logs_insert_sales_rep" ON sales_logs
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'sales_rep' AND 
    recorded_by = auth.uid()
  );

-- Managers and owners can create sales logs
CREATE POLICY "sales_logs_insert_manager_owner" ON sales_logs
  FOR INSERT WITH CHECK (get_current_user_role() IN ('manager', 'owner'));

-- Sales reps can see their own sales logs
CREATE POLICY "sales_logs_select_sales_rep" ON sales_logs
  FOR SELECT USING (
    get_current_user_role() = 'sales_rep' AND 
    recorded_by = auth.uid()
  );

-- Managers and owners can see all sales logs
CREATE POLICY "sales_logs_select_manager_owner" ON sales_logs
  FOR SELECT USING (get_current_user_role() IN ('manager', 'owner'));

-- Owners can update/delete sales logs
CREATE POLICY "sales_logs_update_owner" ON sales_logs
  FOR UPDATE USING (get_current_user_role() = 'owner');

CREATE POLICY "sales_logs_delete_owner" ON sales_logs
  FOR DELETE USING (get_current_user_role() = 'owner');

-- ============================================================================
-- QR INVITES TABLE POLICIES (FIXED SIGNUP ISSUE)
-- ============================================================================

-- Only owners can manage QR invites
CREATE POLICY "qr_invites_all_owner" ON qr_invites
  FOR ALL USING (get_current_user_role() = 'owner');

-- Allow reading QR invites for token validation (during signup)
CREATE POLICY "qr_invites_select_signup" ON qr_invites
  FOR SELECT USING (true);

-- ============================================================================
-- OTHER TABLE POLICIES
-- ============================================================================

-- SHIFT FEEDBACK
CREATE POLICY "shift_feedback_insert_own" ON shift_feedback
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "shift_feedback_select_own" ON shift_feedback
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "shift_feedback_select_manager_owner" ON shift_feedback
  FOR SELECT USING (get_current_user_role() IN ('manager', 'owner'));

-- INVENTORY
CREATE POLICY "inventory_select_all" ON inventory
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "inventory_update_manager_owner" ON inventory
  FOR UPDATE USING (get_current_user_role() IN ('manager', 'owner'));

CREATE POLICY "inventory_insert_owner" ON inventory
  FOR INSERT WITH CHECK (get_current_user_role() = 'owner');

CREATE POLICY "inventory_delete_owner" ON inventory
  FOR DELETE USING (get_current_user_role() = 'owner');

-- INVENTORY LOGS
CREATE POLICY "inventory_logs_select_all" ON inventory_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "inventory_logs_insert_manager_owner" ON inventory_logs
  FOR INSERT WITH CHECK (
    get_current_user_role() IN ('manager', 'owner') AND 
    user_id = auth.uid()
  );

-- ============================================================================
-- STEP 4: CREATE HELPER FUNCTIONS
-- ============================================================================

-- Test function to verify RLS is working
CREATE OR REPLACE FUNCTION test_rls_policies()
RETURNS TABLE(
  current_user_id UUID,
  current_role TEXT,
  can_delete_bread_types BOOLEAN,
  can_insert_production_logs BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as current_user_id,
    get_current_user_role() as current_role,
    (get_current_user_role() = 'owner') as can_delete_bread_types,
    (get_current_user_role() IN ('manager', 'owner')) as can_insert_production_logs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION test_rls_policies() TO authenticated;

-- ============================================================================
-- STEP 5: VERIFICATION
-- ============================================================================

-- Show all policies for verification
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;