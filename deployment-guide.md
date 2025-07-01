# 🚀 HomeBake PWA Deployment Guide

## ✅ Fixes Applied
1. **Landing Page**: Created proper home page instead of redirect
2. **Middleware**: Made more defensive to handle auth failures
3. **Environment Variables**: Removed from vercel.json for security

## 🔧 Manual Environment Setup Required

**IMPORTANT**: You need to set environment variables in Vercel Dashboard manually for security.

### Step 1: Access Vercel Project Settings
1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Find your `homebake` project
3. Click on **Settings** tab
4. Go to **Environment Variables** section

### Step 2: Add Environment Variables
Add these three variables:

```
NEXT_PUBLIC_SUPABASE_URL
https://mmazcugeljrlprurfiwk.supabase.co

NEXT_PUBLIC_SUPABASE_ANON_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tYXpjdWdlbGpybHBydXJmaXdrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTA2NTYwODQsImV4cCI6MjA2NjIzMjA4NH0.uSrDzcMD_K42-ZaQwcchzejyzcKAEAXGyR7e2Uj05Zo

SUPABASE_SERVICE_ROLE_KEY
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1tYXpjdWdlbGpybHBydXJmaXdrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MDY1NjA4NCwiZXhwIjoyMDY2MjMyMDg0fQ.E3INHUGopzSDoXbza0xnZBSkeoc8dH8PzVEw9LSC9LY
```

### Step 3: Redeploy
After adding environment variables:
1. Go to **Deployments** tab
2. Click **Redeploy** on the latest deployment
3. Or push a new commit to trigger deployment

## 🎯 Quick Fix Commands

Run these commands to redeploy with fixes:

```bash
# Build and test locally first
npm run build

# Deploy updated version
npx vercel --prod

# Or use the deployment script
bash deploy.sh
```

## 🔍 Troubleshooting

### If still getting 404:
1. **Check Vercel Functions**: Go to Functions tab, ensure no errors
2. **Check Build Logs**: Look for build failures
3. **Verify Domain**: Make sure accessing correct URL
4. **Clear Cache**: Hard refresh browser (Ctrl+Shift+R)

### Common Issues:
- **Environment variables not set**: Follow Step 2 above
- **Build failures**: Check logs in Vercel dashboard
- **Authentication errors**: Clear browser cookies
- **Service worker conflicts**: Disable cache in dev tools

## ✨ Success Indicators

After fixing, you should see:
- ✅ **Landing page loads** with HomeBake branding
- ✅ **Login/Signup buttons** work
- ✅ **No 404 errors** on main routes
- ✅ **Dashboard accessible** after login
- ✅ **PWA features** working (install prompt, offline)

## 🎉 Next Steps After Deployment

1. **Test all routes**: /, /login, /signup, /dashboard
2. **Set up database**: Create tables in Supabase
3. **Test PWA**: Try installing as app
4. **Configure domain**: Add custom domain if desired