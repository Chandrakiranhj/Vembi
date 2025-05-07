# Pinecone Setup Guide for Vembi AI Assistant

This guide explains how to set up Pinecone as the vector database for the Vembi AI Assistant's knowledge base.

## What is Pinecone?

Pinecone is a vector database that enables efficient similarity search. In the context of the Vembi AI Assistant, it's used to store document embeddings for semantic search capabilities, allowing the AI to quickly find relevant information from uploaded knowledge documents.

## Prerequisites

1. A Pinecone account (free tier available)
2. Your Vembi application environment variables configured

## Step 1: Create a Pinecone Account

1. Visit [https://www.pinecone.io/](https://www.pinecone.io/)
2. Sign up for a free account
3. Verify your email address

## Step 2: Create an Index

### Option 1: Manual Creation

1. Log in to your Pinecone dashboard
2. Click "Create Index"
3. Configure your index with the following settings:
   - **Name:** `vembi-knowledge-base` (or another name of your choice)
   - **Dimensions:** `768` (IMPORTANT: Must be exactly 768 for Google Gemini embeddings)
   - **Metric:** `cosine`
   - **Pod Type:** `Serverless` (recommended for most use cases)
4. Click "Create Index"

### Option 2: Using the Provided Script

We've created a script to automatically create the Pinecone index:

1. Make sure you have your Pinecone API key
2. Set up your environment variables (see Step 4)
3. Run the script:
   ```
   node scripts/create-pinecone-index.mjs
   ```
4. The script will check if the index exists and create it if needed

### Option 3: Recreate Index with Correct Dimensions

If you're experiencing dimension mismatch errors, use this script to recreate the index with the correct dimensions:

1. Make sure your environment variables are set up
2. Run the script:
   ```
   node scripts/recreate-pinecone-index.mjs
   ```
3. This will delete the existing index and create a new one with the correct dimension (768)

## Step 3: Get Your API Key

1. In the Pinecone dashboard, go to API Keys
2. Copy your API key
3. Note your environment name (visible in the dashboard)

## Step 4: Configure Vembi Environment Variables

Add the following environment variables to your Vembi application:

```env
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_environment_name (e.g., us-east-1, gcp-starter)
PINECONE_INDEX_NAME=vembi-knowledge-base
```

### For Development

1. Add these variables to your `.env.local` file
2. Restart your development server

### For Production

1. Add these variables to your hosting platform (e.g., Vercel, Netlify)
2. Redeploy your application

## Step 5: Testing Your Setup

### Option 1: Using the Web Interface

1. Start your Vembi application
2. Navigate to the AI Assistant section
3. Look at the "Vector Search" status indicator:
   - **Green** means Pinecone is connected and working
   - **Red** means there's an issue with the connection
4. If there's an issue, click the "Retry" button to attempt reconnection

### Option 2: Using the Test Script

We've created a script to test the Pinecone connection:

1. Make sure your environment variables are set up
2. Run the script:
   ```
   node scripts/test-pinecone.mjs
   ```
3. The script will perform a complete test of the Pinecone integration

## Troubleshooting

### Common Issues

1. **API Key Issues**
   - Make sure your API key is correct and not expired
   - Check that the environment variable is properly set

2. **Index Not Found**
   - Verify that the index name matches exactly what you created in Pinecone
   - Run the `create-pinecone-index.mjs` script to create the index if needed

3. **Connection Errors**
   - Check your internet connection
   - Ensure your firewall isn't blocking connections to Pinecone
   - Verify that your Pinecone account is active

4. **Embedding Generation Errors**
   - Make sure your Google API key is correct and has access to the embedding API
   - Check the console logs for specific error messages

5. **Dimension Mismatch Errors**
   - If you see "Vector dimension X does not match the dimension of the index Y", run the `recreate-pinecone-index.mjs` script
   - Ensure your index is created with exactly 768 dimensions for Google Gemini embeddings

### Debugging

If you're experiencing issues with Pinecone integration:

1. Check the browser console for error messages
2. Look at the server logs for detailed error information
3. Use the "Retry" button in the UI to attempt reconnection
4. Run the test script to verify the connection
5. Ensure all environment variables are correctly set

## Advanced Configuration

### Document Chunking

For large documents, you may want to implement chunking to improve search quality:

1. Split documents into smaller chunks (e.g., paragraphs)
2. Generate embeddings for each chunk
3. Store each chunk in Pinecone with appropriate metadata

### Custom Embedding Models

If you want to use a different embedding model:

1. Update the `generateEmbedding` function in `ai-document-store.ts`
2. Ensure the vector dimension in Pinecone matches your model's output
   - Google Gemini embeddings: 768 dimensions
   - OpenAI embeddings: 1536 dimensions
   - Other models: Check the model's documentation

## Support

If you continue to experience issues with Pinecone integration, please contact support with the following information:

1. Error messages from the console
2. Output from the test script
3. Your Pinecone index configuration
4. Environment variables (excluding the actual API keys)

## Additional Resources

- [Pinecone Documentation](https://docs.pinecone.io/)
- [Embedding Models](https://docs.pinecone.io/guides/embeddings)
- [Vector Search Guide](https://docs.pinecone.io/guides/vector-search)

For additional help, please contact the development team. 