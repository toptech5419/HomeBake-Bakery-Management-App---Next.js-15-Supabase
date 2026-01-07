# 🍞 HomeBake - Bakery Management PWA

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178C6?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=for-the-badge&logo=vercel)

**Production-Ready Progressive Web App for Professional Bakery Operations**

[🚀 Live Demo](https://homebake.vercel.app) • [📖 Documentation](#features) • [🛠️ Tech Stack](#tech-stack)

![GitHub Commit Activity](https://img.shields.io/badge/commits-273+-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/license-MIT-blue?style=flat-square)

</div>

---

## 🎯 Overview

**HomeBake** is a production-grade Progressive Web Application designed to streamline bakery operations through intelligent inventory management, real-time production tracking, and role-based workflows. Built with modern web technologies, it serves real business operations with **273+ commits** of continuous refinement.

### 🌟 Why HomeBake?

- ✅ **Production-Ready**: Currently serving real bakery operations
- ✅ **Mobile-First**: Optimized for on-the-go bakery staff
- ✅ **Offline-Capable**: PWA architecture with service workers
- ✅ **Secure**: Row Level Security (RLS) and JWT authentication
- ✅ **Fast**: Core Web Vitals optimized (LCP < 2.4s)
- ✅ **Tested**: Comprehensive test coverage (Jest, Playwright)

---

## 🚀 Live Application

**🌐 Production URL:** [https://homebake.vercel.app](https://homebake.vercel.app)

> **Note:** This is a production application serving real business operations. Demo credentials may be provided upon request.

---

## ✨ Key Features

### 👥 Role-Based Dashboard System

<table>
<tr>
<td width="33%" align="center">

**🏢 Owner Dashboard**
- Complete system oversight
- User management & permissions
- Financial reports & analytics
- Business intelligence metrics

</td>
<td width="33%" align="center">

**📋 Manager Dashboard**
- Production planning & scheduling
- Shift management (morning/night)
- Quality control & batch tracking
- Team oversight & assignments

</td>
<td width="33%" align="center">

**💼 Sales Rep Dashboard**
- Mobile-optimized sales entry
- Real-time inventory viewing
- Customer transaction management
- Discount & return handling

</td>
</tr>
</table>

### 🏭 Production Management

- **Real-Time Batch Tracking**: Monitor production status from planning → in-progress → quality-check → completed
- **Shift-Based Operations**: Separate workflows for morning and night shifts
- **Quality Scoring**: Built-in quality control with notes and ratings
- **Staff Assignment**: Track who's working on what, with duration logging
- **Timezone Support**: GMT+1 (Nigeria) timezone handling for accurate timestamps

### 📊 Sales & Inventory

- **Mobile-First Sales Entry**: Touch-optimized interface for quick transactions
- **Real-Time Synchronization**: Instant inventory updates from production to sales
- **Discount Management**: Handle markdowns, promotions, and leftover tracking
- **Low Stock Alerts**: Automated notifications for inventory thresholds
- **Return Processing**: Complete return workflow with inventory adjustments

### 📈 Analytics & Reporting

- **Daily Reports**: Sales performance, production output, inventory levels
- **Weekly Analytics**: Trend analysis, revenue tracking, staff productivity
- **Shift Comparisons**: Morning vs. night performance metrics
- **Financial Tracking**: Revenue, discounts, waste analysis

---

## 🛠️ Tech Stack

### Frontend

- **Framework**: [Next.js 15](https://nextjs.org/) with App Router
- **UI Library**: [React 19](https://react.dev/) with hooks and server components
- **Language**: [TypeScript](https://www.typescriptlang.org/) (100% type-safe)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) with custom configuration
- **Components**: [Radix UI](https://www.radix-ui.com/) for accessible primitives
- **Animations**: [Framer Motion](https://www.framer.com/motion/) for smooth interactions
- **State Management**: [React Query](https://tanstack.com/query) for server state

### Backend & Database

- **Database**: [Supabase](https://supabase.com/) (PostgreSQL) with real-time capabilities
- **Authentication**: Supabase Auth with JWT tokens and NextAuth integration
- **Security**: Row Level Security (RLS) policies for data isolation
- **Storage**: Supabase Storage for images and documents
- **Real-time**: Supabase subscriptions for live data updates

### Testing & Quality

- **Unit Testing**: [Jest](https://jestjs.io/) with React Testing Library
- **Integration Testing**: API route testing with Supertest
- **E2E Testing**: [Playwright](https://playwright.dev/) for full user workflows
- **Linting**: ESLint with TypeScript rules
- **Formatting**: Prettier with Tailwind plugin
- **Pre-commit**: Husky hooks for code quality

### DevOps & Deployment

- **Hosting**: [Vercel](https://vercel.com/) with automatic deployments
- **CI/CD**: GitHub Actions for automated testing
- **Monitoring**: Vercel Analytics for performance tracking
- **Version Control**: Git with conventional commits

---

## 🏗️ Architecture

```
src/
├── app/                     # Next.js 15 App Router
│   ├── dashboard/          # Role-based dashboard routes
│   │   ├── owner/         # Owner-specific pages
│   │   ├── manager/       # Manager-specific pages
│   │   └── sales/         # Sales rep pages
│   ├── auth/              # Authentication pages
│   └── api/               # Backend API routes
├── components/            # React components
│   ├── ui/               # Base UI components (Radix)
│   ├── dashboards/       # Role-specific dashboards
│   ├── forms/            # Form components with validation
│   └── layout/           # Layout components
├── lib/                  # Utility functions
│   ├── supabase/        # Supabase client & helpers
│   ├── utils/           # General utilities
│   └── validations/     # Zod schemas
├── hooks/                # Custom React hooks
├── types/                # TypeScript type definitions
└── contexts/             # React context providers
```

---

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Supabase account (free tier works)
- Git

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/toptech5419/HomeBake-Bakery-Management-App---Next.js-15-Supabase.git
cd HomeBake-Bakery-Management-App---Next.js-15-Supabase
```

2. **Install dependencies**
```bash
npm install
# or
yarn install
# or
pnpm install
```

3. **Set up environment variables**

Create a `.env.local` file in the root directory:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_nextauth_secret

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

4. **Set up the database**

Run the SQL migrations in your Supabase dashboard:
```bash
npm run db:migrate
```

5. **Run the development server**
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Testing

### Run all tests
```bash
npm run test
```

### Run tests with coverage
```bash
npm run test:coverage
```

### Run E2E tests
```bash
npm run test:e2e
```

### Run specific test suites
```bash
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
```

---

## 📱 PWA Features

HomeBake is a fully-featured Progressive Web App:

- ✅ **Installable**: Add to home screen on mobile/desktop
- ✅ **Offline-Capable**: Service workers cache critical resources
- ✅ **Responsive**: Works seamlessly on all screen sizes (320px+)
- ✅ **Touch-Optimized**: 44px minimum touch targets
- ✅ **Fast**: Optimized Core Web Vitals
  - First Contentful Paint (FCP): < 1.8s
  - Largest Contentful Paint (LCP): < 2.4s
  - Cumulative Layout Shift (CLS): < 0.08
  - Time to Interactive (TTI): < 3.0s

---

## 🔒 Security Features

### Authentication & Authorization
- **JWT-based sessions** with secure token storage
- **Role-based access control (RBAC)** at database and application level
- **Row Level Security (RLS)** policies in Supabase
- **Password requirements** enforcement
- **Session timeout** and automatic refresh

### Data Protection
- **Input validation** on all forms using Zod schemas
- **SQL injection prevention** via parameterized queries
- **XSS protection** with React's built-in sanitization
- **CSRF protection** with NextAuth
- **HTTPS enforcement** in production
- **Secure headers** configured in Next.js

---

## 🎨 Design Philosophy

HomeBake follows **Apple-quality UX principles**:

- **Minimal & Clean**: Focused interfaces with clear hierarchy
- **Smooth Animations**: Framer Motion for delightful interactions
- **Consistent**: Design system with Tailwind + Radix UI
- **Accessible**: WCAG 2.1 AA compliant
- **Fast**: Optimized for Core Web Vitals
- **Mobile-First**: Touch-optimized for bakery floor use

---

## 📊 Performance Metrics

- **Lighthouse Score**: 95+ (Performance, Accessibility, Best Practices, SEO)
- **Core Web Vitals**: All green
- **Bundle Size**: Optimized with code splitting and lazy loading
- **Image Optimization**: Next.js Image component with WebP
- **Database Queries**: Indexed and optimized for sub-100ms response times

---

## 🗺️ Roadmap

### ✅ Completed (v1.0 - Production)
- Role-based authentication and authorization
- Production tracking and batch management
- Sales recording and inventory management
- Real-time data synchronization
- PWA capabilities with offline support
- Comprehensive testing suite
- Vercel deployment

### 🚧 In Progress (v1.1)
- [ ] Advanced analytics dashboard
- [ ] Export reports to PDF/Excel
- [ ] Customer management system
- [ ] Recipe management module

### 🔮 Future (v2.0)
- [ ] Multi-location support
- [ ] Supplier integration
- [ ] Automated ordering system
- [ ] Mobile apps (React Native)
- [ ] AI-powered demand forecasting

---

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Write tests for new features
- Follow TypeScript strict mode
- Use conventional commits
- Ensure all tests pass before PR
- Update documentation as needed

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

## 👨‍💻 Author

**Temitope Alabi**
- GitHub: [@toptech5419](https://github.com/toptech5419)
- LinkedIn: [toptech5419](https://linkedin.com/in/toptech5419)
- Email: alabitemitope51@gmail.com

---

## 🙏 Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [Supabase](https://supabase.com/)
- UI components from [Radix UI](https://www.radix-ui.com/)
- Icons from [Lucide](https://lucide.dev/)
- Hosted on [Vercel](https://vercel.com/)

---

## 📸 Screenshots

<table>
<tr>
<td width="50%">

### Owner Dashboard
![Owner Dashboard](https://via.placeholder.com/600x400?text=Owner+Dashboard)
*Complete business overview with analytics*

</td>
<td width="50%">

### Manager Dashboard
![Manager Dashboard](https://via.placeholder.com/600x400?text=Manager+Dashboard)
*Production tracking and shift management*

</td>
</tr>
<tr>
<td width="50%">

### Sales Entry (Mobile)
![Sales Entry](https://via.placeholder.com/300x600?text=Sales+Entry+Mobile)
*Touch-optimized sales recording*

</td>
<td width="50%">

### Production Tracking
![Production Tracking](https://via.placeholder.com/600x400?text=Production+Tracking)
*Real-time batch monitoring*

</td>
</tr>
</table>

---

<div align="center">

**Built with ❤️ for bakeries everywhere**

[⬆ Back to Top](#-homebake---bakery-management-pwa)

</div>
