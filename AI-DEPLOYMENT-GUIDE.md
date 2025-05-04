# Vembi AI Assistant Deployment Guide

This guide covers deploying the Vembi AI Assistant feature to Vercel. The AI assistant provides intelligent responses to questions about inventory, assemblies, components, and other aspects of the Vembi system.

## Prerequisites

1. A Vercel account (https://vercel.com)
2. A Google AI API key for Gemini 2.0 Flash (https://ai.google.dev/)
3. A Pinecone account for vector database (https://www.pinecone.io/)

## Environment Variables

When deploying to Vercel, you'll need to set up the following environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `GOOGLE_API_KEY` | Your Google AI API key | `AIzaSyB...` |
| `PINECONE_API_KEY` | Your Pinecone API key | `abc123...` |
| `PINECONE_ENVIRONMENT` | Pinecone environment | `gcp-starter` |
| `PINECONE_INDEX_NAME` | Name of your Pinecone index | `vembi-knowledge-base` |
| `VERCEL_URL` | Automatically set by Vercel | (leave blank) |

## Setting Up Pinecone

1. Sign up for a Pinecone account if you don't already have one
2. Create a new index with the following settings:
   - Name: `vembi-knowledge-base` (or your preferred name)
   - Dimensions: `768` (for Gemini embeddings)
   - Metric: `cosine`
   - Pod Type: Starter (for development) or Standard (for production)

## Deployment Steps

1. Push your code to a GitHub repository
2. Log in to Vercel and create a new project
3. Select your GitHub repository
4. Configure the build settings:
   - Framework Preset: Next.js
   - Build Command: Default
   - Output Directory: Default
5. Add the environment variables listed above
6. Deploy the project

## Post-Deployment

After deployment, you'll need to:

1. Test the AI assistant from the admin panel
2. Upload some knowledge documents through the interface
3. Verify that the AI can answer questions about inventory and documents

## Troubleshooting

If you encounter issues:

1. Check Vercel logs for any errors
2. Verify that environment variables are set correctly
3. Make sure your Google AI API key has sufficient quota and permissions
4. Ensure your Pinecone index is created with the correct dimensions

## Production Considerations

For production environments:

1. Consider implementing rate limiting to prevent excessive API usage
2. Set up monitoring and logging for AI requests
3. Implement document storage in a database instead of in-memory storage
4. Use a more robust vector database configuration with Pinecone

## Updating the Deployment

To update the AI feature:

1. Push your changes to the GitHub repository
2. Vercel will automatically redeploy your application
3. Verify the changes in the deployed environment

---

For any questions or issues, please contact the development team. 