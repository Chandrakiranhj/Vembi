// Comprehensive test that mimics the frontend flow
import { PrismaClient } from './node_modules/.prisma/client-custom/index.js';
const prisma = new PrismaClient();

// Main test function to test the full assembly creation flow
async function testFullAssemblyFlow() {
  try {
    console.log('=== STARTING FULL ASSEMBLY FLOW TEST ===');
    
    // STEP 1: Find a product and user
    console.log('\n> Step 1: Fetching product and user');
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
      throw new Error('No products found in database');
    }
    
    const user = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (!user) {
      throw new Error('No admin users found in database');
    }
    
    console.log(`Product: ${product.name} (${product.id})`);
    console.log(`User: ${user.name} (${user.id})`);
    console.log(`BOM Components: ${product.bomComponents.length}`);
    
    // STEP 2: Get available batches for each component
    console.log('\n> Step 2: Finding batches for each component');
    
    const componentBatches = {};
    const selectedBatches = [];
    const quantity = 1; // Creating 1 assembly
    
    for (const bomComponent of product.bomComponents) {
      const component = bomComponent.component;
      console.log(`\nFinding batches for ${component.name} (${component.id})`);
      
      const batches = await prisma.stockBatch.findMany({
        where: { 
          componentId: component.id,
          currentQuantity: { gt: 0 }
        },
        include: {
          vendor: true
        },
        orderBy: { dateReceived: 'asc' }
      });
      
      console.log(`Found ${batches.length} available batches`);
      componentBatches[component.id] = batches;
      
      if (batches.length === 0) {
        console.warn(`No batches available for ${component.name}`);
        continue;
      }
      
      // Select first batch with enough quantity
      const requiredQuantity = bomComponent.quantityRequired * quantity;
      let quantityRemaining = requiredQuantity;
      
      for (const batch of batches) {
        if (quantityRemaining <= 0) break;
        
        const quantityToUse = Math.min(batch.currentQuantity, quantityRemaining);
        console.log(`Selecting ${quantityToUse} from batch ${batch.batchNumber}`);
        
        selectedBatches.push({
          componentId: component.id,
          batchId: batch.id,
          quantityUsed: quantityToUse
        });
        
        quantityRemaining -= quantityToUse;
      }
      
      if (quantityRemaining > 0) {
        console.warn(`Could not assign all required quantity for ${component.name}. Missing ${quantityRemaining}`);
      }
    }
    
    // STEP 3: Create assembly with selected batches
    console.log('\n> Step 3: Creating assembly with selected batches');
    console.log(`Selected ${selectedBatches.length} batches total`);
    
    // Prepare the data that would be sent from frontend
    const serialNumber = `TEST-FULL-${Date.now()}`;
    const notes = 'Funder: Test Funder Organization';
    
    console.log(`Serial Number: ${serialNumber}`);
    console.log(`Notes: ${notes}`);
    
    // Simulate the transaction directly
    console.log('\n> Step 4: Executing transaction');
    const result = await prisma.$transaction(async (tx) => {
      // Create assembly
      console.log('Creating assembly record...');
      const assembly = await tx.assembly.create({
        data: {
          productId: product.id,
          serialNumber,
          assembledById: user.id,
          status: 'IN_PROGRESS',
          notes,
          startTime: new Date()
        }
      });
      
      console.log(`Created assembly with ID: ${assembly.id}`);
      
      // Create component batch records
      console.log('Creating component batch records...');
      const assemblyComponentBatches = [];
      
      // Process batches in smaller chunks to avoid timeout
      const chunkSize = 5;
      for (let i = 0; i < selectedBatches.length; i += chunkSize) {
        const chunk = selectedBatches.slice(i, i + chunkSize);
        console.log(`Processing batch chunk ${i/chunkSize + 1} of ${Math.ceil(selectedBatches.length/chunkSize)}`);
        
        for (const selectedBatch of chunk) {
          console.log(`Processing batch for component ${selectedBatch.componentId}`);
          
          const assemblyComponentBatch = await tx.assemblyComponentBatch.create({
            data: {
              assemblyId: assembly.id,
              componentId: selectedBatch.componentId,
              stockBatchId: selectedBatch.batchId,
              quantityUsed: selectedBatch.quantityUsed
            }
          });
          
          assemblyComponentBatches.push(assemblyComponentBatch);
          
          // Update stock batch quantity
          await tx.stockBatch.update({
            where: { id: selectedBatch.batchId },
            data: {
              currentQuantity: {
                decrement: selectedBatch.quantityUsed
              }
            }
          });
        }
      }
      
      return { assembly, assemblyComponentBatches };
    }, {
      timeout: 30000 // Increase timeout to 30 seconds
    });
    
    console.log('\n=== TEST COMPLETED SUCCESSFULLY ===');
    console.log(`Created assembly: ${result.assembly.serialNumber} (${result.assembly.id})`);
    console.log(`Created ${result.assemblyComponentBatches.length} component batch records`);
    
  } catch (error) {
    console.error('\n=== TEST FAILED ===');
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the test
testFullAssemblyFlow(); 