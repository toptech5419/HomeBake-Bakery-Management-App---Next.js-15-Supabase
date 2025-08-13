CLAUDE.md - Comprehensive HomeBake Development Guide
This file provides guidance to Claude Code (claude.ai/code) when working with the HomeBake project — a world-class, mobile-first bakery management PWA built with Next.js 15, Supabase, TypeScript, and optimized for bakery operations with Apple-quality UX.

🎯 PROJECT OVERVIEW
HomeBake is a production-ready bakery management system with:

Shift-based operations in inventory page alone (Morning: 10AM-10PM, Night: 10PM-10AM automatically)
Shift-based operations in manager and sales rep role (is manual mode, user switch between night and morning themselves in their dashboards not automatically)
Role-based dashboards (Owner, Manager, Sales Rep)
Real-time production tracking with batch management
Mobile-first PWA with offline capabilities
Nigeria timezone optimization (GMT+1)


🚀 ESSENTIAL COMMANDS
Development
npm run dev          # Start development server on localhost:3000
npm run build        # Build production version
npm run start        # Start production server
npm run lint         # Run ESLint for code quality checks
npm run type-check   # Run TypeScript type checking (no emit)

Quality Assurance
Always run these commands before committing changes:
npm run type-check   # Must pass - fix all TypeScript errors
npm run lint         # Must pass - fix all linting issues

Deployment
npm run predeploy    # Runs build and type-check automatically
npm run deploy       # Deploy to Vercel production
npm run deploy:staging  # Deploy to Vercel preview

Maintenance
npm run clean        # Clean .next and node_modules cache


🏗️ ARCHITECTURE & TECHNOLOGY STACK
Core Technologies

Framework: Next.js 15 with App Router
Backend: Supabase (PostgreSQL, Auth, Real-time subscriptions)
Frontend: React 19, TypeScript (strict mode)
Styling: Tailwind CSS with Radix UI primitives
State Management: React Query (@tanstack/react-query) + Context API
PWA: Service worker enabled, offline-capable
Forms: React Hook Form with Zod validation
Animations: Framer Motion
Timezone: Nigeria (GMT+1) specific handling

Project Structure
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


🌟 DEVELOPMENT OBJECTIVES
Design and implement code that is:

Mobile-first and touch-optimized (44px minimum touch targets)
Apple-quality UX — smooth, clean, intuitive
Responsive and accessible with proper ARIA labels
Real-time and reactive via Supabase subscriptions
Well-structured and type-safe with strict TypeScript
Shift-aware with proper data filtering and transitions


🛠️ DEVELOPMENT RULES & GUIDELINES
✅ MUST DO

Use Tailwind CSS for styling, Radix UI for accessibility, Framer Motion for animations
Default to mobile-first design (320px minimum), then extend to larger screens
Use pre-configured Supabase client — don't reinitialize
Maintain strict TypeScript typing based on database schema
Use React Query for server state management with caching
Follow role-based dashboard structure in src/app/dashboard/{role}/
Use batches table for live data, all_batches for historical/fallback
Handle shift transitions (10AM/10PM) automatically with proper data migration
Prioritize modals and interactive forms for user actions
Filter all data by shift and created_at based on current shift logic
Run type-check and lint before any commit

❌ NEVER DO

Don't use plain CSS or unstyled components
Don't hardcode shift logic — use dynamic shift detection
Don't modify .env.local directly — it should be pre-configured
Don't create inaccessible interfaces (touch/screen reader issues)
Don't use browser-only APIs in server components
Don't ignore foreign key relationships in queries
Don't bypass database CHECK constraints
Don't create components without proper TypeScript interfaces


🎨 UI/UX DESIGN PRINCIPLES
Visual Design

