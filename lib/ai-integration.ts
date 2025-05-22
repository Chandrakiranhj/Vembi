import * as bomTools from './ai-bom-tools';
import * as dbHelpers from './ai-db-helpers';
import { searchDocuments } from './ai-document-store';
import { prisma } from './prisma';

/**
 * AI Assistant integration for inventory, BOM, and production management
 * This module brings together all the different tools to provide a unified interface
 */

// Product mappings for quick reference
const PRODUCT_MAPPINGS: Record<string, { name: string; searchTerms: string[] }> = {
  'hexis': { name: 'Hexis', searchTerms: ['hexis'] },
  'iris': { name: 'Iris', searchTerms: ['iris'] }
};

// Helper function to detect product mentions in queries
export async function detectProductsInQuery(query: string): Promise<string[]> {
  const lowerQuery = query.toLowerCase();
  const mentionedProducts: string[] = [];
  
  // Check for product mentions
  for (const [productId, product] of Object.entries(PRODUCT_MAPPINGS)) {
    if (product.searchTerms.some((term: string) => lowerQuery.includes(term))) {
      mentionedProducts.push(productId);
    }
  }
  
  // If no specific products found but query suggests all products, return both
  if (mentionedProducts.length === 0 && 
      (lowerQuery.includes('all product') || 
       lowerQuery.includes('both product') || 
       lowerQuery.includes('each product'))) {
    return Object.keys(PRODUCT_MAPPINGS);
  }
  
  return mentionedProducts;
}

// Helper to extract quantity numbers from text
function extractQuantity(text: string): number | null {
  // Look for number patterns followed by units or production-related terms
  const patterns = [
    /(\d+)\s*(units?|pieces?|products?|assemblies)/i,
    /make\s*(\d+)/i,
    /produce\s*(\d+)/i,
    /build\s*(\d+)/i,
    /assemble\s*(\d+)/i,
    /(\d+)\s*(more)/i,
    /(\d+)$/
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match && match[1]) {
      return parseInt(match[1], 10);
    }
  }
  
  // Default quantity if no specific number found
  return null;
}

// Function to get product IDs from names
async function getProductIdsByNames(productNames: string[]): Promise<{id: string, name: string, modelNumber: string}[]> {
  try {
    // Simple approach to find products by name
    return await prisma.product.findMany({
      where: {
        name: {
          in: productNames.map(name => PRODUCT_MAPPINGS[name]?.name || name),
          mode: 'insensitive'
        }
      },
      select: {
        id: true,
        name: true,
        modelNumber: true
      }
    });
  } catch (error) {
    console.error('Error finding products by names:', error);
    return [];
  }
}

