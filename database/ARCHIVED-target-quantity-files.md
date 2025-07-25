# Archived Target Quantity References

This document lists the files that still contain `target_quantity` references, but these are historical migration files that should be preserved for reference. The actual database schema has been updated to use `actual_quantity` only.

## Files with target_quantity references (DO NOT MODIFY - for reference only):

1. **database/03-fix-batches-rls.sql** - Contains comments about target_quantity
2. **database/create-complete-database.sql** - Contains target_quantity column definitions
3. **database/debug-batch-data.sql** - Contains queries referencing target_quantity
4. **database/deploy-batch-fixes.sql** - Contains function parameters with target_quantity
5. **database/fix-actual-quantity-issue.sql** - Contains target_quantity in test data
6. **database/fix-batch-numbering-function.sql** - Contains function parameters with target_quantity
7. **database/fix-function-signature.sql** - Contains function parameters with target_quantity
8. **database/fix-target-quantity-null.sql** - Contains target_quantity references
9. **database/migrate-to-actual-quantity.sql** - Contains migration notes about target_quantity
10. **database/sample-data-for-testing.sql** - Contains INSERT statements with target_quantity
11. **database/sample-data-for-testing-fixed.sql** - Contains INSERT statements with target_quantity
12. **database/sample-data-simple.sql** - Contains INSERT statements with target_quantity
13. **database/test-api-response.sql** - Contains queries referencing target_quantity
14. **database/use-actual-quantity-only.sql** - Contains migration notes about target_quantity

## Current Status:
✅ Application code (src/) - No target_quantity references
✅ Database function (supabase/functions/create_batch_with_unique_number.sql) - Updated to use actual_quantity
✅ Database setup (database/01-setup-database.sql) - Updated to use actual_quantity only
✅ Seed data (database/02-seed-data.sql) - Updated to use actual_quantity only
