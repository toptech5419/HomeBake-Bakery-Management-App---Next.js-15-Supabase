-- FIXED RLS POLICIES FOR HOMEBAKE
-- This file fixes the circular dependency issue with the original RLS policies
-- Run this in your Supabase SQL Editor to replace the problematic policies

-- First, disable RLS temporarily to clean up
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE qr_invites DISABLE ROW LEVEL SECURITY;
ALTER TABLE bread_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE sales_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE shift_feedback DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory DISABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs DISABLE ROW LEVEL SECURITY;

-- Drop all existing policies
DROP POLICY IF EXISTS "Users can see their own data" ON users;
DROP POLICY IF EXISTS "Owners and managers can see all users" ON users;
DROP POLICY IF EXISTS "Owners can see all users" ON users;
DROP POLICY IF EXISTS "Users can update their own data" ON users;
DROP POLICY IF EXISTS "Owners can update any user" ON users;
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;
DROP POLICY IF EXISTS "Authenticated users can read bread types" ON bread_types;
DROP POLICY IF EXISTS "Owners and managers can create bread types" ON bread_types;
DROP POLICY IF EXISTS "Owners and managers can update bread types" ON bread_types;
DROP POLICY IF EXISTS "Owners and managers can delete bread types" ON bread_types;
DROP POLICY IF EXISTS "Managers can create production logs" ON production_logs;
DROP POLICY IF EXISTS "Managers can see their own production logs" ON production_logs;
DROP POLICY IF EXISTS "Owners can see all production logs" ON production_logs;
DROP POLICY IF EXISTS "Sales reps can create sales logs" ON sales_logs;
DROP POLICY IF EXISTS "Sales reps can see their own sales logs" ON sales_logs;
DROP POLICY IF EXISTS "Managers and Owners can see all sales logs" ON sales_logs;
DROP POLICY IF EXISTS "Users can create their own feedback" ON shift_feedback;
DROP POLICY IF EXISTS "Users can see their own feedback" ON shift_feedback;
DROP POLICY IF EXISTS "Managers and Owners can see all feedback" ON shift_feedback;
DROP POLICY IF EXISTS "Owners can manage QR invites" ON qr_invites;

-- Drop the problematic utility functions
DROP FUNCTION IF EXISTS get_my_role();
DROP FUNCTION IF EXISTS get_my_id();

-- Create new utility functions that use JWT claims
CREATE OR REPLACE FUNCTION auth.user_role()
RETURNS TEXT AS $$
  SELECT COALESCE(
    auth.jwt() ->> 'user_metadata'::text ->> 'role'::text,
    'sales_rep'::text
  );
$$ LANGUAGE sql STABLE;

-- Function to check if user is authenticated
CREATE OR REPLACE FUNCTION auth.user_id()
RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE;

-- Re-enable RLS for all tables
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

-- Allow users to see their own data
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = auth.uid());

-- Allow owners to see all users
CREATE POLICY "users_select_owner" ON users
  FOR SELECT USING (auth.user_role() = 'owner');

-- Allow users to update their own data
CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid());

-- Allow owners to update any user
CREATE POLICY "users_update_owner" ON users
  FOR UPDATE USING (auth.user_role() = 'owner');

-- Allow user creation during signup (when user is authenticated)
CREATE POLICY "users_insert_signup" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

-- Allow owners to create users (for manual user creation)
CREATE POLICY "users_insert_owner" ON users
  FOR INSERT WITH CHECK (auth.user_role() = 'owner');

-- ============================================================================
-- BREAD TYPES TABLE POLICIES
-- ============================================================================

-- All authenticated users can read bread types
CREATE POLICY "bread_types_select_all" ON bread_types
  FOR SELECT USING (auth.role() = 'authenticated');

-- Owners can manage all bread types
CREATE POLICY "bread_types_all_owner" ON bread_types
  FOR ALL USING (auth.user_role() = 'owner');

-- ============================================================================
-- PRODUCTION LOGS TABLE POLICIES
-- ============================================================================

-- Managers can create production logs for themselves
CREATE POLICY "production_logs_insert_manager" ON production_logs
  FOR INSERT WITH CHECK (
    auth.user_role() = 'manager' AND 
    recorded_by = auth.uid()
  );

-- Managers can see their own production logs
CREATE POLICY "production_logs_select_manager" ON production_logs
  FOR SELECT USING (
    auth.user_role() = 'manager' AND 
    recorded_by = auth.uid()
  );

-- Owners can see all production logs
CREATE POLICY "production_logs_select_owner" ON production_logs
  FOR SELECT USING (auth.user_role() = 'owner');

-- Owners can update/delete production logs
CREATE POLICY "production_logs_modify_owner" ON production_logs
  FOR UPDATE USING (auth.user_role() = 'owner');

