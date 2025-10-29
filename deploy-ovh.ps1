# OVH Hosting Deployment Script
# This script uploads your website files to OVH hosting via FTP

param(
    [Parameter(Mandatory=$true)]
    [string]$FtpHost,
    
    [Parameter(Mandatory=$true)]
    [string]$Username,
    
    [Parameter(Mandatory=$true)]
    [string]$Password,
    
    [string]$RemotePath = "/www"
)

Write-Host "🚀 Starting OVH deployment..." -ForegroundColor Green

# Files to upload (excluding development files)
$FilesToUpload = @(
    "index.html",
    "admin.html", 
    "script.js",
    "admin-script.js",
    "styles.css",
    "admin-styles.css",
    "appwrite-config.js"
)

# Directories to upload recursively
$DirectoriesToUpload = @(
    "assets",
    "locales"
)

# Create FTP client
try {
    Write-Host "📡 Connecting to FTP server: $FtpHost" -ForegroundColor Yellow
    
    # Function to upload a single file
    function Upload-File {
        param($LocalFile, $RemoteFile)
        
        try {
            $ftpRequest = [System.Net.FtpWebRequest]::Create("ftp://$FtpHost$RemoteFile")
            $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
            $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::UploadFile
            $ftpRequest.UseBinary = $true
            $ftpRequest.KeepAlive = $false
            
            $fileContent = [System.IO.File]::ReadAllBytes($LocalFile)
            $ftpRequest.ContentLength = $fileContent.Length
            
            $requestStream = $ftpRequest.GetRequestStream()
            $requestStream.Write($fileContent, 0, $fileContent.Length)
            $requestStream.Close()
            
            $response = $ftpRequest.GetResponse()
            Write-Host "✅ Uploaded: $LocalFile -> $RemoteFile" -ForegroundColor Green
            $response.Close()
        }
        catch {
            Write-Host "❌ Failed to upload $LocalFile : $($_.Exception.Message)" -ForegroundColor Red
        }
    }
    
    # Function to create directory
    function Create-Directory {
        param($RemoteDir)
        
        try {
            $ftpRequest = [System.Net.FtpWebRequest]::Create("ftp://$FtpHost$RemoteDir")
            $ftpRequest.Credentials = New-Object System.Net.NetworkCredential($Username, $Password)
            $ftpRequest.Method = [System.Net.WebRequestMethods+Ftp]::MakeDirectory
            
            $response = $ftpRequest.GetResponse()
            Write-Host "📁 Created directory: $RemoteDir" -ForegroundColor Cyan
            $response.Close()
        }
        catch {
            # Directory might already exist, that's OK
            if ($_.Exception.Message -notlike "*already exists*") {
                Write-Host "⚠️  Directory creation note for $RemoteDir : $($_.Exception.Message)" -ForegroundColor Yellow
            }
        }
    }
    
    # Upload individual files
    foreach ($file in $FilesToUpload) {
        if (Test-Path $file) {
            Upload-File -LocalFile $file -RemoteFile "$RemotePath/$file"
        }
        else {
            Write-Host "⚠️  File not found: $file" -ForegroundColor Yellow
        }
    }
    
    # Upload directories recursively
    foreach ($dir in $DirectoriesToUpload) {
        if (Test-Path $dir -PathType Container) {
            Write-Host "📂 Uploading directory: $dir" -ForegroundColor Cyan
            
            # Create remote directory
            Create-Directory -RemoteDir "$RemotePath/$dir"
            
            # Upload all files in directory
            Get-ChildItem -Path $dir -Recurse -File | ForEach-Object {
                $relativePath = $_.FullName.Replace((Get-Location).Path, "").Replace("\", "/")
                $remotePath = "$RemotePath$relativePath"
                
                # Create subdirectories if needed
                $remoteDir = Split-Path $remotePath -Parent
                Create-Directory -RemoteDir $remoteDir
                
                Upload-File -LocalFile $_.FullName -RemoteFile $remotePath
            }
        }
        else {
            Write-Host "⚠️  Directory not found: $dir" -ForegroundColor Yellow
        }
    }
    
    Write-Host "🎉 Deployment completed successfully!" -ForegroundColor Green
    Write-Host "🌐 Your website should now be available at your OVH domain" -ForegroundColor Green
    
}
catch {
    Write-Host "❌ Deployment failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "📋 Next steps:" -ForegroundColor Yellow
Write-Host "1. Verify your site loads at your domain" -ForegroundColor White
Write-Host "2. Check browser console for any errors" -ForegroundColor White
Write-Host "3. Test admin panel login and Appwrite integration" -ForegroundColor White
Write-Host "4. Update Appwrite project to allow your domain origin" -ForegroundColor White