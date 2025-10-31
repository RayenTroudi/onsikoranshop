# Vercel Deployment Configuration Guide

## 🚀 Environment Variables for Vercel

Set these environment variables in your Vercel dashboard:

### Appwrite Configuration
```
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=68f8c1bc003e3d2c8f5c
VITE_APPWRITE_PROJECT_NAME=onsi
```

### EmailJS Configuration  
```
VITE_EMAILJS_PUBLIC_KEY=ryB3eYn0HP-iAfl2E
VITE_EMAILJS_SERVICE_ID=service_j4hv4we
VITE_EMAILJS_CUSTOMER_TEMPLATE_ID=template_3m8gczh
VITE_EMAILJS_ADMIN_TEMPLATE_ID=template_lkl5yxm
```

### Application Settings
```
VITE_ADMIN_EMAIL=onsmaitii@gmail.com
VITE_APP_NAME=Onsi Koran Shop
VITE_PRODUCT_PRICE=39.00
VITE_SHIPPING_COST=0.00
VITE_TAX_RATE=0.00
```

## 🔧 Appwrite Configuration Required

### 1. Add Vercel Domain to Appwrite Origins
In your Appwrite Console:
1. Go to Project Settings → General
2. Add your Vercel domain(s) to "Allowed Origins":
   ```
   https://your-app-name.vercel.app
   https://your-custom-domain.com (if you have one)
   ```

### 2. Storage Bucket CORS Settings
If available in Appwrite console:
1. Go to Storage → onsiBucket → Settings
2. Add CORS origins:
   ```
   https://your-app-name.vercel.app
   *
   ```

## 📦 Deployment Steps

1. **Push your updated code to GitHub**
2. **Import project to Vercel**
3. **Set environment variables** (listed above)
4. **Deploy**

## 🔍 Troubleshooting

### Images not loading:
- Check browser console for CORS errors
- Verify Appwrite origins include your Vercel domain
- Ensure environment variables are set correctly

### Authentication not working:
- Add your Vercel domain to Appwrite allowed origins
- Check that project ID matches exactly

### Build failing:
- Ensure Node.js version is 18+ in Vercel settings
- Check that all dependencies are installed

## 🌟 Key Changes Made

1. **Environment Variables**: Now properly injected at build time
2. **Vite Configuration**: Handles environment variable replacement
3. **Dynamic Configuration**: Appwrite endpoints now use env vars
4. **Vercel Routing**: Proper SPA routing configuration
5. **CORS Headers**: Configured for API calls

## ⚡ Build Command for Vercel

If asked, use these build settings:
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Install Command**: `npm install`

Your site should now work properly on Vercel with all images and Appwrite functionality! 🎉