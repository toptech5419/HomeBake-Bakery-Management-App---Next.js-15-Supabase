-- FIX SALES_LOGS ACCESS ISSUES
-- This script addresses connection problems with sales_logs table

-- ============================================================================
-- STEP 1: Temporarily disable RLS to fix immediate access
-- ============================================================================
ALTER TABLE sales_logs DISABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 2: Clean up conflicting policies
-- ============================================================================
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all existing sales_logs policies
    FOR r IN 
        SELECT policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'sales_logs'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON sales_logs CASCADE', r.policyname);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 3: Create simple, reliable policies
-- ============================================================================

-- Re-enable RLS
ALTER TABLE sales_logs ENABLE ROW LEVEL SECURITY;

-- Simple read policy - authenticated users can read sales data
CREATE POLICY "sales_logs_read_authenticated" ON sales_logs
  FOR SELECT 
  USING (auth.uid() IS NOT NULL);

-- Simple insert policy - authenticated users can insert their own sales
CREATE POLICY "sales_logs_insert_authenticated" ON sales_logs
  FOR INSERT 
  WITH CHECK (auth.uid() IS NOT NULL AND recorded_by = auth.uid());

-- Owner can do everything
CREATE POLICY "sales_logs_owner_all" ON sales_logs
  FOR ALL 
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() 
      AND role = 'owner'
    )
  );

-- ============================================================================
-- STEP 4: Ensure proper indexes for performance
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_sales_logs_created_at_desc ON sales_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sales_logs_recorded_by_created_at ON sales_logs(recorded_by, created_at DESC);

-- ============================================================================
-- STEP 5: Grant necessary permissions
-- ============================================================================
GRANT SELECT, INSERT ON sales_logs TO authenticated;
GRANT ALL ON sales_logs TO service_role;

-- ============================================================================
-- STEP 6: Test the fix
-- ============================================================================
-- Simple test query that should work for any authenticated user
-- SELECT COUNT(*) FROM sales_logs WHERE created_at >= NOW() - INTERVAL '7 days';

COMMENT ON TABLE sales_logs IS 'Sales logs table with simplified RLS policies for better connectivity';
SELECT 'Sales logs access policies fixed successfully' as status;