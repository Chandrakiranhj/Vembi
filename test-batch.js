// This is a test script to create an assembly with component batches
import { PrismaClient } from './node_modules/.prisma/client-custom/index.js';
const prisma = new PrismaClient();

async function testAssemblyWithBatch() {
  try {
    console.log('Testing assembly creation with batches...');
    
    // Find a product to use
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
      console.error('No products found in database');
      return;
    }
    
    console.log(`Using product: ${product.name} (${product.id})`);
    
    // Find an admin user
    const user = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (!user) {
      console.error('No admin users found in database');
      return;
    }
    
    console.log(`Using user: ${user.name} (${user.id})`);
    
    // Get first component from BOM if available
    if (product.bomComponents.length === 0) {
      console.error('Product has no BOM components');
      return;
    }
    
    const firstBomComponent = product.bomComponents[0];
    console.log(`Using BOM component: ${firstBomComponent.component.name} (${firstBomComponent.componentId})`);
    
    // Find a batch for this component
    const batch = await prisma.stockBatch.findFirst({
      where: { componentId: firstBomComponent.componentId },
      include: { component: true }
    });
    
    if (!batch) {
      console.error(`No batches found for component ${firstBomComponent.componentId}`);
      return;
    }
    
    console.log(`Using batch: ${batch.batchNumber} (${batch.id})`);
    
    // Create assembly within a transaction
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the assembly
      const assembly = await tx.assembly.create({
        data: {
          productId: product.id,
          serialNumber: `TEST-BATCH-${Date.now()}`,
          assembledById: user.id,
          status: 'IN_PROGRESS',
          notes: 'Test with batch creation',
          startTime: new Date(),
        }
      });
      
      console.log(`Created assembly: ${assembly.serialNumber} (${assembly.id})`);
      
      // 2. Create assembly component batch
      const assemblyComponentBatch = await tx.assemblyComponentBatch.create({
        data: {
          assemblyId: assembly.id,
          componentId: firstBomComponent.componentId,
          stockBatchId: batch.id,
          quantityUsed: 1,
        }
      });
      
      console.log(`Created assembly component batch: ${assemblyComponentBatch.id}`);
      
      // 3. Update stock batch quantity
      const updatedBatch = await tx.stockBatch.update({
        where: { id: batch.id },
        data: {
          currentQuantity: { decrement: 1 }
        }
      });
      
      console.log(`Updated batch quantity to: ${updatedBatch.currentQuantity}`);
      
      return { assembly, assemblyComponentBatch, updatedBatch };
    });
    
    console.log('Transaction completed successfully:', result);
    
  } catch (error) {
    console.error('Error in test:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAssemblyWithBatch(); 