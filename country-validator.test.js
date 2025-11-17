/**
 * Unit Tests for Country Validator
 * Run with: npm test
 * 
 * @requires jest
 */

const {
  validateCountryCode,
  validateCountryCodes,
  sanitizeCountryInput,
  generateShippingDestination,
  COUNTRY_PRESETS,
  VALID_ISO_COUNTRY_CODES
} = require('./country-validator');

describe('Country Validator - Single Code Validation', () => {
  
  describe('validateCountryCode', () => {
    
    test('should validate correct ISO codes', () => {
      const validCodes = ['US', 'GB', 'TN', 'SA', 'FR'];
      validCodes.forEach(code => {
        const result = validateCountryCode(code);
        expect(result.valid).toBe(true);
        expect(result.normalized).toBe(code);
        expect(result.error).toBeUndefined();
      });
    });

    test('should normalize lowercase codes', () => {
      const result = validateCountryCode('us');
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('US');
    });

    test('should normalize codes with whitespace', () => {
      const result = validateCountryCode('  GB  ');
      expect(result.valid).toBe(true);
      expect(result.normalized).toBe('GB');
    });

    test('should reject invalid length (1 character)', () => {
      const result = validateCountryCode('*');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid length');
      expect(result.error).toContain('expected 2 characters, got 1');
    });

    test('should reject invalid length (3+ characters)', () => {
      const result = validateCountryCode('USA');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid length');
      expect(result.error).toContain('expected 2 characters, got 3');
    });

    test('should reject non-ISO codes', () => {
      const result = validateCountryCode('XX');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('not in ISO 3166-1');
    });

    test('should reject wildcard characters', () => {
      const wildcards = ['*', '**', '*US'];
      wildcards.forEach(wildcard => {
        const result = validateCountryCode(wildcard);
        expect(result.valid).toBe(false);
      });
    });

    test('should reject non-string types', () => {
      const invalidTypes = [123, null, undefined, {}, []];
      invalidTypes.forEach(invalid => {
        const result = validateCountryCode(invalid);
        expect(result.valid).toBe(false);
        expect(result.error).toContain('Invalid type');
      });
    });

    test('should reject empty string', () => {
      const result = validateCountryCode('');
      expect(result.valid).toBe(false);
      expect(result.error).toContain('Invalid length');
    });
  });
});

describe('Country Validator - Array Validation', () => {
  
  describe('validateCountryCodes', () => {
    
    test('should validate array of correct codes', () => {
      const codes = ['US', 'GB', 'CA', 'AU', 'FR'];
      const result = validateCountryCodes(codes);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(result.normalized).toEqual(codes);
    });

    test('should normalize mixed-case array', () => {
      const codes = ['us', 'GB', 'Ca', 'AU', 'fr'];
      const result = validateCountryCodes(codes);
      expect(result.valid).toBe(true);
      expect(result.normalized).toEqual(['US', 'GB', 'CA', 'AU', 'FR']);
    });

    test('should detect duplicate codes', () => {
      const codes = ['US', 'GB', 'US', 'FR'];
      const result = validateCountryCodes(codes);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Duplicate'))).toBe(true);
    });

    test('should reject array with invalid codes', () => {
      const codes = ['US', '*', 'GB', 'XXX'];
      const result = validateCountryCodes(codes);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should reject empty array by default', () => {
      const result = validateCountryCodes([]);
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('empty'))).toBe(true);
    });

    test('should allow empty array when option set', () => {
      const result = validateCountryCodes([], { allowEmpty: true });
      expect(result.valid).toBe(true);
      expect(result.normalized).toEqual([]);
    });

    test('should enforce maxCount limit', () => {
      const codes = Array(60).fill('US'); // 60 codes
      const result = validateCountryCodes(codes, { maxCount: 50 });
      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('Too many countries'))).toBe(true);
    });

    test('should reject non-array input', () => {
      const result = validateCountryCodes('US');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('Expected array');
    });

    test('should handle mixed valid and invalid codes', () => {
      const codes = ['US', '*', 'GB', 'ABC', 'FR'];
      const result = validateCountryCodes(codes);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBe(2); // * and ABC
    });
  });
});

