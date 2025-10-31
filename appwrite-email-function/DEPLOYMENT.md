# Appwrite Email Function Deployment Guide

## File Structure
```
appwrite-email-function/
├── src/
│   └── main.js      # Main function file (CommonJS format)
├── package.json     # Dependencies and configuration (main: "src/main.js")
├── README.md        # Function documentation
└── DEPLOYMENT.md    # This deployment guide
```

## Deployment Steps

### 1. Create Function in Appwrite Console
1. Go to your Appwrite Console → Functions
2. Click "Create Function"
3. Set:
   - **Name**: `onsi-email-sender`
   - **Function ID**: `onsi-email-sender` 
   - **Runtime**: `Node.js 18.0` or higher
   - **Entrypoint**: `main.js` (file is now at root level)

### 2. Set Environment Variables
Add these environment variables in the Appwrite function settings:

```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASS=your-app-password
MAIL_FROM=your-email@gmail.com
ALLOWED_ORIGINS=https://your-domain.com
```

### 3. Deploy Function Code
1. Create a deployment archive including: `main.js`, `package.json` (both at root level)
2. Upload the archive to Appwrite Console → Functions → Your Function → Deployment
3. Wait for deployment to complete
4. Ensure the package.json points to `"main": "main.js"` (root level)

### 4. Set Function Permissions
In Function Settings → Permissions:
- Add: `role:guest` (for public access)
- Or configure specific user roles as needed

### 5. Create Function Execution
In Function Settings → Domains/Execution:
- Enable HTTP execution
- Copy the function URL for use in your frontend

## Testing
Use the function URL with POST request:
```javascript
fetch('https://your-appwrite-domain/v1/functions/onsi-email-sender/executions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Appwrite-Project': 'your-project-id'
  },
  body: JSON.stringify({
    customerName: 'Test Customer',
    customerEmail: 'test@example.com',
    orderDetails: { /* order data */ }
  })
});
```

## Troubleshooting
- Ensure `main.js` is in the root of your zip file
- Check that package.json has correct `main` field
- Verify environment variables are set
- Check function logs in Appwrite Console for errors