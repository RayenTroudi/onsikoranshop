# ONSi Gmail SMTP Email Function 📧

A professional email notification system for the ONSi Quranic Verses Box shop that sends beautiful, bilingual order confirmations using Gmail SMTP.

## 🌟 Features

- **Customer Confirmation Emails**: Professional HTML emails with Islamic design
- **Admin Notifications**: Comprehensive order alerts with quick action buttons
- **Bilingual Support**: Arabic and English text in emails
- **Gmail SMTP Integration**: Reliable email delivery using Gmail's SMTP servers
- **Enhanced Templates**: Beautiful, mobile-responsive email designs
- **Error Handling**: Robust error handling with detailed logging
- **Git Deployment**: Ready for Appwrite Git integration

## 📁 Project Structure

```
appwrite-email-function/
├── src/
│   └── main.js              # Main function code
├── appwrite.json           # Appwrite function configuration
├── package.json            # Dependencies and metadata
├── .gitignore              # Git ignore rules
├── .env.example            # Environment template
└── README.md              # This documentation
```

## 🚀 Git Deployment to Appwrite

### 1. **Prerequisites**
- Gmail account with 2-Step Verification enabled
- Gmail App Password generated
- GitHub repository access
- Appwrite project access

### 2. **Deploy to GitHub**
```bash
# Navigate to the function directory
cd appwrite-email-function

# Initialize git (if not already done)
git init

# Add all files
git add .

# Commit changes
git commit -m "Initial Gmail SMTP function deployment"

# Add remote (replace with your repo)
git remote add origin https://github.com/RayenTroudi/onsikoranshop.git

# Push to GitHub
git push origin main
```

### 3. **Connect to Appwrite**
1. Go to [Appwrite Console](https://cloud.appwrite.io)
2. Navigate to your project: `68f8c1bc003e3d2c8f5c`
3. Go to **Functions** → Find function `68fbb51700021c6f9655`
4. Click **"Settings"** → **"Git Repository"**
5. Connect your GitHub repository
6. Set **Branch**: `main`
7. Set **Root Directory**: `appwrite-email-function`
8. **Auto Deploy**: Enable
9. Save configuration

### 4. **Configure Environment Variables**
In Appwrite Function settings, add:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-gmail@gmail.com
SMTP_PASSWORD=your-app-password
SUBMIT_EMAIL=your-admin@email.com
ALLOWED_ORIGINS=*
```

### 5. **Deploy**
- Appwrite will automatically deploy when you push to GitHub
- Or manually trigger deployment in Appwrite Console
- Monitor deployment logs for any issues

## 🧪 Testing

### Local Testing
```bash
npm test
```

### Deployment Verification
```bash
npm run deploy-check
```

## 📧 Function Configuration

The `appwrite.json` file contains:
- Function ID: `68fbb51700021c6f9655`
- Runtime: Node.js 22
- Entry point: `src/main.js`
- Timeout: 15 seconds
- Auto-deployment enabled

## 🔧 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `SMTP_HOST` | Gmail SMTP server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port | `587` |
| `SMTP_USERNAME` | Your Gmail address | `your-email@gmail.com` |
| `SMTP_PASSWORD` | Gmail App Password | `abcd efgh ijkl mnop` |
| `SUBMIT_EMAIL` | Admin notification email | `admin@yourstore.com` |
| `ALLOWED_ORIGINS` | CORS origins | `*` |

## 🎯 **Gmail App Password Setup**
1. Enable 2-Step Verification on Gmail
2. Go to Google Account Settings → Security
3. 2-Step Verification → App Passwords
4. Generate password for "Mail" app
5. Use this password in `SMTP_PASSWORD`

## 🔄 **Automatic Deployment**
Once connected to Git:
1. Make changes to code
2. Commit and push to GitHub
3. Appwrite automatically deploys
4. Monitor in Appwrite Console

## 📞 **Support**
- Check Appwrite function logs for errors
- Verify Gmail App Password is correct
- Ensure all environment variables are set
- Test with the included test scripts

---

**Ready for production deployment via Git! 🚀**

## 📧 Email Templates

### Customer Confirmation Email
- **Design**: Professional Islamic-themed layout with gradient headers
- **Content**: Order details, shipping information, next steps
- **Languages**: English with Arabic elements
- **Features**: Responsive design, proper RTL text support

### Admin Notification Email
- **Design**: Alert-style layout with clear action items
- **Content**: Complete order summary, customer details, quick actions
- **Features**: Direct email/phone links, order management guidance

## 🔧 API Usage

### Request Format

```javascript
POST /your-function-endpoint
Content-Type: application/json

{
  "to": "customer@email.com",
  "customerName": "Ahmed Mohamed",
  "orderNumber": "ONS-2024-001",
  "orderDate": "2024-01-15",
  "totalAmount": 45.90,
  "items": [
    {
      "id": 1,
      "name": "ONSi Quranic Verses Box",
      "nameAr": "صندوق آيات قرآنية أونسي",
      "price": 45.90,
      "quantity": 1
    }
  ],
  "shippingInfo": {
    "firstName": "Ahmed",
    "lastName": "Mohamed",
    "email": "customer@email.com", 
    "phone": "+216 12 345 678",
    "address": "123 Main Street",
    "city": "Tunis",
    "governorate": "Tunis",
    "postalCode": "1000"
  }
}
```

## 🛠️ Deployment

### Appwrite Function Configuration

- **Runtime**: Node.js 22
- **Entry Point**: main.js
- **Dependencies**: Managed via package.json

### Environment Variables

Ensure all required environment variables are set in your Appwrite function configuration.

## 🔐 Security

- **Environment Variables**: All sensitive data stored in environment variables
- **App Passwords**: Uses Gmail App Passwords instead of regular passwords
- **TLS Encryption**: All email communications are encrypted
- **Input Validation**: Comprehensive validation of all input data

---

**Built with ❤️ for the ONSi Quranic Verses Box project**  
*Spreading the divine word through beautiful technology* 🕌
