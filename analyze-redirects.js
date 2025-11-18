#!/usr/bin/env node

/**
 * Redirect Analysis & Fix Tool for onsi.shop
 * Detects "Page with redirect" issues preventing Google indexing
 * 
 * @version 1.0.0
 * @date 2025-11-18
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const { URL } = require('url');

// Configuration
const CONFIG = {
  domain: 'onsi.shop',
  protocol: 'https',
  sitemap: 'https://onsi.shop/sitemap.xml',
  maxRedirects: 10,
  timeout: 10000
};

// Results storage
const results = {
  timestamp: new Date().toISOString(),
  domain: CONFIG.domain,
  total_urls: 0,
  redirect_issues: [],
  clean_urls: [],
  errors: []
};

/**
 * Parse sitemap and extract URLs
 */
async function extractSitemapUrls(sitemapUrl) {
  return new Promise((resolve, reject) => {
    const protocol = sitemapUrl.startsWith('https') ? https : http;
    
    protocol.get(sitemapUrl, (res) => {
      let data = '';
      
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const urlMatches = data.match(/<loc>(.*?)<\/loc>/g) || [];
        const urls = urlMatches.map(u => u.replace(/<\/?loc>/g, ''));
        resolve(urls);
      });
    }).on('error', reject);
  });
}

/**
 * Check HTTP status chain for a URL
 */
