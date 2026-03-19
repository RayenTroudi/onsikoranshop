# Appwrite Keepalive System - Deployment Checklist & Copy-Paste Guide

## ✅ Implementation Complete

This project now includes a production-safe Appwrite keepalive system. The following files have been created:

### New Files

| File | Purpose |
|------|---------|
| `api/cron/appwrite-keepalive.js` | Main keepalive endpoint (Vercel Serverless Function) |
| `api/cron/appwrite-keepalive.test.js` | Acceptance tests (run: `node api/cron/appwrite-keepalive.test.js`) |
| `.github/workflows/appwrite-keepalive.yml` | GitHub Actions scheduled workflow (every 6 hours) |
| `APPWRITE_KEEPALIVE_ENV.md` | Environment variable reference |
| `APPWRITE_KEEPALIVE_SETUP.md` | Setup & testing guide with curl examples |
| `APPWRITE_KEEPALIVE_DEPLOYMENT.md` | This file - deployment checklist |

## 🚀 Step-by-Step Deployment

### Step 1: Deploy to Production (Vercel)

1. **Push code to GitHub:**
   ```bash
   git add api/cron/appwrite-keepalive.js
   git add .github/workflows/appwrite-keepalive.yml
   git commit -m "feat: add appwrite keepalive system"
   git push
   ```

2. **Vercel will auto-deploy** from GitHub

### Step 2: Set Production Environment Variables

**Option A: Vercel Dashboard (Recommended)**

1. Go to https://vercel.com/dashboard
2. Select your project → **Settings** → **Environment Variables**
3. Copy-paste all required variables (see section below)
4. Click **Save**
5. **Redeploy** your project (Settings → Deployments → Redeploy → Latest)

**Option B: Vercel CLI**

```bash
# Install Vercel CLI if needed
npm i -g vercel

# Set environment variables
vercel env add APPWRITE_ENDPOINT
vercel env add APPWRITE_PROJECT_ID
vercel env add APPWRITE_DATABASE_ID
vercel env add APPWRITE_API_KEY
vercel env add REQUIRE_CRON_SECRET
vercel env add NEXTAUTH_URL

# Redeploy
vercel --prod
```

### Step 3: Set GitHub Actions Secrets/Variables

1. Go to your GitHub repo
2. **Settings** → **Secrets and variables** → **Actions**

#### Create Secrets (for sensitive data)
Click **New repository secret** for each:

| Name | Value | Example |
|------|-------|---------|
| `KEEPALIVE_URL` | Your Vercel deployment URL | `https://onsi-koran-shop.vercel.app` |
| `CRON_SECRET` | (Only if REQUIRE_CRON_SECRET=true) | `super-secret-token-12345` |

#### Create Variables (for non-sensitive data)
Click **New repository variable** for each:

| Name | Value | Example |
|------|-------|---------|
| `NEXTAUTH_URL` | Your deployment base URL (fallback) | `https://onsi-koran-shop.vercel.app` |

### Step 4: Test Everything

```bash
# 1. Run local acceptance tests
node api/cron/appwrite-keepalive.test.js

# 2. Test production endpoint
curl -X GET https://your-app.vercel.app/api/cron/appwrite-keepalive \
  -H "Content-Type: application/json" | jq .

# 3. Trigger GitHub Actions manually
# Go to: GitHub repo → Actions → Appwrite Keepalive → Run workflow
```

## 📋 Deployment Environment Variables

### For Open Mode (No Auth Required)

**Set these in your hosting platform (Vercel):**

```
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=paste_your_project_id_here
APPWRITE_DATABASE_ID=paste_your_database_id_here
APPWRITE_API_KEY=paste_your_server_api_key_here
REQUIRE_CRON_SECRET=false
NEXTAUTH_URL=https://your-vercel-deployment.vercel.app
```

**Get values from:**
- `APPWRITE_ENDPOINT`: Appwrite Console → Settings → API Endpoint
- `APPWRITE_PROJECT_ID`: Appwrite Console → Settings → Project ID
- `APPWRITE_DATABASE_ID`: Appwrite Console → Databases → Your DB → ID
- `APPWRITE_API_KEY`: Appwrite Console → Settings → API Keys → Create "Server" key
- `NEXTAUTH_URL`: Your Vercel project URL

### For Protected Mode (Auth Required)

**Set these in your hosting platform (Vercel):**

```
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=paste_your_project_id_here
APPWRITE_DATABASE_ID=paste_your_database_id_here
APPWRITE_API_KEY=paste_your_server_api_key_here
REQUIRE_CRON_SECRET=true
CRON_SECRET=your-secret-token-here
NEXTAUTH_URL=https://your-vercel-deployment.vercel.app
```

⚠️ If using protected mode, ensure `CRON_SECRET` in Vercel matches `CRON_SECRET` in GitHub.

## 🔐 GitHub Actions Secrets/Variables

### For Open Mode (No Auth)

**GitHub Secrets:** (Settings → Secrets and variables → Actions → New repository secret)
```
KEEPALIVE_URL = https://your-vercel-deployment.vercel.app
```

**GitHub Variables:** (Settings → Secrets and variables → Actions → New repository variable)
```
NEXTAUTH_URL = https://your-vercel-deployment.vercel.app
```

