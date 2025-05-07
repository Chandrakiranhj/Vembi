/**
 * Script to recreate Pinecone index with correct dimensions
 * 
 * This script deletes the existing index and creates a new one with the correct dimensions (768)
 * for Google Gemini embeddings.
 * 
 * Run with: node scripts/recreate-pinecone-index.mjs
 */

import * as dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

// Load environment variables
dotenv.config();

async function recreatePineconeIndex() {
  console.log('=== Recreating Pinecone Index ===');
  
  // Verify environment variables
  const apiKey = process.env.PINECONE_API_KEY;
  const indexName = process.env.PINECONE_INDEX_NAME || 'vembi-knowledge-base';
  
  if (!apiKey) {
    console.error('Error: PINECONE_API_KEY environment variable not set');
    process.exit(1);
  }
  
  console.log(`Using index name: ${indexName}`);
  
  try {
    // Initialize Pinecone client
    console.log('Initializing Pinecone client...');
    const pinecone = new Pinecone({
      apiKey,
    });
    
    // Check if index exists
    console.log('Checking if index exists...');
    const indexList = await pinecone.listIndexes();
    console.log('Available indexes:', indexList);
    
    // Check if our index exists in the returned object
    let indexExists = false;
    
    if (indexList && typeof indexList === 'object') {
      // Handle different possible response formats
      if (Array.isArray(indexList)) {
        const existingIndex = indexList.find(index => index.name === indexName);
        indexExists = !!existingIndex;
      } else if (indexList.indexes && Array.isArray(indexList.indexes)) {
        const existingIndex = indexList.indexes.find(index => index.name === indexName);
        indexExists = !!existingIndex;
      } else {
        // Check if the index name exists as a key or property
        indexExists = Object.keys(indexList).includes(indexName);
      }
    }
    
    if (indexExists) {
      console.log(`Index "${indexName}" exists. Deleting it...`);
      await pinecone.deleteIndex(indexName);
      console.log(`Index "${indexName}" deleted successfully.`);
      
      // Wait a bit to ensure the index is fully deleted
      console.log('Waiting for 10 seconds to ensure index is fully deleted...');
      await new Promise(resolve => setTimeout(resolve, 10000));
    }
    
    // Create new index with correct dimensions
    console.log(`Creating new index "${indexName}" with dimension 768...`);
    
    // Use serverless in us-east-1 region as per Pinecone's requirements
    console.log('Using serverless spec in AWS us-east-1 region');
    const indexSpec = {
      serverless: {
        cloud: 'aws',
        region: 'us-east-1'
      }
    };
    
    await pinecone.createIndex({
      name: indexName,
      dimension: 768, // Google Gemini embedding dimension
      metric: 'cosine',
      spec: indexSpec
    });
    
    console.log(`Index "${indexName}" created successfully.`);
    
    // Wait for index to be ready
    console.log('Waiting for index to be ready...');
    let isReady = false;
    let attempts = 0;
    const maxAttempts = 10;
    
    while (!isReady && attempts < maxAttempts) {
      attempts++;
      
      try {
        const indexDescription = await pinecone.describeIndex(indexName);
        isReady = indexDescription.status?.ready === true;
        
        if (isReady) {
          console.log('Index is ready!');
          console.log('Index details:', indexDescription);
          break;
        } else {
          console.log(`Waiting for index to be ready (attempt ${attempts}/${maxAttempts})...`);
          await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
        }
      } catch (error) {
        console.error(`Error checking index status (attempt ${attempts}/${maxAttempts}):`, error);
        await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds
      }
    }
    
    if (!isReady) {
      console.error(`Index did not become ready after ${maxAttempts} attempts.`);
      return false;
    }
    
    console.log('=== Pinecone index recreation completed successfully ===');
    return true;
  } catch (error) {
    console.error('Error recreating Pinecone index:', error);
    return false;
  }
}

// Run the script
recreatePineconeIndex()
  .then(success => {
    if (success) {
      console.log('✅ Pinecone index recreation completed');
      process.exit(0);
    } else {
      console.log('❌ Pinecone index recreation failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 