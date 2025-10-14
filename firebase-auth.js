// Firebase Configuration and Authentication
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: window.ENV?.VITE_FIREBASE_API_KEY || "AIzaSyDZw3QJBDlsn10pBbtQmBU61Nfa9bMUFx4",
  authDomain: window.ENV?.VITE_FIREBASE_AUTH_DOMAIN || "onsi-de85f.firebaseapp.com",
  projectId: window.ENV?.VITE_FIREBASE_PROJECT_ID || "onsi-de85f",
  storageBucket: window.ENV?.VITE_FIREBASE_STORAGE_BUCKET || "onsi-de85f.firebasestorage.app",
  messagingSenderId: window.ENV?.VITE_FIREBASE_MESSAGING_SENDER_ID || "304484751803",
  appId: window.ENV?.VITE_FIREBASE_APP_ID || "1:304484751803:web:4031fad794705c0bac8c9e",
  measurementId: window.ENV?.VITE_FIREBASE_MEASUREMENT_ID || "G-5MF3MSH2J5"
};

// Debug information for domain authorization issues
console.log('🔧 Firebase Debug Info:');
console.log('Current domain:', window.location.hostname);
console.log('Current origin:', window.location.origin);
console.log('Firebase project:', firebaseConfig.projectId);

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();
// Configure Google provider to reduce CORS warnings
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Check if Firebase is properly configured
function checkFirebaseConfig() {
  if (!firebaseConfig.apiKey || !firebaseConfig.authDomain) {
    console.error('Firebase configuration is incomplete');
    return false;
  }
  return true;
}

// Enhanced error handling
function handleFirebaseError(error) {
  console.error('Firebase error:', error);
  
  const errorMessages = {
    'auth/configuration-not-found': 'Firebase Authentication is not configured. Please enable Authentication in Firebase Console.',
    'auth/api-key-not-valid': 'Invalid Firebase API key. Please check your configuration.',
    'auth/unauthorized-domain': 'This domain is not authorized for Firebase Authentication. Please add this domain to your Firebase project\'s authorized domains list in the Firebase Console → Authentication → Settings → Authorized domains.',
    'auth/invalid-email': 'Please enter a valid email address.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/email-already-in-use': 'An account with this email already exists.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/network-request-failed': 'Network error. Please check your connection.',
    'auth/popup-blocked': 'Popup was blocked. Please allow popups and try again.',
    'auth/popup-closed-by-user': 'Sign-in was cancelled.'
  };
  
  return errorMessages[error.code] || error.message || 'An unexpected error occurred.';
}

// Authentication State Management
let currentUser = null;

// Auth state observer
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateAuthUI(user);
  
  // Notify main app about user state change
  if (window.handleUserAuthChange) {
    window.handleUserAuthChange(user);
  }
  
  if (user) {
    console.log('User signed in:', user.email);
  } else {
    console.log('User signed out');
  }
});

