// Test script to call the local delete user API
async function testDeleteUser() {
    try {
        console.log('🧪 Testing delete user API...');
        
        // First, let's test if the API is accessible
        const healthResponse = await fetch('http://localhost:3001/api/status');
        const healthData = await healthResponse.json();
        console.log('✅ Server status:', healthData.message);
        
        // You would need to get a real admin token to test deletion
        // For now, let's just check if the endpoint exists
        const testResponse = await fetch('http://localhost:3001/api/auth/delete-user', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer test-token' // This will fail but shows endpoint exists
            },
            body: JSON.stringify({ 
                userId: 'test-user-id',
                userEmail: 'test@example.com' 
            })
        });
        
        console.log('📡 API Response Status:', testResponse.status);
        const responseData = await testResponse.text();
        console.log('📡 API Response:', responseData);
        
    } catch (error) {
        console.error('❌ API Test Error:', error.message);
    }
}

testDeleteUser(); 