# Appwrite Keepalive System - Environment Configuration

## Overview

The Appwrite Keepalive system prevents free-tier database inactivity by performing periodic health checks. This document covers all environment variables needed for the keepalive endpoint and GitHub Actions workflow.

## Environment Variables

### Appwrite Configuration (Required)

These variables are **required** for the keepalive endpoint to function:

```env
# Appwrite API Endpoint
# Example: https://fra.cloud.appwrite.io/v1
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1

# Appwrite Project ID
# Get from: Appwrite Console → Settings → Project ID
APPWRITE_PROJECT_ID=your_project_id_here

# Appwrite Database ID
# Get from: Appwrite Console → Databases → Your Database → ID
APPWRITE_DATABASE_ID=your_database_id_here

# Appwrite API Key (Server Key)
# Get from: Appwrite Console → Settings → API Keys → Create new (Server role)
# ⚠️  MUST be server-only. Never expose to client code.
APPWRITE_API_KEY=your_api_key_here
```

### Keepalive Authorization (Optional)

Control whether the keepalive endpoint requires authentication:

```env
# Set to "true" to require Authorization header on keepalive endpoint
# Default: false (endpoint is publicly callable)
REQUIRE_CRON_SECRET=false

# Bearer token for protecting the keepalive endpoint
# Only required if REQUIRE_CRON_SECRET=true
# Example: CRON_SECRET=my-super-secret-token-here
CRON_SECRET=your_cron_secret_here
```

### Keepalive URL Configuration (Optional - for GitHub Actions)

Configure the URL that GitHub Actions will call:

```env
# Primary keepalive URL for GitHub Actions
# If set, this takes priority over NEXTAUTH_URL
KEEPALIVE_URL=https://your-deployment.vercel.app

# Fallback URL if KEEPALIVE_URL is not set
# Used by GitHub Actions workflow as a fallback
NEXTAUTH_URL=https://your-deployment.vercel.app
```

## Environment Variable Location

### 1. **Deployment Environment (Vercel/Heroku/etc)**

Set these variables in your hosting platform's environment configuration:

**Vercel Example (required for production):**
1. Go to https://vercel.com/dashboard
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - `APPWRITE_ENDPOINT`
   - `APPWRITE_PROJECT_ID`
   - `APPWRITE_DATABASE_ID`
   - `APPWRITE_API_KEY`
   - `REQUIRE_CRON_SECRET` (optional)
   - `CRON_SECRET` (optional, only if REQUIRE_CRON_SECRET=true)
   - `NEXTAUTH_URL` (recommended for Actions fallback)

### 2. **GitHub Actions (Secrets & Variables)**

The workflow reads from GitHub Secrets and Variables to call the keepalive endpoint.

**GitHub Action Secrets** (recommended for sensitive values):
1. Go to your GitHub repo
2. Settings → **Secrets and variables** → **Actions**
3. Create **Secrets** for:
   - `KEEPALIVE_URL` (optional - full endpoint URL)
   - `CRON_SECRET` (optional - only if endpoint requires auth)
   - `NEXTAUTH_URL` (optional - fallback URL)

**GitHub Action Variables** (recommended for non-sensitive URLs):
1. Settings → **Secrets and variables** → **Actions**
2. Create **Variables** for:
   - `KEEPALIVE_URL` (recommended location for public app URLs)
   - `NEXTAUTH_URL` (fallback)

### 3. **Local Development (Optional)**

Create a `.env.local` file in the project root:

```env
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=local_project_id
APPWRITE_DATABASE_ID=local_database_id
APPWRITE_API_KEY=local_api_key
REQUIRE_CRON_SECRET=false
```

> ⚠️ **Important**: Never commit `.env.local` to version control. It's listed in `.gitignore`.

## Configuration Priority

### For GitHub Actions Workflow

URL resolution follows this priority:

1. `workflow_dispatch` input `keepalive_url` (manual trigger)
2. GitHub **Secret**: `KEEPALIVE_URL`
3. GitHub **Variable**: `KEEPALIVE_URL`
4. GitHub **Secret**: `NEXTAUTH_URL` (fallback)
5. GitHub **Variable**: `NEXTAUTH_URL` (fallback)

If none are set, the workflow will fail with a clear error message.

### For Authorization

1. If `REQUIRE_CRON_SECRET=true` but `CRON_SECRET` is not set → endpoint returns 401
2. If `REQUIRE_CRON_SECRET!=true` → endpoint allows requests without authorization

## Common Configurations

### Configuration A: Open Endpoint (No Auth Required)

Suitable for non-sensitive deployments:

**Deployment Environment:**
```env
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=xxx
APPWRITE_DATABASE_ID=yyy
APPWRITE_API_KEY=zzz
REQUIRE_CRON_SECRET=false
NEXTAUTH_URL=https://myapp.vercel.app
```

**GitHub Secrets/Variables:**
```
KEEPALIVE_URL = https://myapp.vercel.app
(or use NEXTAUTH_URL as fallback)
```

### Configuration B: Protected Endpoint (Auth Required)

Suitable for production deployments:

**Deployment Environment:**
```env
APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=xxx
APPWRITE_DATABASE_ID=yyy
APPWRITE_API_KEY=zzz
REQUIRE_CRON_SECRET=true
CRON_SECRET=my-secret-token-12345
NEXTAUTH_URL=https://myapp.vercel.app
```

**GitHub Secrets:**
```
KEEPALIVE_URL = https://myapp.vercel.app
CRON_SECRET = my-secret-token-12345
```

## Verification Checklist

- [ ] Appwrite API Key is a **server key** (not a public key)
- [ ] `APPWRITE_ENDPOINT` includes `/v1` suffix
- [ ] `APPWRITE_DATABASE_ID` matches a real database in your Appwrite project
- [ ] `.env.local` is in `.gitignore` (not committed)
- [ ] Production hosting platform has all required env vars set
- [ ] GitHub organization/repo has required Secrets/Variables configured
- [ ] If using `REQUIRE_CRON_SECRET=true`, both `CRON_SECRET` env vars are identical
- [ ] No `localhost` URLs in GitHub Actions configuration

## Troubleshooting

**"Missing required environment variables"**
- Verify all APPWRITE_* variables are set in deployment platform
- Check variable names are exact (case-sensitive)

**"Authorization header required" (401)**
- If `REQUIRE_CRON_SECRET=true`, ensure GitHub Actions has `CRON_SECRET` in secrets
- Verify token format: `Authorization: Bearer <token>`

**"HTTP 500 from keepalive endpoint"**
- Check deployment logs for detailed error
- Verify `APPWRITE_API_KEY` is correct (copy from Appwrite Console)
- Verify database ID exists in Appwrite project

**GitHub Actions fails with "Could not resolve keepalive URL"**
- Configure at least one: `KEEPALIVE_URL` or `NEXTAUTH_URL`
- Ensure URL is in GitHub Secrets or Variables
- Check URL does not contain typos
- Verify URL is publicly accessible (no localhost)

## Security Best Practices

1. **Use GitHub Secrets** for sensitive values:
   - `CRON_SECRET` (always)
   - `KEEPALIVE_URL` (if contains auth)
   - `APPWRITE_API_KEY` (only in deployment platform, never in Actions)

2. **Use GitHub Variables** for non-sensitive values:
   - `KEEPALIVE_URL` (recommended - public URLs)
   - `NEXTAUTH_URL` (recommended - fallback)

3. **Never expose** `APPWRITE_API_KEY` to:
   - Client-side code
   - GitHub Actions workflows
   - Version control
   - Public logs

4. **Regenerate CRON_SECRET** if leaked

## What's Next?

- See [APPWRITE_KEEPALIVE_SETUP.md](./APPWRITE_KEEPALIVE_SETUP.md) for deployment instructions
- See [APPWRITE_KEEPALIVE_TESTING.md](./APPWRITE_KEEPALIVE_TESTING.md) for testing & curl examples