// Update UI based on authentication state
async function updateAuthUI(user) {
  const authButton = document.getElementById('auth-button');
  const userProfile = document.getElementById('user-profile');
  const authModal = document.getElementById('auth-modal');
  
  if (user) {
    // User is signed in - show user profile
    if (authButton) {
      // Hide the auth button and show user profile
      authButton.style.display = 'none';
    }
    if (userProfile) {
      userProfile.style.display = 'block';
      userProfile.classList.remove('hidden');
      
      // Update user profile content
      const profileToggle = document.getElementById('profile-toggle');
      if (profileToggle) {
        // Clear existing content
        profileToggle.innerHTML = '';
        
        // Create container div
        const container = document.createElement('div');
        container.className = 'flex items-center gap-2';
        
        // Create default profile image SVG data URL
        const defaultProfileImage = 'data:image/svg+xml;base64,' + btoa(`
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);">
            <circle cx="50" cy="35" r="18" fill="white" opacity="0.9"/>
            <path d="M20 85 C20 65, 35 55, 50 55 C65 55, 80 65, 80 85 Z" fill="white" opacity="0.9"/>
          </svg>
        `);
        
        // Create profile image or fallback avatar
        if (user.photoURL) {
          const img = document.createElement('img');
          img.src = user.photoURL;
          img.alt = 'Profile';
          img.className = 'w-6 h-6 rounded-full object-cover border border-gray-200';
          
          // Create default image fallback
          const defaultImg = document.createElement('img');
          defaultImg.src = defaultProfileImage;
          defaultImg.alt = 'Default Profile';
          defaultImg.className = 'w-6 h-6 rounded-full object-cover border border-gray-200';
          defaultImg.style.display = 'none';
          
          // Create text fallback as final backup
          const textFallback = document.createElement('div');
          textFallback.className = 'w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-medium border border-gray-200';
          textFallback.style.display = 'none';
          textFallback.textContent = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
          
          // Handle image loading failures
          img.onerror = function() {
            console.log('📸 User profile image failed to load, using default image');
            this.style.display = 'none';
            defaultImg.style.display = 'block';
          };
          
          // Handle default image failure too
          defaultImg.onerror = function() {
            console.log('📸 Default profile image failed to load, using text fallback');
            this.style.display = 'none';
            textFallback.style.display = 'flex';
          };
          
          container.appendChild(img);
          container.appendChild(defaultImg);
          container.appendChild(textFallback);
        } else {
          // No photo URL, use default image first
          const defaultImg = document.createElement('img');
          defaultImg.src = defaultProfileImage;
          defaultImg.alt = 'Default Profile';
          defaultImg.className = 'w-6 h-6 rounded-full object-cover border border-gray-200';
          
          // Text fallback if default image fails
          const textFallback = document.createElement('div');
          textFallback.className = 'w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-medium border border-gray-200';
          textFallback.style.display = 'none';
          textFallback.textContent = (user.displayName || user.email || 'U').charAt(0).toUpperCase();
          
          defaultImg.onerror = function() {
            console.log('📸 Default profile image failed to load, using text fallback');
            this.style.display = 'none';
            textFallback.style.display = 'flex';
          };
          
          container.appendChild(defaultImg);
          container.appendChild(textFallback);
        }
        
        // Create name span
        const nameSpan = document.createElement('span');
        nameSpan.className = 'hidden sm:inline';
        nameSpan.textContent = user.displayName || user.email;
        container.appendChild(nameSpan);
        
        // Create dropdown arrow
        const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.setAttribute('class', 'w-4 h-4');
        svg.setAttribute('fill', 'none');
        svg.setAttribute('stroke', 'currentColor');
        svg.setAttribute('viewBox', '0 0 24 24');
        
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.setAttribute('stroke-linecap', 'round');
        path.setAttribute('stroke-linejoin', 'round');
        path.setAttribute('stroke-width', '2');
        path.setAttribute('d', 'M19 9l-7 7-7-7');
        
        svg.appendChild(path);
        container.appendChild(svg);
        
        // Add container to profile toggle
        profileToggle.appendChild(container);
      }
      
      // Check if user is admin and show/hide admin panel link
      await checkAndShowAdminLink(user);
    }
  } else {
    // User is signed out - show login button
    if (authButton) {
      authButton.style.display = 'flex';
      authButton.innerHTML = `
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
        <span data-i18n="auth.login">Login</span>
      `;
      // Reset the onclick handler for login
      authButton.onclick = () => openAuthModal('login');
    }
    if (userProfile) {
      userProfile.style.display = 'none';
      userProfile.classList.add('hidden');
    }
    
    // Hide admin panel link
    const adminLink = document.getElementById('admin-panel-link');
    if (adminLink) {
      adminLink.classList.add('hidden');
    }
  }
  
  // Apply translations after updating UI
  if (window.applyTranslations) {
    window.applyTranslations();
  }
}

// Check if user is admin and show admin panel link
async function checkAndShowAdminLink(user) {
  try {
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    const adminLink = document.getElementById('admin-panel-link');
    
    if (adminLink && userDoc.exists()) {
      const userData = userDoc.data();
      
      // Check if user has admin role in Firebase
      const isAdmin = userData.role === 'admin';
      
      console.log('Admin check:', {
        userId: user.uid,
        email: user.email,
        userRole: userData.role,
        isAdmin: isAdmin
      });
      
      if (isAdmin) {
        adminLink.classList.remove('hidden');
        console.log('Admin panel link shown for user:', user.email);
      } else {
        adminLink.classList.add('hidden');
        console.log('Admin panel link hidden - user role:', userData.role);
      }
    } else if (adminLink) {
      adminLink.classList.add('hidden');
      console.log('Admin panel link hidden - no user document found');
    }
  } catch (error) {
    console.error('Error checking admin status:', error);
    // Hide admin link on error
    const adminLink = document.getElementById('admin-panel-link');
    if (adminLink) {
      adminLink.classList.add('hidden');
    }
  }
}

// Register function
async function registerUser(email, password, fullName) {
  if (!checkFirebaseConfig()) {
    return { success: false, error: 'Firebase is not properly configured. Please contact support.' };
  }
  
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    
    // Save additional user info to Firestore
    await setDoc(doc(db, 'users', user.uid), {
      fullName: fullName,
      email: email,
      createdAt: new Date(),
      orders: []
    });
    
    console.log('User registered successfully');
    closeAuthModal();
    return { success: true, user };
  } catch (error) {
    console.error('Registration error:', error);
    return { success: false, error: handleFirebaseError(error) };
  }
}

