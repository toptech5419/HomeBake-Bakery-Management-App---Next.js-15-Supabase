# CLAUDE.md - Production-Ready HomeBake Development Guide

This file provides comprehensive guidance to Claude Code (claude.ai/code) when working with the HomeBake project — a world-class, mobile-first bakery management PWA built with Next.js 15, Supabase, TypeScript, and optimized for Nigeria timezone bakery operations with Apple-quality UX.

## 🎯 PROJECT OVERVIEW

HomeBake is a production-ready bakery management system featuring:

- **Dual Shift Operations**: 
  - Automatic shift detection for inventory (10AM-10PM Morning, 10PM-10AM Night)
  - Manual shift switching for managers/sales reps in their dashboards
- **Role-Based Architecture**: Owner, Manager, Sales Rep with distinct permissions
- **Real-Time Production**: Live batch tracking with react query
- **Mobile-First PWA**: Offline capabilities, installable, native app feel
- **Nigeria Timezone**: GMT+1 optimization with proper shift transitions
- **Production-Grade**: Error handling, retry logic, connection monitoring

## 🚀 ESSENTIAL COMMANDS

### Development
```bash
npm run dev              # Start development server on localhost:3000
npm run dev:clean        # Kill port 3000 and start fresh
npm run dev:port         # Start on port 3001
npm run generate-types   # Update TypeScript types from Supabase database
npm run update-db-types  # Alternative command for generating database types
npm run build            # Build production version
npm run start            # Start production server
npm run lint             # Run ESLint for code quality
npm run type-check       # TypeScript type checking (no emit)
npm run type-check:strict # Strict TypeScript checking
```

### Quality Assurance (ALWAYS RUN BEFORE COMMITS)
```bash
npm run type-check       # Must pass - fix all TypeScript errors
npm run lint             # Must pass - fix all linting issues
```

### Deployment
```bash
npm run predeploy        # Runs build and type-check automatically
npm run deploy           # Deploy to Vercel production
npm run deploy:staging   # Deploy to Vercel preview
```

### Maintenance
```bash
npm run clean            # Clean .next and node_modules cache
npm run reset            # Full clean and reinstall
```

## 🏗️ ARCHITECTURE & TECHNOLOGY STACK

### Core Technologies
- **Framework**: Next.js 15 with App Router (force-dynamic for auth)
- **Backend**: Supabase (PostgreSQL, Auth, Real-time subscriptions)
- **Frontend**: React 18, TypeScript 5 (strict mode)
- **Styling**: Tailwind CSS 3.4+ with Radix UI primitives
- **State Management**: TanStack React Query v5 + Context API
- **PWA**: Service worker enabled, offline-capable
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion 11
- **Icons**: Lucide React
- **Timezone**: Africa/Lagos (GMT+1) specific handling

### Project Structure
```
src/
├── app/                      # Next.js 15 App Router
│   ├── (auth)/              # Auth group: login, signup
│   ├── dashboard/           # Protected routes with role-based access
│   │   ├── owner/          # Owner-specific routes
│   │   ├── manager/        # Manager-specific routes  
│   │   ├── sales/          # Sales rep routes
│   │   └── layout.tsx      # Dashboard layout with auth checks
│   ├── api/                # API routes for server actions
│   └── owner-dashboard/    # Separate owner dashboard structure
├── components/              # Reusable React components
│   ├── ui/                 # Base UI components (shadcn/ui style)
│   ├── dashboards/         # Role-specific dashboard components
│   ├── layout/             # Layout components
│   ├── modals/             # Modal components
│   └── notifications/      # Notification components
├── lib/                    # Core utilities and configurations
│   ├── supabase/           # Supabase client/server configurations
│   ├── auth/               # Authentication utilities
│   ├── utils/              # Helper functions, timezone utilities
│   └── [feature]/          # Feature-specific server actions
├── hooks/                  # Custom React hooks
├── contexts/               # React Context providers
├── types/                  # TypeScript type definitions
└── providers/              # Global providers setup
```

## 🌟 DEVELOPMENT OBJECTIVES

Design and implement code that is:

- **Mobile-First**: Touch-optimized with 44px minimum touch targets
- **Apple-Quality UX**: Smooth, clean, intuitive interactions
- **Responsive & Accessible**: Proper ARIA labels, WCAG AA compliance
- **Real-Time**: Reactive via Supabase subscriptions
- **Type-Safe**: Strict TypeScript with database schema alignment
- **Shift-Aware**: Proper data filtering and automatic transitions
- **Production-Ready**: Error handling, retry logic, offline support

