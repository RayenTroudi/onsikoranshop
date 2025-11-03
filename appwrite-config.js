// Appwrite Configuration and Authentication
import { Client, Account, Databases, Storage, ID, Permission, Role, Query } from 'https://cdn.skypack.dev/appwrite@15.0.0';

// Enhanced error suppression for browser extensions
(function() {
    // Additional suppression for any errors that slip through
    const extensionPatterns = [
        'trust wallet',
        'onetap.js',
        'content_script_bundle.js', 
        'metamask',
        'coinbase',
        'phantom',
        'extension',
        'attempting initialization',
        'not ready',
        'generator.next',
        'self-xss',
        'chrome-extension',
        'moz-extension'
    ];
    
    function isExtensionError(message) {
        const lowerMessage = String(message).toLowerCase();
        return extensionPatterns.some(pattern => lowerMessage.includes(pattern));
    }
    
    // Intercept and suppress extension errors
    const originalError = console.error;
    console.error = function(...args) {
        const message = args.join(' ');
        if (isExtensionError(message)) {
            return; // Completely block extension errors
        }
        originalError.apply(console, args);
    };
    
    // Block extension timeouts that cause repeated errors
    const originalSetTimeout = window.setTimeout;
    window.setTimeout = function(fn, delay) {
        const fnStr = String(fn);
        if (isExtensionError(fnStr)) {
            return; // Block problematic extension timeouts
        }
        return originalSetTimeout.apply(window, arguments);
    };
})();

// Appwrite configuration - using environment variables
const APPWRITE_CONFIG = {
    endpoint: window.ENV?.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1',
    projectId: window.ENV?.VITE_APPWRITE_PROJECT_ID || '68f8c1bc003e3d2c8f5c',
    databaseId: 'onsi',
    // Collection IDs (we'll create these in Appwrite)
    collections: {
        users: 'users',
        products: 'products',
        orders: 'orders',
        categories: 'categories'
    },
    // Storage bucket ID
    bucketId: 'onsiBucket'
};

// Initialize Appwrite client
const client = new Client()
    .setEndpoint(APPWRITE_CONFIG.endpoint)
    .setProject(APPWRITE_CONFIG.projectId);

// Initialize services
const account = new Account(client);
const databases = new Databases(client);
const storage = new Storage(client);

// Debug information
console.log('🚀 Appwrite Debug Info:');
console.log('Current domain:', window.location.hostname);
console.log('Current origin:', window.location.origin);
console.log('Appwrite endpoint:', APPWRITE_CONFIG.endpoint);
console.log('Appwrite project:', APPWRITE_CONFIG.projectId);
console.log('Environment vars available:', !!window.ENV);

// Authentication State Management
let currentUser = null;
let sessionCheckPromise = null; // Track if session check is in progress

// Auth state observer
let authStateListeners = [];

function subscribeToAuthState(callback) {
    authStateListeners.push(callback);
}

function notifyAuthStateChange(user) {
    currentUser = user;
    authStateListeners.forEach(callback => callback(user));
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
}

// Admin functions (for authenticated admin users only)
async function isUserAdmin(user) {
    try {
        if (!user) return false;
        
        // Check if user has admin role
        return user.role === 'admin';
    } catch (error) {
        console.error('Error checking admin status:', error);
        return false;
    }
}

// Enhanced admin check with role-based access
async function checkAdminAccess() {
    try {
        const user = await account.get();
        const isAdmin = await isUserAdmin(user);
        
        if (!isAdmin) {
            throw new Error('Admin access required');
        }
        
        return { success: true, user, isAdmin: true };
    } catch (error) {
        console.error('Admin access denied:', error);
        return { success: false, error: error.message };
    }
}

