-- Fix All_Batches Manager Isolation: RLS Policy Updates
-- Date: 2025-08-29
-- Description: Apply same manager isolation to all_batches table (reports)

-- =============================================================================
-- FIX ALL_BATCHES TABLE RLS POLICIES
-- =============================================================================

-- Check if RLS is enabled on all_batches
-- ALTER TABLE public.all_batches ENABLE ROW LEVEL SECURITY;

-- Remove any existing overly permissive policies
DROP POLICY IF EXISTS "all_batches_select_all" ON public.all_batches;
DROP POLICY IF EXISTS "all_batches_select_authenticated" ON public.all_batches;

-- Create new role-based select policy for all_batches (same as batches)
CREATE POLICY "all_batches_select_role_based" ON public.all_batches
  FOR SELECT
  TO authenticated
  USING (
    -- Managers can only see their own reports (isolation)
    (EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role = 'manager' 
      AND users.is_active = true
    ) AND created_by = auth.uid())
    OR 
    -- Owners and Sales Reps can see all reports (global access)
    (EXISTS (
      SELECT 1 FROM public.users 
      WHERE users.id = auth.uid() 
      AND users.role IN ('owner', 'sales_rep') 
      AND users.is_active = true
    ))
  );

-- =============================================================================
-- VERIFICATION QUERIES (Run these after applying the migration)
-- =============================================================================

-- Check current policies on all_batches table
-- SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual FROM pg_policies WHERE tablename = 'all_batches';

-- Test with different user roles
-- SELECT COUNT(*) as all_batch_count FROM public.all_batches; -- Should vary based on user role