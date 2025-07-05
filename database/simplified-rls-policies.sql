-- SIMPLIFIED RLS POLICIES FOR HOMEBAKE
-- Run this to replace all existing policies with a cleaner implementation

-- ============================================================================
-- STEP 1: Drop all existing policies (clean slate)
-- ============================================================================
DO $$ 
DECLARE
    r RECORD;
BEGIN
    -- Drop all policies on our tables
    FOR r IN 
        SELECT schemaname, tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename IN ('users', 'bread_types', 'production_logs', 'sales_logs', 'shift_feedback', 'qr_invites')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE', 
            r.policyname, r.schemaname, r.tablename);
    END LOOP;
END $$;

-- ============================================================================
-- STEP 2: Create a single, reliable role function
-- ============================================================================
DROP FUNCTION IF EXISTS get_user_role() CASCADE;

CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  -- Simple direct lookup from users table
  RETURN COALESCE(
    (SELECT role FROM users WHERE id = auth.uid()),
    'none'
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ============================================================================
-- STEP 3: Create simplified policies
-- ============================================================================

-- USERS table
CREATE POLICY "users_read_own" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "users_read_owner" ON users FOR SELECT USING (get_user_role() = 'owner');
CREATE POLICY "users_update_own" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "users_insert_signup" ON users FOR INSERT WITH CHECK (id = auth.uid());

-- BREAD_TYPES table
CREATE POLICY "bread_types_read_all" ON bread_types FOR SELECT USING (true);
CREATE POLICY "bread_types_manage_owner_manager" ON bread_types 
  FOR ALL USING (get_user_role() IN ('owner', 'manager'));

-- PRODUCTION_LOGS table
CREATE POLICY "production_logs_read_all" ON production_logs FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "production_logs_insert_manager_owner" ON production_logs 
  FOR INSERT WITH CHECK (get_user_role() IN ('manager', 'owner'));
CREATE POLICY "production_logs_manage_owner" ON production_logs 
  FOR UPDATE, DELETE USING (get_user_role() = 'owner');

-- SALES_LOGS table
CREATE POLICY "sales_logs_read_own" ON sales_logs 
  FOR SELECT USING (recorded_by = auth.uid() OR get_user_role() IN ('owner', 'manager'));
CREATE POLICY "sales_logs_insert_all" ON sales_logs 
  FOR INSERT WITH CHECK (recorded_by = auth.uid());
CREATE POLICY "sales_logs_manage_owner" ON sales_logs 
  FOR UPDATE, DELETE USING (get_user_role() = 'owner');

-- SHIFT_FEEDBACK table
CREATE POLICY "shift_feedback_manage_own" ON shift_feedback 
  FOR ALL USING (user_id = auth.uid());
CREATE POLICY "shift_feedback_read_managers" ON shift_feedback 
  FOR SELECT USING (get_user_role() IN ('owner', 'manager'));

-- QR_INVITES table
CREATE POLICY "qr_invites_manage_owner" ON qr_invites 
  FOR ALL USING (get_user_role() = 'owner');
CREATE POLICY "qr_invites_read_public" ON qr_invites 
  FOR SELECT USING (true);

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_user_role() TO authenticated;

-- ============================================================================
-- STEP 4: Add helpful comments
-- ============================================================================
COMMENT ON FUNCTION get_user_role() IS 'Returns the role of the current user from the users table';
COMMENT ON POLICY "users_read_own" ON users IS 'Users can read their own data';
COMMENT ON POLICY "bread_types_read_all" ON bread_types IS 'Everyone can read bread types';
COMMENT ON POLICY "production_logs_insert_manager_owner" ON production_logs IS 'Only managers and owners can insert production logs';

SELECT 'Simplified RLS policies applied successfully' as status;