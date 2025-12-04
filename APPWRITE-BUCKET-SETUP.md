# Appwrite Bucket Configuration

## Bucket Details
- **Name**: OnsiBucket
- **ID**: `691735da003dc83b3baf`
- **Project**: 69319f7f003127073ff3 (onsi)
- **Endpoint**: https://fra.cloud.appwrite.io/v1

## Required Bucket Permissions

For the video management system to work properly, configure these permissions in Appwrite Console:

### File Upload Permissions
- **Create**: Users (authenticated users can upload)
- **Read**: Any (public can view/download files)

### File Management Permissions
- **Update**: Users (authenticated users can update file metadata)
- **Delete**: Users (authenticated users can delete files)

## File Settings

### Maximum File Size
Recommended: **100 MB** (sufficient for high-quality videos)

### Allowed File Extensions
```
Video: .mp4, .webm, .mov
Image: .jpg, .jpeg, .png, .webp, .gif
```

### Compression
- **Enabled**: Yes (for thumbnails)
- **Quality**: 90% (balances quality and file size)

## Security Configuration

### 1. CORS Settings
Add these domains to allowed origins:
```
https://onsi.shop
https://*.vercel.app
http://localhost:*
```

### 2. API Key Setup
For server-side operations (file deletion), create an API key with:
- **Scopes**: `files.read`, `files.write`, `files.delete`
- **Expiry**: Never (or set appropriate expiry)

Add to Vercel environment variables:
```
APPWRITE_API_KEY=<your-api-key>
```

### 3. Storage Security
- Enable **encryption at rest** (recommended)
- Enable **antivirus scanning** (recommended)
- Set **retention policy** for deleted files (7-30 days recommended)

## File URL Format

Files uploaded to this bucket will have URLs in this format:
```
https://fra.cloud.appwrite.io/v1/storage/buckets/691735da003dc83b3baf/files/{FILE_ID}/view?project=69319f7f003127073ff3
```

### Preview URL (with transformations)
```
https://fra.cloud.appwrite.io/v1/storage/buckets/691735da003dc83b3baf/files/{FILE_ID}/preview?project=69319f7f003127073ff3&width=800&quality=90
```

### Download URL
```
https://fra.cloud.appwrite.io/v1/storage/buckets/691735da003dc83b3baf/files/{FILE_ID}/download?project=69319f7f003127073ff3
```

## Usage in Code

### Frontend Upload (via window.appwriteAuth)
```javascript
const result = await window.appwriteAuth.uploadImage(file);
// Returns: { url: '...', fileId: '...' }
```

### Backend Deletion (via Storage SDK)
```javascript
import { Client, Storage } from 'node-appwrite';

const client = new Client();
client
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('69319f7f003127073ff3')
    .setKey(process.env.APPWRITE_API_KEY);

const storage = new Storage(client);
await storage.deleteFile('691735da003dc83b3baf', fileId);
```

### Get File Metadata
```javascript
const file = await storage.getFile('691735da003dc83b3baf', fileId);
console.log(file);
// Returns: { $id, name, signature, mimeType, sizeOriginal, ... }
```

## Monitoring

### Check Bucket Usage
1. Go to Appwrite Console
2. Navigate to Storage → OnsiBucket
3. View:
   - Total files
   - Total storage used
   - Recent uploads
   - File list

### View File Details
Click any file to see:
- File ID
- Name
- Size
- MIME type
- Upload date
- Created by (user ID)
- Permissions
- Public URL

## Backup Strategy

### Manual Backup
1. Download files from Appwrite Console
2. Store locally or in cloud storage
3. Keep file ID mapping in database

### Automated Backup (Recommended)
Set up a scheduled function to:
1. List all files in bucket
2. Download each file
3. Upload to backup storage (S3, Google Cloud, etc.)
4. Run weekly or monthly

## Troubleshooting

### Issue: Files not accessible
**Check**:
- Bucket permissions (read should be public)
- CORS settings
- File status (not deleted)

### Issue: Upload fails
**Check**:
- User is authenticated
- File size within limits
- Allowed file extensions
- API rate limits

### Issue: Deletion fails
**Check**:
- APPWRITE_API_KEY is set correctly
- API key has delete permissions
- File exists
- User has permission

### Issue: Slow file loading
**Solutions**:
- Enable CDN in Appwrite settings
- Use preview URLs with lower quality for thumbnails
- Implement lazy loading on frontend
- Consider video compression before upload

## Cost Optimization

### Free Tier Limits (Appwrite Cloud)
- **Storage**: 10 GB
- **Bandwidth**: 150 GB/month
- **Requests**: Unlimited

### Tips to Stay Within Free Tier
1. Compress videos before upload (target 720p, not 4K)
2. Use WebP for thumbnails (smaller than JPG/PNG)
3. Delete old files regularly
4. Enable file compression in bucket settings
5. Use CDN caching

## Migration from UploadThing

Old files on UploadThing:
- Can remain there (no cost)
- Or download and re-upload to Appwrite
- Update database with new Appwrite file IDs

Steps to migrate existing file:
1. Download from UploadThing URL
2. Upload to Appwrite via admin panel
3. Database will auto-update with new URLs and IDs

---

**Setup Date**: $(Get-Date -Format 'yyyy-MM-dd')
**Status**: ✅ Configured and Ready
