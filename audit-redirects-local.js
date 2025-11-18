#!/usr/bin/env node

/**
 * Local Redirect Configuration Audit for onsi.shop
 * Analyzes local configuration files for potential redirect issues
 * 
 * @version 1.0.0
 * @date 2025-11-18
 */

const fs = require('fs');
const path = require('path');

const RESULTS = {
  timestamp: new Date().toISOString(),
  domain: 'onsi.shop',
  analysis: {
    vercel_config: null,
    html_redirects: [],
    javascript_redirects: [],
    sitemap_urls: [],
    recommendations: []
  }
};

/**
 * Analyze vercel.json for redirect rules
 */
function analyzeVercelConfig() {
  console.log('\n🔍 Analyzing vercel.json...');
  
  try {
    const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf-8'));
    
    const analysis = {
      has_redirects: false,
      redirect_rules: [],
      route_rules: [],
      potential_issues: []
    };

    // Check for explicit redirects
    if (vercelConfig.redirects && Array.isArray(vercelConfig.redirects)) {
      analysis.has_redirects = true;
      analysis.redirect_rules = vercelConfig.redirects;
    }

    // Check routes for redirect-like behavior
    if (vercelConfig.routes && Array.isArray(vercelConfig.routes)) {
      vercelConfig.routes.forEach((route, index) => {
        const rule = {
          index,
          source: route.src,
          destination: route.dest,
          status: route.status,
          type: 'route'
        };

        // Check if route acts as redirect
        if (route.status && (route.status === 301 || route.status === 302 || route.status === 307 || route.status === 308)) {
          rule.type = 'redirect';
          rule.seo_impact = route.status === 301 || route.status === 308 ? 'PERMANENT' : 'TEMPORARY';
          analysis.potential_issues.push({
            rule_index: index,
            issue: `Route acts as ${route.status} redirect`,
            impact: rule.seo_impact === 'TEMPORARY' ? 'May not pass PageRank' : 'Acceptable if intentional'
          });
        }

        // Check catch-all routes
        if (route.src === '/(.*)' || route.src === '(.*)' || route.src === '/(.*))') {
          rule.is_catchall = true;
          analysis.potential_issues.push({
            rule_index: index,
            issue: 'Catch-all route - ensure it returns 200 for valid URLs',
            destination: route.dest
          });
        }

        analysis.route_rules.push(rule);
      });
    }

    console.log(`  ✅ Found ${analysis.route_rules.length} route rules`);
    console.log(`  ${analysis.has_redirects ? '⚠️' : '✅'}  Explicit redirects: ${analysis.redirect_rules.length}`);
    console.log(`  ${analysis.potential_issues.length > 0 ? '⚠️' : '✅'}  Potential issues: ${analysis.potential_issues.length}\n`);

    return analysis;

  } catch (error) {
    console.log(`  ❌ Error reading vercel.json: ${error.message}\n`);
    return {
      error: error.message,
      has_redirects: false
    };
  }
}

/**
 * Scan HTML files for meta refresh redirects
 */
