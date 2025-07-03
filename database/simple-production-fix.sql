-- SIMPLE DIRECT FIX FOR PRODUCTION LOGGING 403 ERRORS
-- This bypasses the complex auth linking and allows production logging immediately

-- ============================================================================
-- STEP 1: Create a simple function that works with your auth system
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_role_simple() CASCADE;

CREATE OR REPLACE FUNCTION get_user_role_simple()
RETURNS TEXT AS $$
DECLARE
  user_role_result TEXT;
  manager_id_from_email TEXT;
BEGIN
  -- First, try direct lookup
  SELECT role INTO user_role_result 
  FROM users 
  WHERE id = auth.uid();
  
  IF user_role_result IS NOT NULL THEN
    RETURN user_role_result;
  END IF;
  
  -- If auth user is a manager email, extract the manager ID and allow manager access
  IF auth.email() LIKE 'manager-%@homebake.local' THEN
    manager_id_from_email := substring(auth.email() FROM 'manager-(.+)@homebake\.local');
    
    -- Check if this manager ID exists in your users table
    IF EXISTS (
      SELECT 1 FROM users 
      WHERE id = manager_id_from_email::UUID 
      AND role IN ('manager', 'owner')
    ) THEN
      RETURN 'manager';
    END IF;
  END IF;
  
  -- Default fallback
  RETURN 'sales_rep';
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_user_role_simple() TO authenticated;

-- ============================================================================
-- STEP 2: Drop and recreate ONLY production_logs policies with simple rules
-- ============================================================================

-- Drop existing production_logs policies
DROP POLICY IF EXISTS "production_logs_insert_auth" ON production_logs;
DROP POLICY IF EXISTS "production_logs_select_auth" ON production_logs;
DROP POLICY IF EXISTS "production_logs_update_owner" ON production_logs;
DROP POLICY IF EXISTS "production_logs_delete_owner" ON production_logs;
DROP POLICY IF EXISTS "production_logs_insert_manager" ON production_logs;
DROP POLICY IF EXISTS "production_logs_insert_owner" ON production_logs;
DROP POLICY IF EXISTS "production_logs_select_manager" ON production_logs;
DROP POLICY IF EXISTS "production_logs_select_owner" ON production_logs;
DROP POLICY IF EXISTS "production_logs_select_authenticated" ON production_logs;

-- Create new simple policies
CREATE POLICY "production_logs_insert_simple" ON production_logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    get_user_role_simple() IN ('manager', 'owner')
  );

CREATE POLICY "production_logs_select_simple" ON production_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "production_logs_update_simple" ON production_logs
  FOR UPDATE USING (get_user_role_simple() = 'owner');

CREATE POLICY "production_logs_delete_simple" ON production_logs
  FOR DELETE USING (get_user_role_simple() = 'owner');

-- ============================================================================
-- STEP 3: Also fix inventory table if it exists
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory' AND table_schema = 'public') THEN
    -- Drop existing inventory policies
    DROP POLICY IF EXISTS "inventory_insert_auth" ON inventory;
    DROP POLICY IF EXISTS "inventory_select_auth" ON inventory;
    DROP POLICY IF EXISTS "inventory_update_auth" ON inventory;
    
    -- Create simple inventory policies
    CREATE POLICY "inventory_insert_simple" ON inventory
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
      
    CREATE POLICY "inventory_select_simple" ON inventory
      FOR SELECT USING (auth.uid() IS NOT NULL);
      
    CREATE POLICY "inventory_update_simple" ON inventory
      FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ============================================================================
-- STEP 4: Test the simple fix
-- ============================================================================

SELECT 'TESTING SIMPLE FIX' as status;

-- Test the simple function
SELECT 
  'Simple Role Function Test' as test_type,
  get_user_role_simple() as role_result,
  auth.uid() as current_auth_uid,
  auth.email() as current_auth_email;

-- Check if manager exists
SELECT 
  'Manager Check' as test_type,
  CASE 
    WHEN auth.email() LIKE 'manager-%@homebake.local' THEN
      CASE 
        WHEN EXISTS (
          SELECT 1 FROM users 
          WHERE id = substring(auth.email() FROM 'manager-(.+)@homebake\.local')::UUID 
          AND role IN ('manager', 'owner')
        ) THEN 'MANAGER EXISTS - SHOULD WORK'
        ELSE 'MANAGER NOT FOUND'
      END
    ELSE 'NOT A MANAGER EMAIL'
  END as manager_status;

-- Show production_logs policies
SELECT 
  'Production Logs Policies' as test_type,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'production_logs'
ORDER BY policyname;

SELECT 'SIMPLE FIX COMPLETE - TRY PRODUCTION LOGGING NOW' as final_status;