## 🛠️ DEVELOPMENT RULES & GUIDELINES

### ✅ MUST DO

1. **Use Tailwind CSS** for styling, Radix UI for accessibility, Framer Motion for animations
2. **Mobile-First Design** (320px minimum), then extend to larger screens
3. **Use Pre-configured Supabase Client** — never reinitialize
4. **Maintain Strict TypeScript** typing based on database schema
5. **Use React Query** for server state management with caching
6. **Follow Role-Based Structure** in `src/app/dashboard/{role}/`
7. **Use Correct Tables**: `batches` for live data, `all_batches` for historical
8. **Handle Shift Transitions** (10AM/10PM) with proper data migration
9. **Prioritize Modals** for user interactions
10. **Filter by Shift & Date** for all time-sensitive operations
11. **Run Quality Checks** (`type-check` and `lint`) before commits

### ❌ NEVER DO

1. **Don't use plain CSS** or unstyled components
2. **Don't hardcode shift logic** — use dynamic shift detection
3. **Don't modify .env.local** — it should be pre-configured
4. **Don't create inaccessible interfaces** (touch/screen reader issues)
5. **Don't use browser-only APIs** in server components
6. **Don't ignore foreign key relationships** in queries
7. **Don't bypass database CHECK constraints**
8. **Don't create components** without proper TypeScript interfaces
9. **Don't commit changes** without explicit user request

## 🎨 UI/UX DESIGN PRINCIPLES

