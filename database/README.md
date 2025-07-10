# HomeBake Bakery Management System - Database

This directory contains the database setup files for the HomeBake Bakery Management System.

## Files Overview

### Production Files
- **`01-setup-database.sql`** - Complete database schema and setup for production
- **`02-seed-data.sql`** - Sample data for initial setup and testing
- **`deploy.sql`** - Complete deployment script (combines setup + seed data)
- **`README.md`** - This documentation file

## Quick Start

### Option 1: Complete Deployment (Recommended)
Run the complete deployment script in your Supabase SQL editor:
```sql
-- Copy and paste the contents of deploy.sql
```

### Option 2: Step-by-Step Setup
1. **Initial Database Setup**:
   ```sql
   -- Copy and paste the contents of 01-setup-database.sql
   ```

2. **Seed Data (Optional)**:
   ```sql
   -- Copy and paste the contents of 02-seed-data.sql
   ```

## Database Schema

### Tables
1. **users** - User accounts and authentication
2. **qr_invites** - QR code invitations for user registration
3. **bread_types** - Available bread types and pricing
4. **production_logs** - Daily production records
5. **sales_logs** - Daily sales records
6. **shift_feedback** - Shift feedback from staff
7. **sessions** - User session management
8. **batches** - Individual production batch tracking

### Key Features
- **Row Level Security (RLS)** - Secure data access based on user roles
- **Role-based Access Control** - Owner, Manager, and Sales Rep permissions
- **Performance Indexes** - Optimized queries for fast data retrieval
- **Auto-updating Timestamps** - Automatic `updated_at` field management
- **Foreign Key Constraints** - Data integrity and referential integrity

## User Roles

### Owner
- Full access to all data and operations
- Can manage users, bread types, and system settings
- Can view all reports and analytics

### Manager
- Can manage production, sales, and inventory
- Can create and manage batches
- Can view all data but with limited user management

### Sales Rep
- Can record sales and view inventory
- Can create their own batches
- Limited access to production and user management

## Security Features

### Row Level Security (RLS)
- All tables have RLS enabled
- Policies ensure users can only access appropriate data
- Role-based access control implemented

### Data Integrity
- Foreign key constraints prevent orphaned records
- Check constraints ensure valid data
- Unique constraints prevent duplicates

## Performance Optimizations

### Indexes
- Email and role indexes for fast user lookups
- Bread type and user indexes for production/sales logs
- Batch status and creation time indexes
- Composite indexes for complex queries

### Triggers
- Auto-updating `updated_at` timestamps
- Automatic batch number generation

## Maintenance

### Regular Tasks
- Monitor database performance
- Review and update RLS policies as needed
- Backup data regularly
- Update indexes based on query patterns

### Troubleshooting
- Check RLS policies if users can't access data
- Verify foreign key constraints for data integrity
- Monitor query performance with Supabase analytics

## Production Notes

- All SQL files are production-ready
- Clean, documented code structure
- Optimized for performance and security
- Compatible with Supabase hosting

## Support

For database issues or questions:
1. Check the Supabase dashboard for error logs
2. Review RLS policies for access issues
3. Verify foreign key relationships
4. Test queries in Supabase SQL editor
