/**
 * ONSi Admin Panel JavaScript
 * Complete admin management system integrated with Appwrite Authentication
 */

class AdminPanel {
    constructor() {
        this.currentUser = null;
        this.products = [];
        this.orders = [];
        this.currentSection = 'products';
        this.editingProductId = null;
        this.isRedirecting = false;
        this.interfaceShown = false;
        
        this.init();
    }

    init() {
        console.log('🚀 Admin Panel initializing...');
        this.updateLoadingStatus('Waiting for Appwrite...');
        
        // Wait for Appwrite to be ready
        this.waitForAppwrite().then(async () => {
            console.log('✅ Appwrite ready');
            this.updateLoadingStatus('Checking authentication...');
            await this.loadSampleData();
            this.bindEvents();
            this.checkAuthStatus();
        }).catch(error => {
            console.error('❌ Appwrite initialization failed:', error);
            this.updateLoadingStatus('Failed to load Appwrite');
        });
    }

    updateLoadingStatus(status) {
        const statusElement = document.getElementById('loading-status');
        if (statusElement) {
            statusElement.textContent = status;
        }
        console.log('📝 Status:', status);
    }

    async waitForAppwrite() {
        // Wait for Appwrite auth to be loaded
        let attempts = 0;
        while (!window.appwriteAuth && attempts < 100) {
            await this.delay(100);
            attempts++;
        }
        if (!window.appwriteAuth) {
            throw new Error('Appwrite authentication not loaded');
        }
        
        // Wait for Appwrite to finish checking current session
        console.log('🔄 Waiting for Appwrite to check current session...');
        let authAttempts = 0;
        let lastUser = undefined;
        
        while (authAttempts < 100) {
            const user = window.appwriteAuth.getCurrentUser();
            
            // On first iteration, user is undefined (not yet checked)
            // Keep waiting until it becomes either a user object or null (checked but no user)
            if (authAttempts > 0 && user !== undefined && user === lastUser) {
                // User value has stabilized (same value twice in a row)
                console.log(`✅ Appwrite auth initialized after ${authAttempts} attempts`);
                console.log('👤 User:', user ? user.email : 'None');
                console.log('👤 User role:', user?.role);
                break;
            }
            
            lastUser = user;
            await this.delay(100);
            authAttempts++;
        }
        
        if (authAttempts >= 100) {
            console.log('⚠️ Timeout waiting for auth state to stabilize');
        }
    }

    // Load real data from Appwrite
    async loadSampleData() {
        console.log('📊 Loading data from Appwrite...');
        this.products = [];
        this.orders = [];
        
        // Load products and orders from the database
        await this.loadProducts();
        await this.loadOrders();
    }

    // Load products from Appwrite database
    async loadProducts() {
        try {
            console.log('📦 Attempting to load products from database...');
            const response = await fetch(
                `https://fra.cloud.appwrite.io/v1/databases/onsi/collections/products/documents`,
                {
                    method: 'GET',
                    headers: {
                        'X-Appwrite-Project': '68f8c1bc003e3d2c8f5c',
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                }
            );
            
            console.log('📦 Product fetch response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('❌ Product fetch error:', errorText);
                
                if (response.status === 404) {
                    console.log('ℹ️ Products collection not found, will create initial product');
                    await this.createInitialProduct();
                    return;
                }
                throw new Error('Failed to fetch products: ' + errorText);
            }
            
            const data = await response.json();
            console.log('📦 Product data received:', data);
            console.log('📦 Number of documents:', data.documents?.length);
            
            if (data.documents && data.documents.length > 0) {
                console.log('📦 First document structure:', data.documents[0]);
            }
            
            if (!data.documents || data.documents.length === 0) {
                console.log('ℹ️ No products found, will create initial product');
                await this.createInitialProduct();
                return;
            }
            
            this.products = data.documents.map(doc => {
                console.log('📦 Mapping document:', doc);
                return {
                    id: doc.$id,
                    name: doc.name,
                    description: doc.description,
                    price: doc.price,
                    category: doc.category,
                    stock: doc.stock,
                    status: doc.status,
                    image: doc.image,
                    imageFileId: doc.imageFileId,
                    createdAt: new Date(doc.$createdAt)
                };
            });
            
            console.log('✅ Loaded', this.products.length, 'products from database');
            console.log('📦 Products:', this.products);
        } catch (error) {
            console.error('❌ Failed to load products:', error);
            this.products = [];
        }
    }

    // Create initial product if collection is empty
    async createInitialProduct() {
        try {
            // Get the file ID for product-main.jpg
            const imageFileId = window.fileIdMap && window.fileIdMap['product-main.jpg'] 
                ? window.fileIdMap['product-main.jpg'] 
                : '68fb982a0028272869bc';

            const productData = {
                name: 'Quranic Verses Box',
                description: 'A curated set of 51 beautifully designed cards featuring uplifting ayat in Arabic with English reflections. Gift-ready velvet box.',
                price: null, // Will be set dynamically
                category: 'Islamic Cards',
                stock: 100,
                status: 'active',
                image: 'product-main.jpg',
                imageFileId: imageFileId
            };

            const response = await fetch(
                `https://fra.cloud.appwrite.io/v1/databases/onsi/collections/products/documents`,
                {
                    method: 'POST',
                    headers: {
                        'X-Appwrite-Project': '68f8c1bc003e3d2c8f5c',
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        documentId: 'unique()',
                        data: productData
                    })
                }
            );

            if (!response.ok) {
                const errorData = await response.text();
                console.error('Server response:', errorData);
                throw new Error('Failed to create initial product');
            }

            const newProduct = await response.json();
            this.products = [{
                id: newProduct.$id,
                name: newProduct.name,
                description: newProduct.description,
                price: newProduct.price,
                category: newProduct.category,
                stock: newProduct.stock,
                status: newProduct.status,
                image: newProduct.image,
                imageFileId: newProduct.imageFileId,
                createdAt: new Date(newProduct.$createdAt)
            }];

            console.log('✅ Created initial product in database');
            this.showNotification('Initial product created successfully', 'success');
        } catch (error) {
            console.error('❌ Failed to create initial product:', error);
            this.showNotification('Failed to create initial product: ' + error.message, 'error');
        }
    }

