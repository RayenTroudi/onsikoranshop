#!/usr/bin/env node

/**
 * Structured Data Validator - Google Merchant Center Compliance
 * Validates Product schema in HTML files for ISO 3166-1 compliance
 * 
 * Usage: node validate-structured-data.js [file]
 * Example: node validate-structured-data.js dist/index.html
 */

const fs = require('fs');
const path = require('path');

// Import country validator if available
let CountryValidator;
try {
  CountryValidator = require('./country-validator.js');
} catch (e) {
  console.error('⚠️  Country validator not found, using basic validation');
}

/**
 * Extract JSON-LD blocks from HTML
 */
function extractJsonLd(html) {
  const jsonLdBlocks = [];
  const regex = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    try {
      const json = JSON.parse(match[1]);
      jsonLdBlocks.push(json);
    } catch (e) {
      console.error('❌ Failed to parse JSON-LD:', e.message);
    }
  }

  return jsonLdBlocks;
}

/**
 * Validate addressCountry values
 */
function validateAddressCountry(value, path) {
  const errors = [];

  // Check if it's the problematic wildcard
  if (value === '*' || (Array.isArray(value) && value.includes('*'))) {
    errors.push({
      path,
      error: 'CRITICAL: Wildcard "*" is not a valid ISO 3166-1 alpha-2 code',
      fix: 'Replace with valid country codes like ["US", "GB", "FR"] or use CORE_MARKETS preset'
    });
    return errors;
  }

  // Validate with CountryValidator if available
  if (CountryValidator) {
    if (Array.isArray(value)) {
      const result = CountryValidator.validateCountryCodes(value);
      if (!result.valid) {
        result.errors.forEach(err => {
          errors.push({
            path,
            error: err,
            fix: 'Use valid ISO 3166-1 alpha-2 codes (2 uppercase letters)'
          });
        });
      }
    } else if (typeof value === 'string') {
      const result = CountryValidator.validateCountryCode(value);
      if (!result.valid) {
        errors.push({
          path,
          error: result.error,
          fix: 'Use valid ISO 3166-1 alpha-2 code (2 uppercase letters)'
        });
      }
    }
  } else {
    // Basic validation without validator
    const codes = Array.isArray(value) ? value : [value];
    codes.forEach((code, index) => {
      if (typeof code !== 'string') {
        errors.push({
          path: `${path}[${index}]`,
          error: `Invalid type: ${typeof code} (expected string)`,
          fix: 'Use string values for country codes'
        });
      } else if (code.length !== 2) {
        errors.push({
          path: `${path}[${index}]`,
          error: `Invalid length: "${code}" has ${code.length} characters (expected 2)`,
          fix: 'Use 2-letter ISO codes like "US", "GB", "FR"'
        });
      } else if (!/^[A-Z]{2}$/.test(code)) {
        errors.push({
          path: `${path}[${index}]`,
          error: `Invalid format: "${code}" (expected uppercase letters only)`,
          fix: 'Use uppercase 2-letter codes like "US", "GB", "FR"'
        });
      }
    });
  }

  return errors;
}

/**
 * Recursively search for addressCountry fields
 */
function findAddressCountry(obj, currentPath = '', errors = []) {
  if (!obj || typeof obj !== 'object') {
    return errors;
  }

  // Check current object
  if (obj.addressCountry !== undefined) {
    const validationErrors = validateAddressCountry(obj.addressCountry, currentPath + '.addressCountry');
    errors.push(...validationErrors);
  }

  // Recurse into nested objects/arrays
  for (const [key, value] of Object.entries(obj)) {
    const newPath = currentPath ? `${currentPath}.${key}` : key;
    
    if (Array.isArray(value)) {
      value.forEach((item, index) => {
        findAddressCountry(item, `${newPath}[${index}]`, errors);
      });
    } else if (value && typeof value === 'object') {
      findAddressCountry(value, newPath, errors);
    }
  }

  return errors;
}

/**
 * Validate Product schema specifically
 */
