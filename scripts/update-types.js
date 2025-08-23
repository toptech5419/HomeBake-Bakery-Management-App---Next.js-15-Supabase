#!/usr/bin/env node
/**
 * HomeBake Database Type Generator
 * 
 * This script updates TypeScript types to match your Supabase database schema.
 * Run this whenever you make changes to your database structure.
 * 
 * Usage: npm run generate-types
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const PROJECT_ID = 'mmazcugeljrlprurfiwk';
const TYPES_FILE = 'src/types/supabase.ts';

console.log('🔄 Updating database types from Supabase...');
console.log(`📡 Project: ${PROJECT_ID}`);
console.log(`📁 Target: ${TYPES_FILE}`);

try {
  // Check if Supabase CLI is available
  try {
    execSync('npx supabase --version', { stdio: 'ignore' });
  } catch (error) {
    console.log('📦 Installing Supabase CLI...');
    execSync('npm install -g supabase', { stdio: 'inherit' });
  }

  // Generate types
  console.log('⚙️ Generating types...');
  const command = `npx supabase gen types typescript --project-id ${PROJECT_ID} --schema public`;
  const types = execSync(command, { encoding: 'utf8' });
  
  // Backup existing types
  const backupFile = `${TYPES_FILE}.backup.${Date.now()}`;
  if (fs.existsSync(TYPES_FILE)) {
    fs.copyFileSync(TYPES_FILE, backupFile);
    console.log(`💾 Backed up existing types to: ${backupFile}`);
  }
  
  // Write new types
  fs.writeFileSync(TYPES_FILE, types);
  
  console.log('✅ Database types updated successfully!');
  console.log('🎉 Your TypeScript definitions now match your database schema.');
  
  // Clean up old backups (keep only last 3)
  const backupFiles = fs.readdirSync('src/types')
    .filter(file => file.startsWith('supabase.ts.backup.'))
    .sort()
    .reverse();
    
  if (backupFiles.length > 3) {
    const toDelete = backupFiles.slice(3);
    toDelete.forEach(file => {
      fs.unlinkSync(path.join('src/types', file));
      console.log(`🗑️ Cleaned up old backup: ${file}`);
    });
  }
  
} catch (error) {
  console.error('❌ Failed to update types:', error.message);
  
  if (error.message.includes('Access token not provided')) {
    console.log('\n🔑 Authentication required:');
    console.log('1. Run: npx supabase login');
    console.log('2. Then run: npm run generate-types');
  }
  
  process.exit(1);
}