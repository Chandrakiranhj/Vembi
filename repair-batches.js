// Script to repair batches with missing vendor references
const { PrismaClient } = require('@prisma/client');

async function repairBatches() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Starting batch repair...');
    
    // 1. First, check if we have a default vendor to use for repairs
    let defaultVendor = await prisma.vendor.findFirst({
      where: { name: 'Seed Data Supplier' }
    });
    
    // If no default vendor exists, create one
    if (!defaultVendor) {
      console.log('Creating default vendor for repairs...');
      defaultVendor = await prisma.vendor.create({
        data: {
          name: 'Seed Data Supplier',
          contactPerson: 'System Admin',
          email: 'system@vembi.com',
          phone: '123-456-7890',
          address: 'System Generated',
          notes: 'Default vendor created by repair script',
          isActive: true
        }
      });
      console.log(`Created default vendor with ID: ${defaultVendor.id}`);
    } else {
      console.log(`Using existing default vendor: ${defaultVendor.name} (ID: ${defaultVendor.id})`);
    }
    
    // 2. Find all batches with null or invalid vendorId
    console.log('Finding batches with missing vendor references...');
    const batchesWithIssues = await prisma.stockBatch.findMany({
      where: {
        OR: [
          { vendorId: null },
          { vendor: null }
        ]
      },
      include: {
        component: true
      }
    });
    
    console.log(`Found ${batchesWithIssues.length} batches with issues`);
    
    // 3. Repair batches by assigning the default vendor
    if (batchesWithIssues.length > 0) {
      console.log('Repairing batches...');
      
      for (const batch of batchesWithIssues) {
        console.log(`Repairing batch ${batch.batchNumber} for component ${batch.component?.name || 'Unknown'}`);
        
        await prisma.stockBatch.update({
          where: { id: batch.id },
          data: { vendorId: defaultVendor.id }
        });
      }
      
      console.log('Batch repair completed successfully');
    } else {
      console.log('No batches need repair');
    }
    
    // 4. Verify repairs by checking if there are still batches with issues
    const remainingIssues = await prisma.stockBatch.findMany({
      where: {
        OR: [
          { vendorId: null },
          { vendor: null }
        ]
      }
    });
    
    if (remainingIssues.length > 0) {
      console.log(`Warning: Still found ${remainingIssues.length} batches with issues after repair`);
    } else {
      console.log('All batches now have proper vendor references');
    }
    
    // 5. Count the total number of batches for verification
    const totalBatches = await prisma.stockBatch.count();
    console.log(`Total batches in database: ${totalBatches}`);
    
  } catch (error) {
    console.error('Error during batch repair:', error);
  } finally {
    await prisma.$disconnect();
  }
}

repairBatches(); 