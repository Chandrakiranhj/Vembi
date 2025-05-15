import { ChatMessage } from './ai-service';
// Import dbHelpers only if needed for specific functionality
// import * as dbHelpers from './ai-db-helpers';
import { searchDocuments } from './ai-document-store';

/**
 * Advanced capabilities for the Vembi AI Assistant
 * This module extends the core AI functionality with more sophisticated features
 */

// Detect user intent from message content
export async function detectUserIntent(message: string): Promise<string> {
  const lowerMessage = message.toLowerCase();
  
  // Define intent patterns
  const intents = {
    inventoryQuery: /stock|inventory|available|how many|quantity|level/i,
    bomQuery: /bom|bill of materials|component requirement|recipe/i,
    navigationHelp: /how (to|do I) (navigate|find|access|get to)/i,
    productionCapacity: /capacity|produce|make|build|assemble|many products/i,
    defectQuery: /defect|quality|issue|problem|failure/i,
    documentSearch: /document|guide|manual|instruction|procedure/i,
    returnProcess: /return|repair|fix|broken|damaged/i,
    userHelp: /help|assistance|support|confused|lost/i,
    productQuery: /product|model/i,
    lowStockQuery: /low stock|running low|reorder|alert/i
  };
  
  // Match message against intent patterns
  for (const [intent, pattern] of Object.entries(intents)) {
    if (pattern.test(lowerMessage)) {
      return intent;
    }
  }
  
  return 'general';
}

// Generate contextual help based on detected intent
export async function generateContextualHelp(intent: string): Promise<string | null> {
  switch (intent) {
    case 'navigationHelp':
      return `
        Navigation Tips:
        - Use the sidebar menu to access different sections
        - The breadcrumb trail at the top shows your current location
        - Look for the "?" icon for contextual help on each page
        - The search bar at the top can help find specific items
      `;
    case 'userHelp':
      return `
        I can help you with:
        - Inventory questions and stock levels
        - BOM management and product assembly
        - Production capacity calculations
        - Quality control procedures
        - Document search and retrieval
        - Navigation assistance
        
        Try asking a specific question about any of these topics!
      `;
    default:
      return null;
  }
}

// Analyze inventory trends based on historical data
export async function analyzeInventoryTrends(componentId: string): Promise<string> {
  try {
    // This would connect to the database to get historical data for the specific component
    // Use the componentId to fetch real data from the database
    console.log(`Analyzing trends for component: ${componentId}`);
    
    // For now, we'll return a placeholder response
    return `
      Based on historical data for this component:
      - Usage has increased by 15% over the last 3 months
      - Current stock will last approximately 45 days at current usage rate
      - Recommended reorder point: When stock reaches 200 units
      - Typical lead time from vendors: 14-21 days
    `;
  } catch (error) {
    console.error('Error analyzing inventory trends:', error);
    return 'Unable to analyze inventory trends at this time.';
  }
}

// Predict potential production bottlenecks
export async function predictBottlenecks(): Promise<string> {
  try {
    // This would analyze inventory, BOM data, and usage patterns
    // For now, we'll return a placeholder response
    return `
      Potential bottlenecks detected:
      - Component C1001 is running low (5 days of stock remaining)
      - Component C2045 has had quality issues in recent batches
      - Vendor for Component C3112 has reported shipping delays
      
      Recommended actions:
      - Expedite order for Component C1001
      - Increase QC inspection for Component C2045
      - Consider alternative vendors for Component C3112
    `;
  } catch (error) {
    console.error('Error predicting bottlenecks:', error);
    return 'Unable to predict bottlenecks at this time.';
  }
}

// Provide step-by-step guidance for common tasks
export function getTaskGuidance(task: string): string {
  const taskGuides: Record<string, string> = {
    'create_assembly': `
      Creating a New Assembly:
      1. Navigate to Assembly > Create New
      2. Select the product from the dropdown menu
      3. The system will show required components based on the BOM
      4. Assign batch numbers for each component
      5. Click "Start Assembly" to begin the process
      6. Mark as "Complete" when assembly is finished
      7. Submit for QC inspection
    `,
    'add_component': `
      Adding a New Component:
      1. Navigate to Inventory > Components
      2. Click "Add New Component"
      3. Fill in the component details (name, SKU, description)
      4. Select component category and attributes
      5. Set minimum stock levels and reorder points
      6. Upload component image (optional)
      7. Click "Save" to add the component
    `,
    'report_defect': `
      Reporting a Quality Defect:
      1. Navigate to Quality Control > Report Defect
      2. Select defect type (component or assembly)
      3. Enter the component/assembly identifier
      4. Select defect category and severity
      5. Provide detailed description of the issue
      6. Upload photos of the defect (recommended)
      7. Submit the report
    `,
    'process_return': `
      Processing a Product Return:
      1. Navigate to Returns > New Return
      2. Enter customer information and product details
      3. Select return reason from dropdown
      4. Document condition of returned item
      5. Determine if repair is possible
      6. Create repair ticket or process refund
      7. Update inventory if item is returned to stock
    `
  };
  
  return taskGuides[task] || 'Task guidance not available.';
}

