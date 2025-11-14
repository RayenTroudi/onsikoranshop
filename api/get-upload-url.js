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
        return res.status(200).json({ success: true });
    }

    // Only allow POST
    if (req.method !== 'POST') {
        return res.status(405).json({ 
            success: false, 
            error: 'Method not allowed' 
        });
    }

    try {
        const { fileName, fileSize, fileType } = req.body;

        if (!fileName || !fileSize || !fileType) {
            return res.status(400).json({
                success: false,
                error: 'fileName, fileSize, and fileType are required'
            });
        }

        const uploadThingSecret = process.env.VITE_UPLOADTHING_SECRET;
        
        if (!uploadThingSecret) {
            throw new Error('UploadThing secret not configured');
        }

        // Request presigned URL from UploadThing
        const response = await fetch('https://sea1.ingest.uploadthing.com/route-metadata', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Uploadthing-Api-Key': uploadThingSecret,
            },
            body: JSON.stringify({
                files: [{
                    name: fileName,
                    size: fileSize,
                    type: fileType
                }],
                acl: 'public-read'
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('UploadThing API error:', errorText);
            throw new Error(`UploadThing API returned ${response.status}`);
        }

        const data = await response.json();
        console.log('UploadThing response:', data);

        if (!data || !data[0]) {
            throw new Error('Invalid response from UploadThing');
        }

        const uploadData = data[0];

        // Return presigned URL and file info
        return res.status(200).json({
            success: true,
            presignedUrl: uploadData.presignedUrl || uploadData.url,
            fileKey: uploadData.key,
            fileUrl: uploadData.fileUrl || `https://utfs.io/f/${uploadData.key}`
        });

    } catch (error) {
        console.error('Get upload URL error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
