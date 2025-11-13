/**
 * Prerendering Script for SEO
 * Generates static HTML snapshots for both English and Arabic versions
 * Ensures Googlebot can index content without executing JavaScript
 */

const fs = require('fs');
const path = require('path');

// Load the base HTML
const baseHTML = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf-8');

// Load translations
const enTranslations = require('./locales/en.json');
const arTranslations = require('./locales/ar.json');

/**
 * Generate prerendered HTML for a specific language
 */
function generatePrerenderHTML(lang, translations) {
  let html = baseHTML;
  
  // Update html lang attribute
  if (lang === 'ar') {
    html = html.replace(
      '<html lang="en"',
      '<html lang="ar" dir="rtl"'
    );
  }
  
  // Update meta tags
  const title = translations['document.title'] || 'ONSi Quranic Verses Box';
  const description = translations['document.description'] || 'Islamic Inspiration Cards';
  const keywords = translations['document.keywords'] || 'quranic verses, islamic cards';
  
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
    `<meta name="language" content="${lang === 'ar' ? 'Arabic' : 'English'}">`
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
    `<meta property="og:locale" content="${lang === 'ar' ? 'ar_AR' : 'en_US'}">`
  );
  
  // Add prerendered content marker
  html = html.replace(
    '</head>',
    `  <!-- Prerendered for SEO at ${new Date().toISOString()} -->
  <meta name="prerender-status-code" content="200">
  <meta name="prerender" content="true">
</head>`
  );
  
  // Add JSON-LD for the specific language
  const schema = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": title,
    "description": description,
    "inLanguage": lang,
    "url": lang === 'ar' ? 'https://onsi.shop/?lang=ar' : 'https://onsi.shop/',
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

// Generate English prerendered version
const enHTML = generatePrerenderHTML('en', enTranslations);
fs.writeFileSync(path.join(__dirname, 'index.prerendered.en.html'), enHTML);
console.log('✅ Generated English prerendered HTML');

// Generate Arabic prerendered version  
const arHTML = generatePrerenderHTML('ar', arTranslations);
fs.writeFileSync(path.join(__dirname, 'index.prerendered.ar.html'), arHTML);
console.log('✅ Generated Arabic prerendered HTML');

console.log('\n📝 Prerendering complete!');
console.log('📄 Files created:');
console.log('   - index.prerendered.en.html');
console.log('   - index.prerendered.ar.html');
console.log('\n🚀 Deploy these files for bot serving or use a prerendering service like Prerender.io');
