/**
 * Country Code Validator for Google Merchant Center Structured Data
 * Ensures addressCountry values comply with ISO 3166-1 alpha-2 standards
 * 
 * @module countryValidator
 * @version 1.0.0
 * @license MIT
 */

// ISO 3166-1 alpha-2 country codes (complete list)
const VALID_ISO_COUNTRY_CODES = new Set([
  'AD', 'AE', 'AF', 'AG', 'AI', 'AL', 'AM', 'AO', 'AQ', 'AR', 'AS', 'AT',
  'AU', 'AW', 'AX', 'AZ', 'BA', 'BB', 'BD', 'BE', 'BF', 'BG', 'BH', 'BI',
  'BJ', 'BL', 'BM', 'BN', 'BO', 'BQ', 'BR', 'BS', 'BT', 'BV', 'BW', 'BY',
  'BZ', 'CA', 'CC', 'CD', 'CF', 'CG', 'CH', 'CI', 'CK', 'CL', 'CM', 'CN',
  'CO', 'CR', 'CU', 'CV', 'CW', 'CX', 'CY', 'CZ', 'DE', 'DJ', 'DK', 'DM',
  'DO', 'DZ', 'EC', 'EE', 'EG', 'EH', 'ER', 'ES', 'ET', 'FI', 'FJ', 'FK',
  'FM', 'FO', 'FR', 'GA', 'GB', 'GD', 'GE', 'GF', 'GG', 'GH', 'GI', 'GL',
  'GM', 'GN', 'GP', 'GQ', 'GR', 'GS', 'GT', 'GU', 'GW', 'GY', 'HK', 'HM',
  'HN', 'HR', 'HT', 'HU', 'ID', 'IE', 'IL', 'IM', 'IN', 'IO', 'IQ', 'IR',
  'IS', 'IT', 'JE', 'JM', 'JO', 'JP', 'KE', 'KG', 'KH', 'KI', 'KM', 'KN',
  'KP', 'KR', 'KW', 'KY', 'KZ', 'LA', 'LB', 'LC', 'LI', 'LK', 'LR', 'LS',
  'LT', 'LU', 'LV', 'LY', 'MA', 'MC', 'MD', 'ME', 'MF', 'MG', 'MH', 'MK',
  'ML', 'MM', 'MN', 'MO', 'MP', 'MQ', 'MR', 'MS', 'MT', 'MU', 'MV', 'MW',
  'MX', 'MY', 'MZ', 'NA', 'NC', 'NE', 'NF', 'NG', 'NI', 'NL', 'NO', 'NP',
  'NR', 'NU', 'NZ', 'OM', 'PA', 'PE', 'PF', 'PG', 'PH', 'PK', 'PL', 'PM',
  'PN', 'PR', 'PS', 'PT', 'PW', 'PY', 'QA', 'RE', 'RO', 'RS', 'RU', 'RW',
  'SA', 'SB', 'SC', 'SD', 'SE', 'SG', 'SH', 'SI', 'SJ', 'SK', 'SL', 'SM',
  'SN', 'SO', 'SR', 'SS', 'ST', 'SV', 'SX', 'SY', 'SZ', 'TC', 'TD', 'TF',
  'TG', 'TH', 'TJ', 'TK', 'TL', 'TM', 'TN', 'TO', 'TR', 'TT', 'TV', 'TW',
  'TZ', 'UA', 'UG', 'UM', 'US', 'UY', 'UZ', 'VA', 'VC', 'VE', 'VG', 'VI',
  'VN', 'VU', 'WF', 'WS', 'YE', 'YT', 'ZA', 'ZM', 'ZW'
]);

/**
 * Predefined country sets for common use cases
 */
const COUNTRY_PRESETS = {
  // Tier 1: Core markets for Islamic products
  CORE_MARKETS: ['TN', 'US', 'GB', 'CA', 'AU', 'SA', 'AE', 'FR', 'DE', 'MA'],
  
  // Tier 2: Extended markets (25 countries)
  EXTENDED_MARKETS: [
    'TN', 'US', 'GB', 'CA', 'AU', 'FR', 'DE',
    'SA', 'AE', 'EG', 'MA', 'DZ', 'QA', 'KW', 'BH',
    'TR', 'PK', 'BD', 'ID', 'MY', 'SG',
    'NL', 'BE', 'SE', 'NO', 'DK'
  ],
  
  // Tier 3: Full coverage (50 countries)
  FULL_COVERAGE: [
    'US', 'CA', 'BR', 'MX', 'AR',
    'GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'BE', 'SE', 'NO', 'DK', 'FI', 'PL', 'AT', 'CH', 'IE',
    'TN', 'SA', 'AE', 'EG', 'MA', 'DZ', 'QA', 'KW', 'BH', 'OM', 'JO', 'LB', 'IQ', 'YE', 'LY',
    'TR', 'PK', 'BD', 'IN', 'ID', 'MY', 'SG', 'AU', 'NZ', 'TH', 'PH',
    'ZA', 'NG', 'KE', 'GH'
  ],
  
  // Arab countries (18 countries)
  ARAB_WORLD: [
    'SA', 'AE', 'EG', 'MA', 'TN', 'DZ', 'QA', 'KW', 
    'BH', 'OM', 'JO', 'LB', 'IQ', 'SY', 'YE', 'LY', 'SD', 'MR'
  ],
  
  // GCC countries
  GCC: ['SA', 'AE', 'QA', 'KW', 'BH', 'OM'],
  
  // EU countries (27 member states)
  EU: [
    'AT', 'BE', 'BG', 'HR', 'CY', 'CZ', 'DK', 'EE', 'FI', 'FR',
    'DE', 'GR', 'HU', 'IE', 'IT', 'LV', 'LT', 'LU', 'MT', 'NL',
    'PL', 'PT', 'RO', 'SK', 'SI', 'ES', 'SE'
  ]
};

