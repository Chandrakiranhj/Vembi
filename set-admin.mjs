import { PrismaClient } from '@prisma/client';
import readline from 'readline';

// Create a utility function to set a user as admin by email
async function setUserAsAdmin() {
  const prisma = new PrismaClient();
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  try {
    console.log('Set User as Admin Utility');
    console.log('------------------------');
    
    // First, list all users
    const users = await prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true
      },
      orderBy: {
        email: 'asc'
      }
    });
    
    console.log('\nExisting users:');
    if (users.length === 0) {
      console.log('No users found in the database.');
    } else {
      users.forEach((user, index) => {
        console.log(`${index + 1}. ${user.email} (${user.name}) - Role: ${user.role}`);
      });
    }
    
    // Check if admin email is already in the database
    const adminEmail = 'chandrakiranhj@gmail.com';
    const existingAdmin = users.find(user => user.email === adminEmail);
    
    if (existingAdmin) {
      if (existingAdmin.role === 'ADMIN') {
        console.log(`\nUser ${adminEmail} already has ADMIN role.`);
      } else {
        // Update the role to ADMIN
        const updatedUser = await prisma.user.update({
          where: { id: existingAdmin.id },
          data: { role: 'ADMIN' }
        });
        console.log(`\nUpdated ${updatedUser.email} role to ADMIN.`);
      }
      
      rl.close();
      return;
    }
    
    // Admin email not found, prompt for action
    rl.question(`\nAdmin email '${adminEmail}' not found in database. Create it? (y/n): `, async (answer) => {
      if (answer.toLowerCase() === 'y') {
        // Create a new admin user
        const newUser = await prisma.user.create({
          data: {
            userId: 'manual-admin-account', // This will be replaced when they sign in
            name: 'Administrator',
            email: adminEmail,
            role: 'ADMIN',
            image: null
          }
        });
        console.log(`\nCreated new admin user: ${newUser.email}`);
      } else {
        console.log('\nAction cancelled.');
      }
      rl.close();
    });
  } catch (error) {
    console.error('Error:', error);
    rl.close();
  } finally {
    await prisma.$disconnect();
  }
}

// Run the utility
setUserAsAdmin(); 