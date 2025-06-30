-- COMPLETE HOMEBAKE DATABASE SCHEMA FIX
-- This file fixes all foreign key inconsistencies and creates working RLS policies
-- Run this after backing up your data

-- ============================================================================
-- STEP 1: TEMPORARILY DISABLE RLS AND FOREIGN KEY CHECKS
-- ============================================================================

-- Disable RLS temporarily
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE qr_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE bread_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE shift_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE sessions DISABLE ROW LEVEL SECURITY;

-- Temporarily disable foreign key constraints for cleanup
SET session_replication_role = replica;

-- ============================================================================
-- STEP 2: DROP ALL EXISTING POLICIES AND PROBLEMATIC CONSTRAINTS
-- ============================================================================

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can see their own data" ON users CASCADE;
DROP POLICY IF EXISTS "Owners and managers can see all users" ON users CASCADE;
DROP POLICY IF EXISTS "Owners can see all users" ON users CASCADE;
DROP POLICY IF EXISTS "Users can update their own data" ON users CASCADE;
DROP POLICY IF EXISTS "Owners can update any user" ON users CASCADE;
DROP POLICY IF EXISTS "Owners can delete any user" ON users CASCADE;
DROP POLICY IF EXISTS "Allow user creation during signup" ON users CASCADE;
DROP POLICY IF EXISTS "users_select_own" ON users CASCADE;
DROP POLICY IF EXISTS "users_select_owner" ON users CASCADE;
DROP POLICY IF EXISTS "users_update_own" ON users CASCADE;
DROP POLICY IF EXISTS "users_update_owner" ON users CASCADE;
DROP POLICY IF EXISTS "users_insert_signup" ON users CASCADE;
DROP POLICY IF EXISTS "users_insert_owner" ON users CASCADE;

-- Drop all bread_types policies
DROP POLICY IF EXISTS "Authenticated users can read bread types" ON bread_types CASCADE;
DROP POLICY IF EXISTS "Owners and managers can create bread types" ON bread_types CASCADE;
DROP POLICY IF EXISTS "Owners and managers can update bread types" ON bread_types CASCADE;
DROP POLICY IF EXISTS "Owners and managers can delete bread types" ON bread_types CASCADE;
DROP POLICY IF EXISTS "bread_types_select_all" ON bread_types CASCADE;
DROP POLICY IF EXISTS "bread_types_all_owner" ON bread_types CASCADE;

-- Drop all other policies
DROP POLICY IF EXISTS "Owners can manage QR invites" ON qr_invites CASCADE;
DROP POLICY IF EXISTS "qr_invites_all_owner" ON qr_invites CASCADE;

-- Drop production_logs policies
DROP POLICY IF EXISTS "Managers can create production logs" ON production_logs CASCADE;
DROP POLICY IF EXISTS "Managers can see their own production logs" ON production_logs CASCADE;
DROP POLICY IF EXISTS "Owners can see all production logs" ON production_logs CASCADE;
DROP POLICY IF EXISTS "production_logs_insert_manager" ON production_logs CASCADE;
DROP POLICY IF EXISTS "production_logs_select_manager" ON production_logs CASCADE;
DROP POLICY IF EXISTS "production_logs_select_owner" ON production_logs CASCADE;
DROP POLICY IF EXISTS "production_logs_modify_owner" ON production_logs CASCADE;
DROP POLICY IF EXISTS "production_logs_delete_owner" ON production_logs CASCADE;

-- Drop sales_logs policies
DROP POLICY IF EXISTS "Sales reps can create sales logs" ON sales_logs CASCADE;
DROP POLICY IF EXISTS "Sales reps can see their own sales logs" ON sales_logs CASCADE;
DROP POLICY IF EXISTS "Managers and owners can see all sales logs" ON sales_logs CASCADE;
DROP POLICY IF EXISTS "sales_logs_insert_sales_rep" ON sales_logs CASCADE;
DROP POLICY IF EXISTS "sales_logs_select_sales_rep" ON sales_logs CASCADE;
DROP POLICY IF EXISTS "sales_logs_select_manager_owner" ON sales_logs CASCADE;
DROP POLICY IF EXISTS "sales_logs_modify_owner" ON sales_logs CASCADE;
DROP POLICY IF EXISTS "sales_logs_delete_owner" ON sales_logs CASCADE;

