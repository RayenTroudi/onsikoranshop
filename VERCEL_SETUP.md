# Vercel Deployment Fix Guide

## Problem
The deployed website on Vercel is broken because environment variables are not being injected during the build process. This causes:
- Login to fail (Appwrite endpoints not configured)
- All API calls to fail
- Everything shows as "Loading..."

## Root Cause
The `build.js` script tries to read environment variables from `process.env.VITE_*`, but Vercel is not passing these variables to the build process. The script then falls back to hardcoded defaults which may be incorrect or outdated.

## Solution
Set up environment variables in your Vercel project:

### Step 1: Go to Vercel Project Settings
1. Go to https://vercel.com/dashboard
2. Click on your project (OnsiKoran)
3. Go to **Settings** → **Environment Variables**

### Step 2: Add Required Environment Variables
Add the following environment variables with their values:

```
VITE_APPWRITE_ENDPOINT = https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID = 69319f7f003127073ff3
VITE_APPWRITE_PROJECT_NAME = onsi
VITE_ADMIN_EMAIL = onsmaitii@gmail.com
VITE_APP_NAME = Onsi Koran Shop
VITE_RESEND_API_KEY = <your-actual-resend-api-key>
```

### Step 3: Redeploy
1. After adding variables, go back to **Deployments**
2. Click the **...** menu on your latest deployment
3. Select **Redeploy**

### Step 4: Verify
After redeployment:
1. Check browser DevTools console - you should see "🔧 Environment Config:" with your values
2. Try logging in - should work now
3. Try loading products - should show prices instead of "Loading..."

## Important Security Note
The Resend API key should NOT be exposed in frontend code. Current setup hardcodes it in the frontend, which is a security risk. Consider:
1. Using a backend API endpoint to send emails (instead of Appwrite Function)
2. Storing the Resend key securely in Appwrite Function environment variables
3. Never expose API keys in frontend code

## Files Involved
- `build.js` - Reads environment variables and injects them into HTML
- `vercel.json` - Build configuration
- `package.json` - Build script: `"build": "node build.js"`
