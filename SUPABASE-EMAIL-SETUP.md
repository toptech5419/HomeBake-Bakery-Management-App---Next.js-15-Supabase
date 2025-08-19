# Supabase Email Configuration for Password Reset

## 🔧 Required Setup Steps

### 1. **Supabase Dashboard Configuration**

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `mmazcugeljrlprurfiwk`
3. Navigate to **Authentication > Email Templates**

### 2. **Configure Reset Password Email Template**

Replace the default template with this production-grade version:

```html
<h2>Reset Your HomeBake Password</h2>

<p>Hello!</p>

<p>You requested to reset your password for your HomeBake bakery management account.</p>

<p>Click the link below to reset your password:</p>

<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>

<p>If you didn't request this password reset, you can safely ignore this email.</p>

<p>This link will expire in 1 hour for security reasons.</p>

<br>
<p>Best regards,<br>
The HomeBake Team</p>

<hr>
<p><small>This is an automated email. Please do not reply to this message.</small></p>
```

### 3. **Configure Email Settings**

1. In Supabase Dashboard, go to **Authentication > Settings**
2. Set **Site URL**: `http://localhost:3000` (development) or your production URL
3. Add **Redirect URLs**:
   - `http://localhost:3000/auth/reset-password`
   - `https://your-production-domain.com/auth/reset-password`

### 4. **Email Provider Setup** (Optional)

By default, Supabase uses their email service. For production, consider:

1. **Custom SMTP** (Recommended for production):
   - Go to **Authentication > Settings > SMTP Settings**
   - Configure with your email provider (Gmail, SendGrid, etc.)

2. **Default Supabase Email** (Good for development):
   - Works out of the box
   - Has rate limits
   - Emails may go to spam

## ✅ Verification Steps

1. **Test Forgot Password Flow**:
   - Go to `/login`
   - Click "Forgot password?"
   - Enter a valid email from your users table
   - Check email inbox (including spam folder)

2. **Test Password Reset**:
   - Click link in email
   - Should redirect to `/auth/reset-password`
   - Enter new password
   - Should redirect to `/login` with success message

## 🚨 Important Security Notes

1. **Reset links expire in 1 hour** (Supabase default)
2. **One-time use only** - links become invalid after use
3. **Email validation** - Only sends to registered, active users
4. **No email enumeration** - Always shows success message regardless of email existence
5. **Secure redirect** - Only allows whitelisted redirect URLs

## 🔧 Troubleshooting

### Email Not Received
- Check spam/junk folder
- Verify email exists in `users` table with `is_active = true`
- Check Supabase logs in dashboard
- Verify SMTP settings if using custom provider

### Reset Link Invalid
- Links expire after 1 hour
- Links can only be used once
- User must be logged out when clicking link
- Check redirect URL configuration

### Reset Not Working
- Verify user session is cleared before reset
- Check browser console for errors
- Ensure redirect URLs are whitelisted in Supabase

## 📱 Production Checklist

- [ ] Configure custom email template
- [ ] Set up custom SMTP provider
- [ ] Add production redirect URLs
- [ ] Test with real email addresses
- [ ] Verify mobile email layout
- [ ] Set appropriate rate limits
- [ ] Monitor email delivery rates