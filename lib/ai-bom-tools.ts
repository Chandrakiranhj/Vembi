import { prisma } from './prisma';

/**
 * AI Assistant tools for working with Bill of Materials (BOM), inventory management,
 * and production calculations
 */

// Types for BOM operations
export interface BOMComponent {
  componentId: string;
  name: string;
  sku: string;
  category: string;
  quantityRequired: number;
  available: number;
  sufficient: boolean;
}

export interface ProductionEstimate {
  productId: string;
  name: string;
  modelNumber: string;
  maxProducible: number;
  components: BOMComponent[];
  limitingComponents: string[];
}

// Get a complete BOM for a product with current inventory levels
export async function getProductBOM(productId: string): Promise<BOMComponent[]> {
  try {
    // Get the product BOM with current inventory information
    const productWithBOM = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        bomComponents: {
          include: {
            component: {
              include: {
                stockBatches: true
              }
            }
          }
        }
      }
    });

    if (!productWithBOM) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    // Calculate component availability
    return productWithBOM.bomComponents.map(entry => {
      const component = entry.component;
      const totalAvailable = component.stockBatches.reduce(
        (sum, batch) => sum + batch.currentQuantity, 0
      );
      
      return {
        componentId: component.id,
        name: component.name,
        sku: component.sku,
        category: component.category,
        quantityRequired: entry.quantityRequired,
        available: totalAvailable,
        sufficient: totalAvailable >= entry.quantityRequired
      };
    });
  } catch (error) {
    console.error('Error retrieving product BOM:', error);
    throw new Error('Failed to retrieve BOM information');
  }
}

// Calculate how many units of a product can be produced with current inventory
export async function calculateProductionEstimate(productId: string): Promise<ProductionEstimate> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        modelNumber: true,
        bomComponents: {
          include: {
            component: {
              include: {
                stockBatches: true
              }
            }
          }
        }
      }
    });

    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    // Calculate component availability and producible units
    const components = product.bomComponents.map(entry => {
      const component = entry.component;
      const totalAvailable = component.stockBatches.reduce(
        (sum, batch) => sum + batch.currentQuantity, 0
      );
      
      // How many products can be made with this component
      const canProduce = Math.floor(totalAvailable / entry.quantityRequired);
      
      return {
        componentId: component.id,
        name: component.name,
        sku: component.sku,
        category: component.category,
        quantityRequired: entry.quantityRequired,
        available: totalAvailable,
        sufficient: totalAvailable >= entry.quantityRequired,
        canProduce
      };
    });

    // Find the maximum number of units that can be produced
    const producibleUnits = components.length > 0 
      ? Math.min(...components.map(c => c.canProduce))
      : 0;

    // Identify limiting components
    const limitingComponents = components
      .filter(c => c.canProduce === producibleUnits && c.canProduce < 100) // Assuming 100 is a high threshold
      .map(c => c.name);

    return {
      productId: product.id,
      name: product.name,
      modelNumber: product.modelNumber,
      maxProducible: producibleUnits,
      components,
      limitingComponents
    };
  } catch (error) {
    console.error('Error calculating production estimate:', error);
    throw new Error('Failed to calculate production estimate');
  }
}

// Check inventory adequacy for a production run
export async function checkInventoryForProduction(
  productId: string, 
  quantity: number
): Promise<{ sufficient: boolean; shortages: BOMComponent[] }> {
  try {
    const bom = await getProductBOM(productId);
    
    // Check if we have enough components for the desired quantity
    const shortages = bom.filter(component => 
      component.available < (component.quantityRequired * quantity)
    );
    
    return {
      sufficient: shortages.length === 0,
      shortages
    };
  } catch (error) {
    console.error('Error checking inventory for production:', error);
    throw new Error('Failed to check inventory adequacy');
  }
}

// Simulate consuming inventory for a production run
export async function simulateProductionRun(
  productId: string, 
  quantity: number
): Promise<{ 
  success: boolean; 
  message: string; 
  remainingInventory?: BOMComponent[];
}> {
  try {
    // Check if we have enough inventory
    const inventoryCheck = await checkInventoryForProduction(productId, quantity);
    
    if (!inventoryCheck.sufficient) {
      return {
        success: false,
        message: `Insufficient inventory for production run of ${quantity} units. Shortages in: ${
          inventoryCheck.shortages.map(s => s.name).join(', ')
        }`
      };
    }
    
    // Get the BOM
    const bom = await getProductBOM(productId);
    
    // Calculate remaining inventory after simulated production
    const remainingInventory = bom.map(component => ({
      ...component,
      available: component.available - (component.quantityRequired * quantity)
    }));
    
    return {
      success: true,
      message: `Successfully simulated production of ${quantity} units.`,
      remainingInventory
    };
  } catch (error) {
    console.error('Error simulating production run:', error);
    throw new Error('Failed to simulate production run');
  }
}

