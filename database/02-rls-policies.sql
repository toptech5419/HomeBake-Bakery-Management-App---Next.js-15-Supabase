-- HomeBake RLS Policies - Production Ready Implementation
-- This script creates comprehensive Row Level Security policies for all tables
-- Run this after enabling RLS on all tables in Supabase dashboard

-- =======================
-- ENABLE RLS (if not already enabled)
-- =======================
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.all_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.available_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bread_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.push_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.qr_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.remaining_bread ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- =======================
-- HELPER FUNCTIONS
-- =======================

-- Get current user role from public.users table
CREATE OR REPLACE FUNCTION public.get_user_role(user_uuid uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  IF user_uuid IS NULL THEN
    RETURN NULL;
  END IF;
  
  SELECT role INTO user_role
  FROM public.users
  WHERE id = user_uuid AND is_active = true;
  
  RETURN COALESCE(user_role, NULL);
END;
$$;

-- Check if current user is owner
CREATE OR REPLACE FUNCTION public.is_owner(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN public.get_user_role(user_uuid) = 'owner';
END;
$$;

-- Check if current user is manager or owner
CREATE OR REPLACE FUNCTION public.is_manager_or_owner(user_uuid uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_role text;
BEGIN
  user_role := public.get_user_role(user_uuid);
  RETURN user_role IN ('manager', 'owner');
END;
$$;

-- =======================
-- USERS TABLE POLICIES
-- =======================

-- Users can read their own record
DROP POLICY IF EXISTS "users_select_own" ON public.users;
CREATE POLICY "users_select_own" ON public.users
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Owners can read all users
DROP POLICY IF EXISTS "users_select_owner" ON public.users;
CREATE POLICY "users_select_owner" ON public.users
  FOR SELECT
  TO authenticated
  USING (public.is_owner());

-- Managers can read other managers and sales reps
DROP POLICY IF EXISTS "users_select_manager" ON public.users;
CREATE POLICY "users_select_manager" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    public.is_manager_or_owner() AND role IN ('manager', 'sales_rep')
  );

-- Allow user creation for signup process (via service role)
DROP POLICY IF EXISTS "users_insert_service" ON public.users;
CREATE POLICY "users_insert_service" ON public.users
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Only owners can update user records
DROP POLICY IF EXISTS "users_update_owner" ON public.users;
CREATE POLICY "users_update_owner" ON public.users
  FOR UPDATE
  TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

-- Only owners can delete users
DROP POLICY IF EXISTS "users_delete_owner" ON public.users;
CREATE POLICY "users_delete_owner" ON public.users
  FOR DELETE
  TO authenticated
  USING (public.is_owner());

-- =======================
-- PROFILES TABLE POLICIES
-- =======================

-- Users can read their own profile
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
CREATE POLICY "profiles_select_own" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

-- Allow profile creation during signup
DROP POLICY IF EXISTS "profiles_insert_signup" ON public.profiles;
CREATE POLICY "profiles_insert_signup" ON public.profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

-- Users can update their own profile
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- =======================
-- BREAD TYPES POLICIES
-- =======================

-- All authenticated users can read bread types
DROP POLICY IF EXISTS "bread_types_select_all" ON public.bread_types;
CREATE POLICY "bread_types_select_all" ON public.bread_types
  FOR SELECT
  TO authenticated
  USING (true);

-- Only owners and managers can create bread types
DROP POLICY IF EXISTS "bread_types_insert_manager" ON public.bread_types;
CREATE POLICY "bread_types_insert_manager" ON public.bread_types
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_manager_or_owner());

-- Only owners and managers can update bread types
DROP POLICY IF EXISTS "bread_types_update_manager" ON public.bread_types;
CREATE POLICY "bread_types_update_manager" ON public.bread_types
  FOR UPDATE
  TO authenticated
  USING (public.is_manager_or_owner())
  WITH CHECK (public.is_manager_or_owner());

-- Only owners can delete bread types
DROP POLICY IF EXISTS "bread_types_delete_owner" ON public.bread_types;
CREATE POLICY "bread_types_delete_owner" ON public.bread_types
  FOR DELETE
  TO authenticated
  USING (public.is_owner());

-- =======================
-- BATCHES POLICIES
-- =======================

-- All authenticated users can read batches
DROP POLICY IF EXISTS "batches_select_all" ON public.batches;
CREATE POLICY "batches_select_all" ON public.batches
  FOR SELECT
  TO authenticated
  USING (true);

-- Managers and owners can create batches
DROP POLICY IF EXISTS "batches_insert_manager" ON public.batches;
CREATE POLICY "batches_insert_manager" ON public.batches
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_manager_or_owner());

