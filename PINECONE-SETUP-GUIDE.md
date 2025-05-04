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

1. Log in to your Pinecone dashboard
2. Click "Create Index"
3. Configure your index with the following settings:
   - **Name:** `vembi-knowledge-base` (or another name of your choice)
   - **Dimensions:** `768` (for Google Gemini embeddings)
   - **Metric:** `cosine`
   - **Pod Type:** `Serverless` (recommended for most use cases)
4. Click "Create Index"

## Step 3: Get Your API Key

1. In the Pinecone dashboard, go to API Keys
2. Copy your API key
3. Note your environment name (visible in the dashboard)

## Step 4: Configure Vembi Environment Variables

Add the following environment variables to your Vembi application:

```env
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_environment_name
PINECONE_INDEX_NAME=vembi-knowledge-base
```

### For Development

1. Add these variables to your `.env.local` file
2. Restart your development server

### For Production

1. Add these variables to your hosting platform (e.g., Vercel, Netlify)
2. Redeploy your application

## Step 5: Testing Your Setup

1. Start your Vembi application
2. Navigate to the AI Assistant section
3. Add a document through the Knowledge Documents tab
4. Verify in the Pinecone dashboard that vectors are being added to your index
5. Test vector search by asking a question related to your document

## Troubleshooting

### No Vectors in Pinecone

If documents aren't appearing in Pinecone:

1. Check your API key and environment variables
2. Verify the console for any errors
3. Ensure the Google AI API key is also properly configured

### Search Not Working

If vector search isn't returning expected results:

1. Check that embeddings are being generated successfully
2. Verify that the content is being properly indexed
3. Try adjusting the search query

## Additional Resources

- [Pinecone Documentation](https://docs.pinecone.io/)
- [Embedding Models](https://docs.pinecone.io/guides/embeddings)
- [Vector Search Guide](https://docs.pinecone.io/guides/vector-search)

For additional help, please contact the development team. 