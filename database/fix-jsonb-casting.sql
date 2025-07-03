-- FIX JSONB CASTING ERROR WITH PROPER DEPENDENCY HANDLING
-- This handles the function dependencies correctly
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: Drop function with CASCADE to remove dependent policies
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_role_safe() CASCADE;
DROP FUNCTION IF EXISTS test_rls_system() CASCADE;

-- ============================================================================
-- STEP 2: CREATE CORRECTED ROLE FUNCTION WITH PROPER JSONB HANDLING
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
-- STEP 3: RECREATE ALL RLS POLICIES (since CASCADE dropped them)
-- ============================================================================

-- USERS TABLE POLICIES
CREATE POLICY "users_select_own" ON users
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "users_select_owner" ON users
  FOR SELECT USING (get_user_role_safe() = 'owner');

CREATE POLICY "users_update_own" ON users
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "users_update_owner" ON users
  FOR UPDATE USING (get_user_role_safe() = 'owner');

CREATE POLICY "users_insert_signup" ON users
  FOR INSERT WITH CHECK (id = auth.uid());

CREATE POLICY "users_insert_owner" ON users
  FOR INSERT WITH CHECK (get_user_role_safe() = 'owner');

-- BREAD TYPES TABLE POLICIES
CREATE POLICY "bread_types_select_all" ON bread_types
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "bread_types_insert_owner" ON bread_types
  FOR INSERT WITH CHECK (get_user_role_safe() = 'owner');

CREATE POLICY "bread_types_update_owner" ON bread_types
  FOR UPDATE USING (get_user_role_safe() = 'owner');

CREATE POLICY "bread_types_delete_owner" ON bread_types
  FOR DELETE USING (get_user_role_safe() = 'owner');

CREATE POLICY "bread_types_insert_manager" ON bread_types
  FOR INSERT WITH CHECK (get_user_role_safe() = 'manager');

CREATE POLICY "bread_types_update_manager" ON bread_types
  FOR UPDATE USING (get_user_role_safe() = 'manager');

-- PRODUCTION LOGS TABLE POLICIES
CREATE POLICY "production_logs_insert_manager" ON production_logs
  FOR INSERT WITH CHECK (
    get_user_role_safe() = 'manager' AND 
    recorded_by = auth.uid()
  );

CREATE POLICY "production_logs_insert_owner" ON production_logs
  FOR INSERT WITH CHECK (get_user_role_safe() = 'owner');

CREATE POLICY "production_logs_select_manager" ON production_logs
  FOR SELECT USING (
    get_user_role_safe() = 'manager' AND 
    recorded_by = auth.uid()
  );

CREATE POLICY "production_logs_select_owner" ON production_logs
  FOR SELECT USING (get_user_role_safe() = 'owner');

CREATE POLICY "production_logs_select_authenticated" ON production_logs
  FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "production_logs_update_owner" ON production_logs
  FOR UPDATE USING (get_user_role_safe() = 'owner');

CREATE POLICY "production_logs_delete_owner" ON production_logs
  FOR DELETE USING (get_user_role_safe() = 'owner');

-- SALES LOGS TABLE POLICIES
CREATE POLICY "sales_logs_insert_sales_rep" ON sales_logs
  FOR INSERT WITH CHECK (
    get_user_role_safe() = 'sales_rep' AND 
    recorded_by = auth.uid()
  );

CREATE POLICY "sales_logs_insert_manager_owner" ON sales_logs
  FOR INSERT WITH CHECK (get_user_role_safe() IN ('manager', 'owner'));

CREATE POLICY "sales_logs_select_sales_rep" ON sales_logs
  FOR SELECT USING (
    get_user_role_safe() = 'sales_rep' AND 
    recorded_by = auth.uid()
  );

CREATE POLICY "sales_logs_select_manager_owner" ON sales_logs
  FOR SELECT USING (get_user_role_safe() IN ('manager', 'owner'));

CREATE POLICY "sales_logs_update_owner" ON sales_logs
  FOR UPDATE USING (get_user_role_safe() = 'owner');

CREATE POLICY "sales_logs_delete_owner" ON sales_logs
  FOR DELETE USING (get_user_role_safe() = 'owner');

-- QR INVITES TABLE POLICIES
CREATE POLICY "qr_invites_all_owner" ON qr_invites
  FOR ALL USING (get_user_role_safe() = 'owner');

CREATE POLICY "qr_invites_select_signup" ON qr_invites
  FOR SELECT USING (true);

-- SHIFT FEEDBACK TABLE POLICIES
CREATE POLICY "shift_feedback_insert_own" ON shift_feedback
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "shift_feedback_select_own" ON shift_feedback
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "shift_feedback_select_manager_owner" ON shift_feedback
  FOR SELECT USING (get_user_role_safe() IN ('manager', 'owner'));

CREATE POLICY "shift_feedback_update_owner" ON shift_feedback
  FOR UPDATE USING (get_user_role_safe() = 'owner');

CREATE POLICY "shift_feedback_delete_owner" ON shift_feedback
  FOR DELETE USING (get_user_role_safe() = 'owner');

-- ============================================================================
-- STEP 4: CREATE TEST FUNCTION
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
-- STEP 5: VERIFICATION
-- ============================================================================

-- Test the corrected function
SELECT * FROM test_rls_system();

-- Test role function directly
SELECT get_user_role_safe() as current_role;

-- Show current user info
SELECT 
  auth.uid() as current_user_id,
  auth.role() as auth_role,
  get_user_role_safe() as user_role;

-- Verify all policies are recreated
SELECT 
  tablename,
  policyname
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;