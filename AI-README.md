# Vembi AI Assistant

The Vembi AI Assistant is an intelligent chatbot integrated into the Vembi Inventory Management & QC System. It provides real-time answers about inventory, assemblies, components, production capacity, and company documentation.

## Features

### Inventory Intelligence
- **Inventory Queries**: Ask about current stock levels and component availability
- **Production Planning**: Determine how many products can be produced with current inventory
- **Component Details**: Get detailed information about specific components, batches, and vendors

### Knowledge Base
- **Document Management**: Upload and manage company documents, manuals, and guides
- **Vector Search**: Semantic search powered by Pinecone vector database
- **RAG Implementation**: Retrieval-Augmented Generation for accurate, context-aware answers
- **Context-Aware Responses**: Get answers that incorporate both inventory data and knowledge documents

## Architecture

The AI Assistant is built using the following technologies:

- **Google Gemini 2.0 Flash**: Advanced large language model for natural language understanding
- **Google Embedding API**: For generating document embeddings
- **Next.js API Routes**: Server-side endpoints for AI interactions
- **Prisma ORM**: Database access layer for inventory data
- **Pinecone Vector Database**: Vector storage for document embeddings (for RAG)
- **React UI Components**: Clean, responsive interface for user interactions

## Using the AI Assistant

The AI Assistant is available to users with Admin role and can be accessed from the admin dashboard.

### Example Questions

You can ask questions like:
- "How many Model X can I produce with the current inventory?"
- "Which components are running low on stock?"
- "Tell me about the assembly process for Product Y."
- "What vendors supply component Z?"
- "What are our quality control procedures?"

### Document Management

To enhance the AI's knowledge:
1. Navigate to the "Knowledge Documents" tab
2. Click "Add Document"
3. Enter the title, select a document type, and paste or write the content
4. Click "Add Document" to save

The AI will automatically:
1. Generate embeddings for the document
2. Store the embeddings in Pinecone
3. Use these documents to provide context-aware answers

## Technical Implementation

The AI Assistant uses a hybrid approach:

1. **Direct Database Queries**: For inventory-related questions, it dynamically fetches data from the Prisma database
2. **Retrieval Augmented Generation (RAG)**: For document-related questions, it retrieves relevant documents using vector search and provides them as context to the AI

### Key Components

- `ai-service.ts`: Core service that interfaces with Google's Generative AI
- `ai-db-helpers.ts`: Database helper functions for inventory queries
- `ai-document-store.ts`: Document storage and vector search functionality
- `ChatUI.tsx`: User interface for the chat interaction
- `DocumentsManager.tsx`: Interface for managing knowledge documents

## Vector Search Implementation

The document search uses:
1. **Embedding Generation**: Documents are converted to vector embeddings using Google's Embedding API
2. **Vector Storage**: Embeddings are stored in Pinecone with document metadata
3. **Semantic Search**: User queries are converted to vectors and matched against document vectors
4. **Relevance Ranking**: Documents are ranked by similarity to the query

For detailed instructions on setting up Pinecone, see [PINECONE-SETUP-GUIDE.md](./PINECONE-SETUP-GUIDE.md).

## Development

To extend the AI assistant:

1. Add new database query functions in `ai-db-helpers.ts`
2. Enhance pattern matching in `getRelevantInventoryData()` in `ai-service.ts`
3. Add new document types in the DocumentsManager component
4. Modify the system prompt in `ai-config.ts` to improve AI behavior

## Deployment

For deployment instructions, see the [AI-DEPLOYMENT-GUIDE.md](./AI-DEPLOYMENT-GUIDE.md) file. 