// Enhanced response generation with advanced context
export async function enhanceResponseContext(messages: ChatMessage[]): Promise<ChatMessage[]> {
  try {
    // Create a working copy of messages
    const enhancedMessages = [...messages];
    
    // Get the last user message
    const lastUserMessage = [...enhancedMessages]
      .reverse()
      .find(msg => msg.role === 'user');
      
    if (!lastUserMessage) return enhancedMessages;
    
    // Detect user intent
    const intent = await detectUserIntent(lastUserMessage.content);
    
    // Add contextual help if available
    const contextualHelp = await generateContextualHelp(intent);
    if (contextualHelp) {
      enhancedMessages.splice(enhancedMessages.length - 1, 0, {
        role: 'system',
        content: `Contextual help for user intent: ${contextualHelp}`
      });
    }
    
    // For production capacity queries, add more context about BOM and calculations
    if (intent === 'productionCapacity') {
      // Try to extract product name from query using more comprehensive patterns
      const productNamePatterns = [
        /how many (\w+|\w+\s\w+|[^?]+?) can/i,
        /capacity for (\w+|\w+\s\w+|[^?]+?)[^a-zA-Z]/i,
        /produce (\w+|\w+\s\w+|[^?]+?)[ \?\.,]/i,
        /(\w+|\w+\s\w+|[^?]+?) production/i,
        /(\w+|\w+\s\w+|[^?]+?) with current inventory/i,
        /make (\w+|\w+\s\w+|[^?]+?)[ \?\.,]/i,
        /assemble (\w+|\w+\s\w+|[^?]+?)[ \?\.,]/i,
        /build (\w+|\w+\s\w+|[^?]+?)[ \?\.,]/i,
        /produce (\d+|\d+\s+)(\w+|\w+\s\w+|[^?]+?)[ \?\.,]/i,
        /(\d+|\d+\s+)(\w+|\w+\s\w+|[^?]+?) with/i
      ];
      
      let productName = null;
      for (const pattern of productNamePatterns) {
        const match = lastUserMessage.content.match(pattern);
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
      
      let productionContext = "When calculating production capacity, consider:\n";
      productionContext += "1. Each product has specific component requirements defined in its BOM\n";
      productionContext += "2. Each component has a current available stock\n";
      productionContext += "3. For each component, divide its available stock by its quantity required per product\n";
      productionContext += "4. The component that allows for the least number of products is the limiting factor\n";
      productionContext += "5. The maximum production capacity is determined by this limiting component\n";
      
      if (productName) {
        productionContext += `\nThe user is asking about the product "${productName}". Focus your response on this specific product's production capacity.`;
      }
      
      enhancedMessages.splice(enhancedMessages.length - 1, 0, {
        role: 'system',
        content: `Production capacity context: ${productionContext}`
      });
      
      // Add bottleneck prediction
      const bottleneckPrediction = await predictBottlenecks();
      enhancedMessages.splice(enhancedMessages.length - 1, 0, {
        role: 'system',
        content: `Production bottleneck analysis: ${bottleneckPrediction}`
      });
      
      // Add clear guidance for interpreting the data
      enhancedMessages.splice(enhancedMessages.length - 1, 0, {
        role: 'system',
        content: `When you receive production capacity data in JSON format, look for:
1. The "maxProduction" field which tells you exactly how many units can be produced
2. The "limitingComponents" array which shows which components are constraining production
3. The "componentCapacities" array which shows how many units each component allows for

If asked about a specific number (like "can I produce 30 units?"), compare that number with maxProduction to give a clear yes/no answer.`
      });
    }
    
    // For BOM queries, add context about BOM structure
    if (intent === 'bomQuery') {
      let bomContext = "BOM (Bill of Materials) Structure:\n";
      bomContext += "1. Each product has a list of required components\n";
      bomContext += "2. Each component has a specified quantity needed for assembly\n";
      bomContext += "3. The BOM determines how many units can be produced with available inventory\n";
      bomContext += "4. Components can be shared across multiple product BOMs\n";
      
      enhancedMessages.splice(enhancedMessages.length - 1, 0, {
        role: 'system',
        content: `BOM context: ${bomContext}`
      });
    }
    
    // For inventory queries, add trend analysis and low stock information
    if (intent === 'inventoryQuery' || intent === 'lowStockQuery') {
      // Try to extract component name from query
      const componentMatches = lastUserMessage.content.match(/component[s]? (\w+|\w+\s\w+|[^?]+?)[ \?]/i) ||
                              lastUserMessage.content.match(/(\w+|\w+\s\w+|[^?]+?) component[s]?/i);
      
      const componentName = componentMatches ? componentMatches[1].trim() : null;
      
      if (componentName) {
        // Use the component name to get a component ID (simplified here for example)
        const componentId = `C${componentName.substring(0, 4).toUpperCase()}`;
        const trendAnalysis = await analyzeInventoryTrends(componentId);
        
        enhancedMessages.splice(enhancedMessages.length - 1, 0, {
          role: 'system',
          content: `Inventory trend analysis for ${componentName}: ${trendAnalysis}`
        });
      } else {
        // For general inventory queries
        enhancedMessages.splice(enhancedMessages.length - 1, 0, {
          role: 'system',
          content: `Inventory context: When responding about inventory, include information about total quantity, minimum required levels, and low stock alerts. For components that are low on stock, explain how this might impact production capacity.`
        });
      }
    }
    
    // For product queries, add context about product structure
    if (intent === 'productQuery') {
      // Try to extract product name from query
      const productMatches = lastUserMessage.content.match(/product[s]? (\w+|\w+\s\w+|[^?]+?)[ \?]/i) ||
                            lastUserMessage.content.match(/(\w+|\w+\s\w+|[^?]+?) product[s]?/i);
      
      const productName = productMatches ? productMatches[1].trim() : null;
      
      let productContext = "Product Information Structure:\n";
      productContext += "1. Each product has a unique model number and name\n";
      productContext += "2. Products have associated Bill of Materials (BOM) defining required components\n";
      productContext += "3. Production capacity is calculated based on BOM and available inventory\n";
      
      if (productName) {
        productContext += `\nThe user is asking about the product "${productName}". Focus your response on this specific product.`;
      }
      
      enhancedMessages.splice(enhancedMessages.length - 1, 0, {
        role: 'system',
        content: `Product context: ${productContext}`
      });
    }
    
    // Search for relevant documents
    const relevantDocs = await searchDocuments(lastUserMessage.content);
    if (relevantDocs.length > 0) {
      const docSummaries = relevantDocs.map(doc => 
        `Document: ${doc.title}\nSummary: ${doc.content.substring(0, 300)}...`
      ).join('\n\n');
      
      enhancedMessages.splice(enhancedMessages.length - 1, 0, {
        role: 'system',
        content: `Relevant documentation found:\n${docSummaries}`
      });
    }
    
    return enhancedMessages;
  } catch (error) {
    console.error('Error enhancing response context:', error);
    return messages;
  }
}

// Process user feedback to improve responses
export async function processUserFeedback(messageId: string, feedback: 'up' | 'down', userComment?: string): Promise<void> {
  try {
    // In a production system, this would store feedback in a database
    // to improve AI training and responses over time
    console.log(`Received ${feedback} feedback for message ${messageId}`);
    if (userComment) {
      console.log(`User comment: ${userComment}`);
    }
    
    // This would be expanded to include:
    // 1. Storing feedback in a database
    // 2. Periodic analysis of feedback patterns
    // 3. Adjustments to response strategies based on feedback
    // 4. Reporting on feedback metrics
  } catch (error) {
    console.error('Error processing user feedback:', error);
  }
}

// Generate personalized responses based on user role and history
export function personalizeResponse(response: string, userRole: string, userInteractions: Record<string, unknown>[]): string {
  // This is a placeholder for personalization logic
  // In a real implementation, this would:
  // 1. Adjust response detail based on user role (admin vs. regular user)
  // 2. Reference previous interactions
  // 3. Adapt to user's technical level
  // 4. Include relevant user-specific data
  
  let personalizedResponse = response;
  
  // Add role-specific information
  if (userRole === 'admin') {
    personalizedResponse += '\n\nAs an administrator, you have access to additional system features.';
  } else if (userRole === 'assembler') {
    personalizedResponse += '\n\nNote: Assembly records are automatically tracked in the system.';
  }
  
  // Use interaction history for personalization
  if (userInteractions.length > 0) {
    console.log(`Personalizing based on ${userInteractions.length} previous interactions`);
    // In a real implementation, would analyze interactions and adjust the response
  }
  
  return personalizedResponse;
}

// Export all advanced capabilities
export const advancedCapabilities = {
  detectUserIntent,
  generateContextualHelp,
  analyzeInventoryTrends,
  predictBottlenecks,
  getTaskGuidance,
  enhanceResponseContext,
  processUserFeedback,
  personalizeResponse
}; 