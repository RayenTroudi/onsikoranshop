// Test script for ONSi Gmail SMTP function
import dotenv from 'dotenv';
dotenv.config();

const testEmailData = {
  to: 'onsmaitii@gmail.com',
  customerName: 'Ahmed Mohamed',
  orderNumber: 'ONS-TEST-' + Math.floor(Math.random() * 10000),
  orderDate: new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  }),
  totalAmount: 45.90,
  items: [
    {
      id: 1,
      name: 'ONSi Quranic Verses Box',
      price: 45.90,
      quantity: 1,
      total: 45.90,
      nameAr: 'صندوق آيات قرآنية أونسي'
    }
  ],
  shippingAddress: {
    firstName: 'Ahmed',
    lastName: 'Mohamed', 
    email: 'onsmaitii@gmail.com',
    phone: '+216 12 345 678',
    address: '123 Test Street',
    city: 'Tunis',
    governorate: 'Tunis',
    postalCode: '1000',
    country: 'Tunisia'
  }
};

// Mock request and response objects for local testing
const mockReq = {
  method: 'POST',
  body: testEmailData
};

const mockRes = {
  headers: {},
  json: (data, status) => {
    console.log('📧 Function Response:', JSON.stringify(data, null, 2));
    if (status) console.log('Status Code:', status);
    return mockRes;
  },
  send: (data, status) => {
    console.log('📤 Response:', data);
    if (status) console.log('Status Code:', status);
    return mockRes;
  }
};

// Mock Appwrite context
const mockContext = {
  req: mockReq,
  res: mockRes,
  log: (...args) => console.log('📋 LOG:', ...args),
  error: (...args) => console.error('❌ ERROR:', ...args)
};

async function testEmailFunction() {
  console.log('🧪 Testing ONSi Gmail SMTP Function Locally...\n');
  
  // Check environment variables
  const requiredEnvVars = ['SMTP_USERNAME', 'SMTP_PASSWORD', 'SUBMIT_EMAIL'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.log('❌ Missing environment variables:', missingVars);
    console.log('✅ Available variables:');
    console.log('SMTP_USERNAME:', process.env.SMTP_USERNAME);
    console.log('SUBMIT_EMAIL:', process.env.SUBMIT_EMAIL);
    console.log('SMTP_HOST:', process.env.SMTP_HOST || 'smtp.gmail.com');
    return;
  }
  
  console.log('✅ Environment variables loaded:');
  console.log('SMTP Username:', process.env.SMTP_USERNAME);
  console.log('Submit Email:', process.env.SUBMIT_EMAIL);
  console.log('SMTP Host:', process.env.SMTP_HOST || 'smtp.gmail.com');
  console.log('\n📋 Test Order Data:');
  console.log('Customer:', testEmailData.customerName);
  console.log('Email:', testEmailData.to);
  console.log('Order Number:', testEmailData.orderNumber);
  console.log('Total:', testEmailData.totalAmount, 'TND');
  console.log('\n🚀 Sending test emails...\n');
  
  try {
    // Import and test the email function
    const emailFunction = (await import('./src/main.js')).default;
    
    // Execute the function
    await emailFunction(mockContext);
    
    console.log('\n✅ Local test completed!');
    console.log('📧 Check your email inbox for test messages');
    
  } catch (error) {
    console.log('\n❌ Test failed:', error.message);
    console.log('Full error:', error);
  }
}

// Run the test
testEmailFunction();