const state = {
	items: [], // {id, name, price, qty}
	language: localStorage.getItem('lang') || 'en',
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

// Language selector
const langSelect = document.getElementById('lang-select');
console.log('Language selector found:', langSelect);
console.log('Current language:', state.language);

if (langSelect) {
	// sync dropdown with saved language
	langSelect.value = state.language;
	console.log('Set dropdown value to:', state.language);
	
	const handleLangChange = async () => {
		console.log('Language change triggered, new value:', langSelect.value);
		state.language = langSelect.value;
		localStorage.setItem('lang', state.language);
		console.log('Loading locale for:', state.language);
		try {
			await loadLocale(state.language);
			console.log('Locale loaded, applying translations');
			applyTranslations();
			console.log('Translations applied successfully');
		} catch (error) {
			console.error('Error during language change:', error);
		}
	};
	langSelect.addEventListener('change', handleLangChange);
	langSelect.addEventListener('input', handleLangChange);
	console.log('Event listeners added to language selector');
} else {
	console.error('Language selector not found!');
}

// Initialize the app when DOM is ready
function initializeApp() {
	console.log('Initializing app...');
	loadLocale(state.language).then(() => {
		console.log('Initial locale loaded');
		applyTranslations();
		renderCart();
	}).catch(error => {
		console.error('Failed to initialize app:', error);
	});
}

// Ensure translations after DOM is fully ready
if (document.readyState === 'loading') {
	document.addEventListener('DOMContentLoaded', initializeApp);
} else {
	initializeApp();
}


