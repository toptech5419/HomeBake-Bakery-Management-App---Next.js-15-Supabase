#!/usr/bin/env node

/**
 * Generate VAPID keys for HomeBake Push Notifications
 * Run: node scripts/generate-vapid-keys.js
 */

const webpush = require('web-push');
const fs = require('fs');
const path = require('path');

console.log('🔑 Generating VAPID keys for HomeBake Push Notifications...\n');

// Generate VAPID keys
const vapidKeys = webpush.generateVAPIDKeys();

console.log('✅ VAPID keys generated successfully!\n');
console.log('📋 Add these to your environment variables:\n');

console.log('# Push Notifications VAPID Keys');
console.log(`VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`);
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`);
console.log(`NEXT_PUBLIC_VAPID_KEY=${vapidKeys.publicKey}`);
console.log('');

// Check if .env.local exists
const envPath = path.join(process.cwd(), '.env.local');
let envContent = '';

if (fs.existsSync(envPath)) {
  envContent = fs.readFileSync(envPath, 'utf8');
}

// Check if VAPID keys already exist
const hasPublicKey = envContent.includes('VAPID_PUBLIC_KEY=');
const hasPrivateKey = envContent.includes('VAPID_PRIVATE_KEY=');
const hasNextPublicKey = envContent.includes('NEXT_PUBLIC_VAPID_KEY=');

if (!hasPublicKey || !hasPrivateKey || !hasNextPublicKey) {
  console.log('🤔 Would you like to add these to your .env.local file? (y/n)');
  
  const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
  });

  readline.question('', (answer) => {
    if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
      let updatedContent = envContent;

      // Add or update VAPID keys
      if (!hasPublicKey) {
        updatedContent += `\n# Push Notifications VAPID Keys\nVAPID_PUBLIC_KEY=${vapidKeys.publicKey}`;
      }
      if (!hasPrivateKey) {
        updatedContent += `\nVAPID_PRIVATE_KEY=${vapidKeys.privateKey}`;
      }
      if (!hasNextPublicKey) {
        updatedContent += `\nNEXT_PUBLIC_VAPID_KEY=${vapidKeys.publicKey}`;
      }

      fs.writeFileSync(envPath, updatedContent);
      console.log('\n✅ Environment variables updated in .env.local');
      console.log('\n🚀 Push notifications are ready to use!');
      console.log('\n📝 Next steps:');
      console.log('1. Run the database migration: database/06-push-notifications.sql');
      console.log('2. Restart your development server: npm run dev');
      console.log('3. Test push notifications in the owner dashboard');
    } else {
      console.log('\n⚠️  Please manually add the VAPID keys to your .env.local file');
    }
    readline.close();
  });
} else {
  console.log('ℹ️  VAPID keys already exist in .env.local');
  console.log('\n🚀 Push notifications should be working!');
}

console.log('\n📚 More information:');
console.log('- VAPID (Voluntary Application Server Identification) keys are used for push notifications');
console.log('- Public key: Used by the client to subscribe to push notifications'); 
console.log('- Private key: Used by the server to send push notifications (keep secret!)');
console.log('- These keys identify your application to push services (FCM, Safari, etc.)');