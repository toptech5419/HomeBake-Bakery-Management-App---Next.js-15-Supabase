# CLAUDE.md - Comprehensive HomeBake Development Guide

This file provides guidance to Claude Code (claude.ai/code) when working with the **HomeBake** project — a world-class, mobile-first bakery management PWA built with **Next.js 15, Supabase, TypeScript**, and optimized for bakery operations with Apple-quality UX.

---

## 🎯 PROJECT OVERVIEW

**HomeBake** is a production-ready bakery management system with:
- **Shift-based operations in inventory page alone** (Morning: 10AM-10PM, Night: 10PM-10AM automatically)
-**shift-based operations in manager and sales rep role** (is manual mode, user switch between night and morning themselves in their dashboards not automatically)
- **Role-based dashboards** (Owner, Manager, Sales Rep)
- **Real-time production tracking** with batch management
- **Mobile-first PWA** with offline capabilities
- **Nigeria timezone optimization** (GMT+1)

---

## 🚀 ESSENTIAL COMMANDS

### Development
```bash
npm run dev          # Start development server on localhost:3000
npm run build        # Build production version
npm run start        # Start production server
npm run lint         # Run ESLint for code quality checks
npm run type-check   # Run TypeScript type checking (no emit)
```

### Quality Assurance
Always run these commands before committing changes:
```bash
npm run type-check   # Must pass - fix all TypeScript errors
npm run lint         # Must pass - fix all linting issues
```

### Deployment
```bash
npm run predeploy    # Runs build and type-check automatically
npm run deploy       # Deploy to Vercel production
npm run deploy:staging  # Deploy to Vercel preview
```

### Maintenance
```bash
npm run clean        # Clean .next and node_modules cache
```

---

## 🏗️ ARCHITECTURE & TECHNOLOGY STACK

### Core Technologies
- **Framework**: Next.js 15 with App Router
- **Backend**: Supabase (PostgreSQL, Auth, Real-time subscriptions)
- **Frontend**: React 19, TypeScript (strict mode)
- **Styling**: Tailwind CSS with Radix UI primitives
- **State Management**: React Query (@tanstack/react-query) + Context API
- **PWA**: Service worker enabled, offline-capable
- **Forms**: React Hook Form with Zod validation
- **Animations**: Framer Motion
- **Timezone**: Nigeria (GMT+1) specific handling

### Project Structure
```
src/
├── app/                    # Next.js 15 App Router
│   ├── (auth)/            # Auth group: login, signup
│   ├── dashboard/         # Protected routes with role-based access
│   │   ├── owner/        # Owner-specific routes
│   │   ├── manager/      # Manager-specific routes
│   │   ├── sales/        # Sales rep routes
│   │   └── layout.tsx    # Dashboard layout with auth checks
│   └── api/              # API routes for server actions
├── components/            # Reusable React components
│   ├── ui/               # Base UI components (shadcn/ui style)
│   ├── dashboards/       # Role-specific dashboard components
│   └── layout/           # Layout components
├── lib/                  # Core utilities and configurations
│   ├── supabase/         # Supabase client/server configurations
│   ├── auth/             # Authentication utilities
│   ├── shift-utils.ts    # Shift detection and management
│   └── utils/            # Helper functions, timezone utilities
├── hooks/                # Custom React hooks
├── contexts/             # React Context providers
├── types/                # TypeScript type definitions
└── providers/            # Global providers setup
```

---

## 🌟 DEVELOPMENT OBJECTIVES

Design and implement code that is:
- **Mobile-first and touch-optimized** (44px minimum touch targets)
- **Apple-quality UX** — smooth, clean, intuitive
- **Responsive and accessible** with proper ARIA labels
- **Real-time and reactive** via Supabase subscriptions
- **Well-structured and type-safe** with strict TypeScript
- **Shift-aware** with proper data filtering and transitions

---

## 🛠️ DEVELOPMENT RULES & GUIDELINES

