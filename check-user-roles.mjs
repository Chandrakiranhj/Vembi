import { PrismaClient } from '@prisma/client';

async function checkUsers() {
  const prisma = new PrismaClient();
  
  try {
    console.log('Checking users and roles...');
    
    // Get all users
    const users = await prisma.user.findMany();
    console.log(`Found ${users.length} users in the database:`);
    
    if (users.length === 0) {
      console.log('No users found in the database. You need to create a user first.');
    } else {
      // Display user details
      users.forEach((user, index) => {
        console.log(`\nUser #${index + 1}:`);
        console.log(`  ID: ${user.id}`);
        console.log(`  Name: ${user.name}`);
        console.log(`  Email: ${user.email}`);
        console.log(`  Role: ${user.role}`);
        console.log(`  Clerk User ID: ${user.userId}`);
        console.log(`  Created At: ${user.createdAt}`);
      });
      
      // Check if there are any ADMIN users
      const adminUsers = users.filter(user => user.role === 'ADMIN');
      if (adminUsers.length === 0) {
        console.log('\nWARNING: No users with ADMIN role found!');
      } else {
        console.log(`\nFound ${adminUsers.length} users with ADMIN role.`);
      }
      
      // Show other role counts
      const roleCounts = users.reduce((acc, user) => {
        acc[user.role] = (acc[user.role] || 0) + 1;
        return acc;
      }, {});
      
      console.log('\nUser role distribution:');
      Object.entries(roleCounts).forEach(([role, count]) => {
        console.log(`  ${role}: ${count} users`);
      });
    }
    
  } catch (error) {
    console.error('Error checking users:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Create an admin user if none exists
async function createAdminUser() {
  const prisma = new PrismaClient();
  
  try {
    // Check if admin user already exists
    const adminExists = await prisma.user.findFirst({
      where: { role: 'ADMIN' }
    });
    
    if (adminExists) {
      console.log('Admin user already exists:', adminExists.email);
      return;
    }
    
    // No admin users found, create one
    console.log('Creating a default admin user...');
    
    const newAdmin = await prisma.user.create({
      data: {
        userId: 'manual-created-admin-id', // This would normally be a Clerk user ID
        name: 'System Admin',
        email: 'admin@example.com',
        role: 'ADMIN',
        image: null
      }
    });
    
    console.log('Created new admin user:', newAdmin);
    console.log('\nIMPORTANT: This is a placeholder user. You should:');
    console.log('1. Sign up with Clerk authentication');
    console.log('2. Update this user\'s userId field with your actual Clerk user ID');
    console.log('3. Or create a new user through your app\'s normal signup flow and grant admin role');
    
  } catch (error) {
    console.error('Error creating admin user:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run both functions
async function main() {
  await checkUsers();
  
  // Ask if user wants to create an admin user
  const readline = await import('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('\nDo you want to create an admin user? (y/n): ', async (answer) => {
    if (answer.toLowerCase() === 'y') {
      await createAdminUser();
    }
    rl.close();
  });
}

main(); 