    // Load orders from Appwrite database
    async loadOrders() {
        try {
            // Use the Appwrite SDK that's already loaded
            const response = await fetch(
                `https://fra.cloud.appwrite.io/v1/databases/onsi/collections/orders/documents`,
                {
                    method: 'GET',
                    headers: {
                        'X-Appwrite-Project': '68f8c1bc003e3d2c8f5c',
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include'
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch orders');
            }
            
            const data = await response.json();
            
            this.orders = data.documents.map(doc => ({
                id: doc.$id,
                customerName: doc.customerName,
                customerEmail: doc.customerEmail,
                date: new Date(doc.$createdAt),
                total: doc.total,
                status: doc.status,
                items: typeof doc.items === 'string' ? JSON.parse(doc.items) : doc.items,
                shippingAddress: doc.shippingAddress,
                userId: doc.userId
            }));
            
            console.log('✅ Loaded', this.orders.length, 'orders from database');
        } catch (error) {
            console.error('❌ Failed to load orders:', error);
            this.orders = [];
        }
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

        // Logout - use Appwrite logout
        document.getElementById('admin-logout').addEventListener('click', () => {
            this.handleLogout();
        });

        // Add Product button event
        const addProductBtn = document.getElementById('add-product-btn');
        if (addProductBtn) {
            addProductBtn.addEventListener('click', () => {
                this.openProductModal(); // Open modal for new product
            });
        }

        // Product modal events
        const closeProductModal = document.getElementById('close-product-modal');
        if (closeProductModal) {
            closeProductModal.addEventListener('click', () => {
                this.closeProductModal();
            });
        }

        const cancelProduct = document.getElementById('cancel-product');
        if (cancelProduct) {
            cancelProduct.addEventListener('click', () => {
                this.closeProductModal();
            });
        }

        // Product form
        const productForm = document.getElementById('product-form');
        if (productForm) {
            productForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveProduct();
            });
        }

        // Image preview
        const productImage = document.getElementById('product-image');
        if (productImage) {
            productImage.addEventListener('change', (e) => {
                this.previewImage(e.target.files[0]);
            });
        }

        // Delete modal events
        const cancelDelete = document.getElementById('cancel-delete');
        if (cancelDelete) {
            cancelDelete.addEventListener('click', () => {
                this.closeDeleteModal();
            });
        }

        const confirmDelete = document.getElementById('confirm-delete');
        if (confirmDelete) {
            confirmDelete.addEventListener('click', () => {
                this.deleteProduct();
            });
        }

        // Order details modal events
        const closeOrderModal = document.getElementById('close-order-modal');
        if (closeOrderModal) {
            closeOrderModal.addEventListener('click', () => {
                this.closeOrderDetailsModal();
            });
        }

        const closeOrderModalBtn = document.getElementById('close-order-modal-btn');
        if (closeOrderModalBtn) {
            closeOrderModalBtn.addEventListener('click', () => {
                this.closeOrderDetailsModal();
            });
        }

        // Search and filter
        const searchProducts = document.getElementById('search-products');
        if (searchProducts) {
            searchProducts.addEventListener('input', (e) => {
                this.filterProducts();
            });
        }

        const filterCategory = document.getElementById('filter-category');
        if (filterCategory) {
            filterCategory.addEventListener('change', (e) => {
                this.filterProducts();
            });
        }

        // Users section refresh button
        const refreshUsersBtn = document.getElementById('refresh-users-btn');
        if (refreshUsersBtn) {
            refreshUsersBtn.addEventListener('click', () => {
                loadUsersSection();
            });
        }
    }

    // Authentication with Appwrite
    async checkAuthStatus() {
        console.log('🔐 Checking authentication status...');
        
        if (!window.appwriteAuth) {
            console.log('❌ Appwrite Auth not available');
            this.updateLoadingStatus('Appwrite Auth not loaded');
            return;
        }

        console.log('✅ Appwrite Auth available');
        
        // Get current Appwrite user (await since it might be async now)
        let currentUser = await window.appwriteAuth.getCurrentUser();
        
        console.log('👤 Current Appwrite user:', currentUser ? currentUser.email : 'None');
        console.log('👤 User role:', currentUser?.role);
        
        if (currentUser) {
            this.checkAdminPermissions(currentUser);
        } else {
            console.log('❌ No authenticated user found');
            this.redirectToLogin();
        }
    }

    async checkAdminPermissions(user) {
        if (this.currentUser || this.interfaceShown || this.isRedirecting) {
            console.log('⚠️ Admin permissions already checked or interface shown, skipping');
            return;
        }
        
        try {
            console.log('🔍 Checking admin permissions for user:', user.email);
            this.updateLoadingStatus('Verifying admin permissions...');
            
            // Check if user has admin role
            const isAdmin = user.role === 'admin';
            
            console.log('✅ Admin permission check:', {
                userId: user.$id,
                email: user.email,
                userRole: user.role,
                isAdmin: isAdmin
            });
            
            if (isAdmin) {
                console.log('🎉 User is admin, setting up interface...');
                this.currentUser = {
                    ...user,
                    isAdmin: true
                };
                this.showAdminInterface();
                this.showNotification('Welcome back, Admin!', 'success');
            } else {
                console.log('❌ User is not admin, showing access denied');
                this.showAccessDenied();
            }
        } catch (error) {
            console.error('❌ Error checking admin permissions:', error);
            this.showAccessDenied();
        }
    }

    handleLogout() {
        if (window.appwriteAuth) {
            window.appwriteAuth.logoutUser();
        }
        this.currentUser = null;
        this.redirectToHome();
        this.showNotification('Logged out successfully', 'info');
    }

    redirectToHome() {
        console.log('🏠 Redirecting to home page after logout');
        this.isRedirecting = true;
        
        // Show brief logout message then redirect to home
        this.updateLoadingStatus('Logging out...');
        
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1000);
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
        const currentUser = window.appwriteAuth?.getCurrentUser();
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
        