describe('Country Validator - Sanitization', () => {
  
  describe('sanitizeCountryInput', () => {
    
    test('should pass through valid array', () => {
      const input = ['US', 'GB', 'FR'];
      const result = sanitizeCountryInput(input);
      expect(result).toEqual(['US', 'GB', 'FR']);
    });

    test('should normalize valid array', () => {
      const input = ['us', 'gb', 'fr'];
      const result = sanitizeCountryInput(input);
      expect(result).toEqual(['US', 'GB', 'FR']);
    });

    test('should use fallback for invalid array', () => {
      const input = ['*', 'XXX', 'INVALID'];
      const result = sanitizeCountryInput(input);
      expect(result).toEqual(COUNTRY_PRESETS.CORE_MARKETS);
    });

    test('should convert single valid string to array', () => {
      const result = sanitizeCountryInput('US');
      expect(result).toEqual(['US']);
    });

    test('should use fallback for invalid string', () => {
      const result = sanitizeCountryInput('*');
      expect(result).toEqual(COUNTRY_PRESETS.CORE_MARKETS);
    });

    test('should use custom fallback preset', () => {
      const result = sanitizeCountryInput('*', 'GCC');
      expect(result).toEqual(COUNTRY_PRESETS.GCC);
    });

    test('should use CORE_MARKETS for invalid preset name', () => {
      const result = sanitizeCountryInput('*', 'INVALID_PRESET');
      expect(result).toEqual(COUNTRY_PRESETS.CORE_MARKETS);
    });

    test('should handle null/undefined with fallback', () => {
      expect(sanitizeCountryInput(null)).toEqual(COUNTRY_PRESETS.CORE_MARKETS);
      expect(sanitizeCountryInput(undefined)).toEqual(COUNTRY_PRESETS.CORE_MARKETS);
    });
  });
});

describe('Country Validator - Schema Generation', () => {
  
  describe('generateShippingDestination', () => {
    
    test('should generate valid structure for array', () => {
      const result = generateShippingDestination(['US', 'GB', 'FR']);
      expect(result).toEqual({
        "@type": "DefinedRegion",
        "addressCountry": ['US', 'GB', 'FR']
      });
    });

    test('should use preset by name', () => {
      const result = generateShippingDestination('GCC');
      expect(result).toEqual({
        "@type": "DefinedRegion",
        "addressCountry": COUNTRY_PRESETS.GCC
      });
    });

    test('should sanitize invalid input', () => {
      const result = generateShippingDestination(['*', 'INVALID']);
      expect(result).toEqual({
        "@type": "DefinedRegion",
        "addressCountry": COUNTRY_PRESETS.CORE_MARKETS
      });
    });

    test('should handle case-insensitive preset names', () => {
      const result = generateShippingDestination('core_markets');
      expect(result["addressCountry"]).toEqual(COUNTRY_PRESETS.CORE_MARKETS);
    });
  });
});

describe('Country Validator - Presets', () => {
  
  test('CORE_MARKETS should have 10 countries', () => {
    expect(COUNTRY_PRESETS.CORE_MARKETS).toHaveLength(10);
  });

  test('EXTENDED_MARKETS should have 25 countries', () => {
    expect(COUNTRY_PRESETS.EXTENDED_MARKETS).toHaveLength(25);
  });

  test('FULL_COVERAGE should have 50 countries', () => {
    expect(COUNTRY_PRESETS.FULL_COVERAGE).toHaveLength(50);
  });

  test('GCC should have 6 countries', () => {
    expect(COUNTRY_PRESETS.GCC).toHaveLength(6);
  });

  test('EU should have 27 countries', () => {
    expect(COUNTRY_PRESETS.EU).toHaveLength(27);
  });

  test('All preset codes should be valid', () => {
    Object.values(COUNTRY_PRESETS).forEach(preset => {
      preset.forEach(code => {
        expect(VALID_ISO_COUNTRY_CODES.has(code)).toBe(true);
      });
    });
  });

  test('All preset codes should be unique within preset', () => {
    Object.entries(COUNTRY_PRESETS).forEach(([name, codes]) => {
      const unique = new Set(codes);
      expect(unique.size).toBe(codes.length);
    });
  });
});

describe('Country Validator - Real-world Edge Cases', () => {
  
  test('should handle the problematic wildcard case', () => {
    // The actual bug that caused Google error
    const result = validateCountryCodes(['*']);
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('Invalid length');
  });

  test('should handle worldwide string attempts', () => {
    const attempts = ['*', 'worldwide', 'ALL', 'GLOBAL', 'ZZ'];
    attempts.forEach(attempt => {
      const result = validateCountryCode(attempt);
      expect(result.valid).toBe(false);
    });
  });

  test('should sanitize common mistakes', () => {
    const mistakes = [
      ['*'],
      ['worldwide'],
      ['USA'], // 3 letters
      ['U.S.'],
      ['uk']  // Should normalize to UK
    ];
    
    mistakes.forEach(mistake => {
      const result = sanitizeCountryInput(mistake);
      // Should always return valid array
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
      
      // Verify all returned codes are valid
      result.forEach(code => {
        expect(VALID_ISO_COUNTRY_CODES.has(code)).toBe(true);
      });
    });
  });
});

describe('Country Validator - Performance', () => {
  
  test('should validate 1000 codes in under 100ms', () => {
    const codes = Array(1000).fill('US');
    const start = Date.now();
    validateCountryCodes(codes);
    const duration = Date.now() - start;
    expect(duration).toBeLessThan(100);
  });

  test('should validate all ISO codes efficiently', () => {
    const allCodes = Array.from(VALID_ISO_COUNTRY_CODES);
    const start = Date.now();
    const result = validateCountryCodes(allCodes);
    const duration = Date.now() - start;
    
    expect(result.valid).toBe(true);
    expect(duration).toBeLessThan(50);
  });
});