CREATE POLICY "production_logs_delete_owner" ON production_logs
  FOR DELETE USING (auth.user_role() = 'owner');

-- ============================================================================
-- SALES LOGS TABLE POLICIES
-- ============================================================================

-- Sales reps can create their own sales logs
CREATE POLICY "sales_logs_insert_sales_rep" ON sales_logs
  FOR INSERT WITH CHECK (
    auth.user_role() = 'sales_rep' AND 
    recorded_by = auth.uid()
  );

-- Sales reps can see their own sales logs
CREATE POLICY "sales_logs_select_sales_rep" ON sales_logs
  FOR SELECT USING (
    auth.user_role() = 'sales_rep' AND 
    recorded_by = auth.uid()
  );

-- Managers and owners can see all sales logs
CREATE POLICY "sales_logs_select_manager_owner" ON sales_logs
  FOR SELECT USING (auth.user_role() IN ('manager', 'owner'));

-- Owners can update/delete sales logs
CREATE POLICY "sales_logs_modify_owner" ON sales_logs
  FOR UPDATE USING (auth.user_role() = 'owner');

CREATE POLICY "sales_logs_delete_owner" ON sales_logs
  FOR DELETE USING (auth.user_role() = 'owner');

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
  FOR SELECT USING (auth.user_role() IN ('manager', 'owner'));

-- Owners can update/delete feedback
CREATE POLICY "shift_feedback_modify_owner" ON shift_feedback
  FOR UPDATE USING (auth.user_role() = 'owner');

CREATE POLICY "shift_feedback_delete_owner" ON shift_feedback
  FOR DELETE USING (auth.user_role() = 'owner');

-- ============================================================================
-- QR INVITES TABLE POLICIES
-- ============================================================================

-- Only owners can manage QR invites
CREATE POLICY "qr_invites_all_owner" ON qr_invites
  FOR ALL USING (auth.user_role() = 'owner');

-- ============================================================================
-- INVENTORY TABLE POLICIES
-- ============================================================================

-- All authenticated users can read inventory
CREATE POLICY "inventory_select_all" ON inventory
  FOR SELECT USING (auth.role() = 'authenticated');

-- Managers and owners can update inventory
CREATE POLICY "inventory_update_manager_owner" ON inventory
  FOR UPDATE USING (auth.user_role() IN ('manager', 'owner'));

-- Owners can insert/delete inventory items
CREATE POLICY "inventory_insert_owner" ON inventory
  FOR INSERT WITH CHECK (auth.user_role() = 'owner');

CREATE POLICY "inventory_delete_owner" ON inventory
  FOR DELETE USING (auth.user_role() = 'owner');

-- ============================================================================
-- INVENTORY LOGS TABLE POLICIES
-- ============================================================================

-- All authenticated users can read inventory logs
CREATE POLICY "inventory_logs_select_all" ON inventory_logs
  FOR SELECT USING (auth.role() = 'authenticated');

-- Managers and owners can create inventory logs
CREATE POLICY "inventory_logs_insert_manager_owner" ON inventory_logs
  FOR INSERT WITH CHECK (
    auth.user_role() IN ('manager', 'owner') AND 
    user_id = auth.uid()
  );

-- Owners can update/delete inventory logs
CREATE POLICY "inventory_logs_modify_owner" ON inventory_logs
  FOR UPDATE USING (auth.user_role() = 'owner');

CREATE POLICY "inventory_logs_delete_owner" ON inventory_logs
  FOR DELETE USING (auth.user_role() = 'owner');

-- ============================================================================
-- ADDITIONAL SECURITY FUNCTIONS
-- ============================================================================

-- Function to check if current user is owner
CREATE OR REPLACE FUNCTION auth.is_owner()
RETURNS BOOLEAN AS $$
  SELECT auth.user_role() = 'owner';
$$ LANGUAGE sql STABLE;

-- Function to check if current user is manager or owner
CREATE OR REPLACE FUNCTION auth.is_manager_or_owner()
RETURNS BOOLEAN AS $$
  SELECT auth.user_role() IN ('manager', 'owner');
$$ LANGUAGE sql STABLE;

-- Function to check if current user can access resource
CREATE OR REPLACE FUNCTION auth.can_access_user_data(user_id UUID)
RETURNS BOOLEAN AS $$
  SELECT 
    auth.uid() = user_id OR 
    auth.user_role() = 'owner';
$$ LANGUAGE sql STABLE;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA auth TO authenticated;
GRANT EXECUTE ON FUNCTION auth.user_role() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.user_id() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.is_manager_or_owner() TO authenticated;
GRANT EXECUTE ON FUNCTION auth.can_access_user_data(UUID) TO authenticated;