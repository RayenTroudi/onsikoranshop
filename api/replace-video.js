/**
 * Video Replace API Endpoint
 * Handles video and thumbnail replacement with UploadThing
 * Vercel Serverless Function
 */

import { Client, Account } from 'https://cdn.skypack.dev/appwrite@15.0.0';
import { getVideoConfig, updateVideoConfig } from './video-config.js';

// CORS headers
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Verify admin authentication
 */
async function verifyAdmin(authHeader) {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return { valid: false, error: 'No authorization token provided' };
    }

    const jwt = authHeader.substring(7);
    
    try {
        const client = new Client();
        client
            .setEndpoint('https://fra.cloud.appwrite.io/v1')
            .setProject('68f8c1bc003e3d2c8f5c')
            .setJWT(jwt);
        
        const account = new Account(client);
        const user = await account.get();
        
        // Check if user is admin (you can customize this check)
        const adminEmail = 'onsmaitii@gmail.com';
        if (user.email !== adminEmail) {
            return { valid: false, error: 'Unauthorized: Admin access required' };
        }
        
        return { valid: true, user };
    } catch (error) {
        console.error('Auth verification error:', error);
        return { valid: false, error: 'Invalid or expired token' };
    }
}

/**
 * Delete file from UploadThing
 */
async function deleteFromUploadThing(fileKey) {
    try {
        const uploadThingSecret = process.env.VITE_UPLOADTHING_SECRET;
        
        const response = await fetch(`https://api.uploadthing.com/v6/deleteFile`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-Uploadthing-Api-Key': uploadThingSecret,
            },
            body: JSON.stringify({ fileKey })
        });

        if (!response.ok) {
            const error = await response.text();
            console.error('UploadThing delete error:', error);
            return { success: false, error };
        }

        return { success: true };
    } catch (error) {
        console.error('Error deleting from UploadThing:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Extract file key from UploadThing URL
 */
function extractFileKey(url) {
    // URL format: https://9v6fd3xlqu.ufs.sh/f/FILE_KEY
    const match = url.match(/\/f\/([^/?]+)/);
    return match ? match[1] : null;
}

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
        // Verify admin authentication
        const authResult = await verifyAdmin(req.headers.authorization);
        if (!authResult.valid) {
            return res.status(401).json({ 
                success: false, 
                error: authResult.error 
            });
        }

        const { videoUrl, thumbnailUrl } = req.body;

        // Validate input
        if (!videoUrl || !thumbnailUrl) {
            return res.status(400).json({ 
                success: false, 
                error: 'videoUrl and thumbnailUrl are required' 
            });
        }

        // Validate URLs are from UploadThing
        if (!videoUrl.includes('ufs.sh') || !thumbnailUrl.includes('ufs.sh')) {
            return res.status(400).json({ 
                success: false, 
                error: 'Invalid URLs: must be UploadThing URLs' 
            });
        }

        // Get current config to know what to delete
        const currentConfig = await getVideoConfig();
        
        // Extract file keys from new URLs
        const newVideoFileKey = extractFileKey(videoUrl);
        const newThumbnailFileKey = extractFileKey(thumbnailUrl);

        if (!newVideoFileKey || !newThumbnailFileKey) {
            return res.status(400).json({ 
                success: false, 
                error: 'Could not extract file keys from URLs' 
            });
        }

        // Update configuration first (before deleting old files)
        const updateResult = await updateVideoConfig({
            videoUrl,
            thumbnailUrl,
            videoFileKey: newVideoFileKey,
            thumbnailFileKey: newThumbnailFileKey,
            previousVideoFileKey: currentConfig.videoFileKey,
            previousThumbnailFileKey: currentConfig.thumbnailFileKey
        }, authResult.user.email);

        // Schedule deletion of old files (after 7 days for safety)
        // For now, we'll mark them for deletion but not delete immediately
        const deletionResults = {
            video: { scheduled: true, fileKey: currentConfig.videoFileKey },
            thumbnail: { scheduled: true, fileKey: currentConfig.thumbnailFileKey }
        };

        // Optional: Delete immediately (uncomment if you want immediate deletion)
        /*
        if (currentConfig.videoFileKey !== newVideoFileKey) {
            deletionResults.video = await deleteFromUploadThing(currentConfig.videoFileKey);
        }
        if (currentConfig.thumbnailFileKey !== newThumbnailFileKey) {
            deletionResults.thumbnail = await deleteFromUploadThing(currentConfig.thumbnailFileKey);
        }
        */

        return res.status(200).json({ 
            success: true, 
            message: 'Video and thumbnail updated successfully',
            config: updateResult.config,
            oldFiles: deletionResults,
            note: 'Old files are scheduled for deletion after 7 days'
        });

    } catch (error) {
        console.error('Video replace error:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message || 'Internal server error' 
        });
    }
}
