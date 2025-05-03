// This is a simple test script to create an assembly directly
import { PrismaClient } from './node_modules/.prisma/client-custom/index.js';
const prisma = new PrismaClient();

async function testAssemblyCreation() {
  try {
    console.log('Testing direct assembly creation...');
    
    // Find a product to use
    const product = await prisma.product.findFirst();
    if (!product) {
      console.error('No products found in database');
      return;
    }
    
    // Find a user to use as assembler
    const user = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    if (!user) {
      console.error('No admin users found in database');
      return;
    }
    
    // Create a test assembly with notes field only
    const testAssembly = await prisma.assembly.create({
      data: {
        productId: product.id,
        serialNumber: `TEST-${Date.now()}`,
        assembledById: user.id,
        status: 'IN_PROGRESS',
        notes: 'Test funder information',
        startTime: new Date(),
      }
    });
    
    console.log('Successfully created test assembly:', testAssembly);
    
  } catch (error) {
    console.error('Error creating test assembly:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAssemblyCreation(); 