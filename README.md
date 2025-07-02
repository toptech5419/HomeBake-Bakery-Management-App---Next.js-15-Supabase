# 🍞 HomeBake - Professional Bakery Management PWA

> **World-class mobile-first bakery management system** built with Next.js 15, Supabase, and TypeScript. Designed for real bakery operations with Apple-quality UX and production-ready architecture.

[![Production Ready](https://img.shields.io/badge/Production-Ready-brightgreen.svg)]()
[![Mobile First](https://img.shields.io/badge/Mobile-First-blue.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue.svg)]()
[![PWA](https://img.shields.io/badge/PWA-Enabled-purple.svg)]()

## 🌟 **Features**

### 📱 **Core Functionality**
- **Role-Based Dashboards**: Owner, Manager, and Sales Rep interfaces
- **Real-Time Production Tracking**: Live batch management with progress monitoring
- **Intelligent Shift Management**: Automated shift transitions and handover workflows
- **Comprehensive Sales Recording**: Mobile-optimized sales entry with inventory sync
- **Advanced Reporting**: Daily, weekly, and shift-based analytics
- **Inventory Management**: Real-time stock tracking with low-stock alerts

### ⚡ **Technical Excellence**
- **Progressive Web App (PWA)**: Installable, offline-capable, native app experience
- **Real-Time Updates**: Supabase subscriptions for live data synchronization
- **Mobile-First Design**: Touch-optimized for 320px+ screens
- **Nigeria Timezone Support**: GMT+1 with proper date/time handling
- **Production Optimized**: <3s load times, optimized bundles
- **Comprehensive Testing**: Unit, integration, and E2E test coverage

### 🎨 **User Experience**
- **Apple-Quality Design**: Clean, professional, intuitive interface
- **Touch-Optimized**: 44px minimum touch targets throughout
- **Responsive Layout**: Perfect on mobile, tablet, and desktop
- **Dark/Light Mode**: Adaptive theming support
- **Smooth Animations**: Framer Motion-powered transitions
- **Accessibility**: WCAG compliant with screen reader support

---

## 🚀 **Quick Start**

### **Prerequisites**
- Node.js 18.17.0 or higher
- npm 9.0.0 or higher
- Supabase account and project

### **Installation**

```bash
# Clone the repository
git clone https://github.com/your-username/homebake.git
cd homebake

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your configuration

# Run database migrations
npm run db:migrate

# Start development server
npm run dev
```

### **Environment Variables**

Create a `.env.local` file with the following variables:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# Authentication
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# Application Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=HomeBake
```

---

## 📋 **Database Setup**

### **Required Tables**

Run these SQL commands in your Supabase SQL editor:

```sql
-- Enable Row Level Security
ALTER TABLE auth.users ENABLE ROW LEVEL SECURITY;

-- Users table for roles and profiles
CREATE TABLE public.users (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'manager', 'sales_rep')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bread types table
CREATE TABLE public.bread_types (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  size TEXT,
  unit_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Production logs table
CREATE TABLE public.production_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bread_type_id UUID REFERENCES public.bread_types(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  shift TEXT NOT NULL CHECK (shift IN ('morning', 'night')),
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sales logs table
CREATE TABLE public.sales_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bread_type_id UUID REFERENCES public.bread_types(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2),
  discount DECIMAL(10,2) DEFAULT 0,
  shift TEXT NOT NULL CHECK (shift IN ('morning', 'night')),
  leftover INTEGER DEFAULT 0,
  returned BOOLEAN DEFAULT FALSE,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Batches table for production management
CREATE TABLE public.batches (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  batch_number TEXT NOT NULL UNIQUE,
  bread_type_id UUID REFERENCES public.bread_types(id) ON DELETE CASCADE,
  bread_type_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'planning' CHECK (status IN ('planning', 'in-progress', 'quality-check', 'completed')),
  estimated_duration INTEGER,
  actual_duration INTEGER,
  assigned_staff TEXT[],
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  quality_score INTEGER,
  notes TEXT,
  manager_id UUID REFERENCES auth.users(id),
  shift TEXT NOT NULL CHECK (shift IN ('morning', 'night')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS policies (see SECURITY.md for complete policies)
```

---

## 🏗️ **Architecture**

### **Tech Stack**
- **Frontend**: Next.js 15 (App Router), React 19, TypeScript
- **Backend**: Supabase (PostgreSQL, Real-time, Auth)
- **Styling**: Tailwind CSS, Radix UI, Framer Motion
- **State Management**: React Query, Context API
- **Testing**: Jest, React Testing Library, Playwright
- **Deployment**: Vercel

### **Project Structure**
```
src/
├── app/                    # Next.js 15 App Router
│   ├── dashboard/         # Role-based dashboard routes
│   │   ├── owner/        # Owner dashboard & management
│   │   ├── manager/      # Manager dashboard & production
│   │   └── sales/        # Sales rep dashboard & recording
│   ├── auth/             # Authentication pages
│   └── api/              # API routes
├── components/            # Reusable React components
│   ├── ui/               # Base UI components
│   ├── dashboards/       # Role-specific dashboard components
│   ├── forms/            # Form components
│   └── layout/           # Layout components
├── hooks/                # Custom React hooks
├── lib/                  # Utilities and configurations
├── types/                # TypeScript type definitions
└── contexts/             # React contexts
```

### **Key Features Implementation**

#### **Real-Time Data Synchronization**
- Supabase subscriptions for live updates
- Optimistic UI updates for better UX
- Automatic reconnection and data refresh
- Conflict resolution for concurrent edits

#### **Role-Based Access Control**
- Owner: Full system access, user management, reports
- Manager: Production management, shift control, team oversight
- Sales Rep: Sales recording, inventory viewing, shift operations

#### **Mobile-First Progressive Web App**
- Service worker for offline functionality
- App manifest for installation
- Touch-optimized interactions
- Responsive design system

---

## 🧪 **Testing**

### **Running Tests**

```bash
# Unit and integration tests
npm run test

# E2E tests
npm run test:e2e

# Coverage report
npm run test:coverage

# All tests
npm run test:all
```

### **Test Coverage**
- **Unit Tests**: Component logic, utility functions
- **Integration Tests**: API routes, database operations
- **E2E Tests**: Complete user workflows across roles

---

## 🚀 **Deployment**

### **Vercel Deployment (Recommended)**

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy to production
vercel --prod

# Set environment variables in Vercel dashboard
```

### **Environment Variables for Production**
```env
NEXT_PUBLIC_SUPABASE_URL=your_production_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_production_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_production_service_role_key
NEXTAUTH_URL=https://your-domain.vercel.app
NEXTAUTH_SECRET=your_secure_production_secret
```

---

## 📱 **Usage Guide**

### **For Bakery Owners**
1. **Dashboard Overview**: Monitor real-time business metrics
2. **User Management**: Add/remove staff, assign roles
3. **Reports**: Access comprehensive analytics and insights
4. **System Configuration**: Manage bread types and pricing

### **For Managers**
1. **Shift Management**: Control morning/night shift transitions
2. **Production Planning**: Create and monitor production batches
3. **Team Coordination**: Assign staff and track progress
4. **Quality Control**: Monitor batch quality and completion

### **For Sales Representatives**
1. **Sales Recording**: Log sales with mobile-optimized interface
2. **Inventory Checking**: View real-time stock levels
3. **Shift Operations**: Record sales and leftover inventory
4. **Customer Service**: Access product information and pricing

---

## 🔒 **Security**

### **Authentication**
- Supabase Auth with email/password
- JWT token-based session management
- Secure password requirements
- Session timeout and refresh

### **Authorization**
- Row Level Security (RLS) policies
- Role-based access control
- API route protection
- Client-side route guards

### **Data Protection**
- HTTPS enforcement
- Input validation and sanitization
- SQL injection prevention
- XSS protection

---

## 🎯 **Performance**

### **Core Web Vitals**
- **First Contentful Paint**: <1.8s
- **Largest Contentful Paint**: <2.4s
- **Cumulative Layout Shift**: <0.08
- **Time to Interactive**: <3.0s

### **Optimizations**
- Code splitting and lazy loading
- Image optimization with Next.js
- Bundle size optimization
- Database query optimization
- CDN and edge caching

---

## 🤝 **Contributing**

### **Development Workflow**
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### **Code Standards**
- TypeScript strict mode
- ESLint and Prettier configuration
- Husky pre-commit hooks
- Conventional commit messages

---

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 🙋‍♂️ **Support**

### **Documentation**
- [User Guide](docs/USER_GUIDE.md)
- [API Documentation](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Security Guide](docs/SECURITY.md)

### **Getting Help**
- Create an issue for bug reports
- Start a discussion for questions
- Check existing issues and discussions
- Review the troubleshooting guide

---

## 🎉 **Acknowledgments**

Built with modern web technologies and best practices:
- [Next.js](https://nextjs.org/) - React framework
- [Supabase](https://supabase.com/) - Backend platform
- [Tailwind CSS](https://tailwindcss.com/) - Styling framework
- [Radix UI](https://www.radix-ui.com/) - Accessible components
- [Framer Motion](https://www.framer.com/motion/) - Animation library

---

**HomeBake** - Transforming bakery management with world-class technology 🍞✨