function validateProductSchema(schema) {
  const errors = [];

  if (schema['@type'] !== 'Product') {
    return errors;
  }

  console.log('📦 Validating Product schema...');

  // Check for offers
  if (!schema.offers) {
    errors.push({
      path: 'Product',
      error: 'Missing required field: offers',
      fix: 'Add offers field with at least one Offer'
    });
    return errors;
  }

  // Validate offers
  const offers = Array.isArray(schema.offers) ? schema.offers : [schema.offers];
  
  offers.forEach((offer, index) => {
    const offerPath = `Product.offers[${index}]`;
    
    // Check shippingDetails
    if (offer.shippingDetails) {
      const shippingDest = offer.shippingDetails.shippingDestination;
      
      if (shippingDest && shippingDest.addressCountry) {
        const countryErrors = validateAddressCountry(
          shippingDest.addressCountry,
          `${offerPath}.shippingDetails.shippingDestination.addressCountry`
        );
        errors.push(...countryErrors);
      }
    }
  });

  return errors;
}

/**
 * Main validation function
 */
function validateFile(filePath) {
  console.log(`\n🔍 Validating: ${filePath}\n`);

  // Read file
  let html;
  try {
    html = fs.readFileSync(filePath, 'utf-8');
  } catch (e) {
    console.error('❌ Failed to read file:', e.message);
    process.exit(1);
  }

  // Extract JSON-LD
  const jsonLdBlocks = extractJsonLd(html);
  console.log(`📄 Found ${jsonLdBlocks.length} JSON-LD block(s)\n`);

  if (jsonLdBlocks.length === 0) {
    console.log('⚠️  No structured data found');
    return;
  }

  // Validate each block
  let totalErrors = 0;

  jsonLdBlocks.forEach((schema, index) => {
    console.log(`\n--- Block ${index + 1}: ${schema['@type'] || 'Unknown'} ---`);
    
    let errors = [];

    // Specific validation for Product schema
    if (schema['@type'] === 'Product') {
      errors = validateProductSchema(schema);
    } else {
      // Generic validation for other types
      errors = findAddressCountry(schema, schema['@type'] || 'Schema');
    }

    if (errors.length === 0) {
      console.log('✅ No issues found');
    } else {
      console.log(`❌ Found ${errors.length} error(s):\n`);
      errors.forEach((err, i) => {
        console.log(`  ${i + 1}. Path: ${err.path}`);
        console.log(`     Error: ${err.error}`);
        console.log(`     Fix: ${err.fix}\n`);
      });
      totalErrors += errors.length;
    }
  });

  // Summary
  console.log('\n' + '='.repeat(60));
  if (totalErrors === 0) {
    console.log('✅ VALIDATION PASSED - No errors found!');
    console.log('📊 Ready for Google Merchant Center submission');
  } else {
    console.log(`❌ VALIDATION FAILED - ${totalErrors} error(s) found`);
    console.log('🔧 Please fix the errors above before submitting to Google');
    process.exit(1);
  }
  console.log('='.repeat(60) + '\n');
}

/**
 * Test Google Rich Results API
 */
async function testGoogleRichResults(url) {
  console.log(`\n🌐 Testing with Google Rich Results Test API...\n`);
  console.log(`URL: ${url}\n`);
  
  // Note: This requires Google API credentials
  console.log('⚠️  Automated API testing requires Google Cloud credentials');
  console.log('📝 Manual test: https://search.google.com/test/rich-results');
  console.log(`    Paste your URL: ${url}\n`);
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: node validate-structured-data.js <file.html>');
    console.log('Example: node validate-structured-data.js dist/index.html');
    process.exit(1);
  }

  const filePath = path.resolve(args[0]);
  validateFile(filePath);

  // Suggest online testing
  console.log('🌐 Next steps:');
  console.log('1. Test online: https://validator.schema.org/');
  console.log('2. Google Rich Results: https://search.google.com/test/rich-results');
  console.log('3. Submit to Merchant Center: https://merchants.google.com\n');
}

module.exports = {
  validateFile,
  validateProductSchema,
  validateAddressCountry,
  extractJsonLd
};
