// Firebase configuration (same as your main app)
const firebaseConfig = {
    apiKey: "AIzaSyAkdcJiuv_aLcMOJgWl2kxUW3EgHHTN5B4",
    authDomain: "onsi-de85f.firebaseapp.com",
    projectId: "onsi-de85f",
    storageBucket: "onsi-de85f.appspot.com",
    messagingSenderId: "965093120451",
    appId: "1:965093120451:web:e3bda0d02aa16bfbc7b1de"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

let currentUser = null;
let allOrders = [];

// Initialize the admin panel
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    setupAuthStateListener();
    loadLocalOrdersCount();
});

function setupEventListeners() {
    document.getElementById('login-btn').addEventListener('click', loginWithGoogle);
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('load-local-orders').addEventListener('click', loadLocalOrders);
    document.getElementById('load-firebase-orders').addEventListener('click', loadFirebaseOrders);
    document.getElementById('export-orders').addEventListener('click', exportOrdersToCSV);
    document.getElementById('clear-local-orders').addEventListener('click', clearLocalOrders);
    document.getElementById('close-modal').addEventListener('click', closeOrderModal);
}

function setupAuthStateListener() {
    auth.onAuthStateChanged(user => {
        currentUser = user;
        updateAuthUI(user);
        if (user) {
            loadFirebaseOrdersCount();
        }
    });
}

function updateAuthUI(user) {
    const authStatus = document.getElementById('auth-status');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    
    if (user) {
        authStatus.textContent = `Authenticated as: ${user.email}`;
        authStatus.className = 'text-sm text-green-700 mb-3';
        loginBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
    } else {
        authStatus.textContent = 'Not authenticated - Firebase orders unavailable';
        authStatus.className = 'text-sm text-red-700 mb-3';
        loginBtn.classList.remove('hidden');
        logoutBtn.classList.add('hidden');
    }
}

async function loginWithGoogle() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        await auth.signInWithPopup(provider);
    } catch (error) {
        console.error('Login error:', error);
        alert('Login failed: ' + error.message);
    }
}

async function logout() {
    try {
        await auth.signOut();
        clearOrdersTable();
    } catch (error) {
        console.error('Logout error:', error);
    }
}

function loadLocalOrdersCount() {
    try {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        document.getElementById('local-orders-count').textContent = orders.length;
    } catch (error) {
        console.error('Error loading local orders count:', error);
        document.getElementById('local-orders-count').textContent = '0';
    }
}

async function loadFirebaseOrdersCount() {
    if (!currentUser) return;
    
    try {
        const snapshot = await db.collection('orders').get();
        document.getElementById('firebase-orders-count').textContent = snapshot.size;
    } catch (error) {
        console.error('Error loading Firebase orders count:', error);
        document.getElementById('firebase-orders-count').textContent = '0';
    }
}

function loadLocalOrders() {
    try {
        const orders = JSON.parse(localStorage.getItem('orders') || '[]');
        const ordersWithSource = orders.map(order => ({...order, source: 'localStorage'}));
        displayOrders(ordersWithSource);
        updateStats(ordersWithSource);
    } catch (error) {
        console.error('Error loading local orders:', error);
        alert('Failed to load local orders');
    }
}

async function loadFirebaseOrders() {
    if (!currentUser) {
        alert('Please login first to access Firebase orders');
        return;
    }
    
    try {
        const snapshot = await db.collection('orders').orderBy('createdAt', 'desc').get();
        const orders = [];
        snapshot.forEach(doc => {
            orders.push({...doc.data(), source: 'Firebase', id: doc.id});
        });
        displayOrders(orders);
        updateStats(orders);
    } catch (error) {
        console.error('Error loading Firebase orders:', error);
        alert('Failed to load Firebase orders: ' + error.message);
    }
}

function displayOrders(orders) {
    allOrders = orders;
    const tbody = document.getElementById('orders-table-body');
    const noOrdersDiv = document.getElementById('no-orders');
    
    if (orders.length === 0) {
        tbody.innerHTML = '';
        noOrdersDiv.classList.remove('hidden');
        return;
    }
    
    noOrdersDiv.classList.add('hidden');
    
    tbody.innerHTML = orders.map(order => `
        <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                ${order.orderNumber}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${new Date(order.createdAt).toLocaleDateString()}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                <div>${order.customerInfo.name}</div>
                <div class="text-xs text-gray-500">${order.customerInfo.email}</div>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                ${order.items.map(item => `${item.quantity}x ${item.name}`).join(', ')}
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                $${order.total.toFixed(2)}
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(order.status)}">
                    ${order.status}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap">
                <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${order.source === 'Firebase' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}">
                    ${order.source}
                </span>
            </td>
            <td class="px-6 py-4 whitespace-nowrap text-sm font-medium">
                <button onclick="viewOrderDetails('${order.orderNumber}')" class="text-blue-600 hover:text-blue-900 mr-2">View</button>
                <button onclick="copyOrderDetails('${order.orderNumber}')" class="text-green-600 hover:text-green-900">Copy</button>
            </td>
        </tr>
    `).join('');
}

