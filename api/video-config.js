/**
 * Video Configuration API
 * Manages video and thumbnail URLs for the ONSi website
 * This file stores the current video configuration and provides endpoints to update it
 */

// Import Appwrite SDK for database operations (Node.js version)
import { Client, Databases, ID, Permission, Role, Query } from 'node-appwrite';

// Appwrite Configuration
const APPWRITE_ENDPOINT = process.env.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = process.env.VITE_APPWRITE_PROJECT_ID || '68f8c1bc003e3d2c8f5c';
const DATABASE_ID = 'onsi';
const COLLECTION_ID = 'video-config';

// Initialize Appwrite client
const client = new Client();
client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

// Set API key for server-side operations if available
if (process.env.APPWRITE_API_KEY) {
    client.setKey(process.env.APPWRITE_API_KEY);
}

const databases = new Databases(client);

/**
 * Get current video configuration
 * @returns {Promise<Object>} Video configuration object
 */
export async function getVideoConfig() {
    try {
        // Try to get existing config
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            [Query.limit(1), Query.orderDesc('$createdAt')]
        );
        
        if (response.documents && response.documents.length > 0) {
            const config = response.documents[0];
            // If config has empty URLs, use defaults instead
            const hasValidUrls = config.videoUrl && config.thumbnailUrl;
            
            if (hasValidUrls) {
                return {
                    videoUrl: config.videoUrl,
                    thumbnailUrl: config.thumbnailUrl,
                    videoFileId: config.videoFileId || '',
                    thumbnailFileId: config.thumbnailFileId || '',
                    uploadedAt: config.$createdAt,
                    uploadedBy: config.uploadedBy || 'system'
                };
            }
        }
        
        // Return default configuration if none exists
        return {
            videoUrl: 'https://9v6fd3xlqu.ufs.sh/f/1rEveYHUVj03jFCh0C995pnTJ3AOCxrqDRdPvIKeGwNhS6c0',
            thumbnailUrl: 'https://9v6fd3xlqu.ufs.sh/f/1rEveYHUVj03R431BcSBJN3sMh2mZC8waHSkeVQ4qnIU0c6o',
            videoFileId: '',
            thumbnailFileId: '',
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'system'
        };
    } catch (error) {
        console.error('Error fetching video config:', error);
        // Return default configuration on error
        return {
            videoUrl: 'https://9v6fd3xlqu.ufs.sh/f/1rEveYHUVj03jFCh0C995pnTJ3AOCxrqDRdPvIKeGwNhS6c0',
            thumbnailUrl: 'https://9v6fd3xlqu.ufs.sh/f/1rEveYHUVj03R431BcSBJN3sMh2mZC8waHSkeVQ4qnIU0c6o',
            videoFileId: '',
            thumbnailFileId: '',
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'system'
        };
    }
}

/**
 * Update video configuration
 * @param {Object} newConfig - New video configuration
 * @param {string} adminEmail - Email of admin making the change
 * @returns {Promise<Object>} Updated configuration
 */
export async function updateVideoConfig(newConfig, adminEmail) {
    try {
        const configData = {
            videoUrl: newConfig.videoUrl,
            thumbnailUrl: newConfig.thumbnailUrl,
            videoFileId: newConfig.videoFileId || '',
            thumbnailFileId: newConfig.thumbnailFileId || '',
            uploadedBy: adminEmail || newConfig.uploadedBy || 'admin',
            previousVideoFileId: newConfig.previousVideoFileId || '',
            previousThumbnailFileId: newConfig.previousThumbnailFileId || ''
        };
        
        // Create new document (we keep history by creating new documents)
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID,
            ID.unique(),
            configData,
            [
                Permission.read(Role.any())
            ]
        );
        
        return {
            success: true,
            config: {
                videoUrl: response.videoUrl,
                thumbnailUrl: response.thumbnailUrl,
                videoFileId: response.videoFileId,
                thumbnailFileId: response.thumbnailFileId,
                uploadedAt: response.$createdAt,
                uploadedBy: response.uploadedBy
            }
        };
    } catch (error) {
        console.error('Error updating video config:', error);
        throw error;
    }
}

/**
 * Get video configuration history
 * @param {number} limit - Number of historical records to retrieve
 * @returns {Promise<Array>} Array of video configurations
 */
export async function getVideoConfigHistory(limit = 10) {
    try {
        const response = await databases.listDocuments(
            DATABASE_ID,
            COLLECTION_ID,
            [Query.limit(limit), Query.orderDesc('$createdAt')]
        );
        
        return response.documents.map(doc => ({
            videoUrl: doc.videoUrl,
            thumbnailUrl: doc.thumbnailUrl,
            videoFileId: doc.videoFileId || '',
            thumbnailFileId: doc.thumbnailFileId || '',
            uploadedAt: doc.$createdAt,
            uploadedBy: doc.uploadedBy,
            id: doc.$id
        }));
    } catch (error) {
        console.error('Error fetching video config history:', error);
        return [];
    }
}
