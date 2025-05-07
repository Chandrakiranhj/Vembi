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
let pineconeInitialized = false;
let pineconeInitError: string | null = null;

// Initialize the AI and vector database
function initializeServices() {
  try {
    // Initialize Google AI for embeddings
    if (!AI_CONFIG.googleApiKey || AI_CONFIG.googleApiKey === "") {
      console.warn("Google AI API key not configured. Embeddings generation will not be available.");
      return null;
    }
    
    googleAI = new GoogleGenerativeAI(AI_CONFIG.googleApiKey);

    // Initialize Pinecone
    if (!AI_CONFIG.pineconeApiKey || AI_CONFIG.pineconeApiKey === "") {
      pineconeInitError = "Pinecone API key not configured";
      console.warn("Pinecone API key not configured. Vector search will not be available.");
      return null;
    }

    if (!AI_CONFIG.pineconeEnvironment || AI_CONFIG.pineconeEnvironment === "") {
      pineconeInitError = "Pinecone environment not configured";
      console.warn("Pinecone environment not configured. Vector search will not be available.");
      return null;
    }

    if (!AI_CONFIG.pineconeIndexName || AI_CONFIG.pineconeIndexName === "") {
      pineconeInitError = "Pinecone index name not configured";
      console.warn("Pinecone index name not configured. Vector search will not be available.");
      return null;
    }

    // Initialize Pinecone client
    console.log("Initializing Pinecone with:", {
      apiKey: "REDACTED",
      environment: AI_CONFIG.pineconeEnvironment,
      indexName: AI_CONFIG.pineconeIndexName
    });

    pineconeClient = new Pinecone({
      apiKey: AI_CONFIG.pineconeApiKey,
    });

    pineconeInitialized = true;
    pineconeInitError = null;
    console.log("Pinecone client initialized successfully");
    
    return { pineconeClient, googleAI };
  } catch (error) {
    pineconeInitError = error instanceof Error ? error.message : "Unknown error initializing services";
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
      if (!pineconeClient) {
        console.warn("Failed to initialize Pinecone client");
        return null;
      }
    }

    const indexName = AI_CONFIG.pineconeIndexName;
    console.log(`Getting Pinecone index: ${indexName}`);
    
    const index = pineconeClient.Index(indexName);
    
    // Verify the index exists by making a simple call
    try {
      await index.describeIndexStats();
      console.log(`Successfully connected to Pinecone index: ${indexName}`);
      return index;
    } catch (indexError) {
      console.error(`Error connecting to Pinecone index ${indexName}:`, indexError);
      pineconeInitError = `Index error: ${indexError instanceof Error ? indexError.message : "Unknown index error"}`;
      return null;
    }
  } catch (error) {
    console.error('Error getting Pinecone index:', error);
    pineconeInitError = `Error getting index: ${error instanceof Error ? error.message : "Unknown error"}`;
    return null;
  }
}

// Add document to Pinecone
async function addDocumentToPinecone(document: Document): Promise<boolean> {
  try {
    const index = await getPineconeIndex();
    if (!index) {
      console.warn("Cannot add document to Pinecone: index not available");
      return false;
    }

    // Generate embedding for document
    const embedding = await generateEmbedding(document.title + " " + document.content);
    if (!embedding) {
      console.warn("Cannot add document to Pinecone: failed to generate embedding");
      return false;
    }

    console.log(`Generated embedding with ${embedding.length} dimensions for document: ${document.title}`);

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
    console.log(`Upserting document to Pinecone: ${document.id}`);
    await index.upsert([vectorData]);
    console.log(`Document successfully added to Pinecone: ${document.id}`);
    
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
    console.log(`Document successfully deleted from Pinecone: ${documentId}`);
    
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
      console.warn(`Document added to memory but not to Pinecone. Error: ${pineconeInitError || "Unknown error"}`);
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
    console.log(`Searching documents for query: "${query}"`);
    
    // Try vector search first if available
    const index = await getPineconeIndex();
    const embedding = await generateEmbedding(query);
    
    if (index && embedding) {
      console.log(`Using vector search with ${embedding.length} dimensions`);
      
      // Perform vector search
      const searchResults = await index.query({
        vector: embedding,
        topK: 5,
        includeMetadata: true
      });
      
      if (searchResults.matches && searchResults.matches.length > 0) {
        console.log(`Found ${searchResults.matches.length} matches in Pinecone`);
        
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
      } else {
        console.log('No matches found in vector search');
      }
    } else {
      console.log(`Falling back to text search. Pinecone available: ${!!index}, Embedding available: ${!!embedding}`);
      if (pineconeInitError) {
        console.log(`Pinecone error: ${pineconeInitError}`);
      }
    }
    
    // Fallback to text search if vector search fails or isn't available
    console.log('Using fallback text search');
    const lowercaseQuery = query.toLowerCase();
    const results = documents.filter(doc => 
      doc.title.toLowerCase().includes(lowercaseQuery) || 
      doc.content.toLowerCase().includes(lowercaseQuery)
    );
    console.log(`Found ${results.length} matches in text search`);
    return results;
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
  return documents;
}

// Get documents by type
export function getDocumentsByType(type: string): Document[] {
  return documents.filter(doc => doc.type === type);
}

// Initialize the document store (load documents from database or storage)
export function initializeDocumentStore() {
  // In a real application, this would load documents from a database
  // For now, we'll just initialize the services
  initializeServices();
  console.log('Document store initialized');
}

// For production: Implement document chunking, embedding generation, and vector storage
// These functions would be used when indexing documents for RAG 

// Check if Pinecone is available
export async function isPineconeAvailable(): Promise<boolean> {
  try {
    if (!pineconeClient) {
      initializeServices();
      if (!pineconeClient) {
        console.log("Pinecone client not initialized");
        return false;
      }
    }
    
    // Attempt to get the index to verify connection
    const index = await getPineconeIndex();
    if (!index) {
      console.log("Pinecone index not available");
      return false;
    }
    
    // Try a simple operation to ensure we can connect
    await index.describeIndexStats();
    console.log("Pinecone is available and connected");
    
    return true;
  } catch (error) {
    console.error('Error checking Pinecone availability:', error);
    return false;
  }
}

// Get Pinecone initialization status
export function getPineconeStatus(): { initialized: boolean; error: string | null } {
  return {
    initialized: pineconeInitialized,
    error: pineconeInitError
  };
} 