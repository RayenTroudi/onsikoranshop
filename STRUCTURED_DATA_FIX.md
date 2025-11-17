# 🔧 STRUCTURED DATA FIX - Google Merchant Center Compliance

## Issue Summary
**Error:** `Invalid string length in field 'name' (in 'offers.shippingDetails.shippingDestination.addressCountry')`

**Root Cause:** Using wildcard `"*"` instead of valid ISO 3166-1 alpha-2 country codes

**Impact:** 
- Product not appearing in Google Shopping
- Rich snippets degraded or hidden
- Merchant Center feed rejected
- International targeting broken

---

## Technical Deep Dive

### Schema.org Requirements
Per [schema.org/DefinedRegion](https://schema.org/DefinedRegion):
- `addressCountry`: Text or Country
- Expected: ISO 3166-1 alpha-2 (2-letter) codes
- Examples: `"US"`, `"GB"`, `"TN"`, `"SA"`

### Google Merchant Center Rules
Per [Google Merchant Center Shipping Documentation](https://support.google.com/merchants/answer/6324484):
1. **MUST** use ISO 3166-1 alpha-2 codes (exactly 2 uppercase letters)
2. **CANNOT** use wildcards (`*`), "worldwide", or custom values
3. For worldwide shipping, list **top target countries** (max 50 recommended)
4. Each code must be in the official ISO registry

### Why `"*"` Failed
- Length: 1 character (expected: 2)
- Not in ISO 3166-1 registry
- Google parser treats as malformed data
- Triggers validation error in Structured Data Testing Tool

---

## Fix Strategy

### Option A: Specify Top Target Countries (RECOMMENDED)
List your actual shipping destinations for better targeting and compliance.

**Benefits:**
- Google can show accurate shipping info per region
- Better product matching in local searches
- Merchant Center accepts immediately
- Improved international SEO

**Implementation:**
```json
"addressCountry": ["TN", "US", "GB", "CA", "AU", "FR", "DE", "SA", "AE", "EG", "MA"]
```

### Option B: Omit shippingDestination (Fallback)
If you truly ship worldwide with no restrictions, omit the field entirely.

**Trade-offs:**
- ✅ No validation errors
- ❌ Less precise targeting
- ❌ May not appear in region-specific shopping results

**Implementation:**
```json
"shippingDetails": {
  "@type": "OfferShippingDetails",
  "shippingRate": {
    "@type": "MonetaryAmount",
    "value": "0",
    "currency": "USD"
  },
  "deliveryTime": { ... }
  // shippingDestination omitted
}
```

### Option C: Single Worldwide Destination (Not Recommended)
Google technically allows `"ZZ"` for "Unknown or Invalid Territory" but this is poorly supported.

---

## Recommended Country List for ONSi.shop

Based on your international SEO targeting, here are the top markets:

### Tier 1 (Core Markets - 10 countries)
```javascript
["TN", "US", "GB", "CA", "AU", "SA", "AE", "FR", "DE", "MA"]
```

### Tier 2 (Extended - 25 countries)
```javascript
[
  "TN", "US", "GB", "CA", "AU", "FR", "DE",           // Western markets
  "SA", "AE", "EG", "MA", "DZ", "QA", "KW", "BH",     // Arab Gulf + North Africa
  "TR", "PK", "BD", "ID", "MY", "SG",                 // Muslim-majority Asia
  "NL", "BE", "SE", "NO", "DK"                        // Nordic/Benelux
]
```

### Tier 3 (Full Coverage - 50 countries)
Use this for maximum reach while staying under Google's soft limit:
```javascript
[
  // Americas
  "US", "CA", "BR", "MX", "AR",
  // Europe
  "GB", "FR", "DE", "IT", "ES", "NL", "BE", "SE", "NO", "DK", "FI", "PL", "AT", "CH", "IE",
  // Middle East & North Africa
  "TN", "SA", "AE", "EG", "MA", "DZ", "QA", "KW", "BH", "OM", "JO", "LB", "IQ", "YE", "LY",
  // Asia-Pacific
  "TR", "PK", "BD", "IN", "ID", "MY", "SG", "AU", "NZ", "TH", "PH",
  // Africa
  "ZA", "NG", "KE", "GH"
]
```

---

## Implementation Checklist

- [ ] Replace all `"addressCountry": ["*"]` instances
- [ ] Use Tier 1 (10 countries) for simplicity
- [ ] Validate with Google Rich Results Test
- [ ] Re-submit to Google Merchant Center
- [ ] Monitor Search Console for 48-72 hours
- [ ] Verify product appears in Google Shopping

---

## Testing Commands

### 1. Google Rich Results Test (API)
```bash
curl -X POST "https://searchconsole.googleapis.com/v1/urlTestingTools/mobileFriendlyTest:run" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://onsi.shop/"}'
```

### 2. Schema.org Validator
```bash
# Visit in browser:
https://validator.schema.org/#url=https%3A%2F%2Fonsi.shop%2F
```

### 3. Local JSON-LD Validation (Node.js)
```bash
npm install --save-dev ajv ajv-formats
node validate-schema.js
```

### 4. Google Merchant Center Diagnostics
1. Login: https://merchants.google.com
2. Products → Diagnostics
3. Check "Shipping" errors
4. Expected: 0 errors after fix

---

## Prevention Checklist

- [ ] Add pre-commit hook to validate country codes
- [ ] Implement unit tests for schema generation
- [ ] Use ISO 3166-1 validation library
- [ ] Add CI check for structured data
- [ ] Monitor Search Console weekly

---

*Fix applied: November 17, 2025*