// Define capabilities by category for the AI assistant
export const capabilities = {
  inventory: {
    getSummary: dbHelpers.getInventorySummary,
    getComponentDetails: dbHelpers.getComponentDetails,
  },
  bom: {
    getProductBOM: bomTools.getProductBOM,
    calculateProductionEstimate: bomTools.calculateProductionEstimate,
    checkInventoryForProduction: bomTools.checkInventoryForProduction,
    simulateProductionRun: bomTools.simulateProductionRun,
    getComponentInventory: bomTools.getComponentInventory,
    calculateMaterialRequirements: bomTools.calculateMaterialRequirements,
  },
  assembly: {
    getDetails: async (assemblyId: string) => {
      try {
        const assembly = await prisma.assembly.findUnique({
          where: { id: assemblyId },
          include: {
            product: true,
            assembledBy: true,
            assemblyComponentBatches: {
              include: {
                component: true,
                stockBatch: {
                  include: {
                    vendor: true,
                  },
                },
              },
            },
          },
        });
    
        if (!assembly) {
          throw new Error(`Assembly with ID ${assemblyId} not found`);
        }
    
        return {
          id: assembly.id,
          serialNumber: assembly.serialNumber,
          status: assembly.status,
          startTime: assembly.startTime,
          completionTime: assembly.completionTime || undefined,
          product: {
            id: assembly.product.id,
            name: assembly.product.name,
            modelNumber: assembly.product.modelNumber,
          },
          components: assembly.assemblyComponentBatches.map(acb => ({
            id: acb.component.id,
            name: acb.component.name,
            sku: acb.component.sku,
            quantity: acb.quantityUsed,
            batch: {
              id: acb.stockBatch.id,
              batchNumber: acb.stockBatch.batchNumber,
              vendor: acb.stockBatch.vendor.name,
            },
          })),
        };
      } catch (error) {
        console.error('Error retrieving assembly details:', error);
        throw new Error('Failed to retrieve assembly information');
      }
    },
    getRecentAssemblies: async (limit = 20) => {
      try {
        const assemblies = await prisma.assembly.findMany({
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            product: true,
          },
        });
    
        return assemblies.map(assembly => ({
          id: assembly.id,
          serialNumber: assembly.serialNumber,
          product: assembly.product.name,
          modelNumber: assembly.product.modelNumber,
          status: assembly.status,
          startTime: assembly.startTime,
          completionTime: assembly.completionTime || undefined,
        }));
      } catch (error) {
        console.error('Error retrieving recent assemblies:', error);
        throw new Error('Failed to retrieve assembly list');
      }
    },
    getAssembliesByStatus: async (status: "IN_PROGRESS" | "PASSED_QC" | "FAILED_QC" | "SHIPPED", limit = 50) => {
      try {
        const assemblies = await prisma.assembly.findMany({
          where: { status },
          take: limit,
          orderBy: { createdAt: 'desc' },
          include: {
            product: true,
          },
        });
    
        return assemblies.map(assembly => ({
          id: assembly.id,
          serialNumber: assembly.serialNumber,
          product: assembly.product.name,
          modelNumber: assembly.product.modelNumber,
          startTime: assembly.startTime,
          completionTime: assembly.completionTime || undefined,
        }));
      } catch (error) {
        console.error(`Error retrieving assemblies with status ${status}:`, error);
        throw new Error('Failed to retrieve assembly list by status');
      }
    },
    getAssemblyCompletionRate: async (startDate?: Date, endDate?: Date) => {
      try {
        // Set date range or default to last 30 days
        const now = new Date();
        const thirty_days_ago = new Date(now);
        thirty_days_ago.setDate(now.getDate() - 30);
        
        const start = startDate || thirty_days_ago;
        const end = endDate || now;
        
        // Query assemblies within date range
        const assemblies = await prisma.assembly.findMany({
          where: {
            startTime: {
              gte: start,
              lte: end,
            },
          },
        });
        
        // Calculate metrics
        const total = assemblies.length;
        const completed = assemblies.filter(a => a.status === 'PASSED_QC').length;
        const failed = assemblies.filter(a => a.status === 'FAILED_QC').length;
        const inProgress = assemblies.filter(a => a.status === 'IN_PROGRESS').length;
        
        // Calculate completion rate
        const completionRate = total > 0 ? (completed / total) * 100 : 0;
        
        // Calculate average completion time (for completed assemblies only)
        const completedAssemblies = assemblies.filter(
          a => a.status === 'PASSED_QC' && a.completionTime
        );
        
        let totalHours = 0;
        completedAssemblies.forEach(assembly => {
          if (assembly.completionTime) {
            const durationMs = assembly.completionTime.getTime() - assembly.startTime.getTime();
            const durationHours = durationMs / (1000 * 60 * 60);
            totalHours += durationHours;
          }
        });
        
        const averageCompletionTime = completedAssemblies.length > 0 
          ? totalHours / completedAssemblies.length 
          : 0;
        
        return {
          total,
          completed,
          failed,
          inProgress,
          completionRate,
          averageCompletionTime,
        };
      } catch (error) {
        console.error('Error calculating assembly completion rate:', error);
        throw new Error('Failed to calculate assembly metrics');
      }
    },
  },
  production: {
    getMaxProductionCapacity: dbHelpers.getMaxProductionCapacity,
    getProductHistory: bomTools.getProductAssemblyHistory,
    
    // Calculate additional components needed for planned production
    calculateComponentsToOrder: async (productId: string, quantity: number) => {
      try {
        const materialRequirements = await bomTools.calculateMaterialRequirements(productId, quantity);
        
        // Filter for components with shortages
        const shortages = materialRequirements.requiredComponents
          .filter(component => component.shortage > 0)
          .map(component => ({
            id: component.id,
            name: component.name,
            sku: component.sku,
            required: component.required,
            available: component.available,
            shortage: component.shortage,
            // Recommend ordering slightly more than needed for safety margin
            recommendedOrderQuantity: Math.ceil(component.shortage * 1.1)
          }));
          
        return {
          product: materialRequirements.product,
          targetQuantity: quantity,
          shortages,
          hasShortages: shortages.length > 0,
          totalShortageItems: shortages.length,
        };
      } catch (error) {
        console.error('Error calculating components to order:', error);
        throw new Error('Failed to calculate required components');
      }
    }
  },
  search: {
    searchDocuments,
  }
};

