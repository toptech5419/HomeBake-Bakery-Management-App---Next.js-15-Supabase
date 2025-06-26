-- Complete Database Setup for HomeBake
-- Run this in your Supabase SQL Editor

-- USERS TABLE
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

-- QR INVITES TABLE
CREATE TABLE IF NOT EXISTS qr_invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  token TEXT UNIQUE NOT NULL,
  role TEXT CHECK (role IN ('manager', 'sales_rep')) NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_by UUID REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- BREAD TYPES
CREATE TABLE IF NOT EXISTS bread_types (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  size TEXT,
  unit_price NUMERIC(10,2) NOT NULL,
  created_by UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- PRODUCTION LOGS
CREATE TABLE IF NOT EXISTS production_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bread_type_id UUID REFERENCES bread_types(id) NOT NULL,
  quantity INTEGER NOT NULL,
  shift TEXT CHECK (shift IN ('morning', 'night')) NOT NULL,
  recorded_by UUID REFERENCES users(id) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- SALES LOGS
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

-- SHIFT FEEDBACK
CREATE TABLE IF NOT EXISTS shift_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) NOT NULL,
  shift TEXT CHECK (shift IN ('morning', 'night')) NOT NULL,
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_created_by ON users(created_by);

CREATE INDEX IF NOT EXISTS idx_qr_invites_token ON qr_invites(token);
CREATE INDEX IF NOT EXISTS idx_qr_invites_is_used ON qr_invites(is_used);
CREATE INDEX IF NOT EXISTS idx_qr_invites_expires_at ON qr_invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_qr_invites_created_by ON qr_invites(created_by);
CREATE INDEX IF NOT EXISTS idx_qr_invites_token_used_expires ON qr_invites(token, is_used, expires_at);

CREATE INDEX IF NOT EXISTS idx_production_logs_bread_type_id ON production_logs(bread_type_id);
CREATE INDEX IF NOT EXISTS idx_production_logs_recorded_by ON production_logs(recorded_by);
CREATE INDEX IF NOT EXISTS idx_production_logs_created_at ON production_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_production_logs_shift ON production_logs(shift);

CREATE INDEX IF NOT EXISTS idx_sales_logs_bread_type_id ON sales_logs(bread_type_id);
CREATE INDEX IF NOT EXISTS idx_sales_logs_recorded_by ON sales_logs(recorded_by);
CREATE INDEX IF NOT EXISTS idx_sales_logs_created_at ON sales_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_sales_logs_shift ON sales_logs(shift);

CREATE INDEX IF NOT EXISTS idx_shift_feedback_user_id ON shift_feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_shift_feedback_created_at ON shift_feedback(created_at);

-- Enable RLS for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE qr_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE bread_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE production_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sales_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE shift_feedback ENABLE ROW LEVEL SECURITY;

-- Utility functions
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS TEXT AS $$
  SELECT role FROM public.users WHERE id = auth.uid();
$$ LANGUAGE sql STABLE;

CREATE OR REPLACE FUNCTION get_my_id()
RETURNS UUID AS $$
  SELECT auth.uid();
$$ LANGUAGE sql STABLE;

-- RLS Policies
-- Users table policies
DROP POLICY IF EXISTS "Users can see their own data" ON users;
CREATE POLICY "Users can see their own data"
  ON users FOR SELECT
  USING (id = auth.uid());

DROP POLICY IF EXISTS "Owners can see all users" ON users;
CREATE POLICY "Owners can see all users"
  ON users FOR SELECT
  USING (get_my_role() = 'owner');

DROP POLICY IF EXISTS "Allow user creation during signup" ON users;
CREATE POLICY "Allow user creation during signup"
  ON users FOR INSERT
  WITH CHECK (auth.uid() = id);

-- QR Invites policies
DROP POLICY IF EXISTS "Owners can manage QR invites" ON qr_invites;
CREATE POLICY "Owners can manage QR invites"
  ON qr_invites FOR ALL
  USING ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner' )
  WITH CHECK ( (SELECT role FROM public.users WHERE id = auth.uid()) = 'owner' );

-- Add more policies as needed for other tables... 