-- COMPREHENSIVE FIX WITH CASCADE DROPS
-- This fixes the 403 error by properly dropping all dependent policies first
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: Drop ALL existing policies that depend on get_user_role_safe()
-- ============================================================================

-- Drop all users policies
DROP POLICY IF EXISTS "users_select_owner" ON users CASCADE;
DROP POLICY IF EXISTS "users_update_owner" ON users CASCADE;
DROP POLICY IF EXISTS "users_insert_owner" ON users CASCADE;
DROP POLICY IF EXISTS "users_select_own" ON users CASCADE;
DROP POLICY IF EXISTS "users_update_own" ON users CASCADE;
DROP POLICY IF EXISTS "users_insert_signup" ON users CASCADE;

-- Drop all bread_types policies
DROP POLICY IF EXISTS "bread_types_insert_owner" ON bread_types CASCADE;
DROP POLICY IF EXISTS "bread_types_update_owner" ON bread_types CASCADE;
DROP POLICY IF EXISTS "bread_types_delete_owner" ON bread_types CASCADE;
DROP POLICY IF EXISTS "bread_types_insert_manager" ON bread_types CASCADE;
DROP POLICY IF EXISTS "bread_types_update_manager" ON bread_types CASCADE;
DROP POLICY IF EXISTS "bread_types_select_all" ON bread_types CASCADE;

-- Drop all production_logs policies
DROP POLICY IF EXISTS "production_logs_insert_manager" ON production_logs CASCADE;
DROP POLICY IF EXISTS "production_logs_insert_owner" ON production_logs CASCADE;
DROP POLICY IF EXISTS "production_logs_select_manager" ON production_logs CASCADE;
DROP POLICY IF EXISTS "production_logs_select_owner" ON production_logs CASCADE;
DROP POLICY IF EXISTS "production_logs_select_authenticated" ON production_logs CASCADE;
DROP POLICY IF EXISTS "production_logs_update_owner" ON production_logs CASCADE;
DROP POLICY IF EXISTS "production_logs_delete_owner" ON production_logs CASCADE;
DROP POLICY IF EXISTS "production_logs_insert_auth" ON production_logs CASCADE;
DROP POLICY IF EXISTS "production_logs_select_auth" ON production_logs CASCADE;

-- Drop all sales_logs policies
DROP POLICY IF EXISTS "sales_logs_insert_sales_rep" ON sales_logs CASCADE;
DROP POLICY IF EXISTS "sales_logs_insert_manager_owner" ON sales_logs CASCADE;
DROP POLICY IF EXISTS "sales_logs_select_sales_rep" ON sales_logs CASCADE;
DROP POLICY IF EXISTS "sales_logs_select_manager_owner" ON sales_logs CASCADE;
DROP POLICY IF EXISTS "sales_logs_update_owner" ON sales_logs CASCADE;
DROP POLICY IF EXISTS "sales_logs_delete_owner" ON sales_logs CASCADE;

-- Drop all qr_invites policies
DROP POLICY IF EXISTS "qr_invites_all_owner" ON qr_invites CASCADE;
DROP POLICY IF EXISTS "qr_invites_select_signup" ON qr_invites CASCADE;

-- Drop all shift_feedback policies
DROP POLICY IF EXISTS "shift_feedback_insert_own" ON shift_feedback CASCADE;
DROP POLICY IF EXISTS "shift_feedback_select_own" ON shift_feedback CASCADE;
DROP POLICY IF EXISTS "shift_feedback_select_manager_owner" ON shift_feedback CASCADE;
DROP POLICY IF EXISTS "shift_feedback_update_owner" ON shift_feedback CASCADE;
DROP POLICY IF EXISTS "shift_feedback_delete_owner" ON shift_feedback CASCADE;

-- Drop all inventory policies (if they exist)
DROP POLICY IF EXISTS "inventory_insert_auth" ON inventory CASCADE;
DROP POLICY IF EXISTS "inventory_select_auth" ON inventory CASCADE;
DROP POLICY IF EXISTS "inventory_update_auth" ON inventory CASCADE;

-- ============================================================================
-- STEP 2: Now safely drop and recreate the function
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_role_safe() CASCADE;
DROP FUNCTION IF EXISTS test_rls_system() CASCADE;
DROP FUNCTION IF EXISTS debug_production_auth() CASCADE;
DROP FUNCTION IF EXISTS sync_custom_user_to_supabase_auth(UUID, TEXT, TEXT) CASCADE;

-- ============================================================================
-- STEP 3: Create the enhanced RLS function that handles both auth systems
-- ============================================================================

CREATE OR REPLACE FUNCTION get_user_role_safe()
RETURNS TEXT AS $$
DECLARE
  user_role_result TEXT;
  jwt_data JSONB;
  custom_user_role TEXT;