-- Managers and owners can update batches
DROP POLICY IF EXISTS "batches_update_manager" ON public.batches;
CREATE POLICY "batches_update_manager" ON public.batches
  FOR UPDATE
  TO authenticated
  USING (public.is_manager_or_owner())
  WITH CHECK (public.is_manager_or_owner());

-- Only owners can delete batches
DROP POLICY IF EXISTS "batches_delete_owner" ON public.batches;
CREATE POLICY "batches_delete_owner" ON public.batches
  FOR DELETE
  TO authenticated
  USING (public.is_owner());

-- =======================
-- ALL BATCHES POLICIES
-- =======================

-- All authenticated users can read all_batches
DROP POLICY IF EXISTS "all_batches_select_all" ON public.all_batches;
CREATE POLICY "all_batches_select_all" ON public.all_batches
  FOR SELECT
  TO authenticated
  USING (true);

-- System can insert into all_batches (via triggers/functions)
DROP POLICY IF EXISTS "all_batches_insert_system" ON public.all_batches;
CREATE POLICY "all_batches_insert_system" ON public.all_batches
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_manager_or_owner());

-- Only owners can update all_batches
DROP POLICY IF EXISTS "all_batches_update_owner" ON public.all_batches;
CREATE POLICY "all_batches_update_owner" ON public.all_batches
  FOR UPDATE
  TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

-- =======================
-- SALES LOGS POLICIES
-- =======================

-- All authenticated users can read sales logs
DROP POLICY IF EXISTS "sales_logs_select_all" ON public.sales_logs;
CREATE POLICY "sales_logs_select_all" ON public.sales_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can create sales logs
DROP POLICY IF EXISTS "sales_logs_insert_all" ON public.sales_logs;
CREATE POLICY "sales_logs_insert_all" ON public.sales_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own sales logs, managers/owners can update any
DROP POLICY IF EXISTS "sales_logs_update_own_or_manager" ON public.sales_logs;
CREATE POLICY "sales_logs_update_own_or_manager" ON public.sales_logs
  FOR UPDATE
  TO authenticated
  USING (recorded_by = auth.uid() OR public.is_manager_or_owner())
  WITH CHECK (recorded_by = auth.uid() OR public.is_manager_or_owner());

-- Only owners can delete sales logs
DROP POLICY IF EXISTS "sales_logs_delete_owner" ON public.sales_logs;
CREATE POLICY "sales_logs_delete_owner" ON public.sales_logs
  FOR DELETE
  TO authenticated
  USING (public.is_owner());

-- =======================
-- PRODUCTION LOGS POLICIES
-- =======================

-- All authenticated users can read production logs
DROP POLICY IF EXISTS "production_logs_select_all" ON public.production_logs;
CREATE POLICY "production_logs_select_all" ON public.production_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can create production logs
DROP POLICY IF EXISTS "production_logs_insert_all" ON public.production_logs;
CREATE POLICY "production_logs_insert_all" ON public.production_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own logs, managers/owners can update any
DROP POLICY IF EXISTS "production_logs_update_own_or_manager" ON public.production_logs;
CREATE POLICY "production_logs_update_own_or_manager" ON public.production_logs
  FOR UPDATE
  TO authenticated
  USING (recorded_by = auth.uid() OR public.is_manager_or_owner())
  WITH CHECK (recorded_by = auth.uid() OR public.is_manager_or_owner());

-- =======================
-- INVENTORY & AVAILABLE STOCK POLICIES
-- =======================