function scanHTMLRedirects() {
  console.log('🔍 Scanning HTML files for meta refresh...');
  
  const htmlFiles = ['index.html', 'admin.html'];
  const redirects = [];

  htmlFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      
      // Check for meta refresh
      const metaRefreshRegex = /<meta\s+http-equiv=["']refresh["']\s+content=["'](\d+);?\s*url=([^"']+)["']/gi;
      let match;
      
      while ((match = metaRefreshRegex.exec(content)) !== null) {
        redirects.push({
          file,
          type: 'meta-refresh',
          delay: parseInt(match[1]),
          target: match[2],
          severity: 'HIGH',
          issue: 'Meta refresh redirects are client-side and may not be followed by Googlebot',
          fix: 'Replace with server-side 301 redirect in vercel.json'
        });
      }

      // Check for rel=canonical pointing elsewhere
      const canonicalRegex = /<link\s+rel=["']canonical["']\s+href=["']([^"']+)["']/gi;
      while ((match = canonicalRegex.exec(content)) !== null) {
        const canonicalUrl = match[1];
        if (!canonicalUrl.includes('onsi.shop/') || canonicalUrl !== 'https://onsi.shop/') {
          // This is just informational, not necessarily an issue
          console.log(`  ℹ️  ${file}: canonical set to ${canonicalUrl}`);
        }
      }

    } catch (error) {
      console.log(`  ⚠️  Could not read ${file}: ${error.message}`);
    }
  });

  console.log(`  ${redirects.length > 0 ? '⚠️' : '✅'}  Meta refresh redirects found: ${redirects.length}\n`);
  
  return redirects;
}

/**
 * Scan JavaScript files for window.location redirects
 */
function scanJavaScriptRedirects() {
  console.log('🔍 Scanning JavaScript for window.location redirects...');
  
  const jsFiles = [
    'script.js',
    'admin-script.js',
    'appwrite-config.js'
  ];

  const redirects = [];

  jsFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      // Patterns for redirect detection
      const patterns = [
        /window\.location\.href\s*=\s*['"]([^'"]+)['"]/g,
        /window\.location\s*=\s*['"]([^'"]+)['"]/g,
        /window\.location\.replace\(['"]([^'"]+)['"]\)/g,
        /document\.location\.href\s*=\s*['"]([^'"]+)['"]/g
      ];

      patterns.forEach(pattern => {
        let match;
        while ((match = pattern.exec(content)) !== null) {
          const target = match[1];
          
          // Find line number
          const position = match.index;
          const lineNumber = content.substring(0, position).split('\n').length;
          const lineContent = lines[lineNumber - 1].trim();

          // Check if it's conditional or user-triggered
          const isConditional = lineContent.includes('if') || lineContent.includes('?');
          const isUserAction = lineContent.includes('onclick') || lineContent.includes('addEventListener');

          redirects.push({
            file,
            line: lineNumber,
            target,
            code: lineContent.substring(0, 80) + (lineContent.length > 80 ? '...' : ''),
            conditional: isConditional,
            user_triggered: isUserAction,
            severity: (!isConditional && !isUserAction) ? 'HIGH' : 'LOW',
            issue: (!isConditional && !isUserAction) 
              ? 'Unconditional JavaScript redirect may prevent indexing'
              : 'Conditional/user-triggered redirect (likely acceptable)',
            recommendation: (!isConditional && !isUserAction)
              ? 'If this runs on page load, replace with server-side 301'
              : 'Monitor to ensure it doesn\'t run on initial page load'
          });
        }
      });

    } catch (error) {
      console.log(`  ⚠️  Could not read ${file}: ${error.message}`);
    }
  });

  const highSeverity = redirects.filter(r => r.severity === 'HIGH');
  console.log(`  ${highSeverity.length > 0 ? '⚠️' : '✅'}  JavaScript redirects found: ${redirects.length} (${highSeverity.length} high-severity)\n`);

  return redirects;
}

/**
 * Extract and validate sitemap URLs
 */
function analyzeSitemap() {
  console.log('🔍 Analyzing sitemap.xml...');
  
  try {
    const content = fs.readFileSync('sitemap.xml', 'utf-8');
    const urlMatches = content.match(/<loc>(.*?)<\/loc>/g) || [];
    const urls = urlMatches.map(u => u.replace(/<\/?loc>/g, ''));

    console.log(`  ✅ Found ${urls.length} URLs in sitemap\n`);

    return urls.map(url => ({
      url,
      is_absolute: url.startsWith('http'),
      protocol: url.startsWith('https://') ? 'https' : url.startsWith('http://') ? 'http' : 'relative',
      domain: url.includes('onsi.shop') ? 'onsi.shop' : 'other'
    }));

  } catch (error) {
    console.log(`  ❌ Error reading sitemap.xml: ${error.message}\n`);
    return [];
  }
}

/**
 * Generate recommendations
 */
function generateRecommendations(analysis) {
  const recommendations = [];

  // Vercel config recommendations
  if (analysis.vercel_config && analysis.vercel_config.potential_issues) {
    analysis.vercel_config.potential_issues.forEach(issue => {
      if (issue.issue.includes('Catch-all route')) {
        recommendations.push({
          priority: 'MEDIUM',
          category: 'vercel-config',
          issue: 'Catch-all route may mask 404 errors',
          recommendation: 'Ensure catch-all returns proper 200 for valid pages and 404 for missing pages',
          file: 'vercel.json',
          test_command: 'curl -I https://onsi.shop/nonexistent-page (should return 404)'
        });
      }
    });
  }

  // HTML meta refresh recommendations
  if (analysis.html_redirects && analysis.html_redirects.length > 0) {
    analysis.html_redirects.forEach(redirect => {
      recommendations.push({
        priority: 'HIGH',
        category: 'html-redirect',
        issue: `Meta refresh redirect in ${redirect.file}`,
        recommendation: 'Replace with server-side 301 redirect',
        file: redirect.file,
        current: `<meta http-equiv="refresh" content="${redirect.delay};url=${redirect.target}">`,
        proposed_fix: {
          action: 'Add to vercel.json redirects',
          code: `{
  "redirects": [
    {
      "source": "/old-url",
      "destination": "${redirect.target}",
      "permanent": true
    }
  ]
}`
        }
      });
    });
  }

  // JavaScript redirect recommendations
  if (analysis.javascript_redirects) {
    const highSeverity = analysis.javascript_redirects.filter(r => r.severity === 'HIGH');
    if (highSeverity.length > 0) {
      recommendations.push({
        priority: 'HIGH',
        category: 'javascript-redirect',
        issue: `${highSeverity.length} unconditional JavaScript redirect(s) found`,
        recommendation: 'Review and replace with server-side redirects if they run on page load',
        affected_files: [...new Set(highSeverity.map(r => r.file))],
        details: highSeverity.map(r => ({
          file: r.file,
          line: r.line,
          target: r.target
        }))
      });
    }
  }

  // Sitemap recommendations
  if (analysis.sitemap_urls.length > 0) {
    const nonHttps = analysis.sitemap_urls.filter(u => u.protocol !== 'https');
    if (nonHttps.length > 0) {
      recommendations.push({
        priority: 'MEDIUM',
        category: 'sitemap',
        issue: `${nonHttps.length} non-HTTPS URLs in sitemap`,
        recommendation: 'Update sitemap URLs to use HTTPS',
        file: 'sitemap.xml',
        affected_urls: nonHttps.map(u => u.url)
      });
    }
  }

  // General SEO recommendations
  recommendations.push({
    priority: 'LOW',
    category: 'seo-best-practice',
    issue: 'Ongoing monitoring',
    recommendation: 'Regularly check Google Search Console for "Page with redirect" warnings',
    test_command: 'Visit: https://search.google.com/search-console → Coverage → Excluded'
  });

  return recommendations;
}

