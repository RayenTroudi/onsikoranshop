/**
 * Get UploadThing Presigned URL
 * Returns a presigned URL for direct client upload
 */

import fetch from 'node-fetch';

// CORS headers
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Main handler
 */
export default async function handler(req, res) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200, CORS_HEADERS);
        res.end();
        return;
    }

    // Only allow POST
    if (req.method !== 'POST') {
        res.writeHead(405, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: false, 
            error: 'Method not allowed. Use POST.' 
        }));
        return;
    }

    try {
        const { fileName, fileSize, fileType } = req.body;

        console.log('Upload URL request:', { fileName, fileSize, fileType });

        if (!fileName || !fileSize || !fileType) {
            res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'fileName, fileSize, and fileType are required'
            }));
            return;
        }

        const uploadThingSecret = process.env.VITE_UPLOADTHING_SECRET;
        
        if (!uploadThingSecret) {
            throw new Error('UploadThing secret not configured');
        }

        // Generate a unique file key
        const timestamp = Date.now();
        const randomStr = Math.random().toString(36).substring(7);
        const fileKey = `${timestamp}-${randomStr}-${fileName.replace(/[^a-zA-Z0-9.-]/g, '_')}`;

        // Request presigned URL from UploadThing using UTApi
        const uploadUrl = `https://uploadthing.com/api/uploadFiles`;
        
        const response = await fetch(uploadUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Uploadthing-Api-Key': uploadThingSecret,
            },
            body: JSON.stringify({
                files: [{
                    name: fileName,
                    size: fileSize,
                    type: fileType,
                    customId: fileKey
                }],
                metadata: {
                    uploadedBy: 'admin',
                    timestamp: new Date().toISOString()
                }
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('UploadThing API error:', response.status, errorText);
            throw new Error(`UploadThing API returned ${response.status}: ${errorText}`);
        }

        const data = await response.json();
        console.log('UploadThing response:', JSON.stringify(data, null, 2));

        // Extract presigned URL from response
        let presignedUrl, actualFileKey, fileUrl;
        
        if (data.data && Array.isArray(data.data) && data.data[0]) {
            const uploadData = data.data[0];
            presignedUrl = uploadData.url || uploadData.uploadUrl || uploadData.presignedUrl;
            actualFileKey = uploadData.key || uploadData.fileKey || fileKey;
            fileUrl = uploadData.fileUrl || `https://utfs.io/f/${actualFileKey}`;
        } else if (data.url) {
            presignedUrl = data.url;
            actualFileKey = data.key || fileKey;
            fileUrl = data.fileUrl || `https://utfs.io/f/${actualFileKey}`;
        } else {
            console.error('Unexpected UploadThing response format:', data);
            throw new Error('Invalid response from UploadThing - no upload URL found');
        }

        if (!presignedUrl) {
            throw new Error('No presigned URL in UploadThing response');
        }

        console.log('Presigned URL generated:', { presignedUrl, actualFileKey, fileUrl });

        // Return presigned URL and file info
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            presignedUrl: presignedUrl,
            fileKey: actualFileKey,
            fileUrl: fileUrl
        }));

    } catch (error) {
        console.error('Get upload URL error:', error);
        res.writeHead(500, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: false, 
            error: error.message 
        }));
    }
}
