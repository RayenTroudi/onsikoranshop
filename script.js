// Import Appwrite authentication directly
// Using dynamic import to ensure proper loading order
let appwriteAuth = null;

// Appwrite Storage Configuration
const APPWRITE_STORAGE = {
	endpoint: 'https://fra.cloud.appwrite.io/v1',
	projectId: '69319f7f003127073ff3',
	bucketId: '691735da003dc83b3baf'
};

// Helper function to get file URL from Appwrite Storage
function getAppwriteFileUrl(fileName) {
	return `${APPWRITE_STORAGE.endpoint}/storage/buckets/${APPWRITE_STORAGE.bucketId}/files/${fileName}/view?project=${APPWRITE_STORAGE.projectId}`;
}

const state = {
	items: [], // {id, name, price, qty}
	language: localStorage.getItem('lang') || 'ar',
	currency: localStorage.getItem('currency') || 'TND', // TND or EUR
	user: null, // Current authenticated user
};

const PRODUCT = {
	id: 'default',
	name: 'Quranic Verses Box',
	price: null, // TND price
	priceEur: null // EUR price
};

// Exchange rate: 1 EUR = ~3.3 TND (used as fallback when priceEur is not set)
const EXCHANGE_RATE = 3.3;

// Convert price based on selected currency
function convertPrice(priceInTND) {
	if (state.currency === 'EUR') {
		// Use actual EUR price if available, otherwise convert from TND
		if (PRODUCT.priceEur !== null && PRODUCT.priceEur !== undefined) {
			return PRODUCT.priceEur;
		}
		return priceInTND / EXCHANGE_RATE;
	}
	return priceInTND;
}

// Format currency with symbol (applies conversion)
function formatCurrency(value) {
	const convertedValue = convertPrice(value);
	if (state.currency === 'EUR') {
		return `€${convertedValue.toFixed(2)}`;
	}
	return `${convertedValue.toFixed(2)} TND`;
}

// Format currency for already converted amounts (no conversion applied)
function formatCurrencyAmount(value) {
	if (state.currency === 'EUR') {
		return `€${value.toFixed(2)}`;
	}
	return `${value.toFixed(2)} TND`;
}

// Toggle currency
function toggleCurrency() {
	state.currency = state.currency === 'TND' ? 'EUR' : 'TND';
	localStorage.setItem('currency', state.currency);
	updateAllPrices();
	updateCurrencyButton();
}

// Update currency button display
function updateCurrencyButton() {
	const currencyBtn = document.getElementById('currency-toggle');
	const currencyLabel = document.getElementById('currency-label');
	if (currencyLabel) {
		// Show current currency
		currencyLabel.textContent = state.currency;
	}
	if (currencyBtn) {
		// Update title to show what currency it will switch to
		currencyBtn.title = state.currency === 'TND' ? 'Switch to EUR' : 'Switch to TND';
	}
}

// Update all prices on the page
function updateAllPrices() {
	updatePriceDisplays();
	renderCart();
}

// Load product data from Appwrite
async function loadProductFromDatabase() {
	try {
		console.log('📦 Loading product from Appwrite...');
		const response = await fetch(
			`https://fra.cloud.appwrite.io/v1/databases/onsi/collections/products/documents`,
			{
				method: 'GET',
				headers: {
					'X-Appwrite-Project': '69319f7f003127073ff3',
					'Content-Type': 'application/json'
				},
				credentials: 'include'
			}
		);
		
		if (!response.ok) {
			console.error('❌ Failed to load product:', response.status);
			return;
		}
		
		const data = await response.json();
		
		if (data.documents && data.documents.length > 0) {
			// Find the main product or use the first active one
			const product = data.documents.find(p => p.status === 'active') || data.documents[0];
			
			PRODUCT.id = product.$id;
			PRODUCT.name = product.name;
			PRODUCT.price = product.price || parseFloat(window.ENV?.VITE_PRODUCT_PRICE) || null;
			PRODUCT.priceEur = product.priceEur || null;
			
			console.log('✅ Product loaded from database:', PRODUCT);
			console.log('📦 Total products available:', data.documents.length);
			
			// Update all price displays on the page
			updatePriceDisplays();
			
			// Update product name if it has changed
			const nameElements = document.querySelectorAll('[data-i18n="product.name"]');
			nameElements.forEach(el => {
				if (!el.dataset.originalText) {
					el.dataset.originalText = el.textContent;
				}
				el.textContent = product.name;
			});
		} else {
			console.warn('⚠️ No products found in database, using default product');
		}
	} catch (error) {
		console.error('❌ Error loading product:', error);
	}
}

// Update all price displays on the page
function updatePriceDisplays() {
	// Update all elements with data-product-price attribute
	const priceElements = document.querySelectorAll('[data-product-price]');
	priceElements.forEach(el => {
		if (PRODUCT.price !== null && PRODUCT.price !== undefined) {
			el.textContent = formatCurrency(PRODUCT.price);
		} else {
			el.textContent = 'Price not available';
		}
	});
	
	const priceText = PRODUCT.price !== null ? formatCurrency(PRODUCT.price) : 'Price not available';
	console.log(`✅ Updated ${priceElements.length} price displays to: ${priceText}`);
	
	// Update prices in existing cart items
	state.items.forEach(item => {
		if (item.id === PRODUCT.id || item.id === 'default') {
			item.price = PRODUCT.price;
		}
	});
	
	// Re-render cart to update item prices
	renderCart();
	
	// Update structured data
	updateStructuredDataPrice();
}

// Update structured data price
function updateStructuredDataPrice() {
	if (PRODUCT.price !== null && PRODUCT.price !== undefined) {
		const scripts = document.querySelectorAll('script[type="application/ld+json"]');
		scripts.forEach(script => {
			try {
				const data = JSON.parse(script.textContent);
				if (data['@type'] === 'Product' && data.offers && data.offers.price !== undefined) {
					data.offers.price = PRODUCT.price.toString();
					script.textContent = JSON.stringify(data, null, 2);
					console.log('✅ Updated Product schema price');
				}
			} catch (error) {
				console.warn('⚠️ Could not update structured data:', error);
			}
		});
	}
}

function findItem(id) {
	return state.items.find(i => i.id === id);
}

function upsertItem(id, deltaQty = 1) {
	const existing = findItem(id);
	if (existing) {
		existing.qty += deltaQty;
		if (existing.qty <= 0) {
			state.items = state.items.filter(i => i.id !== id);
		}
	} else if (deltaQty > 0) {
		state.items.push({ id, name: PRODUCT.name, price: PRODUCT.price, qty: deltaQty });
	}
	renderCart();
	
	// Save cart for authenticated users
	if (window.appwriteAuth && window.appwriteAuth.getCurrentUser()) {
		try {
			window.appwriteAuth.saveUserCart(state.items);
		} catch (error) {
			console.error('Error saving cart:', error);
		}
	}
}

function removeItem(id) {
	state.items = state.items.filter(i => i.id !== id);
	renderCart();
}

function clearCart() {
	
	state.items = [];
	localStorage.removeItem('cart');
	renderCart();
	
}

function subtotal() {
	// Calculate subtotal in the current currency
	return state.items.reduce((sum, i) => {
		const convertedPrice = convertPrice(i.price);
		return sum + (convertedPrice * i.qty);
	}, 0);
}

function renderCart() {
	const itemsEl = document.getElementById('cart-items');
	const subtotalEl = document.getElementById('cart-subtotal');
	const countEl = document.getElementById('cart-count');
	const emptyStateEl = document.getElementById('empty-cart-state');
	const totalQty = state.items.reduce((n, i) => n + i.qty, 0);
	countEl.textContent = totalQty;

	if (state.items.length === 0) {
		// Show empty state and hide cart items
		if (emptyStateEl) {
			emptyStateEl.classList.remove('hidden');
		}
		itemsEl.innerHTML = '';
	} else {
		// Hide empty state and show cart items
		if (emptyStateEl) {
			emptyStateEl.classList.add('hidden');
		}
		itemsEl.innerHTML = state.items.map(i => {
			// Convert price once, multiply by qty
			const convertedPrice = convertPrice(i.price);
			const lineTotal = convertedPrice * i.qty;
			return `
			<div class="cart-item flex items-center justify-between gap-3 border border-neutral-200 rounded-lg p-3">
				<div>
					<div class="text-sm font-medium">${i.name}</div>
					<div class="text-xs text-neutral-500 cart-item-price">${formatCurrencyAmount(lineTotal)}</div>
				</div>
				<div class="flex items-center gap-2">
					<div class="quantity-controls">
						<button class="qty quantity-btn" data-id="${i.id}" data-delta="-1" aria-label="${t('cart.decrease')}">−</button>
						<span class="quantity-display">${i.qty}</span>
						<button class="qty quantity-btn" data-id="${i.id}" data-delta="1" aria-label="${t('cart.increase')}">+</button>
					</div>
					<button class="remove text-xs text-slate-700 hover:text-red-600 transition-colors ml-2" data-id="${i.id}">${t('actions.remove')}</button>
				</div>
			</div>
		`;
		}).join('');
	}

	if (subtotalEl) {
		subtotalEl.textContent = formatCurrencyAmount(subtotal());
	}
	
	// Save cart after rendering
	saveCart();
}

// Cart persistence functions
function saveCart() {
	try {
		// Save to localStorage for guest users
		localStorage.setItem('cart', JSON.stringify(state.items));
		
		// Save to Firebase for authenticated users
		if (state.user && window.appwriteAuth) {
			window.appwriteAuth.saveUserCart(state.items);
		}
	} catch (error) {
		console.error('Failed to save cart:', error);
	}
}

function loadCart() {
	try {
		// Load from localStorage first (for guest users or as fallback)
		const savedCart = localStorage.getItem('cart');
		if (savedCart) {
			state.items = JSON.parse(savedCart);
			renderCart();
		}
	} catch (error) {
		console.error('Failed to load cart from localStorage:', error);
		state.items = [];
	}
}

async function loadUserCart() {
	if (!state.user || !window.appwriteAuth) return;
	
	try {
		// Load cart from Appwrite for authenticated users
		const userCart = await window.appwriteAuth.getUserCart();
		if (userCart && userCart.length > 0) {
			// Merge with local cart (in case user had items before login)
			const localItems = [...state.items];
			state.items = [...userCart];
			
			// Add any local items that aren't already in user cart
			localItems.forEach(localItem => {
				const existingItem = state.items.find(item => item.id === localItem.id);
				if (!existingItem) {
					state.items.push(localItem);
				} else {
					// Merge quantities
					existingItem.qty += localItem.qty;
				}
			});
			
			renderCart();
			
			// Clear localStorage cart after successful merge
			localStorage.removeItem('cart');
		}
	} catch (error) {
		console.error('Failed to load user cart:', error);
	}
}

function openCart() {
	try {
		const cartEl = document.getElementById('cart');
		if (cartEl) {
			cartEl.classList.remove('hidden');
			// Force reflow to ensure the element is rendered before adding show class
			cartEl.offsetHeight;
			cartEl.classList.add('show');
		} else {
			console.error('Cart element not found');
		}
	} catch (error) {
		console.error('Error opening cart:', error);
	}
}

function closeCart() {
	try {
		const cartEl = document.getElementById('cart');
		if (cartEl) {
			cartEl.classList.remove('show');
			// Add hidden class after animation completes
			setTimeout(() => {
				cartEl.classList.add('hidden');
			}, 300); // Match the transition duration
		} else {
			console.error('Cart element not found');
		}
	} catch (error) {
		console.error('Error closing cart:', error);
	}
}

function openCheckout() {
	// Pre-fill email if user is logged in, otherwise clear it for guest checkout
	const emailInput = document.getElementById('checkout-email');
	if (state.user && state.user.email) {
		emailInput.value = state.user.email;
		// Optionally make email read-only for logged in users
		// emailInput.readOnly = true;
	} else {
		emailInput.value = '';
		emailInput.readOnly = false;
	}
	
	// Populate checkout summary
	updateCheckoutSummary();
	
	document.getElementById('checkout-modal').classList.remove('hidden');
}