/**
 * Generate comprehensive report
 */
function generateReport(analysis) {
  let report = '═'.repeat(100) + '\n';
  report += '  REDIRECT CONFIGURATION AUDIT - onsi.shop (Local Analysis)\n';
  report += '═'.repeat(100) + '\n\n';

  report += `Analysis Date: ${analysis.timestamp}\n`;
  report += `Domain: ${analysis.domain}\n\n`;

  // Vercel Config
  report += '─'.repeat(100) + '\n';
  report += 'VERCEL CONFIGURATION (vercel.json)\n';
  report += '─'.repeat(100) + '\n';
  if (analysis.analysis.vercel_config) {
    const vc = analysis.analysis.vercel_config;
    report += `Route Rules: ${vc.route_rules?.length || 0}\n`;
    report += `Explicit Redirects: ${vc.redirect_rules?.length || 0}\n`;
    report += `Potential Issues: ${vc.potential_issues?.length || 0}\n\n`;

    if (vc.potential_issues && vc.potential_issues.length > 0) {
      report += 'Issues Found:\n';
      vc.potential_issues.forEach((issue, i) => {
        report += `  ${i + 1}. ${issue.issue}\n`;
        if (issue.destination) report += `     Destination: ${issue.destination}\n`;
        if (issue.impact) report += `     Impact: ${issue.impact}\n`;
      });
      report += '\n';
    }
  } else {
    report += 'No vercel.json configuration found\n\n';
  }

  // HTML Redirects
  report += '─'.repeat(100) + '\n';
  report += 'HTML META REFRESH REDIRECTS\n';
  report += '─'.repeat(100) + '\n';
  if (analysis.analysis.html_redirects.length > 0) {
    analysis.analysis.html_redirects.forEach((redirect, i) => {
      report += `  ${i + 1}. File: ${redirect.file}\n`;
      report += `     Type: ${redirect.type}\n`;
      report += `     Target: ${redirect.target}\n`;
      report += `     Severity: ${redirect.severity}\n`;
      report += `     Issue: ${redirect.issue}\n`;
      report += `     Fix: ${redirect.fix}\n\n`;
    });
  } else {
    report += '✅ No meta refresh redirects found\n\n';
  }

  // JavaScript Redirects
  report += '─'.repeat(100) + '\n';
  report += 'JAVASCRIPT REDIRECTS\n';
  report += '─'.repeat(100) + '\n';
  if (analysis.analysis.javascript_redirects.length > 0) {
    const highSeverity = analysis.analysis.javascript_redirects.filter(r => r.severity === 'HIGH');
    const lowSeverity = analysis.analysis.javascript_redirects.filter(r => r.severity === 'LOW');

    report += `Total: ${analysis.analysis.javascript_redirects.length}\n`;
    report += `High Severity (Unconditional): ${highSeverity.length}\n`;
    report += `Low Severity (Conditional/User-triggered): ${lowSeverity.length}\n\n`;

    if (highSeverity.length > 0) {
      report += 'HIGH SEVERITY (Action Required):\n';
      highSeverity.forEach((redirect, i) => {
        report += `  ${i + 1}. ${redirect.file}:${redirect.line}\n`;
        report += `     Target: ${redirect.target}\n`;
        report += `     Code: ${redirect.code}\n`;
        report += `     Issue: ${redirect.issue}\n`;
        report += `     Recommendation: ${redirect.recommendation}\n\n`;
      });
    }

    if (lowSeverity.length > 0) {
      report += 'LOW SEVERITY (Likely Acceptable):\n';
      lowSeverity.forEach((redirect, i) => {
        report += `  ${i + 1}. ${redirect.file}:${redirect.line} - ${redirect.target}\n`;
      });
      report += '\n';
    }
  } else {
    report += '✅ No JavaScript redirects found\n\n';
  }

  // Sitemap
  report += '─'.repeat(100) + '\n';
  report += 'SITEMAP ANALYSIS\n';
  report += '─'.repeat(100) + '\n';
  report += `Total URLs: ${analysis.analysis.sitemap_urls.length}\n`;
  if (analysis.analysis.sitemap_urls.length > 0) {
    const protocols = analysis.analysis.sitemap_urls.reduce((acc, u) => {
      acc[u.protocol] = (acc[u.protocol] || 0) + 1;
      return acc;
    }, {});
    report += `Protocols: ${JSON.stringify(protocols)}\n\n`;

    report += 'URLs:\n';
    analysis.analysis.sitemap_urls.forEach((url, i) => {
      const icon = url.protocol === 'https' ? '✅' : '⚠️';
      report += `  ${icon} ${url.url}\n`;
    });
    report += '\n';
  }

  // Recommendations
  report += '─'.repeat(100) + '\n';
  report += 'RECOMMENDATIONS\n';
  report += '─'.repeat(100) + '\n';
  if (analysis.analysis.recommendations.length > 0) {
    const byPriority = {
      HIGH: analysis.analysis.recommendations.filter(r => r.priority === 'HIGH'),
      MEDIUM: analysis.analysis.recommendations.filter(r => r.priority === 'MEDIUM'),
      LOW: analysis.analysis.recommendations.filter(r => r.priority === 'LOW')
    };

    ['HIGH', 'MEDIUM', 'LOW'].forEach(priority => {
      if (byPriority[priority].length > 0) {
        report += `\n${priority} PRIORITY (${byPriority[priority].length}):\n`;
        byPriority[priority].forEach((rec, i) => {
          report += `  ${i + 1}. [${rec.category.toUpperCase()}] ${rec.issue}\n`;
          report += `     Recommendation: ${rec.recommendation}\n`;
          if (rec.file) report += `     File: ${rec.file}\n`;
          if (rec.test_command) report += `     Test: ${rec.test_command}\n`;
          report += '\n';
        });
      }
    });
  } else {
    report += '✅ No issues found - configuration looks clean!\n\n';
  }

  report += '═'.repeat(100) + '\n';
  report += 'END OF REPORT\n';
  report += '═'.repeat(100) + '\n';

  return report;
}

