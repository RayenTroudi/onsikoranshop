# Appwrite Keepalive System - Setup & Testing Guide

## Quick Start

### 1. Deployment Environment Setup

Choose your hosting platform and set environment variables:

#### Vercel
1. Go to https://vercel.com/dashboard
2. Select your project → **Settings**
3. Go to **Environment Variables**
4. Add all required variables (see [APPWRITE_KEEPALIVE_ENV.md](./APPWRITE_KEEPALIVE_ENV.md))

#### Heroku
```bash
heroku config:set \
  APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1 \
  APPWRITE_PROJECT_ID=xxx \
  APPWRITE_DATABASE_ID=yyy \
  APPWRITE_API_KEY=zzz \
  REQUIRE_CRON_SECRET=false \
  NEXTAUTH_URL=https://myapp.herokuapp.com
```

#### Other Platforms
Follow your platform's documentation to set environment variables.

### 2. GitHub Actions Secrets/Variables Setup

1. Go to your GitHub repo
2. **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** or **New repository variable**

Add these secrets/variables:

```
Secret: KEEPALIVE_URL = https://your-app.vercel.app
Secret: CRON_SECRET = my-secret-token (only if REQUIRE_CRON_SECRET=true)
Variable: NEXTAUTH_URL = https://your-app.vercel.app (fallback)
```

## Testing

### Local Testing (Before Deployment)

#### Prerequisite: Set up local environment

Create `.env.local`:
```env
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=your_id
APPWRITE_DATABASE_ID=your_db_id
APPWRITE_API_KEY=your_key
REQUIRE_CRON_SECRET=false
```

#### Run acceptance tests

```bash
# Run all tests
node api/cron/appwrite-keepalive.test.js

# Expected output:
# ✅ Open mode allows request without Authorization header
# ✅ Protected mode returns 401 when auth header missing
# ✅ Protected mode returns 401 with invalid token
# ✅ Protected mode accepts valid token
# ✅ Invalid HTTP method returns 405
# ✅ Missing env vars returns 500
# ✅ Returns 401 when REQUIRE_CRON_SECRET=true but CRON_SECRET missing
```

### Curl Testing (Local Dev Server)

#### Setup: Start local dev server

```bash
npm run dev
# Server running on http://localhost:5173
```

#### Test 1: Open Mode (No Auth)

```bash
# Endpoint callable without Authorization header
curl -X GET http://localhost:5173/api/cron/appwrite-keepalive \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n"

# Expected response:
# HTTP 200 (if APPWRITE env vars correct)
# or HTTP 500 (if env vars missing)
# Success field will indicate success/failure
```

#### Test 2: Protected Mode (Invalid Token)

First, set `REQUIRE_CRON_SECRET=true` in `.env.local`:

```env
REQUIRE_CRON_SECRET=true
CRON_SECRET=my-secret-token
```

Then restart dev server and test:

```bash
# Missing Authorization header
curl -X GET http://localhost:5173/api/cron/appwrite-keepalive \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n"

# Expected: HTTP 401 Unauthorized
# Response: { "success": false, "error": "Authorization header required" }
```

#### Test 3: Protected Mode (Valid Token)

```bash
# With correct Authorization header
curl -X GET http://localhost:5173/api/cron/appwrite-keepalive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer my-secret-token" \
  -w "\nStatus: %{http_code}\n"

# Expected: HTTP 200 (if APPWRITE env vars correct)
# Response: { "success": true, "checkedAt": "...", ... }
```

#### Test 4: Protected Mode (Invalid Token)

```bash
# With wrong Authorization token
curl -X GET http://localhost:5173/api/cron/appwrite-keepalive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer wrong-token" \
  -w "\nStatus: %{http_code}\n"

# Expected: HTTP 401 Unauthorized
# Response: { "success": false, "error": "Invalid token" }
```

### Production Testing (After Deployment)

#### Test 1: Open Endpoint

```bash
# Replace with your production URL
PROD_URL="https://your-app.vercel.app/api/cron/appwrite-keepalive"

curl -X GET "$PROD_URL" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" | jq .
```

#### Test 2: Protected Endpoint

```bash
PROD_URL="https://your-app.vercel.app/api/cron/appwrite-keepalive"
TOKEN="your-cron-secret-token"

curl -X GET "$PROD_URL" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -w "\nStatus: %{http_code}\n" | jq .
```

#### Test 3: Without Required Token (Should Fail)

```bash
PROD_URL="https://your-app.vercel.app/api/cron/appwrite-keepalive"

curl -X GET "$PROD_URL" \
  -H "Content-Type: application/json" \
  -w "\nStatus: %{http_code}\n" | jq .

# If REQUIRE_CRON_SECRET=true: HTTP 401
# If REQUIRE_CRON_SECRET=false: HTTP 200
```

## GitHub Actions Testing

### Manual Workflow Trigger

Test the workflow without waiting for 6-hour schedule:

1. Go to GitHub repo
2. **Actions** tab
3. Select **Appwrite Keepalive** workflow
4. Click **Run workflow**
5. Optionally enter custom `keepalive_url`
6. Click **Run workflow**

