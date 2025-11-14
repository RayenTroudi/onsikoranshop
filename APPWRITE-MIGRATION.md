# Migration from UploadThing to Appwrite Storage

## Summary
Successfully migrated the video management system from UploadThing to Appwrite Storage (bucket: OnsiBucket, ID: `691735da003dc83b3baf`).

## Changes Made

### 1. Frontend (admin.html)
- **Replaced** `uploadToUploadThing()` → `uploadToAppwrite()`
- **Updated** to use `window.appwriteAuth.uploadImage()` instead of UploadThing API
- **Changed** upload flow to return `{ url, fileId }` instead of just URL
- **Modified** `updateVideoConfiguration()` to accept `videoFileId` and `thumbnailFileId` parameters
- **Updated** `loadCurrentVideo()` to fetch from `/api/video-config` instead of hardcoded URLs

### 2. Backend API (api/replace-video.js)
- **Replaced** `deleteFromUploadThing()` with `deleteFromAppwrite()`
- **Updated** to use Appwrite Storage SDK with bucket ID `691735da003dc83b3baf`
- **Removed** `extractFileKey()` function (no longer needed)
- **Changed** to accept `videoFileId` and `thumbnailFileId` from request body
- **Removed** UploadThing URL validation
- **Added** proper file deletion scheduling (currently logs old file IDs)

### 3. Database Schema (api/video-config.js)
- **Added** `videoFileId` field (Appwrite file ID for video)
- **Added** `thumbnailFileId` field (Appwrite file ID for thumbnail)
- **Replaced** `videoFileKey` → `videoFileId`
- **Replaced** `thumbnailFileKey` → `thumbnailFileId`
- **Updated** all functions to work with Appwrite file IDs

### 4. Cleanup
- **Deleted** `api/get-upload-url.js` (obsolete)
- **Deleted** `api/upload-file.js` (obsolete)
- **Deleted** `api/upload-stream.js` (obsolete)
- **Removed** UploadThing routes from `vercel.json`
- **Removed** UploadThing environment variables from `build.js`

## Configuration

### Appwrite Storage
- **Endpoint**: https://fra.cloud.appwrite.io/v1
- **Project ID**: 68f8c1bc003e3d2c8f5c
- **Database**: onsi
- **Collection**: video-config
- **Bucket**: OnsiBucket (ID: `691735da003dc83b3baf`)

### Required Environment Variables
```bash
VITE_APPWRITE_ENDPOINT=https://fra.cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=68f8c1bc003e3d2c8f5c
APPWRITE_API_KEY=<your-api-key>  # For server-side operations
```

## Upload Flow

### Frontend (admin.html)
1. Admin selects video + thumbnail files
2. Files uploaded via `window.appwriteAuth.uploadImage()` to Appwrite bucket
3. Returns `{ url, fileId }` for each file
4. Sends to `/api/replace-video` with:
   - `videoUrl` (Appwrite file URL)
   - `thumbnailUrl` (Appwrite file URL)
   - `videoFileId` (Appwrite file ID)
   - `thumbnailFileId` (Appwrite file ID)

### Backend (api/replace-video.js)
1. Receives video/thumbnail URLs and file IDs
2. Fetches current configuration to get old file IDs
3. Updates database with new URLs and file IDs
4. Logs old file IDs for deletion (currently not deleting automatically)
5. Returns success response

## Testing Instructions

### 1. Access Admin Panel
```
https://onsi.shop/admin
```

### 2. Upload New Video
- Go to Video Manager section
- Select video file (MP4)
- Select thumbnail image (JPG/PNG)
- Click "Replace Video & Thumbnail"
- Wait for upload to complete

### 3. Verify Upload
- Check that success message appears
- Refresh homepage to see new video
- Check Appwrite console for new files in OnsiBucket
- Verify database has new `videoFileId` and `thumbnailFileId`

### 4. Check Database
```javascript
// In browser console or via Appwrite console
// Collection: video-config
// Should have fields:
// - videoUrl
// - thumbnailUrl
// - videoFileId
// - thumbnailFileId
// - uploadedAt
// - uploadedBy
```

## File Deletion Strategy

Currently, old files are **logged but not deleted**. This is for safety.

To enable immediate deletion, uncomment in `api/replace-video.js`:
```javascript
// await deleteFromAppwrite(currentConfig.videoFileId);
// await deleteFromAppwrite(currentConfig.thumbnailFileId);
```

Recommended: Implement a scheduled job to delete old files after 7 days.

## Rollback Plan

If issues occur, you can:
1. Keep current Appwrite files in bucket
2. Manually update database with old URLs if needed
3. All old UploadThing code is in git history

## Benefits of Appwrite Migration

1. **No File Size Limits**: No more Vercel 4.5MB payload limits
2. **No CORS Issues**: Direct browser upload works seamlessly
3. **Unified Platform**: Everything (auth, database, storage) in Appwrite
4. **Better Control**: Full API access for file management
5. **Cheaper**: Appwrite free tier is generous

## Potential Issues

### Issue: "File not found" on homepage
**Solution**: Make sure video/thumbnail URLs are publicly accessible in Appwrite bucket settings

### Issue: Upload fails with 401 error
**Solution**: Check that admin is logged in via Appwrite authentication

### Issue: API returns 500 error
**Solution**: 
- Check Vercel logs for detailed error
- Verify `APPWRITE_API_KEY` is set in Vercel environment variables
- Ensure bucket ID `691735da003dc83b3baf` is correct

## Deployment Status

✅ Code changes deployed to Vercel
✅ All UploadThing code removed
✅ Build successful
✅ Ready for testing

## Next Steps

1. Test video upload in admin panel
2. Verify files appear in Appwrite OnsiBucket
3. Check homepage displays new video correctly
4. Implement scheduled deletion of old files (optional)
5. Remove UploadThing environment variables from Vercel dashboard

---

**Date**: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
**Status**: ✅ Migration Complete
