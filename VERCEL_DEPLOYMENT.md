# Vercel Deployment Guide

## Environment Variables for Vercel

Copy and paste these environment variables in your Vercel dashboard:

### Firebase Configuration
```
VITE_FIREBASE_API_KEY=AIzaSyDZw3QJBDlsn10pBbtQmBU61Nfa9bMUFx4
VITE_FIREBASE_AUTH_DOMAIN=onsi-de85f.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=onsi-de85f
VITE_FIREBASE_STORAGE_BUCKET=onsi-de85f.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=304484751803
VITE_FIREBASE_APP_ID=1:304484751803:web:4031fad794705c0bac8c9e
VITE_FIREBASE_MEASUREMENT_ID=G-5MF3MSH2J5
```

### EmailJS Configuration
```
VITE_EMAILJS_PUBLIC_KEY=ryB3eYn0HP-iAfl2E
VITE_EMAILJS_SERVICE_ID=service_j4hv4we
VITE_EMAILJS_CUSTOMER_TEMPLATE_ID=template_3m8gczh
VITE_EMAILJS_ADMIN_TEMPLATE_ID=template_lkl5yxm
VITE_ADMIN_EMAIL=rayentroudi00@gmail.com
```

### Application Configuration
```
VITE_APP_NAME=Onsi Koran Shop
VITE_PRODUCT_PRICE=39.00
VITE_SHIPPING_COST=0.00
VITE_TAX_RATE=0.00
```

## How to Deploy to Vercel

### Method 1: Vercel CLI
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in your project directory
3. Follow the prompts
4. Add environment variables via dashboard

### Method 2: GitHub Integration
1. Push your code to GitHub
2. Go to [vercel.com](https://vercel.com)
3. Import your GitHub repository
4. Add environment variables in the deployment settings
5. Deploy

## Adding Environment Variables in Vercel Dashboard

1. Go to your project in Vercel dashboard
2. Click on "Settings" tab
3. Click on "Environment Variables" in the sidebar
4. Add each variable:
   - **Name**: Variable name (e.g., `VITE_FIREBASE_API_KEY`)
   - **Value**: Variable value (e.g., `AIzaSyDZw3QJBDlsn10pBbtQmBU61Nfa9bMUFx4`)
   - **Environment**: Select "Production", "Preview", and "Development"

## Important Notes

- ✅ All variables are prefixed with `VITE_` for client-side access
- ✅ Environment variables are now used throughout the application
- ✅ Fallback values are provided for local development
- ✅ `.env` file is ignored by git for security
- ✅ Firebase free tier limits are respected
- ✅ EmailJS free tier (200 emails/month) is configured

## Local Development

1. Make sure `.env` file exists in your project root
2. Run a local server: `python -m http.server 8000`
3. Visit `http://localhost:8000`

## Firebase Security Rules

Make sure your Firebase Firestore rules allow authenticated users:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow authenticated users to read/write their own data
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Allow authenticated users to create orders
    match /orders/{orderId} {
      allow create: if request.auth != null;
      allow read: if request.auth != null && request.auth.uid == resource.data.userId;
    }
    
    // Allow public read access to products (if needed)
    match /products/{productId} {
      allow read: if true;
    }
  }
}
```

## Troubleshooting

- **Build Errors**: Check that all environment variables are set
- **Firebase Errors**: Verify Firebase config and security rules
- **EmailJS Errors**: Confirm service ID, template IDs, and public key
- **CORS Issues**: Make sure your domain is added to Firebase authorized domains