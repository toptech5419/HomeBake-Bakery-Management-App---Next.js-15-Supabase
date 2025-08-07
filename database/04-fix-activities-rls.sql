-- Fix RLS policies for activities table
-- This script fixes the Row Level Security policies to allow proper activity logging

-- Drop existing policies first
DROP POLICY IF EXISTS "Owners can view all activities" ON public.activities;
DROP POLICY IF EXISTS "Users can insert their own activities" ON public.activities;

-- Create more permissive policies that work with server actions

-- Policy for owners to see all activities
CREATE POLICY "owners_can_view_all_activities" ON public.activities
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'owner'
      AND users.is_active = true
    )
  );

-- Policy for managers and sales reps to insert activities
-- More permissive to work with server actions
CREATE POLICY "users_can_insert_activities" ON public.activities
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.is_active = true 
      AND users.role IN ('manager', 'sales_rep')
    )
  );

-- Allow service role to insert activities (for server actions)
CREATE POLICY "service_role_can_insert_activities" ON public.activities
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Allow service role to select activities (for cleanup operations)
CREATE POLICY "service_role_can_select_activities" ON public.activities
  FOR SELECT
  TO service_role
  USING (true);

-- Allow service role to delete old activities (for cleanup)
CREATE POLICY "service_role_can_delete_old_activities" ON public.activities
  FOR DELETE
  TO service_role
  USING (true);