-- Drop shift_feedback policies
DROP POLICY IF EXISTS "Users can create their own feedback" ON shift_feedback CASCADE;
DROP POLICY IF EXISTS "Users can see their own feedback" ON shift_feedback CASCADE;
DROP POLICY IF EXISTS "Managers and owners can see all feedback" ON shift_feedback CASCADE;
DROP POLICY IF EXISTS "shift_feedback_insert_own" ON shift_feedback CASCADE;
DROP POLICY IF EXISTS "shift_feedback_select_own" ON shift_feedback CASCADE;
DROP POLICY IF EXISTS "shift_feedback_select_manager_owner" ON shift_feedback CASCADE;
DROP POLICY IF EXISTS "shift_feedback_modify_owner" ON shift_feedback CASCADE;
DROP POLICY IF EXISTS "shift_feedback_delete_owner" ON shift_feedback CASCADE;

-- Drop inventory policies
DROP POLICY IF EXISTS "inventory_select_all" ON inventory CASCADE;
DROP POLICY IF EXISTS "inventory_update_manager_owner" ON inventory CASCADE;
DROP POLICY IF EXISTS "inventory_insert_owner" ON inventory CASCADE;
DROP POLICY IF EXISTS "inventory_delete_owner" ON inventory CASCADE;

-- Drop inventory_logs policies
DROP POLICY IF EXISTS "inventory_logs_select_all" ON inventory_logs CASCADE;
DROP POLICY IF EXISTS "inventory_logs_insert_manager_owner" ON inventory_logs CASCADE;
DROP POLICY IF EXISTS "inventory_logs_modify_owner" ON inventory_logs CASCADE;
DROP POLICY IF EXISTS "inventory_logs_delete_owner" ON inventory_logs CASCADE;

-- Drop profiles policies
DROP POLICY IF EXISTS "Owners can see all profiles" ON profiles CASCADE;
DROP POLICY IF EXISTS "profiles_select_own" ON profiles CASCADE;
DROP POLICY IF EXISTS "profiles_select_owner" ON profiles CASCADE;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles CASCADE;
DROP POLICY IF EXISTS "profiles_insert_signup" ON profiles CASCADE;

-- Drop problematic functions
DROP FUNCTION IF EXISTS get_my_role() CASCADE;
DROP FUNCTION IF EXISTS get_my_id() CASCADE;

-- ============================================================================
-- STEP 3: FIX FOREIGN KEY CONSTRAINTS
-- ============================================================================

-- Drop existing foreign keys that might be problematic
ALTER TABLE bread_types DROP CONSTRAINT IF EXISTS bread_types_created_by_fkey;
ALTER TABLE production_logs DROP CONSTRAINT IF EXISTS production_logs_recorded_by_fkey;
ALTER TABLE sales_logs DROP CONSTRAINT IF EXISTS sales_logs_recorded_by_fkey;
ALTER TABLE qr_invites DROP CONSTRAINT IF EXISTS qr_invites_created_by_fkey;
ALTER TABLE shift_feedback DROP CONSTRAINT IF EXISTS shift_feedback_user_id_fkey;
ALTER TABLE inventory_logs DROP CONSTRAINT IF EXISTS inventory_logs_user_id_fkey;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_user_id_fkey;
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_created_by_fkey;

-- Re-enable foreign key constraints
SET session_replication_role = DEFAULT;

-- Add consistent foreign keys - we'll use the public.users table as the main reference
-- since it exists in the TypeScript types and is being used by the application

-- Users table self-reference
ALTER TABLE users ADD CONSTRAINT users_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

