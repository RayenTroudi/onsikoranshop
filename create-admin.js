/**
 * Create Admin User Script
 * Run this script to create an admin user in Appwrite
 * 
 * Usage:
 * node create-admin.js
 */

import { Client, Account, Databases, ID, Users } from 'node-appwrite';
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
                    // Remove quotes if present
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

// Configuration
const APPWRITE_ENDPOINT = ENV.VITE_APPWRITE_ENDPOINT || 'https://fra.cloud.appwrite.io/v1';
const APPWRITE_PROJECT_ID = ENV.VITE_APPWRITE_PROJECT_ID || '69319f7f003127073ff3';
const APPWRITE_API_KEY = ENV.APPWRITE_API_KEY;

const DATABASE_ID = 'onsi';
const USERS_COLLECTION_ID = 'users';

// Admin credentials
const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = '12345678';
const ADMIN_NAME = 'Admin User';

async function createAdminUser() {
    console.log('🚀 Starting admin user creation...\n');

    if (!APPWRITE_API_KEY) {
        console.error('❌ Error: APPWRITE_API_KEY not found in .env file');
        process.exit(1);
    }

    try {
        // Initialize Appwrite client with API key (server-side)
        const client = new Client();
        client
            .setEndpoint(APPWRITE_ENDPOINT)
            .setProject(APPWRITE_PROJECT_ID)
            .setKey(APPWRITE_API_KEY);

        const users = new Users(client);
        const databases = new Databases(client);

        console.log('📋 Configuration:');
        console.log(`   Endpoint: ${APPWRITE_ENDPOINT}`);
        console.log(`   Project ID: ${APPWRITE_PROJECT_ID}`);
        console.log(`   Database: ${DATABASE_ID}`);
        console.log(`   Collection: ${USERS_COLLECTION_ID}\n`);

        // Step 1: Create user account using Users API (server-side)
        console.log('1️⃣ Creating user account...');
        let userId;
        
        try {
            const user = await users.create(
                ID.unique(),
                ADMIN_EMAIL,
                undefined, // phone (optional)
                ADMIN_PASSWORD,
                ADMIN_NAME
            );
            userId = user.$id;
            console.log(`✅ User account created: ${user.email}`);
            console.log(`   User ID: ${userId}\n`);
        } catch (error) {
            if (error.code === 409) {
                console.log('⚠️  User account already exists, attempting to find existing user...');
                
                // List users to find existing one
                const userList = await users.list([]);
                const existingUser = userList.users.find(u => u.email === ADMIN_EMAIL);
                
                if (existingUser) {
                    userId = existingUser.$id;
                    console.log(`✅ Found existing user: ${existingUser.email}`);
                    console.log(`   User ID: ${userId}\n`);
                } else {
                    throw new Error('User exists but could not be found');
                }
            } else {
                throw error;
            }
        }

        // Step 2: Create or update user profile in users collection with admin role
        console.log('2️⃣ Creating user profile with admin role...');
        
        try {
            // First, try to get the database to see if it exists
            try {
                await databases.get(DATABASE_ID);
                console.log(`✅ Database '${DATABASE_ID}' found`);
            } catch (dbError) {
                if (dbError.code === 404) {
                    console.log(`⚠️  Database '${DATABASE_ID}' not found. Creating it...`);
                    await databases.create(DATABASE_ID, DATABASE_ID);
                    console.log(`✅ Database '${DATABASE_ID}' created`);
                } else {
                    throw dbError;
                }
            }

            // Check if users collection exists
            try {
                await databases.getCollection(DATABASE_ID, USERS_COLLECTION_ID);
                console.log(`✅ Collection '${USERS_COLLECTION_ID}' found`);
            } catch (collError) {
                if (collError.code === 404) {
                    console.log(`⚠️  Collection '${USERS_COLLECTION_ID}' not found. Creating it...`);
                    
                    // Create users collection
                    const collection = await databases.createCollection(
                        DATABASE_ID,
                        USERS_COLLECTION_ID,
                        USERS_COLLECTION_ID
                    );
                    console.log(`✅ Collection '${USERS_COLLECTION_ID}' created`);

                    // Create attributes
                    await databases.createStringAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'name', 255, true);
                    await databases.createStringAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'email', 255, true);
                    await databases.createStringAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'role', 50, true);
                    await databases.createStringAttribute(DATABASE_ID, USERS_COLLECTION_ID, 'createdAt', 255, false);
                    
                    console.log('✅ Collection attributes created');
                    
                    // Wait a bit for attributes to be ready
                    await new Promise(resolve => setTimeout(resolve, 2000));
                } else {
                    throw collError;
                }
            }

            // Try to create new profile
            const userProfile = await databases.createDocument(
                DATABASE_ID,
                USERS_COLLECTION_ID,
                userId, // Use same ID as auth user
                {
                    name: ADMIN_NAME,
                    email: ADMIN_EMAIL,
                    role: 'admin',
                    createdAt: new Date().toISOString()
                }
            );
            console.log(`✅ User profile created with admin role`);
            console.log(`   Document ID: ${userProfile.$id}\n`);
        } catch (error) {
            if (error.code === 409) {
                // Document already exists, update it
                console.log('⚠️  User profile already exists, updating to admin role...');
                const updatedProfile = await databases.updateDocument(
                    DATABASE_ID,
                    USERS_COLLECTION_ID,
                    userId,
                    {
                        role: 'admin'
                    }
                );
                console.log(`✅ User profile updated to admin role`);
                console.log(`   Document ID: ${updatedProfile.$id}\n`);
            } else {
                throw error;
            }
        }

        console.log('🎉 Admin user creation completed successfully!\n');
        console.log('📝 Admin credentials:');
        console.log(`   Email: ${ADMIN_EMAIL}`);
        console.log(`   Password: ${ADMIN_PASSWORD}`);
        console.log(`   Role: admin\n`);
        console.log('🔐 You can now login at: http://localhost:5173/?admin=true\n');

    } catch (error) {
        console.error('❌ Error creating admin user:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
        process.exit(1);
    }
}

// Run the script
createAdminUser();
