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
	price: 39,
};

function formatCurrency(value) {
	return `$${value.toFixed(2)}`;
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
					<button class="remove text-xs text-rose-700" data-id="${i.id}">${t('actions.remove')}</button>
				</div>
			</div>
		`).join('');
	}

	subtotalEl.textContent = formatCurrency(subtotal());
}

function openCart() {
	document.getElementById('cart').classList.remove('hidden');
}

function closeCart() {
	document.getElementById('cart').classList.add('hidden');
}

function openCheckout() {
	document.getElementById('checkout-modal').classList.remove('hidden');
}

function closeCheckout() {
	document.getElementById('checkout-modal').classList.add('hidden');
}

// Event bindings
document.addEventListener('click', (e) => {
	const add = e.target.closest('.add-to-cart');
	if (add) {
		const id = add.getAttribute('data-add');
		upsertItem(id, 1);
		openCart();
	}

	if (e.target.matches('#open-cart')) openCart();
	if (e.target.matches('[data-close="btn"], [data-close="overlay"]')) closeCart();
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

document.getElementById('checkout').addEventListener('click', () => {
	if (state.items.length === 0) return;
	openCheckout();
});

document.getElementById('checkout-form').addEventListener('submit', (e) => {
	e.preventDefault();
	// Fake success, clear cart
	state.items = [];
	renderCart();
	closeCheckout();
	closeCart();
	alert(t('checkout.success'));
});

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
	}

};

const loadedLocales = {};

async function loadLocale(lang) {
	console.log('Loading locale for:', lang);
	if (loadedLocales[lang]) {
		console.log('Locale already loaded from cache');
		return loadedLocales[lang];
	}
	try {
		console.log('Fetching locale file:', `locales/${lang}.json`);
		const res = await fetch(`locales/${lang}.json`, { cache: 'no-store' });
		if (!res.ok) throw new Error(`Failed to load locale: ${res.status}`);
		loadedLocales[lang] = await res.json();
		console.log('Locale loaded from file:', loadedLocales[lang]);
		return loadedLocales[lang];
	} catch (e) {
		console.log('Failed to load locale file, using inline fallback:', e.message);
		// Fallback to inline translations
		loadedLocales[lang] = translations[lang];
		console.log('Using inline translations:', loadedLocales[lang]);
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
	console.log('Applying translations for language:', state.language);
	const dict = currentDict();
	console.log('Using dictionary:', dict);
	
	// text nodes
	const i18nElements = document.querySelectorAll('[data-i18n]');
	console.log('Found', i18nElements.length, 'elements with data-i18n');
	i18nElements.forEach(el => {
		const key = el.getAttribute('data-i18n');
		const translation = t(key);
		el.textContent = translation;
		console.log(`Translated '${key}' to '${translation}'`);
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
	console.log('Language change triggered, new language:', newLang);
	state.language = newLang;
	localStorage.setItem('lang', state.language);
	updateLanguageDisplay(newLang);
	
	console.log('Loading locale for:', state.language);
	try {
		await loadLocale(state.language);
		console.log('Locale loaded, applying translations');
		applyTranslations();
		console.log('Translations applied successfully');
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
		console.log('Toggling dropdown. Currently showing:', isShowing);
		langDropdown.classList.toggle('show');
		console.log('Dropdown now showing:', langDropdown.classList.contains('show'));
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

	console.log('Language switcher elements found:', { langToggle, langDropdown, currentFlag, currentLang });
	console.log('Current language:', state.language);

	// Initialize language switcher only if elements exist
	if (langToggle && langDropdown) {
		// Set initial display
		updateLanguageDisplay(state.language);
		
		// Toggle dropdown on button click
		langToggle.addEventListener('click', (e) => {
			e.preventDefault();
			e.stopPropagation();
			console.log('Language toggle clicked');
			toggleLanguageDropdown();
		});
		
		// Handle language option clicks
		langOptions.forEach(option => {
			option.addEventListener('click', (e) => {
				e.preventDefault();
				const newLang = option.dataset.lang;
				console.log('Language option clicked:', newLang);
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
		
		console.log('Language switcher initialized successfully');
	} else {
		console.error('Language switcher elements not found!');
	}
}

// Initialize the app when DOM is ready
function initializeApp() {
	console.log('Initializing app...');
	
	// Initialize language switcher
	initializeLanguageSwitcher();
	
	// Load Firebase authentication
	loadFirebaseAuth();
	
	// Load translations
	loadLocale(state.language).then(() => {
		console.log('Initial locale loaded');
		applyTranslations();
		renderCart();
	}).catch(error => {
		console.error('Failed to initialize app:', error);
	});
}

// Load Firebase authentication module
function loadFirebaseAuth() {
	const script = document.createElement('script');
	script.type = 'module';
	script.src = './firebase-auth.js';
	script.onload = () => {
		console.log('Firebase auth loaded');
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

// Enhanced cart functions with user persistence
const originalUpsertItem = upsertItem;
function upsertItem(id, deltaQty = 1) {
	originalUpsertItem(id, deltaQty);
	// Save cart for authenticated users
	if (window.firebaseAuth && window.firebaseAuth.getCurrentUser()) {
		window.firebaseAuth.saveUserCart();
	}
}

// Ensure translations after DOM is fully ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeApp);
} else {
	initializeApp();
}