function closeCheckout() {
	document.getElementById('checkout-modal').classList.add('hidden');
	// Reset form
	document.getElementById('checkout-form').reset();
}

function updateCheckoutSummary() {
	const itemsEl = document.getElementById('checkout-items');
	const totalEl = document.getElementById('checkout-total');
	
	// Render items
	itemsEl.innerHTML = state.items.map(item => {
		// Convert price first, then multiply by quantity
		const convertedPrice = convertPrice(item.price);
		const itemTotal = convertedPrice * item.qty;
		return `
		<div class="flex justify-between items-center py-2">
			<div>
				<span class="font-medium">${item.name}</span>
				<span class="text-sm text-neutral-600 ml-2">× ${item.qty}</span>
			</div>
			<span class="font-medium">${formatCurrencyAmount(itemTotal)}</span>
		</div>
	`;
	}).join('');
	
	// Update total (subtotal already handles currency conversion)
	totalEl.textContent = formatCurrencyAmount(subtotal());
}

function validateCheckoutForm(formData) {
	const errors = [];
	
	// Validate required fields
	if (!formData.name) errors.push(t('validation.name_required'));
	if (!formData.email) errors.push(t('validation.email_required'));
	if (!formData.phone) errors.push(t('validation.phone_required'));
	if (!formData.address) errors.push(t('validation.address_required'));
	if (!formData.city) errors.push(t('validation.city_required'));
	if (!formData.postalCode) errors.push(t('validation.postal_required'));
	if (!formData.country) errors.push(t('validation.country_required'));
	
	// Validate email format
	const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	if (formData.email && !emailRegex.test(formData.email)) {
		errors.push(t('validation.email_invalid'));
	}
	
	// Show errors if any
	if (errors.length > 0) {
		showNotification(errors.join('<br>'), 'error');
		return false;
	}
	
	return true;
}

function setCheckoutLoading(loading) {
	const btn = document.getElementById('place-order-btn');
	const text = document.getElementById('place-order-text');
	const spinner = document.getElementById('place-order-loading');
	
	if (loading) {
		btn.disabled = true;
		btn.classList.add('opacity-50', 'cursor-not-allowed');
		text.classList.add('opacity-0');
		spinner.classList.remove('hidden');
	} else {
		btn.disabled = false;
		btn.classList.remove('opacity-50', 'cursor-not-allowed');
		text.classList.remove('opacity-0');
		spinner.classList.add('hidden');
	}
}

async function processOrder(formData) {
	try {
		// Generate order number
		const orderNumber = generateOrderNumber();
		
		// Prepare order data with proper currency handling
		const orderData = {
			orderNumber,
			userId: state.user ? state.user.$id : null,
			customerInfo: formData,
			currency: state.currency, // Store the currency used for the order
			items: state.items.map(item => {
				const convertedPrice = convertPrice(item.price);
				return {
					id: item.id,
					name: item.name,
					price: item.price, // Original TND price for reference
					priceInOrderCurrency: convertedPrice, // Price in the currency selected at purchase time
					quantity: item.qty,
					totalInOrderCurrency: convertedPrice * item.qty // Line total in the order currency
				};
			}),
			subtotal: subtotal(), // This now returns the subtotal in the current currency (TND or EUR)
			total: subtotal(), // For now, no tax or shipping
			status: 'pending',
			createdAt: new Date().toISOString(),
			timestamp: Date.now()
		};
		
		// Save order to Appwrite Database for both authenticated and guest users
		try {
			await saveOrderToAppwrite(orderData);
		} catch (error) {
			console.error('Failed to save order to Appwrite:', error);
			// Save to localStorage as fallback
			saveOrderToLocalStorage(orderData);
		}
		
		// Send email notifications using Resend
		try {
			console.log('🚀 Attempting to send order notification emails...');
			const emailResult = await sendOrderNotificationsGmail(orderData);
			console.log('📧 Email result:', emailResult);
			if (!emailResult.success) {
				console.warn('⚠️ Email sending failed but order was saved:', emailResult.error);
			}
		} catch (error) {
			console.error('❌ Failed to send email notifications:', error);
			console.error('❌ Error stack:', error.stack);
			// Don't fail the order if email fails
		}
		
		return {
			success: true,
			orderNumber,
			orderData
		};
	} catch (error) {
		console.error('Order processing error:', error);
		return {
			success: false,
			error: error.message || 'Failed to process order'
		};
	}
}

function generateOrderNumber() {
	const timestamp = Date.now().toString().slice(-6);
	const random = Math.random().toString(36).substr(2, 4).toUpperCase();
	return `ONS-${timestamp}-${random}`;
}

// Save order to Appwrite Database
async function saveOrderToAppwrite(orderData) {
	try {
		if (!window.appwriteAuth) {
			throw new Error('Appwrite not initialized');
		}
		
		// Import Appwrite SDK
		const { Databases, ID } = await import('https://cdn.skypack.dev/appwrite@15.0.0');
		const { Client } = await import('https://cdn.skypack.dev/appwrite@15.0.0');
		
		// Create Appwrite client
		const client = new Client()
			.setEndpoint('https://fra.cloud.appwrite.io/v1')
			.setProject('69319f7f003127073ff3');
		
		const databases = new Databases(client);
		
		// Prepare order document - matching your exact collection attributes
		const orderDocument = {
			userId: orderData.userId || 'guest',
			customerEmail: orderData.customerInfo.email,
			customerName: orderData.customerInfo.name,
			shippingAddress: `${orderData.customerInfo.address}, ${orderData.customerInfo.city}, ${orderData.customerInfo.postalCode}, ${orderData.customerInfo.country}. Phone: ${orderData.customerInfo.phone}`,
			items: JSON.stringify(orderData.items),
			total: orderData.total,
			status: orderData.status
		};
		
		// Save order to Appwrite database
		const order = await databases.createDocument(
			'onsi', // Database ID
			'orders', // Collection ID
			ID.unique(), // Document ID - will become $id
			orderDocument // $createdAt is automatically added by Appwrite
		);
		
		console.log('✅ Order saved to Appwrite:', order);
		return order;
	} catch (error) {
		console.error('❌ Failed to save order to Appwrite:', error);
		console.error('Error details:', error.message);
		
		// Save to localStorage as fallback
		saveOrderToLocalStorage(orderData);
		
		// Don't throw - allow order to continue
		return null;
	}
}

// Save order to localStorage for guest users or as backup
function saveOrderToLocalStorage(orderData) {
	try {
		let orders = JSON.parse(localStorage.getItem('orders') || '[]');
		orders.push(orderData);
		// Keep only last 10 orders to avoid storage issues
		if (orders.length > 10) {
			orders = orders.slice(-10);
		}
		localStorage.setItem('orders', JSON.stringify(orders));
		
	} catch (error) {
		console.error('Failed to save order to localStorage:', error);
	}
}

// Send email notifications via Appwrite function
async function sendOrderNotificationsGmail(orderData) {
	try {
		const functionEndpoint = window.ENV?.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
		const projectId = window.ENV?.VITE_APPWRITE_PROJECT_ID || '69319f7f003127073ff3';
		
		console.log('📧 Sending order emails via Appwrite function...');
		console.log('📧 Customer email:', orderData.customerInfo.email);
		
		// Format items list
		const itemsList = orderData.items.map(item => 
			`• ${item.name || item.nameAr} x ${item.quantity} = ${item.total.toFixed(2)} TND`
		).join('\n');
		
		const orderDate = new Date(orderData.createdAt).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		});
		
		// Customer email HTML
		const customerEmailHtml = `
			<!DOCTYPE html>
			<html>
			<head>
				<style>
					body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
					.container { max-width: 600px; margin: 0 auto; padding: 20px; }
					.header { background: linear-gradient(135deg, #1e293b 0%, #334155 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
					.content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
					.order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
					.items { margin: 15px 0; }
					.total { font-size: 1.2em; font-weight: bold; color: #1e293b; margin-top: 15px; }
					.footer { text-align: center; margin-top: 30px; color: #666; font-size: 0.9em; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h1>✅ Order Confirmed!</h1>
						<p>Thank you for your order, ${orderData.customerInfo.name}!</p>
					</div>
					<div class="content">
						<div class="order-details">
							<h2>Order Details</h2>
							<p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
							<p><strong>Order Date:</strong> ${orderDate}</p>
							<div class="items">
								<h3>Items:</h3>
								<pre>${itemsList}</pre>
							</div>
							<p class="total">Total: ${orderData.total.toFixed(2)} TND</p>
							<h3>Shipping Address:</h3>
							<p>${orderData.customerInfo.address}<br>
							${orderData.customerInfo.city}, ${orderData.customerInfo.postalCode}<br>
							${orderData.customerInfo.country}</p>
						</div>
						<div class="footer">
							<p>We'll process your order shortly and keep you updated.</p>
							<p>© 2025 ONSi Koran Shop. All rights reserved.</p>
						</div>
					</div>
				</div>
			</body>
			</html>
		`;
		
		// Admin email HTML
		const adminEmailHtml = `
			<!DOCTYPE html>
			<html>
			<head>
				<style>
					body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
					.container { max-width: 600px; margin: 0 auto; padding: 20px; }
					.header { background: linear-gradient(135deg, #dc2626 0%, #ef4444 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
					.content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
					.order-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
				</style>
			</head>
			<body>
				<div class="container">
					<div class="header">
						<h1>🔔 New Order Received!</h1>
					</div>
					<div class="content">
						<div class="order-details">
							<h2>Order #${orderData.orderNumber}</h2>
							<p><strong>Customer:</strong> ${orderData.customerInfo.name}</p>
							<p><strong>Email:</strong> ${orderData.customerInfo.email}</p>
							<p><strong>Phone:</strong> ${orderData.customerInfo.phone}</p>
							<p><strong>Date:</strong> ${orderDate}</p>
							<h3>Items:</h3>
							<pre>${itemsList}</pre>
							<p><strong>Total:</strong> ${orderData.total.toFixed(2)} TND</p>
							<h3>Shipping Address:</h3>
							<p>${orderData.customerInfo.address}<br>
							${orderData.customerInfo.city}, ${orderData.customerInfo.postalCode}<br>
							${orderData.customerInfo.governorate || orderData.customerInfo.city}<br>
							${orderData.customerInfo.country}</p>
						</div>
					</div>
				</div>
			</body>
			</html>
		`;
		
		// Call Appwrite function to send emails
		const functionUrl = `${functionEndpoint}/functions/6931cddd003de76af6ea/executions`;
		console.log('🚀 Calling email function:', functionUrl);
		console.log('📦 Order data being sent:', JSON.stringify(orderData, null, 2));
		
		const response = await fetch(functionUrl, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'X-Appwrite-Project': projectId
			},
			body: JSON.stringify({
				body: JSON.stringify(orderData),
				async: false
			})
		});
		
		console.log('📥 Function response status:', response.status);
		
		if (!response.ok) {
			const errorText = await response.text();
			console.error('❌ Function error response:', errorText);
			throw new Error(`Email function failed (${response.status}): ${errorText}`);
		}
		
		const result = await response.json();
		console.log('✅ Function execution result:', result);
		
		// Wait for function to complete
		if (result.status === 'failed') {
			console.error('❌ Function execution failed:', result.responseBody);
			throw new Error(`Email sending failed: ${result.responseBody}`);
		}
		
		if (result.status === 'waiting' || result.status === 'processing') {
			console.log('⏳ Email function is processing...');
			// Function will complete asynchronously
			return { success: true, message: 'Email function triggered successfully' };
		}
		
		console.log('✅ Order emails sent successfully!');
		return { success: true, result };
		
	} catch (error) {
		console.error('❌ Email function error:', error);
		console.error('Error details:', error.message);
		
		// Don't fail the order if email fails
		console.warn('⚠️ Order completed successfully, but email notification failed');
		return { success: false, error: error.message };
	}
}

