-- Simple sample data for testing manager dashboard functionality
-- This script inserts test data without using ON CONFLICT clauses

-- Insert sample bread types with proper UUID format
INSERT INTO bread_types (id, name, unit_price, created_at) VALUES
(gen_random_uuid(), 'White Bread', 2.50, NOW()),
(gen_random_uuid(), 'Whole Wheat', 3.00, NOW()),
(gen_random_uuid(), 'Sourdough', 4.00, NOW()),
(gen_random_uuid(), 'Rye Bread', 3.50, NOW()),
(gen_random_uuid(), 'Baguette', 2.75, NOW());

-- Get the bread type IDs we just created and insert batches
WITH bread_type_ids AS (
  SELECT id, name FROM bread_types WHERE name IN ('White Bread', 'Whole Wheat', 'Sourdough')
)
INSERT INTO batches (id, bread_type_id, batch_number, start_time, target_quantity, status, created_by, created_at)
SELECT 
  gen_random_uuid(),
  bti.id,
  'B001',
  NOW() - INTERVAL '2 hours',
  100,
  'active',
  (SELECT id FROM users LIMIT 1),
  NOW() - INTERVAL '2 hours'
FROM bread_type_ids bti WHERE bti.name = 'White Bread'
UNION ALL
SELECT 
  gen_random_uuid(),
  bti.id,
  'B002',
  NOW() - INTERVAL '1 hour',
  75,
  'active',
  (SELECT id FROM users LIMIT 1),
  NOW() - INTERVAL '1 hour'
FROM bread_type_ids bti WHERE bti.name = 'Whole Wheat'
UNION ALL
SELECT 
  gen_random_uuid(),
  bti.id,
  'B003',
  NOW() - INTERVAL '30 minutes',
  50,
  'active',
  (SELECT id FROM users LIMIT 1),
  NOW() - INTERVAL '30 minutes'
FROM bread_type_ids bti WHERE bti.name = 'Sourdough';

-- Insert sample production logs
WITH bread_type_ids AS (
  SELECT id, name FROM bread_types WHERE name IN ('White Bread', 'Whole Wheat', 'Sourdough')
)
INSERT INTO production_logs (id, bread_type_id, quantity, shift, recorded_by, created_at)
SELECT 
  gen_random_uuid(),
  bti.id,
  50,
  'morning',
  (SELECT id FROM users LIMIT 1),
  NOW() - INTERVAL '2 hours'
FROM bread_type_ids bti WHERE bti.name = 'White Bread'
UNION ALL
SELECT 
  gen_random_uuid(),
  bti.id,
  40,
  'morning',
  (SELECT id FROM users LIMIT 1),
  NOW() - INTERVAL '1 hour'
FROM bread_type_ids bti WHERE bti.name = 'Whole Wheat'
UNION ALL
SELECT 
  gen_random_uuid(),
  bti.id,
  30,
  'morning',
  (SELECT id FROM users LIMIT 1),
  NOW() - INTERVAL '30 minutes'
FROM bread_type_ids bti WHERE bti.name = 'Sourdough';

-- Verify the data was inserted
SELECT 'Bread Types' as table_name, COUNT(*) as count FROM bread_types
UNION ALL
SELECT 'Batches' as table_name, COUNT(*) as count FROM batches
UNION ALL
SELECT 'Production Logs' as table_name, COUNT(*) as count FROM production_logs; 