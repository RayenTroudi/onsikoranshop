// Firebase Configuration and Authentication
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-app.js';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';
import { getFirestore, doc, setDoc, getDoc } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDZw3QJBDlsn10pBbtQmBU61Nfa9bMUFx4",
  authDomain: "onsi-de85f.firebaseapp.com",
  projectId: "onsi-de85f",
  storageBucket: "onsi-de85f.firebasestorage.app",
  messagingSenderId: "304484751803",
  appId: "1:304484751803:web:4031fad794705c0bac8c9e",
  measurementId: "G-5MF3MSH2J5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

// Authentication State Management
let currentUser = null;

// Auth state observer
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  updateAuthUI(user);
  if (user) {
    console.log('User signed in:', user.email);
    // Load user's saved cart if any
    loadUserCart();
  } else {
    console.log('User signed out');
  }
});

// Update UI based on authentication state
function updateAuthUI(user) {
  const authButton = document.getElementById('auth-button');
  const userProfile = document.getElementById('user-profile');
  const authModal = document.getElementById('auth-modal');
  
  if (user) {
    // User is signed in
    if (authButton) {
      authButton.innerHTML = `
        <div class="flex items-center gap-2">
          <img src="${user.photoURL || 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>'}" 
               alt="Profile" class="w-6 h-6 rounded-full">
          <span class="hidden sm:inline">${user.displayName || user.email}</span>
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path>
          </svg>
        </div>
      `;
    }
  } else {
    // User is signed out
    if (authButton) {
      authButton.innerHTML = `
        <svg class="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
        </svg>
        <span data-i18n="auth.login">Login</span>
      `;
    }
  }
  
  // Apply translations after updating UI
  if (window.applyTranslations) {
    window.applyTranslations();
  }
}

// Register function
async function registerUser(email, password, fullName) {
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
    return { success: false, error: error.message };
  }
}

// Login function
async function loginUser(email, password) {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('User logged in successfully');
    closeAuthModal();
    return { success: true, user: userCredential.user };
  } catch (error) {
    console.error('Login error:', error);
    return { success: false, error: error.message };
  }
}

// Google Sign-In
async function signInWithGoogle() {
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
    return { success: false, error: error.message };
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
async function loadUserCart() {
  if (!currentUser) return;
  
  try {
    const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
    if (userDoc.exists()) {
      const userData = userDoc.data();
      if (userData.savedCart) {
        // Restore saved cart items
        state.items = userData.savedCart;
        renderCart();
      }
    }
  } catch (error) {
    console.error('Error loading user cart:', error);
  }
}

// Save user's cart
async function saveUserCart() {
  if (!currentUser) return;
  
  try {
    await setDoc(doc(db, 'users', currentUser.uid), {
      savedCart: state.items
    }, { merge: true });
  } catch (error) {
    console.error('Error saving user cart:', error);
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
  saveUserCart,
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
  currentUser 
};