# Vercel Production Deployment Guide

## Required Environment Variables for Vercel

Add these environment variables in your Vercel dashboard under **Settings → Environment Variables**:

### Core Application Variables
```bash
# Supabase Configuration (REQUIRED)
NEXT_PUBLIC_SUPABASE_URL=https://mmazcugeljrlprurfiwk.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tYXpjdWdlbGpybHBydXJmaXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NTYwODQsImV4cCI6MjA2NjIzMjA4NH0.uSrDzcMD_K42-ZaQwcchzejyzcKAEAXGyR7e2Uj05Zo
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tYXpjdWdlbGpybHBydXJmaXdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY1NjA4NCwiZXhwIjoyMDY2MjMyMDg0fQ.E3INHUGopzSDoXbza0xnZBSkeoc8dH8PzVEw9LSC9LY

# Application URLs (REQUIRED)
NEXT_PUBLIC_APP_URL=https://homebake.vercel.app
NEXTAUTH_URL=https://homebake.vercel.app
NEXTAUTH_SECRET=super-secure-random-string-for-production

# Environment
NODE_ENV=production
```

### Push Notifications (OPTIONAL - but recommended)
```bash
# VAPID Keys for Web Push Notifications
VAPID_PUBLIC_KEY=BBzG8sAL9bkyC9tFOvW6ceXZm_rdbthki5bX_abqk1OXiK5C-X9_n0AoBwc-0xjySYP0GdU9kzr2HCkERppShWQ
VAPID_PRIVATE_KEY=b9Wn5pgAhgeK4xlIXo4r5WqnmDiKt8DzuZBwoDeUt4E
NEXT_PUBLIC_VAPID_KEY=BBzG8sAL9bkyC9tFOvW6ceXZm_rdbthki5bX_abqk1OXiK5C-X9_n0AoBwc-0xjySYP0GdU9kzr2HCkERppShWQ
```

### PWA Configuration (OPTIONAL)
```bash
NEXT_PUBLIC_PWA_NAME=HomeBake
NEXT_PUBLIC_PWA_SHORT_NAME=HomeBake  
NEXT_PUBLIC_PWA_DESCRIPTION=Smart Bakery Management App
```

### Performance Settings (OPTIONAL)
```bash
NEXT_PUBLIC_ENABLE_REAL_TIME=true
SUPABASE_CONNECTION_POOL_SIZE=10
SUPABASE_MAX_IDLE_TIME=60000
```

## Production-Ready Features ✅

### 1. **Push Notifications**
- ✅ Graceful degradation when VAPID keys are missing
- ✅ Dynamic web-push loading prevents build failures
- ✅ Automatic cleanup of invalid subscriptions
- ✅ Comprehensive error handling and logging

### 2. **Database Operations**
- ✅ Proper error handling for all database queries
- ✅ Type-safe operations with production schemas
- ✅ Connection pooling for performance
- ✅ Automatic fallback mechanisms

### 3. **Authentication & Security**
- ✅ Secure environment variable handling
- ✅ Role-based access control (RBAC)
- ✅ Proper session management
- ✅ CORS and security headers configured

### 4. **Performance Optimizations**
- ✅ Next.js 15 App Router with optimized builds
- ✅ Static generation where possible
- ✅ Dynamic imports for code splitting
- ✅ Image optimization and caching

## Deployment Steps

### 1. Set Environment Variables
In your Vercel dashboard:
1. Go to **Project Settings → Environment Variables**
2. Add all required variables from the section above
3. Set **Environment** to "Production, Preview, and Development"

### 2. Deploy
```bash
# Deploy to production
git push origin master

# Or deploy manually
vercel --prod
```

### 3. Verify Deployment
After deployment, verify these endpoints:
- `https://your-domain.vercel.app/api/health` - Should return 200
- `https://your-domain.vercel.app/api/notifications/push` - Should show service status
- `https://your-domain.vercel.app/login` - Should load login page

## Environment Variable Security Notes

⚠️ **IMPORTANT**: These keys are already in your repository's .env.local file. For maximum security in production, consider:

1. **Regenerating VAPID keys** for production:
   ```bash
   npx web-push generate-vapid-keys
   ```

2. **Using Vercel's secret management** for sensitive keys

3. **Rotating Supabase keys** regularly through the Supabase dashboard

4. **Using different Supabase projects** for development vs production

## Troubleshooting

### Build Fails with "VAPID key" error
✅ **FIXED**: The app now handles missing VAPID keys gracefully

### Type errors during build
✅ **FIXED**: All TypeScript errors resolved

### Database connection errors
- Verify Supabase URL and keys are correct
- Check if Supabase project is active
- Ensure RLS policies are configured properly

### Authentication issues
- Verify NEXTAUTH_URL matches your actual domain
- Regenerate NEXTAUTH_SECRET if needed
- Check Supabase Auth configuration

## Support

If you encounter any deployment issues:
1. Check Vercel deployment logs
2. Verify all environment variables are set
3. Test API endpoints individually
4. Check Supabase dashboard for connection issues

---

**HomeBake** is now production-ready for Vercel deployment! 🚀🍞