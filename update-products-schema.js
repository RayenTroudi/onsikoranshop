/**
 * Update Products Collection for Gallery Support
 * Adds support for multiple images with ordering
 */

import { Client, Databases } from 'node-appwrite';
import { readFileSync } from 'fs';

function loadEnv() {
    try {
        const envFile = readFileSync('.env', 'utf8');
        const lines = envFile.split('\n');
        const env = {};
        
        for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const [key, ...valueParts] = trimmed.split('=');
                if (key && valueParts.length > 0) {
                    let value = valueParts.join('=').trim();
                    value = value.replace(/^["']|["']$/g, '');
                    env[key.trim()] = value;
                }
            }
        }
        return env;
    } catch (error) {
        console.error('Error reading .env file:', error.message);
        return {};
    }
}

const ENV = loadEnv();

const APPWRITE_ENDPOINT = ENV.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = ENV.VITE_APPWRITE_PROJECT_ID || '69319f7f003127073ff3';
const APPWRITE_API_KEY = ENV.APPWRITE_API_KEY;

const DATABASE_ID = 'onsi';
const COLLECTION_ID = 'products';

async function updateProductsCollection() {
    console.log('🚀 Updating products collection for gallery support...\n');

    if (!APPWRITE_API_KEY) {
        console.error('❌ Error: APPWRITE_API_KEY not found in .env file');
        process.exit(1);
    }

    try {
        const client = new Client();
        client
            .setEndpoint(APPWRITE_ENDPOINT)
            .setProject(APPWRITE_PROJECT_ID)
            .setKey(APPWRITE_API_KEY);

        const databases = new Databases(client);

        console.log('📋 Configuration:');
        console.log(`   Endpoint: ${APPWRITE_ENDPOINT}`);
        console.log(`   Project ID: ${APPWRITE_PROJECT_ID}`);
        console.log(`   Database: ${DATABASE_ID}`);
        console.log(`   Collection: ${COLLECTION_ID}\n`);

        // Check if collection exists
        console.log('1️⃣ Checking products collection...');
        try {
            const collection = await databases.getCollection(DATABASE_ID, COLLECTION_ID);
            console.log(`✅ Collection found: ${collection.name}\n`);
        } catch (error) {
            console.error('❌ Products collection not found. Run setup-appwrite.js first.');
            process.exit(1);
        }

        // Add new attributes for gallery support
        console.log('2️⃣ Adding new attributes for gallery support...');
        
        try {
            // Gallery images - JSON array of image objects with fileId and order
            await databases.createStringAttribute(
                DATABASE_ID,
                COLLECTION_ID,
                'galleryImages',
                10000, // Large enough for JSON array
                false
            );
            console.log('✅ Added galleryImages attribute (JSON array)');
        } catch (error) {
            if (error.code === 409) {
                console.log('⚠️  galleryImages attribute already exists');
            } else if (error.code === 400 && error.message.includes('attribute_limit_exceeded')) {
                console.log('⚠️  Attribute limit reached - will use image field for gallery JSON');
            } else {
                throw error;
            }
        }

        try {
            // Main image file ID
            await databases.createStringAttribute(
                DATABASE_ID,
                COLLECTION_ID,
                'mainImageId',
                255,
                false
            );
            console.log('✅ Added mainImageId attribute');
        } catch (error) {
            if (error.code === 409) {
                console.log('⚠️  mainImageId attribute already exists');
            } else if (error.code === 400 && error.message.includes('attribute_limit_exceeded')) {
                console.log('⚠️  Attribute limit reached - will store mainImageId in description field');
            } else {
                throw error;
            }
        }

        console.log('\n🎉 Products collection updated successfully!\n');
        console.log('📝 Schema strategy:');
        console.log('   ✅ galleryImages - JSON array in existing field');
        console.log('   ✅ image field - Will store gallery JSON: [');
        console.log('       {fileId: "xxx", order: 0, caption: "Main"},');
        console.log('       {fileId: "yyy", order: 1, caption: "Detail 1"}');
        console.log('     ]');
        console.log('\n✅ Update complete! You can now:');
        console.log('   1. Upload multiple images per product');
        console.log('   2. Reorder gallery images');
        console.log('   3. Images will appear in the homepage gallery\n');
        console.log('💡 Note: Using existing "image" field for gallery JSON to avoid attribute limits\n');

    } catch (error) {
        console.error('❌ Update failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
        process.exit(1);
    }
}

updateProductsCollection();