        console.log('📊 Before rendering - Products:', this.products.length, 'Orders:', this.orders.length);
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
            users: { title: 'Users Management', subtitle: 'View and manage your customers' },
            stats: { title: 'Statistics & Analytics', subtitle: 'Detailed insights and performance metrics' },
            storage: { title: 'Storage Management', subtitle: 'Manage your media files in OnsiBucket' }
        };

        const pageInfo = titles[section];
        if (pageInfo) {
            document.getElementById('page-title').textContent = pageInfo.title;
            document.getElementById('page-subtitle').textContent = pageInfo.subtitle;
        }

        // Show/hide add product button
        const addBtn = document.getElementById('add-product-btn');
        if (section === 'products') {
            addBtn.classList.remove('hidden');
        } else {
            addBtn.classList.add('hidden');
        }

        // Load section-specific data
        if (section === 'dashboard') {
            loadDashboardStats();
        } else if (section === 'users') {
            loadUsersSection();
        } else if (section === 'stats') {
            loadStatsSection();
        } else if (section === 'storage') {
            initStorageManagement();
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
        console.log('🎨 renderProducts called with:', this.products.length, 'products');
        const tbody = document.getElementById('products-table-body');
        const mobileList = document.getElementById('products-mobile-list');
        
        if (!tbody && !mobileList) {
            console.error('❌ products table/mobile list elements not found!');
            return;
        }
        
        if (this.products.length === 0) {
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" class="px-6 py-4 text-center text-gray-500">No products found</td>
                    </tr>
                `;
            }
            if (mobileList) {
                mobileList.innerHTML = `
                    <div class="p-8 text-center text-gray-500">No products found</div>
                `;
            }
            return;
        }

        // Render desktop table
        if (tbody) {
            tbody.innerHTML = this.products.map(product => {
                // Get image URL from Appwrite using imageFileId
                const imageUrl = product.imageFileId 
                    ? `https://fra.cloud.appwrite.io/v1/storage/buckets/691735da003dc83b3baf/files/${product.imageFileId}/view?project=68f8c1bc003e3d2c8f5c`
                    : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Crect fill=%22%23ddd%22 width=%2240%22 height=%2240%22/%3E%3C/svg%3E';
                
                return `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap">
                        <div class="flex items-center">
                            <div class="flex-shrink-0 h-10 w-10">
                                <img class="h-10 w-10 rounded-lg object-cover" src="${imageUrl}" alt="${product.name}">
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
                        <input 
                            type="number" 
                            step="0.01" 
                            value="${product.price}" 
                            onchange="adminPanel.updateProductPrice('${product.id}', this.value)"
                            class="w-24 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        /> TND
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
                            View Details
                        </button>
                    </td>
                </tr>
            `;
            }).join('');
        }

        // Render mobile cards
        if (mobileList) {
            mobileList.innerHTML = this.products.map(product => {
                // Get image URL from Appwrite using imageFileId
                const imageUrl = product.imageFileId 
                    ? `https://fra.cloud.appwrite.io/v1/storage/buckets/691735da003dc83b3baf/files/${product.imageFileId}/view?project=68f8c1bc003e3d2c8f5c`
                    : 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%2240%22 height=%2240%22%3E%3Crect fill=%22%23ddd%22 width=%2240%22 height=%2240%22/%3E%3C/svg%3E';
                
                return `
                <div class="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
                    <div class="flex items-start space-x-4">
                        <img class="h-16 w-16 rounded-lg object-cover flex-shrink-0" src="${imageUrl}" alt="${product.name}">
                        <div class="flex-1 min-w-0">
                            <div class="flex items-start justify-between">
                                <div class="flex-1">
                                    <h4 class="text-sm font-medium text-gray-900 truncate">${product.name}</h4>
                                    <p class="text-xs text-gray-500 mt-1 line-clamp-2">${product.description}</p>
                                </div>
                                <span class="ml-2 px-2 py-1 text-xs font-medium rounded-full ${this.getStatusColor(product.status)} whitespace-nowrap">
                                    ${this.capitalizeFirst(product.status)}
                                </span>
                            </div>
                            
                            <div class="mt-3 flex items-center justify-between">
                                <div class="flex items-center space-x-4 text-sm">
                                    <div>
                                        <span class="text-gray-500">Price:</span>
                                        <input 
                                            type="number" 
                                            step="0.01" 
                                            value="${product.price}" 
                                            onchange="adminPanel.updateProductPrice('${product.id}', this.value)"
                                            class="w-20 ml-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                        /> TND
                                    </div>
                                    <div>
                                        <span class="text-gray-500">Stock:</span> 
                                        <span class="font-medium">${product.stock}</span>
                                    </div>
                                </div>
                                <button onclick="adminPanel.editProduct('${product.id}')" class="text-xs bg-slate-700 text-white px-3 py-1 rounded-md hover:bg-slate-800 transition-colors">
                                    Details
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            }).join('');
        }
    }

    async updateProductPrice(productId, newPrice) {
        try {
            const price = parseFloat(newPrice);
            if (isNaN(price) || price < 0) {
                this.showNotification('Invalid price value', 'error');
                await this.loadProducts();
                this.renderProducts();
                return;
            }

            const response = await fetch(
                `https://fra.cloud.appwrite.io/v1/databases/onsi/collections/products/documents/${productId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'X-Appwrite-Project': '68f8c1bc003e3d2c8f5c',
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        data: {
                            price: price
                        }
                    })
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to update product price');
            }
            
            // Update local data
            const product = this.products.find(p => p.id === productId);
            if (product) {
                product.price = price;
            }
            
            this.showNotification(`Price updated to ${price} TND`, 'success');
            console.log('✅ Product price updated:', productId, price);
            
            // Update dashboard stats
            this.updateDashboardStats();
        } catch (error) {
            console.error('❌ Failed to update product price:', error);
            this.showNotification('Failed to update price', 'error');
            // Reload products to revert the UI
            await this.loadProducts();
            this.renderProducts();
        }
    }

    editProduct(productId) {
        const product = this.products.find(p => p.id === productId);
        if (product) {
            const details = `
PRODUCT DETAILS
───────────────────
Name: ${product.name}
Description: ${product.description}
Price: ${product.price} TND
Category: ${product.category}
Stock: ${product.stock}
Status: ${product.status}
Image: ${product.image}
            `.trim();
            alert(details);
        }
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
            // Get form data
            const productData = {
                name: document.getElementById('product-name').value,
                description: document.getElementById('product-description').value,
                price: parseFloat(document.getElementById('product-price').value),
                category: document.getElementById('product-category').value,
                stock: parseInt(document.getElementById('product-stock').value),
                status: document.getElementById('product-status').value,
                image: 'product-main.jpg', // Default image
                imageFileId: window.fileIdMap && window.fileIdMap['product-main.jpg'] 
                    ? window.fileIdMap['product-main.jpg'] 
                    : '68fb982a0028272869bc' // Fallback file ID
            };

            // Handle image upload (for future implementation)
            const imageFile = document.getElementById('product-image').files[0];
            if (imageFile) {
                // TODO: In future implementation, upload image to Appwrite Storage first
                console.log('Image file selected:', imageFile.name);
            }

            let response;

            if (this.editingProductId) {
                // Update existing product in database
                response = await fetch(
                    `https://fra.cloud.appwrite.io/v1/databases/onsi/collections/products/documents/${this.editingProductId}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'X-Appwrite-Project': '68f8c1bc003e3d2c8f5c',
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            data: productData
                        })
                    }
                );

                if (!response.ok) {
                    const errorData = await response.text();
                    console.error('Update product error:', errorData);
                    throw new Error('Failed to update product');
                }

                const updatedProduct = await response.json();
                
                // Update local array
                const index = this.products.findIndex(p => p.id === this.editingProductId);
                if (index !== -1) {
                    this.products[index] = {
                        id: updatedProduct.$id,
                        name: updatedProduct.name,
                        description: updatedProduct.description,
                        price: updatedProduct.price,
                        category: updatedProduct.category,
                        stock: updatedProduct.stock,
                        status: updatedProduct.status,
                        image: updatedProduct.image,
                        imageFileId: updatedProduct.imageFileId,
                        createdAt: new Date(updatedProduct.$createdAt)
                    };
                }

                this.showNotification('Product updated successfully!', 'success');
                console.log('✅ Product updated in database:', updatedProduct.$id);

            } else {
                // Create new product in database
                response = await fetch(
                    `https://fra.cloud.appwrite.io/v1/databases/onsi/collections/products/documents`,
                    {
                        method: 'POST',
                        headers: {
                            'X-Appwrite-Project': '68f8c1bc003e3d2c8f5c',
                            'Content-Type': 'application/json'
                        },
                        credentials: 'include',
                        body: JSON.stringify({
                            documentId: 'unique()',
                            data: productData
                        })
                    }
                );

                if (!response.ok) {
                    const errorData = await response.text();
                    console.error('Create product error:', errorData);
                    throw new Error('Failed to create product');
                }

                const newProduct = await response.json();
                
                // Add to local array
                this.products.push({
                    id: newProduct.$id,
                    name: newProduct.name,
                    description: newProduct.description,
                    price: newProduct.price,
                    category: newProduct.category,
                    stock: newProduct.stock,
                    status: newProduct.status,
                    image: newProduct.image,
                    imageFileId: newProduct.imageFileId,
                    createdAt: new Date(newProduct.$createdAt)
                });

                this.showNotification('Product added successfully!', 'success');
                console.log('✅ Product created in database:', newProduct.$id);
            }

            // Re-render products and update dashboard
            this.renderProducts();
            this.updateDashboardStats();
            this.closeProductModal();

            // The homepage will automatically load the updated product from the database
            // when users visit it because it calls loadProductFromDatabase()
            console.log('✅ Product saved successfully. Homepage will show updated products on next load.');

        } catch (error) {
            console.error('❌ Failed to save product:', error);
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

    closeOrderDetailsModal() {
        const modal = document.getElementById('order-details-modal');
        modal.classList.add('hidden');
        modal.classList.remove('flex');
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
        console.log('🎨 renderOrders called with:', this.orders.length, 'orders');
        const tbody = document.getElementById('orders-table-body');
        const mobileList = document.getElementById('orders-mobile-list');
        
        if (!tbody && !mobileList) {
            console.error('❌ orders table/mobile list elements not found!');
            return;
        }
        
        if (this.orders.length === 0) {
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="px-6 py-4 text-center text-gray-500">No orders found</td>
                    </tr>
                `;
            }
            if (mobileList) {
                mobileList.innerHTML = `
                    <div class="p-8 text-center text-gray-500">No orders found</div>
                `;
            }
            return;
        }

        // Render desktop table
        if (tbody) {
            tbody.innerHTML = this.orders.map(order => `
                <tr class="hover:bg-gray-50">
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        ${order.id.substring(0, 8)}...
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
                        <select 
                            onchange="adminPanel.updateOrderStatus('${order.id}', this.value)"
                            class="text-xs px-2 py-1 rounded-full border ${this.getOrderStatusColor(order.status)}"
                        >
                            <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                            <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                            <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                            <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                            <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                        </select>
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        ${Array.isArray(order.items) ? order.items.length : 0} item(s)
                    </td>
                    <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button onclick="adminPanel.viewOrderDetails('${order.id}')" class="text-indigo-600 hover:text-indigo-900">
                            View Details
                        </button>
                    </td>
                </tr>
            `).join('');
        }

        // Render mobile cards
        if (mobileList) {
            mobileList.innerHTML = this.orders.map(order => `
                <div class="bg-white border border-gray-200 rounded-lg p-4 mb-4 shadow-sm">
                    <div class="flex items-start justify-between mb-3">
                        <div>
                            <h4 class="text-sm font-medium text-gray-900">Order #${order.id.substring(0, 8)}</h4>
                            <p class="text-xs text-gray-500 mt-1">${this.formatDate(order.date)}</p>
                        </div>
                        <div class="text-right">
                            <p class="text-sm font-semibold text-gray-900">${order.total.toFixed(2)} TND</p>
                            <p class="text-xs text-gray-500">${Array.isArray(order.items) ? order.items.length : 0} item(s)</p>
                        </div>
                    </div>
                    
                    <div class="border-t pt-3">
                        <div class="flex items-center justify-between mb-3">
                            <div class="flex-1">
                                <p class="text-sm font-medium text-gray-900">${order.customerName}</p>
                                <p class="text-xs text-gray-500 truncate">${order.customerEmail}</p>
                            </div>
                        </div>
                        
                        <div class="flex items-center justify-between">
                            <select 
                                onchange="adminPanel.updateOrderStatus('${order.id}', this.value)"
                                class="text-xs px-3 py-2 rounded-md border ${this.getOrderStatusColor(order.status)} focus:outline-none focus:ring-2 focus:ring-slate-500"
                            >
                                <option value="pending" ${order.status === 'pending' ? 'selected' : ''}>Pending</option>
                                <option value="processing" ${order.status === 'processing' ? 'selected' : ''}>Processing</option>
                                <option value="shipped" ${order.status === 'shipped' ? 'selected' : ''}>Shipped</option>
                                <option value="delivered" ${order.status === 'delivered' ? 'selected' : ''}>Delivered</option>
                                <option value="cancelled" ${order.status === 'cancelled' ? 'selected' : ''}>Cancelled</option>
                            </select>
                            <button onclick="adminPanel.viewOrderDetails('${order.id}')" class="text-xs bg-slate-700 text-white px-3 py-2 rounded-md hover:bg-slate-800 transition-colors mobile-btn">
                                Details
                            </button>
                        </div>
                    </div>
                </div>
            `).join('');
        }
    }

    async updateOrderStatus(orderId, newStatus) {
        try {
            const response = await fetch(
                `https://fra.cloud.appwrite.io/v1/databases/onsi/collections/orders/documents/${orderId}`,
                {
                    method: 'PATCH',
                    headers: {
                        'X-Appwrite-Project': '68f8c1bc003e3d2c8f5c',
                        'Content-Type': 'application/json'
                    },
                    credentials: 'include',
                    body: JSON.stringify({
                        data: {
                            status: newStatus
                        }
                    })
                }
            );
            
            if (!response.ok) {
                throw new Error('Failed to update order status');
            }
            
            // Update local data
            const order = this.orders.find(o => o.id === orderId);
            if (order) {
                order.status = newStatus;
            }
            
            this.showNotification(`Order status updated to ${newStatus}`, 'success');
            console.log('✅ Order status updated:', orderId, newStatus);
        } catch (error) {
            console.error('❌ Failed to update order status:', error);
            this.showNotification('Failed to update order status', 'error');
            // Reload orders to revert the UI
            await this.loadOrders();
            this.renderOrders();
        }
    }

    viewOrderDetails(orderId) {
        const order = this.orders.find(o => o.id === orderId);
        if (!order) return;
        
        // Populate modal with order data
        document.getElementById('order-id-display').textContent = `Order #${order.id.substring(0, 12)}...`;
        document.getElementById('order-date-display').textContent = this.formatDate(order.date);
        
        // Set status badge
        const statusBadge = document.getElementById('order-status-badge');
        statusBadge.textContent = this.capitalizeFirst(order.status);
        statusBadge.className = `px-4 py-2 rounded-full text-sm font-semibold inline-block ${this.getOrderStatusColor(order.status)}`;
        
        // Customer information
        document.getElementById('customer-name').textContent = order.customerName;
        document.getElementById('customer-email').textContent = order.customerEmail;
        
        const addressContainer = document.getElementById('shipping-address-container');
        if (order.shippingAddress) {
            addressContainer.classList.remove('hidden');
            document.getElementById('shipping-address').textContent = order.shippingAddress;
        } else {
            addressContainer.classList.add('hidden');
        }
        
        // Order items
        const itemsList = document.getElementById('order-items-list');
        if (Array.isArray(order.items) && order.items.length > 0) {
            itemsList.innerHTML = order.items.map(item => `
                <div class="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div class="flex items-center space-x-4">
                        <div class="w-12 h-12 bg-indigo-100 rounded-lg flex items-center justify-center">
                            <svg class="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                            </svg>
                        </div>
                        <div>
                            <p class="font-semibold text-gray-900">${item.name || 'Product'}</p>
                            <p class="text-sm text-gray-500">Quantity: ${item.quantity}</p>
                        </div>
                    </div>
                    <div class="text-right">
                        <p class="font-semibold text-gray-900">${(item.price * item.quantity).toFixed(2)} TND</p>
                        <p class="text-sm text-gray-500">${item.price.toFixed(2)} TND each</p>
                    </div>
                </div>
            `).join('');
        } else {
            itemsList.innerHTML = `
                <div class="text-center py-8 text-gray-500">
                    <svg class="w-12 h-12 mx-auto mb-2 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"></path>
                    </svg>
                    <p>No items in this order</p>
                </div>
            `;
        }
        
        // Order total
        document.getElementById('order-total').textContent = `${order.total.toFixed(2)} TND`;
        
        // Show modal
        const modal = document.getElementById('order-details-modal');
        modal.classList.remove('hidden');
        modal.classList.add('flex');
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
        
        // Initialize Storage Management
        initStorageManagement();
    } else {
        console.error('❌ Cannot start Admin Panel - missing required elements');
    }
});