function showOrderConfirmation(orderNumber) {
	document.getElementById('order-number').textContent = orderNumber;
	document.getElementById('order-confirmation-modal').classList.remove('hidden');
}

function showNotification(message, type = 'info') {
	// Create notification element if it doesn't exist
	let notification = document.getElementById('notification');
	if (!notification) {
		notification = document.createElement('div');
		notification.id = 'notification';
		notification.className = 'fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 translate-x-full opacity-0';
		document.body.appendChild(notification);
	}
	
	// Set notification style based on type
	const styles = {
		success: 'bg-green-100 text-green-800 border border-green-200',
		error: 'bg-red-100 text-red-800 border border-red-200',
		info: 'bg-blue-100 text-blue-800 border border-blue-200'
	};
	
	notification.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ${styles[type] || styles.info}`;
	notification.innerHTML = message;
	
	// Show notification
	setTimeout(() => {
		notification.classList.remove('translate-x-full', 'opacity-0');
	}, 100);
	
	// Hide notification after 5 seconds
	setTimeout(() => {
		notification.classList.add('translate-x-full', 'opacity-0');
	}, 5000);
}

// Make showNotification globally available for appwrite-config.js
window.showNotification = showNotification;

// Event bindings
// Event listeners are now initialized in initializeEventListeners() function

function initializeEventListeners() {
	
	// Currency toggle button
	const currencyToggle = document.getElementById('currency-toggle');
	if (currencyToggle) {
		currencyToggle.addEventListener('click', () => {
			toggleCurrency();
		});
	}
	
	// Main click event listener for various elements
	document.addEventListener('click', (e) => {
		const add = e.target.closest('.add-to-cart');
		if (add) {
			const id = add.getAttribute('data-add');
			upsertItem(id, 1);
			openCart();
		}

		if (e.target.matches('#open-cart')) {
			openCart();
		}
		if (e.target.matches('[data-close="btn"], [data-close="overlay"]')) {
			closeCart();
		}
		if (e.target.matches('[data-close-checkout="btn"], [data-close-checkout="overlay"]')) closeCheckout();

		if (e.target.matches('.qty')) {
			const id = e.target.getAttribute('data-id');
			const delta = Number(e.target.getAttribute('data-delta'));
			upsertItem(id, delta);
		}
		if (e.target.matches('.remove')) {
			removeItem(e.target.getAttribute('data-id'));
		}
	});
	
	// Dedicated cart open button event listener (backup)
	const openCartBtn = document.getElementById('open-cart');
	if (openCartBtn) {
		openCartBtn.addEventListener('click', (e) => {
			e.preventDefault();
			openCart();
		});
	}
	
	// Dedicated cart close button event listener (backup)
	const closeCartBtn = document.querySelector('[data-close="btn"]');
	if (closeCartBtn) {
		closeCartBtn.addEventListener('click', (e) => {
			e.preventDefault();
			closeCart();
		});
	}

	// Checkout button event listener
	const checkoutBtn = document.getElementById('checkout');
	if (checkoutBtn) {
		checkoutBtn.addEventListener('click', () => {
			if (state.items.length === 0) return;
			
			// Allow both authenticated and guest users to checkout
			openCheckout();
		});
	}

	// Handle order confirmation modal close
	const closeConfirmationBtn = document.getElementById('close-confirmation');
	if (closeConfirmationBtn) {
		closeConfirmationBtn.addEventListener('click', () => {
			document.getElementById('order-confirmation-modal').classList.add('hidden');
		});
	}

	// Checkout form submit listener
	const checkoutForm = document.getElementById('checkout-form');
	if (checkoutForm) {
		checkoutForm.addEventListener('submit', async (e) => {
	e.preventDefault();
	
	if (state.items.length === 0) {
		showNotification(t('checkout.empty_cart'), 'error');
		return;
	}
	
	// Get form data
	const formData = {
		name: document.getElementById('checkout-name').value.trim(),
		email: document.getElementById('checkout-email').value.trim(),
		phone: document.getElementById('checkout-phone').value.trim(),
		address: document.getElementById('checkout-address').value.trim(),
		city: document.getElementById('checkout-city').value.trim(),
		postalCode: document.getElementById('checkout-postal').value.trim(),
		country: document.getElementById('checkout-country').value
	};
	
	// Validate form data
	if (!validateCheckoutForm(formData)) {
		return;
	}
	
	// Show loading state
	setCheckoutLoading(true);
	
	try {
		// Process the order
		const orderResult = await processOrder(formData);
		
		if (orderResult.success) {
			// Clear cart
			state.items = [];
			renderCart();
			
			// Close checkout modal
			closeCheckout();
			closeCart();
			
			// Show order confirmation
			showOrderConfirmation(orderResult.orderNumber);
			
			// Show success notification
			showNotification(t('checkout.success'), 'success');
		} else {
			throw new Error(orderResult.error || 'Order processing failed');
		}
	} catch (error) {
		console.error('Checkout error:', error);
		showNotification(error.message || t('checkout.error'), 'error');
	} finally {
		setCheckoutLoading(false);
	}
		});
	}
	
	// Initialize country selector
	initializeCountrySelector();
}

// Country Selector with Search Functionality
function initializeCountrySelector() {
	const countries = [
		{ code: '', name: 'Select Country' },
		{ code: 'AF', name: 'Afghanistan' },
		{ code: 'AX', name: 'Åland Islands' },
		{ code: 'AL', name: 'Albania' },
		{ code: 'DZ', name: 'Algeria' },
		{ code: 'AS', name: 'American Samoa' },
		{ code: 'AD', name: 'Andorra' },
		{ code: 'AO', name: 'Angola' },
		{ code: 'AI', name: 'Anguilla' },
		{ code: 'AQ', name: 'Antarctica' },
		{ code: 'AG', name: 'Antigua and Barbuda' },
		{ code: 'AR', name: 'Argentina' },
		{ code: 'AM', name: 'Armenia' },
		{ code: 'AW', name: 'Aruba' },
		{ code: 'AU', name: 'Australia' },
		{ code: 'AT', name: 'Austria' },
		{ code: 'AZ', name: 'Azerbaijan' },
		{ code: 'BS', name: 'Bahamas' },
		{ code: 'BH', name: 'Bahrain' },
		{ code: 'BD', name: 'Bangladesh' },
		{ code: 'BB', name: 'Barbados' },
		{ code: 'BY', name: 'Belarus' },
		{ code: 'BE', name: 'Belgium' },
		{ code: 'BZ', name: 'Belize' },
		{ code: 'BJ', name: 'Benin' },
		{ code: 'BM', name: 'Bermuda' },
		{ code: 'BT', name: 'Bhutan' },
		{ code: 'BO', name: 'Bolivia' },
		{ code: 'BQ', name: 'Bonaire, Sint Eustatius and Saba' },
		{ code: 'BA', name: 'Bosnia and Herzegovina' },
		{ code: 'BW', name: 'Botswana' },
		{ code: 'BV', name: 'Bouvet Island' },
		{ code: 'BR', name: 'Brazil' },
		{ code: 'IO', name: 'British Indian Ocean Territory' },
		{ code: 'BN', name: 'Brunei Darussalam' },
		{ code: 'BG', name: 'Bulgaria' },
		{ code: 'BF', name: 'Burkina Faso' },
		{ code: 'BI', name: 'Burundi' },
		{ code: 'CV', name: 'Cabo Verde' },
		{ code: 'KH', name: 'Cambodia' },
		{ code: 'CM', name: 'Cameroon' },
		{ code: 'CA', name: 'Canada' },
		{ code: 'KY', name: 'Cayman Islands' },
		{ code: 'CF', name: 'Central African Republic' },
		{ code: 'TD', name: 'Chad' },
		{ code: 'CL', name: 'Chile' },
		{ code: 'CN', name: 'China' },
		{ code: 'CX', name: 'Christmas Island' },
		{ code: 'CC', name: 'Cocos (Keeling) Islands' },
		{ code: 'CO', name: 'Colombia' },
		{ code: 'KM', name: 'Comoros' },
		{ code: 'CG', name: 'Congo' },
		{ code: 'CD', name: 'Congo, Democratic Republic of the' },
		{ code: 'CK', name: 'Cook Islands' },
		{ code: 'CR', name: 'Costa Rica' },
		{ code: 'CI', name: 'Côte d\'Ivoire' },
		{ code: 'HR', name: 'Croatia' },
		{ code: 'CU', name: 'Cuba' },
		{ code: 'CW', name: 'Curaçao' },
		{ code: 'CY', name: 'Cyprus' },
		{ code: 'CZ', name: 'Czech Republic' },
		{ code: 'DK', name: 'Denmark' },
		{ code: 'DJ', name: 'Djibouti' },
		{ code: 'DM', name: 'Dominica' },
		{ code: 'DO', name: 'Dominican Republic' },
		{ code: 'EC', name: 'Ecuador' },
		{ code: 'EG', name: 'Egypt' },
		{ code: 'SV', name: 'El Salvador' },
		{ code: 'GQ', name: 'Equatorial Guinea' },
		{ code: 'ER', name: 'Eritrea' },
		{ code: 'EE', name: 'Estonia' },
		{ code: 'SZ', name: 'Eswatini' },
		{ code: 'ET', name: 'Ethiopia' },
		{ code: 'FK', name: 'Falkland Islands (Malvinas)' },
		{ code: 'FO', name: 'Faroe Islands' },
		{ code: 'FJ', name: 'Fiji' },
		{ code: 'FI', name: 'Finland' },
		{ code: 'FR', name: 'France' },
		{ code: 'GF', name: 'French Guiana' },
		{ code: 'PF', name: 'French Polynesia' },
		{ code: 'TF', name: 'French Southern Territories' },
		{ code: 'GA', name: 'Gabon' },
		{ code: 'GM', name: 'Gambia' },
		{ code: 'GE', name: 'Georgia' },
		{ code: 'DE', name: 'Germany' },
		{ code: 'GH', name: 'Ghana' },
		{ code: 'GI', name: 'Gibraltar' },
		{ code: 'GR', name: 'Greece' },
		{ code: 'GL', name: 'Greenland' },
		{ code: 'GD', name: 'Grenada' },
		{ code: 'GP', name: 'Guadeloupe' },
		{ code: 'GU', name: 'Guam' },
		{ code: 'GT', name: 'Guatemala' },
		{ code: 'GG', name: 'Guernsey' },
		{ code: 'GN', name: 'Guinea' },
		{ code: 'GW', name: 'Guinea-Bissau' },
		{ code: 'GY', name: 'Guyana' },
		{ code: 'HT', name: 'Haiti' },
		{ code: 'HM', name: 'Heard Island and McDonald Islands' },
		{ code: 'VA', name: 'Holy See' },
		{ code: 'HN', name: 'Honduras' },
		{ code: 'HK', name: 'Hong Kong' },
		{ code: 'HU', name: 'Hungary' },
		{ code: 'IS', name: 'Iceland' },
		{ code: 'IN', name: 'India' },
		{ code: 'ID', name: 'Indonesia' },
		{ code: 'IR', name: 'Iran' },
		{ code: 'IQ', name: 'Iraq' },
		{ code: 'IE', name: 'Ireland' },
		{ code: 'IM', name: 'Isle of Man' },
		{ code: 'IL', name: 'Israel' },
		{ code: 'IT', name: 'Italy' },
		{ code: 'JM', name: 'Jamaica' },
		{ code: 'JP', name: 'Japan' },
		{ code: 'JE', name: 'Jersey' },
		{ code: 'JO', name: 'Jordan' },
		{ code: 'KZ', name: 'Kazakhstan' },
		{ code: 'KE', name: 'Kenya' },
		{ code: 'KI', name: 'Kiribati' },
		{ code: 'KP', name: 'Korea, Democratic People\'s Republic of' },
		{ code: 'KR', name: 'Korea, Republic of' },
		{ code: 'KW', name: 'Kuwait' },
		{ code: 'KG', name: 'Kyrgyzstan' },
		{ code: 'LA', name: 'Lao People\'s Democratic Republic' },
		{ code: 'LV', name: 'Latvia' },
		{ code: 'LB', name: 'Lebanon' },
		{ code: 'LS', name: 'Lesotho' },
		{ code: 'LR', name: 'Liberia' },
		{ code: 'LY', name: 'Libya' },
		{ code: 'LI', name: 'Liechtenstein' },
		{ code: 'LT', name: 'Lithuania' },
		{ code: 'LU', name: 'Luxembourg' },
		{ code: 'MO', name: 'Macao' },
		{ code: 'MG', name: 'Madagascar' },
		{ code: 'MW', name: 'Malawi' },
		{ code: 'MY', name: 'Malaysia' },
		{ code: 'MV', name: 'Maldives' },
		{ code: 'ML', name: 'Mali' },
		{ code: 'MT', name: 'Malta' },
		{ code: 'MH', name: 'Marshall Islands' },
		{ code: 'MQ', name: 'Martinique' },
		{ code: 'MR', name: 'Mauritania' },
		{ code: 'MU', name: 'Mauritius' },
		{ code: 'YT', name: 'Mayotte' },
		{ code: 'MX', name: 'Mexico' },
		{ code: 'FM', name: 'Micronesia' },
		{ code: 'MD', name: 'Moldova' },
		{ code: 'MC', name: 'Monaco' },
		{ code: 'MN', name: 'Mongolia' },
		{ code: 'ME', name: 'Montenegro' },
		{ code: 'MS', name: 'Montserrat' },
		{ code: 'MA', name: 'Morocco' },
		{ code: 'MZ', name: 'Mozambique' },
		{ code: 'MM', name: 'Myanmar' },
		{ code: 'NA', name: 'Namibia' },
		{ code: 'NR', name: 'Nauru' },
		{ code: 'NP', name: 'Nepal' },
		{ code: 'NL', name: 'Netherlands' },
		{ code: 'NC', name: 'New Caledonia' },
		{ code: 'NZ', name: 'New Zealand' },
		{ code: 'NI', name: 'Nicaragua' },
		{ code: 'NE', name: 'Niger' },
		{ code: 'NG', name: 'Nigeria' },
		{ code: 'NU', name: 'Niue' },
		{ code: 'NF', name: 'Norfolk Island' },
		{ code: 'MK', name: 'North Macedonia' },
		{ code: 'MP', name: 'Northern Mariana Islands' },
		{ code: 'NO', name: 'Norway' },
		{ code: 'OM', name: 'Oman' },
		{ code: 'PK', name: 'Pakistan' },
		{ code: 'PW', name: 'Palau' },
		{ code: 'PS', name: 'Palestine, State of' },
		{ code: 'PA', name: 'Panama' },
		{ code: 'PG', name: 'Papua New Guinea' },
		{ code: 'PY', name: 'Paraguay' },
		{ code: 'PE', name: 'Peru' },
		{ code: 'PH', name: 'Philippines' },
		{ code: 'PN', name: 'Pitcairn' },
		{ code: 'PL', name: 'Poland' },
		{ code: 'PT', name: 'Portugal' },
		{ code: 'PR', name: 'Puerto Rico' },
		{ code: 'QA', name: 'Qatar' },
		{ code: 'RE', name: 'Réunion' },
		{ code: 'RO', name: 'Romania' },
		{ code: 'RU', name: 'Russian Federation' },
		{ code: 'RW', name: 'Rwanda' },
		{ code: 'BL', name: 'Saint Barthélemy' },
		{ code: 'SH', name: 'Saint Helena, Ascension and Tristan da Cunha' },
		{ code: 'KN', name: 'Saint Kitts and Nevis' },
		{ code: 'LC', name: 'Saint Lucia' },
		{ code: 'MF', name: 'Saint Martin (French part)' },
		{ code: 'PM', name: 'Saint Pierre and Miquelon' },
		{ code: 'VC', name: 'Saint Vincent and the Grenadines' },
		{ code: 'WS', name: 'Samoa' },
		{ code: 'SM', name: 'San Marino' },
		{ code: 'ST', name: 'Sao Tome and Principe' },
		{ code: 'SA', name: 'Saudi Arabia' },
		{ code: 'SN', name: 'Senegal' },
		{ code: 'RS', name: 'Serbia' },
		{ code: 'SC', name: 'Seychelles' },
		{ code: 'SL', name: 'Sierra Leone' },
		{ code: 'SG', name: 'Singapore' },
		{ code: 'SX', name: 'Sint Maarten (Dutch part)' },
		{ code: 'SK', name: 'Slovakia' },
		{ code: 'SI', name: 'Slovenia' },
		{ code: 'SB', name: 'Solomon Islands' },
		{ code: 'SO', name: 'Somalia' },
		{ code: 'ZA', name: 'South Africa' },
		{ code: 'GS', name: 'South Georgia and the South Sandwich Islands' },
		{ code: 'SS', name: 'South Sudan' },
		{ code: 'ES', name: 'Spain' },
		{ code: 'LK', name: 'Sri Lanka' },
		{ code: 'SD', name: 'Sudan' },
		{ code: 'SR', name: 'Suriname' },
		{ code: 'SJ', name: 'Svalbard and Jan Mayen' },
		{ code: 'SE', name: 'Sweden' },
		{ code: 'CH', name: 'Switzerland' },
		{ code: 'SY', name: 'Syrian Arab Republic' },
		{ code: 'TW', name: 'Taiwan' },
		{ code: 'TJ', name: 'Tajikistan' },
		{ code: 'TZ', name: 'Tanzania' },
		{ code: 'TH', name: 'Thailand' },
		{ code: 'TL', name: 'Timor-Leste' },
		{ code: 'TG', name: 'Togo' },
		{ code: 'TK', name: 'Tokelau' },
		{ code: 'TO', name: 'Tonga' },
		{ code: 'TT', name: 'Trinidad and Tobago' },
		{ code: 'TN', name: 'Tunisia' },
		{ code: 'TR', name: 'Turkey' },
		{ code: 'TM', name: 'Turkmenistan' },
		{ code: 'TC', name: 'Turks and Caicos Islands' },
		{ code: 'TV', name: 'Tuvalu' },
		{ code: 'UG', name: 'Uganda' },
		{ code: 'UA', name: 'Ukraine' },
		{ code: 'AE', name: 'United Arab Emirates' },
		{ code: 'GB', name: 'United Kingdom' },
		{ code: 'US', name: 'United States' },
		{ code: 'UM', name: 'United States Minor Outlying Islands' },
		{ code: 'UY', name: 'Uruguay' },
		{ code: 'UZ', name: 'Uzbekistan' },
		{ code: 'VU', name: 'Vanuatu' },
		{ code: 'VE', name: 'Venezuela' },
		{ code: 'VN', name: 'Viet Nam' },
		{ code: 'VG', name: 'Virgin Islands, British' },
		{ code: 'VI', name: 'Virgin Islands, U.S.' },
		{ code: 'WF', name: 'Wallis and Futuna' },
		{ code: 'EH', name: 'Western Sahara' },
		{ code: 'YE', name: 'Yemen' },
		{ code: 'ZM', name: 'Zambia' },
		{ code: 'ZW', name: 'Zimbabwe' }
	];

	const searchInput = document.getElementById('country-search');
	const filterInput = document.getElementById('country-filter');
	const dropdown = document.getElementById('country-dropdown');
	const optionsContainer = document.getElementById('country-options');
	const hiddenInput = document.getElementById('checkout-country');
	const arrow = document.getElementById('country-arrow');

	if (!searchInput || !dropdown || !optionsContainer) return;

	let filteredCountries = countries;

	// Render country options
	function renderOptions(countriesToRender = countries) {
		optionsContainer.innerHTML = '';
		countriesToRender.forEach(country => {
			if (!country.code) return; // Skip the "Select Country" placeholder
			
			const option = document.createElement('div');
			option.className = 'px-4 py-2.5 hover:bg-slate-50 cursor-pointer transition-colors text-sm border-b border-neutral-100 last:border-0';
			option.textContent = country.name;
			option.dataset.code = country.code;
			option.dataset.name = country.name;
			
			option.addEventListener('click', () => {
				selectCountry(country.code, country.name);
			});
			
			optionsContainer.appendChild(option);
		});

		if (countriesToRender.length === 0) {
			optionsContainer.innerHTML = '<div class="px-4 py-3 text-sm text-neutral-500 text-center">No countries found</div>';
		}
	}

	// Select a country
	function selectCountry(code, name) {
		hiddenInput.value = code;
		searchInput.value = name;
		searchInput.classList.remove('text-neutral-400');
		searchInput.classList.add('text-neutral-900');
		closeDropdown();
	}

	// Open dropdown
	function openDropdown() {
		dropdown.classList.remove('hidden');
		arrow.style.transform = 'translateY(-50%) rotate(180deg)';
		filterInput.value = '';
		renderOptions(countries);
		setTimeout(() => filterInput.focus(), 50);
	}

	// Close dropdown
	function closeDropdown() {
		dropdown.classList.add('hidden');
		arrow.style.transform = 'translateY(-50%) rotate(0deg)';
	}

	// Toggle dropdown
	searchInput.addEventListener('click', (e) => {
		e.stopPropagation();
		if (dropdown.classList.contains('hidden')) {
			searchInput.removeAttribute('readonly');
			openDropdown();
		} else {
			closeDropdown();
		}
	});

	// Filter countries
	filterInput.addEventListener('input', (e) => {
		const query = e.target.value.toLowerCase().trim();
		filteredCountries = countries.filter(country => 
			country.name.toLowerCase().includes(query)
		);
		renderOptions(filteredCountries);
	});

	// Close dropdown when clicking outside
	document.addEventListener('click', (e) => {
		if (!dropdown.contains(e.target) && !searchInput.contains(e.target)) {
			closeDropdown();
			if (!hiddenInput.value) {
				searchInput.value = '';
			}
		}
	});

	// Keyboard navigation
	filterInput.addEventListener('keydown', (e) => {
		if (e.key === 'Escape') {
			closeDropdown();
			searchInput.focus();
		}
	});

	// Set translated placeholders
	searchInput.placeholder = t('checkout.search_country');
	filterInput.placeholder = t('checkout.type_to_search');

	// Initial render
	renderOptions(countries);
}

document.getElementById('year').textContent = new Date().getFullYear();

// i18n (inline defaults; JSON files override when available)
const translations = {
	en: {
		'document.title': 'ONSi | Quranic Verses Box',
		'document.description': 'Buy the ONSi Quranic Verses Box – a beautifully crafted set of cards with uplifting ayat in Arabic and English.',
		'nav.features': 'Features',
		'nav.gallery': 'Gallery',
		'nav.faq': 'FAQ',
		'cart.button': 'Cart',
		'hero.title': 'Quranic Verses Box',
		'hero.subtitle': 'A curated set of 51 beautifully designed cards featuring uplifting ayat in Arabic with English reflections. Gift-ready velvet box.',
		'hero.description': 'In moments of brokenness, when the heart is heavy\nwith worry and peace fades away,\nthe light of Allah shines through His words:\n\nYour Lord has not forsaken you, nor has He turned away.\n\nAdDuhaa 3',
		'hero.vat': 'VAT included',
		'actions.add_to_cart': 'Add to cart',
		'features.item1': '51 premium square cards, rounded corners',
		'features.item2': 'Arabic ayat with English translation/reflection',
		'features.item3': 'Luxury magnetic gift box with velvet finish',
		'gallery.title': 'Gallery',
		'details.title': 'About the product',
		'details.text': 'These cards are crafted to offer solace and reflection. Each card features a verse and an elegant floral border inspired by Islamic patterns, printed on textured stock.',
		'product.name': 'Quranic Verses Box',
		'details.shipping_note': 'Ships worldwide from your location.',
		'faq.title': 'FAQ',
		'faq.q1': 'What is included?',
		'faq.a1': '51 printed cards inside a premium magnetic box.',
		'faq.q2': 'Shipping time',
		'faq.a2': 'Typically 5-10 business days depending on your region.',
		'cart.title': 'Your Cart',
		'cart.subtotal': 'Subtotal',
		'cart.empty': 'Your cart is empty.',
		'cart.increase': 'Increase quantity',
		'cart.decrease': 'Decrease quantity',
		'actions.checkout': 'Checkout',
		'actions.remove': 'Remove',
		'checkout.title': 'Checkout',
		'checkout.full_name': 'Full name',
		'checkout.email': 'Email',
		'checkout.address': 'Shipping address',
		'checkout.place_order': 'Place order',
		'actions.cancel': 'Cancel',
		'checkout.success': 'Thank you! Your order has been placed.',
		'footer.privacy': 'Privacy & Terms',
		'image.product': 'ONSi Quranic Verses Box',
		'image.gallery': 'Product gallery image',
		'auth.login': 'Login',
		'auth.sign_in': 'Sign In',
		'auth.sign_up': 'Sign Up',
		'auth.logout': 'Logout',
		'auth.email': 'Email',
		'auth.password': 'Password',
		'auth.full_name': 'Full Name',
		'auth.create_account': 'Create Account',
		'auth.forgot_password': 'Forgot Password?',
		'auth.or': 'Or',
		'auth.no_account': "Don't have an account?",
		'auth.have_account': 'Already have an account?',
		'auth.subtitle': 'Access your account to manage orders',
		'auth.password_requirements': 'At least 6 characters',
		'profile.orders': 'My Orders',
		// Orders modal translations
		'orders.title': 'My Orders',
		'orders.loading': 'Loading your orders...',
		'orders.no_orders': 'No Orders Yet',
		'orders.no_orders_desc': 'You haven\'t placed any orders yet. Start shopping to see your orders here.',
		'orders.error': 'Error Loading Orders',
		'orders.error_desc': 'Unable to load your orders. Please try again.',
		'orders.retry': 'Try Again',
		'orders.order_number': 'Order',
		'orders.date': 'Date',
		'orders.status': 'Status',
		'orders.total': 'Total',
		'orders.items': 'Items',
		'orders.status.pending': 'Pending',
		'orders.status.processing': 'Processing',
		'orders.status.shipped': 'Shipped',
		'orders.status.delivered': 'Delivered',
		'orders.status.cancelled': 'Cancelled',
		// Extended checkout translations
		'checkout.order_summary': 'Order Summary',
		'checkout.total': 'Total',
		'checkout.personal_info': 'Personal Information',
		'checkout.full_name': 'Full Name',
		'checkout.email': 'Email Address',
		'checkout.phone': 'Phone Number',
		'checkout.shipping_address': 'Shipping Address',
		'checkout.address': 'Street Address',
		'checkout.city': 'City',
		'checkout.postal_code': 'Postal Code',
		'checkout.country': 'Country',
		'checkout.place_order': 'Place Order',
		'checkout.success': 'Order placed successfully!',
		'checkout.error': 'Failed to process order. Please try again.',
		'checkout.empty_cart': 'Your cart is empty.',
		// Validation messages
		'validation.name_required': 'Full name is required',
		'validation.email_required': 'Email address is required',
		'validation.email_invalid': 'Please enter a valid email address',
		'validation.phone_required': 'Phone number is required',
		'validation.address_required': 'Street address is required',
		'validation.city_required': 'City is required',
		'validation.postal_required': 'Postal code is required',
		'validation.country_required': 'Please select a country',
		// Order confirmation
		'order.confirmation_title': 'Order Confirmed!',
		'order.confirmation_message': 'Thank you for your order. You will receive a confirmation email shortly.',
		'order.order_number': 'Order Number',
		'actions.continue_shopping': 'Continue Shopping',
		// Enhanced UI translations
		'trust.secure_payment': 'Secure Payment',
		'trust.made_with_love': 'Made with Love',
		'trust.fast_delivery': 'Fast Delivery',
		'trust.premium_quality': 'Premium Quality',
		'product.perfect_gifting': 'Perfect for Gifting',
		'product.gifting_description': 'Each box comes beautifully wrapped in premium materials, ready to bring joy to your loved ones.',
		'cart.subtitle': 'Review your sacred collection',
		'cart.empty_title': 'Your cart is empty',
		'cart.empty_description': 'Add some divine verses to begin your spiritual journey',
		'cart.continue_shopping': 'Continue Shopping',
		'cart.secure': 'Secure Payment',
		'cart.free_shipping': 'Free Shipping',
		'checkout.search_country': 'Search for a country...',
		'checkout.type_to_search': 'Type to search...',
	},
	ar: {
		'document.title': 'أونسي | علبة آيات قرآنية',
		'document.description': 'اشتري علبة آيات قرآنية من أونسي - مجموعة مصممة بعناية من البطاقات مع آيات مبهجة بالعربية والإنجليزية.',
		'nav.features': 'المميزات',
		'nav.gallery': 'المعرض',
		'nav.faq': 'الأسئلة الشائعة',
		'cart.button': 'السلة',
		'hero.title': 'علبة آيات قرآنية',
		'hero.subtitle': 'مجموعة من 51 بطاقة مصممة بعناية بآيات مبهجة مع ترجمة وتأملات بالإنجليزية. علبة هدية فاخرة.',
		'hero.description': 'بسم الله الرحمن الرحيم\n\nفي لحظات الانكسار، حين يثقل القلب بالهم،\nوتغيب الطمأنينة؛ يتجلى نور الله في كلماته:\n"ما ودعك ربك وما قلى"\nالضحى - الآية 3',
		'hero.vat': 'شامل الضريبة',
		'actions.add_to_cart': 'أضِف إلى السلة',
		'features.item1': '51 بطاقة مربعة فاخرة بحواف دائرية',
		'features.item2': 'آيات عربية مع ترجمة/تأملات بالإنجليزية',
		'features.item3': 'علبة هدية فاخرة بغطاء مغناطيسي مخملي',
		'gallery.title': 'المعرض',
		'details.title': 'عن المنتج',
		'details.text': 'صُنعت هذه البطاقات لتمنح سكينة وتأملًا. كل بطاقة تحمل آية وإطارًا زخرفيًا مستوحى من الفنون الإسلامية مطبوعًا على ورق فاخر.',
		'product.name': 'علبة آيات قرآنية',
		'details.shipping_note': 'شحن إلى جميع أنحاء العالم.',
		'faq.title': 'الأسئلة الشائعة',
		'faq.q1': 'ما الذي تحتويه العلبة؟',
		'faq.a1': '51 بطاقة مطبوعة داخل علبة مغناطيسية فاخرة.',
		'faq.q2': 'مدة الشحن',
		'faq.a2': 'عادة من 5 إلى 10 أيام عمل حسب المنطقة.',
		'cart.title': 'سلتك',
		'cart.subtotal': 'الإجمالي الفرعي',
		'cart.empty': 'سلتك فارغة.',
		'cart.increase': 'زيادة الكمية',
		'cart.decrease': 'تقليل الكمية',
		'actions.checkout': 'إتمام الشراء',
		'actions.remove': 'حذف',
		'checkout.title': 'إتمام الشراء',
		'checkout.full_name': 'الاسم الكامل',
		'checkout.email': 'البريد الإلكتروني',
		'checkout.address': 'عنوان الشحن',
		'checkout.place_order': 'إرسال الطلب',
		'actions.cancel': 'إلغاء',
		'checkout.success': 'شكرًا لك! تم استلام طلبك.',
		'footer.privacy': 'الخصوصية والشروط',
		'image.product': 'علبة آيات قرآنية أونسي',
		'image.gallery': 'صورة من معرض المنتج',
		'auth.login': 'تسجيل الدخول',
		'auth.sign_in': 'تسجيل الدخول',
		'auth.sign_up': 'إنشاء حساب',
		'auth.logout': 'تسجيل الخروج',
		'auth.email': 'البريد الإلكتروني',
		'auth.password': 'كلمة المرور',
		'auth.full_name': 'الاسم الكامل',
		'auth.create_account': 'إنشاء حساب',
		'auth.forgot_password': 'نسيت كلمة المرور؟',
		'auth.or': 'أو',
		'auth.no_account': 'ليس لديك حساب؟',
		'auth.have_account': 'لديك حساب بالفعل؟',
		'auth.subtitle': 'ادخل إلى حسابك لإدارة الطلبات',
		'auth.password_requirements': 'على الأقل 6 أحرف',
		'profile.orders': 'طلباتي',
		// Orders modal translations
		'orders.title': 'طلباتي',
		'orders.loading': 'جاري تحميل طلباتك...',
		'orders.no_orders': 'لا توجد طلبات بعد',
		'orders.no_orders_desc': 'لم تقم بأي طلبات بعد. ابدأ التسوق لترى طلباتك هنا.',
		'orders.error': 'خطأ في تحميل الطلبات',
		'orders.error_desc': 'غير قادر على تحميل طلباتك. يرجى المحاولة مرة أخرى.',
		'orders.retry': 'حاول مرة أخرى',
		'orders.order_number': 'الطلب',
		'orders.date': 'التاريخ',
		'orders.status': 'الحالة',
		'orders.total': 'الإجمالي',
		'orders.items': 'العناصر',
		'orders.status.pending': 'في الانتظار',
		'orders.status.processing': 'قيد المعالجة',
		'orders.status.shipped': 'تم الشحن',
		'orders.status.delivered': 'تم التوصيل',
		'orders.status.cancelled': 'ملغى',
		// Extended checkout translations
		'checkout.order_summary': 'ملخص الطلب',
		'checkout.total': 'الإجمالي',
		'checkout.personal_info': 'المعلومات الشخصية',
		'checkout.full_name': 'الاسم الكامل',
		'checkout.email': 'البريد الإلكتروني',
		'checkout.phone': 'رقم الهاتف',
		'checkout.shipping_address': 'عنوان الشحن',
		'checkout.address': 'عنوان الشارع',
		'checkout.city': 'المدينة',
		'checkout.postal_code': 'الرمز البريدي',
		'checkout.country': 'البلد',
		'checkout.place_order': 'إرسال الطلب',
		'checkout.success': 'تم إرسال الطلب بنجاح!',
		'checkout.error': 'فشل في معالجة الطلب. يرجى المحاولة مرة أخرى.',
		'checkout.empty_cart': 'سلتك فارغة.',
		// Validation messages
		'validation.name_required': 'الاسم الكامل مطلوب',
		'validation.email_required': 'البريد الإلكتروني مطلوب',
		'validation.email_invalid': 'يرجى إدخال بريد إلكتروني صحيح',
		'validation.phone_required': 'رقم الهاتف مطلوب',
		'validation.address_required': 'عنوان الشارع مطلوب',
		'validation.city_required': 'المدينة مطلوبة',
		'validation.postal_required': 'الرمز البريدي مطلوب',
		'validation.country_required': 'يرجى اختيار البلد',
		// Order confirmation
		'order.confirmation_title': 'تم تأكيد الطلب!',
		'order.confirmation_message': 'شكرًا لك على طلبك. ستتلقى رسالة تأكيد قريبًا.',
		'order.order_number': 'رقم الطلب',
		'actions.continue_shopping': 'متابعة التسوق',
		// Enhanced UI translations
		'badge.handcrafted': 'مصنوع بعناية',
		'trust.secure_payment': 'دفع آمن',
		'trust.made_with_love': 'مصنوع بحب',
		'trust.fast_delivery': 'توصيل سريع',
		'trust.premium_quality': 'جودة عالية',
		'product.perfect_gifting': 'مثالي للإهداء',
		'product.gifting_description': 'كل علبة تأتي معبأة بشكل جميل بمواد فاخرة، جاهزة لإدخال الفرح على أحبائك.',
		'cart.subtitle': 'راجع مجموعتك المقدسة',
		'cart.empty_title': 'سلتك فارغة',
		'cart.empty_description': 'أضف بعض الآيات الإلهية لتبدأ رحلتك الروحية',
		'cart.continue_shopping': 'متابعة التسوق',
		'cart.secure': 'دفع آمن',
		'cart.free_shipping': 'شحن مجاني',
		'checkout.search_country': 'ابحث عن بلد...',
		'checkout.type_to_search': 'اكتب للبحث...',
	},
	fr: {
		'document.title': 'ONSi | Coffret de Versets Coraniques',
		'document.description': 'Découvrez le Coffret de Versets Coraniques ONSi - des cartes d\'inspiration islamique magnifiquement conçues.',
		'nav.features': 'Caractéristiques',
		'nav.gallery': 'Galerie',
		'nav.faq': 'FAQ',
		'cart.button': 'Panier',
		'hero.title': 'Coffret de Versets Coraniques',
		'hero.subtitle': 'Ces cartes entre vos mains ne sont que des murmures de lumière. Rassemblées pour vous rappeler que le soulagement est plus proche que vous ne le pensez.',
		'hero.description': 'Au nom d\'Allah, le Tout Miséricordieux, le Très Miséricordieux\n\nDans les moments de détresse, quand le cœur est lourd\nde soucis et que la paix s\'estompe,\nla lumière d\'Allah brille à travers Ses paroles :\n\"Ton Seigneur ne t\'a ni abandonné, ni détesté.\"\nAd-Doha 3',
		'hero.vat': 'TVA incluse',
		'actions.add_to_cart': 'Ajouter au panier',
		'features.item1': '51 cartes premium carrées aux coins arrondis',
		'features.item2': 'Versets arabes avec traduction/réflexion en anglais',
		'features.item3': 'Coffret cadeau magnétique de luxe en velours',
		'gallery.title': 'Galerie',
		'details.title': 'À propos du produit',
		'details.text': 'Ces cartes sont conçues pour offrir réconfort et réflexion. Chaque carte présente un verset et une élégante bordure florale inspirée des motifs islamiques.',
		'product.name': 'Coffret de Versets Coraniques',
		'details.shipping_note': 'Livraison dans le monde entier.',
		'faq.title': 'FAQ',
		'faq.q1': 'Que contient le coffret ?',
		'faq.a1': '51 cartes imprimées dans un coffret magnétique premium.',
		'faq.q2': 'Délai de livraison',
		'faq.a2': 'Généralement 5-10 jours ouvrables selon votre région.',
		'cart.title': 'Votre Panier',
		'cart.subtotal': 'Sous-total',
		'cart.empty': 'Votre panier est vide.',
		'cart.increase': 'Augmenter la quantité',
		'cart.decrease': 'Diminuer la quantité',
		'actions.checkout': 'Commander',
		'actions.remove': 'Supprimer',
		'checkout.title': 'Commander',
		'checkout.full_name': 'Nom complet',
		'checkout.email': 'Email',
		'checkout.address': 'Adresse de livraison',
		'checkout.place_order': 'Passer la commande',
		'actions.cancel': 'Annuler',
		'checkout.success': 'Merci ! Votre commande a été passée.',
		'footer.privacy': 'Confidentialité et Conditions',
		'image.product': 'Coffret de Versets Coraniques ONSi',
		'image.gallery': 'Image de la galerie du produit',
		'auth.login': 'Connexion',
		'auth.sign_in': 'Se connecter',
		'auth.sign_up': 'S\'inscrire',
		'auth.logout': 'Déconnexion',
		'auth.email': 'Email',
		'auth.password': 'Mot de passe',
		'auth.full_name': 'Nom complet',
		'auth.create_account': 'Créer un compte',
		'auth.forgot_password': 'Mot de passe oublié ?',
		'auth.or': 'Ou',
		'auth.no_account': 'Vous n\'avez pas de compte ?',
		'auth.have_account': 'Vous avez déjà un compte ?',
		'auth.subtitle': 'Accédez à votre compte pour gérer vos commandes',
		'auth.password_requirements': 'Au moins 6 caractères',
		'profile.orders': 'Mes Commandes',
		'orders.title': 'Mes Commandes',
		'orders.loading': 'Chargement de vos commandes...',
		'orders.no_orders': 'Aucune Commande',
		'orders.no_orders_desc': 'Vous n\'avez pas encore passé de commande.',
		'orders.error': 'Erreur de Chargement',
		'orders.error_desc': 'Impossible de charger vos commandes. Veuillez réessayer.',
		'orders.retry': 'Réessayer',
		'orders.order_number': 'Commande',
		'orders.date': 'Date',
		'orders.status': 'Statut',
		'orders.total': 'Total',
		'orders.items': 'Articles',
		'orders.status.pending': 'En attente',
		'orders.status.processing': 'En cours',
		'orders.status.shipped': 'Expédié',
		'orders.status.delivered': 'Livré',
		'orders.status.cancelled': 'Annulé',
		'checkout.order_summary': 'Récapitulatif de commande',
		'checkout.total': 'Total',
		'checkout.personal_info': 'Informations personnelles',
		'checkout.phone': 'Numéro de téléphone',
		'checkout.shipping_address': 'Adresse de livraison',
		'checkout.city': 'Ville',
		'checkout.postal_code': 'Code postal',
		'checkout.country': 'Pays',
		'checkout.error': 'Échec du traitement de la commande.',
		'checkout.empty_cart': 'Votre panier est vide.',
		'validation.name_required': 'Le nom complet est requis',
		'validation.email_required': 'L\'adresse email est requise',
		'validation.email_invalid': 'Veuillez entrer une adresse email valide',
		'validation.phone_required': 'Le numéro de téléphone est requis',
		'validation.address_required': 'L\'adresse est requise',
		'validation.city_required': 'La ville est requise',
		'validation.postal_required': 'Le code postal est requis',
		'validation.country_required': 'Veuillez sélectionner un pays',
		'order.confirmation_title': 'Commande Confirmée !',
		'order.confirmation_message': 'Merci pour votre commande. Vous recevrez un email de confirmation sous peu.',
		'order.order_number': 'Numéro de commande',
		'actions.continue_shopping': 'Continuer vos achats',
		'badge.handcrafted': 'Fait main',
		'trust.secure_payment': 'Paiement sécurisé',
		'trust.made_with_love': 'Fait avec amour',
		'trust.fast_delivery': 'Livraison rapide',
		'trust.premium_quality': 'Qualité premium',
		'product.perfect_gifting': 'Parfait pour offrir',
		'product.gifting_description': 'Chaque coffret est joliment emballé dans des matériaux premium, prêt à apporter de la joie à vos proches.',
		'cart.subtitle': 'Vérifiez votre collection sacrée',
		'cart.empty_title': 'Votre panier est vide',
		'cart.empty_description': 'Ajoutez quelques versets divins pour commencer votre voyage spirituel',
		'cart.continue_shopping': 'Continuer vos achats',
		'cart.secure': 'Paiement sécurisé',
		'cart.free_shipping': 'Livraison gratuite',
		'checkout.search_country': 'Rechercher un pays...',
		'checkout.type_to_search': 'Tapez pour rechercher...',
	}

};

const loadedLocales = {};

async function loadLocale(lang) {
	
	if (loadedLocales[lang]) {
		
		return loadedLocales[lang];
	}
	try {
		
		const res = await fetch(`locales/${lang}.json`, { cache: 'no-store' });
		if (!res.ok) throw new Error(`Failed to load locale: ${res.status}`);
		loadedLocales[lang] = await res.json();
		
		return loadedLocales[lang];
	} catch (e) {
		
		// Fallback to inline translations
		loadedLocales[lang] = translations[lang];
		
		return loadedLocales[lang];
	}
}

function currentDict() {
	return loadedLocales[state.language] || translations[state.language] || translations.ar;
}

function t(key) {
	const dict = currentDict();
	return dict[key] || key;
}

function applyTranslations() {
	
	const dict = currentDict();
	
	
	// text nodes
	const i18nElements = document.querySelectorAll('[data-i18n]');
	
	i18nElements.forEach(el => {
		const key = el.getAttribute('data-i18n');
		const translation = t(key);
		el.textContent = translation;
		
	});
	// placeholders
	document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
		el.placeholder = t(el.getAttribute('data-i18n-placeholder'));
	});
	// alt text
	document.querySelectorAll('[data-i18n-alt]').forEach(el => {
		el.alt = t(el.getAttribute('data-i18n-alt'));
	});
	// html dir and lang
	const html = document.documentElement;
	html.lang = state.language === 'ar' ? 'ar' : 'en';
	html.dir = state.language === 'ar' ? 'rtl' : 'ltr';
	// align body when RTL
	document.body.classList.toggle('rtl', state.language === 'ar');
	
	// Update document title and meta tags
	document.title = t('document.title');
	
	// Update meta description
	const metaDesc = document.querySelector('meta[name="description"]');
	if (metaDesc) {
		metaDesc.content = t('document.description');
	}
	
	// Update keywords meta tag
	const metaKeywords = document.querySelector('meta[name="keywords"]');
	if (metaKeywords && translations[state.language]['document.keywords']) {
		metaKeywords.content = t('document.keywords');
	}
	
	// Update Open Graph meta tags for better social sharing
	const ogTitle = document.querySelector('meta[property="og:title"]');
	if (ogTitle) {
		ogTitle.content = t('document.title');
	}
	
	const ogDesc = document.querySelector('meta[property="og:description"]');
	if (ogDesc) {
		ogDesc.content = t('document.description');
	}
	
	// Update Twitter meta tags
	const twitterTitle = document.querySelector('meta[property="twitter:title"]');
	if (twitterTitle) {
		twitterTitle.content = t('document.title');
	}
	
	const twitterDesc = document.querySelector('meta[property="twitter:description"]');
	if (twitterDesc) {
		twitterDesc.content = t('document.description');
	}
	
	// Update language and locale meta tags
	const htmlLang = document.documentElement;
	htmlLang.setAttribute('lang', state.language);
	
	const ogLocale = document.querySelector('meta[property="og:locale"]');
	if (ogLocale) {
		ogLocale.content = state.language === 'ar' ? 'ar_AR' : 'en_US';
	}
	
	// Update canonical URL with language parameter
	const canonical = document.querySelector('link[rel="canonical"]');
	if (canonical) {
		const baseUrl = 'https://onsi.shop/';
		canonical.href = state.language === 'en' ? `${baseUrl}?lang=en` : baseUrl;
	}
	
	// Update hreflang alternate links dynamically
	updateHreflangTags();
	
	// product name in cart items should reflect language for new additions only
	PRODUCT.name = t('product.name');
	// update visible strings that are rendered dynamically
	renderCart();
	// toggle label - show current language code
	const toggle = document.getElementById('lang-toggle');
	if (toggle) {
		const langCode = languageData[state.language]?.code || state.language.toUpperCase();
		toggle.textContent = langCode;
	}
}

// Language switcher functionality - will be initialized after DOM is ready
let langToggle, langDropdown, currentFlag, currentLang, langOptions;

// Language data
const languageData = {
	ar: { flag: '🇸🇦', code: 'AR', name: 'العربية' },
	en: { flag: '🇺🇸', code: 'EN', name: 'English' },
	fr: { flag: '🇫🇷', code: 'FR', name: 'Français' }
};

// Update current language display
function updateLanguageDisplay(lang) {
	const data = languageData[lang];
	if (currentFlag) currentFlag.textContent = data.flag;
	if (currentLang) currentLang.textContent = data.code;
	
	// Update active state in dropdown
	langOptions.forEach(option => {
		option.classList.toggle('active', option.dataset.lang === lang);
	});
}

// Update hreflang tags for SEO
function updateHreflangTags() {
	const baseUrl = 'https://onsi.shop/';
	
	// Remove existing hreflang tags
	document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(link => link.remove());
	
	// Create head element reference
	const head = document.head;
	
	// Add Arabic hreflang (default)
	const arLink = document.createElement('link');
	arLink.rel = 'alternate';
	arLink.hreflang = 'ar';
	arLink.href = baseUrl;
	head.appendChild(arLink);
	
	// Add English hreflang
	const enLink = document.createElement('link');
	enLink.rel = 'alternate';
	enLink.hreflang = 'en';
	enLink.href = `${baseUrl}?lang=en`;
	head.appendChild(enLink);
	
	// Add French hreflang
	const frLink = document.createElement('link');
	frLink.rel = 'alternate';
	frLink.hreflang = 'fr';
	frLink.href = `${baseUrl}?lang=fr`;
	head.appendChild(frLink);
	
	// Add x-default hreflang (Arabic is default)
	const defaultLink = document.createElement('link');
	defaultLink.rel = 'alternate';
	defaultLink.hreflang = 'x-default';
	defaultLink.href = baseUrl;
	head.appendChild(defaultLink);
	
	console.log('✅ Updated hreflang tags for language:', state.language);
}

// Handle language change
async function handleLanguageChange(newLang) {
	
	state.language = newLang;
	localStorage.setItem('lang', state.language);
	updateLanguageDisplay(newLang);
	
	
	try {
		await loadLocale(state.language);
		
		applyTranslations();
		
	} catch (error) {
		console.error('Error during language change:', error);
	}
	
	// Close dropdown
	if (langDropdown) {
		langDropdown.classList.remove('show');
	}
}

// Toggle dropdown visibility
function toggleLanguageDropdown() {
	if (langDropdown) {
		const isShowing = langDropdown.classList.contains('show');
		
		langDropdown.classList.toggle('show');
		
	} else {
		console.error('langDropdown element not found in toggle function');
	}
}

// Close dropdown when clicking outside
function closeDropdownOnClickOutside(event) {
	if (langDropdown && !langToggle.contains(event.target) && !langDropdown.contains(event.target)) {
		langDropdown.classList.remove('show');
	}
}



// Initialize language switcher elements
function initializeLanguageSwitcher() {
	// Get elements after DOM is ready
	langToggle = document.getElementById('lang-toggle');
	langDropdown = document.getElementById('lang-dropdown');
	currentFlag = document.getElementById('current-flag');
	currentLang = document.getElementById('current-lang');
	langOptions = document.querySelectorAll('.lang-option');

	
	

	// Initialize language switcher only if elements exist
	if (langToggle && langDropdown) {
		// Set initial display
		updateLanguageDisplay(state.language);
		
		// Toggle dropdown on button click
		langToggle.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			
			toggleLanguageDropdown();
		});
		
		// Handle language option clicks
		langOptions.forEach(option => {
			option.addEventListener('click', (e) => {
				e.preventDefault();
				const newLang = option.dataset.lang;
				
				handleLanguageChange(newLang);
			});
		});
		
		// Close dropdown when clicking outside
		document.addEventListener('click', closeDropdownOnClickOutside);
		
		// Close dropdown on Escape key
		document.addEventListener('keydown', (e) => {
			if (e.key === 'Escape' && langDropdown.classList.contains('show')) {
				langDropdown.classList.remove('show');
			}
		});
		
		
	} else {
		console.error('Language switcher elements not found!');
	}
}

// Initialize the app when DOM is ready
function initializeApp() {
	
	// Load product data from database first
	loadProductFromDatabase();
	
	// Initialize currency button
	updateCurrencyButton();
	
	// Initialize language switcher
	initializeLanguageSwitcher();
	
	// Initialize event listeners
	initializeEventListeners();
	
	// Initialize lightbox functionality
	initializeLightbox();
	
	// Load cart from localStorage (for guest users)
	loadCart();
	
	// Load Firebase authentication
	loadAppwriteAuth();
	
	// Load translations
	loadLocale(state.language).then(() => {
		
		applyTranslations();
		renderCart();
	}).catch(error => {
		console.error('Failed to initialize app:', error);
	});
}

// Load Appwrite authentication module
async function loadAppwriteAuth() {
	try {
		console.log('🚀 Loading Appwrite module...');
		console.log('🔍 Environment variables:', window.ENV);
		
		// Import the Appwrite configuration module
		await import('./appwrite-config.js');
		
		// Wait a moment for the module to initialize
		await new Promise(resolve => setTimeout(resolve, 200));
		
		console.log('✅ Appwrite module imported');
		console.log('🔍 window.appwriteAuth available:', !!window.appwriteAuth);
		
		if (window.appwriteAuth) {
			console.log('✅ Appwrite auth available');
			setupAuthEventHandlers();
			// Subscribe to auth state changes
			if (window.appwriteAuth.subscribeToAuthState) {
				window.appwriteAuth.subscribeToAuthState((user) => {
					console.log('Auth state changed:', user);
					state.user = user;
					if (user) {
						loadUserCart();
					} else {
						// User logged out, clear cart or handle as needed
						console.log('User logged out');
					}
				});
			}
			// Check current session immediately
			if (window.appwriteAuth.checkCurrentSession) {
				window.appwriteAuth.checkCurrentSession();
			}
		} else {
			console.error('❌ window.appwriteAuth not available after import');
			console.log('Available window properties:', Object.keys(window).filter(k => k.includes('app')));
		}
	} catch (error) {
		console.error('❌ Failed to load Appwrite module:', error);
		console.log('🔧 This might be due to CDN issues. Trying fallback approach...');
		
		// Try loading via script tag as fallback
		loadAppwriteViaScriptTag();
	}
}

// Fallback: Load via script tag
function loadAppwriteViaScriptTag() {
	console.log('🔄 Trying fallback script tag approach...');
	
	const script = document.createElement('script');
	script.src = 'https://cdn.jsdelivr.net/npm/appwrite@15.0.0/dist/sdk.js';
	script.onload = () => {
		console.log('✅ Appwrite SDK loaded via script tag');
		
		// Initialize Appwrite manually
		const { Client, Account, Databases, Storage, ID, Permission, Role, Query } = window.Appwrite;
		
		const client = new Client()
			.setEndpoint(window.ENV?.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
			.setProject(window.ENV?.VITE_APPWRITE_PROJECT_ID || '69319f7f003127073ff3');
		
		const account = new Account(client);
		const databases = new Databases(client);
		const storage = new Storage(client);
		
		// Set up basic auth functions
		window.appwriteAuth = {
			openAuthModal: (mode) => {
				console.log('Opening auth modal:', mode);
				const modal = document.getElementById('auth-modal');
				if (modal) {
					modal.classList.remove('hidden');
					modal.classList.add('flex');
				}
			},
			closeAuthModal: () => {
				const modal = document.getElementById('auth-modal');
				if (modal) {
					modal.classList.add('hidden');
					modal.classList.remove('flex');
				}
			},
			switchAuthMode: (mode) => console.log('Switch auth mode:', mode),
			toggleUserDropdown: () => console.log('Toggle dropdown'),
			logoutUser: () => console.log('Logout user'),
			getCurrentUser: () => null,
			subscribeToAuthState: () => {},
			checkCurrentSession: () => console.log('Check session')
		};
		
		console.log('✅ Basic Appwrite auth functions set up');
		setupAuthEventHandlers();
	};
	script.onerror = () => {
		console.error('❌ Failed to load Appwrite SDK via script tag');
	};
	
	document.head.appendChild(script);
}

// Authentication Event Handlers
function setupAuthEventHandlers() {
	// Login form submission
	const loginSubmit = document.getElementById('login-submit');
	if (loginSubmit) {
		loginSubmit.addEventListener('click', async (e) => {
			e.preventDefault();
			const email = document.getElementById('login-email').value;
			const password = document.getElementById('login-password').value;
			
			if (!email || !password) {
				showAuthError('Please fill in all fields');
				return;
			}
			
			const result = await window.appwriteAuth.loginUser(email, password);
			if (!result.success) {
				showAuthError(result.error);
			}
		});
	}
	
	// Register form submission
	const registerSubmit = document.getElementById('register-submit');
	if (registerSubmit) {
		registerSubmit.addEventListener('click', async (e) => {
			e.preventDefault();
			const fullName = document.getElementById('register-name').value;
			const email = document.getElementById('register-email').value;
			const password = document.getElementById('register-password').value;
			
			if (!fullName || !email || !password) {
				showAuthError('Please fill in all fields');
				return;
			}
			
			if (password.length < 6) {
				showAuthError('Password must be at least 6 characters');
				return;
			}
			
			const result = await window.appwriteAuth.registerUser(email, password, fullName);
			if (!result.success) {
				showAuthError(result.error);
			}
		});
	}
}

function showAuthError(message) {
	const errorDiv = document.getElementById('auth-error');
	if (errorDiv) {
		errorDiv.textContent = message;
		errorDiv.classList.remove('hidden');
		setTimeout(() => {
			errorDiv.classList.add('hidden');
		}, 5000);
	}
}

function resetPasswordPrompt() {
	const email = prompt('Enter your email address for password reset:');
	if (email) {
		window.appwriteAuth.resetPassword(email).then((result) => {
			if (result.success) {
				alert('Password reset email sent! Check your inbox.');
			} else {
				showAuthError(result.error);
			}
		});
	}
}

// Handle user authentication state changes
function handleUserAuthChange(user) {
	
	state.user = user;
	
	if (user) {
		// User signed in - load their cart
		loadUserCart();
	} else {
		// User signed out - keep current cart in localStorage only
		// Don't clear the cart, just save to localStorage
		saveCart();
	}
}

// Make the function globally available for auth module
window.handleUserAuthChange = handleUserAuthChange;

// My Orders Modal Functions
async function openMyOrdersModal() {
	console.log('📂 Opening My Orders modal...');
	
	const modal = document.getElementById('my-orders-modal');
	modal.classList.remove('hidden');
	
	// Clear locale cache to force fresh load with updated translations
	if (loadedLocales[state.language]) {
		delete loadedLocales[state.language];
	}
	
	// Force reload the current language to get updated translations
	try {
		await loadLocale(state.language);
	} catch (e) {
		console.warn('Could not reload locale:', e);
	}
	
	// Apply translations to the modal immediately
	applyTranslations();
	
	// Load user orders
	await loadUserOrders();
}

function closeMyOrdersModal() {
	const modal = document.getElementById('my-orders-modal');
	modal.classList.add('hidden');
}

async function loadUserOrders() {
	const loadingEl = document.getElementById('orders-loading');
	const emptyEl = document.getElementById('orders-empty');
	const listEl = document.getElementById('orders-list');
	const errorEl = document.getElementById('orders-error');
	
	// Reset display states
	loadingEl.classList.remove('hidden');
	emptyEl.classList.add('hidden');
	listEl.classList.add('hidden');
	errorEl.classList.add('hidden');
	
	try {
		// Check if user is logged in
		if (!window.appwriteAuth) {
			throw new Error('Authentication service not available');
		}
		
		const user = await window.appwriteAuth.getCurrentUser();
		if (!user) {
			throw new Error('User not logged in');
		}
		
		console.log('📊 Loading orders for user:', user.email);
		
		// Get orders from Appwrite
		const orders = await getUserOrders(user.email);
		
		loadingEl.classList.add('hidden');
		
		if (orders.length === 0) {
			emptyEl.classList.remove('hidden');
		} else {
			displayUserOrders(orders);
			listEl.classList.remove('hidden');
		}
		
		// Apply translations to the modal content
		applyTranslations();
		
	} catch (error) {
		console.error('❌ Error loading user orders:', error);
		loadingEl.classList.add('hidden');
		errorEl.classList.remove('hidden');
		
		// Apply translations to the error state
		applyTranslations();
	}
}

async function getUserOrders(userEmail) {
	try {
		const endpoint = window.ENV?.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
		const projectId = window.ENV?.VITE_APPWRITE_PROJECT_ID || '69319f7f003127073ff3';
		
		const response = await fetch(
			`${endpoint}/databases/onsi/collections/orders/documents`,
			{
				method: 'GET',
				headers: {
					'Content-Type': 'application/json',
					'X-Appwrite-Project': projectId
				}
			}
		);
		
		if (!response.ok) {
			throw new Error('Failed to fetch orders');
		}
		
		const data = await response.json();
		
		// Filter orders by user email
		const userOrders = data.documents.filter(order => 
			order.email && order.email.toLowerCase() === userEmail.toLowerCase()
		);
		
		console.log(`✅ Found ${userOrders.length} orders for ${userEmail}`);
		return userOrders;
		
	} catch (error) {
		console.error('❌ Error fetching user orders:', error);
		throw error;
	}
}

function displayUserOrders(orders) {
	const listEl = document.getElementById('orders-list');
	
	// Sort orders by date (newest first)
	orders.sort((a, b) => new Date(b.$createdAt) - new Date(a.$createdAt));
	
	const ordersHTML = orders.map(order => {
		const orderDate = new Date(order.$createdAt).toLocaleDateString();
		const orderTime = new Date(order.$createdAt).toLocaleTimeString();
		const orderStatus = order.status || 'pending';
		const orderTotal = formatPrice(parseFloat(order.total || 0));
		
		// Parse items
		let itemsDisplay = 'N/A';
		try {
			const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
			if (Array.isArray(items)) {
				itemsDisplay = items.map(item => `${item.name} (x${item.quantity})`).join(', ');
			}
		} catch (e) {
			console.warn('Could not parse order items:', e);
		}
		
		// Status styling
		const statusClasses = {
			pending: 'bg-yellow-100 text-yellow-800',
			processing: 'bg-blue-100 text-blue-800',
			shipped: 'bg-purple-100 text-purple-800',
			delivered: 'bg-green-100 text-green-800',
			cancelled: 'bg-red-100 text-red-800'
		};
		
		return `
			<div class="border border-neutral-200 rounded-lg p-4 bg-white">
				<div class="flex items-center justify-between mb-3">
					<div>
						<h3 class="font-semibold text-lg" data-i18n="orders.order_number">Order</h3>
						<p class="text-sm text-neutral-600">#${order.$id.slice(-8).toUpperCase()}</p>
					</div>
					<span class="px-3 py-1 rounded-full text-sm font-medium ${statusClasses[orderStatus] || statusClasses.pending}" data-i18n="orders.status.${orderStatus}">
						${orderStatus.charAt(0).toUpperCase() + orderStatus.slice(1)}
					</span>
				</div>
				
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
					<div>
						<span class="font-medium" data-i18n="orders.date">Date:</span>
						<p class="text-neutral-600">${orderDate} ${orderTime}</p>
					</div>
					<div>
						<span class="font-medium" data-i18n="orders.total">Total:</span>
						<p class="text-neutral-600 font-semibold">${orderTotal}</p>
					</div>
					<div>
						<span class="font-medium" data-i18n="orders.items">Items:</span>
						<p class="text-neutral-600">${itemsDisplay}</p>
					</div>
				</div>
				
				${order.shipping_address ? `
					<div class="mt-3 pt-3 border-t border-neutral-100">
						<span class="font-medium text-sm">Shipping Address:</span>
						<p class="text-sm text-neutral-600">${order.shipping_address}</p>
					</div>
				` : ''}
			</div>
		`;
	}).join('');
	
	listEl.innerHTML = ordersHTML;
	
	// Re-apply translations to the new content
	applyTranslations();
}

// Make orders functions globally available
window.openMyOrdersModal = openMyOrdersModal;
window.closeMyOrdersModal = closeMyOrdersModal;
window.loadUserOrders = loadUserOrders;

// Safe auth button handler
function handleAuthButtonClick() {
	if (window.appwriteAuth && window.appwriteAuth.openAuthModal) {
		window.appwriteAuth.openAuthModal('login');
	} else {
		console.log('Appwrite auth not ready yet, waiting...');
		// Show a loading message
		const button = document.getElementById('auth-button');
		const originalText = button.innerHTML;
		button.innerHTML = '<span>Loading...</span>';
		button.disabled = true;
		
		// Wait and try again
		setTimeout(() => {
			if (window.appwriteAuth && window.appwriteAuth.openAuthModal) {
				window.appwriteAuth.openAuthModal('login');
				button.innerHTML = originalText;
				button.disabled = false;
			} else {
				console.error('Appwrite auth failed to load');
				button.innerHTML = originalText;
				button.disabled = false;
				alert('Authentication system is loading. Please refresh the page and try again.');
			}
		}, 1000);
	}
}

// Safe wrapper for all Appwrite auth calls
function safeAppwriteCall(methodName, ...args) {
	if (window.appwriteAuth && window.appwriteAuth[methodName]) {
		return window.appwriteAuth[methodName](...args);
	} else {
		console.log(`Appwrite auth not ready for ${methodName}, waiting...`);
		setTimeout(() => {
			if (window.appwriteAuth && window.appwriteAuth[methodName]) {
				window.appwriteAuth[methodName](...args);
			} else {
				console.error(`Appwrite auth method ${methodName} not available after waiting`);
			}
		}, 1000);
	}
}

// Make functions globally available
window.handleAuthButtonClick = handleAuthButtonClick;
window.safeAppwriteCall = safeAppwriteCall;

// Test EmailJS connection (for development testing)
function testEmailJS() {
	if (typeof emailjs === 'undefined') {
		console.error('EmailJS not loaded');
		return;
	}
	
	
	
	// Test customer email
	const testCustomerParams = {
		to_email: window.ENV?.VITE_ADMIN_EMAIL || 'onsmaitii@gmail.com', // Your email for testing
		customer_name: 'Test Customer',
		order_number: 'TEST-' + Date.now(),
		order_date: new Date().toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric'
		}),
		items_list: 'Quranic Verses Box (Qty: 1)',
		total_amount: 'TBD',
		shipping_address: '123 Test Street\nTest City, 12345\nUnited States',
		customer_phone: '+1234567890'
	};
	
	emailjs.send(
		window.ENV?.VITE_EMAILJS_SERVICE_ID || 'service_j4hv4we', 
		window.ENV?.VITE_EMAILJS_CUSTOMER_TEMPLATE_ID || 'template_3m8gczh', 
		testCustomerParams
	)
		.then(response => {
			
			alert('Customer email test sent successfully! Check ' + (window.ENV?.VITE_ADMIN_EMAIL || 'onsmaitii@gmail.com'));
		})
		.catch(error => {
			console.error('❌ Customer email test FAILED:', error);
			alert('Customer email test failed: ' + error.text);
		});
}

// Test admin email function
function testAdminEmail() {
	if (typeof emailjs === 'undefined') {
		console.error('EmailJS not loaded');
		return;
	}
	
	const testAdminParams = {
		to_email: window.ENV?.VITE_ADMIN_EMAIL || 'onsmaitii@gmail.com',
		order_number: 'TEST-ADMIN-' + Date.now(),
		customer_name: 'Test Customer',
		customer_email: window.ENV?.VITE_ADMIN_EMAIL || 'onsmaitii@gmail.com',
		customer_phone: '+1234567890',
		order_date: new Date().toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		}),
		items_list: '• Quranic Verses Box x 1 = TBD',
		total_amount: 'TBD',
		shipping_address: 'Test Customer\n123 Test Street\nTest City, 12345\nUnited States'
	};
	
	emailjs.send(
		window.ENV?.VITE_EMAILJS_SERVICE_ID || 'service_j4hv4we', 
		window.ENV?.VITE_EMAILJS_ADMIN_TEMPLATE_ID || 'template_lkl5yxm', 
		testAdminParams
	)
		.then(response => {
			
			alert('Admin email test sent successfully! Check ' + (window.ENV?.VITE_ADMIN_EMAIL || 'onsmaitii@gmail.com'));
		})
		.catch(error => {
			console.error('❌ Admin email test FAILED:', error);
			alert('Admin email test failed: ' + error.text);
		});
}

// Make test functions globally available for console testing
window.testEmailJS = testEmailJS;
window.testAdminEmail = testAdminEmail;

// Gallery Lightbox Functionality
// Initialize with empty array - will be populated from window.fileIdMap
let galleryImages = [];

// Function to initialize gallery images from Appwrite
function initializeGalleryImages() {
	if (window.fileIdMap) {
		const fileNames = ['gallery-3.jpg', 'gallery-4.jpg', 'gallery-5.jpg', 'gallery-8.jpg'];
		galleryImages = fileNames.map(fileName => {
			const fileId = window.fileIdMap[fileName];
			return fileId ? getAppwriteFileUrl(fileId) : '';
		}).filter(url => url !== '');
		console.log('🖼️ Gallery images initialized:', galleryImages);
	}
}

// Wait for file map to be ready, then initialize gallery
window.addEventListener('appwriteFilesLoaded', initializeGalleryImages);

// Also try to initialize if fileIdMap already exists
if (window.fileIdMap && Object.keys(window.fileIdMap).length > 0) {
	initializeGalleryImages();
}

let currentImageIndex = 0;

function openLightbox(index) {
	currentImageIndex = index;
	updateLightboxImage();
	document.getElementById('image-lightbox').classList.remove('hidden');
	document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function closeLightbox() {
	document.getElementById('image-lightbox').classList.add('hidden');
	document.body.style.overflow = ''; // Restore scrolling
}

function nextImage() {
	currentImageIndex = (currentImageIndex + 1) % galleryImages.length;
	updateLightboxImage();
}

function prevImage() {
	currentImageIndex = (currentImageIndex - 1 + galleryImages.length) % galleryImages.length;
	updateLightboxImage();
}

function updateLightboxImage() {
	const lightboxImage = document.getElementById('lightbox-image');
	const lightboxCounter = document.getElementById('lightbox-counter');
	
	lightboxImage.src = galleryImages[currentImageIndex];
	lightboxImage.alt = `Product photo ${currentImageIndex + 1}`;
	lightboxCounter.textContent = `${currentImageIndex + 1} / ${galleryImages.length}`;
}

function initializeLightbox() {
	// Close button
	document.getElementById('lightbox-close').addEventListener('click', closeLightbox);
	
	// Navigation buttons
	document.getElementById('lightbox-next').addEventListener('click', nextImage);
	document.getElementById('lightbox-prev').addEventListener('click', prevImage);
	
	// Close when clicking outside the image
	document.getElementById('image-lightbox').addEventListener('click', function(e) {
		if (e.target === this) {
			closeLightbox();
		}
	});
	
	// Keyboard navigation
	document.addEventListener('keydown', function(e) {
		const lightbox = document.getElementById('image-lightbox');
		if (!lightbox.classList.contains('hidden')) {
			switch(e.key) {
				case 'Escape':
					closeLightbox();
					break;
				case 'ArrowLeft':
					prevImage();
					break;
				case 'ArrowRight':
					nextImage();
					break;
			}
		}
	});
}

// Make openLightbox globally available
window.openLightbox = openLightbox;

// Check for admin query parameter
function checkAdminQueryParameter() {
	const urlParams = new URLSearchParams(window.location.search);
	if (urlParams.get('admin') === 'true') {
		// Show a message about needing to sign in as admin
		setTimeout(() => {
			if (!window.appwriteAuth?.getCurrentUser()) {
				// Open auth modal with admin message
				if (window.appwriteAuth?.openAuthModal) {
					window.appwriteAuth.openAuthModal('login');
					// Add admin notice to auth modal
					const authModal = document.getElementById('auth-modal');
					if (authModal) {
						const adminNotice = document.createElement('div');
						adminNotice.className = 'bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4';
						adminNotice.innerHTML = `
							<div class="flex items-center">
								<svg class="w-5 h-5 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
								</svg>
								<p class="text-sm text-blue-800">Please sign in with your admin account to access the admin panel.</p>
							</div>
						`;
						
						const modalContent = authModal.querySelector('.space-y-4');
						if (modalContent) {
							modalContent.insertBefore(adminNotice, modalContent.firstChild);
						}
					}
				}
			}
		}, 1000);
	}
}

// Ensure translations after DOM is fully ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', () => {
		initializeApp();
		checkAdminQueryParameter();
	});
} else {
	initializeApp();
	checkAdminQueryParameter();
}


