// Batch Selection API Test
import { PrismaClient } from './node_modules/.prisma/client-custom/index.js';
const prisma = new PrismaClient();

async function batchSelectionTest() {
  try {
    console.log('Starting batch selection API simulation test...');
    
    // 1. Find product with BOM components
    const product = await prisma.product.findFirst({
      include: {
        bomComponents: {
          include: {
            component: true
          }
        }
      }
    });
    
    if (!product) {
      throw new Error('No products found');
    }
    
    console.log(`Using product: ${product.name} (${product.id})`);
    
    if (product.bomComponents.length === 0) {
      throw new Error('Selected product has no BOM components');
    }
    
    // 2. Find an admin user
    const user = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (!user) {
      throw new Error('No admin users found');
    }
    
    console.log(`Using user: ${user.name} (${user.id})`);
    
    // 3. Get first component and find available batches
    const firstComponent = product.bomComponents[0];
    console.log(`Using component: ${firstComponent.component.name} (${firstComponent.componentId})`);
    
    // 4. Find available batches for this component
    const batches = await prisma.stockBatch.findMany({
      where: { 
        componentId: firstComponent.componentId,
        currentQuantity: { gt: 0 }
      },
      include: { 
        vendor: true,
        component: true
      },
      orderBy: { dateReceived: 'asc' }
    });
    
    if (batches.length === 0) {
      throw new Error(`No available batches for component ${firstComponent.component.name}`);
    }
    
    console.log(`Found ${batches.length} available batches for the component`);
    
    // 5. Select first batch
    const selectedBatch = batches[0];
    console.log(`Selected batch: ${selectedBatch.batchNumber} with ${selectedBatch.currentQuantity} units available`);
    console.log(`Vendor: ${selectedBatch.vendor.name}`);
    
    // 6. Simulate assembly creation transaction with batch selection
    const result = await prisma.$transaction(async (tx) => {
      // Create assembly
      const assembly = await tx.assembly.create({
        data: {
          productId: product.id,
          serialNumber: `TEST-BATCH-API-${Date.now()}`,
          assembledById: user.id,
          status: 'IN_PROGRESS',
          notes: 'Test batch API',
          startTime: new Date()
        }
      });
      
      // Quantity to use from batch
      const quantityToUse = Math.min(firstComponent.quantityRequired, selectedBatch.currentQuantity);
      
      // Create assembly component batch
      const assemblyComponentBatch = await tx.assemblyComponentBatch.create({
        data: {
          assemblyId: assembly.id,
          componentId: firstComponent.componentId,
          stockBatchId: selectedBatch.id,
          quantityUsed: quantityToUse
        }
      });
      
      // Update batch quantity
      const updatedBatch = await tx.stockBatch.update({
        where: { id: selectedBatch.id },
        data: { 
          currentQuantity: { decrement: quantityToUse } 
        }
      });
      
      return { assembly, assemblyComponentBatch, updatedBatch };
    });
    
    console.log('\n===== BATCH API SIMULATION SUCCESSFUL =====');
    console.log('Created assembly with batch:', result.assembly.id);
    console.log('Assembly component batch ID:', result.assemblyComponentBatch.id);
    console.log('Updated batch quantity:', result.updatedBatch.currentQuantity);
    
  } catch (error) {
    console.error('\n===== BATCH API SIMULATION ERROR =====');
    console.error('Error in batch selection test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

batchSelectionTest(); 