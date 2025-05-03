import { PrismaClient } from '@prisma/client';

async function checkBatches() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking database health...');
    
    // 1. Check vendors
    const vendors = await prisma.vendor.findMany();
    console.log(`Found ${vendors.length} vendors`);
    
    if (vendors.length > 0) {
      console.log('First vendor:', vendors[0]);
    }
    
    // 2. Check components
    const components = await prisma.component.findMany({
      take: 5
    });
    console.log(`Found ${components.length} components`);
    
    if (components.length > 0) {
      console.log('First component:', components[0]);
    }
    
    // 3. Check batches and their relationships
    const batches = await prisma.stockBatch.findMany({
      include: {
        component: {
          select: {
            id: true,
            name: true,
            sku: true,
          },
        },
        vendor: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      take: 10
    });
    
    console.log(`Found ${batches.length} stock batches`);
    
    if (batches.length > 0) {
      console.log('First batch:', JSON.stringify(batches[0], null, 2));
    }
    
    // 4. Check for batches with null or missing vendor
    const invalidBatches = batches.filter(batch => !batch.vendorId || !batch.vendor);
    console.log(`Found ${invalidBatches.length} batches with missing vendor reference`);
    
    if (invalidBatches.length > 0) {
      console.log('Example of invalid batch:', JSON.stringify(invalidBatches[0], null, 2));
    }
    
    // 5. Get batches for a specific component 
    if (components.length > 0) {
      const componentId = components[0].id;
      const componentBatches = await prisma.stockBatch.findMany({
        where: { componentId },
        include: { vendor: true }
      });
      
      console.log(`Component ${components[0].name} (${componentId}) has ${componentBatches.length} batches`);
      
      if (componentBatches.length > 0) {
        console.log('First batch for this component:', JSON.stringify(componentBatches[0], null, 2));
      }
    }
    
  } catch (error) {
    console.error('Error checking batches:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBatches(); 