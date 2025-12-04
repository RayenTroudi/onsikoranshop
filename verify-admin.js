/**
 * Verify Admin User Script
 * Checks if admin user exists and has correct role
 */

import { Client, Databases, Users } from 'node-appwrite';
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
const USERS_COLLECTION_ID = 'users';
const ADMIN_EMAIL = 'admin@gmail.com';

async function verifyAdmin() {
    console.log('🔍 Verifying admin user...\n');

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

        const users = new Users(client);
        const databases = new Databases(client);

        // Step 1: Find user account
        console.log('1️⃣ Checking user account...');
        const userList = await users.list([]);
        const adminUser = userList.users.find(u => u.email === ADMIN_EMAIL);
        
        if (!adminUser) {
            console.error(`❌ User account not found for email: ${ADMIN_EMAIL}`);
            process.exit(1);
        }
        
        console.log(`✅ User account found:`);
        console.log(`   User ID: ${adminUser.$id}`);
        console.log(`   Email: ${adminUser.email}`);
        console.log(`   Name: ${adminUser.name}\n`);

        // Step 2: Check user document in database
        console.log('2️⃣ Checking user document in database...');
        
        try {
            const userDoc = await databases.getDocument(
                DATABASE_ID,
                USERS_COLLECTION_ID,
                adminUser.$id
            );
            
            console.log(`✅ User document found:`);
            console.log(`   Document ID: ${userDoc.$id}`);
            console.log(`   Email: ${userDoc.email}`);
            console.log(`   Name: ${userDoc.name}`);
            console.log(`   Role: ${userDoc.role}`);
            console.log(`   Created: ${userDoc.createdAt || userDoc.$createdAt}\n`);
            
            if (userDoc.role === 'admin') {
                console.log('✅ User has ADMIN role!\n');
                console.log('🎉 Admin verification SUCCESSFUL!');
                console.log('🔐 You can login at: http://localhost:5173/?admin=true\n');
            } else {
                console.log(`❌ User role is '${userDoc.role}' instead of 'admin'\n`);
                console.log('🔧 Fixing role...');
                
                await databases.updateDocument(
                    DATABASE_ID,
                    USERS_COLLECTION_ID,
                    adminUser.$id,
                    { role: 'admin' }
                );
                
                console.log('✅ Role updated to admin!');
                console.log('🔐 You can now login at: http://localhost:5173/?admin=true\n');
            }
            
        } catch (docError) {
            if (docError.code === 404) {
                console.log('❌ User document NOT found in database!');
                console.log('🔧 Creating user document...\n');
                
                await databases.createDocument(
                    DATABASE_ID,
                    USERS_COLLECTION_ID,
                    adminUser.$id,
                    {
                        name: adminUser.name,
                        email: adminUser.email,
                        role: 'admin',
                        createdAt: new Date().toISOString()
                    }
                );
                
                console.log('✅ User document created with admin role!');
                console.log('🔐 You can now login at: http://localhost:5173/?admin=true\n');
            } else {
                throw docError;
            }
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', error.response);
        }
        process.exit(1);
    }
}

verifyAdmin();
