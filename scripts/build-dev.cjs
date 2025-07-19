#!/usr/bin/env node

const { execSync } = require('child_process');
const args = process.argv.slice(2);
const forceAuth = args.includes('--force-authenticated');

if (forceAuth) {
  process.env.FORCE_AUTHENTICATED = 'true';
  console.log('Force authentication enabled for development build');
}

try {
  console.log('Starting development build...');
  execSync('npm run build:dev', { stdio: 'inherit', env: process.env });
  console.log('Development build completed successfully!');
  
  if (forceAuth) {
    console.log('Extension will run with forced authentication enabled');
  }
} catch (error) {
  console.error('Build failed:', error.message);
  process.exit(1);
}