-- All authenticated users can read inventory
DROP POLICY IF EXISTS "inventory_select_all" ON public.inventory;
CREATE POLICY "inventory_select_all" ON public.inventory
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "available_stock_select_all" ON public.available_stock;
CREATE POLICY "available_stock_select_all" ON public.available_stock
  FOR SELECT
  TO authenticated
  USING (true);

-- Managers and owners can modify inventory
DROP POLICY IF EXISTS "inventory_insert_manager" ON public.inventory;
CREATE POLICY "inventory_insert_manager" ON public.inventory
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_manager_or_owner());

DROP POLICY IF EXISTS "available_stock_insert_manager" ON public.available_stock;
CREATE POLICY "available_stock_insert_manager" ON public.available_stock
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_manager_or_owner());

DROP POLICY IF EXISTS "inventory_update_manager" ON public.inventory;
CREATE POLICY "inventory_update_manager" ON public.inventory
  FOR UPDATE
  TO authenticated
  USING (public.is_manager_or_owner())
  WITH CHECK (public.is_manager_or_owner());

DROP POLICY IF EXISTS "available_stock_update_manager" ON public.available_stock;
CREATE POLICY "available_stock_update_manager" ON public.available_stock
  FOR UPDATE
  TO authenticated
  USING (public.is_manager_or_owner())
  WITH CHECK (public.is_manager_or_owner());

-- =======================
-- INVENTORY LOGS POLICIES
-- =======================

-- All authenticated users can read inventory logs
DROP POLICY IF EXISTS "inventory_logs_select_all" ON public.inventory_logs;
CREATE POLICY "inventory_logs_select_all" ON public.inventory_logs
  FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can create inventory logs
DROP POLICY IF EXISTS "inventory_logs_insert_all" ON public.inventory_logs;
CREATE POLICY "inventory_logs_insert_all" ON public.inventory_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =======================
-- ACTIVITIES POLICIES
-- =======================

-- All authenticated users can read activities
DROP POLICY IF EXISTS "activities_select_all" ON public.activities;
CREATE POLICY "activities_select_all" ON public.activities
  FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can create activities
DROP POLICY IF EXISTS "activities_insert_all" ON public.activities;
CREATE POLICY "activities_insert_all" ON public.activities
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =======================
-- PUSH NOTIFICATION PREFERENCES POLICIES
-- =======================

-- Users can read their own push preferences
DROP POLICY IF EXISTS "push_preferences_select_own" ON public.push_notification_preferences;
CREATE POLICY "push_preferences_select_own" ON public.push_notification_preferences
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own push preferences
DROP POLICY IF EXISTS "push_preferences_insert_own" ON public.push_notification_preferences;
CREATE POLICY "push_preferences_insert_own" ON public.push_notification_preferences
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own push preferences
DROP POLICY IF EXISTS "push_preferences_update_own" ON public.push_notification_preferences;
CREATE POLICY "push_preferences_update_own" ON public.push_notification_preferences
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own push preferences
DROP POLICY IF EXISTS "push_preferences_delete_own" ON public.push_notification_preferences;
CREATE POLICY "push_preferences_delete_own" ON public.push_notification_preferences
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =======================
-- QR INVITES POLICIES
-- =======================

-- Only owners can read QR invites
DROP POLICY IF EXISTS "qr_invites_select_owner" ON public.qr_invites;
CREATE POLICY "qr_invites_select_owner" ON public.qr_invites
  FOR SELECT
  TO authenticated
  USING (public.is_owner());

-- Only owners can create QR invites
DROP POLICY IF EXISTS "qr_invites_insert_owner" ON public.qr_invites;
CREATE POLICY "qr_invites_insert_owner" ON public.qr_invites
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_owner());

-- Only owners can update QR invites
DROP POLICY IF EXISTS "qr_invites_update_owner" ON public.qr_invites;
CREATE POLICY "qr_invites_update_owner" ON public.qr_invites
  FOR UPDATE
  TO authenticated
  USING (public.is_owner())
  WITH CHECK (public.is_owner());

-- =======================
-- REMAINING BREAD POLICIES
-- =======================

-- All authenticated users can read remaining bread
DROP POLICY IF EXISTS "remaining_bread_select_all" ON public.remaining_bread;
CREATE POLICY "remaining_bread_select_all" ON public.remaining_bread
  FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can create remaining bread records
