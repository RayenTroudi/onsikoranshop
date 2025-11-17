# 🚀 Deployment Guide - Structured Data Fix

## Pre-Deployment Validation

### Step 1: Local Validation
```bash
# Navigate to project directory
cd d:\OnsiKoran

# Validate structured data
node validate-structured-data.js index.html

# Expected output:
# ✅ VALIDATION PASSED - No errors found!
# 📊 Ready for Google Merchant Center submission
```

### Step 2: Run Unit Tests
```bash
# Install dependencies (if not already installed)
npm install --save-dev jest

# Run country validator tests
npm test -- country-validator.test.js

# Expected: All tests pass (50/50)
```

### Step 3: Build and Re-validate
```bash
# Build the project
npm run build

# Validate built file
node validate-structured-data.js dist/index.html

# Should show: ✅ VALIDATION PASSED
```

---

## Deployment Commands

### Option A: Automatic Deployment (Recommended)
```bash
# Build, commit, and push
npm run build
git add .
git commit -m "Fix: Replace wildcard country codes with valid ISO 3166-1 alpha-2 codes for Google Merchant Center compliance"
git push origin main

# Vercel/Netlify will auto-deploy
```

### Option B: Manual Deployment Steps
```bash
# 1. Build
npm run build

# 2. Validate
node validate-structured-data.js dist/index.html

# 3. Stage changes
git add index.html
git add country-validator.js
git add validate-structured-data.js
git add STRUCTURED_DATA_FIX.md
git add CHANGELOG_STRUCTURED_DATA.md

# 4. Commit with descriptive message
git commit -m "Fix: Google Merchant Center addressCountry validation error

- Replace wildcard '*' with valid ISO 3166-1 alpha-2 codes
- Add 10 target countries (TN, US, GB, CA, AU, SA, AE, FR, DE, MA)
- Implement country validation utilities
- Add comprehensive unit tests
- Include deployment documentation

Fixes: Google Search Console error 'Invalid string length in field name'
Impact: Enables Google Shopping product listings and rich snippets"

# 5. Push to production
git push origin main
```

---

## Post-Deployment Verification

### Step 1: Wait for Deployment (5-10 minutes)
```bash
# Check deployment status
# Vercel: https://vercel.com/dashboard
# Netlify: https://app.netlify.com/
```

### Step 2: Test Live Site

#### A. Schema.org Validator
```bash
# Open in browser:
https://validator.schema.org/#url=https%3A%2F%2Fonsi.shop%2F

# Expected results:
# ✅ No errors
# ✅ No warnings for addressCountry
# ✅ Product schema valid
```

#### B. Google Rich Results Test
```bash
# Open in browser:
https://search.google.com/test/rich-results

# Enter URL: https://onsi.shop

# Expected results:
# ✅ Product rich result detected
# ✅ No errors
# ✅ Preview shows product information
```

#### C. Automated API Test (cURL)
```bash
# Test with Google's URL Testing Tools API
curl -X POST "https://searchconsole.googleapis.com/v1/urlTestingTools/richResults:run" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://onsi.shop/",
    "category": "PRODUCT"
  }'

# Note: Requires Google API authentication
```

### Step 3: Request Google Re-Index

#### Google Search Console
```bash
# 1. Login to Search Console
#    https://search.google.com/search-console

# 2. Select property: onsi.shop

# 3. Use URL Inspection Tool
#    - Enter URL: https://onsi.shop/
#    - Click "Request Indexing"

# 4. Expected result:
#    "Indexing requested"
```

#### Submit Sitemap
```bash
# In Search Console:
# Sitemaps → Add new sitemap
# Enter: https://onsi.shop/sitemap.xml
# Click Submit

# Expected: Sitemap processed successfully
```

### Step 4: Google Merchant Center

#### A. Verify Feed Status
```bash
# 1. Login to Merchant Center
#    https://merchants.google.com

# 2. Navigate to Products → Diagnostics

# 3. Check "Shipping" category

# Expected (after re-crawl, 24-48 hours):
# ✅ 0 shipping errors
# ✅ Product approved
```

#### B. Re-submit Product Feed (if applicable)
```bash
# If using product feed:
# Products → Feeds → [Your Feed] → Fetch now

# Or update via API/FTP with corrected data
```

---

## Monitoring (First 72 Hours)

### Day 1 (0-24 hours)
```bash
# Check Google Search Console
# Performance → Search Results
# Look for: Impressions starting to appear

# Check Merchant Center
# Products → Diagnostics
# Status should change from "Pending" → "Approved"
```

### Day 2-3 (24-72 hours)
```bash
# Verify in Google Shopping
# Search: "quranic verses box" or "islamic inspiration cards"
# Expected: Product appears in Shopping tab

# Check Rich Snippets
# Search: site:onsi.shop
# Expected: Product snippet with price, rating, availability
```

### Weekly (Ongoing)
```bash
# Monitor Search Console for warnings
# Expected: 0 structured data errors

# Track clicks from Google Shopping
# Google Ads → Shopping campaigns → Performance
```

