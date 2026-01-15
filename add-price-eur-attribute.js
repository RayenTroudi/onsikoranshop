import { Client, Databases } from 'node-appwrite';

const client = new Client();
const databases = new Databases(client);

client
    .setEndpoint('https://fra.cloud.appwrite.io/v1')
    .setProject('69319f7f003127073ff3')
    .setKey(process.env.APPWRITE_API_KEY);

const DATABASE_ID = 'onsi';
const COLLECTION_ID = 'products';

async function addPriceEurAttribute() {
    try {
        console.log('🔧 Adding priceEur attribute to products collection...');
        
        // Add priceEur as float attribute, not required (so existing products won't break)
        await databases.createFloatAttribute(
            DATABASE_ID, 
            COLLECTION_ID, 
            'priceEur', 
            false  // Not required - existing products can have null
        );
        
        console.log('✅ Successfully added priceEur attribute!');
        console.log('⏳ Waiting for attribute to be available...');
        
        // Wait for attribute to be ready
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        console.log('✅ Attribute is now ready to use!');
        console.log('\n📝 Note: Existing products will have priceEur = null');
        console.log('   You can set the EUR prices through the admin panel.');
        
    } catch (error) {
        console.error('❌ Error adding attribute:', error);
        if (error.code === 409) {
            console.log('ℹ️  The priceEur attribute already exists!');
        }
    }
}

addPriceEurAttribute();