BEGIN
  -- First, try to get role from users table using auth.uid()
  SELECT role INTO user_role_result 
  FROM users 
  WHERE id = auth.uid();
  
  -- If found, return it
  IF user_role_result IS NOT NULL THEN
    RETURN user_role_result;
  END IF;
  
  -- If not found, check if this is a manager email pattern
  -- and try to find the corresponding custom user
  IF auth.email() LIKE 'manager-%@homebake.local' THEN
    -- Extract the manager ID from the email pattern
    -- manager-{uuid}@homebake.local -> extract the uuid part
    DECLARE
      manager_id_text TEXT;
      manager_id_uuid UUID;
    BEGIN
      manager_id_text := substring(auth.email() FROM 'manager-(.+)@homebake\.local');
      
      IF manager_id_text IS NOT NULL THEN
        BEGIN
          manager_id_uuid := manager_id_text::UUID;
          
          -- Look up the role for this manager in the custom users table
          SELECT role INTO custom_user_role
          FROM users
          WHERE id = manager_id_uuid;
          
          IF custom_user_role IS NOT NULL THEN
            -- Create a link between the Supabase user and custom user
            INSERT INTO users (id, email, name, role, created_at, updated_at)
            VALUES (
              auth.uid(),
              auth.email(),
              'Manager User',
              custom_user_role,
              NOW(),
              NOW()
            )
            ON CONFLICT (id) DO UPDATE SET
              role = EXCLUDED.role,
              updated_at = NOW();
              
            RETURN custom_user_role;
          END IF;
        EXCEPTION
          WHEN invalid_text_representation THEN
            -- Invalid UUID format, continue to fallback
            NULL;
        END;
      END IF;
    END;
  END IF;
  
  -- Fallback to JWT metadata
  jwt_data := auth.jwt();
  IF jwt_data IS NOT NULL THEN
    user_role_result := jwt_data -> 'user_metadata' ->> 'role';
  END IF;
  
  -- Final fallback
  IF user_role_result IS NULL THEN
    RETURN 'sales_rep';
  END IF;
  
  RETURN user_role_result;
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Grant permissions
GRANT EXECUTE ON FUNCTION get_user_role_safe() TO authenticated;

-- ============================================================================
-- STEP 4: Create helper functions
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_custom_user_to_supabase_auth(
  custom_user_id UUID,
  custom_user_email TEXT,
  custom_user_role TEXT
)
RETURNS UUID AS $$
DECLARE
  supabase_user_id UUID;
BEGIN
  -- Check if a Supabase Auth user already exists for this custom user
  SELECT id INTO supabase_user_id
  FROM auth.users
  WHERE email = custom_user_email
  LIMIT 1;
  
  -- If no Supabase user exists, we'll return the custom_user_id
  -- The frontend will handle creating the Supabase user
  IF supabase_user_id IS NULL THEN
    RETURN custom_user_id;
  END IF;
  
  -- If Supabase user exists but not linked to custom user, link them
  INSERT INTO users (id, email, name, role, created_at, updated_at)
  VALUES (
    supabase_user_id,
    custom_user_email,
    'Manager User',
    custom_user_role,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    role = EXCLUDED.role,
    updated_at = NOW();
    
  RETURN supabase_user_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION debug_production_auth()
RETURNS TABLE(
  auth_uid UUID,
  auth_email TEXT,
  user_role TEXT,
  can_insert_production BOOLEAN,
  user_exists_in_custom_table BOOLEAN,
  manager_id_from_email TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    auth.uid() as auth_uid,
    auth.email() as auth_email,
    get_user_role_safe() as user_role,
    (get_user_role_safe() IN ('manager', 'owner')) as can_insert_production,
    EXISTS(SELECT 1 FROM users WHERE id = auth.uid()) as user_exists_in_custom_table,
    CASE 
      WHEN auth.email() LIKE 'manager-%@homebake.local' THEN
        substring(auth.email() FROM 'manager-(.+)@homebake\.local')
      ELSE NULL
    END as manager_id_from_email;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION sync_custom_user_to_supabase_auth(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION debug_production_auth() TO authenticated;

-- ============================================================================
-- STEP 5: Recreate ALL RLS policies with the new function
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

-- BREAD TYPES TABLE POLICIES (FIXES DELETE ISSUE)
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

-- PRODUCTION LOGS TABLE POLICIES (MAIN FIX FOR 403 ERRORS)
CREATE POLICY "production_logs_insert_auth" ON production_logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND 
    get_user_role_safe() IN ('manager', 'owner')
  );

CREATE POLICY "production_logs_select_auth" ON production_logs
  FOR SELECT USING (auth.uid() IS NOT NULL);

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

-- QR INVITES TABLE POLICIES (FIXES SIGNUP ISSUE)
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
-- STEP 6: Fix inventory table RLS (if it exists)
-- ============================================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory' AND table_schema = 'public') THEN
    -- Create new inventory policies
    CREATE POLICY "inventory_insert_auth" ON inventory
      FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
      
    CREATE POLICY "inventory_select_auth" ON inventory
      FOR SELECT USING (auth.uid() IS NOT NULL);
      
    CREATE POLICY "inventory_update_auth" ON inventory
      FOR UPDATE USING (auth.uid() IS NOT NULL);
  END IF;
END $$;

-- ============================================================================
-- STEP 7: Test the complete fix
-- ============================================================================

SELECT 'TESTING COMPLETE AUTH SYSTEM' as status;

-- Test the enhanced role function
SELECT 
  'Enhanced Role Function Test' as test_type,
  get_user_role_safe() as role_result,
  auth.uid() as current_auth_uid,
  auth.email() as current_auth_email;

-- Test the debug function
SELECT 'Debug Function Test' as test_type;
SELECT * FROM debug_production_auth();

-- Show all policies created
SELECT 
  'All Policies Created' as test_type,
  tablename,
  COUNT(*) as policy_count
FROM pg_policies 
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- Show production_logs policies specifically
SELECT 
  'Production Logs Policies' as test_type,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'production_logs'
ORDER BY policyname;

SELECT 'SETUP COMPLETE - TRY PRODUCTION LOGGING NOW' as final_status;