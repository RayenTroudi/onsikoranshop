/**
 * ONSi Admin Panel JavaScript
 * Complete admin management system integrated with Firebase Authentication
 */

// Import Firebase modules
import { getFirestore, doc, getDoc, collection, getDocs, addDoc, updateDoc, deleteDoc, query, orderBy } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.13.0/firebase-auth.js';

class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.products = [];
        this.orders = [];
        this.currentSection = 'products';
        this.editingProductId = null;
        this.db = null;
        this.isRedirecting = false;
        this.interfaceShown = false;
        
        this.init();
    }

    init() {
        console.log('🚀 Admin Panel initializing...');
        this.updateLoadingStatus('Waiting for Firebase...');
        
        // Wait for Firebase to be ready
        this.waitForFirebase().then(() => {
            console.log('✅ Firebase ready');
            this.updateLoadingStatus('Setting up database...');
            this.db = getFirestore();
            this.loadSampleData();
            this.bindEvents();
            this.updateLoadingStatus('Checking authentication...');
            this.checkAuthStatus();
        }).catch(error => {
            console.error('❌ Firebase initialization failed:', error);
            this.updateLoadingStatus('Failed to load Firebase');
        });
    }

    updateLoadingStatus(status) {
        const statusElement = document.getElementById('loading-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
        console.log('📝 Status:', status);
    }

    async waitForFirebase() {
        // Wait for Firebase auth to be loaded
        let attempts = 0;
        while (!window.firebaseAuth && attempts < 100) {
            await this.delay(100);
            attempts++;
        }
        if (!window.firebaseAuth) {
            throw new Error('Firebase authentication not loaded');
        }
        
        // Wait for Firebase auth to initialize and check for user
        console.log('🔄 Waiting for Firebase auth to initialize...');
        let authAttempts = 0;
        while (authAttempts < 50) {
            const user = window.firebaseAuth.getCurrentUser();
            if (user !== undefined) { // undefined means still loading, null means no user
                console.log('✅ Firebase auth initialized, user:', user ? user.email : 'None');
                break;
            }
            await this.delay(200);
            authAttempts++;
        }
    }

    // Load sample data (replace with API calls)
    loadSampleData() {
        this.products = [
            {
                id: '1',
                name: 'Quranic Verses Box',
                description: 'A curated set of 51 beautifully designed cards featuring uplifting ayat in Arabic with English reflections. Gift-ready velvet box.',
                price: 120.00,
                category: 'cards',
                stock: 50,
                status: 'active',
                image: 'product-main.jpg',
                createdAt: new Date('2024-01-15')
            }
        ];

        this.orders = [
            {
                id: 'ORD-001',
                customerName: 'Ahmed Ben Ali',
                customerEmail: 'ahmed@example.com',
                date: new Date('2024-10-10'),
                total: 120.00,
                status: 'pending',
                items: [
                    { name: 'Quranic Verses Box', quantity: 1, price: 120.00 }
                ]
            }
        ];
    }

    // Event Bindings
    bindEvents() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                const section = e.currentTarget.dataset.section;
                this.switchSection(section);
            });
        });

        // Logout - use Firebase logout
        document.getElementById('admin-logout').addEventListener('click', () => {
            this.handleLogout();
        });

        // Add product button
        document.getElementById('add-product-btn').addEventListener('click', () => {
            this.openProductModal();
        });

        // Product modal events
        document.getElementById('close-product-modal').addEventListener('click', () => {
            this.closeProductModal();
        });

        document.getElementById('cancel-product').addEventListener('click', () => {
            this.closeProductModal();
        });

        // Product form
        document.getElementById('product-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveProduct();
        });

        // Image preview
        document.getElementById('product-image').addEventListener('change', (e) => {
            this.previewImage(e.target.files[0]);
        });

        // Delete modal events
        document.getElementById('cancel-delete').addEventListener('click', () => {
            this.closeDeleteModal();
        });

        document.getElementById('confirm-delete').addEventListener('click', () => {
            this.deleteProduct();
        });

        // Search and filter
        document.getElementById('search-products').addEventListener('input', (e) => {
            this.filterProducts();
        });

        document.getElementById('filter-category').addEventListener('change', (e) => {
            this.filterProducts();
        });

        // Settings form
        document.getElementById('settings-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.saveSettings();
        });
    }

    // Authentication with Firebase
    async checkAuthStatus() {
        console.log('🔐 Checking authentication status...');
        
        if (!window.firebaseAuth) {
            console.log('❌ Firebase Auth not available');
            this.updateLoadingStatus('Firebase Auth not loaded');
            return;
        }

        console.log('✅ Firebase Auth available');
        
        // Wait for Firebase auth state to settle
        await this.waitForAuthState();
        
        // Check both our wrapper and direct Firebase auth
        let currentFirebaseUser = window.firebaseAuth.getCurrentUser();
        
        // If our wrapper doesn't have the user, try direct Firebase auth
        if (!currentFirebaseUser) {
            try {
                const auth = getAuth();
                currentFirebaseUser = auth.currentUser;
                console.log('👤 Checked direct Firebase auth:', currentFirebaseUser ? currentFirebaseUser.email : 'None');
            } catch (error) {
                console.error('❌ Error checking direct Firebase auth:', error);
            }
        }
        
        console.log('👤 Final auth check - Current Firebase user:', currentFirebaseUser ? currentFirebaseUser.email : 'None');
        
        if (currentFirebaseUser) {
            this.checkAdminPermissions(currentFirebaseUser);
        } else {
            console.log('❌ No authenticated user found after waiting');
            this.redirectToLogin();
        }
    }

    async waitForAuthState() {
        console.log('⏳ Waiting for Firebase auth state to be ready...');
        
        return new Promise((resolve) => {
            let resolved = false;
            
            try {
                const auth = getAuth();
                console.log('� Setting up Firebase auth state listener...');
                
                const unsubscribe = onAuthStateChanged(auth, (user) => {
                    console.log('🔄 Firebase auth state changed:', user ? user.email : 'No user');
                    
                    if (!resolved) {
                        resolved = true;
                        unsubscribe(); // Stop listening
                        resolve();
                    }
                });
                
                // Fallback timeout
                setTimeout(() => {
                    if (!resolved) {
                        console.log('⏰ Auth state wait timeout, proceeding anyway...');
                        resolved = true;
                        try { unsubscribe(); } catch (e) {}
                        resolve();
                    }
                }, 5000);
                
            } catch (error) {
                console.error('❌ Error setting up auth state listener:', error);
                resolved = true;
                resolve();
            }
        });
    }



    async checkAdminPermissions(user) {
        if (this.currentUser || this.interfaceShown || this.isRedirecting) {
            console.log('⚠️ Admin permissions already checked or interface shown, skipping');
            return;
        }
        
        try {
            console.log('🔍 Checking admin permissions for user:', user.email);
            this.updateLoadingStatus('Verifying admin permissions...');
            
            // Check if user has admin role in Firestore
            const userDoc = await getDoc(doc(this.db, 'users', user.uid));
            
            if (userDoc.exists()) {
                const userData = userDoc.data();
                
                // Check if user has admin role in Firebase
                const isAdmin = userData.role === 'admin';
                
                console.log('✅ User document found. Admin permission check:', {
                    userId: user.uid,
                    email: user.email,
                    userRole: userData.role,
                    isAdmin: isAdmin
                });
                
                if (isAdmin) {
                    console.log('🎉 User is admin, setting up interface...');
                    this.currentUser = {
                        ...user,
                        ...userData,
                        isAdmin: true
                    };
                    this.showAdminInterface();
                    this.showNotification('Welcome back, Admin!', 'success');
                } else {
                    console.log('❌ User is not admin, showing access denied');
                    this.showAccessDenied();
                }
            } else {
                console.log('❌ User document does not exist in Firestore');
                // User document doesn't exist, definitely not admin
                this.showAccessDenied();
            }
        } catch (error) {
            console.error('❌ Error checking admin permissions:', error);
            this.showAccessDenied();
        }
    }

    handleLogout() {
        if (window.firebaseAuth) {
            window.firebaseAuth.logoutUser();
        }
        this.currentUser = null;
        this.redirectToLogin();
        this.showNotification('Logged out successfully', 'info');
    }

    redirectToLogin() {
        if (this.isRedirecting || this.interfaceShown) {
            console.log('⚠️ Already redirecting or interface shown, skipping redirect');
            return;
        }
        
        console.log('🔄 No user authenticated - redirecting to login');
        this.isRedirecting = true;
        this.updateLoadingStatus('Please sign in to continue...');
        
        // Wait a moment then redirect
        setTimeout(() => {
            window.location.href = 'index.html?admin=true';
        }, 2000);
    }

    showAccessDenied() {
        console.log('🚫 Access denied - showing access denied modal');
        
        // Hide loading screen
        const loadingScreen = document.getElementById('admin-loading');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
        
        // Show access denied modal
        const accessDeniedModal = document.getElementById('access-denied-modal');
        if (accessDeniedModal) {
            accessDeniedModal.classList.remove('hidden');
        }
        
        // Hide admin interface
        const adminInterface = document.getElementById('admin-interface');
        if (adminInterface) {
            adminInterface.classList.add('hidden');
        }
    }

    async requestAdminAccess() {
        const currentUser = window.firebaseAuth?.getCurrentUser();
        if (currentUser) {
            // In a real implementation, this would send a request to admin
            // For now, just show a notification
            this.showNotification('Admin access request sent. You will be contacted if approved.', 'info');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 2000);
        }
    }

    showAdminInterface() {
        if (this.interfaceShown) {
            console.log('⚠️ Interface already shown, skipping');
            return;
        }
        
        console.log('🎉 Showing admin interface for:', this.currentUser.email);
        this.updateLoadingStatus('Loading interface...');
        this.interfaceShown = true;
        
        // Hide loading screen
        const loadingScreen = document.getElementById('admin-loading');
        if (loadingScreen) {
            loadingScreen.classList.add('hidden');
        }
        
        // Show admin interface
        const loginModal = document.getElementById('admin-login-modal');
        if (loginModal) {
            loginModal.classList.add('hidden');
        }
        
        const adminInterface = document.getElementById('admin-interface');
        if (adminInterface) {
            adminInterface.classList.remove('hidden');
        } else {
            console.error('❌ Admin interface element not found!');
            return;
        }
        
        // Update user email
        const userEmailElement = document.getElementById('admin-user-email');
        if (userEmailElement) {
            userEmailElement.textContent = this.currentUser.email;
        }
        
        this.updateDashboardStats();
        this.renderProducts();
        this.renderOrders();
        
        console.log('✅ Admin interface shown successfully');
    }

    // Section Navigation
    switchSection(section) {
        // Update navigation active state
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active', 'bg-slate-600');
        });
        document.querySelector(`[data-section="${section}"]`).classList.add('active', 'bg-slate-600');

        // Hide all sections
        document.querySelectorAll('.section').forEach(sec => {
            sec.classList.add('hidden');
        });

        // Show selected section
        document.getElementById(`${section}-section`).classList.remove('hidden');

        // Update page title
        const titles = {
            dashboard: { title: 'Dashboard', subtitle: 'Overview of your business' },
            products: { title: 'Products Management', subtitle: 'Manage your product catalog' },
            orders: { title: 'Orders Management', subtitle: 'Track and manage customer orders' },
            settings: { title: 'System Settings', subtitle: 'Configure your application' }
        };

        const pageInfo = titles[section];
        document.getElementById('page-title').textContent = pageInfo.title;
        document.getElementById('page-subtitle').textContent = pageInfo.subtitle;

        // Show/hide add product button
        const addBtn = document.getElementById('add-product-btn');
        if (section === 'products') {
            addBtn.classList.remove('hidden');
        } else {
            addBtn.classList.add('hidden');
        }

        this.currentSection = section;
    }

    // Dashboard
    updateDashboardStats() {
        document.getElementById('total-products').textContent = this.products.length;
        document.getElementById('total-orders').textContent = this.orders.length;
        
        const revenue = this.orders.reduce((sum, order) => sum + order.total, 0);
        document.getElementById('total-revenue').textContent = `${revenue.toFixed(2)} TND`;
        
        document.getElementById('total-customers').textContent = new Set(this.orders.map(o => o.customerEmail)).size;

        // Update recent activity
        const recentActivity = document.getElementById('recent-activity');
        if (this.orders.length > 0) {
            const recent = this.orders.slice(-3).reverse();
            recentActivity.innerHTML = recent.map(order => `
                <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                        <p class="font-medium text-gray-900">New order from ${order.customerName}</p>
                        <p class="text-sm text-gray-600">${this.formatDate(order.date)}</p>
                    </div>
                    <span class="text-green-600 font-semibold">${order.total.toFixed(2)} TND</span>
                </div>
            `).join('');
        }
    }

    // Products Management
    renderProducts() {
        const tbody = document.getElementById('products-table-body');
        
        if (this.products.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-gray-500">No products found</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.products.map(product => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            <img class="h-10 w-10 rounded-lg object-cover" src="${product.image}" alt="${product.name}">
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${product.name}</div>
                            <div class="text-sm text-gray-500">${product.description.substring(0, 50)}...</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                        ${this.capitalizeFirst(product.category)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${product.price.toFixed(2)} TND
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${product.stock}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getStatusColor(product.status)}">
                        ${this.capitalizeFirst(product.status)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                    <button onclick="adminPanel.editProduct('${product.id}')" class="text-indigo-600 hover:text-indigo-900">
                        <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path>
                        </svg>
                        Edit
                    </button>
                    <button onclick="adminPanel.confirmDeleteProduct('${product.id}')" class="text-red-600 hover:text-red-900 ml-2">
                        <svg class="w-4 h-4 inline" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                        </svg>
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    filterProducts() {
        const searchTerm = document.getElementById('search-products').value.toLowerCase();
        const categoryFilter = document.getElementById('filter-category').value;
        
        let filteredProducts = this.products;

        if (searchTerm) {
            filteredProducts = filteredProducts.filter(product => 
                product.name.toLowerCase().includes(searchTerm) ||
                product.description.toLowerCase().includes(searchTerm)
            );
        }

        if (categoryFilter) {
            filteredProducts = filteredProducts.filter(product => 
                product.category === categoryFilter
            );
        }

        // Temporarily store original products and render filtered
        const originalProducts = this.products;
        this.products = filteredProducts;
        this.renderProducts();
        this.products = originalProducts;
    }

    // Product Modal Management
    openProductModal(productId = null) {
        this.editingProductId = productId;
        const modal = document.getElementById('product-modal');
        const title = document.getElementById('product-modal-title');
        const form = document.getElementById('product-form');
        
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        
        if (productId) {
            title.textContent = 'Edit Product';
            this.populateProductForm(productId);
        } else {
            title.textContent = 'Add New Product';
            form.reset();
            document.getElementById('image-preview').classList.add('hidden');
        }
    }

    closeProductModal() {
        const modal = document.getElementById('product-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        this.editingProductId = null;
    }

    populateProductForm(productId) {
        const product = this.products.find(p => p.id === productId);
        if (!product) return;

        document.getElementById('product-id').value = product.id;
        document.getElementById('product-name').value = product.name;
        document.getElementById('product-description').value = product.description;
        document.getElementById('product-price').value = product.price;
        document.getElementById('product-category').value = product.category;
        document.getElementById('product-stock').value = product.stock;
        document.getElementById('product-status').value = product.status;
        
        if (product.image) {
            document.getElementById('image-preview').classList.remove('hidden');
            document.getElementById('preview-img').src = product.image;
        }
    }

    async saveProduct() {
        const saveBtn = document.getElementById('save-product');
        const saveBtnText = document.getElementById('save-product-text');
        const saveBtnLoading = document.getElementById('save-product-loading');

        // Show loading state
        saveBtn.disabled = true;
        saveBtnText.textContent = this.editingProductId ? 'Updating...' : 'Saving...';
        saveBtnLoading.classList.remove('hidden');

        try {
            // Simulate API call
            await this.delay(1000);

            const formData = new FormData();
            const productData = {
                id: this.editingProductId || this.generateId(),
                name: document.getElementById('product-name').value,
                description: document.getElementById('product-description').value,
                price: parseFloat(document.getElementById('product-price').value),
                category: document.getElementById('product-category').value,
                stock: parseInt(document.getElementById('product-stock').value),
                status: document.getElementById('product-status').value,
                image: 'product-main.jpg', // Default image
                createdAt: new Date()
            };

            // Handle image upload (in real implementation, upload to server)
            const imageFile = document.getElementById('product-image').files[0];
            if (imageFile) {
                // In real implementation, upload image to server and get URL
                productData.image = URL.createObjectURL(imageFile);
            }

            if (this.editingProductId) {
                // Update existing product
                const index = this.products.findIndex(p => p.id === this.editingProductId);
                if (index !== -1) {
                    this.products[index] = { ...this.products[index], ...productData };
                    this.showNotification('Product updated successfully!', 'success');
                }
            } else {
                // Add new product
                this.products.push(productData);
                this.showNotification('Product added successfully!', 'success');
            }

            this.renderProducts();
            this.updateDashboardStats();
            this.closeProductModal();

        } catch (error) {
            this.showNotification('Error saving product: ' + error.message, 'error');
        } finally {
            // Reset button state
            saveBtn.disabled = false;
            saveBtnText.textContent = 'Save Product';
            saveBtnLoading.classList.add('hidden');
        }
    }

    editProduct(productId) {
        this.openProductModal(productId);
    }

    confirmDeleteProduct(productId) {
        this.productToDelete = productId;
        const modal = document.getElementById('delete-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }

    closeDeleteModal() {
        const modal = document.getElementById('delete-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        this.productToDelete = null;
    }

    async deleteProduct() {
        if (!this.productToDelete) return;

        try {
            // Simulate API call
            await this.delay(500);

            this.products = this.products.filter(p => p.id !== this.productToDelete);
            this.renderProducts();
            this.updateDashboardStats();
            this.closeDeleteModal();
            this.showNotification('Product deleted successfully!', 'success');

        } catch (error) {
            this.showNotification('Error deleting product: ' + error.message, 'error');
        }
    }

    // Orders Management
    renderOrders() {
        const tbody = document.getElementById('orders-table-body');
        
        if (this.orders.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-4 text-center text-gray-500">No orders found</td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = this.orders.map(order => `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    ${order.id}
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm font-medium text-gray-900">${order.customerName}</div>
                    <div class="text-sm text-gray-500">${order.customerEmail}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${this.formatDate(order.date)}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    ${order.total.toFixed(2)} TND
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${this.getOrderStatusColor(order.status)}">
                        ${this.capitalizeFirst(order.status)}
                    </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="adminPanel.viewOrderDetails('${order.id}')" class="text-indigo-600 hover:text-indigo-900">
                        View Details
                    </button>
                </td>
            </tr>
        `).join('');
    }

    viewOrderDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (order) {
            alert(`Order Details:\n\nID: ${order.id}\nCustomer: ${order.customerName}\nEmail: ${order.customerEmail}\nTotal: ${order.total} TND\nStatus: ${order.status}`);
        }
    }

    // Settings Management
    async saveSettings() {
        try {
            // Simulate API call
            await this.delay(1000);

            const settings = {
                siteName: document.getElementById('site-name').value,
                adminEmail: document.getElementById('admin-email-setting').value,
                defaultCurrency: document.getElementById('default-currency').value,
                taxRate: parseFloat(document.getElementById('tax-rate').value)
            };

            // In real implementation, save to database
            localStorage.setItem('adminSettings', JSON.stringify(settings));
            
            this.showNotification('Settings saved successfully!', 'success');

        } catch (error) {
            this.showNotification('Error saving settings: ' + error.message, 'error');
        }
    }

    // Image Preview
    previewImage(file) {
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            document.getElementById('image-preview').classList.remove('hidden');
            document.getElementById('preview-img').src = e.target.result;
        };
        reader.readAsDataURL(file);
    }

    // Utility Functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    formatDate(date) {
        return new Intl.DateTimeFormat('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        }).format(new Date(date));
    }

    getStatusColor(status) {
        const colors = {
            active: 'bg-green-100 text-green-800',
            inactive: 'bg-red-100 text-red-800',
            draft: 'bg-yellow-100 text-yellow-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }

    getOrderStatusColor(status) {
        const colors = {
            pending: 'bg-yellow-100 text-yellow-800',
            processing: 'bg-blue-100 text-blue-800',
            shipped: 'bg-purple-100 text-purple-800',
            delivered: 'bg-green-100 text-green-800',
            cancelled: 'bg-red-100 text-red-800'
        };
        return colors[status] || 'bg-gray-100 text-gray-800';
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Notification System
    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        
        const colors = {
            success: 'bg-green-500',
            error: 'bg-red-500',
            warning: 'bg-yellow-500',
            info: 'bg-blue-500'
        };

        const icons = {
            success: '✓',
            error: '✕',
            warning: '⚠',
            info: 'ℹ'
        };

        notification.className = `notification ${colors[type]} text-white px-6 py-4 rounded-lg shadow-lg flex items-center space-x-3`;
        notification.innerHTML = `
            <span class="text-xl">${icons[type]}</span>
            <span>${message}</span>
        `;

        container.appendChild(notification);

        // Auto remove after 3 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 3000);
    }
}

// Check required DOM elements
function checkRequiredElements() {
    const requiredElements = [
        'admin-loading',
        'admin-interface', 
        'access-denied-modal',
        'loading-status'
    ];
    
    const missing = requiredElements.filter(id => !document.getElementById(id));
    
    if (missing.length > 0) {
        console.error('❌ Missing required elements:', missing);
        return false;
    }
    
    console.log('✅ All required DOM elements found');
    return true;
}

// Initialize Admin Panel when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM loaded, checking elements...');
    
    if (checkRequiredElements()) {
        console.log('🚀 Starting Admin Panel...');
        const adminPanel = new AdminPanel();
        
        // Global functions for onclick handlers
        window.adminPanel = adminPanel;
    } else {
        console.error('❌ Cannot start Admin Panel - missing required elements');
    }
});