### View Workflow Logs

1. Go to **Actions** tab
2. Click latest **Appwrite Keepalive** run
3. Click **keepalive** job
4. Expand steps to see detailed logs:
   - **Resolve Keepalive URL** - shows URL resolution
   - **Prepare Authorization Header** - shows auth status
   - **Call Keepalive Endpoint** - shows HTTP response
   - **Summary Report** - shows final status

### Expected Logs

**Successful run (HTTP 200):**
```
═══════════════════════════════════════════════════════════
📡 APPWRITE KEEPALIVE CHECK
═══════════════════════════════════════════════════════════
🔗 Endpoint: https://your-app.vercel.app/api/cron/appwrite-keepalive
🔓 Authentication: Disabled

📊 HTTP Status: 200

📋 Response Body:
{
  "success": true,
  "checkedAt": "2024-01-15T10:30:45.123Z",
  "health": {
    "status": 200,
    "error": null
  },
  "database": {
    "id": "xxx",
    "name": "mydb",
    "status": 200,
    "error": null
  },
  "message": "Appwrite keepalive check completed successfully"
}

✅ SUCCESS: Keepalive check completed (HTTP 200)
```

**Failed run (HTTP 401):**
```
═══════════════════════════════════════════════════════════
📡 APPWRITE KEEPALIVE CHECK
═══════════════════════════════════════════════════════════
🔗 Endpoint: https://your-app.vercel.app/api/cron/appwrite-keepalive
🔐 Authentication: Enabled (CRON_SECRET present)

📊 HTTP Status: 401

📋 Response Body:
{
  "success": false,
  "error": "Invalid token"
}

❌ FAILED: Keepalive endpoint returned HTTP 401
```

## Curl Command Reference

### Copy-Paste Curl Commands

#### Open Mode (No Auth)
```bash
curl -X GET https://your-app.vercel.app/api/cron/appwrite-keepalive \
  -H "Content-Type: application/json"
```

#### Protected Mode (With Auth)
```bash
curl -X GET https://your-app.vercel.app/api/cron/appwrite-keepalive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-cron-secret"
```

#### Pretty-Print Response (requires jq)
```bash
# Install jq first: brew install jq (macOS) or apt-get install jq (Linux)

curl -s https://your-app.vercel.app/api/cron/appwrite-keepalive | jq .
```

#### Save Response to File
```bash
curl -s https://your-app.vercel.app/api/cron/appwrite-keepalive > response.json
cat response.json
```

#### Check Only HTTP Status
```bash
curl -o /dev/null -s -w "%{http_code}\n" https://your-app.vercel.app/api/cron/appwrite-keepalive
```

## Response Examples

### Successful Response (HTTP 200)

```json
{
  "success": true,
  "checkedAt": "2024-01-15T10:30:45.123Z",
  "health": {
    "status": 200,
    "error": null
  },
  "database": {
    "id": "650a1234567890",
    "name": "mydb",
    "status": 200,
    "error": null
  },
  "message": "Appwrite keepalive check completed successfully"
}
```

### Partial Failure (HTTP 500)

```json
{
  "success": false,
  "checkedAt": "2024-01-15T10:30:45.123Z",
  "health": {
    "status": null,
    "error": {
      "type": "network_error",
      "message": "fetch failed"
    }
  },
  "database": {
    "id": "650a1234567890",
    "name": null,
    "status": null,
    "error": null
  },
  "message": "Appwrite keepalive check failed - one or more checks returned errors [health failed]"
}
```

### Authentication Error (HTTP 401)

```json
{
  "success": false,
  "error": "Authorization header required"
}
```

### Environment Var Missing (HTTP 500)

```json
{
  "success": false,
  "error": "Missing required environment variables: APPWRITE_API_KEY, APPWRITE_DATABASE_ID"
}
```

## Troubleshooting

### Endpoint returns HTTP 500 - "Missing required environment variables"

**Solution:**
1. Verify all APPWRITE_* variables are set in deployment platform
2. Check variable names exactly (case-sensitive)
3. Restart your deployment

### Endpoint returns HTTP 401 when it shouldn't

**Solution:**
1. Check if `REQUIRE_CRON_SECRET=true`
2. If yes, ensure you're sending `Authorization: Bearer <token>`
3. Verify token matches `CRON_SECRET` value

### GitHub Actions workflow fails

**Solution:**
1. Check workflow logs for error message
2. Verify `KEEPALIVE_URL` or `NEXTAUTH_URL` is set in GitHub
3. Verify URL is publicly accessible (no localhost)
4. Try manual trigger from Actions tab to see real-time logs

### curl: (7) Failed to connect

**Solution:**
1. Verify deployment is live (`curl https://your-app.vercel.app`)
2. Check URL spelling
3. Wait a few minutes if deployment just completed

## Next Steps

- See [APPWRITE_KEEPALIVE_ENV.md](./APPWRITE_KEEPALIVE_ENV.md) for detailed environment configuration
- See [.github/workflows/appwrite-keepalive.yml](./.github/workflows/appwrite-keepalive.yml) for workflow details
- Monitor GitHub Actions runs for scheduled keepalive pings
