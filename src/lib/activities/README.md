# Activity Logging Integration Guide

## Overview
This guide shows how to integrate activity logging into existing components and hooks throughout the app to capture live notifications for the owner dashboard.

## Required Integration Points

### 1. Sales Recording (Sales Rep)
**Location**: `src/lib/sales/actions.ts` or wherever sales are submitted

```typescript
import { useActivityLogger } from '@/hooks/use-activity-logger';

// In sales submission function:
const { logSale } = useActivityLogger();

// After successful sale creation:
await logSale({
  user_id: currentUser.id,
  user_name: currentUser.name,
  bread_type: breadTypeName,
  quantity: saleData.quantity,
  revenue: saleData.total
});
```

### 2. Batch Recording (Manager)
**Location**: `src/hooks/use-batches.ts` or batch creation functions

```typescript
import { useActivityLogger } from '@/hooks/use-activity-logger';

// In batch creation function:
const { logBatch } = useActivityLogger();

// After successful batch creation:
await logBatch({
  user_id: currentUser.id,
  user_name: currentUser.name,
  bread_type: breadTypeName,
  quantity: batchData.actual_quantity,
  batch_number: batchData.batch_number
});
```

### 3. Shift Reports Generation
**Location**: `src/hooks/use-end-shift.ts` or report generation functions

```typescript
import { useActivityLogger } from '@/hooks/use-activity-logger';

// In report generation function:
const { logReport } = useActivityLogger();

// After successful report creation:
await logReport({
  user_id: currentUser.id,
  user_name: currentUser.name,
  user_role: currentUser.role as 'manager' | 'sales_rep',
  report_type: 'shift_report'
});
```

### 4. End Shift Actions
**Location**: `src/hooks/use-end-shift.ts`

```typescript
import { useActivityLogger } from '@/hooks/use-activity-logger';

// In end shift function:
const { logEndShift } = useActivityLogger();

// When user ends their shift:
await logEndShift({
  user_id: currentUser.id,
  user_name: currentUser.name,
  user_role: currentUser.role as 'manager' | 'sales_rep'
});
```

### 5. User Login
**Location**: `src/app/(auth)/login/page.tsx` or auth callback

```typescript
import { useActivityLogger } from '@/hooks/use-activity-logger';

// After successful login:
const { logLogin } = useActivityLogger();

if (user.role !== 'owner') {
  await logLogin({
    user_id: user.id,
    user_name: user.name,
    user_role: user.role as 'manager' | 'sales_rep'
  });
}
```

### 6. Account Creation
**Location**: `src/app/dashboard/users/invite/page.tsx` or signup completion

```typescript
import { useActivityLogger } from '@/hooks/use-activity-logger';

// After successful account creation:
const { logAccountCreated } = useActivityLogger();

await logAccountCreated({
  user_id: newUser.id,
  user_name: newUser.name,
  user_role: newUser.role as 'manager' | 'sales_rep'
});
```

## Database Setup Required

1. Run the SQL migration to create the activities table:
   ```sql
   -- File: database/03-activities-table.sql
   ```

2. Ensure your database has the required indexes for performance.

## Usage in Components

### Basic Usage
```typescript
import { useActivities } from '@/hooks/use-live-activities';
import ActivityNotifications from '@/components/notifications/ActivityNotifications';

function YourComponent() {
  const { activities, isLoading, refetch } = useActivities();

  return (
    <ActivityNotifications 
      activities={activities} 
      isPreview={false}
      showDateSeparators={true}
    />
  );
}
```

### Modal Usage
```typescript
import AllNotificationsModal from '@/components/notifications/AllNotificationsModal';

function YourComponent() {
  const [showModal, setShowModal] = useState(false);
  const { activities, refetch } = useActivities();

  return (
    <AllNotificationsModal
      isOpen={showModal}
      onClose={() => setShowModal(false)}
      activities={activities}
      onRefresh={refetch}
    />
  );
}
```

## Features

✅ **Real-time polling** every 30 seconds
✅ **Automatic 3-day cleanup** of old activities  
✅ **Light color themes** with proper UX/UI
✅ **Date separators** in modal view
✅ **Activity-specific badges** and icons
✅ **Metadata display** for sales and batches
✅ **Local storage fallback** (handled by React Query cache)
✅ **Mobile-optimized** cards and modals
✅ **Smooth animations** with Framer Motion

## Performance Notes

- Activities are fetched every 30 seconds via React Query polling
- React Query automatically handles caching and background updates
- Database cleanup runs automatically every hour
- Only last 3 days of activities are maintained
- Optimized queries with proper indexing on created_at column

## Color Coding

- **🟢 Sales**: Light green background, green badges
- **🔵 Batches**: Light blue background, blue badges  
- **🟡 Reports**: Light yellow background, yellow badges
- **🟣 Login**: Light purple background, purple badges
- **🔴 End Shift**: Light red background, red badges
- **🔷 Account Created**: Light indigo background, indigo badges

## Testing

Test the integration by:
1. Recording a sale (should appear in live activity)
2. Creating a batch (should appear in live activity)
3. Generating a report (should appear in live activity)
4. Ending a shift (should appear in live activity)
5. Checking that older activities (>3 days) are automatically cleaned up