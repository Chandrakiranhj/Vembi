import { initializeDocumentStore } from './ai-document-store';

// Initialize AI services on application startup
export function initializeAI() {
  try {
    // Initialize document store (with sample docs in dev)
    initializeDocumentStore();
    
    console.log('✅ AI services initialized successfully');
  } catch (error) {
    console.error('❌ Error initializing AI services:', error);
  }
}

// Flag to prevent duplicate initialization
let initialized = false;

// Function to be called from the root layout
export function ensureAIInitialized() {
  if (!initialized) {
    initializeAI();
    initialized = true;
  }
} 