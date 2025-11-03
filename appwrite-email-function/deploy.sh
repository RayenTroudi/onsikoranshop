#!/bin/bash
# Deployment script for ONSi Gmail SMTP Function

echo "🚀 ONSi Gmail SMTP Function - Git Deployment"
echo "============================================="

# Check if we're in the right directory
if [ ! -f "appwrite.json" ]; then
    echo "❌ Error: appwrite.json not found. Run this script from the appwrite-email-function directory."
    exit 1
fi

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "📁 Initializing Git repository..."
    git init
    
    # Create initial .gitignore if it doesn't exist
    if [ ! -f ".gitignore" ]; then
        echo "📝 Creating .gitignore..."
        cat > .gitignore << EOF
node_modules/
.env
.env.local
*.log
.DS_Store
EOF
    fi
fi

# Add files
echo "📦 Adding files to Git..."
git add .

# Check if there are changes to commit
if git diff --staged --quiet; then
    echo "ℹ️  No changes to commit."
else
    # Commit changes
    echo "💾 Committing changes..."
    git commit -m "Deploy ONSi Gmail SMTP function - $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Check if remote origin exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "🔗 Setting up GitHub remote..."
    echo "Please enter your GitHub repository URL:"
    read -p "Repository URL: " repo_url
    git remote add origin "$repo_url"
fi

# Push to GitHub
echo "📤 Pushing to GitHub..."
git push origin main

echo ""
echo "✅ Deployment completed!"
echo ""
echo "📋 Next steps:"
echo "1. Go to Appwrite Console: https://cloud.appwrite.io"
echo "2. Navigate to Functions → Your Email Function"
echo "3. Connect this GitHub repository"
echo "4. Set environment variables (Gmail credentials)"
echo "5. Enable auto-deployment"
echo ""
echo "🔧 Environment variables (pre-configured):"
echo "   SMTP_HOST=smtp.gmail.com"
echo "   SMTP_PORT=587" 
echo "   SMTP_USERNAME=onsmaitii@gmail.com"
echo "   SMTP_PASSWORD=hukoutqxfvpkkmnw"
echo "   SUBMIT_EMAIL=onsmaitii@gmail.com"
echo "   ALLOWED_ORIGINS=*"
echo ""
echo "🎉 Your function will auto-deploy when you push changes!"