-- HomeBake Complete Database Schema
-- This script creates all tables for the bakery management system
-- Run this in your Supabase SQL editor

-- =====================================================
-- EXTENSIONS
-- =====================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- =====================================================
-- USERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text, 'sales_rep'::text])),
  created_by uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  email text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- =====================================================
-- PROFILES TABLE (for auth.users integration)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid NOT NULL,
  name text,
  role text NOT NULL CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text, 'sales_rep'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

-- =====================================================
-- QR INVITES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.qr_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role = ANY (ARRAY['manager'::text, 'sales_rep'::text])),
  is_used boolean DEFAULT false,
  expires_at timestamp with time zone NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT qr_invites_pkey PRIMARY KEY (id),
  CONSTRAINT qr_invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- =====================================================
-- BREAD TYPES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.bread_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  size text,
  unit_price numeric NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bread_types_pkey PRIMARY KEY (id),
  CONSTRAINT bread_types_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

-- =====================================================
-- BATCHES TABLE (with shift column)
-- =====================================================

CREATE TABLE IF NOT EXISTS public.batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bread_type_id uuid NOT NULL,
  batch_number character varying NOT NULL,
  start_time timestamp with time zone DEFAULT now(),
  end_time timestamp with time zone,
  target_quantity integer NOT NULL,
  actual_quantity integer DEFAULT 0,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])),
  notes text,
  created_by uuid NOT NULL,
  shift text NOT NULL CHECK (shift = ANY (ARRAY['morning'::text, 'night'::text])),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT batches_pkey PRIMARY KEY (id),
  CONSTRAINT batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id),
  CONSTRAINT batches_bread_type_id_fkey FOREIGN KEY (bread_type_id) REFERENCES public.bread_types(id),
  -- Ensure unique batch numbers per bread type and shift
  UNIQUE(bread_type_id, batch_number, shift)
);

-- =====================================================
-- INVENTORY TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bread_type_id uuid NOT NULL UNIQUE,
  quantity integer NOT NULL DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_bread_type_id_fkey FOREIGN KEY (bread_type_id) REFERENCES public.bread_types(id)
);

-- =====================================================
-- INVENTORY LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.inventory_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bread_type_id uuid NOT NULL,
  quantity_change integer NOT NULL,
  reason text NOT NULL,
  user_id uuid NOT NULL,
  shift text CHECK (shift = ANY (ARRAY['morning'::text, 'night'::text])),
  reference_id uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_logs_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id),
  CONSTRAINT inventory_logs_bread_type_id_fkey FOREIGN KEY (bread_type_id) REFERENCES public.bread_types(id)
);

-- =====================================================
-- PRODUCTION LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.production_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bread_type_id uuid NOT NULL,
  quantity integer NOT NULL,
  shift text NOT NULL CHECK (shift = ANY (ARRAY['morning'::text, 'night'::text])),
  recorded_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  unit_price numeric DEFAULT 0.00,
  CONSTRAINT production_logs_pkey PRIMARY KEY (id),
  CONSTRAINT production_logs_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id),
  CONSTRAINT production_logs_bread_type_id_fkey FOREIGN KEY (bread_type_id) REFERENCES public.bread_types(id)
);

-- =====================================================
-- SALES LOGS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sales_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bread_type_id uuid NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric,
  discount numeric,
  returned boolean DEFAULT false,
  shift text NOT NULL CHECK (shift = ANY (ARRAY['morning'::text, 'night'::text])),
  recorded_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  leftovers integer DEFAULT 0,
  CONSTRAINT sales_logs_pkey PRIMARY KEY (id),
  CONSTRAINT sales_logs_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id),
  CONSTRAINT sales_logs_bread_type_id_fkey FOREIGN KEY (bread_type_id) REFERENCES public.bread_types(id)
);

-- =====================================================
-- REMAINING BREAD TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.remaining_bread (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  shift text NOT NULL,
  bread_type text NOT NULL,
  bread_type_id uuid,
  quantity integer NOT NULL,
  recorded_by uuid,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  unit_price numeric NOT NULL DEFAULT 0,
  total_value numeric DEFAULT ((quantity)::numeric * unit_price),
  CONSTRAINT remaining_bread_pkey PRIMARY KEY (id),
  CONSTRAINT remaining_bread_bread_type_id_fkey FOREIGN KEY (bread_type_id) REFERENCES public.bread_types(id),
  CONSTRAINT remaining_bread_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id)
);

