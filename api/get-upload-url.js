/**
 * Get UploadThing Presigned URL
 * Returns a presigned URL for direct client upload
 */

import fetch from 'node-fetch';
import FormData from 'form-data';

// CORS headers
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Upload file directly to UploadThing and return the URL
 * Since presigned URLs are complex, we'll upload the file server-side
 */
async function uploadToUploadThing(fileBuffer, fileName, fileType) {
    const uploadThingSecret = process.env.VITE_UPLOADTHING_SECRET;
    
    if (!uploadThingSecret) {
        throw new Error('UploadThing secret not configured');
    }

    // Create FormData
    const formData = new FormData();
    formData.append('files', fileBuffer, {
        filename: fileName,
        contentType: fileType
    });

    // Upload directly to UploadThing
    const response = await fetch('https://uploadthing.com/api/uploadFiles', {
        method: 'POST',
        headers: {
            'X-Uploadthing-Api-Key': uploadThingSecret,
            ...formData.getHeaders()
        },
        body: formData
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('UploadThing upload error:', response.status, errorText);
        throw new Error(`UploadThing upload failed: ${response.status}`);
    }

    const data = await response.json();
    console.log('UploadThing upload response:', JSON.stringify(data, null, 2));

    // Extract URL from response
    let fileUrl, fileKey;
    
    if (data.data && Array.isArray(data.data) && data.data[0]) {
        fileUrl = data.data[0].url || data.data[0].fileUrl;
        fileKey = data.data[0].key || data.data[0].fileKey;
    } else if (data.url) {
        fileUrl = data.url;
        fileKey = data.key;
    }

    if (!fileUrl) {
        throw new Error('No file URL in UploadThing response');
    }

    return { fileUrl, fileKey };
}

/**
 * Main handler - receives file data and uploads it
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
        const { fileData, fileName, fileType } = req.body;

        console.log('Upload request:', { fileName, fileType, dataLength: fileData?.length });

        if (!fileData || !fileName || !fileType) {
            res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
            res.end(JSON.stringify({
                success: false,
                error: 'fileData, fileName, and fileType are required'
            }));
            return;
        }

        // Convert base64 to buffer
        const fileBuffer = Buffer.from(fileData, 'base64');
        console.log('File buffer size:', fileBuffer.length, 'bytes');

        // Upload to UploadThing
        const { fileUrl, fileKey } = await uploadToUploadThing(fileBuffer, fileName, fileType);

        console.log('Upload successful:', { fileUrl, fileKey });

        // Return file URL
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            success: true,
            fileUrl: fileUrl,
            fileKey: fileKey
        }));

    } catch (error) {
        console.error('Upload error:', error);
        res.writeHead(500, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: false, 
            error: error.message 
        }));
    }
}