### Visual Design
- **Gradient Backgrounds**: Light-cream to orange (#f97316)
- **Full Feature Visibility**: No hidden functionality, clear CTAs
- **Modal-First Interactions**: Layered modal stacks with high clarity
- **Bold Button Design**: Large, animated buttons with clear icons
- **Smooth Animations**: Framer Motion for entrance/exit transitions

### Mobile Optimization
- **Touch Targets**: Minimum 44px for all interactive elements
- **Responsive Breakpoints**: 320px, 768px, 1024px, 1200px+
- **PWA Features**: Installable, offline-capable, native app feel
- **Performance**: Code splitting, image optimization, efficient caching

### Accessibility
- **Screen Reader Support**: Proper ARIA labels and semantic markup
- **Color Contrast**: WCAG AA compliance for all text
- **Keyboard Navigation**: Full keyboard accessibility
- **Focus Management**: Clear focus indicators and logical tab order

## 🗄️ DATABASE SCHEMA & ARCHITECTURE

### Core Data Flow
```
bread_types → Define available products with pricing
batches → Track live production (cleared at shift end)
all_batches → Permanent production archive  
available_stock → Current inventory status
sales_logs → Track all sales transactions
shift_reports → End-of-shift summaries
inventory_logs → Track inventory changes
production_logs → Track production activities
activities → Log user activities
shift_handovers → Manage shift transitions
daily_low_stock_counts → Track daily low stock counts
```

### Critical Tables Schema

#### Users & Authentication
```sql
CREATE TABLE public.users (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  role text NOT NULL CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text, 'sales_rep'::text])),
  created_by uuid,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  email text,
  CONSTRAINT users_pkey PRIMARY KEY (id),
  CONSTRAINT users_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE public.profiles (
  id uuid NOT NULL,
  name text,
  role text NOT NULL CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text, 'sales_rep'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
```

#### Product Catalog
```sql
CREATE TABLE public.bread_types (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  name text NOT NULL,
  size text,
  unit_price numeric NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT bread_types_pkey PRIMARY KEY (id),
  CONSTRAINT bread_types_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
```

#### Production Tracking
```sql
CREATE TABLE public.batches (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bread_type_id uuid NOT NULL,
  batch_number character varying NOT NULL,
  start_time timestamp with time zone DEFAULT now(),
  end_time timestamp with time zone,
  actual_quantity integer DEFAULT 0,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])),
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  shift text NOT NULL DEFAULT 'morning'::text CHECK (shift = ANY (ARRAY['morning'::text, 'night'::text])),
  CONSTRAINT batches_pkey PRIMARY KEY (id),
  CONSTRAINT batches_bread_type_id_fkey FOREIGN KEY (bread_type_id) REFERENCES public.bread_types(id),
  CONSTRAINT batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

CREATE TABLE public.all_batches (
  id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  bread_type_id uuid NOT NULL,
  batch_number character varying NOT NULL,
  start_time timestamp with time zone DEFAULT now(),
  end_time timestamp with time zone,
  actual_quantity integer DEFAULT 0,
  status character varying DEFAULT 'active'::character varying CHECK (status::text = ANY (ARRAY['active'::character varying, 'completed'::character varying, 'cancelled'::character varying]::text[])),
  shift text NOT NULL CHECK (shift = ANY (ARRAY['morning'::text, 'night'::text])),
  notes text,
  created_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT all_batches_pkey PRIMARY KEY (id),
  CONSTRAINT all_batches_bread_type_id_fkey FOREIGN KEY (bread_type_id) REFERENCES public.bread_types(id),
  CONSTRAINT all_batches_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);
```

#### Inventory Management
```sql
CREATE TABLE public.available_stock (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bread_type_id uuid NOT NULL UNIQUE,
  bread_type_name text NOT NULL,
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_price numeric NOT NULL DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT available_stock_pkey PRIMARY KEY (id),
  CONSTRAINT available_stock_bread_type_id_fkey FOREIGN KEY (bread_type_id) REFERENCES public.bread_types(id)
);

CREATE TABLE public.sales_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bread_type_id uuid NOT NULL,
  quantity integer NOT NULL,
  unit_price numeric,
  discount numeric,
  returned boolean DEFAULT false,
  shift text NOT NULL,
  recorded_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  leftovers integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sales_logs_pkey PRIMARY KEY (id)
);
```

#### Activity Tracking
```sql
CREATE TABLE public.activities (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  user_name text NOT NULL,
  user_role text NOT NULL CHECK (user_role = ANY (ARRAY['manager'::text, 'sales_rep'::text])),
  activity_type text NOT NULL CHECK (activity_type = ANY (ARRAY['sale'::text, 'batch'::text, 'report'::text, 'login'::text, 'end_shift'::text, 'created'::text])),
  shift text CHECK (shift = ANY (ARRAY['morning'::text, 'night'::text])),
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT activities_pkey PRIMARY KEY (id),
  CONSTRAINT activities_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);
```

## 🕒 SHIFT MANAGEMENT SYSTEM

### Core Shift Implementation
```typescript
// Nigeria timezone shift detection (src/lib/utils/shift-utils.ts)
export const SHIFT_CONSTANTS = {
  MORNING_START_HOUR: 10, // 10:00 AM
  MORNING_END_HOUR: 22,   // 10:00 PM (22:00)
  NIGHT_START_HOUR: 22,   // 10:00 PM (22:00)
  NIGHT_END_HOUR: 10,     // 10:00 AM (next day)
  NIGERIA_TIMEZONE: 'Africa/Lagos' as const, // UTC+1
} as const;

export function getCurrentShiftInfo(): ShiftInfo {
  const nigeriaTime = new Date().toLocaleString("en-US", {
    timeZone: SHIFT_CONSTANTS.NIGERIA_TIMEZONE
  });
  const hours = new Date(nigeriaTime).getHours();
  
  const isMorningShift = hours >= SHIFT_CONSTANTS.MORNING_START_HOUR && 
                        hours < SHIFT_CONSTANTS.MORNING_END_HOUR;
  
  return {
    currentShift: isMorningShift ? 'morning' : 'night',
    // ... additional shift info
  };
}
```

### Shift-Filtered Database Queries
```typescript
// Always filter by current shift and date
const getBatchesForCurrentShift = async () => {
  const { currentShift } = getCurrentShiftInfo();
  const { startTime, endTime } = getShiftDateRange(currentShift);
  
  return supabase
    .from('batches')
    .select(`
      *,
      bread_types (name, unit_price),
      users (name)
    `)
    .eq('shift', currentShift)
    .gte('created_at', startTime)
    .lt('created_at', endTime)
    .order('created_at', { ascending: false });
};
```

## 🔧 TYPESCRIPT TYPE DEFINITIONS

### Core Database Types (src/types/database.ts)
```typescript
export interface User {
  id: string;
  name: string;
  role: 'owner' | 'manager' | 'sales_rep';
  created_by?: string;
  is_active: boolean;
  created_at: string;
  email?: string;
}

export interface BreadType {
  id: string;
  name: string;
  size?: string;
  unit_price: number;
  created_by?: string;
  created_at: string;
}

export interface Batch {
  id: string;
  bread_type_id: string;
  batch_number: string;
  start_time: string;
  end_time?: string;
  actual_quantity: number;
  status: 'active' | 'completed' | 'cancelled';
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  shift: 'morning' | 'night';
  // Relations
  bread_types?: BreadType;
  users?: Pick<User, 'name'>;
}

export interface SalesLog {
  id: string;
  bread_type_id: string;
  quantity: number;
  unit_price?: number;
  discount?: number;
  returned: boolean;
  shift: 'morning' | 'night';
  recorded_by: string;
  leftovers: number;
  created_at: string;
  updated_at: string;
  // Enhanced fields
  bread_types?: BreadType;
  total_amount?: number;
}

export interface Activity {
  id: string;
  user_id: string;
  user_name: string;
  user_role: 'manager' | 'sales_rep';
  activity_type: 'sale' | 'batch' | 'report' | 'login' | 'end_shift' | 'created';
  shift?: 'morning' | 'night';
  message: string;
  metadata: Record<string, unknown>;
  created_at: string;
}
```

## 🔐 ROLE-BASED ACCESS CONTROL

### User Roles & Permissions
- **Owner**: Full system access, user management, comprehensive reports
- **Manager**: Production management, batch control, shift oversight
- **Sales Rep**: Sales recording, inventory viewing, limited reporting

### Implementation Pattern
```typescript
// Route protection (src/app/dashboard/layout.tsx)
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerComponentClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return redirect('/login');
  }

  // Fetch role from database with fallback to metadata
  const { data: profile } = await supabase
    .from('users')
    .select('role, name')
    .eq('id', user.id)
    .single();

  const role = profile?.role || user.user_metadata?.role || 'sales_rep';
  
  // Owner uses separate layout structure
  if (role === 'owner') {
    return (
      <DataProvider>
        <ToastProvider>
          <ShiftProvider>
            {children}
          </ShiftProvider>
        </ToastProvider>
      </DataProvider>
    );
  }

  return (
    <DashboardLayoutClient user={user} role={role}>
      {children}
    </DashboardLayoutClient>
  );
}
```

## 🔄 KEY DEVELOPMENT PATTERNS

### Authentication Flow
- Server-side auth checks in layout.tsx files
- Role-based route protection with automatic redirects
- User metadata includes role and name for quick access
- Supabase RLS policies enforce data access permissions

### State Management
- **React Query**: Primary server state management with polling (15-30s intervals) and caching
- **Selective Supabase Real-time**: Only for critical features like batch updates
- **Optimistic Updates**: Immediate UI feedback with React Query mutations
- **Context API**: Global UI state (shift status, offline mode)
- **Local State**: useState/useReducer for component-specific data

### Database Operations (src/lib/supabase/client.ts)
```typescript
// Enhanced error handling and retry logic
export const withRetry = async <T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      
      if (attempt === maxRetries) break;
      
      // Exponential backoff
      await new Promise(resolve => 
        setTimeout(resolve, delay * Math.pow(2, attempt - 1))
      );
    }
  }
  
  throw lastError!;
};

export const handleSupabaseError = (error: any): string => {
  const errorCode = error.code || error.error_description || error.message;
  
  switch (errorCode) {
    case 'PGRST116': return 'No data found for this request';
    case '23505': return 'This record already exists';
    case '23503': return 'Cannot delete this record as it is being used elsewhere';
    case 'UND_ERR_CONNECT_TIMEOUT': return 'Connection timeout. Please check your internet connection.';
    default: return error.message || 'Something went wrong. Please try again.';
  }
};
```

### React Query Implementation Patterns
```typescript
// Primary data fetching with optimized polling (src/hooks/use-batches-query.ts)
export function useActiveBatches(pollingInterval = 15000, shift?: 'morning' | 'night') {
  return useQuery({
    queryKey: batchQueryKeys.active(shift),
    queryFn: async () => getActiveBatches(shift),
    refetchInterval: pollingInterval, // 15 seconds for active batches
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    staleTime: 10000, // Data considered fresh for 10 seconds
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    networkMode: 'offlineFirst', // Better UX during network issues
  });
}

// Optimistic mutations with rollback (src/hooks/use-batches-query.ts)
const createBatchMutation = useMutation({
  mutationFn: createBatch,
  onMutate: async (newBatchData) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries({ queryKey: batchQueryKeys.active(shift) });
    
    // Snapshot previous value
    const previousBatches = queryClient.getQueryData(batchQueryKeys.active(shift));
    
    // Apply optimistic update
    const optimisticBatch = {
      id: `temp-${Date.now()}`,
      ...newBatchData,
      _isOptimistic: true
    };
    
    queryClient.setQueryData(batchQueryKeys.active(shift), [optimisticBatch, ...previousBatches]);
    
    return { previousBatches, shift };
  },
  onError: (error, newBatchData, context) => {
    // Rollback on error
    if (context?.previousBatches) {
      queryClient.setQueryData(batchQueryKeys.active(context.shift), context.previousBatches);
    }
  },
  onSuccess: (createdBatch, newBatchData, context) => {
    // Replace optimistic data with real server response
    queryClient.setQueryData(batchQueryKeys.active(shift), (old: any) => {
      const filteredOld = old.filter(batch => !batch._isOptimistic);
      return [createdBatch, ...filteredOld];
    });
  }
});

// Selective real-time subscriptions (src/hooks/use-realtime-batches.ts)
export function useRealtimeBatches(options: UseRealtimeBatchesOptions = {}) {
  const queryClient = useQueryClient();
  
  // Only invalidate React Query cache when real-time events occur
  const invalidateQueries = useCallback(() => {
    if (shift) {
      queryClient.invalidateQueries({ 
        queryKey: batchQueryKeys.active(shift),
        refetchType: 'active' // Only refetch if component is mounted
      });
    }
  }, [queryClient, shift]);
  
  // Supabase subscription setup with error handling
  const channel = supabase
    .channel(`batches_realtime_${shift || 'all'}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'batches' }, 
      (payload) => {
        console.log(`📡 Real-time batch ${payload.eventType}`);
        debouncedInvalidate(); // Trigger React Query refetch
      }
    )
    .subscribe();
}
```

### Form Handling
- React Hook Form with Zod validation schemas
- Form schemas in `/lib/validations`
- Consistent error handling and loading states
- Optimistic UI updates for better UX

### Real-time Features
- **React Query with polling** for primary data management (15-30 second intervals)
- **Selective Supabase subscriptions** for critical real-time features (batches only)
- **Optimistic updates** with React Query mutations for instant UX
- **Automatic reconnection handling** for network issues
- **Offline queue** for critical operations
- **Connection status indicators** for user awareness

## 🏗️ COMPONENT ARCHITECTURE

### Component Organization
- **Client Components**: Interactive elements, hooks usage
- **Server Components**: Data fetching, initial rendering
- **Shared UI**: `/components/ui` (shadcn/ui style)
- **Role-Specific**: `/components/dashboards/[role]`
- **Layout**: `/components/layout`

### Component Standards
```typescript
interface ComponentProps {
  // Always use TypeScript interfaces
  data: SomeType;
  onAction?: (data: SomeType) => void;
  className?: string;
}