// Check current session on page load
async function checkCurrentSession() {
    // If already checking, return the existing promise
    if (sessionCheckPromise) {
        console.log('⏳ Session check already in progress, waiting...');
        return sessionCheckPromise;
    }
    
    // Create the promise and store it
    sessionCheckPromise = (async () => {
        try {
            console.log('🔍 Checking current Appwrite session...');
            const session = await account.get();
            console.log('✅ Found active session:', session.email);
            
            // Fetch user document to get role
            try {
                const userDoc = await databases.getDocument(
                    APPWRITE_CONFIG.databaseId,
                    APPWRITE_CONFIG.collections.users,
                    session.$id
                );
                console.log('👤 User document fetched:', userDoc);
                console.log('📋 User role from database:', userDoc.role);
                // Merge session data with user document data
                currentUser = {
                    ...session,
                    role: userDoc.role,
                    fullName: userDoc.fullName
                };
                console.log('✅ currentUser set with role:', currentUser.role);
            } catch (docError) {
                console.log('❌ Could not fetch user document:', docError);
                currentUser = session;
            }
            
            console.log('🔍 Final currentUser object:', currentUser);
            notifyAuthStateChange(currentUser);
            return currentUser;
        } catch (error) {
            // This is expected if user is not logged in - not an error
            if (error.code === 401 || error.type === 'general_unauthorized_scope' || error.message.includes('unauthorized')) {
                console.log('ℹ️ No active session found (user not logged in)');
            } else {
                console.log('ℹ️ Session check result:', error.message);
            }
            
            // Ensure local state is cleared
            currentUser = null;
            notifyAuthStateChange(null);
            
            // Ensure UI reflects logged out state
            const authButton = document.getElementById('auth-button');
            const userProfile = document.getElementById('user-profile');
            if (authButton) authButton.classList.remove('hidden');
            if (userProfile) userProfile.classList.add('hidden');
            
            return null;
        }
    })();
    
    return sessionCheckPromise;
}

// Enhanced error handling
function handleAppwriteError(error) {
    console.error('Appwrite error:', error);
    
    const errorMessages = {
        'user_not_found': 'No account found with this email.',
        'user_invalid_credentials': 'Invalid email or password.',
        'user_email_already_exists': 'An account with this email already exists.',
        'user_password_mismatch': 'Passwords do not match.',
        'user_password_recently_used': 'Please choose a different password.',
        'password_recently_used': 'Please choose a different password.',
        'user_blocked': 'Your account has been blocked. Please contact support.',
        'user_session_not_found': 'Please sign in to continue.',
        'user_unauthorized': 'Unauthorized access. Please sign in.',
        'network_request_failed': 'Network error. Please check your connection.',
        'general_rate_limit_exceeded': 'Too many requests. Please try again later.',
        'general_unknown_origin': 'This domain is not authorized. Please contact support.',
        'general_server_error': 'Server error. Please try again later.',
        'general_argument_invalid': 'Invalid request. Please check your input.',
        'provider_disabled': 'This sign-in method is not enabled. Please use email/password.',
        'general_provider_failure': 'OAuth provider error. Please try again or use email/password.',
        'user_session_already_exists': 'A session is already active. Please logout first.',
        'general_session_provider_error': 'Session conflict. Please try logging out and back in.'
    };
    
    const errorCode = error.code || error.type || error.message;
    return errorMessages[errorCode] || error.message || 'An unexpected error occurred.';
}