// ====================================
// STORAGE MANAGEMENT (APPWRITE)
// ====================================

let currentFileToDelete = null;

async function initStorageManagement() {
    console.log('📦 Initializing Storage Management...');
    
    // Bind storage section navigation
    const storageNavBtn = document.querySelector('[data-section="storage"]');
    if (storageNavBtn) {
        storageNavBtn.addEventListener('click', () => {
            showStorageSection();
        });
    }
    
    // Bind upload button
    const uploadBtn = document.getElementById('upload-file-btn');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', openUploadModal);
    }
    
    // Bind file input change
    const fileInput = document.getElementById('file-upload');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileSelect);
    }
    
    // Bind upload form
    const uploadForm = document.getElementById('upload-form');
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleFileUpload);
    }
}

async function showStorageSection() {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.add('hidden');
    });
    
    // Show storage section
    const storageSection = document.getElementById('storage-section');
    if (storageSection) {
        storageSection.classList.remove('hidden');
    }
    
    // Update nav active state
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active', 'bg-slate-600');
    });
    document.querySelector('[data-section="storage"]')?.classList.add('active', 'bg-slate-600');
    
    // Update header
    document.getElementById('page-title').textContent = 'Storage Management';
    document.getElementById('page-subtitle').textContent = 'Manage your media files in OnsiBucket';
    
    // Hide add product button
    document.getElementById('add-product-btn')?.classList.add('hidden');
    
    // Load files
    await loadStorageFiles();
}

