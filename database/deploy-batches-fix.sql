-- HomeBake Database Deployment - Batches System Fix
-- Run this script in your Supabase SQL editor to fix all database issues

-- =====================================================
-- ENABLE ROW LEVEL SECURITY
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE bread_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- DROP EXISTING POLICIES (if any)
-- =====================================================

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view batches" ON batches;
DROP POLICY IF EXISTS "Users can insert batches" ON batches;
DROP POLICY IF EXISTS "Owners and managers can update batches" ON batches;
DROP POLICY IF EXISTS "Users can update own batches" ON batches;
DROP POLICY IF EXISTS "Owners and managers can delete batches" ON batches;
DROP POLICY IF EXISTS "Users can delete own batches" ON batches;

DROP POLICY IF EXISTS "Users can view bread types" ON bread_types;
DROP POLICY IF EXISTS "Owners and managers can manage bread types" ON bread_types;

DROP POLICY IF EXISTS "Users can view own profile" ON users;
DROP POLICY IF EXISTS "Owners can view all users" ON users;
DROP POLICY IF EXISTS "Managers can view all users" ON users;

DROP POLICY IF EXISTS "Users can view sales logs" ON sales_logs;
DROP POLICY IF EXISTS "Users can insert sales logs" ON sales_logs;
DROP POLICY IF EXISTS "Owners and managers can update sales logs" ON sales_logs;

DROP POLICY IF EXISTS "Users can view production logs" ON production_logs;
DROP POLICY IF EXISTS "Users can insert production logs" ON production_logs;
DROP POLICY IF EXISTS "Owners and managers can update production logs" ON production_logs;

DROP POLICY IF EXISTS "Users can view own feedback" ON shift_feedback;
DROP POLICY IF EXISTS "Users can insert own feedback" ON shift_feedback;
DROP POLICY IF EXISTS "Owners and managers can view all feedback" ON shift_feedback;

-- =====================================================
-- CREATE RLS POLICIES
-- =====================================================

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

-- Bread types policies
CREATE POLICY "Users can view bread types" ON bread_types
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Owners and managers can manage bread types" ON bread_types
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

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

-- Sales logs policies
CREATE POLICY "Users can view sales logs" ON sales_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert sales logs" ON sales_logs
    FOR INSERT WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "Owners and managers can update sales logs" ON sales_logs
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- Production logs policies
CREATE POLICY "Users can view production logs" ON production_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Users can insert production logs" ON production_logs
    FOR INSERT WITH CHECK (recorded_by = auth.uid());

CREATE POLICY "Owners and managers can update production logs" ON production_logs
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- Shift feedback policies
CREATE POLICY "Users can view own feedback" ON shift_feedback
    FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert own feedback" ON shift_feedback
    FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Owners and managers can view all feedback" ON shift_feedback
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- =====================================================
-- CREATE INDEXES FOR PERFORMANCE
-- =====================================================

-- Batches indexes
CREATE INDEX IF NOT EXISTS idx_batches_bread_type_id ON batches(bread_type_id);
CREATE INDEX IF NOT EXISTS idx_batches_status ON batches(status);
CREATE INDEX IF NOT EXISTS idx_batches_created_by ON batches(created_by);
CREATE INDEX IF NOT EXISTS idx_batches_start_time ON batches(start_time);
CREATE INDEX IF NOT EXISTS idx_batches_batch_number ON batches(batch_number);

-- Bread types indexes
CREATE INDEX IF NOT EXISTS idx_bread_types_name ON bread_types(name);
CREATE INDEX IF NOT EXISTS idx_bread_types_created_by ON bread_types(created_by);

-- Sales logs indexes
CREATE INDEX IF NOT EXISTS idx_sales_logs_bread_type_id ON sales_logs(bread_type_id);
CREATE INDEX IF NOT EXISTS idx_sales_logs_recorded_by ON sales_logs(recorded_by);
CREATE INDEX IF NOT EXISTS idx_sales_logs_created_at ON sales_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_logs_shift ON sales_logs(shift);

-- Production logs indexes
CREATE INDEX IF NOT EXISTS idx_production_logs_bread_type_id ON production_logs(bread_type_id);
CREATE INDEX IF NOT EXISTS idx_production_logs_recorded_by ON production_logs(recorded_by);
CREATE INDEX IF NOT EXISTS idx_production_logs_created_at ON production_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_production_logs_shift ON production_logs(shift);

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);

-- =====================================================
-- CREATE TRIGGERS
-- =====================================================

-- Updated_at trigger for batches
CREATE OR REPLACE FUNCTION update_batches_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_batches_updated_at ON batches;
CREATE TRIGGER trigger_update_batches_updated_at
    BEFORE UPDATE ON batches
    FOR EACH ROW
    EXECUTE FUNCTION update_batches_updated_at();

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if RLS is enabled
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('batches', 'bread_types', 'users', 'sales_logs', 'production_logs', 'shift_feedback');

-- Check if policies exist
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public' 
AND tablename IN ('batches', 'bread_types', 'users', 'sales_logs', 'production_logs', 'shift_feedback');

-- Check if indexes exist
SELECT indexname, tablename 
FROM pg_indexes 
WHERE schemaname = 'public' 
AND tablename IN ('batches', 'bread_types', 'users', 'sales_logs', 'production_logs');

-- =====================================================
-- SUCCESS MESSAGE
-- =====================================================
SELECT 'Database setup completed successfully! All RLS policies, indexes, and triggers have been created.' as status; 