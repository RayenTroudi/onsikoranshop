/**
 * UploadThing Upload Proxy API
 * Handles file uploads to UploadThing from the server side
 * This avoids CORS issues and keeps API keys secure
 */

import fetch from 'node-fetch';
import FormData from 'form-data';

// CORS headers
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Upload file to UploadThing
 */
async function uploadToUploadThing(fileBuffer, fileName, fileType) {
    try {
        const uploadThingSecret = process.env.VITE_UPLOADTHING_SECRET;
        
        if (!uploadThingSecret) {
            throw new Error('UploadThing secret not configured');
        }

        // Create form data
        const formData = new FormData();
        formData.append('files', fileBuffer, {
            filename: fileName,
            contentType: fileType
        });

        // Upload to UploadThing
        const response = await fetch('https://uploadthing.com/api/uploadFiles', {
            method: 'POST',
            headers: {
                'X-Uploadthing-Api-Key': uploadThingSecret,
            },
            body: formData
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('UploadThing error:', errorText);
            throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        
        // Extract URL from response
        const fileUrl = result.data?.url || result.url;
        const fileKey = result.data?.key || result.key;

        if (!fileUrl) {
            throw new Error('No URL in UploadThing response');
        }

        return {
            url: fileUrl,
            key: fileKey || extractKeyFromUrl(fileUrl)
        };

    } catch (error) {
        console.error('UploadThing upload error:', error);
        throw error;
    }
}

/**
 * Extract file key from UploadThing URL
 */
function extractKeyFromUrl(url) {
    const match = url.match(/\/f\/([^/?]+)/);
    return match ? match[1] : null;
}

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
            error: 'Method not allowed' 
        }));
        return;
    }

    try {
        // Parse multipart form data
        const busboy = require('busboy');
        const bb = busboy({ headers: req.headers });
        
        let fileBuffer = null;
        let fileName = '';
        let fileType = '';
        let uploadType = '';

        bb.on('file', (fieldname, file, info) => {
            const { filename, encoding, mimeType } = info;
            fileName = filename;
            fileType = mimeType;
            
            const chunks = [];
            file.on('data', (chunk) => {
                chunks.push(chunk);
            });
            
            file.on('end', () => {
                fileBuffer = Buffer.concat(chunks);
            });
        });

        bb.on('field', (fieldname, value) => {
            if (fieldname === 'type') {
                uploadType = value;
            }
        });

        bb.on('finish', async () => {
            try {
                if (!fileBuffer) {
                    res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        error: 'No file uploaded' 
                    }));
                    return;
                }

                // Validate file type
                if (uploadType === 'video' && !fileType.startsWith('video/')) {
                    res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        error: 'Invalid video file type' 
                    }));
                    return;
                }

                if (uploadType === 'thumbnail' && !fileType.startsWith('image/')) {
                    res.writeHead(400, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ 
                        success: false, 
                        error: 'Invalid image file type' 
                    }));
                    return;
                }

                // Upload to UploadThing
                const result = await uploadToUploadThing(fileBuffer, fileName, fileType);

                res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: true,
                    url: result.url,
                    key: result.key,
                    type: uploadType
                }));

            } catch (uploadError) {
                console.error('Upload processing error:', uploadError);
                res.writeHead(500, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ 
                    success: false, 
                    error: uploadError.message || 'Upload failed' 
                }));
            }
        });

        req.pipe(bb);

    } catch (error) {
        console.error('Upload API error:', error);
        res.writeHead(500, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: false, 
            error: error.message || 'Internal server error' 
        }));
    }
}
