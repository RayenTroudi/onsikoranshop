# OVH Hosting Deployment Guide

This guide walks you through deploying your Quranic Verses Box website to OVH Starter hosting.

## Prerequisites

- OVH Starter hosting plan activated
- Domain name configured (included free for first year)
- FTP credentials from OVH control panel

## Step 1: Prepare Your Site

### 1.1 Upload Video Thumbnail (Important!)
The site expects a static video thumbnail to avoid CORS issues:

1. Open your video file (`ons.mp4`) in a video editor
2. Export a frame at exactly 0:13 seconds as `video-thumbnail.jpg`
3. Upload this image to your Appwrite bucket with filename `video-thumbnail.jpg`

### 1.2 Update CSP for Your Domain
Edit `index.html` and replace the CSP meta tag:

```html
<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://cdn.skypack.dev https://cdn.jsdelivr.net https://fra.cloud.appwrite.io; connect-src 'self' https://fra.cloud.appwrite.io; img-src 'self' data: https://fra.cloud.appwrite.io https://yourdomain.ovh.net; media-src 'self' https://fra.cloud.appwrite.io; object-src 'none';">
```

Replace `https://yourdomain.ovh.net` with your actual OVH domain.

## Step 2: Configure Appwrite for Production

### 2.1 Add Your Domain to Appwrite
1. Go to your Appwrite Console (https://cloud.appwrite.io)
2. Navigate to your project settings
3. Add your OVH domain to "Allowed Origins" (e.g., `https://yourdomain.ovh.net`)
4. Save the changes

### 2.2 Test Appwrite Connection
Before deploying, test that Appwrite accepts requests from your domain by temporarily updating your local hosts file or using a staging environment.

## Step 3: Deploy Using PowerShell Script

### 3.1 Get OVH FTP Credentials
1. Log into your OVH control panel
2. Go to Web Hosting → Your hosting
3. Find FTP access information:
   - FTP server (e.g., `ftp.yourcluster.ovh.net`)
   - Username 
   - Password

### 3.2 Run Deployment Script
Open PowerShell in your project directory and run:

```powershell
.\deploy-ovh.ps1 -FtpHost "ftp.yourcluster.ovh.net" -Username "your-username" -Password "your-password"
```

The script will upload all necessary files to your OVH hosting.

## Step 4: Alternative - Manual FTP Upload

If you prefer manual upload:

### 4.1 Download FileZilla or Similar FTP Client
- Host: Your OVH FTP server
- Username: From OVH control panel  
- Password: From OVH control panel
- Port: 21 (or 22 for SFTP if available)

### 4.2 Upload These Files to /www/ directory:
```
index.html
admin.html
script.js
admin-script.js
styles.css
admin-styles.css
appwrite-config.js
assets/ (entire folder)
locales/ (entire folder)
```

**Important:** Do NOT upload:
- `node_modules/` (if present)
- `.git/`
- Development files like `deploy-ovh.ps1`
- `function-build/` (unless needed)

## Step 5: Configure SSL and Domain

### 5.1 Enable SSL Certificate
1. In OVH control panel, go to your hosting
2. Find "SSL Certificate" section
3. Enable free Let's Encrypt certificate
4. Wait 10-30 minutes for certificate to be issued

### 5.2 Force HTTPS Redirect
Add this to a `.htaccess` file in your /www/ directory:

```apache
RewriteEngine On
RewriteCond %{HTTPS} off
RewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]
```

Upload this `.htaccess` file to your /www/ directory.

## Step 6: Test Your Deployment

### 6.1 Basic Functionality
1. Visit `https://yourdomain.ovh.net`
2. Check that the page loads without errors
3. Open browser console (F12) and check for any errors
4. Test that images and video load properly

### 6.2 Test Appwrite Integration
1. Try adding a product to cart
2. Test user registration/login
3. Access admin panel at `https://yourdomain.ovh.net/admin.html`
4. Verify products and orders load in admin panel

### 6.3 Test Currency Switching
1. Click the currency toggle button
2. Verify prices update correctly
3. Refresh page and verify currency preference is remembered

## Troubleshooting

### Common Issues:

**"CORS Error" in console:**
- Ensure your domain is added to Appwrite allowed origins
- Check that `video-thumbnail.jpg` exists in your Appwrite bucket

**"CSP Violation" errors:**
- Update the Content-Security-Policy meta tag with your actual domain
- Ensure all external resources are whitelisted

**Admin panel doesn't load:**
- Check that your user account has `role: "admin"` in Appwrite
- Verify Appwrite project ID and endpoint are correct

**Images/video don't load:**
- Verify files exist in your Appwrite bucket
- Check file IDs in the Appwrite console match those used in code

**500 Server Error:**
- Check file permissions (755 for directories, 644 for files)
- Ensure .htaccess syntax is correct
- Contact OVH support if issues persist

### Performance Optimization:

1. **Enable Gzip compression** (add to .htaccess):
```apache
<IfModule mod_deflate.c>
    AddOutputFilterByType DEFLATE text/plain
    AddOutputFilterByType DEFLATE text/html
    AddOutputFilterByType DEFLATE text/xml
    AddOutputFilterByType DEFLATE text/css
    AddOutputFilterByType DEFLATE application/xml
    AddOutputFilterByType DEFLATE application/xhtml+xml
    AddOutputFilterByType DEFLATE application/rss+xml
    AddOutputFilterByType DEFLATE application/javascript
    AddOutputFilterByType DEFLATE application/x-javascript
</IfModule>
```

2. **Set cache headers** (add to .htaccess):
```apache
<IfModule mod_expires.c>
    ExpiresActive On
    ExpiresByType image/jpg "access plus 1 month"
    ExpiresByType image/jpeg "access plus 1 month"
    ExpiresByType image/gif "access plus 1 month"
    ExpiresByType image/png "access plus 1 month"
    ExpiresByType text/css "access plus 1 month"
    ExpiresByType application/pdf "access plus 1 month"
    ExpiresByType text/x-javascript "access plus 1 month"
    ExpiresByType application/x-shockwave-flash "access plus 1 month"
    ExpiresByType image/x-icon "access plus 1 year"
    ExpiresDefault "access plus 2 days"
</IfModule>
```

## Security Notes

- Never commit sensitive credentials to Git
- Use environment variables for production secrets (though not needed for this static site)
- Regularly update your Appwrite project security settings
- Monitor OVH logs for unusual activity

## Support

- **OVH Support**: Available via ticket system in control panel
- **Appwrite Docs**: https://appwrite.io/docs
- **This Project**: Check browser console for specific error messages

Your site should now be fully deployed and functional on OVH hosting!