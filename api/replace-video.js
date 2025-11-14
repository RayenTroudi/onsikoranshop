/**
 * Video Replace API Endpoint
 * Handles video and thumbnail replacement with Appwrite Storage
 * Vercel Serverless Function
 */

import { getVideoConfig, updateVideoConfig } from './video-config.js';
import { Client, Storage } from 'node-appwrite';

// CORS headers
const CORS_HEADERS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

/**
 * Delete file from Appwrite Storage
 */
async function deleteFromAppwrite(fileId) {
    try {
        if (!fileId) {
            console.log('No file ID provided, skipping deletion');
            return { success: true };
        }

        const client = new Client();
        client
            .setEndpoint(process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1')
            .setProject(process.env.VITE_APPWRITE_PROJECT_ID || '68f8c1bc003e3d2c8f5c')
            .setKey(process.env.APPWRITE_API_KEY);
        
        const storage = new Storage(client);
        const bucketId = '691735da003dc83b3baf'; // OnsiBucket

        await storage.deleteFile(bucketId, fileId);
        console.log('File deleted from Appwrite:', fileId);

        return { success: true };
    } catch (error) {
        console.error('Error deleting from Appwrite:', error);
        return { success: false, error: error.message };
    }
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
        const { videoUrl, thumbnailUrl, videoFileId, thumbnailFileId } = req.body;

        // Validate input
        if (!videoUrl || !thumbnailUrl) {
            return res.status(400).json({ 
                success: false, 
                error: 'videoUrl and thumbnailUrl are required' 
            });
        }

        // Get current config to know what to delete
        const currentConfig = await getVideoConfig();
        
        console.log('Current config:', currentConfig);
        console.log('New files:', { videoFileId, thumbnailFileId });

        // Update configuration first (before deleting old files)
        const updateResult = await updateVideoConfig({
            videoUrl,
            thumbnailUrl,
            videoFileId: videoFileId || '',
            thumbnailFileId: thumbnailFileId || '',
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'admin',
            previousVideoFileId: currentConfig?.videoFileId || '',
            previousThumbnailFileId: currentConfig?.thumbnailFileId || ''
        });

        console.log('Config updated:', updateResult);

        // Schedule deletion of old files (after 7 days for safety)
        // For now, we'll just log them - you can implement delayed deletion later
        if (currentConfig?.videoFileId && currentConfig.videoFileId !== videoFileId) {
            console.log('Old video file to be deleted:', currentConfig.videoFileId);
            // TODO: Schedule deletion after 7 days
            // For immediate deletion, uncomment:
            // await deleteFromAppwrite(currentConfig.videoFileId);
        }

        if (currentConfig?.thumbnailFileId && currentConfig.thumbnailFileId !== thumbnailFileId) {
            console.log('Old thumbnail file to be deleted:', currentConfig.thumbnailFileId);
            // TODO: Schedule deletion after 7 days
            // For immediate deletion, uncomment:
            // await deleteFromAppwrite(currentConfig.thumbnailFileId);
        }

        return res.status(200).json({
            success: true,
            message: 'Video and thumbnail replaced successfully',
            config: updateResult,
            oldFiles: {
                videoFileId: currentConfig?.videoFileId,
                thumbnailFileId: currentConfig?.thumbnailFileId
            }
        });

    } catch (error) {
        console.error('Error replacing video:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
