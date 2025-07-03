-- COMPREHENSIVE FIX FOR AUTHENTICATION INTEGRATION
-- This fixes the 403 error by properly linking custom auth with Supabase Auth
-- Run this in your Supabase SQL Editor

-- ============================================================================
-- STEP 1: Create a function to sync custom users with Supabase Auth
-- ============================================================================

CREATE OR REPLACE FUNCTION sync_custom_user_to_supabase_auth(
  custom_user_id UUID,
  custom_user_email TEXT,
  custom_user_role TEXT
)
RETURNS UUID AS $$
DECLARE
  supabase_user_id UUID;
  temp_password TEXT := 'temp-password-123';
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

-- ============================================================================
-- STEP 2: Enhanced RLS function that handles both auth systems
-- ============================================================================

DROP FUNCTION IF EXISTS get_user_role_safe();

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
GRANT EXECUTE ON FUNCTION sync_custom_user_to_supabase_auth(UUID, TEXT, TEXT) TO authenticated;

-- ============================================================================
-- STEP 3: Simplified RLS policies for production_logs
-- ============================================================================

-- Drop existing production_logs policies
DROP POLICY IF EXISTS "production_logs_insert_manager" ON production_logs;
DROP POLICY IF EXISTS "production_logs_insert_owner" ON production_logs;
DROP POLICY IF EXISTS "production_logs_select_manager" ON production_logs;
DROP POLICY IF EXISTS "production_logs_select_owner" ON production_logs;
DROP POLICY IF EXISTS "production_logs_select_authenticated" ON production_logs;
DROP POLICY IF EXISTS "production_logs_update_owner" ON production_logs;
DROP POLICY IF EXISTS "production_logs_delete_owner" ON production_logs;

-- Create new simplified policies
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

-- ============================================================================
-- STEP 4: Also fix inventory table RLS (commonly related to production logs)
-- ============================================================================

-- Check if inventory table exists and has RLS issues
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory') THEN
    -- Drop existing inventory policies
    DROP POLICY IF EXISTS "inventory_insert_auth" ON inventory;
    DROP POLICY IF EXISTS "inventory_select_auth" ON inventory;
    DROP POLICY IF EXISTS "inventory_update_auth" ON inventory;
    
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
-- STEP 5: Create a helper function for frontend debugging
-- ============================================================================

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

GRANT EXECUTE ON FUNCTION debug_production_auth() TO authenticated;

-- ============================================================================
-- STEP 6: Test the fix
-- ============================================================================

SELECT 'TESTING NEW AUTH SYSTEM' as status;

-- Test the enhanced role function
SELECT 
  'Enhanced Role Function Test' as test_type,
  get_user_role_safe() as role_result,
  auth.uid() as current_auth_uid,
  auth.email() as current_auth_email;

-- Test the debug function
SELECT 'Debug Function Test' as test_type;
SELECT * FROM debug_production_auth();

-- Show final policy status
SELECT 
  'Production Logs Policies' as test_type,
  policyname,
  cmd
FROM pg_policies 
WHERE tablename = 'production_logs'
ORDER BY policyname;