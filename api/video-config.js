/**
 * Video Configuration API
 * Manages video and thumbnail URLs for the ONSi website
 * This file stores the current video configuration and provides endpoints to update it
 */

// Import Appwrite SDK for database operations
import { Client, Databases, ID, Permission, Role, Query } from 'https://cdn.skypack.dev/appwrite@15.0.0';

// Appwrite Configuration
const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '68f8c1bc003e3d2c8f5c';
const DATABASE_ID = 'onsi';
const COLLECTION_ID = 'video-config';

// Initialize Appwrite client
const client = new Client();
client
    .setEndpoint(APPWRITE_ENDPOINT)
    .setProject(APPWRITE_PROJECT_ID);

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
            return {
                videoUrl: config.videoUrl,
                thumbnailUrl: config.thumbnailUrl,
                videoFileKey: config.videoFileKey,
                thumbnailFileKey: config.thumbnailFileKey,
                uploadedAt: config.$createdAt,
                uploadedBy: config.uploadedBy || 'system'
            };
        }
        
        // Return default configuration if none exists
        return {
            videoUrl: 'https://9v6fd3xlqu.ufs.sh/f/1rEveYHUVj03jFCh0C995pnTJ3AOCxrqDRdPvIKeGwNhS6c0',
            thumbnailUrl: 'https://9v6fd3xlqu.ufs.sh/f/1rEveYHUVj03R431BcSBJN3sMh2mZC8waHSkeVQ4qnIU0c6o',
            videoFileKey: '1rEveYHUVj03jFCh0C995pnTJ3AOCxrqDRdPvIKeGwNhS6c0',
            thumbnailFileKey: '1rEveYHUVj03R431BcSBJN3sMh2mZC8waHSkeVQ4qnIU0c6o',
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'system'
        };
    } catch (error) {
        console.error('Error fetching video config:', error);
        // Return default configuration on error
        return {
            videoUrl: 'https://9v6fd3xlqu.ufs.sh/f/1rEveYHUVj03jFCh0C995pnTJ3AOCxrqDRdPvIKeGwNhS6c0',
            thumbnailUrl: 'https://9v6fd3xlqu.ufs.sh/f/1rEveYHUVj03R431BcSBJN3sMh2mZC8waHSkeVQ4qnIU0c6o',
            videoFileKey: '1rEveYHUVj03jFCh0C995pnTJ3AOCxrqDRdPvIKeGwNhS6c0',
            thumbnailFileKey: '1rEveYHUVj03R431BcSBJN3sMh2mZC8waHSkeVQ4qnIU0c6o',
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
            videoFileKey: newConfig.videoFileKey,
            thumbnailFileKey: newConfig.thumbnailFileKey,
            uploadedBy: adminEmail || 'admin',
            previousVideoFileKey: newConfig.previousVideoFileKey || null,
            previousThumbnailFileKey: newConfig.previousThumbnailFileKey || null
        };
        
        // Create new document (we keep history by creating new documents)
        const response = await databases.createDocument(
            DATABASE_ID,
            COLLECTION_ID,
            ID.unique(),
            configData,
            [
                Permission.read(Role.any()),
                Permission.update(Role.users()),
                Permission.delete(Role.users())
            ]
        );
        
        return {
            success: true,
            config: {
                videoUrl: response.videoUrl,
                thumbnailUrl: response.thumbnailUrl,
                videoFileKey: response.videoFileKey,
                thumbnailFileKey: response.thumbnailFileKey,
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
            videoFileKey: doc.videoFileKey,
            thumbnailFileKey: doc.thumbnailFileKey,
            uploadedAt: doc.$createdAt,
            uploadedBy: doc.uploadedBy,
            id: doc.$id
        }));
    } catch (error) {
        console.error('Error fetching video config history:', error);
        return [];
    }
}