DROP POLICY IF EXISTS "remaining_bread_insert_all" ON public.remaining_bread;
CREATE POLICY "remaining_bread_insert_all" ON public.remaining_bread
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own records, managers/owners can update any
DROP POLICY IF EXISTS "remaining_bread_update_own_or_manager" ON public.remaining_bread;
CREATE POLICY "remaining_bread_update_own_or_manager" ON public.remaining_bread
  FOR UPDATE
  TO authenticated
  USING (recorded_by = auth.uid() OR public.is_manager_or_owner())
  WITH CHECK (recorded_by = auth.uid() OR public.is_manager_or_owner());

-- =======================
-- SHIFT REPORTS POLICIES
-- =======================

-- All authenticated users can read shift reports
DROP POLICY IF EXISTS "shift_reports_select_all" ON public.shift_reports;
CREATE POLICY "shift_reports_select_all" ON public.shift_reports
  FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can create shift reports
DROP POLICY IF EXISTS "shift_reports_insert_all" ON public.shift_reports;
CREATE POLICY "shift_reports_insert_all" ON public.shift_reports
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Users can update their own reports, managers/owners can update any
DROP POLICY IF EXISTS "shift_reports_update_own_or_manager" ON public.shift_reports;
CREATE POLICY "shift_reports_update_own_or_manager" ON public.shift_reports
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() OR public.is_manager_or_owner())
  WITH CHECK (user_id = auth.uid() OR public.is_manager_or_owner());

-- =======================
-- SHIFT FEEDBACK POLICIES
-- =======================

-- All authenticated users can read shift feedback
DROP POLICY IF EXISTS "shift_feedback_select_all" ON public.shift_feedback;
CREATE POLICY "shift_feedback_select_all" ON public.shift_feedback
  FOR SELECT
  TO authenticated
  USING (true);

-- All authenticated users can create shift feedback
DROP POLICY IF EXISTS "shift_feedback_insert_all" ON public.shift_feedback;
CREATE POLICY "shift_feedback_insert_all" ON public.shift_feedback
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- =======================
-- SHIFT HANDOVERS POLICIES
-- =======================

-- All authenticated users can read shift handovers
DROP POLICY IF EXISTS "shift_handovers_select_all" ON public.shift_handovers;
CREATE POLICY "shift_handovers_select_all" ON public.shift_handovers
  FOR SELECT
  TO authenticated
  USING (true);

-- Managers and owners can create shift handovers
DROP POLICY IF EXISTS "shift_handovers_insert_manager" ON public.shift_handovers;
CREATE POLICY "shift_handovers_insert_manager" ON public.shift_handovers
  FOR INSERT
  TO authenticated
  WITH CHECK (public.is_manager_or_owner());

-- =======================
-- SESSIONS POLICIES
-- =======================

-- Users can read their own sessions
DROP POLICY IF EXISTS "sessions_select_own" ON public.sessions;
CREATE POLICY "sessions_select_own" ON public.sessions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can create their own sessions
DROP POLICY IF EXISTS "sessions_insert_own" ON public.sessions;
CREATE POLICY "sessions_insert_own" ON public.sessions
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Users can update their own sessions
DROP POLICY IF EXISTS "sessions_update_own" ON public.sessions;
CREATE POLICY "sessions_update_own" ON public.sessions
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Users can delete their own sessions
DROP POLICY IF EXISTS "sessions_delete_own" ON public.sessions;
CREATE POLICY "sessions_delete_own" ON public.sessions
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- =======================
-- GRANT PERMISSIONS TO AUTHENTICATED USERS
-- =======================

-- Grant basic permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO service_role;

-- Grant execute permissions on helper functions
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_owner(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_manager_or_owner(uuid) TO authenticated;

-- =======================
-- COMMENTS FOR DOCUMENTATION
-- =======================

COMMENT ON FUNCTION public.get_user_role(uuid) IS 'Returns the role of a user from public.users table';
COMMENT ON FUNCTION public.is_owner(uuid) IS 'Returns true if the user is an owner';
COMMENT ON FUNCTION public.is_manager_or_owner(uuid) IS 'Returns true if the user is a manager or owner';