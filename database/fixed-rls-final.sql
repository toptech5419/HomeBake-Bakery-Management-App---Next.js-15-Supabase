-- FINAL CORRECTED RLS POLICIES FOR HOMEBAKE
-- This fixes the JSONB type casting error
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: Drop the problematic function and recreate it properly
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_role_safe();
DROP FUNCTION IF EXISTS test_rls_system();

-- ============================================================================
-- STEP 2: CREATE CORRECTED ROLE FUNCTION WITH PROPER TYPE CASTING
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_role_safe()
RETURNS TEXT AS $$
DECLARE
  user_role_result TEXT;
  jwt_data JSONB;
BEGIN
  -- Get role from users table (most reliable for your app)
  SELECT role INTO user_role_result 
  FROM users 
  WHERE id = auth.uid();
  
  -- If not found, try JWT metadata as fallback with proper casting
  IF user_role_result IS NULL THEN
    jwt_data := auth.jwt();
    IF jwt_data IS NOT NULL THEN
      user_role_result := jwt_data -> 'user_metadata' ->> 'role';
    END IF;
  END IF;
  
  -- Default to sales_rep if still null
  IF user_role_result IS NULL THEN
    RETURN 'sales_rep';
  END IF;
  
  RETURN user_role_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_role_safe() TO authenticated;

-- ============================================================================
-- STEP 3: CREATE CORRECTED TEST FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION test_rls_system()
RETURNS TABLE(
  user_id_result UUID,
  user_role_result TEXT,
  can_delete_bread_types BOOLEAN,
  can_insert_production_logs BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as user_id_result,
    get_user_role_safe() as user_role_result,
    (get_user_role_safe() = 'owner') as can_delete_bread_types,
    (get_user_role_safe() IN ('manager', 'owner')) as can_insert_production_logs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION test_rls_system() TO authenticated;

-- ============================================================================
-- STEP 4: VERIFICATION - Test the function
-- ============================================================================

-- Test the corrected function
SELECT * FROM test_rls_system();

-- Also test the role function directly
SELECT get_user_role_safe() as current_role;

-- Show current user info
SELECT 
  auth.uid() as current_user_id,
  auth.role() as auth_role,
  get_user_role_safe() as user_role;

-- Verify all policies are in place
SELECT 
  tablename,
  policyname,
  cmd
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;