// Login function
async function loginUser(email, password) {
  if (!checkFirebaseConfig()) {
    return { success: false, error: 'Firebase is not properly configured. Please contact support.' };
  }
  
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('User logged in successfully');
    closeAuthModal();
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: handleFirebaseError(error) };
  }
}

// Google Sign-In
async function signInWithGoogle() {
  if (!checkFirebaseConfig()) {
    return { success: false, error: 'Firebase is not properly configured. Please contact support.' };
  }
  
  try {
    const result = await signInWithPopup(auth, googleProvider);
    const user = result.user;
    
    // Check if user document exists, create if not
    const userDoc = await getDoc(doc(db, 'users', user.uid));
    if (!userDoc.exists()) {
      await setDoc(doc(db, 'users', user.uid), {
        fullName: user.displayName,
        email: user.email,
        createdAt: new Date(),
        orders: []
      });
    }
    
    console.log('Google sign-in successful');
    closeAuthModal();
    return { success: true, user };
  } catch (error) {
    console.error('Google sign-in error:', error);
    
    // Special handling for unauthorized domain error
    if (error.code === 'auth/unauthorized-domain') {
      console.error('🚨 DOMAIN AUTHORIZATION REQUIRED:');
      console.error('Current domain:', window.location.hostname);
      console.error('Add this domain to Firebase Console → Authentication → Settings → Authorized domains');
      console.error('Firebase Console: https://console.firebase.google.com/project/' + firebaseConfig.projectId + '/authentication/settings');
    }
    
    return { success: false, error: handleFirebaseError(error) };
  }
}

// Logout function
async function logoutUser() {
  try {
    await signOut(auth);
    console.log('User logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
  }
}

// Password reset
async function resetPassword(email) {
  try {
    await sendPasswordResetEmail(auth, email);
    return { success: true };
  } catch (error) {
    console.error('Password reset error:', error);
    return { success: false, error: error.message };
  }
}

// Load user's saved cart
// Save user's cart
async function saveUserCart(cartItems) {
  if (!currentUser) return;
  
  try {
    await setDoc(doc(db, 'users', currentUser.uid), {
      savedCart: cartItems || [],
      lastCartUpdate: new Date().toISOString()
    }, { merge: true });
    console.log('Cart saved to Firebase');
  } catch (error) {
    console.error('Error saving user cart:', error);
  }
}

// Get user's saved cart
async function getUserCart() {
  if (!currentUser) return [];
  
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      return userData.savedCart || [];
    }
    return [];
  } catch (error) {
    console.error('Error getting user cart:', error);
    return [];
  }
}

// UI Functions
function openAuthModal(mode = 'login') {
  const modal = document.getElementById('auth-modal');
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const modalTitle = document.getElementById('auth-modal-title');
  
  if (mode === 'register') {
    loginForm.classList.add('hidden');
    registerForm.classList.remove('hidden');
    modalTitle.textContent = 'Create Account';
  } else {
    loginForm.classList.remove('hidden');
    registerForm.classList.add('hidden');
    modalTitle.textContent = 'Sign In';
  }
  
  modal.classList.remove('hidden');
}

function closeAuthModal() {
  document.getElementById('auth-modal').classList.add('hidden');
  // Clear forms
  document.getElementById('login-email').value = '';
  document.getElementById('login-password').value = '';
  document.getElementById('register-name').value = '';
  document.getElementById('register-email').value = '';
  document.getElementById('register-password').value = '';
}

function switchAuthMode(mode) {
  openAuthModal(mode);
}

// Toggle user profile dropdown
function toggleUserDropdown() {
  const dropdown = document.getElementById('profile-dropdown');
  if (dropdown) {
    dropdown.classList.toggle('hidden');
  }
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
  const userProfile = document.getElementById('user-profile');
  const dropdown = document.getElementById('profile-dropdown');
  if (userProfile && dropdown && !userProfile.contains(event.target)) {
    dropdown.classList.add('hidden');
  }
});

// Export functions for global use
window.firebaseAuth = {
  registerUser,
  loginUser,
  signInWithGoogle,
  logoutUser,
  resetPassword,
  openAuthModal,
  closeAuthModal,
  switchAuthMode,
  toggleUserDropdown,
  saveUserCart,
  getUserCart,
  getCurrentUser: () => currentUser
};

export { 
  registerUser, 
  loginUser, 
  signInWithGoogle, 
  logoutUser, 
  resetPassword, 
  openAuthModal, 
  closeAuthModal, 
  switchAuthMode,
  saveUserCart,
  getUserCart,
  currentUser 
};