### For Protected Mode (Auth Required)

**GitHub Secrets:**
```
KEEPALIVE_URL = https://your-vercel-deployment.vercel.app
CRON_SECRET = your-secret-token-here
```

**GitHub Variables:**
```
NEXTAUTH_URL = https://your-vercel-deployment.vercel.app
```

⚠️ `CRON_SECRET` must be identical in both Vercel and GitHub.

## 📊 Curl Command Reference

### Test Open Endpoint (No Auth)
```bash
curl -X GET https://your-vercel-deployment.vercel.app/api/cron/appwrite-keepalive \
  -H "Content-Type: application/json" | jq .
```

### Test Protected Endpoint (With Auth)
```bash
curl -X GET https://your-vercel-deployment.vercel.app/api/cron/appwrite-keepalive \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-secret-token-here" | jq .
```

### Check HTTP Status Only
```bash
curl -o /dev/null -s -w "%{http_code}\n" \
  https://your-vercel-deployment.vercel.app/api/cron/appwrite-keepalive
```

### Save Full Response
```bash
curl -X GET https://your-vercel-deployment.vercel.app/api/cron/appwrite-keepalive > response.json
cat response.json
```

## ✨ Expected Success Response

```json
{
  "success": true,
  "checkedAt": "2024-01-15T10:30:45.123Z",
  "message": "Appwrite keepalive check completed successfully",
  "health": {
    "status": 200,
    "error": null
  },
  "database": {
    "id": "650a1234567890",
    "name": "your-database-name",
    "status": 200,
    "error": null
  }
}
```

## ⚠️ Common Errors & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| HTTP 500 + "Missing required environment variables" | Env var not set in deployment | Set all APPWRITE_* vars in hosting platform |
| HTTP 401 "Authorization header required" | Missing `Authorization` header | Set `CRON_SECRET` in GitHub if REQUIRE_CRON_SECRET=true |
| HTTP 401 "Invalid token" | Token doesn't match | Verify CRON_SECRET is identical in Vercel & GitHub |
| GitHub Actions: "Could not resolve keepalive URL" | URL not set in GitHub | Set KEEPALIVE_URL or NEXTAUTH_URL in GitHub Secrets/Variables |
| Endpoint unreachable from GitHub | Using localhost URL | Use public Vercel URL, not localhost |
| HTTP 500 + "ECONNREFUSED" or similar | Appwrite endpoint unreachable | Verify APPWRITE_ENDPOINT is correct (include `/v1`) |

## 🕐 Schedule

The workflow runs automatically on this schedule:
- **Every 6 hours** at: 00:00, 06:00, 12:00, 18:00 UTC
- **Manual runs** available any time via GitHub Actions → Run workflow

## 🔍 Monitoring

### View Scheduled Runs
1. Go to GitHub repo → **Actions** tab
2. Select **Appwrite Keepalive** workflow
3. See all past runs with success/failure status

### View Detailed Logs
1. Click a run
2. Click **keepalive** job
3. Expand each step to see logs

### Key Log Indicators

**Success:**
```
✅ SUCCESS: Keepalive check completed (HTTP 200)
```

**Failure:**
```
❌ FAILED: Keepalive endpoint returned HTTP 500
```

## 📚 Documentation Files

| File | Content |
|------|---------|
| `APPWRITE_KEEPALIVE_ENV.md` | All environment variables explained |
| `APPWRITE_KEEPALIVE_SETUP.md` | Setup instructions & testing with curl |
| `APPWRITE_KEEPALIVE_DEPLOYMENT.md` | This file - deployment checklist |

## ✅ Pre-Launch Checklist

- [ ] All APPWRITE_* environment variables set in hosting platform
- [ ] NEXTAUTH_URL (or KEEPALIVE_URL) set in hosting platform
- [ ] KEEPALIVE_URL or NEXTAUTH_URL set in GitHub Variables
- [ ] If REQUIRE_CRON_SECRET=true: CRON_SECRET set in both Vercel and GitHub Secrets
- [ ] Local tests pass: `node api/cron/appwrite-keepalive.test.js`
- [ ] Production endpoint responds: `curl https://your-url/api/cron/appwrite-keepalive`
- [ ] GitHub Actions workflow visible and ready
- [ ] No localhost URLs in GitHub configuration
- [ ] Appwrite API Key is server-key (not public)
- [ ] No secrets committed to version control

## ✅ Post-Deployment Checklist

- [ ] First scheduled run completed (check GitHub Actions)
- [ ] Log shows successful health check
- [ ] Response contains both health and database status
- [ ] Workflow runs every 6 hours as scheduled
- [ ] Manual trigger works from GitHub Actions UI
- [ ] Team knows where to find logs and documentation

## 🆘 Need Help?

1. **Check logs first**: GitHub Actions → Appwrite Keepalive → Latest run
2. **Read documentation**: See files listed above
3. **Run tests**: `node api/cron/appwrite-keepalive.test.js`
4. **Test curl**: Copy curl commands from APPWRITE_KEEPALIVE_SETUP.md
5. **Verify config**: All env vars correct? (check Vercel & GitHub)

---

**Deployment Date:** _____________________  
**Deployed By:** _____________________  
**Production URL:** _____________________  
**Notes:** _____________________
