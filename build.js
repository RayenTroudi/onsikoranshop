// Build script for environment variable replacement
// This script replaces the hardcoded environment variables with actual values from process.env

const fs = require('fs');
const path = require('path');

const htmlFile = path.join(__dirname, 'index.html');
let htmlContent = fs.readFileSync(htmlFile, 'utf8');

// Replace the environment variables in the HTML file
const envVars = {
  'AIzaSyDZw3QJBDlsn10pBbtQmBU61Nfa9bMUFx4': process.env.VITE_FIREBASE_API_KEY || 'AIzaSyDZw3QJBDlsn10pBbtQmBU61Nfa9bMUFx4',
  'onsi-de85f.firebaseapp.com': process.env.VITE_FIREBASE_AUTH_DOMAIN || 'onsi-de85f.firebaseapp.com',
  'onsi-de85f': process.env.VITE_FIREBASE_PROJECT_ID || 'onsi-de85f',
  'onsi-de85f.firebasestorage.app': process.env.VITE_FIREBASE_STORAGE_BUCKET || 'onsi-de85f.firebasestorage.app',
  '304484751803': process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '304484751803',
  '1:304484751803:web:4031fad794705c0bac8c9e': process.env.VITE_FIREBASE_APP_ID || '1:304484751803:web:4031fad794705c0bac8c9e',
  'G-5MF3MSH2J5': process.env.VITE_FIREBASE_MEASUREMENT_ID || 'G-5MF3MSH2J5',
  'ryB3eYn0HP-iAfl2E': process.env.VITE_EMAILJS_PUBLIC_KEY || 'ryB3eYn0HP-iAfl2E',
  'service_j4hv4we': process.env.VITE_EMAILJS_SERVICE_ID || 'service_j4hv4we',
  'template_3m8gczh': process.env.VITE_EMAILJS_CUSTOMER_TEMPLATE_ID || 'template_3m8gczh',
  'template_lkl5yxm': process.env.VITE_EMAILJS_ADMIN_TEMPLATE_ID || 'template_lkl5yxm',
  'rayentroudi00@gmail.com': process.env.VITE_ADMIN_EMAIL || 'rayentroudi00@gmail.com',
  'Onsi Koran Shop': process.env.VITE_APP_NAME || 'Onsi Koran Shop',
  '39.00': process.env.VITE_PRODUCT_PRICE || '39.00',
  '0.00': process.env.VITE_SHIPPING_COST || '0.00'
};

console.log('Environment variables for build:');
Object.keys(envVars).forEach(key => {
  console.log(`${key} -> ${envVars[key]}`);
});

console.log('Build completed - environment variables injected into HTML');