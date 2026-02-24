# 🍞 HomeBake — Bakery Management PWA

<div align="center">

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-100%25-3178C6?style=for-the-badge&logo=typescript)
![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?style=for-the-badge&logo=supabase)
![Vercel](https://img.shields.io/badge/Deployed-Vercel-000000?style=for-the-badge&logo=vercel)

**Production-ready Progressive Web App for end-to-end bakery operations management**

[🚀 Live Demo](https://homebake.vercel.app) • [📖 Features](#-features) • [🛠️ Tech Stack](#️-tech-stack) • [🚀 Getting Started](#-getting-started)

</div>

---

## 🎯 Overview

**HomeBake** is a production-grade Progressive Web Application that streamlines bakery operations through role-based dashboards, real-time production tracking, inventory management, and sales recording. Built with a mobile-first approach for staff who work on the go.

---

## ✨ Features

### Role-Based Dashboards

| Role | Capabilities |
|---|---|
| **Owner** | Full system oversight, user management, financial reports, business analytics |
| **Manager** | Production planning, shift scheduling, quality control, batch tracking |
| **Sales Rep** | Mobile-optimised sales entry, inventory viewing, transaction management |

### Production Management
- Real-time batch tracking: planning → in-progress → quality-check → completed
- Morning and night shift workflows
- Quality scoring with notes and ratings
- Staff assignment with duration logging

### Sales & Inventory
- Mobile-first, touch-optimised sales entry
- Real-time inventory synchronisation from production to sales
- Discount, promotion, and leftover tracking
- Low stock alerts and return processing

### Analytics & Reporting
- Daily and weekly reports (sales, production, inventory)
- Shift comparison metrics
- Revenue and waste analysis

---

## 🛠️ Tech Stack

| Category | Technology |
|---|---|
| Framework | Next.js 15 (App Router) |
| UI | React 19 + Radix UI (shadcn/ui) |
| Language | TypeScript (strict) |
| Styling | Tailwind CSS + Framer Motion |
| Database | Supabase (PostgreSQL) with Row Level Security |
| Authentication | Supabase Auth + NextAuth (JWT) |
| Real-time | Supabase subscriptions |
| State | TanStack React Query |
| Deployment | Vercel |

---

## 📱 PWA Capabilities

- **Installable** — Add to home screen on mobile and desktop
- **Offline-capable** — Service workers cache critical resources
- **Responsive** — Optimised for all screen sizes from 320px up
- **Touch-optimised** — 44px minimum touch targets throughout

---

## 🔒 Security

- Row Level Security (RLS) policies — users only access their own data
- JWT-based sessions with automatic refresh
- Role-based access control at database and application level
- Zod validation on all form inputs
- CSRF protection via NextAuth

---

## 🏗️ Architecture

```
src/
├── app/
│   ├── dashboard/
│   │   ├── owner/        # Owner-only pages
│   │   ├── manager/      # Manager-only pages
│   │   └── sales/        # Sales rep pages
│   ├── auth/             # Authentication
│   └── api/              # Backend API routes
├── components/
│   ├── ui/               # Base UI (Radix)
│   ├── dashboards/       # Role-specific views
│   └── forms/            # Form components
├── lib/
│   ├── supabase/         # Supabase client + helpers
│   └── validations/      # Zod schemas
└── hooks/                # Custom React hooks
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Supabase account (free tier works)

### Installation

```bash
# Clone the repository
git clone https://github.com/toptech5419/HomeBake-Bakery-Management-App---Next.js-15-Supabase.git
cd HomeBake-Bakery-Management-App---Next.js-15-Supabase

# Install dependencies
npm install

# Set up environment variables
# Create .env.local and add:
# NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
# NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
# SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
# NEXTAUTH_SECRET=your_secret
# NEXTAUTH_URL=http://localhost:3000

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Live Demo

**[https://homebake.vercel.app](https://homebake.vercel.app)**

> Demo credentials available on request.

---

## 👨‍💻 Developer

**Temitope Alabi** — Full-Stack Developer | MSc Computer Science, University of Lincoln

- 🌐 GitHub: [@toptech5419](https://github.com/toptech5419)
- 💼 LinkedIn: [toptech5419](https://linkedin.com/in/toptech5419)
- 📧 Email: alabitemitope51@gmail.com
