# Bread Type Deletion Foreign Key Constraint Fix

## 🔴 **Problem Diagnosed**

The bread type deletion is failing due to a **foreign key constraint violation**:

```
Error: update or delete on table "bread_types" violates foreign key constraint "inventory_bread_type_id_fkey" on table "inventory"
```

### **Root Cause**
- There's an `inventory` table that references `bread_types` via `bread_type_id`
- The foreign key constraint prevents deletion of bread types that have inventory records
- The specific bread type `f3a341a7-791e-432d-b506-40b99241b60b` has inventory records

## 🛠️ **Solutions Provided**

### **IMMEDIATE FIX (Recommended)**
Run this SQL script in your Supabase SQL Editor:

```sql
-- Clear inventory records for the specific bread type causing issues
DELETE FROM inventory WHERE bread_type_id = 'f3a341a7-791e-432d-b506-40b99241b60b';

-- Verify the records are cleared
SELECT COUNT(*) as remaining_inventory_records
FROM inventory 
WHERE bread_type_id = 'f3a341a7-791e-432d-b506-40b99241b60b';
```

### **Long-term Solutions**

#### **Option 1: Modify Foreign Key Constraint (Recommended for Production)**
```sql
-- Drop existing constraint
ALTER TABLE inventory DROP CONSTRAINT inventory_bread_type_id_fkey;

-- Recreate with CASCADE to automatically clean up inventory when bread type is deleted
ALTER TABLE inventory ADD CONSTRAINT inventory_bread_type_id_fkey 
  FOREIGN KEY (bread_type_id) REFERENCES bread_types(id) ON DELETE CASCADE;
```

#### **Option 2: Use Safe Deletion Function**
The script creates a `safe_delete_bread_type()` function that:
- Checks for related records
- Cleans up inventory records first
- Then deletes the bread type
- Provides detailed logging

## 📋 **Enhanced Error Handling**

Updated the bread type deletion code to provide user-friendly error messages:

### **Before:**
```
Failed to delete bread type: update or delete on table "bread_types" violates foreign key constraint...
```

### **After:**
```
Cannot delete this bread type as it has inventory records. Please clear the inventory first or contact your administrator.
```

## 🔧 **Files Modified**

1. **`src/lib/bread-types/actions.ts`**
   - Enhanced error handling for foreign key constraint violations
   - Specific error messages for different constraint types
   - Better user experience with actionable error messages

2. **`database/fix-bread-type-inventory-constraint.sql`**
   - Comprehensive analysis and multiple solution options
   - Safe deletion function for future use
   - Immediate fix for the current issue

3. **`database/diagnose-bread-type-deletion.sql`**
   - Diagnostic queries to understand the constraint structure
   - Analysis of related tables and their relationships

## 🚀 **How to Apply the Fix**

### **Step 1: Run Immediate Fix**
Execute this in your Supabase SQL Editor:
```sql
DELETE FROM inventory WHERE bread_type_id = 'f3a341a7-791e-432d-b506-40b99241b60b';
```

### **Step 2: Test Deletion**
Try deleting the bread type from the UI - it should work now.

### **Step 3: Apply Long-term Solution (Optional)**
For future bread types, run the CASCADE constraint modification:
```sql
ALTER TABLE inventory DROP CONSTRAINT inventory_bread_type_id_fkey;
ALTER TABLE inventory ADD CONSTRAINT inventory_bread_type_id_fkey 
  FOREIGN KEY (bread_type_id) REFERENCES bread_types(id) ON DELETE CASCADE;
```

## ✅ **Expected Results**

After applying the immediate fix:
- ✅ **Bread type deletion works** - No more foreign key constraint errors
- ✅ **User-friendly error messages** - Clear guidance when deletion fails
- ✅ **Proper validation** - Checks for production/sales records before deletion
- ✅ **Safe operation** - Prevents accidental data loss

## 🔍 **Understanding the Database Structure**

The constraint relationship:
```
bread_types (id) ←── inventory (bread_type_id)
                 ←── production_logs (bread_type_id)  
                 ←── sales_logs (bread_type_id)
```

The `inventory` table constraint was the missing piece that wasn't accounted for in the original deletion logic.

## 📝 **Future Recommendations**

1. **Use CASCADE constraints** for automatic cleanup
2. **Implement archiving** instead of deletion for bread types with historical data
3. **Add inventory management UI** to allow users to clear inventory before deletion
4. **Consider soft deletes** (marking as inactive) instead of hard deletes