// Update UI based on authentication state
async function updateAuthUI(user) {
    const authButton = document.getElementById('auth-button');
    const userProfile = document.getElementById('user-profile');
    const authModal = document.getElementById('auth-modal');
    
    if (user) {
        // User is signed in - show user profile
        if (authButton) {
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
                const img = document.createElement('img');
                img.src = defaultProfileImage;
                img.alt = 'Profile';
                img.className = 'w-6 h-6 rounded-full object-cover border border-gray-200';
                
                // Create text fallback
                const textFallback = document.createElement('div');
                textFallback.className = 'w-6 h-6 rounded-full bg-slate-600 flex items-center justify-center text-white text-xs font-medium border border-gray-200';
                textFallback.style.display = 'none';
                textFallback.textContent = (user.name || user.email || 'U').charAt(0).toUpperCase();
                
                img.onerror = function() {
                    console.log('📸 Profile image failed to load, using text fallback');
                    this.style.display = 'none';
                    textFallback.style.display = 'flex';
                };
                
                container.appendChild(img);
                container.appendChild(textFallback);
                
                // Create name span
                const nameSpan = document.createElement('span');
                nameSpan.className = 'hidden sm:inline';
                nameSpan.textContent = user.name || user.email;
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
        // Ensure user document exists
        const userDoc = await createUserDocument(user);
        
        const adminLink = document.getElementById('admin-panel-link');
        
        if (adminLink && userDoc) {
            // Check if user has admin role
            const isAdmin = userDoc.role === 'admin';
            
            console.log('Admin check:', {
                userId: user.$id,
                email: user.email,
                userRole: userDoc.role,
                isAdmin: isAdmin
            });
            
            if (isAdmin) {
                adminLink.classList.remove('hidden');
                console.log('Admin panel link shown for user:', user.email);
            } else {
                adminLink.classList.add('hidden');
                console.log('Admin panel link hidden - user role:', userDoc.role);
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

// Clear all sessions before authentication operations
async function clearAllSessions() {
    try {
        console.log('🧹 Clearing all sessions...');
        
        // Method 1: Delete current session
        try {
            await account.deleteSession('current');
            console.log('✅ Current session deleted');
        } catch (e) {
            console.log('ℹ️ No current session to delete');
        }
        
        // Method 2: List and delete all sessions
        try {
            const sessions = await account.listSessions();
            if (sessions.sessions && sessions.sessions.length > 0) {
                for (const session of sessions.sessions) {
                    try {
                        await account.deleteSession(session.$id);
                        console.log(`🗑️ Deleted session: ${session.$id}`);
                    } catch (e) {
                        // Continue even if individual session deletion fails
                    }
                }
            }
        } catch (e) {
            console.log('ℹ️ Could not list sessions (probably already cleared)');
        }
        
        // Clear local state
        currentUser = null;
        
        // Wait a moment for server-side cleanup
        await new Promise(resolve => setTimeout(resolve, 200));
        
        console.log('✅ All sessions cleared successfully');
        return true;
    } catch (error) {
        console.log('⚠️ Session clearing completed with warnings:', error.message);
        currentUser = null;
        return true; // Continue anyway
    }
}

// Register function
async function registerUser(email, password, fullName) {
    try {
        console.log('🔐 Starting user registration...');
        
        // Clear all existing sessions first
        await clearAllSessions();
        
        // Create account
        console.log('📝 Creating new account...');
        const user = await account.create(ID.unique(), email, password, fullName);
        console.log('✅ Account created:', user.email);
        
        // Create session
        console.log('🔑 Creating login session...');
        await account.createEmailPasswordSession(email, password);
        
        // Get the current session to get the user object
        const session = await account.get();
        console.log('✅ Session created for:', session.email);
        
        // Create user document in database
        try {
            await createUserDocument(session);
            console.log('✅ User profile created in database');
        } catch (dbError) {
            console.log('⚠️ Could not create user profile in database:', dbError.message);
            console.log('ℹ️ User account still created successfully');
        }
        
        console.log('✅ User registered successfully');
        notifyAuthStateChange(session);
        closeAuthModal();
        return { success: true, user: session };
    } catch (error) {
        console.error('❌ Registration error:', error);
        
        // Provide more helpful error messages
        if (error.message && error.message.includes('Collection')) {
            return { 
                success: false, 
                error: 'Account created successfully! However, user profile storage is not set up yet. Please create the "users" collection in your Appwrite console.' 
            };
        }
        
        return { success: false, error: handleAppwriteError(error) };
    }
}

// Login function
async function loginUser(email, password) {
    try {
        console.log('🔐 Starting user login...');
        
        // Clear all existing sessions first
        await clearAllSessions();
        
        // Create session
        console.log('🔑 Creating login session...');
        await account.createEmailPasswordSession(email, password);
        
        // Get user data with role
        const user = await account.get();
        
        // Fetch user document to get role
        try {
            const userDoc = await databases.getDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.users,
                user.$id
            );
            // Merge session data with user document data
            const fullUser = {
                ...user,
                role: userDoc.role,
                fullName: userDoc.fullName
            };
            currentUser = fullUser;
            
            console.log('✅ User logged in successfully:', fullUser.email);
            notifyAuthStateChange(fullUser);
            
            // Check if on index.html?admin=true and user is admin
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('admin') && fullUser.role === 'admin') {
                console.log('🔄 Admin logged in, redirecting to admin panel...');
                setTimeout(() => {
                    window.location.href = 'admin.html';
                }, 500);
                return { success: true, user: fullUser, redirecting: true };
            }
            
            closeAuthModal();
            return { success: true, user: fullUser };
        } catch (docError) {
            console.log('ℹ️ Could not fetch user document, using session data only');
            currentUser = user;
            notifyAuthStateChange(user);
            closeAuthModal();
            return { success: true, user };
        }
    } catch (error) {
        console.error('❌ Login error:', error);
        return { success: false, error: handleAppwriteError(error) };
    }
}

// Check if OAuth providers are configured
async function checkOAuthProviders() {
    try {
        console.log('🔍 Checking Google OAuth configuration...');
        console.log('ℹ️  Google OAuth will be tested when user clicks login button');
        console.log('📋 Make sure to configure Google provider in Appwrite console:');
        console.log('🔗 https://fra.cloud.appwrite.io/console/project-68f8c1bc003e3d2c8f5c/auth/providers');
        return true;
    } catch (error) {
        console.log('⚠️ OAuth provider check failed:', error.message);
        return false;
    }
}

// OAuth Status Display




// Generic OAuth Sign-In function
async function signInWithOAuth(provider) {
    try {
        console.log(`🔐 Initiating ${provider} OAuth...`);
        
        // Check if we're on localhost and adjust URLs accordingly
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const currentUrl = window.location.origin + window.location.pathname;
        const successUrl = isLocalhost ? 'http://localhost:8000' : currentUrl;
        const failureUrl = isLocalhost ? 'http://localhost:8000' : currentUrl;
        
        console.log('✅ Success URL:', successUrl);
        console.log('❌ Failure URL:', failureUrl);
        console.log(`🚀 Redirecting to ${provider} for authentication...`);
        
        // Initiate OAuth session
        account.createOAuth2Session(
            provider.toLowerCase(),
            successUrl,
            failureUrl
        );
        
        return { success: true };
    } catch (error) {
        console.error(`❌ ${provider} sign-in error:`, error);
        
        // Check if OAuth provider is configured
        if (error.code === 501 || error.message.includes('provider') || error.message.includes('oauth') || error.message.includes('not found')) {
            showNotification(`${provider} OAuth is not configured. Please contact support.`, 'error');
            return { 
                success: false, 
                error: `${provider} OAuth is not configured. Please contact support or use email/password login.` 
            };
        }
        
        return { success: false, error: handleAppwriteError(error) };
    }
}

// Force logout - clears all sessions
async function forceLogout() {
    try {
        console.log('🔄 Force clearing all sessions...');
        
        // Try to delete current session
        try {
            await account.deleteSession('current');
        } catch (e) {
            console.log('No current session to delete');
        }
        
        // Try to delete all sessions
        try {
            const sessions = await account.listSessions();
            for (const session of sessions.sessions) {
                try {
                    await account.deleteSession(session.$id);
                    console.log('🗑️ Deleted session:', session.$id);
                } catch (e) {
                    console.log('Could not delete session:', session.$id);
                }
            }
        } catch (e) {
            console.log('Could not list sessions');
        }
        
        // Clear local state
        currentUser = null;
        notifyAuthStateChange(null);
        closeAuthModal();
        
        console.log('✅ All sessions cleared');
        return { success: true };
    } catch (error) {
        console.error('❌ Force logout error:', error);
        // Still clear local state
        currentUser = null;
        notifyAuthStateChange(null);
        return { success: false, error: error.message };
    }
}

// Logout function
async function logoutUser() {
    try {
        console.log('🚪 Logging out user...');
        
        // Step 1: Try to delete current session
        try {
            await account.deleteSession('current');
            console.log('✅ Current session deleted');
        } catch (sessionError) {
            console.log('ℹ️ No current session to delete or already deleted');
        }
        
        // Step 2: Try to delete all sessions for extra safety
        try {
            const sessions = await account.listSessions();
            if (sessions.sessions && sessions.sessions.length > 0) {
                console.log(`🧹 Found ${sessions.sessions.length} sessions to clear`);
                for (const session of sessions.sessions) {
                    try {
                        await account.deleteSession(session.$id);
                        console.log(`🗑️ Deleted session: ${session.$id}`);
                    } catch (e) {
                        console.log(`⚠️ Could not delete session ${session.$id}:`, e.message);
                    }
                }
            }
        } catch (listError) {
            console.log('ℹ️ Could not list sessions (might already be logged out)');
        }
        
        // Step 3: Clear all local state
        currentUser = null;
        
        // Step 4: Update UI immediately
        notifyAuthStateChange(null);
        
        // Step 5: Close any open modals and dropdowns
        closeAuthModal();
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown) {
            dropdown.classList.add('hidden');
        }
        
        // Step 6: Force a session check to update UI
        setTimeout(() => {
            checkCurrentSession();
        }, 100);
        
        console.log('✅ User logged out successfully - all sessions cleared');
        
    } catch (error) {
        console.error('❌ Logout error:', error);
        // Even if logout fails, clear local state forcefully
        currentUser = null;
        notifyAuthStateChange(null);
        closeAuthModal();
        
        // Force clear UI state
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown) {
            dropdown.classList.add('hidden');
        }
        
        console.log('🔄 Forced local state clearing due to logout error');
    }
}

// Password reset
async function resetPassword(email) {
    try {
        await account.createRecovery(email, window.location.origin + '/reset-password');
        return { success: true };
    } catch (error) {
        console.error('Password reset error:', error);
        return { success: false, error: handleAppwriteError(error) };
    }
}

// Save user's cart
async function saveUserCart(cartItems) {
    if (!currentUser) return;
    
    try {
        // Ensure user document exists first
        await createUserDocument(currentUser);
        
        await databases.updateDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.collections.users,
            currentUser.$id,
            {
                savedCart: JSON.stringify(cartItems || []),
                lastCartUpdate: new Date().toISOString()
            }
        );
        console.log('✅ Cart saved to Appwrite database');
    } catch (error) {
        console.error('❌ Error saving cart to database:', error);
    }
}

