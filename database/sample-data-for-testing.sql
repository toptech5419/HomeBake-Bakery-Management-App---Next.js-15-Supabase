-- Sample data for testing manager dashboard functionality
-- This script inserts test data to verify the manager dashboard works properly

-- Insert sample bread types
INSERT INTO bread_types (id, name, unit_price, created_at) VALUES
('bt-001', 'White Bread', 2.50, NOW()),
('bt-002', 'Whole Wheat', 3.00, NOW()),
('bt-003', 'Sourdough', 4.00, NOW()),
('bt-004', 'Rye Bread', 3.50, NOW()),
('bt-005', 'Baguette', 2.75, NOW())
ON CONFLICT (id) DO NOTHING;

-- Insert sample batches (assuming you have a user with ID)
-- Replace 'your-user-id' with an actual user ID from your users table
INSERT INTO batches (id, bread_type_id, batch_number, start_time, target_quantity, status, created_by, created_at) VALUES
('batch-001', 'bt-001', 'B001', NOW() - INTERVAL '2 hours', 100, 'active', (SELECT id FROM users LIMIT 1), NOW() - INTERVAL '2 hours'),
('batch-002', 'bt-002', 'B002', NOW() - INTERVAL '1 hour', 75, 'active', (SELECT id FROM users LIMIT 1), NOW() - INTERVAL '1 hour'),
('batch-003', 'bt-003', 'B003', NOW() - INTERVAL '30 minutes', 50, 'active', (SELECT id FROM users LIMIT 1), NOW() - INTERVAL '30 minutes'),
('batch-004', 'bt-001', 'B004', NOW() - INTERVAL '3 hours', 120, 'completed', (SELECT id FROM users LIMIT 1), NOW() - INTERVAL '3 hours'),
('batch-005', 'bt-002', 'B005', NOW() - INTERVAL '4 hours', 80, 'completed', (SELECT id FROM users LIMIT 1), NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

-- Insert sample production logs
INSERT INTO production_logs (id, bread_type_id, quantity, shift, recorded_by, created_at) VALUES
('prod-001', 'bt-001', 50, 'morning', (SELECT id FROM users LIMIT 1), NOW() - INTERVAL '2 hours'),
('prod-002', 'bt-002', 40, 'morning', (SELECT id FROM users LIMIT 1), NOW() - INTERVAL '1 hour'),
('prod-003', 'bt-003', 30, 'morning', (SELECT id FROM users LIMIT 1), NOW() - INTERVAL '30 minutes'),
('prod-004', 'bt-001', 60, 'morning', (SELECT id FROM users LIMIT 1), NOW() - INTERVAL '3 hours'),
('prod-005', 'bt-002', 35, 'morning', (SELECT id FROM users LIMIT 1), NOW() - INTERVAL '4 hours')
ON CONFLICT (id) DO NOTHING;

-- Verify the data was inserted
SELECT 'Bread Types' as table_name, COUNT(*) as count FROM bread_types
UNION ALL
SELECT 'Batches' as table_name, COUNT(*) as count FROM batches
UNION ALL
SELECT 'Production Logs' as table_name, COUNT(*) as count FROM production_logs; 