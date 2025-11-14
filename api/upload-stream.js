/**
 * Streaming Upload API for Large Files
 * Uses UploadThing's presigned URL approach to handle large video files
 */

export const config = {
    api: {
        bodyParser: false, // Disable body parsing to handle streams
    },
};

// CORS headers
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
};

/**
 * Generate presigned URL from UploadThing
 */
async function getPresignedUrl(fileName, fileSize, fileType) {
    const uploadThingSecret = process.env.VITE_UPLOADTHING_SECRET;
    
    if (!uploadThingSecret) {
        throw new Error('UploadThing secret not configured');
    }

    const response = await fetch('https://api.uploadthing.com/v6/prepareUpload', {
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
            }]
        })
    });

    if (!response.ok) {
        const errorText = await response.text();
        console.error('UploadThing prepareUpload error:', errorText);
        throw new Error(`Failed to prepare upload: ${response.status}`);
    }

    const data = await response.json();
    
    if (!data.data || !data.data[0]) {
        throw new Error('Invalid response from UploadThing');
    }

    return data.data[0];
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
        // Get file metadata from query params or headers
        const fileName = req.headers['x-file-name'] || 'upload';
        const fileSize = parseInt(req.headers['x-file-size'] || '0');
        const fileType = req.headers['x-file-type'] || 'application/octet-stream';

        console.log('Upload request:', { fileName, fileSize, fileType });

        // Get presigned URL from UploadThing
        const uploadData = await getPresignedUrl(fileName, fileSize, fileType);
        
        // Return the presigned URL to the client
        // The client will upload directly to this URL
        res.writeHead(200, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: true,
            uploadUrl: uploadData.url,
            fileKey: uploadData.key,
            fileUrl: `https://utfs.io/f/${uploadData.key}`
        }));

    } catch (error) {
        console.error('Upload stream error:', error);
        res.writeHead(500, { ...CORS_HEADERS, 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
            success: false, 
            error: error.message 
        }));
    }
}
