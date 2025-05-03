// API Health Check script to test the assemblies API directly
import { PrismaClient } from './node_modules/.prisma/client-custom/index.js';
const prisma = new PrismaClient();

async function assembliesApiTest() {
  try {
    console.log('Starting API simulation test for assemblies API...');
    
    // Direct database operation (similar to what the API does)
    console.log('\nTesting assembly creation via direct database access:');
    
    // 1. Find product and user for test
    const product = await prisma.product.findFirst();
    if (!product) {
      throw new Error('No products found');
    }
    
    const user = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    if (!user) {
      throw new Error('No admin users found');
    }
    
    console.log(`Using product: ${product.name} (${product.id})`);
    console.log(`Using user: ${user.name} (${user.id})`);
    
    // 2. Check if this product has BOM components
    const bomComponents = await prisma.productComponent.findMany({
      where: { productId: product.id },
      include: { component: true }
    });
    
    console.log(`Product has ${bomComponents.length} BOM components`);
    
    // 3. Create a test assembly with transaction (similar to API endpoint)
    const assemblyResult = await prisma.$transaction(async (tx) => {
      // Create assembly with notes containing funder info
      const testAssembly = await tx.assembly.create({
        data: {
          productId: product.id,
          serialNumber: `TEST-API-${Date.now()}`,
          assembledById: user.id,
          status: 'IN_PROGRESS',
          notes: 'Test funder information for API test',
          startTime: new Date(),
        }
      });
      
      return testAssembly;
    });
    
    console.log('\n===== ASSEMBLY CREATION SUCCESSFUL =====');
    console.log('Created test assembly:', assemblyResult);
    
    // 4. Check assembly component batch creation if needed
    if (bomComponents.length > 0) {
      console.log('\nThis product has BOM components that would require batch selection');
      console.log('For a full test of batch selection, use the batch test script');
    }
    
  } catch (error) {
    console.error('\n===== API SIMULATION ERROR =====');
    console.error('Error simulating API operation:', error);
  } finally {
    await prisma.$disconnect();
  }
}

assembliesApiTest(); 