// Get inventory levels for components
export async function getComponentInventory(componentIds?: string[]): Promise<{
  id: string;
  name: string;
  sku: string;
  totalQuantity: number;
  batches: {
    id: string;
    batchNumber: string;
    quantity: number;
    vendor: string;
    receivedDate: Date;
  }[];
}[]> {
  try {
    const components = await prisma.component.findMany({
      where: componentIds ? { id: { in: componentIds } } : undefined,
      include: {
        stockBatches: {
          include: {
            vendor: true
          }
        }
      }
    });
    
    return components.map(component => ({
      id: component.id,
      name: component.name,
      sku: component.sku,
      totalQuantity: component.stockBatches.reduce(
        (sum, batch) => sum + batch.currentQuantity, 0
      ),
      batches: component.stockBatches.map(batch => ({
        id: batch.id,
        batchNumber: batch.batchNumber,
        quantity: batch.currentQuantity,
        vendor: batch.vendor.name,
        receivedDate: batch.dateReceived
      }))
    }));
  } catch (error) {
    console.error('Error retrieving component inventory:', error);
    throw new Error('Failed to retrieve inventory information');
  }
}

// Calculate material requirements for a production plan
export async function calculateMaterialRequirements(
  productId: string,
  quantity: number
): Promise<{
  product: { id: string; name: string; modelNumber: string };
  requiredComponents: {
    id: string;
    name: string;
    sku: string;
    required: number;
    available: number;
    shortage: number;
    batches: { id: string; batchNumber: string; quantity: number }[];
  }[];
}> {
  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        modelNumber: true,
        bomComponents: {
          include: {
            component: {
              include: {
                stockBatches: true
              }
            }
          }
        }
      }
    });

    if (!product) {
      throw new Error(`Product with ID ${productId} not found`);
    }

    const requiredComponents = product.bomComponents.map(entry => {
      const component = entry.component;
      const totalRequired = entry.quantityRequired * quantity;
      const totalAvailable = component.stockBatches.reduce(
        (sum, batch) => sum + batch.currentQuantity, 0
      );
      
      return {
        id: component.id,
        name: component.name,
        sku: component.sku,
        required: totalRequired,
        available: totalAvailable,
        shortage: Math.max(0, totalRequired - totalAvailable),
        batches: component.stockBatches.map(batch => ({
          id: batch.id,
          batchNumber: batch.batchNumber,
          quantity: batch.currentQuantity
        }))
      };
    });

    return {
      product: {
        id: product.id,
        name: product.name,
        modelNumber: product.modelNumber
      },
      requiredComponents
    };
  } catch (error) {
    console.error('Error calculating material requirements:', error);
    throw new Error('Failed to calculate material requirements');
  }
}

// Get assembly history for a product
export async function getProductAssemblyHistory(
  productId: string,
  limit = 50
): Promise<{
  id: string;
  serialNumber: string;
  status: string;
  startTime: Date;
  completionTime?: Date;
  components: {
    name: string;
    sku: string;
    quantity: number;
    batchNumber: string;
  }[];
}[]> {
  try {
    const assemblies = await prisma.assembly.findMany({
      where: { productId },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        assemblyComponentBatches: {
          include: {
            component: true,
            stockBatch: true
          }
        }
      }
    });

    return assemblies.map(assembly => ({
      id: assembly.id,
      serialNumber: assembly.serialNumber,
      status: assembly.status,
      startTime: assembly.startTime,
      completionTime: assembly.completionTime || undefined,
      components: assembly.assemblyComponentBatches.map(acb => ({
        name: acb.component.name,
        sku: acb.component.sku,
        quantity: acb.quantityUsed,
        batchNumber: acb.stockBatch.batchNumber
      }))
    }));
  } catch (error) {
    console.error('Error retrieving assembly history:', error);
    throw new Error('Failed to retrieve assembly history');
  }
} 