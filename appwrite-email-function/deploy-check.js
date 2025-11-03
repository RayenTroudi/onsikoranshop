#!/usr/bin/env node

import fs from 'fs';

// Deployment helper script for ONSi Email Function
console.log('🚀 ONSi Email Function Deployment Helper\n');

// Check Node.js version
const nodeVersion = process.version;
console.log('📋 System Check:');
console.log(`Node.js Version: ${nodeVersion}`);

if (parseInt(nodeVersion.slice(1)) < 16) {
  console.log('⚠️  Warning: Node.js 16+ recommended for best compatibility');
}

// Check environment variables
console.log('\n🔧 Environment Variables Check:');

const requiredEnvVars = [
  'SMTP_HOST',
  'SMTP_USERNAME', 
  'SMTP_PASSWORD',
  'SUBMIT_EMAIL'
];

const optionalEnvVars = [
  'SMTP_PORT',
  'SMTP_SECURE',
  'SMTP_REQUIRE_TLS',
  'ALLOWED_ORIGINS'
];

let allGood = true;

requiredEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: Set`);
  } else {
    console.log(`❌ ${varName}: Missing (Required)`);
    allGood = false;
  }
});

console.log('\n📝 Optional Variables:');
optionalEnvVars.forEach(varName => {
  if (process.env[varName]) {
    console.log(`✅ ${varName}: ${process.env[varName]}`);
  } else {
    console.log(`⚪ ${varName}: Using default`);
  }
});

// Check dependencies
console.log('\n📦 Dependencies Check:');
try {
  const packageJson = JSON.parse(fs.readFileSync('./package.json', 'utf8'));
  const requiredDeps = ['nodemailer', 'node-appwrite'];
  
  requiredDeps.forEach(dep => {
    if (packageJson.dependencies[dep]) {
      console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
    } else {
      console.log(`❌ ${dep}: Missing`);
      allGood = false;
    }
  });
} catch (error) {
  console.log('❌ package.json not found or invalid');
  allGood = false;
}

// Final status
console.log('\n🎯 Deployment Status:');
if (allGood) {
  console.log('✅ Ready for deployment!');
  console.log('\n📋 Next Steps:');
  console.log('1. Deploy to Appwrite Functions');
  console.log('2. Configure environment variables in Appwrite');
  console.log('3. Test with a sample order');
  console.log('4. Update your frontend to use the new endpoint');
} else {
  console.log('❌ Configuration issues found');
  console.log('Please resolve the issues above before deployment');
}

// Deployment commands reference
console.log('\n📚 Useful Commands:');
console.log('• Test locally: npm test');
console.log('• Install deps: npm install');
console.log('• Check config: node deploy-check.js');
console.log('\n🔗 Documentation:');
console.log('• Gmail SMTP: https://support.google.com/mail/answer/7126229');
console.log('• Appwrite Functions: https://appwrite.io/docs/functions');
console.log('• README: ./README.md');

console.log('\n🕌 May your deployment be blessed with success!');