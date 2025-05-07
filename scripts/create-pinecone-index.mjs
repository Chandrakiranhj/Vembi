/**
 * Script to create Pinecone index for Vembi AI Assistant
 * 
 * This script creates the Pinecone index if it doesn't exist.
 * 
 * Run with: node scripts/create-pinecone-index.mjs
 */

import * as dotenv from 'dotenv';
import { Pinecone } from '@pinecone-database/pinecone';

// Load environment variables
dotenv.config();

async function createPineconeIndex() {
  console.log('=== Creating Pinecone Index ===');
  
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
    const indexes = await pinecone.listIndexes();
    
    const indexExists = indexes.some(index => index.name === indexName);
    
    if (indexExists) {
      console.log(`Index "${indexName}" already exists.`);
      return true;
    }
    
    // Create index
    console.log(`Creating index "${indexName}"...`);
    await pinecone.createIndex({
      name: indexName,
      dimension: 768, // Google Gemini embedding dimension
      metric: 'cosine',
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
    
    console.log('=== Pinecone index creation completed successfully ===');
    return true;
  } catch (error) {
    console.error('Error creating Pinecone index:', error);
    return false;
  }
}

// Run the script
createPineconeIndex()
  .then(success => {
    if (success) {
      console.log('✅ Pinecone index creation completed');
      process.exit(0);
    } else {
      console.log('❌ Pinecone index creation failed');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('Unexpected error:', error);
    process.exit(1);
  }); 