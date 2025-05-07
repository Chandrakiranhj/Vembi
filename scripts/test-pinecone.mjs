/**
 * Test script to verify Pinecone connection
 * 
 * This script tests the connection to Pinecone and performs basic operations
 * to ensure the vector database is working correctly.
 * 
 * Run with: node scripts/test-pinecone.mjs
 */

import * as dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

// Load environment variables
dotenv.config();

async function testPinecone() {
  console.log('=== Testing Pinecone Connection ===');
  
  // Verify environment variables
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME || 'vembi-knowledge-base';
  
  if (!apiKey) {
    console.error('Error: PINECONE_API_KEY environment variable not set');
    process.exit(1);
  }
  
  console.log(`Using index: ${indexName}`);
  
  try {
    // Initialize Pinecone client
    console.log('Initializing Pinecone client...');
    const pinecone = new Pinecone({
      apiKey,
    });
    
    // Get the index
    console.log(`Getting index: ${indexName}...`);
    const index = pinecone.Index(indexName);
    
    // Test index stats
    console.log('Testing index stats...');
    const stats = await index.describeIndexStats();
    console.log('Index stats:', stats);
    
    // Create a test vector
    const testId = `test_vector_${Date.now()}`;
    const testVector = Array(768).fill(0).map(() => Math.random());
    
    // Upsert test vector
    console.log('Upserting test vector...');
    await index.upsert([{
      id: testId,
      values: testVector,
      metadata: {
        title: 'Test Document',
        content: 'This is a test document to verify Pinecone connection',
        type: 'test',
        documentId: testId
      }
    }]);
    
    // Query test vector
    console.log('Querying test vector...');
    const queryResult = await index.query({
      vector: testVector,
      topK: 1,
      includeMetadata: true
    });
    
    console.log('Query result:', queryResult);
    
    // Delete test vector
    console.log('Deleting test vector...');
    await index.deleteOne(testId);
    
    console.log('=== Pinecone test completed successfully ===');
    return true;
  } catch (error) {
    console.error('Error testing Pinecone:', error);
    return false;
  }
}

// Run the test
testPinecone()
  .then(success => {
    if (success) {
      console.log('✅ Pinecone connection is working correctly');
      process.exit(0);
    } else {
      console.log('❌ Pinecone connection test failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 