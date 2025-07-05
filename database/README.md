# HomeBake Database Structure

## Overview
This directory contains all database-related SQL files for the HomeBake application.

## File Organization

### Core Schema Files
- `schema.sql` - Main database schema with tables and indexes
- `seed.sql` - Initial seed data for development
- `setup-database.sql` - Complete database setup script

### RLS (Row Level Security) Files
- `rls-policies.sql` - Original RLS policies (has issues)
- `simplified-rls-policies.sql` - **USE THIS** - Cleaned up and simplified RLS policies

### Migration History
The following files represent various fixes and migrations. They're kept for historical reference but should NOT be run on new installations:

#### Authentication & User Management
- `fix-auth-cascade-final.sql`
- `fix-auth-integration-final.sql`
- `check-user-role.sql`
- `debug-auth-issue.sql`

#### Production & Inventory
- `production-rls-fix.sql`
- `simple-production-fix.sql`
- `final-production-fix.sql`
- `investigate-inventory-system.sql`
- `debug-inventory-production-logs.sql`

#### Bread Types & Constraints
- `fix-bread-type-deletion.sql`
- `fix-bread-type-inventory-constraint.sql`
- `diagnose-bread-type-deletion.sql`
- `final-bread-type-deletion-solution.sql`

#### Other Fixes
- `fix-jsonb-casting.sql`
- `fix-jsonb-final-clean.sql`
- `fix-signup-policy.sql`
- `performance-indexes.sql`

## Setup Instructions

For a fresh database setup:

1. Run `schema.sql` to create tables
2. Run `simplified-rls-policies.sql` to set up RLS
3. Optionally run `seed.sql` for test data

```sql
-- In Supabase SQL Editor:
-- 1. Create schema
\i schema.sql

-- 2. Set up RLS
\i simplified-rls-policies.sql

-- 3. Add test data (optional)
\i seed.sql
```

## Important Notes

- Always backup your database before running migrations
- The `fix-*` files are historical and should not be run on new installations
- Use `simplified-rls-policies.sql` instead of the original `rls-policies.sql`
- Test all changes in a development environment first