export function Component({ data, onAction, className }: ComponentProps) {
  // Implement proper loading and error states
  const [isLoading, setIsLoading] = useState(false);
  
  return (
    <motion.div
      className={cn("base-styles", className)}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      {/* Content with proper ARIA labels */}
    </motion.div>
  );
}
```

## 📊 PERFORMANCE OPTIMIZATIONS

### Core Optimizations
- **Code Splitting**: Dynamic imports for large components
- **Image Optimization**: Next.js Image component
- **Bundle Analysis**: webpack-bundle-analyzer
- **Database Indexing**: Proper indexes on frequently queried columns
- **React Query Caching**: Smart invalidation strategies
- **Service Worker**: Offline functionality and caching

### Database Best Practices
```typescript
// Always filter by shift and date for time-sensitive operations
const getShiftData = async (shift: ShiftType) => {
  const { startTime, endTime } = getShiftDateRange(shift);
  
  return supabase
    .from('sales_logs')
    .select(`
      *,
      bread_types (name, unit_price)
    `)
    .eq('shift', shift)
    .gte('created_at', startTime)
    .lt('created_at', endTime)
    .order('created_at', { ascending: false });
};

// Use JOINs to get related data in single queries
// Handle empty result sets gracefully (batches → all_batches fallback)
```

## 🧪 TESTING & QUALITY ASSURANCE

### Pre-Commit Checklist
- [ ] Mobile view looks perfect (touch targets >= 44px)
- [ ] Modals open/close smoothly with proper animations
- [ ] Shift logic filters data correctly from appropriate tables
- [ ] Real-time Supabase subscriptions working properly
- [ ] Database queries use proper JOINs and WHERE clauses
- [ ] TypeScript types match database schema exactly
- [ ] Role-based access properly implemented and tested
- [ ] No console errors or warnings in development
- [ ] Code is well-commented and properly typed
- [ ] Foreign key relationships are respected
- [ ] CHECK constraints are not violated
- [ ] `npm run type-check` passes without errors
- [ ] `npm run lint` passes without warnings

### Testing Strategy
While test files aren't currently present, the codebase is structured for:
- Component testing with React Testing Library
- API route testing with Jest
- E2E testing with Playwright
- Database testing with Supabase local development

## 🌍 ENVIRONMENT SETUP

### Required Environment Variables
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Database Migration
- Scripts located in `/database/` directory
- `supabase-migration-scripts-fixed.sql` - Main schema setup
- `02-seed-data.sql` - Sample data for development
- Always test migrations in development before production

## 🚀 TASK EXECUTION PATTERN

### When Given a Task, Always:

1. **Plan First**
```typescript
// ✅ Task: Rebuild /dashboard/inventory to match new shift logic

