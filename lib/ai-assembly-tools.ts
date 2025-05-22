import { prisma } from './prisma';

/**
 * AI Assistant tools for working with product assembly operations
 */

// Types for assembly operations
export interface AssemblyDetails {
  id: string;
  serialNumber: string;
  status: string;
  startTime: Date;
  completionTime?: Date;
  product: {
    id: string;
    name: string;
    modelNumber: string;
  };
  components: {
    id: string;
    name: string;
    sku: string;
    quantity: number;
    batch: {
      id: string;
      batchNumber: string;
      vendor: string;
    };
  }[];
}

// Get detailed assembly information
export async function getAssemblyDetails(assemblyId: string): Promise<AssemblyDetails> {
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
}

// Get recent assemblies with status information
export async function getRecentAssemblies(limit = 20): Promise<{
  id: string;
  serialNumber: string;
  product: string;
  modelNumber: string;
  status: string;
  startTime: Date;
  completionTime?: Date;
}[]> {
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
}

// Get assemblies by status
export async function getAssembliesByStatus(status: string, limit = 50): Promise<{
  id: string;
  serialNumber: string;
  product: string;
  modelNumber: string;
  startTime: Date;
  completionTime?: Date;
}[]> {
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
}

// Get components used in an assembly with batch details
export async function getAssemblyComponents(assemblyId: string): Promise<{
  componentId: string;
  name: string;
  sku: string;
  quantity: number;
  batchNumber: string;
  vendor: string;
  receivedDate: Date;
}[]> {
  try {
    const assemblyComponents = await prisma.assemblyComponentBatch.findMany({
      where: { assemblyId },
      include: {
        component: true,
        stockBatch: {
          include: {
            vendor: true,
          },
        },
      },
    });

    return assemblyComponents.map(acb => ({
      componentId: acb.component.id,
      name: acb.component.name,
      sku: acb.component.sku,
      quantity: acb.quantityUsed,
      batchNumber: acb.stockBatch.batchNumber,
      vendor: acb.stockBatch.vendor.name,
      receivedDate: acb.stockBatch.dateReceived,
    }));
  } catch (error) {
    console.error('Error retrieving assembly components:', error);
    throw new Error('Failed to retrieve assembly component details');
  }
}

// Calculate assembly completion rate
export async function getAssemblyCompletionRate(
  startDate?: Date, 
  endDate?: Date
): Promise<{
  total: number;
  completed: number;
  failed: number;
  inProgress: number;
  completionRate: number;
  averageCompletionTime: number; // in hours
}> {
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
}

// Find assemblies using a specific component batch
export async function findAssembliesUsingBatch(batchId: string): Promise<{
  id: string;
  serialNumber: string;
  product: string;
  modelNumber: string;
  status: string;
  quantityUsed: number;
  assemblyDate: Date;
}[]> {
  try {
    const usages = await prisma.assemblyComponentBatch.findMany({
      where: { stockBatchId: batchId },
      include: {
        assembly: {
          include: {
            product: true,
          },
        },
      },
    });

    return usages.map(usage => ({
      id: usage.assembly.id,
      serialNumber: usage.assembly.serialNumber,
      product: usage.assembly.product.name,
      modelNumber: usage.assembly.product.modelNumber,
      status: usage.assembly.status,
      quantityUsed: usage.quantityUsed,
      assemblyDate: usage.assembly.startTime,
    }));
  } catch (error) {
    console.error('Error finding assemblies using batch:', error);
    throw new Error('Failed to find assemblies using the specified batch');
  }
} 