-- Profiles table (if it exists and is needed)
ALTER TABLE profiles ADD CONSTRAINT profiles_id_fkey 
  FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- All other tables reference users table (not auth.users)
ALTER TABLE bread_types ADD CONSTRAINT bread_types_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL;

ALTER TABLE production_logs ADD CONSTRAINT production_logs_recorded_by_fkey 
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE sales_logs ADD CONSTRAINT sales_logs_recorded_by_fkey 
  FOREIGN KEY (recorded_by) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE qr_invites ADD CONSTRAINT qr_invites_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE shift_feedback ADD CONSTRAINT shift_feedback_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE inventory_logs ADD CONSTRAINT inventory_logs_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE sessions ADD CONSTRAINT sessions_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- ============================================================================
-- STEP 4: CREATE SIMPLE, WORKING RLS POLICIES
-- ============================================================================

-- Re-enable RLS for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE bread_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Create a helper function to get current user from users table
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS text AS $$
BEGIN
  RETURN (
    SELECT role 
    FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- USERS TABLE POLICIES
-- ============================================================================

-- Users can see their own data
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = auth.uid());

-- Owners can see all users
CREATE POLICY "users_select_owner" ON users
  FOR SELECT USING (get_current_user_role() = 'owner');

-- Users can update their own data
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid());

-- Owners can update any user
CREATE POLICY "users_update_owner" ON users
  FOR UPDATE USING (get_current_user_role() = 'owner');

-- Allow user creation during signup and by owners
CREATE POLICY "users_insert_all" ON users
  FOR INSERT WITH CHECK (true);

-- Only owners can delete users
CREATE POLICY "users_delete_owner" ON users
  FOR DELETE USING (get_current_user_role() = 'owner');

-- ============================================================================
-- BREAD TYPES TABLE POLICIES
-- ============================================================================

-- All authenticated users can read bread types
CREATE POLICY "bread_types_select_all" ON bread_types
  FOR SELECT USING (auth.role() = 'authenticated');

-- Owners can manage all bread types
CREATE POLICY "bread_types_manage_owner" ON bread_types
  FOR ALL USING (get_current_user_role() = 'owner');

-- ============================================================================
-- PRODUCTION LOGS TABLE POLICIES
-- ============================================================================

-- Managers can create their own production logs
CREATE POLICY "production_logs_insert_manager" ON production_logs
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'manager' AND recorded_by = auth.uid()
  );

-- Managers can see their own logs
CREATE POLICY "production_logs_select_manager" ON production_logs
  FOR SELECT USING (
    get_current_user_role() = 'manager' AND recorded_by = auth.uid()
  );

-- Owners can see all production logs
CREATE POLICY "production_logs_select_owner" ON production_logs
  FOR SELECT USING (get_current_user_role() = 'owner');

-- Owners can modify production logs
CREATE POLICY "production_logs_modify_owner" ON production_logs
  FOR UPDATE USING (get_current_user_role() = 'owner');

CREATE POLICY "production_logs_delete_owner" ON production_logs
  FOR DELETE USING (get_current_user_role() = 'owner');

-- ============================================================================
-- SALES LOGS TABLE POLICIES
-- ============================================================================

-- Sales reps can create their own sales logs
CREATE POLICY "sales_logs_insert_sales_rep" ON sales_logs
  FOR INSERT WITH CHECK (
    get_current_user_role() = 'sales_rep' AND recorded_by = auth.uid()
  );

-- Sales reps can see their own sales logs
CREATE POLICY "sales_logs_select_sales_rep" ON sales_logs
  FOR SELECT USING (
    get_current_user_role() = 'sales_rep' AND recorded_by = auth.uid()
  );

-- Managers and owners can see all sales logs
CREATE POLICY "sales_logs_select_manager_owner" ON sales_logs
  FOR SELECT USING (
    get_current_user_role() IN ('manager', 'owner')
  );