// Plan:
// 1. Query available_stock table for current inventory levels
// 2. Join with bread_types for product details
// 3. Filter batches by current shift using getCurrentShiftInfo()
// 4. If batches table is empty, fallback to all_batches for the day
// 5. Calculate real-time totals from production vs sales
// 6. Show unit counts per bread_type with real-time updates
// 7. Animate entries with Framer Motion
// 8. Apply gradient styling and large touch-friendly buttons

// Database Queries:
// - available_stock + bread_types JOIN
// - batches WHERE shift = currentShift AND DATE(created_at) = today
// - sales_logs WHERE shift = currentShift AND DATE(created_at) = today
```

2. **Specify File Locations**
- Always mention which files you're working in
- Reference specific database tables and columns
- Document component relationships and data flow

3. **Implement with Standards**
- Follow all guidelines above
- Run quality checks before completion
- Test mobile responsiveness and accessibility
- Provide production-standard solution
- No hardcoded dates or times

## 💬 COMMUNICATION STYLE

- **Clarity over brevity** - explain your reasoning
- **Specify database relationships** when working with queries
- **Ask questions** when logic is unclear (batch grouping, shift filtering)
- **Use descriptive logging** with console.warn for debugging
- **Reference exact file paths** when discussing implementations
- **Document data operations** with table and column specifics

## 🔍 COMMON DEVELOPMENT TASKS

### Adding New Routes
1. Create `page.tsx` in appropriate `/app` directory
2. Add role-based access control if needed
3. Implement proper loading and error states
4. Test mobile responsiveness and accessibility

### Database Changes
1. Update types in `/types/database.ts`
2. Create migration script in `/database/`
3. Update relevant server actions
4. Test with existing data and edge cases

### Adding New Components
1. Follow existing patterns in `/components/ui`
2. Use Tailwind classes with design system tokens
3. Implement proper TypeScript interfaces
4. Ensure mobile accessibility (touch targets, screen readers)
5. Add Framer Motion animations where appropriate

## 🎯 SUCCESS METRICS

HomeBake should feel like:
- **A native mobile app** with smooth interactions
- **An Apple-quality experience** with attention to detail
- **A reliable production system** that bakery staff can depend on
- **A real-time dashboard** that keeps everyone synchronized

## 🚨 CRITICAL REMINDERS

1. **NEVER MAKE ASSUMPTIONS** - Always ask or verify implementation details before proceeding
2. **Always Use TodoWrite Tool** to plan and track tasks
3. **Never Commit Without Explicit Request** from user
4. **Always Run Quality Checks** (`type-check` && `lint`) before completion
5. **Mobile-First Approach** - test on 320px minimum width
6. **Nigeria Timezone Awareness** - all dates/times in Africa/Lagos
7. **Production-Ready Code** - error handling, retry logic, offline support
8. **Ask Questions** when unsure about requirements or implementation details
9. **Verify Architecture** - This app uses React Query + selective Supabase real-time, not full real-time subscriptions

Remember: You're building the smartest, smoothest bakery app in the world. Every interaction should be delightful, every feature should be accessible, and every line of code should contribute to that world-class experience. 🍞✨