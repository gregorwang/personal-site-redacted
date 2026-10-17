#!/usr/bin/env node
/* eslint-env node */

const fs = require('fs');
const path = require('path');

console.log('🔍 Environment Variables Check\n');

// 检查 .env 文件是否存在
const envFile = path.join(process.cwd(), '.env');
const envExists = fs.existsSync(envFile);

console.log(`📁 .env file exists: ${envExists ? '✅' : '❌'}`);

if (envExists) {
  try {
    const envContent = fs.readFileSync(envFile, 'utf8');
    const lines = envContent.split('\n').filter(line => line.trim() && !line.startsWith('#'));
    
    console.log(`📝 .env file contains ${lines.length} variables:`);
    lines.forEach(line => {
      const [key] = line.split('=');
      if (key) {
        console.log(`   - ${key.trim()}`);
      }
    });
  } catch (error) {
    console.log(`❌ Error reading .env file: ${error.message}`);
  }
}

console.log('\n🌍 Process Environment Variables:');
const requiredVars = ['REDIS_URL', 'RESEND_API_KEY'];

requiredVars.forEach(varName => {
  const value = process.env[varName];
  const status = value ? '✅' : '❌';
  const displayValue = value ? `${value.substring(0, 20)}...` : 'undefined';
  console.log(`   ${status} ${varName}: ${displayValue}`);
});

console.log('\n💡 Tips:');
console.log('   - If variables are missing, check your .env file');
console.log('   - If .env exists but variables are undefined, restart your dev server');
console.log('   - Make sure .env is in your project root directory'); 
