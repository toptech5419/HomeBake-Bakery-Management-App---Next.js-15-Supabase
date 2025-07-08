# HomeBake Connection Troubleshooting Guide

## 🚨 Current Issue: Supabase Connection Errors

If you're seeing `net::ERR_CONNECTION_CLOSED` errors, this guide will help you fix them.

## Quick Diagnosis

1. **Navigate to Owner Dashboard** → System Diagnostics section
2. **Click "Run Tests"** to see what's failing
3. **Follow the solutions below** based on your results

## Common Issues & Solutions

### ❌ Environment Configuration Failed
**Problem**: Missing or incorrect Supabase credentials
**Solution**:
```bash
# Check your .env.local file has these variables:
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### ❌ Internet Connection Failed
**Problem**: Network or firewall blocking connections
**Solutions**:
- Check your internet connection
- Disable VPN temporarily
- Check if your firewall is blocking Supabase domains
- Try from a different network

### ❌ Supabase Database Connection Failed
**Problem**: Can't reach your Supabase project
**Possible Causes & Solutions**:

1. **Paused Project**
   - Go to [Supabase Dashboard](https://supabase.com/dashboard)
   - Check if your project is paused (free tier auto-pauses)
   - Click "Resume" if paused

2. **Invalid API Keys**
   - Go to Supabase Dashboard → Settings → API
   - Copy the Project URL and anon key
   - Update your `.env.local` file
   - Restart your development server

3. **Network Issues**
   - Try accessing your Supabase dashboard directly
   - Check Supabase status page: https://status.supabase.com

4. **Rate Limiting**
   - Wait a few minutes and try again
   - Check if you're hitting free tier limits

### ⚠️ Authentication Issues
**Problem**: Auth service problems
**Solutions**:
- Clear browser cache and cookies
- Try logging out and back in
- Check if your user still exists in Supabase Auth

## Quick Fixes to Try

### 1. Restart Development Server
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
# or
yarn dev
```

### 2. Clear Browser Cache
- Press `Ctrl+Shift+R` (hard refresh)
- Or open DevTools → Application → Clear Storage

### 3. Check Supabase Project Status
1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Check the project status indicator
4. If paused, click "Resume"

### 4. Verify Environment Variables
```bash
# In your terminal, run:
echo $NEXT_PUBLIC_SUPABASE_URL
echo $NEXT_PUBLIC_SUPABASE_ANON_KEY
```

### 5. Test Connection Manually
Open browser DevTools → Console and run:
```javascript
fetch('https://your-project.supabase.co/rest/v1/', {
  headers: {
    'apikey': 'your-anon-key',
    'Authorization': 'Bearer your-anon-key'
  }
})
.then(response => console.log('Status:', response.status))
.catch(error => console.error('Error:', error));
```

## If Nothing Works

### Option 1: Create New Supabase Project
1. Go to [Supabase](https://supabase.com/dashboard)
2. Create a new project
3. Import your database schema
4. Update environment variables

### Option 2: Switch to Local Development
1. Install Supabase CLI
2. Run `supabase start`
3. Use local database URLs

### Option 3: Check with ISP/Network Admin
- Some networks block database connections
- Try using mobile hotspot
- Contact your IT department

## Prevention Tips

1. **Regular Backups**: Export your data regularly
2. **Monitor Usage**: Keep track of your Supabase usage
3. **Status Monitoring**: Subscribe to Supabase status updates
4. **Environment Security**: Keep your API keys secure

## Need More Help?

1. **Check Logs**: Look in browser DevTools → Console for detailed errors
2. **Supabase Support**: https://supabase.com/support
3. **Community**: https://github.com/supabase/supabase/discussions

## Error Reference

| Error | Meaning | Quick Fix |
|-------|---------|-----------|
| `net::ERR_CONNECTION_CLOSED` | Connection terminated | Check network/project status |
| `net::ERR_NAME_NOT_RESOLVED` | DNS issue | Check URL spelling |
| `401 Unauthorized` | Invalid API key | Update credentials |
| `429 Too Many Requests` | Rate limited | Wait and retry |
| `503 Service Unavailable` | Supabase down | Check status page |