// Create user document in database if it doesn't exist
async function createUserDocument(user) {
    try {
        // Try to get existing user document first
        const existingDoc = await databases.getDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.collections.users,
            user.$id
        );
        console.log('ℹ️ User document already exists');
        return existingDoc;
    } catch (error) {
        // If document doesn't exist (404), create it
        if (error.code === 404) {
            console.log('📝 Creating user document for:', user.email);
            const newUserDoc = await databases.createDocument(
                APPWRITE_CONFIG.databaseId,
                APPWRITE_CONFIG.collections.users,
                user.$id, // Use the auth user ID as document ID
                {
                    fullName: user.name || user.email.split('@')[0],
                    email: user.email,
                    role: 'user', // Default role
                    savedCart: '[]',
                    lastCartUpdate: new Date().toISOString()
                }
            );
            console.log('✅ User document created successfully');
            return newUserDoc;
        } else {
            console.error('❌ Error checking user document:', error);
            throw error;
        }
    }
}

// Make user admin (for development/setup purposes)
async function makeUserAdmin(userEmail) {
    if (!currentUser) {
        console.error('❌ No current user to make admin');
        return false;
    }
    
    try {
        // Update current user's role to admin
        await databases.updateDocument(
            APPWRITE_CONFIG.databaseId,
            APPWRITE_CONFIG.collections.users,
            currentUser.$id,
            {
                role: 'admin'
            }
        );
        console.log('✅ User upgraded to admin:', userEmail);
        
        // Refresh admin UI
        await checkAndShowAdminLink(currentUser);
        return true;
    } catch (error) {
        console.error('❌ Error making user admin:', error);
        return false;
    }
}