/**
 * Validates a single country code
 * @param {string} code - Country code to validate
 * @returns {{valid: boolean, error?: string, normalized?: string}}
 */
function validateCountryCode(code) {
  // Type check
  if (typeof code !== 'string') {
    return { 
      valid: false, 
      error: `Invalid type: expected string, got ${typeof code}` 
    };
  }

  // Normalize to uppercase
  const normalized = code.trim().toUpperCase();

  // Length check (must be exactly 2 characters)
  if (normalized.length !== 2) {
    return { 
      valid: false, 
      error: `Invalid length: expected 2 characters, got ${normalized.length}. Value: "${code}"` 
    };
  }

  // Check against ISO registry
  if (!VALID_ISO_COUNTRY_CODES.has(normalized)) {
    return { 
      valid: false, 
      error: `Invalid country code: "${normalized}" is not in ISO 3166-1 alpha-2 registry` 
    };
  }

  return { 
    valid: true, 
    normalized 
  };
}

/**
 * Validates an array of country codes
 * @param {string[]} codes - Array of country codes
 * @param {Object} options - Validation options
 * @param {number} options.maxCount - Maximum allowed countries (default: 50)
 * @param {boolean} options.allowEmpty - Allow empty array (default: false)
 * @returns {{valid: boolean, errors: string[], normalized?: string[]}}
 */
function validateCountryCodes(codes, options = {}) {
  const { maxCount = 50, allowEmpty = false } = options;
  const errors = [];

  // Type check
  if (!Array.isArray(codes)) {
    return { 
      valid: false, 
      errors: [`Expected array, got ${typeof codes}`] 
    };
  }

  // Empty array check
  if (codes.length === 0) {
    if (allowEmpty) {
      return { valid: true, errors: [], normalized: [] };
    }
    return { 
      valid: false, 
      errors: ['Array is empty - at least one country code required'] 
    };
  }

  // Count check
  if (codes.length > maxCount) {
    errors.push(`Too many countries: ${codes.length} exceeds maximum of ${maxCount}`);
  }

  // Validate each code
  const normalized = [];
  const seen = new Set();

  for (let i = 0; i < codes.length; i++) {
    const result = validateCountryCode(codes[i]);
    
    if (!result.valid) {
      errors.push(`Index ${i}: ${result.error}`);
    } else {
      // Check for duplicates
      if (seen.has(result.normalized)) {
        errors.push(`Duplicate country code at index ${i}: "${result.normalized}"`);
      } else {
        normalized.push(result.normalized);
        seen.add(result.normalized);
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    normalized: errors.length === 0 ? normalized : undefined
  };
}

/**
 * Sanitizes country input with safe fallback
 * @param {string|string[]} input - Raw country input
 * @param {string} fallback - Preset to use if validation fails (default: 'CORE_MARKETS')
 * @returns {string[]} - Valid country codes
 */
function sanitizeCountryInput(input, fallback = 'CORE_MARKETS') {
  // Handle array input
  if (Array.isArray(input)) {
    const result = validateCountryCodes(input, { allowEmpty: false });
    if (result.valid) {
      return result.normalized;
    }
    console.warn(`Invalid country codes, using ${fallback} preset:`, result.errors);
    return COUNTRY_PRESETS[fallback] || COUNTRY_PRESETS.CORE_MARKETS;
  }

  // Handle single string input
  if (typeof input === 'string') {
    const result = validateCountryCode(input);
    if (result.valid) {
      return [result.normalized];
    }
    console.warn(`Invalid country code "${input}", using ${fallback} preset`);
    return COUNTRY_PRESETS[fallback] || COUNTRY_PRESETS.CORE_MARKETS;
  }

  // Invalid type - use fallback
  console.warn(`Invalid input type, using ${fallback} preset`);
  return COUNTRY_PRESETS[fallback] || COUNTRY_PRESETS.CORE_MARKETS;
}

/**
 * Generates valid shippingDestination object for schema.org
 * @param {string|string[]} countries - Country codes or preset name
 * @returns {Object|null} - DefinedRegion object or null if should be omitted
 */
function generateShippingDestination(countries) {
  // Handle preset names
  if (typeof countries === 'string' && COUNTRY_PRESETS[countries.toUpperCase()]) {
    countries = COUNTRY_PRESETS[countries.toUpperCase()];
  }

  // Sanitize input
  const validCodes = sanitizeCountryInput(countries);

  // Return valid structure
  return {
    "@type": "DefinedRegion",
    "addressCountry": validCodes
  };
}

// Export for Node.js
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    validateCountryCode,
    validateCountryCodes,
    sanitizeCountryInput,
    generateShippingDestination,
    COUNTRY_PRESETS,
    VALID_ISO_COUNTRY_CODES
  };
}

// Export for browser
if (typeof window !== 'undefined') {
  window.CountryValidator = {
    validateCountryCode,
    validateCountryCodes,
    sanitizeCountryInput,
    generateShippingDestination,
    COUNTRY_PRESETS,
    VALID_ISO_COUNTRY_CODES
  };
}
