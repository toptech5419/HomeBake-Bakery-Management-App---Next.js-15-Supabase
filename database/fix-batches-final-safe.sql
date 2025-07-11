-- Safe fix for infinite recursion in batches table policies
-- This script handles existing policies and creates non-recursive ones

-- First, disable RLS on all tables temporarily
ALTER TABLE batches DISABLE ROW LEVEL SECURITY;
ALTER TABLE bread_types DISABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs DISABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies using a DO block to handle errors
DO $$
BEGIN
    -- Drop batches policies
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
    DROP POLICY IF EXISTS "batches_select_all" ON batches;
    DROP POLICY IF EXISTS "batches_insert_own" ON batches;
    DROP POLICY IF EXISTS "batches_update_own" ON batches;
    DROP POLICY IF EXISTS "batches_delete_own" ON batches;

    -- Drop bread_types policies
    DROP POLICY IF EXISTS "Users can view bread types" ON bread_types;
    DROP POLICY IF EXISTS "Owners and managers can manage bread types" ON bread_types;
    DROP POLICY IF EXISTS "bread_types_select_all" ON bread_types;
    DROP POLICY IF EXISTS "bread_types_manage_all" ON bread_types;

    -- Drop production_logs policies
    DROP POLICY IF EXISTS "Users can view production logs" ON production_logs;
    DROP POLICY IF EXISTS "Users can insert production logs" ON production_logs;
    DROP POLICY IF EXISTS "Owners and managers can update production logs" ON production_logs;
    DROP POLICY IF EXISTS "production_logs_select_all" ON production_logs;
    DROP POLICY IF EXISTS "production_logs_insert_own" ON production_logs;
    DROP POLICY IF EXISTS "production_logs_update_own" ON production_logs;
END $$;

-- Re-enable RLS on all tables
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bread_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;

-- Create new policies for batches
CREATE POLICY "batches_select_all" ON batches
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "batches_insert_own" ON batches
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "batches_update_own" ON batches
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "batches_delete_own" ON batches
    FOR DELETE USING (created_by = auth.uid());

-- Create new policies for bread_types
CREATE POLICY "bread_types_select_all" ON bread_types
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "bread_types_manage_all" ON bread_types
    FOR ALL USING (auth.uid() IS NOT NULL);

-- Create new policies for production_logs
CREATE POLICY "production_logs_select_all" ON production_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "production_logs_insert_own" ON production_logs
    FOR INSERT WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "production_logs_update_own" ON production_logs
    FOR UPDATE USING (recorded_by = auth.uid());

-- Verify the final policies
SELECT 
    tablename, 
    policyname, 
    cmd, 
    permissive
FROM pg_policies 
WHERE tablename IN ('batches', 'bread_types', 'production_logs')
ORDER BY tablename, policyname; 