/**
 * Main execution
 */
function runAudit() {
  console.log('🔍 Starting Redirect Configuration Audit for onsi.shop...');
  console.log('═'.repeat(80));

  RESULTS.analysis.vercel_config = analyzeVercelConfig();
  RESULTS.analysis.html_redirects = scanHTMLRedirects();
  RESULTS.analysis.javascript_redirects = scanJavaScriptRedirects();
  RESULTS.analysis.sitemap_urls = analyzeSitemap();
  RESULTS.analysis.recommendations = generateRecommendations(RESULTS.analysis);

  const report = generateReport(RESULTS);

  // Save results
  const timestamp = new Date().toISOString().replace(/:/g, '-').split('.')[0];
  const jsonFile = `redirect-audit-${timestamp}.json`;
  const txtFile = `redirect-audit-${timestamp}.txt`;

  fs.writeFileSync(jsonFile, JSON.stringify(RESULTS, null, 2));
  fs.writeFileSync(txtFile, report);

  console.log('\n' + report);
  console.log(`\n💾 Results saved:`);
  console.log(`   JSON: ${jsonFile}`);
  console.log(`   Report: ${txtFile}`);

  // Summary
  const issues = {
    high: RESULTS.analysis.recommendations.filter(r => r.priority === 'HIGH').length,
    medium: RESULTS.analysis.recommendations.filter(r => r.priority === 'MEDIUM').length,
    low: RESULTS.analysis.recommendations.filter(r => r.priority === 'LOW').length
  };

  console.log(`\n📊 Summary:`);
  console.log(`   High Priority Issues: ${issues.high}`);
  console.log(`   Medium Priority Issues: ${issues.medium}`);
  console.log(`   Low Priority Issues: ${issues.low}`);

  if (issues.high > 0) {
    console.log(`\n⚠️  ${issues.high} HIGH priority issue(s) require immediate attention!`);
  } else if (issues.medium > 0) {
    console.log(`\n✅ No critical issues, but ${issues.medium} medium-priority item(s) to review`);
  } else {
    console.log(`\n✅ Configuration looks clean!`);
  }

  return RESULTS;
}

// Execute
if (require.main === module) {
  runAudit();
}

module.exports = { runAudit };
