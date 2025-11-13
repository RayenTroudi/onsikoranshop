/**
 * Appwrite Database Setup Script
 * Run this script to create the video-config collection in your existing 'onsi' database
 * 
 * Usage:
 * npm install node-appwrite
 * node setup-appwrite-database.js
 */

import { Client, Databases, ID, Permission, Role } from 'node-appwrite';

// Configuration
const APPWRITE_ENDPOINT = 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = '68f8c1bc003e3d2c8f5c';
const APPWRITE_API_KEY = 'standard_8dbff16d610fd73d4a8a79ffa4a68d31d113a70c1df94ab88e53fd60283d7009b8f6930f256c6e1188d6f4bea704a2ca8420e0bdf271fff8ec9ba6e949d18c9cfbb0787f35654c63d5e64bbfddffb29919ff740fb1abf176e8d5c413a5e0059cfdbe11337f661cd3dd4eab783dc83327dfbe667736a8a66ba541571c13342877';

const DATABASE_ID = 'onsi';
const COLLECTION_ID = 'video-config';

async function setupDatabase() {
    console.log('🚀 Starting Appwrite collection setup...\n');
    console.log('ℹ️  Using existing database: onsi\n');

    try {
        // Initialize Appwrite client
        const client = new Client();
        client
            .setEndpoint(APPWRITE_ENDPOINT)
            .setProject(APPWRITE_PROJECT_ID)
            .setKey(APPWRITE_API_KEY);

        const databases = new Databases(client);

        // Skip database creation - using existing 'onsi' database
        console.log('✅ Using existing database: onsi');

        // Step 2: Create Collection
        console.log('\n📋 Creating collection...');
        try {
            const collection = await databases.createCollection(
                DATABASE_ID,
                COLLECTION_ID,
                'Video Configuration',
                [
                    Permission.read(Role.any()),
                    Permission.create(Role.users()),
                    Permission.update(Role.users()),
                    Permission.delete(Role.users())
                ]
            );
            console.log('✅ Collection created:', collection.name);
        } catch (error) {
            if (error.code === 409) {
                console.log('ℹ️  Collection already exists');
            } else {
                throw error;
            }
        }

        // Step 3: Create Attributes
        console.log('\n🏗️  Creating attributes...');

        const attributes = [
            { key: 'videoUrl', type: 'string', size: 500, required: true },
            { key: 'thumbnailUrl', type: 'string', size: 500, required: true },
            { key: 'videoFileKey', type: 'string', size: 200, required: true },
            { key: 'thumbnailFileKey', type: 'string', size: 200, required: true },
            { key: 'uploadedBy', type: 'string', size: 200, required: true },
            { key: 'previousVideoFileKey', type: 'string', size: 200, required: false },
            { key: 'previousThumbnailFileKey', type: 'string', size: 200, required: false }
        ];

        for (const attr of attributes) {
            try {
                await databases.createStringAttribute(
                    DATABASE_ID,
                    COLLECTION_ID,
                    attr.key,
                    attr.size,
                    attr.required
                );
                console.log(`  ✅ Created attribute: ${attr.key}`);
            } catch (error) {
                if (error.code === 409) {
                    console.log(`  ℹ️  Attribute already exists: ${attr.key}`);
                } else {
                    console.error(`  ❌ Failed to create attribute ${attr.key}:`, error.message);
                }
            }
        }

        // Step 4: Create Initial Document (with default video)
        console.log('\n📄 Creating initial document with current video...');
        try {
            const initialDoc = await databases.createDocument(
                DATABASE_ID,
                COLLECTION_ID,
                ID.unique(),
                {
                    videoUrl: 'https://9v6fd3xlqu.ufs.sh/f/1rEveYHUVj03jFCh0C995pnTJ3AOCxrqDRdPvIKeGwNhS6c0',
                    thumbnailUrl: 'https://9v6fd3xlqu.ufs.sh/f/1rEveYHUVj03R431BcSBJN3sMh2mZC8waHSkeVQ4qnIU0c6o',
                    videoFileKey: '1rEveYHUVj03jFCh0C995pnTJ3AOCxrqDRdPvIKeGwNhS6c0',
                    thumbnailFileKey: '1rEveYHUVj03R431BcSBJN3sMh2mZC8waHSkeVQ4qnIU0c6o',
                    uploadedBy: 'system'
                },
                [
                    Permission.read(Role.any()),
                    Permission.update(Role.users()),
                    Permission.delete(Role.users())
                ]
            );
            console.log('✅ Initial document created:', initialDoc.$id);
        } catch (error) {
            if (error.code === 409) {
                console.log('ℹ️  Initial document already exists');
            } else {
                console.error('⚠️  Failed to create initial document:', error.message);
            }
        }

        console.log('\n🎉 Database setup complete!\n');
        console.log('📊 Summary:');
        console.log(`   Database ID: ${DATABASE_ID}`);
        console.log(`   Collection ID: ${COLLECTION_ID}`);
        console.log(`   Attributes: ${attributes.length}`);
        console.log(`   Permissions: Read (any), Create/Update/Delete (users)`);
        console.log('\n✅ Video management system is ready to use!');
        
    } catch (error) {
        console.error('\n❌ Setup failed:', error);
        console.error('Error details:', error.message);
        process.exit(1);
    }
}

// Run setup
setupDatabase();
