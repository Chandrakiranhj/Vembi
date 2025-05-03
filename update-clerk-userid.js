const { PrismaClient } = require('@prisma/client');

async function updateClerkUserId() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Updating Clerk user ID for admin account...');
    
    // Find the admin user by email
    const adminUser = await prisma.user.findFirst({
      where: { 
        email: 'chandrakiranhj@gmail.com',
        role: 'ADMIN'
      }
    });
    
    if (!adminUser) {
      console.error('Admin user not found in the database. Please run the seed script first.');
      return;
    }
    
    console.log('Found admin user:', adminUser);
    
    // Ask for the Clerk user ID
    const readline = require('readline').createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    readline.question('Enter your Clerk user ID (from Clerk dashboard): ', async (clerkUserId) => {
      if (!clerkUserId || clerkUserId.trim() === '') {
        console.error('You must provide a valid Clerk user ID.');
        readline.close();
        await prisma.$disconnect();
        return;
      }
      
      // Update the user with the provided Clerk user ID
      const updatedUser = await prisma.user.update({
        where: { id: adminUser.id },
        data: { userId: clerkUserId.trim() }
      });
      
      console.log('User updated successfully:', updatedUser);
      console.log('\nYou should now be able to sign in with your Clerk account and have admin permissions.');
      
      readline.close();
      await prisma.$disconnect();
    });
    
  } catch (error) {
    console.error('Error updating user:', error);
    await prisma.$disconnect();
  }
}

updateClerkUserId(); 