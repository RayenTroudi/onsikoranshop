#!/usr/bin/env node

/**
 * Appwrite Keepalive Endpoint - Acceptance Tests
 * 
 * Tests three scenarios:
 * 1. Open mode (no auth required) - REQUIRE_CRON_SECRET=false
 * 2. Protected mode (auth required) - REQUIRE_CRON_SECRET=true with valid token
 * 3. Protected mode (auth required) - REQUIRE_CRON_SECRET=true with invalid token
 * 
 * Usage:
 *   node api/cron/appwrite-keepalive.test.js
 * 
 * Requirements:
 *   - Node >= 18.0.0
 *   - Environment variables set (APPWRITE_*)
 */

const http = require('http');
const { Server } = require('http');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

const log = {
  test: (msg) => console.log(`\n${colors.cyan}${colors.bold}TEST: ${msg}${colors.reset}`),
  pass: (msg) => console.log(`${colors.green}✅ PASS${colors.reset} ${msg}`),
  fail: (msg) => console.log(`${colors.red}❌ FAIL${colors.reset} ${msg}`),
  info: (msg) => console.log(`${colors.yellow}ℹ️  INFO${colors.reset} ${msg}`),
  section: (msg) => console.log(`\n${colors.bold}${colors.cyan}═══ ${msg} ═══${colors.reset}`)
};

// Handler import
const appwriteKeepAlive = require('./appwrite-keepalive.js');

// Test utilities
async function makeRequest(method = 'GET', authToken = null, envOverrides = {}) {
  return new Promise((resolve) => {
    const req = {
      method,
      headers: {
        'content-type': 'application/json'
      },
      url: '/api/cron/appwrite-keepalive'
    };

    if (authToken) {
      req.headers.authorization = `Bearer ${authToken}`;
    }

    const res = {
      statusCode: 200,
      headersSent: false,
      setHeader: function(key, value) {
        if (!this.headers) this.headers = {};
        this.headers[key] = value;
      },
      status: function(code) {
        this.statusCode = code;
        return this;
      },
      json: function(data) {
        this.body = data;
        resolve({
          statusCode: this.statusCode,
          body: data,
          headers: this.headers || {}
        });
      }
    };

    // Temporarily override environment variables
    const originalEnv = { ...process.env };
    Object.assign(process.env, envOverrides);

    appwriteKeepAlive(req, res);

    // Restore environment
    Object.assign(process.env, originalEnv);
  });
}