// Get user's saved cart
async function getUserCart() {
    if (!currentUser) return [];
    
    try {
        // Ensure user document exists and get cart
        const userDoc = await createUserDocument(currentUser);
        const cartData = userDoc.savedCart || '[]';
        return JSON.parse(cartData);
    } catch (error) {
        console.error('❌ Error getting user cart:', error);
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

// Appwrite Storage Functions
async function uploadImage(file, onProgress) {
    try {
        console.log('📤 Starting Appwrite Storage upload for:', file.name);
        
        // Validate file type
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
        if (!validTypes.includes(file.type)) {
            throw new Error('Invalid file type. Please upload a JPEG, PNG, WebP, or GIF image.');
        }
        
        // Validate file size (max 10MB)
        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            throw new Error('File is too large. Maximum size is 10MB.');
        }
        
        // Generate unique file ID
        const fileId = ID.unique();
        
        // Create upload promise with progress tracking
        const uploadPromise = storage.createFile(
            APPWRITE_CONFIG.bucketId,
            fileId,
            file
        );
        
        // Simulate progress for UI feedback since Appwrite doesn't provide real-time progress
        if (onProgress) {
            let progress = 0;
            const progressInterval = setInterval(() => {
                progress += Math.random() * 20;
                if (progress >= 90) {
                    clearInterval(progressInterval);
                    return;
                }
                onProgress(Math.min(progress, 90));
            }, 200);
            
            uploadPromise.finally(() => {
                clearInterval(progressInterval);
                onProgress(100);
            });
        }
        
        // Wait for upload to complete
        const uploadedFile = await uploadPromise;
        
        console.log('✅ Image uploaded successfully:', uploadedFile);
        
        // Get the file URL
        const fileUrl = getFileUrl(uploadedFile.$id);
        
        return {
            success: true,
            url: fileUrl,
            fileId: uploadedFile.$id,
            file: uploadedFile
        };
        
    } catch (error) {
        console.error('❌ Appwrite Storage upload failed:', error);
        return {
            success: false,
            error: error.message || 'Upload failed'
        };
    }
}

// Get file URL from Appwrite Storage
function getFileUrl(fileId) {
    const baseUrl = `${APPWRITE_CONFIG.endpoint}/storage/buckets/${APPWRITE_CONFIG.bucketId}/files/${fileId}/view`;
    return `${baseUrl}?project=${APPWRITE_CONFIG.projectId}`;
}

// Delete file from Appwrite Storage
async function deleteImage(fileId) {
    try {
        await storage.deleteFile(APPWRITE_CONFIG.bucketId, fileId);
        console.log('🗑️ Image deleted successfully:', fileId);
        return { success: true };
    } catch (error) {
        console.error('❌ Failed to delete image:', error);
        return { success: false, error: error.message };
    }
}

// Get file preview URL (for thumbnails)
function getFilePreviewUrl(fileId, width = 400, height = 400) {
    const baseUrl = `${APPWRITE_CONFIG.endpoint}/storage/buckets/${APPWRITE_CONFIG.bucketId}/files/${fileId}/preview`;
    return `${baseUrl}?project=${APPWRITE_CONFIG.projectId}&width=${width}&height=${height}&gravity=center&quality=80&output=webp`;
}

// List all files in the bucket (admin function)
async function listImages() {
    try {
        const files = await storage.listFiles(APPWRITE_CONFIG.bucketId);
        console.log('📁 Listed images:', files);
        return { success: true, files: files.files };
    } catch (error) {
        console.error('❌ Failed to list images:', error);
        return { success: false, error: error.message };
    }
}

// Initialize Appwrite on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Check for OAuth success/failure in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.has('success') || urlParams.has('error')) {
        console.log('🔄 Processing OAuth callback...');
        
        if (urlParams.has('success')) {
            console.log('✅ OAuth success detected');
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
        } else if (urlParams.has('error')) {
            console.log('❌ OAuth error detected:', urlParams.get('error'));
            // Clear URL parameters
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }
    
    console.log('🔍 Checking session and admin redirect...');
    const user = await checkCurrentSession();
    console.log('👤 User from checkCurrentSession:', user);
    
    // Check if user is trying to access admin and redirect if authenticated
    console.log('🔍 Checking URL parameters:', {
        hasAdmin: urlParams.has('admin'),
        hasUser: !!user,
        userRole: user?.role
    });
    
    if (urlParams.has('admin') && user) {
        console.log('🔄 Admin access requested, checking permissions...');
        // Check if user has admin role
        if (user.role === 'admin') {
            console.log('✅ User is admin, redirecting to admin panel...');
            window.location.href = 'admin.html';
        } else {
            console.log('❌ User is not admin, role:', user.role);
        }
    } else {
        console.log('ℹ️ No admin redirect needed:', {
            hasAdminParam: urlParams.has('admin'),
            hasUser: !!user
        });
    }

});

