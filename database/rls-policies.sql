-- Enable RLS for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE bread_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Utility function to get current user's role
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

-- Utility function to get current user's ID
CREATE OR REPLACE FUNCTION get_my_id()
RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE;

-- POLICIES for 'users' table
DROP POLICY IF EXISTS "Users can see their own data" ON users;
CREATE POLICY "Users can see their own data"
  ON users FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Owners and managers can see all users" ON users;
CREATE POLICY "Owners and managers can see all users"
  ON users FOR SELECT
  USING (get_my_role() IN ('owner', 'manager'));

DROP POLICY IF EXISTS "Users can update their own data" ON users;
CREATE POLICY "Users can update their own data"
  ON users FOR UPDATE
  USING (id = get_my_id());

DROP POLICY IF EXISTS "Owners can update any user" ON users;
CREATE POLICY "Owners can update any user"
  ON users FOR UPDATE
  USING (get_my_role() = 'owner');

-- Allow user creation during signup (when user is authenticated)
DROP POLICY IF EXISTS "Allow user creation during signup" ON users;
CREATE POLICY "Allow user creation during signup"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- POLICIES for 'bread_types' table
DROP POLICY IF EXISTS "Authenticated users can read bread types" ON bread_types;
CREATE POLICY "Authenticated users can read bread types"
  ON bread_types FOR SELECT
  USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Owners and managers can create bread types" ON bread_types;
CREATE POLICY "Owners and managers can create bread types"
  ON bread_types FOR INSERT
  WITH CHECK (get_my_role() IN ('owner', 'manager'));

DROP POLICY IF EXISTS "Owners and managers can update bread types" ON bread_types;
CREATE POLICY "Owners and managers can update bread types"
  ON bread_types FOR UPDATE
  USING (get_my_role() IN ('owner', 'manager'));

DROP POLICY IF EXISTS "Owners and managers can delete bread types" ON bread_types;
CREATE POLICY "Owners and managers can delete bread types"
  ON bread_types FOR DELETE
  USING (get_my_role() IN ('owner', 'manager'));

-- POLICIES for 'production_logs' table
DROP POLICY IF EXISTS "Managers can create production logs" ON production_logs;
CREATE POLICY "Managers can create production logs"
  ON production_logs FOR INSERT
  WITH CHECK (get_my_role() = 'manager' AND recorded_by = get_my_id());

DROP POLICY IF EXISTS "Managers can see their own production logs" ON production_logs;
CREATE POLICY "Managers can see their own production logs"
  ON production_logs FOR SELECT
  USING (get_my_role() = 'manager' AND recorded_by = get_my_id());

DROP POLICY IF EXISTS "Owners can see all production logs" ON production_logs;
CREATE POLICY "Owners can see all production logs"
  ON production_logs FOR SELECT
  USING (get_my_role() = 'owner');

-- POLICIES for 'sales_logs' table
DROP POLICY IF EXISTS "Sales reps can create sales logs" ON sales_logs;
CREATE POLICY "Sales reps can create sales logs"
  ON sales_logs FOR INSERT
  WITH CHECK (get_my_role() = 'sales_rep' AND recorded_by = get_my_id());

DROP POLICY IF EXISTS "Sales reps can see their own sales logs" ON sales_logs;
CREATE POLICY "Sales reps can see their own sales logs"
  ON sales_logs FOR SELECT
  USING (get_my_role() = 'sales_rep' AND recorded_by = get_my_id());

DROP POLICY IF EXISTS "Managers and Owners can see all sales logs" ON sales_logs;
CREATE POLICY "Managers and Owners can see all sales logs"
  ON sales_logs FOR SELECT
  USING (get_my_role() IN ('manager', 'owner'));

-- POLICIES for 'shift_feedback'
DROP POLICY IF EXISTS "Users can create their own feedback" ON shift_feedback;
CREATE POLICY "Users can create their own feedback"
  ON shift_feedback FOR INSERT
  WITH CHECK (user_id = get_my_id());

DROP POLICY IF EXISTS "Users can see their own feedback" ON shift_feedback;
CREATE POLICY "Users can see their own feedback"
  ON shift_feedback FOR SELECT
  USING (user_id = get_my_id());

DROP POLICY IF EXISTS "Managers and Owners can see all feedback" ON shift_feedback;
CREATE POLICY "Managers and Owners can see all feedback"
  ON shift_feedback FOR SELECT
  USING (get_my_role() IN ('manager', 'owner'));

-- POLICIES for 'qr_invites'
-- NOTE: Creation and reading of QR invites should be handled via security-definer functions
-- to restrict access only to owners. Direct access is disabled for security.
-- Owners can manage invites through dedicated endpoints.
DROP POLICY IF EXISTS "Owners can manage QR invites" ON qr_invites;
CREATE POLICY "Owners can manage QR invites"
  ON qr_invites FOR ALL
  USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner' )
  WITH CHECK ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner' ); 