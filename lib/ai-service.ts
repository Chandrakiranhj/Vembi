import { GoogleGenerativeAI, GenerativeModel, Content, Part } from '@google/generative-ai';
import { AI_CONFIG } from './ai-config';
import * as dbHelpers from './ai-db-helpers';
import { enhanceResponseContext } from './ai-advanced-capabilities';

// Initialize the Google AI client
let googleAI: GoogleGenerativeAI;
let model: GenerativeModel;

function initializeAI() {
  if (!AI_CONFIG.googleApiKey || AI_CONFIG.googleApiKey === "your_google_api_key") {
    throw new Error("Google AI API key not configured. Please set the GOOGLE_API_KEY environment variable.");
  }
  
  googleAI = new GoogleGenerativeAI(AI_CONFIG.googleApiKey);
  model = googleAI.getGenerativeModel({ model: AI_CONFIG.model });
}

// Chat message type
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Function to generate AI response based on the chat history
export async function generateResponse(
  messages: ChatMessage[],
  includeInventoryData: boolean = true
): Promise<string> {
  try {
    // Initialize AI if not already done
    if (!googleAI || !model) {
      initializeAI();
    }

    // Create a copy of messages to manipulate
    const processedMessages = [...messages];
    
    // Add system prompt if not present
    if (!processedMessages.some(msg => msg.role === 'system')) {
      processedMessages.unshift({
        role: 'system',
        content: AI_CONFIG.systemPrompt,
      });
    }

    // If requested, add inventory data to help with answering the question
    if (includeInventoryData) {
      const lastUserMessage = [...processedMessages]
        .reverse()
        .find(msg => msg.role === 'user');
      
      if (lastUserMessage) {
        const question = lastUserMessage.content.toLowerCase();
        
        // Determine which data to include based on the question
        const inventoryData = await getRelevantInventoryData(question);
        
        // Add inventory data as a system message right before the user's last question
        const userIndex = processedMessages.findIndex(msg => 
          msg.content === lastUserMessage.content && msg.role === 'user'
        );
        
        if (userIndex > 0 && inventoryData) {
          processedMessages.splice(userIndex, 0, {
            role: 'system',
            content: `Here is the relevant inventory data to help answer the question:\n${inventoryData}`,
          });
        }
      }
    }
    
    // Apply advanced capabilities to enhance the response context
    const enhancedMessages = await enhanceResponseContext(processedMessages);

    // Convert the chat messages to the format expected by the Google AI API
    const formattedMessages: Content[] = enhancedMessages.map(msg => {
      // Google AI uses 'model' instead of 'assistant' and doesn't have 'system'
      const role = msg.role === 'assistant' ? 'model' : 
                  (msg.role === 'system' ? 'user' : 'user');
      
      return {
        role,
        parts: [{ text: msg.content }] as Part[],
      };
    });

    // Generate the response
    const result = await model.generateContent({
      contents: formattedMessages,
      generationConfig: {
        temperature: AI_CONFIG.temperature,
        maxOutputTokens: AI_CONFIG.maxTokens,
        topP: AI_CONFIG.topP,
      },
    });

    // Extract and return the text from the response
    const response = result.response;
    return response.text();
  } catch (error) {
    console.error('Error generating AI response:', error);
    return "I'm having trouble connecting to the AI service. Please try again later or contact support if the issue persists.";
  }
}