// Production planning query handler
async function handleProductionPlanningQuery(query: string): Promise<{
  response: string;
  data?: unknown;
}> {
  try {
    // Extract mentioned products
    const mentionedProducts = await detectProductsInQuery(query);
    
    // If no products mentioned, ask for clarification
    if (mentionedProducts.length === 0) {
      return {
        response: "I can help with production planning for Hexis and Iris products. Which product are you interested in?"
      };
    }
    
    // Extract target quantity
    const quantity = extractQuantity(query);
    const defaultQuantity = 10; // Default quantity if not specified
    
    // Get product IDs from names
    const products = await getProductIdsByNames(mentionedProducts);
    
    // Collect results for all mentioned products
    const planningResults = [];
    
    for (const product of products) {
      // If query is about production capacity
      if (query.includes('capacity') || query.includes('can produce') || 
          query.includes('can make') || query.includes('can build')) {
        
        const estimate = await bomTools.calculateProductionEstimate(product.id);
        planningResults.push(estimate);
      }
      // If query is about required components or ordering
      else if (query.includes('order') || query.includes('need') || 
               query.includes('restock') || query.includes('purchase') ||
               query.includes('buy') || query.includes('get')) {
        
        const componentsToOrder = await capabilities.production.calculateComponentsToOrder(
          product.id, 
          quantity || defaultQuantity
        );
        planningResults.push(componentsToOrder);
      }
      // Otherwise provide general production info
      else {
        const estimate = await bomTools.calculateProductionEstimate(product.id);
        const materialsData = await bomTools.calculateMaterialRequirements(
          product.id, 
          quantity || estimate.maxProducible || defaultQuantity
        );
        planningResults.push({
          productInfo: estimate,
          materialsNeeded: materialsData
        });
      }
    }
    
    // Generate appropriate response based on collected data
    let responseMessage = '';
    
    if (planningResults.length === 1) {
      const result = planningResults[0];
      
      // Check what kind of result we have
      if ('maxProducible' in result) {
        responseMessage = `Based on current inventory, you can produce ${result.maxProducible} units of ${result.name}`;
        if (result.limitingComponents.length > 0) {
          responseMessage += `. Limiting components: ${result.limitingComponents.join(', ')}`;
        }
      } 
      else if ('hasShortages' in result) {
        const targetQty = result.targetQuantity || defaultQuantity;
        if (result.hasShortages) {
          responseMessage = `To produce ${targetQty} units of ${result.product.name}, you need to order these components: `;
          result.shortages.forEach(item => {
            responseMessage += `\n- ${item.name} (${item.sku}): ${item.recommendedOrderQuantity} units (current shortage: ${item.shortage})`;
          });
        } else {
          responseMessage = `You have sufficient inventory to produce ${targetQty} units of ${result.product.name} without ordering additional components.`;
        }
      }
    } 
    else if (planningResults.length > 1) {
      responseMessage = "Production planning for multiple products:\n\n";
      
      for (let i = 0; i < planningResults.length; i++) {
        const result = planningResults[i];
        const product = products[i];
        
        responseMessage += `${product.name} (${product.modelNumber}):\n`;
        
        if ('maxProducible' in result) {
          responseMessage += `- Can produce up to ${result.maxProducible} units with current inventory\n`;
          if (result.limitingComponents.length > 0) {
            responseMessage += `- Limiting components: ${result.limitingComponents.join(', ')}\n`;
          }
        } 
        else if ('hasShortages' in result) {
          const targetQty = result.targetQuantity || defaultQuantity;
          if (result.hasShortages) {
            responseMessage += `- To produce ${targetQty} units, order these components:\n`;
            result.shortages.forEach(item => {
              responseMessage += `  • ${item.name}: ${item.recommendedOrderQuantity} units\n`;
            });
          } else {
            responseMessage += `- You have sufficient inventory to produce ${targetQty} units\n`;
          }
        }
        
        responseMessage += '\n';
      }
    }
    
    return {
      response: responseMessage || "I've analyzed the production requirements for the requested products.",
      data: planningResults
    };
  } catch (error) {
    console.error('Error handling production planning:', error);
    return {
      response: "I encountered an error while analyzing production requirements. Please try a more specific query."
    };
  }
}

