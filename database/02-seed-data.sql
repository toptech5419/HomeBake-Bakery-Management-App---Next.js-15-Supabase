-- HomeBake Bakery Management System - Seed Data
-- This file contains initial data for the application

-- =====================================================
-- SAMPLE BREAD TYPES
-- =====================================================
INSERT INTO bread_types (name, size, unit_price, created_by) VALUES
('White Bread', 'Standard', 150.00, (SELECT id FROM users WHERE role = 'owner' LIMIT 1)),
('Brown Bread', 'Standard', 180.00, (SELECT id FROM users WHERE role = 'owner' LIMIT 1)),
('Whole Wheat', 'Standard', 200.00, (SELECT id FROM users WHERE role = 'owner' LIMIT 1)),
('Sourdough', 'Standard', 250.00, (SELECT id FROM users WHERE role = 'owner' LIMIT 1)),
('Baguette', 'Large', 120.00, (SELECT id FROM users WHERE role = 'owner' LIMIT 1)),
('Croissant', 'Medium', 80.00, (SELECT id FROM users WHERE role = 'owner' LIMIT 1)),
('Dinner Roll', 'Small', 50.00, (SELECT id FROM users WHERE role = 'owner' LIMIT 1)),
('Pita Bread', 'Medium', 60.00, (SELECT id FROM users WHERE role = 'owner' LIMIT 1))
ON CONFLICT DO NOTHING;

-- =====================================================
-- SAMPLE PRODUCTION LOGS (Last 7 days)
-- =====================================================
INSERT INTO production_logs (bread_type_id, quantity, shift, recorded_by) VALUES
((SELECT id FROM bread_types WHERE name = 'White Bread' LIMIT 1), 50, 'morning', (SELECT id FROM users WHERE role = 'manager' LIMIT 1)),
((SELECT id FROM bread_types WHERE name = 'Brown Bread' LIMIT 1), 30, 'morning', (SELECT id FROM users WHERE role = 'manager' LIMIT 1)),
((SELECT id FROM bread_types WHERE name = 'Whole Wheat' LIMIT 1), 25, 'morning', (SELECT id FROM users WHERE role = 'manager' LIMIT 1)),
((SELECT id FROM bread_types WHERE name = 'White Bread' LIMIT 1), 40, 'night', (SELECT id FROM users WHERE role = 'manager' LIMIT 1)),
((SELECT id FROM bread_types WHERE name = 'Sourdough' LIMIT 1), 20, 'night', (SELECT id FROM users WHERE role = 'manager' LIMIT 1))
ON CONFLICT DO NOTHING;

-- =====================================================
-- SAMPLE SALES LOGS (Last 7 days)
-- =====================================================
INSERT INTO sales_logs (bread_type_id, quantity, unit_price, discount, shift, recorded_by) VALUES
((SELECT id FROM bread_types WHERE name = 'White Bread' LIMIT 1), 45, 150.00, 0.00, 'morning', (SELECT id FROM users WHERE role = 'sales_rep' LIMIT 1)),
((SELECT id FROM bread_types WHERE name = 'Brown Bread' LIMIT 1), 28, 180.00, 10.00, 'morning', (SELECT id FROM users WHERE role = 'sales_rep' LIMIT 1)),
((SELECT id FROM bread_types WHERE name = 'Whole Wheat' LIMIT 1), 22, 200.00, 0.00, 'morning', (SELECT id FROM users WHERE role = 'sales_rep' LIMIT 1)),
((SELECT id FROM bread_types WHERE name = 'White Bread' LIMIT 1), 35, 150.00, 5.00, 'night', (SELECT id FROM users WHERE role = 'sales_rep' LIMIT 1)),
((SELECT id FROM bread_types WHERE name = 'Sourdough' LIMIT 1), 18, 250.00, 0.00, 'night', (SELECT id FROM users WHERE role = 'sales_rep' LIMIT 1))
ON CONFLICT DO NOTHING;

-- =====================================================
-- SAMPLE BATCHES
-- =====================================================
INSERT INTO batches (bread_type_id, batch_number, target_quantity, status, created_by) VALUES
((SELECT id FROM bread_types WHERE name = 'White Bread' LIMIT 1), 'B001', 50, 'completed', (SELECT id FROM users WHERE role = 'manager' LIMIT 1)),
((SELECT id FROM bread_types WHERE name = 'Brown Bread' LIMIT 1), 'B001', 30, 'completed', (SELECT id FROM users WHERE role = 'manager' LIMIT 1)),
((SELECT id FROM bread_types WHERE name = 'Whole Wheat' LIMIT 1), 'B001', 25, 'active', (SELECT id FROM users WHERE role = 'manager' LIMIT 1)),
((SELECT id FROM bread_types WHERE name = 'Sourdough' LIMIT 1), 'B001', 20, 'active', (SELECT id FROM users WHERE role = 'manager' LIMIT 1))
ON CONFLICT DO NOTHING;

-- =====================================================
-- SAMPLE SHIFT FEEDBACK
-- =====================================================
INSERT INTO shift_feedback (user_id, shift, note) VALUES
((SELECT id FROM users WHERE role = 'manager' LIMIT 1), 'morning', 'Production went smoothly today. All targets met.'),
((SELECT id FROM users WHERE role = 'sales_rep' LIMIT 1), 'morning', 'Good customer flow. White bread was most popular.'),
((SELECT id FROM users WHERE role = 'manager' LIMIT 1), 'night', 'Night shift completed successfully. Equipment maintenance scheduled.'),
((SELECT id FROM users WHERE role = 'sales_rep' LIMIT 1), 'night', 'Evening sales were steady. Sourdough had good demand.')
ON CONFLICT DO NOTHING; 