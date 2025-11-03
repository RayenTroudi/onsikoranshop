#!/usr/bin/env node

// Simple build script for environment variable replacement
const fs = require('fs');
const path = require('path');

console.log('🔨 Building project with environment variables...');

// Read the HTML files
const indexPath = './index.html';
const adminPath = './admin.html';

// Environment variables with defaults
const envVars = {
  VITE_APPWRITE_ENDPOINT: process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1',
  VITE_APPWRITE_PROJECT_ID: process.env.VITE_APPWRITE_PROJECT_ID || '68f8c1bc003e3d2c8f5c',
  VITE_APPWRITE_PROJECT_NAME: process.env.VITE_APPWRITE_PROJECT_NAME || 'onsi',
  VITE_EMAILJS_PUBLIC_KEY: process.env.VITE_EMAILJS_PUBLIC_KEY || 'ryB3eYn0HP-iAfl2E',
  VITE_EMAILJS_SERVICE_ID: process.env.VITE_EMAILJS_SERVICE_ID || 'service_j4hv4we',
  VITE_EMAILJS_CUSTOMER_TEMPLATE_ID: process.env.VITE_EMAILJS_CUSTOMER_TEMPLATE_ID || 'template_3m8gczh',
  VITE_EMAILJS_ADMIN_TEMPLATE_ID: process.env.VITE_EMAILJS_ADMIN_TEMPLATE_ID || 'template_lkl5yxm',
  VITE_ADMIN_EMAIL: process.env.VITE_ADMIN_EMAIL || 'onsmaitii@gmail.com',
  VITE_APP_NAME: process.env.VITE_APP_NAME || 'Onsi Koran Shop',
  VITE_PRODUCT_PRICE: process.env.VITE_PRODUCT_PRICE || null,
  VITE_SHIPPING_COST: process.env.VITE_SHIPPING_COST || '0.00',
  VITE_TAX_RATE: process.env.VITE_TAX_RATE || '0.00'
};

console.log('🌍 Environment variables:');
Object.entries(envVars).forEach(([key, value]) => {
  console.log(`  ${key}: ${value}`);
});

// Create dist directory
if (!fs.existsSync('./dist')) {
  fs.mkdirSync('./dist');
}

// Function to replace environment variables in content
function replaceEnvVars(content) {
  let result = content;
  
  // Replace the __VITE_*__ placeholders
  Object.entries(envVars).forEach(([key, value]) => {
    const placeholder = `__${key}__`;
    const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g');
    result = result.replace(regex, JSON.stringify(value));
  });
  
  return result;
}

// Process files
try {
  // Copy and process index.html
  if (fs.existsSync(indexPath)) {
    const indexContent = fs.readFileSync(indexPath, 'utf8');
    const processedIndex = replaceEnvVars(indexContent);
    fs.writeFileSync('./dist/index.html', processedIndex);
    console.log('✅ Processed index.html');
  }

  // Copy and process admin.html
  if (fs.existsSync(adminPath)) {
    const adminContent = fs.readFileSync(adminPath, 'utf8');
    const processedAdmin = replaceEnvVars(adminContent);
    fs.writeFileSync('./dist/admin.html', processedAdmin);
    console.log('✅ Processed admin.html');
  }

  // Copy other static files
  const staticFiles = ['styles.css', 'admin-styles.css', 'script.js', 'admin-script.js', 'appwrite-config.js'];
  staticFiles.forEach(file => {
    if (fs.existsSync(file)) {
      fs.copyFileSync(file, `./dist/${file}`);
      console.log(`✅ Copied ${file}`);
    }
  });

  // Copy directories
  const staticDirs = ['assets', 'locales'];
  staticDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      fs.cpSync(dir, `./dist/${dir}`, { recursive: true });
      console.log(`✅ Copied ${dir}/`);
    }
  });

  console.log('🎉 Build completed successfully!');
  
} catch (error) {
  console.error('❌ Build failed:', error);
  process.exit(1);
}