// Export configuration and services
export { 
    client,
    account,
    databases,
    storage,
    APPWRITE_CONFIG,
    ID,
    Permission,
    Role,
    Query
};

// Export functions for global use
window.appwriteAuth = {
    registerUser,
    loginUser,
    signInWithOAuth,
    logoutUser,
    forceLogout,
    clearAllSessions,
    resetPassword,
    openAuthModal,
    closeAuthModal,
    switchAuthMode,
    toggleUserDropdown,
    saveUserCart,
    getUserCart,
    makeUserAdmin,
    getCurrentUser: async () => {
        // If session check is in progress, wait for it
        if (sessionCheckPromise) {
            console.log('⏳ getCurrentUser: waiting for session check...');
            await sessionCheckPromise;
        }
        return currentUser;
    },
    subscribeToAuthState,
    checkCurrentSession,
    // Admin functions
    isUserAdmin,
    checkAdminAccess,
    // Storage functions
    uploadImage,
    deleteImage,
    getFileUrl,
    getFilePreviewUrl,
    listImages
};

// Debug: confirm window.appwriteAuth is set
console.log('🔧 window.appwriteAuth set:', !!window.appwriteAuth);
console.log('🔧 Available methods:', Object.keys(window.appwriteAuth));
console.log('✅ Admin access is role-based (role="admin" required)');

export { 
    registerUser, 
    loginUser, 
    signInWithOAuth,
    logoutUser, 
    forceLogout,
    resetPassword, 
    openAuthModal, 
    closeAuthModal, 
    switchAuthMode,
    saveUserCart,
    getUserCart,
    makeUserAdmin,
    currentUser,
    subscribeToAuthState,
    checkCurrentSession,
    // Admin functions
    isUserAdmin,
    checkAdminAccess,
    // Storage functions
    uploadImage,
    deleteImage,
    getFileUrl,
    getFilePreviewUrl,
    listImages
};