-- =====================================================
-- SHIFT FEEDBACK TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.shift_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shift text NOT NULL CHECK (shift = ANY (ARRAY['morning'::text, 'night'::text])),
  note text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shift_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT shift_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- =====================================================
-- SHIFT HANDOVERS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.shift_handovers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_shift text NOT NULL CHECK (from_shift = ANY (ARRAY['morning'::text, 'night'::text])),
  to_shift text NOT NULL CHECK (to_shift = ANY (ARRAY['morning'::text, 'night'::text])),
  handover_date date NOT NULL DEFAULT CURRENT_DATE,
  manager_id uuid NOT NULL,
  notes text,
  total_production integer DEFAULT 0,
  completed_batches integer DEFAULT 0,
  pending_batches integer DEFAULT 0,
  quality_issues text[],
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shift_handovers_pkey PRIMARY KEY (id),
  CONSTRAINT shift_handovers_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id)
);

-- =====================================================
-- SHIFT REPORTS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.shift_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shift text NOT NULL CHECK (shift = ANY (ARRAY['morning'::text, 'night'::text])),
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  total_revenue numeric NOT NULL DEFAULT 0,
  total_items_sold integer NOT NULL DEFAULT 0,
  total_remaining integer NOT NULL DEFAULT 0,
  feedback text,
  sales_data jsonb NOT NULL DEFAULT '[]'::jsonb,
  remaining_breads jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shift_reports_pkey PRIMARY KEY (id),
  CONSTRAINT shift_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- =====================================================
-- AVAILABLE STOCK TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.available_stock (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bread_type_id uuid NOT NULL UNIQUE,
  bread_type_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_price numeric NOT NULL DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT available_stock_pkey PRIMARY KEY (id),
  CONSTRAINT available_stock_bread_type_id_fkey FOREIGN KEY (bread_type_id) REFERENCES public.bread_types(id)
);

-- =====================================================
-- SESSIONS TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);

-- QR Invites indexes
CREATE INDEX IF NOT EXISTS idx_qr_invites_token ON qr_invites(token);
CREATE INDEX IF NOT EXISTS idx_qr_invites_is_used ON qr_invites(is_used);
CREATE INDEX IF NOT EXISTS idx_qr_invites_expires_at ON qr_invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_qr_invites_created_by ON qr_invites(created_by);
CREATE INDEX IF NOT EXISTS idx_qr_invites_token_used_expires ON qr_invites(token, is_used, expires_at);

-- Bread types indexes
CREATE INDEX IF NOT EXISTS idx_bread_types_name ON bread_types(name);
CREATE INDEX IF NOT EXISTS idx_bread_types_created_by ON bread_types(created_by);

