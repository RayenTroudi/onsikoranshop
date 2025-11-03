# PowerShell Deployment script for ONSi Gmail SMTP Function

Write-Host "🚀 ONSi Gmail SMTP Function - Git Deployment" -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan

# Check if we're in the right directory
if (!(Test-Path "appwrite.json")) {
    Write-Host "❌ Error: appwrite.json not found. Run this script from the appwrite-email-function directory." -ForegroundColor Red
    exit 1
}

# Check if git is initialized
if (!(Test-Path ".git")) {
    Write-Host "📁 Initializing Git repository..." -ForegroundColor Yellow
    git init
}

# Add files
Write-Host "📦 Adding files to Git..." -ForegroundColor Yellow
git add .

# Check if there are changes to commit
$gitStatus = git status --porcelain
if ($gitStatus) {
    # Commit changes
    Write-Host "💾 Committing changes..." -ForegroundColor Yellow
    $commitMessage = "Deploy ONSi Gmail SMTP function - $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    git commit -m $commitMessage
} else {
    Write-Host "ℹ️  No changes to commit." -ForegroundColor Blue
}

# Check if remote origin exists
$remoteExists = $false
try {
    git remote get-url origin | Out-Null
    $remoteExists = $true
} catch {
    $remoteExists = $false
}

if (!$remoteExists) {
    Write-Host "🔗 Setting up GitHub remote..." -ForegroundColor Yellow
    $repoUrl = Read-Host "Please enter your GitHub repository URL"
    git remote add origin $repoUrl
}

# Push to GitHub
Write-Host "📤 Pushing to GitHub..." -ForegroundColor Yellow
git push origin main

Write-Host ""
Write-Host "✅ Deployment completed!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Cyan
Write-Host "1. Go to Appwrite Console: https://cloud.appwrite.io" -ForegroundColor White
Write-Host "2. Navigate to Functions → Your Email Function" -ForegroundColor White
Write-Host "3. Connect this GitHub repository" -ForegroundColor White
Write-Host "4. Set environment variables (Gmail credentials)" -ForegroundColor White
Write-Host "5. Enable auto-deployment" -ForegroundColor White
Write-Host ""
Write-Host "🔧 Environment variables (pre-configured):" -ForegroundColor Yellow
Write-Host "   SMTP_HOST=smtp.gmail.com" -ForegroundColor White
Write-Host "   SMTP_PORT=587" -ForegroundColor White
Write-Host "   SMTP_USERNAME=onsmaitii@gmail.com" -ForegroundColor White
Write-Host "   SMTP_PASSWORD=hukoutqxfvpkkmnw" -ForegroundColor White
Write-Host "   SUBMIT_EMAIL=onsmaitii@gmail.com" -ForegroundColor White
Write-Host "   ALLOWED_ORIGINS=*" -ForegroundColor White
Write-Host ""
Write-Host "🎉 Your function will auto-deploy when you push changes!" -ForegroundColor Green