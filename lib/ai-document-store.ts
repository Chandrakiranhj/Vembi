import { Pinecone } from '@pinecone-database/pinecone';
import { AI_CONFIG } from './ai-config';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Simple in-memory document storage (for development)
// In production, these would be stored in the database
interface Document {
  id: string;
  title: string;
  content: string;
  type: string;
  uploadedAt: Date;
  metadata?: Record<string, unknown>;
}

// Vector data interface for Pinecone
interface VectorData {
  id: string;
  values: number[];
  metadata: {
    title: string;
    content: string;
    type: string;
    documentId: string;
  };
}

let documents: Document[] = [];

// Initialize Pinecone client (for vector search)
let pineconeClient: Pinecone | null = null;
let googleAI: GoogleGenerativeAI | null = null;

// Initialize the AI and vector database
function initializeServices() {
  try {
    // Initialize Google AI for embeddings
    if (!AI_CONFIG.googleApiKey || AI_CONFIG.googleApiKey === "your_google_api_key") {
      console.warn("Google AI API key not configured. Embeddings generation will not be available.");
      return null;
    }
    
    googleAI = new GoogleGenerativeAI(AI_CONFIG.googleApiKey);

    // Initialize Pinecone
    if (!AI_CONFIG.pineconeApiKey || AI_CONFIG.pineconeApiKey === "your_pinecone_api_key") {
      console.warn("Pinecone API key not configured. Vector search will not be available.");
      return null;
    }

    // Initialize Pinecone client
    pineconeClient = new Pinecone({
      apiKey: AI_CONFIG.pineconeApiKey,
    });

    return { pineconeClient, googleAI };
  } catch (error) {
    console.error('Error initializing services:', error);
    return null;
  }
}

// Generate embeddings for text using Google's Generative AI
async function generateEmbedding(text: string): Promise<number[] | null> {
  try {
    if (!googleAI) {
      initializeServices();
      if (!googleAI) return null;
    }

    const embeddingModel = googleAI.getGenerativeModel({ model: "embedding-001" });
    const result = await embeddingModel.embedContent(text);
    const embedding = result.embedding.values;
    
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    return null;
  }
}

// Get Pinecone index
async function getPineconeIndex() {
  try {
    if (!pineconeClient) {
      initializeServices();
      if (!pineconeClient) return null;
    }

    const indexName = AI_CONFIG.pineconeIndexName;
    return pineconeClient.Index(indexName);
  } catch (error) {
    console.error('Error getting Pinecone index:', error);
    return null;
  }
}

// Add document to Pinecone
async function addDocumentToPinecone(document: Document): Promise<boolean> {
  try {
    const index = await getPineconeIndex();
    if (!index) return false;

    // Generate embedding for document
    const embedding = await generateEmbedding(document.title + " " + document.content);
    if (!embedding) return false;

    // Prepare vector data
    const vectorData: VectorData = {
      id: document.id,
      values: embedding,
      metadata: {
        title: document.title,
        content: document.content,
        type: document.type,
        documentId: document.id
      }
    };

    // Upload to Pinecone
    await index.upsert([vectorData]);
    
    return true;
  } catch (error) {
    console.error('Error adding document to Pinecone:', error);
    return false;
  }
}

// Delete document from Pinecone
async function deleteDocumentFromPinecone(documentId: string): Promise<boolean> {
  try {
    const index = await getPineconeIndex();
    if (!index) return false;

    // Delete from Pinecone
    await index.deleteOne(documentId);
    
    return true;
  } catch (error) {
    console.error('Error deleting document from Pinecone:', error);
    return false;
  }
}