-- Batches indexes
CREATE INDEX IF NOT EXISTS idx_batches_bread_type_id ON batches(bread_type_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_created_by ON batches(created_by);
CREATE INDEX IF NOT EXISTS idx_batches_start_time ON batches(start_time);
CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON batches(batch_number);
CREATE INDEX IF NOT EXISTS idx_batches_shift ON batches(shift);
CREATE INDEX IF NOT EXISTS idx_batches_bread_type_shift ON batches(bread_type_id, shift);

-- Inventory indexes
CREATE INDEX IF NOT EXISTS idx_inventory_bread_type_id ON inventory(bread_type_id);
CREATE INDEX IF NOT EXISTS idx_inventory_last_updated ON inventory(last_updated);

-- Inventory logs indexes
CREATE INDEX IF NOT EXISTS idx_inventory_logs_bread_type_id ON inventory_logs(bread_type_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_user_id ON inventory_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_shift ON inventory_logs(shift);
CREATE INDEX IF NOT EXISTS idx_inventory_logs_created_at ON inventory_logs(created_at);

-- Production logs indexes
CREATE INDEX IF NOT EXISTS idx_production_logs_bread_type_id ON production_logs(bread_type_id);
CREATE INDEX IF NOT EXISTS idx_production_logs_recorded_by ON production_logs(recorded_by);
CREATE INDEX IF NOT EXISTS idx_production_logs_created_at ON production_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_production_logs_shift ON production_logs(shift);

-- Sales logs indexes
CREATE INDEX IF NOT EXISTS idx_sales_logs_bread_type_id ON sales_logs(bread_type_id);
CREATE INDEX IF NOT EXISTS idx_sales_logs_recorded_by ON sales_logs(recorded_by);
CREATE INDEX IF NOT EXISTS idx_sales_logs_created_at ON sales_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_logs_shift ON sales_logs(shift);

-- Remaining bread indexes
CREATE INDEX IF NOT EXISTS idx_remaining_bread_shift ON remaining_bread(shift);
CREATE INDEX IF NOT EXISTS idx_remaining_bread_bread_type_id ON remaining_bread(bread_type_id);
CREATE INDEX IF NOT EXISTS idx_remaining_bread_created_at ON remaining_bread(created_at);

-- Shift feedback indexes
CREATE INDEX IF NOT EXISTS idx_shift_feedback_user_id ON shift_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_shift_feedback_shift ON shift_feedback(shift);
CREATE INDEX IF NOT EXISTS idx_shift_feedback_created_at ON shift_feedback(created_at);

-- Shift handovers indexes
CREATE INDEX IF NOT EXISTS idx_shift_handovers_manager_id ON shift_handovers(manager_id);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_handover_date ON shift_handovers(handover_date);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_from_shift ON shift_handovers(from_shift);
CREATE INDEX IF NOT EXISTS idx_shift_handovers_to_shift ON shift_handovers(to_shift);

-- Shift reports indexes
CREATE INDEX IF NOT EXISTS idx_shift_reports_user_id ON shift_reports(user_id);
CREATE INDEX IF NOT EXISTS idx_shift_reports_shift ON shift_reports(shift);
CREATE INDEX IF NOT EXISTS idx_shift_reports_report_date ON shift_reports(report_date);
CREATE INDEX IF NOT EXISTS idx_shift_reports_created_at ON shift_reports(created_at);

-- Available stock indexes
CREATE INDEX IF NOT EXISTS idx_available_stock_bread_type_id ON available_stock(bread_type_id);
CREATE INDEX IF NOT EXISTS idx_available_stock_last_updated ON available_stock(last_updated);

-- Sessions indexes
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- =====================================================
-- TRIGGERS
-- =====================================================

-- Updated_at trigger for batches
CREATE OR REPLACE FUNCTION update_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_batches_updated_at
    BEFORE UPDATE ON batches
    FOR EACH ROW
    EXECUTE FUNCTION update_batches_updated_at();

-- Updated_at trigger for production_logs
CREATE OR REPLACE FUNCTION update_production_logs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_production_logs_updated_at
    BEFORE UPDATE ON production_logs
    FOR EACH ROW
    EXECUTE FUNCTION update_production_logs_updated_at();

-- Updated_at trigger for shift_reports
CREATE OR REPLACE FUNCTION update_shift_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shift_reports_updated_at
    BEFORE UPDATE ON shift_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_shift_reports_updated_at();

-- Updated_at trigger for remaining_bread
CREATE OR REPLACE FUNCTION update_remaining_bread_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_remaining_bread_updated_at
    BEFORE UPDATE ON remaining_bread
    FOR EACH ROW
    EXECUTE FUNCTION update_remaining_bread_updated_at();

-- Updated_at trigger for available_stock
CREATE OR REPLACE FUNCTION update_available_stock_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_available_stock_updated_at
    BEFORE UPDATE ON available_stock
    FOR EACH ROW
    EXECUTE FUNCTION update_available_stock_updated_at();

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE bread_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE remaining_bread ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_handovers ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE available_stock ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Users policies
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Owners can view all users" ON users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
    );

CREATE POLICY "Managers can view all users" ON users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
    );

CREATE POLICY "Owners can manage all users" ON users
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
    );

-- QR Invites policies
CREATE POLICY "Users can view QR invites" ON qr_invites
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owners and managers can create QR invites" ON qr_invites
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- Bread types policies
CREATE POLICY "Users can view bread types" ON bread_types
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owners and managers can manage bread types" ON bread_types
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- Batches policies
CREATE POLICY "Users can view batches" ON batches
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert batches" ON batches
    FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Owners and managers can update batches" ON batches
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

CREATE POLICY "Users can update own batches" ON batches
    FOR UPDATE USING (created_by = auth.uid());

CREATE POLICY "Owners and managers can delete batches" ON batches
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

CREATE POLICY "Users can delete own batches" ON batches
    FOR DELETE USING (created_by = auth.uid());