Sleek Interface: Soft gradient backgrounds (light-cream to orange #f97316)
Full Feature Visibility: No hidden functionality, clear CTAs
Modal-First Interactions: Layered modal stacks with high visual clarity
Bold Button Design: Large, animated buttons with clear icons
Smooth Animations: Framer Motion for entrance/exit transitions

Mobile Optimization

Touch Targets: Minimum 44px for all interactive elements
Responsive Breakpoints: 320px, 768px, 1024px, 1200px+
PWA Features: Installable, offline-capable, native app feel
Performance: Code splitting, image optimization, efficient caching

Accessibility

Screen Reader Support: Proper ARIA labels and semantic markup
Color Contrast: WCAG AA compliance for all text
Keyboard Navigation: Full keyboard accessibility
Focus Management: Clear focus indicators and logical tab order


🗄️ DATABASE SCHEMA & ARCHITECTURE
Core Data Flow

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

Key Tables
activities - User Activity Logs
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

all_batches - Historical Production Archive
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

available_stock - Current Inventory
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

batches - Live Production Tracking
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

bread_types - Product Catalog
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

daily_low_stock_counts - Daily Low Stock Counts
CREATE TABLE public.daily_low_stock_counts (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  count_date date NOT NULL DEFAULT CURRENT_DATE UNIQUE,
  morning_shift_count integer NOT NULL DEFAULT 0 CHECK (morning_shift_count >= 0),
  night_shift_count integer NOT NULL DEFAULT 0 CHECK (night_shift_count >= 0),
  total_count integer DEFAULT (morning_shift_count + night_shift_count),
  last_updated_morning timestamp with time zone,
  last_updated_night timestamp with time zone,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT daily_low_stock_counts_pkey PRIMARY KEY (id)
);

inventory - Inventory Status
CREATE TABLE public.inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bread_type_id uuid NOT NULL UNIQUE,
  quantity integer NOT NULL DEFAULT 0,
  last_updated timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_pkey PRIMARY KEY (id)
);

inventory_logs - Inventory Change Logs
CREATE TABLE public.inventory_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bread_type_id uuid NOT NULL,
  quantity_change integer NOT NULL,
  reason text NOT NULL,
  user_id uuid NOT NULL,
  shift text CHECK (shift = ANY (ARRAY['morning'::text, 'night'::text])),
  reference_id uuid,
  notes text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT inventory_logs_pkey PRIMARY KEY (id),
  CONSTRAINT inventory_logs_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

production_logs - Production Records
CREATE TABLE public.production_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bread_type_id uuid NOT NULL,
  quantity integer NOT NULL,
  shift text NOT NULL CHECK (shift = ANY (ARRAY['morning'::text, 'night'::text])),
  recorded_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  unit_price numeric DEFAULT 0.00,
  CONSTRAINT production_logs_pkey PRIMARY KEY (id),
  CONSTRAINT production_logs_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id),
  CONSTRAINT production_logs_bread_type_id_fkey FOREIGN KEY (bread_type_id) REFERENCES public.bread_types(id)
);

profiles - User Profiles
CREATE TABLE public.profiles (
  id uuid NOT NULL,
  name text,
  role text NOT NULL CHECK (role = ANY (ARRAY['owner'::text, 'manager'::text, 'sales_rep'::text])),
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT profiles_pkey PRIMARY KEY (id),
  CONSTRAINT profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);

push_notification_preferences - Notification Settings
CREATE TABLE public.push_notification_preferences (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  enabled boolean NOT NULL DEFAULT true,
  endpoint text,
  p256dh_key text,
  auth_key text,
  user_agent text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT push_notification_preferences_pkey PRIMARY KEY (id),
  CONSTRAINT push_notification_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

qr_invites - Invitation Tokens
CREATE TABLE public.qr_invites (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  token text NOT NULL UNIQUE,
  role text NOT NULL CHECK (role = ANY (ARRAY['manager'::text, 'sales_rep'::text])),
  is_used boolean DEFAULT false,
  expires_at timestamp with time zone NOT NULL,
  created_by uuid,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT qr_invites_pkey PRIMARY KEY (id),
  CONSTRAINT qr_invites_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id)
);

remaining_bread - Leftover Inventory
CREATE TABLE public.remaining_bread (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  shift text NOT NULL CHECK (shift = ANY (ARRAY['morning'::text, 'night'::text])),
  bread_type text NOT NULL,
  bread_type_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  recorded_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()),
  unit_price numeric NOT NULL DEFAULT 0,
  total_value numeric DEFAULT ((quantity)::numeric * unit_price),
  record_date date NOT NULL DEFAULT CURRENT_DATE,
  CONSTRAINT remaining_bread_pkey PRIMARY KEY (id),
  CONSTRAINT remaining_bread_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES auth.users(id),
  CONSTRAINT remaining_bread_bread_type_id_fkey FOREIGN KEY (bread_type_id) REFERENCES public.bread_types(id)
);

