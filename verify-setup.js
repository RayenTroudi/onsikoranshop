// Verification script to test environment variable access
// Run this in the browser console to verify configuration

console.log('=== ENVIRONMENT CONFIGURATION TEST ===');
console.log('window.ENV:', window.ENV);

if (window.ENV) {
  console.log('✅ Environment configuration loaded successfully');
  
  console.log('\n--- Firebase Configuration ---');
  console.log('API Key:', window.ENV.VITE_FIREBASE_API_KEY ? '✅ Set' : '❌ Missing');
  console.log('Auth Domain:', window.ENV.VITE_FIREBASE_AUTH_DOMAIN ? '✅ Set' : '❌ Missing');
  console.log('Project ID:', window.ENV.VITE_FIREBASE_PROJECT_ID ? '✅ Set' : '❌ Missing');
  
  console.log('\n--- EmailJS Configuration ---');
  console.log('Public Key:', window.ENV.VITE_EMAILJS_PUBLIC_KEY ? '✅ Set' : '❌ Missing');
  console.log('Service ID:', window.ENV.VITE_EMAILJS_SERVICE_ID ? '✅ Set' : '❌ Missing');
  console.log('Customer Template:', window.ENV.VITE_EMAILJS_CUSTOMER_TEMPLATE_ID ? '✅ Set' : '❌ Missing');
  console.log('Admin Template:', window.ENV.VITE_EMAILJS_ADMIN_TEMPLATE_ID ? '✅ Set' : '❌ Missing');
  console.log('Admin Email:', window.ENV.VITE_ADMIN_EMAIL ? '✅ Set' : '❌ Missing');
  
  console.log('\n--- Application Configuration ---');
  console.log('App Name:', window.ENV.VITE_APP_NAME ? '✅ Set' : '❌ Missing');
  console.log('Product Price:', window.ENV.VITE_PRODUCT_PRICE ? '✅ Set' : '❌ Missing');
  
} else {
  console.error('❌ Environment configuration not loaded');
  console.error('Check that the environment script in index.html is loading correctly');
}

console.log('\n=== FUNCTION AVAILABILITY TEST ===');
console.log('openAuthModal:', typeof window.openAuthModal);
console.log('showCartModal:', typeof window.showCartModal);
console.log('upsertItem:', typeof window.upsertItem);
console.log('EmailJS:', typeof window.emailjs);

console.log('\n=== FIREBASE TEST ===');
if (window.firebaseAuth) {
  console.log('✅ Firebase Auth module loaded');
} else {
  console.log('❌ Firebase Auth module not loaded');
}

console.log('\nRun this script in browser console to verify your setup!');