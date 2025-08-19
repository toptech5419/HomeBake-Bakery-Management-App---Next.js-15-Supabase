// Environment Configuration Checker for Production
// Run this script to verify your environment variables are properly set

const requiredEnvVars = {
  // Supabase Configuration
  'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
  'NEXT_PUBLIC_SUPABASE_ANON_KEY': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  'SUPABASE_SERVICE_ROLE_KEY': process.env.SUPABASE_SERVICE_ROLE_KEY,
  
  // Application Configuration
  'NEXT_PUBLIC_APP_URL': process.env.NEXT_PUBLIC_APP_URL,
  'NODE_ENV': process.env.NODE_ENV
};

const optionalEnvVars = {
  'VERCEL_URL': process.env.VERCEL_URL,
  'VERCEL_ENV': process.env.VERCEL_ENV
};

console.log('🔍 HomeBake Environment Configuration Check');
console.log('==========================================');

let hasErrors = false;

// Check required variables
console.log('\n✅ Required Variables:');
Object.entries(requiredEnvVars).forEach(([key, value]) => {
  const status = value ? '✅' : '❌';
  const displayValue = value ? 
    (key.includes('KEY') ? `${value.substring(0, 10)}...` : value) : 
    'NOT SET';
  
  console.log(`${status} ${key}: ${displayValue}`);
  
  if (!value) {
    hasErrors = true;
  }
});

// Check optional variables
console.log('\n🔧 Optional Variables:');
Object.entries(optionalEnvVars).forEach(([key, value]) => {
  const status = value ? '✅' : '⚠️';
  console.log(`${status} ${key}: ${value || 'NOT SET'}`);
});

// Specific checks
console.log('\n🔬 Specific Checks:');

// Check Supabase URL format
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  const isValidUrl = supabaseUrl.startsWith('https://') && supabaseUrl.includes('.supabase.co');
  console.log(`${isValidUrl ? '✅' : '❌'} Supabase URL format: ${isValidUrl ? 'Valid' : 'Invalid format'}`);
  if (!isValidUrl) hasErrors = true;
} else {
  hasErrors = true;
}

// Check service role key format
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (serviceKey) {
  const isValidKey = serviceKey.startsWith('eyJ') && serviceKey.length > 100;
  console.log(`${isValidKey ? '✅' : '❌'} Service Role Key format: ${isValidKey ? 'Valid' : 'Invalid format'}`);
  if (!isValidKey) hasErrors = true;
} else {
  hasErrors = true;
}

// Check anon key format
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
if (anonKey) {
  const isValidKey = anonKey.startsWith('eyJ') && anonKey.length > 100;
  console.log(`${isValidKey ? '✅' : '❌'} Anon Key format: ${isValidKey ? 'Valid' : 'Invalid format'}`);
  if (!isValidKey) hasErrors = true;
} else {
  hasErrors = true;
}

// Check app URL
const appUrl = process.env.NEXT_PUBLIC_APP_URL;
if (appUrl) {
  const isValidAppUrl = appUrl.startsWith('http');
  console.log(`${isValidAppUrl ? '✅' : '❌'} App URL format: ${isValidAppUrl ? 'Valid' : 'Invalid format'}`);
  if (!isValidAppUrl) hasErrors = true;
}

// Environment-specific recommendations
console.log('\n🎯 Environment Recommendations:');

if (process.env.NODE_ENV === 'production') {
  console.log('📦 Production Environment Detected');
  
  if (!process.env.NEXT_PUBLIC_APP_URL || process.env.NEXT_PUBLIC_APP_URL.includes('localhost')) {
    console.log('⚠️  Consider setting NEXT_PUBLIC_APP_URL to your production domain');
  }
  
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.log('❌ CRITICAL: SUPABASE_SERVICE_ROLE_KEY is required for production signup!');
    hasErrors = true;
  }
} else {
  console.log('🔧 Development Environment Detected');
}

// Summary
console.log('\n📋 Summary:');
if (hasErrors) {
  console.log('❌ Configuration has errors that need to be fixed');
  console.log('');
  console.log('🛠️  How to fix:');
  console.log('1. Check your .env.local file (for local development)');
  console.log('2. Check your Vercel environment variables (for production)');
  console.log('3. Make sure all required variables are set correctly');
  console.log('4. Verify your Supabase project settings');
  process.exit(1);
} else {
  console.log('✅ Configuration looks good!');
  console.log('🚀 Your HomeBake app should work properly');
}

console.log('\n📚 Additional Resources:');
console.log('- Supabase Dashboard: https://app.supabase.com/');
console.log('- Vercel Dashboard: https://vercel.com/dashboard');
console.log('- HomeBake Documentation: Check CLAUDE.md');