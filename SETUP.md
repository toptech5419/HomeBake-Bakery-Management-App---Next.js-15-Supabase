# HomeBake Setup Guide

## Environment Variables Setup

To fix the "unexpected error" during signup, you need to set up your Supabase environment variables.

### 1. Create Environment File

Create a `.env.local` file in the root of your project (`homebake/homebake/.env.local`) with the following content:

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# App Configuration
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 2. Get Your Supabase Credentials

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Create a new project or select an existing one
3. Go to Settings > API
4. Copy the following values:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **service_role secret** → `SUPABASE_SERVICE_ROLE_KEY`

### 3. Database Setup

1. Go to your Supabase project's SQL Editor
2. Run the SQL commands from `database/schema.sql` to create the required tables
3. Set up Row Level Security (RLS) policies from `database/rls-policies.sql`

### 4. Restart Development Server

After setting up the environment variables:

```bash
npm run dev
```

## Common Issues

### "Database connection not configured"
- Make sure your `.env.local` file exists and has the correct Supabase credentials
- Verify the credentials in your Supabase dashboard

### "Invalid or expired invitation link"
- Generate a new QR invite code from the dashboard
- Make sure you're using the correct token from the URL

### "QR invite has expired"
- QR invites expire after 10 minutes
- Generate a new invite code

## Testing the Setup

1. Start the development server: `npm run dev`
2. Go to `http://localhost:3000`
3. Try to access the dashboard (should redirect to login)
4. Generate a QR invite code from the dashboard
5. Use the invite link to test signup

## Support

If you continue to have issues:
1. Check the browser console for detailed error messages
2. Verify your Supabase project is active and accessible
3. Ensure all database tables are created correctly 