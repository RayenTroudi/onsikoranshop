// Test script for Appwrite email function
const testOrderData = {
  orderNumber: 'TEST-' + Date.now(),
  userId: 'test-user-123',
  customerInfo: {
    name: 'Test Customer',
    email: 'rayentroudi00@gmail.com', // Using your email for testing
    phone: '+216 12345678',
    address: '123 Test Street',
    city: 'Tunis',
    postalCode: '1000',
    governorate: 'Tunis',
    country: 'Tunisia'
  },
  items: [
    {
      id: 'test-product-1',
      name: 'Quranic Verses Box',
      price: 69,
      quantity: 2,
      total: 138
    }
  ],
  subtotal: 138,
  total: 138,
  status: 'pending',
  createdAt: new Date().toISOString(),
  timestamp: Date.now()
};

async function testEmailFunction() {
  console.log('🧪 Testing Appwrite Email Function...\n');
  
  const functionEndpoint = 'https://fra.cloud.appwrite.io/v1';
  const projectId = '69319f7f003127073ff3';
  const functionId = '6931cddd003de76af6ea';
  
  const functionUrl = `${functionEndpoint}/functions/${functionId}/executions`;
  
  console.log('📍 Function URL:', functionUrl);
  console.log('📦 Sending order data:\n', JSON.stringify(testOrderData, null, 2), '\n');
  
  try {
    const response = await fetch(functionUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Appwrite-Project': projectId
      },
      body: JSON.stringify({
        body: JSON.stringify(testOrderData),
        async: false
      })
    });
    
    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', Object.fromEntries(response.headers.entries()));
    
    const result = await response.json();
    console.log('\n✅ Function execution result:\n', JSON.stringify(result, null, 2));
    
    if (result.status === 'failed') {
      console.error('\n❌ FUNCTION FAILED');
      console.error('Response body:', result.responseBody);
      console.error('Logs:', result.logs);
      console.error('Errors:', result.errors);
    } else if (result.status === 'completed') {
      console.log('\n✅ SUCCESS! Function completed successfully');
      console.log('Response:', result.responseBody);
      console.log('\n📧 Check your email at: rayentroudi00@gmail.com');
      console.log('📧 Admin email should be sent to: onsmaitii@gmail.com');
    } else {
      console.log('\n⏳ Function status:', result.status);
      console.log('Duration:', result.duration, 'seconds');
    }
    
  } catch (error) {
    console.error('\n❌ Test failed with error:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testEmailFunction();
