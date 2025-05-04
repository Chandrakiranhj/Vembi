import { GoogleGenerativeAI, GenerativeModel, Content, Part } from '@google/generative-ai';
import { AI_CONFIG } from './ai-config';
import * as dbHelpers from './ai-db-helpers';

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

    // Convert the chat messages to the format expected by the Google AI API
    const formattedMessages: Content[] = processedMessages.map(msg => {
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
    // Product production capacity questions
    if (question.includes('how many') && 
        (question.includes('produce') || question.includes('production') || question.includes('make')) && 
        question.includes('current inventory')) {
      
      // Extract product name if mentioned
      const productMatches = question.match(/how many (\w+|\w+\s\w+) can/i);
      const productName = productMatches ? productMatches[1] : null;
      
      // Get production capacity data
      const capacityData = await dbHelpers.getMaxProductionCapacity();
      
      if (productName) {
        // Filter by product name if mentioned
        const matchedProduct = capacityData.find(p => 
          p.name.toLowerCase().includes(productName.toLowerCase())
        );
        
        if (matchedProduct) {
          return JSON.stringify(matchedProduct, null, 2);
        }
      }
      
      // Return all product capacity data
      return JSON.stringify(capacityData, null, 2);
    }
    
    // Component inventory questions
    if ((question.includes('inventory') || question.includes('stock')) && 
        question.includes('component')) {
      
      const inventoryData = await dbHelpers.getInventorySummary();
      return JSON.stringify(inventoryData, null, 2);
    }
    
    // Product and BOM questions
    if (question.includes('bom') || question.includes('bill of materials') || 
        (question.includes('product') && question.includes('component'))) {
      
      const productsData = await dbHelpers.getProductsWithBOM();
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
    
    // For general inventory questions, return summary data
    if (question.includes('inventory') || question.includes('stock')) {
      const inventoryData = await dbHelpers.getInventorySummary();
      return JSON.stringify(inventoryData, null, 2);
    }
    
    // If no specific data type is identified, return null
    return null;
  } catch (error) {
    console.error('Error getting relevant inventory data:', error);
    return null;
  }
} 