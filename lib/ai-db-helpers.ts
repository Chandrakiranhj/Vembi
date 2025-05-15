import { prisma } from './prisma';

/**
 * Database helper functions for AI assistant to query inventory and product data
 */

// Get inventory summary with quantities and availability
export async function getInventorySummary() {
  try {
    const components = await prisma.component.findMany({
      include: {
        stockBatches: true,
      },
    });

    return components.map(component => {
      const totalQuantity = component.stockBatches.reduce(
        (sum, batch) => sum + batch.currentQuantity, 
        0
      );
      
      const isLowStock = totalQuantity < component.minimumQuantity;
      
      return {
        id: component.id,
        name: component.name,
        sku: component.sku,
        category: component.category,
        totalQuantity,
        minimumQuantity: component.minimumQuantity,
        isLowStock,
        batches: component.stockBatches.map(batch => ({
          id: batch.id,
          batchNumber: batch.batchNumber,
          quantity: batch.currentQuantity,
          vendor: batch.vendorId,
          receivedDate: batch.dateReceived,
        })),
      };
    });
  } catch (error) {
    console.error('Error fetching inventory summary:', error);
    throw new Error('Failed to retrieve inventory data');
  }
}

// Get products with BOM information
export async function getProductsWithBOM() {
  try {
    const products = await prisma.product.findMany({
      include: {
        bomComponents: {
          include: {
            component: {
              include: {
                stockBatches: true,
              },
            },
          },
        },
      },
    });

    return products.map(product => {
      // Calculate the number of units that can be produced
      const componentCapacities = product.bomComponents.map(entry => {
        const totalStock = entry.component.stockBatches.reduce(
          (sum, batch) => sum + batch.currentQuantity, 
          0
        );
        return Math.floor(totalStock / entry.quantityRequired);
      });
      
      // Maximum production is limited by the least available component
      const maxProduction = componentCapacities.length > 0 
        ? Math.min(...componentCapacities) 
        : 0;
      
      return {
        id: product.id,
        name: product.name,
        modelNumber: product.modelNumber,
        maxProduction,
        components: product.bomComponents.map((entry, index) => {
          const totalStock = entry.component.stockBatches.reduce(
            (sum, batch) => sum + batch.currentQuantity, 
            0
          );
          
          return {
            id: entry.componentId,
            name: entry.component.name,
            quantityRequired: entry.quantityRequired,
            availableStock: totalStock,
            canProduce: componentCapacities[index],
          };
        }),
      };
    });
  } catch (error) {
    console.error('Error fetching products with BOM:', error);
    throw new Error('Failed to retrieve product data');
  }
}

// Calculate how many products can be produced with current inventory
export async function getMaxProductionCapacity(productId?: string) {
  try {
    // Get all products or a specific product
    const products = await prisma.product.findMany({
      ...(productId ? { where: { id: productId } } : {}),
      include: {
        bomComponents: {
          include: {
            component: {
              include: {
                stockBatches: true,
              },
            },
          },
        },
      },
    });

    return products.map(product => {
      // Calculate production capacity based on component availability
      const componentCapacities = product.bomComponents.map(entry => {
        const component = entry.component;
        const totalStock = component.stockBatches.reduce(
          (sum, batch) => sum + batch.currentQuantity, 
          0
        );
        
        // How many products can be made with this component
        return Math.floor(totalStock / entry.quantityRequired);
      });

      // Production capacity is limited by the least available component
      const maxProduction = componentCapacities.length > 0 
        ? Math.min(...componentCapacities) 
        : 0;

      // List limiting components (those that would be depleted first)
      const limitingComponents = product.bomComponents
        .filter((entry, index) => componentCapacities[index] === maxProduction && maxProduction > 0)
        .map(entry => ({
          name: entry.component.name,
          stock: entry.component.stockBatches.reduce(
            (sum, batch) => sum + batch.currentQuantity, 
            0
          ),
          required: entry.quantityRequired,
        }));

      return {
        id: product.id,
        name: product.name,
        modelNumber: product.modelNumber,
        maxProduction,
        limitingComponents,
        componentCapacities: product.bomComponents.map((entry, index) => ({
          component: entry.component.name,
          stock: entry.component.stockBatches.reduce(
            (sum, batch) => sum + batch.currentQuantity, 
            0
          ),
          required: entry.quantityRequired,
          canProduce: componentCapacities[index],
        })),
      };
    });
  } catch (error) {
    console.error('Error calculating production capacity:', error);
    throw new Error('Failed to calculate production capacity');
  }
}

// Get component details with vendor information
export async function getComponentDetails(componentId: string) {
  try {
    const component = await prisma.component.findUnique({
      where: { id: componentId },
      include: {
        stockBatches: {
          include: {
            vendor: true,
          },
        },
      },
    });

    if (!component) {
      throw new Error(`Component with ID ${componentId} not found`);
    }

    return {
      id: component.id,
      name: component.name,
      sku: component.sku,
      category: component.category,
      description: component.description,
      minimumQuantity: component.minimumQuantity,
      totalQuantity: component.stockBatches.reduce(
        (sum, batch) => sum + batch.currentQuantity, 
        0
      ),
      batches: component.stockBatches.map(batch => ({
        id: batch.id,
        batchNumber: batch.batchNumber,
        quantity: batch.currentQuantity,
        receivedDate: batch.dateReceived,
        vendor: {
          id: batch.vendor.id,
          name: batch.vendor.name,
          contactPerson: batch.vendor.contactPerson,
          email: batch.vendor.email,
        },
      })),
    };
  } catch (error) {
    console.error('Error fetching component details:', error);
    throw new Error('Failed to retrieve component details');
  }
}

// Get assembly information
export async function getAssemblyInformation(assemblyId?: string) {
  try {
    const products = await prisma.assembly.findMany({
      ...(assemblyId ? { where: { id: assemblyId } } : {}),
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

    return products.map(assembly => ({
      id: assembly.id,
      serialNumber: assembly.serialNumber,
      status: assembly.status,
      startTime: assembly.startTime,
      completionTime: assembly.completionTime,
      product: {
        id: assembly.product.id,
        name: assembly.product.name,
        modelNumber: assembly.product.modelNumber,
      },
      assembledBy: {
        id: assembly.assembledBy.id,
        name: assembly.assembledBy.name,
      },
      components: assembly.assemblyComponentBatches.map(acb => ({
        id: acb.component.id,
        name: acb.component.name,
        sku: acb.component.sku,
        quantityUsed: acb.quantityUsed,
        batch: {
          id: acb.stockBatch.id,
          batchNumber: acb.stockBatch.batchNumber,
          vendor: acb.stockBatch.vendor.name,
        },
      })),
    }));
  } catch (error) {
    console.error('Error fetching assembly information:', error);
    throw new Error('Failed to retrieve assembly information');
  }
}

// Get Defect Reports
export async function getDefectReports() {
  try {
    const defects = await prisma.defect.findMany({
      include: {
        component: true,
        reportedBy: true,
      },
    });

    return defects.map(defect => ({
      id: defect.id,
      component: defect.component.name,
      severity: defect.severity,
      status: defect.status,
      description: defect.description,
      resolution: defect.resolution,
      reportedBy: defect.reportedBy.name,
      createdAt: defect.createdAt,
      updatedAt: defect.updatedAt,
    }));
  } catch (error) {
    console.error('Error fetching defect reports:', error);
    throw new Error('Failed to retrieve defect reports');
  }
} 