// Simple health check script to verify database connection
import { PrismaClient } from './node_modules/.prisma/client-custom/index.js';
const prisma = new PrismaClient();

async function healthCheck() {
  try {
    // Check database connection
    console.log('Testing database connection...');
    
    // Fetch basic stats to verify database access
    const userCount = await prisma.user.count();
    const productCount = await prisma.product.count();
    const componentCount = await prisma.component.count();
    const vendorCount = await prisma.vendor.count();
    const assemblyCount = await prisma.assembly.count();
    const batchCount = await prisma.stockBatch.count();
    
    console.log('\n===== DATABASE CONNECTION SUCCESSFUL =====');
    console.log('Database Statistics:');
    console.log(`- Users: ${userCount}`);
    console.log(`- Products: ${productCount}`);
    console.log(`- Components: ${componentCount}`);
    console.log(`- Vendors: ${vendorCount}`);
    console.log(`- Assemblies: ${assemblyCount}`);
    console.log(`- Stock Batches: ${batchCount}`);
    
    // Check API routes by simulating a fetch
    console.log('\nSimulating API access...');
    console.log('Note: This would normally use fetch() to test API routes');
    console.log('For a complete test, please use browser network tab when running the app');
    
  } catch (error) {
    console.error('\n===== DATABASE CONNECTION ERROR =====');
    console.error('Error connecting to database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

healthCheck(); 