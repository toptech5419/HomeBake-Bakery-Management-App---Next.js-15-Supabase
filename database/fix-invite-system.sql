-- Fix QR Invites System
-- This script ensures the qr_invites table exists and has proper permissions

-- Create qr_invites table if it doesn't exist
CREATE TABLE IF NOT EXISTS qr_invites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('manager', 'sales_rep')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT FALSE,
  used_at TIMESTAMP WITH TIME ZONE,
  used_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_qr_invites_token ON qr_invites(token);
CREATE INDEX IF NOT EXISTS idx_qr_invites_expires_at ON qr_invites(expires_at);
CREATE INDEX IF NOT EXISTS idx_qr_invites_is_used ON qr_invites(is_used);

-- Grant permissions to authenticated users
GRANT SELECT, INSERT, UPDATE ON qr_invites TO authenticated;

-- Enable RLS (if needed)
ALTER TABLE qr_invites ENABLE ROW LEVEL SECURITY;

-- Create policies for qr_invites
DROP POLICY IF EXISTS "Users can create invites" ON qr_invites;
CREATE POLICY "Users can create invites" ON qr_invites
  FOR INSERT 
  WITH CHECK (auth.uid() = created_by);

DROP POLICY IF EXISTS "Users can view their invites" ON qr_invites;
CREATE POLICY "Users can view their invites" ON qr_invites
  FOR SELECT 
  USING (auth.uid() = created_by);

DROP POLICY IF EXISTS "Public can validate invites" ON qr_invites;
CREATE POLICY "Public can validate invites" ON qr_invites
  FOR SELECT 
  USING (NOT is_used AND expires_at > NOW());

DROP POLICY IF EXISTS "Public can mark invites as used" ON qr_invites;
CREATE POLICY "Public can mark invites as used" ON qr_invites
  FOR UPDATE 
  USING (NOT is_used AND expires_at > NOW())
  WITH CHECK (is_used = TRUE);

-- Ensure users table exists with proper structure
CREATE TABLE IF NOT EXISTS users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'sales_rep')),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Grant permissions to users table
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;

-- Enable RLS for users table
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Create policies for users table
DROP POLICY IF EXISTS "Users can view all profiles" ON users;
CREATE POLICY "Users can view all profiles" ON users
  FOR SELECT 
  USING (TRUE);

DROP POLICY IF EXISTS "Users can insert their own profile" ON users;
CREATE POLICY "Users can insert their own profile" ON users
  FOR INSERT 
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE 
  USING (auth.uid() = id);

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger for users table
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Clean up expired invites (optional maintenance)
DELETE FROM qr_invites WHERE expires_at < NOW() - INTERVAL '7 days';

COMMIT;