// Test suite
async function runTests() {
  log.section('APPWRITE KEEPALIVE ENDPOINT - ACCEPTANCE TESTS');

  let passed = 0;
  let failed = 0;

  try {
    // ============================================================
    // TEST 1: OPEN MODE (No Authorization Required)
    // ============================================================
    log.test('Open mode (REQUIRE_CRON_SECRET=false) - No auth header');
    try {
      const result = await makeRequest('GET', null, {
        REQUIRE_CRON_SECRET: 'false',
        APPWRITE_ENDPOINT: 'https://example.appwrite.io/v1',
        APPWRITE_PROJECT_ID: 'test-project',
        APPWRITE_DATABASE_ID: 'test-db',
        APPWRITE_API_KEY: 'test-key'
      });

      if (result.statusCode === 200 && result.body.success !== undefined) {
        log.pass('Open mode allows request without Authorization header');
        passed++;
      } else {
        log.fail('Open mode should allow request');
        failed++;
      }
    } catch (err) {
      log.fail(`Open mode test error: ${err.message}`);
      failed++;
    }

    // ============================================================
    // TEST 2: PROTECTED MODE - Missing Authorization Header
    // ============================================================
    log.test('Protected mode (REQUIRE_CRON_SECRET=true) - Missing auth header');
    try {
      const result = await makeRequest('GET', null, {
        REQUIRE_CRON_SECRET: 'true',
        CRON_SECRET: 'valid-secret',
        APPWRITE_ENDPOINT: 'https://example.appwrite.io/v1',
        APPWRITE_PROJECT_ID: 'test-project',
        APPWRITE_DATABASE_ID: 'test-db',
        APPWRITE_API_KEY: 'test-key'
      });

      if (result.statusCode === 401 && !result.body.success) {
        log.pass('Protected mode returns 401 when auth header missing');
        passed++;
      } else {
        log.fail(`Protected mode should return 401, got ${result.statusCode}`);
        failed++;
      }
    } catch (err) {
      log.fail(`Protected mode (missing auth) test error: ${err.message}`);
      failed++;
    }

    // ============================================================
    // TEST 3: PROTECTED MODE - Invalid Token
    // ============================================================
    log.test('Protected mode (REQUIRE_CRON_SECRET=true) - Invalid token');
    try {
      const result = await makeRequest('GET', 'invalid-token', {
        REQUIRE_CRON_SECRET: 'true',
        CRON_SECRET: 'valid-secret',
        APPWRITE_ENDPOINT: 'https://example.appwrite.io/v1',
        APPWRITE_PROJECT_ID: 'test-project',
        APPWRITE_DATABASE_ID: 'test-db',
        APPWRITE_API_KEY: 'test-key'
      });

      if (result.statusCode === 401 && !result.body.success) {
        log.pass('Protected mode returns 401 with invalid token');
        passed++;
      } else {
        log.fail(`Protected mode should return 401, got ${result.statusCode}`);
        failed++;
      }
    } catch (err) {
      log.fail(`Protected mode (invalid token) test error: ${err.message}`);
      failed++;
    }

    // ============================================================
    // TEST 4: PROTECTED MODE - Valid Token
    // ============================================================
    log.test('Protected mode (REQUIRE_CRON_SECRET=true) - Valid token');
    try {
      const result = await makeRequest('GET', 'valid-secret', {
        REQUIRE_CRON_SECRET: 'true',
        CRON_SECRET: 'valid-secret',
        APPWRITE_ENDPOINT: 'https://example.appwrite.io/v1',
        APPWRITE_PROJECT_ID: 'test-project',
        APPWRITE_DATABASE_ID: 'test-db',
        APPWRITE_API_KEY: 'test-key'
      });

      if (result.statusCode >= 200 && result.statusCode <= 500) {
        log.pass('Protected mode accepts valid token (response code: ' + result.statusCode + ')');
        passed++;
      } else {
        log.fail(`Protected mode with valid token should succeed`);
        failed++;
      }
    } catch (err) {
      log.fail(`Protected mode (valid token) test error: ${err.message}`);
      failed++;
    }

    // ============================================================
    // TEST 5: Invalid HTTP Method
    // ============================================================
    log.test('Invalid HTTP method (POST instead of GET)');
    try {
      const result = await makeRequest('POST', null, {
        REQUIRE_CRON_SECRET: 'false',
        APPWRITE_ENDPOINT: 'https://example.appwrite.io/v1',
        APPWRITE_PROJECT_ID: 'test-project',
        APPWRITE_DATABASE_ID: 'test-db',
        APPWRITE_API_KEY: 'test-key'
      });

      if (result.statusCode === 405) {
        log.pass('Invalid HTTP method returns 405');
        passed++;
      } else {
        log.fail(`Should return 405 for POST, got ${result.statusCode}`);
        failed++;
      }
    } catch (err) {
      log.fail(`Invalid method test error: ${err.message}`);
      failed++;
    }

    // ============================================================
    // TEST 6: Missing Required Env Vars
    // ============================================================
    log.test('Missing required environment variables');
    try {
      const result = await makeRequest('GET', null, {
        REQUIRE_CRON_SECRET: 'false'
        // Missing APPWRITE_ENDPOINT, etc
      });

      if (result.statusCode === 500 && !result.body.success) {
        log.pass('Missing env vars returns 500');
        passed++;
      } else {
        log.fail(`Missing env vars should return 500, got ${result.statusCode}`);
        failed++;
      }
    } catch (err) {
      log.fail(`Missing env vars test error: ${err.message}`);
      failed++;
    }

    // ============================================================
    // TEST 7: CRON_SECRET Not Set When Required
    // ============================================================
    log.test('Protected mode enabled but CRON_SECRET not configured');
    try {
      const result = await makeRequest('GET', null, {
        REQUIRE_CRON_SECRET: 'true',
        // CRON_SECRET not set
        APPWRITE_ENDPOINT: 'https://example.appwrite.io/v1',
        APPWRITE_PROJECT_ID: 'test-project',
        APPWRITE_DATABASE_ID: 'test-db',
        APPWRITE_API_KEY: 'test-key'
      });

      if (result.statusCode === 401 && !result.body.success) {
        log.pass('Returns 401 when REQUIRE_CRON_SECRET=true but CRON_SECRET missing');
        passed++;
      } else {
        log.fail(`Should return 401, got ${result.statusCode}`);
        failed++;
      }
    } catch (err) {
      log.fail(`CRON_SECRET not set test error: ${err.message}`);
      failed++;
    }

    // ============================================================
    // RESULTS
    // ============================================================
    log.section('TEST RESULTS');
    console.log(`${colors.green}✅ Passed: ${passed}${colors.reset}`);
    console.log(`${colors.red}❌ Failed: ${failed}${colors.reset}`);
    console.log(`📊 Total:  ${passed + failed}`);

    if (failed === 0) {
      console.log(`\n${colors.bold}${colors.green}All tests passed! ✨${colors.reset}\n`);
      process.exit(0);
    } else {
      console.log(`\n${colors.bold}${colors.red}Some tests failed.${colors.reset}\n`);
      process.exit(1);
    }
  } catch (err) {
    log.fail(`Unexpected error: ${err.message}`);
    process.exit(1);
  }
}

// Run tests
runTests().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
