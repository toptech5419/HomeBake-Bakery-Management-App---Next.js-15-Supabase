-- This script requires an owner user to be created first.
-- Replace 'owner-uuid' with the actual UUID of the owner user after creation.

-- Insert sample bread types
INSERT INTO bread_types (name, size, unit_price, created_by)
VALUES
  ('Small Loaf', '400g', 150.00, 'YOUR_OWNER_USER_ID'),
  ('Large Loaf', '800g', 250.00, 'YOUR_OWNER_USER_ID'),
  ('Baguette', '250g', 100.00, 'YOUR_OWNER_USER_ID'),
  ('Wheat Bread', '500g', 200.00, 'YOUR_OWNER_USER_ID'),
  ('Sourdough', '600g', 350.00, 'YOUR_OWNER_USER_ID');

-- Note: You would typically create a 'manager' and 'sales_rep' user
-- via the QR invite flow in the app.
-- For testing, you can manually insert them and replace the UUIDs.
-- Let's assume a manager and sales_rep user exist with these UUIDs:
-- manager_uuid = 'YOUR_MANAGER_USER_ID';
-- sales_rep_uuid = 'YOUR_SALES_REP_USER_ID';

-- Insert sample production logs
-- INSERT INTO production_logs (bread_type_id, quantity, shift, recorded_by)
-- SELECT id, 100, 'morning', 'YOUR_MANAGER_USER_ID' FROM bread_types WHERE name = 'Small Loaf';

-- INSERT INTO production_logs (bread_type_id, quantity, shift, recorded_by)
-- SELECT id, 50, 'morning', 'YOUR_MANAGER_USER_ID' FROM bread_types WHERE name = 'Large Loaf';

-- Insert sample sales logs
-- INSERT INTO sales_logs (bread_type_id, quantity, unit_price, shift, recorded_by)
-- SELECT id, 20, 150.00, 'morning', 'YOUR_SALES_REP_USER_ID' FROM bread_types WHERE name = 'Small Loaf';

-- INSERT INTO sales_logs (bread_type_id, quantity, unit_price, shift, recorded_by)
-- SELECT id, 10, 250.00, 'morning', 'YOUR_SALES_REP_USER_ID' FROM bread_types WHERE name = 'Large Loaf';

-- Insert sample shift feedback
-- INSERT INTO shift_feedback (user_id, shift, note)
-- VALUES
--   ('YOUR_MANAGER_USER_ID', 'morning', 'Production went smoothly today.'),
--   ('YOUR_SALES_REP_USER_ID', 'morning', 'Customers were asking for more wheat bread.'); 