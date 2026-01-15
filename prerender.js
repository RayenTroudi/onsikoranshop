/**
 * Prerendering Script for SEO
 * Generates static HTML snapshots for Arabic, English, and French versions
 * Ensures Googlebot can index content without executing JavaScript
 */

const fs = require('fs');
const path = require('path');

// Load the base HTML
const baseHTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

// Load translations
const enTranslations = require('./locales/en.json');
const arTranslations = require('./locales/ar.json');
const frTranslations = require('./locales/fr.json');

/**
 * Generate prerendered HTML for a specific language
 */
function generatePrerenderHTML(lang, translations) {
  let html = baseHTML;
  
  // Update html lang attribute
  if (lang === 'en') {
    html = html.replace(
      '<html lang="ar" dir="rtl"',
      '<html lang="en"'
    );
  } else if (lang === 'fr') {
    html = html.replace(
      '<html lang="ar" dir="rtl"',
      '<html lang="fr"'
    );
  }
  
  // Update meta tags
  const title = translations['document.title'] || 'ONSi Quranic Verses Box';
  const description = translations['document.description'] || 'Islamic Inspiration Cards';
  const keywords = translations['document.keywords'] || 'quranic verses, islamic cards';
  
  // Get language name for meta tag
  const languageNames = { ar: 'Arabic', en: 'English', fr: 'French' };
  const languageName = languageNames[lang] || 'Arabic';
  
  // Get og:locale value
  const localeMap = { ar: 'ar_AR', en: 'en_US', fr: 'fr_FR' };
  const ogLocale = localeMap[lang] || 'ar_AR';
  
  html = html.replace(
    /<title>.*?<\/title>/,
    `<title>${title}</title>`
  );
  
  html = html.replace(
    /<meta name="title" content=".*?">/,
    `<meta name="title" content="${title}">`
  );
  
  html = html.replace(
    /<meta name="description" content=".*?">/,
    `<meta name="description" content="${description}">`
  );
  
  html = html.replace(
    /<meta name="keywords" content=".*?">/,
    `<meta name="keywords" content="${keywords}">`
  );
  
  html = html.replace(
    /<meta name="language" content=".*?">/,
    `<meta name="language" content="${languageName}">`
  );
  
  // Update Open Graph
  html = html.replace(
    /<meta property="og:title" content=".*?">/,
    `<meta property="og:title" content="${title}">`
  );
  
  html = html.replace(
    /<meta property="og:description" content=".*?">/,
    `<meta property="og:description" content="${description}">`
  );
  
  html = html.replace(
    /<meta property="og:locale" content=".*?">/,
    `<meta property="og:locale" content="${ogLocale}">`
  );
  
  // Add prerendered content marker
  html = html.replace(
    '</head>',
    `  <!-- Prerendered for SEO at ${new Date().toISOString()} -->
  <meta name="prerender-status-code" content="200">
  <meta name="prerender" content="true">
</head>`
  );
  
  // Determine URL based on language (Arabic is default)
  const urlMap = {
    ar: 'https://onsi.shop/',
    en: 'https://onsi.shop/?lang=en',
    fr: 'https://onsi.shop/?lang=fr'
  };
  
  // Add JSON-LD for the specific language
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": title,
    "description": description,
    "inLanguage": lang,
    "url": urlMap[lang] || 'https://onsi.shop/',
    "isPartOf": {
      "@type": "WebSite",
      "name": "ONSi",
      "url": "https://onsi.shop/"
    }
  };
  
  html = html.replace(
    '</head>',
    `  <script type="application/ld+json">
  ${JSON.stringify(schema, null, 2)}
  </script>
</head>`
  );
  
  return html;
}

// Generate Arabic prerendered version (default)
const arHTML = generatePrerenderHTML('ar', arTranslations);
fs.writeFileSync(path.join(__dirname, 'index.prerendered.ar.html'), arHTML);
console.log('✅ Generated Arabic prerendered HTML (default)');

// Generate English prerendered version
const enHTML = generatePrerenderHTML('en', enTranslations);
fs.writeFileSync(path.join(__dirname, 'index.prerendered.en.html'), enHTML);
console.log('✅ Generated English prerendered HTML');

// Generate French prerendered version
const frHTML = generatePrerenderHTML('fr', frTranslations);
fs.writeFileSync(path.join(__dirname, 'index.prerendered.fr.html'), frHTML);
console.log('✅ Generated French prerendered HTML');

console.log('\n📝 Prerendering complete!');
console.log('📄 Files created:');
console.log('   - index.prerendered.ar.html (default)');
console.log('   - index.prerendered.en.html');
console.log('   - index.prerendered.fr.html');
console.log('\n🚀 Deploy these files for bot serving or use a prerendering service like Prerender.io');
