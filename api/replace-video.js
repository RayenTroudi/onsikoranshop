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
            .setProject(process.env.VITE_APPWRITE_PROJECT_ID || '69319f7f003127073ff3')
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

        // Delete old files immediately
        const deletionResults = {
            video: { deleted: false, fileId: currentConfig?.videoFileId },
            thumbnail: { deleted: false, fileId: currentConfig?.thumbnailFileId }
        };

        if (currentConfig?.videoFileId && currentConfig.videoFileId !== videoFileId) {
            console.log('Deleting old video file:', currentConfig.videoFileId);
            const videoDeleteResult = await deleteFromAppwrite(currentConfig.videoFileId);
            deletionResults.video.deleted = videoDeleteResult.success;
        }

        if (currentConfig?.thumbnailFileId && currentConfig.thumbnailFileId !== thumbnailFileId) {
            console.log('Deleting old thumbnail file:', currentConfig.thumbnailFileId);
            const thumbnailDeleteResult = await deleteFromAppwrite(currentConfig.thumbnailFileId);
            deletionResults.thumbnail.deleted = thumbnailDeleteResult.success;
        }

        return res.status(200).json({
            success: true,
            message: 'Video and thumbnail replaced successfully',
            config: updateResult,
            deletedFiles: deletionResults
        });

    } catch (error) {
        console.error('Error replacing video:', error);
        return res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}
