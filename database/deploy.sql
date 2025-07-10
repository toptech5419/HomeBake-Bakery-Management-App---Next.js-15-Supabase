-- HomeBake Bakery Management System - Complete Deployment
-- This file combines the database setup and seed data for easy deployment

-- =====================================================
-- DATABASE SETUP
-- =====================================================

-- Include the complete database setup
\i 01-setup-database.sql

-- =====================================================
-- SEED DATA (Optional - Comment out if not needed)
-- =====================================================

-- Include sample data for testing
\i 02-seed-data.sql

-- =====================================================
-- DEPLOYMENT COMPLETE
-- =====================================================

-- Verify setup by checking tables
SELECT 'Database setup complete!' as status;
SELECT count(*) as table_count FROM information_schema.tables WHERE table_schema = 'public'; 