### ✅ MUST DO
- Use **Tailwind CSS** for styling, **Radix UI** for accessibility, **Framer Motion** for animations
- Default to **mobile-first design** (320px minimum), then extend to larger screens
- Use **pre-configured Supabase client** — don't reinitialize
- Maintain **strict TypeScript typing** based on database schema
- Use **React Query** for server state management with caching
- Follow **role-based dashboard structure** in `src/app/dashboard/{role}/`
- Use `batches` table for live data, `all_batches` for historical/fallback
- Handle **shift transitions** (10AM/10PM) automatically with proper data migration
- Prioritize **modals and interactive forms** for user actions
- Filter all data by `shift` and `created_at` based on current shift logic
- Run **type-check** and **lint** before any commits

### ❌ NEVER DO
- Don't use plain CSS or unstyled components
- Don't hardcode shift logic — use dynamic shift detection
- Don't modify `.env.local` directly — it should be pre-configured
- Don't create inaccessible interfaces (touch/screen reader issues)
- Don't use browser-only APIs in server components
- Don't ignore foreign key relationships in queries
- Don't bypass database CHECK constraints
- Don't create components without proper TypeScript interfaces

---

## 🎨 UI/UX DESIGN PRINCIPLES

### Visual Design
- **Sleek Interface**: Soft gradient backgrounds (light-cream to orange `#f97316`)
- **Full Feature Visibility**: No hidden functionality, clear CTAs
- **Modal-First Interactions**: Layered modal stacks with high visual clarity
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

---

## 🗄️ DATABASE SCHEMA & ARCHITECTURE

### Core Data Flow
1. **`bread_types`** → Define available products with pricing
2. **`batches`** → Track live production (cleared at shift end)
3. **`all_batches`** → Permanent production archive
4. **`available_stock`** → Current inventory status
5. **`sales_logs`** → Track all sales transactions
6. **`shift_reports`** → End-of-shift summaries

### Key Tables

#### **`bread_types`** - Product Catalog
```sql
CREATE TABLE public.bread_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,                    -- "Whole Wheat", "Sourdough"
  size text,                            -- "Large", "Small", "Medium"
  unit_price numeric NOT NULL,          -- Price per unit
  created_by uuid REFERENCES users(id),
  created_at timestamp with time zone DEFAULT now()
);
```

