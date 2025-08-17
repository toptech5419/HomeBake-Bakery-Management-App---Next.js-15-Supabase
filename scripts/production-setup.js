#!/usr/bin/env node

/**
 * HomeBake Production Setup Script
 * Validates and prepares the application for production deployment
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 HomeBake Production Setup Starting...\n');

// Check if we're in the right directory
const packageJsonPath = path.join(process.cwd(), 'package.json');
if (!fs.existsSync(packageJsonPath)) {
  console.error('❌ package.json not found. Please run this script from the project root.');
  process.exit(1);
}

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
if (packageJson.name !== 'homebake') {
  console.error('❌ This script must be run from the HomeBake project directory.');
  process.exit(1);
}

console.log('✅ Located HomeBake project');

// Step 1: Install dependencies
console.log('\n📦 Installing dependencies...');
try {
  execSync('npm install', { stdio: 'inherit' });
  console.log('✅ Dependencies installed');
} catch (error) {
  console.error('❌ Failed to install dependencies');
  process.exit(1);
}

// Step 2: Environment check
console.log('\n📝 Checking environment configuration...');
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_APP_URL'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\nPlease set these variables in your .env.local file or deployment environment.');
  process.exit(1);
}

console.log('✅ Environment variables configured');

// Step 3: Build the application
console.log('\n🔨 Building application for production...');
try {
  execSync('npm run build', { stdio: 'inherit' });
  console.log('✅ Build completed successfully');
} catch (error) {
  console.error('❌ Build failed. Please fix the errors and try again.');
  process.exit(1);
}

// Step 4: Type checking (optional - warn but don't fail)
console.log('\n🔍 Running type checks...');
try {
  execSync('npm run type-check', { stdio: 'inherit' });
  console.log('✅ Type checking passed');
} catch (error) {
  console.warn('⚠️ Type checking found issues. Consider fixing these for better reliability.');
}

// Step 5: Linting (optional - warn but don't fail)
console.log('\n🧹 Running linter...');
try {
  execSync('npm run lint', { stdio: 'inherit' });
  console.log('✅ Linting passed');
} catch (error) {
  console.warn('⚠️ Linting found issues. Consider fixing these for better code quality.');
}

// Step 6: Create production checklist
console.log('\n📋 Creating production checklist...');

const checklist = `
# HomeBake Production Deployment Checklist

## ✅ Completed by Setup Script
- [x] Dependencies installed
- [x] Environment variables configured
- [x] Application builds successfully

## 🔧 Manual Verification Required

### Environment & Configuration
- [ ] Database is accessible from production environment
- [ ] Supabase RLS policies are properly configured
- [ ] Production domain is whitelisted in Supabase
- [ ] SSL/HTTPS is configured for production domain

### PWA & Service Worker
- [ ] Service worker is working correctly
- [ ] Push notifications are configured (if using)
- [ ] App can be installed as PWA
- [ ] Offline functionality works as expected

### Performance
- [ ] Images are optimized and properly sized
- [ ] Bundle size is acceptable (check with \`npm run analyze\`)
- [ ] First load performance is good
- [ ] Mobile performance is optimized

### Security
- [ ] No sensitive data in client-side code
- [ ] API endpoints are properly secured
- [ ] User authentication flow works correctly
- [ ] Role-based access control is functioning

### Testing
- [ ] Critical user flows work on mobile devices
- [ ] Multi-user scenarios work correctly
- [ ] Data persistence works across sessions
- [ ] Error handling displays user-friendly messages

### Monitoring
- [ ] Error tracking is set up (if using external service)
- [ ] Performance monitoring is configured
- [ ] Database query performance is acceptable
- [ ] Real-time updates work reliably

## 🚀 Deployment Commands

### Build for Production
\`\`\`bash
npm run build
\`\`\`

### Start Production Server (if self-hosting)
\`\`\`bash
npm run start
\`\`\`

### Deploy to Vercel
\`\`\`bash
npm run deploy
\`\`\`

## 📊 Post-Deployment Verification

1. Visit your production URL
2. Test user registration/login flow
3. Create a test batch and sales entry
4. Verify real-time updates work
5. Test on mobile devices
6. Check browser console for errors

## 🆘 Troubleshooting

### Common Issues
- **White screen**: Check browser console for JavaScript errors
- **Database errors**: Verify Supabase connection and RLS policies
- **Push notifications not working**: Check VAPID keys and service worker registration
- **Mobile issues**: Test viewport settings and touch interactions

### Getting Help
- Check the application logs
- Verify environment variables
- Review Supabase logs
- Test database connectivity

---

Generated on: ${new Date().toISOString()}
`;

fs.writeFileSync(path.join(process.cwd(), 'PRODUCTION-CHECKLIST.md'), checklist);
console.log('✅ Production checklist created (PRODUCTION-CHECKLIST.md)');

// Step 7: Final summary
console.log('\n🎉 Production Setup Complete!\n');

console.log('📋 Summary:');
console.log('✅ Dependencies installed');
console.log('✅ Environment configured');
console.log('✅ Application built successfully');
console.log('✅ Production checklist created');

console.log('\n📖 Next Steps:');
console.log('1. Review the PRODUCTION-CHECKLIST.md file');
console.log('2. Complete the manual verification items');
console.log('3. Deploy to your production environment');
console.log('4. Run post-deployment verification');

console.log('\n🚀 Your HomeBake application is ready for production!');

// Display environment-specific notes
if (process.env.NODE_ENV === 'production') {
  console.log('\n⚠️ Production Environment Notes:');
  console.log('- Ensure your production domain is configured in Supabase');
  console.log('- Set up proper SSL certificates');
  console.log('- Configure monitoring and alerting');
  console.log('- Set up automated backups');
}

console.log('\n🔗 Useful Commands:');
console.log('npm run dev        - Start development server');
console.log('npm run build      - Build for production');
console.log('npm run start      - Start production server');
console.log('npm run type-check - Check TypeScript types');
console.log('npm run lint       - Run code linting');

console.log('\n📞 Support:');
console.log('If you encounter any issues, please check the documentation or contact support.');