# Realtime Subscription Fix

## Issue Summary
The manager dashboard was experiencing browser freezing due to multiple components trying to subscribe to the same Supabase realtime channel (`production_logs`). This created an infinite loop of subscription attempts.

## Temporary Fix (Currently Applied)
Realtime subscriptions have been **temporarily disabled** by setting `DISABLE_REALTIME = true` in `src/hooks/use-realtime-data.ts`.

## Root Cause
1. Both `ManagerShiftControl` and `ManagerBatchSystem` components use `useRealtimeProduction()`
2. When rendered on the same page, they create duplicate subscriptions to the same table
3. Supabase throws an error: "tried to subscribe multiple times"
4. The error handler tries to reconnect, creating an infinite loop

## Permanent Solution Options

### Option 1: Singleton Channel Manager (Recommended)
Create a context provider that manages all realtime subscriptions centrally:

```typescript
// src/contexts/RealtimeContext.tsx
const RealtimeContext = createContext({});

export function RealtimeProvider({ children }) {
  const channels = useRef(new Map());
  
  const subscribe = (table, callback) => {
    if (!channels.current.has(table)) {
      // Create new channel
      const channel = supabase.channel(`realtime-${table}`);
      channels.current.set(table, { channel, callbacks: [] });
    }
    
    // Add callback to existing channel
    const entry = channels.current.get(table);
    entry.callbacks.push(callback);
    
    // Subscribe if not already subscribed
    if (!entry.isSubscribed) {
      entry.channel.on('postgres_changes', { /* ... */ }, (payload) => {
        entry.callbacks.forEach(cb => cb(payload));
      }).subscribe();
      entry.isSubscribed = true;
    }
  };
  
  return (
    <RealtimeContext.Provider value={{ subscribe }}>
      {children}
    </RealtimeContext.Provider>
  );
}
```

### Option 2: Shared Hook Pattern
Create a higher-level hook that multiple components can use without creating duplicate subscriptions:

```typescript
// src/hooks/use-shared-realtime.ts
const subscriptions = new Map();

export function useSharedRealtimeData(tableName, query, options) {
  const key = `${tableName}-${JSON.stringify(options)}`;
  
  if (!subscriptions.has(key)) {
    // Create new subscription
    subscriptions.set(key, createSubscription(tableName, options));
  }
  
  // Use existing subscription
  return useSubscription(subscriptions.get(key));
}
```

### Option 3: Data Aggregation at Page Level
Fetch realtime data once at the page level and pass it down to child components:

```typescript
// src/app/dashboard/manager/page.tsx
export default function ManagerDashboard() {
  const productionData = useRealtimeProduction();
  
  return (
    <>
      <ManagerShiftControl productionData={productionData} />
      <ManagerBatchSystem productionData={productionData} />
    </>
  );
}
```

## To Re-enable Realtime

1. **For Testing**: Change `DISABLE_REALTIME = false` in `src/hooks/use-realtime-data.ts`
2. **For Production**: Implement one of the permanent solutions above

## Improved Error Handling (Already Applied)
The following improvements have been made to `use-realtime-data.ts`:
- Unique channel names with timestamps to avoid conflicts
- Proper cleanup with `supabase.removeChannel()`
- Exponential backoff for reconnection attempts
- Prevention of simultaneous subscription attempts
- Single useEffect for mount/unmount lifecycle

## Testing Steps
1. Set `DISABLE_REALTIME = false`
2. Navigate to manager dashboard
3. Check console for subscription logs
4. Verify no infinite loops occur
5. Test with multiple components using the same table

## Performance Considerations
- Limit the number of records fetched (already implemented)
- Use pagination for large datasets
- Consider implementing virtual scrolling for tables
- Debounce rapid updates to prevent UI thrashing