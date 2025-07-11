-- Fix infinite recursion in batches table policies
-- This script creates non-recursive policies that don't reference the users table

-- First, disable RLS on batches table temporarily
ALTER TABLE batches DISABLE ROW LEVEL SECURITY;

-- Drop all existing batches policies
DROP POLICY IF EXISTS "Users can view batches" ON batches;
DROP POLICY IF EXISTS "Users can insert batches" ON batches;
DROP POLICY IF EXISTS "Owners and managers can update batches" ON batches;
DROP POLICY IF EXISTS "Users can update own batches" ON batches;
DROP POLICY IF EXISTS "Owners and managers can delete batches" ON batches;
DROP POLICY IF EXISTS "Users can delete own batches" ON batches;
DROP POLICY IF EXISTS "Owners can view all batches" ON batches;
DROP POLICY IF EXISTS "Managers can view all batches" ON batches;
DROP POLICY IF EXISTS "Sales reps can view their own batches" ON batches;
DROP POLICY IF EXISTS "Owners can insert batches" ON batches;
DROP POLICY IF EXISTS "Managers can insert batches" ON batches;
DROP POLICY IF EXISTS "Sales reps can insert their own batches" ON batches;
DROP POLICY IF EXISTS "Owners can update all batches" ON batches;
DROP POLICY IF EXISTS "Managers can update all batches" ON batches;
DROP POLICY IF EXISTS "Sales reps can update their own batches" ON batches;
DROP POLICY IF EXISTS "Owners can delete all batches" ON batches;
DROP POLICY IF EXISTS "Managers can delete all batches" ON batches;
DROP POLICY IF EXISTS "Sales reps can delete their own batches" ON batches;

-- Re-enable RLS
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- Create simple, non-recursive policies for batches
-- All authenticated users can view batches
CREATE POLICY "batches_select_all" ON batches
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can insert their own batches
CREATE POLICY "batches_insert_own" ON batches
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- Users can update their own batches
CREATE POLICY "batches_update_own" ON batches
    FOR UPDATE USING (created_by = auth.uid());

-- Users can delete their own batches
CREATE POLICY "batches_delete_own" ON batches
    FOR DELETE USING (created_by = auth.uid());

-- Also fix bread_types policies to avoid recursion
ALTER TABLE bread_types DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view bread types" ON bread_types;
DROP POLICY IF EXISTS "Owners and managers can manage bread types" ON bread_types;

ALTER TABLE bread_types ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view bread types
CREATE POLICY "bread_types_select_all" ON bread_types
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- All authenticated users can manage bread types (simplified for now)
CREATE POLICY "bread_types_manage_all" ON bread_types
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Fix production_logs policies
ALTER TABLE production_logs DISABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view production logs" ON production_logs;
DROP POLICY IF EXISTS "Users can insert production logs" ON production_logs;
DROP POLICY IF EXISTS "Owners and managers can update production logs" ON production_logs;

ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;

-- All authenticated users can view production logs
CREATE POLICY "production_logs_select_all" ON production_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can insert their own production logs
CREATE POLICY "production_logs_insert_own" ON production_logs
    FOR INSERT WITH CHECK (recorded_by = auth.uid());

-- Users can update their own production logs
CREATE POLICY "production_logs_update_own" ON production_logs
    FOR UPDATE USING (recorded_by = auth.uid());

-- Verify the policies
SELECT 
    tablename, 
    policyname, 
    cmd, 
    permissive
FROM pg_policies 
WHERE tablename IN ('batches', 'bread_types', 'production_logs')
ORDER BY tablename, policyname; 