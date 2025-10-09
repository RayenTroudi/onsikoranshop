# Firebase Domain Authorization Guide

## ⚠️ Error: Firebase: Error (auth/unauthorized-domain)

This error occurs when your domain is not authorized in Firebase Authentication.

## 🔧 Quick Fix Steps:

### 1. Go to Firebase Console
- Visit: https://console.firebase.google.com/
- Select your project: **onsi-de85f**

### 2. Navigate to Authentication Settings
- Click **Authentication** in the left sidebar
- Click **Settings** tab
- Click **Authorized domains** 

### 3. Add Your Vercel Domain
Click **"Add domain"** and add:
- Your Vercel domain (e.g., `your-app-name.vercel.app`)
- Any custom domains you're using

### 4. Common Domains to Add:
```
localhost
127.0.0.1
your-project-name.vercel.app
your-custom-domain.com (if applicable)
```

## 🎯 Your Specific Case:

Based on your repository name `onsikoranshop`, your Vercel domain is likely:
- `onsikoranshop.vercel.app` 
- `onsikoranshop-owner.vercel.app`
- Or similar variation

Check your Vercel dashboard for the exact domain and add it to Firebase.

## 🔍 How to Find Your Vercel Domain:
1. Go to [vercel.com](https://vercel.com)
2. Open your project dashboard  
3. Copy the domain shown at the top (e.g., `https://your-project.vercel.app`)
4. Add just the domain part (without https://) to Firebase

## ✅ After Adding the Domain:
- Wait a few minutes for changes to propagate
- Try signing in again
- The error should be resolved

## 📝 Common Firebase Authorized Domains:
For development and production, you typically need:
- `localhost` (for local development)
- `your-project.vercel.app` (for production)
- Any preview domains Vercel creates

## 🚨 Security Note:
Only add domains you trust and control. Never add wildcard domains or untrusted domains to your Firebase project.