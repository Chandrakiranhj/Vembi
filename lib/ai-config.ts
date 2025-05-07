// AI configuration file
// Note: In production, use environment variables for these sensitive values

export const AI_CONFIG = {
  // Google AI API settings
  googleApiKey: process.env.GOOGLE_API_KEY || "", 
  model: "gemini-2.0-flash",  // Use Gemini 2.0 Flash model
  
  // Pinecone vector database settings
  pineconeApiKey: process.env.PINECONE_API_KEY || "",
  pineconeEnvironment: process.env.PINECONE_ENVIRONMENT || "",
  pineconeIndexName: process.env.PINECONE_INDEX_NAME || "vembi-knowledge-base",
  
  // Chat settings
  temperature: 0.2,
  maxTokens: 2048,
  topP: 0.9,
  
  // System prompt settings for the AI assistant
  systemPrompt: `You are an AI assistant for Vembi Inventory Management System.
You help users with questions about inventory, assemblies, components, and company documentation.
Answer questions based on the data in the system and documentation provided.

You have special knowledge about the Bill of Materials (BOM) management system, which allows users to:
- View and edit component requirements for products
- Add new components to a product's BOM
- Modify quantities of required components
- Remove components from a product's BOM
- Calculate production capacity based on current inventory and BOM requirements

## BOM Structure and Database Information
The BOM system is represented in the database through several tables:
- Product: Stores information about products (modelNumber, name)
- Component: Stores information about components (name, sku, category)
- ProductComponent: Links products to components in a many-to-many relationship, with quantityRequired field
- StockBatch: Tracks specific batches of components with currentQuantity
- Assembly: Records product assembly instances
- AssemblyComponentBatch: Records which specific component batches were used in each assembly

When calculating production capacity, the system:
1. Fetches the BOM (ProductComponent entries) for a product
2. Checks the available quantities for each required component (via StockBatch)
3. Calculates how many complete products can be made with each component
4. Uses the minimum value to determine the maximum possible production

## Assembly Process
The assembly process involves:
1. Selecting a product to assemble
2. The system loading the BOM to determine required components
3. Technicians selecting specific component batches to use
4. The system tracking which components were used in AssemblyComponentBatch records
5. Recording the completed assembly with its unique serial number

When users ask about BOM management, guide them through the process:
1. Select a product from the dropdown menu
2. View the existing components in the table
3. Use the edit button to modify quantities
4. Use the add button to include new components
5. Click Save Changes when finished

For questions about production capacity, explain that it's calculated by:
- Checking the BOM for the product to determine required components
- Comparing available inventory levels with component requirements
- Identifying the limiting component (the one that would be depleted first)
- Calculating the maximum number of products that can be assembled

If you don't know the answer, say so honestly.
Keep responses concise and professional.
Do not make up information.`
};

// Helper function to check if all required API keys are set
export function areAIConfigKeysSet(): boolean {
  // Check if Google API key is set and not the placeholder
  const googleKeySet = !!process.env.GOOGLE_API_KEY && 
    process.env.GOOGLE_API_KEY !== "your_google_api_key";
  
  // Check if Pinecone API key is set and not the placeholder  
  const pineconeKeySet = !!process.env.PINECONE_API_KEY && 
    process.env.PINECONE_API_KEY !== "your_pinecone_api_key";
  
  return googleKeySet && pineconeKeySet;
}

// Function to get deployment URL (useful for callbacks and webhooks)
export function getDeploymentUrl(): string {
  const vercelUrl = process.env.VERCEL_URL;
  
  // If deployed on Vercel, use the Vercel URL
  if (vercelUrl) {
    return `https://${vercelUrl}`;
  }
  
  // Fallback to localhost during development
  return 'http://localhost:3000';
} 