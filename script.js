// Import Firebase authentication (loaded after DOM)
let firebaseAuth = null;

const state = {
	items: [], // {id, name, price, qty}
	language: localStorage.getItem('lang') || 'en',
	user: null, // Current authenticated user
};

const PRODUCT = {
	id: 'default',
	name: 'Quranic Verses Box',
	price: 120,
};

function formatCurrency(value) {
	return `${value.toFixed(0)} TND`;
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
	return state.items.reduce((sum, i) => sum + i.price * i.qty, 0);
}

function renderCart() {
	const itemsEl = document.getElementById('cart-items');
	const subtotalEl = document.getElementById('cart-subtotal');
	const countEl = document.getElementById('cart-count');
	const totalQty = state.items.reduce((n, i) => n + i.qty, 0);
	countEl.textContent = totalQty;

	if (state.items.length === 0) {
		itemsEl.innerHTML = `<p class="text-sm text-neutral-600">${t('cart.empty')}</p>`;
	} else {
		itemsEl.innerHTML = state.items.map(i => `
			<div class="flex items-center justify-between gap-3 border border-neutral-200 rounded-lg p-3">
				<div>
					<div class="text-sm font-medium">${i.name}</div>
					<div class="text-xs text-neutral-500">${formatCurrency(i.price)}</div>
				</div>
				<div class="flex items-center gap-2">
					<button class="qty" data-id="${i.id}" data-delta="-1" aria-label="${t('cart.decrease')}">−</button>
					<span class="w-6 text-center">${i.qty}</span>
					<button class="qty" data-id="${i.id}" data-delta="1" aria-label="${t('cart.increase')}">+</button>
					<button class="remove text-xs text-slate-700" data-id="${i.id}">${t('actions.remove')}</button>
				</div>
			</div>
		`).join('');
	}

	subtotalEl.textContent = formatCurrency(subtotal());
	
	// Save cart after rendering
	saveCart();
}