// Helper function to get relevant inventory data based on the question
async function getRelevantInventoryData(question: string): Promise<string | null> {
  try {
    // Extract specific product name if mentioned (do this first to catch all product references)
    const productNamePatterns = [
      /(\w+|\w+\s\w+|[^?]+?) production/i,
      /produce (\w+|\w+\s\w+|[^?]+?)[ \?\.,]/i,
      /(\w+|\w+\s\w+|[^?]+?) with current inventory/i,
      /make (\w+|\w+\s\w+|[^?]+?)[ \?\.,]/i,
      /assemble (\w+|\w+\s\w+|[^?]+?)[ \?\.,]/i,
      /build (\w+|\w+\s\w+|[^?]+?)[ \?\.,]/i,
      /produce (\d+|\d+\s+)(\w+|\w+\s\w+|[^?]+?)[ \?\.,]/i,
      /(\d+|\d+\s+)(\w+|\w+\s\w+|[^?]+?) with/i
    ];
    
    let productName = null;
    for (const pattern of productNamePatterns) {
      const match = question.match(pattern);
      if (match) {
        // For patterns that match numbers + product name (e.g., "30 Hexis")
        if (match[2] && /^\d+$/.test(match[1].trim())) {
          productName = match[2].trim();
        } else {
          productName = match[1].trim();
        }
        break;
      }
    }
    
    // Clean up product name if it has trailing punctuation
    if (productName) {
      productName = productName.replace(/[\?\.,;:]$/, '').trim();
    }

    // Production capacity questions (detect if a specific production question was asked)
    if ((question.includes('how many') || question.includes('maximum') || question.includes('capacity') || 
         question.includes('can i produce') || question.includes('can we produce') || question.includes('possible to produce')) && 
        (question.includes('produce') || question.includes('production') || question.includes('make') || 
         question.includes('assemble') || question.includes('build')) || 
        (productName && (question.includes('inventory') || question.includes('stock') || question.includes('available')))) {
      
      // Get production capacity data for all products
      const capacityData = await dbHelpers.getMaxProductionCapacity();
      
      if (productName) {
        console.log(`Looking for production capacity for product: "${productName}"`);
        
        // Filter by product name if mentioned
        const matchedProduct = capacityData.find(p => 
          p.name.toLowerCase().includes(productName.toLowerCase()) ||
          p.modelNumber.toLowerCase().includes(productName.toLowerCase())
        );
        
        if (matchedProduct) {
          console.log(`Found product match: ${matchedProduct.name}`);
          return JSON.stringify(matchedProduct, null, 2);
        } else {
          console.log(`No product match found for: ${productName}`);
        }
      }
      
      // Return all product capacity data
      return JSON.stringify(capacityData, null, 2);
    }
    
    // BOM structure and assembly pattern questions
    if (question.includes('bom') || question.includes('bill of materials') ||
        question.includes('assembly structure') || question.includes('product structure') ||
        question.includes('how products are made') || question.includes('how assemblies are made') ||
        (question.includes('assemblies') && question.includes('made'))) {
      
      const productsData = await dbHelpers.getProductsWithBOM();
      
      // If a product name was detected, filter for that specific product
      if (productName) {
        const matchedProduct = productsData.find(p => 
          p.name.toLowerCase().includes(productName.toLowerCase()) ||
          p.modelNumber.toLowerCase().includes(productName.toLowerCase())
        );
        
        if (matchedProduct) {
          return JSON.stringify(matchedProduct, null, 2);
        }
      }
      
      return JSON.stringify(productsData, null, 2);
    }

    // Component inventory questions
    if ((question.includes('inventory') || question.includes('stock')) && 
        question.includes('component')) {
      
      // Extract component name if mentioned
      const componentMatches = question.match(/component[s]? (\w+|\w+\s\w+|[^?]+?)[ \?]/i) ||
                              question.match(/(\w+|\w+\s\w+|[^?]+?) component[s]?/i);
      
      const componentName = componentMatches ? componentMatches[1].trim() : null;
      
      const inventoryData = await dbHelpers.getInventorySummary();
      
      if (componentName) {
        // Filter by component name if mentioned
        const filteredData = inventoryData.filter(c => 
          c.name.toLowerCase().includes(componentName.toLowerCase()) || 
          c.sku.toLowerCase().includes(componentName.toLowerCase())
        );
        
        if (filteredData.length > 0) {
          return JSON.stringify(filteredData, null, 2);
        }
      }
      
      return JSON.stringify(inventoryData, null, 2);
    }
    
    // Product and BOM questions
    if (question.includes('bom') || question.includes('bill of materials') || 
        (question.includes('product') && question.includes('component'))) {
      
      // Extract product name if mentioned
      const productMatches = question.match(/product[s]? (\w+|\w+\s\w+|[^?]+?)[ \?]/i) ||
                            question.match(/(\w+|\w+\s\w+|[^?]+?) product[s]?/i);
      
      const productName = productMatches ? productMatches[1].trim() : null;
      
      const productsData = await dbHelpers.getProductsWithBOM();
      
      if (productName) {
        // Filter by product name if mentioned
        const matchedProduct = productsData.find(p => 
          p.name.toLowerCase().includes(productName.toLowerCase()) ||
          p.modelNumber.toLowerCase().includes(productName.toLowerCase())
        );
        
        if (matchedProduct) {
          return JSON.stringify(matchedProduct, null, 2);
        }
      }
      
      return JSON.stringify(productsData, null, 2);
    }
    
    // Assembly questions
    if (question.includes('assembly') || question.includes('assemblies')) {
      const assemblyData = await dbHelpers.getAssemblyInformation();
      return JSON.stringify(assemblyData, null, 2);
    }
    
    // Defect questions
    if (question.includes('defect') || question.includes('quality') || 
        question.includes('issue')) {
      
      const defectData = await dbHelpers.getDefectReports();
      return JSON.stringify(defectData, null, 2);
    }
    
    // Low stock questions
    if (question.includes('low stock') || question.includes('running low') || 
        question.includes('stock alert') || question.includes('reorder')) {
      
      const inventoryData = await dbHelpers.getInventorySummary();
      const lowStockItems = inventoryData.filter(item => item.isLowStock);
      
      if (lowStockItems.length > 0) {
        return JSON.stringify(lowStockItems, null, 2);
      }
      
      return JSON.stringify({message: "No components are currently low on stock."}, null, 2);
    }
    
    // For general inventory questions, return summary data
    if (question.includes('inventory') || question.includes('stock')) {
      const inventoryData = await dbHelpers.getInventorySummary();
      return JSON.stringify(inventoryData, null, 2);
    }
    
    // For general product questions
    if (question.includes('product') || question.includes('model')) {
      const productsData = await dbHelpers.getProductsWithBOM();
      return JSON.stringify(productsData, null, 2);
    }
    
    // If no specific data type is identified, return null
    return null;
  } catch (error) {
    console.error('Error getting relevant inventory data:', error);
    return null;
  }
} 