// Main function to process AI assistant queries about inventory and production
export async function processProductionQuery(query: string): Promise<{
  response: string;
  data?: unknown;
}> {
  try {
    // Basic intent detection
    const lowerQuery = query.toLowerCase();
    
    // Production planning intent
    if (lowerQuery.includes('plan') || 
        lowerQuery.includes('produce') || 
        lowerQuery.includes('make') || 
        lowerQuery.includes('build') || 
        lowerQuery.includes('assemble') || 
        lowerQuery.includes('order') || 
        lowerQuery.includes('need to get') ||
        lowerQuery.includes('capacity')) {
      return await handleProductionPlanningQuery(query);
    }
    
    // Handle different types of queries
    if (lowerQuery.includes('inventory') || lowerQuery.includes('stock')) {
      const inventory = await dbHelpers.getInventorySummary();
      return {
        response: "Here's the current inventory summary",
        data: inventory
      };
    }
    
    if (lowerQuery.includes('bom') || lowerQuery.includes('bill of materials')) {
      // Try to identify product from the query
      const mentionedProducts = await detectProductsInQuery(query);
      
      if (mentionedProducts.length > 0) {
        const products = await getProductIdsByNames(mentionedProducts);
        
        if (products.length > 0) {
          const bomResults = await Promise.all(
            products.map(product => bomTools.getProductBOM(product.id))
          );
          
          if (products.length === 1) {
            return {
              response: `Here's the BOM for ${products[0].name}:`,
              data: bomResults[0]
            };
          } else {
            return {
              response: `Here are the BOMs for the requested products:`,
              data: products.map((product, i) => ({
                product: product.name,
                bom: bomResults[i]
              }))
            };
          }
        }
      }
      
      // If we couldn't identify products
      return {
        response: "I can provide bill of materials for Hexis and Iris products. Which one are you interested in?"
      };
    }
    
    if (lowerQuery.includes('assembly') || lowerQuery.includes('assemblies')) {
      const recentAssemblies = await capabilities.assembly.getRecentAssemblies();
      return {
        response: "Here are the most recent assemblies",
        data: recentAssemblies
      };
    }
    
    // Default fallback
    return {
      response: "I can help you with inventory, BOM, assembly, and production planning. Please ask a specific question about these topics."
    };
  } catch (error) {
    console.error('Error processing production query:', error);
    return {
      response: "I encountered an error while processing your query. Please try again or rephrase your question."
    };
  }
}

// Export a unified interface for the AI assistant
export default {
  capabilities,
  processQuery: processProductionQuery
}; 