function getStatusColor(status) {
    switch (status?.toLowerCase()) {
        case 'pending': return 'bg-yellow-100 text-yellow-800';
        case 'confirmed': return 'bg-green-100 text-green-800';
        case 'shipped': return 'bg-blue-100 text-blue-800';
        case 'delivered': return 'bg-purple-100 text-purple-800';
        case 'cancelled': return 'bg-red-100 text-red-800';
        default: return 'bg-gray-100 text-gray-800';
    }
}

function updateStats(orders) {
    const totalRevenue = orders.reduce((sum, order) => sum + (order.total || 0), 0);
    document.getElementById('total-revenue').textContent = `$${totalRevenue.toFixed(2)}`;
}

function viewOrderDetails(orderNumber) {
    const order = allOrders.find(o => o.orderNumber === orderNumber);
    if (!order) return;
    
    const modal = document.getElementById('order-modal');
    const content = document.getElementById('order-details-content');
    
    content.innerHTML = `
        <div class="space-y-4">
            <div>
                <h4 class="font-semibold text-gray-900">Order Information</h4>
                <div class="mt-2 bg-gray-50 p-3 rounded">
                    <p><strong>Order Number:</strong> ${order.orderNumber}</p>
                    <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
                    <p><strong>Status:</strong> ${order.status}</p>
                    <p><strong>Source:</strong> ${order.source}</p>
                    <p><strong>User ID:</strong> ${order.userId || 'Guest'}</p>
                </div>
            </div>
            
            <div>
                <h4 class="font-semibold text-gray-900">Customer Information</h4>
                <div class="mt-2 bg-gray-50 p-3 rounded">
                    <p><strong>Name:</strong> ${order.customerInfo.name}</p>
                    <p><strong>Email:</strong> ${order.customerInfo.email}</p>
                    <p><strong>Phone:</strong> ${order.customerInfo.phone}</p>
                    <p><strong>Address:</strong> ${order.customerInfo.address}</p>
                    <p><strong>City:</strong> ${order.customerInfo.city}</p>
                    <p><strong>Postal Code:</strong> ${order.customerInfo.postalCode}</p>
                    <p><strong>Country:</strong> ${order.customerInfo.country}</p>
                </div>
            </div>
            
            <div>
                <h4 class="font-semibold text-gray-900">Order Items</h4>
                <div class="mt-2 bg-gray-50 p-3 rounded">
                    ${order.items.map(item => `
                        <div class="flex justify-between items-center py-1">
                            <span>${item.name} x ${item.quantity}</span>
                            <span>$${item.total.toFixed(2)}</span>
                        </div>
                    `).join('')}
                    <div class="border-t pt-2 mt-2 font-semibold">
                        <div class="flex justify-between items-center">
                            <span>Total:</span>
                            <span>$${order.total.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    modal.classList.remove('hidden');
}

function copyOrderDetails(orderNumber) {
    const order = allOrders.find(o => o.orderNumber === orderNumber);
    if (!order) return;
    
    const orderText = `
Order: ${order.orderNumber}
Date: ${new Date(order.createdAt).toLocaleString()}
Customer: ${order.customerInfo.name}
Email: ${order.customerInfo.email}
Phone: ${order.customerInfo.phone}
Address: ${order.customerInfo.address}, ${order.customerInfo.city}, ${order.customerInfo.postalCode}, ${order.customerInfo.country}
Items: ${order.items.map(item => `${item.name} x${item.quantity} - $${item.total.toFixed(2)}`).join(', ')}
Total: $${order.total.toFixed(2)}
Status: ${order.status}
    `.trim();
    
    navigator.clipboard.writeText(orderText).then(() => {
        alert('Order details copied to clipboard');
    }).catch(err => {
        console.error('Failed to copy:', err);
        alert('Failed to copy order details');
    });
}

function closeOrderModal() {
    document.getElementById('order-modal').classList.add('hidden');
}

function exportOrdersToCSV() {
    if (allOrders.length === 0) {
        alert('No orders to export');
        return;
    }
    
    const csvHeader = 'Order Number,Date,Customer Name,Email,Phone,Address,City,Postal Code,Country,Items,Total,Status,Source\n';
    const csvRows = allOrders.map(order => {
        const items = order.items.map(item => `${item.name} x${item.quantity}`).join('; ');
        return [
            order.orderNumber,
            new Date(order.createdAt).toISOString(),
            order.customerInfo.name,
            order.customerInfo.email,
            order.customerInfo.phone,
            order.customerInfo.address,
            order.customerInfo.city,
            order.customerInfo.postalCode,
            order.customerInfo.country,
            `"${items}"`,
            order.total.toFixed(2),
            order.status,
            order.source
        ].join(',');
    }).join('\n');
    
    const csvContent = csvHeader + csvRows;
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `onsi-orders-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function clearLocalOrders() {
    if (confirm('Are you sure you want to clear all local orders? This cannot be undone.')) {
        localStorage.removeItem('orders');
        loadLocalOrdersCount();
        clearOrdersTable();
        alert('Local orders cleared');
    }
}

function clearOrdersTable() {
    document.getElementById('orders-table-body').innerHTML = '';
    document.getElementById('no-orders').classList.remove('hidden');
    allOrders = [];
    document.getElementById('total-revenue').textContent = '$0.00';
}