sales_logs - Transaction Records
CREATE TABLE public.sales_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  bread_type_id uuid NOT NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric,
  discount numeric,
  returned boolean DEFAULT false,
  shift text NOT NULL CHECK (shift = ANY (ARRAY['morning'::text, 'night'::text])),
  recorded_by uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  leftovers integer DEFAULT 0,
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sales_logs_pkey PRIMARY KEY (id),
  CONSTRAINT sales_logs_bread_type_id_fkey FOREIGN KEY (bread_type_id) REFERENCES public.bread_types(id),
  CONSTRAINT sales_logs_recorded_by_fkey FOREIGN KEY (recorded_by) REFERENCES public.users(id)
);

sessions - User Sessions
CREATE TABLE public.sessions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamp with time zone NOT NULL,
  CONSTRAINT sessions_pkey PRIMARY KEY (id),
  CONSTRAINT sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

shift_feedback - Shift Feedback
CREATE TABLE public.shift_feedback (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shift text NOT NULL CHECK (shift = ANY (ARRAY['morning'::text, 'night'::text])),
  note text,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shift_feedback_pkey PRIMARY KEY (id),
  CONSTRAINT shift_feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

shift_handovers - Shift Transition Records
CREATE TABLE public.shift_handovers (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  from_shift text NOT NULL CHECK (from_shift = ANY (ARRAY['morning'::text, 'night'::text])),
  to_shift text NOT NULL CHECK (to_shift = ANY (ARRAY['morning'::text, 'night'::text])),
  handover_date date NOT NULL DEFAULT CURRENT_DATE,
  manager_id uuid NOT NULL,
  notes text,
  total_production integer DEFAULT 0,
  completed_batches integer DEFAULT 0,
  pending_batches integer DEFAULT 0,
  quality_issues ARRAY,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shift_handovers_pkey PRIMARY KEY (id),
  CONSTRAINT shift_handovers_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.users(id)
);

shift_reports - Comprehensive Summaries
CREATE TABLE public.shift_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shift text NOT NULL CHECK (shift = ANY (ARRAY['morning'::text, 'night'::text])),
  report_date date NOT NULL DEFAULT CURRENT_DATE,
  total_revenue numeric NOT NULL DEFAULT 0 CHECK (total_revenue >= 0::numeric),
  total_items_sold integer NOT NULL DEFAULT 0 CHECK (total_items_sold >= 0),
  total_remaining integer NOT NULL DEFAULT 0 CHECK (total_remaining >= 0),
  feedback text,
  sales_data jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(sales_data) = 'array'::text),
  remaining_breads jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(remaining_breads) = 'array'::text),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT shift_reports_pkey PRIMARY KEY (id),
  CONSTRAINT shift_reports_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id)
);

users - Application Users with RBAC
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

Database Relationships
users (1) → (∞) activities [user_id]
users (1) → (∞) all_batches [created_by]
bread_types (1) → (∞) all_batches [bread_type_id]
bread_types (1) → (∞) batches [bread_type_id]
users (1) → (∞) batches [created_by]
bread_types (1) → (1) available_stock [bread_type_id]
bread_types (1) → (1) inventory [bread_type_id]
bread_types (1) → (∞) inventory_logs [bread_type_id]
users (1) → (∞) inventory_logs [user_id]
bread_types (1) → (∞) production_logs [bread_type_id]
users (1) → (∞) production_logs [recorded_by]
auth.users (1) → (1) profiles [id]
users (1) → (1) push_notification_preferences [user_id]
users (1) → (∞) qr_invites [created_by]
bread_types (1) → (∞) remaining_bread [bread_type_id]
auth.users (1) → (∞) remaining_bread [recorded_by]
bread_types (1) → (∞) sales_logs [bread_type_id]
users (1) → (∞) sales_logs [recorded_by]
users (1) → (∞) sessions [user_id]
users (1) → (∞) shift_feedback [user_id]
users (1) → (∞) shift_handovers [manager_id]
users (1) → (∞) shift_reports [user_id]


🕒 SHIFT MANAGEMENT SYSTEM
Shift Logic Implementation
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