#### **`batches`** - Live Production Tracking
```sql
CREATE TABLE public.batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bread_type_id uuid NOT NULL REFERENCES bread_types(id),
  batch_number varchar NOT NULL,        -- "BATCH-001", "WW-MORNING-01"
  start_time timestamptz DEFAULT now(),
  end_time timestamptz,
  actual_quantity integer DEFAULT 0,
  status varchar DEFAULT 'active'       -- 'active', 'completed', 'cancelled'
    CHECK (status IN ('active', 'completed', 'cancelled')),
  shift text NOT NULL DEFAULT 'morning' -- 'morning', 'night'
    CHECK (shift IN ('morning', 'night')),
  notes text,
  created_by uuid NOT NULL REFERENCES users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### **`available_stock`** - Current Inventory
```sql
CREATE TABLE public.available_stock (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bread_type_id uuid NOT NULL UNIQUE REFERENCES bread_types(id),
  bread_type_name text NOT NULL,        -- Denormalized for quick access
  quantity integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  unit_price numeric NOT NULL DEFAULT 0,
  last_updated timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### **`sales_logs`** - Transaction Records
```sql
CREATE TABLE public.sales_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bread_type_id uuid NOT NULL REFERENCES bread_types(id),
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric,                   -- Price at time of sale
  discount numeric,                     -- Applied discount
  returned boolean DEFAULT false,       -- If sale was returned
  shift text NOT NULL CHECK (shift IN ('morning', 'night')),
  recorded_by uuid NOT NULL REFERENCES users(id),
  leftovers integer DEFAULT 0,          -- Remaining unsold quantity
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

#### **`users`** - Application Users with RBAC
```sql
CREATE TABLE public.users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text,
  role text NOT NULL CHECK (role IN ('owner', 'manager', 'sales_rep')),
  created_by uuid REFERENCES users(id),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

#### **`shift_reports`** - Comprehensive Summaries
```sql
CREATE TABLE public.shift_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id),
  shift text NOT NULL CHECK (shift IN ('morning', 'night')),
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  total_revenue numeric NOT NULL DEFAULT 0,
  total_items_sold integer NOT NULL DEFAULT 0,
  total_remaining integer NOT NULL DEFAULT 0,
  feedback text,
  sales_data jsonb NOT NULL DEFAULT '[]',
  remaining_breads jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### Database Relationships
```
users (1) → (∞) batches [created_by]
users (1) → (∞) sales_logs [recorded_by]
bread_types (1) → (∞) batches [bread_type_id]
bread_types (1) → (1) available_stock [bread_type_id]
bread_types (1) → (∞) sales_logs [bread_type_id]
users (1) → (∞) shift_reports [user_id]
```

---

## 🕒 SHIFT MANAGEMENT SYSTEM

### Shift Logic Implementation
```typescript
// Core shift detection
const getCurrentShift = (): 'morning' | 'night' => {
  const now = new Date();
  const currentHour = now.getHours();
  return currentHour >= 10 && currentHour < 22 ? 'morning' : 'night';
};

// Shift-filtered queries
const getBatchesForCurrentShift = async () => {
  const currentShift = getCurrentShift();
  const today = new Date().toISOString().split('T')[0];
  
  return supabase
    .from('batches')
    .select(`
      *,
      bread_types (name, unit_price),
      users (name)
    `)
    .eq('shift', currentShift)
    .gte('created_at', `${today}T00:00:00`)
    .order('created_at', { ascending: false });
};

// Shift transition handling
const migrateToAllBatches = async () => {
  // Move completed batches from batches → all_batches
  // Clear batches table for new shift
  // Update available_stock based on production
};
```

### Nigeria Timezone Handling (GMT+1)
- All timestamps converted to Nigeria timezone for display
- Shift calculations based on local time
- Date utilities in `/lib/utils/timezone.ts` handle conversions
- Proper handling of shift transitions across dates

---

## 🔧 TYPESCRIPT TYPE DEFINITIONS

### Core Database Types
```typescript
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
  shift: 'morning' | 'night';
  notes?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
  // Relations
  bread_types?: BreadType;
  users?: Pick<User, 'name'>;
}

export interface AvailableStock {
  id: string;
  bread_type_id: string;
  bread_type_name: string;
  quantity: number;
  unit_price: number;
  last_updated: string;
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
}

export interface User {
  id: string;
  name: string;
  email?: string;
  role: 'owner' | 'manager' | 'sales_rep';
  created_by?: string;
  is_active: boolean;
  created_at: string;
}

export interface ShiftReport {
  id: string;
  user_id: string;
  shift: 'morning' | 'night';
  report_date: string;
  total_revenue: number;
  total_items_sold: number;
  total_remaining: number;
  feedback?: string;
  sales_data: any[];
  remaining_breads: any[];
  created_at: string;
  updated_at: string;
}
```

---

## 🔐 ROLE-BASED ACCESS CONTROL

### User Roles & Permissions
- **Owner**: Full system access, user management, comprehensive reports
- **Manager**: Production management, batch control, shift oversight  
- **Sales Rep**: Sales recording, inventory viewing, limited reporting

### Implementation Pattern
```typescript
// Route protection
const checkUserRole = (userRole: string, requiredRoles: string[]) => {
  return requiredRoles.includes(userRole);
};

