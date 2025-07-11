-- HomeBake Database Fixes for Batches and RLS
-- This file fixes the database to match the updated application code

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
-- RLS POLICIES FOR BATCHES
-- =====================================================

-- Users can view all batches (for reporting)
CREATE POLICY "Users can view batches" ON batches
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can insert their own batches
CREATE POLICY "Users can insert batches" ON batches
    FOR INSERT WITH CHECK (created_by = auth.uid());

-- Owners and managers can update all batches
CREATE POLICY "Owners and managers can update batches" ON batches
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- Users can update their own batches
CREATE POLICY "Users can update own batches" ON batches
    FOR UPDATE USING (created_by = auth.uid());

-- Owners and managers can delete all batches
CREATE POLICY "Owners and managers can delete batches" ON batches
    FOR DELETE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- Users can delete their own batches
CREATE POLICY "Users can delete own batches" ON batches
    FOR DELETE USING (created_by = auth.uid());

-- =====================================================
-- RLS POLICIES FOR BREAD TYPES
-- =====================================================

-- All authenticated users can view bread types
CREATE POLICY "Users can view bread types" ON bread_types
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Owners and managers can manage bread types
CREATE POLICY "Owners and managers can manage bread types" ON bread_types
    FOR ALL USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- =====================================================
-- RLS POLICIES FOR USERS
-- =====================================================

-- Users can view their own profile
CREATE POLICY "Users can view own profile" ON users
    FOR SELECT USING (id = auth.uid());

-- Owners can view all users
CREATE POLICY "Owners can view all users" ON users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'owner')
    );

-- Managers can view all users
CREATE POLICY "Managers can view all users" ON users
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'manager')
    );

-- =====================================================
-- RLS POLICIES FOR SALES LOGS
-- =====================================================

-- Users can view all sales logs (for reporting)
CREATE POLICY "Users can view sales logs" ON sales_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can insert their own sales logs
CREATE POLICY "Users can insert sales logs" ON sales_logs
    FOR INSERT WITH CHECK (recorded_by = auth.uid());

-- Owners and managers can update sales logs
CREATE POLICY "Owners and managers can update sales logs" ON sales_logs
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- =====================================================
-- RLS POLICIES FOR PRODUCTION LOGS
-- =====================================================

-- Users can view all production logs
CREATE POLICY "Users can view production logs" ON production_logs
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Users can insert their own production logs
CREATE POLICY "Users can insert production logs" ON production_logs
    FOR INSERT WITH CHECK (recorded_by = auth.uid());

-- Owners and managers can update production logs
CREATE POLICY "Owners and managers can update production logs" ON production_logs
    FOR UPDATE USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- =====================================================
-- RLS POLICIES FOR SHIFT FEEDBACK
-- =====================================================

-- Users can view their own feedback
CREATE POLICY "Users can view own feedback" ON shift_feedback
    FOR SELECT USING (user_id = auth.uid());

-- Users can insert their own feedback
CREATE POLICY "Users can insert own feedback" ON shift_feedback
    FOR INSERT WITH CHECK (user_id = auth.uid());

-- Owners and managers can view all feedback
CREATE POLICY "Owners and managers can view all feedback" ON shift_feedback
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('owner', 'manager'))
    );

-- =====================================================
-- INDEXES FOR PERFORMANCE
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
-- COMMENTS
-- =====================================================
COMMENT ON TABLE batches IS 'Tracks individual production batches for better inventory management';
COMMENT ON COLUMN batches.batch_number IS 'Unique batch identifier within a bread type';
COMMENT ON COLUMN batches.status IS 'Current status: active, completed, or cancelled';
COMMENT ON COLUMN batches.target_quantity IS 'Planned quantity for this batch';
COMMENT ON COLUMN batches.actual_quantity IS 'Actual quantity produced (updated from production_logs)'; 