Nigeria Timezone Handling (GMT+1)

All timestamps converted to Nigeria timezone for display
Shift calculations based on local time
Date utilities in /lib/utils/timezone.ts handle conversions
Proper handling of shift transitions across dates


🔧 TYPESCRIPT TYPE DEFINITIONS
Core Database Types
export interface Activity {
  id: string;
  user_id: string;
  user_name: string;
  user_role: 'manager' | 'sales_rep';
  activity_type: 'sale' | 'batch' | 'report' | 'login' | 'end_shift' | 'created';
  shift?: 'morning' | 'night';
  message: string;
  metadata: any;
  created_at: string;
}

export interface AllBatch {
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
}

export interface AvailableStock {
  id: string;
  bread_type_id: string;
  bread_type_name: string;
  quantity: number;
  unit_price: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
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

export interface BreadType {
  id: string;
  name: string;
  size?: string;
  unit_price: number;
  created_by?: string;
  created_at: string;
}

export interface DailyLowStockCount {
  id: string;
  count_date: string;
  morning_shift_count: number;
  night_shift_count: number;
  total_count: number;
  last_updated_morning?: string;
  last_updated_night?: string;
  created_at: string;
  updated_at: string;
}

export interface Inventory {
  id: string;
  bread_type_id: string;
  quantity: number;
  last_updated: string;
}

export interface InventoryLog {
  id: string;
  bread_type_id: string;
  quantity_change: number;
  reason: string;
  user_id: string;
  shift?: 'morning' | 'night';
  reference_id?: string;
  notes?: string;
  created_at: string;
}

export interface ProductionLog {
  id: string;
  bread_type_id: string;
  quantity: number;
  shift: 'morning' | 'night';
  recorded_by: string;
  created_at: string;
  updated_at: string;
  unit_price: number;
}

export interface Profile {
  id: string;
  name?: string;
  role: 'owner' | 'manager' | 'sales_rep';
  is_active: boolean;
  created_at: string;
}

export interface PushNotificationPreference {
  id: string;
  user_id: string;
  enabled: boolean;
  endpoint?: string;
  p256dh_key?: string;
  auth_key?: string;
  user_agent?: string;
  created_at: string;
  updated_at: string;
}

export interface QrInvite {
  id: string;
  token: string;
  role: 'manager' | 'sales_rep';
  is_used: boolean;
  expires_at: string;
  created_by?: string;
  created_at: string;
}

export interface RemainingBread {
  id: string;
  shift: 'morning' | 'night';
  bread_type: string;
  bread_type_id: string;
  quantity: number;
  recorded_by: string;
  created_at: string;
  updated_at: string;
  unit_price: number;
  total_value: number;
  record_date: string;
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

export interface Session {
  id: string;
  user_id: string;
  token: string;
  expires_at: string;
}

export interface ShiftFeedback {
  id: string;
  user_id: string;
  shift: 'morning' | 'night';
  note?: string;
  created_at: string;
}

export interface ShiftHandover {
  id: string;
  from_shift: 'morning' | 'night';
  to_shift: 'morning' | 'night';
  handover_date: string;
  manager_id: string;
  notes?: string;
  total_production: number;
  completed_batches: number;
  pending_batches: number;
  quality_issues: any[];
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

export interface User {
  id: string;
  name: string;
  role: 'owner' | 'manager' | 'sales_rep';
  created_by?: string;
  is_active: boolean;
  created_at: string;
  email?: string;
}


🔐 ROLE-BASED ACCESS CONTROL
User Roles & Permissions

Owner: Full system access, user management, comprehensive reports
Manager: Production management, batch control, shift oversight  
Sales Rep: Sales recording, inventory viewing, limited reporting

Implementation Pattern
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


🔄 KEY DEVELOPMENT PATTERNS
Authentication Flow

Server-side auth checks in layout.tsx files
Role-based route protection with automatic redirects
User metadata includes role and name for quick access
Supabase RLS policies enforce data access permissions

State Management

React Query for server state with automatic caching and invalidation
Context API for global UI state (shift status, offline mode)
Local state with useState/useReducer for component-specific data
Optimistic updates for better UX during mutations

Database Operations

Always use server actions in /lib directories
Implement proper error handling with handleSupabaseError
Use retry logic with withRetry for network resilience
All mutations should have optimistic updates where appropriate
Always filter by shift and date for time-sensitive operations

Form Handling

React Hook Form with Zod validation schemas
Form schemas defined in /lib/validations
Consistent error handling and loading states
Optimistic UI updates for better UX

Real-time Features

Supabase subscriptions for live data updates
Automatic reconnection handling for network issues
Offline queue for critical operations
Connection status indicators for user awareness


🏗️ COMPONENT ARCHITECTURE
Component Organization

Client components for interactivity, server components for data fetching
Shared UI components in /components/ui (shadcn/ui style)
Role-specific components in /components/dashboards/[role]
Layout components in /components/layout

Component Standards

Always use TypeScript interfaces for props
Implement proper loading and error states
Follow mobile-first responsive design
Include proper ARIA labels and semantic markup
Use Framer Motion for animations and transitions


📊 PERFORMANCE OPTIMIZATIONS
Core Optimizations

Code splitting with dynamic imports
Image optimization with Next.js Image component
Bundle analysis with webpack-bundle-analyzer
Database query optimization with proper indexing
React Query caching strategies with smart invalidation
Service worker for offline functionality and caching

Database Best Practices

Always filter by shift and date for time-sensitive operations
Use JOINs to get related data in single queries
Implement proper error handling for all database operations
Use Supabase RLS policies for security enforcement
Subscribe to real-time changes for live data updates
Handle empty result sets gracefully (batches → all_batches fallback)


🧪 TESTING & QUALITY ASSURANCE
Pre-Commit Checklist