---

## Rollback Plan (If Issues Occur)

### Emergency Rollback
```bash
# 1. Revert to previous commit
git log --oneline  # Find previous commit hash
git revert HEAD    # Or specific commit

# 2. Push rollback
git push origin main

# 3. Wait for deployment (5-10 min)
```

### Temporary Fix (Keep Wildcard)
```javascript
// If you need to temporarily disable shipping destination:
// In index.html, replace:

"shippingDetails": {
  "@type": "OfferShippingDetails",
  "shippingRate": {
    "@type": "MonetaryAmount",
    "value": "0",
    "currency": "USD"
  }
  // Remove shippingDestination entirely
}

// This removes the error but reduces targeting precision
```

---

## Troubleshooting

### Issue: Validation still shows errors

**Check:**
```bash
# 1. Clear browser cache
# 2. Hard refresh (Ctrl+F5)
# 3. Verify deployment completed
# 4. Re-run validator on live site

curl -s https://onsi.shop/ | grep -A 10 "addressCountry"
# Should show: ["TN", "US", "GB", ...]
```

**Fix:**
```bash
# Force rebuild and redeploy
npm run build
git commit --allow-empty -m "Force rebuild"
git push origin main
```

### Issue: Google Search Console still shows error

**Reason:** Google takes 24-72 hours to re-crawl

**Action:**
```bash
# 1. Confirm fix is live (see above)
# 2. Request re-indexing (see Step 3)
# 3. Wait 48 hours
# 4. Check again

# If still showing after 72 hours:
# - Check other pages (not just homepage)
# - Verify sitemap updated
# - Submit URL for re-crawl again
```

### Issue: Merchant Center still rejects product

**Check feed format:**
```xml
<!-- In product feed XML/RSS, ensure: -->
<g:shipping>
  <g:country>US</g:country>  <!-- Not "*" -->
  <g:price>0 USD</g:price>
</g:shipping>

<!-- Update all country fields in feed -->
```

---

## Success Metrics

### Week 1
- [ ] Schema validation: 0 errors
- [ ] Google Rich Results Test: PASSED
- [ ] Search Console: No new warnings
- [ ] Merchant Center: Product approved

### Week 2-4
- [ ] Product appears in Google Shopping
- [ ] Rich snippets show in search results
- [ ] Impressions increase in target countries
- [ ] CTR improves from search

---

## Additional Validation Tools

### Browser DevTools
```javascript
// Open browser console on https://onsi.shop/
// Run this to extract and check JSON-LD:

const scripts = document.querySelectorAll('script[type="application/ld+json"]');
const productSchema = JSON.parse(scripts[0].textContent);

console.log('Checking addressCountry values...');
productSchema.offers.forEach((offer, i) => {
  const countries = offer.shippingDetails?.shippingDestination?.addressCountry;
  console.log(`Offer ${i + 1} (${offer.priceCurrency}):`, countries);
  
  // Validate each code
  countries.forEach(code => {
    if (code.length !== 2) {
      console.error(`❌ Invalid: "${code}" (length: ${code.length})`);
    } else if (!/^[A-Z]{2}$/.test(code)) {
      console.error(`❌ Invalid format: "${code}"`);
    } else {
      console.log(`✅ Valid: ${code}`);
    }
  });
});
```

### Command Line Quick Check
```bash
# Extract and validate JSON-LD from live site
curl -s https://onsi.shop/ | \
  grep -oP '(?<=<script type="application/ld\+json">).*?(?=</script>)' | \
  jq '.offers[].shippingDetails.shippingDestination.addressCountry'

# Expected output:
# ["TN","US","GB","CA","AU","SA","AE","FR","DE","MA"]
# (repeated for each offer)
```

---

## Contacts & Support

**Google Search Console Issues:**
- Forum: https://support.google.com/webmasters/community
- Documentation: https://developers.google.com/search/docs/advanced/structured-data

**Google Merchant Center Issues:**
- Support: https://support.google.com/merchants/
- Status Dashboard: https://merchants.google.com/mc/products/diagnostics

**Schema.org Questions:**
- Documentation: https://schema.org/docs/gs.html
- Community: https://github.com/schemaorg/schemaorg/discussions

---

## Checklist Summary

**Pre-Deployment:**
- [ ] Local validation passed
- [ ] Unit tests passed
- [ ] Build successful
- [ ] Changes committed

**Deployment:**
- [ ] Code pushed to main
- [ ] Build deployed automatically
- [ ] Live site accessible

**Post-Deployment:**
- [ ] Schema.org validator: PASSED
- [ ] Google Rich Results Test: PASSED
- [ ] Search Console: Re-index requested
- [ ] Merchant Center: Status checked

**Monitoring:**
- [ ] Day 1: Check console for errors
- [ ] Day 3: Verify Merchant Center approval
- [ ] Week 1: Confirm Shopping appearance
- [ ] Week 4: Measure performance improvement

---

*Deployment Guide Version: 1.0*  
*Last Updated: November 17, 2025*  
*Status: ✅ Production Ready*