async function checkRedirectChain(url, depth = 0, chain = []) {
  if (depth >= CONFIG.maxRedirects) {
    return {
      url,
      status: 'ERROR',
      error: 'Too many redirects',
      chain
    };
  }

  return new Promise((resolve) => {
    const parsedUrl = new URL(url);
    const protocol = parsedUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'HEAD',
      timeout: CONFIG.timeout,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; OnsiShopRedirectChecker/1.0; +https://onsi.shop)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    };

    const req = protocol.request(options, (res) => {
      const step = {
        url,
        status: res.statusCode,
        headers: res.headers,
        location: res.headers.location || null
      };
      
      chain.push(step);

      // Handle redirects
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        const nextUrl = new URL(res.headers.location, url).href;
        setTimeout(() => {
          checkRedirectChain(nextUrl, depth + 1, chain).then(resolve);
        }, 100);
      } else {
        resolve({
          url,
          finalStatus: res.statusCode,
          finalUrl: url,
          redirectCount: chain.length - 1,
          chain
        });
      }
    });

    req.on('error', (error) => {
      resolve({
        url,
        status: 'ERROR',
        error: error.message,
        chain
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve({
        url,
        status: 'TIMEOUT',
        error: 'Request timeout',
        chain
      });
    });

    req.end();
  });
}

/**
 * Classify redirect type
 */
function classifyRedirect(result) {
  if (!result.chain || result.chain.length === 0) {
    return {
      classification: 'ERROR',
      reason: 'No response data',
      intentional: false
    };
  }

  const firstResponse = result.chain[0];
  const finalResponse = result.chain[result.chain.length - 1];

  // No redirect - clean URL
  if (result.redirectCount === 0 && firstResponse.status === 200) {
    return {
      classification: 'CLEAN',
      reason: 'Direct 200 response',
      intentional: true
    };
  }

  // Permanent redirect (301)
  if (firstResponse.status === 301) {
    // Check if it's intentional based on common patterns
    const isWwwRedirect = 
      firstResponse.url.includes('www.') !== firstResponse.location?.includes('www.');
    const isHttpsRedirect = 
      firstResponse.url.startsWith('http:') && firstResponse.location?.startsWith('https:');
    const isTrailingSlash = 
      firstResponse.url.endsWith('/') !== firstResponse.location?.endsWith('/');

    if (isWwwRedirect || isHttpsRedirect || isTrailingSlash) {
      return {
        classification: 'INTENTIONAL-PERMANENT',
        reason: `URL normalization: ${isWwwRedirect ? 'www' : ''} ${isHttpsRedirect ? 'https' : ''} ${isTrailingSlash ? 'trailing-slash' : ''}`,
        intentional: true
      };
    }

    return {
      classification: 'INTENTIONAL-PERMANENT',
      reason: '301 redirect to different resource',
      intentional: true,
      action_required: 'Update sitemap and internal links'
    };
  }

  // Temporary redirect (302, 307)
  if (firstResponse.status === 302 || firstResponse.status === 307) {
    return {
      classification: 'INTENTIONAL-TEMPORARY',
      reason: `${firstResponse.status} temporary redirect`,
      intentional: true,
      seo_impact: 'May not pass PageRank',
      action_required: 'Verify if temporary redirect is still needed'
    };
  }

  // Meta refresh or JavaScript redirect (200 with redirect)
  if (firstResponse.status === 200 && result.redirectCount > 0) {
    return {
      classification: 'UNINTENTIONAL-CLIENT-SIDE',
      reason: 'Client-side redirect (meta refresh or JavaScript)',
      intentional: false,
      seo_impact: 'HIGH - Google may not follow, indexing blocked',
      action_required: 'Replace with server-side 301 or remove redirect'
    };
  }

  // Error status
  if (firstResponse.status >= 400) {
    return {
      classification: 'ERROR',
      reason: `HTTP ${firstResponse.status} error`,
      intentional: false,
      seo_impact: 'CRITICAL - Page not accessible',
      action_required: 'Fix broken page or remove from sitemap'
    };
  }

  // Other redirect codes
  if (firstResponse.status >= 300 && firstResponse.status < 400) {
    return {
      classification: 'REDIRECT-OTHER',
      reason: `HTTP ${firstResponse.status} redirect`,
      intentional: 'UNKNOWN',
      action_required: 'Review redirect configuration'
    };
  }

  return {
    classification: 'UNKNOWN',
    reason: 'Unexpected response pattern',
    intentional: false
  };
}

/**
 * Determine redirect source
 */
function determineRedirectSource(result, domain) {
  const firstResponse = result.chain[0];
  
  // Server headers analysis
  const server = firstResponse.headers?.server?.toLowerCase() || '';
  const via = firstResponse.headers?.via?.toLowerCase() || '';
  const xPoweredBy = firstResponse.headers?.[' x-powered-by']?.toLowerCase() || '';

  // Vercel detection
  if (server.includes('vercel') || via.includes('vercel') || firstResponse.headers?.['x-vercel-id']) {
    return {
      source: 'vercel-edge-network',
      type: 'platform',
      config_file: 'vercel.json',
      fix_location: 'vercel.json routes configuration'
    };
  }

  // Meta refresh detection (would need HTML parse)
  if (firstResponse.status === 200) {
    return {
      source: 'client-side',
      type: 'html-meta-or-javascript',
      config_file: 'index.html or script.js',
      fix_location: 'HTML meta tags or JavaScript window.location'
    };
  }

  // Server-side redirect
  if (firstResponse.status >= 300 && firstResponse.status < 400) {
    return {
      source: 'server-configuration',
      type: 'http-redirect',
      config_file: 'vercel.json or server config',
      fix_location: 'Server routing rules'
    };
  }

  return {
    source: 'unknown',
    type: 'unknown',
    config_file: 'unknown',
    fix_location: 'Manual investigation required'
  };
}

/**
 * Generate fix recommendations
 */
function generateFix(analysis, source) {
  const fixes = [];

  if (analysis.classification === 'CLEAN') {
    return {
      proposed_fix: 'NONE - URL is clean',
      priority: 'LOW',
      risk: 'NONE'
    };
  }

  if (analysis.classification === 'INTENTIONAL-PERMANENT') {
    fixes.push({
      action: 'UPDATE_SITEMAP',
      description: 'Update sitemap.xml to use final URL instead of redirect',
      risk: 'LOW',
      command: `Update sitemap.xml: Change ${analysis.url} to ${analysis.finalUrl}`
    });

    fixes.push({
      action: 'UPDATE_CANONICAL',
      description: 'Ensure canonical tag points to final URL',
      risk: 'LOW',
      file: 'index.html',
      change: `<link rel="canonical" href="${analysis.finalUrl}">`
    });
  }

  if (analysis.classification === 'INTENTIONAL-TEMPORARY') {
    fixes.push({
      action: 'REVIEW_NECESSITY',
      description: '302/307 redirects don\'t pass PageRank - consider changing to 301 if permanent',
      risk: 'MEDIUM',
      seo_impact: 'May lose link equity'
    });
  }

  if (analysis.classification === 'UNINTENTIONAL-CLIENT-SIDE') {
    fixes.push({
      action: 'REMOVE_CLIENT_REDIRECT',
      description: 'Remove meta refresh or JavaScript redirect, use server-side 301',
      risk: 'MEDIUM',
      priority: 'HIGH',
      files: ['index.html', 'script.js'],
      search_for: ['<meta http-equiv="refresh"', 'window.location =', 'window.location.href =']
    });

    fixes.push({
      action: 'ADD_SERVER_REDIRECT',
      description: 'Add proper 301 redirect in vercel.json',
      risk: 'LOW',
      file: 'vercel.json',
      example: `{
  "redirects": [
    {
      "source": "${analysis.url}",
      "destination": "${analysis.finalUrl}",
      "permanent": true
    }
  ]
}`
    });
  }

  if (analysis.classification === 'ERROR') {
    fixes.push({
      action: 'REMOVE_FROM_SITEMAP',
      description: 'Remove broken URL from sitemap.xml',
      risk: 'LOW',
      priority: 'HIGH'
    });

    fixes.push({
      action: 'FIX_OR_RESTORE',
      description: 'Fix broken page or restore content to return 200',
      risk: 'MEDIUM',
      priority: 'CRITICAL'
    });
  }

  return {
    proposed_fixes: fixes,
    priority: analysis.action_required ? 'HIGH' : 'MEDIUM',
    risk: fixes.length > 0 ? 'MEDIUM' : 'LOW'
  };
}

/**
 * Main analysis function
 */
async function analyzeRedirects() {
  console.log('🔍 Starting redirect analysis for onsi.shop...\n');

  // 1. Extract URLs from sitemap
  console.log('📄 Fetching sitemap...');
  let urls;
  try {
    urls = await extractSitemapUrls(CONFIG.sitemap);
    results.total_urls = urls.length;
    console.log(`✅ Found ${urls.length} URLs in sitemap\n`);
  } catch (error) {
    console.error('❌ Failed to fetch sitemap:', error.message);
    results.errors.push({
      step: 'sitemap_fetch',
      error: error.message
    });
    return results;
  }

  // 2. Check each URL
  console.log('🌐 Checking each URL for redirects...\n');
  
  for (const url of urls) {
    console.log(`Checking: ${url}`);
    
    try {
      const redirectCheck = await checkRedirectChain(url);
      const classification = classifyRedirect(redirectCheck);
      const source = determineRedirectSource(redirectCheck, CONFIG.domain);
      const fix = generateFix({ ...redirectCheck, ...classification }, source);

      const analysis = {
        url,
        final_url: redirectCheck.finalUrl || url,
        status_chain: redirectCheck.chain.map(c => ({
          url: c.url,
          status: c.status,
          location: c.location
        })),
        redirect_count: redirectCheck.redirectCount,
        source,
        classification: classification.classification,
        reason: classification.reason,
        intentional: classification.intentional,
        seo_impact: classification.seo_impact || 'NONE',
        action_required: classification.action_required || 'NONE',
        ...fix,
        timestamp: new Date().toISOString()
      };

      if (classification.classification === 'CLEAN') {
        results.clean_urls.push(analysis);
        console.log(`  ✅ Clean (200 OK)\n`);
      } else {
        results.redirect_issues.push(analysis);
        console.log(`  ⚠️  ${classification.classification}: ${classification.reason}\n`);
      }

    } catch (error) {
      console.log(`  ❌ Error: ${error.message}\n`);
      results.errors.push({
        url,
        error: error.message,
        timestamp: new Date().toISOString()
      });
    }

    // Rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Generate human-readable report
 */
function generateReport(results) {
  let report = '═'.repeat(80) + '\n';
  report += '  REDIRECT ANALYSIS REPORT - onsi.shop\n';
  report += '═'.repeat(80) + '\n\n';

  report += `Analysis Date: ${results.timestamp}\n`;
  report += `Total URLs Checked: ${results.total_urls}\n`;
  report += `Clean URLs (200 OK): ${results.clean_urls.length}\n`;
  report += `URLs with Redirects: ${results.redirect_issues.length}\n`;
  report += `Errors: ${results.errors.length}\n\n`;

  if (results.redirect_issues.length > 0) {
    report += '─'.repeat(80) + '\n';
    report += 'REDIRECT ISSUES FOUND:\n';
    report += '─'.repeat(80) + '\n\n';

    results.redirect_issues.forEach((issue, index) => {
      report += `${index + 1}. ${issue.url}\n`;
      report += `   Classification: ${issue.classification}\n`;
      report += `   Redirect Count: ${issue.redirect_count}\n`;
      report += `   Final URL: ${issue.final_url}\n`;
      report += `   SEO Impact: ${issue.seo_impact}\n`;
      report += `   Action Required: ${issue.action_required}\n`;
      
      if (issue.proposed_fixes && issue.proposed_fixes.length > 0) {
        report += `   Recommended Fixes:\n`;
        issue.proposed_fixes.forEach(fix => {
          report += `     - ${fix.action}: ${fix.description}\n`;
          if (fix.risk) report += `       Risk: ${fix.risk}\n`;
        });
      }
      
      report += '\n';
    });
  }

  if (results.clean_urls.length > 0) {
    report += '─'.repeat(80) + '\n';
    report += 'CLEAN URLs (No Issues):\n';
    report += '─'.repeat(80) + '\n\n';
    results.clean_urls.forEach(url => {
      report += `  ✅ ${url.url}\n`;
    });
    report += '\n';
  }

  if (results.errors.length > 0) {
    report += '─'.repeat(80) + '\n';
    report += 'ERRORS:\n';
    report += '─'.repeat(80) + '\n\n';
    results.errors.forEach(error => {
      report += `  ❌ ${error.url || error.step}: ${error.error}\n`;
    });
    report += '\n';
  }

  report += '═'.repeat(80) + '\n';
  report += 'END OF REPORT\n';
  report += '═'.repeat(80) + '\n';

  return report;
}

/**
 * Save results
 */
function saveResults(results, report) {
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  
  // Save JSON
  const jsonFile = `redirect-analysis-${timestamp}.json`;
  fs.writeFileSync(jsonFile, JSON.stringify(results, null, 2));
  console.log(`\n💾 JSON report saved: ${jsonFile}`);

  // Save human-readable report
  const txtFile = `redirect-analysis-${timestamp}.txt`;
  fs.writeFileSync(txtFile, report);
  console.log(`💾 Text report saved: ${txtFile}`);

  return { jsonFile, txtFile };
}

// Execute if run directly
if (require.main === module) {
  analyzeRedirects()
    .then(results => {
      const report = generateReport(results);
      console.log('\n' + report);
      
      const files = saveResults(results, report);
      
      console.log('\n📊 Summary:');
      console.log(`   Total: ${results.total_urls}`);
      console.log(`   Clean: ${results.clean_urls.length}`);
      console.log(`   Issues: ${results.redirect_issues.length}`);
      console.log(`   Errors: ${results.errors.length}`);
      
      if (results.redirect_issues.length > 0) {
        console.log('\n⚠️  Action required for redirect issues');
        console.log(`   Review: ${files.txtFile}`);
      } else {
        console.log('\n✅ No redirect issues found!');
      }
    })
    .catch(error => {
      console.error('\n❌ Analysis failed:', error);
      process.exit(1);
    });
}

module.exports = {
  analyzeRedirects,
  checkRedirectChain,
  classifyRedirect,
  determineRedirectSource,
  generateFix
};