 Mobile view looks perfect (touch targets >= 44px)
 Modals open/close smoothly with proper animations
 Shift logic filters data correctly from appropriate tables
 Real-time Supabase subscriptions working properly
 Database queries use proper JOINs and WHERE clauses
 TypeScript types match database schema exactly
 Role-based access properly implemented and tested
 No console errors or warnings in development
 Code is well-commented and properly typed
 Foreign key relationships are respected
 CHECK constraints are not violated
 npm run type-check passes without errors
 npm run lint passes without warnings

Testing Strategy
While test files aren't currently present, the codebase is structured for:

Component testing with React Testing Library
API route testing with Jest
E2E testing with Playwright
Database testing with Supabase local development


🌍 ENVIRONMENT SETUP
Required Environment Variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000

Database Migration

Scripts located in /database/ directory
supabase-migration-scripts-fixed.sql - Main schema setup
02-seed-data.sql - Sample data for development
Always test migrations in development before production


🚀 TASK EXECUTION PATTERN
When Given a Task, Always:

Describe Your Plan First

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


Specify File Locations

Always mention which files you're working in
Reference specific database tables and columns
Document component relationships and data flow


Implement with Standards

Follow all guidelines above
Run quality checks before completion
Test mobile responsiveness and accessibility
provide a production standard your best recommended solution
no hardcoded dates or time




💬 COMMUNICATION STYLE

Prefer clarity over brevity - explain your reasoning
Specify database relationships when working with queries
Ask questions when logic is unclear (batch grouping, shift filtering)
Use descriptive logging with console.warn for debugging
Reference exact file paths when discussing implementations
Document data operations with table and column specifics


🔍 COMMON DEVELOPMENT TASKS
Adding New Routes

Create page.tsx in appropriate /app directory
Add role-based access control if needed
Implement proper loading and error states
Test mobile responsiveness and accessibility

Database Changes

Update types in /types/database.ts
Create migration script in /database/
Update relevant server actions
Test with existing data and edge cases

Adding New Components

Follow existing patterns in /components/ui
Use Tailwind classes with design system tokens
Implement proper TypeScript interfaces
Ensure mobile accessibility (touch targets, screen readers)
Add Framer Motion animations where appropriate


🎯 SUCCESS METRICS
HomeBake should feel like:

A native mobile app with smooth interactions
An Apple-quality experience with attention to detail
A reliable production system that bakery staff can depend on
A real-time dashboard that keeps everyone synchronized

Remember: You're building the smartest, smoothest bakery app in the world. Every interaction should be delightful, every feature should be accessible, and every line of code should contribute to that world-class experience. 🍞✨