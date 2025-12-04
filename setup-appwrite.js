/**
 * Setup Appwrite Collections and Buckets
 * Creates all required collections and storage buckets
 */

import { Client, Databases, Storage, ID, Permission, Role } from 'node-appwrite';
import { readFileSync } from 'fs';

// Read .env file manually
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
const BUCKET_ID = '691735da003dc83b3baf';

async function setupAppwrite() {
    console.log('🚀 Starting Appwrite setup...\n');

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
        const storage = new Storage(client);

        console.log('📋 Configuration:');
        console.log(`   Endpoint: ${APPWRITE_ENDPOINT}`);
        console.log(`   Project ID: ${APPWRITE_PROJECT_ID}`);
        console.log(`   Database ID: ${DATABASE_ID}\n`);

        // Step 1: Ensure database exists
        console.log('1️⃣ Checking database...');
        try {
            await databases.get(DATABASE_ID);
            console.log(`✅ Database '${DATABASE_ID}' already exists\n`);
        } catch (error) {
            if (error.code === 404) {
                console.log(`⚠️  Database '${DATABASE_ID}' not found. Creating...`);
                await databases.create(DATABASE_ID, DATABASE_ID);
                console.log(`✅ Database '${DATABASE_ID}' created\n`);
            } else {
                throw error;
            }
        }

        // Step 2: Create orders collection
        console.log('2️⃣ Setting up orders collection...');
        try {
            await databases.getCollection(DATABASE_ID, 'orders');
            console.log(`✅ Collection 'orders' already exists\n`);
        } catch (error) {
            if (error.code === 404) {
                console.log(`⚠️  Collection 'orders' not found. Creating...`);
                
                await databases.createCollection(
                    DATABASE_ID,
                    'orders',
                    'orders',
                    [
                        Permission.read(Role.any()),
                        Permission.create(Role.any()),
                        Permission.update(Role.any()),
                        Permission.delete(Role.any())
                    ]
                );
                console.log(`✅ Collection 'orders' created`);

                // Create attributes
                console.log('   Creating attributes...');
                await databases.createStringAttribute(DATABASE_ID, 'orders', 'userId', 255, false);
                await databases.createStringAttribute(DATABASE_ID, 'orders', 'customerEmail', 255, true);
                await databases.createStringAttribute(DATABASE_ID, 'orders', 'customerName', 255, true);
                await databases.createStringAttribute(DATABASE_ID, 'orders', 'shippingAddress', 1000, true);
                await databases.createStringAttribute(DATABASE_ID, 'orders', 'items', 5000, true);
                await databases.createFloatAttribute(DATABASE_ID, 'orders', 'total', true);
                await databases.createStringAttribute(DATABASE_ID, 'orders', 'status', 50, true);
                
                console.log('✅ Attributes created for orders collection\n');
                
                // Wait for attributes to be ready
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                throw error;
            }
        }

        // Step 3: Create products collection
        console.log('3️⃣ Setting up products collection...');
        try {
            await databases.getCollection(DATABASE_ID, 'products');
            console.log(`✅ Collection 'products' already exists\n`);
        } catch (error) {
            if (error.code === 404) {
                console.log(`⚠️  Collection 'products' not found. Creating...`);
                
                await databases.createCollection(
                    DATABASE_ID,
                    'products',
                    'products',
                    [
                        Permission.read(Role.any()),
                        Permission.create(Role.any()),
                        Permission.update(Role.any()),
                        Permission.delete(Role.any())
                    ]
                );
                console.log(`✅ Collection 'products' created`);

                // Create attributes
                console.log('   Creating attributes...');
                await databases.createStringAttribute(DATABASE_ID, 'products', 'name', 255, true);
                await databases.createStringAttribute(DATABASE_ID, 'products', 'description', 5000, false);
                await databases.createFloatAttribute(DATABASE_ID, 'products', 'price', true);
                await databases.createStringAttribute(DATABASE_ID, 'products', 'image', 500, false);
                await databases.createStringAttribute(DATABASE_ID, 'products', 'category', 100, false);
                await databases.createIntegerAttribute(DATABASE_ID, 'products', 'stock', false);
                
                console.log('✅ Attributes created for products collection\n');
                
                // Wait for attributes to be ready
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                throw error;
            }
        }

        // Step 4: Ensure users collection exists
        console.log('4️⃣ Checking users collection...');
        try {
            await databases.getCollection(DATABASE_ID, 'users');
            console.log(`✅ Collection 'users' already exists\n`);
        } catch (error) {
            if (error.code === 404) {
                console.log(`⚠️  Collection 'users' not found. Creating...`);
                
                await databases.createCollection(
                    DATABASE_ID,
                    'users',
                    'users',
                    [
                        Permission.read(Role.any()),
                        Permission.create(Role.any()),
                        Permission.update(Role.any()),
                        Permission.delete(Role.any())
                    ]
                );
                console.log(`✅ Collection 'users' created`);

                // Create attributes
                console.log('   Creating attributes...');
                await databases.createStringAttribute(DATABASE_ID, 'users', 'name', 255, true);
                await databases.createStringAttribute(DATABASE_ID, 'users', 'email', 255, true);
                await databases.createStringAttribute(DATABASE_ID, 'users', 'role', 50, true);
                await databases.createStringAttribute(DATABASE_ID, 'users', 'createdAt', 255, false);
                
                console.log('✅ Attributes created for users collection\n');
                
                // Wait for attributes to be ready
                await new Promise(resolve => setTimeout(resolve, 2000));
            } else {
                throw error;
            }
        }

        // Step 5: Setup storage bucket
        console.log('5️⃣ Setting up storage bucket...');
        try {
            const bucket = await storage.getBucket(BUCKET_ID);
            console.log(`✅ Bucket '${bucket.name}' (${BUCKET_ID}) already exists`);
            console.log(`   Max file size: ${bucket.maximumFileSize} bytes`);
            console.log(`   Allowed file extensions: ${bucket.allowedFileExtensions?.join(', ') || 'All'}\n`);
        } catch (error) {
            if (error.code === 404) {
                console.log(`⚠️  Bucket not found. Creating OnsiBucket...`);
                
                await storage.createBucket(
                    BUCKET_ID,
                    'OnsiBucket',
                    [
                        Permission.read(Role.any()),
                        Permission.create(Role.any()),
                        Permission.update(Role.any()),
                        Permission.delete(Role.any())
                    ],
                    false, // fileSecurity
                    true,  // enabled
                    50000000, // 50MB max file size (free tier limit)
                    ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'pdf', 'doc', 'docx'], // allowed extensions
                    'none', // compression
                    true,   // encryption
                    true    // antivirus
                );
                
                console.log(`✅ Bucket 'OnsiBucket' created`);
                console.log(`   Bucket ID: ${BUCKET_ID}`);
                console.log(`   Max file size: 50MB\n`);
            } else {
                throw error;
            }
        }

        console.log('🎉 Appwrite setup completed successfully!\n');
        console.log('📝 Summary:');
        console.log('   ✅ Database: onsi');
        console.log('   ✅ Collections: users, products, orders');
        console.log('   ✅ Storage bucket: OnsiBucket (50MB max file size)\n');
        console.log('⚠️  NOTE: Free tier has 2GB storage limit and 50MB max file size per file.');
        console.log('   For larger video files, consider:');
        console.log('   1. Upgrading your Appwrite plan, OR');
        console.log('   2. Compressing videos before upload, OR');
        console.log('   3. Using external video hosting (YouTube, Vimeo)\n');

    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
        process.exit(1);
    }
}

setupAppwrite();
