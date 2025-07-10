-- HomeBake Bakery Management System - Database Setup
-- This file contains the complete database schema for production deployment

-- =====================================================
-- USERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT CHECK (role IN ('owner', 'manager', 'sales_rep')) NOT NULL,
  created_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- QR INVITES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS qr_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('manager', 'sales_rep')) NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- BREAD TYPES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS bread_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  size TEXT,
  unit_price NUMERIC(10,2) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- PRODUCTION LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bread_type_id UUID REFERENCES bread_types(id) NOT NULL,
  quantity INTEGER NOT NULL,
  shift TEXT CHECK (shift IN ('morning', 'night')) NOT NULL,
  recorded_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- SALES LOGS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sales_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bread_type_id UUID REFERENCES bread_types(id) NOT NULL,
  quantity INTEGER NOT NULL,
  unit_price NUMERIC(10,2),
  discount NUMERIC(10,2),
  returned BOOLEAN DEFAULT FALSE,
  leftover INTEGER DEFAULT 0,
  shift TEXT CHECK (shift IN ('morning', 'night')) NOT NULL,
  recorded_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- SHIFT FEEDBACK TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS shift_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  shift TEXT CHECK (shift IN ('morning', 'night')) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- =====================================================
-- SESSIONS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE NOT NULL,
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL
);

-- =====================================================
-- BATCHES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS batches (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    bread_type_id UUID NOT NULL REFERENCES bread_types(id) ON DELETE CASCADE,
    batch_number VARCHAR(50) NOT NULL,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    target_quantity INTEGER NOT NULL,
    actual_quantity INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'cancelled')),
    notes TEXT,
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Ensure unique batch numbers per bread type
    UNIQUE(bread_type_id, batch_number)
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

-- Shift feedback indexes
CREATE INDEX IF NOT EXISTS idx_shift_feedback_user_id ON shift_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_shift_feedback_created_at ON shift_feedback(created_at);

-- Batches indexes
CREATE INDEX IF NOT EXISTS idx_batches_bread_type_id ON batches(bread_type_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_created_by ON batches(created_by);
CREATE INDEX IF NOT EXISTS idx_batches_start_time ON batches(start_time);
CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON batches(batch_number);

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

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE bread_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES
-- =====================================================

-- Users policies
CREATE POLICY "Users can view their own profile" ON users
    FOR SELECT USING (id = auth.uid());

CREATE POLICY "Owners can view all users" ON users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
    );

CREATE POLICY "Managers can view all users" ON users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
    );

-- QR Invites policies
CREATE POLICY "Users can view their own invites" ON qr_invites
    FOR SELECT USING (created_by = auth.uid());

CREATE POLICY "Owners can manage all invites" ON qr_invites
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
    );

-- Bread Types policies
CREATE POLICY "All authenticated users can view bread types" ON bread_types
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owners and managers can manage bread types" ON bread_types
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- Production Logs policies
CREATE POLICY "Users can view production logs" ON production_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert production logs" ON production_logs
    FOR INSERT WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "Owners and managers can update production logs" ON production_logs
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- Sales Logs policies
CREATE POLICY "Users can view sales logs" ON sales_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert sales logs" ON sales_logs
    FOR INSERT WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "Owners and managers can update sales logs" ON sales_logs
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- Shift Feedback policies
CREATE POLICY "Users can view their own feedback" ON shift_feedback
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own feedback" ON shift_feedback
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners and managers can view all feedback" ON shift_feedback
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- Sessions policies
CREATE POLICY "Users can manage their own sessions" ON sessions
    FOR ALL USING (user_id = auth.uid());

-- Batches policies
CREATE POLICY "Owners can view all batches" ON batches
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
    );

CREATE POLICY "Managers can view all batches" ON batches
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
    );

CREATE POLICY "Sales reps can view their own batches" ON batches
    FOR SELECT USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

CREATE POLICY "Owners can insert batches" ON batches
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
    );

CREATE POLICY "Managers can insert batches" ON batches
    FOR INSERT WITH CHECK (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
    );

CREATE POLICY "Sales reps can insert their own batches" ON batches
    FOR INSERT WITH CHECK (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

CREATE POLICY "Owners can update all batches" ON batches
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
    );

CREATE POLICY "Managers can update all batches" ON batches
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
    );

CREATE POLICY "Sales reps can update their own batches" ON batches
    FOR UPDATE USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

CREATE POLICY "Owners can delete all batches" ON batches
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
    );

CREATE POLICY "Managers can delete all batches" ON batches
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
    );

CREATE POLICY "Sales reps can delete their own batches" ON batches
    FOR DELETE USING (
        created_by = auth.uid() OR
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON TABLE users IS 'User accounts for the bakery management system';
COMMENT ON TABLE qr_invites IS 'QR code invitations for user registration';
COMMENT ON TABLE bread_types IS 'Available bread types and their pricing';
COMMENT ON TABLE production_logs IS 'Daily production records';
COMMENT ON TABLE sales_logs IS 'Daily sales records';
COMMENT ON TABLE shift_feedback IS 'Shift feedback from staff';
COMMENT ON TABLE sessions IS 'User session management';
COMMENT ON TABLE batches IS 'Tracks individual production batches for better inventory management';

COMMENT ON COLUMN batches.batch_number IS 'Unique batch identifier within a bread type';
COMMENT ON COLUMN batches.status IS 'Current status: active, completed, or cancelled';
COMMENT ON COLUMN batches.target_quantity IS 'Planned quantity for this batch';
COMMENT ON COLUMN batches.actual_quantity IS 'Actual quantity produced (updated from production_logs)'; 