// Cart persistence functions
function saveCart() {
	try {
		// Save to localStorage for guest users
		localStorage.setItem('cart', JSON.stringify(state.items));
		
		// Save to Firebase for authenticated users
		if (state.user && window.firebaseAuth) {
			window.firebaseAuth.saveUserCart(state.items);
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
	if (!state.user || !window.firebaseAuth) return;
	
	try {
		// Load cart from Firebase for authenticated users
		const userCart = await window.firebaseAuth.getUserCart();
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
			cartEl.classList.add('hidden');
		} else {
			console.error('Cart element not found');
		}
	} catch (error) {
		console.error('Error closing cart:', error);
	}
}

function openCheckout() {
	// Pre-fill email if user is logged in
	if (state.user && state.user.email) {
		document.getElementById('checkout-email').value = state.user.email;
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
	itemsEl.innerHTML = state.items.map(item => `
		<div class="flex justify-between items-center py-2">
			<div>
				<span class="font-medium">${item.name}</span>
				<span class="text-sm text-neutral-600 ml-2">× ${item.qty}</span>
			</div>
			<span class="font-medium">${formatCurrency(item.price * item.qty)}</span>
		</div>
	`).join('');
	
	// Update total
	totalEl.textContent = formatCurrency(subtotal());
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
		
		// Prepare order data
		const orderData = {
			orderNumber,
			userId: state.user ? state.user.uid : null,
			customerInfo: formData,
			items: state.items.map(item => ({
				id: item.id,
				name: item.name,
				price: item.price,
				quantity: item.qty,
				total: item.price * item.qty
			})),
			subtotal: subtotal(),
			total: subtotal(), // For now, no tax or shipping
			status: 'pending',
			createdAt: new Date().toISOString(),
			timestamp: Date.now()
		};
		
		// Save order to Firebase if user is authenticated (free tier)
		if (state.user && window.firebaseAuth) {
			try {
				await saveOrderToFirebase(orderData);
			} catch (error) {
				console.error('Failed to save order to Firebase:', error);
				// Continue with local processing even if Firebase fails
			}
		} else {
			// For guest users, save to localStorage as backup
			saveOrderToLocalStorage(orderData);
		}
		
		// Send email notifications using EmailJS (free tier)
		try {
			await sendOrderNotificationsEmailJS(orderData);
		} catch (error) {
			console.error('Failed to send email notifications:', error);
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

async function saveOrderToFirebase(orderData) {
	// This function will use Firebase Firestore to save the order
	if (!window.firebaseAuth || !window.firebaseAuth.getCurrentUser()) {
		throw new Error('User not authenticated');
	}
	
	// Import Firebase Firestore functions
	const { doc, setDoc, collection, getFirestore } = await import('https://www.gstatic.com/firebasejs/10.13.0/firebase-firestore.js');
	const db = getFirestore();
	
	// Save order to Firestore
	const orderRef = doc(collection(db, 'orders'), orderData.orderNumber);
	await setDoc(orderRef, orderData);
	
	
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

// Send email notifications using EmailJS (free service)
async function sendOrderNotificationsEmailJS(orderData) {
	// Check if EmailJS is loaded
	if (typeof emailjs === 'undefined') {
		console.warn('EmailJS not loaded, skipping email notifications');
		return;
	}
	
	try {
		// Customer confirmation email parameters (matching template variables)
		// Note: In EmailJS templates, use {{customer_name}}, {{order_number}}, etc.
		const customerEmailParams = {
			to_email: orderData.customerInfo.email,
			customer_name: orderData.customerInfo.name,
			order_number: orderData.orderNumber,
			order_date: new Date(orderData.createdAt).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			}),
			items_list: orderData.items.map(item => 
				`${item.name} (Qty: ${item.quantity})`
			).join(', '),
			total_amount: orderData.total.toFixed(2),
			shipping_address: `${orderData.customerInfo.address}\n${orderData.customerInfo.city}, ${orderData.customerInfo.postalCode}\n${orderData.customerInfo.country}`,
			customer_phone: orderData.customerInfo.phone
		};
		
		// Send customer confirmation email
		await emailjs.send(
			window.ENV?.VITE_EMAILJS_SERVICE_ID || 'service_j4hv4we', // Your actual EmailJS service ID
			window.ENV?.VITE_EMAILJS_CUSTOMER_TEMPLATE_ID || 'template_3m8gczh', // Your customer order confirmation template ID
			customerEmailParams
		);
		
		
		
		// Admin notification email parameters
		// Note: In EmailJS templates, use {{customer_email}}, {{customer_name}}, {{order_number}}, etc.
		const adminEmailParams = {
			to_email: window.ENV?.VITE_ADMIN_EMAIL || 'onsmaitii@gmail.com', // Your admin email for notifications
			order_number: orderData.orderNumber,
			customer_name: orderData.customerInfo.name,
			customer_email: orderData.customerInfo.email,
			customer_phone: orderData.customerInfo.phone,
			order_date: new Date(orderData.createdAt).toLocaleDateString('en-US', {
				year: 'numeric',
				month: 'long',
				day: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			}),
			items_list: orderData.items.map(item => 
				`• ${item.name} x ${item.quantity} = $${item.total.toFixed(2)}`
			).join('\n'),
			total_amount: orderData.total.toFixed(2),
			shipping_address: `${orderData.customerInfo.name}\n${orderData.customerInfo.address}\n${orderData.customerInfo.city}, ${orderData.customerInfo.postalCode}\n${orderData.customerInfo.country}`
		};
		
		// Send admin notification email
		await emailjs.send(
			window.ENV?.VITE_EMAILJS_SERVICE_ID || 'service_j4hv4we', // Your actual EmailJS service ID
			window.ENV?.VITE_EMAILJS_ADMIN_TEMPLATE_ID || 'template_lkl5yxm', // Your admin order notification template ID
			adminEmailParams
		);
		
		
		
		
	} catch (error) {
		console.error('EmailJS notification error:', error);
		// Don't throw error to prevent order failure if email fails
		console.warn('Order completed but email notification failed');
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

// Event bindings
// Event listeners are now initialized in initializeEventListeners() function

function initializeEventListeners() {
	
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

	// Checkout button event listener
	const checkoutBtn = document.getElementById('checkout');
	if (checkoutBtn) {
		checkoutBtn.addEventListener('click', () => {
			if (state.items.length === 0) return;
	
	// Check if user is authenticated
	if (!state.user) {
		// Open authentication modal if not logged in
		if (window.firebaseAuth) {
			window.firebaseAuth.openAuthModal('login');
		}
		return;
	}
	
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
		'auth.continue_google': 'Continue with Google',
		'auth.no_account': "Don't have an account?",
		'auth.have_account': 'Already have an account?',
		'auth.subtitle': 'Access your account to manage orders',
		'auth.password_requirements': 'At least 6 characters',
		'profile.orders': 'My Orders',
		'profile.settings': 'Settings',
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
		'auth.continue_google': 'المتابعة مع جوجل',
		'auth.no_account': 'ليس لديك حساب؟',
		'auth.have_account': 'لديك حساب بالفعل؟',
		'auth.subtitle': 'ادخل إلى حسابك لإدارة الطلبات',
		'auth.password_requirements': 'على الأقل 6 أحرف',
		'profile.orders': 'طلباتي',
		'profile.settings': 'الإعدادات',
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
	return loadedLocales[state.language] || translations[state.language] || translations.en;
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
	// document title and meta description
	document.title = t('document.title');
	const metaDesc = document.querySelector('meta[name="description"]');
	if (metaDesc) {
		metaDesc.content = t('document.description');
	}
	// product name in cart items should reflect language for new additions only
	PRODUCT.name = t('product.name');
	// update visible strings that are rendered dynamically
	renderCart();
	// toggle label
	const toggle = document.getElementById('lang-toggle');
	if (toggle) toggle.textContent = state.language === 'ar' ? 'EN' : 'AR';
}

// Language switcher functionality - will be initialized after DOM is ready
let langToggle, langDropdown, currentFlag, currentLang, langOptions;

// Language data
const languageData = {
	en: { flag: '🇺🇸', code: 'EN', name: 'English' },
	ar: { flag: '🇸🇦', code: 'AR', name: 'العربية' }
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
	
	
	// Initialize EmailJS (free email service)
	initializeEmailJS();
	
	// Initialize language switcher
	initializeLanguageSwitcher();
	
	// Initialize event listeners
	initializeEventListeners();
	
	// Initialize lightbox functionality
	initializeLightbox();
	
	// Load cart from localStorage (for guest users)
	loadCart();
	
	// Load Firebase authentication
	loadFirebaseAuth();
	
	// Load translations
	loadLocale(state.language).then(() => {
		
		applyTranslations();
		renderCart();
	}).catch(error => {
		console.error('Failed to initialize app:', error);
	});
}

// Initialize EmailJS with your actual configuration
function initializeEmailJS() {
	if (typeof emailjs !== 'undefined') {
		// EmailJS Public Key configured
		const publicKey = window.ENV?.VITE_EMAILJS_PUBLIC_KEY || 'ryB3eYn0HP-iAfl2E';
		
		emailjs.init(publicKey);
		
	} else {
		console.warn('EmailJS not loaded - email notifications will be disabled');
	}
}

// Load Firebase authentication module
function loadFirebaseAuth() {
	const script = document.createElement('script');
	script.type = 'module';
	script.src = './firebase-auth.js';
	script.onload = () => {
		
		setupAuthEventHandlers();
	};
	script.onerror = () => {
		console.error('Failed to load Firebase auth');
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
			
			const result = await window.firebaseAuth.loginUser(email, password);
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
			
			const result = await window.firebaseAuth.registerUser(email, password, fullName);
			if (!result.success) {
				showAuthError(result.error);
			}
		});
	}
	
	// Google Sign-In buttons
	const googleSignin = document.getElementById('google-signin');
	const googleSignup = document.getElementById('google-signup');
	
	if (googleSignin) {
		googleSignin.addEventListener('click', async (e) => {
			e.preventDefault();
			const result = await window.firebaseAuth.signInWithGoogle();
			if (!result.success) {
				showAuthError(result.error);
			}
		});
	}
	
	if (googleSignup) {
		googleSignup.addEventListener('click', async (e) => {
			e.preventDefault();
			const result = await window.firebaseAuth.signInWithGoogle();
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
		window.firebaseAuth.resetPassword(email).then((result) => {
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

// Make the function globally available for Firebase auth module
window.handleUserAuthChange = handleUserAuthChange;

// Enhanced cart functions with user persistence
const originalUpsertItem = function(id, deltaQty = 1) {
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
};

function upsertItem(id, deltaQty = 1) {
	try {
		originalUpsertItem(id, deltaQty);
		// Save cart for authenticated users
		if (window.firebaseAuth && window.firebaseAuth.getCurrentUser()) {
			window.firebaseAuth.saveUserCart();
		}
	} catch (error) {
		console.error('Error in upsertItem:', error);
		// Fallback to basic cart functionality
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
	}
}

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
		total_amount: '39.00',
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
		items_list: '• Quranic Verses Box x 1 = $39.00',
		total_amount: '39.00',
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
const galleryImages = [
	'gallery-1.jpg',
	'gallery-2.jpg', 
	'gallery-3.jpg',
	'gallery-4.jpg',
	'gallery-5.jpg',
	'gallery-6.jpg',
	'gallery-7.jpg',
	'gallery-8.jpg'
];

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
			if (!window.firebaseAuth?.getCurrentUser()) {
				// Open auth modal with admin message
				if (window.firebaseAuth?.openAuthModal) {
					window.firebaseAuth.openAuthModal('login');
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