// Component access control
const RoleGate = ({ children, allowedRoles, userRole }) => {
  if (!checkUserRole(userRole, allowedRoles)) {
    return <UnauthorizedMessage />;
  }
  return children;
};
```

---

## 🔄 KEY DEVELOPMENT PATTERNS

### Authentication Flow
- Server-side auth checks in layout.tsx files
- Role-based route protection with automatic redirects
- User metadata includes role and name for quick access
- Supabase RLS policies enforce data access permissions

### State Management
- **React Query** for server state with automatic caching and invalidation
- **Context API** for global UI state (shift status, offline mode)
- **Local state** with useState/useReducer for component-specific data
- **Optimistic updates** for better UX during mutations

### Database Operations
- Always use server actions in `/lib` directories
- Implement proper error handling with `handleSupabaseError`
- Use retry logic with `withRetry` for network resilience
- All mutations should have optimistic updates where appropriate
- Always filter by shift and date for time-sensitive operations

### Form Handling
- **React Hook Form** with Zod validation schemas
- Form schemas defined in `/lib/validations`
- Consistent error handling and loading states
- Optimistic UI updates for better UX

### Real-time Features
- **Supabase subscriptions** for live data updates
- Automatic reconnection handling for network issues
- Offline queue for critical operations
- Connection status indicators for user awareness

---

## 🏗️ COMPONENT ARCHITECTURE

### Component Organization
- **Client components** for interactivity, **server components** for data fetching
- **Shared UI components** in `/components/ui` (shadcn/ui style)
- **Role-specific components** in `/components/dashboards/[role]`
- **Layout components** in `/components/layout`

### Component Standards
- Always use TypeScript interfaces for props
- Implement proper loading and error states
- Follow mobile-first responsive design
- Include proper ARIA labels and semantic markup
- Use Framer Motion for animations and transitions

---

## 📊 PERFORMANCE OPTIMIZATIONS

### Core Optimizations
- **Code splitting** with dynamic imports
- **Image optimization** with Next.js Image component
- **Bundle analysis** with webpack-bundle-analyzer
- **Database query optimization** with proper indexing
- **React Query caching strategies** with smart invalidation
- **Service worker** for offline functionality and caching

### Database Best Practices
1. **Always filter by shift and date** for time-sensitive operations
2. **Use JOINs** to get related data in single queries
3. **Implement proper error handling** for all database operations
4. **Use Supabase RLS policies** for security enforcement
5. **Subscribe to real-time changes** for live data updates
6. **Handle empty result sets gracefully** (batches → all_batches fallback)

---

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
- **Component testing** with React Testing Library
- **API route testing** with Jest
- **E2E testing** with Playwright
- **Database testing** with Supabase local development

---

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

---

## 🚀 TASK EXECUTION PATTERN

### When Given a Task, Always:

1. **Describe Your Plan First**
```typescript
// ✅ Task: Rebuild /dashboard/inventory to match new shift logic

// Plan:
// 1. Query available_stock table for current inventory levels
// 2. Join with bread_types for product details
// 3. Filter batches by current shift using getCurrentShift()
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
   - provide a production standard your best recommended solution
   - no hardcoded dates or time

---

## 💬 COMMUNICATION STYLE

- **Prefer clarity over brevity** - explain your reasoning
- **Specify database relationships** when working with queries
- **Ask questions** when logic is unclear (batch grouping, shift filtering)
- **Use descriptive logging** with `console.warn` for debugging
- **Reference exact file paths** when discussing implementations
- **Document data operations** with table and column specifics

---

## 🔍 COMMON DEVELOPMENT TASKS

### Adding New Routes
1. Create page.tsx in appropriate `/app` directory
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

---

## 🎯 SUCCESS METRICS

**HomeBake** should feel like:
- A **native mobile app** with smooth interactions
- An **Apple-quality experience** with attention to detail
- A **reliable production system** that bakery staff can depend on
- A **real-time dashboard** that keeps everyone synchronized

Remember: You're building the **smartest, smoothest bakery app in the world**. Every interaction should be delightful, every feature should be accessible, and every line of code should contribute to that world-class experience. 🍞✨