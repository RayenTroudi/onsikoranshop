// Firebase Domain Helper - Run this in browser console on Vercel
function fixFirebaseDomain() {
  const currentDomain = window.location.hostname;
  const projectId = 'onsi-de85f';
  
  console.log('🔧 FIREBASE DOMAIN AUTHORIZATION REQUIRED');
  console.log('=====================================');
  console.log('Current domain:', currentDomain);
  console.log('Firebase project:', projectId);
  console.log('');
  console.log('📋 STEPS TO FIX:');
  console.log('1. Open Firebase Console: https://console.firebase.google.com/project/' + projectId + '/authentication/settings');
  console.log('2. Scroll to "Authorized domains" section');
  console.log('3. Click "Add domain"');
  console.log('4. Add this domain:', currentDomain);
  console.log('5. Wait 2-3 minutes and try again');
  console.log('');
  
  // Try to open Firebase console automatically
  if (confirm('Open Firebase Console to add domain authorization?')) {
    window.open('https://console.firebase.google.com/project/' + projectId + '/authentication/settings', '_blank');
  }
  
  return {
    domain: currentDomain,
    consoleUrl: 'https://console.firebase.google.com/project/' + projectId + '/authentication/settings'
  };
}

// Auto-run if there's an auth error
window.fixFirebaseDomain = fixFirebaseDomain;

console.log('🚀 Firebase Domain Helper loaded!');
console.log('Run fixFirebaseDomain() if you get auth/unauthorized-domain error');