// Add a document to the store
export async function addDocument(
  title: string,
  content: string,
  type: string,
  metadata?: Record<string, unknown>
): Promise<{ document: Document; pineconeSuccess: boolean }> {
  try {
    // Create the document
    const document: Document = {
      id: `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      title,
      content,
      type,
      uploadedAt: new Date(),
      metadata,
    };

    // Add to in-memory store
    documents.push(document);

    // Add to Pinecone if available
    const pineconeSuccess = await addDocumentToPinecone(document);
    
    if (!pineconeSuccess) {
      console.warn('Document added to memory but not to vector database.');
    }

    return { document, pineconeSuccess };
  } catch (error) {
    console.error('Error adding document:', error);
    throw new Error('Failed to add document to store');
  }
}

// Search documents based on a query using vector search
export async function searchDocuments(query: string): Promise<Document[]> {
  try {
    // Try vector search first if available
    const index = await getPineconeIndex();
    const embedding = await generateEmbedding(query);
    
    if (index && embedding) {
      // Perform vector search
      const searchResults = await index.query({
        vector: embedding,
        topK: 5,
        includeMetadata: true
      });
      
      if (searchResults.matches && searchResults.matches.length > 0) {
        // Convert Pinecone results to documents
        return searchResults.matches
          .filter(match => match.metadata)
          .map(match => {
            const metadata = match.metadata as {
              title: string;
              content: string;
              type: string;
              documentId: string;
            };
            return {
              id: metadata.documentId,
              title: metadata.title,
              content: metadata.content,
              type: metadata.type,
              uploadedAt: new Date(), // We don't store this in Pinecone
            };
          });
      }
    }
    
    // Fallback to text search if vector search fails or isn't available
    console.log('Using fallback text search');
    const lowercaseQuery = query.toLowerCase();
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(lowercaseQuery) || 
      doc.content.toLowerCase().includes(lowercaseQuery)
    );
  } catch (error) {
    console.error('Error searching documents:', error);
    // Fallback to text search on error
    const lowercaseQuery = query.toLowerCase();
    return documents.filter(doc => 
      doc.title.toLowerCase().includes(lowercaseQuery) || 
      doc.content.toLowerCase().includes(lowercaseQuery)
    );
  }
}

// Get a document by ID
export function getDocument(id: string): Document | undefined {
  return documents.find(doc => doc.id === id);
}

// Delete a document by ID
export async function deleteDocument(id: string): Promise<boolean> {
  try {
    const initialLength = documents.length;
    documents = documents.filter(doc => doc.id !== id);
    
    // Delete from Pinecone if available
    await deleteDocumentFromPinecone(id);
    
    return documents.length < initialLength;
  } catch (error) {
    console.error('Error deleting document:', error);
    return false;
  }
}

// Get all documents
export function getAllDocuments(): Document[] {
  return [...documents]; // Return a copy to prevent mutation
}

// Get documents by type
export function getDocumentsByType(type: string): Document[] {
  return documents.filter(doc => doc.type === type);
}

// Initialize the document store
export function initializeDocumentStore() {
  // Initialize vector database and AI
  initializeServices();
  
  // Add some sample documents for testing
  if (process.env.NODE_ENV === 'development' && documents.length === 0) {
    addDocument(
      'Vembi Product Assembly Guide',
      'This guide explains how to assemble Vembi products. Start by ensuring all components are available...',
      'guide'
    );
    
    addDocument(
      'Quality Control Procedures',
      'All products must undergo a 5-point inspection process...',
      'procedure'
    );
  }
}

// For production: Implement document chunking, embedding generation, and vector storage
// These functions would be used when indexing documents for RAG 

// Check if Pinecone is available
export async function isPineconeAvailable(): Promise<boolean> {
  try {
    if (!pineconeClient) {
      initializeServices();
      if (!pineconeClient) return false;
    }
    
    // Attempt to get the index to verify connection
    const index = await getPineconeIndex();
    if (!index) return false;
    
    // Try a simple operation to ensure we can connect
    await index.describeIndexStats();
    
    return true;
  } catch (error) {
    console.error('Error checking Pinecone availability:', error);
    return false;
  }
} 