-- Inventory policies
CREATE POLICY "Users can view inventory" ON inventory
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owners and managers can manage inventory" ON inventory
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- Inventory logs policies
CREATE POLICY "Users can view inventory logs" ON inventory_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert inventory logs" ON inventory_logs
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Production logs policies
CREATE POLICY "Users can view production logs" ON production_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert production logs" ON production_logs
    FOR INSERT WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "Owners and managers can update production logs" ON production_logs
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- Sales logs policies
CREATE POLICY "Users can view sales logs" ON sales_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert sales logs" ON sales_logs
    FOR INSERT WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "Owners and managers can update sales logs" ON sales_logs
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- Remaining bread policies
CREATE POLICY "Users can view remaining bread" ON remaining_bread
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert remaining bread" ON remaining_bread
    FOR INSERT WITH CHECK (recorded_by = auth.uid());

-- Shift feedback policies
CREATE POLICY "Users can view their own feedback" ON shift_feedback
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own feedback" ON shift_feedback
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners and managers can view all feedback" ON shift_feedback
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- Shift handovers policies
CREATE POLICY "Users can view shift handovers" ON shift_handovers
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Managers can manage shift handovers" ON shift_handovers
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- Shift reports policies
CREATE POLICY "Users can view their own reports" ON shift_reports
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own reports" ON shift_reports
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reports" ON shift_reports
    FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Managers and owners can view all reports" ON shift_reports
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- Available stock policies
CREATE POLICY "Users can view available stock" ON available_stock
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owners and managers can manage available stock" ON available_stock
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- Sessions policies
CREATE POLICY "Users can manage their own sessions" ON sessions
    FOR ALL USING (user_id = auth.uid());

-- =====================================================
-- COMMENTS
-- =====================================================

COMMENT ON TABLE users IS 'User accounts for the bakery management system';
COMMENT ON TABLE profiles IS 'User profiles linked to auth.users';
COMMENT ON TABLE qr_invites IS 'QR code invitations for user registration';
COMMENT ON TABLE bread_types IS 'Available bread types and their pricing';
COMMENT ON TABLE batches IS 'Tracks individual production batches with shift information';
COMMENT ON TABLE inventory IS 'Current inventory levels for each bread type';
COMMENT ON TABLE inventory_logs IS 'Log of inventory changes with reasons';
COMMENT ON TABLE production_logs IS 'Daily production records by shift';
COMMENT ON TABLE sales_logs IS 'Daily sales records by shift';
COMMENT ON TABLE remaining_bread IS 'Remaining bread at end of shift';
COMMENT ON TABLE shift_feedback IS 'Shift feedback from staff';
COMMENT ON TABLE shift_handovers IS 'Handover information between shifts';
COMMENT ON TABLE shift_reports IS 'Complete shift reports with sales data';
COMMENT ON TABLE available_stock IS 'Available stock for sale';
COMMENT ON TABLE sessions IS 'User session management';

COMMENT ON COLUMN batches.batch_number IS 'Unique batch identifier within a bread type and shift';
COMMENT ON COLUMN batches.status IS 'Current status: active, completed, or cancelled';
COMMENT ON COLUMN batches.target_quantity IS 'Planned quantity for this batch';
COMMENT ON COLUMN batches.actual_quantity IS 'Actual quantity produced';
COMMENT ON COLUMN batches.shift IS 'Shift when this batch was created: morning or night';
COMMENT ON COLUMN batches.notes IS 'Additional notes about the batch';

COMMENT ON COLUMN production_logs.shift IS 'Shift when production was recorded: morning or night';
COMMENT ON COLUMN sales_logs.shift IS 'Shift when sales were recorded: morning or night';
COMMENT ON COLUMN inventory_logs.shift IS 'Shift when inventory change occurred: morning or night';
COMMENT ON COLUMN shift_feedback.shift IS 'Shift for which feedback is provided: morning or night';
COMMENT ON COLUMN shift_reports.shift IS 'Shift for which report is generated: morning or night';
COMMENT ON COLUMN remaining_bread.shift IS 'Shift when remaining bread was recorded: morning or night';

-- =====================================================
-- SAMPLE DATA (Optional)
-- =====================================================

-- Insert sample bread types
INSERT INTO bread_types (name, size, unit_price, created_by) VALUES
('White Bread', 'Large', 2.50, NULL),
('Whole Wheat', 'Medium', 3.00, NULL),
('Sourdough', 'Large', 4.50, NULL),
('Baguette', 'Standard', 2.00, NULL),
('Croissant', 'Standard', 1.50, NULL)
ON CONFLICT DO NOTHING;

-- =====================================================
-- END OF SCRIPT
-- ===================================================== 