async function loadStorageFiles() {
    const loading = document.getElementById('storage-loading');
    const grid = document.getElementById('storage-grid');
    const empty = document.getElementById('storage-empty');
    
    loading?.classList.remove('hidden');
    grid?.classList.add('hidden');
    empty?.classList.add('hidden');
    
    try {
        const endpoint = 'https://fra.cloud.appwrite.io/v1';
        const projectId = '68f8c1bc003e3d2c8f5c';
        const bucketId = '691735da003dc83b3baf';
        
        const response = await fetch(`${endpoint}/storage/buckets/${bucketId}/files?project=${projectId}`, {
            method: 'GET',
            headers: {
                'X-Appwrite-Project': projectId
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch files');
        }
        
        const data = await response.json();
        console.log('📁 Files loaded:', data);
        
        loading?.classList.add('hidden');
        
        if (data.files && data.files.length > 0) {
            renderStorageFiles(data.files);
            grid?.classList.remove('hidden');
        } else {
            empty?.classList.remove('hidden');
        }
    } catch (error) {
        console.error('❌ Failed to load files:', error);
        loading?.classList.add('hidden');
        empty?.classList.remove('hidden');
    }
}

function renderStorageFiles(files) {
    const grid = document.getElementById('storage-grid');
    if (!grid) return;
    
    grid.innerHTML = files.map(file => {
        const fileUrl = getFileUrl(file.$id);
        const isVideo = file.mimeType?.startsWith('video/');
        const isImage = file.mimeType?.startsWith('image/');
        
        return `
            <div class="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                <div class="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden">
                    ${isImage ? `<img src="${fileUrl}" alt="${file.name}" class="w-full h-full object-cover">` : ''}
                    ${isVideo ? `<video src="${fileUrl}" class="w-full h-full object-cover"></video>` : ''}
                    ${!isImage && !isVideo ? `
                        <svg class="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"></path>
                        </svg>
                    ` : ''}
                </div>
                <div class="p-3">
                    <p class="text-sm font-medium text-gray-900 truncate" title="${file.name}">${file.name}</p>
                    <p class="text-xs text-gray-500 mt-1">${formatFileSize(file.sizeOriginal)}</p>
                    <div class="flex gap-2 mt-3">
                        <button onclick="viewFile('${file.$id}', '${file.name}')" class="flex-1 text-xs bg-slate-700 text-white px-3 py-1.5 rounded hover:bg-slate-800 transition-colors">
                            View
                        </button>
                        <button onclick="deleteFile('${file.$id}', '${file.name}')" class="flex-1 text-xs bg-red-600 text-white px-3 py-1.5 rounded hover:bg-red-700 transition-colors">
                            Delete
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function getFileUrl(fileId) {
    return `https://fra.cloud.appwrite.io/v1/storage/buckets/onsiBucket/files/${fileId}/view?project=68f8c1bc003e3d2c8f5c`;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function openUploadModal() {
    const modal = document.getElementById('upload-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeUploadModal() {
    const modal = document.getElementById('upload-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    
    // Reset form
    document.getElementById('upload-form')?.reset();
    document.getElementById('file-preview')?.classList.add('hidden');
}

function handleFileSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const preview = document.getElementById('file-preview');
    const previewImage = document.getElementById('preview-image');
    const previewVideo = document.getElementById('preview-video');
    const fileInfo = document.getElementById('preview-file-info');
    
    preview?.classList.remove('hidden');
    previewImage?.classList.add('hidden');
    previewVideo?.classList.add('hidden');
    fileInfo?.classList.add('hidden');
    
    if (file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (previewImage) {
                previewImage.src = e.target.result;
                previewImage.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    } else if (file.type.startsWith('video/')) {
        const reader = new FileReader();
        reader.onload = (e) => {
            if (previewVideo) {
                previewVideo.src = e.target.result;
                previewVideo.classList.remove('hidden');
            }
        };
        reader.readAsDataURL(file);
    } else {
        fileInfo?.classList.remove('hidden');
        document.getElementById('file-name').textContent = file.name;
        document.getElementById('file-size').textContent = formatFileSize(file.size);
    }
}

async function handleFileUpload(event) {
    event.preventDefault();
    
    const fileInput = document.getElementById('file-upload');
    const file = fileInput?.files[0];
    
    if (!file) {
        alert('Please select a file');
        return;
    }
    
    const submitBtn = document.getElementById('upload-submit-btn');
    const uploadText = document.getElementById('upload-text');
    const uploadLoading = document.getElementById('upload-loading');
    
    try {
        submitBtn.disabled = true;
        uploadText?.classList.add('hidden');
        uploadLoading?.classList.remove('hidden');
        
        // Use Appwrite auth to upload
        if (!window.appwriteAuth) {
            throw new Error('Appwrite not initialized');
        }
        
        const result = await window.appwriteAuth.uploadImage(file);
        
        if (result.success) {
            console.log('✅ File uploaded:', result);
            closeUploadModal();
            await loadStorageFiles();
            showNotification('File uploaded successfully!', 'success');
        } else {
            throw new Error(result.error || 'Upload failed');
        }
    } catch (error) {
        console.error('❌ Upload error:', error);
        alert('Failed to upload file: ' + error.message);
    } finally {
        submitBtn.disabled = false;
        uploadText?.classList.remove('hidden');
        uploadLoading?.classList.add('hidden');
    }
}

function viewFile(fileId, fileName) {
    const url = getFileUrl(fileId);
    window.open(url, '_blank');
}

function deleteFile(fileId, fileName) {
    currentFileToDelete = { fileId, fileName };
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeDeleteModal() {
    currentFileToDelete = null;
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

document.getElementById('confirm-delete-btn')?.addEventListener('click', async () => {
    if (!currentFileToDelete) return;
    
    try {
        if (!window.appwriteAuth) {
            throw new Error('Appwrite not initialized');
        }
        
        const result = await window.appwriteAuth.deleteImage(currentFileToDelete.fileId);
        
        if (result.success) {
            console.log('✅ File deleted');
            closeDeleteModal();
            await loadStorageFiles();
            showNotification('File deleted successfully!', 'success');
        } else {
            throw new Error(result.error || 'Delete failed');
        }
    } catch (error) {
        console.error('❌ Delete error:', error);
        alert('Failed to delete file: ' + error.message);
    }
});

function showNotification(message, type = 'info') {
    // Simple notification - you can enhance this
    const notification = document.createElement('div');
    notification.className = `fixed top-4 right-4 px-6 py-3 rounded-lg shadow-lg z-50 ${
        type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : 'bg-blue-500'
    } text-white`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}

// User Management Functions
async function loadUsersSection() {
    console.log('🔄 Loading users section...');
    
    const usersLoading = document.getElementById('users-loading');
    const usersTable = document.getElementById('users-table');
    const usersCards = document.getElementById('users-cards');
    const usersEmpty = document.getElementById('users-empty');
    
    if (!usersLoading) return;
    
    // Show loading state
    usersLoading.classList.remove('hidden');
    usersTable?.classList.add('hidden');
    usersCards?.classList.add('hidden');
    usersEmpty?.classList.add('hidden');
    
    try {
        // Fetch users from Appwrite Users collection
        const response = await fetch(`${ENV.VITE_APPWRITE_ENDPOINT}/databases/onsi/collections/Users/documents`, {
            method: 'GET',
            headers: {
                'X-Appwrite-Project': ENV.VITE_APPWRITE_PROJECT_ID,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('✅ Users loaded:', data);
        
        // Hide loading
        usersLoading.classList.add('hidden');
        
        if (data.documents && data.documents.length > 0) {
            renderUsers(data.documents);
        } else {
            usersEmpty?.classList.remove('hidden');
        }
        
    } catch (error) {
        console.error('❌ Error loading users:', error);
        usersLoading.classList.add('hidden');
        usersEmpty?.classList.remove('hidden');
    }
}

function renderUsers(users) {
    const usersTable = document.getElementById('users-table');
    const usersCards = document.getElementById('users-cards');
    const usersTableBody = document.getElementById('users-table-body');
    
    if (!usersTableBody || !usersCards) return;
    
    // Clear existing content
    usersTableBody.innerHTML = '';
    usersCards.innerHTML = '';
    
    users.forEach(user => {
        const registrationDate = new Date(user.$createdAt).toLocaleDateString();
        const lastCartUpdate = user.lastCartUpdate ? new Date(user.lastCartUpdate).toLocaleDateString() : 'Never';
        const hasCart = user.savedCart && user.savedCart.length > 0;
        
        const roleBadge = user.role === 'admin' ?
            '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">Admin</span>' :
            '<span class="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">Customer</span>';
        
        const cartBadge = hasCart ?
            '<span class="px-2 py-1 text-xs rounded-full bg-green-100 text-green-800">Has Cart</span>' :
            '<span class="px-2 py-1 text-xs rounded-full bg-gray-100 text-gray-800">Empty Cart</span>';
        
        // Desktop table row
        const tableRow = `
            <tr class="hover:bg-gray-50">
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center">
                        <div class="flex-shrink-0 h-10 w-10">
                            <div class="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center">
                                <span class="text-sm font-medium text-slate-700">${(user.fullName || user.email).charAt(0).toUpperCase()}</span>
                            </div>
                        </div>
                        <div class="ml-4">
                            <div class="text-sm font-medium text-gray-900">${user.fullName || 'No Name'}</div>
                            <div class="text-sm text-gray-500">${roleBadge}</div>
                        </div>
                    </div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${user.email}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <div class="text-sm text-gray-900">${registrationDate}</div>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                    ${cartBadge}
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <button onclick="viewUserDetails('${user.$id}')" class="text-slate-600 hover:text-slate-900 mr-3">View</button>
                    <button onclick="viewUserCart('${user.$id}')" class="text-blue-600 hover:text-blue-900">View Cart</button>
                </td>
            </tr>
        `;
        
        // Mobile card
        const userCard = `
            <div class="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                <div class="flex items-center justify-between mb-3">
                    <div class="flex items-center">
                        <div class="h-10 w-10 rounded-full bg-slate-200 flex items-center justify-center mr-3">
                            <span class="text-sm font-medium text-slate-700">${(user.fullName || user.email).charAt(0).toUpperCase()}</span>
                        </div>
                        <div>
                            <h4 class="font-medium text-gray-900">${user.fullName || 'No Name'}</h4>
                            <p class="text-sm text-gray-500">${user.email}</p>
                        </div>
                    </div>
                    ${roleBadge}
                </div>
                <div class="flex justify-between items-center text-sm text-gray-600 mb-3">
                    <span>Registered: ${registrationDate}</span>
                    ${cartBadge}
                </div>
                <div class="text-xs text-gray-500 mb-3">
                    Last cart update: ${lastCartUpdate}
                </div>
                <div class="flex space-x-2">
                    <button onclick="viewUserDetails('${user.$id}')" class="flex-1 bg-slate-100 text-slate-700 px-3 py-2 rounded text-sm hover:bg-slate-200 transition-colors">
                        View Details
                    </button>
                    <button onclick="viewUserCart('${user.$id}')" class="flex-1 bg-blue-100 text-blue-700 px-3 py-2 rounded text-sm hover:bg-blue-200 transition-colors">
                        View Cart
                    </button>
                </div>
            </div>
        `;
        
        usersTableBody.innerHTML += tableRow;
        usersCards.innerHTML += userCard;
    });
    
    // Show appropriate view based on screen size
    if (window.innerWidth >= 768) {
        usersTable?.classList.remove('hidden');
        usersCards?.classList.add('hidden');
    } else {
        usersTable?.classList.add('hidden');
        usersCards?.classList.remove('hidden');
    }
}

function viewUserDetails(userId) {
    console.log('👁️ Viewing user details for:', userId);
    showNotification('User details view - Feature coming soon!', 'info');
}

function viewUserCart(userId) {
    console.log('� Viewing cart for user:', userId);
    showNotification('User cart view - Feature coming soon!', 'info');
}

async function loadDashboardStats() {
    console.log('📊 Loading dashboard statistics...');
    
    try {
        // Load products count
        const products = document.querySelectorAll('#products-list .product-row').length;
        document.getElementById('total-products').textContent = products;
        
        // Load orders and calculate monthly income and revenue metrics
        let totalOrders = 0;
        let totalRevenue = 0;
        let monthlyRevenue = 0;
        
        try {
            // Try multiple possible collection names for orders
            const possibleOrderCollections = ['orders', 'Orders', 'order', 'Order'];
            let ordersResponse = null;
            let ordersData = null;
            
            for (const collectionName of possibleOrderCollections) {
                try {
                    console.log('📊 Trying orders collection:', collectionName);
                    ordersResponse = await fetch(`${ENV.VITE_APPWRITE_ENDPOINT}/databases/onsi/collections/${collectionName}/documents`, {
                        method: 'GET',
                        headers: {
                            'X-Appwrite-Project': ENV.VITE_APPWRITE_PROJECT_ID,
                            'Content-Type': 'application/json'
                        }
                    });
                    
                    console.log('📊 Response for', collectionName, '- Status:', ordersResponse.status);
                    
                    if (ordersResponse.ok) {
                        ordersData = await ordersResponse.json();
                        console.log('📊 Successfully found orders in collection:', collectionName);
                        break;
                    }
                } catch (collectionError) {
                    console.log('📊 Collection', collectionName, 'failed:', collectionError.message);
                    continue;
                }
            }
            
            if (ordersData) {
                console.log('📊 Orders data received:', ordersData);
                console.log('📊 Sample order structure:', ordersData.documents?.[0]);
                totalOrders = ordersData.total || ordersData.documents?.length || 0;
                
                // Calculate total revenue and monthly revenue
                const now = new Date();
                const currentMonth = now.getMonth(); // 0-11
                const currentYear = now.getFullYear();
                
                console.log('📊 Current month:', currentMonth, 'Current year:', currentYear);
                console.log('📊 Processing', ordersData.documents?.length || 0, 'orders');
                
                ordersData.documents?.forEach((order, index) => {
                    // Use the correct field name from your database structure
                    const orderAmount = parseFloat(order.total || order.totalAmount || order.amount || 0);
                    totalRevenue += orderAmount;
                    
                    // Check if order is from current month
                    const orderDateString = order.$createdAt || order.createdAt || order.date;
                    const orderDate = new Date(orderDateString);
                    
                    console.log(`📊 Order ${index + 1}:`, {
                        amount: orderAmount,
                        totalField: order.total,
                        dateString: orderDateString,
                        parsedDate: orderDate,
                        orderMonth: orderDate.getMonth(),
                        orderYear: orderDate.getFullYear(),
                        isCurrentMonth: orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear
                    });
                    
                    if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
                        monthlyRevenue += orderAmount;
                        console.log('📊 Added to monthly revenue:', orderAmount, 'New total:', monthlyRevenue);
                    }
                });
                
                console.log('📊 Final calculations - Total orders:', totalOrders, 'Total revenue:', totalRevenue, 'Monthly revenue:', monthlyRevenue);
            } else {
                console.log('📊 No orders collection found or no orders data available');
                console.log('📊 Tried collections:', possibleOrderCollections.join(', '));
                
                // Check if ordersResponse exists and log the error
                if (ordersResponse) {
                    console.error('📊 Last response status:', ordersResponse.status, ordersResponse.statusText);
                    try {
                        const errorText = await ordersResponse.text();
                        console.error('📊 Error response text:', errorText);
                    } catch (e) {
                        console.error('📊 Could not read error response');
                    }
                }
            }
        } catch (error) {
            console.error('📊 Error fetching orders data:', error);
        }
        
        // Fetch registered users count (customers)
        let totalCustomers = 0;
        try {
            const usersResponse = await fetch(`${ENV.VITE_APPWRITE_ENDPOINT}/databases/onsi/collections/Users/documents`, {
                method: 'GET',
                headers: {
                    'X-Appwrite-Project': ENV.VITE_APPWRITE_PROJECT_ID,
                    'Content-Type': 'application/json'
                }
            });
            
            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                totalCustomers = usersData.total || usersData.documents?.length || 0;
            }
        } catch (error) {
            console.log('📊 Could not fetch users count:', error);
        }
        
        // Update dashboard with website metrics
        document.getElementById('total-orders').textContent = totalOrders || 0;
        document.getElementById('total-revenue').textContent = `${(monthlyRevenue || 0).toFixed(2)} TND`;
        document.getElementById('total-customers').textContent = totalCustomers || 0;
        
        // Update revenue label to show it's monthly
        const revenueLabel = document.querySelector('#total-revenue').previousElementSibling;
        if (revenueLabel && (revenueLabel.textContent === 'Revenue' || revenueLabel.textContent.includes('Revenue'))) {
            revenueLabel.textContent = 'Monthly Income';
        }
        
        // Show status message
        if (totalOrders === 0) {
            console.log('💡 No orders found - Monthly Income will show 0.00 TND until orders are created');
        } else {
            console.log('✅ Dashboard stats updated - Monthly Income:', (monthlyRevenue || 0).toFixed(2), 'TND', `(from ${totalOrders} total orders)`);
        }
        
    } catch (error) {
        console.error('❌ Error loading dashboard stats:', error);
    }
}

// Stats Section Functions
async function loadStatsSection() {
    console.log('📊 Loading detailed statistics section...');
    
    try {
        await loadDetailedStats();
        await loadTopProducts();
        await loadOrderStatusSummary();
        await generateRevenueChart();
        
        // Bind refresh button
        document.getElementById('refresh-stats-btn')?.addEventListener('click', loadStatsSection);
        
        console.log('✅ Stats section loaded successfully');
    } catch (error) {
        console.error('❌ Error loading stats section:', error);
    }
}

async function loadDetailedStats() {
    try {
        let totalRevenue = 0;
        let monthlyRevenue = 0;
        let totalOrders = 0;
        let orderValues = [];
        
        // Fetch orders data
        const ordersResponse = await fetch(`${ENV.VITE_APPWRITE_ENDPOINT}/databases/onsi/collections/orders/documents`, {
            method: 'GET',
            headers: {
                'X-Appwrite-Project': ENV.VITE_APPWRITE_PROJECT_ID,
                'Content-Type': 'application/json'
            }
        });
        
        if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            totalOrders = ordersData.total || ordersData.documents?.length || 0;
            
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
            const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;
            
            let lastMonthRevenue = 0;
            
            ordersData.documents?.forEach(order => {
                // Use the correct field name from your database structure  
                const orderAmount = parseFloat(order.total || order.totalAmount || order.amount || 0);
                totalRevenue += orderAmount;
                orderValues.push(orderAmount);
                
                const orderDate = new Date(order.$createdAt || order.createdAt);
                
                // Current month revenue
                if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
                    monthlyRevenue += orderAmount;
                }
                
                // Last month revenue for growth calculation
                if (orderDate.getMonth() === lastMonth && orderDate.getFullYear() === lastMonthYear) {
                    lastMonthRevenue += orderAmount;
                }
            });
            
            // Calculate metrics
            const avgOrderValue = orderValues.length > 0 ? totalRevenue / orderValues.length : 0;
            const monthlyGrowth = lastMonthRevenue > 0 ? ((monthlyRevenue - lastMonthRevenue) / lastMonthRevenue * 100) : 0;
            
            // Fetch users for conversion rate calculation
            let totalUsers = 0;
            try {
                const usersResponse = await fetch(`${ENV.VITE_APPWRITE_ENDPOINT}/databases/onsi/collections/Users/documents`, {
                    method: 'GET',
                    headers: {
                        'X-Appwrite-Project': ENV.VITE_APPWRITE_PROJECT_ID,
                        'Content-Type': 'application/json'
                    }
                });
                
                if (usersResponse.ok) {
                    const usersData = await usersResponse.json();
                    totalUsers = usersData.total || usersData.documents?.length || 0;
                }
            } catch (error) {
                console.log('📊 Could not fetch users for conversion rate');
            }
            
            const conversionRate = totalUsers > 0 ? (totalOrders / totalUsers * 100) : 0;
            
            // Update UI
            document.getElementById('stats-total-revenue').textContent = `${totalRevenue.toFixed(2)} TND`;
            document.getElementById('stats-monthly-growth').textContent = `${monthlyGrowth >= 0 ? '+' : ''}${monthlyGrowth.toFixed(1)}%`;
            document.getElementById('stats-avg-order').textContent = `${avgOrderValue.toFixed(2)} TND`;
            document.getElementById('stats-conversion-rate').textContent = `${conversionRate.toFixed(1)}%`;
        }
        
    } catch (error) {
        console.error('❌ Error loading detailed stats:', error);
    }
}

async function loadTopProducts() {
    try {
        const topProductsList = document.getElementById('top-products-list');
        topProductsList.innerHTML = '<div class="text-center py-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700 mx-auto"></div></div>';
        
        // Fetch orders to analyze product sales
        const ordersResponse = await fetch(`${ENV.VITE_APPWRITE_ENDPOINT}/databases/onsi/collections/orders/documents`, {
            method: 'GET',
            headers: {
                'X-Appwrite-Project': ENV.VITE_APPWRITE_PROJECT_ID,
                'Content-Type': 'application/json'
            }
        });
        
        if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            const currentMonth = new Date().getMonth();
            const currentYear = new Date().getFullYear();
            
            // Count products from orders this month
            const productSales = {};
            
            ordersData.documents?.forEach(order => {
                const orderDate = new Date(order.$createdAt || order.createdAt);
                if (orderDate.getMonth() === currentMonth && orderDate.getFullYear() === currentYear) {
                    // Extract products from order (assuming order has items array or productName field)
                    const items = order.items || order.products || [];
                    const productName = order.productName || 'Unknown Product';
                    const orderAmount = parseFloat(order.total || order.totalAmount || order.amount || 0);
                    
                    if (items.length > 0) {
                        items.forEach(item => {
                            const name = item.name || item.productName || 'Product';
                            if (!productSales[name]) {
                                productSales[name] = { count: 0, revenue: 0 };
                            }
                            productSales[name].count += item.quantity || 1;
                            productSales[name].revenue += parseFloat(item.price || item.total || 0);
                        });
                    } else if (productName !== 'Unknown Product') {
                        if (!productSales[productName]) {
                            productSales[productName] = { count: 0, revenue: 0 };
                        }
                        productSales[productName].count += 1;
                        productSales[productName].revenue += orderAmount;
                    }
                }
            });
            
            // Sort products by revenue and get top 3
            const sortedProducts = Object.entries(productSales)
                .sort(([,a], [,b]) => b.revenue - a.revenue)
                .slice(0, 3);
            
            if (sortedProducts.length > 0) {
                topProductsList.innerHTML = sortedProducts.map(([name, data]) => `
                    <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div>
                            <p class="font-medium text-gray-900">${name}</p>
                            <p class="text-sm text-gray-600">${data.count} sales this month</p>
                        </div>
                        <span class="text-green-600 font-semibold">${data.revenue.toFixed(2)} TND</span>
                    </div>
                `).join('');
            } else {
                topProductsList.innerHTML = `
                    <div class="text-center py-8">
                        <svg class="w-12 h-12 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"></path>
                        </svg>
                        <p class="text-gray-600">No product sales this month</p>
                        <p class="text-sm text-gray-500">Product sales data will appear here</p>
                    </div>
                `;
            }
        } else {
            throw new Error('Failed to fetch orders');
        }
        
    } catch (error) {
        console.error('❌ Error loading top products:', error);
        const topProductsList = document.getElementById('top-products-list');
        topProductsList.innerHTML = `
            <div class="text-center py-8 text-red-600">
                <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p>Error loading product data</p>
            </div>
        `;
    }
}

async function loadOrderStatusSummary() {
    try {
        const orderStatusSummary = document.getElementById('order-status-summary');
        orderStatusSummary.innerHTML = '<div class="text-center py-4"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700 mx-auto"></div></div>';
        
        // Fetch orders to get real status counts
        const ordersResponse = await fetch(`${ENV.VITE_APPWRITE_ENDPOINT}/databases/onsi/collections/orders/documents`, {
            method: 'GET',
            headers: {
                'X-Appwrite-Project': ENV.VITE_APPWRITE_PROJECT_ID,
                'Content-Type': 'application/json'
            }
        });
        
        if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            
            // Count order statuses
            const statusCounts = {
                completed: 0,
                processing: 0,
                pending: 0,
                cancelled: 0,
                delivered: 0,
                shipped: 0
            };
            
            ordersData.documents?.forEach(order => {
                const status = (order.status || 'pending').toLowerCase();
                if (statusCounts.hasOwnProperty(status)) {
                    statusCounts[status]++;
                } else {
                    // Default unknown statuses to pending
                    statusCounts.pending++;
                }
            });
            
            // Combine related statuses
            const completedTotal = statusCounts.completed + statusCounts.delivered;
            const processingTotal = statusCounts.processing + statusCounts.shipped;
            
            orderStatusSummary.innerHTML = `
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="w-3 h-3 bg-green-400 rounded-full mr-3"></div>
                        <span class="text-gray-700">Completed</span>
                    </div>
                    <span class="font-semibold text-gray-900">${completedTotal}</span>
                </div>
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="w-3 h-3 bg-blue-400 rounded-full mr-3"></div>
                        <span class="text-gray-700">Processing</span>
                    </div>
                    <span class="font-semibold text-gray-900">${processingTotal}</span>
                </div>
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="w-3 h-3 bg-yellow-400 rounded-full mr-3"></div>
                        <span class="text-gray-700">Pending</span>
                    </div>
                    <span class="font-semibold text-gray-900">${statusCounts.pending}</span>
                </div>
                <div class="flex items-center justify-between">
                    <div class="flex items-center">
                        <div class="w-3 h-3 bg-red-400 rounded-full mr-3"></div>
                        <span class="text-gray-700">Cancelled</span>
                    </div>
                    <span class="font-semibold text-gray-900">${statusCounts.cancelled}</span>
                </div>
            `;
        } else {
            throw new Error('Failed to fetch orders');
        }
        
    } catch (error) {
        console.error('❌ Error loading order status summary:', error);
        const orderStatusSummary = document.getElementById('order-status-summary');
        orderStatusSummary.innerHTML = `
            <div class="text-center py-8 text-red-600">
                <svg class="w-12 h-12 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p>Error loading order status data</p>
            </div>
        `;
    }
}

async function generateRevenueChart() {
    try {
        const chartContainer = document.getElementById('revenue-chart');
        chartContainer.innerHTML = '<div class="flex items-center justify-center h-full"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-700"></div></div>';
        
        // Fetch orders to generate real revenue chart for last 7 days
        const ordersResponse = await fetch(`${ENV.VITE_APPWRITE_ENDPOINT}/databases/onsi/collections/orders/documents`, {
            method: 'GET',
            headers: {
                'X-Appwrite-Project': ENV.VITE_APPWRITE_PROJECT_ID,
                'Content-Type': 'application/json'
            }
        });
        
        if (ordersResponse.ok) {
            const ordersData = await ordersResponse.json();
            
            // Generate last 7 days data
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const revenues = new Array(7).fill(0);
            
            // Calculate revenue for each of the last 7 days
            const today = new Date();
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(today.getDate() - i);
                const dayIndex = (7 - i) % 7;
                
                ordersData.documents?.forEach(order => {
                    const orderDate = new Date(order.$createdAt || order.createdAt);
                    if (orderDate.toDateString() === date.toDateString()) {
                        revenues[dayIndex] += parseFloat(order.total || order.totalAmount || order.amount || 0);
                    }
                });
            }
            
            const maxRevenue = Math.max(...revenues, 1); // Ensure at least 1 to avoid division by 0
            
            chartContainer.innerHTML = '';
            
            revenues.forEach((revenue, index) => {
                const barHeight = maxRevenue > 0 ? (revenue / maxRevenue) * 100 : 0;
                const bar = document.createElement('div');
                bar.className = 'flex flex-col items-center flex-1';
                bar.innerHTML = `
                    <div class="bg-slate-600 w-full rounded-t transition-all duration-500 hover:bg-slate-700" 
                         style="height: ${Math.max(barHeight, 2)}%; min-height: 8px;"></div>
                    <span class="text-xs text-gray-600 mt-2">${days[index]}</span>
                    <span class="text-xs text-gray-500">${revenue.toFixed(0)} TND</span>
                `;
                chartContainer.appendChild(bar);
            });
            
            // Add total for the week
            const weekTotal = revenues.reduce((sum, revenue) => sum + revenue, 0);
            if (weekTotal === 0) {
                chartContainer.innerHTML = `
                    <div class="flex items-center justify-center h-full text-center">
                        <div>
                            <svg class="w-16 h-16 text-gray-400 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path>
                            </svg>
                            <p class="text-gray-600">No revenue data for the past 7 days</p>
                            <p class="text-sm text-gray-500">Revenue data will appear when orders are placed</p>
                        </div>
                    </div>
                `;
            }
        } else {
            throw new Error('Failed to fetch orders');
        }
        
    } catch (error) {
        console.error('❌ Error generating revenue chart:', error);
        const chartContainer = document.getElementById('revenue-chart');
        chartContainer.innerHTML = `
            <div class="flex items-center justify-center h-full text-center">
                <div class="text-red-600">
                    <svg class="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                    <p>Error loading chart data</p>
                </div>
            </div>
        `;
    }
}

// Make functions global for onclick handlers
window.viewFile = viewFile;
window.deleteFile = deleteFile;
window.closeUploadModal = closeUploadModal;
window.loadUsersSection = loadUsersSection;
window.loadStatsSection = loadStatsSection;
window.viewUserDetails = viewUserDetails;
// window.toggleUserStatus = toggleUserStatus; // Function not defined
window.loadDashboardStats = loadDashboardStats;
window.closeDeleteModal = closeDeleteModal;

// Debug function to test order data structure
window.debugOrderData = async function() {
    console.log('🔍 Debug: Checking order data structure...');
    
    try {
        const response = await fetch(`${ENV.VITE_APPWRITE_ENDPOINT}/databases/onsi/collections/orders/documents`, {
            method: 'GET',
            headers: {
                'X-Appwrite-Project': ENV.VITE_APPWRITE_PROJECT_ID,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            console.log('📊 Total orders in database:', data.total);
            console.log('📊 Orders array length:', data.documents?.length || 0);
            
            if (data.documents && data.documents.length > 0) {
                console.log('📊 First order sample:', data.documents[0]);
                console.log('📊 Available fields in first order:', Object.keys(data.documents[0]));
                
                // Check all orders for total amounts
                let totalRevenue = 0;
                data.documents.forEach((order, index) => {
                    const amount = parseFloat(order.total || order.totalAmount || order.amount || 0);
                    totalRevenue += amount;
                    console.log(`Order ${index + 1}: total=${order.total}, amount=${amount}`);
                });
                
                console.log('📊 Calculated total revenue:', totalRevenue, 'TND');
            } else {
                console.log('📊 No orders found in database');
            }
        } else {
            console.error('❌ Failed to fetch orders:', response.status, response.statusText);
        }
    } catch (error) {
        console.error('❌ Debug error:', error);
    }
};

// Quick refresh function
window.refreshDashboard = function() {
    console.log('🔄 Refreshing dashboard...');
    loadDashboardStats();
};
