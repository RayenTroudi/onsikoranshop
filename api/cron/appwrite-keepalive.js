/**
 * Appwrite Keepalive API Endpoint
 * 
 * Purpose: Prevent Appwrite free-tier inactivity by performing periodic health checks
 * Deployment: Vercel Serverless Function (Node.js Runtime)
 * 
 * Performs two lightweight Appwrite checks:
 * - GET /health (health status)
 * - GET /databases/{id} (database connectivity)
 * 
 * Authentication:
 * - If REQUIRE_CRON_SECRET=true: Requires Authorization: Bearer CRON_SECRET
 * - If REQUIRE_CRON_SECRET!=true: Always allow (no auth required)
 */

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');

  // Validate HTTP method
  if (req.method !== 'GET') {
    return res.status(405).json({
      success: false,
      error: `Method ${req.method} not allowed. Use GET.`
    });
  }

  // ============================================================
  // AUTHORIZATION VALIDATION
  // ============================================================
  const requireCronSecret = process.env.REQUIRE_CRON_SECRET === 'true';
  
  if (requireCronSecret) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    const cronSecret = process.env.CRON_SECRET;

    // If REQUIRE_CRON_SECRET=true but CRON_SECRET not configured
    if (!cronSecret) {
      console.error('[appwrite-keepalive] REQUIRE_CRON_SECRET=true but CRON_SECRET not set');
      return res.status(401).json({
        success: false,
        error: 'CRON_SECRET not configured. Required when REQUIRE_CRON_SECRET=true'
      });
    }

    // Check Authorization header
    if (!authHeader) {
      console.warn('[appwrite-keepalive] Authorization header missing in protected mode');
      return res.status(401).json({
        success: false,
        error: 'Authorization header required'
      });
    }

    // Validate Bearer token format and value
    const [scheme, token] = authHeader.split(' ');
    if (scheme !== 'Bearer' || !token) {
      console.warn('[appwrite-keepalive] Invalid Authorization header format');
      return res.status(401).json({
        success: false,
        error: 'Invalid Authorization header. Use: Bearer <token>'
      });
    }

    if (token !== cronSecret) {
      console.warn('[appwrite-keepalive] Authorization token mismatch');
      return res.status(401).json({
        success: false,
        error: 'Invalid token'
      });
    }

    console.log('[appwrite-keepalive] Authorization validated successfully');
  } else {
    console.log('[appwrite-keepalive] Protection disabled - no auth required (REQUIRE_CRON_SECRET != true)');
  }

  // ============================================================
  // ENVIRONMENT VALIDATION
  // ============================================================
  const requiredEnvVars = {
    APPWRITE_ENDPOINT: process.env.APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID: process.env.APPWRITE_PROJECT_ID,
    APPWRITE_DATABASE_ID: process.env.APPWRITE_DATABASE_ID,
    APPWRITE_API_KEY: process.env.APPWRITE_API_KEY
  };

  const missingVars = Object.entries(requiredEnvVars)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error('[appwrite-keepalive] Missing required environment variables:', missingVars);
    return res.status(500).json({
      success: false,
      error: `Missing required environment variables: ${missingVars.join(', ')}`
    });
  }

  const {
    APPWRITE_ENDPOINT,
    APPWRITE_PROJECT_ID,
    APPWRITE_DATABASE_ID,
    APPWRITE_API_KEY
  } = requiredEnvVars;

  const checkedAt = new Date().toISOString();

  // ============================================================
  // APPWRITE HEADERS
  // ============================================================
  const appwriteHeaders = {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': APPWRITE_PROJECT_ID,
    'X-Appwrite-Key': APPWRITE_API_KEY
  };

  console.log('[appwrite-keepalive] Starting health check', {
    endpoint: APPWRITE_ENDPOINT,
    checkedAt,
    protected: requireCronSecret
  });

  // ============================================================
  // CHECK 1: HEALTH ENDPOINT
  // ============================================================
  let healthStatus = null;
  let healthError = null;

  try {
    console.log(`[appwrite-keepalive] Calling ${APPWRITE_ENDPOINT}/health`);
    const healthRes = await fetch(`${APPWRITE_ENDPOINT}/health`, {
      method: 'GET',
      headers: appwriteHeaders
    });

    const healthData = await healthRes.json().catch(() => ({}));

    if (!healthRes.ok) {
      healthError = {
        status: healthRes.status,
        statusText: healthRes.statusText,
        body: healthData
      };
      console.error('[appwrite-keepalive] Health check failed:', healthError);
    } else {
      healthStatus = {
        status: healthRes.status,
        body: healthData
      };
      console.log('[appwrite-keepalive] Health check passed:', healthStatus);
    }
  } catch (err) {
    healthError = {
      type: 'network_error',
      message: err.message
    };
    console.error('[appwrite-keepalive] Health check network error:', err.message);
  }

  // ============================================================
  // CHECK 2: DATABASE ENDPOINT
  // ============================================================
  let databaseStatus = null;
  let databaseName = null;
  let databaseError = null;

  try {
    console.log(`[appwrite-keepalive] Calling ${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}`);
    const dbRes = await fetch(`${APPWRITE_ENDPOINT}/databases/${APPWRITE_DATABASE_ID}`, {
      method: 'GET',
      headers: appwriteHeaders
    });

    const dbData = await dbRes.json().catch(() => ({}));

    if (!dbRes.ok) {
      databaseError = {
        status: dbRes.status,
        statusText: dbRes.statusText,
        body: dbData
      };
      console.error('[appwrite-keepalive] Database check failed:', databaseError);
    } else {
      databaseStatus = {
        status: dbRes.status,
        body: dbData
      };
      databaseName = dbData.name || null;
      console.log('[appwrite-keepalive] Database check passed:', { id: APPWRITE_DATABASE_ID, name: databaseName });
    }
  } catch (err) {
    databaseError = {
      type: 'network_error',
      message: err.message
    };
    console.error('[appwrite-keepalive] Database check network error:', err.message);
  }

  // ============================================================
  // RESPONSE BUILDING
  // ============================================================
  const bothHealthy = !healthError && !databaseError;
  const statusCode = bothHealthy ? 200 : 500;

  const response = {
    success: bothHealthy,
    checkedAt,
    health: {
      status: healthStatus?.status || null,
      error: healthError || null
    },
    database: {
      id: APPWRITE_DATABASE_ID,
      name: databaseName,
      status: databaseStatus?.status || null,
      error: databaseError || null
    }
  };

  if (bothHealthy) {
    response.message = 'Appwrite keepalive check completed successfully';
  } else {
    response.message = 'Appwrite keepalive check failed - one or more checks returned errors';
    if (healthError) response.message += ' [health failed]';
    if (databaseError) response.message += ' [database failed]';
  }

  console.log('[appwrite-keepalive] Response status:', statusCode, {
    success: bothHealthy,
    checkedAt
  });

  return res.status(statusCode).json(response);
};