-- Owners can modify sales logs
CREATE POLICY "sales_logs_modify_owner" ON sales_logs
  FOR UPDATE USING (get_current_user_role() = 'owner');

CREATE POLICY "sales_logs_delete_owner" ON sales_logs
  FOR DELETE USING (get_current_user_role() = 'owner');

-- ============================================================================
-- SHIFT FEEDBACK TABLE POLICIES
-- ============================================================================

-- Users can create their own feedback
CREATE POLICY "shift_feedback_insert_own" ON shift_feedback
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can see their own feedback
CREATE POLICY "shift_feedback_select_own" ON shift_feedback
  FOR SELECT USING (user_id = auth.uid());

-- Managers and owners can see all feedback
CREATE POLICY "shift_feedback_select_manager_owner" ON shift_feedback
  FOR SELECT USING (
    get_current_user_role() IN ('manager', 'owner')
  );

-- ============================================================================
-- QR INVITES TABLE POLICIES
-- ============================================================================

-- Only owners can manage QR invites
CREATE POLICY "qr_invites_manage_owner" ON qr_invites
  FOR ALL USING (get_current_user_role() = 'owner');

-- ============================================================================
-- INVENTORY TABLE POLICIES
-- ============================================================================

-- All authenticated users can read inventory
CREATE POLICY "inventory_select_all" ON inventory
  FOR SELECT USING (auth.role() = 'authenticated');

-- Managers and owners can update inventory
CREATE POLICY "inventory_update_manager_owner" ON inventory
  FOR UPDATE USING (
    get_current_user_role() IN ('manager', 'owner')
  );

-- Owners can insert/delete inventory items
CREATE POLICY "inventory_insert_owner" ON inventory
  FOR INSERT WITH CHECK (get_current_user_role() = 'owner');

CREATE POLICY "inventory_delete_owner" ON inventory
  FOR DELETE USING (get_current_user_role() = 'owner');

-- ============================================================================
-- INVENTORY LOGS TABLE POLICIES
-- ============================================================================

-- All authenticated users can read inventory logs
CREATE POLICY "inventory_logs_select_all" ON inventory_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Managers and owners can create inventory logs
CREATE POLICY "inventory_logs_insert_manager_owner" ON inventory_logs
  FOR INSERT WITH CHECK (
    get_current_user_role() IN ('manager', 'owner') AND user_id = auth.uid()
  );

-- Owners can modify inventory logs
CREATE POLICY "inventory_logs_modify_owner" ON inventory_logs
  FOR UPDATE USING (get_current_user_role() = 'owner');

CREATE POLICY "inventory_logs_delete_owner" ON inventory_logs
  FOR DELETE USING (get_current_user_role() = 'owner');

-- ============================================================================
-- PROFILES TABLE POLICIES (if needed)
-- ============================================================================

-- Users can see their own profile
CREATE POLICY "profiles_select_own" ON profiles
  FOR SELECT USING (id = auth.uid());

-- Owners can see all profiles
CREATE POLICY "profiles_select_owner" ON profiles
  FOR SELECT USING (get_current_user_role() = 'owner');

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (id = auth.uid());

-- Allow profile creation during signup
CREATE POLICY "profiles_insert_signup" ON profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ============================================================================
-- SESSIONS TABLE POLICIES
-- ============================================================================

-- Users can see their own sessions
CREATE POLICY "sessions_select_own" ON sessions
  FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own sessions
CREATE POLICY "sessions_insert_own" ON sessions
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
CREATE POLICY "sessions_update_own" ON sessions
  FOR UPDATE USING (user_id = auth.uid());

-- Users can delete their own sessions
CREATE POLICY "sessions_delete_own" ON sessions
  FOR DELETE USING (user_id = auth.uid());

-- ============================================================================
-- FINAL VERIFICATION
-- ============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Ensure the helper function is accessible
GRANT EXECUTE ON FUNCTION get_current_user_role() TO authenticated;

-- Test the helper function (this should not fail)
SELECT get_current_user_role();

-- End of schema fix